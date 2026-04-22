// Full /timetable page. 3 tabs: Lịch hôm nay (data) · Lịch sử thay đổi
// (audit, P6 wiring) · Sắp tới 3 ngày (P6 wiring). Today tab reuses shared
// TimetableTable so widget + page stay in lock-step.

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  ArrowUpDown,
  Layers,
  Columns3,
  Plus,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useTimetable } from "../hooks/useTimetable";
import { HCM_TZ, TimetableTable } from "../components/timetable/TimetableTable";
import { EmptyState } from "../components/EmptyState";
import type { TimetableKpis } from "../types/timetable";

// ─── Date helpers (HCM) ───────────────────────────────────────────────────

function todayHCM(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: HCM_TZ });
}

function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  const weekday = dt.toLocaleDateString("vi-VN", { timeZone: "UTC", weekday: "long" });
  const dmy = dt.toLocaleDateString("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  // Capitalize first letter of weekday for consistency with VN format
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap}, ${dmy}`;
}

function isToday(date: string): boolean {
  return date === todayHCM();
}

// ─── KPI row ──────────────────────────────────────────────────────────────

const KPI_SPEC: Array<{
  key: keyof TimetableKpis;
  label: string;
  className: string;
}> = [
  { key: "total", label: "Tổng", className: "border-border bg-card" },
  { key: "done", label: "Done", className: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60" },
  { key: "running", label: "Running", className: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/60" },
  { key: "scheduled", label: "Scheduled", className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60" },
  { key: "failed", label: "Failed", className: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/60" },
];

function KpiRow({ kpis }: { kpis: TimetableKpis | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {KPI_SPEC.map(({ key, label, className }) => (
        <div key={key} className={`rounded-lg border p-3 ${className}`}>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">
            {kpis ? kpis[key] : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────

type TabKey = "today" | "audit" | "upcoming";

function TabBar({
  current,
  onChange,
  todayCount,
}: {
  current: TabKey;
  onChange: (t: TabKey) => void;
  todayCount: number;
}) {
  const tabs: Array<{ key: TabKey; label: string; badge?: string; hint: string }> = [
    { key: "today", label: "Lịch hôm nay", badge: todayCount ? String(todayCount) : undefined, hint: `${todayCount} dòng lịch trong ngày` },
    { key: "audit", label: "Lịch sử thay đổi", hint: "Audit log của các edit ghi chú/kết quả (Phase 6)" },
    { key: "upcoming", label: "Sắp tới (3 ngày)", hint: "Lịch của 3 ngày kế tiếp (Phase 6)" },
  ];
  return (
    <div className="border-b border-border" role="tablist">
      <div className="flex flex-wrap items-center gap-1 px-1">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              title={t.hint}
              className={`flex items-center gap-1.5 rounded-t px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-b-2 border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.label}</span>
              {t.badge && (
                <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export function Timetable() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const companyId = selectedCompanyId ?? "";

  const [date, setDate] = useState<string>(todayHCM());
  const [tab, setTab] = useState<TabKey>("today");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBreadcrumbs([{ label: "Lịch hôm nay" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useTimetable(
    companyId,
    { date },
  );
  const rows = data?.rows ?? [];

  // Reset expanded when date switches so rows from prior day don't linger
  useEffect(() => {
    setExpanded({});
  }, [date]);

  // Keyboard shortcuts: T = today, ← = prev day, → = next day.
  // Ignore when user is typing in an input/textarea.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setDate(todayHCM());
      } else if (e.key === "ArrowLeft") {
        setDate((d) => shiftDay(d, -1));
      } else if (e.key === "ArrowRight") {
        setDate((d) => shiftDay(d, 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleRow = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", {
        timeZone: HCM_TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "—";

  const dateLabel = useMemo(() => formatDateLabel(date), [date]);

  if (!companyId) {
    return (
      <EmptyState icon={CalendarDays} message="Chọn company để xem lịch." />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Lịch hôm nay</h1>
          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <RotateCw size={10} className={isFetching ? "animate-spin" : ""} aria-hidden />
            <span>30s</span>
          </span>
        </div>

        {/* Date navigation */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDay(d, -1))}
            className="rounded border border-border p-1.5 text-muted-foreground hover:bg-accent"
            title="Hôm trước (phím ←)"
            aria-label="Hôm trước"
          >
            <ChevronLeft size={14} />
          </button>
          <input
            type="date"
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value || todayHCM())}
            aria-label="Chọn ngày"
          />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDay(d, 1))}
            className="rounded border border-border p-1.5 text-muted-foreground hover:bg-accent"
            title="Hôm sau (phím →)"
            aria-label="Hôm sau"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDate(todayHCM())}
            disabled={isToday(date)}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
            title="Về hôm nay (phím T)"
          >
            Hôm nay
          </button>
          <span className="ml-2 text-xs text-muted-foreground">{dateLabel}</span>
        </div>
      </div>

      {/* KPI row */}
      <KpiRow kpis={data?.kpis} />

      {/* Card */}
      <div className="rounded-lg border border-border bg-card">
        <TabBar current={tab} onChange={setTab} todayCount={rows.length} />

        {/* Toolbar (stub for P7–P9) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton icon={<ArrowUpDown size={12} />} label="Sắp xếp" tip="Sắp xếp — Phase 8" />
            <ToolbarButton icon={<Layers size={12} />} label="Nhóm" tip="Nhóm — Phase 8" />
            <ToolbarButton icon={<Columns3 size={12} />} label="Cột" tip="Ẩn/hiện cột — Phase 8" />
            <ToolbarButton icon={<Plus size={12} />} label="Thêm dòng" tip="Thêm dòng thủ công — Phase 7" />
            <ToolbarButton icon={<Filter size={12} />} label="Lọc" tip="Lọc nâng cao — Phase 8" />
          </div>
          <span className="text-xs text-muted-foreground">
            Cập nhật: <span className="font-mono">{lastUpdated}</span>
          </span>
        </div>

        {/* Smart search stub */}
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

        {/* Tab body */}
        {tab === "today" && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">Đang tải lịch…</div>
            ) : error ? (
              <div className="px-4 py-16 text-center text-sm text-destructive">
                Lỗi tải lịch: {(error as Error).message || "unknown"}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="ml-2 underline underline-offset-2"
                >
                  thử lại
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                Không có lịch cho {dateLabel}.
              </div>
            ) : (
              <TimetableTable
                rows={rows}
                companyId={companyId}
                expanded={expanded}
                onToggleRow={toggleRow}
              />
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            Audit log cho timetable (entityType=timetable_note) — <strong>Phase 6</strong> sẽ wire vào{" "}
            <code>activityApi.list(scope=timetable)</code>.
          </div>
        )}

        {tab === "upcoming" && (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            Lịch 3 ngày kế tiếp — <strong>Phase 6</strong> sẽ gộp 3 lần fetch{" "}
            <code>useTimetable</code> hoặc endpoint mới <code>/timetable/range</code>.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Phím tắt: <kbd className="rounded border border-border px-1">T</kbd> về hôm nay ·
          {" "}<kbd className="rounded border border-border px-1">←</kbd>/<kbd className="rounded border border-border px-1">→</kbd> đổi ngày
        </span>
        <span>
          Source: <code>heartbeat_runs</code>, <code>issues</code>, <code>routine_runs</code>, <code>timetable_manual_rows</code>
        </span>
      </div>
    </div>
  );
}

export default Timetable;

// ─── Toolbar stub ─────────────────────────────────────────────────────────

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
