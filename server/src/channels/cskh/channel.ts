// paperclip/server/src/channels/cskh/channel.ts
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { mirrorReplyToCustomer } from './mirror.js';
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
      if (msg.channel !== this.name) return;
      try {
        await this.send(msg);
      } catch (err: any) {
        console.error('[cskh] outbound exception:', err?.message || err);
      }
    });
  }

  /** OutboundMessage.chatId === customer user_id. */
  async send(msg: OutboundMessage): Promise<void> {
    const userId = msg.chatId;
    const agentSlug = (msg.metadata?.agentSlug as string) || null;
    const sentBy = (msg.metadata?.sentBy as string) || (agentSlug ? `agent:${agentSlug}` : 'agent');
    // Treat agent-bus replies as 'assistant'. Manual replies go through the
    // sub-handler (routes.ts) with role 'human'; they are NOT published to the bus.
    await this.logSentMessage(userId, msg.content, sentBy);
    await mirrorReplyToCustomer(userId, 'assistant', msg.content, agentSlug);
    await pushSupportReply(userId, msg.content);
  }

  private async logSentMessage(threadId: string, body: string, sentBy: string): Promise<void> {
    const { error } = await supabase.from('channel_sent_messages').insert({
      channel_name: this.name,
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
