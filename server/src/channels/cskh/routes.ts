// paperclip/server/src/channels/cskh/routes.ts
import { Router } from 'express';
import { supabase } from './supabase.js';
import { cskhChannel } from './channel.js';
import { mirrorReplyToCustomer } from './mirror.js';
import { pushSupportReply } from './push.js';

export const cskhRouter = Router();

/**
 * Manual reply sub-handler. Called by the generic POST /api/channels/send
 * forwarder when channel_type='cskh'. The generic /send already inserted the
 * channel_sent_messages row (sent_by='manual'); here we mirror to the customer
 * (role='human'), push, and engage takeover (bot_paused=true).
 */
cskhRouter.post('/send', async (req, res) => {
  const { thread_id, message } = req.body as { thread_id?: string; message?: string };
  if (!thread_id || !message) {
    return res.status(400).json({ error: 'thread_id và message là bắt buộc' });
  }
  const userId = thread_id;
  const sessionKey = `cskh-internal:${userId}:${userId}`;

  // Engage human takeover: pause the bot for this session.
  const { data: sess } = await supabase
    .from('channel_sessions').select('metadata').eq('session_key', sessionKey).single();
  const metadata = { ...((sess?.metadata as Record<string, unknown>) || {}), bot_paused: true };
  await supabase.from('channel_sessions').update({ metadata }).eq('session_key', sessionKey);

  await mirrorReplyToCustomer(userId, 'human', message, null);
  await pushSupportReply(userId, message);
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
  console.log('[cskh] Channel resumed');
}
