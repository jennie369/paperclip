// Channel-Agent Auto-Reply — Inbound Message Consumer
// Full pipeline: dedupe → policy → quota → debounce → mention gate → agent → reply

import { bus } from './bus.js';
import { deduplicator } from './dedupe.js';
import { debouncer } from './debounce.js';
import * as policy from './policy.js';
import * as quota from './quota.js';
import * as session from './session.js';
import * as router from './router.js';
import { buildBatchId, buildReplyDedupeKey } from './reply-contract.js';
import { parseSessionKey } from './transcript.js';
import { supabase } from './zalo-personal/supabase.js';
import { CustomerResolver } from './crm/customer-resolver.js';
import { ContextBuilder } from './crm/context-builder.js';
import { AISummarizer } from './crm/ai-summarizer.js';
import { handleEscalation, isSessionPaused, type EscalationContext } from './crm/escalation-handler.js';
import { persistPurchaseStage, type PurchaseStage } from './crm/purchase-stage-handler.js';
import { extractEntitiesAsync } from './kg-extractor.js';
import type {
  InboundMessage,
  ChannelInstanceRow,
  OutboundMessage,
} from './types.js';

// CRM modules
const customerResolver = new CustomerResolver();
const contextBuilder = new ContextBuilder();
const aiSummarizer = new AISummarizer();

// In-memory channel config cache (refreshed per message if stale)
const configCache = new Map<string, { config: ChannelInstanceRow; expiresAt: number }>();
const CONFIG_CACHE_TTL = 30_000; // 30 seconds

// Per-session serialization lock: prevent concurrent runAgent() calls for the
// SAME session. Root cause of the 2026-07-09 duplicate-reply bug (verified +
// fix reviewed by Codex) — a customer message arriving beyond the 5s debounce
// window but still inside one runAgent() run (18-100s+ for CLI providers)
// independently triggered a full SECOND agent run reading the same stale
// history, producing overlapping replies + duplicate side-effects (e.g. 2
// support tickets for 1 complaint). Applies to every channel (Zalo/FB/FB-Web/
// CSKH/Gem-master) — they all converge on processMessage() below. Supersedes
// the old threadCooldown map, which only LOGGED a warning instead of actually
// blocking anything (dead code — never enforced).
const sessionInFlight = new Map<string, Promise<void>>();

// ── Quiet-window + coalesce (2026-07-10 fix, Codex-reviewed) ──
// Root cause of the RESIDUAL double-reply bug: customers type in bursts (several
// messages 9-29s apart). The 5s debounce didn't merge them, and the
// sessionInFlight lock only SERIALIZED runs (not coalesced) → each message got
// its own reply + a 2-3min backlog where the bot answered already-superseded
// messages. Fix: wait until the customer stops typing for QUIET_WINDOW_MS, then
// DRAIN every still-pending message for the thread from the DB, COALESCE into a
// single prompt, and reply ONCE. See
// docs/plans_reports/2026-07-10-CSKH-DOUBLE-REPLY-QUIETWINDOW-COALESCE-TYPING_ARCHITECTURE_PLAN.md
const quietTimers = new Map<string, { timer: ReturnType<typeof setTimeout>; ctx: BatchCtx }>();
const QUIET_WINDOW_MS = 15_000;   // wait for customer to stop typing before replying (12→15s, burst-double fix)
const TYPING_TTL_MS = 45_000;     // typing indicator lifespan (covers quiet-window + agent latency)
const MAX_COALESCE = 20;          // cap messages merged into one reply

// ── Cancel-in-flight re-coalesce (2026-07-11, burst-double fix) ──
// The quiet-window merges messages typed WITHIN the window. But a customer who
// types "HI" then their real question 20-30s later (AFTER the window fired for
// "HI") gets a useless generic greeting reply, then a second reply — 2 messages.
// Fix: when a NEW message arrives while the agent is mid-GENERATION for this
// session, abort that run (don't send the throwaway greeting), un-claim its rows,
// and re-coalesce everything into one complete reply. `phase` gates this: only a
// run that is still 'generating' is abortable — once it starts 'publishing' we
// let it finish (Codex C7). Cohort cap stops a spammer from starving forever.
// Plan: docs/plans_reports/2026-07-11-BURST-DOUBLE-CANCEL-INFLIGHT-RECOALESCE_ARCHITECTURE_PLAN.md
const sessionRun = new Map<string, { controller: AbortController; phase: 'coalescing' | 'generating' | 'publishing' }>();
const sessionAbortMeta = new Map<string, { abortCount: number; firstMsgAt: number }>();
const MAX_ABORTS_PER_COHORT = 5;      // after N aborts → FORCE (let the run publish) to avoid starvation
const COHORT_MAX_WAIT_MS = 90_000;    // or after 90s of a single burst → FORCE

// Routing context captured when a quiet-window is scheduled; the timer callback
// re-derives everything else from the DB-claimed rows.
interface BatchCtx {
  channel: string;
  channelType: InboundMessage['channelType'];
  threadId: string;
  senderId: string;
  senderName?: string;
  peerKind: InboundMessage['peerKind'];
  groupName?: string;
  channelConfig: ChannelInstanceRow;
}

/** Mark the agent as "typing" for a session so customer clients can show an indicator. */
async function setAgentTyping(sessionKey: string): Promise<void> {
  const until = new Date(Date.now() + TYPING_TTL_MS).toISOString();
  try {
    // metadata jsonb merge is shallow at the DB level; we only touch typing_until.
    const { data } = await supabase
      .from('channel_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .maybeSingle();
    const metadata = { ...((data?.metadata as Record<string, any>) || {}), typing_until: until };
    await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);
  } catch { /* best-effort — typing is cosmetic */ }
}

/** Clear the typing indicator for a session. */
async function clearAgentTyping(sessionKey: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('channel_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .maybeSingle();
    if (!data) return;
    const metadata = { ...((data.metadata as Record<string, any>) || {}) };
    delete metadata.typing_until;
    await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);
  } catch { /* best-effort */ }
}

/**
 * Schedule (or extend) the quiet-window for a session. Each new message resets
 * the timer; when the customer stops sending for QUIET_WINDOW_MS the timer fires
 * and runs the coalesced batch. INVARIANT (Codex): every source (realtime,
 * startup reschedule) only ever CREATES/EXTENDS a timer — the real processing
 * authority lives solely in the bounded atomic claim inside runSessionBatch, so
 * a double-schedule can never produce a double reply.
 */
