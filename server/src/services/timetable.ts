import { and, eq, gte, lte, sql, or, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  heartbeatRuns,
  agents,
  issues,
  routineRuns,
  routines,
  timetableManualRows,
  timetableRowNotes,
  TIMETABLE_SOURCE_TABLES,
  type TimetableSourceTable,
} from "@paperclipai/db";

/**
 * Timetable unified row shape. Merged từ nhiều nguồn (heartbeat_runs, issues, routine_runs,
 * cc_social_posts, cc_email_campaigns, timetable_manual_rows). FE render như 1 bảng thống nhất.
 */
export interface TimetableRow {
  id: string;                    // composite: "{sourceTable}:{sourceId}"
  sourceTable: TimetableSourceTable | "timetable_manual_rows";
  sourceId: string;
  startsAt: string;              // ISO timestamp
  endsAt: string | null;
  agent: {
    id: string;
    name: string;
    model: string | null;
  } | null;
  kind: string;                  // heartbeat | task | post | reel | email | reply | routine | manual_task | meeting | reminder
  title: string;
  description: string;
  status: "done" | "running" | "scheduled" | "failed" | "paused";
  statusExtra: string | null;    // "2m14s" | "52m" | "còn 9h8m" | "cookie 401"
  resultAuto: string | null;
  resultOverride: string | null;
  note: string | null;
  payload: Record<string, unknown>;
  issueId: string | null;
}

export interface TimetableFilters {
  companyId: string;
  date: string;                  // YYYY-MM-DD (Asia/Ho_Chi_Minh)
  q?: string;                    // smart search query
  agentId?: string;
  types?: string[];              // filter by kind
  status?: TimetableRow["status"][];
  sort?: { field: "time" | "agent" | "kind" | "status" | "result"; dir: "asc" | "desc" };
  group?: "none" | "time_of_day" | "agent" | "kind" | "status" | "has_note";
}

export interface TimetableResponse {
  rows: TimetableRow[];
  kpis: {
    total: number;
    done: number;
    running: number;
    scheduled: number;
    failed: number;
    paused: number;
  };
  meta: {
    date: string;
    timezone: "Asia/Ho_Chi_Minh";
    dayStartUtc: string;
    dayEndUtc: string;
    sources: Record<string, number>;
  };
}

/** HCM offset is UTC+7. Compute [start, end] UTC for a local YYYY-MM-DD. */
function hcmDayRange(date: string): { startUtc: Date; endUtc: Date } {
  // "2026-04-22" local 00:00 HCM == "2026-04-21T17:00:00Z" UTC
  // "2026-04-22" local 23:59:59.999 HCM == "2026-04-22T16:59:59.999Z" UTC
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  const startUtc = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m - 1, d, 16, 59, 59, 999));
  return { startUtc, endUtc };
}

function humanizeDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return m ? `${h}h${m}m` : `${h}h`;
}

function agentModel(cfg: Record<string, unknown> | null | undefined): string | null {
  if (!cfg || typeof cfg !== "object") return null;
  const model = (cfg as Record<string, unknown>).model;
  return typeof model === "string" ? model : null;
}

