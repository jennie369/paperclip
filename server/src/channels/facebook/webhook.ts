// Facebook Webhook — Messenger DMs + Comment auto-reply
// Handles: inbound DMs (entry.messaging), inbound comments (entry.changes feed),
// outbound dispatch (DM via Messenger API, comment reply via Graph API)
// Integrates with the Channel-Agent Auto-Reply consumer pipeline via bus.publishInbound()

import { Router, type Request, type Response } from 'express';
import { bus } from '../bus.js';
import { supabase } from '../zalo-personal/supabase.js';
import type { InboundMessage, OutboundMessage } from '../types.js';

const router = Router();

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'gemral-fb-webhook-verify-2026';
const GRAPH_API = 'https://graph.facebook.com/v24.0';

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

  // Skip messages sent BY the page (echo)
  if (event.message?.is_echo) return;

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

    // Log to channel_sent_messages for audit trail (non-blocking)
    void supabase.from('channel_sent_messages').insert({
      channel_name: PAGE_CHANNEL[page_id] || `fb-${page_id}`,
      thread_id: recipient_id,
      thread_type: 'dm',
      to_uid: recipient_id,
      body: typeof message === 'string' ? message : JSON.stringify(message),
      content_type: 'text',
      status: 'sent',
      sent_by: 'api',
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

  try {
    if (peerKind === 'comment' && commentId) {
      // ── Comment reply: POST /{comment_id}/comments ──
      const fbRes = await fetch(`${GRAPH_API}/${commentId}/comments?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.content }),
      });

      const result = await fbRes.json();
      if (result.error) {
        console.error(`[FB] Outbound comment reply error on ${msg.channel}:`, result.error);
        return;
      }

      console.log(`[FB] Comment reply sent on ${msg.channel} → ${commentId}: "${msg.content.slice(0, 60)}"`);
    } else {
      // ── Messenger DM: POST /{page_id}/messages ──
      const fbRes = await fetch(`${GRAPH_API}/${pageId}/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: msg.chatId },
          message: { text: msg.content },
          messaging_type: 'RESPONSE',
        }),
      });

      const result = await fbRes.json();
      if (result.error) {
        console.error(`[FB] Outbound DM error on ${msg.channel}:`, result.error);
        return;
      }

      console.log(`[FB] DM sent on ${msg.channel} → ${msg.chatId}: "${msg.content.slice(0, 60)}"`);
    }

    // Log to channel_sent_messages (non-blocking)
    void supabase.from('channel_sent_messages').insert({
      channel_name: msg.channel,
      thread_id: peerKind === 'comment' ? commentId : msg.chatId,
      thread_type: peerKind === 'comment' ? 'comment' : 'dm',
      to_uid: msg.chatId,
      body: msg.content,
      content_type: 'text',
      status: 'sent',
      sent_by: msg.metadata?.agentSlug || 'system',
    }).then(() => {}, () => {});
  } catch (err: any) {
    console.error(`[FB] Outbound send failed on ${msg.channel}:`, err.message);
  }
});

export default router;
