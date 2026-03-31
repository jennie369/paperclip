// Agent Config CRUD API — manages paperclip_agents table
// Provides endpoints for listing, creating, updating, deleting agent configs
// and testing agent replies via AgentRouter.

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './zalo-personal/supabase.js';
import * as AgentRouter from './router.js';
import type { AgentConfig } from './types.js';

// Agent files directory — crypto-pattern-scanner/agents/
const AGENTS_DIR = path.resolve(process.env.AGENTS_DIR || 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/agents');
const ALLOWED_FILES = ['AGENTS.md', 'HEARTBEAT.md', 'SOUL.md', 'TOOLS.md'];

const router = Router();

/**
 * GET /api/channels/agent-configs
 * List all agents from agents table (Paperclip Core — SSOT).
 */
router.get('/', async (_req, res) => {
  // Query both tables — agents (Paperclip core) + paperclip_agents (Gemral config SSOT)
  const [{ data: coreAgents, error }, { data: gemralConfigs }] = await Promise.all([
    supabase.from('agents').select('*').order('name', { ascending: true }),
    supabase.from('paperclip_agents').select('*'),
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Index paperclip_agents by slug for O(1) lookup
  const paMap = new Map<string, any>();
  for (const pa of (gemralConfigs || [])) {
    paMap.set(pa.slug, pa);
  }

  // Map: use paperclip_agents as SSOT for model/provider/temperature, fallback to agents
  const mapped = (coreAgents || []).map((a: any) => {
    const ac = a.adapter_config || {};
    const pa = paMap.get(a.slug); // Gemral config (SSOT)
    return {
      id: a.id,
      slug: a.slug || a.name?.toLowerCase().replace(/\s+/g, '-'),
      display_name: pa?.display_name || a.name,
      description: pa?.description || a.capabilities,
      avatar: pa?.avatar || a.icon,
      provider: pa?.provider || (a.adapter_type === 'claude_local' ? 'claude' : a.adapter_type === 'gemini_local' ? 'gemini' : 'openrouter'),
      model: pa?.model || ac.model || 'claude-sonnet-4-6',
      temperature: pa?.temperature != null ? parseFloat(pa.temperature) : (parseFloat(ac.temperature) || 0.7),
      max_tokens: parseInt(ac.maxTokens) || 4096,
      system_prompt: pa?.system_prompt || ac.systemPrompt || ac.promptTemplate || null,
      persona_file: ac.instructionsFilePath || null,
      language: pa?.language || ac.language || 'vi',
      tools: pa?.tools || ac.tools || [],
      can_escalate_to: ac.canEscalateTo || [],
      fallback_message: ac.fallbackMessage || '',
      effort_mode: ac.effortMode || ac.thinkingEffort || 'auto',
      max_turns: pa?.max_turns != null ? parseInt(pa.max_turns) : (parseInt(ac.maxTurns) || 1),
      history_limit: parseInt(ac.historyLimit) || 20,
      session_timeout: 3600,
      enabled: pa?.enabled ?? (a.status !== 'paused'),
      // Heartbeat/Paperclip specific fields (from adapter_config)
      chrome: ac.chrome === true || ac.chrome === 'true',
      skip_permissions: ac.dangerouslySkipPermissions === true || ac.dangerouslySkipPermissions === 'true',
      can_create_agents: a.permissions?.canCreateAgents === true,
      max_turns_per_run: parseInt(ac.maxTurnsPerRun) || parseInt(ac.maxTurns) || 1,
      cwd: ac.cwd || null,
      extra_args: Array.isArray(ac.extraArgs) ? ac.extraArgs.join(' ') : (ac.extraArgs || ''),
      created_at: a.created_at,
      updated_at: pa?.updated_at || a.updated_at,
    };
  });

  res.json(mapped);
});

// ─── Agent Sessions (MUST be before /:slug to avoid param capture) ───

/**
 * GET /api/channels/agent-configs/sessions
 * List all agent sessions (joined with paperclip_agents for display_name/avatar).
 */
router.get('/sessions', async (_req, res) => {
  const { data: sessions, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!sessions || sessions.length === 0) {
    return res.json([]);
  }

  // Fetch agent info for display_name / avatar
  const slugs = [...new Set(sessions.map((s: any) => s.agent_slug).filter(Boolean))];
  let agentMap: Record<string, { display_name: string; avatar: string | null; model: string | null; provider: string | null }> = {};

  if (slugs.length > 0) {
    const { data: agents } = await supabase
      .from('paperclip_agents')
      .select('slug, display_name, avatar, model, provider')
      .in('slug', slugs);

    if (agents) {
      for (const a of agents) {
        agentMap[a.slug] = { display_name: a.display_name, avatar: a.avatar, model: a.model, provider: a.provider };
      }
    }
  }

  // Fetch channel info — which channel(s) use each agent
  const { data: channels } = await supabase
    .from('channel_instances')
    .select('name, display_name, agent_slug, status, channel_type')
    .in('agent_slug', slugs);

  const channelMap: Record<string, Array<{ name: string; display_name: string | null; status: string; channel_type: string }>> = {};
  for (const ch of channels || []) {
    if (!ch.agent_slug) continue;
    if (!channelMap[ch.agent_slug]) channelMap[ch.agent_slug] = [];
    channelMap[ch.agent_slug].push({ name: ch.name, display_name: ch.display_name, status: ch.status, channel_type: ch.channel_type });
  }

  const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  const enriched = sessions.map((s: any) => {
    // Auto-detect stale: if status=running but last_activity > 5 min ago, mark as idle
    let effectiveStatus = s.status;
    if (s.status === 'running' && s.last_activity_at) {
      const lastActive = new Date(s.last_activity_at).getTime();
      if (now - lastActive > STALE_THRESHOLD_MS) {
        effectiveStatus = 'idle';
      }
    }

    return {
      ...s,
      status: effectiveStatus,
      display_name: agentMap[s.agent_slug]?.display_name ?? s.agent_slug,
      avatar: agentMap[s.agent_slug]?.avatar ?? null,
      model: agentMap[s.agent_slug]?.model ?? null,
      provider: agentMap[s.agent_slug]?.provider ?? null,
      channels: channelMap[s.agent_slug] || [],
    };
  });

  res.json(enriched);
});

/**
 * POST /api/channels/agent-configs/sessions/clear-all
 * Delete all agent sessions.
 */
router.post('/sessions/clear-all', async (_req, res) => {
  const { error } = await supabase
    .from('agent_sessions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, message: 'All sessions cleared' });
});

/**
 * POST /api/channels/agent-configs/sessions/:slug/clear
 * Delete sessions for a specific agent slug.
 */
router.post('/sessions/:slug/clear', async (req, res) => {
  const { slug } = req.params;

  const { error } = await supabase
    .from('agent_sessions')
    .delete()
    .eq('agent_slug', slug);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, slug });
});

/**
 * GET /api/channels/agent-configs/sessions/activity
 * Recent consumer activity — messages handled by agents.
 */
router.get('/sessions/activity', async (_req, res) => {
  // Fetch recent activity from BOTH pending_messages (inbound handled) and sent_messages (outbound)
  const [{ data: handled }, { data: sent }] = await Promise.all([
    supabase
      .from('channel_pending_messages')
      .select('id, channel_name, thread_id, from_uid, sender_name, body, status, agent_slug, handled_by, handled_at, created_at')
      .not('handled_by', 'is', null)
      .order('handled_at', { ascending: false })
      .limit(30),
    supabase
      .from('channel_sent_messages')
      .select('id, channel_name, thread_id, to_uid, body, status, sent_by, created_at')
      .in('status', ['sent', 'failed', 'archived'])
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  // Fetch channel display names for mapping
  const allChannelNames = new Set<string>();
  for (const m of handled || []) allChannelNames.add(m.channel_name);
  for (const m of sent || []) allChannelNames.add(m.channel_name);

  const channelDisplayMap = new Map<string, string>();
  if (allChannelNames.size > 0) {
    const { data: channels } = await supabase
      .from('channel_instances')
      .select('name, display_name')
      .in('name', [...allChannelNames]);
    for (const ch of channels || []) {
      if (ch.display_name) channelDisplayMap.set(ch.name, ch.display_name);
    }
  }

  // Merge into unified activity log
  const activity = [
    ...(handled || []).map((m: any) => ({
      id: m.id,
      type: 'inbound' as const,
      channel_name: channelDisplayMap.get(m.channel_name) || m.channel_name,
      channel_raw: m.channel_name,
      thread_id: m.thread_id,
      sender_id: m.from_uid,
      sender_name: m.sender_name,
      body: m.body,
      status: m.status === 'handled' ? 'done' : m.status,
      handled_by: m.agent_slug || (m.handled_by !== 'consumer' ? m.handled_by : null) || 'skipped',
      handled_at: m.handled_at || m.created_at,
      message: m.body?.substring(0, 100),
    })),
    ...(sent || []).map((m: any) => ({
      id: m.id,
      type: 'outbound' as const,
      channel_name: channelDisplayMap.get(m.channel_name) || m.channel_name,
      channel_raw: m.channel_name,
      thread_id: m.thread_id,
      sender_id: m.to_uid,
      sender_name: m.sent_by !== 'manual' ? `Agent: ${m.sent_by}` : 'Manual',
      body: m.body,
      status: m.status === 'sent' ? 'done' : m.status,
      handled_by: m.sent_by,
      handled_at: m.created_at,
      message: m.body?.substring(0, 100),
    })),
  ].sort((a, b) => (b.handled_at || '').localeCompare(a.handled_at || ''))
   .slice(0, 50);

  res.json(activity);
});

// ─── Single Agent CRUD (/:slug routes) ──────────────────────────────

/**
 * GET /api/channels/agent-configs/:slug
 * Get a single agent by slug — reads from agents table (SSOT).
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  // Query both tables — agents (core) + paperclip_agents (SSOT for model/provider)
  const [{ data, error }, { data: pa }] = await Promise.all([
    supabase.from('agents').select('*').eq('slug', slug).single(),
    supabase.from('paperclip_agents').select('*').eq('slug', slug).single(),
  ]);

  if (error || !data) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Map: paperclip_agents as SSOT for model/provider/temperature
  const ac = data.adapter_config || {};
  res.json({
    id: data.id,
    slug: data.slug,
    display_name: pa?.display_name || data.name,
    description: pa?.description || data.capabilities,
    avatar: pa?.avatar || data.icon,
    provider: pa?.provider || (data.adapter_type === 'claude_local' ? 'claude' : data.adapter_type === 'gemini_local' ? 'gemini' : 'openrouter'),
    model: pa?.model || ac.model || 'claude-sonnet-4-6',
    temperature: pa?.temperature != null ? parseFloat(pa.temperature) : (parseFloat(ac.temperature) || 0.7),
    max_tokens: parseInt(ac.maxTokens) || 4096,
    system_prompt: pa?.system_prompt || ac.systemPrompt || ac.promptTemplate || null,
    persona_file: ac.instructionsFilePath || null,
    language: pa?.language || ac.language || 'vi',
    tools: pa?.tools || ac.tools || [],
    can_escalate_to: ac.canEscalateTo || [],
    fallback_message: ac.fallbackMessage || '',
    effort_mode: ac.effortMode || ac.thinkingEffort || 'auto',
    max_turns: pa?.max_turns != null ? parseInt(pa.max_turns) : (parseInt(ac.maxTurns) || 1),
    history_limit: parseInt(ac.historyLimit) || 20,
    session_timeout: 3600,
    enabled: pa?.enabled ?? (data.status !== 'paused'),
    chrome: ac.chrome === true || ac.chrome === 'true',
    skip_permissions: ac.dangerouslySkipPermissions === true || ac.dangerouslySkipPermissions === 'true',
    can_create_agents: data.permissions?.canCreateAgents === true,
    max_turns_per_run: parseInt(ac.maxTurnsPerRun) || parseInt(ac.maxTurns) || 1,
    cwd: ac.cwd || null,
    extra_args: Array.isArray(ac.extraArgs) ? ac.extraArgs.join(' ') : (ac.extraArgs || ''),
    created_at: data.created_at,
    updated_at: pa?.updated_at || data.updated_at,
  });
});

/**
 * POST /api/channels/agent-configs
 * Create a new agent.
 */
router.post('/', async (req, res) => {
  const {
    slug,
    display_name,
    description,
    avatar,
    provider,
    model,
    temperature,
    max_tokens,
    system_prompt,
    persona_file,
    language,
    tools,
    can_escalate_to,
    fallback_message,
    history_limit,
    session_timeout,
    enabled,
  } = req.body;

  if (!slug || !display_name) {
    return res.status(400).json({ error: 'slug and display_name are required' });
  }

  // Check for duplicate slug
  const { data: existing } = await supabase
    .from('paperclip_agents')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return res.status(409).json({ error: `Agent with slug "${slug}" already exists` });
  }

  const { data, error } = await supabase
    .from('paperclip_agents')
    .insert({
      slug,
      display_name,
      description: description || null,
      avatar: avatar || null,
      provider: provider || 'claude',
      model: model || 'claude-sonnet-4-6',
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 4096,
      system_prompt: system_prompt || null,
      persona_file: persona_file || null,
      language: language || 'vi',
      tools: tools || [],
      can_escalate_to: can_escalate_to || [],
      fallback_message: fallback_message || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
      history_limit: history_limit ?? 20,
      session_timeout: session_timeout ?? 3600,
      enabled: enabled ?? true,
    })
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Auto-create agent directory + default files on disk (full Paperclip template)
  const agentDir = path.join(AGENTS_DIR, slug);
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });

    const escalateTo = (can_escalate_to || ['ceo']).join(', ');
    const today = new Date().toISOString().split('T')[0];

    // SOUL.md — full persona template
    fs.writeFileSync(path.join(agentDir, 'SOUL.md'), `# SOUL.md — ${display_name}

## Identity (🔒 IMMUTABLE)
- Name: ${display_name}
- Role: ${description || display_name}
- Mission: [Mô tả sứ mệnh cụ thể của agent]
- Reports to: ${escalateTo}
- Company: Gemral

## Strategic Posture (🔒 IMMUTABLE)

- [Định hướng chiến lược #1]
- [Định hướng chiến lược #2]
- [Định hướng chiến lược #3]

## Communication Style (✏️ AGENT TỰ SỬA ĐƯỢC)

- Tiếng Việt 100%, có dấu đầy đủ
- Xưng "mình", gọi "bạn" hoặc "anh/chị"
- Ngắn gọn, rõ ràng, không vòng vo
- Không dùng markdown formatting trong chat (chỉ text thuần)
- Conversational — như nói chuyện với bạn, không như robot

## Preferences (✏️ AGENT TỰ SỬA ĐƯỢC)

- [Thời gian hoạt động ưu tiên]
- [Workflow ưu tiên]

## Lessons (✏️ AGENT TỰ SỬA ĐƯỢC)

- ${today}: Initial SOUL.md created
`, 'utf-8');

    // AGENTS.md — operating instructions template
    fs.writeFileSync(path.join(agentDir, 'AGENTS.md'), `You are the ${display_name}.

## ⚠️ INFORMATION PRIORITY ORDER (Bắt buộc)

\`\`\`
1. SOP (memory/sops/) — Quy trình chính thức, SSOT cho workflow
2. Skills (skills-store/) — Reusable workflows đã được verify
3. Memory (memory/agents/*/MEMORY.md) — Ghi chú cá nhân, có thể outdated
\`\`\`

Khi SOP và Memory xung đột → LUÔN theo SOP, cập nhật Memory ngay.

### Daily End-of-Day Audit (Bắt buộc)

Cuối mỗi ngày làm việc, agent PHẢI:
1. Đọc lại SOP liên quan đến tasks đã làm hôm nay
2. So sánh với Memory cá nhân — tìm xung đột
3. Nếu có xung đột: cập nhật Memory, KHÔNG xóa entry cũ, ghi thêm [DEPRECATED] + lý do
4. Ghi kết quả audit vào daily notes

## Role & Mission

${description || `Bạn là ${display_name} của Gemral. [Mô tả chi tiết vai trò và nhiệm vụ].`}

## Products Knowledge

### Khóa học
- Kích Hoạt Tần Số Tình Yêu: ₫399,000
- Tái Tạo Tư Duy Triệu Phú: ₫499,000
- 7 Ngày Khai Mở Tần Số Gốc: ₫1,999,000
- Starter Trading: ₫299,000
- Tier 1/2/3 Scanner: ₫11M / ₫21M / ₫30M

### Crystal (Yinyang Masters)
- Đá tự nhiên 100%, tịnh hóa bởi Dr. Jennie Uyên Chu
- Shop: yinyangmasters.com

### App GEM
- Scanner 24+ patterns, Forum, Khóa học online
- Download: App Store / Google Play

## Tone & Voice

- Tiếng Việt 100%, có dấu đầy đủ
- Confident nhưng không kiêu ngạo
- Empathy trước, action sau
- Dùng emoji có chọn lọc

## Escalation

- Có thể escalate tới: ${escalateTo}
- Nếu không biết → nói thật, đề nghị chuyển cho người phụ trách

## Memory System

ALL memory writes go to project \`memory/\` folder:
- Daily notes: \`memory/agents/${slug}/daily/YYYY-MM-DD.md\`
- Tacit knowledge: \`memory/agents/${slug}/MEMORY.md\`
- Full rules: \`memory/INDEX.md\`

## References

- \`agents/${slug}/SOUL.md\` — persona
- \`agents/${slug}/TOOLS.md\` — available tools
- \`docs/IMPORTANT_LINKS.md\` — CTAs and landing pages
`, 'utf-8');

    // TOOLS.md — tools template
    fs.writeFileSync(path.join(agentDir, 'TOOLS.md'), `# TOOLS.md — ${display_name}

## Skills
- **paperclip** — Paperclip coordination
- **para-memory-files** — Memory system

## Tools
- Bash (scripts, API calls)
- Read/Write/Edit (file operations)
- Supabase MCP (data queries)

## Key Resources
- \`docs/IMPORTANT_LINKS.md\` — landing pages, CTAs
- \`memory/sops/\` — standard operating procedures
`, 'utf-8');

    console.log(`[AgentConfig] Created agent directory with full Paperclip template: ${agentDir}`);
  }

  res.status(201).json(data);
});

