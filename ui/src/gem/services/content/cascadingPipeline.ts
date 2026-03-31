// ============================================================================
// Cascading AI Pipeline — Phase 4 AI Optimization
// GEM Content Control Center
//
// Thay thế single-prompt lớn bằng chuỗi 5 micro-calls tuần tự:
//   1. Phân tích chủ đề     (Haiku, 500 tokens)  — xác định pillar/track/persona/arc
//   2. Tạo outline           (Sonnet, 2000 tokens) — dàn bài chi tiết LATC/TMT
//   3. Viết full script      (Sonnet, 8000 tokens) — kịch bản hoàn chỉnh từ outline
//   4. Kiểm tra brand voice  (Haiku, 1000 tokens)  — chấm điểm 10 Quy Tắc Vàng
//   5. Polish + sửa lỗi      (Sonnet, 8000 tokens) — sửa vi phạm nếu score < 85
//
// Lợi ích:
//   - Giảm chi phí ~40% nhờ dùng Haiku cho bước nhẹ
//   - Tăng chất lượng nhờ output từng bước được kiểm soát
//   - Hỗ trợ streaming ở bước 3 (viết script) cho UX mượt
//   - Hỗ trợ hủy (AbortSignal) ở mọi bước
//   - Progress callback để hiển thị tiến trình trên UI
// ============================================================================

import type {
  ContentType,
  PersonaType,
  WritingMode,
  Track,
  Pillar,
} from '@gem/types';

import { claudeService } from '../api/claudeService';
import { modelRouter } from '../api/modelRouter';
import { buildSystemPrompt } from './brandVoicePrompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tham số đầu vào cho cascading pipeline */
export interface CascadingParams {
  /** Chủ đề nội dung cần tạo */
  topic: string;
  /** Persona Jennie sử dụng */
  persona: PersonaType;
  /** Chế độ viết: bình tĩnh hoặc khiêu khích */
  writingMode: WritingMode;
  /** Track nội dung: wealth, wellness, integration */
  track: Track;
  /** Sản phẩm GEM cần nhắc đến trong nội dung (tùy chọn) */
  productHooks?: string[];
  /** Callback khi hoàn thành mỗi bước pipeline */
  onStepComplete?: (step: number, total: number, stepName: string) => void;
  /** Callback nhận streaming chunks ở bước viết script */
  onStream?: (chunk: string) => void;
  /** AbortSignal để hủy pipeline đang chạy */
  signal?: AbortSignal;
}

/** Kết quả phân tích chủ đề (bước 1) */
interface TopicAnalysis {
  /** Pillar phù hợp nhất */
  pillar: Pillar;
  /** Track phù hợp nhất */
  track: Track;
  /** Persona được đề xuất */
  suggestedPersona: PersonaType;
  /** Cung cảm xúc: trình tự cảm xúc xuyên suốt nội dung */
  emotionalArc: string;
  /** Các keyword/concept chính */
  keyTopics: string[];
  /** Góc tiếp cận độc đáo được đề xuất */
  uniqueAngle: string;
}

/** Outline chi tiết (bước 2) */
interface ScriptOutline {
  /** Tiêu đề đề xuất */
  title: string;
  /** Danh sách các phần trong outline */
  sections: OutlineSection[];
  /** Tổng số từ ước tính */
  estimatedWordCount: number;
  /** Gợi ý sản phẩm GEM cho từng phần */
  gemToolPlacements: string[];
}

/** Một phần trong outline */
interface OutlineSection {
  /** Tên phần */
  heading: string;
  /** Mô tả ngắn nội dung */
  summary: string;
  /** Số từ mục tiêu */
  targetWordCount: number;
  /** Ví dụ crypto/tài chính */
  cryptoExample: string;
  /** Ví dụ đời sống */
  lifeExample: string;
}

/** Kết quả kiểm tra brand voice (bước 4) */
interface BrandCheckResult {
  /** Điểm tuân thủ 0-100 */
  score: number;
  /** Danh sách vi phạm cụ thể */
  violations: BrandViolation[];
  /** Có đạt ngưỡng chấp nhận không (>= 85) */
  passed: boolean;
}

