// Channel-Agent Auto-Reply — Agent Router
// Resolves which agent handles a message, loads config from paperclip_agents,
// and routes to the correct LLM provider (Claude CLI, Gemini CLI, OpenRouter API).

import { execSync, execFileSync, spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve as pathResolve, join as pathJoin } from 'node:path';
import { EventEmitter } from 'node:events';
import { supabase } from './zalo-personal/supabase.js';
import type { InboundMessage, SessionMessage, AgentConfig } from './types.js';

// Global event emitter for streaming events
export const streamEvents = new EventEmitter();
streamEvents.setMaxListeners(100);

const AGENT_TIMEOUT_MS = 60_000; // 60 seconds
const DEFAULT_AGENT = 'customer-success';
const FALLBACK_REPLY = 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.';

// Cache channel → agent slug mapping for 60s
const agentCache = new Map<string, { slug: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

// Cache agent configs for 60s
const configCache = new Map<string, { config: AgentConfig; expiresAt: number }>();
const CONFIG_CACHE_TTL_MS = 60_000;

// ─── Public API ───

/**
 * Resolve which agent should handle a message based on channel config.
 */
/**
 * 3-tier smart routing:
 *   Tier 1: IGNORED CHATS — skip entirely (returns '' with skip reason)
 *   Tier 2: CUSTOMER-SPECIFIC AGENT — override per sender/chat
 *   Tier 3: CHANNEL DEFAULT — agent assigned to channel
 */
export async function resolveAgent(msg: InboundMessage): Promise<string> {
  // ── Tier 1: Check ignored chats ──
  const { data: ignored } = await supabase
    .from('chat_ignored')
    .select('id')
    .or(`chat_id.eq.${msg.chatId},chat_id.eq.${msg.senderId}`)
    .limit(1);

  if (ignored && ignored.length > 0) {
    (msg as any)._skipReason = 'ignored_chat';
    return '';
  }

  // ── Tier 2: Customer-specific agent override ──
  const { data: overrides } = await supabase
    .from('chat_agent_overrides')
    .select('agent_slug, action')
    .eq('is_active', true)
    .or(`and(match_type.eq.sender_id,match_value.eq.${msg.senderId}),and(match_type.eq.chat_id,match_value.eq.${msg.chatId})`)
    .order('priority', { ascending: false })
    .limit(1);

  if (overrides && overrides.length > 0) {
    const ov = overrides[0];
    if (ov.action === 'ignore') {
      (msg as any)._skipReason = 'override_ignore';
      return '';
    }
    if (ov.agent_slug) {
      (msg as any)._routeTier = 'override';
      return ov.agent_slug;
    }
  }

  // ── Tier 3: Channel default agent ──
  const cacheKey = msg.channel;
  const cached = agentCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  const { data: instance } = await supabase
    .from('channel_instances')
    .select('agent_slug')
    .eq('name', msg.channel)
    .single();

  const slug = instance?.agent_slug || '';

  agentCache.set(cacheKey, {
    slug,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return slug;
}

/**
 * Load agent config from agents table (Paperclip Core — SSOT).
 * Maps agents table fields to AgentConfig interface.
 */
export async function loadAgentConfig(slug: string): Promise<AgentConfig | null> {
  const cached = configCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  // Query both: agents (core) + paperclip_agents (SSOT for model/provider/temperature)
  const [{ data, error }, { data: pa }] = await Promise.all([
    supabase.from('agents').select('*').eq('slug', slug).single(),
    supabase.from('paperclip_agents').select('*').eq('slug', slug).single(),
  ]);

  if (error || !data) {
    console.warn(`[Router] Agent config not found for slug: ${slug}`);
    return null;
  }

  const ac = (data.adapter_config || {}) as Record<string, any>;

  // Map: paperclip_agents is SSOT for model/provider/temperature
  const config: AgentConfig = {
    id: data.id,
    slug: data.slug || slug,
    display_name: pa?.display_name || data.name,
    description: pa?.description || data.capabilities || null,
    avatar: pa?.avatar || data.icon || null,
    provider: (pa?.provider || (data.adapter_type === 'claude_local' ? 'claude' : data.adapter_type === 'gemini_local' ? 'gemini' : 'openrouter')) as any,
    model: pa?.model || ac.model || 'claude-sonnet-4-6',
    temperature: pa?.temperature != null ? parseFloat(pa.temperature) : (parseFloat(ac.temperature) || 0.7),
    max_tokens: parseInt(ac.maxTokens) || 4096,
    system_prompt: pa?.system_prompt || ac.systemPrompt || ac.promptTemplate || null,
    persona_file: ac.instructionsFilePath || null,
    language: pa?.language || ac.language || 'vi',
    tools: pa?.tools || ac.tools || [],
    can_escalate_to: ac.canEscalateTo || [],
    fallback_message: ac.fallbackMessage || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
    effort_mode: ac.effortMode || ac.thinkingEffort || 'auto',
    max_turns: pa?.max_turns != null ? parseInt(pa.max_turns) : (parseInt(ac.maxTurns) || 1),
    history_limit: parseInt(ac.historyLimit) || 20,
    session_timeout: 3600,
    enabled: pa?.enabled ?? (data.status !== 'paused'),
    created_at: data.created_at,
    updated_at: pa?.updated_at || data.updated_at,
  };

  configCache.set(slug, {
    config,
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
  });

  return config;
}

/**
 * Run an agent: resolve config, load history, execute, save history.
 */
export async function runAgent(
  agentSlug: string,
  sessionKey: string,
  message: string,
  originalMsg: InboundMessage,
  history?: SessionMessage[],
): Promise<string> {
  try {
    const config = await loadAgentConfig(agentSlug);

    if (!config) {
      // Fallback to old Claude CLI behavior for unknown agents
      console.warn(`[Router] ❌ No config for agent "${agentSlug}" — returning fallback reply`);
      return FALLBACK_REPLY;
    }

    if (!config.enabled) {
      return config.fallback_message || FALLBACK_REPLY;
    }

    // NOTE: session status is updated ONLY on successful completion
    // via increment_agent_usage RPC (which sets last_activity_at = NOW())

    // Load history from session if not provided
    const sessionHistory = history || await loadHistory(sessionKey, config.history_limit);

    const reply = await runAgentWithConfig(config, sessionKey, message, sessionHistory);

    // Save history
    await saveHistory(sessionKey, message, reply, config);

    return reply;
  } catch (err: any) {
    console.error(`[Router] ❌ Agent "${agentSlug}" failed:`, err.message);
    return FALLBACK_REPLY;
  }
}

/**
 * Run an agent with a specific config — main entry point.
 * Used by both the consumer pipeline and the /test endpoint.
 */
export async function runAgentWithConfig(
  config: AgentConfig,
  sessionKey: string,
  message: string,
  history?: SessionMessage[],
): Promise<string> {
  const systemPrompt = buildSystemPrompt(config);
  const chatHistory = history || [];

  try {
    let reply: string;

    switch (config.provider) {
      case 'claude':
        reply = await runViaClaude(config, systemPrompt, chatHistory, message);
        break;
      case 'gemini':
        reply = runViaGemini(config, systemPrompt, chatHistory, message);
        break;
      case 'openrouter':
        reply = await runViaOpenRouter(config, systemPrompt, chatHistory, message);
        break;
      default:
        console.warn(`[Router] Unknown provider: ${config.provider}, falling back to Claude`);
        reply = await runViaClaude(config, systemPrompt, chatHistory, message);
    }

    return reply.trim() || config.fallback_message || FALLBACK_REPLY;
  } catch (err: any) {
    console.error(`[Router] Provider ${config.provider} failed for ${config.slug}:`, err.message);
    return config.fallback_message || FALLBACK_REPLY;
  }
}

/**
 * Clear the agent cache (e.g., after config change).
 */
export function clearAgentCache(): void {
  agentCache.clear();
  configCache.clear();
}

// ─── Provider implementations ───

/**
 * Run via Claude CLI with PERSISTENT SESSION.
 * First call: claude -p "..." → creates session → save sessionId to DB
 * Subsequent: claude --resume {sessionId} -p "..." → continues session
 */
async function runViaClaude(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): Promise<string> {
  // Check for existing persistent session
  const sessionId = await getAgentSessionId(config.slug);

  // Build prompt — include system prompt only on first message (no session yet)
  let prompt: string;
  if (!sessionId && systemPrompt) {
    // First message — include full system prompt + context
    prompt = [
      `[VAI TRÒ CỦA BẠN]`,
      systemPrompt,
      ``,
      `[QUY TẮC]`,
      `- Trả lời ngắn gọn, thân thiện, tiếng Việt có dấu`,
      `- KHÔNG xưng là Jennie — bạn là ${config.display_name} của Gemral`,
      `- Nếu không biết → nói thật, đề nghị chuyển cho người phụ trách`,
      `- Đây là tin nhắn từ khách hàng qua Zalo, trả lời trực tiếp`,
      ``,
      `[TIN NHẮN TỪ KHÁCH HÀNG]`,
      message,
    ].join('\n');
  } else {
    // Resume session — just the new message
    prompt = `[TIN NHẮN MỚI TỪ KHÁCH HÀNG]\n${message}`;
  }

  const args: string[] = [];

  if (sessionId) {
    args.push('--resume', sessionId);
    console.log(`[Router] Resuming session ${sessionId.substring(0, 8)}... for ${config.slug}`);
  }

  // Set model from agent config (e.g., haiku for cost savings)
  if (config.model) {
    args.push('--model', config.model);
  }

  // Max turns from config (default 1 for chat, higher for agentic tasks)
  const maxTurns = (config as any).max_turns || 1;

  // Use JSON output to capture session_id + result text
  args.push(
    '--output-format', 'json',
    '--max-turns', String(maxTurns),
    '--dangerously-skip-permissions',
  );

  // Run Claude from the agent's directory (so it loads CLAUDE.md, SOUL.md, etc.)
  const agentDir = pathResolve(
    process.env.AGENTS_DIR || 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/agents',
    config.slug
  );
  const cwd = existsSync(agentDir) ? agentDir : process.cwd();

  // Add MCP config if agent has mcp.json
  const mcpConfigPath = pathJoin(agentDir, 'mcp.json');
  if (existsSync(mcpConfigPath)) {
    args.push('--mcp-config', mcpConfigPath);
    console.log(`[Router] MCP config loaded for ${config.slug}: ${mcpConfigPath}`);
  }

  args.push('-p', prompt);

  // Use spawn for streaming output
  const streamKey = `${config.slug}:${Date.now()}`;
  streamEvents.emit('agent:start', { agentSlug: config.slug, streamKey });

  return new Promise<string>((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd,
      env: {
        ...process.env,
        // Ensure MCP server child processes get required env vars
        GEMRAL_SUPABASE_URL: process.env.GEMRAL_SUPABASE_URL || '',
        GEMRAL_SUPABASE_SERVICE_KEY: process.env.GEMRAL_SUPABASE_SERVICE_KEY || '',
        SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL || '',
        SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',
        RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Claude CLI timed out for ${config.slug}`));
    }, AGENT_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdout += text;

      // Emit streaming event for SSE clients
      streamEvents.emit('agent:chunk', {
        agentSlug: config.slug,
        streamKey,
        chunk: text,
        partial: stdout,
      });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('close', async (code) => {
      clearTimeout(timeout);

      if (code !== 0 && !stdout.trim()) {
        console.error(`[Router] Claude CLI exited ${code}: ${stderr.substring(0, 200)}`);
        if (sessionId && (stderr.includes('session') || stderr.includes('resume'))) {
          console.log(`[Router] Clearing stale session for ${config.slug}`);
          await clearAgentSession(config.slug);
        }
        streamEvents.emit('agent:error', { agentSlug: config.slug, streamKey, error: stderr.substring(0, 200) });
        reject(new Error(stderr.substring(0, 200) || `Exit code ${code}`));
        return;
      }

      // Parse JSON output to get reply text + session_id
      let reply = '';
      try {
        const rawStr = stdout.trim();
        console.log(`[Router] Claude raw output (first 200): ${rawStr.substring(0, 200)}`);
        const parsed = JSON.parse(rawStr);

        if (typeof parsed.result === 'string') {
          reply = parsed.result;
        } else if (Array.isArray(parsed.result)) {
          reply = parsed.result
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n');
        } else {
          reply = String(parsed.result || '');
        }

        // Save session ID for future --resume
        if (parsed.session_id && !sessionId) {
          await saveAgentSession(config.slug, parsed.session_id);
        }

        // Log token usage
        const cost = parsed.total_cost_usd || 0;
        const inputTokens = parsed.usage?.input_tokens || 0;
        const outputTokens = parsed.usage?.output_tokens || 0;
        const cacheRead = parsed.usage?.cache_read_input_tokens || 0;
        const duration = parsed.duration_ms || 0;
        console.log(`[Router] ${config.slug}: ${inputTokens}+${cacheRead} in / ${outputTokens} out / $${cost.toFixed(4)} / ${duration}ms`);

        await supabase.rpc('increment_agent_usage', {
          p_slug: config.slug,
          p_input: inputTokens + cacheRead,
          p_output: outputTokens,
          p_cost: cost,
          p_duration: duration,
        }).then(() => {
          console.log(`[Router] Usage tracked for ${config.slug}`);
        }).catch((rpcErr: any) => {
          console.warn(`[Router] increment_agent_usage RPC failed: ${rpcErr?.message}`);
        });
      } catch {
        console.warn('[Router] JSON parse failed, using raw output');
        reply = stdout.trim();
      }

      // NOTE: last_activity_at is already updated by increment_agent_usage RPC
      // Do NOT call updateAgentSessionActivity here — it causes phantom updates

      // Emit completion event
      streamEvents.emit('agent:done', { agentSlug: config.slug, streamKey, reply });
      resolve(reply);
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      streamEvents.emit('agent:error', { agentSlug: config.slug, streamKey, error: err.message });
      reject(err);
    });
  });
}

// ─── Persistent session DB helpers ───

async function getAgentSessionId(slug: string): Promise<string | null> {
  // Find ANY existing session (running OR idle) — session files persist on disk
  const { data } = await supabase
    .from('agent_sessions')
    .select('session_id')
    .eq('agent_slug', slug)
    .in('status', ['running', 'idle'])
    .single();
  return data?.session_id || null;
}

async function saveAgentSession(slug: string, sessionId: string): Promise<void> {
  await supabase.from('agent_sessions').upsert({
    agent_slug: slug,
    session_id: sessionId,
    status: 'running',
    started_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    terminal_type: 'direct',
    total_requests: 1,
  }, { onConflict: 'agent_slug' });
  console.log(`[Router] Session saved: ${slug} → ${sessionId.substring(0, 20)}...`);
}

/** Mark session as actively running — ONLY called by increment_agent_usage RPC now */
async function markSessionRunning(_slug: string): Promise<void> {
  // DISABLED — use increment_agent_usage RPC only
  return;
}

async function updateAgentSessionActivity(_slug: string): Promise<void> {
  // DISABLED — phantom update source. Only increment_agent_usage RPC should update last_activity_at.
  return;
}

async function clearAgentSession(slug: string): Promise<void> {
  await supabase.from('agent_sessions')
    .update({ status: 'stopped' })
    .eq('agent_slug', slug);
}

/**
 * Run via Gemini CLI (execSync).
 * Uses: gemini -p '...' -m {model}
 */
function runViaGemini(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): string {
  const fullPrompt = systemPrompt
    ? `[System Instructions]\n${systemPrompt}\n\n${buildFullPrompt(history, message)}`
    : buildFullPrompt(history, message);

  const model = config.model || 'gemini-2.5-flash';

  try {
    const result = execSync(
      `gemini -p "${fullPrompt.replace(/"/g, '\\"')}" -m ${model}`,
      {
        timeout: AGENT_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        env: { ...process.env },
      } as any,
    );

    return (result as string).trim();
  } catch (err: any) {
    if (err.killed) {
      console.warn(`[Router] Gemini CLI timed out for agent ${config.slug}`);
    } else {
      console.error(`[Router] Gemini CLI error:`, err.message);
    }
    throw err;
  }
}

/**
 * Run via OpenRouter API (fetch).
 * Uses OPENROUTER_API_KEY from env.
 */
async function runViaOpenRouter(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Add history
  for (const entry of history) {
    messages.push({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: entry.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gemral.com',
        'X-Title': 'Paperclip Agent',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${body}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || '';
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Helpers ───

/**
 * Build system prompt from config.
 * Priority: system_prompt > persona_file content > generic fallback
 */
function buildSystemPrompt(config: AgentConfig): string {
  const projectRoot = process.env.PROJECT_ROOT || 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner';
  const agentsDir = pathResolve(
    process.env.AGENTS_DIR || pathResolve(projectRoot, 'agents'),
    config.slug,
  );

  const parts: string[] = [];
  const loadedFiles: string[] = [];

  function tryLoad(filePath: string, header: string): void {
    if (existsSync(filePath)) {
      parts.push(`# ${header}\n` + readFileSync(filePath, 'utf-8'));
      loadedFiles.push(header);
    }
  }

  // 1. Agent persona files
  tryLoad(pathResolve(agentsDir, 'SOUL.md'), 'PERSONA');
  tryLoad(pathResolve(agentsDir, 'AGENTS.md'), 'HƯỚNG DẪN VẬN HÀNH');
  tryLoad(pathResolve(agentsDir, 'TOOLS.md'), 'CÔNG CỤ');
  tryLoad(pathResolve(agentsDir, 'HEARTBEAT.md'), 'HEARTBEAT CHECKLIST');

  // 2. Agent memory (tacit knowledge)
  const agentMemoryPath = pathResolve(projectRoot, 'memory', 'agents', config.slug, 'MEMORY.md');
  tryLoad(agentMemoryPath, 'KIẾN THỨC CÁ NHÂN');

  // 3. Relevant SOPs
  const sopsDir = pathResolve(projectRoot, 'memory', 'sops');
  if (existsSync(sopsDir)) {
    try {
      const sopFiles = readFileSync(pathResolve(sopsDir, '..', 'INDEX.md'), 'utf-8');
      // Only include SOPs if index mentions this agent's slug
      if (sopFiles.toLowerCase().includes(config.slug)) {
        for (const f of readdirSync(sopsDir)) {
          if (f.endsWith('.md') && f.toLowerCase().includes(config.slug.split('-')[0])) {
            tryLoad(pathResolve(sopsDir, f), `SOP: ${f}`);
          }
        }
      }
    } catch { /* skip */ }
  }

  // 4. System prompt from DB (additional instructions)
  if (config.system_prompt) {
    parts.push('# CHỈ THỊ BỔ SUNG\n' + config.system_prompt);
    loadedFiles.push('DB system_prompt');
  }

  // 5. Chat-specific rules
  parts.push([
    '# QUY TẮC CHAT',
    '- Đây là tin nhắn từ khách hàng qua Zalo. Trả lời TRỰC TIẾP.',
    '- Ngắn gọn, thân thiện, tiếng Việt có dấu đầy đủ.',
    `- Bạn là ${config.display_name} của Gemral. KHÔNG xưng là Jennie hay bất kỳ ai khác.`,
    '- Nếu không biết câu trả lời → nói thật, đề nghị chuyển cho người phụ trách.',
    '- KHÔNG dùng markdown formatting (**, ##, etc.) — chỉ text thuần.',
    `- Có thể escalate tới: ${(config.can_escalate_to || []).join(', ') || 'CEO'}`,
  ].join('\n'));

  if (parts.length <= 1) {
    return `Bạn là ${config.display_name}. ${config.description || ''} Trả lời bằng tiếng Việt có dấu, ngắn gọn.`;
  }

  const prompt = parts.join('\n\n---\n\n');
  console.log(`[Router] System prompt for ${config.slug}: ${prompt.length} chars from ${loadedFiles.length} sources: ${loadedFiles.join(', ')}`);
  return prompt;
}

/**
 * Build the full user prompt including conversation history.
 */
function buildFullPrompt(history: SessionMessage[], message: string): string {
  const parts: string[] = [];

  if (history.length > 0) {
    parts.push('--- Lịch sử hội thoại ---');
    for (const entry of history) {
      const name = entry.role === 'user'
        ? (entry.senderName || 'User')
        : 'Assistant';
      parts.push(`${name}: ${entry.content}`);
    }
    parts.push('--- Kết thúc lịch sử ---\n');
  }

  parts.push(message);

  return parts.join('\n');
}

/**
 * Load conversation history from channel_sessions.
 */
async function loadHistory(
  sessionKey: string,
  limit: number = 20,
): Promise<SessionMessage[]> {
  const { data: session } = await supabase
    .from('channel_sessions')
    .select('history')
    .eq('session_key', sessionKey)
    .single();

  if (!session) return [];

  const history = (session.history || []) as SessionMessage[];

  if (limit > 0 && history.length > limit) {
    return history.slice(history.length - limit);
  }

  return history;
}

/**
 * Save user message and agent reply to session history.
 */
async function saveHistory(
  sessionKey: string,
  userMessage: string,
  agentReply: string,
  config: AgentConfig,
): Promise<void> {
  const now = new Date().toISOString();

  // Fetch current session
  const { data: session } = await supabase
    .from('channel_sessions')
    .select('history, history_count')
    .eq('session_key', sessionKey)
    .single();

  if (!session) return; // Session not found, skip saving

  let history = (session.history || []) as SessionMessage[];

  history.push(
    { role: 'user', content: userMessage, timestamp: now },
    { role: 'assistant', content: agentReply, timestamp: now },
  );

  // Trim to history limit
  const limit = config.history_limit || 20;
  if (history.length > limit) {
    history = history.slice(history.length - limit);
  }

  await supabase
    .from('channel_sessions')
    .update({
      history,
      history_count: history.length,
      agent_slug: config.slug,
      last_message_at: now,
      updated_at: now,
    })
    .eq('session_key', sessionKey);
}
