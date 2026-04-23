import { describe, expect, it } from "vitest";
import {
  parseQuery,
  applyQuery,
  sortRows,
  groupRows,
} from "./timetableFilters";
import type { TimetableRow } from "@/types/timetable";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function row(overrides: Partial<TimetableRow> & Pick<TimetableRow, "id" | "startsAt">): TimetableRow {
  return {
    sourceTable: "heartbeat_runs",
    sourceId: overrides.id,
    endsAt: null,
    agent: null,
    kind: "task",
    title: "Default title",
    description: "",
    status: "scheduled",
    statusExtra: null,
    resultAuto: null,
    resultOverride: null,
    note: null,
    payload: {},
    issueId: null,
    ...overrides,
  };
}

// All timestamps in HCM equivalent UTC offsets:
// 05:00 UTC = 12:00 HCM (afternoon)
// 23:00 UTC = 06:00 HCM next day (morning)
// 14:00 UTC = 21:00 HCM (evening)
const POST_12H = "2026-04-22T05:00:00.000Z";   // 12:00 HCM
const TASK_06H = "2026-04-22T23:00:00.000Z";   // wait, this rolls into next day in UTC+7
const TASK_09H = "2026-04-22T02:00:00.000Z";   // 09:00 HCM
const EMAIL_21H = "2026-04-22T14:00:00.000Z";  // 21:00 HCM

// ─── parseQuery ────────────────────────────────────────────────────────────

describe("parseQuery", () => {
  it("returns empty filters for empty input", () => {
    const q = parseQuery("");
    expect(q.text).toEqual([]);
    expect(q.agents).toEqual([]);
    expect(q.status.size).toBe(0);
    expect(q.hasNote).toBeUndefined();
  });

  it("captures @agent + #task tokens lowercased", () => {
    const q = parseQuery("@CEO #GEM-235 urgent");
    expect(q.agents).toEqual(["ceo"]);
    expect(q.tasks).toEqual(["gem-235"]);
    expect(q.text).toEqual(["urgent"]);
  });

  it("accepts known type: status: time: has: filters", () => {
    const q = parseQuery("type:post status:failed time:morning has:note");
    expect(q.types.has("post")).toBe(true);
    expect(q.status.has("failed")).toBe(true);
    expect(q.time).toBe("morning");
    expect(q.hasNote).toBe(true);
  });

  it("falls back to free text for unknown key:value (typo-safe)", () => {
    const q = parseQuery("typo:post statuss:failed");
    expect(q.types.size).toBe(0);
    expect(q.status.size).toBe(0);
    expect(q.text).toEqual(["typo:post", "statuss:failed"]);
  });

  it("rejects invalid status/time values silently", () => {
    const q = parseQuery("status:unknown time:noon");
    expect(q.status.size).toBe(0);
    expect(q.time).toBeUndefined();
  });

  it("has:no-note and has:none both set hasNote=false", () => {
    expect(parseQuery("has:no-note").hasNote).toBe(false);
    expect(parseQuery("has:none").hasNote).toBe(false);
  });
});

// ─── applyQuery ────────────────────────────────────────────────────────────

