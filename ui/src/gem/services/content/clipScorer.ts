// ============================================================================
// Clip Scorer — Score Script Sections for Short Clip Potential
// GEM Content Control Center
//
// Đánh giá khả năng tạo short clip từ các đoạn kịch bản:
// - scoreSection: chấm điểm 0-10 cho một đoạn text
// - suggestBestClips: chọn top N đoạn tốt nhất cho short clips
// - Factors: emotional intensity, standalone clarity, hook quality
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClipScore {
  /** Overall clip-ability score (0-10) */
  readonly score: number;
  /** Individual factor scores */
  readonly factors: ClipFactors;
  /** The scored text (truncated for display) */
  readonly text: string;
  /** Explanation of the score */
  readonly explanation: string;
}

export interface ClipFactors {
  /** Emotional intensity of the text (0-10) */
  readonly emotionalIntensity: number;
  /** Can the text stand alone without context (0-10) */
  readonly standaloneClarity: number;
  /** Hook quality — does it grab attention (0-10) */
  readonly hookQuality: number;
  /** Brevity — is it concise enough for a short clip (0-10) */
  readonly brevity: number;
  /** Visual potential — does it evoke imagery (0-10) */
  readonly visualPotential: number;
}

export interface ClipSuggestion {
  /** Section index in the original script */
  readonly sectionIndex: number;
  /** Section title/heading */
  readonly sectionTitle: string;
  /** The recommended clip text */
  readonly clipText: string;
  /** Clip-ability score */
  readonly score: ClipScore;
}

// ---------------------------------------------------------------------------
// Keyword Dictionaries for Scoring
// ---------------------------------------------------------------------------

/** High emotional intensity keywords (Vietnamese) */
const EMOTIONAL_KEYWORDS: readonly string[] = [
  'sợ hãi', 'đau', 'mất', 'khóc', 'yêu', 'ghét', 'giận', 'tuyệt vọng',
  'hạnh phúc', 'hy vọng', 'shock', 'sốc', 'bất ngờ', 'kinh hoàng',
  'cảm ơn', 'tha thứ', 'xin lỗi', 'buông bỏ', 'thức tỉnh', 'giác ngộ',
  'nghẹn ngào', 'rung động', 'run rẩy', 'lạnh sống lưng', 'tim đập',
  'nỗi đau', 'nước mắt', 'ôm', 'chữa lành', 'phá vỡ', 'tan nát',
];

/** Strong hook patterns */
const HOOK_PATTERNS: readonly RegExp[] = [
  /bạn có (?:bao giờ|biết|tin)/i,
  /sự thật (?:là|mà|đáng sợ)/i,
  /không ai (?:nói|dám|dạy)/i,
  /tại sao (?:bạn|người|ai)/i,
  /bí mật/i,
  /\d+ (?:sai lầm|điều|cách|bước|lý do)/i,
  /dừng lại/i,
  /hãy (?:tưởng tượng|nghĩ|nhìn)/i,
  /câu chuyện (?:này|của|mà)/i,
  /nếu (?:bạn|ai|ngày)/i,
  /vì sao/i,
  /jennie (?:từng|đã|cũng)/i,
];

/** Visual/imagery keywords */
const VISUAL_KEYWORDS: readonly string[] = [
  'hãy tưởng tượng', 'nhìn', 'thấy', 'ánh sáng', 'bóng tối',
  'biển', 'núi', 'mặt trời', 'ngọn nến', 'gương', 'cánh cửa',
  'con đường', 'dòng sông', 'ngã tư', 'chart', 'biểu đồ',
  'cánh chim', 'ngọn lửa', 'hạt giống', 'cây', 'vườn',
];

/** Standalone clarity indicators — phrases that provide context */
const CONTEXT_INDICATORS: readonly string[] = [
  'bởi vì', 'tại vì', 'cho nên', 'vì vậy', 'nghĩa là',
  'ví dụ', 'đơn giản', 'nói cách khác', 'tóm lại',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countMatches(text: string, keywords: readonly string[]): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      count++;
    }
  }
  return count;
}

function countPatternMatches(text: string, patterns: readonly RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) count++;
  }
  return count;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((t) => t.length > 0).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Extract sections from a markdown script.
 */