/**
 * PATCH /api/channels/agent-configs/:slug
 * Update an existing agent — writes to agents table (SSOT).
 */
router.patch('/:slug', async (req, res) => {
  const { slug } = req.params;

  // First get current agent to merge adapter_config
  const { data: current } = await supabase
    .from('agents')
    .select('adapter_config')
    .eq('slug', slug)
    .single();

  if (!current) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const currentAc = (current.adapter_config || {}) as Record<string, any>;

  // Build updates for agents table
  const agentUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  const acUpdates: Record<string, any> = { ...currentAc };

  // Map incoming fields to agents table columns + adapter_config
  if (req.body.display_name !== undefined) agentUpdates.name = req.body.display_name;
  if (req.body.description !== undefined) agentUpdates.capabilities = req.body.description;
  if (req.body.avatar !== undefined) agentUpdates.icon = req.body.avatar;
  if (req.body.enabled !== undefined) agentUpdates.status = req.body.enabled ? 'idle' : 'paused';
  if (req.body.provider !== undefined) {
    agentUpdates.adapter_type = req.body.provider === 'claude' ? 'claude_local' : req.body.provider === 'gemini' ? 'gemini_local' : req.body.provider;
  }

  // adapter_config fields
  if (req.body.model !== undefined) acUpdates.model = req.body.model;
  if (req.body.temperature !== undefined) acUpdates.temperature = req.body.temperature;
  if (req.body.max_tokens !== undefined) acUpdates.maxTokens = req.body.max_tokens;
  if (req.body.system_prompt !== undefined) acUpdates.systemPrompt = req.body.system_prompt;
  if (req.body.effort_mode !== undefined) acUpdates.effortMode = req.body.effort_mode;
  if (req.body.max_turns !== undefined) acUpdates.maxTurns = req.body.max_turns;
  if (req.body.language !== undefined) acUpdates.language = req.body.language;
  if (req.body.can_escalate_to !== undefined) acUpdates.canEscalateTo = req.body.can_escalate_to;
  if (req.body.fallback_message !== undefined) acUpdates.fallbackMessage = req.body.fallback_message;
  if (req.body.history_limit !== undefined) acUpdates.historyLimit = req.body.history_limit;
  if (req.body.tools !== undefined) acUpdates.tools = req.body.tools;

  agentUpdates.adapter_config = acUpdates;

  const { data, error } = await supabase
    .from('agents')
    .update(agentUpdates)
    .eq('slug', slug)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Sync to paperclip_agents (SSOT for model/provider/temperature)
  const paUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (req.body.display_name !== undefined) paUpdates.display_name = req.body.display_name;
  if (req.body.description !== undefined) paUpdates.description = req.body.description;
  if (req.body.avatar !== undefined) paUpdates.avatar = req.body.avatar;
  if (req.body.provider !== undefined) paUpdates.provider = req.body.provider;
  if (req.body.model !== undefined) paUpdates.model = req.body.model;
  if (req.body.temperature !== undefined) paUpdates.temperature = parseFloat(req.body.temperature);
  if (req.body.system_prompt !== undefined) paUpdates.system_prompt = req.body.system_prompt;
  if (req.body.language !== undefined) paUpdates.language = req.body.language;
  if (req.body.tools !== undefined) paUpdates.tools = req.body.tools;
  if (req.body.max_turns !== undefined) paUpdates.max_turns = parseInt(req.body.max_turns);
  if (req.body.enabled !== undefined) paUpdates.enabled = req.body.enabled;

  try { await supabase.from('paperclip_agents').update(paUpdates).eq('slug', slug); } catch {}

  // Clear router cache since agent config changed
  AgentRouter.clearAgentCache();

  res.json(data);
});

