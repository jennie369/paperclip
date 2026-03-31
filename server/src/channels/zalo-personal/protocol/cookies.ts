/**
 * Manual cookie manager — KHÔNG validate domain, expiry, SameSite
 * Giống Go http.CookieJar behavior
 *
 * Lý do: Zalo set cookies expired + cross-domain → tough-cookie reject
 * Go CookieJar giữ tất cả cookies bất kể expiry.
 */

interface RawCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  raw: string;
}

export class ZaloCookieManager {
  private cookies: Map<string, RawCookie> = new Map();

  collectFromResponse(headers: Record<string, any>): void {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return;
    const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
    for (const raw of arr) {
      const parsed = this.parseSetCookie(raw);
      if (!parsed || !parsed.name) continue;

      // Log zpw_sek/zpw_enk for debugging
      if (parsed.name === 'zpw_sek' || parsed.name === 'zpw_enk') {
        console.log(`[ZaloCookies] ${parsed.name} = "${parsed.value.substring(0, 30)}${parsed.value.length > 30 ? '...' : ''}" (${parsed.value.length} chars) domain=${parsed.domain}`);
      }

      // Skip truly empty values (server wants to delete cookie)
      if (!parsed.value || parsed.value === 'deleted') {
        continue;
      }

      // Value "EXPIRED" is Zalo's way of clearing a cookie.
      if (parsed.value === 'EXPIRED') {
        const key = `${parsed.name}|${parsed.domain}`;
        this.cookies.delete(key);
        continue;
      }

      // Key by name|domain so cookies from different domains don't overwrite
      // e.g. zpsid|zalo.me and zpsid|zaloapp.com coexist
      const key = `${parsed.name}|${parsed.domain}`;
      this.cookies.set(key, parsed);
    }
  }

  buildCookieHeader(): string {
    return Array.from(this.cookies.values())
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  /**
   * Build cookie header filtered by host (like Go's CookieJar).
   * Only sends cookies whose domain matches the target host.
   * e.g. host="wpa.chat.zalo.me" → sends .zalo.me and .chat.zalo.me cookies
   *      but NOT id.zalo.me cookies.
   */
  buildCookieHeaderForHost(host: string): string {
    // Deduplicate by name — last matching cookie wins
    const byName = new Map<string, string>();
    for (const c of this.cookies.values()) {
      if (this.domainMatches(c.domain, host)) {
        byName.set(c.name, c.value);
      }
    }
    return Array.from(byName.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  private domainMatches(cookieDomain: string, host: string): boolean {
    // Normalize: strip leading dot
    const d = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
    // Exact match
    if (host === d) return true;
    // Subdomain match: cookie domain "zalo.me" matches "wpa.chat.zalo.me"
    if (host.endsWith('.' + d)) return true;
    return false;
  }

  exportCookies(): Array<{ domain: string; name: string; value: string; path: string }> {
    return Array.from(this.cookies.values()).map(c => ({
      domain: c.domain,
      name: c.name,
      value: c.value,
      path: c.path,
    }));
  }

  importCookies(cookies: Array<{ name: string; value: string; domain?: string; path?: string }>): void {
    for (const c of cookies) {
      const domain = c.domain || '.zalo.me';
      const key = `${c.name}|${domain}`;
      this.cookies.set(key, {
        name: c.name,
        value: c.value,
        domain,
        path: c.path || '/',
        raw: `${c.name}=${c.value}`,
      });
    }
  }

  private parseSetCookie(raw: string): RawCookie | null {
    const parts = raw.split(';').map(p => p.trim());
    if (!parts.length) return null;
    const eqIndex = parts[0].indexOf('=');
    if (eqIndex === -1) return null;
    const name = parts[0].substring(0, eqIndex).trim();
    const value = parts[0].substring(eqIndex + 1).trim();
    if (!name) return null;

    let domain = '.zalo.me';
    let path = '/';
    for (const attr of parts.slice(1)) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('domain=')) domain = attr.substring(7).trim();
      else if (lower.startsWith('path=')) path = attr.substring(5).trim();
      // Ignore: expires, max-age, secure, httponly, samesite
    }
    return { name, value, domain, path, raw };
  }

  debugLog(): void {
    console.log('[ZaloCookies] Current cookies:');
    for (const [, c] of this.cookies) {
      console.log(`  ${c.name} = ${c.value.substring(0, 20)}... (${c.domain})`);
    }
  }
}