export function timetableService(db: Db) {
  return {
    /**
     * Merge rows from all sources for a given company+date.
     * Uses Promise.all for parallel queries. Left-joins timetable_row_notes for overrides.
     */
    async list(filters: TimetableFilters): Promise<TimetableResponse> {
      const { companyId, date } = filters;
      const { startUtc, endUtc } = hcmDayRange(date);

      // Parallel fetch all sources
      const [heartbeats, issueRows, routineRunRows, manualRows, notes] = await Promise.all([
        fetchHeartbeatRuns(db, companyId, startUtc, endUtc, filters.agentId),
        fetchIssueRows(db, companyId, startUtc, endUtc, filters.agentId),
        fetchRoutineRuns(db, companyId, startUtc, endUtc),
        fetchManualRows(db, companyId, startUtc, endUtc, filters.agentId),
        fetchRowNotes(db, companyId),
      ]);

      // Build lookup for notes by (sourceTable, sourceId)
      const noteMap = new Map<string, { resultOverride: string | null; note: string | null }>();
      for (const n of notes) {
        noteMap.set(`${n.sourceTable}:${n.sourceId}`, {
          resultOverride: n.resultOverride,
          note: n.note,
        });
      }
      const attachNote = (row: TimetableRow): TimetableRow => {
        const n = noteMap.get(`${row.sourceTable}:${row.sourceId}`);
        if (n) {
          row.resultOverride = n.resultOverride;
          row.note = n.note;
        }
        return row;
      };

      let rows: TimetableRow[] = [
        ...heartbeats.map(attachNote),
        ...issueRows.map(attachNote),
        ...routineRunRows.map(attachNote),
        ...manualRows,  // manual rows already have note column inline
      ];

      // Filters
      if (filters.types?.length) {
        const want = new Set(filters.types);
        rows = rows.filter((r) => want.has(r.kind));
      }
      if (filters.status?.length) {
        const want = new Set(filters.status);
        rows = rows.filter((r) => want.has(r.status));
      }
      if (filters.q) {
        rows = applySmartSearch(rows, filters.q);
      }

      // Sort
      rows = sortRows(rows, filters.sort ?? { field: "time", dir: "asc" });

      // KPIs
      const kpis = {
        total: rows.length,
        done: rows.filter((r) => r.status === "done").length,
        running: rows.filter((r) => r.status === "running").length,
        scheduled: rows.filter((r) => r.status === "scheduled").length,
        failed: rows.filter((r) => r.status === "failed").length,
        paused: rows.filter((r) => r.status === "paused").length,
      };

      const sources: Record<string, number> = {};
      for (const r of rows) {
        sources[r.sourceTable] = (sources[r.sourceTable] ?? 0) + 1;
      }

      return {
        rows,
        kpis,
        meta: {
          date,
          timezone: "Asia/Ho_Chi_Minh",
          dayStartUtc: startUtc.toISOString(),
          dayEndUtc: endUtc.toISOString(),
          sources,
        },
      };
    },

    /**
     * Insert manual row. If createAsIssue=true + agentId set, caller will also create linked issue.
     */
    async createManual(input: {
      companyId: string;
      startsAt: Date;
      endsAt?: Date | null;
      agentId?: string | null;
      kind: string;
      title: string;
      description?: string | null;
      note?: string | null;
      issueId?: string | null;
      createdByUserId?: string | null;
      createdByAgentId?: string | null;
    }) {
      const [row] = await db
        .insert(timetableManualRows)
        .values({
          companyId: input.companyId,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          agentId: input.agentId ?? null,
          kind: input.kind,
          title: input.title,
          description: input.description ?? null,
          note: input.note ?? null,
          issueId: input.issueId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          createdByAgentId: input.createdByAgentId ?? null,
        })
        .returning();
      return row!;
    },

    /**
     * Upsert row note (override result + note) cho dòng hệ thống.
     * Key: (companyId, sourceTable, sourceId).
     */
    async upsertNote(input: {
      companyId: string;
      sourceTable: TimetableSourceTable;
      sourceId: string;
      resultOverride?: string | null;
      note?: string | null;
      updatedByUserId?: string | null;
      updatedByAgentId?: string | null;
    }) {
      if (!TIMETABLE_SOURCE_TABLES.includes(input.sourceTable)) {
        throw new Error(`Invalid source_table: ${input.sourceTable}`);
      }
      const existing = await db
        .select()
        .from(timetableRowNotes)
        .where(
          and(
            eq(timetableRowNotes.companyId, input.companyId),
            eq(timetableRowNotes.sourceTable, input.sourceTable),
            eq(timetableRowNotes.sourceId, input.sourceId),
          ),
        )
        .then((r) => r[0] ?? null);

      if (existing) {
        const [updated] = await db
          .update(timetableRowNotes)
          .set({
            resultOverride: input.resultOverride ?? existing.resultOverride,
            note: input.note ?? existing.note,
            updatedByUserId: input.updatedByUserId ?? existing.updatedByUserId,
            updatedByAgentId: input.updatedByAgentId ?? existing.updatedByAgentId,
          })
          .where(eq(timetableRowNotes.id, existing.id))
          .returning();
        return updated!;
      }

      const [inserted] = await db
        .insert(timetableRowNotes)
        .values({
          companyId: input.companyId,
          sourceTable: input.sourceTable,
          sourceId: input.sourceId,
          resultOverride: input.resultOverride ?? null,
          note: input.note ?? null,
          updatedByUserId: input.updatedByUserId ?? null,
          updatedByAgentId: input.updatedByAgentId ?? null,
        })
        .returning();
      return inserted!;
    },
  };
}

