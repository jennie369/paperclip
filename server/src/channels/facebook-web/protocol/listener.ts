// packages/server/src/channels/facebook-web/protocol/listener.ts
//
// MQTT-over-WSS client for edge-chat.facebook.com.
// Wraps `ws` standard WebSocket library; encode/decode via mqtt-codec.ts.
// Emits parsed inbound events (heuristic Lightspeed parser) on `event`.

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import {
  encodeConnect,
  encodeSubscribe,
  encodePublish,
  encodePingreq,
  encodeDisconnect,
  parsePacket,
  decodePublish,
  decodeSuback,
  type FbConnectPayload,
} from './mqtt-codec.js';
import { parseLsResp } from './ls-parser.js';
import {
  parseSendConfirmation,
  buildSyncActivationSequence,
  extractContactIds,
  buildContactWarmup,
  buildThreadInterest,
  buildCursorAdvance,
  buildStartupMarkRead,
  buildThreadUpsert,
} from './ls-tasks.js';
void buildCursorAdvance;
import { MQTT_PACKET, MQTT_TOPICS, FB_API, type FbInboundEvent, type FbWebSession } from './message.js';
import { getUserAgent } from './anti-detect.js';
import { FbCookieManager } from './cookies.js';

export interface FbListenerEvents {
  connected: () => void;
  inbound: (event: FbInboundEvent) => void;
  send_confirmed: (info: { otid: string; mid: string }) => void;
  raw_publish: (topic: string, payload: Buffer) => void;
  disconnect: (reason: string) => void;
  error: (err: Error) => void;
}

export declare interface FbWebListener {
  on<E extends keyof FbListenerEvents>(event: E, listener: FbListenerEvents[E]): this;
  emit<E extends keyof FbListenerEvents>(event: E, ...args: Parameters<FbListenerEvents[E]>): boolean;
}

export class FbWebListener extends EventEmitter {
  private ws: WebSocket | null = null;
  private session: FbWebSession;
  private buffer: Buffer = Buffer.alloc(0);
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private packetIdCounter = 1;
  private stopped = false;
  private warmedContacts: Set<string> = new Set();
  private threadInterestClaimed: Set<string> = new Set();

  constructor(session: FbWebSession) {
    super();
    this.session = session;
  }

  async start(): Promise<void> {
    this.stopped = false;
    const sid = this.session.credentials.session_id;
    const cid = this.session.credentials.device_id;
    const url = `wss://${FB_API.MQTT_HOST}${FB_API.MQTT_PATH}?region=${FB_API.MQTT_REGION}&sid=${sid}&cid=${cid}`;

    const ua = getUserAgent(this.session.credentials.user_agent);

    // Compose cookie header for edge-chat.facebook.com (sends .facebook.com cookies)
    const cookieHeader = this.cookieHeaderForHandshake();

    this.ws = new WebSocket(url, {
      headers: {
        'User-Agent': ua,
        Origin: 'https://www.facebook.com',
        Cookie: cookieHeader,
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      perMessageDeflate: false,
    });

    this.ws.on('open', () => this.onOpen());
    this.ws.on('message', (data: Buffer | ArrayBuffer | string) => this.onMessage(data));
    this.ws.on('close', (code, reason) => {
      this.cleanup();
      if (!this.stopped) {
        this.emit('disconnect', `WS closed: code=${code} reason=${reason?.toString().slice(0, 80) || 'n/a'}`);
      }
    });
    this.ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  stop(): void {
    this.stopped = true;
    this.cleanup();
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(encodeDisconnect());
        this.ws.close();
      }
    } catch {
      // best effort
    }
    this.ws = null;
  }

