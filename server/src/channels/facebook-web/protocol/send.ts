// packages/server/src/channels/facebook-web/protocol/send.ts
//
// Outbound send for FB Web channel.
//
// VERIFIED via Phase 7 live capture: FB Business Suite sends DMs via MQTT
// /ls_req task submission (label "46"), NOT GraphQL. Wire format is decoded
// in ls-tasks.ts.
//
// Comment replies still use GraphQL HTTP (TODO_CAPTURE — will be Phase 7b
// when first comment-reply capture is run).
//
// Image upload still uses the multipart /ajax/upload/photo/ HTTP endpoint.

import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import { FbCookieManager } from './cookies.js';
import { browserHeaders, fbWebRateLimiter, randomDelay } from './anti-detect.js';
import { graphqlPost } from './graphql.js';
import { buildSendTextRequest, buildTypingIndicator } from './ls-tasks.js';
import type { FbBootstrapTokens, FbSendResult, FbWebSession } from './message.js';
import type { FbWebListener } from './listener.js';

interface SendCtx {
  session: FbWebSession;
  cookies: FbCookieManager;
  tokens: FbBootstrapTokens;
  /** Active MQTT listener — required for DM send (uses /ls_req publish) */
  listener: FbWebListener | null;
  channelKey: string;
}

/**
 * Send a DM text message via MQTT /ls_req publish.
 * Fire-and-forget optimistic: returns success immediately with otid; server
 * confirmation arrives later via /ls_resp + replaceOptimsiticMessage opcode.
 */
export async function sendDMText(
  ctx: SendCtx,
  threadId: string,
  text: string,
): Promise<FbSendResult> {
  if (!ctx.listener) {
    return { success: false, error: 'MQTT listener not connected — cannot send' };
  }

  // Rate limit
  const rate = fbWebRateLimiter.record(ctx.channelKey);
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded: ${rate.currentCount}/hour. Retry after ${Math.round((rate.retryAfterMs || 0) / 1000)}s`,
    };
  }

  // Anti-detect: random delay before send (mimic typing)
  await randomDelay();

  // Typing indicator briefly before send (mimic human composition)
  try {
    const typingReq = buildTypingIndicator(threadId, true);
    ctx.listener.publishLsReq(JSON.parse(typingReq.body));
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
  } catch {
    // Non-fatal — proceed with send
  }

  try {
    const sendReq = buildSendTextRequest(threadId, text);
    // listener.publishLsReq expects object (it JSON.stringifies internally)
    ctx.listener.publishLsReq(JSON.parse(sendReq.body));

    // Stop typing
    try {
      const stopTyping = buildTypingIndicator(threadId, false);
      ctx.listener.publishLsReq(JSON.parse(stopTyping.body));
    } catch {
      // ignore
    }

    return { success: true, message_id: sendReq.otid };
  } catch (err: any) {
    return { success: false, error: `Publish failed: ${err.message}` };
  }
}

/**
 * Reply to a Facebook Page comment with a text message.
 * Uses CometFeedCommentCreateMutation GraphQL HTTP (doc_id TBD — Phase 7b capture).
 *
 * NOTE: Until doc_id captured, this throws "TODO_CAPTURE" error.
 */
export async function sendCommentReply(
  ctx: SendCtx,
  commentId: string,
  text: string,
): Promise<FbSendResult> {
  const rate = fbWebRateLimiter.record(ctx.channelKey);
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded: ${rate.currentCount}/hour. Retry after ${Math.round((rate.retryAfterMs || 0) / 1000)}s`,
    };
  }

  await randomDelay();

  const variables = {
    input: {
      attribution_id_v2: 'CometFeedCommentCreateMutation',
      client_mutation_id: String(Math.floor(Math.random() * 1000)),
      actor_id: ctx.session.credentials.page.page_id,
      message: { text },
      feedback_id: Buffer.from(`feedback:${commentId}`).toString('base64'),
      reply_to_comment_id: commentId,
      source: 'BIZ_INBOX',
    },
  };

  try {
    const res = await graphqlPost({
      cookies: ctx.cookies,
      tokens: ctx.tokens,
      userAgent: ctx.session.credentials.user_agent,
      op: 'COMMENT_REPLY',
      variables,
      cUser: ctx.session.credentials.c_user,
    });
    const commentNodeId = res?.data?.comment_create?.feedback_comment_edge?.node?.id;
    return { success: true, message_id: String(commentNodeId || '') };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload an image to FB's photo CDN; returns the photo fbid.
 * Endpoint: https://www.facebook.com/ajax/upload/photo/ (multipart).
 * TODO Phase 7b: verify endpoint with live capture of image-send action.
 */
export async function uploadImage(
  ctx: SendCtx,
  filePath: string,
): Promise<{ success: boolean; fbid?: string; error?: string }> {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }
  const stat = fs.statSync(filePath);
  if (stat.size > 25 * 1024 * 1024) {
    return { success: false, error: `Image > 25MB (FB limit)` };
  }

  const form = new FormData();
  form.append('source', fs.createReadStream(filePath));
  form.append('av', ctx.session.credentials.c_user);
  form.append('__user', ctx.session.credentials.c_user);
  form.append('__a', '1');
  form.append('fb_dtsg', ctx.tokens.fb_dtsg);
  form.append('jazoest', ctx.tokens.jazoest);
  form.append('lsd', ctx.tokens.lsd);
  form.append('target_id', ctx.session.credentials.page.page_id);

  const cookieHeader = ctx.cookies.buildCookieHeaderForHost('www.facebook.com');

  try {
    const res = await axios.post('https://www.facebook.com/ajax/upload/photo/', form, {
      headers: {
        ...browserHeaders(ctx.session.credentials.user_agent),
        ...form.getHeaders(),
        Origin: 'https://www.facebook.com',
        Referer: 'https://business.facebook.com/',
        'x-fb-lsd': ctx.tokens.lsd,
        Cookie: cookieHeader,
      },
      timeout: 60_000,
      maxBodyLength: 30 * 1024 * 1024,
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      return { success: false, error: `Upload HTTP ${res.status}` };
    }
    let body = res.data;
    if (typeof body === 'string') {
      body = body.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/, '');
      try {
        body = JSON.parse(body);
      } catch {
        return { success: false, error: 'Upload response not JSON' };
      }
    }
    const fbid = body?.payload?.fbid || body?.fbid;
    if (!fbid) return { success: false, error: `Upload: no fbid in response` };
    return { success: true, fbid: String(fbid) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a DM with an image attachment.
 * For now: upload then send caption text (no native attachment mid binding yet).
 * Phase 7b: capture image-send-with-attachment LS task payload to support
 * proper attachment_id linkage in the /ls_req task.
 */
export async function sendDMImage(
  ctx: SendCtx,
  threadId: string,
  filePath: string,
  caption?: string,
): Promise<FbSendResult> {
  const up = await uploadImage(ctx, filePath);
  if (!up.success || !up.fbid) return { success: false, error: `Upload failed: ${up.error}` };

  const captionResult = await sendDMText(ctx, threadId, caption || `[Image] (fbid: ${up.fbid})`);
  return captionResult;
}
