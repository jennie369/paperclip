// CRM Context Builder — builds customer context block for agent prompt injection

import { supabase } from '../zalo-personal/supabase.js';
import { MemoryService } from './memory-service.js';

const memoryService = new MemoryService();

export class ContextBuilder {

  /**
   * Build a text context block with full customer info for agent prompt.
   * Returns empty string if customer not found.
   *
   * Sprint D10: optional `sessionKey` arg pulls purchase_stage + bot_paused
   * + escalation history from channel_sessions.metadata so the agent knows
   * exactly where in the funnel this customer is across the entire session.
   */
  async build(customerId: string, sessionKey?: string): Promise<string> {
    // 1. Customer profile
    const { data: c } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!c) return '';

    // 2. Recent orders (last 3)
    const { data: orders } = await supabase
      .from('crm_orders')
      .select('order_number, status, total, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(3);

    // 3. Open tickets
    const { data: tickets } = await supabase
      .from('crm_tickets')
      .select('ticket_number, title, priority, status')
      .eq('customer_id', customerId)
      .not('status', 'in', '("resolved","closed")')
      .limit(5);

    // 4. Pinned notes
    const { data: notes } = await supabase
      .from('crm_notes')
      .select('content, created_by, created_at')
      .eq('customer_id', customerId)
      .eq('pinned', true)
      .limit(3);

    // 5. Format helpers
    const formatVND = (n: number) =>
      new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';

    const timeAgo = (d: string) => {
      const ms = Date.now() - new Date(d).getTime();
      if (ms < 3600000) return Math.round(ms / 60000) + ' phút trước';
      if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
      return Math.round(ms / 86400000) + ' ngày trước';
    };

    // 6. Build context string
    let ctx = `[HỒ SƠ KHÁCH HÀNG — ${c.display_name}]
• Trạng thái: ${c.status} | Lead: ${c.lead_score}/100 (${c.lead_temperature})
• SĐT: ${c.phone || 'Chưa có'} | Email: ${c.email || 'Chưa có'}
• Tổng đơn: ${c.total_orders} | Doanh thu: ${formatVND(c.total_revenue)}
• Lần cuối liên hệ: ${c.last_contact_at ? timeAgo(c.last_contact_at) : 'Lần đầu'}
• Agent phụ trách: ${c.assigned_agent || 'Chưa gán'}`;

    // Tags from CRM (auto-tag từ purchase stage handler hoặc CS manual tags)
    if (Array.isArray(c.ai_tags) && c.ai_tags.length > 0) {
      ctx += `\n• Tags: ${c.ai_tags.join(', ')}`;
    }

    if (c.ai_summary) {
      ctx += `\n\n[TÓM TẮT AI]\n${c.ai_summary}`;
    }

    // Sprint D10: purchase journey stage + bot_paused state from session metadata
    if (sessionKey) {
      try {
        const { data: sessRow } = await supabase
          .from('channel_sessions')
          .select('metadata')
          .eq('session_key', sessionKey)
          .single();
        const meta = (sessRow?.metadata as Record<string, unknown>) || {};
        const stage = meta.purchase_stage as string | undefined;
        const stageUpdatedAt = meta.purchase_stage_updated_at as string | undefined;
        const followupCount = Number(meta.followup_count || 0);
        const botPaused = meta.bot_paused === true;

        if (stage || followupCount > 0 || botPaused) {
          ctx += '\n\n[PURCHASE JOURNEY STATE]';
          if (stage) ctx += `\n• Stage: ${stage}${stageUpdatedAt ? ` (cập nhật ${timeAgo(stageUpdatedAt)})` : ''}`;
          if (followupCount > 0) {
            ctx += `\n• Đã follow-up ${followupCount} lần`;
            const lastFollowupAt = meta.last_followup_at as string | undefined;
            if (lastFollowupAt) ctx += ` (gần nhất ${timeAgo(lastFollowupAt)})`;
          }
          if (botPaused) {
            ctx += `\n• ⚠️ BOT PAUSED — escalation đang chờ human xử lý`;
          }
        }
      } catch { /* non-blocking */ }
    }

    // Gemral data (enriched by Module G later)
    if (c.gemral_data?.is_app_user) {
      ctx += '\n\n[GEMRAL APP — ĐÃ ĐĂNG KÝ]';
      ctx += `\n• Chatbot: ${c.gemral_data.chatbot_tier} | Scanner: ${c.gemral_data.scanner_tier} | Khóa học: ${c.gemral_data.course_tier}`;
      if ((c.gemral_data.courses_enrolled || []).length > 0) {
        ctx += `\n• Khóa học (${c.gemral_data.total_courses}):`;
        for (const co of c.gemral_data.courses_enrolled) {
          ctx += `\n  — ${co.title}: ${co.progress}% hoàn thành`;
        }
      }
      if (c.gemral_data.is_affiliate) {
        ctx += `\n• CTV ${(c.gemral_data.affiliate_tier || '').toUpperCase()} | Mã: ${c.gemral_data.affiliate_code} | Doanh số: ${formatVND(c.gemral_data.affiliate_total_sales || 0)}`;
      }
    }

    if ((orders || []).length > 0) {
      ctx += '\n\n[ĐƠN HÀNG GẦN ĐÂY]';
      for (const o of orders!) {
        ctx += `\n• ${o.order_number}: ${o.status} — ${formatVND(o.total)} (${timeAgo(o.created_at)})`;
      }
    }

    if ((tickets || []).length > 0) {
      ctx += '\n\n[TICKET ĐANG MỞ]';
      for (const t of tickets!) {
        ctx += `\n• ${t.ticket_number}: [${t.priority}] ${t.title} — ${t.status}`;
      }
    }

    if ((notes || []).length > 0) {
      ctx += '\n\n[GHI CHÚ QUAN TRỌNG]';
      for (const n of notes!) {
        ctx += `\n• ${n.content} (${n.created_by}, ${timeAgo(n.created_at)})`;
      }
    }

    // ReMe memory (non-blocking, timeout 5s)
    const memoryContext = await memoryService.retrieve(customerId, 'recent conversations').catch(() => '');
    if (memoryContext) ctx += memoryContext;

    // Sprint D10: Knowledge Graph entities related to this customer
    // Pulls top 3 entities the KG extractor has linked to this customer in
    // past chats (products mentioned, courses asked about, crystals viewed).
    try {
      const { data: kgEntities } = await supabase
        .from('kg_entities')
        .select('entity_type, entity_name, properties')
        .eq('linked_customer_id', customerId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (kgEntities && kgEntities.length > 0) {
        ctx += '\n\n[KNOWLEDGE GRAPH — Entities khách đã quan tâm]';
        for (const e of kgEntities) {
          ctx += `\n• ${e.entity_type}: ${e.entity_name}`;
        }
      }
    } catch { /* table may not exist yet — fail silent */ }

    ctx += `\n\n[HƯỚNG DẪN TOOLS]
- Dùng tool "crm_update" để cập nhật thông tin khách
- Dùng tool "create_ticket" nếu cần escalate vấn đề
- Dùng tool "create_order" nếu khách muốn đặt hàng
- Dùng tool "search_product" để tìm sản phẩm Shopify
- Dùng tool "search_knowledge" để tìm thông tin chính xác về sản phẩm/khóa học`;

    return ctx;
  }
}
