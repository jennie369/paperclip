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
 * Circuit-breaker theo provider (GEM-1068, ENG-0930-F1050-02): fallback 1 lần chỉ cứu khách khỏi bị bỏ rơi,
 * KHÔNG giảm độ trễ — khi agy đang 429/chậm mỗi tin vẫn chờ đủ 5' rồi mới sang claude. Sau `threshold` lần
 * timeout LIÊN TIẾP thì "mở mạch": `cooldownMs` tới bỏ qua primary, chạy fallback ngay. Hết cooldown → half-open,
 * cho ĐÚNG 1 lượt thử primary (single-flight, các lượt khác vẫn đi fallback); thành công → đóng, timeout → mở lại.
 * Chỉ đếm ProviderTimeoutError (abort do khách nhắn mới / exit≠0 không phải dấu hiệu provider chậm).
 */
export class TimeoutCircuitBreaker {
  private consecutive = 0;
  private openUntil = 0;
  private probing = false;
  constructor(
    private readonly threshold: number,
    private readonly cooldownMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** true = chạy primary; false = mạch đang mở → đi thẳng fallback. */
  allowPrimary(): boolean {
    if (this.threshold <= 0 || this.consecutive < this.threshold) return true;
    if (this.now() < this.openUntil) return false;
    if (this.probing) return false;
    this.probing = true;
    return true;
  }
  recordSuccess(): void {
    this.consecutive = 0;
    this.openUntil = 0;
    this.probing = false;
  }
  recordTimeout(): void {
    this.consecutive += 1;
    this.probing = false;
    if (this.threshold > 0 && this.consecutive >= this.threshold) this.openUntil = this.now() + this.cooldownMs;
  }
  /** Lượt thử half-open kết thúc bằng lỗi KHÔNG phải timeout → nhả cờ để lượt sau thử lại (không kẹt probing). */
  releaseProbe(): void {
    this.probing = false;
  }
  get isOpen(): boolean {
    return this.threshold > 0 && this.consecutive >= this.threshold;
  }
}

const breakers = new Map<string, TimeoutCircuitBreaker>();

/** `<AGY|CLAUDE|GEMINI>_BREAKER_THRESHOLD` (mặc định 2, 0 = tắt) · `<…>_BREAKER_COOLDOWN_MS` (mặc định 600000 = 10'). */
export function getTimeoutBreaker(primary: string, env: NodeJS.ProcessEnv = process.env): TimeoutCircuitBreaker | null {
  const entry = (FALLBACK_MAP as Record<string, (typeof FALLBACK_MAP)[keyof typeof FALLBACK_MAP]>)[primary];
  if (!entry) return null;
  let b = breakers.get(primary);
  if (!b) {
    const thr = Number.parseInt(env[`${entry.envPrefix}_BREAKER_THRESHOLD`] ?? '', 10);
    const cd = Number.parseInt(env[`${entry.envPrefix}_BREAKER_COOLDOWN_MS`] ?? '', 10);
    b = new TimeoutCircuitBreaker(Number.isFinite(thr) && thr >= 0 ? thr : 2, Number.isFinite(cd) && cd > 0 ? cd : 600_000);
    breakers.set(primary, b);
  }
  return b;
}

/** Chỉ cho test: xoá trạng thái breaker toàn cục. */
export function resetTimeoutBreakers(): void {
  breakers.clear();
}

/**
 * Chạy `primary`; nếu nó timeout (ProviderTimeoutError) và có `fallback` → chạy `fallback` ĐÚNG 1 lần.
 * Lỗi của fallback được ném nguyên (caller quyết định im lặng) — KHÔNG lặp thêm.
 * Có `breaker` + `fallback`: mạch mở ⇒ bỏ qua primary (`onSkip`), chạy fallback luôn.
 */
export async function runWithTimeoutFallback<T>(
  primary: () => Promise<T>,
  fallback: (() => Promise<T>) | null,
  onFallback?: (err: ProviderTimeoutError) => void,
  breaker?: TimeoutCircuitBreaker | null,
  onSkip?: () => void,
): Promise<T> {
  // Không có fallback ⇒ breaker vô nghĩa (không có chỗ để chuyển) → hành vi cũ.
  const cb = fallback ? breaker ?? null : null;
  if (cb && !cb.allowPrimary()) {
    onSkip?.();
    return fallback!();
  }
  try {
    const out = await primary();
    cb?.recordSuccess();
    return out;
  } catch (err) {
    if (!(err instanceof ProviderTimeoutError)) {
      cb?.releaseProbe();
      throw err;
    }
    cb?.recordTimeout();
    if (!fallback) throw err;
    onFallback?.(err);
    return fallback();
  }
}