function extractSections(text: string): Array<{ title: string; content: string }> {
  const parts = text.split(/^##\s+(.+)$/m);
  const sections: Array<{ title: string; content: string }> = [];

  // parts[0] is content before first ##, then alternating title/content
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]?.trim() ?? '';
    const content = parts[i + 1]?.trim() ?? '';
    if (title && content) {
      sections.push({ title, content });
    }
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Clip Scorer
// ---------------------------------------------------------------------------

export const clipScorer = {
  /**
   * Score a text section for short clip potential (0-10).
   *
   * @example
   * ```ts
   * const score = clipScorer.scoreSection('Bạn có biết 95% trader thua lỗ? Sự thật mà không ai dám nói.');
   * console.log(score.score); // e.g., 8.2
   * ```
   */
  scoreSection(text: string): ClipScore {
    const wordCount = countWords(text);

    // ─── Emotional Intensity (0-10) ───
    const emotionalCount = countMatches(text, EMOTIONAL_KEYWORDS);
    const emotionalIntensity = clamp(emotionalCount * 2, 0, 10);

    // ─── Hook Quality (0-10) ───
    const hookMatches = countPatternMatches(text, HOOK_PATTERNS);
    // First sentence hook detection
    const firstSentence = text.split(/[.!?]\s/)[0] ?? '';
    const firstSentenceHook = countPatternMatches(firstSentence, HOOK_PATTERNS) > 0 ? 3 : 0;
    const hookQuality = clamp(hookMatches * 2 + firstSentenceHook, 0, 10);

    // ─── Standalone Clarity (0-10) ───
    // Higher if text contains self-explanatory context
    const contextCount = countMatches(text, CONTEXT_INDICATORS);
    const hasQuestion = /\?/.test(text);
    const hasConclusion = /vì vậy|cho nên|tóm lại|nghĩa là/i.test(text);
    const standaloneClarity = clamp(
      contextCount * 1.5 + (hasQuestion ? 2 : 0) + (hasConclusion ? 2 : 0) + 3,
      0,
      10,
    );

    // ─── Brevity (0-10) ───
    // Optimal clip length: 30-80 words
    let brevity: number;
    if (wordCount <= 30) {
      brevity = 6; // Too short — may lack substance
    } else if (wordCount <= 80) {
      brevity = 10; // Sweet spot
    } else if (wordCount <= 150) {
      brevity = 7; // Can be trimmed
    } else if (wordCount <= 250) {
      brevity = 4; // Needs significant cutting
    } else {
      brevity = 2; // Way too long for a clip
    }

    // ─── Visual Potential (0-10) ───
    const visualCount = countMatches(text, VISUAL_KEYWORDS);
    const visualPotential = clamp(visualCount * 2, 0, 10);

    // ─── Overall Score ───
    // Weighted combination
    const overall =
      emotionalIntensity * 0.25 +
      hookQuality * 0.30 +
      standaloneClarity * 0.15 +
      brevity * 0.15 +
      visualPotential * 0.15;

    const roundedScore = Math.round(overall * 10) / 10;

    // ─── Explanation ───
    const explanationParts: string[] = [];
    if (hookQuality >= 7) explanationParts.push('Hook mạnh');
    else if (hookQuality <= 3) explanationParts.push('Thiếu hook gây chú ý');
    if (emotionalIntensity >= 7) explanationParts.push('Cảm xúc mãnh liệt');
    if (brevity >= 8) explanationParts.push('Độ dài lý tưởng cho clip');
    else if (brevity <= 4) explanationParts.push('Quá dài, cần cắt ngắn');
    if (visualPotential >= 6) explanationParts.push('Giàu hình ảnh');

    return {
      score: roundedScore,
      factors: {
        emotionalIntensity,
        standaloneClarity,
        hookQuality,
        brevity,
        visualPotential,
      },
      text: text.length > 200 ? text.slice(0, 200) + '...' : text,
      explanation: explanationParts.length > 0
        ? explanationParts.join('. ') + '.'
        : 'Điểm trung bình, có thể cải thiện hook và cảm xúc.',
    };
  },

  /**
   * Suggest the best sections from a full script for short clips.
   * Splits by ## headers, scores each section, returns top N.
   *
   * @param script - Full markdown script
   * @param count - Number of clips to suggest (default: 3)
   */
  suggestBestClips(script: string, count: number = 3): ClipSuggestion[] {
    const sections = extractSections(script);

    if (sections.length === 0) {
      // No sections found — score the whole text
      const score = this.scoreSection(script);
      return [{
        sectionIndex: 0,
        sectionTitle: 'Toàn bộ nội dung',
        clipText: script,
        score,
      }];
    }

    const scored: ClipSuggestion[] = sections.map((section, index) => ({
      sectionIndex: index,
      sectionTitle: section.title,
      clipText: section.content,
      score: this.scoreSection(section.content),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score.score - a.score.score);

    return scored.slice(0, count);
  },
};
