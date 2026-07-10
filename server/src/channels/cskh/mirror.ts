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
  attachmentUrl?: string | null,
  attachmentType?: string | null,
): Promise<{ error?: string }> {
  const sessionKey = `cskh-internal:${userId}:${userId}`;
  const { error } = await supabase.from('cskh_messages').insert({
    user_id: userId,
    session_key: sessionKey,
    role,
    body: body || null,
    agent_slug: agentSlug || null,
    attachment_url: attachmentUrl || null,
    attachment_type: attachmentType || null,
  });
  // Return the error (in addition to logging) so a caller that MUST know whether
  // the customer actually received the reply — the Reply Gateway deliverFn — can
  // throw instead of silently marking a lost reply as 'sent' (Codex F1). Existing
  // callers that ignore the return value keep their prior behavior.
  if (error) { console.error('[cskh/mirror] insert failed:', error.message); return { error: error.message }; }
  return {};
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

/**
 * Mirror an outbound reply for an anonymous Shopify visitor (no auth user).
 * Keyed by visitor_id (user_id NULL). The widget reads it via cskh-widget-thread.
 */
export async function mirrorReplyToVisitor(
  visitorId: string,
  role: CskhRole,
  body: string,
  agentSlug: string | null | undefined,
  channel: string, // S2: 'cskh-shopify' | 'cskh-web' — caller BẮT BUỘC truyền (ghi đúng nhãn kênh)
  attachmentUrl?: string | null,
  attachmentType?: string | null,
): Promise<{ error?: string }> {
  const sessionKey = `${channel}:${visitorId}:${visitorId}`;
  const { error } = await supabase.from('cskh_messages').insert({
    visitor_id: visitorId,
    channel,
    session_key: sessionKey,
    role,
    body: body || null,
    agent_slug: agentSlug || null,
    attachment_url: attachmentUrl || null,
    attachment_type: attachmentType || null,
  });
  // Return error so the Reply Gateway deliverFn can throw on a lost reply (Codex F1).
  if (error) { console.error('[cskh/mirror] visitor reply insert failed:', error.message); return { error: error.message }; }
  return {};
}
