// ============================================================================
// Feedback Loop — Performance-based Parameter Optimization
// GEM Content Control Center
//
// Phân tích mối tương quan giữa generation params và hiệu suất video:
// - analyzePerformanceByParams: params nào tạo CTR tốt nhất
// - getOptimalParams: đề xuất params tối ưu cho track/persona
// - Tracks: writingMode, persona, track, titleFormula correlations
// ============================================================================

import type { ContentType, PersonaType, WritingMode, Track } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoWithParams {
  readonly id: string;
  readonly title: string;
  readonly ctr: number;
  readonly views: number;
  readonly avg_view_duration_sec?: number;
  readonly estimated_revenue?: number;
  readonly content_type?: ContentType;
  readonly track?: Track;
  readonly persona?: PersonaType;
  readonly writing_mode?: WritingMode;
  readonly title_formula?: string;
  readonly thumbnail_palette?: string;
  readonly published_at?: string;
}

export interface ParamPerformance {
  readonly param: string;
  readonly value: string;
  readonly avgCTR: number;
  readonly avgViews: number;
  readonly avgRevenue: number;
  readonly sampleSize: number;
}

export interface OptimalParams {
  readonly persona: PersonaType;
  readonly writingMode: WritingMode;
  readonly titleFormula: string | null;
  readonly confidence: number;
  readonly basedOnSamples: number;
}

