import { api } from "./client";

export interface ChannelInstance {
  id: string;
  name: string;
  display_name: string;
  channel_type: string;
  status: string;
  status_message?: string;
  zalo_uid?: string;
  zalo_name?: string;
  enabled: boolean;
  config: Record<string, unknown>;
  agent_id?: string;
  agent_slug?: string;
  dm_policy?: string;
  group_policy?: string;
  require_mention?: boolean;
  allow_from?: string[];
  paired_users?: string[];
  quota_hour?: number;
  quota_day?: number;
  history_limit?: number;
  save_contacts_to_crm?: boolean;
  last_connected_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PendingMessage {
  id: string;
  channel_name: string;
  thread_id: string;
  thread_type: string;
  from_uid: string;
  sender_name: string;
  message_id: string;
  body: string;
  content_type: string;
  status: string;
  direction?: "inbound" | "outbound";
  agent_slug?: string;
  session_key?: string;
  sent_by?: string;
  media?: string[] | null;
  extra_data?: Record<string, unknown>;
  ts: string;
  created_at: string;
}

export interface ChannelSession {
  id: string;
  session_key: string;
  channel_name: string | null;
  agent_slug: string | null;
  peer_kind: "direct" | "group";
  chat_id: string;
  sender_id: string | null;
  sender_name: string | null;
  history: Array<{ role: string; content: string; timestamp: string; senderName?: string }>;
  history_count: number;
  status: string;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Phase 0: Unified Inbox fields
  is_pinned?: boolean;
  is_muted?: boolean;
  is_deleted?: boolean;
  label?: "hot" | "warm" | "cold" | "vip" | "spam" | null;
  unread_count?: number;
  last_message_preview?: string | null;
  last_message_sender?: string | null;
  has_attachments?: boolean;
  // Group chat fields
  is_group?: boolean;
  group_name?: string | null;
  member_count?: number;
  customer_id?: string | null;
  customer?: {
    id: string;
    display_name: string | null;
    phone: string | null;
    email?: string | null;
    avatar_url: string | null;
    lead_score: number | null;
    lead_temperature: string | null;
    status: string | null;
    tags?: string[];
    ai_summary?: string | null;
    gemral_data?: Record<string, unknown> | null;
  } | null;
}

export interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  body?: string;
  contentType?: string;
  content_type?: string;
  media: string[] | null;
  senderName: string | null;
  senderId: string | null;
  status: string;
  handledBy: string | null;
  skipReason: string | null;
  timestamp: string;
  extra_data?: Record<string, unknown>;
  extraData?: Record<string, unknown>;
}

export type ConversationLabel = "hot" | "warm" | "cold" | "vip" | "spam";

export interface CostSummary {
  today: { cost: number; tokens_in: number; tokens_out: number; replies: number };
  week: { cost: number; tokens_in: number; tokens_out: number; replies: number };
  month: { cost: number; tokens_in: number; tokens_out: number; replies: number };
  avg_cost_per_reply: number;
}

export interface ActivityLogEntry {
  id: string;
  channel_name: string;
  thread_id: string;
  sender_name: string;
  body: string;
  status: string;
  handled_by: string | null;
  skip_reason: string | null;
  agent_slug: string | null;
  session_key: string | null;
  created_at: string;
}

export interface ChannelStats {
  messagesInboundToday: number;
  messagesSentToday: number;
  messagesHandledToday: number;
  responseRate: number;
  activeSessions: number;
  channels: Array<{
    name: string;
    channel_type: string;
    status: string;
    enabled: boolean;
  }>;
}

