import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asNumber, asString, parseJson, parseObject } from "@paperclipai/adapter-utils/server-utils";

// ── Output parsing ──────────────────────────────────────────────────────────
// Antigravity CLI (`agy`) prints the assistant reply as PLAIN TEXT on stdout in
// print mode (`-p`), NOT stream-json (unlike Gemini CLI). So the reply is simply
// the stdout text. We still strip a few known banner/diagnostic lines that agy
// may emit (MCP warnings, "Loaded ... brain", etc.) so the summary stays clean.

// Lines agy may print around the actual answer that are noise, not reply content.
const AGY_NOISE_LINE_RE =
  /^(?:\[?(?:info|warn|warning|debug)\]?[:\s]|loaded\s|using\s+conversation\b|mcp\s+issues\s+detected|connecting\s+to\s+mcp|starting\s+antigravity|✦\s*$)/i;

export interface AntigravityParseResult {
  summary: string;
  leaked: boolean;
}

export function parseAntigravityStdout(stdout: string): AntigravityParseResult {
  const lines = (stdout ?? "").split(/\r?\n/);
  const kept: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim().length === 0) {
      kept.push("");
      continue;
    }
    if (AGY_NOISE_LINE_RE.test(line.trim())) continue;
    kept.push(line);
  }
  const summary = kept.join("\n").trim();
  return { summary, leaked: looksLikeSystemPromptLeak(summary) };
}

// Leak-guard: if agy echoes the injected context file back (instead of acting on
// it), the reply will contain these unmistakable internal markers. The heartbeat
// runtime can use `leaked` to avoid posting raw system context as a comment.
const SYSTEM_PROMPT_LEAK_MARKERS = [
  "QUAN TRỌNG: KỸ NĂNG PAPERCLIP",
  "BỐI CẢNH BẮT BUỘC PHẢI GREP",
  "MEMORY CONTEXT (auto-injected",
  "CÁCH GỌI MCP TOOLS (QUAN TRỌNG",
  "Paperclip runtime note:",
];

export function looksLikeSystemPromptLeak(text: string): boolean {
  if (!text) return false;
  return SYSTEM_PROMPT_LEAK_MARKERS.some((marker) => text.includes(marker));
}

// ── Usage / cost (best-effort, optional) ────────────────────────────────────
// agy does not stream usage. After the run it writes a transcript to
//   ~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript.jsonl
// We read that file (if present) and tolerantly accumulate token usage. Any
// failure → zero usage (usage is optional, never fails the run).

export interface AntigravityUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

function accumulateUsage(target: AntigravityUsage, usageRaw: unknown): void {
  const usage = parseObject(usageRaw);
  const usageMetadata = parseObject(usage.usageMetadata);
  const source = Object.keys(usageMetadata).length > 0 ? usageMetadata : usage;
  target.inputTokens += asNumber(
    source.input_tokens,
    asNumber(source.inputTokens, asNumber(source.promptTokenCount, 0)),
  );
  target.cachedInputTokens += asNumber(
    source.cached_input_tokens,
    asNumber(source.cachedInputTokens, asNumber(source.cachedContentTokenCount, 0)),
  );
  target.outputTokens += asNumber(
    source.output_tokens,
    asNumber(source.outputTokens, asNumber(source.candidatesTokenCount, 0)),
  );
}

export function antigravityTranscriptPath(conversationId: string): string {
  return path.join(
    os.homedir(),
    ".gemini",
    "antigravity-cli",
    "brain",
    conversationId,
    ".system_generated",
    "logs",
    "transcript.jsonl",
  );
}

