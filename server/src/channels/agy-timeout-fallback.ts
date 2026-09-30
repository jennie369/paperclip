// CLI timeout → fallback 1 lần sang provider khác: agy→claude (GEM-1050, ENG-0929-F1037-01),
// claude→gemini · gemini→claude (GEM-1067, ENG-0930-F1050-01). (Tên file giữ nguyên để không vỡ import/test.)
//
// Gốc: runViaAntigravity quá AGENT_TIMEOUT_MS (5') → reject → runAgentWithConfig nuốt lỗi → '' →
// khách không nhận được gì (sales-closer, homyhue 28/09). Rút prompt 710k→178k chưa đủ: agy còn
// chậm/429 khi nhiều agent dồn cùng 1 model. Retry lại CHÍNH provider đó với cùng prompt to là vô ích
// (thêm 5' cho khách chờ) → đổi sang provider độc lập quota. claude/gemini có cùng lỗi (reject Error trần).
//
// Chỉ bắt ProviderTimeoutError — lỗi khác (abort do khách nhắn mới, exit≠0…) giữ nguyên hành vi cũ.
// Fallback gọi thẳng runViaX (KHÔNG qua dispatch) ⇒ tối đa 1 bước nhảy, không vòng claude⇄gemini.

export class ProviderTimeoutError extends Error {
  readonly provider: string;
  constructor(provider: string, label: string, slug: string) {
    super(`${label} CLI timed out for ${slug}`);
    this.name = 'ProviderTimeoutError';
    this.provider = provider;
  }
}

export interface TimeoutFallback {
  provider: 'claude' | 'gemini';
  model: string;
}
export type AgyFallback = TimeoutFallback;

/** Provider chính → (provider đích mặc định, model đích mặc định, tiền tố biến môi trường). */
const FALLBACK_MAP = {
  antigravity: { provider: 'claude', model: 'claude-sonnet-4-6', envPrefix: 'AGY' },
  claude: { provider: 'gemini', model: 'gemini-2.5-flash', envPrefix: 'CLAUDE' },
  gemini: { provider: 'claude', model: 'claude-sonnet-4-6', envPrefix: 'GEMINI' },
} as const;

/**
 * `<AGY|CLAUDE|GEMINI>_TIMEOUT_FALLBACK` = `on` (mặc định) | `off`; `<…>_TIMEOUT_FALLBACK_MODEL` đổi model đích.
 * Trả null khi tắt hoặc provider không thuộc CLI (nvidia_nim/openrouter) → hành vi cũ (timeout ⇒ '' im lặng).
 */
export function resolveTimeoutFallback(
  primary: string,
  env: NodeJS.ProcessEnv = process.env,
): TimeoutFallback | null {
  const entry = (FALLBACK_MAP as Record<string, (typeof FALLBACK_MAP)[keyof typeof FALLBACK_MAP]>)[primary];
  if (!entry) return null;
  const mode = (env[`${entry.envPrefix}_TIMEOUT_FALLBACK`] || 'on').trim().toLowerCase();
  if (mode === 'off' || mode === 'none' || mode === '0' || mode === 'false') return null;
  const model = (env[`${entry.envPrefix}_TIMEOUT_FALLBACK_MODEL`] || '').trim() || entry.model;
  return { provider: entry.provider, model };
}

/** agy → claude (GEM-1050). Giữ tên cũ cho test/caller hiện có. */
export function resolveAgyFallback(env: NodeJS.ProcessEnv = process.env): TimeoutFallback | null {
  return resolveTimeoutFallback('antigravity', env);
}

/**
 * Chạy `primary`; nếu nó timeout (ProviderTimeoutError) và có `fallback` → chạy `fallback` ĐÚNG 1 lần.
 * Lỗi của fallback được ném nguyên (caller quyết định im lặng) — KHÔNG lặp thêm.
 */
export async function runWithTimeoutFallback<T>(
  primary: () => Promise<T>,
  fallback: (() => Promise<T>) | null,
  onFallback?: (err: ProviderTimeoutError) => void,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (!(err instanceof ProviderTimeoutError) || !fallback) throw err;
    onFallback?.(err);
    return fallback();
  }
}
