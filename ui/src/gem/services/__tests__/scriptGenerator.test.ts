// ============================================================================
// Script Generator — Unit Tests
// GEM Content Control Center
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { scriptGenerator } from '../content/scriptGenerator';

// Mock claudeService to avoid real API calls
vi.mock('../api/claudeService', () => ({
  claudeService: {
    generate: vi.fn().mockResolvedValue({
      content: `## HOOK

Bạn có bao giờ tự hỏi tại sao tiền luôn tuột khỏi tay?

## PHẦN 1: Sự Thật Về Tư Duy Tiền Bạc

Trong thế giới đầu tư crypto, 95% trader thua lỗ.
Ngoài thị trường, trong cuộc sống, điều tương tự xảy ra.
GEM Scanner giúp bạn thấy điều người khác bỏ lỡ.

## PHẦN 2: Con Đường Tỉnh Thức

Hành trình tâm thức bắt đầu từ nhận thức.

## CTA KHÓA HỌC

Bạn đã sẵn sàng thay đổi chưa?

## CLOSING

Hẹn gặp lại bạn trong video tiếp theo.`,
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
    }),
  },
}));

describe('scriptGenerator', () => {
  // ─── Prompt Building ───

  describe('buildLATCPrompt', () => {
    it('should include topic in prompt', () => {
      const prompt = scriptGenerator.buildLATCPrompt(
        '5 Sự Thật Về Tiền',
        'jennie_mentor',
        'mode_1_calm',
        [],
      );

      expect(prompt).toContain('5 Sự Thật Về Tiền');
      expect(prompt).toContain('LATC');
      expect(prompt).toContain('4000-5500 từ');
    });

    it('should include product hooks when provided', () => {
      const prompt = scriptGenerator.buildLATCPrompt(
        'Topic',
        'jennie_mentor',
        'mode_1_calm',
        ['GEM Scanner', 'GEM Vision Board'],
      );

      expect(prompt).toContain('GEM Scanner');
      expect(prompt).toContain('GEM Vision Board');
    });

    it('should include MODE 2 instructions for provocative mode', () => {
      const prompt = scriptGenerator.buildLATCPrompt(
        'Topic',
        'jennie_provocateur',
        'mode_2_provocative',
        [],
      );

      expect(prompt).toContain('MODE 2');
    });
  });

  describe('buildTMTPrompt', () => {
    it('should include TMT-specific rules', () => {
      const prompt = scriptGenerator.buildTMTPrompt(
        'Thầy Minh Tuệ và Hành Trình Tu Tập',
        'jennie_mentor',
        'mode_1_calm',
      );

      expect(prompt).toContain('TMT');
      expect(prompt).toContain('Thầy');
      expect(prompt).toContain('4500-5500 từ');
    });
  });

  describe('buildClipPrompt', () => {
    it('should build MODE 1 prompt with 5 steps', () => {
      const prompt = scriptGenerator.buildClipPrompt(
        'Quick Tip',
        'jennie_mentor',
        'mode_1_calm',
      );

      expect(prompt).toContain('SHORT CLIP MODE 1');
      expect(prompt).toContain('75-200 từ');
    });

    it('should build MODE 2 prompt with 7 steps', () => {
      const prompt = scriptGenerator.buildClipPrompt(
        'Challenge',
        'jennie_provocateur',
        'mode_2_provocative',
      );

      expect(prompt).toContain('SHORT CLIP MODE 2');
      expect(prompt).toContain('Cognitive Dissonance');
    });
  });

  // ─── Script Parsing ───

  describe('parseScript', () => {
    it('should parse sections from markdown', () => {
      const content = `## HOOK
Hook content here.

## PHẦN 1: First Section
First section content.

## PHẦN 2: Second Section
Second section content.`;

      const sections = scriptGenerator.parseScript(content, 'latc');

      expect(sections.length).toBe(3);
      expect(sections[0]!.title).toBe('HOOK');
      expect(sections[1]!.title).toContain('PHẦN 1');
      expect(sections[2]!.title).toContain('PHẦN 2');
    });

    it('should count words per section', () => {
      const content = `## HOOK
Một hai ba bốn năm.`;

      const sections = scriptGenerator.parseScript(content, 'latc');
      expect(sections[0]!.wordCount).toBe(5);
    });

    it('should detect GEM tool mentions', () => {
      const content = `## PHẦN 1
Hãy dùng GEM Scanner để phân tích.`;

      const sections = scriptGenerator.parseScript(content, 'latc');
      expect(sections[0]!.hasGemTool).toBe(true);
    });

    it('should return single section when no headers found', () => {
      const content = 'Nội dung không có header.';

      const sections = scriptGenerator.parseScript(content, 'latc');
      expect(sections.length).toBe(1);
      expect(sections[0]!.title).toBe('Nội dung');
    });
  });

  // ─── Parameter Validation ───

  describe('parameter validation', () => {
    it('should generate LATC with valid params', async () => {
      const result = await scriptGenerator.generateLATC({
        topic: '5 Sự Thật Về Tiền',
        contentType: 'latc',
        persona: 'jennie_mentor',
        writingMode: 'mode_1_calm',
        track: 'wealth',
        pillar: 'latc_money',
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });
});
