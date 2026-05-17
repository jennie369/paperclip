// packages/server/src/channels/facebook-web/routes.ts
//
// REST API for Facebook Web (Reverse Protocol) channel.
// Mounted at /api/channels/facebook-web/* in app.ts.

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { FacebookWebChannel } from './channel.js';
import { supabase } from './supabase.js';

// Upload dir for image attachments
const uploadDir = path.resolve(process.env.UPLOAD_DIR || '/tmp/paperclip-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image uploads supported'));
  },
});

const router = Router();

// In-memory cache of active channels (name → instance)
const activeChannels = new Map<string, FacebookWebChannel>();

/** Resolve / lazy-instantiate a channel by name */
async function resolveChannel(name: string): Promise<FacebookWebChannel | null> {
  let ch = activeChannels.get(name);
  if (ch) return ch;

  const { data } = await supabase
    .from('channel_instances')
    .select('name, display_name, channel_type')
    .eq('name', name)
    .eq('channel_type', 'facebook_web')
    .single();
  if (!data) return null;

  ch = new FacebookWebChannel(data.name, data.display_name || data.name);
  const ok = await ch.startFromDB();
  if (!ok) return null;
  activeChannels.set(name, ch);
  return ch;
}

// ──────────────────────────────────────────────────────────────────────
// GET / — list FB Web channels
// ──────────────────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('channel_type', 'facebook_web')
    .order('created_at', { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data || []);
});

// ──────────────────────────────────────────────────────────────────────
// POST /setup — initial setup with cookies JSON
// Body: { channel_name, display_name?, page_id, page_name?, cookies: FbCookie[], user_agent? }
// ──────────────────────────────────────────────────────────────────────
router.post('/setup', async (req: Request, res: Response) => {
  const { channel_name, display_name, page_id, page_name, cookies, user_agent } = req.body;

  if (!channel_name || !page_id || !cookies) {
    res.status(400).json({ error: 'channel_name, page_id, cookies required' });
    return;
  }
  if (!Array.isArray(cookies) || cookies.length === 0) {
    res.status(400).json({ error: 'cookies must be a non-empty array' });
    return;
  }

  const ch = new FacebookWebChannel(channel_name, display_name);
  const setup = await ch.setupFromCookies({ pageId: page_id, pageName: page_name, cookies, userAgent: user_agent });
  if (!setup.success) {
    res.status(400).json({ success: false, error: setup.error });
    return;
  }

  try {
    await ch.startAfterSetup();
    activeChannels.set(channel_name, ch);
    res.json({ success: true, status: 'connecting' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `start error: ${err.message}` });
  }
});

// ──────────────────────────────────────────────────────────────────────
// GET /:name/verify — sanity-check session (cookies + tokens still valid)
// ──────────────────────────────────────────────────────────────────────
router.get('/:name/verify', async (req: Request<{ name: string }>, res: Response) => {
  const ch = await resolveChannel(req.params.name);
  if (!ch) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  res.json({ name: req.params.name, running: ch.isRunning() });
});

// ──────────────────────────────────────────────────────────────────────
// POST /:name/restart — force reconnect
// ──────────────────────────────────────────────────────────────────────
router.post('/:name/restart', async (req: Request<{ name: string }>, res: Response) => {
  const name = req.params.name;
  const existing = activeChannels.get(name);
  if (existing) {
    await existing.stop();
    activeChannels.delete(name);
  }
  const ch = new FacebookWebChannel(name);
  const ok = await ch.startFromDB();
  if (!ok) {
    res.status(404).json({ error: 'Channel not found or failed to restart' });
    return;
  }
  activeChannels.set(name, ch);
  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────
// POST /:name/send — manual send (UI manual send box in UnifiedInbox)
// Body: { thread_id, message }
// ──────────────────────────────────────────────────────────────────────
router.post('/:name/send', async (req: Request<{ name: string }>, res: Response) => {
  const { thread_id, message } = req.body;
  if (!thread_id || !message) {
    res.status(400).json({ error: 'thread_id + message required' });
    return;
  }
  const ch = await resolveChannel(req.params.name);
  if (!ch) {
    res.status(404).json({ error: 'Channel not connected' });
    return;
  }
  try {
    const result = await ch.send(thread_id, message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────
// POST /:name/comment-reply — reply to a FB comment
// Body: { comment_id, message }
// ──────────────────────────────────────────────────────────────────────
router.post('/:name/comment-reply', async (req: Request<{ name: string }>, res: Response) => {
  const { comment_id, message } = req.body;
  if (!comment_id || !message) {
    res.status(400).json({ error: 'comment_id + message required' });
    return;
  }
  const ch = await resolveChannel(req.params.name);
  if (!ch) {
    res.status(404).json({ error: 'Channel not connected' });
    return;
  }
  try {
    const result = await ch.sendCommentReplyText(comment_id, message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────
// POST /:name/upload — image upload + DM send
// Multipart: file=<image>, thread_id=..., caption=...
// ──────────────────────────────────────────────────────────────────────
router.post('/:name/upload', upload.single('file'), async (req: Request<{ name: string }>, res: Response) => {
  const { thread_id, caption } = req.body;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!thread_id || !file) {
    res.status(400).json({ error: 'thread_id + file required' });
    return;
  }
  const ch = await resolveChannel(req.params.name);
  if (!ch) {
    res.status(404).json({ error: 'Channel not connected' });
    return;
  }
  try {
    const result = await ch.sendImage(thread_id, file.path, caption);
    fs.unlink(file.path, () => {
      /* best effort cleanup */
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────
// DELETE /:name — stop and remove a channel
// ──────────────────────────────────────────────────────────────────────
router.delete('/:name', async (req: Request<{ name: string }>, res: Response) => {
  const name = req.params.name;
  const existing = activeChannels.get(name);
  if (existing) {
    await existing.stop();
    activeChannels.delete(name);
  }
  await supabase.from('channel_instances').delete().eq('name', name).eq('channel_type', 'facebook_web');
  res.json({ success: true });
});

export default router;

// Export for app.ts startup wiring (resume all channels on boot)
export async function resumeAllFacebookWebChannels(): Promise<void> {
  const { data } = await supabase
    .from('channel_instances')
    .select('name, display_name')
    .eq('channel_type', 'facebook_web')
    .eq('enabled', true);
  if (!data?.length) return;

  for (const row of data) {
    try {
      const ch = new FacebookWebChannel(row.name, row.display_name || row.name);
      const ok = await ch.startFromDB();
      if (ok) {
        activeChannels.set(row.name, ch);
        console.log(`[FbWebStartup] Resumed ${row.name}`);
      } else {
        console.warn(`[FbWebStartup] Failed to resume ${row.name}`);
      }
    } catch (err: any) {
      console.error(`[FbWebStartup] ${row.name}:`, err.message);
    }
  }
}
