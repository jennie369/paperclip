// Channel-Agent Auto-Reply — Session Store
// Manages conversation sessions with history in channel_sessions table

import { supabase } from './zalo-personal/supabase.js';
import type { SessionRow, SessionMessage, PeerKind } from './types.js';

export interface SessionDefaults {
  channelName?: string;
  agentSlug?: string;
  peerKind?: PeerKind;
  chatId: string;
  senderId?: string;
  senderName?: string;
  metadata?: Record<string, any>;
}

/**
 * Get or create a session by session_key.
 * session_key format: "{channel}:{chatId}:{senderId}"
 */
export async function getOrCreate(
  sessionKey: string,
  defaults: SessionDefaults
): Promise<SessionRow> {
  // Try to fetch existing
  const { data: existing } = await supabase
    .from('channel_sessions')
    .select('*')
    .eq('session_key', sessionKey)
    .single();

  if (existing) {
    // Update last_message_at
    await supabase
      .from('channel_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('session_key', sessionKey);

    return existing as SessionRow;
  }

  // Create new session
  const { data: created, error } = await supabase
    .from('channel_sessions')
    .insert({
      session_key: sessionKey,
      channel_name: defaults.channelName || null,
      agent_slug: defaults.agentSlug || null,
      peer_kind: defaults.peerKind || 'direct',
      chat_id: defaults.chatId,
      sender_id: defaults.senderId || null,
      sender_name: defaults.senderName || null,
      history: [],
      history_count: 0,
      status: 'active',
      last_message_at: new Date().toISOString(),
      metadata: defaults.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Session] Failed to create session:', error.message);
    // Return a minimal session object on failure
    return {
      id: '',
      session_key: sessionKey,
      channel_name: defaults.channelName || null,
      agent_slug: defaults.agentSlug || null,
      peer_kind: (defaults.peerKind || 'direct') as PeerKind,
      chat_id: defaults.chatId,
      sender_id: defaults.senderId || null,
      sender_name: defaults.senderName || null,
      history: [],
      history_count: 0,
      status: 'active',
      last_message_at: new Date().toISOString(),
      metadata: defaults.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return created as SessionRow;
}

/**
 * Append a message to the session's history JSONB array.
 * Auto-trims to historyLimit if provided.
 */
export async function appendMessage(
  sessionKey: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  historyLimit?: number,
  senderName?: string
): Promise<void> {
  const newEntry: SessionMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
    ...(senderName ? { senderName } : {}),
  };

  // Fetch current history
  const { data: session } = await supabase
    .from('channel_sessions')
    .select('history, history_count')
    .eq('session_key', sessionKey)
    .single();

  if (!session) {
    console.error(`[Session] Session not found: ${sessionKey}`);
    return;
  }

  let history = (session.history || []) as SessionMessage[];
  history.push(newEntry);

  // Trim if over limit
  if (historyLimit && historyLimit > 0 && history.length > historyLimit) {
    history = history.slice(history.length - historyLimit);
  }

  const { error } = await supabase
    .from('channel_sessions')
    .update({
      history,
      history_count: history.length,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('session_key', sessionKey);

  if (error) {
    console.error('[Session] Failed to append message:', error.message);
  }
}

/**
 * Get recent history for a session.
 */
export async function getHistory(
  sessionKey: string,
  limit?: number
): Promise<SessionMessage[]> {
  const { data: session } = await supabase
    .from('channel_sessions')
    .select('history')
    .eq('session_key', sessionKey)
    .single();

  if (!session) return [];

  const history = (session.history || []) as SessionMessage[];

  if (limit && limit > 0 && history.length > limit) {
    return history.slice(history.length - limit);
  }

  return history;
}

/**
 * Clear session history (reset conversation).
 */
export async function clearHistory(sessionKey: string): Promise<void> {
  const { error } = await supabase
    .from('channel_sessions')
    .update({
      history: [],
      history_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('session_key', sessionKey);

  if (error) {
    console.error('[Session] Failed to clear history:', error.message);
  }
}

/**
 * Mark session as closed/inactive.
 */
export async function closeSession(sessionKey: string): Promise<void> {
  await supabase
    .from('channel_sessions')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('session_key', sessionKey);
}

/**
 * Save group chat history to channel_group_history for context building.
 */
export async function saveGroupMessage(
  channelName: string,
  groupId: string,
  senderId: string,
  senderName: string,
  content: string,
  timestamp?: Date
): Promise<void> {
  const { error } = await supabase.from('channel_group_history').insert({
    channel_name: channelName,
    group_id: groupId,
    sender_id: senderId,
    sender_name: senderName,
    content,
    ts: (timestamp || new Date()).toISOString(),
  });

  if (error) {
    console.error('[Session] Failed to save group message:', error.message);
  }
}

/**
 * Fetch recent group history for context building.
 */
export async function getGroupHistory(
  channelName: string,
  groupId: string,
  limit: number = 20
): Promise<Array<{ sender_name: string; content: string; ts: string }>> {
  const { data } = await supabase
    .from('channel_group_history')
    .select('sender_name, content, ts')
    .eq('channel_name', channelName)
    .eq('group_id', groupId)
    .order('ts', { ascending: false })
    .limit(limit);

  // Reverse to get chronological order
  return (data || []).reverse();
}