export interface PerformanceAnalysis {
  readonly byWritingMode: readonly ParamPerformance[];
  readonly byPersona: readonly ParamPerformance[];
  readonly byTrack: readonly ParamPerformance[];
  readonly byTitleFormula: readonly ParamPerformance[];
  readonly topCombination: {
    readonly persona: string;
    readonly writingMode: string;
    readonly track: string;
    readonly avgCTR: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy<T>(items: readonly T[], keyFn: (item: T) => string | undefined): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (key === undefined) continue;
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function analyzeGroup(
  param: string,
  value: string,
  videos: readonly VideoWithParams[],
): ParamPerformance {
  const ctrs = videos.map((v) => v.ctr).filter((c) => c > 0);
  const views = videos.map((v) => v.views).filter((v) => v > 0);
  const revenues = videos
    .map((v) => v.estimated_revenue)
    .filter((r): r is number => typeof r === 'number' && r > 0);

  return {
    param,
    value,
    avgCTR: Math.round(average(ctrs) * 100) / 100,
    avgViews: Math.round(average(views)),
    avgRevenue: Math.round(average(revenues) * 100) / 100,
    sampleSize: videos.length,
  };
}

// ---------------------------------------------------------------------------
// Feedback Loop Service
// ---------------------------------------------------------------------------

export const feedbackLoop = {
  /**
   * Analyze video performance grouped by generation parameters.
   * Reveals which param combinations produce the best CTR, views, and revenue.
   *
   * @example
   * ```ts
   * const analysis = feedbackLoop.analyzePerformanceByParams(videos);
   * console.log('Best persona:', analysis.byPersona[0]?.value);
   * ```
   */
  analyzePerformanceByParams(
    videos: readonly VideoWithParams[],
  ): PerformanceAnalysis {
    // Filter to videos with meaningful CTR data
    const validVideos = videos.filter((v) => v.ctr > 0);

    // Group by writing mode
    const byMode = groupBy(validVideos, (v) => v.writing_mode);
    const modePerf: ParamPerformance[] = [];
    for (const [mode, group] of byMode) {
      modePerf.push(analyzeGroup('writingMode', mode, group));
    }
    modePerf.sort((a, b) => b.avgCTR - a.avgCTR);

    // Group by persona
    const byPersona = groupBy(validVideos, (v) => v.persona);
    const personaPerf: ParamPerformance[] = [];
    for (const [persona, group] of byPersona) {
      personaPerf.push(analyzeGroup('persona', persona, group));
    }
    personaPerf.sort((a, b) => b.avgCTR - a.avgCTR);

    // Group by track
    const byTrack = groupBy(validVideos, (v) => v.track);
    const trackPerf: ParamPerformance[] = [];
    for (const [track, group] of byTrack) {
      trackPerf.push(analyzeGroup('track', track, group));
    }
    trackPerf.sort((a, b) => b.avgCTR - a.avgCTR);

    // Group by title formula
    const byFormula = groupBy(validVideos, (v) => v.title_formula);
    const formulaPerf: ParamPerformance[] = [];
    for (const [formula, group] of byFormula) {
      formulaPerf.push(analyzeGroup('titleFormula', formula, group));
    }
    formulaPerf.sort((a, b) => b.avgCTR - a.avgCTR);

    // Find top combination (persona + writing mode + track)
    let topCombination: PerformanceAnalysis['topCombination'] = null;
    const combos = groupBy(
      validVideos,
      (v) => (v.persona && v.writing_mode && v.track)
        ? `${v.persona}|${v.writing_mode}|${v.track}`
        : undefined,
    );

    let bestCTR = 0;
    for (const [key, group] of combos) {
      if (group.length < 2) continue; // Need at least 2 videos
      const avgCTR = average(group.map((v) => v.ctr));
      if (avgCTR > bestCTR) {
        bestCTR = avgCTR;
        const [persona, writingMode, track] = key.split('|');
        if (persona && writingMode && track) {
          topCombination = {
            persona,
            writingMode,
            track,
            avgCTR: Math.round(avgCTR * 100) / 100,
          };
        }
      }
    }

    return {
      byWritingMode: modePerf,
      byPersona: personaPerf,
      byTrack: trackPerf,
      byTitleFormula: formulaPerf,
      topCombination,
    };
  },

  /**
   * Get optimal generation parameters for a given track and/or persona.
   * Uses historical performance data to recommend the best params.
   */
  getOptimalParams(
    videos: readonly VideoWithParams[],
    constraints?: { track?: Track; persona?: PersonaType },
  ): OptimalParams {
    let filtered = videos.filter((v) => v.ctr > 0);

    if (constraints?.track) {
      filtered = filtered.filter((v) => v.track === constraints.track);
    }
    if (constraints?.persona) {
      filtered = filtered.filter((v) => v.persona === constraints.persona);
    }

    if (filtered.length === 0) {
      return {
        persona: constraints?.persona ?? 'jennie_mentor',
        writingMode: 'mode_1_calm',
        titleFormula: null,
        confidence: 0,
        basedOnSamples: 0,
      };
    }

    // Find best persona by average CTR
    const byPersona = groupBy(filtered, (v) => v.persona);
    let bestPersona: PersonaType = 'jennie_mentor';
    let bestPersonaCTR = 0;
    for (const [persona, group] of byPersona) {
      const avgCTR = average(group.map((v) => v.ctr));
      if (avgCTR > bestPersonaCTR) {
        bestPersonaCTR = avgCTR;
        bestPersona = persona as PersonaType;
      }
    }

    // Find best writing mode by average CTR
    const byMode = groupBy(filtered, (v) => v.writing_mode);
    let bestMode: WritingMode = 'mode_1_calm';
    let bestModeCTR = 0;
    for (const [mode, group] of byMode) {
      const avgCTR = average(group.map((v) => v.ctr));
      if (avgCTR > bestModeCTR) {
        bestModeCTR = avgCTR;
        bestMode = mode as WritingMode;
      }
    }

    // Find best title formula
    const byFormula = groupBy(filtered, (v) => v.title_formula);
    let bestFormula: string | null = null;
    let bestFormulaCTR = 0;
    for (const [formula, group] of byFormula) {
      if (group.length < 2) continue;
      const avgCTR = average(group.map((v) => v.ctr));
      if (avgCTR > bestFormulaCTR) {
        bestFormulaCTR = avgCTR;
        bestFormula = formula;
      }
    }

    // Confidence based on sample size
    const confidence = Math.min(1, filtered.length / 20);

    return {
      persona: constraints?.persona ?? bestPersona,
      writingMode: bestMode,
      titleFormula: bestFormula,
      confidence: Math.round(confidence * 100) / 100,
      basedOnSamples: filtered.length,
    };
  },
};
