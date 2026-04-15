// Channel-Agent Auto-Reply system — shared type definitions

export interface Channel {
  name: string;
  type: ChannelType;
  start(ctx?: AbortSignal): Promise<void>;
  stop(): Promise<void>;
  send(msg: OutboundMessage): Promise<void>;
  isRunning(): boolean;
  isAllowed(senderId: string): boolean;
}

export type ChannelType = 'facebook' | 'zalo_personal' | 'zalo_oa' | 'telegram' | 'youtube';

export type DmPolicy = 'open' | 'allowlist' | 'pairing' | 'disabled';
export type GroupPolicy = 'open' | 'allowlist' | 'pairing' | 'disabled';
export type PeerKind = 'direct' | 'group' | 'comment';
export type ContentType = 'text' | 'image' | 'file' | 'voice' | 'sticker';
export type MessageStatus = 'pending' | 'processing' | 'handled' | 'failed' | 'skipped';
export type PairingStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface InboundMessage {
  id: string;
  channel: string;
  channelType: ChannelType;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  contentType: ContentType;
  media?: MediaFile[];
  peerKind: PeerKind;
  metadata?: Record<string, any>;
  timestamp: Date;
  dedupeKey?: string;
}

export interface OutboundMessage {
  channel: string;
  chatId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file';
  media?: MediaFile[];
  replyToMessageId?: string;
  metadata?: Record<string, any>;
}

export interface MediaFile {
  url?: string;
  path?: string;
  mimeType: string;
  filename?: string;
  size?: number;
  caption?: string;
}

/** Entry in agents/{slug}/media-library.json */
export interface MediaLibraryItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'audio' | 'document' | 'file';
  mimeType: string;
  path?: string | null;
  url?: string | null;
  description: string;
  tags?: string[];
  language?: string;
}

export interface MediaLibrary {
  agent_slug: string;
  version: string;
  description?: string;
  items: MediaLibraryItem[];
  instructions_for_agent?: string;
}

/** Row shape from channel_instances table */
export interface ChannelInstanceRow {
  id: string;
  name: string;
  display_name: string | null;
  channel_type: string;
  agent_id: string | null;
  agent_slug: string | null;
  config: ChannelConfig | null;
  enabled: boolean;
  status: string;
  status_message: string | null;
  last_connected_at: string | null;
  dm_policy: DmPolicy;
  group_policy: GroupPolicy;
  require_mention: boolean;
  allow_from: string[];
  paired_users: string[];
  streaming_enabled: boolean;
  history_limit: number;
  quota_hour: number;
  quota_day: number;
  save_contacts_to_crm: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelConfig {
  dm_policy?: DmPolicy;
  group_policy?: GroupPolicy;
  require_mention?: boolean;
  allow_from?: string[];
  history_limit?: number;
  block_reply?: boolean;
}

/** Row shape from channel_pending_messages table */
export interface PendingMessageRow {
  id: string;
  channel_name: string;
  thread_id: string;
  thread_type: string;
  from_uid: string;
  sender_name: string;
  message_id: string;
  body: string;
  content_type: string;
  media: string[] | null;
  metadata: Record<string, any>;
  status: MessageStatus;
  handled_by: string | null;
  handled_at: string | null;
  session_key: string | null;
  peer_kind: PeerKind;
  agent_slug: string | null;
  priority: number;
  dedupe_key: string | null;
  ts: string;
  created_at: string;
}

/** Row shape from channel_sessions table */
export interface SessionRow {
  id: string;
  session_key: string;
  channel_name: string | null;
  agent_slug: string | null;
  peer_kind: PeerKind;
  chat_id: string;
  sender_id: string | null;
  sender_name: string | null;
  history: SessionMessage[];
  history_count: number;
  status: string;
  last_message_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  senderName?: string;
  /** Optional per-message metadata. `agent_session_id` lets the Chat Drawer
   *  drill-down to the exact JSONL session that generated the assistant turn. */
  metadata?: {
    agent_session_id?: string;
    [k: string]: unknown;
  };
}

/** Policy check result */
export interface PolicyResult {
  pass: boolean;
  reason?: string;
  pairingCode?: string;
}

/** Quota check result */
export interface QuotaResult {
  allowed: boolean;
  hourCount: number;
  dayCount: number;
  hourLimit: number;
  dayLimit: number;
}

// ─── Agent Config (paperclip_agents table) ───

export type AgentProvider = 'claude' | 'gemini' | 'openrouter' | 'ollama' | 'nvidia_nim';

/** Row shape from paperclip_agents table */
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
  effort_mode: string;
  max_turns: number;
  history_limit: number;
  session_timeout: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Provider → default models mapping */
export const PROVIDER_MODELS: Record<AgentProvider, string[]> = {
  claude: [
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-haiku-4-5-20251001',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
  ],
  openrouter: [
    'anthropic/claude-sonnet-4-6',
    'anthropic/claude-opus-4-6',
    'anthropic/claude-sonnet-4',
    'anthropic/claude-haiku-4.5',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-pro',
    'openai/gpt-4.1',
    'openai/gpt-4.1-mini',
    'meta-llama/llama-4-maverick',
  ],
  ollama: [
    'gemma4:latest',
    'gemma4:e2b',
    'gemma4:e4b',
    'gemma4:26b',
    'gemma4:31b',
  ],
  nvidia_nim: [
    'google/gemma-4-31b-it',
    'google/gemma-3-27b-it',
    'google/gemma-2-27b-it',
    'google/gemma-2-9b-it',
    'google/gemma-2-2b-it',
  ],
};
