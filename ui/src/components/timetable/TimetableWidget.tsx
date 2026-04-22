// TimetableWidget — Dashboard embed of /timetable.
// Phase 4: compact view with 9-column table, collapsible rows, pagination.
// Advanced controls (smart search, sort/group/col menus, add-row modal) land in P6–P9;
// their toolbar buttons are rendered but stubbed here so the layout is stable.

import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Columns3,
  Copy,
  Filter,
  Layers,
  Plus,
  RotateCw,
  Search,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useTimetable, useUpsertTimetableNote } from "@/hooks/useTimetable";
import type {
  TimetableRow,
  TimetableStatus,
  TimetableKind,
} from "@/types/timetable";

// ─── Helpers ───────────────────────────────────────────────────────────────

const HCM_TZ = "Asia/Ho_Chi_Minh";

function formatTimeHCM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    timeZone: HCM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayLabelHCM(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("vi-VN", { timeZone: HCM_TZ, weekday: "short" });
  const dmy = now.toLocaleDateString("vi-VN", {
    timeZone: HCM_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${weekday}, ${dmy}`;
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

function kindMeta(kind: TimetableKind | string): KindMeta {
  return KIND_META[kind] ?? { icon: "📎", label: kind };
}

type StatusMeta = { icon: string; label: string; className: string };
const STATUS_META: Record<TimetableStatus, StatusMeta> = {
  done: { icon: "✅", label: "Done", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  running: { icon: "🔵", label: "Running", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  scheduled: { icon: "🟡", label: "Scheduled", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  failed: { icon: "❌", label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  paused: { icon: "⏸", label: "Paused", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
};

function rowToCopyText(row: TimetableRow): string {
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

// ─── Row components ────────────────────────────────────────────────────────

function AgentCell({ row }: { row: TimetableRow }) {
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

function StatusPill({ status, extra }: { status: TimetableStatus; extra: string | null }) {
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

function KindPill({ kind }: { kind: TimetableKind | string }) {
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

function RowDetail({
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
  const dirty = result !== (row.resultOverride ?? row.resultAuto ?? "") || note !== (row.note ?? "");

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

function TimetableTableRow({
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
    <>
      <tr
        className="cursor-pointer border-b border-border hover:bg-accent/40"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <td className="px-3 py-2 font-mono text-muted-foreground w-16">{time}</td>
        <td className="px-3 py-2 w-44">
          <AgentCell row={row} />
        </td>
        <td className="px-3 py-2 w-24">
          <KindPill kind={row.kind} />
        </td>
        <td className="px-3 py-2 w-52 truncate" title={row.title}>
          {row.title}
        </td>
        <td className="px-3 py-2 text-muted-foreground max-w-0">
          <span className="block truncate" title={row.description}>
            {row.description || "—"}
          </span>
        </td>
        <td className="px-3 py-2 w-32">
          <StatusPill status={row.status} extra={row.statusExtra} />
        </td>
        <td className="px-3 py-2 w-44 text-muted-foreground">
          {result ? <span className="block truncate" title={result}>{result}</span> : <span className="italic">— chưa có —</span>}
        </td>
        <td className="px-3 py-2 w-44 text-muted-foreground">
          {note ? <span className="block truncate" title={note}>{note}</span> : <span className="italic">— chưa ghi —</span>}
        </td>
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
          <td colSpan={9} className="p-0">
            <RowDetail row={row} companyId={companyId} onClose={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main widget ───────────────────────────────────────────────────────────

const DEFAULT_VISIBLE = 6;

export default function TimetableWidget() {
  const { selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId ?? "";

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useTimetable(companyId);
  const rows = data?.rows ?? [];
  const totalRows = rows.length;

  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_VISIBLE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);

  const toggleRow = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleShowMore = (n: number | "all") => {
    if (n === "all") setVisibleCount(totalRows);
    else setVisibleCount((prev) => Math.min(prev + n, totalRows));
  };

  const handleCollapse = () => setVisibleCount(DEFAULT_VISIBLE);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", {
        timeZone: HCM_TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Lịch hôm nay</h3>
          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {todayLabelHCM()}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <RotateCw size={10} className={isFetching ? "animate-spin" : ""} aria-hidden />
            <span>30s</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton icon={<ArrowUpDown size={12} />} label="Sắp xếp" tip="Sắp xếp dòng theo cột — sắp ra mắt (Phase 8)" />
          <ToolbarButton icon={<Layers size={12} />} label="Nhóm" tip="Nhóm dòng theo cột — sắp ra mắt (Phase 8)" />
          <ToolbarButton icon={<Columns3 size={12} />} label="Cột" tip="Ẩn/hiện cột — sắp ra mắt (Phase 8)" />
          <ToolbarButton icon={<Plus size={12} />} label="Thêm" tip="Thêm dòng thủ công — sắp ra mắt (Phase 7)" />
          <ToolbarButton icon={<Filter size={12} />} label="Lọc" tip="Bộ lọc nâng cao — sắp ra mắt (Phase 8)" />
          <Link
            to="/timetable"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:underline"
            title="Mở page /timetable xem đủ lịch + audit log"
          >
            Xem đủ <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Smart search (stub for P9) */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-sm text-muted-foreground">
          <Search size={14} aria-hidden />
          <input
            type="search"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            placeholder="Tìm nhanh... @agent · #task · :filter — (Phase 9)"
            disabled
            aria-label="Smart search (sắp ra mắt)"
          />
          <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]">/</kbd>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải lịch…</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-destructive">
            Lỗi tải lịch: {(error as Error).message || "unknown"}
            <button
              type="button"
              onClick={() => refetch()}
              className="ml-2 underline underline-offset-2"
            >
              thử lại
            </button>
          </div>
        ) : totalRows === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa có lịch nào hôm nay. Bấm <strong>+ Thêm</strong> khi Phase 7 sẵn sàng để tạo dòng thủ công.
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 w-16 font-semibold">Giờ</th>
                <th className="px-3 py-2 w-44 font-semibold">Agent · Model</th>
                <th className="px-3 py-2 w-24 font-semibold">Loại</th>
                <th className="px-3 py-2 w-52 font-semibold">Công việc</th>
                <th className="px-3 py-2 font-semibold">Mô tả</th>
                <th className="px-3 py-2 w-32 font-semibold">Trạng thái</th>
                <th className="px-3 py-2 w-44 font-semibold">Kết quả</th>
                <th className="px-3 py-2 w-44 font-semibold">Ghi chú</th>
                <th className="px-3 py-2 w-14 font-semibold" aria-label="Hành động" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <TimetableTableRow
                  key={row.id}
                  row={row}
                  companyId={companyId}
                  expanded={!!expanded[row.id]}
                  onToggle={() => toggleRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {totalRows > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            Hiển thị <strong>{visibleRows.length}</strong> / {totalRows} dòng
            {totalRows > visibleRows.length ? ` · còn ${totalRows - visibleRows.length} dòng` : ""}
          </span>
          <div className="flex items-center gap-1">
            <span className="mr-1">Hiện thêm:</span>
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleShowMore(n)}
                disabled={visibleCount >= totalRows}
                className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                title={`Hiện thêm ${n} dòng`}
              >
                +{n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleShowMore("all")}
              disabled={visibleCount >= totalRows}
              className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
              title="Hiện toàn bộ dòng"
            >
              Tất cả
            </button>
            {visibleCount > DEFAULT_VISIBLE && (
              <>
                <span className="mx-1 text-border">|</span>
                <button
                  type="button"
                  onClick={handleCollapse}
                  className="rounded px-2 py-1 hover:bg-accent"
                  title={`Thu gọn về ${DEFAULT_VISIBLE} dòng`}
                >
                  Thu gọn ↑
                </button>
              </>
            )}
          </div>
          <span>
            Cập nhật: <span className="font-mono">{lastUpdated}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Toolbar stub button ──────────────────────────────────────────────────
// Buttons with real menus land in P7–P9. For now they render with a tooltip
// so the layout is stable and discoverable.

function ToolbarButton({
  icon,
  label,
  tip,
}: {
  icon: React.ReactNode;
  label: string;
  tip: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={tip}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-70"
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={10} aria-hidden />
    </button>
  );
}
