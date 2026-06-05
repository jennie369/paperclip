// paperclip/server/src/channels/cskh/routes.ts
import { Router } from 'express';
import { bus } from '../bus.js';
import { supabase } from './supabase.js';
import { cskhChannel } from './channel.js';
import { mirrorReplyToCustomer, mirrorReplyToVisitor } from './mirror.js';
import { pushSupportReply } from './push.js';

export const cskhRouter = Router();

/**
 * Manual reply sub-handler. Called by the generic POST /api/channels/send
 * forwarder when channel_type='cskh'. The generic /send already inserted the
 * channel_sent_messages row (sent_by='manual'); here we mirror to the customer
 * (role='human') and engage takeover (bot_paused=true). For cskh-shopify the
 * customer is an anonymous visitor (mirror by visitor_id, no push).
 */
cskhRouter.post('/send', async (req, res) => {
  const { channel_name, thread_id, message } = req.body as {
    channel_name?: string;
    thread_id?: string;
    message?: string;
  };
  if (!thread_id || !message) {
    return res.status(400).json({ error: 'thread_id và message là bắt buộc' });
  }
  const channel = channel_name || 'cskh-internal';
  const id = thread_id;
  const sessionKey = `${channel}:${id}:${id}`;

  // Engage human takeover: pause the bot for this session.
  const { data: sess } = await supabase
    .from('channel_sessions').select('metadata').eq('session_key', sessionKey).single();
  const metadata = { ...((sess?.metadata as Record<string, unknown>) || {}), bot_paused: true };
  await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);

  if (channel === 'cskh-shopify') {
    await mirrorReplyToVisitor(id, 'human', message, null);
  } else {
    await mirrorReplyToCustomer(id, 'human', message, null);
    await pushSupportReply(id, message);
  }
  return res.json({ success: true });
});

/** Register + start the singleton CSKH channel at server boot. */
export async function resumeCskhChannel(): Promise<void> {
  const { data } = await supabase
    .from('channel_instances')
    .select('name')
    .eq('channel_type', 'cskh')
    .eq('enabled', true)
    .limit(1);
  if (!data || data.length === 0) {
    console.log('[cskh] No enabled cskh channel_instance — skipping resume');
    return;
  }
  await cskhChannel.start();
  // CSKH inbound arrives via edge-function INSERT into channel_pending_messages
  // (cross-process), so the bus must bridge DB INSERTs → 'inbound:realtime'.
  // app.ts starts the consumer directly but never calls subscribeRealtime();
  // it is idempotent (guards on an existing channel), so calling it here is safe.
  bus.subscribeRealtime();
  console.log('[cskh] Channel resumed (realtime ingestion active)');
}
