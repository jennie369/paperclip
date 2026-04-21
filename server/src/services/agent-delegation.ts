// Agent delegation service — inline CEO→subagent handoff.
//
// Design (plan: memory/reports/2026-04-21-delegate-to-agent-plan.md in
// crypto-pattern-scanner):
//   - One delegation = one row in `issues`:
//       origin_kind   = "delegation"
//       origin_id     = traceId (random UUID)
//       origin_run_id = caller heartbeat run id
//       created_by_agent_id = caller agent
//       assignee_agent_id   = target agent
//       parent_id           = caller's current issue (optional)
//       request_depth       = parent.request_depth + 1 (max 3)
//   - Meta (timeout_ms, turn_mode) encoded as an HTML-comment prefix in
//     description so the issue renders cleanly in existing UI.
//   - Target is woken through the already-existing `heartbeat.wakeup()`
//     API — no nested Claude CLI spawn.
//   - Caller can fan-out multiple `create()` calls in the same reasoning
//     turn, then `await` them collectively.
//
// Reuses (per RULE 5 — two SSOT tables independent):
//   - issues, agents (Drizzle schema)
//   - issueService.create()
//   - heartbeatService.wakeup()
//
// Does NOT touch:
//   - paperclip_agents (router-domain SSOT — out of scope)
//   - adapter_config (heartbeat-domain SSOT but managed elsewhere)

import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Db } from "@paperclipai/db";
import { agents, issues } from "@paperclipai/db";
import { conflict, notFound, unprocessable } from "../errors.js";
import { logger } from "../middleware/logger.js";
import type { issueService } from "./issues.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants + types
// ─────────────────────────────────────────────────────────────────────────────

export const DELEGATION_ORIGIN_KIND = "delegation" as const;
export const DELEGATION_WAKE_REASON = "delegation_requested" as const;

const META_PREFIX_RE = /^<!-- DELEGATION meta: (.+?) -->\r?\n?/;

export type DelegationTurnMode = "ask" | "do" | "delegate";

export interface DelegationMeta {
  timeoutMs: number;
  turnMode: DelegationTurnMode;
}

export type DelegationStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "failed"
  | "cancelled"
  | "timeout";

export interface CreateDelegationInput {
  companyId: string;
  callerAgentId: string;
  callerRunId?: string | null;
  callerIssueId?: string | null;
  // UUID of the target agent (from the `agents` table). Upper layers
  // (MCP tool, REST route) resolve a human-friendly slug to this UUID
  // via paperclip_agents BEFORE calling the service. Keeping the service
  // UUID-only mirrors `issueService.assertAssignableAgent` and avoids a
  // cross-SSOT dependency (RULE 5 — heartbeat domain doesn't read router
  // domain).
  targetAgentId: string;
  task: string;
  timeoutMs?: number;
  turnMode?: DelegationTurnMode;
}

export interface DelegationRow {
  id: string;
  traceId: string;
  companyId: string;
  callerAgentId: string;
  targetAgentId: string;
  parentIssueId: string | null;
  status: DelegationStatus;
  requestedAt: Date;
  completedAt: Date | null;
  depth: number;
  meta: DelegationMeta;
  task: string;
}

export interface DelegationResult {
  traceId: string;
  status: DelegationStatus;
  durationMs: number;
  error?: string;
}

// Minimal shape of heartbeatService needed here. Kept structural so tests can
// mock without importing the full heartbeat module (heavy).
export interface WakeupDep {
  wakeup: (
    agentId: string,
    opts: {
      source?: string;
      triggerDetail?: string;
      reason?: string | null;
      payload?: Record<string, unknown> | null;
      requestedByActorType?: "user" | "agent" | "system";
      requestedByActorId?: string | null;
      contextSnapshot?: Record<string, unknown>;
    },
  ) => Promise<unknown>;
}

export interface AgentDelegationServiceConfig {
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
  maxConcurrentPerCaller: number;
  maxDepth: number;
  pollIntervalMs: number;
}

export const DEFAULT_DELEGATION_CONFIG: AgentDelegationServiceConfig = {
  defaultTimeoutMs: 300_000,
  maxTimeoutMs: 1_800_000,
  maxConcurrentPerCaller: 10,
  maxDepth: 3,
  pollIntervalMs: 2_000,
};

type IssueRow = typeof issues.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers (pure)
// ─────────────────────────────────────────────────────────────────────────────

export function encodeDelegationMeta(meta: DelegationMeta): string {
  return `<!-- DELEGATION meta: ${JSON.stringify(meta)} -->`;
}

export function parseDelegationMeta(description: string | null | undefined): DelegationMeta | null {
  if (!description) return null;
  const match = description.match(META_PREFIX_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed?.timeoutMs !== "number") return null;
    if (parsed?.turnMode !== "ask" && parsed?.turnMode !== "do" && parsed?.turnMode !== "delegate") {
      return null;
    }
    return { timeoutMs: parsed.timeoutMs, turnMode: parsed.turnMode };
  } catch {
    return null;
  }
}

export function extractDelegationTask(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(META_PREFIX_RE, "");
}

