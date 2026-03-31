// @ts-nocheck
// ============================================================================
// Script Generator Service
// GEM Content Control Center
//
// Dịch vụ tạo kịch bản (script) cho 3 định dạng nội dung:
// - LATC (Long-form Authority Thought-leader Content)
// - TMT (Thầy Minh Tuệ commentary)
// - Short Clip (30-70 giây)
//
// Điều phối cuộc gọi Claude AI, xây dựng prompt, và parse kết quả.
// ============================================================================

import type {
  ContentType,
  PersonaType,
  WritingMode,
  Track,
  Pillar,
} from '@gem/types';
import { claudeService } from '../api/claudeService';
import { vietnameseNLP } from '../utils/vietnameseNLP';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateScriptParams {
  topic: string;
  contentType: ContentType;
  persona: PersonaType;
  writingMode: WritingMode;
  track: Track;
  pillar: Pillar;
  productHooks?: string[];
  onStream?: (chunk: string) => void;
}

interface GeneratedScriptResult {
  content: string;
  wordCount: number;
  estimatedDuration: number;
  sections: ParsedSection[];
}

interface ParsedSection {
  title: string;
  content: string;
  wordCount: number;
  order: number;
  hasGemTool: boolean;
  hasDualExample: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSONA_LABELS: Readonly<Record<PersonaType, string>> = {
  jennie_mentor: 'Jennie Mentor — Người dẫn đường tâm linh, nhẹ nhàng nhưng sâu sắc',
  jennie_provocateur: 'Jennie Provocateur — Thách thức tư duy, phá vỡ pattern cũ',
  jennie_storyteller: 'Jennie Storyteller — Kể chuyện cuốn hút, kết nối cảm xúc',
  jennie_analyst: 'Jennie Analyst — Phân tích dữ liệu, logic, evidence-based',
  jennie_motivator: 'Jennie Motivator — Truyền năng lượng, thúc đẩy hành động',
  jennie_educator: 'Jennie Educator — Dạy có hệ thống, giải thích rõ ràng',
  jennie_confidante: 'Jennie Confidante — Tâm sự gần gũi, thấu hiểu nỗi đau',
};

const WRITING_MODE_LABELS: Readonly<Record<WritingMode, string>> = {
  mode_1_calm: 'MODE 1 — Bình tĩnh, uy tín, nuôi dưỡng. Giọng ấm áp, sâu lắng.',
  mode_2_provocative: 'MODE 2 — Táo bạo, khiêu khích, pattern-interrupting. Giọng mạnh mẽ, thẳng thắn.',
};

const TRACK_LABELS: Readonly<Record<Track, string>> = {
  wealth: 'Tài chính & Đầu tư',
  wellness: 'Tâm linh & Sức khỏe tinh thần',
  integration: 'Tích hợp Đời sống',
};

const PILLAR_LABELS: Readonly<Record<Pillar, string>> = {
  spiritual: 'Tâm linh / Tần số / Tâm thức',
  trading: 'Trading / Crypto / Đầu tư',
  latc_money: 'Tiền bạc & Tư duy tài chính',
  lifestyle: 'Lối sống & Phát triển bản thân',
};

/** Từ khoá GEM tool patterns */
const GEM_TOOL_PATTERNS: readonly string[] = [
  'GEM Scanner',
  'GEM Whale Tracker',
  'GEM Alert',
  'GEM Portfolio',
  'GEM Signal',
  'GEM App',
  'công cụ GEM',
  'ứng dụng GEM',
];

/** Từ khoá dual example patterns (crypto + đời thường) */
const DUAL_EXAMPLE_PATTERNS: readonly string[] = [
  'ví dụ crypto',
  'ví dụ đời thường',
  'trong crypto',
  'trong cuộc sống',
  'ngoài đời',
  'trên chart',
  'tương tự trong',
  'giống như khi',
];

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  persona: PersonaType,
  writingMode: WritingMode,
  track: Track,
  pillar: Pillar,
): string {
  return `Bạn là ${PERSONA_LABELS[persona]}.

${WRITING_MODE_LABELS[writingMode]}

TRACK: ${TRACK_LABELS[track]}
PILLAR: ${PILLAR_LABELS[pillar]}

QUY TẮC TUYỆT ĐỐI:
1. Viết 100% tiếng Việt có dấu đầy đủ. KHÔNG dùng tiếng Anh trừ thuật ngữ chuyên ngành (Bitcoin, crypto, blockchain).
2. Xưng hô: "Jennie" (ngôi thứ 1), "bạn" (ngôi thứ 2). KHÔNG dùng "mình", "tôi", "chúng ta".
3. Câu ngắn. Mỗi câu tối đa 15 từ. Xuống dòng sau mỗi ý.
4. KHÔNG mở đầu bằng "Xin chào", "Chào mừng", hay bất kỳ lời chào nào.
5. KHÔNG dùng emoji trong kịch bản.
6. Mỗi ý chính cần CẢ HAI ví dụ: (a) ví dụ crypto/trading VÀ (b) ví dụ đời thường.
7. Nhắc đến công cụ GEM tự nhiên, không ép buộc — chỉ khi phù hợp ngữ cảnh.
8. Dùng format Markdown: ## cho tiêu đề phần, ### cho tiêu đề phụ.
9. Mỗi phần phải có transition mượt sang phần tiếp theo.
10. Kết thúc mỗi phần bằng câu "hook" giữ người xem ở lại.`;
}

