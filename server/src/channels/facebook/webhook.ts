// Facebook Webhook — Messenger DMs + Comment auto-reply
// Handles: inbound DMs (entry.messaging), inbound comments (entry.changes feed),
// outbound dispatch (DM via Messenger API, comment reply via Graph API)
// Integrates with the Channel-Agent Auto-Reply consumer pipeline via bus.publishInbound()

import { Router, type Request, type Response } from 'express';
import { promises as fsp } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { bus } from '../bus.js';
import { supabase } from '../zalo-personal/supabase.js';
import { deliverReplyOnce } from '../deliver-once.js';
import type { InboundMessage, OutboundMessage } from '../types.js';

const router = Router();

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'gemral-fb-webhook-verify-2026';
const GRAPH_API = 'https://graph.facebook.com/v24.0';

// ─── OAuth (Facebook Login for Business) — lấy Page token mới khớp app 998 ───
const FB_APP_ID = process.env.FB_APP_ID || '';
const FB_LOGIN_CONFIG_ID = process.env.FB_LOGIN_CONFIG_ID || '';
const FB_REDIRECT_URI =
  process.env.FB_REDIRECT_URI ||
  'https://gemops.gemcapitalholding.com/api/channels/facebook/oauth/callback';

// Page ID → tên biến .env để ghi đè token bền qua restart
const PAGE_ENV_KEY: Record<string, string> = {
  [process.env.FB_PAGE_ID_JENNIE || '101609408467458']: 'FB_PAGE_TOKEN_JENNIE',
  [process.env.FB_PAGE_ID_GEMRAL || '893324337205554']: 'FB_PAGE_TOKEN_GEMRAL',
  [process.env.FB_PAGE_ID_YINYANG || '844146582110162']: 'FB_PAGE_TOKEN_YINYANG',
};

// Page tokens map (loaded from env)
const PAGE_TOKENS: Record<string, string> = {};
if (process.env.FB_PAGE_TOKEN_JENNIE) PAGE_TOKENS[process.env.FB_PAGE_ID_JENNIE || '101609408467458'] = process.env.FB_PAGE_TOKEN_JENNIE;
if (process.env.FB_PAGE_TOKEN_GEMRAL) PAGE_TOKENS[process.env.FB_PAGE_ID_GEMRAL || '893324337205554'] = process.env.FB_PAGE_TOKEN_GEMRAL;
if (process.env.FB_PAGE_TOKEN_YINYANG) PAGE_TOKENS[process.env.FB_PAGE_ID_YINYANG || '844146582110162'] = process.env.FB_PAGE_TOKEN_YINYANG;

// Page ID → channel name mapping (dynamic from env + hardcoded fallbacks)
const PAGE_CHANNEL: Record<string, string> = {
  [process.env.FB_PAGE_ID_JENNIE || '101609408467458']: 'fb-jennie',
  [process.env.FB_PAGE_ID_GEMRAL || '893324337205554']: 'fb-gemral',
  [process.env.FB_PAGE_ID_YINYANG || '844146582110162']: 'fb-yinyang',
};

// Sender profile cache (avoid hammering Graph API)
const profileCache = new Map<string, { name: string; expiresAt: number }>();
const PROFILE_CACHE_TTL = 3600_000; // 1 hour

/**
 * GET /api/channels/facebook/webhook — Facebook verification handshake
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    console.log('[FB] Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.warn('[FB] Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /api/channels/facebook/webhook — receive inbound messages
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object !== 'page') {
    res.sendStatus(404);
    return;
  }

  // Always respond 200 quickly to avoid Facebook retry storms
  res.sendStatus(200);

  // Process entries asynchronously
  for (const entry of body.entry || []) {
    const pageId = entry.id;
    const channelName = PAGE_CHANNEL[pageId];
    if (!channelName) {
      console.warn(`[FB] Unknown page ID: ${pageId}`);
      continue;
    }

    for (const event of entry.messaging || []) {
      try {
        await handleMessagingEvent(pageId, channelName, event);
      } catch (err: any) {
        console.error(`[FB] Error handling messaging event:`, err.message);
      }
    }

    // Handle feed changes (comments on posts)
    for (const change of entry.changes || []) {
      if (change.field === 'feed' && change.value?.item === 'comment') {
        try {
          await handleCommentEvent(pageId, channelName, change.value);
        } catch (err: any) {
          console.error(`[FB] Error handling comment event:`, err.message);
        }
      }
    }
  }
});

/**
 * Process a single messaging event from Facebook.
 * Resolves sender profile, builds InboundMessage, and publishes to the bus.
 */