describe("applyQuery", () => {
  const rows: TimetableRow[] = [
    row({
      id: "heartbeat_runs:1",
      startsAt: POST_12H,
      kind: "post",
      title: "Post Page Jennie",
      agent: { id: "agent-sm", name: "Social Media Manager", model: "gemini-2.5-pro" },
      status: "done",
      note: "engagement 142",
    }),
    row({
      id: "issues:2",
      startsAt: TASK_09H,
      kind: "task",
      title: "GEM-235 cập nhật MEMORY",
      agent: { id: "agent-pv", name: "Phong Thuy DV", model: "gpt-5-codex" },
      status: "running",
      issueId: "gem-235",
    }),
    row({
      id: "cc_email_campaigns:3",
      startsAt: EMAIL_21H,
      kind: "email",
      title: "Drip day 3",
      status: "failed",
      agent: { id: "agent-mk", name: "Marketing Manager", model: "claude-sonnet-4-6" },
    }),
  ];

  it("returns all rows when filter is empty", () => {
    expect(applyQuery(rows, parseQuery("")).length).toBe(3);
  });

  it("status:failed keeps only failed row", () => {
    const result = applyQuery(rows, parseQuery("status:failed"));
    expect(result.map((r) => r.id)).toEqual(["cc_email_campaigns:3"]);
  });

  it("type:post keeps only post row", () => {
    const result = applyQuery(rows, parseQuery("type:post"));
    expect(result.map((r) => r.id)).toEqual(["heartbeat_runs:1"]);
  });

  it("@agent substring matches on agent name", () => {
    const result = applyQuery(rows, parseQuery("@phong"));
    expect(result.map((r) => r.id)).toEqual(["issues:2"]);
  });

  it("#task matches on issueId fragment", () => {
    const result = applyQuery(rows, parseQuery("#235"));
    expect(result.map((r) => r.id)).toEqual(["issues:2"]);
  });

  it("has:note keeps only rows with notes", () => {
    const result = applyQuery(rows, parseQuery("has:note"));
    expect(result.map((r) => r.id)).toEqual(["heartbeat_runs:1"]);
  });

  it("has:no-note excludes rows with notes", () => {
    const result = applyQuery(rows, parseQuery("has:no-note"));
    expect(result.map((r) => r.id).sort()).toEqual(["cc_email_campaigns:3", "issues:2"]);
  });

  it("free-text AND match spans title + description + agent name + note", () => {
    const result = applyQuery(rows, parseQuery("page jennie"));
    expect(result.map((r) => r.id)).toEqual(["heartbeat_runs:1"]);
  });

  it("combines multiple filters with AND (type + status)", () => {
    const result = applyQuery(rows, parseQuery("type:email status:failed"));
    expect(result.map((r) => r.id)).toEqual(["cc_email_campaigns:3"]);
    expect(applyQuery(rows, parseQuery("type:email status:done")).length).toBe(0);
  });

  it("time:morning keeps 09:00 HCM row", () => {
    const result = applyQuery(rows, parseQuery("time:morning"));
    expect(result.map((r) => r.id)).toEqual(["issues:2"]);
  });

  it("time:evening keeps 21:00 HCM row", () => {
    const result = applyQuery(rows, parseQuery("time:evening"));
    expect(result.map((r) => r.id)).toEqual(["cc_email_campaigns:3"]);
  });
});

// ─── sortRows ─────────────────────────────────────────────────────────────

describe("sortRows", () => {
  const rows: TimetableRow[] = [
    row({ id: "a", startsAt: EMAIL_21H, status: "done" }),
    row({ id: "b", startsAt: TASK_09H, status: "running" }),
    row({ id: "c", startsAt: POST_12H, status: "failed" }),
  ];

  it("sorts by time asc", () => {
    expect(sortRows(rows, { field: "time", dir: "asc" }).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by time desc", () => {
    expect(sortRows(rows, { field: "time", dir: "desc" }).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("returns input unchanged when sort is undefined", () => {
    expect(sortRows(rows, undefined).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("status sort respects STATUS_ORDER (running first, paused last)", () => {
    // running=0, scheduled=1, failed=2, done=3
    const result = sortRows(rows, { field: "status", dir: "asc" });
    expect(result.map((r) => r.status)).toEqual(["running", "failed", "done"]);
  });
});

// ─── groupRows ────────────────────────────────────────────────────────────

describe("groupRows", () => {
  const rows: TimetableRow[] = [
    row({ id: "a", startsAt: TASK_09H, kind: "task", status: "running" }),
    row({ id: "b", startsAt: POST_12H, kind: "post", status: "done" }),
    row({ id: "c", startsAt: EMAIL_21H, kind: "email", status: "done" }),
  ];

  it("single section when group is none/undefined", () => {
    expect(groupRows(rows, "none").length).toBe(1);
    expect(groupRows(rows, undefined).length).toBe(1);
  });

  it("time_of_day buckets in morning→afternoon→evening order", () => {
    const sections = groupRows(rows, "time_of_day");
    expect(sections.map((s) => s.key)).toEqual(["morning", "afternoon", "evening"]);
    expect(sections[0]!.rows.map((r) => r.id)).toEqual(["a"]);
    expect(sections[2]!.rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("status groups sorted by STATUS_ORDER (running first)", () => {
    const sections = groupRows(rows, "status");
    expect(sections.map((s) => s.key)).toEqual(["running", "done"]);
  });

  it("kind groups split rows by kind", () => {
    const sections = groupRows(rows, "kind");
    expect(sections.length).toBe(3);
    expect(new Set(sections.map((s) => s.key))).toEqual(new Set(["task", "post", "email"]));
  });
});