function mapIssueToStatus(issue: IssueRow): DelegationStatus {
  if (issue.cancelledAt) return "cancelled";
  if (issue.status === "done") return "done";
  if (issue.status === "cancelled") return "cancelled";
  if (issue.status === "in_progress" || issue.status === "in_review") return "in_progress";
  return "pending";
}

function issueRowToDelegation(issue: IssueRow, fallbackMeta: DelegationMeta): DelegationRow {
  const meta = parseDelegationMeta(issue.description) ?? fallbackMeta;
  return {
    id: issue.id,
    traceId: issue.originId ?? "",
    companyId: issue.companyId,
    callerAgentId: issue.createdByAgentId ?? "",
    targetAgentId: issue.assigneeAgentId ?? "",
    parentIssueId: issue.parentId,
    status: mapIssueToStatus(issue),
    requestedAt: issue.createdAt,
    completedAt: issue.completedAt ?? issue.cancelledAt ?? null,
    depth: issue.requestDepth,
    meta,
    task: extractDelegationTask(issue.description),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service factory
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentDelegationDeps {
  heartbeat: WakeupDep;
  issues: ReturnType<typeof issueService>;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export function agentDelegationService(
  db: Db,
  deps: AgentDelegationDeps,
  configOverride: Partial<AgentDelegationServiceConfig> = {},
) {
  const config: AgentDelegationServiceConfig = { ...DEFAULT_DELEGATION_CONFIG, ...configOverride };
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function findByTraceId(traceId: string): Promise<IssueRow | null> {
    if (!traceId) return null;
    const row = await db
      .select()
      .from(issues)
      .where(and(eq(issues.originKind, DELEGATION_ORIGIN_KIND), eq(issues.originId, traceId)))
      .then((rows) => rows[0] ?? null);
    return row ?? null;
  }

  async function listActiveByCaller(callerAgentId: string): Promise<IssueRow[]> {
    return db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.originKind, DELEGATION_ORIGIN_KIND),
          eq(issues.createdByAgentId, callerAgentId),
          sql`${issues.status} in ('backlog','todo','in_progress','in_review','blocked')`,
        ),
      );
  }

  async function assertTargetAgent(companyId: string, targetAgentId: string) {
    const row = await db
      .select({
        id: agents.id,
        companyId: agents.companyId,
        status: agents.status,
        name: agents.name,
      })
      .from(agents)
      .where(eq(agents.id, targetAgentId))
      .then((rows) => rows[0] ?? null);
    if (!row) throw notFound(`Target agent not found: ${targetAgentId}`);
    if (row.companyId !== companyId) {
      throw unprocessable(`Target agent '${row.name}' is in a different company`);
    }
    if (row.status === "pending_approval") {
      throw conflict(`Target agent '${row.name}' is pending approval`);
    }
    if (row.status === "terminated") {
      throw conflict(`Target agent '${row.name}' is terminated`);
    }
    return row;
  }

  async function getDepthForParent(parentIssueId: string | null | undefined): Promise<number> {
    if (!parentIssueId) return 0;
    const row = await db
      .select({ requestDepth: issues.requestDepth })
      .from(issues)
      .where(eq(issues.id, parentIssueId))
      .then((rows) => rows[0] ?? null);
    return row?.requestDepth ?? 0;
  }

  // Walks up the parent chain of `startIssueId` to check whether
  // `callerAgentId` already owns a delegation ancestor. That means the
  // caller would be re-delegating to a subtree that already delegated
  // back to them — a cycle.
  async function hasCycle(startIssueId: string, callerAgentId: string): Promise<boolean> {
    let cursor: string | null = startIssueId;
    // Cap walk at maxDepth + 1 to guarantee termination.
    for (let depth = 0; depth < config.maxDepth + 1; depth += 1) {
      if (!cursor) return false;
      const row: IssueRow | null = await db
        .select()
        .from(issues)
        .where(eq(issues.id, cursor))
        .then((rows) => rows[0] ?? null);
      if (!row) return false;
      if (row.originKind === DELEGATION_ORIGIN_KIND && row.assigneeAgentId === callerAgentId) {
        return true;
      }
      cursor = row.parentId;
    }
    // Walked past maxDepth without finding cycle — treat as safe; depth cap
    // will catch runaway nesting anyway.
    return false;
  }

  async function create(input: CreateDelegationInput): Promise<DelegationRow> {
    const timeoutMs = Math.min(
      Math.max(input.timeoutMs ?? config.defaultTimeoutMs, 30_000),
      config.maxTimeoutMs,
    );
    const turnMode: DelegationTurnMode = input.turnMode ?? "do";
    const meta: DelegationMeta = { timeoutMs, turnMode };

    const parentDepth = await getDepthForParent(input.callerIssueId ?? null);
    const nextDepth = parentDepth + 1;
    if (nextDepth > config.maxDepth) {
      throw conflict(
        `Delegation depth ${nextDepth} exceeds max ${config.maxDepth}`,
      );
    }

    const active = await listActiveByCaller(input.callerAgentId);
    if (active.length >= config.maxConcurrentPerCaller) {
      throw conflict(
        `Caller agent has ${active.length} active delegations (max ${config.maxConcurrentPerCaller})`,
      );
    }

    if (input.callerIssueId) {
      const cycle = await hasCycle(input.callerIssueId, input.callerAgentId);
      if (cycle) throw conflict("Delegation would create a cycle");
    }

    const target = await assertTargetAgent(input.companyId, input.targetAgentId);

    const traceId = randomUUID();
    const snippet = input.task.slice(0, 64).replace(/\s+/g, " ").trim();
    const title = `Delegation: ${snippet}${input.task.length > 64 ? "…" : ""}`;
    const description = `${encodeDelegationMeta(meta)}\n${input.task}`;

    const created = await deps.issues.create(input.companyId, {
      title,
      description,
      status: "todo",
      priority: "medium",
      assigneeAgentId: target.id,
      createdByAgentId: input.callerAgentId,
      parentId: input.callerIssueId ?? null,
      originKind: DELEGATION_ORIGIN_KIND,
      originId: traceId,
      originRunId: input.callerRunId ?? null,
      requestDepth: nextDepth,
    });

    try {
      await deps.heartbeat.wakeup(target.id, {
        source: "on_demand",
        triggerDetail: "system",
        reason: `Delegation from agent ${input.callerAgentId}: ${snippet}`,
        requestedByActorType: "agent",
        requestedByActorId: input.callerAgentId,
        payload: { issueId: created.id, traceId },
        contextSnapshot: {
          issueId: created.id,
          delegationTraceId: traceId,
          fromAgentId: input.callerAgentId,
          fromRunId: input.callerRunId ?? null,
          wakeReason: DELEGATION_WAKE_REASON,
          source: "agent-delegation",
          turnMode,
        },
      });
    } catch (err) {
      // Issue exists; poll loop will still surface it and caller can retry
      // wake via admin UI. Don't unwind the insert — that would leave a
      // half-created delegation on a crashed caller.
      logger.warn(
        { err, issueId: created.id, traceId },
        "[agent-delegation] wakeup failed; delegation issue created but target not woken",
      );
    }

    return issueRowToDelegation(created as IssueRow, meta);
  }

  async function cancel(traceId: string, reason?: string | null): Promise<void> {
    const issue = await findByTraceId(traceId);
    if (!issue) throw notFound(`Delegation not found: ${traceId}`);
    if (issue.status === "done" || issue.status === "cancelled") return;
    const stamp = now();
    await db
      .update(issues)
      .set({
        status: "cancelled",
        cancelledAt: stamp,
        updatedAt: stamp,
      })
      .where(eq(issues.id, issue.id));
    logger.info(
      { traceId, issueId: issue.id, reason: reason ?? null },
      "[agent-delegation] cancelled",
    );
  }

  async function awaitMany(
    traceIds: string[],
    timeoutMs?: number,
  ): Promise<DelegationResult[]> {
    const effectiveTimeout = Math.min(
      Math.max(timeoutMs ?? config.defaultTimeoutMs, 1_000),
      config.maxTimeoutMs,
    );
    const deadline = now().getTime() + effectiveTimeout;
    const results = new Map<string, DelegationResult>();
    const unique = Array.from(new Set(traceIds.filter((id): id is string => typeof id === "string" && id.length > 0)));
    if (unique.length === 0) return [];

    while (results.size < unique.length) {
      const pending = unique.filter((id) => !results.has(id));
      const rows = await db
        .select()
        .from(issues)
        .where(
          and(
            eq(issues.originKind, DELEGATION_ORIGIN_KIND),
            inArray(issues.originId, pending),
          ),
        );

      for (const row of rows) {
        const traceId = row.originId ?? "";
        if (!traceId) continue;
        const status = mapIssueToStatus(row);
        const terminal = status === "done" || status === "cancelled" || status === "failed";
        if (!terminal) continue;
        const terminalAt = row.completedAt ?? row.cancelledAt ?? now();
        results.set(traceId, {
          traceId,
          status,
          durationMs: terminalAt.getTime() - row.createdAt.getTime(),
        });
      }

      if (results.size >= unique.length) break;

      if (now().getTime() >= deadline) {
        for (const id of pending) {
          if (results.has(id)) continue;
          try {
            await cancel(id, "awaitDelegation timeout");
          } catch {
            // Swallow — best-effort cancel.
          }
          results.set(id, {
            traceId: id,
            status: "timeout",
            durationMs: effectiveTimeout,
            error: "timeout",
          });
        }
        break;
      }

      await sleep(config.pollIntervalMs);
    }

    return unique.map((id) => results.get(id)!).filter(Boolean);
  }

  async function get(traceId: string): Promise<DelegationRow | null> {
    const row = await findByTraceId(traceId);
    if (!row) return null;
    return issueRowToDelegation(row, { timeoutMs: config.defaultTimeoutMs, turnMode: "do" });
  }

  return {
    create,
    cancel,
    await: awaitMany,
    get,
    findByTraceId,
    listActiveByCaller,
    config,
  };
}

export type AgentDelegationService = ReturnType<typeof agentDelegationService>;
