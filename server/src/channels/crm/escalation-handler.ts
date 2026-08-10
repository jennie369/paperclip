// Escalation handler — invoked by consumer.ts when an agent emits an
// [[ESCALATE: ...]] marker. Performs three side-effects atomically:
//
//   1. Sets channel_sessions.metadata.bot_paused=true (no more auto-replies
//      in this session until a human un-pauses)
//   2. Inserts a row into crm_tickets with priority=urgent for the human queue
//   3. Sends a Telegram ping to Jennie (chat_id 6486938519) so she knows
//      immediately
//
// All steps are best-effort — if one fails, the others still run. We never
// throw out of this module to avoid breaking the inbound message handler.

import { supabase } from '../zalo-personal/supabase.js';

export interface EscalationContext {
  agentSlug: string;
  sessionKey: string;
  channelName: string;
  chatId: string;
  customerId: string | null;
  customerName: string | null;
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary: string;
  triggerMessage: string;          // The customer message that triggered escalation
  agentReply: string;              // The calming reply the bot just sent
  /**
   * Mode flag — controls which side-effects fire:
   *   'live'     — full flow: pause bot + insert ticket + Telegram ping
   *   'training' — ONLY insert ticket (tagged with training_session_id),
   *                skip pause and skip Telegram (avoid spamming Jennie when
   *                running training scenarios that intentionally trigger escalation)
   * Defaults to 'live'.
   */
  mode?: 'live' | 'training';
  /** Training session id, set when mode='training' for ticket linkage */
  trainingSessionId?: string;
  /** Turn number in training (for ticket metadata) */
  trainingTurnNo?: number;
}

export interface EscalationResult {
  ticketId: string | null;
  ticketDisplayId: string | null;
}

const TELEGRAM_BOARD_CHAT_ID = '6486938519'; // Jennie

/**
 * Main entry — fire-and-forget. Does NOT throw.
 *
 * Returns { ticketId, ticketDisplayId } so callers (e.g. training orchestrator)
 * can link back to the created ticket from their own UI.
 */
