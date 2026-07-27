// paperclip/server/src/channels/cskh/push.ts

/**
 * Push a "support reply" notification to the customer (gem-mobile).
 * Reuses the existing `send-push` edge function. Best-effort: never throws.
 *
 * ⚠️ KHOÁ GỬI ĐI PHẢI LÀ `SB_SECRET_BACKEND` (2026-07-28).
 * Trước đây hàm này dùng client dùng-chung (`./supabase.js` → `GEMRAL_SUPABASE_SERVICE_KEY`,
 * tức service_role JWT cũ). Từ 27/07 `send-push` gắn cổng mức 'secret'
 * (`supabase/functions/_shared/gate.ts`) — cổng đó CHỈ chấp `Bearer ${SB_SECRET_BACKEND}`
 * hoặc `Bearer ${SB_CRON_SECRET}`, nên service_role bị trả **401** và khách ngừng nhận
 * phản hồi hỗ trợ. Lỗi câm suốt vì `catch` nuốt hết — đúng class "silent catch" bị cấm
 * (evolution-log 01 row 27).
 *
 * Gọi thẳng bằng `fetch` thay vì `supabase.functions.invoke` để KHÔNG phải đổi client
 * dùng chung (client đó còn phục vụ mọi truy vấn DB của Zalo/CSKH — đổi nó là lan rộng).
 */

const SUPABASE_URL = 'https://pgfkbcnzqozzkohwbgbk.supabase.co';

export async function pushSupportReply(userId: string, body: string): Promise<void> {
  try {
    const key = process.env.SB_SECRET_BACKEND;
    if (!key) {
      // Fail-loud trong log: thiếu khoá thì push chết câm — đúng lớp lỗi vừa mất công truy.
      console.error('[cskh/push] SB_SECRET_BACKEND chưa set — push sẽ bị cổng từ chối 401');
      return;
    }

    const preview = body.length > 80 ? body.slice(0, 80) + '…' : body;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({
        user_ids: [userId],
        notification_type: 'support_reply',
        title: '💬 Hỗ trợ Gemral',
        body: preview,
        data: { type: 'support_reply', user_id: userId },
        channel_id: 'messages',
      }),
    });

    // `send-push` cố ý giữ HTTP 200 kể cả khi Expo từ chối (4 nơi gọi nằm trên đường trả lời
    // khách và await lời gọi này) — nên fail-loud nằm ở THÂN response, phải đọc nó.
    const raw = await res.text();
    if (!res.ok) {
      console.error(`[cskh/push] send-push HTTP ${res.status}: ${raw.slice(0, 200)}`);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.success === false) {
        console.error(`[cskh/push] push thất bại (failed=${parsed?.failed ?? '?'}):`,
          JSON.stringify(parsed?.errors ?? []).slice(0, 200));
      }
    } catch {
      /* thân không phải JSON → bỏ qua, giữ best-effort */
    }
  } catch (err: any) {
    console.error('[cskh/push] pushSupportReply failed:', err?.message || err);
  }
}
