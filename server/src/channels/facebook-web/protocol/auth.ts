// packages/server/src/channels/facebook-web/protocol/auth.ts
//
// Token bootstrap + auto-refresh for FB Web Reverse Protocol.
//
// FB rotates fb_dtsg every ~24h. The async_get_token field embedded in page
// HTML can refresh without re-login, but to keep this simple we re-fetch the
// Business Inbox HTML page every 22h (still under expiry) and re-extract
// fb_dtsg + lsd + jazoest + spin tokens.

import axios from 'axios';
import { FbCookieManager } from './cookies.js';
import { browserHeaders, getUserAgent } from './anti-detect.js';
import { FB_API, type FbBootstrapTokens, type FbPageContext } from './message.js';

/**
 * Fetch business.facebook.com inbox HTML for a specific page and extract
 * all bootstrap tokens needed for GraphQL + MQTT.
 *
 * NOTE: This is the SAME flow user does when opening Business Suite Inbox in
 * their browser. Calling 1× per 22h ≈ identical to a human session resume.
 */
export async function fetchBootstrapTokens(
  cookies: FbCookieManager,
  pageId: string,
  userAgent: string,
): Promise<{ tokens: FbBootstrapTokens; page: FbPageContext }> {
  const url = FB_API.INBOX_URL_TPL.replace('{pageId}', pageId).replace('{pageId}', pageId);
  const cookieHeader = cookies.buildCookieHeaderForHost('business.facebook.com');

  const res = await axios.get(url, {
    headers: {
      ...browserHeaders(userAgent),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Cookie: cookieHeader,
    },
    maxRedirects: 5,
    timeout: 30_000,
    decompress: true,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    throw new Error(`FB inbox fetch HTTP ${res.status}`);
  }

  // Update cookies from response (FB may rotate fr/datr)
  cookies.collectFromResponse(res.headers as Record<string, any>);

  const html = String(res.data);
  if (html.length < 50_000) {
    throw new Error(`FB inbox response too small (${html.length} bytes) — likely login redirect`);
  }
  if (/\/checkpoint\//.test(html)) {
    throw new Error('FB CHECKPOINT detected — account may be flagged');
  }

  const tokens = extractTokens(html);
  const page = extractPageContext(html, pageId);
  return { tokens, page };
}

/**
 * Extract bootstrap tokens from FB Web HTML.
 * Patterns observed from Phase 0 audit — covers both Comet (newer) + legacy ServerJS.
 */
export function extractTokens(html: string): FbBootstrapTokens {
  // fb_dtsg: prefer DTSGInitData inline (Comet)
  const dtsgMatch =
    html.match(/"DTSGInitData",\[\],\{"token":"([^"]+)"/) ||
    html.match(/name="fb_dtsg"\s+value="([^"]+)"/);
  if (!dtsgMatch) throw new Error('fb_dtsg not found in HTML');

  // async_get_token: secondary token used for refresh
  const asyncTokenMatch = html.match(/"DTSGInitData",\[\],\{"token":"[^"]+","async_get_token":"([^"]*)"/);

  // lsd: anti-CSRF
  const lsdMatch =
    html.match(/"LSD",\[\],\{"token":"([^"]+)"/) ||
    html.match(/name="lsd"\s+value="([^"]+)"/);
  if (!lsdMatch) throw new Error('lsd not found in HTML');

  // jazoest: magic number
  const jazMatch =
    html.match(/name="jazoest"\s+value="(\d+)"/) ||
    html.match(/jazoest=(\d+)/);

  // spin tokens — server revision metadata
  const spinMatch = html.match(/"__spin_r":(\d+),"__spin_b":"([^"]+)","__spin_t":(\d+)/);

  return {
    fb_dtsg: dtsgMatch[1],
    lsd: lsdMatch[1],
    jazoest: jazMatch ? jazMatch[1] : '0',
    spin_r: spinMatch ? spinMatch[1] : '0',
    spin_b: spinMatch ? spinMatch[2] : 'trunk',
    spin_t: spinMatch ? spinMatch[3] : String(Math.floor(Date.now() / 1000)),
    async_get_token: asyncTokenMatch ? asyncTokenMatch[1] : undefined,
    extracted_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Extract page context (page_id, business_id, ig_account_id) from inbox HTML.
 * page_id is guaranteed (we fetched the URL with it); business_id + ig_account_id
 * are optional enrichments.
 */
export function extractPageContext(html: string, pageId: string): FbPageContext {
  const ctx: FbPageContext = { page_id: pageId };

  // business_id appears in many GraphQL variable blocks
  const bizMatch =
    html.match(/"business_id":"(\d+)"/) ||
    html.match(/"businessID":"(\d+)"/) ||
    html.match(/business_id=(\d+)/);
  if (bizMatch) ctx.business_id = bizMatch[1];

  // Linked Instagram account
  const igMatch = html.match(/"INSTAGRAM_ACCOUNT_V2":"(\d+)"/);
  if (igMatch) ctx.ig_account_id = igMatch[1];

  // Page display name (best effort, may have escaped Unicode)
  const nameMatch = html.match(/"page_name":"([^"]+)"/) || html.match(/"NAME":"([^"]+)"/);
  if (nameMatch) ctx.page_name = unescapeJsonString(nameMatch[1]);

  return ctx;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Check if tokens are still fresh enough to use (under FB_DTSG_REFRESH_HOURS).
 */
export function tokensFresh(tokens?: FbBootstrapTokens): boolean {
  if (!tokens?.extracted_at) return false;
  const ageHours = (Date.now() / 1000 - tokens.extracted_at) / 3600;
  return ageHours < FB_API.FB_DTSG_REFRESH_HOURS;
}

/**
 * Validate cookies against FB (HEAD request to homepage). Cheap probe.
 * Returns false if cookies are expired / account in checkpoint.
 */
export async function validateCookies(cookies: FbCookieManager, userAgent: string): Promise<boolean> {
  try {
    const res = await axios.get('https://www.facebook.com/', {
      headers: {
        ...browserHeaders(userAgent),
        Accept: 'text/html',
        Cookie: cookies.buildCookieHeaderForHost('www.facebook.com'),
      },
      timeout: 15_000,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    if (res.status !== 200) return false;
    const body = String(res.data ?? '');
    if (body.includes('checkpoint/')) return false;
    if (/name="email"/.test(body)) return false; // login redirect
    return true;
  } catch {
    return false;
  }
}
