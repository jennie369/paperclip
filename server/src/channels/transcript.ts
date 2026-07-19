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
 * Parser CANONICAL cho session_key — dùng CHUNG mọi nơi đọc transcript.
 * Format: `{channel}:{threadId}:{senderId|'group'}`.
 *
 * Dùng indexOf-slicing (khớp consumer.ts) CHỨ KHÔNG `split(':')`: thread/sender id có thể
 * CHỨA dấu ':' → split rồi lấy parts[1] sẽ cắt sai id. Trả null nếu key không hợp lệ để
 * caller trả 400 — KHÔNG đoán bừa (guard cũ `parts.length < 2` chấp nhận cả "channel:").
 */
export function parseSessionKey(sessionKey: string): ParsedSessionKey | null {
  if (!sessionKey) return null;
  const idx1 = sessionKey.indexOf(':');
  if (idx1 <= 0) return null;
  const idx2 = sessionKey.indexOf(':', idx1 + 1);
  if (idx2 <= idx1 + 1) return null;

  const channel = sessionKey.slice(0, idx1);
  const threadId = sessionKey.slice(idx1 + 1, idx2);
  const senderPart = sessionKey.slice(idx2 + 1);
  if (!channel || !threadId || !senderPart) return null;

  return { channel, threadId, senderPart, isGroup: senderPart === 'group' };
}

/**
 * Đọc TOÀN BỘ tin của 1 hội thoại (inbound + outbound) theo bộ lọc canonical.
 *
 * Bộ lọc: channel_name + thread_id, CỘNG from_uid khi KHÔNG phải group.
 *   - group  (`…:group`)      → KHÔNG lọc from_uid (giữ đủ tin của mọi người trong nhóm).
 *   - direct / comment        → lọc from_uid (mỗi người 1 hội thoại; verify 2026-07-19:
 *                               0 thread comment nào có >1 from_uid nên lọc là an toàn).
 * KHÔNG lọc theo cột `session_key` — cột đó chỉ được ghi lúc claim, tin chưa claim sẽ NULL
 * và biến mất khỏi màn hình (đúng bug đang sửa).
 *
 * @throws nếu truy vấn DB lỗi — caller PHẢI trả 5xx. Tuyệt đối không nuốt lỗi rồi trả
 *         mảng rỗng (giả vờ "hội thoại trống") — đó chính là cách bug gốc ẩn mình.
 */
export async function fetchTranscript(sessionKey: string, limit = 200): Promise<Transcript> {
  const parsed = parseSessionKey(sessionKey);
  if (!parsed) throw new Error(`Invalid session_key format: ${sessionKey}`);
  const { channel, threadId, senderPart, isGroup } = parsed;

  let inQ = supabase
    .from('channel_pending_messages')
    .select(INBOUND_COLS)
    .eq('channel_name', channel)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (!isGroup) inQ = inQ.eq('from_uid', senderPart);

  const outQ = supabase
    .from('channel_sent_messages')
    .select(OUTBOUND_COLS)
    .eq('channel_name', channel)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  const [{ data: inbound, error: inErr }, { data: outbound, error: outErr }] = await Promise.all([inQ, outQ]);
  if (inErr) throw new Error(`transcript inbound query failed: ${inErr.message}`);
  if (outErr) throw new Error(`transcript outbound query failed: ${outErr.message}`);

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