function scheduleQuietWindow(sessionKey: string, ctx: BatchCtx, delayMs: number = QUIET_WINDOW_MS): void {
  // Cancel-in-flight: a new message for this session arrived. If a run is still
  // GENERATING (agent producing a reply we haven't started sending), abort it so
  // we don't send a throwaway reply — the aborted run un-claims its rows and this
  // window will re-coalesce them with the new message. Guarded by a cohort cap so
  // a rapid-fire spammer can't abort forever (Codex C5): after MAX_ABORTS_PER_COHORT
  // aborts OR COHORT_MAX_WAIT_MS since the burst started, we let the run publish.
  const run = sessionRun.get(sessionKey);
  if (run && run.phase === 'generating') {
    const now = Date.now();
    const meta = sessionAbortMeta.get(sessionKey) || { abortCount: 0, firstMsgAt: now };
    const withinCap = meta.abortCount < MAX_ABORTS_PER_COHORT && (now - meta.firstMsgAt) < COHORT_MAX_WAIT_MS;
    if (withinCap) {
      meta.abortCount += 1;
      sessionAbortMeta.set(sessionKey, meta);
      run.controller.abort();
      console.log(`[Consumer] ${sessionKey} cancel-in-flight (abort #${meta.abortCount}) — new message, will re-coalesce`);
    }
    // else: FORCE — let the current run publish; the new message becomes a fresh cohort.
  }

  const existing = quietTimers.get(sessionKey);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    quietTimers.delete(sessionKey);   // delete BEFORE await so later messages create a fresh timer
    runSessionBatch(sessionKey, ctx).catch((err) => {
      console.error(`[Consumer] runSessionBatch error for ${sessionKey}:`, err?.message || err);
    });
  }, delayMs);
  quietTimers.set(sessionKey, { timer, ctx });
  if (quietTimers.size > 5000) {
    console.warn(`[Consumer] quietTimers size unexpectedly large: ${quietTimers.size}`);
  }
}

/**
 * Surface paused state to the owner-UI (2026-07-16). When a session is bot_paused
 * (human takeover), the gate returns WITHOUT claiming rows, so customer messages sit
 * as 'pending' — invisibly (bug: yinyangmasters khách kẹt 3 tuần). channel_pending is
 * service_role-only (owner-UI can't read it), so we stash the paused state onto
 * channel_sessions.metadata (which the owner-inbox DOES read) via an atomic idempotent
 * RPC → the badge shows "🔇 Bot tắt — N tin chờ" so the owner remembers to re-enable.
 */
async function surfacePausedState(ctx: BatchCtx, sessionKey: string): Promise<void> {
  try {
    let q = supabase
      .from('channel_pending_messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_name', ctx.channel)
      .eq('thread_id', ctx.threadId)
      .eq('status', 'pending')
      .is('handled_by', null);
    if (ctx.peerKind !== 'group') q = q.eq('from_uid', ctx.senderId);
    const { count } = await q;
    await supabase.rpc('cskh_set_paused_meta', { p_session_key: sessionKey, p_pending_count: count ?? 0 });
  } catch { /* best-effort surface — never block the pause gate */ }
}

/**
 * Re-drain a session's still-pending messages (2026-07-16). Called when an owner turns
 * the bot back ON after a takeover (manual re-enable — no auto-resume, per OD-1). Derives
 * the batch ctx from a still-pending row (same pattern as the startup reschedule) and
 * schedules a quiet-window so the bot answers the messages that arrived while paused.
 * No-op if nothing is pending. Exported so conversation-routes (Paperclip toggle) can
 * call it directly; the channel_sessions realtime subscription covers the edge/mobile
 * toggle path.
 */
export async function reschedulePendingSession(sessionKey: string): Promise<void> {
  try {
    // Parser CHUNG với transcript.ts (25/07) — trước đây file này có luật riêng đòi 2 dấu ':'
    // và `return` CÂM với key 2 phần ⇒ mầm drift (cùng gốc bug gem-master 400).
    const parsed = parseSessionKey(sessionKey);
    if (!parsed) return;
    // Channel single-party (gem-master) có ENGINE TRẢ LỜI RIÊNG (gemini-proxy) và chỉ được
    // MIRROR sang đây để xem. Cho nó đi tiếp = consumer lên lịch bot trả lời lần 2 ⇒ trả lời
    // kép cho khách + gửi qua đường fallback sai. Trước khi gộp parser, nhánh này bị chặn
    // NGẪU NHIÊN bởi luật parse cũ; giờ phải chặn CÓ CHỦ Ý.
    if (!parsed.filterSender && !parsed.isGroup) return;
    const { channel, threadId, senderPart, isGroup } = parsed;

    let q = supabase
      .from('channel_pending_messages')
      .select('from_uid, sender_name, peer_kind, metadata')
      .eq('channel_name', channel)
      .eq('thread_id', threadId)
      .eq('status', 'pending')
      .is('handled_by', null)
      .order('created_at', { ascending: true })
      .limit(1);
    if (!isGroup) q = q.eq('from_uid', senderPart);
    const { data } = await q;
    if (!data || data.length === 0) return; // nothing waiting → nothing to re-drain
    const row = data[0] as any;
    const cfg = await getChannelConfig(channel);
    if (!cfg || !cfg.enabled) return;
    scheduleQuietWindow(sessionKey, {
      channel,
      channelType: 'zalo_personal', // placeholder — routing uses channel, not channelType (mirror startup)
      threadId,
      senderId: isGroup ? row.from_uid : senderPart,
      senderName: row.sender_name || undefined,
      peerKind: (row.peer_kind || 'direct') as InboundMessage['peerKind'],
      groupName: (row.metadata as any)?.groupName,
      channelConfig: cfg,
    }, 1_500);
    console.log(`[Consumer] Re-drained paused session ${sessionKey} after bot unpause`);
  } catch (err: any) {
    console.error(`[Consumer] reschedulePendingSession ${sessionKey} failed:`, err?.message || err);
  }
}

// Re-drain-on-unpause realtime bridge (2026-07-16). Listens for channel_sessions UPDATE
// where bot_unpaused_at advances (an owner turned the bot back on via the edge/mobile
// toggle, which can't call the consumer directly) → reschedule that session's waiting
// pending. Guards: (a) singleton subscription; (b) act only on a NEW bot_unpaused_at
// value per session (dedupe) AND not currently paused → cosmetic metadata UPDATEs
// (typing_until/last_source) never trigger a re-drain. NEW row is always full under
// default replica identity (we only need NEW, not OLD → no REPLICA IDENTITY FULL).
let sessionUnpauseChannel: ReturnType<typeof supabase.channel> | null = null;
const lastUnpauseHandled = new Map<string, string>();
function subscribeSessionUnpause(): void {
  if (sessionUnpauseChannel) return;
  sessionUnpauseChannel = supabase
    .channel('cskh-session-unpause')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'channel_sessions' },
      (payload: { new?: Record<string, any> }) => {
        try {
          const row = payload.new || {};
          const sessionKey = row.session_key as string | undefined;
          const upa = row.bot_unpaused_at as string | null | undefined;
          const paused = !!(row.metadata && (row.metadata as any).bot_paused);
          if (!sessionKey || !upa || paused) return;
          if (lastUnpauseHandled.get(sessionKey) === upa) return; // already handled this unpause
          lastUnpauseHandled.set(sessionKey, upa);
          if (lastUnpauseHandled.size > 5000) lastUnpauseHandled.clear(); // bound memory
          console.log(`[Consumer] channel_sessions unpause ${sessionKey} @ ${upa} — re-draining`);
          void reschedulePendingSession(sessionKey);
        } catch { /* best-effort */ }
      },
    )
    .subscribe();
  console.log('[Consumer] Subscribed to channel_sessions unpause (re-drain bridge)');
}

