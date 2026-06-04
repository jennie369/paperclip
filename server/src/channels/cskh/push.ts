// paperclip/server/src/channels/cskh/push.ts
import { supabase } from './supabase.js';

/**
 * Push a "support reply" notification to the customer (gem-mobile).
 * Reuses the existing `send-push` edge function. Best-effort: never throws.
 */
export async function pushSupportReply(userId: string, body: string): Promise<void> {
  try {
    const preview = body.length > 80 ? body.slice(0, 80) + '…' : body;
    await supabase.functions.invoke('send-push', {
      body: {
        user_ids: [userId],
        notification_type: 'support_reply',
        title: '💬 Hỗ trợ Gemral',
        body: preview,
        data: { type: 'support_reply', user_id: userId },
        channel_id: 'messages',
      },
    });
  } catch (err: any) {
    console.error('[cskh/push] pushSupportReply failed:', err?.message || err);
  }
}
