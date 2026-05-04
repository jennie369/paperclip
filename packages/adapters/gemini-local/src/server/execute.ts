import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  buildPaperclipEnv,
  synthesizeSpawnIdentity,
  writeSpawnContextManifest,
  buildInvocationEnvForLogs,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePaperclipSkillSymlink,
  joinPromptSections,
  ensurePathInEnv,
  readPaperclipRuntimeSkillEntries,
  resolveCommandForLogs,
  resolvePaperclipDesiredSkillNames,
  removeMaintainerOnlySkillSymlinks,
  parseObject,
  renderTemplate,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "../index.js";
import {
  describeGeminiFailure,
  detectGeminiAuthRequired,
  detectGeminiQuotaExhausted,
  isGeminiTurnLimitResult,
  isGeminiUnknownSessionError,
  parseGeminiJsonl,
} from "./parse.js";
import { firstNonEmptyLine } from "./utils.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function hasNonEmptyEnvValue(env: Record<string, string>, key: string): boolean {
  const raw = env[key];
  return typeof raw === "string" && raw.trim().length > 0;
}

function resolveGeminiBillingType(env: Record<string, string>): "api" | "subscription" {
  return hasNonEmptyEnvValue(env, "GEMINI_API_KEY") || hasNonEmptyEnvValue(env, "GOOGLE_API_KEY")
    ? "api"
    : "subscription";
}

const IS_WINDOWS_RUNTIME = process.platform === "win32";

const PAPERCLIP_SKILL_POINTER_PATH =
  "C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/skills-store/paperclip/1.0.0/SKILL.md";

// The Paperclip skill pointer must reach the model on EVERY Gemini run (timer wake,
// assignment wake, comment wake, approval wake, manual wake) — not just when
// `instructionsFilePath` happens to resolve. Previously this text was concatenated
// into `instructionsPrefix` inside the `if (instructionsFilePath) { try {...} }`
// block, so any run where the AGENTS.md path was missing or unreadable silently
// dropped the pointer and the agent would go try to invent API shapes.
function renderPaperclipSkillPointer(
  env: Record<string, string>,
  instructionsFilePath: string,
): string {
  // Only inject while we are actually running inside a Paperclip heartbeat — no
  // reason to nag bare-metal Gemini invocations.
  if (!hasNonEmptyEnvValue(env, "PAPERCLIP_API_URL")) return "";

  // Derive the agent's own folder from the instructions path (parent of
  // AGENTS.md). Used to point the agent at its own sop/INDEX.md + knowledge/
  // INDEX.md without requiring a separate lookup. `replace(/\\/g, "/")` so the
  // path reads the same on Windows and POSIX in the prompt.
  const agentFolder = instructionsFilePath
    ? path.dirname(instructionsFilePath).replace(/\\/g, "/")
    : "";
  const agentSopIndex = agentFolder ? `${agentFolder}/sop/INDEX.md` : "";
  const agentKnowledgeIndex = agentFolder ? `${agentFolder}/knowledge/INDEX.md` : "";

  const contextReferences = [
    "## BỐI CẢNH BẮT BUỘC PHẢI GREP/ĐỌC TRƯỚC KHI RA QUYẾT ĐỊNH",
    "Agents trong hệ thống này quên đọc context → lặp lại sai lầm, self-reinvent các SOP đã có. Trước khi làm việc strategic / architecture / debug khó, BẮT BUỘC:",
    "",
    "1. **Cross-agent shared memory** (lessons applying to multiple agents):",
    "   - `memory/agents/shared/INDEX.md` — catalog shared files",
    "   - `memory/agents/shared/MEMORY.md` — pitfalls recurring (encoding, webhook, DB port, etc.)",
    "   - `memory/agents/shared/ENFORCEMENT_RULES.md` — hard rules (POST không PUT, SSOT tables, v.v.)",
    "",
    "2. **Historical context** (past session logs — grep khi thấy déjà-vu):",
    "   - `memory/archive/INDEX.md` — 1-line summary mỗi file, grep-friendly. Tìm keyword → Read target file đầy đủ.",
    "   - `memory/decisions/` — dated decision files (YYYY-MM-DD-topic.md) cho architecture decisions.",
    "",
    "3. **Your own role-specific SOPs & knowledge**:",
    agentSopIndex ? `   - \`${agentSopIndex}\` — your role's SOP index (pointers đến memory/sops/*.md).` : "   - `agents/{your-role}/sop/INDEX.md` if it exists.",
    agentKnowledgeIndex ? `   - \`${agentKnowledgeIndex}\` — your role's knowledge index (architecture docs, patterns, voice profile, v.v.).` : "   - `agents/{your-role}/knowledge/INDEX.md` if it exists.",
    "   - `memory/agents/{your-role-slug}/MEMORY.md` — your private accumulated notes.",
    "   - `memory/agents/{your-role-slug}/daily/` — your recent daily logs.",
    "",
    "Rule: NEVER self-invent a Python/shell script to replicate what a SOP already describes. Đọc SOP trước — nếu thiếu thì propose cập nhật SOP, không viết ad-hoc script thay thế.",
    "",
    "## WRITE-BACK LOOP (ghi memory mỗi khi có lesson)",
    "- Bài học áp dụng ≥2 agents → append vào `memory/agents/shared/MEMORY.md` (1-line index entry, chi tiết inline nếu <5 dòng, không thì tạo file riêng rồi link).",
    "- Bài học role-specific → append vào `memory/agents/{your-role}/MEMORY.md`.",
    "- Decision quan trọng → tạo `memory/decisions/YYYY-MM-DD-<topic>.md`.",
    "- Session progress → append vào `memory/today.md` (project root).",
    "- Đừng chỉ comment trên issue rồi exit — memory files là durable context cho wake tiếp theo.",
    "",
    "",
  ];

  return [
    "# QUAN TRỌNG: KỸ NĂNG PAPERCLIP",
    "Bạn BẮT BUỘC phải dùng công cụ đọc file (ví dụ: view_file, grep_search, read_file, v.v...) để đọc kỹ nội dung file sau NGAY LẬP TỨC trước khi đọc các file agent.md hay làm bất cứ việc gì khác:",
    PAPERCLIP_SKILL_POINTER_PATH,
    "Đây là file cốt lõi giải thích cách bạn lấy thông tin Issue và báo cáo công việc trên hệ thống API của Paperclip.",
    "",
    "## ⚠️ NGÔN NGỮ BẮT BUỘC — ĐỌC NGAY (HARD RULE, không exception)",
    "Mọi comment trên issue, báo cáo công việc, message trả lời user/board PHẢI viết bằng **tiếng Việt có dấu đầy đủ**.",
    "- ❌ SAI: \"I have checked for tasks and there are none.\" (tiếng Anh)",
    "- ✅ ĐÚNG: \"Không có task nào được assign. Thoát sạch.\"",
    "- Cấm bỏ dấu: phải đầy đủ diacritics (â ê ô ơ ư ă đ, thanh sắc huyền hỏi ngã nặng).",
    "- Kể cả khi thoát sạch (không có task) — nếu có comment thì PHẢI tiếng Việt.",
    "- Technical terms (API, webhook, token, SQL) giữ nguyên tiếng Anh trong câu tiếng Việt là được.",
    "- Chỉ dùng tiếng Anh trong: code, commit message, tên biến, log kỹ thuật nội bộ.",
    "",
    ...contextReferences,
    "## CÁCH GỌI MCP TOOLS (QUAN TRỌNG — HAY SAI)",
    "MCP tools KHÔNG phải shell commands và KHÔNG phải Python RPC. TUYỆT ĐỐI không:",
    "- Gọi `mcp__supabase__execute_sql` qua `run_shell_command` (double-underscore là naming của Claude, KHÔNG phải Gemini — shell sẽ báo 'command not found').",
    "- Viết Python script tự gọi `supabase.rpc('execute_sql', ...)` — RPC function đó KHÔNG tồn tại trên Supabase của project (đã test: PGRST202).",
    "- Dùng `run_shell_command` với `python run_query.py` hay `psql` để query DB — chỉ chạy được khi script đã có sẵn và đúng, đừng tự chế.",
    "",
    "ĐÚNG CÁCH: Gemini CLI đã tự động load MCP servers từ `${PROJECT_ROOT}/.gemini/settings.json` (Paperclip adapter sync sẵn mỗi run). MCP tools xuất hiện như native tools với naming `mcp_<server>_<tool>` (SINGLE underscore). Ví dụ query agents:",
    "  Input (chỉ cần mô tả bằng tiếng Việt hoặc tiếng Anh tự nhiên):",
    "    \"Query Supabase: SELECT slug, status FROM agents WHERE status='error'\"",
    "  Gemini sẽ tự động invoke `mcp_supabase_execute_sql` với SQL tương ứng — đây là tool call NATIVE, không phải shell.",
    "",
    "Servers đang available (tên sau prefix `mcp_`): supabase (execute_sql, list_tables, apply_migration, get_logs, v.v.), crm (nếu per-agent mcp.json có).",
    "",
    "Nếu thấy \"MCP issues detected\" banner: phần lớn là noise (một server offline, ví dụ CRM khi DB không reach). Các server còn lại vẫn chạy. Đừng panic, thử gọi tool trước — nếu fail mới blocked/escalate.",
    "Nếu tool call trả về \"requires authentication\": report blocker comment, set `status=blocked`, escalate CEO. KHÔNG tự `/mcp auth` trong headless run (không có TTY).",
    "Fallback cuối cùng khi MCP không work: Paperclip API (`PAPERCLIP_API_URL` + `PAPERCLIP_API_KEY`) cho entity agent/issue; `curl.exe` Supabase REST API với `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` từ `paperclip/.env` nếu cần query trực tiếp.",
    "",
    "",
  ].join("\n");
}

