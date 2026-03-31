// ============================================================================
// Title Generator Service
// GEM Content Control Center
//
// Dịch vụ tạo tiêu đề video cho 3 định dạng nội dung:
// - LATC: 4 công thức tiêu đề (Tương phản, Số+Bí mật, Tại sao+Pain, Keyword bí ẩn)
// - TMT: 5 công thức tiêu đề (Keyword+Drama, Số+Bí mật, Câu hỏi, Hành trình, Cảnh báo)
// - Short Clip: Tiêu đề ngắn, punchy cho mobile
//
// Gọi Claude AI để tạo, parse JSON, và validate tiêu đề.
// ============================================================================

import type {
  ContentType,
  PersonaType,
  Track,
} from '@gem/types';
import { claudeService } from '../api/claudeService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TitleGenParams {
  topic: string;
  contentType: ContentType;
  persona: PersonaType;
  track: Track;
  scriptSummary?: string;
  onStream?: (chunk: string) => void;
}

interface GeneratedTitle {
  formula: string;
  formulaName: string;
  title: string;
  charCount: number;
  estimatedCtr: string;
}

interface TitleSet {
  titles: GeneratedTitle[];
  topic: string;
  contentType: ContentType;
}

interface TitleValidationResult {
  valid: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TITLE_LENGTH_STANDARD = 65;
const MAX_TITLE_LENGTH_CLIP = 50;

const TRACK_CONTEXT: Readonly<Record<Track, string>> = {
  wealth: 'Tài chính, đầu tư, crypto, trading',
  wellness: 'Tâm linh, thiền, tần số, chữa lành',
  integration: 'Tích hợp đời sống, phát triển bản thân',
};

/** Tên sản phẩm/khóa học KHÔNG được xuất hiện trong tiêu đề */
const FORBIDDEN_PRODUCT_NAMES: readonly string[] = [
  'GEM',
  'GEM App',
  'GEM Scanner',
  'GEM Whale',
  'khóa học',
  'course',
  'chương trình',
  'đăng ký',
  'mua ngay',
  'giá',
  'miễn phí',
  'free',
];

/** Từ tiếng Anh không nên xuất hiện trong tiêu đề (trừ thuật ngữ chuyên ngành) */
const ENGLISH_STOPWORDS: readonly string[] = [
  'the',
  'and',
  'for',
  'you',
  'this',
  'that',
  'with',
  'from',
  'your',
  'how',
  'why',
  'what',
  'when',
  'where',
  'who',
];

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

function buildLATCTitlePrompt(
  topic: string,
  track: Track,
  scriptSummary: string,
): string {
  return `Tạo tiêu đề video YouTube cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ''}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 4 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Tương phản nhỏ→lớn:
"Từ [điều nhỏ bé] → [điều lớn lao đầy ý nghĩa]"
Ví dụ: "Từ 1 Đồng Xu → Tần Số Thay Đổi Cả Cuộc Đời"

CÔNG THỨC B — Số + Bí mật:
"[Số] Sự Thật/Thói Quen/Bí Mật Về [chủ đề]..."
Ví dụ: "5 Thói Quen Buổi Sáng Nâng Tần Số Ngay Lập Tức"

CÔNG THỨC C — Tại sao + Pain + Tần số:
"Tại Sao [nỗi đau]? — Đây Là Tần Số..."
Ví dụ: "Tại Sao Bạn Cứ Mất Tiền? — Đây Là Tần Số Đang Phá Hoại Bạn"

CÔNG THỨC D — Keyword bí ẩn:
"Một [từ/điều/thói quen] thôi cũng thay đổi tần số..."
Ví dụ: "Một Từ Thôi Cũng Thay Đổi Tần Số Tiền Bạc Của Bạn"

QUY TẮC:
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- CTR mục tiêu: 8-14%.
- Viết hoa chữ cái đầu mỗi từ quan trọng.
- Dùng dấu "..." hoặc "—" để tạo tò mò.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Tương phản nhỏ→lớn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "B",
    "formulaName": "Số + Bí mật",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "C",
    "formulaName": "Tại sao + Pain",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`;
}

function buildTMTTitlePrompt(
  topic: string,
  track: Track,
  scriptSummary: string,
): string {
  return `Tạo tiêu đề video YouTube TMT (Thầy Minh Tuệ Commentary) cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ''}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 5 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Keyword + Drama:
"[SƯ MINH TUỆ]: [Drama hook]"
Ví dụ: "SƯ MINH TUỆ: Sự Thật Đằng Sau Cuộc Hành Trình..."

CÔNG THỨC B — Số + Bí mật:
"SƯ MINH TUỆ — [Số] Bí Mật Về [Chủ đề]..."
Ví dụ: "SƯ MINH TUỆ — 5 Bí Mật Về Cuộc Sống Khất Thực"

CÔNG THỨC C — Câu hỏi:
"SƯ MINH TUỆ: Tại Sao [Câu hỏi]?"
Ví dụ: "SƯ MINH TUỆ: Tại Sao Ngài Từ Chối Mọi Cúng Dường?"

CÔNG THỨC D — Hành trình:
"SƯ MINH TUỆ — Hành Trình [Mô tả hành trình]..."
Ví dụ: "SƯ MINH TUỆ — Hành Trình 6 Năm Không Một Đồng"

CÔNG THỨC E — Cảnh báo + Nhân quả:
"SƯ MINH TUỆ: CẢNH BÁO — [Cảnh báo liên quan nhân quả]"
Ví dụ: "SƯ MINH TUỆ: CẢNH BÁO — Nhân Quả Với Người Phỉ Báng Tu Hành"

QUY TẮC ĐẶC BIỆT TMT:
- "SƯ MINH TUỆ" PHẢI xuất hiện ĐẦU TIÊN trong tiêu đề.
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- Giọng kính trọng — KHÔNG giật gân rẻ tiền.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Keyword + Drama",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "C",
    "formulaName": "Câu hỏi",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "E",
    "formulaName": "Cảnh báo + Nhân quả",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`;
}

function buildClipTitlePrompt(
  topic: string,
  track: Track,
  scriptSummary: string,
): string {
  return `Tạo tiêu đề Short Clip (TikTok/Reels/Shorts) cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ''}

Tạo 3 tiêu đề ngắn, punchy, tối ưu cho mobile:

QUY TẮC:
- Dưới 50 ký tự (hiển thị tốt trên mobile).
- Gây tò mò ngay lập tức.
- Tiếng Việt có dấu đầy đủ.
- Dùng 1 trong các pattern:
  + Câu hỏi ngắn: "Tại sao...?"
  + Thách thức: "Bạn dám [X] không?"
  + Bí mật: "[Số] điều về [X]..."
  + Phản đề: "[X] không như bạn nghĩ"
  + Cảm xúc: "Khi [tình huống đau]..."

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "question",
    "formulaName": "Câu hỏi ngắn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "12-15%"
  },
  {
    "formula": "challenge",
    "formulaName": "Thách thức",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "11-14%"
  },
  {
    "formula": "emotion",
    "formulaName": "Cảm xúc",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-13%"
  }
]`;
}

// ---------------------------------------------------------------------------
// JSON Parser
// ---------------------------------------------------------------------------

interface RawTitleJson {
  formula: string;
  formulaName: string;
  title: string;
  estimatedCtr: string;
}

function parseJsonTitles(response: string): RawTitleJson[] {
  // Tìm JSON array trong response (bỏ qua text thừa nếu có)
  const jsonMatch = response.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error('Không tìm thấy JSON hợp lệ trong phản hồi tạo tiêu đề.');
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(parsed)) {
    throw new Error('Phản hồi tạo tiêu đề không phải mảng JSON.');
  }