/**
 * Start the consumer: listen for inbound messages on the bus and process them.
 */
export function startConsumer(): void {
  subscribeSessionUnpause();

  bus.on('inbound', async (msg: InboundMessage) => {
    // Look up pending message ID by message_id for tracking
    let pendingId: string | undefined;
    if (msg.id) {
      const { data } = await supabase
        .from('channel_pending_messages')
        .select('id')
        .eq('message_id', msg.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      pendingId = data?.id;
    }
    processMessage(msg, pendingId).catch(err => {
      console.error('[Consumer] Unhandled error in processMessage:', err);
    });
  });

  // Also listen for realtime messages (from other server instances)
  bus.on('inbound:realtime', (msg: InboundMessage, pendingId: string) => {
    processMessage(msg, pendingId).catch(err => {
      console.error('[Consumer] Unhandled error in realtime processMessage:', err);
    });
  });

  console.log('[Consumer] Started — listening for inbound messages');

  // On startup: RESCHEDULE unanswered customer messages (Codex R#3 — restart-safety).
  // The quiet-window timers live in memory, so a restart between a message arriving
  // and its window firing would leave the row 'pending' with no realtime event to
  // re-trigger it → the customer never gets a reply. So we scan every still-pending
  // customer inbound (regardless of age) and reschedule a short quiet-window per
  // thread; the bounded atomic claim inside runSessionBatch dedupes against any
  // concurrent realtime schedule. We only STALE-SKIP rows genuinely stuck in
  // 'processing' from an agent that died mid-run (>1h) — never fresh customer
  // inbound. (Replaces the old cleanup that marked ALL pending >5min as stale,
  // which silently swallowed unanswered customer questions.)
  setTimeout(async () => {
    try {
      // (a) Reschedule unanswered customer inbound.
      const { data: pend } = await supabase
        .from('channel_pending_messages')
        .select('channel_name, thread_id, from_uid, sender_name, peer_kind, metadata')
        .eq('status', 'pending')
        .is('handled_by', null)
        .order('created_at', { ascending: true })
        .limit(500);

      if (pend && pend.length > 0) {
        // One quiet-window per (channel, thread) — dedupe groups.
        const seen = new Set<string>();
        let scheduled = 0;
        for (const row of pend as any[]) {
          const ch = row.channel_name as string;
          const tid = row.thread_id as string;
          if (!ch || !tid) continue;
          const isGroup = row.peer_kind === 'group';
          const sessionKey = isGroup ? `${ch}:${tid}:group` : `${ch}:${tid}:${row.from_uid}`;
          if (seen.has(sessionKey)) continue;
          seen.add(sessionKey);
          const cfg = await getChannelConfig(ch);
          if (!cfg || !cfg.enabled) continue;
          scheduleQuietWindow(sessionKey, {
            channel: ch,
            channelType: 'zalo_personal', // re-resolved from row inside runSessionBatch is not needed; routing uses channel
            threadId: tid,
            senderId: row.from_uid,
            senderName: row.sender_name || undefined,
            peerKind: (row.peer_kind || 'direct') as InboundMessage['peerKind'],
            groupName: (row.metadata as any)?.groupName,
            channelConfig: cfg,
          }, 3_000);
          scheduled++;
          if (scheduled >= 200) break; // safety cap against a thundering herd
        }
        if (scheduled > 0) console.log(`[Consumer] Startup: rescheduled ${scheduled} unanswered thread(s)`);
      }

      // (b) Stale-skip only rows stuck in 'processing' from a dead agent run (>1h).
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: stuck } = await supabase
        .from('channel_pending_messages')
        .select('id')
        .eq('status', 'processing')
        .lt('created_at', oneHourAgo)
        .limit(100);
      if (stuck && stuck.length > 0) {
        console.log(`[Consumer] Startup: marking ${stuck.length} stuck 'processing' rows as stale`);
        await supabase
          .from('channel_pending_messages')
          .update({ status: 'handled', handled_by: 'consumer', skip_reason: 'stale_on_restart' })
          .in('id', stuck.map((s: any) => s.id));
      }
    } catch (err: any) {
      console.error('[Consumer] Startup reschedule failed:', err.message);
    }
  }, 10_000);
}

/**
 * Full processing pipeline for an inbound message.
 */
