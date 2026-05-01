// packages/server/src/channels/zalo-personal/routes.ts

import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ZaloPersonalChannel } from './channel.js';
import { supabase } from './supabase.js';

// Configure multer for temp file uploads
const uploadDir = path.resolve(process.env.UPLOAD_DIR || '/tmp/paperclip-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file hình ảnh'));
    }
  },
});

const router = Router();

// Active channels in memory
const activeChannels = new Map<string, ZaloPersonalChannel>();

/**
 * GET /api/channels/zalo-personal
 * List all Zalo personal channels
 */
router.get('/', async (_req, res) => {
  const { data } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('channel_type', 'zalo_personal')
    .order('created_at', { ascending: false });

  res.json(data || []);
});

/**
 * GET /api/channels/zalo-personal/connect?name=xxx&display_name=yyy
 * Start QR login for new channel (SSE for real-time QR events)
 */
router.get('/connect', async (req, res) => {
  const name = req.query.name as string;
  const display_name = req.query.display_name as string;

  if (!name) return res.status(400).json({ error: 'name required' });

  const channel = new ZaloPersonalChannel(name);

  // SSE for real-time QR events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const success = await channel.loginQR((event: string, data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
    });

    if (success) {
      activeChannels.set(name, channel);
      res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ event: 'failed' })}\n\n`);
    }
  } catch (err: any) {
    console.error('[ZaloPersonal] Connect error:', err.message, err.response?.status, err.response?.data);
    res.write(`data: ${JSON.stringify({ event: 'error', message: err.message })}\n\n`);
  }

  res.end();
});

/**
 * POST /api/channels/zalo-personal/send
 * Send message through channel
 * Body: { channel_name, thread_id, message, thread_type? }
 */
router.post('/send', async (req, res) => {
  const { channel_name, thread_id, message, thread_type } = req.body;

  console.log(`[ZaloRoutes] POST /send channel=${channel_name} thread=${thread_id} msg="${message?.substring(0, 30)}"`);
  console.log(`[ZaloRoutes] activeChannels keys:`, [...activeChannels.keys()]);

  const channel = activeChannels.get(channel_name);
  if (!channel) {
    console.error(`[ZaloRoutes] Channel NOT in activeChannels: ${channel_name}`);
    return res.status(404).json({ error: 'Channel not connected' });
  }

  try {
    const result = await channel.send(thread_id, message, thread_type || 'dm');
    console.log(`[ZaloRoutes] Send result:`, JSON.stringify(result).substring(0, 200));
    res.json(result);
  } catch (err: any) {
    console.error(`[ZaloRoutes] Send error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/channels/zalo-personal/test-file
 */
