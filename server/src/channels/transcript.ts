// Transcript SSOT — nguồn DUY NHẤT đọc nội dung hội thoại cho MỌI màn inbox.
//
// Vì sao tồn tại (plan 2026-07-19-INBOX-TRANSCRIPT-UNIFY-2-DUONG-DOC):
// Trước đây 2 màn đọc bằng 2 truy vấn KHÁC nhau ⇒ cùng 1 hội thoại mà hiện khác nhau:
//   • /api/channels/conversations/:key/messages (CrmInbox) lọc `.eq('session_key')`
//     ⇒ ẩn mọi tin CHƯA được claim (tin đến lúc bot tắt), VÀ truy vấn outbound bằng 2 cột
//     KHÔNG tồn tại trên channel_sent_messages (`session_key`, `metadata`) + KHÔNG check
//     error ⇒ outbound LUÔN rỗng (lỗi câm — không crash, không log).
//   • /api/channels/sessions/:key/messages (Unified) lọc channel+thread ⇒ hiện.
// ⇒ Gom về 1 helper: cùng NGUỒN + cùng BỘ LỌC + cùng CHÍNH SÁCH ẨN + CÓ check error.
// Hai endpoint giữ nguyên đường dẫn & shape riêng (UI không phải sửa).

import { supabase } from './zalo-personal/supabase.js';

/** Cột CÓ THẬT trên channel_pending_messages (union nhu cầu của cả 2 endpoint). */
const INBOUND_COLS =
  'id, channel_name, thread_id, thread_type, from_uid, sender_name, message_id, body, ' +
  'content_type, media, status, handled_by, skip_reason, ts, created_at, session_key, agent_slug';

/**
 * Cột CÓ THẬT trên channel_sent_messages. Bảng này chỉ có 14 cột:
 * id, channel_name, thread_id, thread_type, to_uid, body, content_type, media, status,
 * error_message, platform_message_id, sent_by, created_at, dedupe_key
 * ⚠️ KHÔNG có `session_key`, KHÔNG có `metadata` — dùng 2 cột đó = lỗi câm (bug gốc).
 */
const OUTBOUND_COLS =
  'id, channel_name, thread_id, thread_type, to_uid, body, content_type, media, status, sent_by, created_at';

export interface ParsedSessionKey {
  channel: string;
  threadId: string;
  senderPart: string;
  isGroup: boolean;
  /** Có lọc thêm `from_uid = senderPart` không. false cho group (nhiều người) VÀ cho
   *  channel single-party (thread_id đã định danh duy nhất, lọc thêm là THỪA). */
  filterSender: boolean;
}

export interface MessageFlags {
  starred: boolean;
  pinned: boolean;
  deleted_for_me: boolean;
}

export interface Transcript {
  inbound: Record<string, any>[];
  outbound: Record<string, any>[];
  flags: Record<string, MessageFlags>;
}

/**
 * Channel dùng convention session_key **2 PHẦN** `{channel}:{userId}` — 1 khách = 1 phiên,
 * không có "người gửi" thứ hai để phân biệt.
 *
 * ⚠️ WRITER nằm ở REPO KHÁC (Deno edge, không import chéo được với Node server này):
 *   crypto-pattern-scanner/supabase/functions/{gemini-proxy,gem-master-chat,gem-master-mirror}/
 *   → gem-master-inbox-log.ts
 * Chống drift bằng: (a) comment trỏ đích danh writer ở trên; (b) probe by-effect P26 trong
 * `scripts/audit_cskh.py` (gọi thật endpoint mỗi channel, đòi 200); (c) seed
 * `memory/ssot_drift_registry.json` cho health-sweep §M24.
 *
 * BỐI CẢNH (regression 092ff4ae5 ngày 19/07 → phát hiện 25/07): bản gộp-về-1-parser siết
 * validate lên ĐÚNG 3 phần ⇒ 7 phiên gem-master trả 400 SUỐT 6 NGÀY mà không ai thấy, vì
 * danh sách hội thoại vẫn hiện bình thường và UI nuốt lỗi thành "Chưa có tin nhắn".
 */
const SINGLE_PARTY_CHANNELS = new Set(['gem-master']);

/**
 * Parser CANONICAL cho session_key — dùng CHUNG mọi nơi (transcript + consumer).
 * Hai convention hợp lệ:
 *   • 3 phần `{channel}:{threadId}:{senderId|'group'}`  — mặc định
 *   • 2 phần `{channel}:{userId}`                        — CHỈ channel trong SINGLE_PARTY_CHANNELS
 *
 * Dùng indexOf-slicing CHỨ KHÔNG `split(':')`: thread/sender id có thể CHỨA dấu ':' → split
 * rồi lấy parts[1] sẽ cắt sai id. Trả null nếu key không hợp lệ để caller trả 400 — KHÔNG
 * đoán bừa (guard cũ `parts.length < 2` chấp nhận cả "channel:").
 */