// ============================================================================
// Source fetchers — each returns TimetableRow[]
// ============================================================================

async function fetchHeartbeatRuns(
  db: Db,
  companyId: string,
  startUtc: Date,
  endUtc: Date,
  agentId?: string,
): Promise<TimetableRow[]> {
  const conditions = [
    eq(heartbeatRuns.companyId, companyId),
    gte(heartbeatRuns.createdAt, startUtc),
    lte(heartbeatRuns.createdAt, endUtc),
  ];
  if (agentId) conditions.push(eq(heartbeatRuns.agentId, agentId));

  const rows = await db
    .select({
      id: heartbeatRuns.id,
      status: heartbeatRuns.status,
      startedAt: heartbeatRuns.startedAt,
      finishedAt: heartbeatRuns.finishedAt,
      createdAt: heartbeatRuns.createdAt,
      invocationSource: heartbeatRuns.invocationSource,
      triggerDetail: heartbeatRuns.triggerDetail,
      error: heartbeatRuns.error,
      stdoutExcerpt: heartbeatRuns.stdoutExcerpt,
      agentId: heartbeatRuns.agentId,
      agentName: agents.name,
      agentConfig: agents.adapterConfig,
      sessionIdAfter: heartbeatRuns.sessionIdAfter,
      resultJson: heartbeatRuns.resultJson,
    })
    .from(heartbeatRuns)
    .leftJoin(agents, eq(agents.id, heartbeatRuns.agentId))
    .where(and(...conditions));

  return rows.map((r) => {
    const status = mapHeartbeatStatus(r.status);
    const startedAt = r.startedAt ?? r.createdAt;
    const statusExtra = r.finishedAt && r.startedAt
      ? humanizeDuration(new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime())
      : status === "running" && r.startedAt
      ? humanizeDuration(Date.now() - new Date(r.startedAt).getTime())
      : null;
    const resultAuto = r.resultJson
      ? summarizeResultJson(r.resultJson as Record<string, unknown>)
      : r.error
      ? r.error.slice(0, 120)
      : null;
    return {
      id: `heartbeat_runs:${r.id}`,
      sourceTable: "heartbeat_runs",
      sourceId: r.id,
      startsAt: new Date(startedAt).toISOString(),
      endsAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : null,
      agent: r.agentId && r.agentName
        ? {
            id: r.agentId,
            name: r.agentName,
            model: agentModel(r.agentConfig as Record<string, unknown>),
          }
        : null,
      kind: "heartbeat",
      title: `Heartbeat · ${r.invocationSource}`,
      description: r.triggerDetail ?? "",
      status,
      statusExtra,
      resultAuto,
      resultOverride: null,
      note: null,
      payload: {
        stdoutExcerpt: r.stdoutExcerpt ?? null,
        sessionIdAfter: r.sessionIdAfter ?? null,
        error: r.error ?? null,
      },
      issueId: null,
    };
  });
}

