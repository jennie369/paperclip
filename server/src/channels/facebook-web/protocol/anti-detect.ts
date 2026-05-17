// packages/server/src/channels/facebook-web/protocol/anti-detect.ts
//
// Anti-detection helpers for FB Web Reverse Protocol.
// Layer 1 of 4 (Behavioral) — see Phase 6 plan.
//
// Goal: avoid checkpoint 282 ban by mimicking human-like timing + activity
// patterns. FB anti-bot heuristics flag rapid robotic sends, simultaneous
// multi-account access, and unnatural UA fingerprints.

import { FB_API } from './message.js';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Returns a Promise that resolves after a random delay in [minMs, maxMs).
 * Default range mimics typical human typing-to-send pause (2-8s).
 */
export function randomDelay(minMs?: number, maxMs?: number): Promise<void> {
  const min = minMs ?? FB_API.MIN_REPLY_DELAY_MS;
  const max = maxMs ?? FB_API.MAX_REPLY_DELAY_MS;
  const span = Math.max(0, max - min);
  const wait = min + Math.floor(Math.random() * span);
  return new Promise(r => setTimeout(r, wait));
}

/**
 * Get user agent: prefer per-channel UA from credentials, fall back to env, then default.
 */
export function getUserAgent(channelUa?: string): string {
  return channelUa || process.env.FACEBOOK_WEB_USER_AGENT || DEFAULT_UA;
}

/**
 * Generate FB-compatible jazoest from fb_dtsg.
 * jazoest = "2" + sum(charCode of each char in fb_dtsg) — observed pattern in FB Web bundles.
 * NOTE: This is for outbound requests when we don't have a captured jazoest.
 * Prefer the jazoest captured from inbox HTML when available.
 */
export function computeJazoest(fbDtsg: string): string {
  let sum = 0;
  for (let i = 0; i < fbDtsg.length; i++) {
    sum += fbDtsg.charCodeAt(i);
  }
  return `2${sum}`;
}

/**
 * Rate limiter — per-channel sliding window counter.
 * Maintains an in-memory window of timestamps per channel. Rejects sends
 * that would exceed FB_API.MAX_SEND_PER_HOUR within the trailing 1 hour.
 */
export class SendRateLimiter {
  private windows = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = FB_API.MAX_SEND_PER_HOUR, windowMs: number = 3600_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Record a send + check if it's within the limit.
   * @returns { allowed: boolean, currentCount: number, retryAfterMs?: number }
   */
  record(channelKey: string): { allowed: boolean; currentCount: number; retryAfterMs?: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    let arr = this.windows.get(channelKey) ?? [];
    arr = arr.filter(t => t > cutoff);

    if (arr.length >= this.limit) {
      const oldest = arr[0];
      const retryAfterMs = oldest + this.windowMs - now;
      this.windows.set(channelKey, arr);
      return { allowed: false, currentCount: arr.length, retryAfterMs };
    }
    arr.push(now);
    this.windows.set(channelKey, arr);
    return { allowed: true, currentCount: arr.length };
  }

  count(channelKey: string): number {
    const cutoff = Date.now() - this.windowMs;
    return (this.windows.get(channelKey) ?? []).filter(t => t > cutoff).length;
  }

  reset(channelKey: string): void {
    this.windows.delete(channelKey);
  }
}

/** Singleton rate limiter shared across all FB Web channels in the process */
export const fbWebRateLimiter = new SendRateLimiter();

/**
 * Generate a UUIDv4 (for `device_id` field in MQTT CONNECT payload).
 * Persisted per channel — same device ID across restarts to avoid FB flagging
 * "new device" each time the server restarts.
 */
export function generateDeviceId(): string {
  // Standard UUIDv4 implementation
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  // Version 4 + variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate MQTT session ID (int64-compatible random).
 * Used in CONNECT payload `s` field.
 */
export function generateSessionId(): string {
  // 16-digit random — fits in safe integer range for FB
  const high = Math.floor(Math.random() * 9000000) + 1000000;
  const low = Math.floor(Math.random() * 1_000_000_000);
  return `${high}${low.toString().padStart(9, '0')}`;
}

/**
 * Standard browser-like HTTP headers for FB requests.
 * Matched against captured Chrome 131 traffic during Phase 0.
 */
export function browserHeaders(ua: string, opts: { referer?: string; xfbDtsg?: string; xLsd?: string } = {}): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': ua,
    Accept: '*/*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };
  if (opts.referer) h['Referer'] = opts.referer;
  if (opts.xfbDtsg) h['x-fb-friendly-name'] = ''; // overridden per-request
  if (opts.xLsd) h['x-fb-lsd'] = opts.xLsd;
  return h;
}
