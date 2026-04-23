// TimetableWidget — Dashboard embed of /timetable.
// Compact view: 6 rows default, footer pagination, toolbar stubs.
// Table + row primitives live in ./TimetableTable so the full page reuses
// identical rendering + save mutation.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import {
  ArrowRight,
  CalendarDays,
  Plus,
  RotateCw,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useTimetable } from "@/hooks/useTimetable";
import { HCM_TZ, TimetableTable } from "./TimetableTable";
import { AddManualRowModal } from "./AddManualRowModal";
import { SortMenu, GroupMenu, ColumnMenu } from "./TimetableMenus";
import { SmartSearch } from "./SmartSearch";
import type { TimetableSort, TimetableGroup } from "@/types/timetable";
import {
  sortRows,
  groupRows,
  parseQuery,
  applyQuery,
  pushRecentSearch,
  loadVisibleColumns,
  saveVisibleColumns,
  type ColumnKey,
} from "@/lib/timetableFilters";

const DEFAULT_VISIBLE = 6;

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

export default function TimetableWidget() {
  const { selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId ?? "";

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } =
    useTimetable(companyId);
  const rows = data?.rows ?? [];
  const totalRows = rows.length;

  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_VISIBLE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [sort, setSort] = useState<TimetableSort>({ field: "time", dir: "asc" });
  const [group, setGroup] = useState<TimetableGroup>("time_of_day");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => loadVisibleColumns());
  const [query, setQuery] = useState("");

  useEffect(() => {
    saveVisibleColumns(visibleColumns);
  }, [visibleColumns]);

  // Persist once user pauses typing for 700ms.
  useEffect(() => {
    if (!query.trim()) return;
    const t = window.setTimeout(() => pushRecentSearch(query.trim()), 700);
    return () => window.clearTimeout(t);
  }, [query]);

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const parsed = useMemo(() => parseQuery(query), [query]);
  const filteredRows = useMemo(() => applyQuery(rows, parsed), [rows, parsed]);
  const filteredCount = filteredRows.length;

  const processedSections = useMemo(() => {
    const sorted = sortRows(filteredRows, sort);
    // Cap before grouping so "Hiện thêm" still targets the overall count.
    const capped = sorted.slice(0, visibleCount);
    return groupRows(capped, group);
  }, [filteredRows, sort, group, visibleCount]);

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
          <SortMenu sort={sort} onChange={setSort} />
          <GroupMenu group={group} onChange={setGroup} />
          <ColumnMenu visibleColumns={visibleColumns} onChange={setVisibleColumns} />
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
            Chưa có lịch nào hôm nay. Bấm <strong>+ Thêm</strong> để tạo dòng thủ công.
          </div>
        ) : filteredCount === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Không có dòng nào khớp với tìm kiếm <code className="rounded bg-muted/40 px-1">{query}</code>.{" "}
            <button
              type="button"
              onClick={() => setQuery("")}
              className="underline underline-offset-2"
            >
              xoá filter
            </button>
          </div>
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
      />

      {/* Footer */}
      {filteredCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            Hiển thị <strong>{visibleRowsCount}</strong> / {filteredCount} dòng
            {query ? ` (lọc từ ${totalRows})` : ""}
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

