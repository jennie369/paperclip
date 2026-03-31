// ============================================================================
// Vietnamese NLP — Unit Tests
// GEM Content Control Center
// ============================================================================

import { describe, it, expect } from 'vitest';
import { vietnameseNLP, TERM_CONVERSIONS } from '../utils/vietnameseNLP';

describe('vietnameseNLP', () => {
  // ─── Term Conversion ───

  describe('convertTerms', () => {
    it('should convert "stop loss" to "điểm cắt lỗ"', () => {
      const input = 'Đặt stop loss ở vùng hỗ trợ.';
      const result = vietnameseNLP.convertTerms(input);

      expect(result.result).toContain('điểm cắt lỗ');
      expect(result.conversions.length).toBeGreaterThan(0);

      const slConversion = result.conversions.find((c) => c.en === 'stop loss');
      expect(slConversion).toBeDefined();
      expect(slConversion!.vi).toBe('điểm cắt lỗ');
      expect(slConversion!.count).toBe(1);
    });

    it('should convert multiple terms in one pass', () => {
      const input = 'Use entry and stop loss at support for your portfolio.';
      const result = vietnameseNLP.convertTerms(input);

      expect(result.conversions.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle multi-word terms before single-word substrings', () => {
      const input = 'Set the stop loss carefully.';
      const result = vietnameseNLP.convertTerms(input);

      // "stop loss" should match, not just "stop"
      const slConversion = result.conversions.find((c) => c.en === 'stop loss');
      expect(slConversion).toBeDefined();
    });

    it('should return empty conversions when no terms match', () => {
      const input = 'Đây là câu tiếng Việt thuần túy.';
      const result = vietnameseNLP.convertTerms(input);

      expect(result.conversions).toHaveLength(0);
      expect(result.result).toBe(input);
    });
  });

  // ─── Word Count ───

  describe('countWords', () => {
    it('should count Vietnamese syllables as words', () => {
      expect(vietnameseNLP.countWords('Một hai ba bốn năm')).toBe(5);
    });

    it('should handle markdown content', () => {
      const markdown = '## Tiêu đề\n\n**Nội dung** quan trọng ở đây.';
      const count = vietnameseNLP.countWords(markdown);
      // Should strip markdown: "Tiêu đề Nội dung quan trọng ở đây." = 7 words
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should return 0 for empty string', () => {
      expect(vietnameseNLP.countWords('')).toBe(0);
    });

    it('should handle strings with multiple spaces', () => {
      expect(vietnameseNLP.countWords('Một   hai   ba')).toBe(3);
    });
  });

  // ─── Diacritics Validation ───

  describe('normalizeDiacritics', () => {
    it('should normalize to NFC form', () => {
      // NFD form: a + combining acute accent (U+0301)
      const nfd = 'a\u0301'; // á in NFD
      const result = vietnameseNLP.normalizeDiacritics(nfd);

      // NFC form: single codepoint á
      expect(result).toBe('\u00e1');
      expect(result.length).toBe(1);
    });

    it('should preserve already-NFC text', () => {
      const nfc = 'Tiếng Việt có dấu đầy đủ';
      const result = vietnameseNLP.normalizeDiacritics(nfc);
      expect(result).toBe(nfc);
    });

    it('should handle mixed NFC/NFD input', () => {
      const mixed = 'Kie\u0309m tra'; // Kiểm in mixed form
      const result = vietnameseNLP.normalizeDiacritics(mixed);
      // Result should be consistent NFC
      expect(result).toBe(result.normalize('NFC'));
    });
  });

  // ─── Duration Estimation ───

  describe('estimateDuration', () => {
    it('should estimate ~60 seconds for 150 words', () => {
      const words = Array.from({ length: 150 }, (_, i) => `từ${i}`).join(' ');
      const duration = vietnameseNLP.estimateDuration(words);

      // 150 words at 150 WPM = 60 seconds
      expect(duration).toBe(60);
    });

    it('should return 0 for empty text', () => {
      expect(vietnameseNLP.estimateDuration('')).toBe(0);
    });
  });

  // ─── Format Duration ───

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(vietnameseNLP.formatDuration(30)).toBe('30 giây');
    });

    it('should format minutes only', () => {
      expect(vietnameseNLP.formatDuration(120)).toBe('2 phút');
    });

    it('should format minutes and seconds', () => {
      expect(vietnameseNLP.formatDuration(90)).toBe('1 phút 30 giây');
    });
  });

  // ─── Detect English Terms ───

  describe('detectEnglishTerms', () => {
    it('should detect English terms with positions', () => {
      const text = 'Check the trend and set your portfolio.';
      const detections = vietnameseNLP.detectEnglishTerms(text);

      expect(detections.length).toBeGreaterThan(0);

      const trendDetection = detections.find((d) => d.term === 'trend');
      expect(trendDetection).toBeDefined();
      expect(trendDetection!.vietnamese).toBe('xu hướng');
      expect(trendDetection!.positions.length).toBe(1);
    });
  });

  // ─── Strip Markdown ───

  describe('stripMarkdown', () => {
    it('should remove heading markers', () => {
      expect(vietnameseNLP.stripMarkdown('## Tiêu đề')).toBe('Tiêu đề');
    });

    it('should remove bold markers and keep text', () => {
      expect(vietnameseNLP.stripMarkdown('**Bold text**')).toBe('Bold text');
    });

    it('should remove link syntax and keep text', () => {
      expect(vietnameseNLP.stripMarkdown('[Click here](https://example.com)')).toBe('Click here');
    });

    it('should remove code blocks', () => {
      const input = 'Before\n```\ncode here\n```\nAfter';
      const result = vietnameseNLP.stripMarkdown(input);
      expect(result).not.toContain('code here');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });
  });

  // ─── TERM_CONVERSIONS export ───

  describe('TERM_CONVERSIONS', () => {
    it('should export a non-empty array', () => {
      expect(Array.isArray(TERM_CONVERSIONS)).toBe(true);
      expect(TERM_CONVERSIONS.length).toBeGreaterThan(10);
    });

    it('should have en and vi properties on each entry', () => {
      for (const entry of TERM_CONVERSIONS) {
        expect(typeof entry.en).toBe('string');
        expect(typeof entry.vi).toBe('string');
        expect(entry.en.length).toBeGreaterThan(0);
        expect(entry.vi.length).toBeGreaterThan(0);
      }
    });
  });
});
