// TimetableWidget — Dashboard embed of /timetable.
// Compact view: 6 rows default, footer pagination, toolbar stubs.
// Table + row primitives live in ./TimetableTable so the full page reuses
// identical rendering + save mutation.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCw,
  List,
  Calendar as CalendarIcon
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useTimetable } from "@/hooks/useTimetable";
import { HCM_TZ, TimetableTable } from "./TimetableTable";
import { AddManualRowModal } from "./AddManualRowModal";
import { TimetableCalendarView } from "./TimetableCalendarView";
import { SortMenu, GroupMenu, ColumnMenu, FilterMenu } from "./TimetableMenus";
import { SmartSearch } from "./SmartSearch";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableSort, TimetableGroup } from "@/types/timetable";
import {
  sortRows,
  groupRows,
  parseQuery,
  applyQuery,
  pushRecentSearch,
  loadVisibleColumns,
  saveVisibleColumns,
  loadSavedQuery,
  saveQuery,
  loadSavedBucket,
  saveBucket,
  currentTimeBucket,
  filterByBucket,
  type ColumnKey,
  type TimeBucket,
} from "@/lib/timetableFilters";

const DEFAULT_VISIBLE = 6;

type BucketFilter = "now" | "morning" | "afternoon" | "evening" | "all";

const BUCKET_TABS: Array<{ key: BucketFilter; label: string; hint: string }> = [
  { key: "now", label: "Hiện tại", hint: "Buổi chứa giờ hiện tại (Asia/Ho_Chi_Minh)" },
  { key: "morning", label: "Sáng", hint: "00:00 → 11:59" },
  { key: "afternoon", label: "Chiều", hint: "12:00 → 17:59" },
  { key: "evening", label: "Tối", hint: "18:00 → 23:59" },
  { key: "all", label: "Tất cả", hint: "Cả ngày · có thể group/sort tuỳ chọn" },
];

function todayHCM(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: HCM_TZ });
}

