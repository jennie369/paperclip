// @ts-nocheck
// ============================================================================
// Brand Voice Compliance Checker
// GEM Content Control Center
//
// Kiểm tra nội dung đã tạo có tuân thủ brand voice, quy tắc vàng,
// và các ràng buộc về thuật ngữ, cấu trúc, phân bổ GEM tools.
// ============================================================================

import type { ContentType } from '@gem/types';
import { vietnameseNLP, TERM_CONVERSIONS } from '../utils/vietnameseNLP';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckerViolation {
  readonly type: string;
  readonly term?: string;
  readonly replacement?: string | null;
  readonly count?: number;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly message: string;
  readonly suggestion: string;
  readonly lineNumber?: number;
  readonly excerpt?: string;
}

interface TermLocation {
  readonly line: number;
  readonly excerpt: string;
}

interface AutoFixChange {
  readonly from: string;
  readonly to: string;
  readonly count: number;
}

interface AutoFixResult {
  readonly fixed: string;
  readonly changes: readonly AutoFixChange[];
}

export interface BrandVoiceCheckResult {
  readonly score: number;
  readonly violations: readonly CheckerViolation[];
  readonly passed: boolean;
  readonly checkedAt: string;
  readonly wordCount: number;
  readonly sectionCount: number;
}

// ---------------------------------------------------------------------------
// Forbidden Terms — term → replacement (null = must remove entirely)
// ---------------------------------------------------------------------------

interface ForbiddenTermRule {
  readonly pattern: RegExp;
  readonly label: string;
  readonly replacement: string | null;
  readonly penalty: number;
  readonly severity: 'critical' | 'high';
}

const FORBIDDEN_TERMS: readonly ForbiddenTermRule[] = [
  {
    pattern: /tâm\s+linh/gi,
    label: 'tâm linh',
    replacement: 'tâm thức',
    penalty: 15,
    severity: 'critical',
  },
  {
    pattern: /dạy\s+crypto/gi,
    label: 'dạy crypto',
    replacement: 'giúp bạn hiểu năng lượng đồng tiền',
    penalty: 15,
    severity: 'critical',
  },
  {
    pattern: /đảm\s+bảo\s+lợi\s+nhuận/gi,
    label: 'đảm bảo lợi nhuận',
    replacement: null,
    penalty: 15,
    severity: 'critical',
  },
  {
    pattern: /giàu\s+nhanh/gi,
    label: 'giàu nhanh',
    replacement: null,
    penalty: 15,
    severity: 'critical',
  },
  {
    pattern: /(?:^|[^A-Za-zÀ-ỹ])(?:ông|anh)\s+(?:thầy|sư|hòa thượng|đại đức|thượng tọa)/gi,
    label: 'ông/anh khi nói về tu sĩ',
    replacement: 'Thầy/Ngài',
    penalty: 8,
    severity: 'high',
  },
];

// ---------------------------------------------------------------------------
// GEM tool names for distribution check
// ---------------------------------------------------------------------------

const GEM_TOOL_PATTERNS: readonly RegExp[] = [
  /GEM\s+Scanner/gi,
  /GEM\s+Vision\s+Board/gi,
  /GEM\s+Tarot/gi,
  /GEM\s+Sư\s+Phụ\s+AI/gi,
  /Templates?\s+giao\s+dịch/gi,
  /Paper\s+Trade/gi,
  /Tần\s+Số\s+Tình\s+Yêu/gi,
  /Master\s+AI/gi,
  /App\s+GEMRAL/gi,
  /GEMRAL/gi,
];

// ---------------------------------------------------------------------------
// GEM product/course names for title check
// ---------------------------------------------------------------------------

const PRODUCT_NAMES: readonly string[] = [
  'GEM Scanner',
  'GEM Vision Board',
  'GEM Tarot',
  'GEM Sư Phụ AI',
  'Paper Trade',
  'Tần Số Tình Yêu',
  'Master AI',
  'GEMRAL',
  'Templates giao dịch',
];

// ---------------------------------------------------------------------------
// Word count targets per content type
// ---------------------------------------------------------------------------

