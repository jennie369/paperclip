// Phase 0: Unified Inbox — Conversation Management API
// CRUD + actions (pin, mute, read, label, agent, export, delete)

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';

const router = Router();

// ── GET /api/channels/conversations — List conversations with filters ──
router.get('/', async (req, res) => {
  const {
    status, channel, label, search,
    pinned_only, unread_only,
    page = '1', limit = '30',
  } = req.query;

  let query = supabase
    .from('channel_sessions')
    .select('*, customer:crm_customers(id, display_name, phone, avatar_url, lead_score, lead_temperature, status)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (channel) query = query.eq('channel_name', String(channel));
  if (label) query = query.eq('label', String(label));
  if (pinned_only === 'true') query = query.eq('is_pinned', true);
  if (unread_only === 'true') query = query.gt('unread_count', 0);
  if (search) {
    query = query.or(
      `sender_name.ilike.%${search}%,last_message_preview.ilike.%${search}%,session_key.ilike.%${search}%`
    );
  }

  // Status filters
  if (status === 'pending') query = query.gt('unread_count', 0);
  if (status === 'resolved') query = query.eq('unread_count', 0);
  if (status === 'pinned') query = query.eq('is_pinned', true);

  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[Conversations] List error:', error.message);
    return res.status(500).json({ error: 'Lỗi tải danh sách hội thoại' });
  }

  res.json({ conversations: data || [], total: count || 0, page: pageNum, limit: limitNum });
});

// ── GET /api/channels/conversations/:key — Single conversation detail ──
router.get('/:key', async (req, res) => {
  const { data, error } = await supabase
    .from('channel_sessions')
    .select('*, customer:crm_customers(id, display_name, phone, email, avatar_url, lead_score, lead_temperature, status, tags, ai_summary, gemral_data)')
    .eq('session_key', req.params.key)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
  res.json(data);
});