router.post('/test-file', async (req, res) => {
  const { channel_name, thread_id, filepath } = req.body;
  const channel = activeChannels.get(channel_name);
  if (!channel) return res.status(404).json({ error: 'Channel not connected' });
  try {
    const result = await channel.sendFile(thread_id, filepath, 'dm', 'Dạ test file đính kèm');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/channels/zalo-personal/:name/start
 * Start channel from saved credentials
 */
router.post('/:name/start', async (req, res) => {
  const { name } = req.params;

  // If channel exists but is in error state, remove it so we can restart
  const existing = activeChannels.get(name);
  if (existing) {
    const { data: inst } = await supabase.from('channel_instances').select('status').eq('name', name).single();
    if (inst?.status === 'error' || inst?.status === 'disconnected') {
      try { existing.stop?.(); } catch {}
      activeChannels.delete(name);
    } else {
      return res.json({ status: 'already_running' });
    }
  }

  // Fetch display_name for logging
  const { data: inst } = await supabase.from('channel_instances').select('display_name').eq('name', name).single();
  const channel = new ZaloPersonalChannel(name, inst?.display_name);
  const success = await channel.startFromDB();

  if (success) {
    activeChannels.set(name, channel);
    res.json({ status: 'started' });
  } else {
    res.status(500).json({ status: 'failed', error: 'Could not start — check credentials' });
  }
});

/**
 * POST /api/channels/zalo-personal/:name/stop
 */
router.post('/:name/stop', async (req, res) => {
  const { name } = req.params;
  const channel = activeChannels.get(name);

  if (channel) {
    await channel.stop();
    activeChannels.delete(name);
  }

  res.json({ status: 'stopped' });
});

/**
 * POST /api/channels/zalo-personal/:name/refresh-key
 * Refresh zpw_enk by calling getLoginInfo with existing cookies.
 * Fixes "bad decrypt" when Zalo rotates encryption keys.
 */
router.post('/:name/refresh-key', async (req, res) => {
  const { name } = req.params;
  let channel = activeChannels.get(name);

  if (!channel) {
    // Create temporary channel instance to refresh key
    const { data: inst } = await supabase.from('channel_instances').select('display_name').eq('name', name).single();
    channel = new ZaloPersonalChannel(name, inst?.display_name);
  }

  const result = await channel.refreshEncryptionKey();

  if (result.success && !activeChannels.has(name)) {
    // If channel wasn't running, start it with fresh key
    const started = await channel.startFromDB();
    if (started) activeChannels.set(name, channel);
  }

  res.json(result);
});

/**
 * DELETE /api/channels/zalo-personal/:name
 * Soft delete: Xóa channel instance + credentials nhưng GIỮ LẠI toàn bộ
 * session history, pending messages, và sent messages.
 * Dùng khi disconnect / reconnect để tránh mất lịch sử hội thoại.
 */
router.delete('/:name', async (req, res) => {
  const { name } = req.params;

  const channel = activeChannels.get(name);
  if (channel) {
    await channel.stop();
    activeChannels.delete(name);
  }

  // Delete technical data only — messages/sessions preserved via ON DELETE SET NULL FK
  await supabase.from('channel_quota_usage').delete().eq('channel_name', name);
  await supabase.from('channel_group_history').delete().eq('channel_name', name);
  await supabase.from('channel_pairing_codes').delete().eq('channel_name', name);

  const { error } = await supabase.from('channel_instances').delete().eq('name', name);
  if (error) {
    console.error(`[ZaloPersonal] Delete error for ${name}:`, error.message);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
  res.json({ status: 'deleted', note: 'Session history preserved' });
});

/**
 * DELETE /api/channels/zalo-personal/:name/history
 * Hard delete: Xóa toàn bộ bao gồm lịch sử hội thoại.
 * Chỉ dùng khi admin chủ động muốn reset hoàn toàn.
 */
router.delete('/:name/history', async (req, res) => {
  const { name } = req.params;

  const channel = activeChannels.get(name);
  if (channel) {
    await channel.stop();
    activeChannels.delete(name);
  }

  // XÓA TẤT CẢ bao gồm lịch sử
  await supabase.from('channel_pending_messages').delete().eq('channel_name', name);
  await supabase.from('channel_sent_messages').delete().eq('channel_name', name);
  await supabase.from('channel_sessions').delete().eq('channel_name', name);
  await supabase.from('channel_quota_usage').delete().eq('channel_name', name);
  await supabase.from('channel_group_history').delete().eq('channel_name', name);
  await supabase.from('channel_pairing_codes').delete().eq('channel_name', name);
  const { error } = await supabase.from('channel_instances').delete().eq('name', name);
  if (error) {
    console.error(`[ZaloPersonal] Hard delete error for ${name}:`, error.message);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
  res.json({ status: 'deleted', note: 'All history deleted' });
});

/**
 * POST /api/channels/zalo-personal/upload
 * Upload and send image through channel.
 * Body: multipart/form-data with { file, channel_name, thread_id, thread_type?, caption? }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  const { channel_name, thread_id, thread_type, caption } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Không có file' });
  if (!channel_name || !thread_id) {
    // Clean up temp file
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'channel_name và thread_id bắt buộc' });
  }

  const channel = activeChannels.get(channel_name);
  if (!channel) {
    fs.unlink(file.path, () => {});
    return res.status(404).json({ error: 'Kênh chưa kết nối' });
  }

  try {
    const result = await channel.sendImage(
      thread_id,
      file.path,
      (thread_type as 'dm' | 'group') || 'dm',
      caption,
    );

    // Clean up temp file
    fs.unlink(file.path, () => {});

    res.json(result);
  } catch (err: any) {
    fs.unlink(file.path, () => {});
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/channels/zalo-personal/:name/messages
 */
router.get('/:name/messages', async (req, res) => {
  const { name } = req.params;
  const { thread_id, limit = 50 } = req.query;

  // Fetch inbound (pending) messages
  let inQuery = supabase
    .from('channel_pending_messages')
    .select('id, channel_name, thread_id, thread_type, from_uid, sender_name, message_id, body, content_type, ts, created_at')
    .eq('channel_name', name)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  // Fetch outbound (sent) messages
  let outQuery = supabase
    .from('channel_sent_messages')
    .select('id, channel_name, thread_id, thread_type, to_uid, body, content_type, status, sent_by, created_at')
    .eq('channel_name', name)
    .in('status', ['sent', 'failed'])
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (thread_id) {
    inQuery = inQuery.eq('thread_id', String(thread_id));
    outQuery = outQuery.eq('thread_id', String(thread_id));
  }

  const [{ data: inbound }, { data: outbound }] = await Promise.all([inQuery, outQuery]);

  // Merge and normalize
  const messages = [
    ...(inbound || []).map((m: any) => ({ ...m, direction: 'inbound' })),
    ...(outbound || []).map((m: any) => ({
      ...m,
      direction: 'outbound',
      from_uid: '',
      sender_name: m.sent_by && m.sent_by !== 'manual' ? `🤖 ${m.sent_by}` : 'Bạn',
      ts: m.created_at,
      status: m.status,
    })),
  ].sort((a, b) => (b.ts || b.created_at || '').localeCompare(a.ts || a.created_at || ''));

  res.json(messages.slice(0, Number(limit)));
});

/**
 * On Paperclip server startup: restore all enabled channels
 */
export async function restoreChannels(): Promise<void> {
  const { data: channels } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('channel_type', 'zalo_personal')
    .eq('enabled', true);

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < (channels || []).length; i++) {
    const ch = channels![i];
    try {
      // Stagger: wait 5s between each channel to avoid Zalo duplicate detection
      if (i > 0) {
        console.log(`[Zalo] Waiting 5s before starting next channel...`);
        await delay(5000);
      }
      const channel = new ZaloPersonalChannel(ch.name, ch.display_name);
      const success = await channel.startFromDB();
      if (success) {
        activeChannels.set(ch.name, channel);
        console.log(`[Zalo:${ch.display_name}] Restored channel: ${ch.name}`);
      }
    } catch (err: any) {
      console.error(`[Zalo:${ch.display_name}] Failed to restore ${ch.name}:`, err.message);
    }
  }
}

export default router;
