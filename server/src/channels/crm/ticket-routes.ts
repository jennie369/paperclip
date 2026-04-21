// CRM Ticket API Routes — CRUD + escalate + resolve + stats + agent spawn

import { Router } from 'express';
import { supabase } from '../zalo-personal/supabase.js';

const router = Router();

/** Spawn agent to handle ticket:
 *  1. Create Paperclip issue assigned to agent (appears in agent's inbox)
 *  2. Call wakeup API with issue context → agent processes it
 */
async function spawnAgentForTicket(
  agentSlug: string,
  ticketId: string,
  ticketNumber: string,
  ticketTitle: string,
  ticketDescription?: string,
  ticketPriority?: string,
): Promise<void> {
  try {
    // 1. Look up agent UUID + company
    const { data: agent } = await supabase
      .from('agents')
      .select('id, company_id')
      .eq('slug', agentSlug)
      .maybeSingle();

    if (!agent?.id) {
      console.warn(`[Tickets] Agent "${agentSlug}" not found`);
      return;
    }

    const port = process.env.PORT || 3101;
    const base = `http://localhost:${port}/api`;

    // 2. Create Paperclip issue assigned to agent
    const priorityMap: Record<string, string> = {
      critical: 'critical', urgent: 'high', high: 'high', medium: 'medium', low: 'low',
    };

    const issueRes = await fetch(`${base}/companies/${agent.company_id}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[CRM] ${ticketNumber}: ${ticketTitle}`,
        body: ticketDescription
          ? `**Phiếu hỗ trợ CRM**: ${ticketNumber}\n\n${ticketDescription}\n\n---\nTicket ID: ${ticketId}`
          : `Phiếu hỗ trợ CRM ${ticketNumber} cần xử lý.\n\nTicket ID: ${ticketId}`,
        priority: priorityMap[ticketPriority || 'medium'] || 'medium',
        assigneeIds: [agent.id],
      }),
    });

    let issueId: string | null = null;
    if (issueRes.ok) {
      const issue = await issueRes.json();
      issueId = issue.id;
      console.log(`[Tickets] Issue created: ${issue.key} → agent ${agentSlug}`);

      // Link issue back to ticket
      await supabase.from('crm_tickets')
        .update({ paperclip_issue_id: issue.key || issue.id })
        .eq('id', ticketId);
    } else {
      console.warn(`[Tickets] Issue creation failed: ${issueRes.status}`);
    }

    // 3. Wakeup agent with ticket context
    const wakeRes = await fetch(`${base}/agents/${agent.id}/wakeup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'assignment',
        triggerDetail: 'system',
        reason: `CRM ticket ${ticketNumber}: ${ticketTitle}`,
        payload: {
          issueId,
          ticketId,
          ticketNumber,
          ticketTitle,
          ticketPriority,
          source: 'crm_ticket',
        },
      }),
    });

    if (wakeRes.ok) {
      console.log(`[Tickets] Agent "${agentSlug}" woken for ${ticketNumber}`);
    } else {
      console.warn(`[Tickets] Wakeup failed: ${wakeRes.status}`);
    }
  } catch (err: any) {
    console.warn(`[Tickets] Spawn error: ${err.message}`);
  }
}

// GET /tickets — list + filter + search + pagination
router.get('/', async (req, res) => {
  try {
    const {
      status, priority, category, assigned_to, customer_id, search,
      page = '1', limit = '25', sort_by = 'created_at', sort_order = 'desc',
    } = req.query as Record<string, string>;

    let query = supabase
      .from('crm_tickets')
      .select('*, customer:crm_customers(id, display_name, phone, avatar_url, lead_score)', { count: 'exact' });

    if (status) query = query.in('status', status.split(','));
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category', category);
    if (assigned_to) query = query.eq('assigned_to_agent', assigned_to);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (search) query = query.or(`title.ilike.%${search}%,ticket_number.ilike.%${search}%,description.ilike.%${search}%`);

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const from = (pageNum - 1) * pageSize;

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, from + pageSize - 1);

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
    res.status(500).json({ error: 'Lỗi tải danh sách phiếu hỗ trợ' });
  }
});

// GET /tickets/stats — counts by status + priority
router.get('/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_tickets')
      .select('status, priority');
    if (error) return res.status(500).json({ error: error.message });

    const tickets = data || [];
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }

    const openStatuses = ['open', 'assigned', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated', 'reopened'];
    const openCount = openStatuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0);

    res.json({
      total: tickets.length,
      open: openCount,
      urgent: (byPriority['urgent'] || 0) + (byPriority['critical'] || 0),
      escalated: byStatus['escalated'] || 0,
      by_status: byStatus,
      by_priority: byPriority,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi thống kê phiếu hỗ trợ' });
  }
});

// GET /tickets/:id — detail + customer + related order
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_tickets')
      .select('*, customer:crm_customers(id, display_name, phone, email, avatar_url, lead_score, status), related_order:crm_orders(id, order_number, total, status)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Không tìm thấy phiếu hỗ trợ' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải chi tiết phiếu' });
  }
});

// POST /tickets — create
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority, customer_id,
      source_channel, source_session_key, assigned_to_agent, related_order_id, tags,
      created_by_agent } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Tiêu đề phiếu không được để trống' });

    // SLA deadline based on priority
    const slaHours: Record<string, number> = { critical: 1, urgent: 4, high: 8, medium: 24, low: 72 };
    const slaDeadline = new Date(Date.now() + (slaHours[priority || 'medium'] || 24) * 3600000).toISOString();

    const { data, error } = await supabase
      .from('crm_tickets')
      .insert({
        title: title.trim(),
        description: description?.trim(),
        category: category || 'general',
        priority: priority || 'medium',
        customer_id: customer_id || null,
        status: assigned_to_agent ? 'assigned' : 'open',
        assigned_to_agent,
        source_channel,
        source_session_key,
        related_order_id,
        sla_deadline: slaDeadline,
        tags: tags || [],
        created_by_agent: created_by_agent || 'board',
        timeline: [{ ts: new Date().toISOString(), action: 'created', agent: created_by_agent || 'board', note: `Phiếu tạo mới: ${title}` }],
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Create interaction
    if (customer_id) {
      await supabase.from('crm_interactions').insert({
        customer_id,
        interaction_type: 'ticket_created',
        title: `Phiếu mới: ${data.ticket_number}`,
        content: title,
        metadata: { ticket_id: data.id, priority, category },
      });
    }

    // Spawn agent to handle ticket
    if (assigned_to_agent) {
      spawnAgentForTicket(assigned_to_agent, data.id, data.ticket_number, title, description, priority).catch(() => {});
    }

    // War Room notification when agent assigned or priority urgent/critical
    if (assigned_to_agent || ['urgent', 'critical'].includes(priority)) {
      const { data: ch } = await supabase.from('war_room_channels').select('id').eq('name', 'general').maybeSingle();
      if (ch) {
        const pLabel = priority === 'critical' ? 'NGHIÊM TRỌNG' : priority === 'urgent' ? 'KHẨN CẤP' : priority?.toUpperCase();
        await supabase.from('war_room_messages').insert({
          channel_id: ch.id,
          sender_type: 'system', sender_id: 'crm', sender_name: 'CRM',
          message_type: 'alert',
          content: `[TICKET ${pLabel}] ${data.ticket_number}: ${title}${assigned_to_agent ? `\n→ Gán cho: ${assigned_to_agent}` : ''}`,
          priority: ['urgent', 'critical'].includes(priority) ? 0 : 2,
        }).catch(() => {});
      }
    }

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo phiếu hỗ trợ' });
  }
});

// PUT /tickets/:id — update status/priority/assigned
router.put('/:id', async (req, res) => {
  try {
    const { status, priority, assigned_to_agent, title, description, tags, category, customer_id } = req.body;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assigned_to_agent !== undefined) updates.assigned_to_agent = assigned_to_agent;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags) updates.tags = tags;
    if (category) updates.category = category;
    if (customer_id !== undefined) updates.customer_id = customer_id || null;

    // First response tracking
    if (status && ['assigned', 'in_progress'].includes(status)) {
      const { data: existing } = await supabase
        .from('crm_tickets').select('first_response_at').eq('id', req.params.id).single();
      if (existing && !existing.first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
    }

    if (status === 'resolved') updates.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('crm_tickets')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Append timeline
    const timelineNote = assigned_to_agent
      ? `Gán cho agent: ${assigned_to_agent}`
      : status ? `Chuyển trạng thái: ${status}` : 'Cập nhật thông tin';

    await supabase.rpc('append_ticket_timeline', {
      p_ticket_id: req.params.id,
      p_entry: {
        ts: new Date().toISOString(),
        action: assigned_to_agent ? 'assigned' : status ? `status_${status}` : 'updated',
        agent: 'board',
        note: timelineNote,
      },
    }).catch(() => {});

    // Spawn agent when assigned/reassigned
    if (assigned_to_agent) {
      spawnAgentForTicket(assigned_to_agent, data.id, data.ticket_number, data.title, data.description, data.priority).catch(() => {});
    }

    // War Room notification when agent assigned/changed
    if (assigned_to_agent) {
      const { data: ch } = await supabase.from('war_room_channels').select('id').eq('name', 'general').maybeSingle();
      if (ch) {
        const p = data.priority || 'medium';
        await supabase.from('war_room_messages').insert({
          channel_id: ch.id,
          sender_type: 'system', sender_id: 'crm', sender_name: 'CRM',
          message_type: 'alert',
          content: `[ASSIGN] ${data.ticket_number}: ${data.title}\n→ Agent: ${assigned_to_agent}${['urgent', 'critical'].includes(p) ? ' [P0]' : ''}`,
          priority: ['urgent', 'critical'].includes(p) ? 0 : 2,
        }).catch(() => {});
      }
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật phiếu' });
  }
});

// POST /tickets/:id/escalate
router.post('/:id/escalate', async (req, res) => {
  try {
    const { escalate_to, reason } = req.body;
    if (!escalate_to) return res.status(400).json({ error: 'Vui lòng chọn agent để chuyển' });

    const { data: ticket, error } = await supabase
      .from('crm_tickets')
      .update({ status: 'escalated', escalated_to_agent: escalate_to, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, customer:crm_customers(display_name)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Timeline
    await supabase.rpc('append_ticket_timeline', {
      p_ticket_id: req.params.id,
      p_entry: { ts: new Date().toISOString(), action: 'escalated', agent: 'board', note: `Chuyển tới ${escalate_to}: ${reason || ''}` },
    }).catch(() => {});

    // War Room P0 alert
    const { data: ch } = await supabase.from('war_room_channels').select('id').eq('name', 'general').maybeSingle();
    if (ch) {
      await supabase.from('war_room_messages').insert({
        channel_id: ch.id,
        sender_type: 'system', sender_id: 'crm', sender_name: 'CRM',
        message_type: 'alert',
        content: `[ESCALATION] ${(ticket.priority || 'medium').toUpperCase()}: ${ticket.ticket_number} — ${ticket.title}\nKhách: ${(ticket as any).customer?.display_name || 'N/A'}\n→ Chuyển tới: ${escalate_to}`,
        priority: 0,
      }).catch(() => {});
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi escalate phiếu' });
  }
});

// POST /tickets/:id/resolve
router.post('/:id/resolve', async (req, res) => {
  try {
    const { resolution_note } = req.body;

    const { data, error } = await supabase
      .from('crm_tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, customer:crm_customers(id, display_name)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await supabase.rpc('append_ticket_timeline', {
      p_ticket_id: req.params.id,
      p_entry: { ts: new Date().toISOString(), action: 'resolved', agent: 'board', note: resolution_note || 'Đã giải quyết' },
    }).catch(() => {});

    // Create interaction
    if ((data as any).customer?.id) {
      await supabase.from('crm_interactions').insert({
        customer_id: (data as any).customer.id,
        interaction_type: 'ticket_resolved',
        title: `Phiếu ${data.ticket_number} đã giải quyết`,
        content: resolution_note || '',
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi giải quyết phiếu' });
  }
});

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('crm_tickets')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa phiếu' });
  }
});

export default router;