// ── GET /api/channels/conversations/:key/messages — Merged inbound + outbound ──
router.get('/:key/messages', async (req, res) => {
  const sessionKey = req.params.key;
  const limit = parseInt(String(req.query.limit || '200'));

  // Fetch inbound messages
  const { data: inbound } = await supabase
    .from('channel_pending_messages')
    .select('id, body, content_type, media, sender_name, from_uid, status, handled_by, skip_reason, ts, created_at')
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: true })
    .limit(limit);

  // Fetch outbound (sent) messages
  const { data: outbound } = await supabase
    .from('channel_sent_messages')
    .select('id, body, content_type, media, sent_by, metadata, created_at')
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: true })
    .limit(limit);

  // Merge and sort by timestamp
  const messages = [
    ...(inbound || []).map(m => ({
      id: m.id,
      direction: 'inbound' as const,
      content: m.body,
      contentType: m.content_type,
      media: m.media,
      senderName: m.sender_name,
      senderId: m.from_uid,
      status: m.status,
      handledBy: m.handled_by,
      skipReason: m.skip_reason,
      timestamp: m.ts || m.created_at,
    })),
    ...(outbound || []).map(m => ({
      id: m.id,
      direction: 'outbound' as const,
      content: m.body,
      contentType: m.content_type,
      media: m.media,
      senderName: m.sent_by || 'agent',
      senderId: null,
      status: 'sent',
      handledBy: m.sent_by,
      skipReason: null,
      timestamp: m.created_at,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json({ messages, total: messages.length });
});

// ── POST /api/channels/conversations/:key/pin — Toggle pin ──
router.post('/:key/pin', async (req, res) => {
  const { data } = await supabase.from('channel_sessions')
    .select('is_pinned').eq('session_key', req.params.key).single();
  const newPinned = !(data?.is_pinned);

  // Max 10 pins check
  if (newPinned) {
    const { count } = await supabase.from('channel_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('is_pinned', true).eq('is_deleted', false);
    if ((count || 0) >= 10) {
      return res.status(400).json({ error: 'Tối đa 10 hội thoại ghim' });
    }
  }

  await supabase.from('channel_sessions')
    .update({ is_pinned: newPinned }).eq('session_key', req.params.key);
  res.json({ pinned: newPinned, message: newPinned ? 'Đã ghim hội thoại' : 'Đã bỏ ghim' });
});

// ── POST /api/channels/conversations/:key/read — Mark read/unread ──
router.post('/:key/read', async (req, res) => {
  const { unread } = req.body; // true = mark unread, false = mark read
  await supabase.from('channel_sessions')
    .update({ unread_count: unread ? 1 : 0 }).eq('session_key', req.params.key);
  res.json({ message: unread ? 'Đã đánh dấu chưa đọc' : 'Đã đánh dấu đã đọc' });
});

// ── POST /api/channels/conversations/:key/mute — Toggle mute ──
router.post('/:key/mute', async (req, res) => {
  const { data } = await supabase.from('channel_sessions')
    .select('is_muted').eq('session_key', req.params.key).single();
  const newMuted = !(data?.is_muted);
  await supabase.from('channel_sessions')
    .update({ is_muted: newMuted }).eq('session_key', req.params.key);
  res.json({ muted: newMuted, message: newMuted ? 'Đã tắt thông báo' : 'Đã bật thông báo' });
});

// ── POST /api/channels/conversations/:key/label — Set label ──
router.post('/:key/label', async (req, res) => {
  const { label } = req.body; // 'hot' | 'warm' | 'cold' | 'vip' | 'spam' | null
  await supabase.from('channel_sessions')
    .update({ label: label || null }).eq('session_key', req.params.key);
  const labels: Record<string, string> = {
    hot: 'Nóng', warm: 'Ấm', cold: 'Lạnh', vip: 'VIP', spam: 'Spam',
  };
  res.json({ label, message: label ? `Đã phân loại: ${labels[label] || label}` : 'Đã gỡ phân loại' });
});

// ── POST /api/channels/conversations/:key/agent — Change agent ──
router.post('/:key/agent', async (req, res) => {
  const { agent_slug } = req.body;
  await supabase.from('channel_sessions')
    .update({ agent_slug }).eq('session_key', req.params.key);

  // Create override for future messages
  const { data: sess } = await supabase.from('channel_sessions')
    .select('customer_id, sender_id').eq('session_key', req.params.key).single();
  if (sess?.customer_id) {
    await supabase.from('chat_agent_overrides').upsert({
      customer_id: sess.customer_id,
      action: 'assign',
      agent_slug,
      reason: 'Đổi agent từ hội thoại',
    });
  }

  res.json({ agent_slug, message: `Đã gán agent: ${agent_slug}` });
});

// ── POST /api/channels/conversations/:key/export — Export conversation ──
router.post('/:key/export', async (req, res) => {
  const { data: sess } = await supabase.from('channel_sessions')
    .select('*').eq('session_key', req.params.key).single();
  if (!sess) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });

  const messages = sess.history || [];
  const text = messages.map((m: any) =>
    `[${m.timestamp || ''}] ${m.role === 'assistant' ? '🤖 Bot' : '🧑 Khách'}: ${m.content}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="conversation_${req.params.key}.txt"`);
  res.send(text);
});

// ── DELETE /api/channels/conversations/:key — Soft delete ──
router.delete('/:key', async (req, res) => {
  await supabase.from('channel_sessions')
    .update({ is_deleted: true }).eq('session_key', req.params.key);
  res.json({ message: 'Đã xóa hội thoại' });
});

// ── POST /api/channels/conversations/:key/restore — Undo delete ──
router.post('/:key/restore', async (req, res) => {
  await supabase.from('channel_sessions')
    .update({ is_deleted: false }).eq('session_key', req.params.key);
  res.json({ message: 'Đã khôi phục hội thoại' });
});

export default router;