  /**
   * Publish a Lightspeed request (/ls_req) — for outbound actions like
   * typing indicators or read receipts. NOT used for sending messages
   * (that goes through GraphQL HTTP).
   */
  publishLsReq(payload: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('FbWebListener not connected');
    }
    const packet = encodePublish(MQTT_TOPICS.LS_REQ, JSON.stringify(payload));
    this.ws.send(packet);
  }

  private cookieHeaderForHandshake(): string {
    // Build cookie header for handshake (.facebook.com domain).
    const cm = new FbCookieManager();
    cm.importCookies(this.session.credentials.cookies);
    return cm.buildCookieHeaderForHost('edge-chat.facebook.com');
  }

  private onOpen(): void {
    // Send MQTT CONNECT
    // CONNECT flags MUST match browser exactly (verified Phase 0 capture +
    // Codex analysis). Earlier flip (chat_on=true/no_auto_fg=false) was wrong
    // hypothesis — reverted per Codex rescue 2026-05-17 17:00.
    const payload: FbConnectPayload = {
      a: getUserAgent(this.session.credentials.user_agent),
      asi: null,
      aid: FB_API.BUSINESS_APP_ID,
      aids: { PAGE: this.session.credentials.page.page_id },
      chat_on: false,
      cp: 3,
      ct: 'websocket',
      d: this.session.credentials.device_id,
      dc: '',
      ecp: 10,
      fg: true,
      gas: null,
      mqtt_sid: '',
      no_auto_fg: true,
      p: this.session.credentials.page.page_id,
      pack: [],
      php_override: '',
      pm: [],
      s: Number(this.session.credentials.session_id),
      st: [],
      u: this.session.credentials.c_user,
    };
    if (this.session.credentials.page.ig_account_id) {
      payload.aids.INSTAGRAM_ACCOUNT_V2 = this.session.credentials.page.ig_account_id;
    }
    const connectPkt = encodeConnect(payload);
    this.ws!.send(connectPkt);
  }

  private onMessage(data: Buffer | ArrayBuffer | string): void {
    let chunk: Buffer;
    if (Buffer.isBuffer(data)) chunk = data;
    else if (data instanceof ArrayBuffer) chunk = Buffer.from(data);
    else if (typeof data === 'string') chunk = Buffer.from(data, 'utf-8');
    else chunk = Buffer.from(data as any);

    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Parse all complete MQTT packets in buffer
    while (this.buffer.length > 0) {
      const pkt = parsePacket(this.buffer);
      if (!pkt) break; // need more bytes
      this.buffer = this.buffer.slice(pkt.consumed);
      this.handlePacket(pkt.type, pkt.flags, pkt.payload);
    }
  }

  private handlePacket(type: number, flags: number, payload: Buffer): void {
    switch (type) {
      case MQTT_PACKET.CONNACK:
        this.handleConnack(payload);
        break;
      case MQTT_PACKET.SUBACK: {
        const { packetId, returnCodes } = decodeSuback(payload);
        // Verify QoS accepted (0x80 = failure)
        if (returnCodes.some((c) => c === 0x80)) {
          this.emit('error', new Error(`SUBACK packetId=${packetId} contained failure code`));
        }
        break;
      }
      case MQTT_PACKET.PUBLISH: {
        const qos = (flags >> 1) & 0x03;
        const { topic, body } = decodePublish(payload, qos);
        this.emit('raw_publish', topic, body);
        // DEBUG: log every PUBLISH received with topic + payload preview
        if (process.env.FB_WEB_DEBUG === '1' || true) {
          const preview = body.toString('utf-8', 0, Math.min(800, body.length)).replace(/\s+/g, ' ');
          console.log(`[FbWebListener] ◀ PUBLISH topic=${topic} qos=${qos} len=${body.length} preview=${preview}`);
          // Dump LARGE bodies to file for offline analysis (likely message events)
          if (body.length > 400) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const fs = require('fs') as typeof import('fs');
              const dumpPath = `/tmp/fbweb-publish-${Date.now()}-${body.length}.json`;
              fs.writeFileSync(dumpPath, body.toString('utf-8'));
              console.log(`[FbWebListener]   → dumped ${body.length}b to ${dumpPath}`);
            } catch {/* ignore */}
          }
        }
        if (topic === MQTT_TOPICS.LS_RESP) {
          try {
            const bodyText = body.toString('utf-8');
            const event = parseLsResp(body);
            console.log(`[FbWebListener] parsed kind=${event.kind} msg_id=${event.message_id || '-'} thread=${event.thread_id || '-'} sender=${event.sender_id || '-'} text=${(event.text || '').slice(0, 80)}`);
            this.emit('inbound', event);

            // Also check for send confirmation (replaceOptimsiticMessage opcode)
            const confirmation = parseSendConfirmation(event.raw_payload);
            if (confirmation?.otid && confirmation?.mid) {
              this.emit('send_confirmed', { otid: confirmation.otid, mid: confirmation.mid });
            }

            // Reactive contact warmup: claim primary consumer for any contact
            // we observe (via deleteThenInsertContact opcode OR typing event
            // sender_id — for 1:1 DMs, sender PSID = contact_id). Fires
            // label="207" task → FB pushes message body to us instead of
            // mobile/browser primary.
            const contactSet = new Set<string>(extractContactIds(bodyText));
            if (event.kind === 'typing' && event.sender_id) {
              contactSet.add(event.sender_id);
            }
            if (event.kind === 'message' && event.sender_id) {
              contactSet.add(event.sender_id);
            }
            const newContacts = Array.from(contactSet).filter(cid => !this.warmedContacts.has(cid));
            if (newContacts.length > 0) {
              newContacts.forEach(cid => this.warmedContacts.add(cid));
              try {
                // [a] Contact warmup (label 207)
                const warmup = buildContactWarmup(newContacts);
                const wp = encodePublish(warmup.topic, warmup.body, {
                  qos: warmup.qos,
                  packetId: warmup.qos > 0 ? this.packetIdCounter++ : undefined,
                });
                this.ws!.send(wp);
                console.log(`[FbWebListener] ▶ CONTACT WARMUP ${newContacts.length} contacts: ${newContacts.slice(0, 5).join(',')}${newContacts.length > 5 ? '...' : ''}`);

                // [b] CRITICAL — thread interest claim (label 228) per contact.
                // For 1:1 DMs, thread_key = contact PSID. This is what tells
                // FB to push insertMessage events to us (verified Codex 2026-05-17).
                for (const cid of newContacts) {
                  if (this.threadInterestClaimed.has(cid)) continue;
                  this.threadInterestClaimed.add(cid);
                  const ti = buildThreadInterest(cid);
                  const tp = encodePublish(ti.topic, ti.body, {
                    qos: ti.qos,
                    packetId: ti.qos > 0 ? this.packetIdCounter++ : undefined,
                  });
                  this.ws!.send(tp);
                  console.log(`[FbWebListener] ▶ THREAD INTEREST 228 thread_key=${cid}`);

                  // [c] Cursor advance (label 313) removed — FB rejects with
                  // reference_thread_key=0 invalid. Not critical.

                  // [c'] Thread force_upsert (label 209) — registers thread
                  // for sync group 205 push interest. Phase 0 fired this for
                  // each visible thread; we fire for each contact's thread.
                  try {
                    const upsert = buildThreadUpsert(cid);
                    const up = encodePublish(upsert.topic, upsert.body, {
                      qos: upsert.qos,
                      packetId: upsert.qos > 0 ? this.packetIdCounter++ : undefined,
                    });
                    this.ws!.send(up);
                    console.log(`[FbWebListener] ▶ THREAD UPSERT 209 thread_fbid=${cid}`);
                  } catch {/* ignore */}

                  // [d] Mark read startup (label 21) — Phase 0 fired this for
                  // active thread. Harmless on idle threads.
                  const mr = buildStartupMarkRead(cid);
                  const mp = encodePublish(mr.topic, mr.body, {
                    qos: mr.qos,
                    packetId: mr.qos > 0 ? this.packetIdCounter++ : undefined,
                  });
                  this.ws!.send(mp);
                  console.log(`[FbWebListener] ▶ MARK READ 21 thread=${cid}`);
                }
              } catch (err: any) {
                console.warn(`[FbWebListener] Reactive warmup chain failed: ${err.message}`);
              }
            }
          } catch (err: any) {
            console.warn(`[FbWebListener] ls-parser failed: ${err.message}`);
          }
        }
        break;
      }
      case MQTT_PACKET.PINGRESP:
        // keepalive ack — no-op
        break;
      case MQTT_PACKET.PUBACK:
        // QoS>0 publish ack — no-op (we use QoS 0)
        break;
      default:
        // Unknown packet type — log and continue
        console.warn(`[FbWebListener] Unknown MQTT packet type=${type} flags=${flags}`);
    }
  }

  private handleConnack(payload: Buffer): void {
    // CONNACK payload = [session_present_flag, return_code]
    if (payload.length < 2) {
      this.emit('error', new Error('Malformed CONNACK'));
      return;
    }
    const rc = payload[1];
    if (rc !== 0) {
      const reasons: Record<number, string> = {
        1: 'unacceptable protocol version',
        2: 'identifier rejected',
        3: 'server unavailable',
        4: 'bad username/password',
        5: 'not authorized',
      };
      this.emit('error', new Error(`MQTT CONNACK failed: ${reasons[rc] || `code ${rc}`}`));
      return;
    }

    // Subscribe to LS topics
    const sub = encodeSubscribe(this.packetIdCounter++, [
      { topic: MQTT_TOPICS.LS_RESP, qos: 0 },
      { topic: MQTT_TOPICS.LS_FOREGROUND_STATE, qos: 0 },
    ]);
    this.ws!.send(sub);

    // CRITICAL: FB doesn't auto-stream /ls_resp events after subscribe.
    // Client MUST publish sync activation sequence (Phase 0 verified):
    //   1. /ls_app_settings (schema version handshake)
    //   2. /ls_req type=2 database=1 (messages stream resync)
    //   3. /ls_req type=1 database=26 (init with locale)
    // Without this, subscription is silent — no events delivered.
    try {
      const activationSeq = buildSyncActivationSequence();
      for (const step of activationSeq) {
        const packet = encodePublish(step.topic, step.body, {
          qos: step.qos,
          packetId: step.qos > 0 ? this.packetIdCounter++ : undefined,
        });
        this.ws!.send(packet);
        console.log(`[FbWebListener] ▶ SYNC ACTIVATION ${step.topic} qos=${step.qos} len=${step.body.length}`);
      }
    } catch (err: any) {
      console.error(`[FbWebListener] Sync activation failed: ${err.message}`);
    }

    // Start keepalive PINGREQ
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      try {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(encodePingreq());
        }
      } catch {
        // ignore
      }
    }, (FB_API.MQTT_KEEPALIVE_SEC - 2) * 1000); // slightly before keepalive expiry

    this.emit('connected');
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.buffer = Buffer.alloc(0);
  }
}
