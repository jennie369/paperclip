#!/usr/bin/env node
// CRM MCP Server — 9 tools for agent tool execution
// Spawned by Claude CLI via --mcp-config, communicates via stdio

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase — same config as channels/zalo-personal/supabase.ts
const supabaseUrl = process.env.GEMRAL_SUPABASE_URL || 'https://pgfkbcnzqozzkohwbgbk.supabase.co';
const supabaseKey = process.env.GEMRAL_SUPABASE_SERVICE_KEY || '';
if (!supabaseKey) {
  console.error('[MCP] GEMRAL_SUPABASE_SERVICE_KEY not set');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Shopify config
const shopifyStore = process.env.SHOPIFY_STORE_URL || '';
const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN || '';

// ─── Tool definitions ───

const TOOLS = [
  {
    name: 'create_order',
    description: 'Tạo đơn hàng mới cho khách hàng trong CRM',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'UUID khách hàng CRM' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              variant_id: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
            },
            required: ['title', 'quantity', 'price'],
          },
          description: 'Danh sách sản phẩm',
        },
        shipping_name: { type: 'string' },
        shipping_phone: { type: 'string' },
        shipping_address: { type: 'string' },
        payment_method: { type: 'string', description: 'chuyen_khoan, cod, momo, vnpay' },
        customer_note: { type: 'string' },
        source_channel: { type: 'string' },
      },
      required: ['customer_id', 'items'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Tạo phiếu hỗ trợ / escalate vấn đề cho khách',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string' },
        title: { type: 'string', description: 'Tiêu đề phiếu' },
        description: { type: 'string' },
        category: { type: 'string', description: 'general, product_inquiry, order_issue, payment_issue, shipping_issue, refund_request, technical_support, complaint, feature_request, bug_report, escalation' },
        priority: { type: 'string', description: 'low, medium, high, urgent, critical' },
        source_channel: { type: 'string' },
      },
      required: ['customer_id', 'title'],
    },
  },
  {
    name: 'search_product',
    description: 'Tìm sản phẩm trên Shopify theo từ khóa',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm' },
        limit: { type: 'number', description: 'Số kết quả tối đa (mặc định 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'crm_update',
    description: 'Cập nhật thông tin khách hàng CRM (SĐT, email, status, tags...)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        status: { type: 'string' },
        display_name: { type: 'string' },
        assigned_agent: { type: 'string' },
        internal_notes: { type: 'string' },
        add_tags: { type: 'array', items: { type: 'string' }, description: 'Tên tag cần thêm' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'send_email',
    description: 'Gửi email cho khách hàng qua Resend',
    inputSchema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Email người nhận' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'Nội dung email (HTML hoặc text)' },
        template: { type: 'string', description: 'Template: thank_you, follow_up, promotion, welcome' },
        customer_id: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'get_customer_info',
    description: 'Lấy chi tiết khách hàng CRM + Gemral data',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
  {
    name: 'check_course_access',
    description: 'Kiểm tra quyền truy cập khóa học của khách trên Gemral App',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'CRM customer_id' },
        course_id: { type: 'string', description: 'UUID khóa học (tùy chọn)' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'link_gemral_account',
    description: 'Liên kết tài khoản chat với tài khoản Gemral App bằng email hoặc SĐT',
    inputSchema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'search_knowledge',
    description: 'Tìm thông tin trong Knowledge Base (sản phẩm, khóa học, FAQ)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Câu hỏi hoặc từ khóa' },
        collection: { type: 'string', description: 'Collection: products, courses, faq (tùy chọn)' },
        limit: { type: 'number', description: 'Số kết quả (mặc định 3)' },
      },
      required: ['query'],
    },
  },
];

// ─── Tool handlers ───

