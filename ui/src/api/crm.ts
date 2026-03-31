// CRM API client — all CRM endpoints

const BASE = '/api/channels/crm';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Customers ───

export interface CRMCustomer {
  id: string;
  display_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  status: string;
  lead_score: number;
  lead_temperature: string;
  ai_summary?: string;
  total_orders: number;
  total_revenue: number;
  total_conversations: number;
  gemral_data?: any;
  gemral_user_id?: string;
  assigned_agent?: string;
  channels?: any[];
  first_contact_at?: string;
  last_contact_at?: string;
  created_at: string;
}

export interface CustomerListResponse {
  data: CRMCustomer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const crmApi = {
  // Customers
  getCustomers: (params?: Record<string, string>) =>
    fetchJSON<CustomerListResponse>(`${BASE}/customers?${new URLSearchParams(params || {})}`),

  getCustomer: (id: string) =>
    fetchJSON<CRMCustomer & { orders: any[]; tickets: any[]; notes: any[]; interactions: any[]; tags: any[] }>(
      `${BASE}/customers/${id}`
    ),

  createCustomer: (data: Partial<CRMCustomer>) =>
    fetchJSON<CRMCustomer>(`${BASE}/customers`, { method: 'POST', body: JSON.stringify(data) }),

  updateCustomer: (id: string, data: Partial<CRMCustomer>) =>
    fetchJSON<CRMCustomer>(`${BASE}/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Stats & Pipeline
  getStats: () => fetchJSON<{
    totalCustomers: number;
    totalOrders: number;
    openTickets: number;
    totalRevenue: number;
    newToday: number;
  }>(`${BASE}/stats`),

  getPipeline: () => fetchJSON<Record<string, number>>(`${BASE}/pipeline`),
  getTags: () => fetchJSON<any[]>(`${BASE}/tags`),

  // Gemral
  syncGemral: (customerId: string) =>
    fetchJSON<any>(`${BASE}/customers/${customerId}/sync-gemral`, { method: 'POST' }),

  linkGemral: (customerId: string, data: { email?: string; phone?: string }) =>
    fetchJSON<any>(`${BASE}/customers/${customerId}/link-gemral`, { method: 'POST', body: JSON.stringify(data) }),

  // Tickets
  getTickets: (params?: Record<string, string>) =>
    fetchJSON<any>(`${BASE}/tickets?${new URLSearchParams(params || {})}`),

  getTicketStats: () => fetchJSON<any>(`${BASE}/tickets/stats`),

  getTicket: (id: string) => fetchJSON<any>(`${BASE}/tickets/${id}`),

  createTicket: (data: any) =>
    fetchJSON<any>(`${BASE}/tickets`, { method: 'POST', body: JSON.stringify(data) }),

  updateTicket: (id: string, data: any) =>
    fetchJSON<any>(`${BASE}/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  escalateTicket: (id: string, data: { escalate_to: string; reason?: string }) =>
    fetchJSON<any>(`${BASE}/tickets/${id}/escalate`, { method: 'POST', body: JSON.stringify(data) }),

  resolveTicket: (id: string, data?: { resolution_note?: string }) =>
    fetchJSON<any>(`${BASE}/tickets/${id}/resolve`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // Orders
  getOrders: (params?: Record<string, string>) =>
    fetchJSON<any>(`${BASE}/orders?${new URLSearchParams(params || {})}`),

  getOrderStats: () => fetchJSON<any>(`${BASE}/orders/stats`),

  getOrder: (id: string) => fetchJSON<any>(`${BASE}/orders/${id}`),

  createOrder: (data: any) =>
    fetchJSON<any>(`${BASE}/orders`, { method: 'POST', body: JSON.stringify(data) }),

  updateOrder: (id: string, data: any) =>
    fetchJSON<any>(`${BASE}/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
