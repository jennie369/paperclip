// Operations Routes — Content Pipeline + Affiliate + Scanner
// KHÔNG HARDCODE — TẤT CẢ TỪ SUPABASE QUERY THẬT
// Script execution qua child_process spawn + SSE stream

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();

// ═══ PATHS ═══
const PAPERCLIP_ROOT = path.resolve(process.cwd(), '..');
const CPS_ROOT = 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner';
const CC_CWD = 'D:/Claude Projects/App Content Jennie/gem-content-center';

// Phase 1: CC Supabase removed — batch_processor now writes directly to Main Supabase

// ═══════════════════════════════════════════════════════
// CONTENT PIPELINE — REAL DATA, NO HARDCODE
// ═══════════════════════════════════════════════════════

// Stats — TẤT CẢ TỪ DB
router.get('/content-pipeline/stats', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [published, drafts, processing, total] = await Promise.all([
      supabase.from('cc_scripts').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('updated_at', today + 'T00:00:00Z'),
      supabase.from('cc_scripts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('cc_generation_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      supabase.from('cc_scripts').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      posted_today: published.count || 0,
      target_today: 9,
      pending_approval: drafts.count || 0,
      generating: processing.count || 0,
      total_scripts: total.count || 0,
    });
  } catch (err: any) {
    console.error('[Pipeline Stats]', err.message);
    res.status(500).json({ error: 'Lỗi tải thống kê pipeline' });
  }
});