async function handleCreateOrder(args: any): Promise<string> {
  const items = args.items || [];
  if (items.length === 0) {
    return JSON.stringify({ success: false, error: 'Cần ít nhất 1 sản phẩm' });
  }

  const subtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
  const total = subtotal + (args.shipping_fee || 0) - (args.discount_amount || 0);

  const { data, error } = await supabase
    .from('crm_orders')
    .insert({
      customer_id: args.customer_id,
      items,
      subtotal,
      total,
      shipping_name: args.shipping_name,
      shipping_phone: args.shipping_phone,
      shipping_address: args.shipping_address,
      payment_method: args.payment_method || 'chuyen_khoan',
      source: 'chat',
      source_channel: args.source_channel,
      customer_note: args.customer_note,
      created_by_agent: 'mcp',
    })
    .select('id, order_number, total')
    .single();

  if (error) {
    return JSON.stringify({ success: false, error: `Lỗi tạo đơn: ${error.message}` });
  }

  // Update customer stats
  await supabase.rpc('increment_customer_stats', {
    p_id: args.customer_id,
    p_orders: 1,
    p_revenue: total,
  });

  // Create interaction record
  await supabase.from('crm_interactions').insert({
    customer_id: args.customer_id,
    interaction_type: 'order_created',
    title: `Đơn hàng ${data.order_number}`,
    content: `${items.length} sản phẩm, tổng ${formatVND(total)}`,
    revenue: total,
    agent_slug: 'mcp',
  });

  return JSON.stringify({
    success: true,
    order_number: data.order_number,
    total: formatVND(total),
    item_count: items.length,
  });
}

async function handleCreateTicket(args: any): Promise<string> {
  const { data, error } = await supabase
    .from('crm_tickets')
    .insert({
      customer_id: args.customer_id,
      title: args.title,
      description: args.description,
      category: args.category || 'general',
      priority: args.priority || 'medium',
      source_channel: args.source_channel,
      created_by_agent: 'mcp',
      timeline: [{
        action: 'created',
        by: 'mcp',
        at: new Date().toISOString(),
        note: args.description,
      }],
    })
    .select('id, ticket_number, priority, status')
    .single();

  if (error) {
    return JSON.stringify({ success: false, error: `Lỗi tạo ticket: ${error.message}` });
  }

  // Create interaction
  await supabase.from('crm_interactions').insert({
    customer_id: args.customer_id,
    interaction_type: 'ticket_created',
    title: `Ticket ${data.ticket_number}: ${args.title}`,
    agent_slug: 'mcp',
  });

  // If escalation priority, post to War Room
  if (args.priority === 'urgent' || args.priority === 'critical') {
    await supabase.from('war_room_messages').insert({
      channel_id: await getWarRoomChannelId('general'),
      sender_type: 'system',
      sender_name: 'CRM Bot',
      content: `🚨 Ticket KHẨN CẤP: ${data.ticket_number} — ${args.title} (${args.priority})`,
      metadata: { ticket_id: data.id },
    }).catch(() => { /* War Room optional */ });
  }

  return JSON.stringify({
    success: true,
    ticket_number: data.ticket_number,
    priority: data.priority,
    status: data.status,
  });
}