async function processMessage(
  msg: InboundMessage,
  pendingId?: string
): Promise<void> {
  const peerLabel = msg.peerKind === 'group' ? 'GROUP' : msg.peerKind === 'comment' ? 'COMMENT' : 'DM';
  const logPrefix = `[Consumer:${msg.channel}] ${peerLabel} "${msg.senderName}"→${msg.chatId}`;

  // ── Step 1: Deduplication ──
  const dedupeKey = msg.dedupeKey
    || `${msg.channel}:${msg.chatId}:${msg.senderId}:${msg.timestamp.getTime()}`;

  if (deduplicator.isDuplicate(dedupeKey)) {
    // Duplicate ở đây = ECHO của CÙNG row (cùng dedupe_key được emit 2 lần: in-process
    // 'inbound' + realtime 'inbound:realtime'). idx_cpm_dedupe (UNIQUE partial trên
    // dedupe_key WHERE NOT NULL) đảm bảo ≤1 row/dedupe_key → duplicate KHÔNG BAO GIỜ là
    // 2 row khác nhau. Vì vậy markHandled(...,'skipped') ở đây sẽ GIẾT đúng row mà đường
    // kia đang xử lý chờ reply (runSessionBatch drain WHERE status='pending' → miss → bot
    // im). → chỉ bỏ qua im lặng, KHÔNG đụng status row (Fix B, plan 2026-07-18-ZALO-GEM).
    // Fix A đã cắt nguồn echo cho kênh in-process; đây là lớp phòng thủ cho echo lọt bất
    // kỳ đâu (vd multi-instance tương lai). 2 tin THẬT khác nhau = 2 dedupe_key = 2 row
    // riêng → coalesce đúng ở runSessionBatch, KHÔNG vào nhánh này.
    console.log(`${logPrefix} Duplicate echo skipped (row untouched): ${dedupeKey}`);
    return;
  }

  // ── Step 2: Load channel config ──
  const channelConfig = await getChannelConfig(msg.channel);
  if (!channelConfig) {
    console.warn(`${logPrefix} Channel config not found: ${msg.channel}`);
    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', 'no_channel');
    return;
  }

  if (!channelConfig.enabled) {
    console.log(`${logPrefix} Channel disabled, skipping`);
    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', 'channel_disabled');
    return;
  }

  // ── Step 3: Policy check ──
  const policyResult = await policy.check(msg, channelConfig);
  if (!policyResult.pass) {
    console.log(`${logPrefix} Policy rejected: ${policyResult.reason}`);

    // If pairing code was generated, send it as a reply to the user
    if (policyResult.pairingCode) {
      const pairingReply: OutboundMessage = {
        channel: msg.channel,
        chatId: msg.chatId,
        content: `Xin chào ${msg.senderName}! Để sử dụng trợ lý AI, vui lòng đợi phê duyệt. Mã ghép nối: ${policyResult.pairingCode}`,
      };
      bus.publishOutbound(pairingReply);
    }

    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', `policy_rejected: ${policyResult.reason}`);
    return;
  }

  // ── Step 4: Quota check ──
  const quotaResult = await quota.check(
    msg.channel,
    msg.senderId,
    channelConfig.quota_hour,
    channelConfig.quota_day
  );

  if (!quotaResult.allowed) {
    console.log(`${logPrefix} Quota exceeded: hour=${quotaResult.hourCount}/${quotaResult.hourLimit}, day=${quotaResult.dayCount}/${quotaResult.dayLimit}`);
    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', 'rate_limited');
    return;
  }

  // ── Step 5 (2026-07-10): quiet-window + coalesce ──
  // Instead of replying to THIS message immediately, save group history, show a
  // typing indicator, and schedule a per-session quiet-window. When the customer
  // stops sending for QUIET_WINDOW_MS, runSessionBatch() drains + coalesces every
  // still-pending message for the thread and replies ONCE. Fix for the residual
  // burst-typing double-reply. Steps 1-4 above still run per message (spam gates).
  const isGroupMsg = msg.peerKind === 'group';
  const scheduleKey = isGroupMsg
    ? `${msg.channel}:${msg.chatId}:group`
    : `${msg.channel}:${msg.chatId}:${msg.senderId}`;

  // Group messages are always saved to the group transcript (independent of reply).
  if (isGroupMsg) {
    await session.saveGroupMessage(
      msg.channel, msg.chatId, msg.senderId, msg.senderName, msg.content, msg.timestamp,
    ).catch(() => {});
  }

  // Typing indicator up-front so the quiet-window wait doesn't feel dead.
  setAgentTyping(scheduleKey).catch(() => {});

  scheduleQuietWindow(scheduleKey, {
    channel: msg.channel,
    channelType: msg.channelType,
    threadId: msg.chatId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    peerKind: msg.peerKind,
    groupName: msg.metadata?.groupName,
    channelConfig,
  });
  console.log(`${logPrefix} queued (quiet-window ${QUIET_WINDOW_MS}ms) → ${scheduleKey}`);
}

/**
 * Fired when a session's quiet-window settles: serialize behind any in-flight run,
 * then drain + coalesce every still-pending message for the thread and reply once.
 */
