// packages/server/src/channels/facebook-web/channel.ts
//
// FacebookWebChannel — orchestrator class.
// Ported lifecycle pattern from zalo-personal/channel.ts:
//   - start (setup cookies → fetch tokens → connect MQTT)
//   - stop (clean disconnect)
//   - send (DM text + image via GraphQL)
//   - auto-reconnect (exponential backoff)
//   - health check (every 2 min)
//   - Telegram alert on disconnect (cooldown 30 min)

import https from 'https';
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { FbCookieManager } from './protocol/cookies.js';
import { FbWebListener } from './protocol/listener.js';
import {
  fetchBootstrapTokens,
  tokensFresh,
  validateCookies,
} from './protocol/auth.js';
void tokensFresh;
import {
  sendDMText,
  sendCommentReply,
  sendDMImage,
} from './protocol/send.js';
import {
  encryptCredentials,
  decryptCredentials,
} from './protocol/crypto.js';
import {
  generateDeviceId,
  generateSessionId,
  getUserAgent,
} from './protocol/anti-detect.js';
import type {
  FbWebCredentials,
  FbWebSession,
  FbBootstrapTokens,
  FbInboundEvent,
  FbSendResult,
  FbCookie,
} from './protocol/message.js';
import type { OutboundMessage } from '../types.js';

const MASTER_KEY =
  process.env.FACEBOOK_WEB_ENCRYPTION_KEY || 'gemral-fb-web-default-key-change-me';
const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '8782931741:AAF6v6ju5N5qF2EWFIKZg_5HTNr9yOnsiQ0';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6486938519';

// Health check every 2 minutes
const HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000;
// Reconnect backoff: 5s → 30s → 60s → 120s → 300s (5 min)
const RECONNECT_DELAYS_MS = [5_000, 30_000, 60_000, 120_000, 300_000];
// Alert cooldown 30 min per channel
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
// Token refresh window — re-fetch every 22h
const TOKEN_REFRESH_INTERVAL_MS = 22 * 60 * 60 * 1000;

const lastAlertAt = new Map<string, number>();

function sendTelegramAlert(channelName: string, text: string): void {
  const now = Date.now();
  const last = lastAlertAt.get(channelName) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(channelName, now);
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' });
  const req = https.request(
    {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    },
    (res) => {
      if (res.statusCode !== 200) {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => console.error('[FbWeb Telegram] Failed:', res.statusCode, d.substring(0, 200)));
      }
    },
  );
  req.on('error', (e) => console.error('[FbWeb Telegram] Error:', e.message));
  req.write(body);
  req.end();
}

export class FacebookWebChannel {
  private channelName: string;
  private displayName: string;
  private session: FbWebSession | null = null;
  private cookieMgr: FbCookieManager = new FbCookieManager();
  private listener: FbWebListener | null = null;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private lastConnectedAt: Date | null = null;
  private stopped = false;
  private isConnected = false;
  private busListenerInstalled = false;

  private get tag(): string {
    return `[FbWeb:${this.displayName}]`;
  }

  constructor(channelName: string, displayName?: string) {
    this.channelName = channelName;
    this.displayName = displayName || channelName;
  }

  // ──────────────────────────────────────────────────────────────────
  // Setup flow — user uploads cookies + selects page
  // ──────────────────────────────────────────────────────────────────

