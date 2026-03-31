import { api } from "./client";

export interface QACriteria {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  weight: number;
  pass_threshold: number | null;
  enabled: boolean;
  created_at: string;
}

export interface QAEvaluation {
  id: string;
  session_key: string;
  channel_name: string;
  channel_type: string;
  agent_slug: string;
  customer_id: string;
  customer_name: string;
  score: number;
  verdict: "pass" | "fail";
  pass_threshold: number;
  message_count: number;
  criteria_scores: Record<string, { score: number; maxScore: number; notes: string }>;
  violations: Array<{ criterion: string; description: string; severity: string }>;
  categories: string[];
  sentiment: string;
  suggestions: string[];
  summary: string;
  conversation_snapshot: Array<{ role: string; content: string }>;
  evaluation_type: string;
  evaluated_at: string;
  created_at: string;
}

export interface QAReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  total_conversations: number;
  total_evaluated: number;
  avg_score: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  agent_scores: Record<string, { avg_score: number; count: number; pass_rate: number }>;
  top_violations: Array<{ name: string; count: number }>;
  created_at: string;
}

export interface QAStats {
  totalEvaluations: number;
  todayEvaluations: number;
  avgScore: number;
  passRate: number;
  recentCount: number;
}

export const qaApi = {
  // Criteria
  listCriteria: () => api.get<QACriteria[]>("/channels/qa/criteria"),
  updateCriteria: (id: string, updates: Partial<QACriteria>) =>
    api.patch<QACriteria>(`/channels/qa/criteria/${id}`, updates),

  // Evaluations
  listEvaluations: (params?: { agent_slug?: string; verdict?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.agent_slug) qs.set("agent_slug", params.agent_slug);
    if (params?.verdict) qs.set("verdict", params.verdict);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<QAEvaluation[]>(`/channels/qa/evaluations${q ? `?${q}` : ""}`);
  },

  getEvaluation: (id: string) => api.get<QAEvaluation>(`/channels/qa/evaluations/${id}`),

  evaluate: (sessionKey: string) =>
    api.post<QAEvaluation>("/channels/qa/evaluate", { session_key: sessionKey }),

  evaluateBatch: (params: { session_keys?: string[]; all_unreviewed?: boolean; limit?: number }) =>
    api.post<{ evaluated: number; remaining: number; results: any[] }>("/channels/qa/evaluate-batch", params),

  // Reports
  listReports: (params?: { report_type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.report_type) qs.set("report_type", params.report_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<QAReport[]>(`/channels/qa/reports${q ? `?${q}` : ""}`);
  },

  generateReport: (params: { report_type: string; period_start?: string; period_end?: string }) =>
    api.post<QAReport>("/channels/qa/reports/generate", params),

  // Stats
  getStats: () => api.get<QAStats>("/channels/qa/stats"),
};