/**
 * DELETE /api/channels/agent-configs/:slug
 * Delete an agent (with channel usage check).
 */
/**
 * POST /api/channels/agent-configs/:slug/clone
 * Clone an existing agent with a new slug.
 */
router.post('/:slug/clone', async (req, res) => {
  const { slug } = req.params;

  // Get original agent from both tables
  const { data: original } = await supabase.from('agents').select('*').eq('slug', slug).single();
  const { data: pa } = await supabase.from('paperclip_agents').select('*').eq('slug', slug).single();

  if (!original) return res.status(404).json({ error: 'Agent không tìm thấy' });

  const newSlug = `${slug}-copy-${Date.now().toString(36).slice(-4)}`;

  // Clone in agents table
  const { id: _id, created_at: _ca, ...agentClone } = original;
  const { data: newAgent, error: err1 } = await supabase.from('agents').insert({
    ...agentClone,
    slug: newSlug,
    name: `${original.name} (Bản sao)`,
    status: 'paused',
    updated_at: new Date().toISOString(),
  }).select().single();

  if (err1) return res.status(500).json({ error: err1.message });

  // Clone in paperclip_agents table
  if (pa) {
    const { id: _pid, created_at: _pca, ...paClone } = pa;
    await supabase.from('paperclip_agents').insert({
      ...paClone,
      slug: newSlug,
      display_name: `${pa.display_name} (Bản sao)`,
      enabled: false,
      updated_at: new Date().toISOString(),
    });
  }

  // Clone agent directory on disk
  const srcDir = path.join(AGENTS_DIR, slug);
  const destDir = path.join(AGENTS_DIR, newSlug);
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, { recursive: true });
  }

  AgentRouter.clearAgentCache();
  res.json({ slug: newSlug, ...newAgent });
});