async function handleMessagingEvent(pageId: string, channelName: string, event: any): Promise<void> {
  const senderId: string = event.sender?.id;

  // ── ECHO = tin do PAGE gửi (bot Send API / chị gõ tay Messenger / facebook-web / Business Suite) ──
  // Track B (plan CSKH-BOT-PAUSE-UX): trước đây nuốt SẠCH → tin chị gõ tay Messenger vô hình với agent.
  // Ghi sổ 'manual_fb' để Track A tiêm cho agent thấy (KHÔNG auto-pause — OD-2). Phân loại phòng thủ
  // nhiều lớp (app_id KHÔNG đủ: facebook-web dùng BUSINESS_APP_ID trùng Page inbox — vòng 1 ROLL-F2).
  if (event.message?.is_echo) {
    await handleEchoEvent(channelName, event).catch((err) =>
      console.error('[FB echo] handler failed:', err?.message || err));
    return;
  }

  // Skip if no message content and no postback
  if (!event.message && !event.postback) return;

  const messageText: string = event.message?.text || event.postback?.payload || '';
  const attachments: any[] = event.message?.attachments || [];
  const messageId: string = event.message?.mid || `postback_${Date.now()}`;
  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

  // Resolve sender name from Graph API (cached)
  const senderName = await resolveSenderName(senderId, pageId);

  console.log(`[FB] Message from ${senderName} on ${channelName}: ${messageText.slice(0, 100)}`);

  // Build content: text + attachment descriptions
  let content = messageText;
  if (attachments.length > 0) {
    const attachInfo = attachments
      .map((a: any) => `[${a.type}: ${a.payload?.url || 'no-url'}]`)
      .join(' ');
    content = content ? `${content}\n${attachInfo}` : attachInfo;
  }

  // Build media array for attachments
  const media = attachments
    .filter((a: any) => a.payload?.url)
    .map((a: any) => ({
      url: a.payload.url as string,
      mimeType: a.type === 'image' ? 'image/jpeg' : a.type === 'video' ? 'video/mp4' : 'application/octet-stream',
      filename: undefined,
    }));

  // Publish to the consumer pipeline via bus (handles persistence + agent routing)
  const inbound: InboundMessage = {
    id: messageId,
    channel: channelName,
    channelType: 'facebook',
    chatId: senderId, // FB DMs use sender PSID as thread ID
    senderId,
    senderName,
    content,
    contentType: attachments.length > 0 && !messageText ? 'image' : 'text',
    media: media.length > 0 ? media : undefined,
    peerKind: 'direct', // FB Messenger is always DM
    metadata: {
      platform: 'facebook',
      page_id: pageId,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    timestamp,
    dedupeKey: `fb:${channelName}:${senderId}:${messageId}`,
  };

  await bus.publishInbound(inbound);
}

/** Postgres unique-violation (idx_csm_platform_mid) — race 2 webhook cùng mid → 1 thắng, bỏ qua. */
function isDupErr(err: { code?: string } | null | undefined): boolean {
  return err?.code === '23505';
}

/**
 * Xử lý ECHO của Facebook (tin do Page gửi). Ghi 'manual_fb' CHỈ khi là tin NGƯỜI gõ tay,
 * KHÔNG ghi cho tin bot (Send API / facebook-web / Business Suite auto-reply).
 * ⚠️ Cần bật field webhook `message_echoes` ở App Dashboard mỗi Page, nếu không echo không về.
 */
async function handleEchoEvent(channelName: string, event: any): Promise<void> {
  const threadId: string | undefined = event.recipient?.id; // ECHO: recipient = KHÁCH (sender = Page!)
  const mid: string | undefined = event.message?.mid;
  if (!threadId || !mid) return;

  const text: string = event.message?.text || '';
  const attachments: any[] = event.message?.attachments || [];
  const appId: string | null = event.message?.app_id != null ? String(event.message.app_id) : null;
  const body = text || (attachments.length ? '[đính kèm]' : '');

  // Lớp (b) — LƯỚI CHÍNH: đối chiếu tin hệ-thống-mình vừa gửi theo (thread_id, body, 5') trên MỌI
  // channel (bot Send API đã stamp mid, bot facebook-web, auto-reply Business Suite). Không phụ thuộc app_id.
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: recent } = await supabase
    .from('channel_sent_messages')
    .select('id, platform_message_id')
    .eq('thread_id', threadId)
    .eq('body', body)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  if (recent && recent.length > 0) {
    // Tin của hệ thống mình → chỉ stamp mid nếu chưa có (để echo sau tra trúng), KHÔNG insert bản thứ 2.
    const row = recent[0] as { id: string; platform_message_id: string | null };
    if (!row.platform_message_id) {
      const { error } = await supabase.from('channel_sent_messages')
        .update({ platform_message_id: mid }).eq('id', row.id);
      if (error && !isDupErr(error)) console.warn('[FB echo] stamp mid failed:', error.message);
    }
    return;
  }

  // Lớp (a) — DỰ PHÒNG: app_id trùng app bot Send API của mình mà body-match trượt (chưa kịp ghi row)
  //           → vẫn coi là bot, KHÔNG ghi manual. facebook-web/Business Suite đã do lớp (b) bắt.
  if (appId && FB_APP_ID && appId === FB_APP_ID) {
    console.log(`[FB echo] app_id=${appId} khớp app bot Send API (body-match trượt) → coi là bot, skip`);
    return;
  }

  // Lớp (c) — còn lại = chị/nhân viên GÕ TAY trong Messenger/Page inbox → ghi sổ manual_fb cho Track A.
  const media = attachments.filter((a: any) => a.payload?.url).map((a: any) => a.payload.url as string);
  const { error } = await supabase.from('channel_sent_messages').insert({
    channel_name: channelName,
    thread_id: threadId,
    thread_type: 'dm',
    to_uid: threadId,
    body: body || '[Tin nhân viên]',
    content_type: attachments.length > 0 && !text ? 'image' : 'text',
    media: media.length > 0 ? media : null,
    status: 'sent',
    sent_by: 'manual_fb',
    platform_message_id: mid,
  });
  if (error && !isDupErr(error)) console.error('[FB echo] insert manual_fb failed:', error.message);
  else if (!error) console.log(`[FB echo] ✓ manual_fb logged thread=${threadId}: ${body.slice(0, 50)}`);
}

