import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ProviderTimeoutError,
  TimeoutCircuitBreaker,
  getTimeoutBreaker,
  resetTimeoutBreakers,
  resolveAgyFallback,
  resolveTimeoutFallback,
  runWithTimeoutFallback,
} from '../channels/agy-timeout-fallback.js';

const timeout = () => new ProviderTimeoutError('antigravity', 'Antigravity', 'sales-closer');

describe('runWithTimeoutFallback', () => {
  it('agy timeout → chạy fallback ĐÚNG 1 lần và trả reply của fallback (không rỗng)', async () => {
    const primary = vi.fn().mockRejectedValue(timeout());
    const fallback = vi.fn().mockResolvedValue('Dạ em đây ạ');
    const onFallback = vi.fn();
    await expect(runWithTimeoutFallback(primary, fallback, onFallback)).resolves.toBe('Dạ em đây ạ');
    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('primary OK → không đụng fallback', async () => {
    const fallback = vi.fn();
    await expect(runWithTimeoutFallback(async () => 'ok', fallback)).resolves.toBe('ok');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('lỗi KHÔNG phải timeout (vd abort do khách nhắn mới) → ném nguyên, không fallback', async () => {
    const abort = new Error('agent run aborted (cancel-in-flight)');
    const fallback = vi.fn();
    await expect(runWithTimeoutFallback(() => Promise.reject(abort), fallback)).rejects.toBe(abort);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('fallback = null (tắt) → giữ hành vi cũ: ném timeout', async () => {
    const err = timeout();
    await expect(runWithTimeoutFallback(() => Promise.reject(err), null)).rejects.toBe(err);
  });

  it('fallback cũng lỗi → ném lỗi của fallback, KHÔNG thử thêm lần 3', async () => {
    const fallback = vi.fn().mockRejectedValue(new Error('claude down'));
    await expect(runWithTimeoutFallback(() => Promise.reject(timeout()), fallback)).rejects.toThrow('claude down');
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});

describe('resolveAgyFallback', () => {
  it('mặc định bật: claude + model Sonnet', () => {
    expect(resolveAgyFallback({} as NodeJS.ProcessEnv)).toEqual({ provider: 'claude', model: 'claude-sonnet-4-6' });
  });
  it('AGY_TIMEOUT_FALLBACK=off tắt hẳn', () => {
    expect(resolveAgyFallback({ AGY_TIMEOUT_FALLBACK: 'off' } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it('AGY_TIMEOUT_FALLBACK_MODEL đổi được model', () => {
    expect(resolveAgyFallback({ AGY_TIMEOUT_FALLBACK_MODEL: ' claude-opus-4-8 ' } as unknown as NodeJS.ProcessEnv)?.model).toBe('claude-opus-4-8');
  });
  it('message timeout giữ nguyên định dạng cũ (log/probe grep được)', () => {
    expect(timeout().message).toBe('Antigravity CLI timed out for sales-closer');
    expect(timeout()).toBeInstanceOf(Error);
  });
});

describe('resolveTimeoutFallback (GEM-1067: claude/gemini cùng lớp lỗi với agy)', () => {
  const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
  it('claude → gemini flash; gemini → claude sonnet; agy → claude sonnet', () => {
    expect(resolveTimeoutFallback('claude', env({}))).toEqual({ provider: 'gemini', model: 'gemini-2.5-flash' });
    expect(resolveTimeoutFallback('gemini', env({}))).toEqual({ provider: 'claude', model: 'claude-sonnet-4-6' });
    expect(resolveTimeoutFallback('antigravity', env({}))).toEqual({ provider: 'claude', model: 'claude-sonnet-4-6' });
  });
  it('mỗi provider tắt/đổi model ĐỘC LẬP bằng env riêng', () => {
    expect(resolveTimeoutFallback('claude', env({ CLAUDE_TIMEOUT_FALLBACK: 'off' }))).toBeNull();
    expect(resolveTimeoutFallback('gemini', env({ CLAUDE_TIMEOUT_FALLBACK: 'off' }))).not.toBeNull();
    expect(resolveTimeoutFallback('gemini', env({ GEMINI_TIMEOUT_FALLBACK_MODEL: ' claude-opus-4-8 ' }))?.model).toBe('claude-opus-4-8');
    expect(resolveTimeoutFallback('claude', env({ CLAUDE_TIMEOUT_FALLBACK_MODEL: 'gemini-2.5-pro' }))?.model).toBe('gemini-2.5-pro');
  });
  it('provider API (nvidia_nim/openrouter) hoặc lạ → null (hành vi cũ)', () => {
    for (const p of ['nvidia_nim', 'openrouter', 'whatever']) expect(resolveTimeoutFallback(p, env({}))).toBeNull();
  });
  it('claude/gemini timeout: message giữ định dạng cũ để grep log/probe', () => {
    expect(new ProviderTimeoutError('claude', 'Claude', 'sales-closer').message).toBe('Claude CLI timed out for sales-closer');
    expect(new ProviderTimeoutError('gemini', 'Gemini', 'sales-closer').message).toBe('Gemini CLI timed out for sales-closer');
  });
});

describe('router wiring (guard chống revert)', () => {
  const src = readFileSync(fileURLToPath(new URL('../channels/router.ts', import.meta.url)), 'utf-8');
  it('dispatch claude/gemini/antigravity đều đi qua withTimeoutFallback → runWithTimeoutFallback', () => {
    const dispatch = src.slice(src.indexOf('const dispatch = async'), src.indexOf("case 'nvidia_nim':"));
    for (const p of ['claude', 'gemini', 'antigravity']) {
      expect(dispatch).toMatch(new RegExp(`case '${p}':\\s*return withTimeoutFallback\\(`));
    }
    const helper = src.slice(src.indexOf('const withTimeoutFallback'), src.indexOf('const dispatch = async'));
    expect(helper).toContain('runWithTimeoutFallback(');
    expect(helper).toContain('runViaGemini(fbConfig');
    expect(helper).toContain('runViaClaude(fbConfig');
  });
  it("fallback claude⇄gemini dùng phiên trắng (sessionKey '') — id phiên provider kia không resume được", () => {
    const helper = src.slice(src.indexOf('const withTimeoutFallback'), src.indexOf('const dispatch = async'));
    expect(helper).toContain("config.provider === 'antigravity' ? sessionKey : ''");
  });
  it('3 runner CLI ném ProviderTimeoutError khi quá hạn (không phải Error trần) + guard timedOut ở close', () => {
    const claude = src.slice(src.indexOf('async function runViaClaude('), src.indexOf('async function runViaGemini('));
    expect(claude).toContain("new ProviderTimeoutError('claude'");
    expect(claude).toContain('if (settled) return;');
    const gemini = src.slice(src.indexOf('async function runViaGemini('), src.indexOf('async function runViaAntigravity('));
    expect(gemini).toContain("new ProviderTimeoutError('gemini'");
    expect(gemini).toContain('if (timedOut)');
    const fn = src.slice(src.indexOf('async function runViaAntigravity('), src.indexOf('async function runViaOpenRouter('));
    expect(fn).toContain("new ProviderTimeoutError('antigravity'");
    expect(fn).toContain('if (timedOut)');
  });
  it('không còn Error trần "CLI timed out" trong router.ts', () => {
    expect(src).not.toMatch(/new Error\(`(Claude|Gemini|Antigravity) CLI timed out/);
  });
});

describe('TimeoutCircuitBreaker (GEM-1068: agy chậm/429 → khỏi chờ 5 phút mỗi tin)', () => {
  const mk = (thr = 2, cd = 1000) => {
    let t = 0;
    const b = new TimeoutCircuitBreaker(thr, cd, () => t);
    return { b, advance: (ms: number) => { t += ms; } };
  };
  const slow = () => Promise.reject(timeout());

  it('dưới ngưỡng: vẫn chạy primary rồi fallback (hành vi GEM-1050); đủ ngưỡng: lượt kế bỏ qua primary', async () => {
    const { b } = mk(2);
    const fb = vi.fn().mockResolvedValue('claude reply');
    const primary = vi.fn().mockImplementation(slow);
    const onSkip = vi.fn();
    await runWithTimeoutFallback(primary, fb, undefined, b, onSkip); // timeout #1
    expect(b.isOpen).toBe(false);
    await runWithTimeoutFallback(primary, fb, undefined, b, onSkip); // timeout #2 → mở
    expect(b.isOpen).toBe(true);
    expect(primary).toHaveBeenCalledTimes(2);
    await expect(runWithTimeoutFallback(primary, fb, undefined, b, onSkip)).resolves.toBe('claude reply');
    expect(primary).toHaveBeenCalledTimes(2); // KHÔNG chờ primary nữa
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(fb).toHaveBeenCalledTimes(3);
  });

  it('hết cooldown → half-open: đúng 1 lượt thử primary, lượt đồng thời khác vẫn đi fallback', async () => {
    const { b, advance } = mk(1, 1000);
    const fb = vi.fn().mockResolvedValue('fb');
    await runWithTimeoutFallback(slow, fb, undefined, b); // mở
    advance(1001);
    let release!: (v: string) => void;
    const probe = vi.fn().mockImplementation(() => new Promise<string>((r) => { release = r; }));
    const p1 = runWithTimeoutFallback(probe, fb, undefined, b); // lượt thử
    const p2 = runWithTimeoutFallback(probe, fb, undefined, b); // lượt song song
    await expect(p2).resolves.toBe('fb');
    expect(probe).toHaveBeenCalledTimes(1);
    release('agy ok');
    await expect(p1).resolves.toBe('agy ok');
    expect(b.isOpen).toBe(false); // thành công → đóng mạch
  });

  it('lượt thử half-open lại timeout → mở lại cooldown mới', async () => {
    const { b, advance } = mk(1, 1000);
    const fb = vi.fn().mockResolvedValue('fb');
    await runWithTimeoutFallback(slow, fb, undefined, b);
    advance(1001);
    await runWithTimeoutFallback(slow, fb, undefined, b); // probe timeout
    const primary = vi.fn().mockResolvedValue('x');
    await runWithTimeoutFallback(primary, fb, undefined, b);
    expect(primary).not.toHaveBeenCalled(); // vẫn mở
  });

  it('lỗi KHÔNG phải timeout không tính vào ngưỡng và nhả cờ probe (không kẹt half-open)', async () => {
    const { b, advance } = mk(1, 1000);
    const fb = vi.fn().mockResolvedValue('fb');
    await runWithTimeoutFallback(slow, fb, undefined, b);
    advance(1001);
    await expect(runWithTimeoutFallback(() => Promise.reject(new Error('aborted')), fb, undefined, b)).rejects.toThrow('aborted');
    const primary = vi.fn().mockResolvedValue('ok');
    await expect(runWithTimeoutFallback(primary, fb, undefined, b)).resolves.toBe('ok'); // được thử lại
    expect(primary).toHaveBeenCalledTimes(1);
  });

  it('thành công xen kẽ reset đếm liên tiếp; threshold 0 = tắt; không có fallback = bỏ qua breaker', async () => {
    const { b } = mk(2);
    const fb = vi.fn().mockResolvedValue('fb');
    await runWithTimeoutFallback(slow, fb, undefined, b);
    await runWithTimeoutFallback(async () => 'ok', fb, undefined, b);
    await runWithTimeoutFallback(slow, fb, undefined, b);
    expect(b.isOpen).toBe(false);
    const off = new TimeoutCircuitBreaker(0, 1000);
    for (let i = 0; i < 5; i++) await runWithTimeoutFallback(slow, fb, undefined, off);
    expect(off.allowPrimary()).toBe(true);
    const err = timeout();
    const open = new TimeoutCircuitBreaker(1, 1000);
    open.recordTimeout();
    await expect(runWithTimeoutFallback(() => Promise.reject(err), null, undefined, open)).rejects.toBe(err);
  });

  it('getTimeoutBreaker: per-provider, đọc env, provider API → null', () => {
    resetTimeoutBreakers();
    const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
    expect(getTimeoutBreaker('openrouter', env({}))).toBeNull();
    const a = getTimeoutBreaker('antigravity', env({ AGY_BREAKER_THRESHOLD: '1', AGY_BREAKER_COOLDOWN_MS: '50' }))!;
    expect(getTimeoutBreaker('antigravity', env({}))).toBe(a); // cache
    expect(getTimeoutBreaker('claude', env({}))).not.toBe(a);
    a.recordTimeout();
    expect(a.isOpen).toBe(true);
    resetTimeoutBreakers();
  });

  it('router.ts truyền breaker vào runWithTimeoutFallback (guard chống revert)', () => {
    const src = readFileSync(fileURLToPath(new URL('../channels/router.ts', import.meta.url)), 'utf-8');
    const helper = src.slice(src.indexOf('const withTimeoutFallback'), src.indexOf('const dispatch = async'));
    expect(helper).toContain('getTimeoutBreaker(config.provider)');
  });
});
