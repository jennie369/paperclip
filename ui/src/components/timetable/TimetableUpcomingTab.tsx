// Upcoming tab: next 3 days grouped per day.
// Each day has its own useTimetable call — React Query dedupes when
// Dashboard/page also fetch identical (companyId, date, filters).

import { useState } from "react";
import { useTimetable } from "@/hooks/useTimetable";
import { TimetableTable, HCM_TZ } from "./TimetableTable";

function todayHCM(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: HCM_TZ });
}

function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function formatDayHeading(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1)));
  const weekday = dt.toLocaleDateString("vi-VN", { timeZone: "UTC", weekday: "long" });
  const dmy = dt.toLocaleDateString("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  });
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${cap}, ${dmy}`;
}

function UpcomingDaySection({
  companyId,
  date,
}: {
  companyId: string;
  date: string;
}) {
  const { data, isLoading, error } = useTimetable(companyId, { date });
  const rows = data?.rows ?? [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between bg-muted/40 px-4 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          {formatDayHeading(date)}
        </span>
        <span className="text-muted-foreground">
          {isLoading ? "đang tải…" : error ? "lỗi" : `${rows.length} dòng`}
        </span>
      </div>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : error ? (
        <div className="px-4 py-6 text-center text-sm text-destructive">
          Lỗi: {(error as Error).message || "unknown"}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs italic text-muted-foreground">
          Không có lịch cho ngày này.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <TimetableTable
            rows={rows}
            companyId={companyId}
            expanded={expanded}
            onToggleRow={toggleRow}
          />
        </div>
      )}
    </section>
  );
}

export function TimetableUpcomingTab({ companyId }: { companyId: string }) {
  const today = todayHCM();
  const dates = [shiftDay(today, 1), shiftDay(today, 2), shiftDay(today, 3)];

  return (
    <div>
      {dates.map((d) => (
        <UpcomingDaySection key={d} companyId={companyId} date={d} />
      ))}
    </div>
  );
}

export default TimetableUpcomingTab;
