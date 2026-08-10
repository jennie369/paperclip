// paperclip/server/src/channels/cskh/routes.ts
import { Router } from 'express';
import multer from 'multer';
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { cskhChannel } from './channel.js';
import { mirrorReplyToCustomer, mirrorReplyToVisitor } from './mirror.js';
import { pushSupportReply } from './push.js';
import { goiEdgeGemral } from './edge-call.js';

export const cskhRouter = Router();

// In-memory upload (buffer → Supabase Storage bucket cskh-attachments, service_role).
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

/**
 * Manual reply sub-handler. Called by the generic POST /api/channels/send
 * forwarder when channel_type='cskh'. The generic /send already inserted the
 * channel_sent_messages row (sent_by='manual'); here we mirror to the customer
 * (role='human') and engage takeover (bot_paused=true). For cskh-shopify the
 * customer is an anonymous visitor (mirror by visitor_id, no push).
 */
cskhRouter.post('/send', async (req, res) => {
  const { channel_name, thread_id, message, sent_row_id } = req.body as {
    channel_name?: string;
    thread_id?: string;
    message?: string;
    // Do `/api/channels/send` (routes.ts) chuyển xuống: id row channel_sent_messages
    // mà NÓ đã tạo trước khi forward. Có nó thì mirror nối được dây sang kho Paperclip;
    // thiếu (gọi thẳng sub-handler) → mirror ghi 'local_only', vẫn hợp lệ.
    sent_row_id?: string | null;
  };
  if (!thread_id || !message) {
    return res.status(400).json({ error: 'thread_id và message là bắt buộc' });
  }
  const channel = channel_name || 'cskh-internal';
  const id = thread_id;
  const sessionKey = `${channel}:${id}:${id}`;

  // Engage human takeover: pause the bot for this session (ATOMIC RPC — KHÔNG read-merge-write
  // clobber bot_paused; plan 2026-08-10). Là side-effect của reply tay: hụt thì LOG (không chặn reply).
  const { data: pausedRows, error: pauseErr } = await supabase.rpc('cskh_toggle_bot', { p_session_key: sessionKey, p_paused: true });
  if (pauseErr || !pausedRows) console.error('[cskh/send] takeover pause failed:', pauseErr?.message || 'session not found', sessionKey);

  if (channel !== 'cskh-internal') {
    // S-routes: visitor ẩn danh (cskh-shopify / cskh-web) — mirror visitor_id, no push.
    await mirrorReplyToVisitor(id, 'human', message, sent_row_id ?? null, null, channel);
    // P1: email-notif nếu khách offline (edge tự gate offline + debounce; fire-and-forget).
    const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;
    // Qua edge-call: client dùng chung cầm service_role → cổng 'secret' từ chối 401 (28/07).
    void goiEdgeGemral('cskh-notify-offline', { visitor_id: id, channel, preview });
  } else {
    await mirrorReplyToCustomer(id, 'human', message, sent_row_id ?? null, null);
    await pushSupportReply(id, message);
  }
  return res.json({ success: true });
});

/**
 * POST /api/channels/cskh/upload
 * Operator (Paperclip) gửi ẢNH/TỆP cho khách CSKH. Khác Zalo (không có external API):
 * upload lên bucket cskh-attachments (service_role, public) → log channel_sent_messages
 * (inbox) + mirror cskh_messages (role='human', attachment_url → KHÁCH NHẬN) + push + takeover.
 * multipart: { file, channel_name, thread_id, caption? }
 */
cskhRouter.post('/upload', uploadMem.single('file'), async (req, res) => {
  const file = req.file;
  const { channel_name, thread_id, caption } = req.body as { channel_name?: string; thread_id?: string; caption?: string };
  if (!file) return res.status(400).json({ success: false, error: 'Không có file' });
  if (!thread_id) return res.status(400).json({ success: false, error: 'thread_id bắt buộc' });

  const channel = channel_name || 'cskh-internal';
  const id = thread_id;
  const isImage = (file.mimetype || '').startsWith('image/');
  const attachmentType = isImage ? 'image' : 'file';
  const text = (caption || '').trim();
  const sessionKey = `${channel}:${id}:${id}`;

  try {
    // 1. Upload lên Storage (public bucket) → URL browser-servable (khách + inbox load trực tiếp).
    const ext = (file.originalname.split('.').pop() || (isImage ? 'jpg' : 'bin')).toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const safeName = (file.originalname || `file-${Date.now()}`).replace(/[^\w.\-]+/g, '_').slice(0, 60);
    const path = isImage
      ? `cskh/${id}/agent/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      : `cskh/${id}/agent/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('cskh-attachments')
      .upload(path, file.buffer, { contentType: file.mimetype || 'application/octet-stream', upsert: false });
    if (upErr) return res.status(500).json({ success: false, error: `Upload lỗi: ${upErr.message}` });
    const { data: pub } = supabase.storage.from('cskh-attachments').getPublicUrl(path);
    const attachmentUrl = pub?.publicUrl || null;
    if (!attachmentUrl) return res.status(500).json({ success: false, error: 'Không lấy được URL ảnh' });
    const attachFileName = decodeURIComponent((attachmentUrl.split('?')[0].split('/').pop()) || 'tệp đính kèm');

    // 2. Log outbound cho inbox Paperclip: ẢNH→content_type='image'+media[url]; TỆP→'file'+body-JSON (FileMsg).
    const sentBody = isImage ? (text || '[Hình ảnh]') : JSON.stringify({ fileName: attachFileName, href: attachmentUrl });
    const { data: sentRow, error: sentErr } = await supabase.from('channel_sent_messages').insert({
      channel_name: channel, thread_id: id, thread_type: 'dm', to_uid: id,
      body: sentBody, content_type: attachmentType,
      media: isImage ? [attachmentUrl] : null,
      status: 'sent', sent_by: 'manual',
    }).select('id').single();
    if (sentErr) console.error('[cskh/upload] sent log failed:', sentErr.message);
    const uploadSentId = (sentRow as { id: string } | null)?.id ?? null;

    // 3. Mirror sang cskh_messages (role='human' — KHÁC bot 'assistant') → KHÁCH NHẬN + báo khách.
    const preview = isImage ? '📷 Hình ảnh' : '📎 Tệp đính kèm';
    if (channel !== 'cskh-internal') {
      await mirrorReplyToVisitor(id, 'human', text, uploadSentId, null, channel, attachmentUrl, attachmentType);
      // Qua edge-call (28/07): khoá đúng + KHÔNG nuốt lỗi im lặng như `.catch(()=>{})` cũ.
      void goiEdgeGemral('cskh-notify-offline', { visitor_id: id, channel, preview });
    } else {
      await mirrorReplyToCustomer(id, 'human', text, uploadSentId, null, attachmentUrl, attachmentType);
      await pushSupportReply(id, preview);
    }

    // 4. Engage takeover (pause bot cho session này) — ATOMIC RPC (plan 2026-08-10).
    const { data: pausedRows, error: pauseErr } = await supabase.rpc('cskh_toggle_bot', { p_session_key: sessionKey, p_paused: true });
    if (pauseErr || !pausedRows) console.error('[cskh/upload] takeover pause failed:', pauseErr?.message || 'session not found', sessionKey);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gửi thất bại' });
  }
});