  /**
   * Initial setup with user-provided cookie JSON + page ID. Saves encrypted
   * credentials to DB. Does NOT start listener yet — caller invokes start().
   */
  async setupFromCookies(opts: {
    pageId: string;
    pageName?: string;
    cookies: FbCookie[];
    userAgent?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!opts.cookies?.length) return { success: false, error: 'No cookies provided' };
    if (!opts.pageId) return { success: false, error: 'page_id required' };

    // Build cookie manager + validate via FB homepage HEAD
    this.cookieMgr = new FbCookieManager();
    this.cookieMgr.importCookies(opts.cookies);

    const cUser = this.cookieMgr.get('c_user');
    if (!cUser) return { success: false, error: 'Missing c_user cookie — invalid session' };

    const ua = getUserAgent(opts.userAgent);
    const valid = await validateCookies(this.cookieMgr, ua);
    if (!valid) return { success: false, error: 'Cookies failed validation (expired, checkpoint, or login required)' };

    // Fetch fresh tokens from page inbox HTML
    let tokens: FbBootstrapTokens;
    let pageCtx;
    try {
      const r = await fetchBootstrapTokens(this.cookieMgr, opts.pageId, ua);
      tokens = r.tokens;
      pageCtx = r.page;
    } catch (err: any) {
      return { success: false, error: `Token fetch failed: ${err.message}` };
    }

    const credentials: FbWebCredentials = {
      cookies: this.cookieMgr.exportCookies(),
      user_agent: ua,
      device_id: generateDeviceId(),
      session_id: generateSessionId(),
      c_user: cUser,
      page: { ...pageCtx, page_name: opts.pageName || pageCtx.page_name },
      tokens,
    };

    this.session = { credentials, tokens };

    // Persist encrypted credentials
    const credJson = JSON.stringify(credentials);
    const { encrypted, iv, tag } = encryptCredentials(credJson, MASTER_KEY);

    const { error: upsertErr } = await supabase.from('channel_instances').upsert(
      {
        name: this.channelName,
        display_name: this.displayName,
        channel_type: 'facebook_web',
        credentials_encrypted: encrypted,
        credentials_iv: iv,
        credentials_tag: tag,
        status: 'connecting',
        enabled: true,
        last_connected_at: new Date().toISOString(),
      },
      { onConflict: 'name' },
    );
    if (upsertErr) {
      console.error(`${this.tag} DB upsert error:`, upsertErr);
      return { success: false, error: `DB upsert failed: ${upsertErr.message}` };
    }

    return { success: true };
  }

  /**
   * Resume from saved DB credentials (on server restart).
   */
  async startFromDB(): Promise<boolean> {
    const { data: instance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('name', this.channelName)
      .single();

    if (!instance?.credentials_encrypted) return false;

    try {
      const credJson = decryptCredentials(
        instance.credentials_encrypted,
        instance.credentials_iv,
        instance.credentials_tag,
        MASTER_KEY,
      );
      const credentials: FbWebCredentials = JSON.parse(credJson);

      this.cookieMgr = new FbCookieManager();
      this.cookieMgr.importCookies(credentials.cookies);
      this.session = {
        credentials,
        tokens: credentials.tokens || (await this.fetchFreshTokens(credentials)),
      };

      console.log(`${this.tag} Resuming from DB`);
      this.stopped = false;
      await this.startListening();
      this.installBusOutboundHandler();
      this.scheduleTokenRefresh();
      return true;
    } catch (err: any) {
      console.error(`${this.tag} startFromDB error:`, err.message);
      await this.updateStatus('error', err.message);
      return false;
    }
  }

  /**
   * Start listener immediately after setup (no DB roundtrip).
   */
  async startAfterSetup(): Promise<void> {
    if (!this.session) throw new Error('Must call setupFromCookies first');
    this.stopped = false;
    await this.startListening();
    this.installBusOutboundHandler();
    this.scheduleTokenRefresh();
  }

  // ──────────────────────────────────────────────────────────────────
  // MQTT lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startListening(): Promise<void> {
    if (!this.session) throw new Error('No session');
    this.isConnected = false;

    this.listener = new FbWebListener(this.session);

    this.listener.on('connected', async () => {
      this.isConnected = true;
      this.lastConnectedAt = new Date();
      if (this.reconnectAttempts > 0) {
        const now = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        sendTelegramAlert(
          this.channelName,
          `🟢 <b>FB Web online lại</b>: ${this.displayName}\nReconnect #${this.reconnectAttempts} thành công lúc ${now} ICT`,
        );
        this.reconnectAttempts = 0;
      }
      await this.updateStatus('connected', 'MQTT connected + LS subscribed');
    });

    this.listener.on('inbound', (event: FbInboundEvent) => {
      this.handleInboundEvent(event);
    });

    this.listener.on('disconnect', (reason) => {
      const wasConnected = this.isConnected;
      this.isConnected = false;
      if (wasConnected) {
        this.updateStatus('error', reason);
        this.scheduleReconnect(reason);
      }
    });

    this.listener.on('error', (err) => {
      console.error(`${this.tag} Listener error:`, err.message);
      const wasConnected = this.isConnected;
      this.isConnected = false;
      if (wasConnected) {
        this.updateStatus('error', err.message);
        this.scheduleReconnect(`error: ${err.message}`);
      }
    });

    this.startHealthCheck();
    await this.listener.start();
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopped || this.reconnectTimer) return;

    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
    console.log(`${this.tag} Reconnect in ${delay / 1000}s (attempt #${this.reconnectAttempts + 1}) — ${reason}`);

