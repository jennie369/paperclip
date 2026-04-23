// Client-side sort + group processing for timetable rows.
// Widget + page both call this so rendered order and grouping match.

import type {
  TimetableRow,
  TimetableSort,
  TimetableGroup,
  TimetableStatus,
  TimetableKind,
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

// ─── Smart search parser + applier ───────────────────────────────────────

export type SearchTimeBucket = "morning" | "afternoon" | "evening" | "upcoming";

export interface ParsedQuery {
  text: string[];                     // free-text tokens (AND substring match)
  agents: string[];                   // @tokens, lowercase
  tasks: string[];                    // #tokens, lowercase
  types: Set<string>;                 // type:post, type:email …
  status: Set<TimetableStatus>;       // status:failed, status:running …
  time?: SearchTimeBucket;            // time:morning, time:upcoming …
  hasNote?: boolean;                  // has:note → true; has:no-note → false
  raw: string;
}

const VALID_STATUS: ReadonlySet<TimetableStatus> = new Set([
  "done",
  "running",
  "scheduled",
  "failed",
  "paused",
]);

const VALID_TIME: ReadonlySet<SearchTimeBucket> = new Set([
  "morning",
  "afternoon",
  "evening",
  "upcoming",
]);

export function parseQuery(raw: string): ParsedQuery {
  const q: ParsedQuery = {
    text: [],
    agents: [],
    tasks: [],
    types: new Set(),
    status: new Set(),
    raw,
  };
  if (!raw) return q;

  for (const token of raw.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("@") && token.length > 1) {
      q.agents.push(token.slice(1).toLowerCase());
      continue;
    }
    if (token.startsWith("#") && token.length > 1) {
      q.tasks.push(token.slice(1).toLowerCase());
      continue;
    }
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0 && colonIdx < token.length - 1) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1).toLowerCase();
      if (key === "type") {
        q.types.add(value);
        continue;
      }
      if (key === "status" && VALID_STATUS.has(value as TimetableStatus)) {
        q.status.add(value as TimetableStatus);
        continue;
      }
      if (key === "time" && VALID_TIME.has(value as SearchTimeBucket)) {
        q.time = value as SearchTimeBucket;
        continue;
      }
      if (key === "has") {
        if (value === "note") q.hasNote = true;
        else if (value === "no-note" || value === "none") q.hasNote = false;
        continue;
      }
      // Unknown filter key → treat whole token as free text.
    }
    q.text.push(token.toLowerCase());
  }
  return q;
}

function rowHourHCM(iso: string): number {
  return Number(
    new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }),
  );
}

export function applyQuery(rows: TimetableRow[], q: ParsedQuery): TimetableRow[] {
  if (
    q.text.length === 0 &&
    q.agents.length === 0 &&
    q.tasks.length === 0 &&
    q.types.size === 0 &&
    q.status.size === 0 &&
    !q.time &&
    q.hasNote === undefined
  ) {
    return rows;
  }

  const now = Date.now();

  return rows.filter((row) => {
    // Status exact match
    if (q.status.size > 0 && !q.status.has(row.status)) return false;

    // Type (kind) exact match
    if (q.types.size > 0) {
      const kind = String(row.kind as TimetableKind | string).toLowerCase();
      if (!q.types.has(kind)) return false;
    }

    // Agent @token: substring match against agent name or id prefix
    if (q.agents.length > 0) {
      const name = row.agent?.name?.toLowerCase() ?? "";
      const id = row.agent?.id?.toLowerCase() ?? "";
      if (!q.agents.some((a) => name.includes(a) || id.startsWith(a))) return false;
    }

    // Task #token: match row.issueId fragment or title/description substring
    if (q.tasks.length > 0) {
      const issueId = row.issueId?.toLowerCase() ?? "";
      const title = row.title.toLowerCase();
      const desc = row.description.toLowerCase();
      if (!q.tasks.some((t) => issueId.includes(t) || title.includes(t) || desc.includes(t))) {
        return false;
      }
    }

    // Time bucket
    if (q.time) {
      if (q.time === "upcoming") {
        if (new Date(row.startsAt).getTime() <= now) return false;
      } else {
        const h = rowHourHCM(row.startsAt);
        if (q.time === "morning" && !(h < 12)) return false;
        if (q.time === "afternoon" && !(h >= 12 && h < 18)) return false;
        if (q.time === "evening" && !(h >= 18)) return false;
      }
    }

    // has:note
    if (q.hasNote === true && !row.note) return false;
    if (q.hasNote === false && row.note) return false;

    // Free text AND match — title + description + agent name
    if (q.text.length > 0) {
      const haystack = [
        row.title,
        row.description,
        row.agent?.name ?? "",
        String(row.kind),
        row.resultOverride ?? "",
        row.resultAuto ?? "",
        row.note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!q.text.every((t) => haystack.includes(t))) return false;
    }

    return true;
  });
}

// ─── Recent search history ───────────────────────────────────────────────

const RECENT_KEY = "timetable.search.recent.v1";
const RECENT_LIMIT = 5;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed) return loadRecentSearches();
  const existing = loadRecentSearches().filter((s) => s !== trimmed);
  const next = [trimmed, ...existing].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