/**
 * Process a comment event from Facebook feed webhook.
 * Builds InboundMessage with peerKind='comment' and publishes to the bus.
 */
async function handleCommentEvent(pageId: string, channelName: string, value: any): Promise<void> {
  const commentId: string = value.comment_id;
  const senderId: string = value.from?.id;
  const senderName: string = value.from?.name || senderId;
  const message: string = value.message || '';
  const postId: string = value.post_id;
  const parentId: string | undefined = value.parent_id;
  const createdTime: string | undefined = value.created_time;

  // Skip if the comment is from the page itself (page's own reply)
  if (senderId === pageId) {
    console.log(`[FB] Skipping own comment on ${channelName}: ${commentId}`);
    return;
  }

  // Skip if no message content
  if (!message.trim()) {
    console.log(`[FB] Skipping empty comment on ${channelName}: ${commentId}`);
    return;
  }

  const timestamp = createdTime ? new Date(parseInt(createdTime) * 1000) : new Date();

  console.log(`[FB] Comment from ${senderName} on ${channelName} (post=${postId}): ${message.slice(0, 100)}`);

  // Build InboundMessage — chatId is post_id so all comments on same post share one conversation
  const inbound: InboundMessage = {
    id: commentId,
    channel: channelName,
    channelType: 'facebook',
    chatId: postId, // Group conversation by post
    senderId,
    senderName,
    content: message,
    contentType: 'text',
    peerKind: 'comment',
    metadata: {
      platform: 'facebook',
      page_id: pageId,
      comment_id: commentId,
      post_id: postId,
      parent_id: parentId,
    },
    timestamp,
    dedupeKey: `fb:${channelName}:comment:${commentId}`,
  };

  await bus.publishInbound(inbound);
}

/**
 * Resolve sender name from Facebook Graph API with caching.
 */
async function resolveSenderName(senderId: string, pageId: string): Promise<string> {
  const cacheKey = `${pageId}:${senderId}`;
  const cached = profileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name;
  }

  const token = PAGE_TOKENS[pageId];
  if (!token) return senderId;

  try {
    const profileRes = await fetch(
      `${GRAPH_API}/${senderId}?fields=first_name,last_name,profile_pic&access_token=${token}`
    );
    if (profileRes.ok) {
      const profile = await profileRes.json();
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || senderId;
      profileCache.set(cacheKey, { name, expiresAt: Date.now() + PROFILE_CACHE_TTL });
      return name;
    }
  } catch {
    // Non-fatal — fall back to sender ID
  }

  return senderId;
}

