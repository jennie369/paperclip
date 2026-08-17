// Session-history utilities — SSOT for: stripping injected CRM context, session-boundary
// detection (>gap hours), history rendering for the prompt (timestamps + [CŨ] markers +
// boundary note), and structured payment signals (A8).
//
// Born 2026-08-17 (plan CSKH-SALES-CLOSER-BRAIN): the sales-closer agent inferred
// "khách đã chuyển 899k" from OLD-session bill text still sitting in the 20-turn window
// with no timestamps/boundary. These helpers make history time-aware and payment-safe.
// Provider-agnostic — used by router.ts (all providers via runAgentWithConfig) +
// crm/context-builder.ts (payment signals) + crm/ai-summarizer.ts (strip on summarize).

import type { SessionMessage } from './types.js';

export const SESSION_GAP_HOURS = 12;

const TIN_NHAN_MOI_RE = /\[TIN\s+NH[ẮA]N\s+M[ỚO]I\]\s*\n?/i;

/**
 * Strip the injected CRM context prefix from a stored user message, returning only the
 * real customer text. The consumer prepends blocks like `[HỒ SƠ KHÁCH HÀNG …]`,
 * `[TÓM TẮT AI] …`, `[NHÂN VIÊN …]`, `[TIN NHẮN MỚI]\n<real msg>` before the message.
 *
 * Idempotent: a message with no prefix (or one already stripped) is returned unchanged.
 * A genuine customer message that merely starts with `[` (e.g. `[Hình ảnh]` or a
 * Zalo link-card JSON) is NOT stripped — only `[HỒ SƠ`/`[NHÂN VIÊN`/`[TIN NHẮN MỚI]`
 * markers trigger stripping.
 */
export function stripInjectedContext(content: string): string {
  if (!content) return content;
  const c = content;
  if (!c.startsWith('[HỒ SƠ') && !c.includes('[NHÂN VIÊN') && !TIN_NHAN_MOI_RE.test(c)) {
    return content;
  }
  const m = c.match(TIN_NHAN_MOI_RE);
  if (m && m.index !== undefined) {
    const real = c.slice(m.index + m[0].length).trim();
    return real || content;
  }
  return content;
}

/** true if the message content looks like a bare image / Zalo link-card (not real text). */
export function isImageOrLinkCard(content: string): boolean {
  const c = (content || '').trim();
  if (!c) return false;
  if (c.includes('[Hình ảnh]') || c.includes('[Hình Ảnh]')) return true;
  // Zalo link-card / photo JSON: {"title":"","description":"","href":"...jpg",...} or {"thumb":...}
  if (/^\{[^}]*"(href|thumb)"\s*:/.test(c)) return true;
  return false;
}

/**
 * Index into `history` of the first entry belonging to the CURRENT (most recent) session.
 * Entries before this index are from an earlier session (>gap apart) and are treated as
 * "CŨ". A missing timestamp on either side of a pair is treated as a boundary
 * (fail-closed for payment-safety: an untimestamped entry never extends the current
 * session forward). Returns 0 when there is no boundary (all one session).
 */
export function currentSessionStartIndex(history: SessionMessage[], gapHours = SESSION_GAP_HOURS): number {
  if (!history || history.length <= 1) return 0;
  const gapMs = gapHours * 3600_000;
  let start = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]?.timestamp;
    const cur = history[i]?.timestamp;
    if (!prev || !cur) { start = i; continue; }
    const dt = new Date(cur).getTime() - new Date(prev).getTime();
    if (!isFinite(dt) || dt > gapMs) start = i;
  }
  return start;
}