interface WordCountRange {
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

const WORD_COUNT_TARGETS: Readonly<Record<ContentType, WordCountRange>> = {
  latc: { min: 4000, max: 5500, label: 'LATC' },
  tmt: { min: 4500, max: 5500, label: 'TMT' },
  short_clip: { min: 75, max: 200, label: 'Short Clip' },
  social_post: { min: 50, max: 500, label: 'Social Post' },
  news: { min: 500, max: 3000, label: 'Tin Tức' },
};

// ---------------------------------------------------------------------------
// Context lead-in patterns
// ---------------------------------------------------------------------------

const CONTEXT_LEAD_INS: readonly RegExp[] = [
  /[Tt]rong\s+thế\s+giới\s+đầu\s+tư/g,
  /[Nn]goài\s+thị\s+trường/g,
  /[Tt]rong\s+cuộc\s+sống/g,
  /[Hh]ãy\s+tưởng\s+tượng/g,
  /[Qq]uay\s+lại\s+với\s+crypto/g,
  /[Tt]rong\s+thế\s+giới\s+crypto/g,
  /[Tt]rong\s+thế\s+giới\s+trading/g,
];

// ---------------------------------------------------------------------------
// Emoji detection regex
// ---------------------------------------------------------------------------

const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return vietnameseNLP.countWords(text);
}

