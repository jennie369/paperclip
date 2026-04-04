// Channel-Agent Auto-Reply — Inbound Message Consumer
// Full pipeline: dedupe → policy → quota → debounce → mention gate → agent → reply

import { bus } from './bus.js';
import { deduplicator } from './dedupe.js';
import { debouncer } from './debounce.js';
import * as policy from './policy.js';
import * as quota from './quota.js';
import * as session from './session.js';
import * as router from './router.js';
import { supabase } from './zalo-personal/supabase.js';
import { CustomerResolver } from './crm/customer-resolver.js';
import { ContextBuilder } from './crm/context-builder.js';
import { AISummarizer } from './crm/ai-summarizer.js';
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

// Per-thread cooldown: prevent agent from replying too fast to same thread
const threadCooldown = new Map<string, number>();
const THREAD_COOLDOWN_MS = 8_000; // 8 seconds between agent replies to same thread

/**
 * Start the consumer: listen for inbound messages on the bus and process them.
 */
export function startConsumer(): void {
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

  // On startup: mark old stuck pending messages as skipped (DON'T reprocess — would re-send to customers)
  setTimeout(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: stuck } = await supabase
        .from('channel_pending_messages')
        .select('id')
        .eq('status', 'pending')
        .is('handled_by', null)
        .lt('created_at', fiveMinAgo)
        .limit(100);

      if (stuck && stuck.length > 0) {
        console.log(`[Consumer] Startup cleanup: marking ${stuck.length} old stuck messages as skipped`);
        await supabase
          .from('channel_pending_messages')
          .update({ status: 'handled', handled_by: 'consumer', skip_reason: 'stale_on_restart' })
          .in('id', stuck.map(s => s.id));
      }
    } catch (err: any) {
      console.error('[Consumer] Startup cleanup failed:', err.message);
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
  const peerLabel = msg.peerKind === 'group' ? 'GROUP' : 'DM';
  const logPrefix = `[Consumer:${msg.channel}] ${peerLabel} "${msg.senderName}"→${msg.chatId}`;

  // ── Step 1: Deduplication ──
  const dedupeKey = msg.dedupeKey
    || `${msg.channel}:${msg.chatId}:${msg.senderId}:${msg.timestamp.getTime()}`;

  if (deduplicator.isDuplicate(dedupeKey)) {
    console.log(`${logPrefix} Duplicate message skipped: ${dedupeKey}`);
    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', 'duplicate');
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

  // ── Step 5: Debounce (merge rapid messages) ──
  const merged = await debouncer.add(msg);
  if (!merged) {
    // Message absorbed into a pending batch — will be processed when flushed
    console.log(`${logPrefix} Message buffered for debounce`);
    return;
  }

  // ── Step 5b: Per-thread cooldown ──
  const threadKey = `${merged.channel}:${merged.chatId}`;
  const lastReplyAt = threadCooldown.get(threadKey);
  if (lastReplyAt && Date.now() - lastReplyAt < THREAD_COOLDOWN_MS) {
    console.log(`${logPrefix} Thread cooldown active (${Date.now() - lastReplyAt}ms since last reply), absorbing`);
    // Don't skip — just log. The debouncer should have merged these already.
    // But as extra safety, if we still get here, delay processing.
  }

  // ── Step 6: Group @mention gating ──
  if (merged.peerKind === 'group' && channelConfig.require_mention) {
    if (!hasMention(merged.content, channelConfig)) {
      console.log(`${logPrefix} Group message without @mention, skipping`);

      // Still save to group history for context
      await session.saveGroupMessage(
        merged.channel,
        merged.chatId,
        merged.senderId,
        merged.senderName,
        merged.content,
        merged.timestamp
      );

      if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', 'group_no_mention');
      return;
    }
  }

  // For group messages, save to group history regardless
  if (merged.peerKind === 'group') {
    await session.saveGroupMessage(
      merged.channel,
      merged.chatId,
      merged.senderId,
      merged.senderName,
      merged.content,
      merged.timestamp
    );
  }

  // ── Step 6b: CRM — Resolve customer + cancel pending summary ──
  // BUG 3 FIX: Check save_contacts_to_crm before creating CRM records
  const saveContact = channelConfig.save_contacts_to_crm !== false;
  let customerId: string | undefined;
  try {
    const crmResult = await customerResolver.resolve(
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

    // Auto-save to inbox_contacts for permanent contact persistence
    if (saveContact && merged.senderId && merged.peerKind !== 'group') {
      supabase.from('inbox_contacts').select('id').eq('zalo_id', merged.senderId).single().then(async ({ data }) => {
        if (data?.id) {
          await supabase.from('inbox_contacts').update({
            name: merged.senderName || merged.senderId,
            channel: merged.channel,
            last_message_at: new Date().toISOString(),
          }).eq('id', data.id);
        } else {
          await supabase.from('inbox_contacts').insert({
            name: merged.senderName || merged.senderId,
            zalo_id: merged.senderId,
            channel: merged.channel,
            last_message_at: new Date().toISOString(),
          });
        }
      });
    }
  } catch (err: any) {
    console.warn(`${logPrefix} CRM resolve failed (non-blocking): ${err.message}`);
  }

  // ── Step 7: Resolve agent ──
  const agentSlug = await router.resolveAgent(merged);

  if (!agentSlug) {
    const skipReason = (merged as any)._skipReason || 'no_agent_assigned';
    console.log(`${logPrefix} Skipped AI routing: ${skipReason} - Saving to Inbox only`);
    if (pendingId) await bus.markHandled(pendingId, 'consumer', 'skipped', skipReason);
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

  // Append user message to session history
  await session.appendMessage(
    sessionKey,
    'user',
    merged.content,
    channelConfig.history_limit,
    merged.senderName
  );

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
  // Link CRM customer to session (required for order/ticket creation in chat)
  if (customerId) {
    sessionUpdate.customer_id = customerId;
  }
  try { await supabase.from('channel_sessions').update(sessionUpdate).eq('session_key', sessionKey); } catch {}

  // Get history for agent context
  const historyLimit = channelConfig.history_limit || 50;
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
      customerContext = await contextBuilder.build(customerId);
    } catch (err: any) {
      console.warn(`${logPrefix} CRM context build failed (non-blocking): ${err.message}`);
    }

    // Link customer to session + pending message
    try { await supabase.from('channel_sessions').update({ customer_id: customerId }).eq('session_key', sessionKey); } catch {}

    if (pendingId) {
      try { await supabase.from('channel_pending_messages').update({ customer_id: customerId }).eq('id', pendingId); } catch {}
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
        .select('display_name, status, lead_score, lead_temperature, total_orders, total_revenue')
        .eq('id', customerId)
        .single();
      if (crmCustomer) {
        (merged as any)._customerContext = {
          name: crmCustomer.display_name,
          stage: crmCustomer.status || 'new',
          total_orders: crmCustomer.total_orders,
          channel_name: merged.channel,
        };
      }
    } catch { /* non-blocking */ }
  }

  // ── Step 9: Route to agent (Claude CLI) ──
  if (agentSlug) {
    console.log(`${logPrefix} → Routing to agent: ${agentSlug}${customerId ? ` (CRM: ${customerId.substring(0, 8)})` : ''} | msg: "${merged.content.substring(0, 60)}"`);

    // Mark as processing
    if (pendingId) {
      await supabase.from('channel_pending_messages').update({
        status: 'processing',
        agent_slug: agentSlug,
        session_key: sessionKey,
      }).eq('id', pendingId);
    }

    const replyText = await router.runAgent(
      agentSlug,
      sessionKey,
      enrichedMessage,
      merged,
      history
    );

    // Append assistant reply to session history
    await session.appendMessage(
      sessionKey,
      'assistant',
      replyText,
      channelConfig.history_limit
    );

    // ── Step 10: Publish outbound reply ──
    const outbound: OutboundMessage = {
      channel: merged.channel,
      chatId: merged.chatId,
      content: replyText,
      replyToMessageId: merged.id,
      metadata: {
        agentSlug,
        sessionKey,
        processingTime: Date.now() - merged.timestamp.getTime(),
      },
    };

    bus.publishOutbound(outbound);

    // ── Step 11: Update pending message status + cooldown ──
    if (pendingId) {
      await bus.markHandled(pendingId, agentSlug, 'handled');
    }

    // Set thread cooldown to prevent rapid-fire replies
    threadCooldown.set(threadKey, Date.now());

    console.log(`${logPrefix} ✅ Reply sent via agent ${agentSlug} (${replyText.length} chars) | "${replyText.substring(0, 60)}"`);
  } else {
    // If no agent, just leave it as 'pending' for a human to read from the inbox
    console.log(`${logPrefix} ✅ Saved to inbox (no AI agent assigned)`);
    // Note: Do not mark pendingId as 'handled' so that humans can see it's waiting for them if needed,
    // or you could mark it as 'skipped' so it doesn't get retried by the consumer!
    if (pendingId) {
      await bus.markHandled(pendingId, 'human', 'skipped', 'no_agent_assigned');
    }
  }

  // Schedule AI summary after idle (5 min) - run for both AI-handled and Human-handled messages
  if (customerId) {
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