export function parseSessionKey(sessionKey: string): ParsedSessionKey | null {
  if (!sessionKey) return null;
  const idx1 = sessionKey.indexOf(':');
  if (idx1 <= 0) return null;
  const channel = sessionKey.slice(0, idx1);
  const idx2 = sessionKey.indexOf(':', idx1 + 1);

  if (idx2 === -1) {
    // Dạng 2 phần — chỉ chấp nhận cho channel ĐÃ ĐĂNG KÝ (fail-closed cho phần còn lại).
    if (!SINGLE_PARTY_CHANNELS.has(channel)) {
      console.warn(
        `[transcript] session_key 2 phần nhưng channel "${channel}" chưa đăng ký single-party: ${sessionKey}`,
      );
      return null;
    }
    const threadId = sessionKey.slice(idx1 + 1);
    if (!threadId) return null; // "gem-master:" vẫn reject
    // filterSender=false: thread_id ĐÃ định danh duy nhất khách, lọc thêm from_uid là THỪA và
    // chỉ có 1 chiều hậu quả — mất tin CÂM nếu mai có writer ghi from_uid khác.
    return { channel, threadId, senderPart: threadId, isGroup: false, filterSender: false };
  }

  if (idx2 <= idx1 + 1) return null;
  const threadId = sessionKey.slice(idx1 + 1, idx2);
  const senderPart = sessionKey.slice(idx2 + 1);
  if (!threadId || !senderPart) return null;

  const isGroup = senderPart === 'group';
  return { channel, threadId, senderPart, isGroup, filterSender: !isGroup };
}

/**
 * Đọc TOÀN BỘ tin của 1 hội thoại (inbound + outbound) theo bộ lọc canonical.
 *
 * Bộ lọc: channel_name + thread_id, CỘNG from_uid khi `filterSender`.
 *   - group  (`…:group`)      → KHÔNG lọc from_uid (giữ đủ tin của mọi người trong nhóm).
 *   - direct / comment        → lọc from_uid (mỗi người 1 hội thoại; verify 2026-07-19:
 *                               0 thread comment nào có >1 from_uid nên lọc là an toàn).
 *   - single-party (2 phần)   → KHÔNG lọc from_uid: thread_id đã định danh duy nhất khách
 *                               (verify 25/07: gem-master 62/62 row from_uid == thread_id).
 * KHÔNG lọc theo cột `session_key` — cột đó chỉ được ghi lúc claim, tin chưa claim sẽ NULL
 * và biến mất khỏi màn hình (đúng bug đang sửa).
 *
 * @throws nếu truy vấn DB lỗi — caller PHẢI trả 5xx. Tuyệt đối không nuốt lỗi rồi trả
 *         mảng rỗng (giả vờ "hội thoại trống") — đó chính là cách bug gốc ẩn mình.
 */
export async function fetchTranscript(sessionKey: string, limit = 200): Promise<Transcript> {
  const parsed = parseSessionKey(sessionKey);
  if (!parsed) throw new Error(`Invalid session_key format: ${sessionKey}`);
  const { channel, threadId, senderPart, filterSender } = parsed;

  // Lấy `limit` tin MỚI NHẤT (order desc + limit) rồi đảo lại thành thứ tự thời gian.
  // Bản cũ `ascending: true` + limit lấy nhầm `limit` tin CŨ NHẤT: hội thoại dài hơn
  // limit thì cửa sổ đứng yên ở quá khứ và tin mới KHÔNG BAO GIỜ hiện, trong khi cột
  // danh sách (đọc channel_sessions.last_message) vẫn cập nhật ⇒ "thấy preview nhưng
  // mở ra không có tin". Chỉ lộ ở thread cũ/nhiều tin nên dễ tưởng lỗi riêng 1 khách
  // (đo 21/07: Trần Thắng 296 tin → mất 96 tin gần nhất; Gemral 89 tin < limit → bình thường).
  let inQ = supabase
    .from('channel_pending_messages')
    .select(INBOUND_COLS)
    .eq('channel_name', channel)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filterSender) inQ = inQ.eq('from_uid', senderPart);

  const outQ = supabase
    .from('channel_sent_messages')
    .select(OUTBOUND_COLS)
    .eq('channel_name', channel)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const [{ data: inboundDesc, error: inErr }, { data: outboundDesc, error: outErr }] = await Promise.all([inQ, outQ]);
  if (inErr) throw new Error(`transcript inbound query failed: ${inErr.message}`);
  if (outErr) throw new Error(`transcript outbound query failed: ${outErr.message}`);

  // Caller (ChatPanel/CrmInbox) render theo thứ tự mảng — trả về cũ→mới như trước.
  const inbound = (inboundDesc || []).slice().reverse();
  const outbound = (outboundDesc || []).slice().reverse();

  // Cờ thao tác của operator (sao / ghim / xoá-với-tôi) — key theo message uuid (duy nhất
  // across cả 2 bảng). CHÍNH SÁCH DÙNG CHUNG: caller nào cũng phải ẩn `deleted_for_me`,
  // nếu không 2 màn lại lệch nhau có chủ đích.
  const ids = [...(inbound || []), ...(outbound || [])].map((m: any) => m.id).filter(Boolean);
  const flags: Record<string, MessageFlags> = {};
  if (ids.length) {
    const { data: flagRows, error: flagErr } = await supabase
      .from('inbox_message_flags')
      .select('message_id, starred, pinned, deleted_for_me')
      .in('message_id', ids);
    if (flagErr) throw new Error(`transcript flags query failed: ${flagErr.message}`);
    for (const f of flagRows || []) {
      flags[(f as any).message_id] = {
        starred: !!(f as any).starred,
        pinned: !!(f as any).pinned,
        deleted_for_me: !!(f as any).deleted_for_me,
      };
    }
  }

  const notDeleted = (m: any) => !flags[m.id]?.deleted_for_me;
  return {
    inbound: (inbound || []).filter(notDeleted),
    outbound: (outbound || []).filter(notDeleted),
    flags,
  };
}
