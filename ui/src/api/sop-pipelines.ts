// Pipeline API client — wraps /api/ops/sop-engine/pipelines/*
// Used by the Pipelines tab in SopEnginePage.

const BASE = '/api/ops/sop-engine';

export type PipelineBlockType = 'sop' | 'approval' | 'action';

export interface PipelineBlock {
  type: PipelineBlockType;
  ref: string;
  label: string;
  note?: string;
  executor?: string;
  trigger?: string;
}

export interface Pipeline {
  pipeline_id: string;
  title: string;
  emoji: string | null;
  category: 'Content' | 'Marketing' | 'Sales' | 'Ops' | 'Custom';
  schedule: string | null;
  description: string | null;
  blocks: PipelineBlock[];
  is_template: boolean;
  parent_template_id: string | null;
  display_order: number;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  run_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineTemplateSummary {
  pipeline_id: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
  block_count: number;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const pipelineApi = {
  // Templates
  listTemplates: () => json<PipelineTemplateSummary[]>('/pipelines/templates'),
  seedTemplates: () => json<{ seeded: number; errors: string[] }>('/pipelines/seed', { method: 'POST' }),

  // CRUD
  list: (filter?: { is_template?: boolean; category?: string }) => {
    const params = new URLSearchParams();
    if (filter?.is_template !== undefined) params.set('is_template', String(filter.is_template));
    if (filter?.category) params.set('category', filter.category);
    const q = params.toString();
    return json<Pipeline[]>(`/pipelines${q ? `?${q}` : ''}`);
  },
  get: (id: string) => json<Pipeline>(`/pipelines/${id}`),
  create: (body: {
    templateId?: string;
    title?: string;
    category?: string;
    description?: string;
    emoji?: string;
    blocks?: PipelineBlock[];
  }) =>
    json<Pipeline>('/pipelines', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, patch: Partial<Pick<Pipeline, 'title' | 'emoji' | 'category' | 'schedule' | 'description' | 'blocks' | 'enabled' | 'display_order'>>) =>
    json<Pipeline>(`/pipelines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  reorder: (orderedIds: string[]) =>
    json<{ ok: boolean; reordered: number }>('/pipelines/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }),
  delete: (id: string) =>
    json<{ ok: boolean }>(`/pipelines/${id}`, { method: 'DELETE' }),

  // Execute — returns EventSource for SSE
  executeUrl: (id: string) => `${BASE}/pipelines/${id}/execute`,
};

// SOP list — used by Add Step combobox
export interface SopSummary {
  sop_id: string;
  name: string;
  domain: string;
  status: string;
  priority: string;
}

export async function listSopsForCombobox(): Promise<SopSummary[]> {
  const res = await fetch(`${BASE}/sops`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((s: any) => ({
    sop_id: s.sop_id,
    name: s.name,
    domain: s.domain,
    status: s.status,
    priority: s.priority,
  }));
}
