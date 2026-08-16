// packages/server/src/channels/zalo-personal/channel.ts

import { ZaloAuth } from './protocol/auth.js';
import { ZaloListener } from './protocol/listener.js';
import { sendDMText, sendGroupText, sendTyping, sendDMImage, sendGroupImage, sendDMFile, sendGroupFile } from './protocol/send.js';
import { encryptCredentials, decryptCredentials } from './protocol/crypto.js';
import { ZaloSession, ZaloCredentials } from './protocol/message.js';
import { supabase } from './supabase.js';
import { bus } from '../bus.js';
import { deliverReplyOnce } from '../deliver-once.js';
import { assertSent } from '../reply-contract.js';
import type { OutboundMessage, MediaFile } from '../types.js';
// SSOT resolve/download/isImage cho outbound media (dùng chung Zalo + CSKH). MEDIA_PROJECT_ROOT
// giữ ở đây (buildOutboundMediaUrl + ALLOWED_MEDIA_ROOTS cần) — re-export từ media-util.
import { MEDIA_PROJECT_ROOT, downloadMediaToTemp, isImageMedia } from '../media-util.js';
import { markAlive } from '../../services/liveness-tracker.js';
import https from 'https';
import { rmSync, existsSync, statSync } from 'fs';
import { join as pathJoin, basename as pathBasename, isAbsolute as pathIsAbsolute, resolve as pathResolve, relative as pathRelative } from 'path';

// Zalo hard limit on file/image uploads (enforced by tt-chatN-wpa.chat.zalo.me).
// We check client-side so we can log a clear warning instead of the opaque
// "File too large: N > 26214400" error bubbling up from the protocol layer.
const ZALO_MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

// Roots cho phép serve ảnh outbound (giữ ĐỒNG BỘ với routes.ts ALLOWED_MEDIA_ROOTS).
// media-library.json trỏ path hỗn hợp: project-relative + absolute content vault (D:).
const ALLOWED_MEDIA_ROOTS = [
  process.env.PROJECT_ROOT || MEDIA_PROJECT_ROOT,
  process.env.CONTENT_LIBRARY_ROOT || 'D:/Claude Projects/App Content Jennie',
].map((r) => pathResolve(r));

/**
 * Build a browser-servable URL cho ảnh outbound (media-library) để inbox hiển thị.
 * Ảnh gửi khách = file LOCAL trên đĩa → browser không load path đĩa → trỏ qua
 * endpoint `/api/channels/zalo-personal/media?path=<abs>`. Trả null nếu file NẰM
 * NGOÀI mọi allowed root (vd temp upload /tmp) — endpoint chỉ serve trong whitelist.
 */
