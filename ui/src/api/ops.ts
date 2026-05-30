// Operations API client — Content Pipeline + Affiliate + Scanner

const BASE = '/api/ops';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers as Record<string, string> },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Lỗi ${res.status}`);
  }
  return res.json();
}

export const opsApi = {
  // ── Content Pipeline ──
  getContentStats: () => fetchJSON<any>(`${BASE}/content-pipeline/stats`),
  getContentSchedule: (date?: string) => fetchJSON<any>(`${BASE}/content-pipeline/schedule${date ? `?date=${date}` : ''}`),
  getScripts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<any[]>(`${BASE}/content-pipeline/scripts${qs}`);
  },
  updateScript: (id: string, data: any) => fetchJSON<any>(`${BASE}/content-pipeline/scripts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveScript: (id: string) => fetchJSON<any>(`${BASE}/content-pipeline/scripts/${id}/approve`, { method: 'POST' }),
  dispatchScript: (id: string) => fetchJSON<any>(`${BASE}/content-pipeline/scripts/${id}/dispatch`, { method: 'POST' }),
  rejectScript: (id: string, reason: string) => fetchJSON<any>(`${BASE}/content-pipeline/scripts/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  deleteScript: (id: string) => fetchJSON<any>(`${BASE}/content-pipeline/scripts/${id}`, { method: 'DELETE' }),
  runCron: (name: string) => fetchJSON<any>(`${BASE}/content-pipeline/cron/${name}/run`, { method: 'POST' }),

  // ── New CCAIGen endpoints ──
  getBatchStatus: () => fetchJSON<any>(`${BASE}/content-pipeline/batch/status`),
  startBatch: () => fetchJSON<any>(`${BASE}/content-pipeline/batch/start`, { method: 'POST' }),
  stopBatch: () => fetchJSON<any>(`${BASE}/content-pipeline/batch/stop`, { method: 'POST' }),
  generateContent: (data: any) => fetchJSON<any>(`${BASE}/content-pipeline/generate`, { method: 'POST', body: JSON.stringify(data) }),
  
  getEmailSequences: () => fetchJSON<any>(`${BASE}/email/sequences`),
  sendEmail: (data: any) => fetchJSON<any>(`${BASE}/email/send`, { method: 'POST', body: JSON.stringify(data) }),
  saveEmailHint: (stepId: string, data: any) => fetchJSON<any>(`${BASE}/email/steps/${stepId}/hint`, { method: 'PATCH', body: JSON.stringify(data) }),

  uploadSocialMedia: (formData: FormData) => {
    // FormData requires omitting Content-Type so browser sets boundary
    return fetch('/api/social/upload', { method: 'POST', body: formData })
      .then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json(); });
  },
  getSocialPages: () => fetch('/api/social/pages').then(r => r.json()),
  publishSocialMedia: (data: any) => fetchJSON<any>(`/api/social/publish`, { method: 'POST', body: JSON.stringify(data) }),
  commentSocialMedia: (data: any) => fetchJSON<any>(`/api/social/comment`, { method: 'POST', body: JSON.stringify(data) }),
  
  speechToText: (formData: FormData) => {
    return fetch('/api/speech', { method: 'POST', body: formData })
      .then(r => { if (!r.ok) throw new Error('Speech transcription failed'); return r.json(); });
  },
  
  submitKnowledgeFeedback: (data: any) => fetchJSON<any>(`/api/knowledge/feedback`, { method: 'POST', body: JSON.stringify(data) }),


  // ── Affiliate ──
  getAffiliateStats: () => fetchJSON<any>(`${BASE}/affiliate/stats`),
  getAffiliateList: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON<any[]>(`${BASE}/affiliate/list${qs}`);
  },
  getAffiliatePending: () => fetchJSON<any[]>(`${BASE}/affiliate/pending`),
  approveAffiliate: (id: string) => fetchJSON<any>(`${BASE}/affiliate/${id}/approve`, { method: 'POST' }),
  rejectAffiliate: (id: string, reason: string) => fetchJSON<any>(`${BASE}/affiliate/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateAffiliateTier: (id: string, tier: string) => fetchJSON<any>(`${BASE}/affiliate/${id}/tier`, { method: 'PUT', body: JSON.stringify({ tier }) }),
  updateAffiliateStatus: (id: string, active: boolean) => fetchJSON<any>(`${BASE}/affiliate/${id}/status`, { method: 'PUT', body: JSON.stringify({ is_active: active }) }),
  payCommission: (id: string) => fetchJSON<any>(`${BASE}/affiliate/${id}/pay-commission`, { method: 'POST' }),
  getCommissionDetails: (id: string) => fetchJSON<any[]>(`${BASE}/affiliate/${id}/commission`),

  // ── Scanner ──
  getScannerStats: () => fetchJSON<any>(`${BASE}/scanner/stats`),
  getRecentPatterns: (limit = 20) => fetchJSON<any[]>(`${BASE}/scanner/recent-patterns?limit=${limit}`),
  triggerScan: (data: any) => fetchJSON<any>(`${BASE}/scanner/scan`, { method: 'POST', body: JSON.stringify(data) }),
  getWinRates: () => fetchJSON<any>(`${BASE}/scanner/win-rates`),
  getScannerConfig: () => fetchJSON<any>(`${BASE}/scanner/config`),
  updateScannerConfig: (data: any) => fetchJSON<any>(`${BASE}/scanner/config`, { method: 'PUT', body: JSON.stringify(data) }),
};