/**
 * POST /api/channels/facebook/send — send a message to a Facebook user
 * Body: { page_id, recipient_id, message, message_type? }
 */
router.post('/send', async (req: Request, res: Response) => {
  const { page_id, recipient_id, message, message_type } = req.body;

  if (!page_id || !recipient_id || !message) {
    res.status(400).json({ error: 'Missing page_id, recipient_id, or message' });
    return;
  }

  const token = PAGE_TOKENS[page_id];
  if (!token) {
    res.status(400).json({ error: `No token configured for page ${page_id}` });
    return;
  }

  try {
    const fbRes = await fetch(`${GRAPH_API}/${page_id}/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipient_id },
        message: typeof message === 'string' ? { text: message } : message,
        messaging_type: message_type || 'RESPONSE',
      }),
    });

    const result = await fbRes.json();
    if (result.error) {
      console.error(`[FB] Send error:`, result.error);
      res.status(400).json({ error: result.error.message });
      return;
    }

    // Log to channel_sent_messages for audit trail (non-blocking).
    // B5 (Track B): STAMP platform_message_id = mid Send API trả về → khi echo của tin BOT này
    // về, lớp (b) body-match / unique index tra trúng, KHÔNG ghi nhầm thành 'manual_fb' (vòng 1 RACE-F15).
    void supabase.from('channel_sent_messages').insert({
      channel_name: PAGE_CHANNEL[page_id] || `fb-${page_id}`,
      thread_id: recipient_id,
      thread_type: 'dm',
      to_uid: recipient_id,
      body: typeof message === 'string' ? message : JSON.stringify(message),
      content_type: 'text',
      status: 'sent',
      sent_by: 'api',
      platform_message_id: result.message_id || null,
    }).then(() => {}, () => {});

    res.json({ success: true, message_id: result.message_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/channels/facebook/comment-reply — reply to a Facebook comment
 * Body: { page_id, comment_id, message }
 */
router.post('/comment-reply', async (req: Request, res: Response) => {
  const { page_id, comment_id, message } = req.body;

  if (!page_id || !comment_id || !message) {
    res.status(400).json({ error: 'Missing page_id, comment_id, or message' });
    return;
  }

  const token = PAGE_TOKENS[page_id];
  if (!token) {
    res.status(400).json({ error: `No token configured for page ${page_id}` });
    return;
  }

  try {
    const fbRes = await fetch(`${GRAPH_API}/${comment_id}/comments?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const result = await fbRes.json();
    if (result.error) {
      console.error(`[FB] Comment reply error:`, result.error);
      res.status(400).json({ error: result.error.message });
      return;
    }

    // Log to channel_sent_messages for audit trail (non-blocking)
    void supabase.from('channel_sent_messages').insert({
      channel_name: PAGE_CHANNEL[page_id] || `fb-${page_id}`,
      thread_id: comment_id,
      thread_type: 'comment',
      to_uid: comment_id,
      body: message,
      content_type: 'text',
      status: 'sent',
      sent_by: 'api',
    }).then(() => {}, () => {});

    res.json({ success: true, comment_id: result.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/channels/facebook/pages — list configured pages and their status
 */
router.get('/pages', (_req: Request, res: Response) => {
  const pages = Object.entries(PAGE_CHANNEL).map(([pageId, channelName]) => ({
    page_id: pageId,
    channel_name: channelName,
    has_token: !!PAGE_TOKENS[pageId],
  }));
  res.json(pages);
});

// ─── Reverse lookup: channel name → page ID ───
const CHANNEL_PAGE: Record<string, string> = {};
for (const [pageId, channelName] of Object.entries(PAGE_CHANNEL)) {
  CHANNEL_PAGE[channelName] = pageId;
}

/**
 * Outbound message handler: subscribe to bus outbound events for fb-* channels.
 * Routes to Messenger send (DMs) or comment reply (comments) based on peerKind.
 */
bus.on('outbound', async (msg: OutboundMessage) => {
  const pageId = CHANNEL_PAGE[msg.channel];
  if (!pageId) return; // Not a Facebook channel — skip

  const token = PAGE_TOKENS[pageId];
  if (!token) {
    console.warn(`[FB] No token for outbound on ${msg.channel}`);
    return;
  }

  const peerKind = msg.metadata?.peerKind as string | undefined;
  const commentId = msg.metadata?.comment_id as string | undefined;
  const threadId = (peerKind === 'comment' ? commentId : msg.chatId) as string;
  const threadType = peerKind === 'comment' ? 'comment' : 'dm';

  // The customer-visible send (Graph API). Throws on a Graph error so the Reply
  // Gateway (or the manual catch below) treats it as failed (Codex F2).
  const doSend = async (): Promise<{ platformMessageId: string | null }> => {
    if (peerKind === 'comment' && commentId) {
      const fbRes = await fetch(`${GRAPH_API}/${commentId}/comments?access_token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.content }),
      });
      const result = await fbRes.json();
      if (result.error) throw new Error(`FB comment reply error: ${JSON.stringify(result.error)}`);
      console.log(`[FB] Comment reply sent on ${msg.channel} → ${commentId}: "${msg.content.slice(0, 60)}"`);
      return { platformMessageId: result.id ?? null };
    } else {
      const fbRes = await fetch(`${GRAPH_API}/${pageId}/messages?access_token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: msg.chatId }, message: { text: msg.content }, messaging_type: 'RESPONSE' }),
      });
      const result = await fbRes.json();
      if (result.error) throw new Error(`FB DM error: ${JSON.stringify(result.error)}`);
      console.log(`[FB] DM sent on ${msg.channel} → ${msg.chatId}: "${msg.content.slice(0, 60)}"`);
      return { platformMessageId: result.message_id ?? null };
    }
  };

  const logRow = {
    channel_name: msg.channel, thread_id: threadId, thread_type: threadType,
    to_uid: msg.chatId, body: msg.content, content_type: 'text',
    sent_by: msg.metadata?.agentSlug || 'system',
  };

  try {
    if (msg.dedupeKey) {
      // Reply Gateway: claim-before-send owns the channel_sent_messages row.
      await deliverReplyOnce(msg.dedupeKey, logRow, doSend);
    } else {
      // Manual path (no idempotency key): send + best-effort log, unchanged.
      await doSend();
      void supabase.from('channel_sent_messages').insert({ ...logRow, status: 'sent' }).then(() => {}, () => {});
    }
  } catch (err: any) {
    console.error(`[FB] Outbound send failed on ${msg.channel}:`, err.message);
  }
});

// ─── Token setter: nạp nóng in-memory + đăng ký routing map + ghi .env (OD-1 A) ───
// (Opus CRITICAL F1) PHẢI đăng ký CẢ PAGE_CHANNEL + CHANNEL_PAGE, nếu không POST /webhook
// gặp pageId lạ → "Unknown page ID" → tin DROP CÂM.
async function setPageToken(pageId: string, token: string, channelName?: string): Promise<void> {
  PAGE_TOKENS[pageId] = token;
  const ch = channelName || PAGE_CHANNEL[pageId] || `fb-${pageId}`;
  PAGE_CHANNEL[pageId] = ch;
  CHANNEL_PAGE[ch] = pageId;

  // Ghi bền vào .env (chỉ 3 page đã biết có biến env; page lạ chỉ nạp nóng)
  const envKey = PAGE_ENV_KEY[pageId];
  if (!envKey) return;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = await fsp.readFile(envPath, 'utf8');
    const line = `${envKey}=${token}`;
    const re = new RegExp(`^${envKey}=.*$`, 'm');
    content = re.test(content) ? content.replace(re, line) : `${content.replace(/\s*$/, '')}\n${line}\n`;
    await fsp.writeFile(envPath, content, 'utf8');
    console.log(`[FB] Persisted ${envKey} to .env (page ${pageId} → ${ch})`);
  } catch (err: any) {
    console.warn(`[FB] Could not persist ${envKey} to .env:`, err.message);
  }
}

// CSRF state store (in-memory, TTL 10 phút) — Opus LOW F8
const oauthStates = new Map<string, number>();
function newState(): string {
  const s = randomUUID();
  oauthStates.set(s, Date.now() + 600_000);
  return s;
}
function consumeState(s: string): boolean {
  const exp = oauthStates.get(s);
  oauthStates.delete(s);
  return !!exp && exp > Date.now();
}

/**
 * GET /api/channels/facebook/oauth/start — bắt đầu luồng "Đăng nhập bằng Facebook"
 * → redirect tới Business Login dialog (config_id). User consent → callback.
 */
router.get('/oauth/start', (_req: Request, res: Response) => {
  if (!FB_APP_ID || !FB_LOGIN_CONFIG_ID) {
    res.status(500).send('Thiếu FB_APP_ID / FB_LOGIN_CONFIG_ID trong .env');
    return;
  }
  const state = newState();
  const url =
    `https://www.facebook.com/v24.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(FB_APP_ID)}` +
    `&config_id=${encodeURIComponent(FB_LOGIN_CONFIG_ID)}` +
    `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`;
  res.redirect(url);
});

/**
 * GET /api/channels/facebook/oauth/callback — nhận code → đổi ra Page token(s) never-expires,
 * lưu (.env + nạp nóng), auto-subscribe từng Page vào webhook app.
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const err = req.query.error_description as string | undefined;

  if (err) { res.status(400).send(`Facebook trả lỗi: ${err}`); return; }
  if (!code || !state || !consumeState(state)) {
    res.status(400).send('State không hợp lệ hoặc thiếu code (thử đăng nhập lại).');
    return;
  }

  const appSecret = process.env.FB_APP_SECRET || '';
  if (!FB_APP_ID || !appSecret) { res.status(500).send('Thiếu FB_APP_ID / FB_APP_SECRET.'); return; }

  try {
    // 1) code → short-lived user token
    const tokRes = await fetch(
      `${GRAPH_API}/oauth/access_token?client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
      `&code=${encodeURIComponent(code)}`
    );
    const tok = await tokRes.json();
    if (tok.error) throw new Error(`exchange code: ${JSON.stringify(tok.error)}`);
    const shortUserToken = tok.access_token as string;

    // 2) short → long-lived user token (page tokens dẫn xuất từ đây = never-expires)
    const llRes = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(shortUserToken)}`
    );
    const ll = await llRes.json();
    const longUserToken = (ll.error ? shortUserToken : ll.access_token) as string;

    // 3) /me/accounts → danh sách Page + page access_token
    const accRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(longUserToken)}`
    );
    const acc = await accRes.json();
    if (acc.error) throw new Error(`me/accounts: ${JSON.stringify(acc.error)}`);
    const pages: Array<{ id: string; name: string; access_token: string }> = acc.data || [];
    if (pages.length === 0) {
      res.status(200).send('Đăng nhập OK nhưng không có Page nào được cấp quyền. Thử lại và chọn Page.');
      return;
    }

    // 4) lưu token + 5) auto-subscribe từng Page vào webhook app
    const results: Array<{ name: string; id: string; subscribed: boolean }> = [];
    for (const p of pages) {
      await setPageToken(p.id, p.access_token, PAGE_CHANNEL[p.id]);
      let subscribed = false;
      try {
        const subRes = await fetch(
          `${GRAPH_API}/${p.id}/subscribed_apps?access_token=${encodeURIComponent(p.access_token)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'feed'] }),
          }
        );
        const sub = await subRes.json();
        subscribed = !!sub.success;
        if (sub.error) console.warn(`[FB] subscribe ${p.id}:`, JSON.stringify(sub.error));
      } catch (e: any) {
        console.warn(`[FB] subscribe ${p.id} failed:`, e.message);
      }
      console.log(`[FB] OAuth connected Page ${p.name} (${p.id}) → ${PAGE_CHANNEL[p.id]} · subscribed=${subscribed}`);
      results.push({ name: p.name, id: p.id, subscribed });
    }

    const rows = results
      .map((r) => `<li><b>${r.name}</b> (${r.id}) — ${r.subscribed ? '✅ đã kết nối webhook' : '⚠️ chưa subscribe'}</li>`)
      .join('');
    res.status(200).send(
      `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:560px;margin:48px auto;padding:0 16px">` +
      `<h2>✅ Đã kết nối Facebook</h2><p>Các Page đã lấy token mới (khớp app Gemral Growth) + đăng ký nhận tin:</p>` +
      `<ul>${rows}</ul><p style="color:#666">Bạn có thể đóng cửa sổ này.</p></body>`
    );
  } catch (e: any) {
    console.error('[FB] OAuth callback error:', e.message);
    res.status(500).send(`Lỗi khi lấy token: ${e.message}`);
  }
});

export default router;
