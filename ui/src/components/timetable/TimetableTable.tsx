// Shared timetable table primitives — used by TimetableWidget (Dashboard)
// and the full /timetable page. Keeps rendering + row expansion + note
// save mutation in one place so P6–P10 features (sort/group/column
// reorder, smart search) only need to change one spot.

import { useState } from "react";
import { ChevronRight, Copy } from "lucide-react";
import { useUpsertTimetableNote } from "@/hooks/useTimetable";
import type {
  TimetableRow,
  TimetableStatus,
  TimetableKind,
} from "@/types/timetable";
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  DEFAULT_VISIBLE_COLUMNS,
  type ColumnKey,
} from "@/lib/timetableFilters";

type VisibleColumns = ReadonlySet<ColumnKey>;

function defaultVisibleSet(): VisibleColumns {
  return new Set(DEFAULT_VISIBLE_COLUMNS);
}

// ─── Constants ─────────────────────────────────────────────────────────────

export const HCM_TZ = "Asia/Ho_Chi_Minh";

// ─── Helpers ───────────────────────────────────────────────────────────────

export function formatTimeHCM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    timeZone: HCM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type KindMeta = { icon: string; label: string };
const KIND_META: Record<string, KindMeta> = {
  heartbeat: { icon: "💓", label: "Heartbeat" },
  task: { icon: "✅", label: "Task" },
  routine: { icon: "🔁", label: "Routine" },
  post: { icon: "📢", label: "Post" },
  reel: { icon: "🎬", label: "Reel" },
  email: { icon: "✉️", label: "Email" },
  reply: { icon: "💬", label: "Reply" },
  manual_task: { icon: "📌", label: "Manual" },
  meeting: { icon: "🗓", label: "Meeting" },
  reminder: { icon: "⏰", label: "Nhắc" },
  call: { icon: "📞", label: "Call" },
  test: { icon: "🧪", label: "Test" },
};

export function kindMeta(kind: TimetableKind | string): KindMeta {
  return KIND_META[kind] ?? { icon: "📎", label: kind };
}

