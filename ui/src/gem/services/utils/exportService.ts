// ============================================================================
// Export Service
// GEM Content Control Center
//
// Dịch vụ xuất nội dung ra nhiều định dạng:
// - Markdown (giữ format, thêm metadata header)
// - Plain text (cho clipboard)
// - Teleprompter (format lớn, rõ ràng cho đọc trước camera)
// - File download (Markdown, Text)
//
// Hỗ trợ copy vào clipboard và tải file.
// ============================================================================

import { vietnameseNLP } from './vietnameseNLP';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportMetadata {
  title: string;
  contentType: string;
  track: string;
  persona: string;
  wordCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  latc: 'LATC (Long-form Authority Thought-leader Content)',
  tmt: 'TMT (Thầy Minh Tuệ Commentary)',
  short_clip: 'Short Clip',
};

const TRACK_LABELS: Readonly<Record<string, string>> = {
  wealth: 'Tài chính & Đầu tư',
  wellness: 'Tâm linh & Sức khỏe tinh thần',
  integration: 'Tích hợp Đời sống',
};

const PERSONA_LABELS: Readonly<Record<string, string>> = {
  jennie_mentor: 'Jennie Mentor',
  jennie_provocateur: 'Jennie Provocateur',
  jennie_storyteller: 'Jennie Storyteller',
  jennie_analyst: 'Jennie Analyst',
  jennie_motivator: 'Jennie Motivator',
  jennie_educator: 'Jennie Educator',
  jennie_confidante: 'Jennie Confidante',
};

/** Ký tự phân cách teleprompter giữa các đoạn */
const TELEPROMPTER_SEPARATOR = '>>>';