// ---------------------------------------------------------------------------
// LATC Prompt Builder
// ---------------------------------------------------------------------------

function buildLATCPrompt(
  topic: string,
  persona: PersonaType,
  writingMode: WritingMode,
  productHooks: string[],
): string {
  const hookProducts = productHooks.length > 0
    ? `\n\nSẢN PHẨM CẦN NHẮC ĐẾN (rải đều trong 5 phần chính):\n${productHooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';

  const modeInstruction = writingMode === 'mode_2_provocative'
    ? `\nĐẶC BIỆT MODE 2: Mở đầu bằng câu gây sốc. Dùng phản đề. Thách thức niềm tin cũ. Giọng thẳng thắn, không ngại đụng chạm.`
    : `\nĐẶC BIỆT MODE 1: Mở đầu nhẹ nhàng nhưng sâu. Dẫn dắt bằng cảm xúc. Giọng ấm áp, nuôi dưỡng.`;

  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS[persona]}
${modeInstruction}

VIẾT KỊCH BẢN LATC THEO CẤU TRÚC SAU (4000-5500 từ tổng cộng):

## HOOK (500 từ — 10% tổng kịch bản)

Viết 6 bước theo thứ tự:
[A] Pain point — Nêu nỗi đau cụ thể mà khán giả đang trải qua. Dùng ngôn ngữ của họ.
[B] Dual examples — Cho 2 ví dụ song song: 1 từ crypto/trading, 1 từ đời thường.
[C] Reality check — Câu hỏi tu từ khiến họ tự vấn. "Bạn có bao giờ tự hỏi..."
[D] Promise — Hứa hẹn cụ thể về những gì họ sẽ nhận được sau video này.
[E] Teaser — Nhắc 1 insight bất ngờ sẽ xuất hiện ở phần sau. "Và ở phần 4, Jennie sẽ tiết lộ..."
[F] Welcome — Câu chào đón vào video. KHÔNG dùng "Xin chào" — dùng style riêng.

## PHẦN 1: [Tiêu đề phần 1] (600-800 từ)

Viết 7 bước cho mỗi phần:
1. Bold statement — Mở đầu bằng nhận định mạnh, đi ngược số đông.
2. Jennie story — Kể 1 câu chuyện cá nhân của Jennie liên quan đến ý này.
3. DUAL EXAMPLES — Ví dụ crypto/trading + Ví dụ đời thường. Cả hai phải liên kết.
4. Tâm thức concept — Giải thích khái niệm tâm thức/tần số liên quan.
5. Bài tập + GEM Tool — Đề xuất bài tập thực hành. Nếu phù hợp, nhắc công cụ GEM.
6. Insight — Câu insight đáng ghi nhớ, đúc kết ý chính.
7. Transition — Câu chuyển mượt sang phần tiếp theo.

## PHẦN 2: [Tiêu đề phần 2] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 3: [Tiêu đề phần 3] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 4: [Tiêu đề phần 4] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 5: [Tiêu đề phần 5] (600-800 từ)
(Cùng 7 bước như trên)

## CTA KHÓA HỌC (200-300 từ — trước phần closing)

Viết 4 bước:
1. Summary — Tóm tắt 5 điều đã chia sẻ trong 1-2 câu mỗi điều.
2. "Hiểu hay sống?" — Đặt câu hỏi: kiến thức suông hay thay đổi thật?
3. Course transformation — Mô tả sự chuyển đổi cụ thể khi tham gia khóa học. KHÔNG nói giá. KHÔNG nói tên khóa học trực tiếp.
4. "Không dành cho tất cả" — Khẳng định khóa học chỉ phù hợp với người sẵn sàng thay đổi.

## CLOSING (200 từ)

Viết 5 bước:
1. Touching — Câu chạm cảm xúc sâu, gợi reflection.
2. App summary — Nhắc ứng dụng GEM như công cụ đồng hành hàng ngày.
3. Comment — Mời comment bằng câu hỏi cụ thể liên quan đến chủ đề.
4. Like/Sub — Nhắc nhẹ like/subscribe bằng lý do (để không bỏ lỡ phần tiếp).
5. Teaser — Preview nội dung video tiếp theo.${hookProducts}

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4000-5500 từ tiếng Việt.
- Mỗi phần (1-5) phải có ÍT NHẤT 1 cặp dual examples (crypto + đời thường).
- Product hooks phải được rải đều, tự nhiên — KHÔNG tập trung hết ở 1 phần.
- Dùng Markdown: ## cho phần chính, ### cho phần phụ.
- Câu ngắn. Tối đa 15 từ/câu. Xuống dòng sau mỗi ý.`;
}

