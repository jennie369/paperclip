// SOP Engine Routes — CRUD + Execution + SSE Stream
// Mounts at: /api/ops/sop-engine

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { seedSops } from './seed-sops.js';
import { executeSop, approveStep, rejectStep } from './sop-executor.js';
import { seedPipelineTemplates, PIPELINE_TEMPLATES } from './seed-pipelines.js';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════
// Auto-migration: add extra columns to gem_sops at startup
// ═══════════════════════════════════════════════════════
export async function runSopMigrations(): Promise<void> {
  const alterStatements = [
    `ALTER TABLE gem_sops ADD COLUMN IF NOT EXISTS cron TEXT`,
    `ALTER TABLE gem_sops ADD COLUMN IF NOT EXISTS data_schema JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE gem_sops ADD COLUMN IF NOT EXISTS scripts JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE gem_sops ADD COLUMN IF NOT EXISTS file_path TEXT`,
    `ALTER TABLE gem_sops ADD COLUMN IF NOT EXISTS trigger_events JSONB DEFAULT '[]'::jsonb`,
  ];
  
  for (const sql of alterStatements) {
    try {
      // supabase-js doesn't expose raw DDL — use RPC if available, else skip
      const { error } = await (supabase as any).rpc('exec_ddl', { ddl: sql });
      if (error && !error.message?.includes('already exists')) {
        console.warn('[SOP Migration] Warning:', sql.slice(30), '->', error.message);
      }
    } catch {
      // If exec_ddl RPC doesn't exist, migration must be done manually
      // This is a no-op — columns already exist or need manual migration
    }
  }
  console.log('[SOP Migration] Startup migration check complete');
}

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