/** Register + start the singleton CSKH channel at server boot. */
export async function resumeCskhChannel(): Promise<void> {
  const { data } = await supabase
    .from('channel_instances')
    .select('name')
    .eq('channel_type', 'cskh')
    .eq('enabled', true)
    .limit(1);
  if (!data || data.length === 0) {
    console.log('[cskh] No enabled cskh channel_instance — skipping resume');
    return;
  }
  await cskhChannel.start();
  // CSKH inbound arrives via edge-function INSERT into channel_pending_messages
  // (cross-process), so the bus must bridge DB INSERTs → 'inbound:realtime'.
  // app.ts starts the consumer directly but never calls subscribeRealtime();
  // it is idempotent (guards on an existing channel), so calling it here is safe.
  bus.subscribeRealtime();
  console.log('[cskh] Channel resumed (realtime ingestion active)');
}

/**
 * POST /api/channels/cskh/messages/:id/recall  — thu hồi 1 tin
 * POST /api/channels/cskh/messages/:id/edit    — sửa 1 tin (chỉ tin phía CSKH)
 *
 * `:id` là id row bên KHO PAPERCLIP (channel_sent/pending_messages) — đó là thứ hộp thư
 * hiển thị. Hai hàm máy chủ lại nhận id bên KHO KHÁCH (cskh_messages), nên phải tra ngược
 * qua dây nối `origin_message_id`. Tin CŨ chưa ghép dây → báo rõ để CSKH gỡ từ app, KHÔNG
 * đoán bừa theo thời gian (ghép nhầm là gỡ oan tin khác).
 *
 * Người làm: `PAPERCLIP_CSKH_ACTOR_ID` (uuid một admin có thật). Hàm máy chủ tự kiểm lại
 * người đó CÓ phải admin không. Đây là LỜI KHAI chứ không phải danh tính đã xác minh —
 * chị Jennie đã chốt chấp nhận mức này (OD-5); sổ kiểm toán ghi 'service_role_claimed'.
 */
async function resolveCskhMessageId(paperclipRowId: string): Promise<string | null> {
  const { data } = await supabase
    .from('cskh_messages')
    .select('id')
    .eq('origin_message_id', paperclipRowId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function actorOrError(res: any): string | null {
  const actor = process.env.PAPERCLIP_CSKH_ACTOR_ID;
  if (!actor) {
    res.status(500).json({
      success: false,
      error: 'Chưa cấu hình PAPERCLIP_CSKH_ACTOR_ID (uuid admin) trong server/.env',
    });
    return null;
  }
  return actor;
}

cskhRouter.post('/messages/:id/recall', async (req, res) => {
  const actor = actorOrError(res);
  if (!actor) return;
  const cskhId = await resolveCskhMessageId(req.params.id);
  if (!cskhId) {
    return res.status(404).json({
      success: false,
      error: 'Tin này chưa có dây nối sang kho khách (tin cũ). Gỡ giúp em từ app Hộp thư hỗ trợ.',
    });
  }
  const { data, error } = await supabase.rpc('cskh_admin_recall_message', {
    p_message_id: cskhId,
    p_actor_id: actor,
  });
  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, ...(data as Record<string, unknown>) });
});

cskhRouter.post('/messages/:id/edit', async (req, res) => {
  const { body: newBody } = req.body as { body?: string };
  if (!newBody || !newBody.trim()) {
    return res.status(400).json({ success: false, error: 'Nội dung mới không được để trống' });
  }
  const actor = actorOrError(res);
  if (!actor) return;
  const cskhId = await resolveCskhMessageId(req.params.id);
  if (!cskhId) {
    return res.status(404).json({
      success: false,
      error: 'Tin này chưa có dây nối sang kho khách (tin cũ). Sửa giúp em từ app Hộp thư hỗ trợ.',
    });
  }
  const { data, error } = await supabase.rpc('cskh_admin_edit_message', {
    p_message_id: cskhId,
    p_new_body: newBody.trim(),
    p_actor_id: actor,
  });
  if (error) return res.status(400).json({ success: false, error: error.message });
  return res.json({ success: true, ...(data as Record<string, unknown>) });
});