async function runSessionBatch(sessionKey: string, ctx: BatchCtx): Promise<void> {
  // Serialize per session (a prior run may still be mid-agent).
  const priorRun = sessionInFlight.get(sessionKey) || Promise.resolve();
  let releaseLock: () => void = () => {};
  const thisRun = new Promise<void>((resolve) => { releaseLock = resolve; });
  sessionInFlight.set(sessionKey, thisRun);
  await priorRun;

  // Cancel-in-flight controller — created AFTER await priorRun so a batch waiting
  // on the lock can't overwrite the running batch's controller (Codex C2). Starts
  // 'coalescing' (NOT abortable — no agent running yet, Codex D3); flips to
  // 'generating' right before runAgent inside processResolved.
  const controller = new AbortController();
  sessionRun.set(sessionKey, { controller, phase: 'coalescing' });
  let claimedIds: string[] = [];

  try {
    // Owner may have taken over while we waited.
    if (await isSessionPaused(sessionKey)) {
      // Surface paused state to owner-UI (2026-07-16) instead of leaving customer
      // messages invisibly 'pending' — stash paused_since + N-waiting onto
      // channel_sessions.metadata so the badge shows "🔇 Bot tắt — N tin chờ".
      await surfacePausedState(ctx, sessionKey);
      console.log(`[Consumer:${ctx.channel}] ⏸ ${sessionKey} bot_paused — skipping batch (surfaced)`);
      await clearAgentTyping(sessionKey);
      return;
    }

    const isGroup = ctx.peerKind === 'group';
    const nowIso = new Date().toISOString();

    // ── DRAIN (bounded): every still-pending message for this thread ──
    let drainQ = supabase
      .from('channel_pending_messages')
      .select('id, body, media, sender_name, from_uid, created_at, metadata')
      .eq('channel_name', ctx.channel)
      .eq('thread_id', ctx.threadId)
      .eq('status', 'pending')
      .is('handled_by', null)
      .lte('created_at', nowIso)          // snapshot — don't swallow later arrivals
      .order('created_at', { ascending: true })
      .limit(MAX_COALESCE);
    if (!isGroup) drainQ = drainQ.eq('from_uid', ctx.senderId);  // DM: don't merge two customers on one thread
    const { data: drained } = await drainQ;
    if (!drained || drained.length === 0) { await clearAgentTyping(sessionKey); return; }
    const drainedIds = (drained as any[]).map((r) => r.id);

    // ── CLAIM (atomic, bounded to drained ids): only rows still pending ──
    const { data: claimed } = await supabase
      .from('channel_pending_messages')
      .update({ status: 'processing', agent_slug: ctx.channelConfig.agent_slug ?? null, session_key: sessionKey })
      .in('id', drainedIds)
      .eq('status', 'pending')
      .is('handled_by', null)
      .select('id, body, media, sender_name, from_uid, created_at, metadata');
    if (!claimed || claimed.length === 0) { await clearAgentTyping(sessionKey); return; }

    const rows = [...(claimed as any[])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    claimedIds = rows.map((r) => r.id);

    // ── COALESCE: merge content (group keeps sender prefixes) + media ──
    const coalescedContent = rows
      .map((r) => {
        const body = (r.body || '').trim();
        return isGroup && r.sender_name ? `${r.sender_name}: ${body}` : body;
      })
      .filter(Boolean)
      .join('\n');
    const coalescedMedia = rows.flatMap((r) => (Array.isArray(r.media) ? (r.media as string[]) : []));
    const last = rows[rows.length - 1];
    const channelType = (ctx.channelConfig.channel_type || ctx.channelType) as InboundMessage['channelType'];

    const merged: InboundMessage = {
      id: last.id,
      channel: ctx.channel,
      channelType,
      chatId: ctx.threadId,
      senderId: ctx.senderId,
      senderName: ctx.senderName || last.sender_name || ctx.senderId,
      content: coalescedContent,
      contentType: coalescedMedia.length > 0 ? 'image' : 'text',
      media: coalescedMedia.length > 0
        ? coalescedMedia.map((u) => ({ url: u, mimeType: 'application/octet-stream' }))
        : undefined,
      peerKind: ctx.peerKind,
      // Preserve comment_id (FB/YT comment auto-reply target) through the coalesce.
      // The drain/claim selects didn't include `metadata`, so a coalesced comment
      // reply lost its comment_id → YouTube skipped the reply / Facebook routed it
      // as a DM instead of a comment (Codex H1, pre-existing coalesce bug surfaced
      // by the gateway wiring). Carry it from the last claimed row's metadata.
      metadata: {
        ...(ctx.groupName ? { groupName: ctx.groupName } : {}),
        ...((last as any).metadata?.comment_id ? { comment_id: (last as any).metadata.comment_id } : {}),
        // Carry the app/web origin (edge cskh-inbound stores metadata.source =
        // 'web'|'mobile') so the inbox can show where the customer is chatting from.
        ...((last as any).metadata?.source ? { source: (last as any).metadata.source } : {}),
      },
      timestamp: new Date(last.created_at),
    };

    console.log(`[Consumer:${ctx.channel}] ${sessionKey} coalesced ${claimedIds.length} msg(s) → 1 reply`);
    await processResolved(merged, claimedIds, ctx.channelConfig, sessionKey, controller);
    await clearAgentTyping(sessionKey);
    // Reply published (or intentionally skipped) → this cohort is done; reset the
    // abort counter so the NEXT burst starts fresh.
    sessionAbortMeta.delete(sessionKey);
  } catch (err: any) {
    const aborted = err instanceof router.AgentAbortedError;
    if (aborted) {
      console.log(`[Consumer] ${sessionKey} run aborted mid-generation — un-claiming for re-coalesce`);
    } else {
      console.error(`[Consumer] runSessionBatch(${sessionKey}) error:`, err?.message || err);
    }
    // Un-claim the rows (Codex C1 aborted + D1 any error) so a follow-up batch
    // re-gathers them — otherwise they'd sit 'processing' until the >1h startup
    // sweep. Only rows STILL 'processing' (don't clobber a concurrent handler).
    if (claimedIds.length > 0) {
      try {
        await supabase.from('channel_pending_messages')
          .update({ status: 'pending', handled_by: null, agent_slug: null })
          .in('id', claimedIds)
          .eq('status', 'processing');
      } catch { /* best-effort */ }
    }
    if (!aborted) await clearAgentTyping(sessionKey).catch(() => {});
  } finally {
    releaseLock();
    if (sessionInFlight.get(sessionKey) === thisRun) sessionInFlight.delete(sessionKey);
    // CAS delete: only remove the run entry if it's still OURS (a newer batch may
    // have already replaced it) — Codex C2.
    if (sessionRun.get(sessionKey)?.controller === controller) sessionRun.delete(sessionKey);
  }
}

/**
 * Heavy pipeline for a resolved (coalesced) message: CRM resolve → agent routing →
 * session context → runAgent → publish → mark the whole coalesced batch handled.
 * `claimedIds` are the pending rows this reply answers (already status='processing').
 */
async function processResolved(
  merged: InboundMessage,
  claimedIds: string[],
  channelConfig: ChannelInstanceRow,
  batchSessionKey?: string,
  controller?: AbortController,
): Promise<void> {
  const peerLabel = merged.peerKind === 'group' ? 'GROUP' : merged.peerKind === 'comment' ? 'COMMENT' : 'DM';
  const logPrefix = `[Consumer:${merged.channel}] ${peerLabel} "${merged.senderName}"→${merged.chatId}`;

  // Mark EVERY coalesced pending row with one status/handler (replaces per-pendingId markHandled).
  const markBatch = async (handledBy: string, status: 'handled' | 'skipped', reason?: string): Promise<void> => {
    if (claimedIds.length === 0) return;
    const payload: Record<string, any> = { status, handled_by: handledBy, handled_at: new Date().toISOString() };
    if (reason) payload.skip_reason = reason;
    try { await supabase.from('channel_pending_messages').update(payload).in('id', claimedIds); } catch { /* best-effort */ }
  };

  // ── Step 6: Group @mention gating ──
  let suppressAutoReply = false;
  if (merged.peerKind === 'group' && channelConfig.require_mention) {
    if (!hasMention(merged.content, channelConfig)) {
      console.log(`${logPrefix} Group message without @mention → inbox only, no auto-reply`);
      suppressAutoReply = true;
    }
  }

  // ── Step 6b: CRM — Resolve customer + cancel pending summary ──
  // BUG 3 FIX: Check save_contacts_to_crm before creating CRM records
  // COMMENT GUARD (2026-08-05): người bình luận trên bài viết KHÔNG phải khách nhắn
  // tin — senderId của comment là id comment-scoped của Graph API, KHÁC PSID
  // Messenger, nên hồ sơ CRM tạo từ nó không bao giờ khớp hội thoại nào (rác thuần).
  // Comment do agent hẹn-giờ `comment-responder` xử lý, không đi qua CRM.
  const isComment = merged.peerKind === 'comment';
  const saveContact = channelConfig.save_contacts_to_crm !== false && !isComment;
  let customerId: string | undefined;
  try {
    const crmResult = isComment ? null : await customerResolver.resolve(
      merged.senderId,
      merged.senderName,
      merged.channelType,
      merged.channel,
      saveContact,
    );
    customerId = crmResult?.customerId;

    // Cancel any pending AI summary (new message resets idle timer)
    // BUG 2 FIX: Use group-aware session key
    const isGroup = merged.peerKind === 'group';
    const earlySessionKey = isGroup
      ? `${merged.channel}:${merged.chatId}:group`
      : `${merged.channel}:${merged.chatId}:${merged.senderId}`;
    aiSummarizer.cancelPending(earlySessionKey);
    if (crmResult?.isNew) {
      console.log(`${logPrefix} CRM: Khách mới tạo → ${customerId}`);
    }

    // Auto-save to inbox_contacts for permanent contact persistence.
    // Route senderId to the correct platform-specific column based on channelType
    // so FB PSIDs don't pollute zalo_id and CRM resolves by the right key.
    if (saveContact && merged.senderId && merged.peerKind !== 'group') {
      const isFacebook = merged.channelType === 'facebook' || merged.channelType === 'facebook_web';
      const platformColumn = isFacebook ? 'facebook_id' : 'zalo_id';
      supabase.from('inbox_contacts').select('id').eq(platformColumn, merged.senderId).single().then(async ({ data }) => {
        if (data?.id) {
          await supabase.from('inbox_contacts').update({
            name: merged.senderName || merged.senderId,
            channel: merged.channel,
            last_message_at: new Date().toISOString(),
          }).eq('id', data.id);
        } else {
          const insertPayload: Record<string, any> = {
            name: merged.senderName || merged.senderId,
            channel: merged.channel,
            last_message_at: new Date().toISOString(),
          };
          insertPayload[platformColumn] = merged.senderId;
          await supabase.from('inbox_contacts').insert(insertPayload);
        }
      });
    }
  } catch (err: any) {
    console.warn(`${logPrefix} CRM resolve failed (non-blocking): ${err.message}`);
  }

  // ── Step 7: Resolve agent ──
  // Group messages without an @mention skip the agent entirely (inbox-only),
  // routing through the no-agent branch at Step 9 so the message is saved to the
  // group thread without producing a reply.
  const agentSlug = suppressAutoReply ? undefined : await router.resolveAgent(merged);

  if (!agentSlug) {
    const skipReason = (merged as any)._skipReason || 'no_agent_assigned';
    console.log(`${logPrefix} Skipped AI routing: ${skipReason} - Saving to Inbox only`);
    await markBatch('consumer', 'skipped', skipReason);
    // Don't return here! We still need to save the message to session history for human inbox
  }

  // ── Step 8: Build session context ──
  // BUG 2 FIX: Group chats use single session (groupId), not per-sender sessions
  const isGroup = merged.peerKind === 'group';
  const sessionKey = isGroup
    ? `${merged.channel}:${merged.chatId}:group`
    : `${merged.channel}:${merged.chatId}:${merged.senderId}`;
  const sess = await session.getOrCreate(sessionKey, {
    channelName: merged.channel,
    agentSlug,
    peerKind: merged.peerKind,
    chatId: merged.chatId,
    senderId: isGroup ? merged.chatId : merged.senderId,
    senderName: isGroup ? (merged.metadata?.groupName || 'Group') : merged.senderName,
    metadata: isGroup ? { is_group: true, group_name: merged.metadata?.groupName } : {},
  });

  // NOTE: user message is persisted to channel_sessions.history inside
  // router.saveHistory() as the SINGLE writer. Writing here again caused
  // BUG-047 (duplicate entries ~300ms apart).

  // Update conversation metadata for Unified Inbox
  const sessionUpdate: Record<string, any> = {
    last_message_at: new Date().toISOString(),
    last_message_preview: merged.content.substring(0, 200),
    last_message_sender: merged.senderName || merged.senderId,
    unread_count: ((sess as any).unread_count || 0) + 1,
    has_attachments: !!(merged.media && merged.media.length > 0),
  };
  // BUG 2 FIX: Mark group sessions with is_group + group_name
  if (isGroup) {
    sessionUpdate.is_group = true;
    if (merged.metadata?.groupName) sessionUpdate.group_name = merged.metadata.groupName;
  }
  // Record the app/web origin of the latest message on the session so the inbox
  // list + chat header can show a "📱 App" / "🌐 Web" badge. Merge into the
  // existing metadata jsonb (shallow) so we don't clobber bot_paused/typing/etc.
  if (merged.metadata?.source) {
    sessionUpdate.metadata = { ...((sess as any).metadata || {}), last_source: merged.metadata.source };
  }
  // Link CRM customer to session (required for order/ticket creation in chat).
  // NOT for groups: a group session is shared by many members, so linking it to
  // whoever sent last would thrash the CRM linkage between members.
  if (customerId && merged.peerKind !== 'group') {
    sessionUpdate.customer_id = customerId;
  }
  try { await supabase.from('channel_sessions').update(sessionUpdate).eq('session_key', sessionKey); } catch {}

  // Get history for agent context
  const historyLimit = channelConfig.history_limit || 50;

  // Persist inbound group messages that won't be routed to an agent (no @mention
  // or no agent assigned) into the session transcript. The agent path relies on
  // router.saveHistory() as the single writer (BUG-047), so we only append here
  // when no agent will run — otherwise the group thread renders empty / frozen.
  if (merged.peerKind === 'group' && !agentSlug) {
    // Prefix the sender name into the stored content: the inbox transcript
    // renderer (mapHistory) shows `content` only, so without the prefix a group
    // thread would lose track of who said what.
    const groupLine = merged.senderName
      ? `${merged.senderName}: ${merged.content}`
      : merged.content;
    await session.appendMessage(
      sessionKey,
      'user',
      groupLine,
      historyLimit,
      merged.senderName,
    );
  }

  let history = await session.getHistory(sessionKey, historyLimit);

  // For groups, also include recent group context
  if (merged.peerKind === 'group') {
    const groupContext = await session.getGroupHistory(
      merged.channel,
      merged.chatId,
      Math.min(historyLimit, 20)
    );

    if (groupContext.length > 0) {
      const contextMessages = groupContext.map(g => ({
        role: 'system' as const,
        content: `[${g.sender_name}]: ${g.content}`,
        timestamp: g.ts,
      }));
      // Prepend group context before session history
      history = [...contextMessages, ...history];
    }
  }

  // ── Step 8b: CRM — Build customer context + link session ──
  let customerContext = '';
  if (customerId) {
    try {
      customerContext = await contextBuilder.build(customerId, sessionKey);
    } catch (err: any) {
      console.warn(`${logPrefix} CRM context build failed (non-blocking): ${err.message}`);
    }

    // Link customer to session + pending message (session link skipped for groups
    // — shared session must not be bound to a single member; see Step 8 above).
    if (merged.peerKind !== 'group') {
      try { await supabase.from('channel_sessions').update({ customer_id: customerId }).eq('session_key', sessionKey); } catch {}
    }

    if (claimedIds.length > 0) {
      try { await supabase.from('channel_pending_messages').update({ customer_id: customerId }).in('id', claimedIds); } catch {}
    }
  }

  // Build enriched message with CRM context
  const enrichedMessage = customerContext
    ? `${customerContext}\n\n[TIN NHẮN MỚI]\n${merged.content}`
    : merged.content;

  // ── Step 8c: Attach structured CRM data for buildSystemPrompt ──
  if (customerId) {
    try {
      const { data: crmCustomer } = await supabase
        .from('crm_customers')
        .select('display_name, status, lead_score, lead_temperature, total_orders, total_revenue, metadata')
        .eq('id', customerId)
        .single();
      if (crmCustomer) {
        (merged as any)._customerContext = {
          name: crmCustomer.display_name,
          stage: crmCustomer.status || 'new',
          total_orders: crmCustomer.total_orders,
          gender: (crmCustomer.metadata as any)?.gender || null,  // structured metadata.gender → identity header giới_tính (agy gender-aware xưng hô)
          channel_name: merged.channel,
          sender_id: merged.senderId || null,
          customer_id: customerId,  // CRM UUID — required by create_ticket/get_customer_info/etc.
        };
      }
    } catch { /* non-blocking */ }
  }
  // Fallback: always set _customerContext from message metadata so log viewer
  // can display sender name + channel even when customer isn't in CRM yet.
  if (!(merged as any)._customerContext) {
    (merged as any)._customerContext = {
      name: merged.senderName || null,
      stage: 'new',
      channel_name: merged.channel,
      sender_id: merged.senderId || null,
    };
  }

  // ── Step 9: Route to agent (Claude CLI) ──
  if (agentSlug) {
    // NOTE: this runs INSIDE runSessionBatch's per-session lock, and the batch's
    // pending rows are already status='processing' (claimed atomically). So there
    // is NO re-lock and NO re-claim here — that would deadlock on our own lock.
    // `history` (fetched at Step 8, inside the lock) already reflects the prior
    // run's saved reply, so it is fresh.
    try {
      // Escalation / takeover gate: owner may have paused during the quiet-window.
      if (await isSessionPaused(sessionKey)) {
        console.warn(`${logPrefix} ⏸ Session bot_paused before agent run — skipping auto-reply`);
        await markBatch('human', 'skipped', 'escalated_bot_paused');
        return;
      }

      console.log(`${logPrefix} → Routing to agent: ${agentSlug}${customerId ? ` (CRM: ${customerId.substring(0, 8)})` : ''} | msg: "${merged.content.substring(0, 60)}"`);

      // Enter the abortable GENERATING phase RIGHT before the agent runs (Codex D3
      // — not earlier, so drain/CRM-resolve/no-agent can't be false-aborted). A new
      // message arriving now → scheduleQuietWindow aborts controller → runAgent
      // throws AgentAbortedError → propagates to runSessionBatch (un-claim + re-run).
      if (batchSessionKey && controller && sessionRun.get(batchSessionKey)?.controller === controller) {
        sessionRun.set(batchSessionKey, { controller, phase: 'generating' });
      }

      const replyText = await router.runAgent(
        agentSlug,
        sessionKey,
        enrichedMessage,
        merged,
        history,
        controller?.signal,
      );

      // Past generation: STOP being abortable (Codex C7). From here we commit to
      // publishing this reply; a new message becomes a fresh cohort/batch.
      if (batchSessionKey && controller && sessionRun.get(batchSessionKey)?.controller === controller) {
        sessionRun.set(batchSessionKey, { controller, phase: 'publishing' });
      }

      // NOTE: assistant reply is persisted to channel_sessions.history inside
      // router.saveHistory() (single writer). Removed duplicate appendMessage
      // that caused BUG-047.

      // Outbound media extracted from [[SEND_MEDIA: id]] markers (router populates
      // config._outboundMedia in postProcessReply). Read it BEFORE the empty-reply
      // guard so a MEDIA-ONLY reply (agent sends an image with no text) is NOT
      // dropped as "empty" (Codex F4 — this was a latent bug: the guard ran before
      // media was read, silently swallowing image-only replies).
      const outboundMedia = (merged as any)._outboundMedia as
        | { url?: string; path?: string; mimeType: string; filename?: string; caption?: string }[]
        | undefined;

      // ── Empty reply = stay SILENT (no fallback). ──
      // The router returns '' when the agent is disabled / unknown / errors / the
      // provider fails. We NEVER send a canned fallback message — leave the
      // customer message in the inbox for a human, publish nothing.
      const hasChunks = Array.isArray((merged as any)._messageChunks) && (merged as any)._messageChunks.length > 0;
      const hasMedia = Array.isArray(outboundMedia) && outboundMedia.length > 0;
      if ((!replyText || !replyText.trim()) && !hasChunks && !hasMedia) {
        console.log(`${logPrefix} Agent produced empty reply — staying silent (no fallback), left in inbox`);
        await markBatch('agent', 'skipped', 'agent_silent');
        if (customerId && merged.peerKind !== 'group') aiSummarizer.scheduleSummary(sessionKey, customerId);
        return;
      }

      // ── P2 re-check pause (race-guard) ──
      // runAgent (LLM) mất ~phút. Owner có thể bấm "Dừng Bot"/takeover GIỮA CHỪNG
      // → re-check NGAY TRƯỚC publish để hủy reply in-flight, tránh bot trả lời
      // chồng sau khi đã takeover.
      if (await isSessionPaused(sessionKey)) {
        console.warn(`${logPrefix} ⏸ Session bot_paused mid-flight — dropping generated reply (takeover during agent run)`);
        await markBatch('human', 'skipped', 'paused_mid_flight');
        return;
      }

      // ── Step 10: Publish outbound reply ──
      // (outboundMedia was read above, before the empty-reply guard — Codex F4.)

      // Multi-message reply: if router split the reply into chunks via
      // [[MSG_BREAK]], send each chunk as a separate outbound message with a
      // small typing delay. Each chunk can carry its own media (extracted from
      // inline [[SEND_MEDIA]] markers within that chunk).
      const messageChunks = (merged as any)._messageChunks as
        | Array<{ text: string; media?: typeof outboundMedia }>
        | undefined;

      if (messageChunks && messageChunks.length > 1) {
        console.log(`${logPrefix} Multi-message reply: ${messageChunks.length} chunks`);
        for (let i = 0; i < messageChunks.length; i++) {
          const chunk = messageChunks[i];
          const chunkMedia = chunk.media;
          const chunkOutbound: OutboundMessage = {
            channel: merged.channel,
            chatId: merged.chatId,
            content: chunk.text,
            contentType: chunkMedia && chunkMedia.length > 0 ? 'image' : 'text',
            media: chunkMedia && chunkMedia.length > 0 ? chunkMedia : undefined,
            // Only the FIRST chunk replies-to the customer message; subsequent
            // chunks are standalone follow-ups so threads don't look spammy.
            replyToMessageId: i === 0 ? merged.id : undefined,
            metadata: {
              agentSlug,
              sessionKey,
              processingTime: Date.now() - merged.timestamp.getTime(),
              mediaCount: chunkMedia?.length || 0,
              chunkIndex: i,
              chunkTotal: messageChunks.length,
              peerKind: merged.peerKind,
              comment_id: merged.metadata?.comment_id,
            },
          };
          bus.publishOutbound(chunkOutbound);

          // Inter-chunk typing delay: 1.5–2.5s, randomized so it feels human.
          // No delay after the last chunk.
          if (i < messageChunks.length - 1) {
            const delayMs = 1500 + Math.floor(Math.random() * 1000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      } else {
        // Reply Gateway Contract (P2): deterministic dedupe key for this reply.
        // batchId = min uuid of the claimed pending rows (order-independent) →
        // a duplicate emit for the SAME burst collapses to one key (23505 → the
        // adapter's deliverReplyOnce skips the send). Media-only replies still
        // carry the key so the ONE claim gates text + attachments together.
        const dedupeKey = buildReplyDedupeKey(sessionKey, buildBatchId(claimedIds));
        const outbound: OutboundMessage = {
          channel: merged.channel,
          chatId: merged.chatId,
          content: replyText,
          contentType: outboundMedia && outboundMedia.length > 0 ? 'image' : 'text',
          media: outboundMedia && outboundMedia.length > 0 ? outboundMedia : undefined,
          replyToMessageId: merged.id,
          sessionKey,
          dedupeKey,
          metadata: {
            agentSlug,
            sessionKey,
            processingTime: Date.now() - merged.timestamp.getTime(),
            mediaCount: outboundMedia?.length || 0,
            peerKind: merged.peerKind,
            comment_id: merged.metadata?.comment_id,
          },
        };

        if (outboundMedia && outboundMedia.length > 0) {
          console.log(`${logPrefix} Outbound has ${outboundMedia.length} media: ${outboundMedia.map(m => m.filename).join(', ')}`);
        }

        bus.publishOutbound(outbound);
      }

      // ── Step 10a: Persist purchase journey stage if marker was emitted ──
      const newStage = (merged as any)._purchaseStage as PurchaseStage | undefined;
      if (newStage) {
        // Fire-and-forget — handler is best-effort and never throws.
        persistPurchaseStage({
          sessionKey,
          customerId: customerId || null,
          agentSlug,
          newStage,
        }).catch((err) => {
          console.error(`${logPrefix} purchase-stage persist unexpected throw: ${err.message}`);
        });
      }

      // ── Step 10b: Fire escalation handler if marker was emitted ──
      // The router sets `_escalation` on the merged config side-channel when
      // the agent emits a [[ESCALATE: ...]] marker. We process it AFTER the
      // calming reply has been published so the customer sees the empathy
      // message first, then the bot goes silent.
      const escalation = (merged as any)._escalation as
        | { reason: string; priority: 'low' | 'normal' | 'high' | 'urgent'; summary: string }
        | undefined;
      if (escalation) {
        const escalationCtx: EscalationContext = {
          agentSlug,
          sessionKey,
          channelName: merged.channel,
          chatId: merged.chatId,
          customerId: customerId || null,
          customerName: ((merged as any)._customerContext?.name as string) || null,
          reason: escalation.reason,
          priority: escalation.priority,
          summary: escalation.summary,
          triggerMessage: merged.content,
          agentReply: replyText,
        };
        // Fire-and-forget — escalation handler does its own error handling and
        // never throws, so we don't await its full chain blocking the consumer.
        handleEscalation(escalationCtx).catch((err) => {
          console.error(`${logPrefix} Escalation handler unexpected throw: ${err.message}`);
        });
      }

      // ── Step 11: Update pending message status (whole coalesced batch) ──
      await markBatch(agentSlug, 'handled');

      // ── KG: Fire-and-forget entity extraction from chat ──
      extractEntitiesAsync(merged.content, replyText, agentSlug);

      console.log(`${logPrefix} ✅ Reply sent via agent ${agentSlug} (${replyText.length} chars) | "${replyText.substring(0, 60)}"`);
    } finally {
      // per-session lock + timer cleanup happen in runSessionBatch (the caller).
    }
  } else {
    // No agent → leave for a human in the inbox (skipped, not handled by a bot).
    // GIỮ lý do CỤ THỂ từ resolveAgent (`_skipReason`) — markBatch ở Step 7 đã ghi nó,
    // nhưng lần ghi này chạy SAU nên sẽ ĐÈ. Không giữ = mọi ca bị gộp thành
    // 'no_agent_assigned' → mất dấu vết vì-sao (comment_no_realtime / ignored_chat /
    // override_ignore / agent_disabled) → probe dò theo lý do trả 0 = âm tính giả.
    const noAgentReason = (merged as any)._skipReason
      || (suppressAutoReply ? 'group_no_mention' : 'no_agent_assigned');
    console.log(`${logPrefix} ✅ Saved to inbox (${suppressAutoReply ? 'group, no @mention' : noAgentReason})`);
    await markBatch('human', 'skipped', noAgentReason);
  }

  // Schedule AI summary after idle (5 min) - run for both AI-handled and Human-handled messages.
  // Skip for groups: a group session has no single customer to summarize; attributing
  // the summary to whichever member sent last would be misleading.
  if (customerId && merged.peerKind !== 'group') {
    aiSummarizer.scheduleSummary(sessionKey, customerId);
  }
}

/**
 * Check if a group message contains an @mention for the bot.
 */
function hasMention(content: string, config: ChannelInstanceRow): boolean {
  const mentionPatterns = [
    '@bot', '@assistant', '@ai', '@gem', '@gemral',
    // Channel display name as mention target
    config.display_name ? `@${config.display_name.toLowerCase()}` : null,
  ].filter(Boolean) as string[];

  const lowerContent = content.toLowerCase();
  return mentionPatterns.some(pattern => lowerContent.includes(pattern));
}

/**
 * Get channel config with caching.
 */
async function getChannelConfig(channelName: string): Promise<ChannelInstanceRow | null> {
  const cached = configCache.get(channelName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  const { data, error } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('name', channelName)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data as ChannelInstanceRow;
  configCache.set(channelName, {
    config,
    expiresAt: Date.now() + CONFIG_CACHE_TTL,
  });

  return config;
}

/**
 * Clear config cache (e.g., after admin changes channel settings).
 */
export function clearConfigCache(channelName?: string): void {
  if (channelName) {
    configCache.delete(channelName);
  } else {
    configCache.clear();
  }
}

/**
 * Stop the consumer gracefully.
 */
export function stopConsumer(): void {
  bus.removeAllListeners('inbound');
  bus.removeAllListeners('inbound:realtime');
  debouncer.flushAll();
  console.log('[Consumer] Stopped');
}
