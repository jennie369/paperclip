// paperclip/server/src/channels/cskh/channel.ts
import { readFileSync, rmSync } from 'fs';
import { join as pathJoin, basename as pathBasename } from 'path';
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { mirrorReplyToCustomer, mirrorReplyToVisitor } from './mirror.js';
import { pushSupportReply } from './push.js';
import { goiEdgeGemral } from './edge-call.js';
import { isImageMedia, resolveMediaToLocalPath } from '../media-util.js';
import { deliverReplyOnce } from '../deliver-once.js';
import type { Channel, ChannelType, OutboundMessage, MediaFile } from '../types.js';

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
    // channel_sent_messages.sent_by = BARE agent slug (SSOT 2026-08-03). CSKH trước
    // ghi `agent:<slug>` = split-brain: 6 kênh khác (zalo/fb/fb-web/youtube/manager)
    // + cột `agent_slug` (pending/follow_up) + consumer agent-config-routes `.eq('sent_by', slug)`
    // đều dùng slug TRẦN → cskh prefix làm view hoạt-động-agent bỏ sót tin cskh. Prefix `agent:`
    // chỉ dành cho KG entity-id (khái niệm khác), KHÔNG cho sent_by.
    const sentBy = (msg.metadata?.sentBy as string) || agentSlug || 'agent';
    const isVisitor = msg.channel !== 'cskh-internal';

    // The customer-visible action for CSKH is the cskh_messages mirror (the app
    // reads that table), NOT channel_sent_messages. So the mirror is what deliverFn
    // must do + assert. push (notify) is best-effort: if push fails but the mirror
    // succeeded the customer still sees the reply in-app → stay 'sent'.
    const doMirrorAndPush = async (): Promise<{ platformMessageId: string | null }> => {
      if (isVisitor) {
        const r = await mirrorReplyToVisitor(threadId, 'assistant', msg.content, agentSlug, msg.channel);
        if (r.error) throw new Error(`cskh mirror failed: ${r.error}`);  // F1: don't mark 'sent' on lost reply
        const preview = msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content;
        // Qua edge-call: client dùng chung cầm service_role → cổng 'secret' từ chối 401 (28/07).
        void goiEdgeGemral('cskh-notify-offline', { visitor_id: threadId, channel: msg.channel, preview });
      } else {
        const r = await mirrorReplyToCustomer(threadId, 'assistant', msg.content, agentSlug);
        if (r.error) throw new Error(`cskh mirror failed: ${r.error}`);  // F1
        try { await pushSupportReply(threadId, msg.content); } catch (e: any) { console.error('[cskh] push failed (best-effort):', e?.message || e); }
      }
      return { platformMessageId: null };
    };

    // Step 1: gửi TEXT trước (khách thấy lời tư vấn trước, ảnh sau — như Zalo). Chỉ khi có nội dung.
    if (msg.content && msg.content.trim()) {
      if (msg.dedupeKey) {
        // Reply Gateway: claim owns the channel_sent_messages row (replaces
        // logSentMessage) + gates against double-reply; deliverFn = the mirror.
        const outcome = await deliverReplyOnce(
          msg.dedupeKey,
          { channel_name: msg.channel, thread_id: threadId, thread_type: 'dm', to_uid: threadId,
            body: msg.content, content_type: 'text', sent_by: sentBy },
          doMirrorAndPush,
        );
        if (outcome !== 'sent') return;  // failed OR duplicate → skip media too
      } else {
        // Manual/human path (no idempotency key): unchanged (log + mirror + push).
        await this.logSentMessage(msg.channel, threadId, msg.content, sentBy);
        await doMirrorAndPush();
      }
    }

    // Step 2: gửi MEDIA (agy [[SEND_MEDIA]] → ảnh crystal...). Khách CSKH đọc cskh_messages.attachment_url
    // = URL công khai → file media-library LOCAL phải upload lên bucket cskh-attachments trước
    // (khác Zalo gửi qua protocol). Additive: không media → return, reply text như cũ.
    if (!msg.media || msg.media.length === 0) return;

    // Codex H2: a MEDIA-ONLY reply (no text) skipped the claim above, so a duplicate
    // emit could send the image twice. Claim once here to gate the media dispatch.
    // (When there was text, the claim above already gated the whole reply.)
    const hadText = !!(msg.content && msg.content.trim());
    if (!hadText && msg.dedupeKey) {
      const outcome = await deliverReplyOnce(
        msg.dedupeKey,
        { channel_name: msg.channel, thread_id: threadId, thread_type: 'dm', to_uid: threadId,
          body: '[media]', content_type: 'image', sent_by: sentBy },
        async () => ({ platformMessageId: null }), // media sent in the loop below
      );
      if (outcome !== 'sent') return; // duplicate media-only → skip
    }

    for (const item of msg.media) {
      try {
        await this.sendMediaToCustomer(threadId, msg.channel, agentSlug, sentBy, item, isVisitor);
      } catch (err: any) {
        console.error('[cskh] send media failed:', err?.message || err);
      }
    }
  }

  /** Gửi 1 media item cho khách CSKH: upload local→bucket public → log inbox + mirror cskh_messages + báo. */
  private async sendMediaToCustomer(
    threadId: string, channel: string, agentSlug: string | null, sentBy: string,
    item: MediaFile, isVisitor: boolean,
  ): Promise<void> {
    const isImg = isImageMedia(item);
    // Resolve local path (path media-library / download url) → upload bucket → public URL.
    const { localPath, cleanup } = await resolveMediaToLocalPath(item);
    let publicUrl: string | null = null;
    if (localPath) {
      publicUrl = await this.uploadToCskhBucket(localPath, threadId, item);
      if (cleanup) { try { rmSync(pathJoin(localPath, '..'), { recursive: true, force: true }); } catch { /* best effort */ } }
    } else if (item.url && /^https?:/i.test(item.url)) {
      // Không resolve được local nhưng có URL công khai → dùng thẳng (khách app load được).
      publicUrl = item.url;
    }
    if (!publicUrl) {
      console.warn(`[cskh] media skipped (no servable url): ${item.filename || '(unknown)'}`);
      return;
    }
    const attachmentType = isImg ? 'image' : 'file';
    const attachFileName = decodeURIComponent((publicUrl.split('?')[0].split('/').pop()) || 'tệp đính kèm');

    // Log inbox Paperclip (ảnh→content_type='image'+media[url]; tệp→'file'+body-JSON → FileMsg).
    const sentBody = isImg ? '[Hình ảnh]' : JSON.stringify({ fileName: attachFileName, href: publicUrl });
    await supabase.from('channel_sent_messages').insert({
      channel_name: channel, thread_id: threadId, thread_type: 'dm', to_uid: threadId,
      body: sentBody, content_type: attachmentType,
      media: isImg ? [publicUrl] : null,
      status: 'sent', sent_by: sentBy,
    });

    // Mirror cho khách (role='assistant' = BOT, KHÁC operator 'human'). KHÔNG leak item.caption
    // (LLM meta = description trong media-library, không phải customer-facing; incident Zalo 2026-05-01).
    const preview = isImg ? '📷 Hình ảnh' : '📎 Tệp đính kèm';
    if (isVisitor) {
      await mirrorReplyToVisitor(threadId, 'assistant', '', agentSlug, channel, publicUrl, attachmentType);
      // Qua edge-call (28/07): khoá đúng + KHÔNG nuốt lỗi im lặng như `.catch(()=>{})` cũ.
      void goiEdgeGemral('cskh-notify-offline', { visitor_id: threadId, channel, preview });
    } else {
      await mirrorReplyToCustomer(threadId, 'assistant', '', agentSlug, publicUrl, attachmentType);
      await pushSupportReply(threadId, preview);
    }
  }

  /** Đọc file local → upload lên bucket cskh-attachments (service_role, public) → public URL. */
  private async uploadToCskhBucket(localPath: string, threadId: string, item: MediaFile): Promise<string | null> {
    try {
      const buf = readFileSync(localPath);
      if (buf.byteLength > 15 * 1024 * 1024) { console.warn('[cskh] media too large (>15MB), skip'); return null; }
      const base = pathBasename(localPath);
      const ext = (base.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      const isImg = isImageMedia(item);
      const mime = item.mimeType || (isImg ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/octet-stream');
      const path = isImg
        ? `cskh/${threadId}/agent/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
        : `cskh/${threadId}/agent/${Date.now()}-${base.replace(/[^\w.\-]+/g, '_').slice(0, 60)}`;
      const { error } = await supabase.storage.from('cskh-attachments').upload(path, buf, { contentType: mime, upsert: false });
      if (error) { console.error('[cskh] bucket upload failed:', error.message); return null; }
      const { data } = supabase.storage.from('cskh-attachments').getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err: any) {
      console.error('[cskh] uploadToCskhBucket threw:', err?.message || err);
      return null;
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