export async function handleEscalation(ctx: EscalationContext): Promise<EscalationResult> {
  const mode = ctx.mode ?? 'live';
  const isTraining = mode === 'training';
  const logPrefix = `[Escalation/${ctx.agentSlug}${isTraining ? '/training' : ''}]`;
  console.warn(
    `${logPrefix} 🚨 ESCALATION FIRED — `
      + `reason=${ctx.reason} priority=${ctx.priority} `
      + `session=${ctx.sessionKey.substring(0, 30)}`,
  );

  // ── Step 1: Pause the bot for this session ────────────────────────────────
  // SKIPPED in training mode — training scenarios intentionally trigger
  // escalations as part of testing, we don't want to lock the session.
  if (!isTraining) {
    try {
      // ATOMIC jsonb-merge (RPC) — KHÔNG read-merge-write cả object (clobber các key khác /
      // bị writer khác clobber ngược; plan 2026-08-10). Gộp bot_paused + escalation fields 1 patch.
      await supabase.rpc('channel_session_merge_meta', {
        p_session_key: ctx.sessionKey,
        p_patch: {
          bot_paused: true,
          bot_paused_at: new Date().toISOString(),
          bot_paused_reason: ctx.reason,
          escalation_priority: ctx.priority,
        },
      });

      console.log(`${logPrefix} ✓ Session paused (metadata.bot_paused=true)`);
    } catch (err: any) {
      console.error(`${logPrefix} ✗ Failed to pause session: ${err.message}`);
    }
  }

  // ── Step 2: Insert urgent ticket ──────────────────────────────────────────
  // ALWAYS runs (live + training). In training mode the ticket is tagged with
  // metadata.training_session_id so the Phòng Training UI can link to it.
  let ticketId: string | null = null;
  let ticketDisplayId: string | null = null;

  // Per-session dedup at DB level (defense in depth — router also dedupes via
  // history scan, but that can miss if history isn't loaded). One ticket per
  // sessionKey, regardless of how many escalation markers the agent emits.
  try {
    const { data: existing } = await supabase
      .from('crm_tickets')
      .select('id, ticket_number')
      .eq('source_session_key', ctx.sessionKey)
      .in('status', ['open', 'pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      console.warn(
        `${logPrefix} ⊘ Dedup — existing open ticket ${(existing as any).ticket_number ?? existing.id} for session ${ctx.sessionKey.substring(0, 30)} — skipping insert`,
      );
      return {
        ticketId: existing.id,
        ticketDisplayId: (existing as { ticket_number?: string }).ticket_number ?? null,
      };
    }
  } catch (err: any) {
    // Soft-fail dedup check — fall through to insert path. Worst case = duplicate.
    console.warn(`${logPrefix} dedup check failed (continuing): ${err.message}`);
  }

  try {
    // Schema reference (verified 2026-04-08 against pgfkbcnzqozzkohwbgbk):
    //   crm_tickets columns: id, customer_id, ticket_number, title, description,
    //   category, priority, status, created_by_agent, assigned_to_agent,
    //   source_channel, source_session_key, source_message_id, tags, metadata,
    //   timeline, sla_deadline, ...
    // NOTE: column is `title` (not `subject`) and `ticket_number` (not `display_id`).
    const { data: ticket, error: tErr } = await supabase
      .from('crm_tickets')
      .insert({
        category: mapReasonToCategory(ctx.reason),
        priority: ctx.priority,
        status: 'open',
        title: isTraining
          ? `[TRAINING/${ctx.reason}] turn ${ctx.trainingTurnNo ?? '?'}`
          : `[ESCALATE/${ctx.reason}] ${ctx.customerName || ctx.chatId}`,
        description: [
          `**Reason**: ${ctx.reason}`,
          `**Priority**: ${ctx.priority}`,
          `**Channel**: ${ctx.channelName}`,
          `**Session**: ${ctx.sessionKey}`,
          isTraining ? `**Training Session**: ${ctx.trainingSessionId ?? '(unknown)'}` : '',
          isTraining ? `**Training Turn**: ${ctx.trainingTurnNo ?? '?'}` : '',
          `**Customer**: ${ctx.customerName || '(unknown)'} (id: ${ctx.customerId || 'n/a'})`,
          '',
          '**Summary from agent:**',
          ctx.summary,
          '',
          '**Customer message that triggered escalation:**',
          ctx.triggerMessage.substring(0, 1000),
          '',
          '**Bot calming reply (already sent):**',
          ctx.agentReply.substring(0, 1000),
        ].filter(Boolean).join('\n'),
        customer_id: ctx.customerId,
        created_by_agent: ctx.agentSlug,
        source_channel: isTraining ? 'training_room' : ctx.channelName,
        source_session_key: ctx.sessionKey,
        tags: isTraining ? ['training', `escalation:${ctx.reason}`] : [`escalation:${ctx.reason}`],
        metadata: {
          escalation_reason: ctx.reason,
          escalation_agent: ctx.agentSlug,
          chat_id: ctx.chatId,
          ...(isTraining && {
            training_mode: true,
            training_session_id: ctx.trainingSessionId,
            training_turn_no: ctx.trainingTurnNo,
          }),
        },
      })
      .select('id, ticket_number')
      .single();

    if (tErr) {
      console.error(`${logPrefix} ✗ Ticket insert failed: ${tErr.message}`);
    } else {
      ticketId = ticket?.id || null;
      ticketDisplayId = (ticket as { ticket_number?: string })?.ticket_number || null;
      console.log(`${logPrefix} ✓ Ticket created: ${ticketDisplayId ?? ticketId}`);
    }
  } catch (err: any) {
    console.error(`${logPrefix} ✗ Ticket insert exception: ${err.message}`);
  }

  // ── Step 3: Telegram ping to Jennie ───────────────────────────────────────
  // ALWAYS runs (training and live) — Jennie wants to know about every new
  // ticket. Training tickets are prefixed with [TRAINING] in the message so
  // she can distinguish at a glance.
  try {
    await pingTelegramBoard({
      reason: ctx.reason,
      priority: ctx.priority,
      summary: ctx.summary,
      customerName: ctx.customerName,
      channelName: ctx.channelName,
      chatId: ctx.chatId,
      ticketId,
      ticketDisplayId,
      triggerMessage: ctx.triggerMessage,
      isTraining,
    });
    console.log(`${logPrefix} ✓ Telegram ping sent`);
  } catch (err: any) {
    console.error(`${logPrefix} ✗ Telegram ping failed: ${err.message}`);
  }

  return { ticketId, ticketDisplayId };
}

