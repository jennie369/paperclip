// ============================================================================
// CTR Predictor — Estimate CTR from Historical Patterns
// GEM Content Control Center
//
// Dự đoán CTR dựa trên dữ liệu lịch sử:
// - predictCTR: ước tính khoảng CTR từ params
// - Simple regression-like approach using grouped averages
// - Input: title formula, track, persona, thumbnail palette
// ============================================================================

import type { PersonaType, Track, WritingMode } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CTRPrediction {
  /** Estimated CTR as percentage (e.g., 8.5 means 8.5%) */
  readonly estimated: number;
  /** Lower bound of estimated range */
  readonly rangeLow: number;
  /** Upper bound of estimated range */
  readonly rangeHigh: number;
  /** Confidence in the prediction (0-1) */
  readonly confidence: number;
  /** Number of historical samples used */
  readonly sampleSize: number;
  /** Factors that contributed to the prediction */
  readonly factors: readonly CTRFactor[];
}

export interface CTRFactor {
  readonly name: string;
  readonly value: string;
  readonly avgCTR: number;
  readonly weight: number;
  readonly sampleSize: number;
}

export interface PredictParams {
  readonly track?: Track;
  readonly persona?: PersonaType;
  readonly writingMode?: WritingMode;
  readonly titleFormula?: string;
  readonly thumbnailPalette?: string;
}

interface HistoricalVideo {
  readonly ctr: number;
  readonly track?: string;
  readonly persona?: string;
  readonly writing_mode?: string;
  readonly title_formula?: string;
  readonly thumbnail_palette?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum samples to include a factor in prediction */
const MIN_SAMPLES = 2;

/** Default CTR when no data available (YouTube average for educational channels) */
const DEFAULT_CTR = 5.0;

/** Range spread factor (multiplied by std dev) */
const RANGE_SPREAD = 1.5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 1;
  const avg = average(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}

// ---------------------------------------------------------------------------
// CTR Predictor
// ---------------------------------------------------------------------------

export const ctrPredictor = {
  /**
   * Predict CTR range based on generation parameters and historical data.
   *
   * Uses a weighted average approach:
   * 1. Groups historical videos by each parameter
   * 2. Calculates average CTR per parameter value
   * 3. Combines with weights based on sample size
   * 4. Produces estimated CTR with confidence range
   *
   * @example
   * ```ts
   * const prediction = ctrPredictor.predictCTR(
   *   { track: 'wealth', persona: 'jennie_provocateur', titleFormula: 'B_number_secret' },
   *   historicalVideos,
   * );
   * console.log(`Estimated CTR: ${prediction.rangeLow}% - ${prediction.rangeHigh}%`);
   * ```
   */
  predictCTR(
    params: PredictParams,
    historicalVideos: readonly HistoricalVideo[],
  ): CTRPrediction {
    // Filter to videos with valid CTR
    const validVideos = historicalVideos.filter((v) => v.ctr > 0);

    if (validVideos.length === 0) {
      return {
        estimated: DEFAULT_CTR,
        rangeLow: DEFAULT_CTR * 0.5,
        rangeHigh: DEFAULT_CTR * 1.5,
        confidence: 0,
        sampleSize: 0,
        factors: [],
      };
    }

    const factors: CTRFactor[] = [];

    // ─── Analyze by track ───
    if (params.track) {
      const matched = validVideos.filter((v) => v.track === params.track);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: 'Track',
          value: params.track,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.0,
          sampleSize: matched.length,
        });
      }
    }

    // ─── Analyze by persona ───
    if (params.persona) {
      const matched = validVideos.filter((v) => v.persona === params.persona);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: 'Persona',
          value: params.persona,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.2,
          sampleSize: matched.length,
        });
      }
    }

    // ─── Analyze by writing mode ───
    if (params.writingMode) {
      const matched = validVideos.filter((v) => v.writing_mode === params.writingMode);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: 'Writing Mode',
          value: params.writingMode,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 0.8,
          sampleSize: matched.length,
        });
      }
    }

    // ─── Analyze by title formula ───
    if (params.titleFormula) {
      const matched = validVideos.filter((v) => v.title_formula === params.titleFormula);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: 'Title Formula',
          value: params.titleFormula,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.5,
          sampleSize: matched.length,
        });
      }
    }

    // ─── Analyze by thumbnail palette ───
    if (params.thumbnailPalette) {
      const matched = validVideos.filter((v) => v.thumbnail_palette === params.thumbnailPalette);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: 'Thumbnail Palette',
          value: params.thumbnailPalette,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.3,
          sampleSize: matched.length,
        });
      }
    }

    // ─── Compute weighted estimate ───
    if (factors.length === 0) {
      // No matching factors — use global average
      const allCTRs = validVideos.map((v) => v.ctr);
      const globalAvg = average(allCTRs);
      const globalStd = standardDeviation(allCTRs);

      return {
        estimated: Math.round(globalAvg * 100) / 100,
        rangeLow: Math.round(Math.max(0, globalAvg - globalStd * RANGE_SPREAD) * 100) / 100,
        rangeHigh: Math.round((globalAvg + globalStd * RANGE_SPREAD) * 100) / 100,
        confidence: 0.1,
        sampleSize: validVideos.length,
        factors: [],
      };
    }

    // Weighted average of factor CTRs
    let weightedSum = 0;
    let totalWeight = 0;
    let totalSamples = 0;

    for (const factor of factors) {
      // Weight by both the factor weight and sample size (log scale)
      const sizeWeight = Math.log2(factor.sampleSize + 1);
      const effectiveWeight = factor.weight * sizeWeight;
      weightedSum += factor.avgCTR * effectiveWeight;
      totalWeight += effectiveWeight;
      totalSamples += factor.sampleSize;
    }

    const estimated = totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_CTR;

    // Compute range using standard deviation of factor CTRs
    const factorCTRs = factors.map((f) => f.avgCTR);
    const factorStd = factorCTRs.length > 1 ? standardDeviation(factorCTRs) : estimated * 0.2;

    const rangeLow = Math.max(0, estimated - factorStd * RANGE_SPREAD);
    const rangeHigh = estimated + factorStd * RANGE_SPREAD;

    // Confidence based on number of factors and samples
    const factorConfidence = Math.min(1, factors.length / 4);
    const sampleConfidence = Math.min(1, totalSamples / 30);
    const confidence = (factorConfidence * 0.4 + sampleConfidence * 0.6);

    return {
      estimated: Math.round(estimated * 100) / 100,
      rangeLow: Math.round(rangeLow * 100) / 100,
      rangeHigh: Math.round(rangeHigh * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize: totalSamples,
      factors,
    };
  },
};