    if (this.reconnectAttempts === 0) {
      const now = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      sendTelegramAlert(
        this.channelName,
        `🔴 <b>FB Web offline</b>: ${this.displayName}\nLý do: ${reason}\nThời gian: ${now} ICT\nReconnect sau ${delay / 1000}s...`,
      );
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      try {
        this.listener?.stop();
      } catch {
        /* ignore */
      }
      this.listener = null;

      try {
        await this.startListening();
      } catch (err: any) {
        console.error(`${this.tag} Reconnect failed:`, err.message);
        this.scheduleReconnect(`reconnect error: ${err.message}`);
      }
    }, delay);
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(async () => {
      if (this.stopped) return;
      if (!this.isConnected && !this.reconnectTimer) {
        console.log(`${this.tag} Health check: disconnected, scheduling reconnect`);
        this.scheduleReconnect('health check detected offline');
      }
      // Additional checkpoint probe: if connected for > 10 min, occasionally
      // sanity-check that cookies aren't silently expired (FB sometimes
      // accepts MQTT pings but rejects HTTP requests when account in checkpoint).
      if (this.isConnected && this.session && Math.random() < 0.25) {
        try {
          const valid = await validateCookies(this.cookieMgr, this.session.credentials.user_agent);
          if (!valid) {
            console.warn(`${this.tag} Cookie validation failed during health check → marking banned`);
            this.isConnected = false;
            await this.updateStatus('banned', 'Cookie probe failed — possible checkpoint');
            sendTelegramAlert(
              this.channelName,
              `🔴 <b>FB Web checkpoint</b>: ${this.displayName}\nCookies từ chối từ FB. Cần re-paste cookies hoặc verify account.`,
            );
            this.listener?.stop();
            this.listener = null;
          }
        } catch {
          // Network blip — ignore
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    this.tokenRefreshTimer = setTimeout(async () => {
      if (this.stopped || !this.session) return;
      try {
        const fresh = await this.fetchFreshTokens(this.session.credentials);
        this.session.tokens = fresh;
        this.session.credentials.tokens = fresh;
        await this.persistCredentials();
        console.log(`${this.tag} Tokens refreshed`);
      } catch (err: any) {
        console.error(`${this.tag} Token refresh failed:`, err.message);
        sendTelegramAlert(
          this.channelName,
          `⚠️ <b>FB Web token refresh failed</b>: ${this.displayName}\nLý do: ${err.message}\nCần kiểm tra cookies có còn valid không.`,
        );
      } finally {
        this.scheduleTokenRefresh();
      }
    }, TOKEN_REFRESH_INTERVAL_MS);
  }

  private async fetchFreshTokens(credentials: FbWebCredentials): Promise<FbBootstrapTokens> {
    const r = await fetchBootstrapTokens(this.cookieMgr, credentials.page.page_id, credentials.user_agent);
    return r.tokens;
  }

  // ──────────────────────────────────────────────────────────────────
  // Inbound message → bus
  // ──────────────────────────────────────────────────────────────────

  private async handleInboundEvent(event: FbInboundEvent): Promise<void> {
    // Only emit "message" kind to the bus; other kinds (typing/presence) are logged-only
    if (event.kind !== 'message' || !event.message_id || !event.text) {
      if (process.env.FB_WEB_DEBUG === '1') {
        console.log(`${this.tag} Skipping non-message event kind=${event.kind}`);
      }
      return;
    }

    const threadId = event.thread_id || 'unknown';
    const senderId = event.sender_id || 'unknown';
    const text = event.text;

    // Self-message filter (page replying to its own thread)
    if (senderId === this.session?.credentials.page.page_id || senderId === this.session?.credentials.c_user) {
      return;
    }

    console.log(`${this.tag} 📩 from sender=${senderId} thread=${threadId}: ${text.substring(0, 80)}`);

    const dedupeKey = `fbweb:${this.channelName}:${event.message_id}`;

    // Persist to channel_pending_messages
    const { error: insertErr } = await supabase.from('channel_pending_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: 'dm',
      from_uid: senderId,
      sender_name: senderId, // resolved later via CRM
      message_id: event.message_id,
      body: text,
      content_type: 'text',
      metadata: { raw_kind: event.kind, raw_preview: event.raw_payload.slice(0, 400) },
      dedupe_key: dedupeKey,
      ts: new Date(event.timestamp_ms || Date.now()).toISOString(),
    });
    if (insertErr) console.error(`${this.tag} pending insert error:`, insertErr);

    // Publish to bus for auto-reply pipeline
    bus.emit('inbound', {
      id: event.message_id,
      channel: this.channelName,
      channelType: 'facebook_web',
      chatId: threadId,
      senderId,
      senderName: senderId,
      content: text,
      contentType: 'text',
      peerKind: 'direct',
      metadata: {
        platform: 'facebook_web',
        page_id: this.session?.credentials.page.page_id,
        business_id: this.session?.credentials.page.business_id,
      },
      timestamp: new Date(event.timestamp_ms || Date.now()),
      dedupeKey,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Outbound (bus subscriber)
  // ──────────────────────────────────────────────────────────────────

  private installBusOutboundHandler(): void {
    if (this.busListenerInstalled) return;
    this.busListenerInstalled = true;

    bus.on('outbound', async (outMsg: OutboundMessage) => {
      if (outMsg.channel !== this.channelName) return;
      if (!this.session) return;

      const agentSlug = outMsg.metadata?.agentSlug as string | undefined;
      const peerKind = outMsg.metadata?.peerKind as string | undefined;
      const commentId = outMsg.metadata?.comment_id as string | undefined;

      try {
        let result: FbSendResult;
        if (peerKind === 'comment' && commentId) {
          result = await this.sendCommentReplyText(commentId, outMsg.content, agentSlug);
        } else {
          result = await this.send(outMsg.chatId, outMsg.content, agentSlug);
        }
        if (!result.success) {
          console.error(`${this.tag} Outbound failed: ${result.error}`);
        }
      } catch (err: any) {
        console.error(`${this.tag} Outbound exception:`, err);
      }
    });
  }

  async send(threadId: string, message: string, agentSlug?: string): Promise<FbSendResult> {
    if (!this.session) return { success: false, error: 'Not connected' };
    const result = await sendDMText(
      {
        session: this.session,
        cookies: this.cookieMgr,
        tokens: this.session.tokens,
        listener: this.listener,
        channelKey: this.channelName,
      },
      threadId,
      message,
    );
    await this.logSentMessage(threadId, 'dm', message, 'text', result, agentSlug);
    return result;
  }

  async sendCommentReplyText(commentId: string, message: string, agentSlug?: string): Promise<FbSendResult> {
    if (!this.session) return { success: false, error: 'Not connected' };
    const result = await sendCommentReply(
      {
        session: this.session,
        cookies: this.cookieMgr,
        tokens: this.session.tokens,
        listener: this.listener,
        channelKey: this.channelName,
      },
      commentId,
      message,
    );
    await this.logSentMessage(commentId, 'comment', message, 'text', result, agentSlug);
    return result;
  }

  async sendImage(threadId: string, filePath: string, caption?: string, agentSlug?: string): Promise<FbSendResult> {
    if (!this.session) return { success: false, error: 'Not connected' };
    const result = await sendDMImage(
      {
        session: this.session,
        cookies: this.cookieMgr,
        tokens: this.session.tokens,
        listener: this.listener,
        channelKey: this.channelName,
      },
      threadId,
      filePath,
      caption,
    );
    await this.logSentMessage(threadId, 'dm', caption || '[image]', 'image', result, agentSlug);
    return result;
  }

  private async logSentMessage(
    threadId: string,
    threadType: 'dm' | 'comment',
    body: string,
    contentType: string,
    result: FbSendResult,
    agentSlug?: string,
  ): Promise<void> {
    await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body,
      content_type: contentType,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      platform_message_id: result.message_id,
      sent_by: agentSlug || 'manual',
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Persistence helpers
  // ──────────────────────────────────────────────────────────────────

  private async persistCredentials(): Promise<void> {
    if (!this.session) return;
    const credJson = JSON.stringify(this.session.credentials);
    const { encrypted, iv, tag } = encryptCredentials(credJson, MASTER_KEY);
    await supabase
      .from('channel_instances')
      .update({
        credentials_encrypted: encrypted,
        credentials_iv: iv,
        credentials_tag: tag,
        updated_at: new Date().toISOString(),
      })
      .eq('name', this.channelName);
  }

  private async updateStatus(status: string, message?: string): Promise<void> {
    const { error } = await supabase
      .from('channel_instances')
      .update({ status, status_message: message || null, updated_at: new Date().toISOString() })
      .eq('name', this.channelName);
    if (error) console.error(`${this.tag} updateStatus error:`, error);
    else console.log(`${this.tag} Status → ${status}${message ? ': ' + message : ''}`);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.isConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    this.listener?.stop();
    await this.updateStatus('disconnected', 'Stopped by user');
  }

  isRunning(): boolean {
    return this.isConnected;
  }
}