async function fetchIssueRows(
  db: Db,
  companyId: string,
  startUtc: Date,
  endUtc: Date,
  agentId?: string,
): Promise<TimetableRow[]> {
  const conditions = [
    eq(issues.companyId, companyId),
    isNull(issues.hiddenAt),
    or(
      and(gte(issues.startedAt, startUtc), lte(issues.startedAt, endUtc)),
      and(gte(issues.completedAt, startUtc), lte(issues.completedAt, endUtc)),
      and(
        gte(issues.updatedAt, startUtc),
        lte(issues.updatedAt, endUtc),
        or(eq(issues.status, sql`'in_progress'`), eq(issues.status, sql`'todo'`)),
      ),
    ),
  ];
  if (agentId) conditions.push(eq(issues.assigneeAgentId, agentId));

  const rows = await db
    .select({
      id: issues.id,
      identifier: issues.identifier,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      startedAt: issues.startedAt,
      completedAt: issues.completedAt,
      updatedAt: issues.updatedAt,
      createdAt: issues.createdAt,
      assigneeAgentId: issues.assigneeAgentId,
      agentName: agents.name,
      agentConfig: agents.adapterConfig,
      originKind: issues.originKind,
    })
    .from(issues)
    .leftJoin(agents, eq(agents.id, issues.assigneeAgentId))
    .where(and(...conditions))
    .limit(500);

  return rows.map((r) => {
    const status = mapIssueStatus(r.status);
    const anchor = r.startedAt ?? r.updatedAt ?? r.createdAt;
    const statusExtra = r.completedAt && r.startedAt
      ? humanizeDuration(new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime())
      : status === "running" && r.startedAt
      ? humanizeDuration(Date.now() - new Date(r.startedAt).getTime())
      : null;
    return {
      id: `issues:${r.id}`,
      sourceTable: "issues",
      sourceId: r.id,
      startsAt: new Date(anchor).toISOString(),
      endsAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      agent: r.assigneeAgentId && r.agentName
        ? {
            id: r.assigneeAgentId,
            name: r.agentName,
            model: agentModel(r.agentConfig as Record<string, unknown>),
          }
        : null,
      kind: "task",
      title: `${r.identifier ?? "ISSUE"} · ${r.title}`,
      description: r.description ?? "",
      status,
      statusExtra,
      resultAuto: r.status,
      resultOverride: null,
      note: null,
      payload: {
        priority: r.priority,
        originKind: r.originKind ?? null,
      },
      issueId: r.id,
    };
  });
}

async function fetchRoutineRuns(
  db: Db,
  companyId: string,
  startUtc: Date,
  endUtc: Date,
): Promise<TimetableRow[]> {
  const conditions = [
    eq(routineRuns.companyId, companyId),
    gte(routineRuns.createdAt, startUtc),
    lte(routineRuns.createdAt, endUtc),
  ];

  const rows = await db
    .select({
      id: routineRuns.id,
      routineId: routineRuns.routineId,
      status: routineRuns.status,
      triggeredAt: routineRuns.triggeredAt,
      completedAt: routineRuns.completedAt,
      createdAt: routineRuns.createdAt,
      failureReason: routineRuns.failureReason,
      linkedIssueId: routineRuns.linkedIssueId,
      routineTitle: routines.title,
      routineDescription: routines.description,
      assigneeAgentId: routines.assigneeAgentId,
      agentName: agents.name,
      agentConfig: agents.adapterConfig,
    })
    .from(routineRuns)
    .leftJoin(routines, eq(routines.id, routineRuns.routineId))
    .leftJoin(agents, eq(agents.id, routines.assigneeAgentId))
    .where(and(...conditions))
    .limit(300);

  return rows.map((r) => {
    const status = mapRoutineStatus(r.status);
    const anchor = r.triggeredAt ?? r.createdAt;
    const statusExtra = r.completedAt
      ? humanizeDuration(new Date(r.completedAt).getTime() - new Date(r.triggeredAt).getTime())
      : null;
    return {
      id: `routine_runs:${r.id}`,
      sourceTable: "routine_runs" as const,
      sourceId: r.id,
      startsAt: new Date(anchor).toISOString(),
      endsAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      agent: r.assigneeAgentId && r.agentName
        ? {
            id: r.assigneeAgentId,
            name: r.agentName,
            model: agentModel(r.agentConfig as Record<string, unknown>),
          }
        : null,
      kind: "routine",
      title: `Routine · ${r.routineTitle ?? r.routineId}`,
      description: r.routineDescription ?? "",
      status,
      statusExtra,
      resultAuto: r.failureReason ?? (status === "done" ? "OK" : null),
      resultOverride: null,
      note: null,
      payload: {
        routineId: r.routineId,
        linkedIssueId: r.linkedIssueId ?? null,
      },
      issueId: r.linkedIssueId ?? null,
    };
  });
}

