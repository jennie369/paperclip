// Reply Gateway Contract — claim-before-send delivery (P2).
//
// deliverReplyOnce() makes "1 reply per burst per session" a DB invariant: it
// INSERTs a channel_sent_messages row (status 'sending') keyed by a deterministic
// dedupe_key BEFORE the actual send. The live UNIQUE partial index idx_csm_dedupe
// turns a second emit of the same (sessionKey, batchId) into a 23505 → we skip
// the send. So double-reply from a listener leak / coalesce miss / PM2 restart
// overlap / future cluster is blocked at the DB, not just in memory.
//
// Scope = Option A (chống-double). NOT exactly-once: on send failure the row is
// marked 'failed' and left (no auto-retry/resume) — this is ≈ today's behavior
// (a failed send is lost anyway) but now visible to the operator. Crash between
// claim and deliver = lost (accepted, plan §6.2). External channels (Zalo/FB) that
// crash after protocol-send but before UPDATE 'sent' are at-least-once (rare).
//
// The claim row IS the channel_sent_messages log row — callers pass the same
// fields they used to insert, and let this own the row (claim + log merged).
//
// Plan: crypto-pattern-scanner/docs/plans_reports/2026-07-10-REPLY-GATEWAY-CONTRACT_ARCHITECTURE_PLAN.md §5.4
import { supabase } from './zalo-personal/supabase.js';
import { isUniqueViolation } from './reply-contract.js';

export type DeliverOutcome = 'sent' | 'duplicate_skipped' | 'failed';

/** channel_sent_messages fields the caller wants logged for this reply. */
export interface SentLogRow {
  channel_name: string;
  thread_id: string;
  thread_type?: string | null;
  to_uid?: string | null;
  body: string;
  content_type?: string | null;
  media?: string[] | null;
  sent_by?: string | null;
}

/** What deliverFn returns so the row can be stamped with the platform id. */
export interface DeliverResult {
  platformMessageId?: string | null;
}

/**
 * Claim a dedupe_key, then run `deliverFn` exactly once.
 *
 * - INSERT {..., dedupe_key, status:'sending'}.
 *   - unique-violation (Codex C10 via isUniqueViolation) → SKIP the send. We skip
 *     regardless of the existing row's status (sent/sending/failed) — scope A does
 *     not retry, so there is one behavior: a key that already exists means "someone
 *     already owns this reply", don't send again (Codex D2). No SELECT branch.
 *   - other insert error → throw (never swallow a non-dup DB error).
 * - INSERT ok → await deliverFn():
 *   - resolves → UPDATE status='sent' (+ platform_message_id) → 'sent'.
 *   - throws   → UPDATE status='failed' (+ error_message) → 'failed' (no retry).
 *
 * ⚠️ CONTRACT (Codex F2): deliverFn MUST THROW on a failed send. Every channel
 * protocol here returns `{ success: false, error }` instead of throwing, and CSKH
 * mirror only console.errors — so a deliverFn that just `await`s the send would
 * resolve on failure and be wrongly marked 'sent'. Wrap the send with
 * `assertSent(result)` (reply-contract.ts) or throw explicitly.
 *
 * `dedupeKey` empty/undefined → caller has no key (manual/human path); we just run
 * deliverFn once with no claim (back-compat, no idempotency). Bot paths always
 * pass a key.
 */
export async function deliverReplyOnce(
  dedupeKey: string | null | undefined,
  logRow: SentLogRow,
  deliverFn: () => Promise<DeliverResult>,
): Promise<DeliverOutcome> {
  // No key → not a gated bot reply; deliver once without a DB claim.
  if (!dedupeKey) {
    await deliverFn();
    return 'sent';
  }

  const { data, error } = await supabase
    .from('channel_sent_messages')
    .insert({ ...logRow, dedupe_key: dedupeKey, status: 'sending' })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      console.log(`[Gateway] duplicate reply suppressed (any status): ${dedupeKey}`);
      return 'duplicate_skipped';
    }
    throw error; // real DB error — surface it, do not swallow
  }

  const rowId = (data as { id: string }).id;
  try {
    const { platformMessageId } = await deliverFn();
    await supabase
      .from('channel_sent_messages')
      .update({ status: 'sent', platform_message_id: platformMessageId ?? null })
      .eq('id', rowId);
    return 'sent';
  } catch (err: any) {
    await supabase
      .from('channel_sent_messages')
      .update({ status: 'failed', error_message: String(err?.message || err) })
      .eq('id', rowId);
    console.error(`[Gateway] reply send failed (left as 'failed', no retry): ${dedupeKey}: ${err?.message || err}`);
    return 'failed';
  }
}
