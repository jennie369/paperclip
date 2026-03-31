// packages/server/src/channels/zalo-personal/protocol/auth.ts

import axios from 'axios';
import * as crypto from 'crypto';
import { ZaloCookieManager } from './cookies';
import { ZaloCredentials, ZaloLoginInfo, ZaloSession, ZALO_API } from './message';
import { buildEncryptedApiParams, decryptAESCBC } from './crypto';

const QR_HEADERS: Record<string, string> = {
  'Accept': '*/*',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Referer': 'https://id.zalo.me/account?continue=https%3A%2F%2Fzalo.me%2Fpc',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export class ZaloAuth {
  private cm = new ZaloCookieManager();

  private async zaloGet(url: string, extraHeaders?: Record<string, string>, _depth = 0): Promise<any> {
    if (_depth > 15) throw new Error('Too many redirects');
    const host = new URL(url).hostname;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': ZALO_API.USER_AGENT,
        'Accept-Language': 'vi',
        'Cookie': this.cm.buildCookieHeaderForHost(host),
        ...extraHeaders,
      },
      timeout: 60_000,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    this.cm.collectFromResponse(res.headers);
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      const next = new URL(res.headers.location, url).toString();
      return this.zaloGet(next, extraHeaders, _depth + 1);
    }
    return res;
  }

  private async zaloPost(url: string, params: Record<string, string>, timeout?: number) {
    const host = new URL(url).hostname;
    const res = await axios.post(url, new URLSearchParams(params).toString(), {
      headers: {
        ...QR_HEADERS,
        'User-Agent': ZALO_API.USER_AGENT,
        'Cookie': this.cm.buildCookieHeaderForHost(host),
      },
      timeout: timeout || 60_000,
      maxRedirects: 0,
      validateStatus: (s) => s < 400 || s === 302,
    });
    this.cm.collectFromResponse(res.headers);
    if (res.status === 302 && res.headers.location) {
      return this.zaloGet(res.headers.location);
    }
    return res;
  }

  generateIMEI(): string {
    const uuid = crypto.randomUUID();
    const uaHash = crypto.createHash('md5').update(ZALO_API.USER_AGENT).digest('hex');
    return `${uuid}-${uaHash}`;
  }

  async generateQR(imei: string): Promise<{ qrImage: string; ver: string; code: string }> {
    const pageRes = await this.zaloGet('https://id.zalo.me/account?continue=https%3A%2F%2Fzalo.me%2Fpc');
    const ver = this.extractJSVersion(typeof pageRes.data === 'string' ? pageRes.data : '');
    console.log('[ZaloAuth] version:', ver);

    await this.zaloPost('https://id.zalo.me/account/logininfo', { v: ver, continue: 'https://zalo.me/pc' });
    await this.zaloPost('https://id.zalo.me/account/verify-client', { v: ver, type: 'device', continue: 'https://zalo.me/pc' });

    const qrRes = await this.zaloPost('https://id.zalo.me/account/authen/qr/generate', { v: ver, continue: 'https://zalo.me/pc' });
    const code = qrRes.data?.data?.code || '';
    const image = qrRes.data?.data?.image || '';
    console.log('[ZaloAuth] QR code:', code?.slice(0, 25) + '...', 'hasImage:', !!image);
    return { qrImage: image, ver, code };
  }

  async waitForQRScan(ver: string, code: string, onStatus?: (s: string) => void): Promise<boolean> {
    let scanned = false;
    let retries = 0;
    while (!scanned && retries < 10) {
      try {
        onStatus?.('waiting_scan');
        const res = await this.zaloPost(
          'https://id.zalo.me/account/authen/qr/waiting-scan',
          { v: ver, code, continue: 'https://zalo.me/pc' },
          ZALO_API.QR_TIMEOUT + 5000
        );
        if (res.data?.error_code === 8) { retries++; continue; }
        if (res.data?.error_code === 0 || res.data?.data) { scanned = true; }
        else { retries++; }
      } catch (err: any) {
        if (err.code === 'ECONNABORTED') { retries++; continue; }
        throw err;
      }
    }
    if (!scanned) return false;

    onStatus?.('waiting_confirm');
    const confirmRes = await this.zaloPost(
      'https://id.zalo.me/account/authen/qr/waiting-confirm',
      { v: ver, code, gToken: '', gAction: 'CONFIRM_QR', continue: 'https://zalo.me/pc' },
      ZALO_API.QR_TIMEOUT + 5000
    );
    console.log('[ZaloAuth] confirm:', JSON.stringify(confirmRes.data).slice(0, 100));
    return confirmRes.data?.error_code === 0;
  }

  async followChecksession(): Promise<void> {
    console.log('[ZaloAuth] === CHECKSESSION ===');
    try {
      let url: string | null = 'https://id.zalo.me/account/checksession?continue=https%3A%2F%2Fchat.zalo.me%2Findex.html';
      let hops = 0;
      while (url && hops < 15) {
        hops++;
        const parsed = new URL(url);
        // Domain-filtered cookies per hop (like Go's CookieJar)
        const cookieHeader = this.cm.buildCookieHeaderForHost(parsed.hostname);
        const res = await axios.get(url, {
          headers: {
            'User-Agent': ZALO_API.USER_AGENT,
            'Cookie': cookieHeader,
          },
          maxRedirects: 0,
          validateStatus: () => true,
          timeout: 30_000,
        });
        this.cm.collectFromResponse(res.headers);
        const sc = res.headers['set-cookie'];
        const cookieNames = cookieHeader.split('; ').map(c => c.split('=')[0]).filter(Boolean).join(', ');
        console.log(`[ZaloAuth] checksession hop ${hops} (${res.status}) ${parsed.hostname} → sent: [${cookieNames}]${sc ? ` got: ${sc.length} cookies` : ''}`);

        if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
          url = new URL(res.headers.location, url).toString();
        } else {
          url = null;
        }
      }
      console.log('[ZaloAuth] Checksession done after', hops, 'hops');
      this.cm.debugLog();
    } catch (e: any) {
      console.log('[ZaloAuth] checksession err:', e.message);
    }
  }

  /**
   * Single getLoginInfo call with DOMAIN-FILTERED cookies.
   * Only sends cookies matching wpa.chat.zalo.me (zpsid, __zi, _zlang).
   * Does NOT send id.zalo.me cookies (nl_bc..., zpdid, zlogin_session)
   * which caused error 102 in all 44+ previous attempts.
   */
  async fetchLoginInfo(imei: string): Promise<ZaloLoginInfo | null> {
    try {
      const { params, enk } = buildEncryptedApiParams(imei, 'vi', 'getlogininfo');
      params.nretry = '0';

      const url = new URL('https://wpa.chat.zalo.me/api/login/getLoginInfo');
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      url.searchParams.set('zpw_ver', '665');
      url.searchParams.set('zpw_type', '30');

      // DOMAIN-FILTERED cookies — only send cookies matching wpa.chat.zalo.me
      const filteredCookies = this.cm.buildCookieHeaderForHost('wpa.chat.zalo.me');
      console.log('[ZaloAuth] getLoginInfo cookies (filtered):', filteredCookies.split('; ').map(c => c.split('=')[0]).join(', '));

      const res = await axios.get(url.toString(), {
        headers: {
          'User-Agent': ZALO_API.USER_AGENT,
          'Cookie': filteredCookies,
          'Origin': 'https://chat.zalo.me',
          'Referer': 'https://chat.zalo.me/',
        },
        timeout: 30_000,
        validateStatus: () => true,
      });

      // Collect response cookies (server may set zpw_sek via Set-Cookie)
      this.cm.collectFromResponse(res.headers);
      const sc = res.headers['set-cookie'];
      if (sc) {
        console.log('[ZaloAuth] getLoginInfo Set-Cookie:', sc.map((s: string) => s.split('=')[0]).join(', '));
      }

      if (res.data?.error_code !== 0 || !res.data?.data) {
        console.log('[ZaloAuth] getLoginInfo outer error:', res.data?.error_code, res.data?.error_message);
        return null;
      }

      const encData = typeof res.data.data === 'string' ? res.data.data : JSON.stringify(res.data.data);
      const decrypted = decryptAESCBC(enk, decodeURIComponent(encData));
      console.log('[ZaloAuth] getLoginInfo decrypted:', decrypted.slice(0, 200));

      const parsed = JSON.parse(decrypted);
      if (parsed.error_code && parsed.error_code !== 0) {
        console.log(`[ZaloAuth] getLoginInfo inner error ${parsed.error_code}: ${parsed.error_message}`);
        return null;
      }

      const info = parsed.data || parsed;
      if (info.zpw_enk) {
        console.log('[ZaloAuth] getLoginInfo SUCCESS! uid:', info.uid, 'zpw_enk:', info.zpw_enk.substring(0, 20) + '...');
        console.log('[ZaloAuth] service_map chat:', JSON.stringify(info.zpw_service_map_v3?.chat));
        return info;
      }
      console.log('[ZaloAuth] getLoginInfo: missing zpw_enk');
      return null;
    } catch (e: any) {
      console.error('[ZaloAuth] getLoginInfo error:', e.message);
      return null;
    }
  }

  buildSessionFromCookies(imei: string, loginInfo?: ZaloLoginInfo | null): { session: ZaloSession; credentials: ZaloCredentials } {
    const cookies = this.cm.exportCookies().map(c => ({
      ...c,
      secure: true,
      httpOnly: true,
      sameSite: 'none' as const,
      expirationDate: Date.now() / 1000 + 86400 * 30,
    }));

    // zpw_sek from checksession is already in cookies (104 chars)
    // Do NOT add zpw_enk as zpw_sek — they are different values
    // zpw_sek = session token for API auth
    // zpw_enk = encryption key for message encryption

    const session: ZaloSession = {
      uid: loginInfo?.uid || '',
      imei,
      userAgent: ZALO_API.USER_AGENT,
      language: ZALO_API.LANGUAGE,
      secretKey: loginInfo?.zpw_enk || '',
      loginInfo: loginInfo || {
        uid: '',
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
      cookies,
    };

    const credentials: ZaloCredentials = {
      imei,
      userAgent: ZALO_API.USER_AGENT,
      language: ZALO_API.LANGUAGE,
      cookie: cookies,
      loginInfo: loginInfo || undefined,
    };

    return { session, credentials };
  }

  async loginQR(onEvent: (event: string, data?: any) => void): Promise<{ session: ZaloSession; credentials: ZaloCredentials } | null> {
    const imei = this.generateIMEI();

    onEvent('generating_qr');
    const { qrImage, ver, code } = await this.generateQR(imei);
    onEvent('qr_code', { image: qrImage });

    if (!code) {
      onEvent('error', { message: 'No QR code received' });
      return null;
    }

    const ok = await this.waitForQRScan(ver, code, (s) => onEvent(s));
    if (!ok) { onEvent('qr_expired'); return null; }

    console.log('[ZaloAuth] QR confirmed — checksession...');
    onEvent('validating');

    await this.followChecksession();

    // GoClaw step: getUserInfo after checksession (validates session on backend)
    try {
      const uiRes = await this.zaloGet('https://jr.chat.zalo.me/jr/userinfo');
      console.log('[ZaloAuth] getUserInfo:', JSON.stringify(uiRes.data).substring(0, 200));
    } catch (e: any) {
      console.log('[ZaloAuth] getUserInfo err:', e.message);
    }

    // getLoginInfo with domain-filtered cookies
    const loginInfo = await this.fetchLoginInfo(imei);

    const { session, credentials } = this.buildSessionFromCookies(imei, loginInfo);

    console.log('[ZaloAuth] Session ready:');
    console.log('[ZaloAuth]   uid:', session.uid || '(empty)');
    console.log('[ZaloAuth]   zpw_sek:', session.cookies.some(c => c.name === 'zpw_sek'));
    console.log('[ZaloAuth]   cookies:', session.cookies.map(c => c.name).join(', '));
    onEvent('qr_done', { uid: session.uid });
    return { session, credentials };
  }

  private extractJSVersion(html: string): string {
    const patterns = [/main[_-]([\d.]+)\.js/, /main\.([a-f0-9]+)\.js/];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1];
    }
    return '';
  }
}