function countSections(text: string): number {
  const headers = text.match(/^##\s+/gm);
  return headers ? headers.length : 0;
}

function extractSections(text: string): string[] {
  // Split by ## headers, keeping each section's content
  const parts = text.split(/^##\s+/m);
  // First part is content before any ##, skip if empty
  return parts.filter((part) => part.trim().length > 0);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Brand Voice Checker
// ---------------------------------------------------------------------------

export const brandVoiceChecker = {
  /**
   * Kiểm tra toàn diện nội dung theo brand voice rules.
   * Trả về điểm số (0-100), danh sách vi phạm, và trạng thái pass/fail.
   */
  check(content: string, contentType: ContentType): BrandVoiceCheckResult {
    let score = 100;
    const violations: CheckerViolation[] = [];

    // ─── 1. FORBIDDEN TERMS ───
    for (const rule of FORBIDDEN_TERMS) {
      const matches = content.match(rule.pattern);
      if (matches && matches.length > 0) {
        const locations = this.findLocations(content, rule.label);
        const firstLocation = locations[0];

        score -= rule.penalty * matches.length;
        violations.push({
          type: 'forbidden_term',
          term: rule.label,
          replacement: rule.replacement,
          count: matches.length,
          severity: rule.severity,
          message: rule.replacement
            ? `Thuật ngữ cấm "${rule.label}" xuất hiện ${matches.length} lần. Thay bằng "${rule.replacement}".`
            : `Thuật ngữ cấm "${rule.label}" xuất hiện ${matches.length} lần. Phải xóa hoàn toàn.`,
          suggestion: rule.replacement
            ? `Thay tất cả "${rule.label}" bằng "${rule.replacement}".`
            : `Xóa hoàn toàn "${rule.label}" và viết lại câu.`,
          lineNumber: firstLocation?.line,
          excerpt: firstLocation?.excerpt,
        });
      }
    }

    // ─── 2. ENGLISH TERMS ───
    const englishDetections = vietnameseNLP.detectEnglishTerms(content);
    for (const detection of englishDetections) {
      const locations = this.findLocations(content, detection.term);
      const firstLocation = locations[0];

      const penalty = 3 * detection.positions.length;
      score -= penalty;
      violations.push({
        type: 'english_term',
        term: detection.term,
        replacement: detection.vietnamese,
        count: detection.positions.length,
        severity: 'medium',
        message: `Thuật ngữ tiếng Anh "${detection.term}" xuất hiện ${detection.positions.length} lần. Dùng "${detection.vietnamese}" thay thế.`,
        suggestion: `Thay "${detection.term}" bằng "${detection.vietnamese}" trong toàn bộ nội dung.`,
        lineNumber: firstLocation?.line,
        excerpt: firstLocation?.excerpt,
      });
    }

    // ─── 3. DUAL EXAMPLES CHECK (LATC & TMT only) ───
    if (contentType === 'latc' || contentType === 'tmt') {
      const sections = extractSections(content);

      // Only check body sections (skip hook/intro and closing/CTA sections)
      const bodySections = sections.slice(1, -2);

      for (let i = 0; i < bodySections.length; i++) {
        const section = bodySections[i];
        const sectionLabel = `Phần ${i + 1}`;

        const hasCryptoExample =
          /trong\s+thế\s+giới\s+(đầu\s+tư|crypto|trading)/i.test(section ?? '') ||
          /crypto|bitcoin|trading|giao\s+dịch|thị\s+trường/i.test(section ?? '');

        const hasLifeExample =
          /ngoài\s+thị\s+trường/i.test(section ?? '') ||
          /trong\s+cuộc\s+sống/i.test(section ?? '') ||
          /đời\s+thường|hàng\s+ngày|gia\s+đình|mối\s+quan\s+hệ/i.test(section ?? '');

        if (!hasCryptoExample || !hasLifeExample) {
          score -= 10;
          const missing = !hasCryptoExample
            ? 'ví dụ crypto/tài chính'
            : 'ví dụ đời sống';
          violations.push({
            type: 'missing_dual_example',
            severity: 'critical',
            message: `${sectionLabel} thiếu ${missing}. Mỗi phần phải có cả ví dụ crypto VÀ đời sống.`,
            suggestion: `Thêm ${missing} vào ${sectionLabel}. Dùng dẫn nhập: "${!hasCryptoExample ? 'Trong thế giới đầu tư...' : 'Ngoài thị trường, trong cuộc sống...'}"`,
          });
        }
      }
    }

    // ─── 4. BULLET POINTS CHECK ───
    const bulletPointRegex = /^[\s]*[-•*]\s/m;
    if (bulletPointRegex.test(content)) {
      const bulletLocations = this.findLocations(content, '- ');
      const firstBullet = bulletLocations[0];

      score -= 8;
      violations.push({
        type: 'bullet_points',
        severity: 'high',
        message: 'Nội dung chứa bullet points. Script phải viết dạng văn xuôi (prose), không liệt kê.',
        suggestion: 'Chuyển bullet points thành câu văn: "Thứ nhất là...", "Tiếp theo,...", "Và quan trọng nhất,..."',
        lineNumber: firstBullet?.line,
        excerpt: firstBullet?.excerpt,
      });
    }

    // ─── 5. CTA POSITION CHECK ───
    const ctaIndex = content.search(/khóa\s+học/i);
    const closingIndex = content.search(/hẹn\s+gặp\s+lại/i);

    if (ctaIndex !== -1 && closingIndex !== -1 && ctaIndex > closingIndex) {
      score -= 15;
      violations.push({
        type: 'cta_position',
        severity: 'critical',
        message: 'CTA khóa học đặt SAU phần closing. CTA phải đặt TRƯỚC "hẹn gặp lại".',
        suggestion: 'Di chuyển phần giới thiệu khóa học lên trước lời chào kết bài. Quy tắc: CTA → Closing.',
      });
    }

    // ─── 6. GEM TOOLS DISTRIBUTION CHECK ───
    if (contentType !== 'short_clip') {
      const totalLength = content.length;
      const lastQuarterStart = Math.floor(totalLength * 0.75);
      const toolMentions: Array<{ position: number; tool: string }> = [];

      for (const pattern of GEM_TOOL_PATTERNS) {
        // Reset lastIndex for global regex
        const regex = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
          toolMentions.push({ position: match.index, tool: match[0] });
        }
      }

      if (toolMentions.length > 0) {
        const mentionsInLastQuarter = toolMentions.filter(
          (m) => m.position >= lastQuarterStart,
        );

        if (
          mentionsInLastQuarter.length === toolMentions.length &&
          toolMentions.length > 1
        ) {
          score -= 8;
          violations.push({
            type: 'gem_tools_clustered',
            severity: 'high',
            count: toolMentions.length,
            message: `Tất cả ${toolMentions.length} lượt nhắc GEM tools đều nằm ở 25% cuối bài. Phải rải đều xuyên suốt nội dung.`,
            suggestion: 'Di chuyển các nhắc GEM tools vào từng phần nội dung. Mỗi phần nên weave 1-2 công cụ tự nhiên.',
          });
        }
      }
    }

    // ─── 7. CONTEXT LEAD-INS CHECK ───
    if (contentType !== 'short_clip') {
      let leadInCount = 0;
      for (const pattern of CONTEXT_LEAD_INS) {
        const regex = new RegExp(pattern.source, pattern.flags);
        const matches = content.match(regex);
        if (matches) {
          leadInCount += matches.length;
        }
      }

      if (leadInCount < 2) {
        score -= 5;
        violations.push({
          type: 'missing_context_leadins',
          count: leadInCount,
          severity: 'medium',
          message: `Chỉ tìm thấy ${leadInCount} câu dẫn nhập bối cảnh. Cần ít nhất 2 câu dẫn như "Trong thế giới đầu tư..." hoặc "Ngoài thị trường...".`,
          suggestion: 'Thêm câu dẫn nhập trước mỗi ví dụ: "Trong thế giới đầu tư,...", "Ngoài thị trường, trong cuộc sống,...", "Hãy tưởng tượng bạn đang..."',
        });
      }
    }

    // ─── 8. WORD COUNT CHECK ───
    const wordCount = countWords(content);
    const target = WORD_COUNT_TARGETS[contentType];

    if (target && (wordCount < target.min || wordCount > target.max)) {
      const direction = wordCount < target.min ? 'ngắn' : 'dài';
      const diff =
        wordCount < target.min
          ? target.min - wordCount
          : wordCount - target.max;

      score -= 5;
      violations.push({
        type: 'word_count',
        count: wordCount,
        severity: 'medium',
        message: `Nội dung ${target.label} có ${wordCount} từ, ${direction} hơn tiêu chuẩn (${target.min}-${target.max} từ) ${diff} từ.`,
        suggestion:
          wordCount < target.min
            ? `Thêm ${diff} từ. Mở rộng ví dụ, thêm chi tiết cảm xúc, hoặc deepening insight.`
            : `Cắt giảm ${diff} từ. Loại bỏ lặp lại, gọn câu, hoặc merge ví dụ trùng nhau.`,
      });
    }

    // ─── 9. EMOJI CHECK ───
    const emojiMatches = content.match(EMOJI_REGEX);
    if (emojiMatches && emojiMatches.length > 0) {
      score -= 5;
      violations.push({
        type: 'emoji_in_script',
        count: emojiMatches.length,
        severity: 'medium',
        message: `Tìm thấy ${emojiMatches.length} emoji trong script. Script không được chứa emoji.`,
        suggestion: 'Xóa tất cả emoji. Script viết cho teleprompter/diễn đọc, không cần biểu tượng cảm xúc.',
      });
    }

    // ─── 10. PRODUCT IN TITLE CHECK ───
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      const title = titleMatch[1] ?? '';
      for (const productName of PRODUCT_NAMES) {
        if (title.toLowerCase().includes(productName.toLowerCase())) {
          score -= 8;
          violations.push({
            type: 'product_in_title',
            term: productName,
            severity: 'high',
            message: `Tiêu đề chứa tên sản phẩm "${productName}". Tiêu đề phải giáo dục, không quảng cáo.`,
            suggestion: `Xóa "${productName}" khỏi tiêu đề. Thay bằng chủ đề giáo dục. Sản phẩm chỉ nhắc trong nội dung.`,
          });
        }
      }
    }

    return {
      score: Math.max(0, score),
      violations,
      passed: violations.filter((v) => v.severity === 'critical').length === 0,
      checkedAt: new Date().toISOString(),
      wordCount,
      sectionCount: countSections(content),
    };
  },

  /**
   * Tự động sửa các vi phạm có thể sửa tự động:
   * - Thay thế thuật ngữ cấm
   * - Chuyển đổi thuật ngữ Anh → Việt
   */
  autoFix(content: string): AutoFixResult {
    let fixed = content;
    const changes: AutoFixChange[] = [];

    // Fix forbidden terms that have replacements
    for (const rule of FORBIDDEN_TERMS) {
      if (rule.replacement === null) continue;

      const matches = fixed.match(rule.pattern);
      if (matches && matches.length > 0) {
        fixed = fixed.replace(rule.pattern, rule.replacement);
        changes.push({
          from: rule.label,
          to: rule.replacement,
          count: matches.length,
        });
      }
    }

    // Fix English terms → Vietnamese
    for (const { en, vi } of TERM_CONVERSIONS) {
      const regex = new RegExp(`\\b${escapeRegex(en)}\\b`, 'gi');
      const matches = fixed.match(regex);

      if (matches && matches.length > 0) {
        fixed = fixed.replace(regex, vi);
        changes.push({
          from: en,
          to: vi,
          count: matches.length,
        });
      }
    }

    return { fixed, changes };
  },

  /**
   * Tìm vị trí (dòng + đoạn trích) của một thuật ngữ trong nội dung.
   */
  findLocations(content: string, term: string): TermLocation[] {
    const lines = content.split('\n');
    const locations: TermLocation[] = [];
    const lowerTerm = term.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (currentLine && currentLine.toLowerCase().includes(lowerTerm)) {
        // Build excerpt: the matching line plus up to 1 line of context on each side
        const excerptParts: string[] = [];
        const prevLine = lines[i - 1];
        const nextLine = lines[i + 1];
        if (i > 0 && prevLine) excerptParts.push(prevLine.trim());
        excerptParts.push(currentLine.trim());
        if (i < lines.length - 1 && nextLine) excerptParts.push(nextLine.trim());

        const excerpt = excerptParts.join(' ').substring(0, 200);

        locations.push({
          line: i + 1, // 1-based line numbers
          excerpt,
        });
      }
    }

    return locations;
  },
};

// ---------------------------------------------------------------------------
// Named exports for direct imports
// ---------------------------------------------------------------------------

export const check = brandVoiceChecker.check.bind(brandVoiceChecker);
export const autoFix = brandVoiceChecker.autoFix.bind(brandVoiceChecker);
export const findLocations = brandVoiceChecker.findLocations.bind(brandVoiceChecker);
export { countWords, countSections, extractSections };
