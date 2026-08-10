// Phase 0: Unified Inbox — Conversation Management API
// CRUD + actions (pin, mute, read, label, agent, export, delete)

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { markPendingSkippedBeforeUnpause } from './consumer.js';
import { fetchTranscript } from './transcript.js';

const router = Router();

// ── GET /api/channels/conversations — List conversations with filters ──
router.get('/', async (req, res) => {
  const {
    status, channel, label, search,
    pinned_only, unread_only, peer_kind,
    page = '1', limit = '30',
  } = req.query;

  let query = supabase
    .from('channel_sessions')
    .select('*, customer:crm_customers(id, display_name, phone, avatar_url, lead_score, lead_temperature, status, total_revenue, next_follow_up_at)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('last_message_at', { ascending: false, nullsFirst: false });

  // Bình luận trên bài viết Page (FB/YT, peer_kind='comment') được bot auto-reply nhưng
  // KHÔNG hiện trong hộp thư tin nhắn — chúng không phải hội thoại DM 1-1. Mặc định loại
  // comment; truyền ?peer_kind=comment để lấy riêng cho tab "Bình luận" tương lai.
  // DM/nhóm thật có peer_kind 'direct'/'group'. .or(...is.null...) an toàn cho row cũ null.
  if (String(peer_kind) === 'comment') {
    query = query.eq('peer_kind', 'comment');
  } else {
    query = query.or('peer_kind.is.null,peer_kind.neq.comment');
  }

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
    .select('*, customer:crm_customers(id, display_name, phone, email, avatar_url, lead_score, lead_temperature, status, tags, ai_summary, gemral_data, total_revenue, next_follow_up_at)')
    .eq('session_key', req.params.key)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
  res.json(data);
});

// ── GET /api/channels/conversations/:key/messages — Merged inbound + outbound ──
router.get('/:key/messages', async (req, res) => {
  const sessionKey = req.params.key;
  const limit = parseInt(String(req.query.limit || '200'));

  // Nguồn DUY NHẤT dùng chung với Unified Inbox (transcript.ts) — trước đây endpoint này
  // tự truy vấn và lệch với màn kia: lọc inbound theo `session_key` (ẩn tin chưa claim) và
  // lọc/select outbound bằng 2 cột KHÔNG tồn tại (`session_key`, `metadata`) mà không check
  // error ⇒ outbound luôn rỗng (không thấy câu trả lời nào). Xem plan 2026-07-19-INBOX-...
  let inbound: Record<string, any>[];
  let outbound: Record<string, any>[];
  try {
    const t = await fetchTranscript(sessionKey, limit);
    inbound = t.inbound;
    outbound = t.outbound;
  } catch (err: any) {
    // KHÔNG nuốt lỗi thành mảng rỗng — "hội thoại trống" giả là cách bug cũ ẩn mình.
    const invalid = /Invalid session_key/.test(err?.message || '');
    console.error('[conversations/:key/messages] transcript failed:', err?.message || err);
    return res.status(invalid ? 400 : 500).json({ error: err?.message || 'transcript failed' });
  }

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

// ── POST /api/channels/conversations/:key/bot — Toggle bot auto-reply (Sale/BOT handoff) ──
router.post('/:key/bot', async (req, res) => {
  const { paused } = req.body; // true = Sale Trực (pause bot), false = BOT Tự Động
  // Atomic jsonb-merge RPC — không read-merge-write JS (clobber bot_paused/typing_until).
  // RETURNS integer (rowcount) → FAIL-CLOSED: nếu lỗi HOẶC 0 row (session không tồn tại) thì
  // BÁO operator, KHÔNG trả success giả (class fail-open silent-misroute). Plan 2026-08-10.
  const { data: rowcount, error } = await supabase.rpc('cskh_toggle_bot', { p_session_key: req.params.key, p_paused: !!paused });
  if (error) {
    console.error('[Conversations] toggle bot failed:', error.message);
    return res.status(500).json({ error: 'Không đổi được trạng thái bot — thử lại' });
  }
  if (!rowcount || Number(rowcount) === 0) {
    return res.status(404).json({ error: 'Không tìm thấy hội thoại để đổi trạng thái bot' });
  }
  if (!paused) {
    // Bật bot lại → DỌN tin khách đọng lúc paused (đánh dấu 'skipped', KHÔNG re-drain replay —
    // chị Jennie chốt: im đến khi khách nhắn tin MỚI). Chống-replay chính = drain-filter trong
    // runSessionBatch; đây chỉ dọn backlog. Trực tiếp vì cùng process; edge/mobile qua realtime bridge.
    void markPendingSkippedBeforeUnpause(req.params.key);
  }
  res.json({ bot_paused: !!paused, message: paused ? 'Đã chuyển Sale trực' : 'Đã bật BOT tự động' });
});

// ── POST /api/channels/conversations/:key/link-customer — Gán CRM customer cho hội thoại ──
router.post('/:key/link-customer', async (req, res) => {
  const { customer_id } = req.body || {};
  if (!customer_id) return res.status(400).json({ error: 'Thiếu customer_id' });
  // Verify customer tồn tại (tránh gán id rác → FK fail âm thầm)
  const { data: cust } = await supabase
    .from('crm_customers')
    .select('id, display_name')
    .eq('id', customer_id)
    .maybeSingle();
  if (!cust) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
  const { error } = await supabase
    .from('channel_sessions')
    .update({ customer_id })
    .eq('session_key', req.params.key);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ customer_id, display_name: cust.display_name, message: 'Đã liên kết khách hàng' });
});

// ── POST /api/channels/conversations/:key/merge-customer — Gộp khách hiện tại của hội thoại vào target (dedup) ──
router.post('/:key/merge-customer', async (req, res) => {
  const { customer_id: target } = req.body || {};
  if (!target) return res.status(400).json({ error: 'Thiếu customer_id' });
  const { data: tgt } = await supabase
    .from('crm_customers').select('id, display_name').eq('id', target).maybeSingle();
  if (!tgt) return res.status(404).json({ error: 'Không tìm thấy khách hàng đích' });
  // source = khách hiện đang gắn với hội thoại
  const { data: sess } = await supabase
    .from('channel_sessions').select('customer_id').eq('session_key', req.params.key).maybeSingle();
  const source = (sess?.customer_id as string | null) || null;
  if (source && source !== target) {
    const { error: mErr } = await supabase.rpc('merge_crm_customers', { p_source: source, p_target: target });
    if (mErr) return res.status(400).json({ error: mErr.message });
  }
  // RPC đã relink theo customer_id; set lại cho chắc (trường hợp source null/unlinked).
  const { error } = await supabase
    .from('channel_sessions').update({ customer_id: target }).eq('session_key', req.params.key);
  if (error) return res.status(400).json({ error: error.message });
  res.json({
    customer_id: target, display_name: tgt.display_name,
    merged: !!(source && source !== target),
    message: source && source !== target ? 'Đã gộp dữ liệu & liên kết khách hàng' : 'Đã liên kết khách hàng',
  });
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
// Nhãn là cờ phân loại trên HỘI THOẠI (1 khách có thể nhiều hội thoại). Chỉ
// 'vip' map xuống hồ sơ CRM (status='khach_vip' — cột thủ công, persist được).
// hot/warm/cold KHÔNG ghi crm_customers: lead_temperature là cột DẪN XUẤT do
// trigger trg_lead_score tự tính từ lead_score → ghi tay sẽ bị revert ngay.
// spam + hot/warm/cold = chỉ ở hội thoại. null = gỡ nhãn (giữ CRM nguyên).
router.post('/:key/label', async (req, res) => {
  const { label } = req.body; // 'hot' | 'warm' | 'cold' | 'vip' | 'spam' | null
  await supabase.from('channel_sessions')
    .update({ label: label || null }).eq('session_key', req.params.key);

  if (label === 'vip') {
    const { data: sess } = await supabase.from('channel_sessions')
      .select('customer_id').eq('session_key', req.params.key).maybeSingle();
    if (sess?.customer_id) {
      const { error: crmErr } = await supabase.from('crm_customers')
        .update({ status: 'khach_vip', updated_at: new Date().toISOString() })
        .eq('id', sess.customer_id);
      if (crmErr) console.error('[label→crm] vip→status failed', sess.customer_id, crmErr.message);
    }
  }

  const labels: Record<string, string> = {
    hot: 'Nóng', warm: 'Ấm', cold: 'Lạnh', vip: 'VIP', spam: 'Spam',
  };
  res.json({ label, message: label ? `Đã phân loại: ${labels[label] || label}` : 'Đã gỡ phân loại' });
});

// ── POST /api/channels/conversations/:key/agent — Set the agent for THIS chat ──
// Lets the operator turn the bot ON (with a chosen agent) or OFF for a single
// conversation — even on a channel that has no default agent. Writes a
// chat_agent_overrides row that resolveAgent's Tier-2 actually matches
// (match_type='chat_id'). Tier-2 is queried per-message (uncached) so the change
// takes effect on the very next inbound message — no cache flush needed.
//
// Body: { agent_slug }. Empty/null agent_slug = bot OFF for this chat (action='ignore',
// which suppresses even a channel default). A non-empty slug = bot ON with that agent.
router.post('/:key/agent', async (req, res) => {
  const agentSlug = (req.body?.agent_slug || '').trim() || null;
  const key = req.params.key;

  // Keep the session's own agent_slug in sync (drives the inbox UI display).
  await supabase.from('channel_sessions')
    .update({ agent_slug: agentSlug }).eq('session_key', key);

  const { data: sess } = await supabase.from('channel_sessions')
    .select('chat_id, sender_id').eq('session_key', key).single();

  // resolveAgent Tier-2 matches match_value against msg.chatId / msg.senderId.
  const matchValue = sess?.chat_id || sess?.sender_id || null;
  if (matchValue) {
    const matchType = sess?.chat_id ? 'chat_id' : 'sender_id';
    // Replace any prior per-chat override for this thread (idempotent — no reliance
    // on a unique constraint), then write the explicit current choice.
    await supabase.from('chat_agent_overrides')
      .delete().eq('match_type', matchType).eq('match_value', matchValue);
    await supabase.from('chat_agent_overrides').insert({
      match_type: matchType,
      match_value: matchValue,
      agent_slug: agentSlug,
      action: agentSlug ? 'route' : 'ignore',
      is_active: true,
      priority: 100, // beat channel default + keyword rules
      reason: agentSlug ? 'Bật bot/đổi agent từ hội thoại' : 'Tắt bot cho hội thoại này',
      created_by: 'board',
    });
  }

  res.json({
    agent_slug: agentSlug,
    message: agentSlug ? `Đã bật bot với agent: ${agentSlug}` : 'Đã tắt bot cho hội thoại này',
  });
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
