// ============================================================================
// Vietnamese NLP Utilities
// GEM Content Control Center
//
// Tiện ích xử lý ngôn ngữ tiếng Việt: đếm từ, ước lượng thời lượng,
// chuyển đổi thuật ngữ Anh → Việt, chuẩn hóa dấu, và trích xuất text.
// ============================================================================

// ---------------------------------------------------------------------------
// Term Conversion Map — English trading/spiritual terms → Vietnamese
// ---------------------------------------------------------------------------

interface TermEntry {
  readonly en: string;
  readonly vi: string;
}

const TERM_CONVERSIONS: readonly TermEntry[] = [
  // Trading terms
  { en: 'entry', vi: 'điểm mua' },
  { en: 'stop loss', vi: 'điểm cắt lỗ' },
  { en: 'take profit', vi: 'điểm chốt lời' },
  { en: 'win rate', vi: 'tỷ lệ thành công' },
  { en: 'scanner', vi: 'công cụ quét' },
  { en: 'whale tracker', vi: 'theo dõi cá mập' },
  { en: 'support', vi: 'hỗ trợ' },
  { en: 'resistance', vi: 'kháng cự' },
  { en: 'breakout', vi: 'phá vỡ' },
  { en: 'trend', vi: 'xu hướng' },
  { en: 'portfolio', vi: 'danh mục' },
  { en: 'position', vi: 'vị thế' },
  { en: 'leverage', vi: 'đòn bẩy' },
  // Spiritual/mindset terms
  { en: 'mindset', vi: 'tư duy' },
  { en: 'healing', vi: 'chữa lành' },
  { en: 'meditation', vi: 'thiền định' },
  { en: 'frequency', vi: 'tần số' },
  { en: 'vibration', vi: 'rung động' },
  { en: 'karma', vi: 'nghiệp' },
] as const;

// Pre-sorted by descending length so multi-word terms match before single-word
// substrings (e.g. "stop loss" before "stop", "whale tracker" before "whale").
const TERMS_BY_LENGTH: readonly TermEntry[] = [...TERM_CONVERSIONS].sort(
  (a, b) => b.en.length - a.en.length,
);

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

/** Matches markdown heading markers (##, ###, etc.) */
const RE_HEADINGS = /^#{1,6}\s+/gm;

/** Matches bold / italic markers */
const RE_BOLD_ITALIC = /(\*{1,3}|_{1,3})(.*?)\1/g;

/** Matches markdown links [text](url) */
const RE_LINKS = /\[([^\]]*)\]\([^)]*\)/g;

/** Matches markdown images ![alt](url) */
const RE_IMAGES = /!\[([^\]]*)\]\([^)]*\)/g;

