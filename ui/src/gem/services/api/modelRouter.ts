// ============================================================================
// Adaptive Model Router — Phase 4 AI Optimization
// GEM Content Control Center
//
// Bộ định tuyến mô hình thông minh: tự động chọn mô hình Claude phù hợp
// dựa trên loại tác vụ, tối ưu chi phí và hiệu suất.
//
// Nguyên tắc:
//   - Tác vụ nhanh/rẻ  → Haiku  (phân tích topic, kiểm tra brand voice, ...)
//   - Tác vụ trung bình → Sonnet (outline, bài social, clip ngắn, ...)
//   - Tác vụ nặng       → Sonnet + token cao (full script, analytics, ...)
// ============================================================================

// ---------------------------------------------------------------------------
// Constants — Model IDs
// ---------------------------------------------------------------------------

const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
const MODEL_SONNET = 'claude-sonnet-4-5-20250929';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cấu hình mô hình trả về cho mỗi tác vụ */
export interface ModelConfig {
  /** ID mô hình Claude (dùng để gọi API) */
  model: string;
  /** Số token tối đa cho phản hồi */
  maxTokens: number;
  /** Mức độ sáng tạo (0 = chính xác, 1 = sáng tạo) */
  temperature: number;
  /** Nhãn hiển thị cho UI */
  label: string;
}

/** Ước tính chi phí cho một tác vụ */
export interface CostEstimate {
  /** Mô hình được chọn */
  model: string;
  /** Chi phí ước tính (dạng chuỗi mô tả) */
  estimatedCost: string;
}

/** Thông tin về một loại tác vụ được hỗ trợ */
interface TaskDefinition {
  /** Cấu hình mô hình cho tác vụ */
  config: ModelConfig;
  /** Ước tính chi phí dạng chuỗi */
  costLabel: string;
  /** Phân loại tier: fast, medium, full */
  tier: 'fast' | 'medium' | 'full';
}

// ---------------------------------------------------------------------------
// Task Routing Table
// Bảng định tuyến: mỗi loại tác vụ → mô hình + cấu hình phù hợp
// ---------------------------------------------------------------------------

const TASK_ROUTES: Readonly<Record<string, TaskDefinition>> = {
  // ─── FAST / CHEAP — Haiku ───
  // Các tác vụ nhẹ, cần phản hồi nhanh, chi phí thấp

  topic_analysis: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 500,
      temperature: 0.3,
      label: 'Haiku — Phân tích chủ đề',
    },
    costLabel: '~$0.001',
    tier: 'fast',
  },

  brand_check: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 1000,
      temperature: 0.2,
      label: 'Haiku — Kiểm tra brand voice',
    },
    costLabel: '~$0.002',
    tier: 'fast',
  },

  title_generation: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 800,
      temperature: 0.8,
      label: 'Haiku — Tạo tiêu đề',
    },
    costLabel: '~$0.001',
    tier: 'fast',
  },

  term_conversion: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 500,
      temperature: 0.1,
      label: 'Haiku — Chuyển đổi thuật ngữ',
    },
    costLabel: '~$0.001',
    tier: 'fast',
  },

  // ─── MEDIUM — Sonnet (token vừa) ───
  // Các tác vụ cần chất lượng cao hơn nhưng không quá dài

  outline: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 2000,
      temperature: 0.6,
      label: 'Sonnet — Tạo outline',
    },
    costLabel: '~$0.01',
    tier: 'medium',
  },

  social_post: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1500,
      temperature: 0.7,
      label: 'Sonnet — Bài mạng xã hội',
    },
    costLabel: '~$0.008',
    tier: 'medium',
  },

  short_clip: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1500,
      temperature: 0.75,
      label: 'Sonnet — Script clip ngắn',
    },
    costLabel: '~$0.008',
    tier: 'medium',
  },

  email_generation: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 2000,
      temperature: 0.65,
      label: 'Sonnet — Tạo email',
    },
    costLabel: '~$0.01',
    tier: 'medium',
  },

  image_prompt: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1000,
      temperature: 0.7,
      label: 'Sonnet — Prompt hình ảnh',
    },
    costLabel: '~$0.005',
    tier: 'medium',
  },

  // ─── FULL POWER — Sonnet (token cao) ───
  // Các tác vụ nặng, cần output dài và chất lượng cao nhất

  full_script: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 8000,
      temperature: 0.7,
      label: 'Sonnet — Full script (LATC/TMT)',
    },
    costLabel: '~$0.05',
    tier: 'full',
  },

  analytics_insight: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 4096,
      temperature: 0.5,
      label: 'Sonnet — Phân tích analytics',
    },
    costLabel: '~$0.03',
    tier: 'full',
  },

  repurpose: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 6000,
      temperature: 0.65,
      label: 'Sonnet — Tái sử dụng nội dung',
    },
    costLabel: '~$0.04',
    tier: 'full',
  },
};

// ---------------------------------------------------------------------------
// Fallback — cấu hình mặc định khi tác vụ không được nhận diện
// ---------------------------------------------------------------------------

const FALLBACK_DEFINITION: TaskDefinition = {
  config: {
    model: MODEL_SONNET,
    maxTokens: 4096,
    temperature: 0.7,
    label: 'Sonnet — Mặc định',
  },
  costLabel: '~$0.02',
  tier: 'medium',
};

// ---------------------------------------------------------------------------
// Complexity Adjustments
// Điều chỉnh cấu hình dựa trên độ phức tạp (0-1)
// ---------------------------------------------------------------------------

