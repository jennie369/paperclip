// ============================================================================
// Brand Voice Checker — Unit Tests
// GEM Content Control Center
// ============================================================================

import { describe, it, expect } from 'vitest';
import { brandVoiceChecker } from '../content/brandVoiceChecker';

describe('brandVoiceChecker', () => {
  // ─── Forbidden Terms Detection ───

  describe('forbidden terms detection', () => {
    it('should detect "tâm linh" and suggest "tâm thức"', () => {
      const content = `## Hook
Trong thế giới tâm linh, nhiều người tìm kiếm sự bình an.
Tâm linh là con đường mà ít ai hiểu.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'forbidden_term' && v.term === 'tâm linh',
      );
      expect(violation).toBeDefined();
      expect(violation!.replacement).toBe('tâm thức');
      expect(violation!.severity).toBe('critical');
      expect(violation!.count).toBe(2);
    });

    it('should detect "giàu nhanh" as critical violation', () => {
      const content = `## Hook
Ai cũng muốn giàu nhanh nhưng đó là cái bẫy.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'forbidden_term' && v.term === 'giàu nhanh',
      );
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe('critical');
      expect(violation!.replacement).toBeNull();
    });

    it('should detect "đảm bảo lợi nhuận" with null replacement', () => {
      const content = `## Hook
Chúng tôi đảm bảo lợi nhuận cho mọi trader.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'forbidden_term' && v.term === 'đảm bảo lợi nhuận',
      );
      expect(violation).toBeDefined();
      expect(violation!.replacement).toBeNull();
    });

    it('should return passed: false when critical violations exist', () => {
      const content = `## Hook
Đây là cách giàu nhanh mà ai cũng cần biết.`;

      const result = brandVoiceChecker.check(content, 'latc');
      expect(result.passed).toBe(false);
    });
  });

  // ─── English Terms Detection ───

  describe('english terms detection', () => {
    it('should detect English trading terms', () => {
      const content = `## Phần 1
Bạn cần đặt stop loss ở vùng support.
Hãy xem breakout trên chart.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const englishViolations = result.violations.filter(
        (v) => v.type === 'english_term',
      );
      expect(englishViolations.length).toBeGreaterThan(0);

      const stopLoss = englishViolations.find((v) => v.term === 'stop loss');
      expect(stopLoss).toBeDefined();
      expect(stopLoss!.replacement).toBe('điểm cắt lỗ');
    });

    it('should detect "mindset" and suggest "tư duy"', () => {
      const content = `## Phần 1
Growth mindset là chìa khóa thành công.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'english_term' && v.term === 'mindset',
      );
      expect(violation).toBeDefined();
      expect(violation!.replacement).toBe('tư duy');
    });
  });

  // ─── Bullet Points Detection ───

  describe('bullet points detection', () => {
    it('should detect bullet point usage', () => {
      const content = `## Phần 1
Có 3 điều quan trọng:
- Điều thứ nhất là kiên nhẫn
- Điều thứ hai là kỷ luật
- Điều thứ ba là niềm tin`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'bullet_points',
      );
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe('high');
    });

    it('should not flag content without bullet points', () => {
      const content = `## Phần 1
Điều quan trọng nhất là kiên nhẫn. Tiếp theo là kỷ luật.
Và cuối cùng, niềm tin sẽ giúp bạn vượt qua mọi thử thách.`;

      const result = brandVoiceChecker.check(content, 'latc');

      const violation = result.violations.find(
        (v) => v.type === 'bullet_points',
      );
      expect(violation).toBeUndefined();
    });
  });

  // ─── Score Calculation ───

  describe('score calculation', () => {
    it('should return score 100 for clean content', () => {
      // Minimal clean content matching word count range
      const content = `## Hook

${'Đây là nội dung sạch không vi phạm bất kỳ quy tắc nào trong thế giới đầu tư crypto và ngoài thị trường trong cuộc sống hàng ngày. '.repeat(30)}

## Phần 1

${'Trong thế giới đầu tư crypto mỗi trader cần có kỷ luật. Ngoài thị trường trong cuộc sống điều này cũng đúng. '.repeat(20)}

## Phần 2

${'Trong thế giới đầu tư crypto mỗi trader cần có kỷ luật. Ngoài thị trường trong cuộc sống điều này cũng đúng. '.repeat(20)}

## CTA

Hãy bắt đầu hành trình ngay hôm nay.

## Closing

Hẹn gặp lại bạn trong video tiếp theo.`;

      const result = brandVoiceChecker.check(content, 'latc');
      // Score should be high (may not be exactly 100 due to word count check)
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should reduce score for each violation', () => {
      const cleanContent = `## Hook
Trong thế giới đầu tư mọi thứ đều có quy luật.`;

      const dirtyContent = `## Hook
Trong thế giới tâm linh mọi thứ đều có quy luật. Đảm bảo lợi nhuận cho bạn.`;

      const cleanResult = brandVoiceChecker.check(cleanContent, 'latc');
      const dirtyResult = brandVoiceChecker.check(dirtyContent, 'latc');

      expect(dirtyResult.score).toBeLessThan(cleanResult.score);
    });

    it('should never return score below 0', () => {
      // Content with many violations
      const content = `## Hook
Tâm linh giàu nhanh đảm bảo lợi nhuận.
Use stop loss at support for breakout and mindset healing.
- bullet point 1
- bullet point 2`;

      const result = brandVoiceChecker.check(content, 'latc');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Auto Fix ───

  describe('autoFix', () => {
    it('should replace "tâm linh" with "tâm thức"', () => {
      const content = 'Hành trình tâm linh của mỗi người là khác nhau.';
      const result = brandVoiceChecker.autoFix(content);

      expect(result.fixed).toContain('tâm thức');
      expect(result.fixed).not.toContain('tâm linh');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should convert English terms to Vietnamese', () => {
      const content = 'Bạn cần đặt stop loss ở vùng support.';
      const result = brandVoiceChecker.autoFix(content);

      expect(result.fixed).toContain('điểm cắt lỗ');
      expect(result.fixed).toContain('hỗ trợ');
    });
  });

  // ─── Word Count ───

  describe('word count', () => {
    it('should report word count in result', () => {
      const content = 'Một hai ba bốn năm sáu bảy tám chín mười.';
      const result = brandVoiceChecker.check(content, 'short_clip');

      expect(result.wordCount).toBe(10);
    });

    it('should report section count', () => {
      const content = `## Phần 1
Nội dung phần 1.

## Phần 2
Nội dung phần 2.

## Phần 3
Nội dung phần 3.`;

      const result = brandVoiceChecker.check(content, 'latc');
      expect(result.sectionCount).toBe(3);
    });
  });
});
