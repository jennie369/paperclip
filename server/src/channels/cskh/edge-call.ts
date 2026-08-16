// paperclip/server/src/channels/cskh/edge-call.ts
//
// MỘT CỬA gọi edge function Gemral từ Paperclip.
//
// VÌ SAO GOM MỘT NƠI (28/07): từ 27/07 các edge fn Gemral gắn cổng kiểm người gọi
// (`supabase/functions/_shared/gate.ts`). Mức 'secret' CHỈ chấp `Bearer SB_SECRET_BACKEND`
// hoặc `SB_CRON_SECRET`. Client dùng chung của Paperclip (`./supabase.js`) cầm
// `GEMRAL_SUPABASE_SERVICE_KEY` — service_role JWT cũ ⇒ **401**.
//
// Đã trả giá 2 lần trong CÙNG một sự cố:
//   • `push.ts` → khách ngừng nhận phản hồi hỗ trợ (phát hiện nhờ chị Jennie báo)
//   • `channel.ts` ×2 + `routes.ts` ×2 gọi `cskh-notify-offline` → khách vãng-lai ngừng nhận
//     email báo "có phản hồi mới" (phát hiện nhờ máy dò, KHÔNG ai báo — vì `.catch(()=>{})`)
//
// ⇒ Mọi lời gọi edge fn Gemral đi qua đây. Sửa luật auth một lần, không phải săn từng chỗ.
// KHÔNG dùng `supabase.functions.invoke` cho edge fn Gemral nữa: client đó mang khoá sai,
// và đổi client dùng chung là lan sang mọi truy vấn DB của Zalo/CSKH.

const SUPABASE_URL = 'https://pgfkbcnzqozzkohwbgbk.supabase.co';

export interface KetQuaGoiEdge {
  ok: boolean;
  status: number;
  body: unknown;
}

/**
 * Gọi 1 edge function Gemral bằng khoá backend. Best-effort: không ném lỗi ra ngoài,
 * NHƯNG luôn ghi log khi hỏng — `catch(()=>{})` im lặng chính là thứ khiến sự cố 27-28/07
 * không để lại dấu vết nào.
 */
export async function goiEdgeGemral(slug: string, body: unknown): Promise<KetQuaGoiEdge> {
  const key = process.env.SB_SECRET_BACKEND;
  if (!key) {
    console.error(`[edge-call] SB_SECRET_BACKEND chưa set — '${slug}' sẽ bị cổng từ chối 401`);
    return { ok: false, status: 0, body: null };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let parsed: unknown = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }

    if (!res.ok) {
      console.error(`[edge-call] ${slug} HTTP ${res.status}: ${raw.slice(0, 200)}`);
      return { ok: false, status: res.status, body: parsed };
    }
    // Nhiều edge fn Gemral cố ý giữ HTTP 200 kể cả khi việc bên trong hỏng (vì người gọi
    // nằm trên đường trả lời khách) ⇒ fail-loud nằm ở THÂN response, phải đọc.
    if (parsed && typeof parsed === 'object' && (parsed as { success?: boolean }).success === false) {
      console.error(`[edge-call] ${slug} trả success:false — ${raw.slice(0, 200)}`);
      return { ok: false, status: res.status, body: parsed };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err: any) {
    console.error(`[edge-call] ${slug} lỗi mạng:`, err?.message || err);
    return { ok: false, status: 0, body: null };
  }
}
