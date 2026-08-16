// paperclip/server/src/channels/cskh/push.ts

/**
 * Push a "support reply" notification to the customer (gem-mobile).
 * Best-effort: never throws (nhưng LUÔN log khi hỏng — xem `edge-call.ts`).
 *
 * ⚠️ Đi qua `goiEdgeGemral` (một cửa duy nhất gọi edge fn Gemral, 28/07).
 * Trước đây hàm này dùng client dùng-chung (`./supabase.js` → `GEMRAL_SUPABASE_SERVICE_KEY`,
 * service_role JWT cũ) ⇒ cổng mức 'secret' của `send-push` trả **401** và khách ngừng nhận
 * phản hồi hỗ trợ, câm suốt 27→28/07 vì `catch` nuốt hết.
 */

import { goiEdgeGemral } from './edge-call.js';

export async function pushSupportReply(userId: string, body: string): Promise<void> {
  const preview = body.length > 80 ? body.slice(0, 80) + '…' : body;
  await goiEdgeGemral('send-push', {
    user_ids: [userId],
    notification_type: 'support_reply',
    title: '💬 Hỗ trợ Gemral',
    body: preview,
    data: { type: 'support_reply', user_id: userId },
    channel_id: 'messages',
  });
}
