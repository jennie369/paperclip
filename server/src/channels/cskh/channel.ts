// paperclip/server/src/channels/cskh/channel.ts
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { mirrorReplyToCustomer, mirrorReplyToVisitor } from './mirror.js';
import { pushSupportReply } from './push.js';
import type { Channel, ChannelType, OutboundMessage } from '../types.js';

export const CSKH_CHANNEL_NAME = 'cskh-internal';

/**
 * Self-hosted internal channel. Both ends are on our platform, so there is no
 * external API: outbound = log to channel_sent_messages (Paperclip inbox view)
 * + mirror to cskh_messages (customer view) + push the customer.
 * Inbound is handled entirely by the edge function `cskh-inbound`
 * (insert channel_pending_messages → bus realtime → consumer), so this adapter
 * has no listener.
 */
export class CskhChannel implements Channel {
  name = CSKH_CHANNEL_NAME;
  type: ChannelType = 'cskh';
  private running = false;
  private busListenerInstalled = false;

  async start(): Promise<void> {
    this.installBusOutboundHandler();
    this.running = true;
    console.log('[cskh] Channel started (internal, no external listener)');
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  isAllowed(_senderId: string): boolean {
    return true;
  }

  private installBusOutboundHandler(): void {
    if (this.busListenerInstalled) return;
    this.busListenerInstalled = true;
    bus.on('outbound', async (msg: OutboundMessage) => {
      // Handle every internal CSKH channel (cskh-internal, cskh-shopify, ...).
      if (!msg.channel?.startsWith('cskh-')) return;
      try {
        await this.send(msg);
      } catch (err: any) {
        console.error('[cskh] outbound exception:', err?.message || err);
      }
    });
  }

  /** OutboundMessage.chatId === customer user_id (internal) or visitor_id (shopify). */
  async send(msg: OutboundMessage): Promise<void> {
    const threadId = msg.chatId;
    const agentSlug = (msg.metadata?.agentSlug as string) || null;
    const sentBy = (msg.metadata?.sentBy as string) || (agentSlug ? `agent:${agentSlug}` : 'agent');
    // Log to channel_sent_messages (Paperclip inbox + Shopify widget poll read this).
    await this.logSentMessage(msg.channel, threadId, msg.content, sentBy);
    if (msg.channel !== 'cskh-internal') {
      // S1: visitor ẩn danh (cskh-shopify / cskh-web): mirror by visitor_id; no push (no token).
      await mirrorReplyToVisitor(threadId, 'assistant', msg.content, agentSlug, msg.channel);
      // P1: email-notif nếu khách offline (edge tự gate offline + debounce; fire-and-forget).
      const preview = msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content;
      supabase.functions.invoke('cskh-notify-offline', {
        body: { visitor_id: threadId, channel: msg.channel, preview },
      }).catch((e: any) => console.error('[cskh] notify-offline failed:', e?.message || e));
    } else {
      // Authenticated Gemral customer.
      await mirrorReplyToCustomer(threadId, 'assistant', msg.content, agentSlug);
      await pushSupportReply(threadId, msg.content);
    }
  }

  private async logSentMessage(channelName: string, threadId: string, body: string, sentBy: string): Promise<void> {
    const { error } = await supabase.from('channel_sent_messages').insert({
      channel_name: channelName,
      thread_id: threadId,
      thread_type: 'dm',
      to_uid: threadId,
      body,
      content_type: 'text',
      status: 'sent',
      sent_by: sentBy,
    });
    if (error) console.error('[cskh] logSentMessage failed:', error.message);
  }
}

export const cskhChannel = new CskhChannel();
