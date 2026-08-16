import React, { useMemo, useEffect, useRef, useState } from "react";
import type { TimetableRow } from "@/types/timetable";
import { HCM_TZ, KindPill, StatusPill, RowDetail } from "./TimetableTable";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const HOUR_WIDTH = 120; // 120px per hour

export function TimetableCalendarView({
  rows,
  companyId,
}: {
  rows: TimetableRow[];
  companyId: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Group rows by agent
  const rowsByAgent = useMemo(() => {
    const map = new Map<string, { agent: TimetableRow["agent"]; rows: TimetableRow[] }>();
    
    for (const row of rows) {
      if (!row.agent) continue;
      const key = row.agent.id;
      if (!map.has(key)) {
        map.set(key, { agent: row.agent, rows: [] });
      }
      map.get(key)!.rows.push(row);
    }
    
    return Array.from(map.values()).sort((a, b) => a.agent!.name.localeCompare(b.agent!.name));
  }, [rows]);

  // Current time offset for initial scroll
  const [currentLeftPx] = useState(() => {
    const str = new Date().toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
    const [hh, mm] = str.split(':').map(Number);
    return (hh + mm / 60) * HOUR_WIDTH;
  });

  useEffect(() => {
    if (scrollRef.current && !hasScrolled) {
      // Scroll to center the current time line
      const clientWidth = scrollRef.current.clientWidth;
      const targetScroll = Math.max(0, currentLeftPx - clientWidth / 2 + 100); // 100px offset for sidebar
      scrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
      setHasScrolled(true);
    }
  }, [currentLeftPx, hasScrolled]);

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden flex flex-col h-[70vh] min-h-[500px]">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Agents) */}
        <div className="w-[180px] sm:w-[220px] shrink-0 border-r border-border bg-muted/20 z-30 flex flex-col overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
          {/* Header spacer */}
          <div className="h-10 border-b border-border bg-muted/40 shrink-0 flex items-center px-3">
             <span className="text-xs font-semibold text-muted-foreground uppercase">Agents</span>
          </div>
          {/* Agent Rows */}
          {rowsByAgent.map(({ agent, rows }) => (
            <div key={agent!.id} className="h-20 border-b border-border p-3 flex flex-col justify-center bg-card">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm truncate leading-tight" title={agent!.name}>{agent!.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{rows.length}</span>
              </div>
              {agent!.schedule && (
                 <span className="text-[11px] font-mono text-muted-foreground truncate mt-1">{agent!.schedule}</span>
              )}
            </div>
          ))}
        </div>

        {/* Right Timeline Area */}
        <div className="flex-1 overflow-auto relative bg-[#fafafa] dark:bg-[#111]" ref={scrollRef}>
          {/* Timeline Header (hours) */}
          <div className="flex h-10 border-b border-border sticky top-0 z-20 bg-background/90 backdrop-blur">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="shrink-0 border-r border-border/50 text-[11px] font-medium text-muted-foreground px-1.5 py-1 text-right relative" style={{ width: HOUR_WIDTH }}>
                <span className="absolute top-1 right-1.5">{i.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          
          {/* Timeline Grid & Rows */}
          <div className="relative" style={{ width: 24 * HOUR_WIDTH, minHeight: '100%' }}>
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none z-0">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-r border-border/40 h-full shrink-0" style={{ width: HOUR_WIDTH }} />
              ))}
            </div>

            {/* Agent Tracks */}
            {rowsByAgent.map(({ agent, rows }) => (
              <div key={agent!.id} className="h-20 border-b border-border/30 relative z-10 hover:bg-accent/5">
                {rows.map((row, idx) => {
                  const date = new Date(row.startsAt);
                  if (Number.isNaN(date.getTime())) return null;
                  
                  const localStr = date.toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
                  const [hh, mm] = localStr.split(':').map(Number);
                  const leftPx = (hh + mm / 60) * HOUR_WIDTH;
                  const isScheduled = row.status === "scheduled" && row.sourceTable === "heartbeat_runs";

                  // Check if there are overlapping elements to stagger them slightly
                  const previousRows = rows.slice(0, idx);
                  const overlapping = previousRows.filter(pr => {
                     const pDate = new Date(pr.startsAt);
                     if (Number.isNaN(pDate.getTime())) return false;
                     const pLocalStr = pDate.toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
                     const [phh, pmm] = pLocalStr.split(':').map(Number);
                     const pLeftPx = (phh + pmm / 60) * HOUR_WIDTH;
                     return Math.abs(pLeftPx - leftPx) < 40; // overlap threshold
                  });
                  const staggerOffset = (overlapping.length % 3) * 6; // stagger up to 3 levels

                  return (
                    <Popover key={row.id}>
                      <PopoverTrigger asChild>
                        <div 
                          className={`absolute rounded-md border shadow-sm px-1.5 py-0.5 text-center cursor-pointer hover:scale-105 hover:z-30 transition-all flex flex-col items-center justify-center min-w-[54px] -translate-x-1/2
                              ${isScheduled ? 'border-dashed border-border/80 bg-background/60 opacity-80' : 'border-border bg-white dark:bg-zinc-800'}`}
                          style={{ 
                             left: `${leftPx}px`, 
                             top: `calc(50% - 14px + ${staggerOffset}px)`
                          }}
                        >
                          <span className="text-red-500 font-semibold text-[11px] leading-tight">{localStr}</span>
                          <span className="text-muted-foreground truncate max-w-[70px] text-[10px] leading-tight">{row.kind || row.title}</span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="z-[100] w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                        sideOffset={6}
                        collisionPadding={10}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <strong className="text-sm font-semibold leading-tight">{row.title}</strong>
                            <StatusPill status={row.status} extra={row.statusExtra} />
                          </div>
                          <div className="flex items-center gap-2">
                            <KindPill kind={row.kind} />
                            <span className="text-xs text-muted-foreground">{date.toLocaleString("en-GB", { timeZone: HCM_TZ })}</span>
                          </div>
                          {row.description && <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">{row.description}</div>}
                          <div className="border-t border-border/50 pt-3 mt-3 max-h-[300px] overflow-y-auto">
                            <RowDetail row={row} companyId={companyId} onClose={() => {}} />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            ))}

            {/* Current Time Line */}
            <CurrentTimeLine />
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const [now, setNow] = useState(() => {
    const str = new Date().toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
    const [hh, mm] = str.split(':').map(Number);
    return hh + mm / 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const str = new Date().toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
      const [hh, mm] = str.split(':').map(Number);
      setNow(hh + mm / 60);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="absolute top-0 bottom-0 w-[2px] bg-red-500/80 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      style={{ left: `${now * HOUR_WIDTH}px` }}
    />
  );
}
