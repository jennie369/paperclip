// Cron Registry REST API
// Mounts at /api/registry/crons
//
// All agents + schedulers register here. User controls enable/disable/execute
// from Paperclip UI (SOP Engine → Cron & Heartbeats tab + Dashboard widget +
// Registry Marketplace System sub-tab).

import { Router } from 'express';
import {
  listCrons,
  getCron,
  registerCron,
  unregisterCron,
  setCronEnabled,
  executeCronNow,
  cancelCron,
  scanOsTasks,
  type CronRegistryEntry,
  type CronOwnerType,
} from '../services/cron-registry.js';
import {
  syncGoalsToDisk,
  syncGoalsToDiskImmediate,
  getLastSyncTime,
} from '../services/goals-disk-sync.js';

const router = Router();

// POST /api/registry/goals/sync-to-disk — manual trigger.
// Writes current DB goals to memory/goals.md so Claude CLI sessions
// outside Paperclip see them too. NO cron, user-initiated only.
// Intentionally mounted here because it's a registry-level operation.
router.post('/goals/sync-to-disk', async (req, res) => {
  try {
    const companyId = req.body?.company_id || undefined;
    const immediate = req.body?.immediate === true;
    const result = immediate
      ? await syncGoalsToDiskImmediate(companyId)
      : await syncGoalsToDisk(companyId);
    res.json({ ...result, last_synced_at: getLastSyncTime() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/goals/sync-status — get last sync time
router.get('/goals/sync-status', (_req, res) => {
  res.json({
    last_synced_at: getLastSyncTime(),
    file_path: 'memory/goals.md',
  });
});

// GET /api/registry/crons — list all (filter by ?enabled=true&owner_type=agent)
router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === 'true';
    if (req.query.owner_type) filter.owner_type = req.query.owner_type as CronOwnerType;
    const rows = await listCrons(filter);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/crons/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const row = await getCron(req.params.id);
    if (!row) return res.status(404).json({ error: `Cron ${req.params.id} không tồn tại` });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/crons — create/upsert registry entry
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const entry: CronRegistryEntry = {
      id: body.id,
      display_name: body.display_name,
      description: body.description,
      owner_type: body.owner_type || 'user',
      owner_ref: body.owner_ref,
      schedule_type: body.schedule_type,
      cron_expression: body.cron_expression,
      script_full_path: body.script_full_path,
      script_file_name: body.script_file_name,
      execute_command: body.execute_command,
      working_directory: body.working_directory,
      enabled: body.enabled ?? true,
      os_registered_as: body.os_registered_as,
      imported_from_os: body.imported_from_os ?? false,
      created_by: body.created_by || 'user_ui',
    };
    const row = await registerCron(entry, 'user_ui');
    res.status(201).json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/registry/crons/:id — enable/disable toggle or edit fields
router.patch('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    // If only `enabled` is in body, use the dedicated toggle path (so OS task
    // state stays in sync). Otherwise upsert the full row.
    if (Object.keys(body).length === 1 && typeof body.enabled === 'boolean') {
      const row = await setCronEnabled(req.params.id, body.enabled, 'user_ui');
      return res.json(row);
    }

    // Full upsert fallback: load existing, merge, re-register
    const existing = await getCron(req.params.id);
    if (!existing) return res.status(404).json({ error: `Cron ${req.params.id} không tồn tại` });

    const merged: CronRegistryEntry = {
      ...existing,
      ...body,
      id: req.params.id, // never change id
    } as CronRegistryEntry;
    const row = await registerCron(merged, 'user_ui');
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/registry/crons/:id — remove DB + OS task
router.delete('/:id', async (req, res) => {
  try {
    await unregisterCron(req.params.id, 'user_ui');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/crons/:id/execute — manual run now
router.post('/:id/execute', async (req, res) => {
  try {
    const timeout = Number(req.body?.timeout_ms) || 120_000;
    const result = await executeCronNow(req.params.id, 'user_ui', timeout);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/crons/:id/cancel — kill running subprocess
router.post('/:id/cancel', async (req, res) => {
  try {
    const cancelled = await cancelCron(req.params.id, 'user_ui');
    res.json({ cancelled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registry/crons/scan — import existing OS tasks
// (one-time or on-demand; safe to re-run — upsert semantics)
router.post('/scan', async (_req, res) => {
  try {
    const result = await scanOsTasks('user_ui');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/crons/:id/copy — returns 3 formats (plain text, markdown, json)
// ready to paste anywhere. Used by UI copy buttons — no client-side formatting
// logic duplicated.
router.get('/:id/copy', async (req, res) => {
  try {
    const row = await getCron(req.params.id);
    if (!row) return res.status(404).json({ error: `Cron ${req.params.id} không tồn tại` });

    const spec: any = row.execution_spec || {};
    const reads = (spec.reads_tables || []).join(', ') || '—';
    const writes = (spec.writes_tables || []).join(', ') || '—';
    const apis = (spec.calls_apis || []).map((a: any) => `${a.method} ${a.url}`).join('; ') || '—';
    const notify = (spec.notify_channels || []).join(', ') || '—';
    const sops = (spec.linked_sops || []).join(', ') || '—';
    const pipes = (spec.linked_pipelines || []).join(', ') || '—';

    const plain = [
      `CRON: ${row.display_name}`,
      `ID: ${row.id}`,
      `Type: ${row.schedule_type}`,
      `Schedule: ${row.cron_expression || '—'} (${row.cron_humanized || '—'})`,
      `Category: ${row.category || '—'} | Priority: ${row.priority || 'normal'} | Enabled: ${row.enabled}`,
      `Owner: ${row.owner_type} / ${row.owner_ref || '—'}`,
      `Setup by: ${row.setup_by_label || row.setup_by || '—'}`,
      `Script: ${row.script_file_name || '—'}`,
      `Full path: ${row.script_full_path || '—'}`,
      `Working dir: ${row.working_directory || '—'}`,
      `Agent: ${spec.responsible_agent || '—'}`,
      `Reads: ${reads}`,
      `Writes: ${writes}`,
      `APIs: ${apis}`,
      `Notify: ${notify}`,
      `Output: ${spec.output_endpoint || '—'}`,
      `Linked SOPs: ${sops}`,
      `Linked Pipelines: ${pipes}`,
      `Last run: ${row.last_run_at || 'chưa chạy'} (${row.last_run_status || '—'})`,
      `Notes: ${row.notes || '—'}`,
      spec.description_detail ? `\nChi tiết:\n${spec.description_detail}` : '',
    ].filter(Boolean).join('\n');

    const markdown = [
      `### ${row.display_name}`,
      '',
      `- **ID**: \`${row.id}\``,
      `- **Type**: \`${row.schedule_type}\``,
      `- **Schedule**: \`${row.cron_expression || '—'}\` — ${row.cron_humanized || '—'}`,
      `- **Category / Priority**: ${row.category || '—'} / ${row.priority || 'normal'} — Enabled: \`${row.enabled}\``,
      `- **Owner**: ${row.owner_type} / ${row.owner_ref || '—'}`,
      `- **Setup by**: ${row.setup_by_label || row.setup_by || '—'}`,
      row.script_file_name ? `- **Script**: \`${row.script_file_name}\`` : '',
      row.script_full_path ? `- **Full path**: \`${row.script_full_path}\`` : '',
      spec.responsible_agent ? `- **Agent**: \`${spec.responsible_agent}\`` : '',
      `- **Reads**: ${reads}`,
      `- **Writes**: ${writes}`,
      `- **APIs**: ${apis}`,
      `- **Notify**: ${notify}`,
      spec.output_endpoint ? `- **Output**: ${spec.output_endpoint}` : '',
      `- **Linked SOPs**: ${sops}`,
      `- **Linked Pipelines**: ${pipes}`,
      `- **Last run**: ${row.last_run_at || 'chưa chạy'} (${row.last_run_status || '—'})`,
      row.notes ? `- **Notes**: ${row.notes}` : '',
      spec.description_detail ? `\n**Chi tiết**:\n\n${spec.description_detail}` : '',
    ].filter(Boolean).join('\n');

    res.json({
      plain,
      markdown,
      json: row,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/crons/:id/events — audit log (config changes, enable/disable, delete)
router.get('/:id/events', async (req, res) => {
  try {
    const { supabase } = await import('./zalo-personal/supabase.js');
    const { data, error } = await supabase
      .from('cron_registry_events')
      .select('*')
      .eq('cron_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/crons/:id/runs — per-execution history (used by CronLogDrawer).
// Returns last N runs with stdout/stderr/duration/status — the "transcript" each
// task produces. Limit default 30, max 200.
router.get('/:id/runs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 30), 200);
    const { supabase } = await import('./zalo-personal/supabase.js');
    const { data, error } = await supabase
      .from('cron_registry_runs')
      .select('id, started_at, finished_at, duration_ms, status, exit_code, stdout, stderr, pid, triggered_by, triggered_from, metadata')
      .eq('cron_id', req.params.id)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ cron_id: req.params.id, runs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registry/crons/:id/related — return the referenced cron jobs (flow links)
// from execution_spec.related_crons, so UI can render "Step 2 of 4" flow nav.
router.get('/:id/related', async (req, res) => {
  try {
    const { supabase } = await import('./zalo-personal/supabase.js');
    const { data: self, error: e1 } = await supabase
      .from('cron_registry')
      .select('execution_spec')
      .eq('id', req.params.id)
      .single();
    if (e1 || !self) throw e1 ?? new Error('cron not found');
    const relatedIds: string[] = (self.execution_spec?.related_crons as string[]) ?? [];
    if (relatedIds.length === 0) return res.json({ cron_id: req.params.id, related: [] });
    const { data, error } = await supabase
      .from('cron_registry')
      .select('id, display_name, category, priority, enabled, cron_humanized, last_run_status, last_run_at, execution_spec')
      .in('id', relatedIds);
    if (error) throw error;
    res.json({
      cron_id: req.params.id,
      flow_name: self.execution_spec?.flow_name ?? null,
      related: data || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