/**
 * Điều chỉnh maxTokens và temperature theo complexity.
 *
 * - complexity = 0: giữ nguyên cấu hình gốc
 * - complexity = 0.5: tăng nhẹ maxTokens (+25%)
 * - complexity = 1: tăng maxTokens tối đa (+50%), hạ temperature nhẹ
 *
 * @param base - Cấu hình gốc từ bảng định tuyến
 * @param complexity - Giá trị 0-1 biểu thị độ phức tạp
 */
function applyComplexity(base: ModelConfig, complexity: number): ModelConfig {
  // Clamp complexity về [0, 1]
  const c = Math.max(0, Math.min(1, complexity));

  if (c === 0) return base;

  // Tăng maxTokens tỷ lệ với complexity (tối đa +50%)
  const tokenMultiplier = 1 + c * 0.5;
  const adjustedMaxTokens = Math.round(base.maxTokens * tokenMultiplier);

  // Hạ nhẹ temperature khi complexity cao (để output ổn định hơn)
  const temperatureAdjust = c * 0.05;
  const adjustedTemperature = Math.max(0.1, base.temperature - temperatureAdjust);

  return {
    ...base,
    maxTokens: adjustedMaxTokens,
    temperature: Number(adjustedTemperature.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Model Router Service
// ---------------------------------------------------------------------------

export const modelRouter = {
  /**
   * Chọn mô hình và cấu hình phù hợp cho một loại tác vụ.
   *
   * @param taskType - Loại tác vụ (vd: 'topic_analysis', 'full_script', 'outline')
   * @param complexity - Độ phức tạp tùy chọn (0-1), ảnh hưởng đến maxTokens và temperature
   * @returns ModelConfig với model ID, maxTokens, temperature, và label
   *
   * @example
   * ```ts
   * // Tác vụ nhanh — sử dụng Haiku
   * const config = modelRouter.selectModel('topic_analysis');
   * // → { model: 'claude-haiku-4-5-20251001', maxTokens: 500, ... }
   *
   * // Tác vụ nặng với complexity cao
   * const config = modelRouter.selectModel('full_script', 0.8);
   * // → { model: 'claude-sonnet-4-5-20250929', maxTokens: 12000, ... }
   * ```
   */
  selectModel(taskType: string, complexity?: number): ModelConfig {
    const definition = TASK_ROUTES[taskType] ?? FALLBACK_DEFINITION;
    const base = { ...definition.config };

    // Áp dụng điều chỉnh complexity nếu có
    if (complexity !== undefined && complexity > 0) {
      return applyComplexity(base, complexity);
    }

    return base;
  },

  /**
   * Lấy danh sách tất cả cấu hình mô hình có sẵn.
   * Hữu ích để hiển thị trong UI hoặc debug.
   *
   * @returns Mảng ModelConfig cho mọi tác vụ đã đăng ký
   */
  getAvailableModels(): ModelConfig[] {
    const seen = new Set<string>();
    const models: ModelConfig[] = [];

    for (const definition of Object.values(TASK_ROUTES)) {
      // Tránh trùng lặp dựa trên model + maxTokens
      const key = `${definition.config.model}:${definition.config.maxTokens}`;
      if (!seen.has(key)) {
        seen.add(key);
        models.push({ ...definition.config });
      }
    }

    return models;
  },

  /**
   * Ước tính chi phí cho một tác vụ.
   * Giá trị ước tính dựa trên token trung bình, chỉ mang tính tham khảo.
   *
   * @param taskType - Loại tác vụ cần ước tính chi phí
   * @returns Object chứa model được chọn và chi phí ước tính
   *
   * @example
   * ```ts
   * const cost = modelRouter.getCostEstimate('full_script');
   * // → { model: 'claude-sonnet-4-5-20250929', estimatedCost: '~$0.05' }
   * ```
   */
  getCostEstimate(taskType: string): CostEstimate {
    const definition = TASK_ROUTES[taskType] ?? FALLBACK_DEFINITION;

    return {
      model: definition.config.model,
      estimatedCost: definition.costLabel,
    };
  },

  /**
   * Lấy danh sách tất cả loại tác vụ được hỗ trợ.
   * Hữu ích để validate input hoặc hiển thị dropdown trong UI.
   *
   * @returns Mảng tên tác vụ (vd: ['topic_analysis', 'brand_check', ...])
   */
  getTaskTypes(): string[] {
    return Object.keys(TASK_ROUTES);
  },

  /**
   * Lấy tier (fast/medium/full) của một tác vụ.
   * Hữu ích để hiển thị badge hoặc biểu tượng trong UI.
   *
   * @param taskType - Loại tác vụ cần tra cứu
   * @returns 'fast' | 'medium' | 'full'
   */
  getTaskTier(taskType: string): 'fast' | 'medium' | 'full' {
    const definition = TASK_ROUTES[taskType];
    return definition?.tier ?? 'medium';
  },

  /**
   * Lấy tất cả tác vụ thuộc một tier cụ thể.
   *
   * @param tier - Tier cần lọc: 'fast', 'medium', hoặc 'full'
   * @returns Mảng tên tác vụ thuộc tier đó
   *
   * @example
   * ```ts
   * const fastTasks = modelRouter.getTasksByTier('fast');
   * // → ['topic_analysis', 'brand_check', 'title_generation', 'term_conversion']
   * ```
   */
  getTasksByTier(tier: 'fast' | 'medium' | 'full'): string[] {
    return Object.entries(TASK_ROUTES)
      .filter(([, definition]) => definition.tier === tier)
      .map(([taskType]) => taskType);
  },
};
