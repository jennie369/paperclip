// ============================================================================
// Series Linker — Group Scripts into Content Series
// GEM Content Control Center
//
// Phát hiện và nhóm các kịch bản thành chuỗi nội dung (series):
// - detectSeries: nhóm scripts theo topic similarity
// - suggestSeriesName: đề xuất tên series
// - reorderSeries: sắp xếp theo thứ tự logic
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScriptEntry {
  readonly id: string;
  readonly title: string;
  readonly content_type?: string;
  readonly track?: string;
  readonly body?: string;
  readonly tags?: readonly string[];
  readonly created_at: string;
}

export interface DetectedSeries {
  readonly name: string;
  readonly scripts: readonly ScriptEntry[];
  readonly track: string;
  readonly confidence: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum similarity score to consider scripts as related */
const SIMILARITY_THRESHOLD = 0.25;

/** Minimum scripts to form a series */
const MIN_SERIES_SIZE = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate trigrams from a string for fuzzy comparison.
 */
function trigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().trim();
  const grams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    grams.add(normalized.slice(i, i + 3));
  }
  return grams;
}

/**
 * Compute Jaccard similarity between two trigram sets.
 */
function trigramSimilarity(a: string, b: string): number {
  const setA = trigrams(a);
  const setB = trigrams(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute similarity between two scripts using title + tags + track.
 */
function scriptSimilarity(a: ScriptEntry, b: ScriptEntry): number {
  let score = 0;
  let factors = 0;

  // Title similarity (highest weight)
  const titleSim = trigramSimilarity(a.title, b.title);
  score += titleSim * 3;
  factors += 3;

  // Same track bonus
  if (a.track && b.track && a.track === b.track) {
    score += 1;
  }
  factors += 1;

  // Same content type bonus
  if (a.content_type && b.content_type && a.content_type === b.content_type) {
    score += 0.5;
  }
  factors += 0.5;

  // Shared tags
  if (a.tags && b.tags && a.tags.length > 0 && b.tags.length > 0) {
    const tagsA = new Set(a.tags.map((t) => t.toLowerCase()));
    const tagsB = new Set(b.tags.map((t) => t.toLowerCase()));
    let shared = 0;
    for (const tag of tagsA) {
      if (tagsB.has(tag)) shared++;
    }
    const tagSim = shared / Math.max(tagsA.size, tagsB.size);
    score += tagSim * 2;
  }
  factors += 2;

  return score / factors;
}

/**
 * Extract common theme words from titles.
 */
function extractCommonWords(titles: string[]): string[] {
  const stopWords = new Set([
    'và', 'của', 'cho', 'trong', 'với', 'là', 'một', 'các', 'để',
    'từ', 'bạn', 'này', 'có', 'không', 'về', 'đến', 'hay', 'nhưng',
    'mà', 'khi', 'thì', 'được', 'sẽ', 'đã', 'phải', 'nào', 'mỗi',
    'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with',
  ]);

  const wordCounts = new Map<string, number>();

  for (const title of titles) {
    const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
    const unique = new Set(words);
    for (const word of unique) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  // Words that appear in at least half the titles
  const threshold = Math.ceil(titles.length / 2);
  return [...wordCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

// ---------------------------------------------------------------------------
// Series Linker
// ---------------------------------------------------------------------------

export const seriesLinker = {
  /**
   * Detect groups of scripts that form natural content series.
   * Uses title trigram similarity, shared tags, and track matching.
   */
  detectSeries(scripts: readonly ScriptEntry[]): DetectedSeries[] {
    if (scripts.length < MIN_SERIES_SIZE) return [];

    // Build adjacency based on similarity
    const groups: ScriptEntry[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < scripts.length; i++) {
      const scriptA = scripts[i];
      if (!scriptA || assigned.has(scriptA.id)) continue;

      const group: ScriptEntry[] = [scriptA];
      assigned.add(scriptA.id);

      for (let j = i + 1; j < scripts.length; j++) {
        const scriptB = scripts[j];
        if (!scriptB || assigned.has(scriptB.id)) continue;

        const similarity = scriptSimilarity(scriptA, scriptB);
        if (similarity >= SIMILARITY_THRESHOLD) {
          group.push(scriptB);
          assigned.add(scriptB.id);
        }
      }

      if (group.length >= MIN_SERIES_SIZE) {
        groups.push(group);
      }
    }

    // Convert groups to DetectedSeries
    return groups.map((group) => {
      const name = this.suggestSeriesName(group);

      // Determine dominant track
      const trackCounts = new Map<string, number>();
      for (const s of group) {
        const track = s.track ?? 'integration';
        trackCounts.set(track, (trackCounts.get(track) ?? 0) + 1);
      }
      const dominantTrack = [...trackCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'integration';

      // Confidence based on average pairwise similarity
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const gi = group[i];
          const gj = group[j];
          if (gi && gj) {
            totalSim += scriptSimilarity(gi, gj);
            pairs++;
          }
        }
      }
      const confidence = pairs > 0 ? Math.round((totalSim / pairs) * 100) / 100 : 0;

      return {
        name,
        scripts: this.reorderSeries(group),
        track: dominantTrack,
        confidence,
      };
    });
  },

  /**
   * Suggest a series name from a group of scripts.
   * Uses common theme words from titles.
   */
  suggestSeriesName(scripts: readonly ScriptEntry[]): string {
    const titles = scripts.map((s) => s.title);
    const commonWords = extractCommonWords(titles);

    if (commonWords.length > 0) {
      // Capitalize first word
      const themePhrase = commonWords.slice(0, 3).join(' ');
      return `Series: ${themePhrase.charAt(0).toUpperCase()}${themePhrase.slice(1)}`;
    }

    // Fallback: use first script's title as base
    const first = scripts[0];
    if (first) {
      const shortened = first.title.split(/[—–\-:]/)[0]?.trim();
      return `Series: ${shortened ?? first.title}`;
    }

    return 'Series: Untitled';
  },

  /**
   * Reorder scripts in a series chronologically by creation date.
   */
  reorderSeries(scripts: readonly ScriptEntry[]): ScriptEntry[] {
    return [...scripts].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });
  },
};