export interface PairingCode {
  id: string;
  channel_name: string;
  sender_id: string;
  sender_name: string;
  code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export const channelsApi = {
  // --- Zalo Personal specific ---
  listZaloPersonal: () =>
    api.get<ChannelInstance[]>("/channels/zalo-personal"),

  sendMessage: (channelName: string, threadId: string, message: string, threadType = "dm") =>
    api.post<{ success: boolean; error?: string }>("/channels/send", {
      channel_name: channelName,
      thread_id: threadId,
      message,
      thread_type: threadType,
    }),

  startChannel: (name: string) =>
    api.post<{ status: string }>(`/channels/zalo-personal/${name}/start`, {}),

  stopChannel: (name: string) =>
    api.post<{ status: string }>(`/channels/zalo-personal/${name}/stop`, {}),

  deleteChannel: (name: string) =>
    api.delete(`/channels/zalo-personal/${name}`),

  getMessages: (name: string, threadId?: string, limit = 50) =>
    api.get<PendingMessage[]>(
      `/channels/zalo-personal/${name}/messages?limit=${limit}${threadId ? `&thread_id=${threadId}` : ""}`
    ),

  uploadImage: (channelName: string, threadId: string, file: File, threadType = "dm", caption?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("channel_name", channelName);
    formData.append("thread_id", threadId);
    formData.append("thread_type", threadType);
    if (caption) formData.append("caption", caption);
    return api.postForm<{ success: boolean; error?: string }>("/channels/zalo-personal/upload", formData);
  },

  // --- Cross-channel endpoints ---
  listInstances: () =>
    api.get<ChannelInstance[]>("/channels/instances"),

  getStats: () =>
    api.get<ChannelStats>("/channels/stats"),

  listSessions: (params?: { status?: string; channel_name?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.channel_name) qs.set("channel_name", params.channel_name);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<ChannelSession[]>(`/channels/sessions${q ? `?${q}` : ""}`);
  },

  getSession: (sessionKey: string) =>
    api.get<ChannelSession>(`/channels/sessions/${encodeURIComponent(sessionKey)}`),

  getSessionMessages: (sessionKey: string, limit = 100) =>
    api.get<PendingMessage[]>(
      `/channels/sessions/${encodeURIComponent(sessionKey)}/messages?limit=${limit}`
    ),

  getChannelSettings: (channelName: string) =>
    api.get<ChannelInstance>(`/channels/settings/${encodeURIComponent(channelName)}`),

  updateChannelSettings: (channelName: string, settings: Partial<ChannelInstance>) =>
    api.post<ChannelInstance>(`/channels/settings/${encodeURIComponent(channelName)}`, settings),

  listPairingCodes: (channelName: string) =>
    api.get<PairingCode[]>(`/channels/pairing/${encodeURIComponent(channelName)}`),

  approvePairingCode: (channelName: string, code: string) =>
    api.post<{ success: boolean; senderId?: string }>(
      `/channels/pairing/${encodeURIComponent(channelName)}/approve`,
      { code }
    ),

  // --- Phase 0: Unified Inbox conversations ---
  listConversations: (params?: {
    status?: string; channel?: string; label?: string;
    search?: string; pinned_only?: boolean; unread_only?: boolean;
    page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.channel) qs.set("channel", params.channel);
    if (params?.label) qs.set("label", params.label);
    if (params?.search) qs.set("search", params.search);
    if (params?.pinned_only) qs.set("pinned_only", "true");
    if (params?.unread_only) qs.set("unread_only", "true");
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<{ conversations: ChannelSession[]; total: number }>(
      `/channels/conversations${q ? `?${q}` : ""}`
    );
  },

  getConversation: (key: string) =>
    api.get<ChannelSession>(`/channels/conversations/${encodeURIComponent(key)}`),

  getConversationMessages: (key: string, limit = 200) =>
    api.get<{ messages: ConversationMessage[]; total: number }>(
      `/channels/conversations/${encodeURIComponent(key)}/messages?limit=${limit}`
    ),

  pinConversation: (key: string) =>
    api.post<{ pinned: boolean; message: string }>(
      `/channels/conversations/${encodeURIComponent(key)}/pin`, {}
    ),

  markRead: (key: string, unread = false) =>
    api.post<{ message: string }>(
      `/channels/conversations/${encodeURIComponent(key)}/read`, { unread }
    ),

  muteConversation: (key: string) =>
    api.post<{ muted: boolean; message: string }>(
      `/channels/conversations/${encodeURIComponent(key)}/mute`, {}
    ),

  labelConversation: (key: string, label: ConversationLabel | null) =>
    api.post<{ label: string | null; message: string }>(
      `/channels/conversations/${encodeURIComponent(key)}/label`, { label }
    ),

  changeAgent: (key: string, agent_slug: string) =>
    api.post<{ agent_slug: string; message: string }>(
      `/channels/conversations/${encodeURIComponent(key)}/agent`, { agent_slug }
    ),

  exportConversation: (key: string) =>
    api.post<Blob>(
      `/channels/conversations/${encodeURIComponent(key)}/export`, {},
    ),

  deleteConversation: (key: string) =>
    api.delete(`/channels/conversations/${encodeURIComponent(key)}`),

  restoreConversation: (key: string) =>
    api.post(`/channels/conversations/${encodeURIComponent(key)}/restore`, {}),

  // --- Phase 0: Session control ---
  getCostSummary: () =>
    api.get<CostSummary>("/channels/sessions/cost-summary"),

  restartSession: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/channels/sessions/${id}/restart`, {}),

  pauseSession: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/channels/sessions/${id}/pause`, {}),

  resumeSession: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/channels/sessions/${id}/resume`, {}),

  getActivityLog: (params?: { channel?: string; agent?: string; status?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.channel) qs.set("channel", params.channel);
    if (params?.agent) qs.set("agent", params.agent);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<ActivityLogEntry[]>(`/channels/activity${q ? `?${q}` : ""}`);
  },

  // --- Facebook Web (Reverse Protocol) ---
  listFacebookWeb: () =>
    api.get<ChannelInstance[]>("/channels/facebook-web"),

  setupFacebookWeb: (payload: {
    channel_name: string;
    display_name?: string;
    page_id: string;
    page_name?: string;
    cookies: Array<{ name: string; value: string; domain: string; path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: string; expirationDate?: number }>;
    user_agent?: string;
  }) =>
    api.post<{ success: boolean; status?: string; error?: string }>("/channels/facebook-web/setup", payload),

  restartFacebookWeb: (name: string) =>
    api.post<{ success: boolean }>(`/channels/facebook-web/${encodeURIComponent(name)}/restart`, {}),

  verifyFacebookWeb: (name: string) =>
    api.get<{ name: string; running: boolean }>(`/channels/facebook-web/${encodeURIComponent(name)}/verify`),

  sendFacebookWebMessage: (name: string, threadId: string, message: string) =>
    api.post<{ success: boolean; message_id?: string; error?: string }>(
      `/channels/facebook-web/${encodeURIComponent(name)}/send`,
      { thread_id: threadId, message },
    ),

  replyFacebookWebComment: (name: string, commentId: string, message: string) =>
    api.post<{ success: boolean; message_id?: string; error?: string }>(
      `/channels/facebook-web/${encodeURIComponent(name)}/comment-reply`,
      { comment_id: commentId, message },
    ),

  deleteFacebookWeb: (name: string) =>
    api.delete<{ success: boolean }>(`/channels/facebook-web/${encodeURIComponent(name)}`),
};
