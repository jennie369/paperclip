// TimetableWidget — Dashboard embed of /timetable.
// Compact view: 6 rows default, footer pagination, toolbar stubs.
// Table + row primitives live in ./TimetableTable so the full page reuses
// identical rendering + save mutation.

import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  Layers,
  Plus,
  RotateCw,
  Search,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useTimetable } from "@/hooks/useTimetable";
import { HCM_TZ, TimetableTable } from "./TimetableTable";
import { AddManualRowModal } from "./AddManualRowModal";

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
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
            title="Thêm dòng thủ công — meeting, reminder, giao việc agent"
          >
            <Plus size={12} />
            <span>Thêm</span>
          </button>
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
          <TimetableTable
            rows={visibleRows}
            companyId={companyId}
            expanded={expanded}
            onToggleRow={toggleRow}
          />
        )}
      </div>

      <AddManualRowModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        companyId={companyId}
      />

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
// Real menus land in P7–P9. Disabled for now with clear tooltip.

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
