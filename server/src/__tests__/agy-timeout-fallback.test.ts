import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ProviderTimeoutError,
  resolveAgyFallback,
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

describe('router wiring (guard chống revert)', () => {
  const src = readFileSync(fileURLToPath(new URL('../channels/router.ts', import.meta.url)), 'utf-8');
  it("dispatch 'antigravity' đi qua runWithTimeoutFallback", () => {
    const block = src.slice(src.indexOf("case 'antigravity':"), src.indexOf("case 'nvidia_nim':"));
    expect(block).toContain('runWithTimeoutFallback(');
    expect(block).toContain('runViaClaude(fbConfig');
  });
  it('runViaAntigravity ném ProviderTimeoutError khi quá hạn (không phải Error trần)', () => {
    const fn = src.slice(src.indexOf('async function runViaAntigravity('), src.indexOf('async function runViaOpenRouter('));
    expect(fn).toContain("new ProviderTimeoutError('antigravity'");
    expect(fn).toContain('if (timedOut)');
  });
});