/** Một vi phạm brand voice */
interface BrandViolation {
  /** Quy tắc bị vi phạm (1-10) */
  ruleNumber: number;
  /** Tên quy tắc */
  ruleName: string;
  /** Mô tả vi phạm */
  description: string;
  /** Gợi ý sửa */
  fix: string;
}

/** Kết quả cuối cùng từ pipeline */
export interface CascadingResult {
  /** Nội dung kịch bản hoàn chỉnh */
  content: string;
  /** Kết quả phân tích chủ đề */
  topicAnalysis: TopicAnalysis;
  /** Outline đã tạo */
  outline: ScriptOutline;
  /** Kết quả kiểm tra brand voice */
  brandCheck: BrandCheckResult;
  /** Script đã qua bước polish hay chưa */
  wasPolished: boolean;
  /** Thống kê pipeline */
  pipelineStats: PipelineStats;
}

/** Thống kê hiệu suất pipeline */
interface PipelineStats {
  /** Tổng thời gian chạy (ms) */
  totalDurationMs: number;
  /** Thời gian từng bước (ms) */
  stepDurations: number[];
  /** Tổng token ước tính đã sử dụng */
  totalTokensEstimated: number;
  /** Số bước đã chạy (3 hoặc 5) */
  stepsCompleted: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ngưỡng brand voice score — dưới ngưỡng này sẽ chạy bước polish */
const BRAND_SCORE_THRESHOLD = 85;

/** Số bước pipeline cho LATC/TMT (đầy đủ) */
const FULL_PIPELINE_STEPS = 5;

/** Số bước pipeline cho clip ngắn (rút gọn) */
const CLIP_PIPELINE_STEPS = 3;

// ---------------------------------------------------------------------------
// Helpers — Kiểm tra abort signal
// ---------------------------------------------------------------------------

/**
 * Kiểm tra nếu pipeline đã bị hủy qua AbortSignal.
 * Ném lỗi nếu đã abort để dừng ngay pipeline.
 */
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Đã hủy pipeline tạo nội dung.');
  }
}

// ---------------------------------------------------------------------------
// Helpers — Safe JSON parse
// ---------------------------------------------------------------------------

/**
 * Parse JSON an toàn từ response Claude.
 * Tìm đối tượng JSON trong text, xử lý trường hợp Claude thêm text ngoài.
 */
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    // Thử parse toàn bộ trước
    return JSON.parse(text) as T;
  } catch {
    // Tìm JSON object trong text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Helpers — Pillar mapping từ keyword
// ---------------------------------------------------------------------------

/**
 * Map pillar name từ chuỗi phân tích về type chính xác.
 * Xử lý cả trường hợp Claude trả về tên đầy đủ hoặc viết tắt.
 */
function parsePillar(raw: string): Pillar {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('spiritual') || lower.includes('tâm thức') || lower.includes('tâm linh')) {
    return 'spiritual';
  }
  if (lower.includes('trading') || lower.includes('giao dịch')) {
    return 'trading';
  }
  if (lower.includes('latc') || lower.includes('money') || lower.includes('tiền')) {
    return 'latc_money';
  }
  return 'lifestyle';
}

/**
 * Map track name từ chuỗi phân tích về type chính xác.
 */
function parseTrack(raw: string): Track {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('wealth') || lower.includes('tài chính')) return 'wealth';
  if (lower.includes('wellness') || lower.includes('tâm thức')) return 'wellness';
  return 'integration';
}

/**
 * Map persona name từ chuỗi phân tích về type chính xác.
 */
function parsePersona(raw: string): PersonaType {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('mentor')) return 'jennie_mentor';
  if (lower.includes('provocateur')) return 'jennie_provocateur';
  if (lower.includes('storyteller')) return 'jennie_storyteller';
  if (lower.includes('analyst')) return 'jennie_analyst';
  if (lower.includes('motivator')) return 'jennie_motivator';
  if (lower.includes('educator')) return 'jennie_educator';
  if (lower.includes('confidante')) return 'jennie_confidante';
  return 'jennie_mentor'; // Mặc định
}