// ---------------------------------------------------------------------------
// TMT Prompt Builder
// ---------------------------------------------------------------------------

function buildTMTPrompt(
  topic: string,
  persona: PersonaType,
  writingMode: WritingMode,
): string {
  const modeInstruction = writingMode === 'mode_2_provocative'
    ? `\nMODE 2: Giọng mạnh mẽ hơn. Phơi bày thẳng thắn. Dùng phản đề sắc bén.`
    : `\nMODE 1: Giọng kính trọng, sâu lắng. Phân tích bằng lòng từ bi.`;

  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS[persona]}
${modeInstruction}

VIẾT KỊCH BẢN TMT (Thầy Minh Tuệ Commentary) THEO CẤU TRÚC SAU (4500-5500 từ tổng cộng):

QUY TẮC TMT ĐẶC BIỆT:
- Gọi Sư Minh Tuệ bằng "Thầy" hoặc "Ngài". TUYỆT ĐỐI KHÔNG dùng "ông", "anh".
- Khi phê bình ai: KHÔNG nêu tên cụ thể → dùng cách gọi "Đề Bà Đạt Đa 5.0" (ẩn dụ cho người chống phá).
- Mọi nhận định phải evidence-based — có dẫn chứng hoặc logic rõ ràng.
- Framing nhân quả: mọi sự việc đều có nhân-duyên-quả.
- Giọng văn kính trọng với Thầy, thẳng thắn với hiện tượng xã hội.

## PHẦN 1: INTRO (300-400 từ)

3 bước:
1. Hook mạnh — Mở đầu bằng sự kiện/hiện tượng gây chú ý liên quan đến Thầy Minh Tuệ hoặc tu hành.
2. Drama — Nêu mâu thuẫn/xung đột trung tâm của chủ đề. Tại sao vấn đề này quan trọng?
3. Promise — Hứa hẹn: video này sẽ phân tích điều gì? Người xem sẽ hiểu được gì?

## PHẦN 2: TỔNG QUAN (400-500 từ)

