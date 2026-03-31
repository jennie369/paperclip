// ============================================================================
// Duplicate Detector — Script Title & Content Similarity Check
// GEM Content Control Center
//
// Kiểm tra trùng lặp nội dung:
// - checkDuplicate: so sánh tiêu đề với các scripts hiện có
// - Sử dụng trigram similarity cho fuzzy matching
// - Trả về điểm tương đồng và script trùng (nếu có)
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateCheckResult {
  /** Whether the content is considered a duplicate (similarity >= threshold) */
  readonly isDuplicate: boolean;
  /** Most similar existing script (if any above minimum similarity) */
  readonly similarScript: SimilarScript | null;
  /** Similarity score between 0 and 1 */
  readonly similarity: number;
  /** All scripts above minimum similarity threshold, sorted by similarity desc */
  readonly candidates: readonly SimilarScript[];
}

export interface SimilarScript {
  readonly id: string;
  readonly title: string;
  readonly similarity: number;
}

interface ExistingScript {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Similarity threshold to consider a duplicate */
const DUPLICATE_THRESHOLD = 0.60;

/** Minimum similarity to appear in candidates list */
const CANDIDATE_THRESHOLD = 0.25;

/** Maximum candidates to return */
const MAX_CANDIDATES = 5;

// ---------------------------------------------------------------------------
// Trigram-based similarity
// ---------------------------------------------------------------------------

/**
 * Generate character trigrams from a normalized string.
 */
function generateTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const grams = new Set<string>();

  if (normalized.length < 3) {
    grams.add(normalized);
    return grams;
  }

  for (let i = 0; i <= normalized.length - 3; i++) {
    grams.add(normalized.slice(i, i + 3));
  }

  return grams;
}

/**
 * Compute Jaccard similarity coefficient between two trigram sets.
 * Returns value between 0 (no overlap) and 1 (identical).
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute word-level overlap (Jaccard on words instead of trigrams).
 */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute combined similarity score using trigrams and word overlap.
 */
function computeSimilarity(titleA: string, titleB: string): number {
  const trigramSim = jaccardSimilarity(
    generateTrigrams(titleA),
    generateTrigrams(titleB),
  );

  const wordSim = wordOverlap(titleA, titleB);

  // Weighted combination: trigrams 60%, word overlap 40%
  return trigramSim * 0.6 + wordSim * 0.4;
}

// ---------------------------------------------------------------------------
// Duplicate Detector
// ---------------------------------------------------------------------------

export const duplicateDetector = {
  /**
   * Check if a title is a duplicate of any existing script.
   *
   * @param title - The new title to check
   * @param existingScripts - List of existing scripts to compare against
   * @param threshold - Custom duplicate threshold (default: 0.60)
   * @returns DuplicateCheckResult with similarity score and matching script
   *
   * @example
   * ```ts
   * const result = duplicateDetector.checkDuplicate(
   *   '5 Sai Lầm Khi Đầu Tư Crypto',
   *   existingScripts,
   * );
   * if (result.isDuplicate) {
   *   console.log(`Trùng với: "${result.similarScript.title}" (${(result.similarity * 100).toFixed(0)}%)`);
   * }
   * ```
   */
  checkDuplicate(
    title: string,
    existingScripts: readonly ExistingScript[],
    threshold: number = DUPLICATE_THRESHOLD,
  ): DuplicateCheckResult {
    if (!title.trim() || existingScripts.length === 0) {
      return {
        isDuplicate: false,
        similarScript: null,
        similarity: 0,
        candidates: [],
      };
    }

    const candidates: SimilarScript[] = [];

    for (const script of existingScripts) {
      const similarity = computeSimilarity(title, script.title);

      if (similarity >= CANDIDATE_THRESHOLD) {
        candidates.push({
          id: script.id,
          title: script.title,
          similarity: Math.round(similarity * 1000) / 1000,
        });
      }
    }

    // Sort by similarity descending
    candidates.sort((a, b) => b.similarity - a.similarity);

    // Trim to max candidates
    const topCandidates = candidates.slice(0, MAX_CANDIDATES);
    const bestMatch = topCandidates[0] ?? null;

    return {
      isDuplicate: bestMatch !== null && bestMatch.similarity >= threshold,
      similarScript: bestMatch,
      similarity: bestMatch?.similarity ?? 0,
      candidates: topCandidates,
    };
  },

  /**
   * Batch check multiple titles at once.
   * Returns results indexed by the input title.
   */
  checkBatch(
    titles: readonly string[],
    existingScripts: readonly ExistingScript[],
    threshold: number = DUPLICATE_THRESHOLD,
  ): Map<string, DuplicateCheckResult> {
    const results = new Map<string, DuplicateCheckResult>();

    for (const title of titles) {
      results.set(title, this.checkDuplicate(title, existingScripts, threshold));
    }

    return results;
  },
};