function buildOutboundMediaUrl(filePath: string): string | null {
  const abs = pathIsAbsolute(filePath) ? filePath : pathResolve(MEDIA_PROJECT_ROOT, filePath);
  const servable = ALLOWED_MEDIA_ROOTS.some((root) => {
    const rel = pathRelative(root, abs);
    return !!rel && !rel.startsWith('..') && !pathIsAbsolute(rel);
  });
  if (!servable) return null;
  return `/api/channels/zalo-personal/media?path=${encodeURIComponent(abs.split('\\').join('/'))}`;
}

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
  // Single stored reference to the bus 'outbound' listener so startListening()
  // (which re-runs on every reconnect) doesn't stack duplicate listeners.
  private _outboundHandler: ((msg: OutboundMessage) => Promise<void>) | null = null;

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
   * Refresh zpw_enk by calling getLoginInfo with existing cookies.
   * Fixes "bad decrypt" when Zalo rotates encryption keys.
   * Returns true if key was refreshed successfully.
   */
  async refreshEncryptionKey(): Promise<{ success: boolean; message: string }> {
    // Load current credentials
    const { data: instance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('name', this.channelName)
      .single();

    if (!instance?.credentials_encrypted) {
      return { success: false, message: 'Không tìm thấy credentials' };
    }

    try {
      const credJson = decryptCredentials(
        instance.credentials_encrypted,
        instance.credentials_iv,
        instance.credentials_tag,
        MASTER_KEY
      );
      const credentials: ZaloCredentials = JSON.parse(credJson);

      // Create auth with saved cookies
      const auth = new ZaloAuth();
      for (const c of credentials.cookie) {
        (auth as any).cm.set(c.name, c.value, c.domain);
      }

      // Call getLoginInfo to get fresh zpw_enk
      console.log(`${this.tag} Refreshing zpw_enk via getLoginInfo...`);
      const loginInfo = await auth.fetchLoginInfo(credentials.imei);

      if (!loginInfo?.zpw_enk) {
        return { success: false, message: 'getLoginInfo thất bại — cookies có thể hết hạn, cần login QR lại' };
      }

      // Update credentials with new zpw_enk
      credentials.loginInfo = loginInfo;
      const newCredJson = JSON.stringify(credentials);
      const { encrypted, iv, tag } = encryptCredentials(newCredJson, MASTER_KEY);

      await supabase.from('channel_instances').update({
        credentials_encrypted: encrypted,
        credentials_iv: iv,
        credentials_tag: tag,
        zalo_uid: loginInfo.uid || instance.zalo_uid,
        updated_at: new Date().toISOString(),
      }).eq('name', this.channelName);

      // Update live session if running
      if (this.session) {
        this.session.secretKey = loginInfo.zpw_enk;
        this.session.loginInfo = loginInfo;
      }

      console.log(`${this.tag} ✅ zpw_enk refreshed successfully!`);
      return { success: true, message: `zpw_enk mới: ${loginInfo.zpw_enk.substring(0, 15)}...` };
    } catch (err: any) {
      console.error(`${this.tag} refreshEncryptionKey error:`, err.message);
      return { success: false, message: err.message };
    }
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
      markAlive('zalo-health-check');
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

    // Cipher key received from WS handshake → update session + status + persist to DB
    // NOTE: WS cipher key is for WS message decryption, NOT for HTTP API encryption!
    // loginInfo.zpw_enk (from getLoginInfo) is for HTTP API - do NOT overwrite it.
    this.listener.on('cipher_key', async (key: string) => {
      if (key && this.session) {
        this.session.secretKey = key;  // Only update secretKey, NOT loginInfo.zpw_enk
        console.log(`${this.tag} Cipher key received from WS handshake`);
        await markConnected();

        // NOTE: DO NOT persist WS cipher key as zpw_enk!
        // zpw_enk from getLoginInfo is the correct key for HTTP API encryption.
        // WS cipher key is ONLY for WS message decryption (secretKey).
        // Persisting WS key as zpw_enk breaks send functionality!
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

    // Subscribe to bus outbound events for auto-reply dispatch.
    // Handles BOTH text content AND media attachments (images / files) that
    // the router extracted from [[SEND_MEDIA: id]] markers.
    //
    // startListening() re-runs on every reconnect (_scheduleReconnect → startListening).
    // Register the dispatcher exactly ONCE per instance — drop any prior reference
    // first — so one outbound message is never sent N times. Incident 2026-06-08:
    // a single follow-up was delivered 8× because 8 reconnects stacked 8 listeners.
    if (this._outboundHandler) { bus.off('outbound', this._outboundHandler); }
    this._outboundHandler = async (outMsg: OutboundMessage) => {
      if (outMsg.channel !== this.channelName) return;
      // F5: consumer sets metadata.peerKind (NOT threadType); derive threadType so
      // a group reply doesn't fall back to DM and get sent to the wrong endpoint.
      const threadType = (outMsg.metadata?.threadType === 'group' || outMsg.metadata?.peerKind === 'group')
        ? 'group' : 'dm';
      const agentSlug = outMsg.metadata?.agentSlug as string | undefined;

      try {
        const hasText = !!(outMsg.content && outMsg.content.trim());
        // Reply Gateway: a gated bot reply (carries dedupeKey) routes through
        // deliverReplyOnce — ONE claim gates the whole reply (text + any media).
        // deliverReplyOnce owns the channel_sent_messages row (skipDbLog on send).
        if (outMsg.dedupeKey) {
          const outcome = await deliverReplyOnce(
            outMsg.dedupeKey,
            {
              channel_name: this.channelName, thread_id: outMsg.chatId, thread_type: threadType,
              to_uid: outMsg.chatId, body: hasText ? outMsg.content : '[media]',
              content_type: hasText ? 'text' : 'image', sent_by: agentSlug || 'agent',
            },
            async () => {
              if (hasText) return assertSent(await this.send(outMsg.chatId, outMsg.content, threadType, agentSlug, /*skipDbLog*/ true));
              return { platformMessageId: null }; // media-only: claim gates, media sent below
            },
          );
          if (outcome !== 'sent') return; // failed OR duplicate → skip media too
        } else if (hasText) {
          // Manual/human path (no idempotency key): unchanged.
          await this.send(outMsg.chatId, outMsg.content, threadType, agentSlug);
        }

        // Step 2: dispatch attachments, if any (media rows exempt from dedupe audit).
        const media = outMsg.media;
        if (!media || media.length === 0) return;

        console.log(`${this.tag} Outbound dispatch: sending ${media.length} media item(s) to ${outMsg.chatId}`);

        for (const item of media) {
          // Resolve to a local file path. Prefer existing local path, else
          // download URL to a temp file.
          //
          // Relative paths in media-library.json (e.g. "memory/agents/shared/...")
          // are resolved against PROJECT_ROOT so they point to the actual assets
          // in the crypto-pattern-scanner tree, NOT the server CWD.
          let localPath: string | null = null;
          let cleanupTemp = false;
          if (item.path) {
            const resolved = pathIsAbsolute(item.path)
              ? item.path
              : pathResolve(MEDIA_PROJECT_ROOT, item.path);
            if (existsSync(resolved)) {
              localPath = resolved;
            } else {
              console.warn(`${this.tag} Media path not found on disk: ${resolved}`);
            }
          }
          if (!localPath && item.url) {
            localPath = await downloadMediaToTemp(item.url, item.filename);
            cleanupTemp = localPath !== null;
          }

          if (!localPath) {
            // Fallback: append the URL into a follow-up text message so the
            // customer at least sees a clickable link instead of losing the
            // reference entirely.
            if (item.url) {
              const fallbackText = `${item.filename || 'Tệp đính kèm'}: ${item.url}`;
              await this.send(outMsg.chatId, fallbackText, threadType, agentSlug);
              console.warn(`${this.tag} Media fallback (URL as text): ${item.url}`);
            } else {
              console.warn(`${this.tag} Media skipped (no path/url): ${item.filename || '(unknown)'}`);
            }
            continue;
          }

          // Pre-check file size against Zalo's hard limit. Fail fast with a
          // clear warning instead of waiting for the opaque protocol error.
          try {
            const fileSize = statSync(localPath).size;
            if (fileSize > ZALO_MAX_FILE_BYTES) {
              const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
              console.error(
                `${this.tag} ❌ Media too large: ${pathBasename(localPath)} = ${sizeMB}MB ` +
                `(Zalo limit ${ZALO_MAX_FILE_BYTES / 1024 / 1024}MB). Skipping send.`,
              );
              // Best-effort fallback: tell the customer a smaller version is coming
              await this.send(
                outMsg.chatId,
                `(File "${item.filename || pathBasename(localPath)}" quá lớn để gửi qua Zalo, em sẽ gửi cho chị qua kênh khác nhé)`,
                threadType,
                agentSlug,
              );
              if (cleanupTemp) {
                try { rmSync(pathJoin(localPath, '..'), { recursive: true, force: true }); } catch {}
              }
              continue;
            }
          } catch (err: any) {
            console.warn(`${this.tag} statSync failed for ${localPath}: ${err.message}`);
          }

          // Pick sendImage vs sendFile based on mime type
          const sendFn = isImageMedia(item) ? this.sendImage.bind(this) : this.sendFile.bind(this);
          const kind = isImageMedia(item) ? 'image' : 'file';

          try {
            // Don't pass item.caption — router.ts parseMediaMarkers currently
            // populates it from media-library `description`, which is LLM meta
            // (system-prompt hint to help the agent pick an id), not customer-
            // facing text. Leaking the description into Zalo as photo `desc`
            // (or as a follow-up text bubble) looks like a tooling glitch.
            // The agent's surrounding reply already explains the image.
            // Incident 2026-05-01: customer received "Hình đá thạch anh tím
            // (Amethyst) - cụm crystal tím hộ thân, gửi khi khách hỏi xem
            // ảnh đá thạch anh tím / amethyst / crystal tím" as a separate
            // text bubble after the photo. Pass undefined → empty desc.
            const result = await sendFn(outMsg.chatId, localPath, threadType, undefined, agentSlug);
            if (result.success) {
              console.log(`${this.tag} ✅ Sent ${kind}: ${pathBasename(localPath)}`);
            } else {
              console.error(`${this.tag} ❌ Failed to send ${kind} ${pathBasename(localPath)}: ${result.error}`);
            }
          } catch (err: any) {
            console.error(`${this.tag} ❌ Exception sending ${kind} ${pathBasename(localPath)}: ${err.message}`);
          } finally {
            // Cleanup downloaded temp file (NOT caller-provided paths)
            if (cleanupTemp && localPath) {
              try {
                const tmpParent = pathJoin(localPath, '..');
                rmSync(tmpParent, { recursive: true, force: true });
              } catch { /* best effort */ }
            }
          }
        }
      } catch (err: any) {
        console.error(`${this.tag} Bus outbound dispatch error:`, err);
      }
    };
    bus.on('outbound', this._outboundHandler);

    await this.listener.start();
  }

  private async handleInboundMessage(
    msg: any,
    threadType: 'dm' | 'group'
  ): Promise<void> {
    // uid=0 = echo nội bộ rỗng → bỏ.
    if (msg.uidFrom === '0' || msg.uidFrom === 0) return;
    // Tin từ CHÍNH tài khoản (chị gõ tay trong app Zalo thật HOẶC echo tin Paperclip vừa gửi):
    // KHÔNG bỏ — route sang handler dedup-theo-msgId rồi lưu outbound để đồng bộ vào khung chat.
    if (msg.uidFrom === this.session?.uid) {
      await this.handleSelfMessage(msg, threadType);
      return;
    }

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
      // Carry the group/direct classification explicitly. The column DEFAULTs to
      // 'direct', so omitting it made the Realtime re-emit path (bus.subscribeRealtime,
      // which reads peer_kind || 'direct') treat every group message as a DM →
      // per-sender session fragmentation in the inbox. thread_type is the source of truth.
      peer_kind: threadType === 'group' ? 'group' : 'direct',
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

  // Tin tự-gửi (chị reply trực tiếp trong app Zalo, KHÔNG qua Paperclip): listener Zalo
  // multi-client vẫn nhận → lưu vào channel_sent_messages để đồng bộ vào khung chat Paperclip.
  // Dedup theo platform_message_id (= msgId) để KHÔNG trùng tin Paperclip đã tự gửi & lưu.
  private async handleSelfMessage(msg: any, threadType: 'dm' | 'group'): Promise<void> {
    if (!msg.msgId) return;
    const msgId = String(msg.msgId);
    const threadId = msg.idTo; // self-message: người nhận = idTo (DM) / group = idTo
    if (!threadId) return;
    // Đã có row (Paperclip gửi & lưu rồi) → skip tránh double.
    const { data: existing } = await supabase
      .from('channel_sent_messages')
      .select('id')
      .eq('channel_name', this.channelName)
      .eq('platform_message_id', msgId)
      .maybeSingle();
    if (existing) return;
    const body = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    // Reply Gateway F6: a gateway bot reply claims its channel_sent_messages row
    // with status='sending' and stamps platform_message_id only AFTER the Zalo
    // send returns. If this self-echo races ahead of that UPDATE, the msgId lookup
    // above misses and we'd insert a duplicate 'manual_zalo' row for our OWN reply.
    // Fall back to matching a recent agent reply by (thread, body) and, if found,
    // stamp its platform_message_id + skip the duplicate. SAFE: this whole method
    // runs only for self-messages (uidFrom === session uid), so a real customer
    // message with identical text ("ok"/"dạ") never reaches here.
    const { data: recentAgent } = await supabase
      .from('channel_sent_messages')
      .select('id')
      .eq('channel_name', this.channelName)
      .eq('thread_id', threadId)
      .eq('body', body)
      .neq('sent_by', 'manual_zalo')
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentAgent) {
      await supabase.from('channel_sent_messages')
        .update({ platform_message_id: msgId })
        .eq('id', (recentAgent as { id: string }).id);
      return;
    }
    const { error } = await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body,
      content_type: msg.msgType || 'text',
      status: 'sent',
      platform_message_id: msgId,
      sent_by: 'manual_zalo',
    });
    if (error) { console.error(`${this.tag} Self-message store error:`, error); return; }
    console.log(`${this.tag} 📤 Self (manual Zalo) → stored outbound thread=${threadId}: ${body?.substring(0, 60)}`);
  }

  async send(
    threadId: string,
    message: string,
    threadType: 'dm' | 'group' = 'dm',
    agentSlug?: string,
    skipDbLog = false
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!this.session) return { success: false, error: 'Not connected' };

    await sendTyping(this.session, threadId, threadType === 'group');
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    const result = threadType === 'group'
      ? await sendGroupText(this.session, threadId, message)
      : await sendDMText(this.session, threadId, message);

    // skipDbLog=true khi caller (universal /send) đã ghi row channel_sent_messages rồi
    // → tránh double-insert. Path agent gọi trực tiếp vẫn log bình thường.
    if (!skipDbLog) {
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
    }

    return result;
  }

  async sendImage(
    threadId: string,
    filePath: string,
    threadType: 'dm' | 'group' = 'dm',
    caption?: string,
    agentSlug?: string,
    // Caller-provided public URL (e.g. Supabase Storage) — overrides buildOutboundMediaUrl().
    // Needed when filePath is a temp upload outside ALLOWED_MEDIA_ROOTS (§P12, 2026-08-16).
    providedMediaUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.session) return { success: false, error: 'Not connected' };

    const result = threadType === 'group'
      ? await sendGroupImage(this.session, threadId, filePath, caption)
      : await sendDMImage(this.session, threadId, filePath, caption);

    // Lưu URL servable vào `media` → inbox hiển thị ảnh THẬT (không placeholder).
    // Ghi CẢ KHI THẤT BẠI (vd Zalo trả error_code 201 vượt 512K/chunk): admin cần
    // thấy ẢNH ĐÃ CỐ GỬI, không chỉ text "[Hình ảnh]" trơ — file cục bộ tồn tại
    // độc lập với việc Zalo có chấp nhận hay không (§P12, 2026-08-04).
    // Priority: caller-provided URL (Supabase Storage) > local media-library URL.
    const finalMediaUrl = providedMediaUrl || buildOutboundMediaUrl(filePath);
    await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body: caption || '[Hình ảnh]',
      content_type: 'image',
      media: finalMediaUrl ? [finalMediaUrl] : null,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      platform_message_id: result.messageId,
      sent_by: agentSlug || 'manual',
    });

    return result;
  }

  /**
   * Send a non-image file (PDF / doc / video / audio) via the asyncfile/upload
   * endpoint. EXPERIMENTAL — Zalo's chunked file protocol changes occasionally.
   * On failure the manager wrapper falls back to URL-append in the text reply.
   */
  async sendFile(
    threadId: string,
    filePath: string,
    threadType: 'dm' | 'group' = 'dm',
    caption?: string,
    agentSlug?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.session) return { success: false, error: 'Not connected' };

    const result = threadType === 'group'
      ? await sendGroupFile(this.session, this.listener, threadId, filePath, caption)
      : await sendDMFile(this.session, this.listener, threadId, filePath, caption);

    await supabase.from('channel_sent_messages').insert({
      channel_name: this.channelName,
      thread_id: threadId,
      thread_type: threadType,
      to_uid: threadId,
      body: caption || '[Tệp đính kèm]',
      content_type: 'file',
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
    if (this._outboundHandler) { bus.off('outbound', this._outboundHandler); this._outboundHandler = null; }
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
