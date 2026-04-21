import { api } from "./client";

export type DelegationTurnMode = "ask" | "do" | "delegate";

export type DelegationStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "failed"
  | "cancelled"
  | "timeout";

export interface DelegationMeta {
  timeoutMs: number;
  turnMode: DelegationTurnMode;
}

export interface DelegationRow {
  id: string;
  traceId: string;
  companyId: string;
  callerAgentId: string;
  targetAgentId: string;
  parentIssueId: string | null;
  status: DelegationStatus;
  requestedAt: string;
  completedAt: string | null;
  depth: number;
  meta: DelegationMeta;
  task: string;
}

export const delegationsApi = {
  list: (companyId: string, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : "";
    return api.get<DelegationRow[]>(`/companies/${companyId}/delegations${qs}`);
  },
  get: (traceId: string) => api.get<DelegationRow>(`/delegations/${traceId}`),
};
