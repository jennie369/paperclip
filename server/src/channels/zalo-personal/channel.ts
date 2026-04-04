// packages/server/src/channels/zalo-personal/channel.ts

import { ZaloAuth } from './protocol/auth.js';
import { ZaloListener } from './protocol/listener.js';
import { sendDMText, sendGroupText, sendTyping, sendDMImage, sendGroupImage } from './protocol/send.js';
import { encryptCredentials, decryptCredentials } from './protocol/crypto.js';
import { ZaloSession, ZaloCredentials } from './protocol/message.js';
import { supabase } from './supabase.js';
import { bus } from '../bus.js';
import type { OutboundMessage } from '../types.js';
import https from 'https';

const MASTER_KEY = process.env.ZALO_ENCRYPTION_KEY || 'gemral-zalo-default-key-change-me';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8782931741:AAF6v6ju5N5qF2EWFIKZg_5HTNr9yOnsiQ0';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6486938519';

// Health check: 2 minutes. If not connected for this long → force reconnect.
const HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000;
// Max reconnect backoff: 5 minutes
const RECONNECT_DELAYS_MS = [10_000, 30_000, 60_000, 120_000, 300_000];
// Rate limit alerts: max 1 per 30 minutes to prevent spam
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
let _lastAlertAt = 0;

function sendTelegramAlert(text: string): void {
  const now = Date.now();
  if (now - _lastAlertAt < ALERT_COOLDOWN_MS) {
    console.log(`[TelegramAlert] Suppressed (cooldown ${Math.round((ALERT_COOLDOWN_MS - (now - _lastAlertAt)) / 1000)}s remaining): ${text.substring(0, 80)}`);
    return;
  }
  _lastAlertAt = now;
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    if (res.statusCode !== 200) {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => console.error('[TelegramAlert] Failed:', res.statusCode, d.substring(0, 200)));
    }
  });
  req.on('error', (e) => console.error('[TelegramAlert] Error:', e.message));
  req.write(body);
  req.end();
}

export class ZaloPersonalChannel {
  private session: ZaloSession | null = null;
  private listener: ZaloListener | null = null;
  private channelName: string;
  private displayName: string;
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private _lastConnectedAt: Date | null = null;
  private _stopped = false; // true when stop() called explicitly — no reconnect

  /** Log prefix with account display name for easy tracking */
  private get tag(): string {
    return `[Zalo:${this.displayName}]`;
  }

  constructor(channelName: string, displayName?: string) {
    this.channelName = channelName;
    this.displayName = displayName || channelName;
  }

  /**
   * Start QR login flow (WS-first — no getLoginInfo)
   */
  async loginQR(onEvent: (event: string, data?: any) => void): Promise<boolean> {
    const auth = new ZaloAuth();
    const result = await auth.loginQR(onEvent);

    if (!result) return false;

    this.session = result.session;

    console.log(`${this.tag} Session built from cookies (WS-first approach)`);
    console.log(`${this.tag} Cookies:`, result.session.cookies.map((c: any) => c.name).join(', '));

    // Encrypt + save credentials
    const credJson = JSON.stringify(result.credentials);
    const { encrypted, iv, tag } = encryptCredentials(credJson, MASTER_KEY);

    const { error: upsertErr } = await supabase.from('channel_instances').upsert({
      name: this.channelName,
      display_name: 'Zalo Personal',
      channel_type: 'zalo_personal',
      credentials_encrypted: encrypted,
      credentials_iv: iv,
      credentials_tag: tag,
      status: 'connecting',
      zalo_uid: result.session.uid || null,
      enabled: true,
      last_connected_at: new Date().toISOString(),
    }, { onConflict: 'name' });
    if (upsertErr) console.error(`${this.tag} DB upsert error:`, upsertErr);

    // Connect WS — cipher key will arrive via handshake
    await this.startListening();
    return true;
  }

