// Track A (plan 2026-08-11-CSKH-BOT-PAUSE-UX-HUMAN-CONTEXT) — block ngữ cảnh
// "nhân viên đã trả lời tay" tiêm vào message TRƯỚC khi agent chạy, để bot KHÔNG nhai
// lại việc chị/nhân viên đã xử lý trong lúc takeover. Nguồn sự thật = channel_sent_messages
// (KHÔNG đụng single-writer saveHistory / BUG-047). Phủ mọi kênh DM (cskh-*/zalo/fb).
import { supabase } from './zalo-personal/supabase.js';
import { isHumanSent } from './sent-by-utils.js';
import type { SessionMessage } from './types.js';

const MAX_TIN = 8;          // 8 tin GẦN NHẤT (vòng 2 G2: giữ phần CHỐT của đợt, không phải phần mở đầu)
const MAX_KY_TU_TIN = 150;  // cắt mỗi tin
const MAX_KY_TU_BLOCK = 1200; // trần cả block (chống phình history — vòng 2 G2/F5)
const DEFAULT_LUI_MS = 48 * 60 * 60 * 1000; // history rỗng → chỉ nhìn lại 48h

/** Giờ HH:MM (UTC+7); thêm DD/MM khi tin cách hiện tại > 12h (chống lẫn ngày — vòng 1 F1). */
function nhanThoiGian(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  const hcm = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(hcm.getUTCHours()).padStart(2, '0');
  const mm = String(hcm.getUTCMinutes()).padStart(2, '0');
  const xa = Date.now() - d.getTime() > 12 * 60 * 60 * 1000;
  if (xa) {
    const dd = String(hcm.getUTCDate()).padStart(2, '0');
    const mo = String(hcm.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mo} ${hh}:${mm}`;
  }
  return `${hh}:${mm}`;
}

/** Preview 1 tin: ảnh/tệp → nhãn; text → cắt MAX_KY_TU_TIN. */
function previewTin(row: { body: string | null; content_type: string | null; media: string[] | null }): string {
  const ct = row.content_type || 'text';
  if (ct === 'image' || (Array.isArray(row.media) && row.media.length > 0)) {
    const txt = (row.body || '').trim();
    return txt && txt !== '[Hình ảnh]' ? `[Hình ảnh] ${txt}`.slice(0, MAX_KY_TU_TIN) : '[Hình ảnh]';
  }
  if (ct === 'file') return '[Tệp đính kèm]';
  const b = (row.body || '').replace(/\s+/g, ' ').trim();
  return b.length > MAX_KY_TU_TIN ? b.slice(0, MAX_KY_TU_TIN) + '…' : b;
}

/**
 * Xây block tin-nhân-viên cho 1 thread DM.
 * @returns { block, watermark } — block='' + watermark=null nếu không có tin nào để tiêm.
 *   watermark = created_at của tin manual MỚI NHẤT đã render (đơn điệu theo dữ-liệu-đã-thấy
 *   → chống nhảy cóc; KHÔNG dùng now()). Nhích human_seen_until = giá trị này ở consumer sau runAgent.
 */
export async function buildHumanReplyBlock(
  channel: string,
  threadId: string,
  sessionKey: string,
  history: SessionMessage[],
): Promise<{ block: string; watermark: string | null }> {
  try {
    // 1) Mốc dưới = human_seen_until nếu có; nếu chưa có → timestamp lượt bot chạy gần nhất
    //    (entry 'assistant' cuối trong history), fallback now()-48h. CẤM dùng bot_unpaused_at
    //    (luôn SAU tin manual của phiên takeover → loại sạch đúng tập cần tiêm — vòng 1 F2).
    const { data: sess } = await supabase
      .from('channel_sessions')
      .select('metadata')
      .eq('session_key', sessionKey)
      .maybeSingle();
    let watermarkDuoi = (sess?.metadata as any)?.human_seen_until as string | undefined;
    if (!watermarkDuoi) {
      const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant' && m.timestamp);
      watermarkDuoi = lastAssistant?.timestamp || new Date(Date.now() - DEFAULT_LUI_MS).toISOString();
    }

    // 2) Lấy MAX_TIN tin manual GẦN NHẤT sau mốc (DESC), loại tin gửi HỎNG + đã thu hồi
    //    (vòng 1 F6 / vòng 1 RACE-F3: inject "tin ma" = khai với agent việc chưa từng xảy ra).
    //    CẤM lọc status='sent' cứng (row 'sending' đang lật trạng thái sẽ nhảy cóc).
    const { data: rows } = await supabase
      .from('channel_sent_messages')
      .select('body, content_type, media, created_at, sent_by, status, is_recalled')
      .eq('channel_name', channel)
      .eq('thread_id', threadId)
      .like('sent_by', 'manual%')
      .neq('status', 'failed')
      .gt('created_at', watermarkDuoi)
      .order('created_at', { ascending: false })
      .limit(MAX_TIN + 1); // +1 để biết có tin CŨ HƠN bị bỏ (dòng "…và N tin trước")

    if (!rows || rows.length === 0) return { block: '', watermark: null };

    // Lọc phòng thủ tầng app (is_recalled + isHumanSent) — không tin mình query đủ.
    const dung = rows.filter((r: any) => !r.is_recalled && isHumanSent(r.sent_by));
    if (dung.length === 0) return { block: '', watermark: null };

    const coTinCuHon = dung.length > MAX_TIN;
    const nhom = dung.slice(0, MAX_TIN); // 8 tin mới nhất (DESC)

    // 3) Render newest→oldest tới khi chạm trần ký tự (giữ tin CHỐT), rồi đảo về ASC hiển thị.
    const dong: string[] = [];
    let tongKyTu = 0;
    let watermark: string | null = null;
    let boBotViTran = false;
    for (const r of nhom) {
      const line = `- (${nhanThoiGian(r.created_at)}) ${previewTin(r)}`;
      if (tongKyTu + line.length > MAX_KY_TU_BLOCK && dong.length > 0) { boBotViTran = true; break; }
      if (watermark === null) watermark = r.created_at; // tin đầu (DESC) = mới nhất = watermark
      dong.push(line);
      tongKyTu += line.length + 1;
    }
    if (watermark === null) return { block: '', watermark: null };

    dong.reverse(); // ASC để đọc tự nhiên
    const soBo = (coTinCuHon ? dung.length - nhom.length : 0) + (boBotViTran ? nhom.length - dong.length : 0);
    const header = '[NHÂN VIÊN HỖ TRỢ ĐÃ TRẢ LỜI TRỰC TIẾP CHO KHÁCH — các việc dưới đây coi như ĐÃ xử lý: KHÔNG lặp lại, KHÔNG xin lỗi lại, KHÔNG nhắc tới ghi chú này với khách]';
    const truoc = soBo > 0 ? `\n(…và ${soBo} tin trước đó)` : '';
    return { block: `${header}${truoc}\n${dong.join('\n')}\n\n`, watermark };
  } catch (err: any) {
    console.warn(`[human-reply-block] build failed (non-blocking) ${sessionKey}: ${err?.message || err}`);
    return { block: '', watermark: null };
  }
}