  // Validate từng item
  const results: RawTitleJson[] = [];

  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'formula' in item &&
      'formulaName' in item &&
      'title' in item &&
      'estimatedCtr' in item
    ) {
      const record = item as Record<string, unknown>;
      const formula = record.formula;
      const formulaName = record.formulaName;
      const title = record.title;
      const estimatedCtr = record.estimatedCtr;

      if (
        typeof formula === 'string' &&
        typeof formulaName === 'string' &&
        typeof title === 'string' &&
        typeof estimatedCtr === 'string'
      ) {
        results.push({ formula, formulaName, title, estimatedCtr });
      }
    }
  }

  if (results.length === 0) {
    throw new Error('Không có tiêu đề hợp lệ trong phản hồi.');
  }

  return results;
}

// ---------------------------------------------------------------------------
// Title Validator
// ---------------------------------------------------------------------------

function validateTitle(title: string, contentType: ContentType): TitleValidationResult {
  const warnings: string[] = [];
  const maxLength = contentType === 'short_clip'
    ? MAX_TITLE_LENGTH_CLIP
    : MAX_TITLE_LENGTH_STANDARD;

  // Kiểm tra độ dài ký tự
  if (title.length > maxLength) {
    warnings.push(
      `Tiêu đề vượt quá ${maxLength} ký tự (hiện tại: ${title.length} ký tự).`,
    );
  }

  // Kiểm tra tên sản phẩm/khóa học
  const lowerTitle = title.toLowerCase();
  for (const forbidden of FORBIDDEN_PRODUCT_NAMES) {
    if (lowerTitle.includes(forbidden.toLowerCase())) {
      warnings.push(
        `Tiêu đề chứa từ cấm "${forbidden}". Không được nhắc tên sản phẩm/khóa học trong tiêu đề.`,
      );
    }
  }

  // Kiểm tra dấu tiếng Việt
  // Tiếng Việt có dấu phải chứa ít nhất một số ký tự có dấu
  const vietnameseAccentPattern = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
  if (!vietnameseAccentPattern.test(title)) {
    warnings.push(
      'Tiêu đề không có dấu tiếng Việt. Cần viết đầy đủ dấu.',
    );
  }

  // Kiểm tra từ tiếng Anh phổ thông (không phải thuật ngữ chuyên ngành)
  const words = title.toLowerCase().split(/\s+/);
  const foundEnglish: string[] = [];
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 0 && ENGLISH_STOPWORDS.includes(cleanWord)) {
      foundEnglish.push(cleanWord);
    }
  }
  if (foundEnglish.length > 0) {
    warnings.push(
      `Tiêu đề chứa từ tiếng Anh không cần thiết: ${foundEnglish.join(', ')}. Nên dùng tiếng Việt.`,
    );
  }

  // Kiểm tra TMT: "SƯ MINH TUỆ" phải ở đầu
  if (contentType === 'tmt') {
    const trimmedTitle = title.trim();
    const startsWithSMT = trimmedTitle.startsWith('SƯ MINH TUỆ')
      || trimmedTitle.startsWith('Sư Minh Tuệ');

    if (!startsWithSMT) {
      warnings.push(
        'Tiêu đề TMT phải bắt đầu bằng "SƯ MINH TUỆ". Đây là quy tắc bắt buộc cho nội dung TMT.',
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const TITLE_SYSTEM_PROMPT = `Bạn là chuyên gia tạo tiêu đề video YouTube tiếng Việt cho kênh Jennie.
Bạn hiểu sâu về:
- Thuật toán YouTube và CTR optimization.
- Tâm lý người xem Việt Nam.
- Cách viết tiêu đề gây tò mò mà không clickbait rẻ tiền.

QUY TẮC:
- Trả lời ĐÚNG format JSON được yêu cầu.
- KHÔNG thêm giải thích hay text ngoài JSON.
- Tiếng Việt có dấu đầy đủ.
- KHÔNG dùng emoji trong tiêu đề.`;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const titleGenerator = {
  /**
   * Tạo tiêu đề LATC — 3 tiêu đề theo 3/4 công thức:
   * A: Tương phản nhỏ→lớn
   * B: Số + Bí mật
   * C: Tại sao + Pain + Tần số
   * D: Keyword bí ẩn
   *
   * Yêu cầu: dưới 65 ký tự, không tên sản phẩm, CTR 8-14%.
   */
  async generateLATCTitles(params: TitleGenParams): Promise<TitleSet> {
    const userPrompt = buildLATCTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? '',
    );

    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.8,
      onStream: params.onStream,
    });

    const rawTitles = parseJsonTitles(result.content);

    const titles: GeneratedTitle[] = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr,
    }));

    return {
      titles,
      topic: params.topic,
      contentType: 'latc',
    };
  },

  /**
   * Tạo tiêu đề TMT — 3 tiêu đề theo 3/5 công thức:
   * A: Keyword + Drama
   * B: Số + Bí mật
   * C: Câu hỏi
   * D: Hành trình
   * E: Cảnh báo + Nhân quả
   *
   * Đặc biệt: "SƯ MINH TUỆ" phải xuất hiện ĐẦU TIÊN.
   */
  async generateTMTTitles(params: TitleGenParams): Promise<TitleSet> {
    const userPrompt = buildTMTTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? '',
    );

    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.8,
      onStream: params.onStream,
    });

    const rawTitles = parseJsonTitles(result.content);

    const titles: GeneratedTitle[] = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr,
    }));

    return {
      titles,
      topic: params.topic,
      contentType: 'tmt',
    };
  },

  /**
   * Tạo tiêu đề Short Clip — 3 tiêu đề ngắn, punchy:
   * Dưới 50 ký tự (tối ưu mobile).
   * Patterns: câu hỏi, thách thức, bí mật, phản đề, cảm xúc.
   */
  async generateClipTitles(params: TitleGenParams): Promise<TitleSet> {
    const userPrompt = buildClipTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? '',
    );

    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.85,
      onStream: params.onStream,
    });

    const rawTitles = parseJsonTitles(result.content);

    const titles: GeneratedTitle[] = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr,
    }));

    return {
      titles,
      topic: params.topic,
      contentType: 'short_clip',
    };
  },

  /**
   * Validate tiêu đề theo quy tắc:
   * - Kiểm tra độ dài ký tự (65 cho LATC/TMT, 50 cho clip)
   * - Kiểm tra tên sản phẩm/khóa học
   * - Kiểm tra dấu tiếng Việt
   * - Kiểm tra từ tiếng Anh không cần thiết
   * - Kiểm tra vị trí "SƯ MINH TUỆ" cho TMT
   */
  validateTitle,
};

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type {
  TitleGenParams,
  GeneratedTitle,
  TitleSet,
  TitleValidationResult,
};
