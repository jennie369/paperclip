// Client-side sort + group processing for timetable rows.
// Widget + page both call this so rendered order and grouping match.

import type {
  TimetableRow,
  TimetableSort,
  TimetableGroup,
} from "@/types/timetable";

export const COLUMN_KEYS = [
  "time",
  "agent",
  "kind",
  "title",
  "description",
  "status",
  "result",
  "note",
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  time: "Giờ",
  agent: "Agent · Model",
  kind: "Loại",
  title: "Công việc",
  description: "Mô tả",
  status: "Trạng thái",
  result: "Kết quả",
  note: "Ghi chú",
};

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [...COLUMN_KEYS];

const STATUS_ORDER: Record<string, number> = {
  running: 0,
  scheduled: 1,
  failed: 2,
  done: 3,
  paused: 4,
};

function sortValue(row: TimetableRow, field: TimetableSort["field"]): string | number {
  switch (field) {
    case "time":
      return row.startsAt;
    case "agent":
      return row.agent?.name?.toLowerCase() ?? "~";
    case "kind":
      return row.kind;
    case "status":
      return STATUS_ORDER[row.status] ?? 99;
    case "result":
      return (row.resultOverride ?? row.resultAuto ?? "").toLowerCase();
    default:
      return row.startsAt;
  }
}

export function sortRows(rows: TimetableRow[], sort: TimetableSort | undefined): TimetableRow[] {
  if (!sort) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = sortValue(a, sort.field);
    const bv = sortValue(b, sort.field);
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    // Tie-break: always fall back to time so order is stable.
    if (a.startsAt < b.startsAt) return -1;
    if (a.startsAt > b.startsAt) return 1;
    return 0;
  });
  return copy;
}

export interface TimetableGroupSection {
  key: string;
  label: string;
  rows: TimetableRow[];
}

function timeOfDayBucket(iso: string): { key: string; label: string } {
  // Hour in Asia/Ho_Chi_Minh.
  const hour = Number(
    new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }),
  );
  if (hour < 12) return { key: "morning", label: "🌅 Sáng (00–12)" };
  if (hour < 18) return { key: "afternoon", label: "☀️ Chiều (12–18)" };
  return { key: "evening", label: "🌙 Tối (18–24)" };
}

export function groupRows(
  rows: TimetableRow[],
  group: TimetableGroup | undefined,
): TimetableGroupSection[] {
  if (!group || group === "none") {
    return [{ key: "__all", label: "", rows }];
  }

  const buckets = new Map<string, TimetableGroupSection>();
  const add = (key: string, label: string, row: TimetableRow) => {
    const existing = buckets.get(key);
    if (existing) existing.rows.push(row);
    else buckets.set(key, { key, label, rows: [row] });
  };

  for (const row of rows) {
    if (group === "time_of_day") {
      const b = timeOfDayBucket(row.startsAt);
      add(b.key, b.label, row);
    } else if (group === "agent") {
      const key = row.agent?.id ?? "__none";
      const label = row.agent?.name ?? "— Không gán —";
      add(key, label, row);
    } else if (group === "kind") {
      add(row.kind, row.kind, row);
    } else if (group === "status") {
      add(row.status, row.status, row);
    } else if (group === "has_note") {
      const has = Boolean(row.note);
      add(has ? "with" : "without", has ? "📝 Có ghi chú" : "— Chưa ghi —", row);
    }
  }

  // Stable order: time_of_day morning→evening, status by STATUS_ORDER,
  // everything else alphabetical.
  const sections = Array.from(buckets.values());
  if (group === "time_of_day") {
    const order = { morning: 0, afternoon: 1, evening: 2 } as Record<string, number>;
    sections.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  } else if (group === "status") {
    sections.sort((a, b) => (STATUS_ORDER[a.key] ?? 99) - (STATUS_ORDER[b.key] ?? 99));
  } else {
    sections.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }
  return sections;
}

// ─── localStorage helpers for column visibility ──────────────────────────

const VISIBLE_KEY = "timetable.cols.visible.v1";

export function loadVisibleColumns(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(VISIBLE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as string[];
    const allowed = new Set<string>(COLUMN_KEYS);
    const kept = parsed.filter((k): k is ColumnKey => allowed.has(k));
    // Guarantee "time" + "title" always visible so rows never look empty.
    if (!kept.includes("time")) kept.unshift("time");
    if (!kept.includes("title")) kept.push("title");
    return kept.length > 0 ? kept : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export function saveVisibleColumns(cols: ColumnKey[]): void {
  try {
    localStorage.setItem(VISIBLE_KEY, JSON.stringify(cols));
  } catch {
    // quota / disabled — ignore.
  }
}
