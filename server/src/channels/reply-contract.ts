// Reply Gateway Contract — pure helpers (P2).
//
// Deterministic, side-effect-free building blocks for the emission gate + eval.
// Kept separate from router.ts so they can be unit-tested in isolation and so the
// emission/idempotency logic has one home. (Scrub/marker functions stay in
// router.ts — DEV-2: moving battle-scarred regexes is pure risk, ADR-3.)
//
// Plan: crypto-pattern-scanner/docs/plans_reports/2026-07-10-REPLY-GATEWAY-CONTRACT_ARCHITECTURE_PLAN.md §12

/**
 * Deterministic batch id for an outbound reply's dedupe key.
 *
 * batchId = MIN uuid (lexicographic) of the claimed pending-row ids. Using min()
 * of the actual claimed ids — NOT `sort(created_at)[0]` — makes the key stable
 * regardless of created_at ties or input ordering: the SAME set of rows always
 * yields the SAME batchId, so two emits for one burst collapse to one key
 * (23505 → skip). A DIFFERENT set of rows (a later message joined the burst) is
 * a genuinely different reply and correctly gets a different key. (Codex C3.)
 *
 * Returns '' for an empty set (caller should never emit with no claimed rows;
 * the empty key is a safe sentinel that the gateway treats as "no dedupe").
 */
export function buildBatchId(claimedIds: string[]): string {
  if (!claimedIds || claimedIds.length === 0) return '';
  return [...claimedIds].sort()[0];
}

/**
 * Build the outbound dedupe key for a bot reply. One message per burst (OD-6 —
 * multi-chunk is a dead path), so no chunk index. `reply:<sessionKey>:<batchId>`.
 */
export function buildReplyDedupeKey(sessionKey: string, batchId: string): string {
  return `reply:${sessionKey}:${batchId}`;
}

// ── Price-leak detector (G18) — persona/prompt files must contain NO hardcoded
// price; prices come from DB inject at build time. 2-tier (Codex C9 + D1):
//   1. Mask phone / order-code / date so they can't false-positive.
//   2. Match a real price amount with a Unicode-safe unit boundary. JS `\b` is
//      ASCII, so `đ`/`vnđ` at end-of-token needs a `(?![\p{L}\p{N}])` lookahead,
//      not `\b` (which would FAIL on "29.999.000đ"). A left `(?<![\d.,])` guards
//      against matching a suffix of a longer digit run.
const PHONE_RE = /0\d{2}[.\s-]?\d{3}[.\s-]?\d{3}/g;
const ORDER_RE = /#\d+/g;
const DATE_RE = /\d{1,2}[./]\d{1,2}[./]\d{4}/g;
const PRICE_AMOUNT_RE = /(?<![\d.,])\d{1,3}([.,]\d{3}){2,}\s*(?:đ|vnđ|vnd|k)(?![\p{L}\p{N}])/iu;
const PRICE_WORD_RE = /(?<![\d.,])\d{1,3}\s*(?:triệu|tr)(?![\p{L}\p{N}])/iu;

/** True if `text` contains a hardcoded VND price amount (after masking phone/order/date). */
export function detectPriceLeak(text: string): boolean {
  if (!text) return false;
  const masked = text.replace(PHONE_RE, ' ').replace(ORDER_RE, ' ').replace(DATE_RE, ' ');
  return PRICE_AMOUNT_RE.test(masked) || PRICE_WORD_RE.test(masked);
}

/**
 * True if a Supabase/Postgres error is a unique-constraint violation. (Codex C10.)
 * supabase-js surfaces `.code` on the PostgREST error object, but not every path
 * populates it consistently, so we also match the message text (the existing
 * cskh-inbound:119 idempotency code uses both). Duck-typed — accepts any error
 * shape.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  if (e.code === '23505') return true;
  const msg = typeof e.message === 'string' ? e.message : '';
  return /duplicate key|unique constraint|idx_csm_dedupe|idx_cpm_dedupe/i.test(msg);
}

/**
 * Normalize a channel send result into throw-on-failure (Codex F2). Every
 * protocol send in this codebase returns `{ success: false, error }` instead of
 * throwing, and CSKH mirror only console.errors. `deliverReplyOnce` decides
 * sent-vs-failed by whether the deliverFn THREW, so a deliverFn MUST call this
 * (or throw itself) — otherwise a failed send is silently marked 'sent' and the
 * customer never receives the reply while the dedupe key stays claimed.
 *
 * Returns the platform message id (best-effort, from any of the common field
 * names) so the caller can stamp channel_sent_messages.platform_message_id.
 */
export function assertSent(
  result: { success?: boolean; error?: string; messageId?: string; id?: string; commentId?: string } | null | undefined,
): { platformMessageId: string | null } {
  if (!result || result.success !== true) {
    throw new Error(result?.error || 'channel send failed (success!==true)');
  }
  return { platformMessageId: result.messageId ?? result.id ?? result.commentId ?? null };
}
