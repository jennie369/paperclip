import { api } from "./client";

export type AgentProvider = "claude" | "gemini" | "openrouter";

export interface AgentSession {
  id: string;
  agent_slug: string;
  session_id: string;
  status: string;
  started_at: string;
  last_poll_at: string | null;
  last_activity_at: string | null;
  terminal_type: string;
  pid: number | null;
  // Joined from paperclip_agents:
  display_name?: string;
  avatar?: string;
}

export interface ActivityLogEntry {
  id: string;
  channel_name: string;
  sender_id: string;
  message: string;
  handled_by: string;
  handled_at: string;
  status: string;
}

export interface AgentConfig {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  avatar: string | null;
  provider: AgentProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  persona_file: string | null;
  language: string;
  tools: string[];
  can_escalate_to: string[];
  fallback_message: string;
  history_limit: number;
  session_timeout: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTestResult {
  reply: string;
  agent: string;
  provider: string;
  model: string;
  duration_ms: number;
}

export const PROVIDER_LABELS: Record<AgentProvider, string> = {
  claude: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  openrouter: "OpenRouter",
};

export const PROVIDER_MODELS: Record<AgentProvider, string[]> = {
  claude: [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-haiku-4-5-20251001",
  ],
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
  ],
  openrouter: [
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-opus-4-6",
    "anthropic/claude-haiku-4.5",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "openai/gpt-4.1",
    "openai/gpt-4.1-mini",
  ],
};

export const agentConfigsApi = {
  /** List all agent configs */
  fetchAll: () =>
    api.get<AgentConfig[]>("/channels/agent-configs"),

  /** Get a single agent config by slug */
  fetchBySlug: (slug: string) =>
    api.get<AgentConfig>(`/channels/agent-configs/${encodeURIComponent(slug)}`),

  /** Create a new agent config */
  create: (data: Partial<AgentConfig>) =>
    api.post<AgentConfig>("/channels/agent-configs", data),

  /** Update an existing agent config */
  update: (slug: string, data: Partial<AgentConfig>) =>
    api.patch<AgentConfig>(`/channels/agent-configs/${encodeURIComponent(slug)}`, data),

  /** Delete an agent config */
  delete: (slug: string) =>
    api.delete<{ success: boolean }>(`/channels/agent-configs/${encodeURIComponent(slug)}`),

  /** Test an agent reply */
  test: (slug: string, message: string) =>
    api.post<AgentTestResult>(`/channels/agent-configs/${encodeURIComponent(slug)}/test`, { message }),

  /** List all agent sessions */
  listSessions: () =>
    api.get<AgentSession[]>("/channels/agent-configs/sessions"),

  /** Clear/stop sessions for a specific agent */
  clearSession: (slug: string) =>
    api.post<{ success: boolean }>(`/channels/agent-configs/sessions/${encodeURIComponent(slug)}/clear`, {}),

  /** Clear all agent sessions */
  clearAllSessions: () =>
    api.post<{ success: boolean }>("/channels/agent-configs/sessions/clear-all", {}),

  /** Recent activity log */
  listActivity: () =>
    api.get<ActivityLogEntry[]>("/channels/agent-configs/sessions/activity"),
};