/** Regex patterns cho các phần nhấn mạnh cần viết hoa trong teleprompter */
const EMPHASIS_PATTERNS: readonly RegExp[] = [
  /\*\*(.+?)\*\*/g,   // Bold markdown
  /__(.*?)__/g,        // Underline-style bold
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Định dạng ngày tháng theo kiểu Việt Nam: DD/MM/YYYY HH:mm
 */
function formatVietnameseDate(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Sanitize tên file: loại bỏ ký tự đặc biệt, thay khoảng trắng bằng dấu gạch ngang.
 */
function sanitizeFilename(text: string): string {
  return text
    .normalize('NFC')
    // Loại bỏ dấu tiếng Việt cho tên file (giữ ASCII)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Thay đổi đ/Đ
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    // Loại bỏ ký tự đặc biệt
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/\s+/g, '-')
    // Loại bỏ gạch ngang liên tiếp
    .replace(/-+/g, '-')
    // Loại bỏ gạch ngang đầu/cuối
    .replace(/^-|-$/g, '')
    // Chuyển thường
    .toLowerCase()
    // Giới hạn độ dài
    .slice(0, 80);
}

/**
 * Định dạng ngày tháng cho tên file: YYYY-MM-DD
 */
function formatDateForFilename(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const exportService = {
  /**
   * Chuyển đổi kịch bản sang Markdown với metadata header.
   *
   * Thêm YAML-style frontmatter chứa thông tin:
   * - Tiêu đề, loại nội dung, track, persona
   * - Số từ, ngày tạo
   *
   * Giữ nguyên format Markdown gốc.
   * Thêm footer với thông tin tạo nội dung.
   */
  toMarkdown(content: string, metadata: ExportMetadata): string {
    const contentTypeLabel = CONTENT_TYPE_LABELS[metadata.contentType] ?? metadata.contentType;
    const trackLabel = TRACK_LABELS[metadata.track] ?? metadata.track;
    const personaLabel = PERSONA_LABELS[metadata.persona] ?? metadata.persona;
    const formattedDate = formatVietnameseDate(metadata.createdAt);

    const estimatedDuration = vietnameseNLP.estimateDuration(content);
    const durationFormatted = vietnameseNLP.formatDuration(estimatedDuration);

    const header = `---
Tiêu đề: ${metadata.title}
Loại nội dung: ${contentTypeLabel}
Track: ${trackLabel}
Persona: ${personaLabel}
Số từ: ${metadata.wordCount}
Thời lượng ước tính: ${durationFormatted}
Ngày tạo: ${formattedDate}
---

# ${metadata.title}

`;

    const footer = `

---

*Kịch bản được tạo bởi GEM Content Control Center*
*${contentTypeLabel} | ${trackLabel} | ${personaLabel}*
*${metadata.wordCount} từ | ${durationFormatted}*
*Ngày tạo: ${formattedDate}*
`;

    return header + content + footer;
  },

  /**
   * Chuyển đổi kịch bản sang plain text (dùng cho clipboard).
   *
   * Loại bỏ tất cả format Markdown:
   * - Heading markers (##, ###)
   * - Bold/italic markers (**, __, *)
   * - Link syntax
   * - Code blocks
   * - Horizontal rules
   *
   * Giữ lại nội dung text thuần.
   */
  toPlainText(content: string): string {
    let text = vietnameseNLP.stripMarkdown(content);

    // Chuẩn hoá khoảng trắng: loại bỏ khoảng trắng thừa đầu/cuối mỗi dòng
    text = text
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Đảm bảo không quá 2 dòng trống liên tiếp
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  },

  /**
   * Chuyển đổi sang định dạng teleprompter.
   *
   * Tối ưu cho đọc trước camera:
   * - Loại bỏ Markdown formatting
   * - Thêm dấu >>> giữa các đoạn (dễ nhận biết điểm dừng)
   * - Loại bỏ section headers và labels
   * - Viết hoa các phần nhấn mạnh
   * - Khoảng cách lớn giữa các đoạn
   */
  toTeleprompter(content: string): string {
    // Bước 1: Trích xuất các phần nhấn mạnh (bold) và viết hoa
    let processed = content;

    for (const pattern of EMPHASIS_PATTERNS) {
      processed = processed.replace(pattern, (_match, captured: string) => {
        return captured.toUpperCase();
      });
    }

    // Bước 2: Dùng vietnameseNLP để chuyển sang teleprompter text
    let teleprompterText = vietnameseNLP.toTeleprompterText(processed);

    // Bước 3: Loại bỏ số thứ tự đầu dòng kiểu "1.", "2.", "[A]", "[B]"
    teleprompterText = teleprompterText.replace(
      /^\s*(\d+\.\s*|\[\w\]\s*)/gm,
      '',
    );

    // Bước 4: Thay thế khoảng cách đôi bằng separator teleprompter
    teleprompterText = teleprompterText.replace(
      /\n\n+/g,
      `\n\n${TELEPROMPTER_SEPARATOR}\n\n`,
    );

    // Bước 5: Loại bỏ separator liên tiếp
    teleprompterText = teleprompterText.replace(
      new RegExp(`(${TELEPROMPTER_SEPARATOR}\\s*){2,}`, 'g'),
      `${TELEPROMPTER_SEPARATOR}\n\n`,
    );

    return teleprompterText.trim();
  },

  /**
   * Copy text vào clipboard.
   *
   * Sử dụng Clipboard API hiện đại (navigator.clipboard).
   * Fallback: tạo textarea ẩn + execCommand('copy') cho trình duyệt cũ.
   *
   * @returns true nếu copy thành công, false nếu thất bại.
   */
  async copyToClipboard(text: string): Promise<boolean> {
    // Thử Clipboard API hiện đại
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback bên dưới
      }
    }

    // Fallback: textarea + execCommand
    if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;

        // Ẩn textarea ngoài viewport
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        return success;
      } catch {
        return false;
      }
    }

    return false;
  },

  /**
   * Tạo tên file cho xuất nội dung.
   *
   * Format: {sanitized-title}_{date}.{extension}
   * Ví dụ: "tu-duy-tan-so-tien-bac_2026-03-03.md"
   *
   * @param title - Tiêu đề gốc (có dấu tiếng Việt)
   * @param format - Định dạng file: 'md' | 'txt' | 'teleprompter.txt'
   */
  generateFilename(title: string, format: string): string {
    const sanitized = sanitizeFilename(title);
    const dateStr = formatDateForFilename(new Date().toISOString());

    // Xác định extension
    let extension: string;
    switch (format) {
      case 'md':
      case 'markdown':
        extension = 'md';
        break;
      case 'teleprompter':
      case 'teleprompter.txt':
        extension = 'teleprompter.txt';
        break;
      case 'txt':
      case 'text':
      default:
        extension = 'txt';
        break;
    }

    const baseName = sanitized || 'kich-ban';
    return `${baseName}_${dateStr}.${extension}`;
  },

  /**
   * Tải file xuống máy người dùng.
   *
   * Tạo Blob từ nội dung, tạo URL tạm thời,
   * trigger download qua thẻ <a>, và dọn dẹp.
   *
   * @param content - Nội dung file
   * @param filename - Tên file (đã sanitize)
   * @param mimeType - MIME type (ví dụ: 'text/markdown', 'text/plain')
   */
  downloadAsFile(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    // Thêm BOM cho UTF-8 để đảm bảo các editor nhận diện đúng encoding
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Ẩn link
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Dọn dẹp sau một tick để đảm bảo download đã bắt đầu
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Xuất kịch bản dưới dạng file Markdown và trigger download.
   */
  downloadAsMarkdown(content: string, metadata: ExportMetadata): void {
    const markdown = exportService.toMarkdown(content, metadata);
    const filename = exportService.generateFilename(metadata.title, 'md');
    exportService.downloadAsFile(markdown, filename, 'text/markdown');
  },

  /**
   * Xuất kịch bản dưới dạng plain text và trigger download.
   */
  downloadAsText(content: string, title: string): void {
    const plainText = exportService.toPlainText(content);
    const filename = exportService.generateFilename(title, 'txt');
    exportService.downloadAsFile(plainText, filename, 'text/plain');
  },

  /**
   * Xuất kịch bản dưới dạng teleprompter và trigger download.
   */
  downloadAsTeleprompter(content: string, title: string): void {
    const teleprompter = exportService.toTeleprompter(content);
    const filename = exportService.generateFilename(title, 'teleprompter.txt');
    exportService.downloadAsFile(teleprompter, filename, 'text/plain');
  },
};

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type { ExportMetadata };