  /**
   * Start from saved credentials (on server restart).
   * WS-first: skip getLoginInfo, connect WS directly with saved cookies.
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
        MASTER_KEY
      );
      const credentials: ZaloCredentials = JSON.parse(credJson);

      // Build session from saved cookies + loginInfo (if available)
      const savedLogin = credentials.loginInfo;
      this.session = {
        uid: savedLogin?.uid || instance.zalo_uid || '',
        imei: credentials.imei,
        userAgent: credentials.userAgent,
        language: credentials.language,
        secretKey: savedLogin?.zpw_enk || '', // WS cipher handshake will update
        loginInfo: savedLogin || {
          uid: instance.zalo_uid || '',
          zpw_enk: '',
          zpw_ws: [],
          zpw_service_map_v3: {
            chat: ['https://tt-chat4-wpa.chat.zalo.me'],
            group: ['https://group.zalo.me'],
            file: ['https://up.zalo.me'],
            profile: ['https://profile.zalo.me'],
            group_poll: ['https://group-poll.zalo.me'],
          },
        },
        cookies: credentials.cookie,
      };

      console.log(`${this.tag} Resuming from DB with saved cookies (WS-first)`);
      this._stopped = false;
      await this.startListening();
      return true;
    } catch (err: any) {
      await this.updateStatus('error', err.message);
      return false;
    }
  }

  private _isConnected = false;

  /** Schedule a reconnect after delay. Backs off exponentially, caps at 5 min. */
  private _scheduleReconnect(reason: string): void {
    if (this._stopped) return;
    if (this._reconnectTimer) return; // already scheduled

    const delay = RECONNECT_DELAYS_MS[Math.min(this._reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
    const delayMin = Math.round(delay / 1000);
    console.log(`${this.tag} Reconnect scheduled in ${delayMin}s (attempt #${this._reconnectAttempts + 1}) — reason: ${reason}`);

    if (this._reconnectAttempts === 0) {
      // First drop — alert immediately
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
      sendTelegramAlert(`🔴 <b>Zalo offline</b>: ${this.displayName}\nLý do: ${reason}\nThời gian: ${now} ICT\nĐang reconnect sau ${delayMin}s...`);
    }

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      this._reconnectAttempts++;

      // Tear down old listener cleanly
      try { this.listener?.stop(); } catch {}
      this.listener = null;
      this._isConnected = false;

      console.log(`${this.tag} Attempting reconnect #${this._reconnectAttempts}...`);
      try {
        await this.startListening();
      } catch (err: any) {
        console.error(`${this.tag} Reconnect failed:`, err.message);
        this._scheduleReconnect(`reconnect error: ${err.message}`);
      }
    }, delay);
  }