// ---------------------------------------------------------------------------
// Step 1: Topic Analysis — Haiku, 500 tokens
// Phân tích chủ đề, xác định pillar/track/persona/emotional arc
// ---------------------------------------------------------------------------

async function stepTopicAnalysis(
  params: CascadingParams,
): Promise<TopicAnalysis> {
  checkAbort(params.signal);

  const config = modelRouter.selectModel('topic_analysis');

  const result = await claudeService.generate({
    systemPrompt:
      'Bạn là chuyên gia phân tích nội dung cho kênh "Thức Tỉnh Tâm Thức" của Jennie Uyen Chu. ' +
      'Kênh kết hợp tài chính (crypto, trading) và tâm thức (thiền, năng lượng, tần số). ' +
      'Phân tích chủ đề và trả về JSON.',
    userPrompt:
      `Phân tích chủ đề sau cho kênh Jennie Uyen Chu:\n\n` +
      `CHỦ ĐỀ: "${params.topic}"\n` +
      `TRACK YÊU CẦU: ${params.track}\n` +
      `PERSONA YÊU CẦU: ${params.persona}\n` +
      `WRITING MODE: ${params.writingMode}\n\n` +
      `Trả về JSON (KHÔNG thêm text ngoài JSON):\n` +
      `{\n` +
      `  "pillar": "spiritual|trading|latc_money|lifestyle",\n` +
      `  "track": "wealth|wellness|integration",\n` +
      `  "suggestedPersona": "jennie_mentor|jennie_provocateur|...",\n` +
      `  "emotionalArc": "Mô tả cung cảm xúc: mở đầu → cao trào → kết",\n` +
      `  "keyTopics": ["keyword1", "keyword2", "keyword3"],\n` +
      `  "uniqueAngle": "Góc tiếp cận độc đáo cho chủ đề này"\n` +
      `}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal,
  });

  const defaultAnalysis: TopicAnalysis = {
    pillar: 'lifestyle',
    track: params.track,
    suggestedPersona: params.persona,
    emotionalArc: 'Tò mò → Suy ngẫm → Giác ngộ → Hành động',
    keyTopics: [params.topic],
    uniqueAngle: 'Kết nối tài chính và tâm thức qua lăng kính tần số',
  };

  const parsed = safeParseJSON<Partial<TopicAnalysis>>(result.content, {});

  return {
    pillar: parsed.pillar ? parsePillar(parsed.pillar) : defaultAnalysis.pillar,
    track: parsed.track ? parseTrack(parsed.track) : defaultAnalysis.track,
    suggestedPersona: parsed.suggestedPersona
      ? parsePersona(parsed.suggestedPersona)
      : defaultAnalysis.suggestedPersona,
    emotionalArc: parsed.emotionalArc ?? defaultAnalysis.emotionalArc,
    keyTopics:
      Array.isArray(parsed.keyTopics) && parsed.keyTopics.length > 0
        ? parsed.keyTopics
        : defaultAnalysis.keyTopics,
    uniqueAngle: parsed.uniqueAngle ?? defaultAnalysis.uniqueAngle,
  };
}

// ---------------------------------------------------------------------------
// Step 2: Outline Generation — Sonnet, 2000 tokens
// Tạo dàn bài chi tiết với dual examples và GEM tool placements
// ---------------------------------------------------------------------------

async function stepOutlineGeneration(
  params: CascadingParams,
  analysis: TopicAnalysis,
  contentType: ContentType,
): Promise<ScriptOutline> {
  checkAbort(params.signal);

  const config = modelRouter.selectModel('outline');

  const productHooksText =
    params.productHooks && params.productHooks.length > 0
      ? `\nSẢN PHẨM GEM CẦN NHẮC: ${params.productHooks.join(', ')}`
      : '';

  const structureGuide =
    contentType === 'latc'
      ? 'CẤU TRÚC LATC: Hook (500 từ) → 5 Phần chính (600-800 từ mỗi phần) → CTA (200-300 từ) → Closing (200 từ). Tổng: 4000-5500 từ.'
      : 'CẤU TRÚC TMT: Intro (300-400 từ) → Tổng quan (400-500 từ) → 4 Phần phân tích escalating (500-700 từ) → Climax (700-900 từ) → Closing (500-600 từ) → CTA 4 lớp (200-250 từ). Tổng: 4500-5500 từ.';

  const result = await claudeService.generate({
    systemPrompt:
      'Bạn là chuyên gia lập dàn bài cho kênh "Thức Tỉnh Tâm Thức". ' +
      'Mỗi phần phải có dual examples (crypto + đời sống). ' +
      'GEM tools phải được rải đều, KHÔNG dồn cuối bài. ' +
      'Trả về JSON dàn bài chi tiết.',
    userPrompt:
      `Tạo outline chi tiết cho nội dung ${contentType.toUpperCase()}:\n\n` +
      `CHỦ ĐỀ: "${params.topic}"\n` +
      `PILLAR: ${analysis.pillar}\n` +
      `TRACK: ${analysis.track}\n` +
      `PERSONA: ${params.persona}\n` +
      `WRITING MODE: ${params.writingMode}\n` +
      `EMOTIONAL ARC: ${analysis.emotionalArc}\n` +
      `KEY TOPICS: ${analysis.keyTopics.join(', ')}\n` +
      `GÓC TIẾP CẬN: ${analysis.uniqueAngle}\n` +
      `${productHooksText}\n\n` +
      `${structureGuide}\n\n` +
      `Trả về JSON (KHÔNG thêm text ngoài JSON):\n` +
      `{\n` +
      `  "title": "Tiêu đề đề xuất (không chứa tên sản phẩm)",\n` +
      `  "sections": [\n` +
      `    {\n` +
      `      "heading": "Tên phần",\n` +
      `      "summary": "Tóm tắt nội dung 2-3 câu",\n` +
      `      "targetWordCount": 600,\n` +
      `      "cryptoExample": "Ví dụ crypto/tài chính cụ thể",\n` +
      `      "lifeExample": "Ví dụ đời sống/đời thường tương ứng"\n` +
      `    }\n` +
      `  ],\n` +
      `  "estimatedWordCount": 4500,\n` +
      `  "gemToolPlacements": ["Phần 1: GEM Scanner khi nói về...", "Phần 3: GEM Vision Board khi..."]\n` +
      `}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal,
  });

  const defaultOutline: ScriptOutline = {
    title: params.topic,
    sections: [
      {
        heading: 'Hook',
        summary: 'Mở đầu gây tò mò về chủ đề',
        targetWordCount: 500,
        cryptoExample: 'Ví dụ từ thị trường crypto',
        lifeExample: 'Ví dụ từ đời sống hàng ngày',
      },
    ],
    estimatedWordCount: contentType === 'latc' ? 4500 : 5000,
    gemToolPlacements: [],
  };

  const parsed = safeParseJSON<Partial<ScriptOutline>>(result.content, {});

  return {
    title: parsed.title ?? defaultOutline.title,
    sections:
      Array.isArray(parsed.sections) && parsed.sections.length > 0
        ? parsed.sections
        : defaultOutline.sections,
    estimatedWordCount:
      parsed.estimatedWordCount ?? defaultOutline.estimatedWordCount,
    gemToolPlacements:
      Array.isArray(parsed.gemToolPlacements)
        ? parsed.gemToolPlacements
        : defaultOutline.gemToolPlacements,
  };
}