// PATCH /sops/:sopId — Partial update of an SOP.
// Frontend uses this for inline edits (name, description, status, priority,
// steps JSONB, cron, body_markdown, assign_agents, ...). Differs from PUT in
// that only provided keys are updated; missing keys stay untouched.
router.patch('/sops/:sopId', async (req, res) => {
  try {
    const { sopId } = req.params;
    const patch = req.body || {};

    // Whitelist editable columns so clients can't write primary keys or
    // server-managed fields.
    const EDITABLE = new Set([
      'name',
      'description',
      'domain',
      'status',
      'priority',
      'sop_type',
      'steps',
      'cron',
      'body_markdown',
      'assigned_agents',
      'depends_on',
      'outputs_to',
      'related_sops',
      'knowledge_files',
      'content_type_key',
      'output_format',
      'trigger_config',
      'inject_reme',
    ]);
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (EDITABLE.has(key)) update[key] = value;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Không có field nào hợp lệ để update' });
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('gem_sops')
      .update(update)
      .eq('sop_id', sopId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: `Không tìm thấy SOP: ${sopId}` });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /execute/batch — Run multiple SOPs in sequence via SSE stream.
// Body: { sop_ids: string[], triggered_by?: string, context?: any, fail_fast?: boolean }
// Streams events for each SOP: { event: 'batch:sop_start' | 'batch:sop_complete' | 'batch:sop_failed' }
// Also forwards the per-step events from the inner executeSop() call.
router.post('/execute/batch', async (req, res) => {
  const { sop_ids = [], triggered_by = 'board', context = {}, fail_fast = false } = req.body || {};

  if (!Array.isArray(sop_ids) || sop_ids.length === 0) {
    return res.status(400).json({ error: 'sop_ids phải là array không rỗng' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  const results: Array<{ sopId: string; executionId?: string; status: string; error?: string }> = [];

  try {
    res.write(`event: batch:start\ndata: ${JSON.stringify({ total: sop_ids.length, sop_ids })}\n\n`);

    for (let i = 0; i < sop_ids.length; i++) {
      const sopId = sop_ids[i];
      res.write(`event: batch:sop_start\ndata: ${JSON.stringify({ index: i, sopId })}\n\n`);

      try {
        const result = await executeSop(sopId, triggered_by, { ...context, batch_index: i, batch_size: sop_ids.length }, res);
        results.push({ sopId, executionId: result.executionId, status: result.status });
        res.write(`event: batch:sop_complete\ndata: ${JSON.stringify({ index: i, sopId, result })}\n\n`);
        if (result.status === 'failed' && fail_fast) {
          res.write(`event: batch:halted\ndata: ${JSON.stringify({ reason: 'fail_fast', at: i })}\n\n`);
          break;
        }
      } catch (err: any) {
        results.push({ sopId, status: 'failed', error: err.message });
        res.write(`event: batch:sop_failed\ndata: ${JSON.stringify({ index: i, sopId, error: err.message })}\n\n`);
        if (fail_fast) {
          res.write(`event: batch:halted\ndata: ${JSON.stringify({ reason: 'fail_fast', at: i })}\n\n`);
          break;
        }
      }
    }

    res.write(`event: batch:done\ndata: ${JSON.stringify({ total: sop_ids.length, completed: results.length, results })}\n\n`);
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

// ═══════════════════════════════════════════════════════
// Pipelines — /api/ops/sop-engine/pipelines/*
// ═══════════════════════════════════════════════════════

// POST /pipelines/seed — bulk insert the 8 template pipelines (idempotent)
router.post('/pipelines/seed', async (_req, res) => {
  try {
    const result = await seedPipelineTemplates();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pipelines/templates — list of available templates (from code constant,
// not DB — useful for Add Pipeline dropdown even before DB seed ran)
router.get('/pipelines/templates', (_req, res) => {
  res.json(
    PIPELINE_TEMPLATES.map((t) => ({
      pipeline_id: t.pipeline_id,
      title: t.title,
      emoji: t.emoji,
      category: t.category,
      description: t.description,
      block_count: t.blocks.length,
    })),
  );
});

// GET /pipelines — list pipelines (filter by ?is_template=true|false, ?category=...)
router.get('/pipelines', async (req, res) => {
  try {
    let query = supabase
      .from('gem_pipelines')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (req.query.is_template !== undefined) {
      query = query.eq('is_template', req.query.is_template === 'true');
    }
    if (req.query.category) {
      query = query.eq('category', req.query.category as string);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pipelines/:id — single pipeline detail
router.get('/pipelines/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gem_pipelines')
      .select('*')
      .eq('pipeline_id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: `Pipeline ${req.params.id} không tồn tại` });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /pipelines — create new pipeline
// Body: { templateId?: string, title?, category?, blocks?: [] }
//   - If `templateId` is provided, clone that template (blocks + metadata) into
//     a new user pipeline with a fresh ID.
//   - Otherwise create a blank user pipeline.
router.post('/pipelines', async (req, res) => {
  try {
    const { templateId, title, category, description, blocks, emoji } = req.body || {};
    let row: any;

    if (templateId) {
      // Clone from template (in-memory const — doesn't require DB seed)
      const tpl = PIPELINE_TEMPLATES.find((t) => t.pipeline_id === templateId);
      if (!tpl) return res.status(404).json({ error: `Template ${templateId} không tồn tại` });
      row = {
        pipeline_id: `pipe-${Date.now()}-${randomUUID().slice(0, 8)}`,
        title: title || `${tpl.title} (bản sao)`,
        emoji: emoji || tpl.emoji,
        category: category || tpl.category,
        schedule: tpl.schedule,
        description: description || tpl.description,
        blocks: JSON.parse(JSON.stringify(tpl.blocks)),
        is_template: false,
        parent_template_id: tpl.pipeline_id,
        display_order: 999,
        enabled: true,
        created_by: 'user_ui',
      };
    } else {
      row = {
        pipeline_id: `pipe-${Date.now()}-${randomUUID().slice(0, 8)}`,
        title: title || 'Pipeline mới',
        emoji: emoji || '🔗',
        category: category || 'Custom',
        description: description || '',
        blocks: blocks || [],
        is_template: false,
        display_order: 999,
        enabled: true,
        created_by: 'user_ui',
      };
    }

    const { data, error } = await supabase
      .from('gem_pipelines')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /pipelines/:id — update fields (title, description, schedule, blocks)
router.patch('/pipelines/:id', async (req, res) => {
  try {
    const EDITABLE = new Set([
      'title', 'emoji', 'category', 'schedule', 'description',
      'blocks', 'enabled', 'display_order',
    ]);
    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (EDITABLE.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Không có field hợp lệ để update' });
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('gem_pipelines')
      .update(patch)
      .eq('pipeline_id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: `Pipeline ${req.params.id} không tồn tại` });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /pipelines/reorder — bulk update display_order for drag-drop.
// Body: { orderedIds: string[] } — display_order assigned by array index.
router.patch('/pipelines/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds phải là array' });
    }
    // Supabase doesn't support batch update with different values in one call,
    // so we loop. Fast enough for 10-20 pipelines.
    const updates = orderedIds.map((id, idx) =>
      supabase
        .from('gem_pipelines')
        .update({ display_order: idx, updated_at: new Date().toISOString() })
        .eq('pipeline_id', id),
    );
    await Promise.all(updates);
    res.json({ ok: true, reordered: orderedIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /pipelines/:id — delete a user pipeline (templates cannot be deleted)
router.delete('/pipelines/:id', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('gem_pipelines')
      .select('is_template')
      .eq('pipeline_id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Pipeline không tồn tại' });
    if (existing.is_template) {
      return res.status(403).json({ error: 'Không thể xóa template pipeline. Dùng /reset để reset về mặc định.' });
    }

    await supabase.from('gem_pipelines').delete().eq('pipeline_id', req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /pipelines/:id/execute — run pipeline blocks sequentially via SSE
router.post('/pipelines/:id/execute', async (req, res) => {
  const { id } = req.params;
  const { triggered_by = 'board', context = {} } = req.body || {};

  // Load pipeline
  const { data: pipeline, error: pErr } = await supabase
    .from('gem_pipelines')
    .select('*')
    .eq('pipeline_id', id)
    .maybeSingle();
  if (pErr || !pipeline) {
    return res.status(404).json({ error: `Pipeline ${id} không tồn tại` });
  }

  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  try {
    res.write(
      `event: pipeline:start\ndata: ${JSON.stringify({
        pipeline_id: id,
        title: pipeline.title,
        block_count: (pipeline.blocks || []).length,
      })}\n\n`,
    );

    const blocks = (pipeline.blocks || []) as any[];
    const results: any[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      res.write(
        `event: pipeline:block_start\ndata: ${JSON.stringify({
          index: i,
          block,
        })}\n\n`,
      );

      try {
        if (block.type === 'sop') {
          // Run the referenced SOP via executeSop()
          const result = await executeSop(block.ref, triggered_by, { ...context, pipeline_id: id, block_index: i }, res);
          results.push({ index: i, block, result });
          res.write(
            `event: pipeline:block_complete\ndata: ${JSON.stringify({ index: i, result })}\n\n`,
          );
          if (result.status === 'failed') {
            res.write(`event: pipeline:halted\ndata: ${JSON.stringify({ at: i, reason: 'sop_failed' })}\n\n`);
            break;
          }
        } else if (block.type === 'approval' || block.type === 'action') {
          // Approval/action blocks log a pending event and continue
          res.write(
            `event: pipeline:block_pending\ndata: ${JSON.stringify({ index: i, block, requires: block.type })}\n\n`,
          );
          results.push({ index: i, block, result: { status: 'pending', reason: block.type } });
        }
      } catch (err: any) {
        res.write(
          `event: pipeline:block_failed\ndata: ${JSON.stringify({ index: i, error: err.message })}\n\n`,
        );
        results.push({ index: i, block, error: err.message });
        break;
      }
    }

    await supabase
      .from('gem_pipelines')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: results.every((r) => r.result?.status === 'success' || r.result?.status === 'pending') ? 'success' : 'partial',
        run_count: (pipeline.run_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('pipeline_id', id);

    res.write(`event: pipeline:done\ndata: ${JSON.stringify({ total: blocks.length, completed: results.length, results })}\n\n`);
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

// ═══════════════════════════════════════════════════════
// Batch Generator — /api/ops/sop-engine/batch-jobs/*
// Wraps cc_generation_jobs queue table for Paperclip UI Batch Generator tab.
// ═══════════════════════════════════════════════════════

// GET /batch-jobs — list with filters
router.get('/batch-jobs', async (req, res) => {
  try {
    let query = supabase
      .from('cc_generation_jobs')
      .select('id, job_type, status, priority, content_type, track, pillar, persona, model_used, retry_count, max_retries, progress, error_message, input_params, generation_time_ms, entity_id, entity_type, started_at, completed_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (req.query.status) query = query.eq('status', req.query.status as string);
    if (req.query.job_type) query = query.eq('job_type', req.query.job_type as string);
    if (req.query.track) query = query.eq('track', req.query.track as string);
    if (req.query.pillar) query = query.eq('pillar', req.query.pillar as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batch-jobs/stats — counts by status
router.get('/batch-jobs/stats', async (_req, res) => {
  try {
    const statuses = ['pending', 'claimed', 'processing', 'completed', 'failed'];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase
          .from('cc_generation_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', s),
      ),
    );
    const stats: Record<string, number> = {};
    statuses.forEach((s, i) => {
      stats[s] = results[i].count || 0;
    });
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batch-jobs/:id — single job detail
router.get('/batch-jobs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cc_generation_jobs')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Job không tồn tại' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /batch-jobs/:id/retry — mark failed job as pending to re-process
router.post('/batch-jobs/:id/retry', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cc_generation_jobs')
      .update({
        status: 'pending',
        error_message: null,
        error_code: null,
        retry_count: 0,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, job: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /batch-jobs/trigger — spawn batch_processor.py to run the queue once.
// Uses spawnHidden so no orphan cmd.exe windows appear (BUG-027 prevention).
// Streams SSE output back to client.
router.post('/batch-jobs/trigger', async (req, res) => {
  const mode = req.body?.mode || 'one-shot'; // 'batch' | 'one-shot'
  const batchProcessorPath =
    process.env.BATCH_PROCESSOR_PATH ||
    'D:/Claude Projects/App Content Jennie/gem-content-center/scripts/batch_processor.py';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15000);

  try {
    res.write(`event: batch:start\ndata: ${JSON.stringify({ mode, script: batchProcessorPath })}\n\n`);

    const { spawnHidden } = await import('../spawn-hidden.js');
    const args = mode === 'batch' ? ['batch'] : ['--one-shot'];
    const proc = spawnHidden('python', [batchProcessorPath, ...args], {
      env: { ...process.env, PYTHONUTF8: '1' },
    });

    const timeout = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* noop */ }
      res.write(`event: batch:timeout\ndata: ${JSON.stringify({ after_ms: 600000 })}\n\n`);
    }, 600000);

    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      res.write(`event: batch:stdout\ndata: ${JSON.stringify({ text })}\n\n`);
    });
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      res.write(`event: batch:stderr\ndata: ${JSON.stringify({ text })}\n\n`);
    });
    proc.on('close', (code) => {
      clearTimeout(timeout);
      res.write(`event: batch:done\ndata: ${JSON.stringify({ exit_code: code })}\n\n`);
      clearInterval(keepAlive);
      res.end();
    });
    proc.on('error', (err) => {
      clearTimeout(timeout);
      res.write(`event: batch:error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      clearInterval(keepAlive);
      res.end();
    });
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
});

// ═══════════════════════════════════════════════════════
// Knowledge Library — browse memory/ + content-center knowledge/ files
// Used by Knowledge Library tab in SOP Engine.
// ═══════════════════════════════════════════════════════

// Hardcoded safe roots — no arbitrary filesystem access.
const KNOWLEDGE_ROOTS: Array<{ id: string; label: string; path: string; category: string }> = [
  {
    id: 'memory-root',
    label: 'Project Memory',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory',
    category: 'memory',
  },
  {
    id: 'memory-sops',
    label: 'SOPs Library (148 files)',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory/sops',
    category: 'sops',
  },
  {
    id: 'memory-agents',
    label: 'Agent Memory',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory/agents',
    category: 'agents',
  },
  {
    id: 'memory-reports',
    label: 'Reports & Analysis',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory/reports',
    category: 'reports',
  },
  {
    id: 'memory-patterns',
    label: 'Patterns',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/memory/patterns.md',
    category: 'patterns',
  },
  {
    id: 'cc-knowledge',
    label: 'Content Center Knowledge',
    path: 'D:/Claude Projects/App Content Jennie/gem-content-center/knowledge',
    category: 'content',
  },
  {
    id: 'skills-store',
    label: 'Skills Store',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/skills-store',
    category: 'skills',
  },
  {
    id: 'agents-folder',
    label: 'Agent Definitions',
    path: 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/agents',
    category: 'agents',
  },
];

const MAX_FILE_SIZE_BYTES = 1_000_000; // 1 MB
const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.py', '.ts', '.js', '.sql', '.html']);

// GET /knowledge/roots — list available roots for the file tree
router.get('/knowledge/roots', async (_req, res) => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const out = await Promise.all(
    KNOWLEDGE_ROOTS.map(async (root) => {
      let exists = false;
      let fileCount = 0;
      let totalSize = 0;
      try {
        if (fs.existsSync(root.path)) {
          exists = true;
          const stat = fs.statSync(root.path);
          if (stat.isDirectory()) {
            const files = fs.readdirSync(root.path, { recursive: true }) as string[];
            fileCount = files.filter((f) => {
              const ext = path.extname(typeof f === 'string' ? f : '').toLowerCase();
              return ALLOWED_EXTENSIONS.has(ext);
            }).length;
          } else {
            fileCount = 1;
            totalSize = stat.size;
          }
        }
      } catch {
        /* skip */
      }
      return { ...root, exists, fileCount, totalSize };
    }),
  );
  res.json(out);
});

// GET /knowledge/list?rootId=... — list files in a specific root (non-recursive depth by default)
router.get('/knowledge/list', async (req, res) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const rootId = (req.query.rootId as string) || '';
    const subPath = (req.query.path as string) || '';

    const root = KNOWLEDGE_ROOTS.find((r) => r.id === rootId);
    if (!root) return res.status(404).json({ error: `rootId ${rootId} không tồn tại` });

    // Resolve subPath safely — reject anything with ..
    const safeSubPath = subPath.replace(/\.\./g, '');
    const target = path.join(root.path, safeSubPath);

    // Check it's still within root
    if (!path.resolve(target).startsWith(path.resolve(root.path))) {
      return res.status(403).json({ error: 'Path escapes root' });
    }

    if (!fs.existsSync(target)) {
      return res.json({ entries: [], current_path: subPath });
    }

    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      // Single file — return as 1-item list
      return res.json({
        entries: [
          {
            name: path.basename(target),
            relative_path: subPath || path.basename(target),
            type: 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
          },
        ],
        current_path: subPath,
        is_file: true,
      });
    }

    const entries = fs
      .readdirSync(target, { withFileTypes: true })
      .filter((d) => !d.name.startsWith('.') && !d.name.startsWith('_'))
      .map((d) => {
        const full = path.join(target, d.name);
        const rel = path.join(safeSubPath, d.name).replace(/\\/g, '/');
        try {
          const s = fs.statSync(full);
          return {
            name: d.name,
            relative_path: rel,
            type: d.isDirectory() ? 'dir' : 'file',
            size: s.size,
            modified: s.mtime.toISOString(),
            extension: d.isDirectory() ? null : path.extname(d.name).toLowerCase(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // dirs first, then alphabetical
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    res.json({ entries, current_path: safeSubPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /knowledge/file?rootId=...&path=... — read file content for preview
router.get('/knowledge/file', async (req, res) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const rootId = (req.query.rootId as string) || '';
    const filePath = (req.query.path as string) || '';

    const root = KNOWLEDGE_ROOTS.find((r) => r.id === rootId);
    if (!root) return res.status(404).json({ error: 'root không tồn tại' });

    const safePath = filePath.replace(/\.\./g, '');
    const target = path.join(root.path, safePath);

    if (!path.resolve(target).startsWith(path.resolve(root.path))) {
      return res.status(403).json({ error: 'Path escapes root' });
    }

    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Target là directory, không phải file' });
    }
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({
        error: `File quá lớn (${Math.round(stat.size / 1024)} KB > ${MAX_FILE_SIZE_BYTES / 1024} KB limit)`,
      });
    }

    const ext = path.extname(target).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(415).json({ error: `Extension ${ext} không được phép` });
    }

    const content = fs.readFileSync(target, 'utf-8');
    res.json({
      name: path.basename(target),
      full_path: target,
      relative_path: safePath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      extension: ext,
      content,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /knowledge/search?q=... — full-text search across all roots (basic grep)
router.get('/knowledge/search', async (req, res) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const q = (req.query.q as string) || '';
    if (!q || q.length < 2) return res.json({ matches: [] });

    const needle = q.toLowerCase();
    const matches: any[] = [];
    const MAX_MATCHES = 300;

    for (const root of KNOWLEDGE_ROOTS) {
      if (!fs.existsSync(root.path)) continue;
      const stat = fs.statSync(root.path);
      if (!stat.isDirectory()) continue;

      try {
        const walker = (dir: string, depth: number) => {
          if (matches.length >= MAX_MATCHES || depth > 4) return;
          let entries: any[] = [];
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const e of entries) {
            if (matches.length >= MAX_MATCHES) return;
            if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
              walker(full, depth + 1);
            } else {
              const ext = path.extname(e.name).toLowerCase();
              if (!ALLOWED_EXTENSIONS.has(ext)) continue;
              // Match on filename
              if (e.name.toLowerCase().includes(needle)) {
                const rel = path.relative(root.path, full).replace(/\\/g, '/');
                matches.push({
                  rootId: root.id,
                  rootLabel: root.label,
                  name: e.name,
                  relative_path: rel,
                  full_path: full,
                  extension: ext,
                  match_type: 'filename',
                });
              }
            }
          }
        };
        walker(root.path, 0);
      } catch {
        /* skip */
      }
    }

    res.json({ matches: matches.slice(0, MAX_MATCHES) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// Graph data for Mind Map tab — returns pipelines + SOPs + agents as
// KGEntity / KGRelation shape so it can be rendered by the existing
// ForceGraph3D component used by Mắt Thần CEO knowledge graph page.
// ═══════════════════════════════════════════════════════

// GET /graph — aggregated pipeline/sop/agent graph for Mind Map tab
router.get('/graph', async (_req, res) => {
  try {
    const [pipelines, sops, agents] = await Promise.all([
      supabase.from('gem_pipelines').select('pipeline_id, title, emoji, category, blocks, is_template, last_run_status'),
      supabase.from('gem_sops').select('sop_id, name, domain, status, priority, assigned_agents, depends_on'),
      supabase.from('paperclip_agents').select('slug, display_name, provider, model, enabled'),
    ]);

    const entities: any[] = [];
    const relations: any[] = [];
    const now = new Date().toISOString();

    // Pipelines → big entities
    for (const p of pipelines.data || []) {
      entities.push({
        id: `pipeline:${p.pipeline_id}`,
        external_id: p.pipeline_id,
        entity_type: 'concept',
        name: `${p.emoji || '🔗'} ${p.title}`,
        description: `Pipeline · ${p.category || 'Custom'} · ${(p.blocks || []).length} bước`,
        metadata: {
          kind: 'pipeline',
          pipeline_id: p.pipeline_id,
          category: p.category,
          is_template: p.is_template,
          last_run_status: p.last_run_status,
          block_count: (p.blocks || []).length,
        },
        confidence: 1.0,
        source: 'gem_pipelines',
        source_ref: p.pipeline_id,
        created_at: now,
        updated_at: now,
      });
    }

    // SOPs → regular entities
    for (const s of sops.data || []) {
      entities.push({
        id: `sop:${s.sop_id}`,
        external_id: s.sop_id,
        entity_type: 'sop',
        name: `${s.sop_id} · ${s.name}`,
        description: `SOP · ${s.domain} · ${s.status} · ${s.priority}`,
        metadata: {
          kind: 'sop',
          sop_id: s.sop_id,
          domain: s.domain,
          status: s.status,
          priority: s.priority,
        },
        confidence: 1.0,
        source: 'gem_sops',
        source_ref: s.sop_id,
        created_at: now,
        updated_at: now,
      });

      // SOP → SOP dependency edges
      for (const dep of (s.depends_on || []) as string[]) {
        relations.push({
          id: `dep:${s.sop_id}:${dep}`,
          source_entity_id: `sop:${dep}`,
          target_entity_id: `sop:${s.sop_id}`,
          relation_type: 'depends_on',
          confidence: 1.0,
          metadata: {},
          source: 'gem_sops.depends_on',
          created_at: now,
        });
      }

      // SOP → Agent edges (assigned_agents)
      for (const agentSlug of (s.assigned_agents || []) as string[]) {
        relations.push({
          id: `assign:${s.sop_id}:${agentSlug}`,
          source_entity_id: `agent:${agentSlug}`,
          target_entity_id: `sop:${s.sop_id}`,
          relation_type: 'assigned_to',
          confidence: 1.0,
          metadata: {},
          source: 'gem_sops.assign_agents',
          created_at: now,
        });
      }
    }

    // Agents → regular entities
    for (const a of agents.data || []) {
      entities.push({
        id: `agent:${a.slug}`,
        external_id: a.slug,
        entity_type: 'agent',
        name: `🤖 ${a.display_name || a.slug}`,
        description: `Agent · ${a.provider}/${a.model}${a.enabled ? '' : ' · disabled'}`,
        metadata: {
          kind: 'agent',
          slug: a.slug,
          provider: a.provider,
          model: a.model,
          enabled: a.enabled,
        },
        confidence: 1.0,
        source: 'paperclip_agents',
        source_ref: a.slug,
        created_at: now,
        updated_at: now,
      });
    }

    // Pipeline → SOP block edges
    for (const p of pipelines.data || []) {
      const blocks = (p.blocks || []) as any[];
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'sop' && block.ref) {
          relations.push({
            id: `contains:${p.pipeline_id}:${i}:${block.ref}`,
            source_entity_id: `pipeline:${p.pipeline_id}`,
            target_entity_id: `sop:${block.ref}`,
            relation_type: 'part_of',
            confidence: 1.0,
            metadata: { block_index: i, executor: block.executor, trigger: block.trigger },
            source: 'gem_pipelines.blocks',
            created_at: now,
          });
        }
      }
    }

    res.json({
      entities,
      relations,
      stats: {
        pipelines: (pipelines.data || []).length,
        sops: (sops.data || []).length,
        agents: (agents.data || []).length,
        total_entities: entities.length,
        total_relations: relations.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