function renderPaperclipEnvNote(env: Record<string, string>): string {
  const paperclipKeys = Object.keys(env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort();
  if (paperclipKeys.length === 0) return "";
  const lines = [
    "Paperclip runtime note:",
    `The following PAPERCLIP_* environment variables are available in this run: ${paperclipKeys.join(", ")}`,
    "Do not assume these variables are missing without checking your shell environment.",
  ];
  if (IS_WINDOWS_RUNTIME) {
    lines.push(
      "Windows shell note (PowerShell):",
      "  - run_shell_command invokes PowerShell on Windows. Reference env vars as $env:VAR_NAME, NOT $VAR_NAME (bare $VAR is a PowerShell script variable and expands to empty).",
      "  - Always call curl.exe explicitly. The bare `curl` is aliased to Invoke-WebRequest and will error with 'Missing an argument for parameter SessionVariable' on standard curl flags.",
    );
  }
  lines.push("", "");
  return lines.join("\n");
}

function renderApiAccessNote(env: Record<string, string>): string {
  if (!hasNonEmptyEnvValue(env, "PAPERCLIP_API_URL") || !hasNonEmptyEnvValue(env, "PAPERCLIP_API_KEY")) return "";
  if (IS_WINDOWS_RUNTIME) {
    return [
      "Paperclip API access note (Windows PowerShell):",
      "Use run_shell_command with curl.exe. Reference env vars as $env:NAME.",
      "GET example:",
      `  run_shell_command({ command: 'curl.exe -s -H "Authorization: Bearer $env:PAPERCLIP_API_KEY" "$env:PAPERCLIP_API_URL/api/agents/me"' })`,
      "POST/PATCH example (write body to a temp JSON file first — PowerShell mangles inline JSON bodies, which makes curl.exe fall back to Content-Type=application/x-www-form-urlencoded and the server rejects with 400 or 500):",
      `  Step 1 — write body: run_shell_command({ command: 'Set-Content -Path body.json -Encoding utf8 -Value (@{ agentId = $env:PAPERCLIP_AGENT_ID; expectedStatuses = @(\"todo\",\"backlog\",\"blocked\") } | ConvertTo-Json -Compress)' })`,
      `  Step 2 — send: run_shell_command({ command: 'curl.exe -s -X POST -H "Authorization: Bearer $env:PAPERCLIP_API_KEY" -H "Content-Type: application/json" -H "X-Paperclip-Run-Id: $env:PAPERCLIP_RUN_ID" --data-binary \"@body.json\" \"$env:PAPERCLIP_API_URL/api/issues/{id}/checkout\"' })`,
      "Rule: NEVER inline a JSON body with -d '{...}' on Windows. Always go via a file + --data-binary @file.",
      "",
      "",
    ].join("\n");
  }
  return [
    "Paperclip API access note:",
    "Use run_shell_command with curl to make Paperclip API requests.",
    "GET example:",
    `  run_shell_command({ command: "curl -s -H \\"Authorization: Bearer $PAPERCLIP_API_KEY\\" \\"$PAPERCLIP_API_URL/api/agents/me\\"" })`,
    "POST/PATCH example:",
    `  run_shell_command({ command: "curl -s -X POST -H \\"Authorization: Bearer $PAPERCLIP_API_KEY\\" -H 'Content-Type: application/json' -H \\"X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID\\" -d '{...}' \\"$PAPERCLIP_API_URL/api/issues/{id}/checkout\\"" })`,
    "",
    "",
  ].join("\n");
}

function geminiSkillsHome(): string {
  return path.join(os.homedir(), ".gemini", "skills");
}

/**
 * Inject Paperclip skills directly into `~/.gemini/skills/` via symlinks.
 * This avoids needing GEMINI_CLI_HOME overrides, so the CLI naturally finds
 * both its auth credentials and the injected skills in the real home directory.
 */
async function ensureGeminiSkillsInjected(
  onLog: AdapterExecutionContext["onLog"],
  skillsEntries: Array<{ key: string; runtimeName: string; source: string }>,
  desiredSkillNames?: string[],
): Promise<void> {
  const desiredSet = new Set(desiredSkillNames ?? skillsEntries.map((entry) => entry.key));
  const selectedEntries = skillsEntries.filter((entry) => desiredSet.has(entry.key));
  if (selectedEntries.length === 0) return;

  const skillsHome = geminiSkillsHome();
  try {
    await fs.mkdir(skillsHome, { recursive: true });
  } catch (err) {
    await onLog(
      "stderr",
      `[paperclip] Failed to prepare Gemini skills directory ${skillsHome}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return;
  }
  const removedSkills = await removeMaintainerOnlySkillSymlinks(
    skillsHome,
    selectedEntries.map((entry) => entry.runtimeName),
  );
  for (const skillName of removedSkills) {
    await onLog(
      "stderr",
      `[paperclip] Removed maintainer-only Gemini skill "${skillName}" from ${skillsHome}\n`,
    );
  }

  for (const entry of selectedEntries) {
    const target = path.join(skillsHome, entry.runtimeName);

    try {
      const result = await ensurePaperclipSkillSymlink(entry.source, target);
      if (result === "skipped") continue;
      await onLog(
        "stderr",
        `[paperclip] ${result === "repaired" ? "Repaired" : "Linked"} Gemini skill: ${entry.key}\n`,
      );
    } catch (err) {
      await onLog(
        "stderr",
        `[paperclip] Failed to link Gemini skill "${entry.key}": ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
}

/**
 * Sync Paperclip MCP config into `${cwd}/.gemini/settings.json` so Gemini CLI
 * loads the project's MCP servers on launch. Parallels the Claude adapter's
 * `--mcp-config` flag, but Gemini CLI has no equivalent CLI flag — it reads
 * `mcpServers` from settings.json only. Sources merged (agent overrides project):
 *   1. `${cwd}/.mcp.json` (project-wide MCPs like Supabase)
 *   2. `${dirname(instructionsFilePath)}/mcp.json` (per-agent MCPs like CRM)
 * Claude-style entries (`{ "type": "http", "url": "..." }`) are written verbatim —
 * Gemini CLI accepts the same shape after recent releases.
 */
async function ensureGeminiMcpServersInjected(
  cwd: string,
  instructionsFilePath: string,
  onLog: AdapterExecutionContext["onLog"],
): Promise<void> {
  const collected: Record<string, unknown> = {};

  const readMcpServers = async (filePath: string): Promise<Record<string, unknown> | null> => {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const servers = parsed?.mcpServers;
      if (servers && typeof servers === "object" && !Array.isArray(servers)) {
        return servers as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  };

  const projectServers = await readMcpServers(path.join(cwd, ".mcp.json"));
  if (projectServers) Object.assign(collected, projectServers);

  if (instructionsFilePath) {
    const agentServers = await readMcpServers(path.join(path.dirname(instructionsFilePath), "mcp.json"));
    if (agentServers) Object.assign(collected, agentServers);
  }

  if (Object.keys(collected).length === 0) return;

  const settingsDir = path.join(cwd, ".gemini");
  const settingsFile = path.join(settingsDir, "settings.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(settingsFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>;
    }
  } catch {
    // settings.json missing or malformed — recreate fresh.
  }

  const existingMcp = (existing.mcpServers ?? {}) as Record<string, unknown>;
  const sameKeys =
    Object.keys(collected).sort().join(",") === Object.keys(existingMcp).sort().join(",");
  const sameContents =
    sameKeys &&
    Object.keys(collected).every(
      (k) => JSON.stringify(collected[k]) === JSON.stringify(existingMcp[k]),
    );
  if (sameContents) return; // idempotent — already in sync

  existing.mcpServers = collected;

  try {
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsFile, JSON.stringify(existing, null, 2) + "\n", "utf8");
    await onLog(
      "stderr",
      `[paperclip] Synced ${Object.keys(collected).length} MCP server(s) to ${settingsFile}: ${Object.keys(collected).join(", ")}\n`,
    );
  } catch (err) {
    await onLog(
      "stderr",
      `[paperclip] Failed to sync Gemini MCP config to ${settingsFile}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

/**
 * GEMRAL FIX 2026-04-19 (GEM-183): Inject `includeDirectories` into
 * `${cwd}/.gemini/settings.json` so Gemini CLI agents can read Content Center
 * knowledge/SOP files that live outside their workspace cwd. Gemini CLI has
 * no reliable `--include-directories` CLI flag on Windows (see BUG-035 /
 * 2026-04-14 note), so settings.json is the only stable path.
 * Only adds paths that actually exist on disk — keeps non-Jennie machines OK.
 */
async function ensureGeminiIncludeDirectoriesInjected(
  cwd: string,
  onLog: AdapterExecutionContext["onLog"],
): Promise<void> {
  const CANDIDATE_DIRS = [
    "D:/Claude Projects/App Content Jennie/gem-content-center/knowledge",
    "D:/Claude Projects/App Content Jennie/gem-content-center",
    // Phong Thuỷ Đế Vương (astrology / bazi) — project root + web dashboard.
    "C:/Users/Jennie Chu/Desktop/Projects/App Phong Thủy Đế Vương",
    "C:/Users/Jennie Chu/Desktop/Projects/App Phong Thủy Đế Vương/web-dashboard",
    "C:/Users/Jennie Chu/Desktop/Projects/llm-wiki",
    "C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner",
  ];
  const dirs = CANDIDATE_DIRS.filter((p) => existsSync(p));
  if (dirs.length === 0) return;

  const settingsDir = path.join(cwd, ".gemini");
  const settingsFile = path.join(settingsDir, "settings.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(settingsFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>;
    }
  } catch {
    // settings.json missing or malformed — start fresh.
  }

  const existingIncludes = Array.isArray(existing.includeDirectories)
    ? (existing.includeDirectories as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const merged = Array.from(new Set([...existingIncludes, ...dirs]));
  const same =
    merged.length === existingIncludes.length &&
    merged.every((v, i) => v === existingIncludes[i]);
  if (same) return;

  existing.includeDirectories = merged;

  try {
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsFile, JSON.stringify(existing, null, 2) + "\n", "utf8");
    await onLog(
      "stderr",
      `[paperclip] Synced ${merged.length} includeDirectories to ${settingsFile}: ${merged.join(", ")}\n`,
    );
  } catch (err) {
    await onLog(
      "stderr",
      `[paperclip] Failed to sync Gemini includeDirectories to ${settingsFile}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, onSpawn, authToken } = ctx;

  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const command = asString(config.command, "gemini");
  // `let` (not `const`) — model có thể bị đổi runtime sang fallback khi
  // Pro hit quota 429. Closure trong buildArgs/toResult đọc giá trị mới.
  let model = asString(config.model, DEFAULT_GEMINI_LOCAL_MODEL).trim();
  const sandbox = asBoolean(config.sandbox, false);

  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const workspaceSource = asString(workspaceContext.source, "");
  const workspaceId = asString(workspaceContext.workspaceId, "");
  const workspaceRepoUrl = asString(workspaceContext.repoUrl, "");
  const workspaceRepoRef = asString(workspaceContext.repoRef, "");
  const agentHome = asString(workspaceContext.agentHome, "");
  const workspaceHints = Array.isArray(context.paperclipWorkspaces)
    ? context.paperclipWorkspaces.filter(
      (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
    )
    : [];
  const configuredCwd = asString(config.cwd, "");
  const useConfiguredInsteadOfAgentHome = workspaceSource === "agent_home" && configuredCwd.length > 0;
  const effectiveWorkspaceCwd = useConfiguredInsteadOfAgentHome ? "" : workspaceCwd;
  const cwd = effectiveWorkspaceCwd || configuredCwd || process.cwd();
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  const geminiSkillEntries = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
  const desiredGeminiSkillNames = resolvePaperclipDesiredSkillNames(config, geminiSkillEntries);
  await ensureGeminiSkillsInjected(onLog, geminiSkillEntries, desiredGeminiSkillNames);
  // Gemini CLI has no `--mcp-config` flag equivalent to Claude's — it only reads
  // `mcpServers` from `${cwd}/.gemini/settings.json`. Sync project + per-agent MCPs
  // into that file here so every heartbeat picks up Supabase/CRM/etc. tools.
  await ensureGeminiMcpServersInjected(
    cwd,
    asString(config.instructionsFilePath, "").trim(),
    onLog,
  );
  // GEM-183: Grant CC knowledge/SOP dirs so Gemini agents (social-media-manager et al.)
  // can read framework + SOP files outside their workspace.
  await ensureGeminiIncludeDirectoriesInjected(cwd, onLog);

  const envConfig = parseObject(config.env);
  const hasExplicitApiKey =
    typeof envConfig.PAPERCLIP_API_KEY === "string" && envConfig.PAPERCLIP_API_KEY.trim().length > 0;
  const spawnIdentity = synthesizeSpawnIdentity(
    agent as { id: string; companyId: string; name?: string | null; role?: string | null; title?: string | null; icon?: string | null },
    context as unknown as Record<string, unknown>,
    runId,
  );
  const env: Record<string, string> = { ...buildPaperclipEnv(agent, spawnIdentity) };
  env.PAPERCLIP_RUN_ID = runId;
  // Rivalry channel inject (added 2026-05-04 — Pháp Sư ⇄ PTĐV battle channel).
  // Both agents need to know parent battle issue + their opponent's agent UUID
  // so scripts/rivalry-channel.py can fire/pull challenges qua heartbeat tick.
  // KHÔNG hardcode UUIDs in agent prompt — adapter inject ở spawn time.
  const RIVALRY_PARENT_ID = "2f8e5a74-feca-4a68-91c6-381d34913b2e";
  const RIVALRY_OPPONENTS: Record<string, string> = {
    "phap-su": "2def0181-96f1-4de2-88d8-d7529fb4cc91",                  // → PTĐV
    "phong-thuy-de-vuong": "d166e24f-2569-4201-9406-20dffc53a843",      // → Pháp Sư
  };
  const agentSlug = (agent as { slug?: string | null }).slug ?? null;
  if (agentSlug && RIVALRY_OPPONENTS[agentSlug]) {
    env.PAPERCLIP_RIVALRY_BATTLE_PARENT_ID = RIVALRY_PARENT_ID;
    env.PAPERCLIP_RIVALRY_OPPONENT_AGENT_ID = RIVALRY_OPPONENTS[agentSlug];
  }
  const wakeTaskId =
    (typeof context.taskId === "string" && context.taskId.trim().length > 0 && context.taskId.trim()) ||
    (typeof context.issueId === "string" && context.issueId.trim().length > 0 && context.issueId.trim()) ||
    null;
  const wakeReason =
    typeof context.wakeReason === "string" && context.wakeReason.trim().length > 0
      ? context.wakeReason.trim()
      : null;
  const wakeCommentId =
    (typeof context.wakeCommentId === "string" && context.wakeCommentId.trim().length > 0 && context.wakeCommentId.trim()) ||
    (typeof context.commentId === "string" && context.commentId.trim().length > 0 && context.commentId.trim()) ||
    null;
  const approvalId =
    typeof context.approvalId === "string" && context.approvalId.trim().length > 0
      ? context.approvalId.trim()
      : null;
  const approvalStatus =
    typeof context.approvalStatus === "string" && context.approvalStatus.trim().length > 0
      ? context.approvalStatus.trim()
      : null;
  const linkedIssueIds = Array.isArray(context.issueIds)
    ? context.issueIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  if (wakeTaskId) env.PAPERCLIP_TASK_ID = wakeTaskId;
  if (wakeReason) env.PAPERCLIP_WAKE_REASON = wakeReason;
  if (wakeCommentId) env.PAPERCLIP_WAKE_COMMENT_ID = wakeCommentId;
  if (approvalId) env.PAPERCLIP_APPROVAL_ID = approvalId;
  if (approvalStatus) env.PAPERCLIP_APPROVAL_STATUS = approvalStatus;
  if (linkedIssueIds.length > 0) env.PAPERCLIP_LINKED_ISSUE_IDS = linkedIssueIds.join(",");
  if (effectiveWorkspaceCwd) env.PAPERCLIP_WORKSPACE_CWD = effectiveWorkspaceCwd;
  if (workspaceSource) env.PAPERCLIP_WORKSPACE_SOURCE = workspaceSource;
  if (workspaceId) env.PAPERCLIP_WORKSPACE_ID = workspaceId;
  if (workspaceRepoUrl) env.PAPERCLIP_WORKSPACE_REPO_URL = workspaceRepoUrl;
  if (workspaceRepoRef) env.PAPERCLIP_WORKSPACE_REPO_REF = workspaceRepoRef;
  if (agentHome) env.AGENT_HOME = agentHome;
  if (workspaceHints.length > 0) env.PAPERCLIP_WORKSPACES_JSON = JSON.stringify(workspaceHints);

  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }
  if (authToken) {
    env.PAPERCLIP_API_KEY = authToken;
  } else if (!hasExplicitApiKey) {
    // Prevent parent process PAPERCLIP_API_KEY from leaking into the agent subprocess.
    // If we cannot generate a JWT (authToken null) and no explicit key is configured,
    // we must explicitly clear this var so the agent does not inherit the server's own key.
    env.PAPERCLIP_API_KEY = "";
  }
  // Drop spawn context manifest in cwd so agent can read full identity from one
  // file (eliminates per-spawn API round-trips for agent name, role, issue
  // identifier). See packages/adapter-utils server-utils writeSpawnContextManifest.
  await writeSpawnContextManifest(cwd, spawnIdentity, env.PAPERCLIP_API_KEY ?? null);
  const effectiveEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...env }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const billingType = resolveGeminiBillingType(effectiveEnv);
  const runtimeEnv = ensurePathInEnv(effectiveEnv);
  await ensureCommandResolvable(command, cwd, runtimeEnv);
  const resolvedCommand = await resolveCommandForLogs(command, cwd, runtimeEnv);
  const loggedEnv = buildInvocationEnvForLogs(env, {
    runtimeEnv,
    includeRuntimeKeys: ["HOME"],
    resolvedCommand,
  });

  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);
  // BUG-034 (2026-04-14): defensive filter for Claude-only flags that leak into
  // gemini_local extraArgs when a user switches adapter_type from claude_local → gemini_local
  // in the Configuration UI without clearing prior extraArgs. Gemini CLI treats unknown
  // flags as positional prompt args, which then conflict with --prompt → crash with
  // "Cannot use both a positional prompt and the --prompt (-p) flag together".
  const CLAUDE_ONLY_FLAGS = new Set([
    "--dangerously-skip-permissions",
    "--print",
    "--verbose",
    "--append-system-prompt-file",
    "--max-turns",
    "--add-dir",
  ]);
  const extraArgs = (() => {
    const fromExtraArgs = asStringArray(config.extraArgs);
    const raw = fromExtraArgs.length > 0 ? fromExtraArgs : asStringArray(config.args);
    return raw.filter((a) => !CLAUDE_ONLY_FLAGS.has(a));
  })();

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const runtimeSessionId = asString(runtimeSessionParams.sessionId, runtime.sessionId ?? "");
  const runtimeSessionCwd = asString(runtimeSessionParams.cwd, "");

  // Hash-based session invalidation: when SOUL.md / AGENTS.md / TOOLS.md /
  // HEARTBEAT.md of the agent change, force a fresh session so the model
  // re-reads the updated instructions instead of silently resuming with
  // stale conversation history. Compute a SHA256 digest of the four
  // persona/rule files (sorted) and compare against the hash stored in the
  // prior sessionParams. If different (or missing), invalidate the session.
  const instructionsFilePathEarly = asString(config.instructionsFilePath, "").trim();
  const personaDir = instructionsFilePathEarly ? path.dirname(instructionsFilePathEarly) : "";
  const PERSONA_FILE_NAMES = ["SOUL.md", "AGENTS.md", "TOOLS.md", "HEARTBEAT.md"];
  async function computePersonaHash(dir: string): Promise<string> {
    if (!dir) return "";
    const hash = createHash("sha256");
    for (const name of PERSONA_FILE_NAMES) {
      const p = path.join(dir, name);
      try {
        const buf = await fs.readFile(p);
        hash.update(name);
        hash.update("\0");
        hash.update(buf);
        hash.update("\0");
      } catch {
        hash.update(name);
        hash.update("\0MISSING\0");
      }
    }
    return hash.digest("hex");
  }
  const currentPersonaHash = await computePersonaHash(personaDir);
  const savedPersonaHash = asString(runtimeSessionParams.personaHash, "");
  const personaChanged =
    currentPersonaHash.length > 0 &&
    savedPersonaHash.length > 0 &&
    savedPersonaHash !== currentPersonaHash;
  const cwdMatches =
    runtimeSessionCwd.length === 0 || path.resolve(runtimeSessionCwd) === path.resolve(cwd);
  const canResumeSession =
    runtimeSessionId.length > 0 && cwdMatches && !personaChanged;
  const sessionId = canResumeSession ? runtimeSessionId : null;
  if (runtimeSessionId && !canResumeSession) {
    const reason = !cwdMatches
      ? `saved for cwd "${runtimeSessionCwd}" and will not be resumed in "${cwd}"`
      : personaChanged
        ? `persona files changed (${PERSONA_FILE_NAMES.join("/")}) — forcing fresh session so agent re-reads updated instructions`
        : "session cannot be resumed";
    await onLog(
      "stdout",
      `[paperclip] Gemini session "${runtimeSessionId}" ${reason}.\n`,
    );
  }

  const instructionsFilePath = instructionsFilePathEarly;
  const instructionsDir = instructionsFilePath ? `${path.dirname(instructionsFilePath)}/` : "";
  let instructionsPrefix = "";
  if (instructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(instructionsFilePath, "utf8");
      instructionsPrefix =
        `${instructionsContents}\n\n` +
        `The above agent instructions were loaded from ${instructionsFilePath}. ` +
        `Resolve any relative file references from ${instructionsDir}.\n\n`;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await onLog(
        "stdout",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }

  // 2026-04-27 — Auto-inject memory context cho Gemini agents.
  // Claude agents tự có via SessionStart hook + claude-mem MCP. Gemini CLI
  // không có hook system runtime → adapter phải prepend memory vào prompt.
  //
  // SSOT MEMORY.md location (verified 2026-04-27 với chị Jennie):
  //   ~/.claude/projects/<encoded(cwd)>/memory/MEMORY.md
  // Encoded rule: replace `:`, `/`, `\`, AND whitespace bằng `-`, strip leading `-`.
  // Verified path example: cwd "C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner"
  //   → "C--Users-Jennie-Chu-Desktop-Projects-crypto-pattern-scanner"
  // Lý do: Claude Code auto-load từ encoded path, KHÔNG phải project root.
  // Hot data từ project root memory/: today.md + active-tasks.json.
  // Plan: memory/reports/2026-04-27-gemini-memory-injection-plan.md
  let memoryPrefix = "";
  let memoryFilesLoaded: string[] = [];
  const cwdRoot = asString(config.cwd, "").trim();
  if (cwdRoot) {
    const encodedCwd = cwdRoot.replace(/[:/\\\s]/g, "-").replace(/^-+/, "");
    const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
    const ssotMemoryPath = path.join(userHome, ".claude", "projects", encodedCwd, "memory", "MEMORY.md");
    // Cap riêng per file:
    // - MEMORY.md SSOT: 65536 bytes (~64KB) — chứa lessons quan trọng, không nên truncate
    // - today.md: 8192 bytes (8KB) — daily, recent entries quan trọng nhất ở đầu file
    // - active-tasks.json: 16384 bytes (16KB) — JSON cấu trúc, cần đủ để parse
    const memFiles = [
      { p: ssotMemoryPath, label: "MEMORY (project lessons + pitfalls — SSOT, shared với Claude Code)", cap: 65536 },
      { p: path.join(cwdRoot, "memory", "today.md"), label: "TODAY (daily progress, hot data)", cap: 8192 },
      { p: path.join(cwdRoot, "memory", "active-tasks.json"), label: "ACTIVE TASKS (in-flight)", cap: 16384 },
    ];
    const blocks: string[] = [];
    for (const f of memFiles) {
      try {
        const raw = await fs.readFile(f.p, "utf8");
        const text = raw.length > f.cap
          ? raw.slice(0, f.cap) + `\n... [truncated at ${f.cap} bytes; full at ${f.p}]`
          : raw;
        blocks.push(`### ${f.label}\n\n${text}`);
        memoryFilesLoaded.push(f.p);
      } catch {
        // Silent skip — file có thể không tồn tại cho project mới.
      }
    }
    if (blocks.length > 0) {
      memoryPrefix =
        `## 🧠 MEMORY CONTEXT (auto-injected by Paperclip — shared với Claude Code)\n\n` +
        `Đọc context dưới đây TRƯỚC khi xử lý issue. Đây là cùng memory mà Claude Code dùng.\n\n` +
        `${blocks.join("\n\n---\n\n")}\n\n---\n\n`;
    }

    // 2026-04-27 — Inject claude-mem semantic timeline (50 recent observations).
    // Same dump that Claude Code SessionStart hook produces. Spawn worker-service
    // CLI, parse JSON, extract `hookSpecificOutput.additionalContext`. Silent skip
    // if worker not running (port 37777) or spawn fails.
    try {
      const { spawnSync } = await import("node:child_process");
      const claudeMemRoot = path.join(
        userHome, ".claude", "plugins", "cache", "thedotmack", "claude-mem", "12.2.0",
      );
      const bunRunner = path.join(claudeMemRoot, "scripts", "bun-runner.js");
      const workerService = path.join(claudeMemRoot, "scripts", "worker-service.cjs");
      // Try once with 8s budget — context query is local SQLite read, fast.
      const result = spawnSync(
        "node",
        [bunRunner, workerService, "hook", "claude-code", "context"],
        { cwd: cwdRoot, timeout: 8000, encoding: "utf8", windowsHide: true },
      );
      if (result.status === 0 && typeof result.stdout === "string" && result.stdout.length > 0) {
        try {
          const parsed = JSON.parse(result.stdout);
          const ctx = parsed?.hookSpecificOutput?.additionalContext;
          if (typeof ctx === "string" && ctx.length > 0) {
            memoryPrefix +=
              `## 🧠 CLAUDE-MEM TIMELINE (semantic index, shared cross-runtime)\n\n` +
              `Đây là 50 observations gần nhất của project (cùng index Claude Code dùng).\n` +
              `Fetch chi tiết: \`mcp__claude-mem__get_observations([IDs])\` hoặc skill mem-search.\n\n` +
              `${ctx}\n\n---\n\n`;
            memoryFilesLoaded.push("[claude-mem timeline]");
          }
        } catch { /* JSON parse fail — skip silent */ }
      }
    } catch { /* spawn fail — skip silent */ }
  }
  // Postgres JSONB không chứa được NUL byte và reject \\uXXXX không hợp lệ —
  // strip cả hai trước khi memoryPrefix chảy vào prompt (claude-mem observation
  // dump có thể nhúng NUL từ raw blobs → run fail "unsupported Unicode escape sequence").
  memoryPrefix = memoryPrefix
    .replace(/\x00/g, "")
    .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u");
  // Prepend memory TRƯỚC instructions để agent đọc context trước rules.
  instructionsPrefix = memoryPrefix + instructionsPrefix;
  const commandNotes = (() => {
    const notes: string[] = [
      "Prompt is passed to Gemini via stdin when it contains newlines or exceeds 4000 chars",
      "(Windows cmd.exe breaks raw newlines inside quoted .CMD wrapper args — see BUG-035).",
      "Short single-line prompts are passed inline as --prompt \"<text>\" for debuggability.",
    ];
    notes.push("Added --approval-mode yolo for unattended execution.");
    if (!instructionsFilePath) return notes;
    if (instructionsPrefix.length > 0) {
      notes.push(
        `Loaded agent instructions from ${instructionsFilePath}`,
        `Prepended instructions + path directive to prompt (relative references from ${instructionsDir}).`,
      );
      return notes;
    }
    notes.push(
      `Configured instructionsFilePath ${instructionsFilePath}, but file could not be read; continuing without injected instructions.`,
    );
    return notes;
  })();

  // 2026-04-27 — Log memory injection separately so debugging can confirm
  // each agent run actually picked up SSOT memory files.
  if (memoryPrefix.length > 0) {
    commandNotes.push(
      `Auto-injected memory context (~${memoryPrefix.length} chars from ${memoryFilesLoaded.length} file(s)): ${memoryFilesLoaded.join(", ")}`,
    );
  }

  const bootstrapPromptTemplate = asString(config.bootstrapPromptTemplate, "");
  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };
  const renderedPrompt = renderTemplate(promptTemplate, templateData);
  const renderedBootstrapPrompt =
    !sessionId && bootstrapPromptTemplate.trim().length > 0
      ? renderTemplate(bootstrapPromptTemplate, templateData).trim()
      : "";
  const sessionHandoffNote = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const paperclipSkillPointer = renderPaperclipSkillPointer(env, instructionsFilePath);
  const paperclipEnvNote = renderPaperclipEnvNote(env);
  const apiAccessNote = renderApiAccessNote(env);
  const wakeFocusNotice = (() => {
    if (!wakeReason) return "";
    const isCommentWake =
      wakeReason === "issue_comment_mentioned" ||
      wakeReason === "issue_commented" ||
      wakeReason === "issue_reopened_via_comment";
    const isAssignWake = wakeReason === "issue_assigned";
    if (!isCommentWake && !isAssignWake) return "";
    const taskLine = wakeTaskId ? `Issue ID: ${wakeTaskId}` : "";
    const commentLine = wakeCommentId ? `Comment ID: ${wakeCommentId}` : "";
    const focusLines = [taskLine, commentLine].filter((line) => line.length > 0);
    if (focusLines.length === 0) return "";
    const action = isCommentWake
      ? [
          wakeReason === "issue_comment_mentioned"
            ? "YOU WERE WOKEN BECAUSE A NEW COMMENT MENTIONS YOU."
            : wakeReason === "issue_reopened_via_comment"
              ? "YOU WERE WOKEN BECAUSE THE ISSUE WAS REOPENED VIA A NEW COMMENT."
              : "YOU WERE WOKEN BECAUSE A NEW COMMENT WAS POSTED ON AN ISSUE ASSIGNED TO YOU.",
          "Your first action THIS TURN must be to read that specific comment and respond to its request.",
          "Do NOT scan other issues or report 'no new work' until you have read and addressed this comment.",
          "Do NOT assume the comment is unrelated to your current task — the commenter may be asking you to change approach, clarifying earlier assumptions, or correcting your previous reply.",
          "GET /api/issues/<ID> and GET /api/issues/<ID>/comments, find the wake comment by its Comment ID, then act on it.",
          "ALSO GET /api/issues/<ID>/attachments — the user may have attached screenshots/images/files.",
          "Each attachment has `issueCommentId` and `contentPath` (/api/attachments/<id>/content) — read any attachment whose issueCommentId matches the wake comment or is null (issue-level).",
        ].join(" ")
      : [
          "YOU WERE WOKEN BECAUSE A NEW ISSUE WAS ASSIGNED TO YOU.",
          "Your first action THIS TURN must be to read that issue and begin working it.",
          "Do NOT continue a previous task until you have read the newly assigned issue.",
          "ALSO GET /api/issues/<ID>/attachments — the reporter may have attached screenshots/files.",
        ].join(" ");
    return [
      "## Wake focus (DO THIS FIRST)",
      ...focusLines,
      `Wake reason: ${wakeReason}`,
      "",
      action,
    ].join("\n");
  })();
  const prompt = joinPromptSections([
    // Skill pointer goes FIRST and must appear regardless of wake type, session
    // resume status, or whether AGENTS.md loaded. Without this, timer/comment/
    // approval wakes that resume an existing session can skip the instructions
    // block and the agent forgets how to talk to the Paperclip API.
    paperclipSkillPointer,
    instructionsPrefix,
    renderedBootstrapPrompt,
    sessionHandoffNote,
    wakeFocusNotice,
    paperclipEnvNote,
    apiAccessNote,
    renderedPrompt,
  ]);
  const promptMetrics = {
    promptChars: prompt.length,
    skillPointerChars: paperclipSkillPointer.length,
    instructionsChars: instructionsPrefix.length,
    bootstrapPromptChars: renderedBootstrapPrompt.length,
    sessionHandoffChars: sessionHandoffNote.length,
    wakeFocusChars: wakeFocusNotice.length,
    runtimeNoteChars: paperclipEnvNote.length + apiAccessNote.length,
    heartbeatPromptChars: renderedPrompt.length,
  };

  // Windows `.CMD` launch goes through `cmd.exe /d /s /c "<commandLine>"`.
  // A raw newline inside the quoted `--prompt "..."` arg terminates that wrapped
  // command line — cmd.exe treats the rest as a new command, gemini.CMD runs with
  // a truncated prompt, and the remainder gets re-interpreted as positional text,
  // which then collides with the surviving `--prompt` flag. Symptom (reproduced
  // 2026-04-14, exit 1):
  //   Cannot use both a positional prompt and the --prompt (-p) flag together
  // Pipe prompts that contain a newline (or exceed the safe argv budget) through
  // stdin so cmd.exe never parses them. See troubleshooting_tips BUG-035 / BUG-028.
  const PROMPT_ARG_SAFE_CHARS = 4000;
  const promptHasNewline = /\r|\n/.test(prompt);
  const usePromptStdin = promptHasNewline || prompt.length > PROMPT_ARG_SAFE_CHARS;
  // NOTE 2026-04-14: tried `--include-directories ~/.gemini` to let the agent
  // read `~/.gemini/RULES.md` (which Gemini CLI auto-injects into context) and
  // stop the apologise-loop when the sandboxed `read_file` tool blocks that
  // path. The flag caused Gemini CLI to re-trigger the very same "positional +
  // --prompt" crash that BUG-035 fixed — reproduced standalone. The current
  // hypothesis is that `cmd.exe /d /s /c "...gemini.CMD ... --include-directories
  // \"C:\\Users\\Jennie Chu\\.gemini\" ..."` loses a quote boundary somewhere in
  // the Windows shell+.CMD re-invocation pipeline, leaking the path as a
  // positional arg. Dropped the flag until we have a reliable fix. The
  // apologise-loop is non-fatal (agent still completes work).
  const buildArgs = (resumeSessionId: string | null) => {
    const args = ["--output-format", "stream-json"];
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    if (model && model !== DEFAULT_GEMINI_LOCAL_MODEL) args.push("--model", model);
    args.push("--approval-mode", "yolo");
    if (sandbox) {
      args.push("--sandbox");
    } else {
      args.push("--sandbox=none");
    }
    if (extraArgs.length > 0) args.push(...extraArgs);
    // `--prompt ""` keeps Gemini CLI in non-interactive mode. When stdin is piped
    // (see below), the CLI reads the actual prompt from stdin per its own docs:
    //   "Appended to input on stdin (if any)."
    args.push("--prompt", usePromptStdin ? "" : prompt);
    return args;
  };

  const runAttempt = async (resumeSessionId: string | null) => {
    const args = buildArgs(resumeSessionId);
    if (onMeta) {
      await onMeta({
        adapterType: "gemini_local",
        command: resolvedCommand,
        cwd,
        commandNotes,
        commandArgs: args.map((value, index) => (
          index === args.length - 1 ? `<prompt ${prompt.length} chars>` : value
        )),
        env: loggedEnv,
        prompt,
        promptMetrics,
        context,
      });
    }

    const proc = await runChildProcess(runId, command, args, {
      cwd,
      env,
      timeoutSec,
      graceSec,
      onSpawn,
      onLog,
      // When the prompt contains newlines or exceeds the Windows argv budget,
      // runChildProcess writes + ends the child stdin for us. Short single-line
      // prompts still go on argv for readability in run-details.
      stdin: usePromptStdin ? prompt : undefined,
    });
    return {
      proc,
      parsed: parseGeminiJsonl(proc.stdout),
    };
  };

  const toResult = (
    attempt: {
      proc: {
        exitCode: number | null;
        signal: string | null;
        timedOut: boolean;
        stdout: string;
        stderr: string;
      };
      parsed: ReturnType<typeof parseGeminiJsonl>;
    },
    clearSessionOnMissingSession = false,
    isRetry = false,
  ): AdapterExecutionResult => {
    const authMeta = detectGeminiAuthRequired({
      parsed: attempt.parsed.resultEvent,
      stdout: attempt.proc.stdout,
      stderr: attempt.proc.stderr,
    });

    if (attempt.proc.timedOut) {
      return {
        exitCode: attempt.proc.exitCode,
        signal: attempt.proc.signal,
        timedOut: true,
        errorMessage: `Timed out after ${timeoutSec}s`,
        errorCode: authMeta.requiresAuth ? "gemini_auth_required" : null,
        clearSession: clearSessionOnMissingSession,
      };
    }

    const clearSessionForTurnLimit = isGeminiTurnLimitResult(attempt.parsed.resultEvent, attempt.proc.exitCode);

    // On retry, don't fall back to old session ID — the old session was stale
    const canFallbackToRuntimeSession = !isRetry;
    const resolvedSessionId = attempt.parsed.sessionId
      ?? (canFallbackToRuntimeSession ? (runtimeSessionId ?? runtime.sessionId ?? null) : null);
    const resolvedSessionParams = resolvedSessionId
      ? ({
        sessionId: resolvedSessionId,
        cwd,
        ...(currentPersonaHash ? { personaHash: currentPersonaHash } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(workspaceRepoUrl ? { repoUrl: workspaceRepoUrl } : {}),
        ...(workspaceRepoRef ? { repoRef: workspaceRepoRef } : {}),
      } as Record<string, unknown>)
      : null;
    const parsedError = typeof attempt.parsed.errorMessage === "string" ? attempt.parsed.errorMessage.trim() : "";
    const stderrLine = firstNonEmptyLine(attempt.proc.stderr);
    const structuredFailure = attempt.parsed.resultEvent
      ? describeGeminiFailure(attempt.parsed.resultEvent)
      : null;
    const fallbackErrorMessage =
      parsedError ||
      structuredFailure ||
      stderrLine ||
      `Gemini exited with code ${attempt.proc.exitCode ?? -1}`;

    return {
      exitCode: attempt.proc.exitCode,
      signal: attempt.proc.signal,
      timedOut: false,
      errorMessage: (attempt.proc.exitCode ?? 0) === 0 ? null : fallbackErrorMessage,
      errorCode: (attempt.proc.exitCode ?? 0) !== 0 && authMeta.requiresAuth ? "gemini_auth_required" : null,
      usage: attempt.parsed.usage,
      sessionId: resolvedSessionId,
      sessionParams: resolvedSessionParams,
      sessionDisplayId: resolvedSessionId,
      provider: "google",
      biller: "google",
      model,
      billingType,
      costUsd: attempt.parsed.costUsd,
      resultJson: attempt.parsed.resultEvent ?? {
        stdout: attempt.proc.stdout,
        stderr: attempt.proc.stderr,
      },
      summary: attempt.parsed.summary,
      question: attempt.parsed.question,
      clearSession: clearSessionForTurnLimit || Boolean(clearSessionOnMissingSession && !resolvedSessionId),
    };
  };

  const initial = await runAttempt(sessionId);
  if (
    sessionId &&
    !initial.proc.timedOut &&
    (initial.proc.exitCode ?? 0) !== 0 &&
    isGeminiUnknownSessionError(initial.proc.stdout, initial.proc.stderr)
  ) {
    await onLog(
      "stdout",
      `[paperclip] Gemini resume session "${sessionId}" is unavailable; retrying with a fresh session.\n`,
    );
    const retry = await runAttempt(null);
    return toResult(retry, true, true);
  }

  // Quota fallback: nếu Gemini API trả 429/quota_exhausted trên model hiện tại
  // (auto/Pro), thử lại đúng 1 lần với gemini-2.5-flash.
  // Skip khi:
  //   1. CLI đã ở Flash/Flash-lite tier — không có model nhỏ hơn để fallback
  //   2. Stderr chứa "no capacity available for model gemini-2.5-flash" — Flash
  //      cũng đang overload phía Google, fallback sẽ chỉ hit cùng backend đã
  //      fail. Không có ích, chỉ tốn thêm 5+ phút.
  //   3. CLI invoke #1 đã success (resultEvent.status === "success") — 429 trong
  //      stderr là CLI internal retry chain noise, KHÔNG phải lỗi cuối cùng.
  //      Adapter trigger fallback ở case này = false positive, force agent
  //      chuyển từ Pro working → Flash overloaded → run fail oan.
  // Lịch sử: 2026-04-28 đã drop exitCode!=0 requirement vì CLI exit 0 khi
  // internal retry succeeded. Nhưng quota detector regex match cả stderr 429
  // noise → cần thêm signal "result event status" để filter false positive.
  // Pre-fix bug: agent pin Flash hoặc model=auto → invoke #1 success on Pro
  // nhưng stderr có 429 retry → adapter retry với Flash → "No capacity for
  // model gemini-2.5-flash" → run fail mặc dù invoke #1 đã success.
  const QUOTA_FALLBACK_MODEL = "gemini-2.5-flash";
  const initialResultStatus = (() => {
    const parsed = initial.parsed.resultEvent;
    if (!parsed) return "";
    const status = (parsed as Record<string, unknown>).status;
    return typeof status === "string" ? status.trim().toLowerCase() : "";
  })();
  const initialActuallyFailed =
    initialResultStatus === "error" ||
    (initial.proc.exitCode ?? 0) !== 0;
  const stderrMentionsFlashOverload = /no capacity available for model gemini-2\.5-flash/i.test(
    initial.proc.stderr || "",
  );
  const isAlreadyFallbackTier =
    model === QUOTA_FALLBACK_MODEL ||
    model === "gemini-2.5-flash-lite" ||
    stderrMentionsFlashOverload;
  if (
    initialActuallyFailed &&
    !initial.proc.timedOut &&
    !isAlreadyFallbackTier
  ) {
    const quotaCheck = detectGeminiQuotaExhausted({
      parsed: initial.parsed.resultEvent,
      stdout: initial.proc.stdout,
      stderr: initial.proc.stderr,
    });
    if (quotaCheck.exhausted) {
      const previousModel = model || DEFAULT_GEMINI_LOCAL_MODEL;
      await onLog(
        "stdout",
        `[paperclip] Gemini quota exhausted on "${previousModel}" — retrying once with ${QUOTA_FALLBACK_MODEL} (fresh session).\n`,
      );
      model = QUOTA_FALLBACK_MODEL;
      // Fresh session: session state không guarantee portable cross-model.
      const fallback = await runAttempt(null);
      return toResult(fallback, true, true);
    }
  }

  return toResult(initial);
}