async function fetchManualRows(
  db: Db,
  companyId: string,
  startUtc: Date,
  endUtc: Date,
  agentId?: string,
): Promise<TimetableRow[]> {
  const conditions = [
    eq(timetableManualRows.companyId, companyId),
    gte(timetableManualRows.startsAt, startUtc),
    lte(timetableManualRows.startsAt, endUtc),
  ];
  if (agentId) conditions.push(eq(timetableManualRows.agentId, agentId));

  const rows = await db
    .select({
      id: timetableManualRows.id,
      startsAt: timetableManualRows.startsAt,
      endsAt: timetableManualRows.endsAt,
      agentId: timetableManualRows.agentId,
      kind: timetableManualRows.kind,
      title: timetableManualRows.title,
      description: timetableManualRows.description,
      note: timetableManualRows.note,
      issueId: timetableManualRows.issueId,
      agentName: agents.name,
      agentConfig: agents.adapterConfig,
    })
    .from(timetableManualRows)
    .leftJoin(agents, eq(agents.id, timetableManualRows.agentId))
    .where(and(...conditions));

  return rows.map((r) => ({
    id: `timetable_manual_rows:${r.id}`,
    sourceTable: "timetable_manual_rows" as const,
    sourceId: r.id,
    startsAt: new Date(r.startsAt).toISOString(),
    endsAt: r.endsAt ? new Date(r.endsAt).toISOString() : null,
    agent: r.agentId && r.agentName
      ? {
          id: r.agentId,
          name: r.agentName,
          model: agentModel(r.agentConfig as Record<string, unknown>),
        }
      : null,
    kind: r.kind,
    title: r.title,
    description: r.description ?? "",
    status: r.issueId ? "scheduled" : "done",  // manual row "done" khi tạo xong
    statusExtra: null,
    resultAuto: null,
    resultOverride: null,
    note: r.note,
    payload: {
      issueId: r.issueId ?? null,
    },
    issueId: r.issueId ?? null,
  }));
}

async function fetchRowNotes(db: Db, companyId: string) {
  return db
    .select({
      sourceTable: timetableRowNotes.sourceTable,
      sourceId: timetableRowNotes.sourceId,
      resultOverride: timetableRowNotes.resultOverride,
      note: timetableRowNotes.note,
    })
    .from(timetableRowNotes)
    .where(eq(timetableRowNotes.companyId, companyId));
}

// ============================================================================
// Status mappers — map source-specific statuses to unified enum
// ============================================================================

function mapHeartbeatStatus(s: string): TimetableRow["status"] {
  switch (s) {
    // heartbeat writer emits "succeeded" (past tense) — keep "success" and
    // "completed" variants tolerated in case other writers diverge.
    case "succeeded":
    case "success":
    case "completed":
    case "finished":
    case "done": return "done";
    case "running":
    case "in_progress":
    case "active": return "running";
    case "queued":
    case "pending":
    case "scheduled": return "scheduled";
    case "failure":
    case "failed":
    case "error": return "failed";
    case "cancelled":
    case "paused":
    case "skipped": return "paused";
    default: return "scheduled";
  }
}