type StatusMeta = { icon: string; label: string; className: string };
export const STATUS_META: Record<TimetableStatus, StatusMeta> = {
  done: {
    icon: "✅",
    label: "Done",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  running: {
    icon: "🔵",
    label: "Running",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  scheduled: {
    icon: "🟡",
    label: "Scheduled",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  failed: {
    icon: "❌",
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  paused: {
    icon: "⏸",
    label: "Paused",
    className:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
};

export function rowToCopyText(row: TimetableRow): string {
  const t = formatTimeHCM(row.startsAt);
  const agent = row.agent?.name ?? "—";
  const result = row.resultOverride ?? row.resultAuto ?? "—";
  return `${t} · ${agent} · ${row.title} · ${result}`;
}

function agentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function agentColor(agentId: string | undefined): string {
  if (!agentId) return "oklch(60% 0.05 270)";
  let hash = 0;
  for (let i = 0; i < agentId.length; i += 1) hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `oklch(60% 0.14 ${hue})`;
}

// ─── Cell subcomponents ────────────────────────────────────────────────────

export function AgentCell({ row }: { row: TimetableRow }) {
  if (!row.agent) {
    return <span className="text-xs text-muted-foreground italic">— hệ thống —</span>;
  }
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: agentColor(row.agent.id) }}
        aria-hidden
      >
        {agentInitials(row.agent.name)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs font-medium">{row.agent.name}</span>
        <span
          className="truncate rounded border border-border bg-muted/40 px-1 py-px text-[10px] text-muted-foreground font-mono"
          style={{ maxWidth: "120px" }}
          title={row.agent.model ?? ""}
        >
          {row.agent.model ?? "—"}
        </span>
      </span>
    </span>
  );
}

export function StatusPill({
  status,
  extra,
}: {
  status: TimetableStatus;
  extra: string | null;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.scheduled;
  return (
    <span className="flex flex-col gap-0.5 items-start">
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.className}`}
        style={{ minWidth: "96px" }}
      >
        <span>{meta.icon}</span>
        <span className="truncate">{meta.label}</span>
      </span>
      <span className="text-[10px] text-muted-foreground font-mono">{extra ?? "—"}</span>
    </span>
  );
}

export function KindPill({ kind }: { kind: TimetableKind | string }) {
  const meta = kindMeta(kind);
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px]"
      style={{ minWidth: "84px" }}
      title={meta.label}
    >
      <span>{meta.icon}</span>
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

// ─── Row detail panel ──────────────────────────────────────────────────────

export function RowDetail({
  row,
  companyId,
  onClose,
}: {
  row: TimetableRow;
  companyId: string;
  onClose: () => void;
}) {
  const mutation = useUpsertTimetableNote(companyId);
  const [result, setResult] = useState<string>(row.resultOverride ?? row.resultAuto ?? "");
  const [note, setNote] = useState<string>(row.note ?? "");
  const dirty =
    result !== (row.resultOverride ?? row.resultAuto ?? "") || note !== (row.note ?? "");

  const handleSave = () => {
    mutation.mutate(
      {
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        resultOverride: result || null,
        note: note || null,
      },
      { onSuccess: () => onClose() },
    );
  };

  const payloadEntries = Object.entries(row.payload ?? {});

  return (
    <div className="border-t border-border bg-muted/30 p-4 text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Chi tiết
        </div>
        {payloadEntries.length === 0 ? (
          <p className="italic text-muted-foreground">Không có payload.</p>
        ) : (
          <div className="rounded border border-border bg-background p-2 font-mono leading-5 max-h-48 overflow-auto">
            {payloadEntries.map(([key, val]) => (
              <div key={key} className="truncate">
                <span className="text-muted-foreground">{key}:</span>{" "}
                <span>{typeof val === "string" ? val : JSON.stringify(val)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-muted-foreground">
          source: <code>{row.sourceTable}</code> · id: <code className="break-all">{row.sourceId}</code>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Sửa kết quả · ghi chú
        </div>
        <label className="mb-1 block text-[11px] text-muted-foreground">Kết quả (override default)</label>
        <input
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder={row.resultAuto ?? ""}
          title="Override giá trị auto của hệ thống"
        />
        <label className="mb-1 block text-[11px] text-muted-foreground">Ghi chú</label>
        <textarea
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Thêm ghi chú cá nhân..."
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            onClick={handleSave}
            disabled={!dirty || mutation.isPending}
          >
            {mutation.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-1 text-[11px] text-destructive">Lỗi khi lưu. Thử lại.</p>
        )}
        <p className="mt-2 italic text-[10px] text-muted-foreground">
          Mọi thay đổi ghi vào <code>activity_log</code> với <code>entityType=timetable_note</code>.
        </p>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

export function TimetableTableRow({
  row,
  companyId,
  expanded,
  onToggle,
  visibleColumns,
}: {
  row: TimetableRow;
  companyId: string;
  expanded: boolean;
  onToggle: () => void;
  visibleColumns?: VisibleColumns;
}) {
  const vis = visibleColumns ?? defaultVisibleSet();
  const time = formatTimeHCM(row.startsAt);
  const result = row.resultOverride ?? row.resultAuto;
  const note = row.note;

  // colSpan for the expanded detail row — count of visible data columns + 1
  // (actions column which is always present).
  const visibleColSpan = vis.size + 1;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rowToCopyText(row)).catch(() => {});
    }
  };

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border hover:bg-accent/40"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {vis.has("time") && (
          <td className="px-3 py-2 font-mono text-muted-foreground w-16">{time}</td>
        )}
        {vis.has("agent") && (
          <td className="px-3 py-2 w-44">
            <AgentCell row={row} />
          </td>
        )}
        {vis.has("kind") && (
          <td className="px-3 py-2 w-24">
            <KindPill kind={row.kind} />
          </td>
        )}
        {vis.has("title") && (
          <td className="px-3 py-2 w-52 truncate" title={row.title}>
            {row.title}
          </td>
        )}
        {vis.has("description") && (
          <td className="px-3 py-2 text-muted-foreground max-w-0">
            <span className="block truncate" title={row.description}>
              {row.description || "—"}
            </span>
          </td>
        )}
        {vis.has("status") && (
          <td className="px-3 py-2 w-32">
            <StatusPill status={row.status} extra={row.statusExtra} />
          </td>
        )}
        {vis.has("result") && (
          <td className="px-3 py-2 w-44 text-muted-foreground">
            {result ? (
              <span className="block truncate" title={result}>
                {result}
              </span>
            ) : (
              <span className="italic">— chưa có —</span>
            )}
          </td>
        )}
        {vis.has("note") && (
          <td className="px-3 py-2 w-44 text-muted-foreground">
            {note ? (
              <span className="block truncate" title={note}>
                {note}
              </span>
            ) : (
              <span className="italic">— chưa ghi —</span>
            )}
          </td>
        )}
        <td className="px-3 py-2 w-14 text-right">
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Copy cả dòng thành text (giờ · agent · việc · kết quả)"
              aria-label="Copy row"
            >
              <Copy size={12} />
            </button>
            <ChevronRight
              size={14}
              className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
              aria-hidden
            />
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={visibleColSpan} className="p-0">
            <RowDetail row={row} companyId={companyId} onClose={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────

const COLUMN_CLASS: Record<ColumnKey, string> = {
  time: "w-16",
  agent: "w-44",
  kind: "w-24",
  title: "w-52",
  description: "",
  status: "w-32",
  result: "w-44",
  note: "w-44",
};

export function TimetableTable({
  rows,
  companyId,
  expanded,
  onToggleRow,
  visibleColumns,
  minWidth = 1100,
}: {
  rows: TimetableRow[];
  companyId: string;
  expanded: Record<string, boolean>;
  onToggleRow: (id: string) => void;
  visibleColumns?: VisibleColumns;
  minWidth?: number;
}) {
  const vis = visibleColumns ?? defaultVisibleSet();
  return (
    <>
      {/* Mobile: card list — 9-col table is unreadable under 640px. */}
      <div className="md:hidden">
        {rows.map((row) => (
          <TimetableCardRow
            key={row.id}
            row={row}
            companyId={companyId}
            expanded={!!expanded[row.id]}
            onToggle={() => onToggleRow(row.id)}
          />
        ))}
      </div>

      {/* Desktop: full table. */}
      <table
        className="hidden w-full text-sm md:table"
        style={{ minWidth: `${minWidth}px` }}
      >
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="text-left">
            {COLUMN_KEYS.map((key) =>
              vis.has(key) ? (
                <th key={key} className={`px-3 py-2 font-semibold ${COLUMN_CLASS[key]}`}>
                  {COLUMN_LABELS[key]}
                </th>
              ) : null,
            )}
            <th className="px-3 py-2 w-14 font-semibold" aria-label="Hành động" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TimetableTableRow
              key={row.id}
              row={row}
              companyId={companyId}
              expanded={!!expanded[row.id]}
              onToggle={() => onToggleRow(row.id)}
              visibleColumns={vis}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}

// ─── Mobile card row ───────────────────────────────────────────────────────

function TimetableCardRow({
  row,
  companyId,
  expanded,
  onToggle,
}: {
  row: TimetableRow;
  companyId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const time = formatTimeHCM(row.startsAt);
  const result = row.resultOverride ?? row.resultAuto;
  const note = row.note;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rowToCopyText(row)).catch(() => {});
    }
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-accent/40"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{time}</span>
            <KindPill kind={row.kind} />
          </div>
          <StatusPill status={row.status} extra={row.statusExtra} />
        </div>

        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium text-sm">{row.title}</div>
            {row.description && (
              <div className="truncate text-xs text-muted-foreground">{row.description}</div>
            )}
            {row.agent && (
              <div className="mt-1">
                <AgentCell row={row} />
              </div>
            )}
            {result && (
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">Kết quả: </span>
                <span className="text-foreground">{result}</span>
              </div>
            )}
            {note && (
              <div className="text-xs">
                <span className="text-muted-foreground">Ghi chú: </span>
                <span className="italic text-foreground/80">{note}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Copy dòng"
              aria-label="Copy"
            >
              <Copy size={14} />
            </button>
            <ChevronRight
              size={16}
              className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
              aria-hidden
            />
          </div>
        </div>
      </button>
      {expanded && <RowDetail row={row} companyId={companyId} onClose={onToggle} />}
    </div>
  );
}
