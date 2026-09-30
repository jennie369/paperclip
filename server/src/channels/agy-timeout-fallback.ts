// agy CLI timeout → fallback 1 lần sang provider khác (GEM-1050, ENG-0929-F1037-01).
//
// Gốc: runViaAntigravity quá AGENT_TIMEOUT_MS (5') → reject → runAgentWithConfig nuốt lỗi → '' →
// khách không nhận được gì (sales-closer, homyhue 28/09). Rút prompt 710k→178k chưa đủ: agy còn
// chậm/429 khi nhiều agent dồn cùng 1 model. Retry lại CHÍNH agy với cùng prompt to là vô ích
// (thêm 5' cho khách chờ) → đổi provider độc lập quota: claude.
//
// Chỉ bắt ProviderTimeoutError — lỗi khác (abort do khách nhắn mới, exit≠0…) giữ nguyên hành vi cũ.

export class ProviderTimeoutError extends Error {
  readonly provider: string;
  constructor(provider: string, label: string, slug: string) {
    super(`${label} CLI timed out for ${slug}`);
    this.name = 'ProviderTimeoutError';
    this.provider = provider;
  }
}

export interface AgyFallback {
  provider: 'claude';
  model: string;
}

const DEFAULT_FALLBACK_MODEL = 'claude-sonnet-4-6';

/**
 * `AGY_TIMEOUT_FALLBACK` = `claude` (mặc định) | `off`. `AGY_TIMEOUT_FALLBACK_MODEL` đổi model claude.
 * Trả null khi tắt → hành vi cũ (timeout ⇒ '' im lặng).
 */
export function resolveAgyFallback(env: NodeJS.ProcessEnv = process.env): AgyFallback | null {
  const mode = (env.AGY_TIMEOUT_FALLBACK || 'claude').trim().toLowerCase();
  if (mode === 'off' || mode === 'none' || mode === '0' || mode === 'false') return null;
  return { provider: 'claude', model: (env.AGY_TIMEOUT_FALLBACK_MODEL || '').trim() || DEFAULT_FALLBACK_MODEL };
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