/** Matches inline code */
const RE_INLINE_CODE = /`([^`]*)`/g;

/** Matches code blocks */
const RE_CODE_BLOCKS = /```[\s\S]*?```/g;

/** Matches horizontal rules */
const RE_HR = /^[-*_]{3,}\s*$/gm;

/** Matches blockquotes */
const RE_BLOCKQUOTE = /^>\s?/gm;

/** Vietnamese spoken word rate — approximately 150 words per minute */
const VIETNAMESE_WPM = 150;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const vietnameseNLP = {
  // -------------------------------------------------------------------------
  // Count Vietnamese words
  // Vietnamese is syllabic — each space-separated token counts as one word.
  // -------------------------------------------------------------------------

  countWords(text: string): number {
    const clean = this.stripMarkdown(text);
    const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
    return tokens.length;
  },

  // -------------------------------------------------------------------------
  // Estimate reading/speaking duration in seconds
  // Vietnamese averages ~150 words (syllables) per minute when spoken aloud.
  // -------------------------------------------------------------------------

  estimateDuration(text: string): number {
    const words = this.countWords(text);
    return Math.round((words / VIETNAMESE_WPM) * 60);
  },

  // -------------------------------------------------------------------------
  // Format duration for display (Vietnamese labels)
  // -------------------------------------------------------------------------

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes === 0) return `${secs} giây`;
    if (secs === 0) return `${minutes} phút`;
    return `${minutes} phút ${secs} giây`;
  },

  // -------------------------------------------------------------------------
  // Convert English trading/spiritual terms to Vietnamese equivalents
  // -------------------------------------------------------------------------

  convertTerms(
    text: string,
  ): {
    result: string;
    conversions: Array<{ en: string; vi: string; count: number }>;
  } {
    let result = text;
    const conversions: Array<{ en: string; vi: string; count: number }> = [];

    for (const { en, vi } of TERMS_BY_LENGTH) {
      const regex = new RegExp(`\\b${escapeRegex(en)}\\b`, 'gi');
      const matches = result.match(regex);

      if (matches && matches.length > 0) {
        result = result.replace(regex, vi);
        conversions.push({ en, vi, count: matches.length });
      }
    }

    return { result, conversions };
  },

  // -------------------------------------------------------------------------
  // Detect English terms that should be in Vietnamese
  // -------------------------------------------------------------------------

  detectEnglishTerms(
    text: string,
  ): Array<{ term: string; vietnamese: string; positions: number[] }> {
    const detections: Array<{
      term: string;
      vietnamese: string;
      positions: number[];
    }> = [];

    for (const { en, vi } of TERMS_BY_LENGTH) {
      const regex = new RegExp(`\\b${escapeRegex(en)}\\b`, 'gi');
      const positions: number[] = [];
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        positions.push(match.index);
      }

      if (positions.length > 0) {
        detections.push({ term: en, vietnamese: vi, positions });
      }
    }

    return detections;
  },

  // -------------------------------------------------------------------------
  // Strip all markdown formatting, returning plain text
  // -------------------------------------------------------------------------

  stripMarkdown(text: string): string {
    let clean = text;

    // Remove code blocks first (before other patterns match inside them)
    clean = clean.replace(RE_CODE_BLOCKS, '');

    // Remove images (before links, since image syntax contains link syntax)
    clean = clean.replace(RE_IMAGES, '$1');

    // Remove links — keep the link text
    clean = clean.replace(RE_LINKS, '$1');

    // Remove inline code — keep contents
    clean = clean.replace(RE_INLINE_CODE, '$1');

    // Remove heading markers
    clean = clean.replace(RE_HEADINGS, '');

    // Remove bold/italic markers — keep contents
    clean = clean.replace(RE_BOLD_ITALIC, '$2');

    // Remove horizontal rules
    clean = clean.replace(RE_HR, '');

    // Remove blockquote markers
    clean = clean.replace(RE_BLOCKQUOTE, '');

    // Collapse multiple blank lines into a single blank line
    clean = clean.replace(/\n{3,}/g, '\n\n');

    return clean.trim();
  },

  // -------------------------------------------------------------------------
  // Extract clean text optimized for teleprompter display
  // Large-font friendly: no markdown, clear paragraph separation, no CTA
  // section markers.
  // -------------------------------------------------------------------------

  toTeleprompterText(text: string): string {
    let clean = this.stripMarkdown(text);

    // Remove CTA section markers like [CTA], (CTA), --- CTA ---
    clean = clean.replace(/[\[(]CTA[\])]/gi, '');
    clean = clean.replace(/---\s*CTA\s*---/gi, '');

    // Remove section labels like "PHẦN 1:", "Phần kết:", "Hook:"
    clean = clean.replace(
      /^(PHẦN|Phần|HOOK|Hook|CTA|OUTRO|Outro|INTRO|Intro|B-ROLL)\s*\d*\s*[:—-]\s*/gm,
      '',
    );

    // Ensure clear paragraph breaks (double newline)
    clean = clean.replace(/\n{1}/g, '\n\n');

    // Collapse excessive breaks
    clean = clean.replace(/\n{4,}/g, '\n\n\n');

    return clean.trim();
  },

  // -------------------------------------------------------------------------
  // Normalize Vietnamese diacritics to NFC (composed) form
  // Ensures consistent Unicode representation across platforms.
  // -------------------------------------------------------------------------

  normalizeDiacritics(text: string): string {
    return text.normalize('NFC');
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Escape special regex characters in a string so it can be used
 * as a literal match inside a RegExp constructor.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Named exports for direct imports
// ---------------------------------------------------------------------------

export const countWords = vietnameseNLP.countWords.bind(vietnameseNLP);
export const estimateDuration = vietnameseNLP.estimateDuration.bind(vietnameseNLP);
export const formatDuration = vietnameseNLP.formatDuration.bind(vietnameseNLP);
export const convertTerms = vietnameseNLP.convertTerms.bind(vietnameseNLP);
export const detectEnglishTerms = vietnameseNLP.detectEnglishTerms.bind(vietnameseNLP);
export const stripMarkdown = vietnameseNLP.stripMarkdown.bind(vietnameseNLP);
export const toTeleprompterText = vietnameseNLP.toTeleprompterText.bind(vietnameseNLP);
export const normalizeDiacritics = vietnameseNLP.normalizeDiacritics.bind(vietnameseNLP);
export { TERM_CONVERSIONS };