router.delete('/:slug', async (req, res) => {
  const { slug } = req.params;

  // Check if any channel instances reference this agent
  const { data: usages } = await supabase
    .from('channel_instances')
    .select('name, display_name')
    .eq('agent_slug', slug);

  if (usages && usages.length > 0) {
    const channelNames = usages.map((u: any) => u.display_name || u.name).join(', ');
    return res.status(409).json({
      error: `Agent đang được sử dụng bởi ${usages.length} kênh: ${channelNames}. Hãy gỡ agent khỏi các kênh trước khi xóa.`,
      channels: usages,
    });
  }

  // Delete from BOTH tables
  const { error: paErr } = await supabase.from('paperclip_agents').delete().eq('slug', slug);
  const { error: agErr } = await supabase.from('agents').delete().eq('slug', slug);

  if (paErr && agErr) {
    return res.status(500).json({ error: paErr.message || agErr.message });
  }

  // Also remove agent directory from disk
  const agentDir = path.join(AGENTS_DIR, slug);
  if (fs.existsSync(agentDir)) {
    fs.rmSync(agentDir, { recursive: true, force: true });
    console.log(`[AgentConfig] Deleted agent directory: ${agentDir}`);
  }

  // Clear router cache
  AgentRouter.clearAgentCache();

  res.json({ success: true });
});