3 bước:
1. "Tội danh" — Liệt kê các hành vi/hiện tượng đáng phân tích. Dùng ngôn ngữ mạnh nhưng công bằng.
2. Pattern — Chỉ ra pattern lặp lại. "Đây không phải lần đầu..."
3. Tương phản — So sánh: hành vi của Thầy vs. hành vi của "Đề Bà Đạt Đa 5.0".

## PHẦN 3: [Tiêu đề — điểm phân tích 1, nhẹ nhất] (500-700 từ)

Phân tích từ nhẹ đến nặng. Evidence-based.
- Nêu sự kiện/bằng chứng cụ thể.
- Phân tích dưới góc nhìn Phật pháp.
- Kết nối với đời thường.

## PHẦN 4: [Tiêu đề — điểm phân tích 2] (500-700 từ)

Nặng hơn phần 3. Đào sâu hơn.
- Evidence-based claims.
- Nhân quả framing: "Gieo nhân gì, gặt quả nấy."
- Câu chuyện hoặc ví dụ minh họa.

## PHẦN 5: [Tiêu đề — điểm phân tích 3] (500-700 từ)

Nặng hơn phần 4.
- Phơi bày động cơ ẩn giấu.
- Đối chiếu với kinh điển (nếu phù hợp).

## PHẦN 6: [Tiêu đề — điểm phân tích 4] (500-700 từ)

Gần climax. Tension cao.
- Tích lũy bằng chứng.
- Build-up cảm xúc.

## PHẦN 7: CLIMAX (700-900 từ)

Phần quan trọng nhất. Đánh dấu bằng ★.
3 bước:
1. Triết học — Nâng vấn đề lên tầm triết học Phật giáo. Vô thường, nhân quả, nghiệp.
2. Revelation — Tiết lộ insight bất ngờ. "Và đây là điều ít ai nhận ra..."
3. "Cảm ơn nghịch duyên" — Reframe: ngay cả người chống phá cũng là duyên giúp Thầy và chúng ta trưởng thành.

## PHẦN 8: CLOSING (500-600 từ)

3 bước:
1. Tổng kết — Đúc kết 4-5 điểm chính đã phân tích.
2. Hạnh tu — Liên hệ với hành trình tu tập cá nhân. "Mỗi chúng ta đều có thể..."
3. Touching — Câu chạm cảm xúc sâu về lòng kính trọng với Thầy.

## PHẦN 9: CTA 4 LỚP (200-250 từ)

4 bước CTA chồng lên nhau:
1. Engagement — "Bạn nghĩ sao? Comment chia sẻ góc nhìn..."
2. Document — "Video này là tài liệu lưu giữ. Hãy save lại..."
3. Subscribe — "Bấm subscribe + chuông để không bỏ lỡ phần tiếp theo..."
4. Fanpage — "Tham gia cộng đồng trên fanpage để thảo luận sâu hơn..."

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4500-5500 từ tiếng Việt.
- Đảm bảo escalation: nhẹ → nặng từ phần 3 đến phần 7.
- Phần 7 (Climax) là phần dài nhất và sâu nhất.
- Giọng văn phải nhất quán: kính trọng Thầy, thẳng thắn với hiện tượng.
- Dùng Markdown: ## cho phần chính.
- Câu ngắn. Tối đa 15 từ/câu.`;
}

// ---------------------------------------------------------------------------
// Short Clip Prompt Builder
// ---------------------------------------------------------------------------

function buildClipPrompt(
  topic: string,
  persona: PersonaType,
  writingMode: WritingMode,
): string {
  if (writingMode === 'mode_2_provocative') {
    return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS[persona]}

VIẾT KỊCH BẢN SHORT CLIP MODE 2 (PROVOCATIVE) — 75-200 từ, 30-70 giây:

CẤU TRÚC 7 BƯỚC:

### Bước 1: Cognitive Dissonance (3 giây)
Mở đầu bằng câu đi ngược 100% niềm tin phổ biến.
"Bạn nghĩ [X] là đúng? Sai hoàn toàn."

### Bước 2: Voice frustration (5 giây)
Nói lên sự thất vọng mà khán giả đang cảm nhận nhưng chưa dám nói.
"Jennie cũng từng tin điều đó. Và Jennie đã trả giá..."

### Bước 3: Brutal honesty (7 giây)
Sự thật trần trụi. Không đường mật.
Dùng con số hoặc ví dụ cụ thể.

### Bước 4: Reframe (10 giây)
Lật ngược góc nhìn.
"Nhưng nếu bạn nhìn từ góc này..."

### Bước 5: Metaphor (7 giây)
Ẩn dụ mạnh kết nối ý chính với trải nghiệm quen thuộc.

### Bước 6: Solution (7 giây)
Show Don't Tell. Giải pháp cụ thể, hành động được ngay.
Nếu phù hợp, nhắc công cụ GEM.

### Bước 7: Identity shift (5 giây)
Kết bằng câu thay đổi danh tính.
"Bạn không phải người [X]. Bạn là người [Y]."
CTA khéo léo — KHÔNG nói giá.

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`;
  }

  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS[persona]}