async function handleSearchProduct(args: any): Promise<string> {
  if (!shopifyStore || !shopifyToken) {
    return JSON.stringify({ success: false, error: 'Shopify chưa cấu hình' });
  }

  const limit = args.limit || 5;
  const url = `https://${shopifyStore}/admin/api/2024-01/products.json?title=${encodeURIComponent(args.query)}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': shopifyToken },
    });

    if (!res.ok) {
      return JSON.stringify({ success: false, error: `Shopify API lỗi: ${res.status}` });
    }

    const json = await res.json() as { products: any[] };
    const products = (json.products || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.variants?.[0]?.price,
      variant_id: p.variants?.[0]?.id,
      status: p.status,
      image: p.image?.src,
      inventory: p.variants?.[0]?.inventory_quantity,
    }));

    return JSON.stringify({ success: true, products, count: products.length });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: `Lỗi kết nối Shopify: ${err.message}` });
  }
}

async function handleCRMUpdate(args: any): Promise<string> {
  const updates: Record<string, any> = {};
  if (args.phone) updates.phone = args.phone;
  if (args.email) updates.email = args.email;
  if (args.status) updates.status = args.status;
  if (args.display_name) updates.display_name = args.display_name;
  if (args.assigned_agent) updates.assigned_agent = args.assigned_agent;
  if (args.internal_notes) updates.internal_notes = args.internal_notes;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('crm_customers')
      .update(updates)
      .eq('id', args.customer_id);

    if (error) {
      return JSON.stringify({ success: false, error: `Lỗi cập nhật: ${error.message}` });
    }
  }

  // Handle tags
  if (args.add_tags?.length > 0) {
    for (const tagName of args.add_tags) {
      const { data: tag } = await supabase
        .from('crm_tags')
        .select('id')
        .eq('name', tagName)
        .maybeSingle();

      if (tag) {
        await supabase.from('crm_customer_tags')
          .upsert({ customer_id: args.customer_id, tag_id: tag.id, tagged_by: 'agent' });
      }
    }
  }

  return JSON.stringify({
    success: true,
    updated_fields: Object.keys(updates),
    tags_added: args.add_tags || [],
  });
}

async function handleSendEmail(args: any): Promise<string> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return JSON.stringify({ success: false, error: 'Resend API key chưa cấu hình' });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GEM Partnership <partnership@gemral.com>',
        to: [args.to],
        subject: args.subject,
        html: args.body,
      }),
    });

    const result = await res.json() as { id?: string; message?: string };

    if (!res.ok) {
      return JSON.stringify({ success: false, error: `Lỗi gửi email: ${result.message}` });
    }

    // Track in CRM
    if (args.customer_id) {
      await supabase.from('crm_customers')
        .update({
          emails_sent: supabase.rpc ? undefined : 0, // Will use increment later
          last_email_at: new Date().toISOString(),
        })
        .eq('id', args.customer_id);

      await supabase.from('crm_interactions').insert({
        customer_id: args.customer_id,
        interaction_type: 'email_sent',
        title: args.subject,
        content: args.body.substring(0, 500),
        agent_slug: 'mcp',
      });
    }

    return JSON.stringify({ success: true, email_id: result.id });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: `Lỗi gửi email: ${err.message}` });
  }
}

async function handleGetCustomerInfo(args: any): Promise<string> {
  let query = supabase.from('crm_customers').select('*');

  if (args.customer_id) {
    query = query.eq('id', args.customer_id);
  } else if (args.phone) {
    query = query.eq('phone', args.phone);
  } else if (args.email) {
    query = query.eq('email', args.email);
  } else {
    return JSON.stringify({ success: false, error: 'Cần customer_id, phone, hoặc email' });
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  if (!data) {
    return JSON.stringify({ success: false, error: 'Không tìm thấy khách hàng' });
  }

  return JSON.stringify({
    success: true,
    customer: {
      id: data.id,
      display_name: data.display_name,
      phone: data.phone,
      email: data.email,
      status: data.status,
      lead_score: data.lead_score,
      lead_temperature: data.lead_temperature,
      total_orders: data.total_orders,
      total_revenue: data.total_revenue,
      gemral_data: data.gemral_data,
      ai_summary: data.ai_summary,
    },
  });
}

async function handleCheckCourseAccess(args: any): Promise<string> {
  // Get gemral_user_id from CRM customer
  const { data: customer } = await supabase
    .from('crm_customers')
    .select('gemral_user_id, gemral_data')
    .eq('id', args.customer_id)
    .single();

  if (!customer?.gemral_user_id) {
    return JSON.stringify({
      success: true,
      linked: false,
      message: 'Khách chưa liên kết tài khoản Gemral App',
    });
  }

  let query = supabase
    .from('course_enrollments')
    .select('*, courses(title, slug)')
    .eq('user_id', customer.gemral_user_id);

  if (args.course_id) {
    query = query.eq('course_id', args.course_id);
  }

  const { data: enrollments } = await query;

  return JSON.stringify({
    success: true,
    linked: true,
    gemral_user_id: customer.gemral_user_id,
    enrollments: (enrollments || []).map((e: any) => ({
      course_title: e.courses?.title,
      enrolled_at: e.enrolled_at,
      progress: e.progress_percentage || 0,
      completed: e.completed_at != null,
    })),
  });
}

async function handleLinkGemral(args: any): Promise<string> {
  const { customer_id, email, phone } = args;

  if (!email && !phone) {
    return JSON.stringify({ success: false, error: 'Cần email hoặc SĐT để liên kết' });
  }

  // Find Gemral user by email or phone
  let query = supabase.from('profiles').select('id, email, phone, role, chatbot_tier, scanner_tier, course_tier');

  if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    // Normalize phone: 0xxx → +84xxx
    const normalizedPhone = phone.startsWith('0') ? '+84' + phone.substring(1) : phone;
    query = query.or(`phone.eq.${phone},phone.eq.${normalizedPhone}`);
  }

  const { data: profile } = await query.maybeSingle();

  if (!profile) {
    return JSON.stringify({
      success: false,
      error: 'Không tìm thấy tài khoản Gemral với thông tin này',
    });
  }

  // Link the accounts
  const { error } = await supabase
    .from('crm_customers')
    .update({
      gemral_user_id: profile.id,
      email: email || undefined,
      phone: phone || undefined,
      gemral_data: {
        is_app_user: true,
        chatbot_tier: profile.chatbot_tier,
        scanner_tier: profile.scanner_tier,
        course_tier: profile.course_tier,
        role: profile.role,
        linked_at: new Date().toISOString(),
      },
    })
    .eq('id', customer_id);

  if (error) {
    return JSON.stringify({ success: false, error: `Lỗi liên kết: ${error.message}` });
  }

  return JSON.stringify({
    success: true,
    gemral_user_id: profile.id,
    tiers: {
      chatbot: profile.chatbot_tier,
      scanner: profile.scanner_tier,
      course: profile.course_tier,
    },
  });
}

async function handleSearchKnowledge(args: any): Promise<string> {
  // Placeholder — full implementation in Phase 5 (RAG + pgvector)
  // For now, search Shopify products as basic knowledge source
  const { query, limit = 3 } = args;

  const { data: products } = await supabase
    .from('shopify_product_variants')
    .select('title, price, sku')
    .ilike('title', `%${query}%`)
    .limit(limit);

  if ((products || []).length > 0) {
    return JSON.stringify({
      success: true,
      source: 'shopify_products',
      results: products,
      note: 'Knowledge Base đầy đủ sẽ có ở Phase 5',
    });
  }

  return JSON.stringify({
    success: true,
    results: [],
    note: 'Không tìm thấy kết quả. Knowledge Base đầy đủ sẽ có ở Phase 5',
  });
}

// ─── Helpers ───

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';
}

async function getWarRoomChannelId(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('war_room_channels')
    .select('id')
    .eq('name', name)
    .maybeSingle();
  return data?.id || null;
}

// ─── MCP Server setup ───

const server = new Server(
  { name: 'crm-tools', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'create_order':
        result = await handleCreateOrder(args);
        break;
      case 'create_ticket':
        result = await handleCreateTicket(args);
        break;
      case 'search_product':
        result = await handleSearchProduct(args);
        break;
      case 'crm_update':
        result = await handleCRMUpdate(args);
        break;
      case 'send_email':
        result = await handleSendEmail(args);
        break;
      case 'get_customer_info':
        result = await handleGetCustomerInfo(args);
        break;
      case 'check_course_access':
        result = await handleCheckCourseAccess(args);
        break;
      case 'link_gemral_account':
        result = await handleLinkGemral(args);
        break;
      case 'search_knowledge':
        result = await handleSearchKnowledge(args);
        break;
      default:
        result = JSON.stringify({ error: `Tool không tồn tại: ${name}` });
    }

    return { content: [{ type: 'text', text: result }] };
  } catch (err: any) {
    console.error(`[MCP] Lỗi tool ${name}:`, err.message);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Lỗi: ${err.message}` }) }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] CRM Tools server started');
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