  /** Health check: runs every 2 minutes. If still disconnected → try reconnect. */
  private _startHealthCheck(): void {
    if (this._healthCheckInterval) return;
    this._healthCheckInterval = setInterval(() => {
      if (this._stopped) return;
      if (!this._isConnected && !this._reconnectTimer) {
        console.log(`${this.tag} Health check: not connected + no pending reconnect → scheduling reconnect`);
        this._scheduleReconnect('health check detected offline');
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private async startListening(): Promise<void> {
    if (!this.session) throw new Error('No session');
    this._isConnected = false;

    this.listener = new ZaloListener(this.session);

    const markConnected = async () => {
      if (!this._isConnected) {
        this._isConnected = true;
        this._lastConnectedAt = new Date();

        // Alert on successful reconnect (not first connect)
        if (this._reconnectAttempts > 0) {
          const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
          sendTelegramAlert(`🟢 <b>Zalo online trở lại</b>: ${this.displayName}\nReconnect lần #${this._reconnectAttempts} thành công lúc ${now} ICT`);
          this._reconnectAttempts = 0;
        }

        await this.updateStatus('connected', 'WS connected + cipher key received');
      }
    };

    // Cipher key received from WS handshake → update session + status
    this.listener.on('cipher_key', async (key: string) => {
      if (key && this.session) {
        this.session.secretKey = key;
        console.log(`${this.tag} Cipher key received from WS handshake`);
        await markConnected();
      }
    });

    this.listener.on('dm_message', (msg: any) => this.handleInboundMessage(msg, 'dm'));
    this.listener.on('group_message', (msg: any) => this.handleInboundMessage(msg, 'group'));

    this.listener.on('connected', async () => {
      if (this.session?.secretKey) {
        console.log(`${this.tag} WebSocket connected, cipher key already in session`);
        await markConnected();
      } else {
        console.log(`${this.tag} WebSocket connected, waiting for cipher key...`);
        await this.updateStatus('connecting', 'WS connected, waiting cipher key');
      }
    });

    this.listener.on('error', (err: any) => {
      const wasConnected = this._isConnected;
      this._isConnected = false;
      if (wasConnected) {
        this.updateStatus('error', err.message);
        this._scheduleReconnect(`WS error: ${err.message}`);
      } else {
        console.log(`${this.tag} Error (retry): ${err.message} — skipping DB update`);
      }
    });

    this.listener.on('duplicate_session', async () => {
      // Duplicate session is fatal; need manual restart
      console.log(`${this.tag} Duplicate session detected — stopping to prevent reconnect spam`);
      this._isConnected = false;
      this._stopped = true;
      if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
      if (this._healthCheckInterval) { clearInterval(this._healthCheckInterval); this._healthCheckInterval = null; }
      await this.updateStatus('error', 'Duplicate session detected. Please restart manually.');
    });

    this.listener.on('kickout', async (info: any) => {
      this._isConnected = false;
      console.warn(`${this.tag} Kicked:`, info);
      await this.updateStatus('error', `Kicked (code: ${info?.code})`);
      this._scheduleReconnect(`kicked (code: ${info?.code})`);
    });

    this.listener.on('max_retries', () => {
      this._isConnected = false;
      this.updateStatus('error', 'Max retries reached — reconnecting...');
      this._scheduleReconnect('max retries reached');
    });

    // Start health check (idempotent — only starts once per channel instance)
    this._startHealthCheck();

    // Subscribe to bus outbound events for auto-reply dispatch
    bus.on('outbound', (outMsg: OutboundMessage) => {
      if (outMsg.channel !== this.channelName) return;
      const threadType = outMsg.metadata?.threadType === 'group' ? 'group' : 'dm';
      const agentSlug = outMsg.metadata?.agentSlug as string | undefined;
      this.send(outMsg.chatId, outMsg.content, threadType as 'dm' | 'group', agentSlug).catch(err => {
        console.error(`${this.tag} Bus outbound dispatch error:`, err);
      });
    });

    await this.listener.start();
  }

  private async handleInboundMessage(
    msg: any,
    threadType: 'dm' | 'group'
  ): Promise<void> {
    // Skip self-messages (own UID or echoed messages with uid=0)
    if (msg.uidFrom === this.session?.uid) return;
    if (msg.uidFrom === '0' || msg.uidFrom === 0) return;

    const body = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const threadId = threadType === 'dm' ? msg.uidFrom : msg.idTo;
    const senderDisplay = msg.dName || msg.uidFrom;
    console.log(`${this.tag} 📩 ${threadType.toUpperCase()} from "${senderDisplay}" (thread=${threadId}): ${body?.substring(0, 80)}`);

    const dedupeKey = `zalo:${msg.msgId}`;
    const { error: insertErr } = await supabase.from('channel_pending_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      from_uid: msg.uidFrom,
      sender_name: msg.dName || msg.uidFrom,
      message_id: msg.msgId,
      body,
      content_type: msg.msgType || 'text',
      metadata: { raw: msg },
      dedupe_key: dedupeKey,
      ts: new Date(parseInt(msg.ts) > 9999999999 ? parseInt(msg.ts) : parseInt(msg.ts) * 1000).toISOString(),
    });
    if (insertErr) console.error(`${this.tag} Message insert error:`, insertErr);

    // Emit to MessageBus for auto-reply pipeline
    // Note: use bus.emit() directly — bus.publishInbound() would double-insert to DB
    const msgTimestamp = new Date(
      parseInt(msg.ts) > 9999999999 ? parseInt(msg.ts) : parseInt(msg.ts) * 1000
    );
    bus.emit('inbound', {
      id: msg.msgId,
      channel: this.channelName,
      channelType: 'zalo_personal',
      chatId: threadType === 'dm' ? msg.uidFrom : msg.idTo,
      senderId: msg.uidFrom,
      senderName: msg.dName || msg.uidFrom,
      content: body,
      contentType: (msg.msgType || 'text') as any,
      peerKind: threadType === 'dm' ? 'direct' : 'group',
      metadata: { raw: msg },
      timestamp: msgTimestamp,
      dedupeKey: `zalo:${msg.msgId}`,
    });

    // Post to War Room #customer-support
    const { data: channel } = await supabase
      .from('war_room_channels')
      .select('id')
      .eq('name', 'customer-support')
      .single();

    if (channel) {
      const prefix = threadType === 'group' ? '[ZALO-GROUP]' : '[ZALO]';
      const contentPreview = typeof msg.content === 'string'
        ? msg.content.slice(0, 200)
        : '(media)';
      await supabase.from('war_room_messages').insert({
        channel_id: channel.id,
        sender_type: 'system',
        sender_id: 'zalo-personal',
        sender_name: 'Zalo Cá Nhân',
        message_type: 'text',
        content: `${prefix} ${msg.dName || msg.uidFrom}: ${contentPreview}`,
        priority: 1,
        metadata: {
          channel: 'zalo_personal',
          thread_id: threadType === 'dm' ? msg.uidFrom : msg.idTo,
          thread_type: threadType,
          from_uid: msg.uidFrom,
          message_id: msg.msgId,
        },
      });
    }
  }

  async send(
    threadId: string,
    message: string,
    threadType: 'dm' | 'group' = 'dm',
    agentSlug?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.session) return { success: false, error: 'Not connected' };

    await sendTyping(this.session, threadId, threadType === 'group');
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const result = threadType === 'group'
      ? await sendGroupText(this.session, threadId, message)
      : await sendDMText(this.session, threadId, message);

    await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body: message,
      content_type: 'text',
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      platform_message_id: result.messageId,
      sent_by: agentSlug || 'manual',
    });

    return result;
  }

  async sendImage(
    threadId: string,
    filePath: string,
    threadType: 'dm' | 'group' = 'dm',
    caption?: string,
    agentSlug?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.session) return { success: false, error: 'Not connected' };

    const result = threadType === 'group'
      ? await sendGroupImage(this.session, threadId, filePath, caption)
      : await sendDMImage(this.session, threadId, filePath, caption);

    await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body: caption || '[Hình ảnh]',
      content_type: 'image',
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      platform_message_id: result.messageId,
      sent_by: agentSlug || 'manual',
    });

    return result;
  }

  async stop(): Promise<void> {
    this._stopped = true;
    this._isConnected = false;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this._healthCheckInterval) { clearInterval(this._healthCheckInterval); this._healthCheckInterval = null; }
    this.listener?.stop();
    await this.updateStatus('disconnected', 'Stopped by user');
  }

  private async updateStatus(status: string, message?: string): Promise<void> {
    const { error } = await supabase.from('channel_instances').update({
      status,
      status_message: message || null,
      updated_at: new Date().toISOString(),
    }).eq('name', this.channelName);
    if (error) console.error(`${this.tag} updateStatus error:`, error);
    else console.log(`${this.tag} Status → ${status}${message ? ': ' + message : ''}`);
  }
}
