// CRM Order API Routes — CRUD + stats

import { Router } from 'express';
import { supabase } from '../zalo-personal/supabase.js';
import { queueCAPIEvent } from './tracking/capi-queue.js';

const router = Router();

// GET /orders — list + filter + search + pagination
router.get('/', async (req, res) => {
  try {
    const {
      status, source, customer_id, search,
      date_from, date_to, page = '1', limit = '25',
    } = req.query as Record<string, string>;

    let query = supabase
      .from('crm_orders')
      .select('*, customer:crm_customers(id, display_name, phone, avatar_url)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (search) query = query.or(`order_number.ilike.%${search}%,shipping_name.ilike.%${search}%`);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

    query = query
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * pageSize, pageNum * pageSize - 1);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách đơn hàng' });
  }
});

// GET /orders/stats
router.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('crm_orders').select('status, total, created_at');
    if (error) return res.status(500).json({ error: error.message });

    const orders = data || [];
    const byStatus: Record<string, number> = {};
    let totalRevenue = 0;
    let todayRevenue = 0;
    let todayCount = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      totalRevenue += parseFloat(o.total) || 0;
      if (o.created_at?.startsWith(today)) {
        todayRevenue += parseFloat(o.total) || 0;
        todayCount++;
      }
    }

    res.json({
      total: orders.length,
      totalRevenue,
      todayCount,
      todayRevenue,
      by_status: byStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi thống kê đơn hàng' });
  }
});

// GET /orders/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_orders')
      .select('*, customer:crm_customers(id, display_name, phone, email, avatar_url)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải chi tiết đơn' });
  }
});

// POST /orders — create
router.post('/', async (req, res) => {
  try {
    const { customer_id, items, shipping_name, shipping_phone, shipping_address,
      shipping_province, shipping_district, shipping_ward, shipping_note,
      payment_method, discount_amount, discount_code, shipping_fee,
      source, source_channel, customer_note, internal_note } = req.body;

    if (!customer_id) return res.status(400).json({ error: 'Thiếu khách hàng' });
    if (!items?.length) return res.status(400).json({ error: 'Cần ít nhất 1 sản phẩm' });

    const subtotal = (items || []).reduce((sum: number, i: any) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
    // Auto-calc shipping: miễn phí nếu subtotal >= 500K, nếu không 30K
    const autoShipping = shipping_fee !== undefined ? shipping_fee : (subtotal >= 500000 ? 0 : 30000);
    const total = subtotal - (discount_amount || 0) + autoShipping;

    const { data, error } = await supabase
      .from('crm_orders')
      .insert({
        customer_id,
        items,
        subtotal,
        discount_amount: discount_amount || 0,
        discount_code,
        shipping_fee: autoShipping,
        total,
        shipping_name, shipping_phone, shipping_address,
        shipping_province, shipping_district, shipping_ward, shipping_note,
        payment_method: payment_method || 'chuyen_khoan',
        source: source || 'manual',
        source_channel,
        customer_note, internal_note,
        created_by_agent: 'board',
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Update customer stats
    await supabase.rpc('increment_customer_stats', {
      p_id: customer_id,
      p_orders: 1,
      p_revenue: total,
    }).catch(() => {});

    // Create interaction
    await supabase.from('crm_interactions').insert({
      customer_id,
      interaction_type: 'order_created',
      title: `Đơn hàng ${data.order_number}`,
      content: `${items.length} sản phẩm, tổng ${new Intl.NumberFormat('vi-VN').format(total)}₫`,
      revenue: total,
      agent_slug: 'board',
    });

    // War Room notification
    const { data: ch } = await supabase.from('war_room_channels').select('id').eq('name', 'general').maybeSingle();
    if (ch) {
      await supabase.from('war_room_messages').insert({
        channel_id: ch.id,
        sender_type: 'system', sender_id: 'crm', sender_name: 'CRM System',
        message_type: 'info',
        content: `📦 Đơn hàng mới ${data.order_number} — ${new Intl.NumberFormat('vi-VN').format(total)}₫ (${items.length} sản phẩm)`,
        priority: 2,
      }).catch(() => {});
    }

    // Queue CAPI Purchase event
    await queueCAPIEvent({
      event_name: 'Purchase',
      customer_id,
      payload: { value: total, currency: 'VND', order_id: data.id, order_number: data.order_number },
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
  }
});

// PUT /orders/:id — update status
router.put('/:id', async (req, res) => {
  try {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    const allowed = ['status', 'payment_status', 'paid_amount', 'paid_at', 'tracking_number', 'shipping_provider', 'internal_note'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('crm_orders')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật đơn hàng' });
  }
});

// GET /orders/products/search — Shopify product search
router.get('/products/search', async (req, res) => {
  try {
    const { q, limit = '10' } = req.query;
    if (!q || (q as string).trim().length < 2) {
      return res.json({ products: [] });
    }

    const SHOPIFY_STORE = process.env.SHOPIFY_STORE_URL;
    const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
      return res.json({ products: [], error: 'Shopify chưa cấu hình' });
    }

    const url = `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json?title=${encodeURIComponent(q as string)}&limit=${limit}&status=active`;
    const shopifyRes = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
    });

    if (!shopifyRes.ok) {
      return res.json({ products: [], error: `Shopify API: ${shopifyRes.status}` });
    }

    const data = await shopifyRes.json();
    const products = (data.products || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      image_url: p.image?.src || null,
      product_type: p.product_type || '',
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title === 'Default Title' ? '' : v.title,
        price: parseFloat(v.price) || 0,
        sku: v.sku || '',
        stock: v.inventory_quantity || 0,
        available: (v.inventory_quantity || 0) > 0,
      })),
    }));

    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi tìm sản phẩm' });
  }
});

export default router;