/** Format an ISO timestamp as `DD/MM HH:mm` in Asia/Ho_Chi_Minh (UTC+7). */
export function fmtHcm(ts?: string): string {
  if (!ts) return '??/?? ??:??';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '??/?? ??:??';
  const h = new Date(d.getTime() + 7 * 3600_000); // shift to HCM, then read UTC fields
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h.getUTCDate())}/${p(h.getUTCMonth() + 1)} ${p(h.getUTCHours())}:${p(h.getUTCMinutes())}`;
}

function boundaryGapLabel(history: SessionMessage[], startIdx: number): string {
  const prev = history[startIdx - 1]?.timestamp;
  const cur = history[startIdx]?.timestamp;
  if (!prev || !cur) return 'một khoảng';
  const days = Math.round((new Date(cur).getTime() - new Date(prev).getTime()) / 86400_000);
  if (days >= 1) return `${days} ngày`;
  const hours = Math.round((new Date(cur).getTime() - new Date(prev).getTime()) / 3600_000);
  return `${hours} giờ`;
}

/**
 * Transform history for prompt injection (all providers):
 *  - strip injected CRM context from each stored message,
 *  - prefix each entry with `[DD/MM HH:mm]` (HCM),
 *  - mark pre-boundary entries `[CŨ …]` and downgrade old image/link-card content so the
 *    model cannot read an old bill photo as the current order's payment,
 *  - prepend a "PHIÊN TRƯỚC KẾT THÚC" note to the first current-session entry.
 * Returns a NEW array; input is not mutated.
 */
export function renderHistoryForPrompt(history: SessionMessage[], gapHours = SESSION_GAP_HOURS): SessionMessage[] {
  if (!history || history.length === 0) return [];
  const start = currentSessionStartIndex(history, gapHours);
  const out: SessionMessage[] = [];
  for (let i = 0; i < history.length; i++) {
    const e = history[i];
    const raw = stripInjectedContext(e.content || '');
    const stamp = fmtHcm(e.timestamp);
    const isOld = i < start;
    let content: string;
    if (isOld) {
      const body = isImageOrLinkCard(raw) ? '[ảnh — phiên cũ, KHÔNG phải bill đơn hiện tại]' : raw;
      content = `[CŨ ${stamp}] ${body}`;
    } else {
      content = `[${stamp}] ${raw}`;
    }
    if (i === start && start > 0) {
      content =
        `── PHIÊN TRƯỚC KẾT THÚC (cách ${boundaryGapLabel(history, start)}). Mọi đơn/thanh toán/bill/địa chỉ ở trên thuộc PHIÊN CŨ ĐÃ XONG — KHÔNG cộng dồn tiền, KHÔNG coi bill/ảnh cũ là bill hôm nay ──\n` +
        content;
    }
    out.push({ ...e, content });
  }
  return out;
}

export interface PaymentSignals {
  /** # of current-session customer images/link-cards sent AFTER the agent posted bank info. */
  imagesAfterStk: number;
  /** true if the customer text-claims payment in the current session (unverified). */
  customerClaimsPaid: boolean;
}

const STK_MARKER_RE = /Vietcombank|107428/i;
const CLAIMS_PAID_RE = /(đã|vừa)\s*(chuyển|ck)\b|ck\s*rồi|chuyển\s*rồi|đã\s*thanh\s*toán/i;

/**
 * A8 — structured, UNVERIFIED payment signals for the current session only. There is NO
 * "paid > 0" or "bill received" output: the agent must never conclude money was received
 * from an image or a customer claim. Staff confirms payment. These two signals only let
 * the agent acknowledge ("để em chuyển bộ phận kiểm tra") instead of ignoring or
 * hallucinating receipt.
 */
export function computePaymentSignals(history: SessionMessage[], gapHours = SESSION_GAP_HOURS): PaymentSignals {
  const start = currentSessionStartIndex(history, gapHours);
  let stkSeen = false;
  let imagesAfterStk = 0;
  let customerClaimsPaid = false;
  for (let i = start; i < history.length; i++) {
    const e = history[i];
    const raw = stripInjectedContext(e.content || '');
    if (e.role === 'assistant' && STK_MARKER_RE.test(raw)) stkSeen = true;
    if (e.role === 'user') {
      if (stkSeen && isImageOrLinkCard(raw)) imagesAfterStk++;
      if (CLAIMS_PAID_RE.test(raw)) customerClaimsPaid = true;
    }
  }
  return { imagesAfterStk, customerClaimsPaid };
}
