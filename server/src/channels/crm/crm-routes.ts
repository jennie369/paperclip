// CRM API Routes — CRUD for customers, orders, tickets, stats

import { Router } from 'express';
import { supabase } from '../zalo-personal/supabase.js';
import { matchGemralUser, enrichWithGemralData } from './gemral-bridge.js';
import { queueCAPIEvent } from './tracking/capi-queue.js';

const router = Router();

// GET /api/channels/crm/customers — list with filter, search, pagination
router.get('/customers', async (_req, res) => {
  try {
    const {
      status, temperature, search, assigned_agent,
      page = '1', limit = '20', sort = 'last_contact_at', order = 'desc',
    } = _req.query as Record<string, string>;

    let query = supabase
      .from('crm_customers')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (temperature) query = query.eq('lead_temperature', temperature);
    if (assigned_agent) query = query.eq('assigned_agent', assigned_agent);
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const from = (pageNum - 1) * pageSize;

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(from, from + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/crm/customers/:id — full detail
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [
      { data: customer },
      { data: orders },
      { data: tickets },
      { data: notes },
      { data: interactions },
      { data: tags },
    ] = await Promise.all([
      supabase.from('crm_customers').select('*').eq('id', id).single(),
      supabase.from('crm_orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('crm_tickets').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('crm_notes').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('crm_interactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('crm_customer_tags').select('*, crm_tags(*)').eq('customer_id', id),
    ]);

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    res.json({
      ...customer,
      orders: orders || [],
      tickets: tickets || [],
      notes: notes || [],
      interactions: interactions || [],
      tags: (tags || []).map((t: any) => t.crm_tags).filter(Boolean),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/crm/customers/:id — xóa khách hàng
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('crm_customers').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/crm/customers/bulk — xóa nhiều khách hàng
router.post('/customers/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    const { error } = await supabase.from('crm_customers').delete().in('id', ids);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cột khách-hàng user được phép sửa qua PUT (whitelist — chống mass-assignment
// + chống crash khi UI gửi cột rác như "stage" không tồn tại trong schema).
// LOẠI TRỪ lead_score & lead_temperature: 2 cột này DẪN XUẤT, bị trigger
// trg_lead_score (BEFORE UPDATE) recompute từ calculate_lead_score() trên MỌI
// update → ghi tay vào là futile (no error nhưng revert ngay). Stats, link-IDs
// (gemral/shopify), timestamps = system-managed, cũng không nhận từ client.
const CUSTOMER_EDITABLE_COLUMNS = new Set([
  'display_name', 'phone', 'email', 'avatar_url',
  'status',
  'lead_temperature_manual', // override nhiệt độ (display = COALESCE(manual, auto-from-score))
  'ai_summary', 'ai_tags', 'internal_notes',
  'assigned_agent', 'next_follow_up_at',
]);

// PUT /api/channels/crm/customers/:id — cập nhật khách hàng (status, name, temperature…)
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Chỉ giữ field nằm trong whitelist
    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (CUSTOMER_EDITABLE_COLUMNS.has(k)) patch[k] = v;
    }
    // metadata: MERGE (không clobber key khác) — dùng cho dữ liệu CRM-native
    // như địa chỉ manual (SSOT CRM_AND_META_CAPI: KHÔNG thêm cột mirror, lưu metadata.address).
    const mdIn = (req.body || {}).metadata;
    if (mdIn && typeof mdIn === 'object' && !Array.isArray(mdIn)) {
      const { data: cur } = await supabase.from('crm_customers').select('metadata').eq('id', id).maybeSingle();
      patch.metadata = { ...((cur?.metadata as Record<string, any>) || {}), ...mdIn };
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('crm_customers')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/crm/customers — create
router.post('/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_customers')
      .insert(req.body)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // War Room notification for new lead/customer
    const { data: ch } = await supabase.from('war_room_channels').select('id').eq('name', 'general').maybeSingle();
    if (ch) {
      const name = data.display_name || data.phone || data.email || 'N/A';
      await supabase.from('war_room_messages').insert({
        channel_id: ch.id,
        sender_type: 'system', sender_id: 'crm', sender_name: 'CRM System',
        message_type: 'info',
        content: `👤 Khách hàng mới: ${name}${data.source ? ` (nguồn: ${data.source})` : ''}`,
        priority: 2,
      }).then(undefined, () => {});
    }

    // Queue CAPI Lead event
    await queueCAPIEvent({
      event_name: 'Lead',
      customer_id: data.id,
      payload: { source: data.source || 'manual' },
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/crm/stats — dashboard counts
router.get('/stats', async (_req, res) => {
  try {
    const [
      { count: totalCustomers },
      { count: totalOrders },
      { count: openTickets },
      { data: revenueData },
      { data: newToday },
    ] = await Promise.all([
      supabase.from('crm_customers').select('*', { count: 'exact', head: true }),
      supabase.from('crm_orders').select('*', { count: 'exact', head: true }),
      supabase.from('crm_tickets').select('*', { count: 'exact', head: true })
        .not('status', 'in', '("resolved","closed")'),
      supabase.from('crm_customers').select('total_revenue'),
      supabase.from('crm_customers').select('id', { count: 'exact', head: false })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const totalRevenue = (revenueData || []).reduce(
      (sum: number, c: any) => sum + (parseFloat(c.total_revenue) || 0), 0
    );

    res.json({
      totalCustomers: totalCustomers || 0,
      totalOrders: totalOrders || 0,
      openTickets: openTickets || 0,
      totalRevenue,
      newToday: (newToday || []).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/crm/pipeline — group by status count
router.get('/pipeline', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('status');

    if (error) return res.status(500).json({ error: error.message });

    const pipeline: Record<string, number> = {};
    for (const row of data || []) {
      pipeline[row.status] = (pipeline[row.status] || 0) + 1;
    }

    res.json(pipeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/crm/tags — list all tags
router.get('/tags', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_tags')
      .select('*')
      .order('category')
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/crm/tags — tạo tag mới (dedup case-insensitive theo name → trả tag cũ nếu trùng).
// Cho phép CS tự thêm tag ngoài preset, KHÔNG trùng lặp DB.
router.post('/tags', async (req, res) => {
  try {
    const name = String((req.body || {}).name || '').trim();
    const category = String((req.body || {}).category || 'custom').trim() || 'custom';
    if (!name) return res.status(400).json({ error: 'Thiếu tên tag' });
    // Dedup trong JS (bảng nhỏ) — tránh bẫy wildcard `_`/`%` của ilike với tag snake_case.
    const { data: all } = await supabase.from('crm_tags').select('*');
    const dup = (all || []).find((t: any) => String(t.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup) return res.json(dup);
    const { data, error } = await supabase.from('crm_tags').insert({ name, category }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/crm/customers/:id/sync-gemral — Force re-sync Gemral data
router.post('/customers/:id/sync-gemral', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: cust } = await supabase
      .from('crm_customers')
      .select('gemral_user_id, phone, email')
      .eq('id', id)
      .single();

    if (!cust) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    let gemralId = cust.gemral_user_id;
    if (!gemralId) {
      gemralId = await matchGemralUser(cust.phone, cust.email);
      if (!gemralId) {
        return res.json({ linked: false, message: 'Không tìm thấy tài khoản Gemral' });
      }
    }

    const gemralData = await enrichWithGemralData(id, gemralId);
    res.json({ linked: true, gemral_user_id: gemralId, gemral_data: gemralData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/crm/customers/:id/link-gemral — Link with new email/phone
router.post('/customers/:id/link-gemral', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Cần email hoặc SĐT để liên kết' });
    }

    const gemralId = await matchGemralUser(phone, email);
    if (!gemralId) {
      return res.json({ linked: false, message: 'Không tìm thấy tài khoản Gemral với thông tin này' });
    }

    const gemralData = await enrichWithGemralData(id, gemralId);
    res.json({ linked: true, gemral_user_id: gemralId, gemral_data: gemralData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Campaigns ───

// GET /api/channels/crm/campaigns
router.get('/campaigns', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('crm_email_campaigns').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/channels/crm/campaigns
router.post('/campaigns', async (req, res) => {
  try {
    const { name, subject, template, segment } = req.body;
    const { data, error } = await supabase.from('crm_email_campaigns')
      .insert({ name, subject, template, segment_query: { segment }, status: 'draft' })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Import ───

// POST /api/channels/crm/import — CSV import (simplified: JSON body, not multipart)
router.post('/import', async (req, res) => {
  try {
    const { rows, mapping } = req.body;
    if (!rows?.length) return res.status(400).json({ error: 'Không có dữ liệu' });

    let created = 0, updated = 0, matched_gemral = 0, errors = 0;

    for (const row of rows) {
      try {
        const customer: Record<string, any> = { status: 'lead_moi' };
        for (const [csvCol, crmField] of Object.entries(mapping)) {
          if (crmField && row[csvCol] !== undefined) {
            customer[crmField as string] = row[csvCol];
          }
        }
        if (!customer.display_name && !customer.email && !customer.phone) { errors++; continue; }

        // Check existing by email or phone
        let existing = null;
        if (customer.email) {
          const { data } = await supabase.from('crm_customers').select('id').eq('email', customer.email).maybeSingle();
          existing = data;
        }
        if (!existing && customer.phone) {
          const { data } = await supabase.from('crm_customers').select('id').eq('phone', customer.phone).maybeSingle();
          existing = data;
        }

        if (existing) {
          await supabase.from('crm_customers').update(customer).eq('id', existing.id);
          updated++;
        } else {
          customer.first_contact_at = new Date().toISOString();
          customer.last_contact_at = new Date().toISOString();
          await supabase.from('crm_customers').insert(customer);
          created++;
        }
      } catch { errors++; }
    }

    res.json({ created, updated, matched_gemral, errors, total: rows.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Notes ───

// POST /api/channels/crm/customers/:id/notes — add note
router.post('/customers/:id/notes', async (req, res) => {
  try {
    const { content, note_type, created_by, pinned } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Nội dung ghi chú không được trống' });

    const { data, error } = await supabase
      .from('crm_notes')
      .insert({ customer_id: req.params.id, content: content.trim(), note_type: note_type || 'manual', created_by: created_by || 'board', pinned: pinned || false })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channels/crm/customers/:id/notes/:noteId — sửa ghi chú (content/pinned)
router.put('/customers/:id/notes/:noteId', async (req, res) => {
  try {
    const patch: Record<string, any> = {};
    if (typeof req.body.content === 'string') {
      if (!req.body.content.trim()) return res.status(400).json({ error: 'Nội dung không được trống' });
      patch.content = req.body.content.trim();
    }
    if (typeof req.body.pinned === 'boolean') patch.pinned = req.body.pinned;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Không có gì để cập nhật' });

    const { data, error } = await supabase
      .from('crm_notes')
      .update(patch)
      .eq('id', req.params.noteId).eq('customer_id', req.params.id)
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/crm/customers/:id/notes/:noteId — xoá 1 ghi chú
router.delete('/customers/:id/notes/:noteId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('crm_notes')
      .delete().eq('id', req.params.noteId).eq('customer_id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/crm/customers/:id/notes/bulk-delete — xoá nhiều ghi chú
router.post('/customers/:id/notes/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    const { error } = await supabase
      .from('crm_notes')
      .delete().eq('customer_id', req.params.id).in('id', ids);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tags (gán/gỡ tag cho khách — crm_customer_tags) ───

// POST /api/channels/crm/customers/:id/tags — gán 1 tag (idempotent)
router.post('/customers/:id/tags', async (req, res) => {
  try {
    const { tag_id, tagged_by } = req.body;
    if (!tag_id) return res.status(400).json({ error: 'tag_id required' });
    const { error } = await supabase
      .from('crm_customer_tags')
      .upsert(
        { customer_id: req.params.id, tag_id, tagged_by: tagged_by || 'board' },
        { onConflict: 'customer_id,tag_id', ignoreDuplicates: true },
      );
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/crm/customers/:id/tags/:tagId — gỡ tag
router.delete('/customers/:id/tags/:tagId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('crm_customer_tags')
      .delete()
      .eq('customer_id', req.params.id)
      .eq('tag_id', req.params.tagId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Segments (read-only — segment ĐỘNG theo rule, đánh giá best-effort) ───

// GET /api/channels/crm/customers/:id/segments — segment mà khách THUỘC VỀ.
// chatbot_segments.rules là vocab cố định cho "chatbot user"; map best-effort
// sang dữ liệu CRM. Conservative: điều kiện không có data CRM để verify (vd
// has_abandoned_cart) → coi như KHÔNG thoả → không claim thuộc về.
router.get('/customers/:id/segments', async (req, res) => {
  try {
    const { data: c } = await supabase
      .from('crm_customers')
      .select('channels, gemral_data, total_orders, last_contact_at')
      .eq('id', req.params.id).single();
    if (!c) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    const { data: segs } = await supabase
      .from('chatbot_segments')
      .select('id, name, rules')
      .eq('is_active', true);

    // Dữ liệu khách để so rule
    const platforms = new Set(
      (Array.isArray(c.channels) ? c.channels : []).map((ch: any) => {
        const t = String(ch?.channel_type || '').toLowerCase();
        if (t.includes('zalo')) return 'zalo';
        if (t.includes('facebook') || t.includes('messenger')) return 'messenger';
        if (t.includes('telegram')) return 'telegram';
        return t;
      }),
    );
    const gd = (c.gemral_data || {}) as Record<string, any>;
    const tier = String(gd.tier || gd.chatbot_tier || gd.scanner_tier || '').toUpperCase();
    const purchaseCount = c.total_orders || 0;
    const lastActiveDays = c.last_contact_at
      ? Math.floor((Date.now() - new Date(c.last_contact_at).getTime()) / 86400000)
      : null;

    const matchRange = (v: number | null, r: any) =>
      v != null && (r.lte == null || v <= r.lte) && (r.gte == null || v >= r.gte);

    const matched: Array<{ id: string; name: string }> = [];
    const seenNames = new Set<string>(); // dedup các segment trùng tên
    for (const s of segs || []) {
      const rules = (s.rules || {}) as Record<string, any>;
      let ok = true;
      for (const [key, cond] of Object.entries(rules)) {
        if (key === 'platform') ok = Array.isArray(cond) && cond.some((p: string) => platforms.has(p));
        else if (key === 'tier') ok = Array.isArray(cond) && cond.map((t) => String(t).toUpperCase()).includes(tier);
        else if (key === 'purchase_count') ok = matchRange(purchaseCount, cond);
        else if (key === 'last_active_days') ok = matchRange(lastActiveDays, cond);
        else ok = false; // điều kiện không map được (has_abandoned_cart…) → conservative
        if (!ok) break;
      }
      if (ok && !seenNames.has(s.name)) { seenNames.add(s.name); matched.push({ id: s.id, name: s.name }); }
    }
    res.json(matched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Webhook Logs + Replay ───

// GET /api/channels/crm/webhooks/logs — recent webhook events
router.get('/webhooks/logs', async (_req, res) => {
  try {
    const { data } = await supabase
      .from('shopify_webhook_events')
      .select('id, source, event, body, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

// POST /api/channels/crm/webhooks/replay/:id — replay a webhook event
router.post('/webhooks/replay/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('shopify_webhook_events')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Log not found' });

    // Re-POST the original body to the local Shopify webhook endpoint
    const body = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
    const resp = await fetch('http://127.0.0.1:3101/api/channels/shopify/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': data.event || 'orders/create',
        'X-Paperclip-Replay': '1',
      },
      body,
    });
    res.json({ ok: resp.ok, status: resp.status, replayed_id: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