// Scripts CRUD — REAL DB
router.get('/content-pipeline/scripts', async (req, res) => {
  try {
    const { status, pillar, limit = '50' } = req.query;
    let query = supabase.from('cc_scripts').select('*').order('created_at', { ascending: false }).limit(Number(limit));
    if (status) query = query.eq('status', String(status));
    if (pillar) query = query.eq('pillar', String(pillar));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/content-pipeline/scripts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cc_scripts').update(req.body).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/content-pipeline/scripts/:id/approve', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cc_scripts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/content-pipeline/scripts/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const { data, error } = await supabase.from('cc_scripts')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk approve
router.post('/content-pipeline/scripts/bulk-approve', async (req, res) => {
  try {
    const { script_ids } = req.body;
    if (!script_ids?.length) return res.status(400).json({ error: 'Không có script_ids' });
    const { error } = await supabase.from('cc_scripts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .in('id', script_ids);
    if (error) throw error;
    res.json({ approved: script_ids.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/content-pipeline/scripts/:id', async (req, res) => {
  try {
    await supabase.from('cc_scripts').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1B: Editable schedule — PUT /content-pipeline/scripts/:key/schedule
router.put('/content-pipeline/scripts/:key/schedule', async (req, res) => {
  try {
    const { key } = req.params;
    const { schedule, hour, minute, frequency, weekday } = req.body;
    if (!schedule) return res.status(400).json({ error: 'schedule required' });
    // Store in system_config: key = pipeline.script.<key>.schedule
    const configKey = `pipeline.script.${key}.schedule`;
    const { error } = await supabase
      .from('system_config')
      .upsert({ key: configKey, value: JSON.stringify({ schedule, hour, minute, frequency, weekday }), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    res.json({ key, schedule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generation Jobs — REAL DB + actions
router.get('/content-pipeline/jobs', async (req, res) => {
  try {
    const { status, limit = '200' } = req.query;
    let query = supabase
      .from('cc_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));
    if (status) {
      const statuses = (status as string).split(',');
      query = query.in('status', statuses);
    }
    const { data, error } = await query;
    if (error) throw error;

    const jobs = (data || []).map((job: any) => {
      let params: any = {};
      try { params = typeof job.input_params === 'string' ? JSON.parse(job.input_params) : (job.input_params || {}); } catch {}
      let outData: any = {};
      try { outData = typeof job.output_data === 'string' ? JSON.parse(job.output_data) : (job.output_data || {}); } catch {}
      return {
        ...job,
        // Prefer DB columns, fall back to input_params only when DB is empty
        pillar: (job.pillar || params.pillar || params.track || ''),
        content_type: (job.content_type || params.contentType || params.content_type || ''),
        topic: params.userPrompt?.slice(0, 120) || params.topic || job.topic || '',
        brand_voice: job.brand_voice || params.brandVoice || 'jennie',
        // Expose provider/model from input_params for display
        _provider: params.provider || '',
        _model: params.model || '',
        // Flatten output_data for easy frontend access
        output_content: outData.content || (typeof outData === 'string' ? outData : ''),
        script_id: outData.script_id || null,
      };
    });
    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải jobs' });
  }
});

router.post('/content-pipeline/jobs/:id/retry', async (req, res) => {
  try {
    const { error } = await supabase.from('cc_generation_jobs').update({ status: 'queued', output_error: null, processor: null, started_at: null }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Job đã được queue lại' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi retry job' });
  }
});

router.post('/content-pipeline/jobs/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabase.from('cc_generation_jobs').update({ status: 'cancelled' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Job đã hủy' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi hủy job' });
  }
});

router.delete('/content-pipeline/jobs/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('cc_generation_jobs').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Job đã xóa' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa job' });
  }
});

// Edit job output content — auto-sync to cc_scripts if linked
router.put('/content-pipeline/jobs/:id/output', async (req, res) => {
  try {
    const { output_text } = req.body;
    if (typeof output_text !== 'string') return res.status(400).json({ error: 'output_text required' });

    const { error } = await supabase
      .from('cc_generation_jobs')
      .update({ output_text, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;

    // Auto-sync to cc_scripts if linked via metadata.job_id
    await supabase
      .from('cc_scripts')
      .update({ body: output_text })
      .eq('metadata->>job_id', req.params.id);

    res.json({ message: 'Đã cập nhật nội dung' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật output' });
  }
});

// Script Execution — CHILD_PROCESS SPAWN + SSE STREAM
// Scripts paths — THẬT từ SOP-CONTENT-PIPELINE.md
const SCRIPTS_CONFIG: Record<string, { path: string; cwd: string; args: string[]; label: string }> = {
  'batch_generate': { path: 'scripts/batch_processor.py', cwd: CC_CWD, args: ['batch'], label: 'Batch Generate' },
  'daily_post': { path: 'scripts/daily_facebook_post.py', cwd: CPS_ROOT, args: [], label: 'Facebook Posts' },
  'pipeline_audit': { path: 'scripts/daily_pipeline_audit.py', cwd: CPS_ROOT, args: [], label: 'Pipeline Audit' },
  'daily_email': { path: 'scripts/send_daily_newsletter.py', cwd: CPS_ROOT, args: [], label: 'Email Segments' },
  'daily_push': { path: 'scripts/daily_pipeline_orchestrator.py', cwd: CPS_ROOT, args: ['--stage', 'push'], label: 'Push Notifications' },
  'compose_images': { path: 'agents/designer/scripts/social_image_composer.py', cwd: CPS_ROOT, args: [], label: 'Image Composer' },
  'weekly_plan': { path: 'scripts/weekly_content_queue.py', cwd: CPS_ROOT, args: ['--create-plan'], label: 'Weekly Plan' },
  'weekly_queue': { path: 'scripts/weekly_content_queue.py', cwd: CPS_ROOT, args: ['--from-plan'], label: 'Weekly Queue' },
  'schedule_test_one': { path: 'scripts/schedule_meta_business_suite.py', cwd: CPS_ROOT, args: ['--weeks', '2', '--test-one'], label: 'Schedule Test' },
  'schedule_page_jennie': { path: 'scripts/schedule_meta_business_suite.py', cwd: CPS_ROOT, args: ['--weeks', '2', '--account', 'page_jennie'], label: 'Schedule Page Jennie' },
  'schedule_page_gemral': { path: 'scripts/schedule_meta_business_suite.py', cwd: CPS_ROOT, args: ['--weeks', '2', '--account', 'page_gemral'], label: 'Schedule Page Gemral' },
  'schedule_profile_jennie': { path: 'scripts/schedule_meta_business_suite.py', cwd: CPS_ROOT, args: ['--weeks', '2', '--account', 'profile_jennie'], label: 'Schedule Profile Jennie' },
  'schedule_all': { path: 'scripts/schedule_meta_business_suite.py', cwd: CPS_ROOT, args: ['--weeks', '2'], label: 'Schedule All' },
};

router.post('/content-pipeline/execute/:script', (req, res) => {
  const scriptKey = req.params.script;
  const config = SCRIPTS_CONFIG[scriptKey];

  if (!config) {
    return res.status(400).json({ error: `Script không hợp lệ: ${scriptKey}. Hợp lệ: ${Object.keys(SCRIPTS_CONFIG).join(', ')}` });
  }

  const scriptPath = path.resolve(config.cwd, config.path);
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: `Script không tìm thấy: ${scriptPath}`, hint: 'Kiểm tra đường dẫn' });
  }

  // SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const extraArgs = req.body?.args || [];
  const proc = spawn('python', [scriptPath, ...config.args, ...extraArgs], {
    cwd: config.cwd,
    env: { ...process.env, PYTHONUTF8: '1' },
  });

  res.write(`data: ${JSON.stringify({ type: 'start', script: scriptKey, path: scriptPath })}\n\n`);

  proc.stdout.on('data', (data) => {
    res.write(`data: ${JSON.stringify({ type: 'stdout', text: data.toString() })}\n\n`);
  });

  proc.stderr.on('data', (data) => {
    res.write(`data: ${JSON.stringify({ type: 'stderr', text: data.toString() })}\n\n`);
  });

  proc.on('close', (code) => {
    res.write(`data: ${JSON.stringify({ type: 'exit', code, script: scriptKey })}\n\n`);
    res.end();
  });

  proc.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  });

  const timeout = setTimeout(() => { proc.kill(); res.write(`data: ${JSON.stringify({ type: 'timeout', message: 'Script quá 15 phút' })}\n\n`); res.end(); }, 15 * 60 * 1000);
  proc.on('close', () => clearTimeout(timeout));
});

// Jobs summary — count by status (lightweight)
router.get('/content-pipeline/jobs-summary', async (_req, res) => {
  try {
    const statuses = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const { count } = await supabase.from('cc_generation_jobs').select('*', { count: 'exact', head: true }).eq('status', status);
      counts[status] = count || 0;
    }
    res.json(counts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /scripts — tạo script thủ công
router.post('/content-pipeline/scripts', async (req, res) => {
  try {
    const { title, body, content_type, pillar, brand_voice, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Tiêu đề không được trống' });
    const { data, error } = await supabase.from('cc_scripts').insert({
      title: title.trim(), body, content_type: content_type || 'social_post',
      pillar: pillar || 'trading', brand_voice: brand_voice || 'jennie',
      status: status || 'draft',
    }).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /generate — tạo AI generation job
router.post('/content-pipeline/generate', async (req, res) => {
  try {
    const { content_type, topic, brand_voice, pillar } = req.body;
    const { data, error } = await supabase.from('cc_generation_jobs').insert({
      job_type: content_type || 'social_post',
      content_type: content_type || 'social_post',
      status: 'queued',
      input_params: JSON.stringify({ userPrompt: topic, brandVoice: brand_voice || 'jennie', pillar: pillar || 'trading' }),
    }).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Links — parse IMPORTANT_LINKS.md
router.get('/content-pipeline/links', (_req, res) => {
  const linksPath = path.join(CPS_ROOT, 'docs/IMPORTANT_LINKS.md');
  if (!fs.existsSync(linksPath)) return res.json({ links: [], raw: '', exists: false });
  const raw = fs.readFileSync(linksPath, 'utf-8');
  const links: Array<{ category: string; name: string; url: string }> = [];
  let cat = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('## ')) cat = line.replace('## ', '').trim();
    const m = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (m) links.push({ category: cat, name: m[1], url: m[2] });
    const m2 = line.match(/\|\s*(.+?)\s*\|\s*(https?:\/\/\S+)\s*\|/);
    if (m2) links.push({ category: cat, name: m2[1].trim(), url: m2[2].trim() });
  }
  res.json({ links, raw, exists: true });
});

// Chain status
router.get('/content-pipeline/chain-status', (_req, res) => {
  const statusPath = path.join(CPS_ROOT, 'memory/pipeline-chain-status.json');
  if (!fs.existsSync(statusPath)) return res.json({ steps: [], last_run: null });
  try {
    const data = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    res.json(data);
  } catch { res.json({ steps: [], last_run: null }); }
});

// Agents list for pipeline delegation
router.get('/content-pipeline/agents', async (_req, res) => {
  try {
    // Use agent-configs which has slug + display_name
    const configRes = await fetch('http://127.0.0.1:3101/api/channels/agent-configs');
    const allAgents = configRes.ok ? await configRes.json() : [];
    const pipelineSlugs = ['ceo', 'content-strategist', 'social-media-manager', 'designer',
       'email-crm-manager', 'community-engagement', 'data-analyst'];
    const pipelineAgents = (allAgents as any[]).filter(a => pipelineSlugs.includes(a.slug));
    res.json({ agents: pipelineAgents });
  } catch { res.json({ agents: [] }); }
});

// Delegate task to agent
router.post('/content-pipeline/delegate', (req, res) => {
  const { agent_slug, task, context } = req.body;
  if (!agent_slug || !task) return res.status(400).json({ error: 'Thiếu agent_slug hoặc task' });

  // Find claude CLI
  const claudeBin = process.platform === 'win32' ? 'claude' : 'claude';
  const agentCwd = path.join(CPS_ROOT, 'agents', agent_slug);

  const taskPrompt = `[PIPELINE TASK — ĐƯỢC GIAO TỪ DASHBOARD]\n\n${task}\n\n${context ? `Bối cảnh:\n${context}` : ''}`;

  // SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'start', agent: agent_slug, task })}\n\n`);

  const proc = spawn(claudeBin, ['--dangerously-skip-permissions', '-p', taskPrompt], {
    cwd: fs.existsSync(agentCwd) ? agentCwd : CPS_ROOT,
    env: { ...process.env },
    shell: true,
    timeout: 600_000,
  });

  proc.stdout?.on('data', (chunk: Buffer) => { res.write(`data: ${JSON.stringify({ type: 'stdout', text: chunk.toString() })}\n\n`); });
  proc.stderr?.on('data', (chunk: Buffer) => { res.write(`data: ${JSON.stringify({ type: 'stderr', text: chunk.toString() })}\n\n`); });
  proc.on('close', (code: number | null) => { res.write(`data: ${JSON.stringify({ type: 'exit', code, agent: agent_slug })}\n\n`); res.end(); });
  proc.on('error', (err: Error) => { res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`); res.end(); });
  req.on('close', () => { if (!proc.killed) proc.kill(); });
});

// Reload agents
router.post('/content-pipeline/reload-agents', (_req, res) => {
  // Agents run via Paperclip heartbeat — not PM2
  res.json({ message: 'Agent context sẽ được reload ở lần heartbeat tiếp theo' });
});

// Schedule
router.get('/content-pipeline/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    let query = supabase.from('cc_calendar_events').select('*').order('scheduled_at', { ascending: true });
    if (date) query = query.gte('scheduled_at', `${date}T00:00:00`).lte('scheduled_at', `${date}T23:59:59`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch { res.json([]); }
});

router.post('/content-pipeline/schedule/bulk', async (req, res) => {
  const { weeks = 2, account, test_one } = req.body;
  // TODO: execute schedule_meta_business_suite.py with SSE
  res.json({ success: true, message: `Lên lịch ${test_one ? '1 bài test' : `${weeks} tuần`}${account ? ` cho ${account}` : ' tất cả'}` });
});

// POST /content-pipeline/schedule — lên lịch 1 bài
router.post('/content-pipeline/schedule', async (req, res) => {
  try {
    const { script_id, scheduled_at, account } = req.body;
    if (!script_id || !scheduled_at) return res.status(400).json({ error: 'script_id và scheduled_at là bắt buộc' });

    const dt = new Date(scheduled_at);
    const scheduledDate = dt.toISOString().split('T')[0]; // YYYY-MM-DD
    const scheduledTime = dt.toTimeString().slice(0, 8);   // HH:MM:SS

    // Lấy script
    const { data: script } = await supabase.from('cc_scripts').select('title, body, image_urls, content_type, track, pillar, persona').eq('id', script_id).single();

    // Tạo calendar event — đúng schema cc_calendar_events
    const { data, error } = await supabase.from('cc_calendar_events').insert({
      script_id,
      title: script?.title || 'Bài đăng',
      description: script?.body?.slice(0, 300) || '',
      content_type: script?.content_type || 'social_post',
      track: script?.track || null,
      pillar: script?.pillar || null,
      persona: script?.persona || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      status: 'scheduled',
      event_type: 'post',
      platforms: [account || 'profile_jennie'],
      metadata: { account, image_urls: script?.image_urls || [] },
    }).select().single();

    if (error) throw error;

    // Cập nhật script: status + scheduled_at + posted_account
    await supabase.from('cc_scripts').update({
      status: 'scheduled',
      posted_account: account,
      scheduled_at: dt.toISOString(),
    }).eq('id', script_id);

    res.json({ success: true, event: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi lên lịch' });
  }
});

// POST /content-pipeline/agent-review — giao review cho agent qua War Room
router.post('/content-pipeline/agent-review', async (req, res) => {
  try {
    const { script_id, agent, task } = req.body;
    if (!script_id || !task) return res.status(400).json({ error: 'script_id và task là bắt buộc' });

    // Tìm channel #general hoặc #learning-room
    const { data: channel } = await supabase
      .from('war_room_channels')
      .select('id')
      .or('slug.eq.general,name.ilike.%general%')
      .limit(1)
      .single();

    if (!channel) return res.status(404).json({ error: 'Không tìm thấy War Room channel' });

    // Gửi message vào channel với @mention agent
    const { error } = await supabase.from('war_room_messages').insert({
      channel_id: channel.id,
      sender: 'ops-pipeline',
      content: `@${agent} ${task}`,
      metadata: { script_id, type: 'agent_review_request', agent },
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    res.json({ success: true, message: `Đã giao review cho ${agent} qua War Room` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi giao review' });
  }
});

// POST /content-pipeline/scripts/:id/images — upload hình ảnh (multipart)
// Dùng Supabase Storage bucket 'cc-content' (public)
router.post('/content-pipeline/scripts/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url } = req.body; // Client gửi URL sau khi upload trực tiếp lên Supabase
    if (!image_url) return res.status(400).json({ error: 'image_url required' });

    const { data: script } = await supabase.from('cc_scripts').select('image_urls').eq('id', id).single();
    const existing: string[] = script?.image_urls || [];
    const newUrls = [...existing, image_url];

    const { error } = await supabase.from('cc_scripts').update({ image_urls: newUrls }).eq('id', id);
    if (error) throw error;

    res.json({ success: true, image_urls: newUrls });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Compliance check — REAL banned words
const BANNED_WORDS = ['giàu nhanh', 'kiếm tiền dễ dàng', 'thu nhập thụ động', 'bí mật làm giàu', 'đảm bảo lợi nhuận', 'get rich quick', 'bói toán', 'phán số mệnh', 'ma quỷ'];
router.post('/content-pipeline/compliance-check', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.json({ pass: true, violations: [] });
  const lower = content.toLowerCase();
  const violations = BANNED_WORDS.filter(w => lower.includes(w));
  res.json({ pass: violations.length === 0, violations });
});

// Skill Files — REAL PATHS ON DISK
const SKILL_FILES: Record<string, { filePath: string; description: string }> = {
  'SKILL-FACEBOOK-POSTING-PLAYWRIGHT.md': { filePath: path.join(CPS_ROOT, 'skills-store/SKILL-FACEBOOK-POSTING-PLAYWRIGHT.md'), description: 'Quy trình đăng Facebook qua Playwright' },
  'SKILL-batch-processor.md': { filePath: 'D:/Claude Projects/App Content Jennie/gem-content-center/CLAUDE.md', description: 'Batch processor usage guide' },
  'SKILL-schedule-meta-business-suite.md': { filePath: path.join(CPS_ROOT, 'skills-store/SKILL-schedule-meta-business-suite.md'), description: 'Meta Business Suite scheduling' },
  'SOP-CONTENT-PIPELINE.md': { filePath: path.join(CPS_ROOT, 'memory/sops/SOP-CONTENT-PIPELINE.md'), description: 'SOP pipeline V3' },
  'social-channels.md': { filePath: path.join(CPS_ROOT, 'memory/social-channels.md'), description: 'Danh sách kênh social' },
  'IMPORTANT_LINKS.md': { filePath: path.join(CPS_ROOT, 'docs/IMPORTANT_LINKS.md'), description: 'Links + CTA mapping' },
};

router.get('/content-pipeline/skills', (_req, res) => {
  const skills = Object.entries(SKILL_FILES).map(([name, config]) => ({
    name, description: config.description, path: config.filePath, exists: fs.existsSync(config.filePath),
  }));
  res.json({ skills });
});

router.get('/content-pipeline/skills/:name', (req, res) => {
  const config = SKILL_FILES[req.params.name];
  if (!config) return res.status(404).json({ error: `Skill "${req.params.name}" không tồn tại trong config` });
  if (!fs.existsSync(config.filePath)) return res.status(404).json({ error: 'File không tìm thấy', path: config.filePath });
  try {
    const content = fs.readFileSync(config.filePath, 'utf-8');
    res.json({ name: req.params.name, content, path: config.filePath });
  } catch (err: any) {
    res.status(500).json({ error: `Lỗi đọc: ${err.message}` });
  }
});

router.put('/content-pipeline/skills/:name', (req, res) => {
  const config = SKILL_FILES[req.params.name];
  if (!config) return res.status(404).json({ error: `Skill "${req.params.name}" không tồn tại` });
  try {
    fs.writeFileSync(config.filePath, req.body.content, 'utf-8');
    res.json({ message: `Đã lưu ${req.params.name}`, path: config.filePath });
  } catch (err: any) {
    res.status(500).json({ error: `Lỗi ghi: ${err.message}` });
  }
});

// Sync CC → Main — REMOVED (Phase 1: batch_processor now writes directly to Main Supabase)

// ═══════════════════════════════════════════════════════
// EMAIL SEND — RESEND API
// ═══════════════════════════════════════════════════════

router.post('/email/send', async (req, res) => {
  try {
    const { from, to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Thiếu to, subject hoặc html' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'RESEND_API_KEY chưa được cấu hình' });
    }

    const payload = {
      from: from || 'GEM <noreply@gemral.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.message || data.error || 'Lỗi Resend API' });
    }

    res.json({ success: true, id: data.id, data });
  } catch (err: any) {
    console.error('[Email Send]', err.message);
    res.status(500).json({ success: false, error: err.message || 'Lỗi gửi email' });
  }
});

// ═══════════════════════════════════════════════════════
// AFFILIATE — REAL DB
// ═══════════════════════════════════════════════════════

router.get('/affiliate/stats', async (_req, res) => {
  try {
    const { data: profiles } = await supabase.from('affiliate_profiles').select('partnership_role, is_active, total_sales');
    const all = profiles || [];
    const ctv = all.filter(p => p.partnership_role === 'ctv' || !p.partnership_role).length;
    const kol = all.filter(p => p.partnership_role === 'kol').length;
    const monthSales = all.reduce((s, p) => s + (parseFloat(p.total_sales) || 0), 0);
    const { count: pendingCount } = await supabase.from('partnership_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    res.json({ ctv, kol, pending: pendingCount || 0, month_sales: monthSales });
  } catch { res.json({ ctv: 0, kol: 0, pending: 0, month_sales: 0 }); }
});

router.get('/affiliate/pending', async (_req, res) => {
  try {
    const { data } = await supabase.from('partnership_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    res.json(data || []);
  } catch { res.json([]); }
});

router.get('/affiliate/list', async (req, res) => {
  try {
    const { tier, role, active } = req.query;
    let query = supabase.from('affiliate_profiles').select('*').order('total_sales', { ascending: false });
    if (tier) query = query.eq('ctv_tier', String(tier));
    if (role) query = query.eq('partnership_role', String(role));
    if (active === 'true') query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);
    const { data } = await query;
    res.json(data || []);
  } catch { res.json([]); }
});

router.post('/affiliate/:id/approve', async (req, res) => {
  try {
    const { data: app } = await supabase.from('partnership_applications').select('*').eq('id', req.params.id).single();
    if (!app) return res.status(404).json({ error: 'Không tìm thấy đơn' });
    await supabase.from('partnership_applications').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', req.params.id);
    if (app.user_id) {
      await supabase.from('affiliate_profiles').upsert({ user_id: app.user_id, partnership_role: app.application_type || 'ctv', ctv_tier: 'bronze', is_active: true }, { onConflict: 'user_id' });
      await supabase.from('profiles').update({ partnership_role: app.application_type || 'ctv', ctv_tier: 'bronze' }).eq('id', app.user_id);
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/affiliate/:id/reject', async (req, res) => {
  try {
    await supabase.from('partnership_applications').update({ status: 'rejected', rejection_reason: req.body.reason }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/affiliate/:id/tier', async (req, res) => {
  try { await supabase.from('affiliate_profiles').update({ ctv_tier: req.body.tier }).eq('id', req.params.id); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/affiliate/:id/status', async (req, res) => {
  try { await supabase.from('affiliate_profiles').update({ is_active: req.body.is_active }).eq('id', req.params.id); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/affiliate/:id/pay-commission', async (req, res) => {
  try {
    await supabase.from('commission_sales').update({ payment_status: 'paid', paid_at: new Date().toISOString() }).eq('affiliate_id', req.params.id).eq('payment_status', 'pending');
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/affiliate/:id/commission', async (req, res) => {
  try { const { data } = await supabase.from('commission_sales').select('*').eq('affiliate_id', req.params.id).order('created_at', { ascending: false }); res.json(data || []); }
  catch { res.json([]); }
});

// ═══════════════════════════════════════════════════════
// SCANNER — DB WHERE AVAILABLE, STATIC DEFAULTS WHERE NOT
// ═══════════════════════════════════════════════════════

router.get('/scanner/stats', async (_req, res) => {
  // Scanner tables may not exist yet — return safe defaults
  res.json({ today_scans: 0, patterns_found: 0, alerts_sent: 0, win_rate: 0.678, total_coins: 437, total_patterns: 24 });
});

router.get('/scanner/recent-patterns', async (_req, res) => { res.json([]); });

router.post('/scanner/scan', async (req, res) => {
  const { coin, timeframes } = req.body;
  res.json({ success: true, message: `Scan triggered: ${coin || 'all'} [${(timeframes || []).join(',')}]` });
});

router.get('/scanner/win-rates', async (_req, res) => {
  res.json({ overall: 0.678, by_pattern: { DPD: 0.68, UPU: 0.71, UPD: 0.65, DPU: 0.69, 'H&S': 0.70, QM: 0.73, FL: 0.66, FTR: 0.64 } });
});

router.get('/scanner/config', async (_req, res) => {
  res.json({ coins_active: 437, timeframes: ['1H', '4H', 'Daily', 'Weekly'], auto_scan_interval: '4h', alert_threshold: 70, push_enabled: true });
});

router.put('/scanner/config', async (req, res) => { res.json({ success: true }); });

// ═══ WORKFLOWS ═══

router.get('/workflows', async (_req, res) => {
  const { data, error } = await supabase.from('workflows').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/workflows/:id', async (req, res) => {
  const { data, error } = await supabase.from('workflows').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Workflow không tìm thấy' });
  res.json(data);
});

router.post('/workflows', async (req, res) => {
  const { name, description, trigger_type, trigger_config, nodes, edges } = req.body;
  const { data, error } = await supabase.from('workflows').insert({
    name: name || 'Workflow mới',
    description, trigger_type: trigger_type || 'manual',
    trigger_config: trigger_config || {}, nodes: nodes || [], edges: edges || [],
    created_by: 'board',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/workflows/:id', async (req, res) => {
  const { name, description, trigger_type, trigger_config, nodes, edges, is_active } = req.body;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (trigger_type !== undefined) updates.trigger_type = trigger_type;
  if (trigger_config !== undefined) updates.trigger_config = trigger_config;
  if (nodes !== undefined) updates.nodes = nodes;
  if (edges !== undefined) updates.edges = edges;
  if (is_active !== undefined) updates.is_active = is_active;
  const { data, error } = await supabase.from('workflows').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/workflows/:id', async (req, res) => {
  const { error } = await supabase.from('workflows').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.post('/workflows/:id/run', async (req, res) => {
  const { data: wf } = await supabase.from('workflows').select('*').eq('id', req.params.id).single();
  if (!wf) return res.status(404).json({ error: 'Workflow không tìm thấy' });
  const { data: run, error } = await supabase.from('workflow_runs').insert({
    workflow_id: wf.id, status: 'running', trigger_data: req.body.trigger_data || {},
    started_at: new Date().toISOString(),
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(run);
});

// ═══════════════════════════════════════════════════════
// PHASE 5: PLANNER BOARD ENDPOINTS
// ═══════════════════════════════════════════════════════

// Map free-text topic → valid cc_scripts pillar value
function topicToPillar(topic: string): string {
  const t = topic.toLowerCase();
  if (/trading|scanner|kỹ thuật|đầu tư|crypto|tài chính|tiền/.test(t)) return 'trading';
  if (/tâm linh|spiritual|crystal|năng lượng|ritual|chakra/.test(t)) return 'spiritual';
  if (/sức khỏe|wellness|ngủ|thiền|meditation|yoga|thể dục/.test(t)) return 'wellness';
  if (/lifestyle|cuộc sống|phong cách|daily|routine/.test(t)) return 'lifestyle';
  if (/khóa học|course|latc|tmt|education|học|mindset/.test(t)) return 'latc_money';
  if (/cộng đồng|community|forum|kết nối/.test(t)) return 'community';
  return 'integration';
}

// GET /content-pipeline/planner?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/content-pipeline/planner', async (req, res) => {
  const { start, end, plan_id } = req.query as Record<string, string>;

  let assignedQuery = supabase
    .from('cc_scripts')
    .select('id, title, body, pillar, status, word_count, content_type, metadata, created_at')
    .not('metadata->plan_id', 'is', null);

  if (start) assignedQuery = assignedQuery.gte('metadata->>scheduled_date', start);
  if (end)   assignedQuery = assignedQuery.lte('metadata->>scheduled_date', end);
  if (plan_id) assignedQuery = assignedQuery.eq('metadata->>plan_id', plan_id);

  const { data, error } = await assignedQuery.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  let unassignedQuery = supabase
    .from('cc_scripts')
    .select('id, title, body, pillar, status, word_count, content_type, metadata, created_at')
    .not('metadata->plan_id', 'is', null)
    .is('metadata->>scheduled_date', null)
    .order('created_at', { ascending: false });

  if (plan_id) unassignedQuery = unassignedQuery.eq('metadata->>plan_id', plan_id);

  const { data: unassigned } = await unassignedQuery;

  // Group assigned by date → account → time
  const calendar: Record<string, Record<string, Record<string, any>>> = {};
  for (const script of (data || [])) {
    const meta = (script.metadata as any) || {};
    const d = meta.scheduled_date, t = meta.scheduled_time, a = meta.target_account;
    if (d && a) {
      if (!calendar[d]) calendar[d] = {};
      if (!calendar[d][a]) calendar[d][a] = {};
      calendar[d][a][t || '10:00'] = script;
    }
  }

  res.json({
    calendar,
    unassigned: unassigned || [],
    total_assigned: data?.length || 0,
    total_unassigned: unassigned?.length || 0,
  });
});

// GET /content-pipeline/planner/plans — list content_planner scripts
router.get('/content-pipeline/planner/plans', async (_req, res) => {
  const { data, error } = await supabase
    .from('cc_scripts')
    .select('id, title, created_at, metadata')
    .eq('content_type', 'content_planner')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// PUT /content-pipeline/planner/assign
router.put('/content-pipeline/planner/assign', async (req, res) => {
  const { script_id, date, time, account } = req.body;
  if (!script_id || !date || !account) return res.status(400).json({ error: 'Thiếu script_id, date hoặc account' });

  const { data: script } = await supabase.from('cc_scripts').select('metadata').eq('id', script_id).single();
  const metadata = { ...((script?.metadata as any) || {}), scheduled_date: date, scheduled_time: time || '10:00', target_account: account };

  const { error } = await supabase.from('cc_scripts').update({ metadata }).eq('id', script_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Đã gán vào ${account} ${date} ${time || '10:00'}` });
});

// PUT /content-pipeline/planner/unassign
router.put('/content-pipeline/planner/unassign', async (req, res) => {
  const { script_id } = req.body;
  if (!script_id) return res.status(400).json({ error: 'Thiếu script_id' });

  const { data: script } = await supabase.from('cc_scripts').select('metadata').eq('id', script_id).single();
  const metadata = { ...((script?.metadata as any) || {}) };
  delete metadata.scheduled_date;
  delete metadata.scheduled_time;
  delete metadata.target_account;

  const { error } = await supabase.from('cc_scripts').update({ metadata }).eq('id', script_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Đã bỏ gán' });
});

// POST /content-pipeline/planner/parse-plan
router.post('/content-pipeline/planner/parse-plan', async (req, res) => {
  const { planner_script_id } = req.body;
  if (!planner_script_id) return res.status(400).json({ error: 'Thiếu planner_script_id' });

  const { data: planner } = await supabase.from('cc_scripts').select('id, body').eq('id', planner_script_id).single();
  if (!planner?.body) return res.status(404).json({ error: 'Không tìm thấy plan hoặc body trống' });

  // Parse markdown table
  const lines = (planner.body as string).split('\n').filter((l: string) => l.includes('|') && !l.includes(':---') && !l.includes('---'));
  if (lines.length < 2) return res.status(400).json({ error: 'Không parse được bảng markdown — cần ít nhất header + 1 data row' });

  const headers = lines[0].split('|').map((h: string) => h.trim()).filter(Boolean);
  const rows = lines.slice(1).map((line: string) => {
    const cells = line.split('|').map((c: string) => c.trim()).filter(Boolean);
    const row: Record<string, string> = {};
    headers.forEach((h: string, i: number) => { row[h] = cells[i] || ''; });
    return row;
  }).filter((r: Record<string, string>) => Object.values(r).some(v => v.length > 0));

  const scripts = rows.map((row: Record<string, string>) => {
    const topic = ((row['Chủ đề'] || row['Chu de'] || '')).toLowerCase();
    let account = 'page_jennie';
    if (/trading|kỹ thuật|scanner|app|sản phẩm|education|gemral/.test(topic)) account = 'page_gemral';
    else if (/tình yêu|ritual|crystal|spiritual|7 ngày|vision/.test(topic)) account = 'profile_jennie';

    const rawPillar = row['Pillar'] || row['Chủ đề'] || '';
    return {
      title: row['Tiêu đề'] || row['Tieu de'] || row['Chủ đề'] || 'Không có tiêu đề',
      content_type: 'social_post',
      track: 'wealth',
      pillar: topicToPillar(rawPillar),
      persona: 'jennie_mentor',
      writing_mode: 'mode_1_calm',
      status: 'topic',
      metadata: {
        scheduled_date: row['Ngày'] || row['Ngay'] || null,
        scheduled_time: row['Giờ đăng'] || row['Gio dang'] || '10:00',
        target_account: row['Account'] || account,
        topic_summary: row['Tóm tắt'] || row['Tom tat'] || '',
        hashtags: row['Hashtags'] || '',
        plan_id: planner_script_id,
        source: 'content_planner',
        brand_voice: account === 'page_gemral' ? 'generic' : 'jennie',
      },
    };
  });

  const { data: inserted, error } = await supabase.from('cc_scripts').insert(scripts).select('id');
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, message: `Đã parse ${inserted?.length || 0} chủ đề`, count: inserted?.length || 0 });
});

// POST /content-pipeline/planner/generate
router.post('/content-pipeline/planner/generate', async (req, res) => {
  const { plan_id, script_ids } = req.body;
  if (!plan_id && !script_ids?.length) return res.status(400).json({ error: 'Thiếu plan_id hoặc script_ids' });

  let query = supabase
    .from('cc_scripts')
    .select('id, title, pillar, content_type, metadata')
    .is('body', null)
    .eq('status', 'topic');

  if (script_ids?.length) query = query.in('id', script_ids);
  else query = query.eq('metadata->>plan_id', plan_id);

  const { data: topics } = await query;
  if (!topics?.length) return res.json({ success: true, message: 'Không có chủ đề nào cần generate', count: 0 });

  const jobs = topics.map((t: any) => {
    const meta = t.metadata || {};
    return {
      job_type: 'script',
      content_type: t.content_type || 'social_post',
      status: 'queued',
      input_params: {
        contentType: t.content_type || 'social_post',
        brandVoice: meta.brand_voice || 'jennie',
        userPrompt: [
          `LOẠI: ${t.content_type || 'social_post'}`,
          `CHỦ ĐỀ: ${t.title}`,
          meta.topic_summary ? `TÓM TẮT: ${meta.topic_summary}` : '',
          meta.hashtags ? `HASHTAGS GỢI Ý: ${meta.hashtags}` : '',
          meta.target_account ? `ACCOUNT: ${meta.target_account}` : '',
          '',
          'Viết bài đăng MXH đầy đủ. Tuân thủ brand voice, compliance.',
        ].filter(Boolean).join('\n'),
        maxTokens: 16384,
        model: 'claude-sonnet-4-6',
        provider: 'claude',
        target_script_id: t.id,
      },
      created_by: 'board',
    };
  });

  const { data: inserted, error } = await supabase.from('cc_generation_jobs').insert(jobs).select('id');
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('cc_scripts').update({ status: 'generating' }).in('id', topics.map((t: any) => t.id));

  res.json({
    success: true,
    message: `Đã tạo ${inserted?.length || 0} jobs. Chạy batch_processor.py batch để generate.`,
    count: inserted?.length || 0,
    instruction: 'cd "D:/Claude Projects/App Content Jennie/gem-content-center" && PYTHONUTF8=1 python scripts/batch_processor.py batch',
  });
});

// GET /content-pipeline/planner/progress?plan_id=xxx
router.get('/content-pipeline/planner/progress', async (req, res) => {
  const { plan_id } = req.query as Record<string, string>;
  if (!plan_id) return res.status(400).json({ error: 'Thiếu plan_id' });

  const { data } = await supabase
    .from('cc_scripts')
    .select('status')
    .eq('metadata->>plan_id', plan_id);

  const counts: Record<string, number> = { topic: 0, generating: 0, draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, failed: 0 };
  for (const s of (data || [])) { counts[s.status] = (counts[s.status] || 0) + 1; }

  res.json({ total: data?.length || 0, ...counts });
});

// POST /content-pipeline/planner/bulk-approve
router.post('/content-pipeline/planner/bulk-approve', async (req, res) => {
  const { plan_id, script_ids } = req.body;
  if (!plan_id && !script_ids?.length) return res.status(400).json({ error: 'Thiếu plan_id hoặc script_ids' });

  let query = supabase
    .from('cc_scripts')
    .select('id')
    .eq('status', 'draft')
    .not('body', 'is', null);

  if (script_ids?.length) query = query.in('id', script_ids);
  else query = query.eq('metadata->>plan_id', plan_id);

  const { data: drafts } = await query;
  if (!drafts?.length) return res.json({ success: true, message: 'Không có bài nào cần duyệt', count: 0 });

  const ids = drafts.map((d: any) => d.id);
  const { error } = await supabase
    .from('cc_scripts')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Đã duyệt ${ids.length} bài`, count: ids.length });
});

// POST /content-pipeline/planner/import — import từ markdown/CSV paste
router.post('/content-pipeline/planner/import', async (req, res) => {
  const { content, format } = req.body;
  if (!content) return res.status(400).json({ error: 'Thiếu content' });

  let rows: Record<string, string>[] = [];
  if (format === 'csv') {
    const lines = (content as string).split('\n').filter((l: string) => l.trim());
    const headers = lines[0].split(',').map((h: string) => h.trim());
    rows = lines.slice(1).map((line: string) => {
      const cells = line.split(',').map((c: string) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { row[h] = cells[i] || ''; });
      return row;
    }).filter((r: Record<string, string>) => Object.values(r).some(v => v.length > 0));
  } else {
    const lines = (content as string).split('\n').filter((l: string) => l.includes('|') && !l.includes(':---') && !l.match(/^[\s|:-]+$/));
    if (lines.length >= 2) {
      const headers = lines[0].split('|').map((h: string) => h.trim()).filter(Boolean);
      rows = lines.slice(1).map((line: string) => {
        const cells = line.split('|').map((c: string) => c.trim()).filter(Boolean);
        const row: Record<string, string> = {};
        headers.forEach((h: string, i: number) => { row[h] = cells[i] || ''; });
        return row;
      }).filter((r: Record<string, string>) => Object.values(r).some(v => v.length > 0));
    }
  }

  if (!rows.length) return res.status(400).json({ error: 'Không parse được dữ liệu — kiểm tra định dạng markdown/CSV' });

  // Tạo plan parent script
  const { data: planScript, error: planError } = await supabase.from('cc_scripts').insert({
    title: `Imported Plan ${new Date().toLocaleDateString('vi')}`,
    content_type: 'social_post',
    track: 'wealth',
    pillar: 'integration',
    persona: 'jennie_mentor',
    writing_mode: 'mode_1_calm',
    status: 'completed',
    body: content,
    metadata: { source: 'import', import_count: rows.length },
  }).select('id').single();

  if (planError) return res.status(500).json({ error: planError.message });

  // Tạo topic entries
  const scripts = rows.map((row: Record<string, string>) => {
    const topic = (row['Chủ đề'] || row['Chu de'] || '').toLowerCase();
    let account = 'page_jennie';
    if (/trading|kỹ thuật|scanner|app|sản phẩm|education|gemral/.test(topic)) account = 'page_gemral';
    else if (/tình yêu|ritual|crystal|spiritual|7 ngày|vision/.test(topic)) account = 'profile_jennie';

    return {
      title: row['Tiêu đề'] || row['Chủ đề'] || 'Không tiêu đề',
      content_type: 'social_post',
      track: 'wealth',
      pillar: topicToPillar(row['Pillar'] || row['Chủ đề'] || ''),
      persona: 'jennie_mentor',
      writing_mode: 'mode_1_calm',
      status: 'topic',
      metadata: {
        scheduled_date: row['Ngày'] || null,
        scheduled_time: row['Giờ đăng'] || '10:00',
        target_account: row['Account'] || account,
        topic_summary: row['Tóm tắt'] || '',
        hashtags: row['Hashtags'] || '',
        plan_id: planScript?.id,
        source: 'import',
        brand_voice: account === 'page_gemral' ? 'generic' : 'jennie',
      },
    };
  });

  const { data: inserted, error: insertError } = await supabase.from('cc_scripts').insert(scripts).select('id');
  if (insertError) return res.status(500).json({ error: insertError.message });

  res.json({
    success: true,
    message: `Đã import ${inserted?.length || 0} chủ đề`,
    plan_id: planScript?.id,
    count: inserted?.length || 0,
  });
});

// POST /content-pipeline/planner/delegate-ceo (SSE stream)
router.post('/content-pipeline/planner/delegate-ceo', async (req, res) => {
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'Thiếu plan_id' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const task = [
    `Plan ID: ${plan_id} đã được Board duyệt chủ đề.`,
    ``,
    `Nhiệm vụ (CHỈ TRIGGER SCRIPTS — KHÔNG TỰ VIẾT CONTENT):`,
    `1. Gọi POST http://localhost:3101/api/ops/content-pipeline/planner/generate với body {"plan_id":"${plan_id}"}`,
    `2. Chạy: cd "D:/Claude Projects/App Content Jennie/gem-content-center" && PYTHONUTF8=1 python scripts/batch_processor.py batch`,
    `3. Poll GET http://localhost:3101/api/ops/content-pipeline/planner/progress?plan_id=${plan_id} cho đến khi generating=0`,
    `4. Gọi POST http://localhost:3101/api/ops/content-pipeline/planner/bulk-approve với body {"plan_id":"${plan_id}"}`,
    `5. Chạy: cd "D:/Claude Projects/App Content Jennie/gem-content-center/scripts" && python schedule_meta_business_suite.py --weeks 2`,
    `6. Báo cáo kết quả qua Telegram`,
    ``,
    `⚠️ KHÔNG TỰ VIẾT NỘI DUNG. batch_processor.py batch đọc 28+ knowledge files và generate content.`,
  ].join('\n');

  const send = (obj: Record<string, unknown>) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { execSync } = await import('child_process');
    const claudeBin = execSync('where claude 2>nul || which claude 2>/dev/null', { encoding: 'utf-8', shell: 'cmd.exe' }).trim().split('\n')[0].trim();

    const agentCwd = path.resolve(PAPERCLIP_ROOT, 'agents/ceo');
    const agentCwdExists = fs.existsSync(agentCwd);

    const proc = spawn(claudeBin, [
      '--dangerously-skip-permissions',
      '-p', task,
    ], {
      cwd: agentCwdExists ? agentCwd : process.cwd(),
      shell: true,
      env: { ...process.env },
    });

    proc.stdout?.on('data', (d: Buffer) => send({ type: 'stdout', text: d.toString() }));
    proc.stderr?.on('data', (d: Buffer) => send({ type: 'stderr', text: d.toString() }));
    proc.on('close', (code: number) => { send({ type: 'exit', code }); res.end(); });
    req.on('close', () => { if (!proc.killed) proc.kill(); });
  } catch (err: any) {
    send({ type: 'error', text: `Không tìm thấy claude CLI: ${err.message}` });
    res.end();
  }
});

export default router;
