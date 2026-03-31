// System Routes — cron jobs, system health, infrastructure status, config, PM2

import { Router } from 'express';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { supabase } from '../channels/zalo-personal/supabase.js';

const router = Router();
const exec = promisify(execCb);

// Known pg_cron jobs on Gemral Supabase
const CRON_JOBS = [
  { id: 3, schedule: '0 17 * * *', name: 'subscription-checker', active: true },
  { id: 6, schedule: '0 0 * * *', name: 'expire-scanner-trials', active: true },
  { id: 9, schedule: '0 8 * * *', name: 'trial-expiry-reminders', active: true },
  { id: 11, schedule: '* * * * *', name: 'paper-trade-monitor', active: true },
  { id: 12, schedule: '*/5 * * * *', name: 'expire-boosts', active: true },
  { id: 14, schedule: '0 1 * * *', name: 'daily-analytics', active: true },
  { id: 17, schedule: '0 1 * * *', name: 'waitlist-email-nurture', active: true },
  { id: 18, schedule: '30 0 * * *', name: 'email-send-time-stats', active: true },
  { id: 19, schedule: '0,15,30,45 * * * *', name: 'email-automation-scheduler', active: true },
];

// GET /api/system/crons — return pg_cron jobs
router.get('/crons', async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_cron_jobs');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return res.json(data);
    }
    res.json(CRON_JOBS);
  } catch {
    res.json(CRON_JOBS);
  }
});

// GET /api/system/status — system overview
router.get('/status', async (_req, res) => {
  try {
    const [
      { count: edgeFunctions },
      { count: activeAgents },
    ] = await Promise.all([
      supabase.from('edge_function_logs').select('*', { count: 'exact', head: true }),
      supabase.from('paperclip_agents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cron_jobs: CRON_JOBS.length,
      active_agents: activeAgents || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── System Config (system_config table key-value store) ──────────────────

// GET /api/system/config — fetch all config as flat object
router.get('/config', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value');
    if (error) throw error;
    const flat: Record<string, any> = {};
    for (const row of data || []) {
      try {
        flat[row.key] = JSON.parse(row.value);
      } catch {
        flat[row.key] = row.value;
      }
    }
    res.json(flat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/config — upsert a key-value pair
router.post('/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    const { error } = await supabase
      .from('system_config')
      .upsert(
        { key, value: typeof value === 'string' ? value : JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) throw error;
    res.json({ ok: true, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PM2 Process Monitor ────────────────────────────────────────────────────

// GET /api/system/pm2 — list PM2 processes
router.get('/pm2', async (_req, res) => {
  try {
    const { stdout } = await exec('pm2 jlist');
    const list = JSON.parse(stdout);
    const processes = list.map((p: any) => ({
      name: p.name,
      pid: p.pid,
      status: p.pm2_env?.status || 'unknown',
      cpu: p.monit?.cpu ?? 0,
      memory: p.monit?.memory ?? 0,
      uptime: p.pm2_env?.pm_uptime
        ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000)
        : 0,
      restarts: p.pm2_env?.restart_time ?? 0,
    }));
    res.json(processes);
  } catch (err: any) {
    // PM2 not available or not running — return empty list (not an error)
    res.json([]);
  }
});

// POST /api/system/pm2/:name/restart
router.post('/pm2/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    if (!/^[\w\-]+$/.test(name)) return res.status(400).json({ error: 'Invalid process name' });
    await exec(`pm2 restart ${name}`);
    res.json({ ok: true, action: 'restart', name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/pm2/:name/stop
router.post('/pm2/:name/stop', async (req, res) => {
  try {
    const { name } = req.params;
    if (!/^[\w\-]+$/.test(name)) return res.status(400).json({ error: 'Invalid process name' });
    await exec(`pm2 stop ${name}`);
    res.json({ ok: true, action: 'stop', name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/pm2/:name/logs — last 50 lines
router.get('/pm2/:name/logs', async (req, res) => {
  try {
    const { name } = req.params;
    if (!/^[\w\-]+$/.test(name)) return res.status(400).json({ error: 'Invalid process name' });
    const { stdout } = await exec(`pm2 logs ${name} --lines 50 --nostream --raw`);
    res.json({ lines: stdout.trim().split('\n') });
  } catch (err: any) {
    res.json({ lines: [`Lỗi: ${err.message}`] });
  }
});

export default router;
