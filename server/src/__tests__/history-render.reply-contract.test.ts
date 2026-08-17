// History rendering + session boundary + payment signals (T3/A2/A8) — born from the Hồ Thị
// Mỹ Huệ incident 2026-08-17: an old-session bill sitting in the 20-turn window with no
// timestamp/boundary made the agent infer "khách đã chuyển 899k". Wired into
// `test:reply-contract`.

import { describe, expect, it } from 'vitest';
import type { SessionMessage } from '../channels/types.js';
import {
  renderHistoryForPrompt,
  stripInjectedContext,
  computePaymentSignals,
  currentSessionStartIndex,
} from '../channels/session-history-util.js';

const M = (role: 'user' | 'assistant', content: string, timestamp: string): SessionMessage =>
  ({ role, content, timestamp } as SessionMessage);

describe('stripInjectedContext', () => {
  it('removes the [HỒ SƠ]…[TIN NHẮN MỚI] prefix, keeping the real message', () => {
    expect(stripInjectedContext('[HỒ SƠ KHÁCH HÀNG — X]\n• abc\n[TIN NHẮN MỚI]\nchị lấy 1 trụ')).toBe('chị lấy 1 trụ');
  });
  it('does NOT strip a real message that merely starts with [', () => {
    expect(stripInjectedContext('[Hình ảnh]')).toBe('[Hình ảnh]');
  });
  it('is idempotent on plain text', () => {
    expect(stripInjectedContext('chào em')).toBe('chào em');
  });
});

describe('session boundary + [CŨ] markers', () => {
  const h: SessionMessage[] = [
    M('user', '243 Tôn Đản', '2026-08-01T16:53:00Z'),
    M('assistant', 'Vietcombank 107428 6868', '2026-08-01T16:56:00Z'),
    M('user', '{"href":"https://x.zdn.vn/bill.jpg"}', '2026-08-01T16:58:00Z'),
    M('user', 'loại nào để bàn tốt ạ', '2026-08-17T09:42:00Z'),
    M('assistant', 'Dạ trụ đá ạ', '2026-08-17T09:43:00Z'),
  ];

  it('detects the boundary at the first current-session entry', () => {
    expect(currentSessionStartIndex(h)).toBe(3);
  });
  it('marks pre-boundary entries [CŨ] and downgrades the old bill image', () => {
    const r = renderHistoryForPrompt(h);
    expect(r[0].content.startsWith('[CŨ ')).toBe(true);
    expect(r[2].content).toContain('ảnh — phiên cũ');
  });
  it('inserts the PHIÊN TRƯỚC KẾT THÚC note on the first current entry', () => {
    const r = renderHistoryForPrompt(h);
    expect(r[3].content).toContain('PHIÊN TRƯỚC KẾT THÚC');
    expect(r[3].content).toMatch(/16 ngày/);
    expect(r[3].content).toMatch(/\[17\/08 16:42\]/);
  });
  it('does NOT insert a boundary when all turns are one session', () => {
    const h2 = [M('user', 'a', '2026-08-17T09:00:00Z'), M('user', 'b', '2026-08-17T10:00:00Z')];
    expect(currentSessionStartIndex(h2)).toBe(0);
    expect(renderHistoryForPrompt(h2)[0].content).not.toContain('PHIÊN TRƯỚC');
  });
  it('treats a missing timestamp as a boundary (fail-closed for payment)', () => {
    const h3 = [M('user', 'old', ''), M('user', 'cur', '2026-08-17T09:00:00Z')];
    expect(currentSessionStartIndex(h3)).toBe(1);
  });
});

describe('computePaymentSignals (A8) — no bill inference', () => {
  it('does NOT count an old-session bill image as current-session payment evidence', () => {
    const h: SessionMessage[] = [
      M('assistant', 'Vietcombank 107428', '2026-08-01T16:56:00Z'),
      M('user', '{"href":"https://x/bill.jpg"}', '2026-08-01T16:58:00Z'),
      M('user', 'loại nào để bàn tốt ạ', '2026-08-17T09:42:00Z'),
    ];
    expect(computePaymentSignals(h).imagesAfterStk).toBe(0);
  });
  it('counts a current-session image sent after the bank info as UNCLASSIFIED', () => {
    const h: SessionMessage[] = [
      M('assistant', 'Vietcombank 107428', '2026-08-17T10:00:00Z'),
      M('user', '{"href":"https://x/bill.jpg"}', '2026-08-17T10:05:00Z'),
    ];
    expect(computePaymentSignals(h).imagesAfterStk).toBe(1);
  });
  it('flags a customer text-claim of payment (unverified)', () => {
    expect(computePaymentSignals([M('user', 'chị ck rồi nhé', '2026-08-17T10:00:00Z')]).customerClaimsPaid).toBe(true);
  });
});
