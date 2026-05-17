// packages/server/src/channels/facebook-web/protocol/cookies.ts
//
// Cookie manager for Facebook Web Reverse Protocol.
// Ported from zalo-personal/protocol/cookies.ts.
//
// Critical design (anti-overwrite pattern): cookies keyed by `name|domain`,
// so cookies from `.facebook.com`, `.messenger.com`, `business.facebook.com`
// don't overwrite each other (same name `xs` exists on multiple domains).

import type { FbCookie } from './message.js';

interface RawCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  raw: string;
}

export class FbCookieManager {
  private cookies: Map<string, RawCookie> = new Map();

  /** Default domain for cookies missing explicit domain attribute */
  private defaultDomain = '.facebook.com';

  /**
   * Collect cookies from a HTTP response `set-cookie` header(s).
   * Mirrors Go http.CookieJar lenient behavior.
   */
  collectFromResponse(headers: Record<string, any>): void {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return;
    const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
    for (const raw of arr) {
      const parsed = this.parseSetCookie(raw);
      if (!parsed || !parsed.name) continue;

      if (!parsed.value || parsed.value === 'deleted') continue;

      const key = `${parsed.name}|${parsed.domain}`;
      this.cookies.set(key, parsed);
    }
  }

  /**
   * Import cookies from Cookie-Editor JSON export (or saved credentials).
   */
  importCookies(cookies: FbCookie[]): void {
    for (const c of cookies) {
      const domain = c.domain || this.defaultDomain;
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

  /**
   * Build cookie header sending ALL cookies (no domain filter).
   * Use sparingly — prefer buildCookieHeaderForHost().
   */
  buildCookieHeader(): string {
    return Array.from(this.cookies.values())
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  /**
   * Build cookie header filtered by host (Go CookieJar behavior).
   * e.g. host="business.facebook.com" → sends `.facebook.com` cookies but NOT `.messenger.com`.
   * Deduplicate by name (last matching domain wins — most specific cookie).
   */
  buildCookieHeaderForHost(host: string): string {
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
    const d = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
    if (host === d) return true;
    if (host.endsWith('.' + d)) return true;
    return false;
  }

  /** Export cookies for persistence (DB credentials_encrypted blob) */
  exportCookies(): FbCookie[] {
    return Array.from(this.cookies.values()).map(c => ({
      domain: c.domain,
      name: c.name,
      value: c.value,
      path: c.path,
    }));
  }

  /** Get a single cookie value by name + optional domain hint */
  get(name: string, domain?: string): string | undefined {
    if (domain) {
      return this.cookies.get(`${name}|${domain}`)?.value;
    }
    // Search all domains, return first match
    for (const c of this.cookies.values()) {
      if (c.name === name) return c.value;
    }
    return undefined;
  }

  /** Set a single cookie (for token refresh updates) */
  set(name: string, value: string, domain: string = this.defaultDomain, path: string = '/'): void {
    const key = `${name}|${domain}`;
    this.cookies.set(key, { name, value, domain, path, raw: `${name}=${value}` });
  }

  /** Total cookie count (sanity check) */
  size(): number {
    return this.cookies.size;
  }

  private parseSetCookie(raw: string): RawCookie | null {
    const parts = raw.split(';').map(p => p.trim());
    if (!parts.length) return null;
    const eqIndex = parts[0].indexOf('=');
    if (eqIndex === -1) return null;
    const name = parts[0].substring(0, eqIndex).trim();
    const value = parts[0].substring(eqIndex + 1).trim();
    if (!name) return null;

    let domain = this.defaultDomain;
    let path = '/';
    for (const attr of parts.slice(1)) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('domain=')) domain = attr.substring(7).trim();
      else if (lower.startsWith('path=')) path = attr.substring(5).trim();
    }
    return { name, value, domain, path, raw };
  }

  debugLog(): void {
    console.log('[FbCookies] Current cookies:');
    const byDomain = new Map<string, string[]>();
    for (const c of this.cookies.values()) {
      if (!byDomain.has(c.domain)) byDomain.set(c.domain, []);
      byDomain.get(c.domain)!.push(c.name);
    }
    for (const [domain, names] of byDomain) {
      console.log(`  ${domain}: ${names.join(', ')}`);
    }
  }
}