/**
 * POST /api/channels/agent-configs/:slug/test
 * Test an agent reply. Sends a message and returns the agent's response.
 * Body: { message: string }
 */
router.post('/:slug/test', async (req, res) => {
  const { slug } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Load agent config
  const { data: config } = await supabase
    .from('paperclip_agents')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!config) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const startTime = Date.now();

  try {
    const sessionKey = `test:${slug}:${Date.now()}`;
    const reply = await AgentRouter.runAgentWithConfig(
      config as AgentConfig,
      sessionKey,
      message,
    );

    const duration = Date.now() - startTime;

    res.json({
      reply,
      agent: slug,
      provider: config.provider,
      model: config.model,
      duration_ms: duration,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    res.status(500).json({
      error: err.message || 'Agent test failed',
      duration_ms: duration,
    });
  }
});

/**
 * GET /api/channels/agent-configs/:slug/files
 * List agent files (AGENTS.md, HEARTBEAT.md, SOUL.md, TOOLS.md)
 */
router.get('/:slug/files', (req, res) => {
  const { slug } = req.params;
  const agentDir = path.join(AGENTS_DIR, slug);

  if (!fs.existsSync(agentDir)) {
    return res.json({ files: ALLOWED_FILES.map(name => ({ name, missing: true, size: 0, content: '' })) });
  }

  const files = ALLOWED_FILES.map(name => {
    const filePath = path.join(agentDir, name);
    const exists = fs.existsSync(filePath);
    if (!exists) return { name, missing: true, size: 0, content: '' };

    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      name,
      missing: false,
      size: stat.size,
      content,
      updatedAt: stat.mtime.toISOString(),
    };
  });

  res.json({ files, agentDir });
});