VIẾT KỊCH BẢN SHORT CLIP MODE 1 (CALM) — 75-200 từ, 30-70 giây:

CẤU TRÚC 5 BƯỚC:

### Bước 1: ĐAU (Pain) — 3 giây giữ người xem
Mở đầu bằng nỗi đau cụ thể, quen thuộc.
"Bạn có bao giờ [pain point]?"
Dùng ngôn ngữ của khán giả, không học thuật.

### Bước 2: TRẢI NGHIỆM (Story) — 10 giây
Kể câu chuyện cá nhân ngắn gọn của Jennie.
"Jennie từng [trải nghiệm]..."
Tạo kết nối cảm xúc.

### Bước 3: INSIGHT (Revelation) — 10 giây
"Và rồi Jennie nhận ra..."
Tiết lộ insight bất ngờ.
Kết nối pain point với sự thật sâu hơn.

### Bước 4: GIẢI PHÁP (Solution) — 10 giây
Show Don't Tell.
Cho hành động cụ thể, làm được ngay.
Nếu phù hợp, nhắc công cụ GEM tự nhiên.

### Bước 5: CTA KHÉO LÉO — 5 giây
KHÔNG nói giá.
KHÔNG nói tên khóa học.
Kết bằng câu hỏi hoặc câu khiến người xem suy nghĩ.
"Bạn sẽ chọn [A] hay [B]?"

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`;
}

// ---------------------------------------------------------------------------
// Section Parser
// ---------------------------------------------------------------------------

function parseScript(content: string, _contentType: ContentType): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Split by ## headers (level 2)
  const headerPattern = /^## (.+)$/gm;
  const matches: Array<{ title: string; index: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = headerPattern.exec(content)) !== null) {
    const captured = match[1];
    if (captured !== undefined) {
      matches.push({ title: captured.trim(), index: match.index });
    }
  }

  if (matches.length === 0) {
    // Không tìm thấy header — trả toàn bộ nội dung làm 1 section
    return [{
      title: 'Nội dung',
      content: content.trim(),
      wordCount: vietnameseNLP.countWords(content),
      order: 0,
      hasGemTool: checkHasGemTool(content),
      hasDualExample: checkHasDualExample(content),
    }];
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    if (!currentMatch) continue;

    const nextMatch: { title: string; index: number } | undefined = matches[i + 1];
    const startIndex = currentMatch.index;
    const endIndex = nextMatch ? nextMatch.index : content.length;

    const sectionContent = content.slice(startIndex, endIndex).trim();

    // Bỏ dòng header, lấy phần nội dung
    const firstNewline = sectionContent.indexOf('\n');
    const bodyContent = firstNewline >= 0
      ? sectionContent.slice(firstNewline + 1).trim()
      : '';

    sections.push({
      title: currentMatch.title,
      content: bodyContent,
      wordCount: vietnameseNLP.countWords(bodyContent),
      order: i,
      hasGemTool: checkHasGemTool(bodyContent),
      hasDualExample: checkHasDualExample(bodyContent),
    });
  }

  return sections;
}

function checkHasGemTool(text: string): boolean {
  const lowerText = text.toLowerCase();
  return GEM_TOOL_PATTERNS.some((pattern) => lowerText.includes(pattern.toLowerCase()));
}

function checkHasDualExample(text: string): boolean {
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const pattern of DUAL_EXAMPLE_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      matchCount++;
    }
  }
  // Cần ít nhất 2 patterns match để xác nhận có dual example
  return matchCount >= 2;
}

// ---------------------------------------------------------------------------
// Max tokens by content type
// ---------------------------------------------------------------------------

function getMaxTokens(contentType: ContentType): number {
  switch (contentType) {
    case 'latc':
      return 16384; // 4000-5500 từ cần nhiều token
    case 'tmt':
      return 16384; // 4500-5500 từ
    case 'short_clip':
      return 2048;  // 75-200 từ
    case 'social_post':
      return 4096;  // 50-500 từ
    case 'news':
      return 16384; // 500-3000 từ
  }
}

function getTemperature(writingMode: WritingMode): number {
  return writingMode === 'mode_2_provocative' ? 0.85 : 0.7;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const scriptGenerator = {
  /**
   * Tạo kịch bản LATC (Long-form Authority Thought-leader Content).
   * Cấu trúc: Hook → 5 Phần chính → CTA Khóa học → Closing.
   * Tổng: 4000-5500 từ.
   */
  async generateLATC(params: GenerateScriptParams): Promise<GeneratedScriptResult> {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar,
    );

    const userPrompt = buildLATCPrompt(
      params.topic,
      params.persona,
      params.writingMode,
      params.productHooks ?? [],
    );

    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens('latc'),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream,
    });

    const sections = parseScript(result.content, 'latc');
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);

    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections,
    };
  },

  /**
   * Tạo kịch bản TMT (Thầy Minh Tuệ Commentary).
   * Cấu trúc: Intro → Tổng quan → 4 Phần phân tích (nhẹ→nặng) → Climax → Closing → CTA 4 lớp.
   * Tổng: 4500-5500 từ.
   *
   * Quy tắc TMT:
   * - "Thầy"/"Ngài" (không "ông"/"anh")
   * - Không nêu tên khi phê bình → "Đề Bà Đạt Đa 5.0"
   * - Evidence-based claims
   * - Nhân quả framing
   */
  async generateTMT(params: GenerateScriptParams): Promise<GeneratedScriptResult> {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar,
    );

    const userPrompt = buildTMTPrompt(
      params.topic,
      params.persona,
      params.writingMode,
    );

    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens('tmt'),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream,
    });

    const sections = parseScript(result.content, 'tmt');
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);

    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections,
    };
  },

  /**
   * Tạo kịch bản Short Clip (30-70 giây).
   * Mode 1: 5 bước — Đau → Story → Insight → Giải pháp → CTA.
   * Mode 2: 7 bước — Cognitive Dissonance → Frustration → Brutal honesty → Reframe → Metaphor → Solution → Identity shift.
   * Tổng: 75-200 từ.
   */
  async generateShortClip(params: GenerateScriptParams): Promise<GeneratedScriptResult> {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar,
    );

    const userPrompt = buildClipPrompt(
      params.topic,
      params.persona,
      params.writingMode,
    );

    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens('short_clip'),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream,
    });

    const sections = parseScript(result.content, 'short_clip');
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);

    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections,
    };
  },

  /**
   * Parse kịch bản đã tạo thành các section riêng biệt.
   * Tách theo ## headers, đếm từ, kiểm tra GEM tool và dual examples.
   */
  parseScript,

  /**
   * Xây dựng prompt LATC cho Claude.
   */
  buildLATCPrompt,

  /**
   * Xây dựng prompt TMT cho Claude.
   */
  buildTMTPrompt,

  /**
   * Xây dựng prompt Short Clip cho Claude.
   */
  buildClipPrompt,
};

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type {
  GenerateScriptParams,
  GeneratedScriptResult,
  ParsedSection,
};
