// Cross-channel API routes
// Provides unified endpoints for all channel types

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { clearConfigCache } from './consumer.js';
import { approvePairing } from './policy.js';
import { streamEvents, clearAgentCache } from './router.js';

const router = Router();

/**
 * GET /api/channels/sessions
 * List all conversation sessions across all channels.
 * Query: ?status=active|closed&channel_name=xxx&limit=50&offset=0
 */
router.get('/sessions', async (req, res) => {
  const { status, channel_name, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('channel_sessions')
    .select('*')
    .order('last_message_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) {
    query = query.eq('status', String(status));
  }
  if (channel_name) {
    query = query.eq('channel_name', String(channel_name));
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

// ── Phase 0: Session cost summary (MUST be before :sessionKey) ──
router.get('/sessions/cost-summary', async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const fetchPeriod = async (since: string) => {
    const { data } = await supabase
      .from('agent_sessions')
      .select('total_cost, tokens_in, tokens_out, reply_count')
      .gte('created_at', since);
    const rows = data || [];
    return {
      cost: rows.reduce((s, r) => s + (r.total_cost || 0), 0),
      tokens_in: rows.reduce((s, r) => s + (r.tokens_in || 0), 0),
      tokens_out: rows.reduce((s, r) => s + (r.tokens_out || 0), 0),
      replies: rows.reduce((s, r) => s + (r.reply_count || 0), 0),
    };
  };

  const [today, week, month] = await Promise.all([
    fetchPeriod(todayStart),
    fetchPeriod(weekStart),
    fetchPeriod(monthStart),
  ]);

  res.json({
    today, week, month,
    avg_cost_per_reply: today.replies > 0 ? today.cost / today.replies : 0,
  });
});

/**
 * GET /api/channels/sessions/:sessionKey
 * Get a single session by session_key.
 */
router.get('/sessions/:sessionKey', async (req, res) => {
  const { sessionKey } = req.params;

  const { data, error } = await supabase
    .from('channel_sessions')
    .select('*')
    .eq('session_key', sessionKey)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(data);
});

/**
 * GET /api/channels/sessions/:sessionKey/messages
 * Get merged inbound + outbound messages for a session.
 * Query: ?limit=100
 */
router.get('/sessions/:sessionKey/messages', async (req, res) => {
  const { sessionKey } = req.params;
  const limit = Number(req.query.limit) || 100;

  // Parse session_key to get channel_name and thread_id
  // Format: "{channel}:{chatId}:{senderId}"
  const parts = sessionKey.split(':');
  if (parts.length < 2) {
    return res.status(400).json({ error: 'Invalid session_key format' });
  }
  const channelName = parts[0];
  const chatId = parts[1];

  // Fetch inbound messages
  const { data: inbound } = await supabase
    .from('channel_pending_messages')
    .select('id, channel_name, thread_id, thread_type, from_uid, sender_name, message_id, body, content_type, status, ts, created_at, session_key, agent_slug')
    .eq('channel_name', channelName)
    .eq('thread_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Fetch outbound messages
  const { data: outbound } = await supabase
    .from('channel_sent_messages')
    .select('id, channel_name, thread_id, thread_type, to_uid, body, content_type, media, status, sent_by, created_at')
    .eq('channel_name', channelName)
    .eq('thread_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Merge and normalize
  const messages = [
    ...(inbound || []).map((m: any) => ({
      ...m,
      direction: 'inbound' as const,
    })),
    ...(outbound || []).map((m: any) => ({
      ...m,
      direction: 'outbound' as const,
      from_uid: '',
      sender_name: m.sent_by && m.sent_by !== 'manual' ? `🤖 ${m.sent_by}` : 'Bạn',
      ts: m.created_at,
    })),
  ].sort((a, b) => {
    const ta = a.ts || a.created_at || '';
    const tb = b.ts || b.created_at || '';
    return tb.localeCompare(ta);
  });

  res.json(messages.slice(0, limit));
});

/**
 * POST /api/channels/settings/:channelName
 * Update channel settings (policies, quotas, etc.)
 */
router.post('/settings/:channelName', async (req, res) => {
  const { channelName } = req.params;
  const {
    display_name,
    agent_id,
    agent_slug,
    dm_policy,
    group_policy,
    require_mention,
    quota_hour,
    quota_day,
    history_limit,
    allow_from,
    enabled,
    save_contacts_to_crm,
  } = req.body;

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (display_name !== undefined) updates.display_name = display_name;
  if (agent_id !== undefined) updates.agent_id = agent_id;
  if (agent_slug !== undefined) updates.agent_slug = agent_slug;
  if (dm_policy !== undefined) updates.dm_policy = dm_policy;
  if (group_policy !== undefined) updates.group_policy = group_policy;
  if (require_mention !== undefined) updates.require_mention = require_mention;
  if (quota_hour !== undefined) updates.quota_hour = quota_hour;
  if (quota_day !== undefined) updates.quota_day = quota_day;
  if (history_limit !== undefined) updates.history_limit = history_limit;
  if (allow_from !== undefined) updates.allow_from = allow_from;
  if (enabled !== undefined) updates.enabled = enabled;
  if (save_contacts_to_crm !== undefined) updates.save_contacts_to_crm = save_contacts_to_crm;

  const { data, error } = await supabase
    .from('channel_instances')
    .update(updates)
    .eq('name', channelName)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Clear caches so consumer + router pick up new settings immediately
  clearConfigCache(channelName);
  clearAgentCache();

  // Sync agent_slug to all existing sessions for this channel
  if (agent_slug !== undefined) {
    await supabase
      .from('channel_sessions')
      .update({ agent_slug: agent_slug || null })
      .eq('channel_name', channelName);
  }

  res.json(data);
});

/**
 * GET /api/channels/settings/:channelName
 * Get channel settings.
 */
router.get('/settings/:channelName', async (req, res) => {
  const { channelName } = req.params;

  const { data, error } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('name', channelName)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json(data);
});

/**
 * GET /api/channels/pairing/:channelName
 * List pending pairing codes for a channel.
 */
router.get('/pairing/:channelName', async (req, res) => {
  const { channelName } = req.params;

  const { data, error } = await supabase
    .from('channel_pairing_codes')
    .select('*')
    .eq('channel_name', channelName)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

/**
 * POST /api/channels/pairing/:channelName/approve
 * Approve a pending pairing code.
 * Body: { code: string }
 */
router.post('/pairing/:channelName/approve', async (req, res) => {
  const { channelName } = req.params;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code required' });
  }

  const result = await approvePairing(channelName, code);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Clear config cache since paired_users was updated
  clearConfigCache(channelName);

  res.json({ success: true, senderId: result.senderId });
});

/**
 * GET /api/channels/stats
 * Overview stats: messages today, response rate, avg response time.
 */
router.get('/stats', async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Count inbound messages today
  const { count: inboundToday } = await supabase
    .from('channel_pending_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  // Count handled messages today
  const { count: handledToday } = await supabase
    .from('channel_pending_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayISO)
    .eq('status', 'handled');

  // Count sent messages today
  const { count: sentToday } = await supabase
    .from('channel_sent_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  // Count active sessions
  const { count: activeSessions } = await supabase
    .from('channel_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // Count all channel instances
  const { data: instances } = await supabase
    .from('channel_instances')
    .select('name, channel_type, status, enabled');

  const responseRate = (inboundToday ?? 0) > 0
    ? Math.round(((handledToday ?? 0) / (inboundToday ?? 1)) * 100)
    : 0;

  res.json({
    messagesInboundToday: inboundToday ?? 0,
    messagesSentToday: sentToday ?? 0,
    messagesHandledToday: handledToday ?? 0,
    responseRate,
    activeSessions: activeSessions ?? 0,
    channels: instances || [],
  });
});

/**
 * GET /api/channels/stream
 * SSE endpoint for real-time agent processing events.
 * Query: ?agent_slug=xxx (optional, filter by agent)
 */
router.get('/stream', (req, res) => {
  const filterAgent = req.query.agent_slug as string | undefined;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const onStart = (data: any) => {
    if (filterAgent && data.agentSlug !== filterAgent) return;
    res.write(`data: ${JSON.stringify({ type: 'agent:start', ...data })}\n\n`);
  };

  const onChunk = (data: any) => {
    if (filterAgent && data.agentSlug !== filterAgent) return;
    res.write(`data: ${JSON.stringify({ type: 'agent:chunk', agentSlug: data.agentSlug, streamKey: data.streamKey })}\n\n`);
  };

  const onDone = (data: any) => {
    if (filterAgent && data.agentSlug !== filterAgent) return;
    res.write(`data: ${JSON.stringify({ type: 'agent:done', agentSlug: data.agentSlug, reply: data.reply?.substring(0, 200) })}\n\n`);
  };

  const onError = (data: any) => {
    if (filterAgent && data.agentSlug !== filterAgent) return;
    res.write(`data: ${JSON.stringify({ type: 'agent:error', agentSlug: data.agentSlug, error: data.error })}\n\n`);
  };

  streamEvents.on('agent:start', onStart);
  streamEvents.on('agent:chunk', onChunk);
  streamEvents.on('agent:done', onDone);
  streamEvents.on('agent:error', onError);

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    streamEvents.off('agent:start', onStart);
    streamEvents.off('agent:chunk', onChunk);
    streamEvents.off('agent:done', onDone);
    streamEvents.off('agent:error', onError);
  });
});

/**
 * GET /api/channels/instances
 * List all channel instances (all types).
 */
router.get('/instances', async (_req, res) => {
  const { data, error } = await supabase
    .from('channel_instances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

// ── Phase 0: Restart agent session ──
router.post('/sessions/:id/restart', async (req, res) => {
  const { id } = req.params;
  // Kill existing session
  await supabase.from('agent_sessions').update({
    status: 'stopped',
    ended_at: new Date().toISOString(),
  }).eq('id', id);

  res.json({ success: true, message: 'Đã khởi động lại agent. Session mới sẽ tạo khi có tin nhắn.' });
});

// ── Phase 0: Pause agent session ──
router.post('/sessions/:id/pause', async (req, res) => {
  const { id } = req.params;
  await supabase.from('agent_sessions').update({
    status: 'paused',
  }).eq('id', id);
  res.json({ success: true, message: 'Đã tạm dừng agent. Tin nhắn mới sẽ được queue.' });
});

// ── Phase 0: Resume agent session ──
router.post('/sessions/:id/resume', async (req, res) => {
  const { id } = req.params;
  await supabase.from('agent_sessions').update({
    status: 'running',
  }).eq('id', id);
  res.json({ success: true, message: 'Đã kích hoạt lại agent.' });
});

// ── Phase 0: Activity log with skip_reason ──
router.get('/activity', async (req, res) => {
  const { channel, agent, status, limit = '50' } = req.query;

  let query = supabase
    .from('channel_pending_messages')
    .select('id, channel_name, thread_id, sender_name, body, status, handled_by, skip_reason, agent_slug, session_key, created_at')
    .order('created_at', { ascending: false })
    .limit(parseInt(String(limit)));

  if (channel) query = query.eq('channel_name', String(channel));
  if (agent) query = query.eq('agent_slug', String(agent));
  if (status) query = query.eq('status', String(status));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Smart Routing: Ignored Chats CRUD ──

router.get('/routing/ignored', async (_req, res) => {
  const { data, error } = await supabase.from('chat_ignored').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/routing/ignored', async (req, res) => {
  const { chat_id, channel_name, display_name, reason } = req.body;
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
  const { data, error } = await supabase.from('chat_ignored').upsert({ chat_id, channel_name: channel_name || null, display_name, reason, created_by: 'board' }, { onConflict: 'chat_id,channel_name' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/routing/ignored/:id', async (req, res) => {
  const { error } = await supabase.from('chat_ignored').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã bỏ ignore' });
});

// ── Smart Routing: Agent Overrides CRUD ──

router.get('/routing/overrides', async (_req, res) => {
  const { data, error } = await supabase.from('chat_agent_overrides').select('*').order('priority', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/routing/overrides', async (req, res) => {
  const { match_type, match_value, agent_slug, action, reason, priority } = req.body;
  if (!match_type || !match_value) return res.status(400).json({ error: 'match_type + match_value required' });
  const { data, error } = await supabase.from('chat_agent_overrides').insert({
    match_type, match_value, agent_slug: agent_slug || null, action: action || 'route', reason, priority: priority || 0, is_active: true, created_by: 'board',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/routing/overrides/:id', async (req, res) => {
  const { agent_slug, action, reason, is_active, priority } = req.body;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (agent_slug !== undefined) updates.agent_slug = agent_slug;
  if (action !== undefined) updates.action = action;
  if (reason !== undefined) updates.reason = reason;
  if (is_active !== undefined) updates.is_active = is_active;
  if (priority !== undefined) updates.priority = priority;
  const { data, error } = await supabase.from('chat_agent_overrides').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/routing/overrides/:id', async (req, res) => {
  const { error } = await supabase.from('chat_agent_overrides').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa rule' });
});

// ── Smart Routing: Keyword Rules CRUD (uses chat_agent_overrides with match_type='keyword') ──

router.get('/routing/keywords', async (_req, res) => {
  const { data, error } = await supabase
    .from('chat_agent_overrides')
    .select('*')
    .eq('match_type', 'keyword')
    .order('priority', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/routing/keywords', async (req, res) => {
  const { keywords, agent_slug, reason, priority } = req.body;
  if (!keywords || !agent_slug) return res.status(400).json({ error: 'keywords + agent_slug required' });
  const kws = Array.isArray(keywords) ? keywords.join(',') : String(keywords);
  const { data, error } = await supabase.from('chat_agent_overrides').insert({
    match_type: 'keyword',
    match_value: kws,
    agent_slug,
    action: 'route',
    reason: reason || null,
    priority: priority || 0,
    is_active: true,
    created_by: 'board',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/routing/keywords/:id', async (req, res) => {
  const { error } = await supabase.from('chat_agent_overrides').delete()
    .eq('id', req.params.id).eq('match_type', 'keyword');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa rule' });
});

// ── Smart Routing: Recent activity with skip reasons ──
router.get('/routing/activity', async (req, res) => {
  const limit = Number(req.query.limit) || 30;
  const { data, error } = await supabase
    .from('channel_pending_messages')
    .select('id, created_at, channel_name, session_key, status, skip_reason, agent_slug, sender_name, body')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── FIX 8: Contacts CRUD ──

router.get('/contacts', async (req, res) => {
  const { search, limit = 50 } = req.query;
  let query = supabase
    .from('inbox_contacts')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(Number(limit));
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,zalo_id.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/contacts', async (req, res) => {
  const { data, error } = await supabase
    .from('inbox_contacts')
    .insert(req.body)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/contacts/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('inbox_contacts')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/contacts/:id', async (req, res) => {
  const { error } = await supabase
    .from('inbox_contacts')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST /api/channels/conversations — create new conversation (FIX 7) ──
router.post('/conversations', async (req, res) => {
  const { channel, target_id } = req.body;
  if (!channel || !target_id) {
    return res.status(400).json({ error: 'channel và target_id là bắt buộc' });
  }
  // Upsert session so it appears in inbox
  const sessionKey = `${channel}:${target_id}:${target_id}`;
  const { data, error } = await supabase
    .from('channel_sessions')
    .upsert({
      session_key: sessionKey,
      channel_name: channel,
      chat_id: target_id,
      sender_id: target_id,
      sender_name: target_id,
      status: 'active',
      peer_kind: 'dm',
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'session_key' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