// CRITICAL (Windows TTY trap — lesson evolution-log/08-windows.md, 2026-06-15):
// agy is a TTY-engine CLI; on Windows it prints the reply straight to CONOUT$,
// BYPASSING the subprocess stdout pipe → proc.stdout is EMPTY. The real reply
// MUST be read from the brain transcript (PLANNER_RESPONSE from the MODEL).
//
// The brain is REUSED across turns, so we must return ONLY this run's answer, not
// a stale prior turn. We locate the USER_INPUT whose content contains `turnMarker`
// (the unique per-run temp prompt filename, e.g. agy_prompt_<runId>.md) and gather
// every non-empty MODEL/PLANNER_RESPONSE AFTER it. If that USER_INPUT is not in the
// file yet (agy still flushing), found=false → the caller polls/retries.
function parseReplyOnce(
  raw: string,
  turnMarker: string,
): { reply: string; found: boolean } {
  const entries: Array<{ type: string; source: string; content: string }> = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const data = parseJson(line);
    if (!data) continue;
    entries.push({
      type: asString(data.type, "").trim(),
      source: asString(data.source, "").trim(),
      content: asString(data.content, ""),
    });
  }

  // Index of the USER_INPUT that belongs to this run.
  let startIdx = -1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.type !== "USER_INPUT") continue;
    if (turnMarker ? e.content.includes(turnMarker) : true) startIdx = i;
  }
  if (startIdx < 0) return { reply: "", found: false };

  const responses: string[] = [];
  for (let i = startIdx + 1; i < entries.length; i++) {
    const e = entries[i];
    // A later USER_INPUT means our turn ended — stop (defensive; shouldn't happen
    // when turnMarker matches the latest run).
    if (e.type === "USER_INPUT") break;
    if (e.source === "MODEL" && e.type === "PLANNER_RESPONSE") {
      const content = e.content.trim();
      if (content) responses.push(content);
    }
  }
  return { reply: responses.join("\n\n").trim(), found: responses.length > 0 };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function readAntigravityReplyFromTranscript(
  conversationId: string,
  turnMarker: string,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<{ reply: string; found: boolean }> {
  if (!conversationId) return { reply: "", found: false };
  const attempts = opts.attempts ?? 8;
  const delayMs = opts.delayMs ?? 700;
  const transcriptPath = antigravityTranscriptPath(conversationId);
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const raw = await fs.readFile(transcriptPath, "utf8");
      const result = parseReplyOnce(raw, turnMarker);
      if (result.found) return result;
    } catch {
      // transcript not written yet — fall through to retry.
    }
    if (attempt < attempts - 1) await sleep(delayMs);
  }
  return { reply: "", found: false };
}

export async function readAntigravityTranscriptUsage(
  conversationId: string,
): Promise<{ usage: AntigravityUsage; costUsd: number | null }> {
  const usage: AntigravityUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  let costUsd: number | null = null;
  if (!conversationId) return { usage, costUsd };
  try {
    const raw = await fs.readFile(antigravityTranscriptPath(conversationId), "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const event = parseJson(line);
      if (!event) continue;
      if (event.usage || event.usageMetadata) {
        accumulateUsage(usage, event.usage ?? event.usageMetadata);
      }
      const cost = asNumber(
        event.total_cost_usd,
        asNumber(event.cost_usd, asNumber(event.cost, Number.NaN)),
      );
      if (Number.isFinite(cost) && cost > 0) costUsd = (costUsd ?? 0) + cost;
    }
  } catch {
    // transcript missing/unreadable — usage stays zero (optional).
  }
  return { usage, costUsd };
}

// ── Error / auth / quota detection (text-based, provider-agnostic enough) ────
// agy auth + quota errors surface as plain text on stdout/stderr.

const AUTH_REQUIRED_RE =
  /(?:not\s+authenticated|please\s+authenticate|authentication\s+required|unauthorized|invalid\s+credentials|not\s+logged\s+in|login\s+required|consent\s+could\s+not\s+be\s+obtained|invalid\s+authorization\s+code|requires\s+authentication)/i;
const QUOTA_EXHAUSTED_RE =
  /(?:resource_exhausted|quota|rate[-\s]?limit|too many requests|\b429\b|billing details|no capacity available|usage limit)/i;

function scanLines(stdout: string, stderr: string): string[] {
  return `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function detectAntigravityAuthRequired(input: {
  stdout: string;
  stderr: string;
}): { requiresAuth: boolean } {
  const requiresAuth = scanLines(input.stdout, input.stderr).some((line) => AUTH_REQUIRED_RE.test(line));
  return { requiresAuth };
}

export function detectAntigravityQuotaExhausted(input: {
  stdout: string;
  stderr: string;
}): { exhausted: boolean } {
  const exhausted = scanLines(input.stdout, input.stderr).some((line) => QUOTA_EXHAUSTED_RE.test(line));
  return { exhausted };
}
