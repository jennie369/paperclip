// Knowledge Graph API Client — Mắt Thần CEO

import { api } from "./client";
import type {
  KGEntity,
  KGRelation,
  KGGraphData,
  KGStats,
  KGDedupCandidate,
  KGExtractionResult,
} from "./kg-types";

const BASE = "/ops/kg";

export const knowledgeGraphApi = {
  // GET /entities — List/search
  getEntities: (params?: { type?: string; search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<{ data: KGEntity[]; total: number }>(`${BASE}/entities${q ? `?${q}` : ""}`);
  },

  // GET /entities/:id — Detail
  getEntity: (id: string) =>
    api.get<{ entity: KGEntity; relations: KGRelation[]; related_entities: KGEntity[] }>(
      `${BASE}/entities/${id}`,
    ),

  // POST /entities — Create/upsert
  upsertEntity: (entity: Partial<KGEntity> & { external_id: string; entity_type: string; name: string }) =>
    api.post<{ data: KGEntity }>(`${BASE}/entities`, entity),

  // DELETE /entities/:id
  deleteEntity: (id: string) => api.delete<{ success: boolean }>(`${BASE}/entities/${id}`),

  // GET /graph — Visualization data
  getGraph: (params?: { limit?: number; types?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.types) qs.set("types", params.types);
    const q = qs.toString();
    return api.get<KGGraphData>(`${BASE}/graph${q ? `?${q}` : ""}`);
  },

  // POST /traverse — Depth traversal
  traverse: (params: { start_id?: string; external_id?: string; max_depth?: number; rel_types?: string[] }) =>
    api.post<{ entities: KGEntity[]; relations: KGRelation[] }>(`${BASE}/traverse`, params),

  // POST /ingest — LLM extraction results
  ingest: (data: KGExtractionResult) =>
    api.post<{ entities_upserted: number; relations_upserted: number }>(`${BASE}/ingest`, data),

  // POST /seed — Trigger seeding
  seed: () => api.post<{ entities_upserted: number; relations_upserted: number; errors: string[] }>(`${BASE}/seed`, {}),

  // GET /stats
  getStats: () => api.get<KGStats>(`${BASE}/stats`),

  // GET /dedup
  getDedup: (status = "pending") =>
    api.get<{ data: KGDedupCandidate[] }>(`${BASE}/dedup?status=${status}`),

  // POST /merge
  merge: (targetId: string, sourceId: string) =>
    api.post<{ success: boolean }>(`${BASE}/merge`, { target_id: targetId, source_id: sourceId }),
};
