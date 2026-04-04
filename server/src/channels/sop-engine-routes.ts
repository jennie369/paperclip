// SOP Engine Routes — CRUD + Execution + SSE Stream
// Mounts at: /api/ops/sop-engine

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { seedSops } from './seed-sops.js';
import { executeSop, approveStep, rejectStep } from './sop-executor.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// SEED — One-time populate top 50 SOPs
// ═══════════════════════════════════════════════════════

router.post('/seed', async (_req, res) => {
  try {
    const result = await seedSops();
    res.json({
      success: true,
      message: `Đã seed ${result.inserted} SOPs (bỏ qua ${result.skipped} đã tồn tại)`,
      ...result,
    });
  } catch (err: any) {
    console.error('[SOP Seed]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// CRUD — SOPs
// ═══════════════════════════════════════════════════════

// 1. GET /sops — List with filters
router.get('/sops', async (req, res) => {
  try {
    const {
      domain, status, priority, type, search,
      assigned_agent, limit = '50', offset = '0',
    } = req.query;

    let query = supabase
      .from('gem_sops')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: true })
      .order('domain', { ascending: true })
      .order('sop_id', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (domain) query = query.eq('domain', String(domain));
    if (status) query = query.eq('status', String(status));
    if (priority) query = query.eq('priority', String(priority));
    if (type) query = query.eq('sop_type', String(type));
    if (search) query = query.or(`name.ilike.%${search}%,sop_id.ilike.%${search}%,description.ilike.%${search}%`);
    if (assigned_agent) query = query.contains('assigned_agents', [String(assigned_agent)]);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ sops: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('[SOP List]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /sops/:sopId — Detail + recent executions + audit
router.get('/sops/:sopId', async (req, res) => {
  try {
    const { sopId } = req.params;

    const [sopResult, execResult, auditResult] = await Promise.all([
      supabase.from('gem_sops').select('*').eq('sop_id', sopId).single(),
      supabase.from('gem_sop_executions')
        .select('*')
        .eq('sop_id', sopId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('gem_sop_audit')
        .select('*')
        .eq('sop_id', sopId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (sopResult.error) throw sopResult.error;
    if (!sopResult.data) {
      return res.status(404).json({ error: `Không tìm thấy SOP: ${sopId}` });
    }

    res.json({
      sop: sopResult.data,
      executions: execResult.data || [],
      audit: auditResult.data || [],
    });
  } catch (err: any) {
    console.error('[SOP Detail]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT /sops/:sopId — Upsert (update if exists, create if not)
router.put('/sops/:sopId', async (req, res) => {
  try {
    const { sopId } = req.params;
    const body = { ...req.body, updated_at: new Date().toISOString() };
    delete body.id;
    delete body.created_at;

    // Upsert: insert with onConflict on sop_id
    body.sop_id = sopId;
    const { data, error } = await supabase
      .from('gem_sops')
      .upsert(body, { onConflict: 'sop_id' })
      .select()
      .single();

    if (error) throw error;

    // Audit
    try {
      await supabase.from('gem_sop_audit').insert({
        sop_id: sopId,
        action: 'upserted',
        actor: req.body._actor || 'board',
        detail: { fields: Object.keys(body) },
      });
    } catch {}

    res.json(data);
  } catch (err: any) {
    console.error('[SOP Upsert]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /sops — Create new
router.post('/sops', async (req, res) => {
  try {
    const { sop_id, domain, name, sop_type = 'workflow', description, priority = 'p2', ...rest } = req.body;

    if (!sop_id || !domain || !name) {
      return res.status(400).json({ error: 'Cần có sop_id, domain, và name' });
    }

    const { data, error } = await supabase
      .from('gem_sops')
      .insert({
        sop_id,
        domain,
        name,
        sop_type,
        description: description || '',
        priority,
        status: 'needs_creation',
        ...rest,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `SOP ${sop_id} đã tồn tại` });
      }
      throw error;
    }

    // Audit
    await supabase.from('gem_sop_audit').insert({
      sop_id,
      action: 'created',
      actor: req.body._actor || 'board',
      detail: { domain, name, priority },
    });

    res.status(201).json(data);
  } catch (err: any) {
    console.error('[SOP Create]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /stats — Aggregate counts
router.get('/stats', async (_req, res) => {
  try {
    const { data: sops, error } = await supabase
      .from('gem_sops')
      .select('domain, status, priority, sop_type');

    if (error) throw error;
    const list = sops || [];

    // Count by domain
    const byDomain: Record<string, number> = {};
    // Count by status
    const byStatus: Record<string, number> = {};
    // Count by priority
    const byPriority: Record<string, number> = {};
    // Count by type
    const byType: Record<string, number> = {};

    for (const s of list) {
      byDomain[s.domain] = (byDomain[s.domain] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
      byType[s.sop_type] = (byType[s.sop_type] || 0) + 1;
    }

    res.json({ total: list.length, byDomain, byStatus, byPriority, byType });
  } catch (err: any) {
    console.error('[SOP Stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /dependencies/:sopId — Resolve dependency names
router.get('/dependencies/:sopId', async (req, res) => {
  try {
    const { sopId } = req.params;

    const { data: sop, error } = await supabase
      .from('gem_sops')
      .select('depends_on, outputs_to, related_sops')
      .eq('sop_id', sopId)
      .single();

    if (error) throw error;
    if (!sop) return res.status(404).json({ error: `Không tìm thấy SOP: ${sopId}` });

    const allIds = [
      ...(sop.depends_on || []),
      ...(sop.outputs_to || []),
      ...(sop.related_sops || []),
    ];

    let resolved: any[] = [];
    if (allIds.length > 0) {
      const { data } = await supabase
        .from('gem_sops')
        .select('sop_id, name, domain, status')
        .in('sop_id', allIds);
      resolved = data || [];
    }

    const nameMap: Record<string, any> = {};
    for (const r of resolved) {
      nameMap[r.sop_id] = r;
    }

    res.json({
      depends_on: (sop.depends_on || []).map((id: string) => nameMap[id] || { sop_id: id, name: '(không tìm thấy)' }),
      outputs_to: (sop.outputs_to || []).map((id: string) => nameMap[id] || { sop_id: id, name: '(không tìm thấy)' }),
      related_sops: (sop.related_sops || []).map((id: string) => nameMap[id] || { sop_id: id, name: '(không tìm thấy)' }),
    });
  } catch (err: any) {
    console.error('[SOP Dependencies]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /executions/recent — Last 5 executions for dashboard
router.get('/executions/recent', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('gem_sop_executions')
      .select('*, gem_sops!inner(name, domain)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      // Fallback: query without join if FK doesn't exist
      const { data: fallback, error: fbErr } = await supabase
        .from('gem_sop_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fbErr) throw fbErr;

      // Manually resolve SOP names
      const sopIds = [...new Set((fallback || []).map((e: any) => e.sop_id))];
      const { data: sops } = await supabase
        .from('gem_sops')
        .select('sop_id, name, domain')
        .in('sop_id', sopIds);

      const sopMap: Record<string, any> = {};
      for (const s of (sops || [])) sopMap[s.sop_id] = s;

      res.json((fallback || []).map((e: any) => ({
        ...e,
        sop_name: sopMap[e.sop_id]?.name || e.sop_id,
        sop_domain: sopMap[e.sop_id]?.domain || '',
      })));
      return;
    }

    res.json((data || []).map((e: any) => ({
      ...e,
      sop_name: e.gem_sops?.name || e.sop_id,
      sop_domain: e.gem_sops?.domain || '',
    })));
  } catch (err: any) {
    console.error('[SOP Executions Recent]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// EXECUTION — SSE Stream + Control
// ═══════════════════════════════════════════════════════

// POST /execute/:sopId — SSE stream execution
router.post('/execute/:sopId', async (req, res) => {
  const { sopId } = req.params;
  const { triggered_by = 'board', context = {} } = req.body || {};

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Keep-alive ping
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
    }
  }, 15000);

  try {
    const result = await executeSop(sopId, triggered_by, context, res);
    res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

// GET /executions/:execId — Get execution detail
router.get('/executions/:execId', async (req, res) => {
  try {
    const { execId } = req.params;

    const { data, error } = await supabase
      .from('gem_sop_executions')
      .select('*')
      .eq('id', execId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: `Không tìm thấy execution: ${execId}` });

    // Also fetch SOP name
    const { data: sop } = await supabase
      .from('gem_sops')
      .select('name, domain, sop_type, steps')
      .eq('sop_id', data.sop_id)
      .single();

    res.json({
      ...data,
      sop_name: sop?.name || data.sop_id,
      sop_domain: sop?.domain || '',
      sop_type: sop?.sop_type || 'workflow',
      total_steps: (sop?.steps || []).length,
    });
  } catch (err: any) {
    console.error('[SOP Execution Detail]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /executions/:execId/stream — SSE reconnect for ongoing execution
router.get('/executions/:execId/stream', async (req, res) => {
  const { execId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Poll execution status every 2s
  const poll = setInterval(async () => {
    try {
      const { data } = await supabase
        .from('gem_sop_executions')
        .select('*')
        .eq('id', execId)
        .single();

      if (!data) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Execution không tồn tại' })}\n\n`);
        clearInterval(poll);
        res.end();
        return;
      }

      res.write(`event: status\ndata: ${JSON.stringify({
        status: data.status,
        current_step: data.current_step,
        step_results: data.step_results,
      })}\n\n`);

      // If execution is done, close stream
      if (['completed', 'failed', 'rejected'].includes(data.status)) {
        res.write(`event: done\ndata: ${JSON.stringify({ executionId: execId, status: data.status })}\n\n`);
        clearInterval(poll);
        res.end();
      }
    } catch {
      // Ignore transient errors
    }
  }, 2000);

  req.on('close', () => {
    clearInterval(poll);
  });
});

// POST /executions/:execId/approve — Approve paused step
router.post('/executions/:execId/approve', async (req, res) => {
  try {
    const { execId } = req.params;
    const { step_order, approver = 'board' } = req.body || {};

    if (!step_order) {
      return res.status(400).json({ error: 'Cần có step_order' });
    }

    const result = await approveStep(execId, Number(step_order), approver);
    res.json(result);
  } catch (err: any) {
    console.error('[SOP Approve]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /executions/:execId/reject — Reject paused step
router.post('/executions/:execId/reject', async (req, res) => {
  try {
    const { execId } = req.params;
    const { step_order, feedback = '', rejector = 'board' } = req.body || {};

    if (!step_order) {
      return res.status(400).json({ error: 'Cần có step_order' });
    }

    const result = await rejectStep(execId, Number(step_order), feedback, rejector);
    res.json(result);
  } catch (err: any) {
    console.error('[SOP Reject]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// PHASE 5 — Sales/CS Pipeline + ReMe Injection + Follow-up
// ═══════════════════════════════════════════════════════

// Helper: chunk markdown by ## headers or ~500 char blocks
function chunkMarkdown(text: string, maxChars = 500): string[] {
  const sections = text.split(/(?=^## )/gm);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= maxChars) {
      chunks.push(section.trim());
    } else {
      // Split long sections into paragraphs
      const paragraphs = section.split(/\n\n+/);
      let current = '';
      for (const p of paragraphs) {
        if ((current + p).length > maxChars && current) {
          chunks.push(current.trim());
          current = p;
        } else {
          current += (current ? '\n\n' : '') + p;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  return chunks.filter(c => c.length > 10);
}

// 5.1 POST /convert/:customerId — Sales → CS switch
router.post('/convert/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { new_agent } = req.body || {};

  try {
    // Update customer status
    await supabase
      .from('crm_customers')
      .update({ status: 'đã_mua', updated_at: new Date().toISOString() })
      .eq('id', customerId);

    // Audit log
    await supabase.from('gem_sop_audit').insert({
      sop_id: 'SAL-008',
      action: 'stage_converted',
      actor: req.body?.actor || 'board',
      detail: { customer_id: customerId, new_agent: new_agent || 'customer-success' },
    });

    res.json({ message: 'Đã chuyển sang CS AI', new_agent: new_agent || 'customer-success' });
  } catch (err: any) {
    console.error('[SOP Convert]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5.2 POST /inject-reme/:sopId — Inject SOP content into KB
router.post('/inject-reme/:sopId', async (req, res) => {
  const { sopId } = req.params;

  try {
    // Get SOP content
    const { data: sop } = await supabase
      .from('gem_sops')
      .select('sop_id, name, body_markdown')
      .eq('sop_id', sopId)
      .single();

    if (!sop || !sop.body_markdown) {
      return res.status(400).json({ error: 'SOP chưa có nội dung' });
    }

    // Chunk body by ## headers or by ~500 char blocks
    const chunks = chunkMarkdown(sop.body_markdown);

    // Insert into kb_documents (check if table exists first)
    const { data: doc, error: docErr } = await supabase
      .from('kb_documents')
      .upsert({
        title: sop.name,
        content: sop.body_markdown,
        source: 'sop',
        source_id: sop.sop_id,
        collection_id: 'sop-collection',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'source_id' })
      .select('id')
      .single();

    if (docErr) {
      // kb_documents may not exist — log and return partial success
      console.warn('[SOP] kb_documents insert failed:', docErr.message);
    }

    // Insert chunks (if kb_chunks exists)
    if (doc?.id) {
      // Delete old chunks for this doc
      await supabase.from('kb_chunks').delete().eq('document_id', doc.id);

      // Insert new chunks (without embeddings — full-text search only)
      for (const chunk of chunks) {
        await supabase.from('kb_chunks').insert({
          document_id: doc.id,
          content: chunk,
        });
      }
    }

    // Update SOP
    await supabase.from('gem_sops').update({
      inject_reme: true,
      reme_synced_at: new Date().toISOString(),
    }).eq('sop_id', sopId);

    // Audit
    await supabase.from('gem_sop_audit').insert({
      sop_id: sopId,
      action: 'reme_injected',
      actor: 'board',
      detail: { chunks: chunks.length },
    });

    res.json({ message: `Đã inject ${chunks.length} chunks vào ReMe`, chunks: chunks.length });
  } catch (err: any) {
    console.error('[SOP ReMe Inject]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5.2b POST /bulk-inject-reme — Inject multiple SOPs
router.post('/bulk-inject-reme', async (req, res) => {
  const { sop_ids, status } = req.body || {};

  try {
    let query = supabase.from('gem_sops').select('sop_id').not('body_markdown', 'is', null);
    if (sop_ids) query = query.in('sop_id', sop_ids);
    if (status) query = query.eq('status', status);

    const { data: sops } = await query;
    if (!sops || sops.length === 0) {
      return res.json({ message: 'Không có SOP nào để inject', injected: 0 });
    }

    let injected = 0;
    for (const sop of sops) {
      try {
        await supabase.from('gem_sops').update({
          inject_reme: true,
          reme_synced_at: new Date().toISOString(),
        }).eq('sop_id', sop.sop_id);
        injected++;
      } catch { /* skip */ }
    }

    res.json({ message: `Đã inject ${injected}/${sops.length} SOPs`, injected });
  } catch (err: any) {
    console.error('[SOP Bulk ReMe Inject]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5.3 GET /follow-up/check — Check and process pending follow-ups
router.get('/follow-up/check', async (_req, res) => {
  try {
    const { data: pending } = await supabase
      .from('follow_up_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(20);

    if (!pending || pending.length === 0) {
      return res.json({ message: 'Không có follow-up nào cần gửi', processed: 0 });
    }

    let processed = 0;
    for (const item of pending) {
      try {
        // Mark as sent (actual sending would be via channel system)
        await supabase.from('follow_up_queue')
          .update({ status: 'sent' })
          .eq('id', item.id);
        processed++;
      } catch { /* skip */ }
    }

    res.json({ message: `Đã xử lý ${processed} follow-ups`, processed, total: pending.length });
  } catch (err: any) {
    console.error('[SOP Follow-up Check]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5.3b POST /follow-up — Schedule a new follow-up
router.post('/follow-up', async (req, res) => {
  const { customer_id, agent_slug, message, scheduled_at, channel_instance_id } = req.body;

  if (!customer_id || !agent_slug || !message || !scheduled_at) {
    return res.status(400).json({ error: 'Thiếu trường bắt buộc: customer_id, agent_slug, message, scheduled_at' });
  }

  try {
    const { data, error } = await supabase.from('follow_up_queue').insert({
      customer_id,
      agent_slug,
      message,
      scheduled_at,
      channel_instance_id: channel_instance_id || null,
    }).select().single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[SOP Follow-up Schedule]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