// ---------------------------------------------------------------------------
// Step 3: Full Script Generation — Sonnet, 8000 tokens (streaming)
// Viết kịch bản hoàn chỉnh dựa trên outline, có streaming
// ---------------------------------------------------------------------------

async function stepFullScriptGeneration(
  params: CascadingParams,
  analysis: TopicAnalysis,
  outline: ScriptOutline,
  contentType: ContentType,
): Promise<string> {
  checkAbort(params.signal);

  const config = modelRouter.selectModel('full_script');

  // Xây dựng system prompt đầy đủ brand voice
  const systemPrompt = buildSystemPrompt({
    contentType,
    persona: params.persona,
    writingMode: params.writingMode,
    track: analysis.track,
    pillar: analysis.pillar,
    productHooks: params.productHooks,
  });

  // Chuyển outline thành text hướng dẫn
  const outlineText = outline.sections
    .map(
      (s, _i) =>
        `## ${s.heading} (~${s.targetWordCount} từ)\n` +
        `Nội dung: ${s.summary}\n` +
        `Ví dụ crypto: ${s.cryptoExample}\n` +
        `Ví dụ đời sống: ${s.lifeExample}`,
    )
    .join('\n\n');

  const gemPlacementsText =
    outline.gemToolPlacements.length > 0
      ? `\nVỊ TRÍ GEM TOOLS:\n${outline.gemToolPlacements.join('\n')}`
      : '';

  const result = await claudeService.generate({
    systemPrompt,
    userPrompt:
      `Viết kịch bản ${contentType.toUpperCase()} hoàn chỉnh dựa trên outline sau:\n\n` +
      `TIÊU ĐỀ: ${outline.title}\n` +
      `EMOTIONAL ARC: ${analysis.emotionalArc}\n` +
      `GÓC TIẾP CẬN: ${analysis.uniqueAngle}\n` +
      `${gemPlacementsText}\n\n` +
      `OUTLINE CHI TIẾT:\n${outlineText}\n\n` +
      `YÊU CẦU:\n` +
      `- Viết đầy đủ từng phần theo outline, KHÔNG tóm tắt.\n` +
      `- Mỗi phần chính phải có dual examples (crypto + đời sống).\n` +
      `- Dùng Markdown: ## cho phần chính.\n` +
      `- Câu ngắn, tối đa 15 từ/câu.\n` +
      `- 100% tiếng Việt có dấu. KHÔNG emoji.\n` +
      `- Tổng: ${outline.estimatedWordCount} từ.`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    onStream: params.onStream,
    signal: params.signal,
  });

  return result.content;
}

