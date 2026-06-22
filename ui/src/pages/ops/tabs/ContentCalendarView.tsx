// ContentCalendarView — month calendar for the "Nội Dung" tab (2026-06-22).
// Places cc_scripts on a day grid by scheduled_at (fallback created_at). Click a card → CC detail.
// Read-only view; editing stays in list/expand. HCM timezone for date bucketing.

import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_DOT: Record<string, string> = {
  draft: "bg-gray-400",
  approved: "bg-green-500",
  scheduled: "bg-yellow-500",
  published: "bg-blue-500",
  rejected: "bg-red-500",
};
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// posted_account → short platform badge (label + color). Matches cc_scripts.posted_account values.
const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  page_jennie: { label: "FB J", cls: "bg-blue-100 text-blue-700" },
  page_gemral: { label: "FB G", cls: "bg-violet-100 text-violet-700" },
  profile_jennie: { label: "Prof", cls: "bg-pink-100 text-pink-700" },
  page_yinyang: { label: "YY", cls: "bg-amber-100 text-amber-700" },
  forum: { label: "Forum", cls: "bg-teal-100 text-teal-700" },
  email: { label: "Email", cls: "bg-gray-100 text-gray-600" },
  resend: { label: "Email", cls: "bg-gray-100 text-gray-600" },
  push: { label: "Push", cls: "bg-orange-100 text-orange-700" },
};
function platformBadge(acct?: string): { label: string; cls: string } | null {
  if (!acct) return null;
  return PLATFORM_BADGE[acct] ?? { label: acct.slice(0, 6), cls: "bg-muted text-muted-foreground" };
}
// HH:MM (HCM) from scheduled_at — the planned publish time.
function hcmTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(11, 16);
}

// YYYY-MM-DD in HCM (UTC+7) for an ISO timestamp.
function hcmDateKey(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function monthMatrix(year: number, month: number): string[][] {
  // month: 0-based. Returns weeks (Mon-first) of YYYY-MM-DD strings covering the month.
  const first = new Date(Date.UTC(year, month, 1));
  const startDow = (first.getUTCDay() + 6) % 7; // Mon=0
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - startDow);
  const weeks: string[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(row);
    // Stop after we've passed the month and completed a week
    if (cur.getUTCMonth() !== month && w >= 3 && row[6].slice(0, 7) !== `${year}-${String(month + 1).padStart(2, "0")}`) {
      // keep at least until month end is covered
    }
  }
  return weeks;
}

export function ContentCalendarView({ items }: { items: any[] }) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(new Date().getTime() + 7 * 3600 * 1000), []);
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getUTCFullYear(), m: now.getUTCMonth() });

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of items) {
      const key = hcmDateKey(s.scheduled_at || s.created_at);
      if (!key) continue;
      (map[key] ||= []).push(s);
    }
    return map;
  }, [items]);

  const weeks = useMemo(() => monthMatrix(ym.y, ym.m), [ym]);
  const monthLabel = `Tháng ${ym.m + 1}/${ym.y}`;
  const todayKey = now.toISOString().slice(0, 10);
  const monthPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;

  const prevMonth = () => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const nextMonth = () => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button size="sm" variant="outline" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} className="border-b border-border bg-muted/30 px-1 py-1.5 text-center text-[10px] font-medium text-muted-foreground">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((dateKey) => {
                  const inMonth = dateKey.startsWith(monthPrefix);
                  const isToday = dateKey === todayKey;
                  const dayNum = parseInt(dateKey.slice(8), 10);
                  const dayItems = byDate[dateKey] || [];
                  return (
                    <td
                      key={dateKey}
                      className={`border border-border align-top p-1 min-w-[130px] ${inMonth ? "" : "bg-muted/20"}`}
                    >
                      <div className={`mb-1 text-[10px] ${isToday ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground" : inMonth ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                        {dayNum}
                      </div>
                      {/* Fixed-height list → mọi ô đồng đều bất kể số bài */}
                      <div className="space-y-1 h-[96px] overflow-y-auto pr-0.5">
                        {dayItems.map((s) => {
                          const badge = platformBadge(s.posted_account);
                          const time = hcmTime(s.scheduled_at);
                          return (
                            <button
                              key={s.id}
                              onClick={() => navigate(`/GEM/cc/scripts/${s.id}`)}
                              className="flex h-[34px] w-full items-center gap-1 rounded border border-border/60 bg-muted/40 px-1 text-left hover:bg-accent transition-colors"
                              title={s.title}
                            >
                              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[s.status] ?? "bg-gray-400"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 leading-none">
                                  {badge && <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold leading-none ${badge.cls}`}>{badge.label}</span>}
                                  {time && <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground">{time}</span>}
                                </div>
                                <div className="truncate text-[10px] leading-tight mt-0.5">{s.title || "—"}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
