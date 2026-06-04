// paperclip/server/src/channels/cskh/mirror.ts
import { supabase } from './supabase.js';

export type CskhRole = 'assistant' | 'human';

/**
 * Mirror an outbound reply into the customer-scoped cskh_messages table so the
 * customer client can read it via RLS + Realtime. userId === channel thread_id.
 */
export async function mirrorReplyToCustomer(
  userId: string,
  role: CskhRole,
  body: string,
  agentSlug?: string | null,
): Promise<void> {
  const sessionKey = `cskh-internal:${userId}:${userId}`;
  const { error } = await supabase.from('cskh_messages').insert({
    user_id: userId,
    session_key: sessionKey,
    role,
    body,
    agent_slug: agentSlug || null,
  });
  if (error) console.error('[cskh/mirror] insert failed:', error.message);
}

/** Mirror the customer's own inbound message (role='user'). Used for parity/tests. */
export async function mirrorInboundFromCustomer(
  userId: string,
  body: string,
  senderName?: string | null,
): Promise<void> {
  const sessionKey = `cskh-internal:${userId}:${userId}`;
  const { error } = await supabase.from('cskh_messages').insert({
    user_id: userId,
    session_key: sessionKey,
    role: 'user',
    body,
    sender_name: senderName || null,
  });
  if (error) console.error('[cskh/mirror] inbound insert failed:', error.message);
}
