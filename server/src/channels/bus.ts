// Channel-Agent Auto-Reply — Message Bus
// EventEmitter + Supabase persistence for inbound/outbound message routing

import { EventEmitter } from 'node:events';
import { supabase } from './zalo-personal/supabase.js';
import type { InboundMessage, OutboundMessage, PeerKind } from './types.js';

class MessageBus extends EventEmitter {
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Publish an inbound message: persist to channel_pending_messages, then emit locally.
   */
  async publishInbound(msg: InboundMessage): Promise<string | null> {
    const dedupeKey = msg.dedupeKey
      || `${msg.channel}:${msg.chatId}:${msg.senderId}:${msg.timestamp.getTime()}`;

    const sessionKey = `${msg.channel}:${msg.chatId}:${msg.senderId}`;

    // Guard: skip DB persist if channel_instances row doesn't exist.
    // Avoids FK violation flood that exhausts the PgBouncer connection pool.
    const { data: channelRow } = await supabase
      .from('channel_instances')
      .select('name')
      .eq('name', msg.channel)
      .maybeSingle();

    if (!channelRow) {
      // Channel not registered — emit locally for in-memory routing but don't persist.
      this.emit('inbound', msg);
      return null;
    }

    const { data, error } = await supabase.from('channel_pending_messages').insert({
      channel_name: msg.channel,
      thread_id: msg.chatId,
      thread_type: msg.peerKind === 'group' ? 'group' : msg.peerKind === 'comment' ? 'comment' : 'dm',
      from_uid: msg.senderId,
      sender_name: msg.senderName,
      message_id: msg.id,
      body: msg.content,
      content_type: msg.contentType,
      media: msg.media?.map(m => m.url || m.path).filter(Boolean) || null,
      metadata: msg.metadata || {},
      status: 'pending',
      peer_kind: msg.peerKind,
      session_key: sessionKey,
      dedupe_key: dedupeKey,
      ts: msg.timestamp.toISOString(),
    }).select('id').single();

    if (error) {
      console.error('[Bus] Failed to persist inbound message:', error.message);
      // Still emit locally so in-memory consumers aren't starved.
      this.emit('inbound', msg);
      return null;
    }

    this.emit('inbound', msg);
    return data?.id || null;
  }

  /**
   * Publish an outbound message: emit for channel dispatch.
   */
  publishOutbound(msg: OutboundMessage): void {
    this.emit('outbound', msg);
  }

  /**
   * Subscribe to Supabase Realtime for new pending messages.
   * Useful when multiple server instances need to coordinate.
   */
  subscribeRealtime(): void {
    if (this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel('channel-pending-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_pending_messages',
          filter: 'status=eq.pending',
        },
        (payload) => {
          const row = payload.new as Record<string, any>;
          // Realtime re-emit tồn tại để cover kênh EDGE-INGESTED (cskh-*: tin insert từ
          // Supabase edge fn, KHÔNG có in-process bus.emit trong paperclip server). Kênh
          // IN-PROCESS (zalo/facebook/facebook-web/youtube) đã tự emit('inbound') ngay khi
          // nhận tin → nếu realtime CŨNG emit thì consumer xử lý CÙNG tin 2 LẦN → bản thứ 2
          // bị deduplicator coi 'duplicate' → markHandled('skipped') đè lên chính row đang
          // chờ reply → runSessionBatch drain WHERE status='pending' miss → bot không trả
          // lời (BUG Zalo Gem & Yinyang 2026-07-18, plan 2026-07-18-ZALO-GEM-INBOUND-...).
          // → CHỈ re-emit cho kênh edge-ingested (prefix cskh). gem-master insert
          // status='handled' nên realtime filter status=eq.pending không đụng nó. Kênh
          // edge-ingested MỚI (ngoài cskh) → thêm prefix vào guard này.
          const chName = String(row.channel_name || '');
          if (!chName.startsWith('cskh')) return;
          const msg: InboundMessage = {
            id: row.message_id || row.id,
            channel: row.channel_name,
            channelType: 'zalo_personal', // Will be resolved by consumer
            chatId: row.thread_id,
            senderId: row.from_uid,
            senderName: row.sender_name || row.from_uid,
            content: row.body || '',
            contentType: (row.content_type || 'text') as InboundMessage['contentType'],
            // Map cột media (text[] URL) → MediaFile[] để router attach _media cho agy vision
            // (khách gửi ảnh → agy view_file). Trước đây bị drop → agy không "thấy" ảnh.
            media: Array.isArray(row.media) && row.media.length > 0
              ? row.media.map((u: string) => ({
                  url: u,
                  mimeType: /\.png(\?|$)/i.test(u) ? 'image/png' : /\.webp(\?|$)/i.test(u) ? 'image/webp' : 'image/jpeg',
                }))
              : undefined,
            peerKind: (row.peer_kind || 'direct') as PeerKind,
            metadata: row.metadata || {},
            timestamp: new Date(row.ts || row.created_at),
            dedupeKey: row.dedupe_key,
          };
          this.emit('inbound:realtime', msg, row.id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Bus] Realtime subscription active for channel_pending_messages');
        }
      });
  }

  /**
   * Unsubscribe from Supabase Realtime.
   */
  async unsubscribeRealtime(): Promise<void> {
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      console.log('[Bus] Realtime subscription removed');
    }
  }

  /**
   * Mark a pending message as handled.
   */
  async markHandled(
    pendingId: string,
    handledBy: string,
    status: 'handled' | 'failed' | 'skipped' = 'handled',
    skipReason?: string
  ): Promise<void> {
    const updatePayload: Record<string, any> = {
      status,
      handled_by: handledBy,
      handled_at: new Date().toISOString(),
    };
    if (skipReason) updatePayload.skip_reason = skipReason;

    const { error } = await supabase
      .from('channel_pending_messages')
      .update(updatePayload)
      .eq('id', pendingId);

    if (error) {
      console.error('[Bus] Failed to mark message handled:', error.message);
    }
  }
}

// Singleton instance
export const bus = new MessageBus();
