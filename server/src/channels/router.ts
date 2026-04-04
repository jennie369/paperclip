// Channel-Agent Auto-Reply — Agent Router
// Resolves which agent handles a message, loads config from paperclip_agents,
// and routes to the correct LLM provider (Claude CLI, Gemini CLI, OpenRouter API).

import { execSync, execFileSync, spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync, readdirSync as readdirSyncFS } from 'node:fs';
import { resolve as pathResolve, join as pathJoin } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';

const PROJECT_ROOT = process.env.PROJECT_ROOT || 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner';
const SKILLS_STORE = pathResolve(PROJECT_ROOT, 'skills-store');
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

    // Attach customer context from consumer if available
    if ((originalMsg as any)?._customerContext) {
      (config as any)._customerContext = (originalMsg as any)._customerContext;
    }

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
  const customerContext = (config as any)._customerContext || null;
  const systemPrompt = buildSystemPrompt(config, customerContext);
  const chatHistory = history || [];

  try {
    let reply: string;

    switch (config.provider) {
      case 'claude':
        reply = await runViaClaude(config, systemPrompt, chatHistory, message);
        break;
      case 'gemini':
        reply = await runViaGemini(config, systemPrompt, chatHistory, message);
        break;
      case 'ollama':
        reply = await runViaOllama(config, systemPrompt, chatHistory, message);
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

// ─── Skills / Instructions helpers (matching Core execute.ts pattern) ───

/**
 * Build temp dir with .claude/skills/ symlinks to skills-store.
 * Matches execute.ts buildSkillsDir() — triggers SessionStart:startup
 * so Claude auto-loads Skills/Tools.
 */
function buildSkillsDirForChat(): string {
  const tmp = mkdtempSync(pathJoin(tmpdir(), 'paperclip-chat-skills-'));
  const target = pathJoin(tmp, '.claude', 'skills');
  mkdirSync(target, { recursive: true });

  if (existsSync(SKILLS_STORE)) {
    try {
      for (const entry of readdirSyncFS(SKILLS_STORE)) {
        const src = pathResolve(SKILLS_STORE, entry);
        const dest = pathJoin(target, entry);
        try {
          symlinkSync(src, dest, 'junction');
        } catch { /* skip if symlink fails */ }
      }
    } catch { /* skip */ }
  }

  return tmp;
}

/**
 * Write instructions (system prompt + customer context) to temp file.
 * Matches execute.ts effectiveInstructionsFilePath pattern.
 */
function writeInstructionsFile(skillsDir: string, content: string): string {
  const filePath = pathJoin(skillsDir, 'agent-instructions.md');
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ─── Provider implementations ───

/**
 * Run via Claude CLI with PERSISTENT SESSION + Skills/Tools.
 * Follows Core execute.ts pattern:
 *   --print - (stdin), --output-format stream-json, --add-dir, --append-system-prompt-file
 *   CWD = PROJECT ROOT (not agents/{slug}/)
 */
async function runViaClaude(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): Promise<string> {
  // 1. Check persistent session
  const sessionId = await getAgentSessionId(config.slug);

  // 2. Build skills dir (matches execute.ts — triggers Skills/Tools)
  const skillsDir = buildSkillsDirForChat();

  // 3. Write system prompt + customer context to temp file
  //    (matches execute.ts effectiveInstructionsFilePath)
  let instructionsFile: string | undefined;
  if (systemPrompt && !sessionId) {
    // Only write instructions for NEW session (resume already has context)
    const instructions = [
      systemPrompt,
      '',
      `\nThe above agent instructions apply to chat conversations on Zalo/Facebook.`,
      `Agent slug: ${config.slug}. Resolve relative paths from ${PROJECT_ROOT}.`,
    ].join('\n');
    instructionsFile = writeInstructionsFile(skillsDir, instructions);
  }

  // 4. Build user prompt (message only — context is in instructions file)
  let userPrompt: string;
  if (!sessionId) {
    // First message — instructions file has system prompt
    userPrompt = buildFullPrompt(history, message);
  } else {
    // Resume — only new message + brief context
    const ctx = (config as any)._customerContext;
    const contextLine = ctx
      ? `[Khách: ${ctx.name || 'Chưa biết'} · ${ctx.stage || 'new'} · ${ctx.channel_name || 'Zalo'}]\n`
      : '';
    userPrompt = `${contextLine}${message}`;
  }

  // 5. Build args — matches execute.ts buildClaudeArgs()
  //    MODEL: ALWAYS from config.model (paperclip_agents SSOT — RULE 5)
  const args: string[] = [
    '--print', '-',                        // stdin prompt (not -p)
    '--output-format', 'stream-json',      // streaming (not json)
    '--verbose',
    '--dangerously-skip-permissions',
  ];

  if (sessionId) {
    args.push('--resume', sessionId);
    console.log(`[Router] Resuming session ${sessionId.substring(0, 8)}... for ${config.slug}`);
  }

  // Model from UI Cấu hình Agent → paperclip_agents.model (SSOT)
  if (config.model) {
    args.push('--model', config.model);
    console.log(`[Router] Model from DB: ${config.model}`);
  }

  // Max turns from UI Cấu hình Agent → paperclip_agents.max_turns (SSOT)
  const maxTurns = (config as any).max_turns || 5;
  if (maxTurns > 0) {
    args.push('--max-turns', String(maxTurns));
  }

  // Instructions file (instead of stuffing into -p)
  if (instructionsFile) {
    args.push('--append-system-prompt-file', instructionsFile);
  }

  // Skills dir (triggers Skills/Tools — matches execute.ts)
  args.push('--add-dir', skillsDir);

  // MCP config if agent has one
  const agentDir = pathResolve(
    process.env.AGENTS_DIR || pathResolve(PROJECT_ROOT, 'agents'),
    config.slug,
  );
  const mcpConfigPath = pathJoin(agentDir, 'mcp.json');
  if (existsSync(mcpConfigPath)) {
    args.push('--mcp-config', mcpConfigPath);
  }

  // 6. CWD = PROJECT ROOT (not agents/{slug}/)
  const cwd = PROJECT_ROOT;

  // 7. Spawn + stream
  const streamKey = `${config.slug}:${Date.now()}`;
  streamEvents.emit('agent:start', { agentSlug: config.slug, streamKey });

  return new Promise<string>((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        GEMRAL_SUPABASE_URL: process.env.GEMRAL_SUPABASE_URL || '',
        GEMRAL_SUPABASE_SERVICE_KEY: process.env.GEMRAL_SUPABASE_SERVICE_KEY || '',
        SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL || '',
        SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',
        RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Send prompt via stdin (matches execute.ts --print -)
    if (child.stdin) {
      child.stdin.write(userPrompt);
      child.stdin.end();
    }

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Claude CLI timed out for ${config.slug}`));
    }, AGENT_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdout += text;
      streamEvents.emit('agent:chunk', { agentSlug: config.slug, streamKey, chunk: text, partial: stdout });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('close', async (code) => {
      clearTimeout(timeout);

      // Cleanup temp dir
      try { rmSync(skillsDir, { recursive: true, force: true }); } catch { /* OK */ }

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

      // Parse stream-json output (multiple JSON lines, last has result + session_id)
      let reply = '';
      let newSessionId: string | null = null;
      try {
        const lines = stdout.trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'result' || parsed.result) {
              if (typeof parsed.result === 'string') {
                reply = parsed.result;
              } else if (Array.isArray(parsed.result)) {
                reply = parsed.result.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
              }
              newSessionId = parsed.session_id || null;
            }
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              reply += parsed.delta.text;
            }
            if (parsed.type === 'message_stop' && parsed.session_id) {
              newSessionId = parsed.session_id;
            }
          } catch { /* skip non-JSON lines */ }
        }

        // Fallback: try parsing entire stdout as single JSON
        if (!reply) {
          try {
            const fullParsed = JSON.parse(stdout.trim());
            reply = typeof fullParsed.result === 'string'
              ? fullParsed.result
              : Array.isArray(fullParsed.result)
                ? fullParsed.result.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
                : stdout.trim();
            newSessionId = fullParsed.session_id || null;
          } catch {
            reply = stdout.trim();
          }
        }

        // Save session ID
        if (newSessionId && !sessionId) {
          await saveAgentSession(config.slug, newSessionId);
        }

        console.log(`[Router] ${config.slug}: reply ${reply.length} chars, session=${newSessionId?.substring(0, 8) || 'none'}`);

        // Track usage via RPC
        await supabase.rpc('increment_agent_usage', {
          p_slug: config.slug,
          p_input: 0, p_output: 0, p_cost: 0, p_duration: 0,
        }).catch(() => {});

      } catch {
        console.warn('[Router] Parse failed, using raw output');
        reply = stdout.trim();
      }

      streamEvents.emit('agent:done', { agentSlug: config.slug, streamKey, reply });
      resolve(reply);
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      try { rmSync(skillsDir, { recursive: true, force: true }); } catch { /* OK */ }
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
 * Run via Gemini CLI — async spawn with streaming.
 * Matches Gemini Core execute.ts pattern:
 *   --output-format stream-json, --resume, --model, --approval-mode yolo, --sandbox=none, --prompt
 */
async function runViaGemini(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): Promise<string> {
  // Model from UI Cấu hình Agent → paperclip_agents.model (SSOT)
  const model = config.model || 'gemini-2.5-flash';

  // Session
  const sessionId = await getAgentSessionId(config.slug);

  // Build prompt: instructions + history + message
  // Gemini Core merges instructions into --prompt (no --append-system-prompt-file)
  const fullPrompt = systemPrompt
    ? [systemPrompt, '', buildFullPrompt(history, message)].join('\n')
    : buildFullPrompt(history, message);

  // Build args — matches Gemini Core buildArgs() (line 323-336)
  const args: string[] = [
    '--output-format', 'stream-json',
  ];

  if (sessionId) {
    args.push('--resume', sessionId);
    console.log(`[Router] Gemini resuming session ${sessionId.substring(0, 8)}...`);
  }

  if (model) {
    args.push('--model', model);
    console.log(`[Router] Gemini model from DB: ${model}`);
  }

  args.push('--approval-mode', 'yolo');
  args.push('--sandbox=none');
  args.push('--prompt', fullPrompt);

  // CWD = project root
  const cwd = PROJECT_ROOT;

  const streamKey = `${config.slug}:${Date.now()}`;
  streamEvents.emit('agent:start', { agentSlug: config.slug, streamKey });

  return new Promise<string>((resolve, reject) => {
    const child = spawn('gemini', args, {
      cwd,
      shell: true,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Gemini CLI timed out for ${config.slug}`));
    }, AGENT_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdout += text;
      streamEvents.emit('agent:chunk', { agentSlug: config.slug, streamKey, chunk: text });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('close', async (code) => {
      clearTimeout(timeout);

      if (code !== 0 && !stdout.trim()) {
        console.error(`[Router] Gemini CLI exited ${code}: ${stderr.substring(0, 200)}`);
        if (sessionId && stderr.includes('session')) {
          await clearAgentSession(config.slug);
        }
        streamEvents.emit('agent:error', { agentSlug: config.slug, streamKey, error: stderr.substring(0, 200) });
        reject(new Error(stderr.substring(0, 200) || `Exit code ${code}`));
        return;
      }

      // Parse stream-json output (Gemini JSONL format)
      let reply = '';
      let newSessionId: string | null = null;
      try {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.result) {
              reply = typeof parsed.result === 'string'
                ? parsed.result
                : Array.isArray(parsed.result)
                  ? parsed.result.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
                  : String(parsed.result);
            }
            if (parsed.session_id) newSessionId = parsed.session_id;
            if (parsed.type === 'content' && parsed.text) reply += parsed.text;
          } catch { /* skip non-JSON lines */ }
        }
        if (!reply) reply = stdout.trim();
        if (newSessionId && !sessionId) {
          await saveAgentSession(config.slug, newSessionId);
        }
        console.log(`[Router] Gemini ${config.slug}: reply ${reply.length} chars`);
      } catch {
        reply = stdout.trim();
      }

      await supabase.rpc('increment_agent_usage', {
        p_slug: config.slug, p_input: 0, p_output: 0, p_cost: 0, p_duration: 0,
      }).catch(() => {});

      streamEvents.emit('agent:done', { agentSlug: config.slug, streamKey, reply });
      resolve(reply);
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
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

/**
 * Run via Ollama API (fetch).
 * Uses localhost:11434 by default.
 */
async function runViaOllama(
  config: AgentConfig,
  systemPrompt: string,
  history: SessionMessage[],
  message: string,
): Promise<string> {
  const fullPrompt = systemPrompt
    ? `[System Instructions]\n${systemPrompt}\n\n${buildFullPrompt(history, message)}`
    : buildFullPrompt(history, message);

  const model = config.model || 'gemma4:26b';
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.max_tokens,
        }
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${body}`);
    }

    const data = await res.json() as { response?: string };
    return typeof data.response === 'string' ? data.response.trim() : '';
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Helpers ───

/**
 * Build system prompt from config.
 * Priority: system_prompt > persona_file content > generic fallback
 */
function buildSystemPrompt(config: AgentConfig, customerContext?: any): string {
  const projectRoot = PROJECT_ROOT;
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

  // 0. Owner info (shared USER.md) + Agent identity
  tryLoad(pathResolve(projectRoot, 'agents', 'USER.md'), 'THÔNG TIN OWNER');
  tryLoad(pathResolve(agentsDir, 'IDENTITY.md'), 'NHÂN CÁCH AGENT');

  // 1. Agent persona files
  tryLoad(pathResolve(agentsDir, 'SOUL.md'), 'PERSONA');
  tryLoad(pathResolve(agentsDir, 'AGENTS.md'), 'HƯỚNG DẪN VẬN HÀNH');
  tryLoad(pathResolve(agentsDir, 'TOOLS.md'), 'CÔNG CỤ');
  tryLoad(pathResolve(agentsDir, 'HEARTBEAT.md'), 'HEARTBEAT CHECKLIST');

  // 1.5. Tone profile (how to talk to owner)
  const toneProfilePath = pathResolve(projectRoot, 'memory', 'agents', config.slug, 'tone-profile.md');
  tryLoad(toneProfilePath, 'TONE VỚI OWNER');

  // 2. Agent memory (tacit knowledge)
  const agentMemoryPath = pathResolve(projectRoot, 'memory', 'agents', config.slug, 'MEMORY.md');
  tryLoad(agentMemoryPath, 'KIẾN THỨC CÁ NHÂN');

  // 2.5 Company Goals and Directions (SSOT for all agents)
  const goalsFilePath = pathResolve(projectRoot, 'memory', 'goals.md');
  const projectsFilePath = pathResolve(projectRoot, 'memory', 'projects.md');
  tryLoad(goalsFilePath, 'MỤC TIÊU & ĐỊNH HƯỚNG CÔNG TY');
  tryLoad(projectsFilePath, 'DỰ ÁN ĐANG CHẠY');

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

  // 5. Customer context (if available from CRM lookup)
  if (customerContext) {
    const stage = customerContext.stage || 'new';
    const isSales = ['new', 'đang_tư_vấn', 'chờ_chốt', 'follow_up'].includes(stage);
    parts.push([
      '# THÔNG TIN KHÁCH HÀNG',
      `- Tên: ${customerContext.name || 'Chưa biết'}`,
      `- Kênh: ${customerContext.channel_name || 'Zalo'}`,
      `- Giai đoạn: ${stage}`,
      customerContext.products_interested ? `- Quan tâm: ${customerContext.products_interested}` : '',
      customerContext.total_orders ? `- Đã mua: ${customerContext.total_orders} đơn` : '',
      '',
      '# VAI TRÒ',
      isSales
        ? 'BẠN LÀ TƯ VẤN BÁN HÀNG. Tư vấn sản phẩm, thuyết phục, chốt đơn.'
        : 'BẠN LÀ CHĂM SÓC SAU MUA. Hỗ trợ, giải quyết vấn đề, giữ chân.',
    ].filter(Boolean).join('\n'));
  }

  // 6. Chat-specific rules
  parts.push([
    '# QUY TẮC CHAT',
    '- Đây là tin nhắn từ khách hàng qua Zalo/Facebook. Trả lời TRỰC TIẾP.',
    '- NHẮN NGẮN 2-4 câu. Thân thiện, tiếng Việt có dấu đầy đủ.',
    `- Bạn là ${config.display_name} của Gemral. KHÔNG xưng là Jennie hay bất kỳ ai khác.`,
    '- Nếu không biết câu trả lời → nói thật, đề nghị chuyển cho người phụ trách.',
    '- Nếu khách tức giận → "Em chuyển chuyên viên nhé!" → DỪNG.',
    '- KHÔNG dùng markdown formatting (**, ##, etc.) — chỉ text thuần.',
    '- Sản phẩm chính: 6 khóa học, GEM Scanner, Crystal (YinyangMasters), App Gemral.',
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
