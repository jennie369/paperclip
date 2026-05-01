// Training API client — talks to /api/training/* endpoints from
// paperclip/server/src/training/training-routes.ts

import { api } from "./client";

export type TrainingStatus = "running" | "reviewing" | "completed" | "failed" | "cancelled";

export interface TrainingSession {
  id: string;
  agent_slug: string;
  scenario_focus: string;
  ceo_model: string | null;
  reviewer_model: string | null;
  status: TrainingStatus;
  total_turns: number | null;
  max_turns: number | null;
  opus_score: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface TrainingTurn {
  turn_no: number;
  role: "ceo" | "agent";
  content: string;
  tool_calls: unknown;
  tool_results: unknown;
  ts: string;
}

export interface TrainingScore {
  rubric_key: string;
  score_0_100: number;
  opus_feedback: string;
  ts: string;
}

export interface StartTrainingPayload {
  agent_slug: string;
  scenario: string;
  ceo_model?: string;
  max_turns?: number;
}

export interface StartTrainingResponse {
  session_id: string;
  status: string;
}

// Server returns enveloped responses: { sessions: [], turns: [], scores: [] }
export interface ToolAuditEntry {
  id: string;
  agent_slug: string;
  session_key: string | null;
  tool_name: string;
  args: unknown;
  result_summary: string | null;
  target_customer_id: string | null;
  success: boolean;
  error: string | null;
  ts: string;
}

export interface ListAuditLogParams {
  agent?: string;
  tool?: string;
  success?: "true" | "false";
  limit?: number;
}

export const trainingApi = {
  start: (payload: StartTrainingPayload) =>
    api.post<StartTrainingResponse>("/training/start", payload),

  cancel: (sessionId: string) =>
    api.post<{ cancelled: boolean }>("/training/cancel", { session_id: sessionId }),

  listSessions: async (limit: number = 50): Promise<TrainingSession[]> => {
    const res = await api.get<{ sessions: TrainingSession[] }>(
      `/training/sessions?limit=${limit}`,
    );
    return res.sessions || [];
  },

  getTurns: async (sessionId: string): Promise<TrainingTurn[]> => {
    const res = await api.get<{ turns: TrainingTurn[] }>(
      `/training/sessions/${sessionId}/turns`,
    );
    return res.turns || [];
  },

  getScores: async (sessionId: string): Promise<TrainingScore[]> => {
    const res = await api.get<{ scores: TrainingScore[] }>(
      `/training/sessions/${sessionId}/scores`,
    );
    return res.scores || [];
  },

  listAuditLog: async (params: ListAuditLogParams = {}): Promise<ToolAuditEntry[]> => {
    const qs = new URLSearchParams();
    if (params.agent) qs.set("agent", params.agent);
    if (params.tool) qs.set("tool", params.tool);
    if (params.success) qs.set("success", params.success);
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await api.get<{ entries: ToolAuditEntry[] }>(`/training/audit-log${suffix}`);
    return res.entries || [];
  },
};

/**
 * Open a WebSocket to the live training stream for a given session.
 * Caller is responsible for handling onmessage/onclose/onerror and calling
 * close() when done.
 *
 * Returns null if the WebSocket fails to construct (rare — only on URL error).
 */
export function openTrainingLiveSocket(sessionId: string): WebSocket | null {
  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/training/live/${sessionId}`;
    return new WebSocket(url);
  } catch (err) {
    return null;
  }
}
