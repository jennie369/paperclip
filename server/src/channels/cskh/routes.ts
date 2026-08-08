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

  // Engage human takeover: pause the bot for this session.
  const { data: sess } = await supabase
    .from('channel_sessions').select('metadata').eq('session_key', sessionKey).single();
  const metadata = { ...((sess?.metadata as Record<string, unknown>) || {}), bot_paused: true };
  await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);

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

    // 4. Engage takeover (pause bot cho session này).
    const { data: sess } = await supabase.from('channel_sessions').select('metadata').eq('session_key', sessionKey).single();
    const metadata = { ...((sess?.metadata as Record<string, unknown>) || {}), bot_paused: true };
    await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);

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