// ---------------------------------------------------------------------------
// Step 4: Brand Voice Check — Haiku, 1000 tokens
// Kiểm tra 10 Quy Tắc Vàng, trả về score và vi phạm
// ---------------------------------------------------------------------------

async function stepBrandVoiceCheck(
  params: CascadingParams,
  script: string,
  contentType: ContentType,
): Promise<BrandCheckResult> {
  checkAbort(params.signal);

  const config = modelRouter.selectModel('brand_check');

  const result = await claudeService.generate({
    systemPrompt:
      'Bạn là bot kiểm tra brand voice cho kênh "Thức Tỉnh Tâm Thức". ' +
      'Kiểm tra 10 Quy Tắc Vàng và chấm điểm 0-100. Trả về JSON.',
    userPrompt:
      `Kiểm tra nội dung ${contentType.toUpperCase()} sau theo 10 QUY TẮC VÀNG:\n\n` +
      `① DUAL EXAMPLES: Mỗi phần có cả ví dụ crypto VÀ đời sống?\n` +
      `② DẪN VÀO BỐI CẢNH: Có câu dẫn nhập trước ví dụ?\n` +
      `③ GEM TOOLS RẢI ĐỀU: GEM tools có rải đều hay dồn cuối?\n` +
      `④ TIẾNG VIỆT THUẦN TÚY: Có thuật ngữ tiếng Anh cần chuyển đổi?\n` +
      `⑤ PROSE FLOWING: Có dùng bullet points không?\n` +
      `⑥ TẦN SỐ LÀ TRUNG TÂM: Có nhắc tần số/nghiệp lực?\n` +
      `⑦ CTA TRƯỚC CLOSING: CTA đặt đúng vị trí?\n` +
      `⑧ GIÁO DỤC > BÁN HÀNG: Sản phẩm có xuất hiện trong tiêu đề?\n` +
      `⑨ TRANSITION PHRASES: Có câu chuyển tiếp giữa các phần?\n` +
      `⑩ CLOSING TOUCHING: Phần kết có nhẹ nhàng, ấm áp?\n\n` +
      `NỘI DUNG CẦN KIỂM TRA:\n${script.substring(0, 6000)}\n\n` +
      `Trả về JSON (KHÔNG thêm text ngoài JSON):\n` +
      `{\n` +
      `  "score": 87,\n` +
      `  "violations": [\n` +
      `    {\n` +
      `      "ruleNumber": 4,\n` +
      `      "ruleName": "TIẾNG VIỆT THUẦN TÚY",\n` +
      `      "description": "Tìm thấy 'mindset' chưa chuyển đổi",\n` +
      `      "fix": "Thay 'mindset' bằng 'tư duy'"\n` +
      `    }\n` +
      `  ],\n` +
      `  "passed": true\n` +
      `}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal,
  });

  const defaultCheck: BrandCheckResult = {
    score: 80,
    violations: [],
    passed: false,
  };

  const parsed = safeParseJSON<Partial<BrandCheckResult>>(result.content, {});

  const score =
    typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : defaultCheck.score;

  return {
    score,
    violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    passed: score >= BRAND_SCORE_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// Step 5: Polish + Fix — Sonnet, 8000 tokens
// Sửa vi phạm brand voice nếu score < 85
// ---------------------------------------------------------------------------

async function stepPolishAndFix(
  params: CascadingParams,
  script: string,
  brandCheck: BrandCheckResult,
  contentType: ContentType,
): Promise<string> {
  checkAbort(params.signal);

  const config = modelRouter.selectModel('full_script');

  // Xây dựng danh sách vi phạm cần sửa
  const violationsList = brandCheck.violations
    .map(
      (v) =>
        `- Quy tắc ${v.ruleNumber} (${v.ruleName}): ${v.description}\n  → Sửa: ${v.fix}`,
    )
    .join('\n');

  const systemPrompt = buildSystemPrompt({
    contentType,
    persona: params.persona,
    writingMode: params.writingMode,
    track: params.track,
    pillar: 'lifestyle', // Mặc định — sẽ được override bởi nội dung đã có
    productHooks: params.productHooks,
  });

  const result = await claudeService.generate({
    systemPrompt,
    userPrompt:
      `Kịch bản ${contentType.toUpperCase()} sau đạt ${brandCheck.score}/100 điểm brand voice.\n` +
      `Cần sửa các vi phạm sau:\n\n${violationsList}\n\n` +
      `KỊCH BẢN CẦN SỬA:\n${script}\n\n` +
      `YÊU CẦU:\n` +
      `- Sửa TẤT CẢ vi phạm được liệt kê ở trên.\n` +
      `- Giữ nguyên cấu trúc, tone, và nội dung tổng thể.\n` +
      `- KHÔNG thêm lời giải thích — chỉ trả về kịch bản đã sửa.\n` +
      `- Đảm bảo 100% tiếng Việt, câu ngắn, prose flowing, dual examples.\n` +
      `- Output: kịch bản hoàn chỉnh đã sửa lỗi.`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal,
  });

  return result.content;
}

// ---------------------------------------------------------------------------
// Pipeline Orchestrator — chạy tuần tự 5 bước
// ---------------------------------------------------------------------------

/**
 * Chạy pipeline đầy đủ (5 bước) cho LATC hoặc TMT.
 * Bước 5 (polish) chỉ chạy nếu brand voice score < 85.
 */
async function runFullPipeline(
  params: CascadingParams,
  contentType: ContentType,
): Promise<CascadingResult> {
  const totalSteps = FULL_PIPELINE_STEPS;
  const stepDurations: number[] = [];
  let totalTokensEstimated = 0;
  const pipelineStart = Date.now();

  // ─── Bước 1: Phân tích chủ đề ───
  let stepStart = Date.now();
  const analysis = await stepTopicAnalysis(params);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 500;
  params.onStepComplete?.(1, totalSteps, 'Phân tích chủ đề');

  // ─── Bước 2: Tạo outline ───
  stepStart = Date.now();
  const outline = await stepOutlineGeneration(params, analysis, contentType);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 2000;
  params.onStepComplete?.(2, totalSteps, 'Tạo dàn bài');

  // ─── Bước 3: Viết full script (streaming) ───
  stepStart = Date.now();
  const script = await stepFullScriptGeneration(
    params,
    analysis,
    outline,
    contentType,
  );
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 8000;
  params.onStepComplete?.(3, totalSteps, 'Viết kịch bản');

  // ─── Bước 4: Kiểm tra brand voice ───
  stepStart = Date.now();
  const brandCheck = await stepBrandVoiceCheck(params, script, contentType);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1000;
  params.onStepComplete?.(4, totalSteps, 'Kiểm tra brand voice');

  // ─── Bước 5: Polish (chỉ chạy nếu cần) ───
  let finalScript = script;
  let wasPolished = false;

  if (!brandCheck.passed) {
    stepStart = Date.now();
    finalScript = await stepPolishAndFix(
      params,
      script,
      brandCheck,
      contentType,
    );
    stepDurations.push(Date.now() - stepStart);
    totalTokensEstimated += 8000;
    wasPolished = true;
    params.onStepComplete?.(5, totalSteps, 'Polish & sửa lỗi');
  } else {
    // Bước 5 được bỏ qua — đánh dấu hoàn thành
    stepDurations.push(0);
    params.onStepComplete?.(5, totalSteps, 'Bỏ qua (score đạt chuẩn)');
  }

  return {
    content: finalScript,
    topicAnalysis: analysis,
    outline,
    brandCheck,
    wasPolished,
    pipelineStats: {
      totalDurationMs: Date.now() - pipelineStart,
      stepDurations,
      totalTokensEstimated,
      stepsCompleted: wasPolished ? 5 : 4,
    },
  };
}

// ---------------------------------------------------------------------------
// Clip Pipeline — rút gọn 3 bước
// (bỏ bước 4-5 vì clip ngắn ít cần kiểm tra brand phức tạp)
// ---------------------------------------------------------------------------

/**
 * Pipeline rút gọn cho short clips (3 bước).
 * Bỏ kiểm tra brand voice và polish vì clip ngắn đơn giản hơn.
 */
async function runClipPipeline(
  params: CascadingParams,
): Promise<CascadingResult> {
  const totalSteps = CLIP_PIPELINE_STEPS;
  const stepDurations: number[] = [];
  let totalTokensEstimated = 0;
  const pipelineStart = Date.now();

  // ─── Bước 1: Phân tích chủ đề (Haiku) ───
  let stepStart = Date.now();
  const analysis = await stepTopicAnalysis(params);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 500;
  params.onStepComplete?.(1, totalSteps, 'Phân tích chủ đề');

  // ─── Bước 2: Tạo outline ngắn (Sonnet) ───
  stepStart = Date.now();
  const outline = await stepOutlineGeneration(params, analysis, 'short_clip');
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1000;
  params.onStepComplete?.(2, totalSteps, 'Tạo dàn bài clip');

  // ─── Bước 3: Viết clip script (Sonnet, streaming) ───
  stepStart = Date.now();

  const clipConfig = modelRouter.selectModel('short_clip');

  const systemPrompt = buildSystemPrompt({
    contentType: 'short_clip',
    persona: params.persona,
    writingMode: params.writingMode,
    track: analysis.track,
    pillar: analysis.pillar,
    productHooks: params.productHooks,
  });

  const outlineText = outline.sections
    .map((s) => `- ${s.heading}: ${s.summary}`)
    .join('\n');

  const result = await claudeService.generate({
    systemPrompt,
    userPrompt:
      `Viết kịch bản SHORT CLIP (75-200 từ, 30-70 giây) dựa trên:\n\n` +
      `CHỦ ĐỀ: "${params.topic}"\n` +
      `GÓC TIẾP CẬN: ${analysis.uniqueAngle}\n` +
      `OUTLINE:\n${outlineText}\n\n` +
      `WRITING MODE: ${params.writingMode === 'mode_1_calm' ? 'Calm — 5 bước' : 'Provocative — 7 bước'}\n\n` +
      `YÊU CẦU:\n` +
      `- 75-200 từ tổng cộng.\n` +
      `- Câu cực ngắn: 5-10 từ/câu.\n` +
      `- Mỗi câu 1 dòng.\n` +
      `- KHÔNG emoji.\n` +
      `- Dùng Markdown ### cho mỗi bước.`,
    maxTokens: clipConfig.maxTokens,
    temperature: clipConfig.temperature,
    model: clipConfig.model,
    onStream: params.onStream,
    signal: params.signal,
  });

  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1500;
  params.onStepComplete?.(3, totalSteps, 'Viết kịch bản clip');

  // Clip pipeline không chạy brand check → trả về score mặc định
  const defaultBrandCheck: BrandCheckResult = {
    score: 100,
    violations: [],
    passed: true,
  };

  return {
    content: result.content,
    topicAnalysis: analysis,
    outline,
    brandCheck: defaultBrandCheck,
    wasPolished: false,
    pipelineStats: {
      totalDurationMs: Date.now() - pipelineStart,
      stepDurations,
      totalTokensEstimated,
      stepsCompleted: 3,
    },
  };
}