function mapIssueStatus(s: string): TimetableRow["status"] {
  switch (s) {
    case "done":
    case "completed":
    case "closed": return "done";
    case "in_progress":
    case "running": return "running";
    case "todo":
    case "backlog":
    case "pending": return "scheduled";
    case "failed":
    case "blocked": return "failed";
    case "paused":
    case "cancelled": return "paused";
    default: return "scheduled";
  }
}

function mapRoutineStatus(s: string): TimetableRow["status"] {
  switch (s) {
    case "success":
    case "completed": return "done";
    case "running": return "running";
    case "queued":
    case "scheduled": return "scheduled";
    case "failure":
    case "failed": return "failed";
    case "skipped":
    case "coalesced": return "paused";
    default: return "scheduled";
  }
}

// ============================================================================
// Smart search — parse @agent #task :filter tokens + free text
// ============================================================================

function applySmartSearch(rows: TimetableRow[], q: string): TimetableRow[] {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  const freeText: string[] = [];
  const filters: {
    agentNames: string[];
    identifiers: string[];
    kinds: string[];
    statuses: string[];
    hasNote?: boolean;
  } = { agentNames: [], identifiers: [], kinds: [], statuses: [] };

  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t.startsWith("@")) {
      filters.agentNames.push(t.slice(1));
    } else if (t.startsWith("#")) {
      filters.identifiers.push(t.slice(1));
    } else if (t.startsWith("type:")) {
      filters.kinds.push(t.slice(5));
    } else if (t.startsWith("status:")) {
      filters.statuses.push(t.slice(7));
    } else if (t.startsWith("has:")) {
      if (t.slice(4) === "note") filters.hasNote = true;
    } else {
      freeText.push(t);
    }
  }

  return rows.filter((r) => {
    if (filters.agentNames.length) {
      const agentLower = (r.agent?.name ?? "").toLowerCase();
      const match = filters.agentNames.some((a) => agentLower.includes(a));
      if (!match) return false;
    }
    if (filters.identifiers.length) {
      const titleLower = r.title.toLowerCase();
      const match = filters.identifiers.some((id) => titleLower.includes(id));
      if (!match) return false;
    }
    if (filters.kinds.length && !filters.kinds.includes(r.kind)) return false;
    if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
    if (filters.hasNote && !r.note && !r.resultOverride) return false;
    if (freeText.length) {
      const hay = `${r.title} ${r.description} ${r.agent?.name ?? ""}`.toLowerCase();
      if (!freeText.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

// ============================================================================
// Sorting
// ============================================================================

function sortRows(rows: TimetableRow[], sort: NonNullable<TimetableFilters["sort"]>): TimetableRow[] {
  const dir = sort.dir === "desc" ? -1 : 1;
  const copy = [...rows];
  switch (sort.field) {
    case "time":
      copy.sort((a, b) => dir * (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      break;
    case "agent":
      copy.sort((a, b) => dir * (a.agent?.name ?? "zzz").localeCompare(b.agent?.name ?? "zzz"));
      break;
    case "kind":
      copy.sort((a, b) => dir * a.kind.localeCompare(b.kind));
      break;
    case "status": {
      const order = { running: 0, failed: 1, scheduled: 2, paused: 3, done: 4 };
      copy.sort((a, b) => dir * ((order[a.status] ?? 99) - (order[b.status] ?? 99)));
      break;
    }
    case "result":
      copy.sort((a, b) => {
        const aHas = a.resultOverride || a.resultAuto ? 1 : 0;
        const bHas = b.resultOverride || b.resultAuto ? 1 : 0;
        return dir * (bHas - aHas);
      });
      break;
  }
  return copy;
}

function summarizeResultJson(result: Record<string, unknown>): string | null {
  if ("summary" in result && typeof result.summary === "string") return result.summary.slice(0, 140);
  if ("delegations" in result) {
    const count = Array.isArray(result.delegations) ? result.delegations.length : 0;
    return count ? `${count} delegation spawned` : "no delegations";
  }
  if ("message" in result && typeof result.message === "string") return result.message.slice(0, 140);
  return null;
}
