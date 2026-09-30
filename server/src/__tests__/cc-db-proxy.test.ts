import { describe, it, expect } from 'vitest';
import { checkCcDbRequest } from '../channels/cc-db-proxy.js';

describe('cc-db-proxy checkCcDbRequest (GEM-1069)', () => {
  it('cho phép đọc/ghi 2 bảng allowlist', () => {
    expect(checkCcDbRequest('GET', 'cc_email_sends', 'select=*&campaign_id=eq.1').ok).toBe(true);
    expect(checkCcDbRequest('HEAD', 'cc_email_sends', 'select=*').ok).toBe(true);
    expect(checkCcDbRequest('POST', 'cc_generation_jobs', 'select=*').ok).toBe(true);
    expect(checkCcDbRequest('PATCH', 'cc_generation_jobs', 'id=eq.abc').ok).toBe(true);
    expect(checkCcDbRequest('DELETE', 'cc_email_sends', 'campaign_id=eq.1&status=eq.pending').ok).toBe(true);
  });

  it('từ chối bảng ngoài allowlist (service_role không được lan sang bảng khác)', () => {
    for (const t of ['profiles', 'cc_email_campaigns', 'frequency_leads', '']) {
      const r = checkCcDbRequest('GET', t, 'select=*');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(403);
    }
  });

  it('từ chối method lạ', () => {
    const r = checkCcDbRequest('PUT', 'cc_email_sends', 'id=eq.1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(405);
  });

  it('chặn embedded select (đọc lan qua FK)', () => {
    for (const q of ['select=*,cc_email_campaigns(*)', 'select=id,campaign:cc_email_campaigns!inner(name)']) {
      const r = checkCcDbRequest('GET', 'cc_email_sends', q);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });

  it('PATCH/DELETE không bộ lọc bị chặn (không sửa/xoá cả bảng)', () => {
    for (const m of ['PATCH', 'DELETE']) {
      for (const q of ['', 'select=*', 'select=*&limit=10&order=id.asc']) {
        const r = checkCcDbRequest(m, 'cc_generation_jobs', q);
        expect(r.ok).toBe(false);
      }
    }
  });
});