// ---------------------------------------------------------------------------
// Cascading Pipeline Service — Public API
// ---------------------------------------------------------------------------

export const cascadingPipeline = {
  /**
   * Tạo kịch bản LATC qua pipeline 5 bước.
   *
   * Pipeline:
   *   1. Phân tích chủ đề (Haiku, ~1s)
   *   2. Tạo outline chi tiết (Sonnet, ~3s)
   *   3. Viết full script — có streaming (Sonnet, ~15s)
   *   4. Kiểm tra brand voice (Haiku, ~2s)
   *   5. Polish & sửa lỗi — chỉ khi score < 85 (Sonnet, ~10s)
   *
   * @param params - Cấu hình pipeline bao gồm topic, persona, callbacks
   * @returns CascadingResult với script, analysis, outline, brand check, và stats
   *
   * @example
   * ```ts
   * const result = await cascadingPipeline.generateLATCScript({
   *   topic: '5 Sự Thật Về Tiền Mà Trường Học Không Dạy',
   *   persona: 'jennie_mentor',
   *   writingMode: 'mode_1_calm',
   *   track: 'wealth',
   *   productHooks: ['GEM Scanner', 'LATC Money'],
   *   onStepComplete: (step, total, name) => {
   *     console.log(`[${step}/${total}] ${name}`);
   *   },
   *   onStream: (chunk) => process.stdout.write(chunk),
   * });
   * ```
   */
  async generateLATCScript(params: CascadingParams): Promise<CascadingResult> {
    return runFullPipeline(params, 'latc');
  },

  /**
   * Tạo kịch bản TMT (Thầy Minh Tuệ Commentary) qua pipeline 5 bước.
   *
   * Tương tự LATC nhưng cấu trúc và quy tắc TMT đặc biệt:
   *   - Gọi Thầy/Ngài (không "ông"/"anh")
   *   - "Đề Bà Đạt Đa 5.0" cho đối tượng phê bình
   *   - Evidence-based claims + nhân quả framing
   *   - Escalation: nhẹ → nặng qua các phần phân tích
   *
   * @param params - Cấu hình pipeline
   * @returns CascadingResult
   */
  async generateTMTScript(params: CascadingParams): Promise<CascadingResult> {
    return runFullPipeline(params, 'tmt');
  },

  /**
   * Tạo kịch bản Short Clip qua pipeline rút gọn 3 bước.
   *
   * Pipeline rút gọn (bỏ brand check + polish vì clip ngắn đơn giản):
   *   1. Phân tích chủ đề (Haiku)
   *   2. Tạo outline clip (Sonnet)
   *   3. Viết clip script — có streaming (Sonnet)
   *
   * @param params - Cấu hình pipeline
   * @returns CascadingResult
   *
   * @example
   * ```ts
   * const clip = await cascadingPipeline.generateClipScript({
   *   topic: 'Vì Sao 95% Trader Thua Lỗ',
   *   persona: 'jennie_provocateur',
   *   writingMode: 'mode_2_provocative',
   *   track: 'wealth',
   *   onStepComplete: (step, total, name) => {
   *     setProgress({ step, total, name });
   *   },
   * });
   * ```
   */
  async generateClipScript(params: CascadingParams): Promise<CascadingResult> {
    return runClipPipeline(params);
  },
};