/**
 * Check if a session is currently paused due to escalation.
 * Called at the START of consumer.ts message handler so paused sessions
 * skip auto-reply entirely.
 */
export async function isSessionPaused(sessionKey: string): Promise<boolean> {
  if (!sessionKey) return false;
  try {
    const { data } = await supabase
      .from('channel_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .single();
    const meta = (data?.metadata as Record<string, unknown>) || {};
    return Boolean(meta.bot_paused);
  } catch {
    return false; // fail open — if DB read fails, allow the reply
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function mapReasonToCategory(reason: string): string {
  // Allowed values per crm_tickets_category_check (verified 2026-04-08):
  //   general, product_inquiry, order_issue, payment_issue, shipping_issue,
  //   refund_request, technical_support, complaint, feature_request,
  //   bug_report, escalation
  // The enum is intentionally generic — finer-grained reason is preserved in
  // ctx.reason and stored in metadata.escalation_reason + tags.
  switch (reason) {
    case 'refund_dispute':
      return 'refund_request';
    case 'customer_hostile':
    case 'fraud_allegation':
    case 'prolonged_frustration':
      return 'complaint';
    case 'legal_threat':
    case 'compliance_request':
    case 'public_complaint_threat':
    case 'public_complaint_active':
    case 'mental_health_concern':
    case 'identity_verification_failed':
    case 'ceo_request':
      return 'escalation';
    default:
      return 'escalation';
  }
}

interface TelegramPingArgs {
  reason: string;
  priority: string;
  summary: string;
  customerName: string | null;
  channelName: string;
  chatId: string;
  ticketId: string | null;
  ticketDisplayId?: string | null;
  triggerMessage: string;
  isTraining?: boolean;
}

async function pingTelegramBoard(args: TelegramPingArgs): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[Escalation/telegram] TELEGRAM_BOT_TOKEN not set, skipping ping');
    return;
  }

  const emoji = args.priority === 'urgent' ? '🚨🚨🚨'
    : args.priority === 'high' ? '🚨'
    : '⚠️';
  const trainingTag = args.isTraining ? ' [TRAINING]' : '';

  const text = [
    `${emoji} *ESCALATION${trainingTag} — ${args.reason}*`,
    `*Priority*: ${args.priority}`,
    `*Channel*: ${args.channelName}`,
    `*Customer*: ${args.customerName || args.chatId}`,
    '',
    `*Summary*: ${args.summary}`,
    '',
    `*Customer said*:`,
    `> ${args.triggerMessage.substring(0, 300).replace(/\n/g, '\n> ')}`,
    '',
    args.ticketDisplayId
      ? `*Ticket*: ${args.ticketDisplayId}`
      : args.ticketId ? `*Ticket*: ${args.ticketId}` : '_(ticket creation failed)_',
    '',
    args.isTraining
      ? '_Training run — bot KHÔNG bị pause, ticket tagged với training_session_id._'
      : 'Bot đã pause cho session này. Cần xử lý tay.',
  ].join('\n');

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_BOARD_CHAT_ID,
    text,
    parse_mode: 'Markdown',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram API ${res.status}: ${errBody.substring(0, 200)}`);
  }
}
