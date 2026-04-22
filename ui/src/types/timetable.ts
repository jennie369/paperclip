/**
 * Timetable types — mirror BE server/src/services/timetable.ts TimetableRow.
 * Update both when shape changes.
 */

export type TimetableSourceTable =
  | "heartbeat_runs"
  | "issues"
  | "agent_task_sessions"
  | "cc_social_posts"
  | "cc_email_campaigns"
  | "routine_runs"
  | "routine_triggers"
  | "timetable_manual_rows";

export type TimetableStatus = "done" | "running" | "scheduled" | "failed" | "paused";

export type TimetableKind =
  | "heartbeat"
  | "task"
  | "routine"
  | "post"
  | "reel"
  | "email"
  | "reply"
  | "manual_task"
  | "meeting"
  | "reminder"
  | "call"
  | "test";

export interface TimetableRowAgent {
  id: string;
  name: string;
  model: string | null;
}

export interface TimetableRow {
  id: string;              // "{sourceTable}:{sourceId}"
  sourceTable: TimetableSourceTable;
  sourceId: string;
  startsAt: string;        // ISO timestamp
  endsAt: string | null;
  agent: TimetableRowAgent | null;
  kind: TimetableKind | string;
  title: string;
  description: string;
  status: TimetableStatus;
  statusExtra: string | null;
  resultAuto: string | null;
  resultOverride: string | null;
  note: string | null;
  payload: Record<string, unknown>;
  issueId: string | null;
}

export interface TimetableKpis {
  total: number;
  done: number;
  running: number;
  scheduled: number;
  failed: number;
  paused: number;
}

export interface TimetableResponse {
  rows: TimetableRow[];
  kpis: TimetableKpis;
  meta: {
    date: string;
    timezone: "Asia/Ho_Chi_Minh";
    dayStartUtc: string;
    dayEndUtc: string;
    sources: Record<string, number>;
  };
}

export interface TimetableSort {
  field: "time" | "agent" | "kind" | "status" | "result";
  dir: "asc" | "desc";
}

export type TimetableGroup = "none" | "time_of_day" | "agent" | "kind" | "status" | "has_note";

export interface TimetableFilters {
  date?: string;           // YYYY-MM-DD local HCM
  q?: string;
  agentId?: string;
  types?: string[];
  status?: TimetableStatus[];
  sort?: TimetableSort;
  group?: TimetableGroup;
}

export interface CreateManualRowInput {
  startsAt: string;        // ISO
  endsAt?: string | null;
  agentId?: string | null;
  kind: string;
  title: string;
  description?: string | null;
  note?: string | null;
  createAsIssue?: boolean;
}

export interface CreateManualRowResponse {
  row: {
    id: string;
    companyId: string;
    startsAt: string;
    endsAt: string | null;
    agentId: string | null;
    kind: string;
    title: string;
    description: string | null;
    note: string | null;
    issueId: string | null;
  };
  issueId: string | null;
}

export interface UpsertRowNoteInput {
  sourceTable: TimetableSourceTable;
  sourceId: string;
  resultOverride?: string | null;
  note?: string | null;
}