/**
 * GET /api/channels/agent-configs/:slug/files/:fileName
 * Read a single agent file
 */
router.get('/:slug/files/:fileName', (req, res) => {
  const { slug, fileName } = req.params;

  if (!ALLOWED_FILES.includes(fileName)) {
    return res.status(400).json({ error: `File không cho phép: ${fileName}` });
  }

  const filePath = path.join(AGENTS_DIR, slug, fileName);
  if (!fs.existsSync(filePath)) {
    return res.json({ name: fileName, missing: true, content: '' });
  }

  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  res.json({ name: fileName, missing: false, size: stat.size, content, updatedAt: stat.mtime.toISOString() });
});

/**
 * PUT /api/channels/agent-configs/:slug/files/:fileName
 * Write/update an agent file
 */
router.put('/:slug/files/:fileName', (req, res) => {
  const { slug, fileName } = req.params;
  const { content } = req.body;

  if (!ALLOWED_FILES.includes(fileName)) {
    return res.status(400).json({ error: `File không cho phép: ${fileName}` });
  }

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content là bắt buộc' });
  }

  const agentDir = path.join(AGENTS_DIR, slug);
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  const filePath = path.join(agentDir, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');

  const stat = fs.statSync(filePath);
  res.json({ name: fileName, missing: false, size: stat.size, updatedAt: stat.mtime.toISOString() });
});

export default router;