function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function isToday(date: string): boolean {
  return date === todayHCM();
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  const weekday = dt.toLocaleDateString("vi-VN", { timeZone: "UTC", weekday: "short" });
  const dmy = dt.toLocaleDateString("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap}, ${dmy}`;
}

export default function TimetableWidget() {
  const { selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId ?? "";

  const [date, setDate] = useState<string>(todayHCM());
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } =
    useTimetable(companyId, { date });
  const rows = data?.rows ?? [];
  const totalRows = rows.length;

  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_VISIBLE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [sort, setSort] = useState<TimetableSort>({ field: "time", dir: "asc" });
  const [group, setGroup] = useState<TimetableGroup>("none");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => loadVisibleColumns());
  const [query, setQuery] = useState(() => loadSavedQuery());
  // View tabs: morning · afternoon · evening · now · all.
  // Default 'now' = bucket containing current HCM hour — so at 18:35 the
  // widget opens on evening, not on morning rows.
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>(() => loadSavedBucket());

  useEffect(() => {
    saveVisibleColumns(visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    saveQuery(query);
  }, [query]);

  useEffect(() => {
    saveBucket(bucketFilter);
  }, [bucketFilter]);

  // Persist once user pauses typing for 700ms.
  useEffect(() => {
    if (!query.trim()) return;
    const t = window.setTimeout(() => pushRecentSearch(query.trim()), 700);
    return () => window.clearTimeout(t);
  }, [query]);

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const parsed = useMemo(() => parseQuery(query), [query]);
  const queryFiltered = useMemo(() => applyQuery(rows, parsed), [rows, parsed]);

  const resolvedBucket: TimeBucket | null =
    bucketFilter === "all" ? null : bucketFilter === "now" ? currentTimeBucket() : bucketFilter;

  const filteredRows = useMemo(
    () => (resolvedBucket ? filterByBucket(queryFiltered, resolvedBucket) : queryFiltered),
    [queryFiltered, resolvedBucket],
  );
  const filteredCount = filteredRows.length;

  // When a bucket filter is active, skip grouping (rows already scoped to
  // one bucket). Only honor the Group menu when the user picks "Tất cả".
  const effectiveGroup: TimetableGroup = bucketFilter === "all" ? group : "none";

  const processedSections = useMemo(() => {
    const sorted = sortRows(filteredRows, sort);
    // Window-around-now: when sorted ascending by time AND user hasn't
    // expanded pagination, center the 6-row window around the row whose
    // startsAt is closest to current time (2 past + 4 upcoming). Fixes
    // the case where at 16:19 the widget showed rows from 12:00 onward.
    // useTimetable refetches every 30s so this recomputes automatically.
    const centerOnNow =
      sort.field === "time" &&
      sort.dir === "asc" &&
      sorted.length > visibleCount;
    let capped;
    if (centerOnNow) {
      const nowMs = Date.now();
      let nearestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < sorted.length; i += 1) {
        const diff = Math.abs(new Date(sorted[i].startsAt).getTime() - nowMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          nearestIdx = i;
        }
      }
      // Keep 2 past rows by default. When expanding, distribute extra rows
      // roughly equally between past and future.
      const pastRows = Math.max(2, Math.floor((visibleCount - 4) / 2));
      const start = Math.max(
        0,
        Math.min(sorted.length - visibleCount, nearestIdx - pastRows),
      );
      capped = sorted.slice(start, start + visibleCount);
    } else {
      // Cap before grouping so "Hiện thêm" still targets the overall count.
      capped = sorted.slice(0, visibleCount);
    }
    return groupRows(capped, effectiveGroup);
    // dataUpdatedAt included so the window recomputes on every 30s refetch,
    // even when rows are reference-stable via React Query structural sharing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sort, effectiveGroup, visibleCount, dataUpdatedAt]);

  const visibleRowsCount = Math.min(visibleCount, filteredCount);

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
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            {isToday(date) ? "Lịch hôm nay" : "Lịch theo ngày"}
          </h3>
          <div className="flex items-center gap-1.5 ml-1">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, -1))}
              className="rounded border border-border p-0.5 text-muted-foreground hover:bg-accent"
              title="Hôm trước"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value || todayHCM())}
              aria-label="Chọn ngày"
              onClick={(e) => {
                if ('showPicker' in HTMLInputElement.prototype) {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch (err) {}
                }
              }}
            />
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, 1))}
              className="rounded border border-border p-0.5 text-muted-foreground hover:bg-accent"
              title="Hôm sau"
            >
              <ChevronRight size={14} />
            </button>
            {!isToday(date) && (
              <button
                type="button"
                onClick={() => setDate(todayHCM())}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] hover:bg-accent"
              >
                Hôm nay
              </button>
            )}
            <div className="flex bg-muted/40 rounded border border-border ml-1 p-0.5">
              <button
                type="button"
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${displayMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setDisplayMode("list")}
                title="Dạng danh sách"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${displayMode === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setDisplayMode("calendar")}
                title="Dạng Timeline 1 ngày"
              >
                <CalendarIcon size={14} />
              </button>
            </div>
          </div>
          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground ml-1">
            {formatDateLabel(date)}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <RotateCw size={10} className={isFetching ? "animate-spin" : ""} aria-hidden />
            <span>30s</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <SortMenu sort={sort} onChange={setSort} />
          <GroupMenu group={group} onChange={setGroup} />
          <ColumnMenu visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          <FilterMenu query={query} onQueryChange={setQuery} />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-accent sm:py-1"
            title="Thêm dòng thủ công — meeting, reminder, giao việc agent"
          >
            <Plus size={12} />
            <span>Thêm</span>
          </button>
          <Link
            to="/timetable"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:underline"
            title="Mở page /timetable xem đủ lịch + audit log"
          >
            Xem đủ <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Smart search */}
      <div className="border-b border-border px-4 py-2">
        <SmartSearch value={query} onChange={setQuery} companyId={companyId} />
      </div>

      {/* Time-of-day tabs */}
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2"
        role="tablist"
        aria-label="Lọc theo buổi"
      >
        {BUCKET_TABS.map((tab) => {
          const active = tab.key === bucketFilter;
          // For "now", show which bucket it currently resolves to so chị
          // can see "Hiện tại · Tối" without guessing.
          const now = tab.key === "now";
          const resolved = now ? currentTimeBucket() : null;
          const resolvedLabel = resolved
            ? resolved === "morning"
              ? "Sáng"
              : resolved === "afternoon"
              ? "Chiều"
              : "Tối"
            : null;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setBucketFilter(tab.key);
                setVisibleCount(DEFAULT_VISIBLE); // reset pagination on bucket switch
              }}
              title={tab.hint}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {resolvedLabel && (
                <span className={`text-[10px] ${active ? "opacity-80" : "opacity-70"}`}>
                  · {resolvedLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-md" />
            ))}
          </div>
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
            Chưa có lịch nào hôm nay. Bấm <strong>+ Thêm</strong> để tạo dòng thủ công.
          </div>
        ) : filteredCount === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query ? (
              <>
                Không có dòng nào khớp với{" "}
                <code className="rounded bg-muted/40 px-1">{query}</code>
                {bucketFilter !== "all" && <> trong buổi đã chọn</>}
                .{" "}
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="underline underline-offset-2"
                >
                  xoá filter
                </button>
              </>
            ) : bucketFilter !== "all" ? (
              <>
                Không có dòng nào trong buổi đã chọn.{" "}
                <button
                  type="button"
                  onClick={() => setBucketFilter("all")}
                  className="underline underline-offset-2"
                >
                  xem tất cả
                </button>
              </>
            ) : (
              <>Không có dòng nào khớp.</>
            )}
          </div>
        ) : displayMode === "calendar" ? (
          <TimetableCalendarView rows={filteredRows} companyId={companyId} />
        ) : (
          <div>
            {processedSections.map((section) => (
              <div key={section.key}>
                {section.label && (
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>{section.label}</span>
                    <span>{section.rows.length} dòng</span>
                  </div>
                )}
                <TimetableTable
                  rows={section.rows}
                  companyId={companyId}
                  expanded={expanded}
                  onToggleRow={toggleRow}
                  visibleColumns={visibleSet}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddManualRowModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        companyId={companyId}
        defaultDate={date}
      />

      {/* Footer */}
      {filteredCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            Hiển thị <strong>{visibleRowsCount}</strong> / {filteredCount} dòng
            {(query || bucketFilter !== "all") && ` (lọc từ ${totalRows} cả ngày)`}
            {filteredCount > visibleRowsCount ? ` · còn ${filteredCount - visibleRowsCount} dòng` : ""}
          </span>
          <div className="flex items-center gap-1">
            <span className="mr-1">Hiện thêm:</span>
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleShowMore(n)}
                disabled={visibleCount >= filteredCount}
                className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                title={`Hiện thêm ${n} dòng`}
              >
                +{n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleShowMore("all")}
              disabled={visibleCount >= filteredCount}
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

