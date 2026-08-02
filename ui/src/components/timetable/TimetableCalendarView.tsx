import React, { useMemo, useEffect, useRef, useState } from "react";
import type { TimetableRow } from "@/types/timetable";
import { HCM_TZ, KindPill, StatusPill, AgentCell, RowDetail } from "./TimetableTable";

export function TimetableCalendarView({
  rows,
  companyId,
}: {
  rows: TimetableRow[];
  companyId: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group rows by hour (0 to 23)
  const rowsByHour = useMemo(() => {
    const map = new Map<number, TimetableRow[]>();
    for (let i = 0; i < 24; i++) map.set(i, []);
    for (const row of rows) {
      const date = new Date(row.startsAt);
      if (Number.isNaN(date.getTime())) continue;
      
      const hourStr = date.toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit" });
      const hour = parseInt(hourStr, 10);
      if (hour >= 0 && hour < 24) {
        map.get(hour)?.push(row);
      }
    }
    return map;
  }, [rows]);

  const [currentHour, setCurrentHour] = useState(() => 
    parseInt(new Date().toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit" }), 10)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(parseInt(new Date().toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit" }), 10));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (scrollRef.current && !hasScrolled) {
      const currentHourEl = scrollRef.current.querySelector(`[data-hour="${currentHour}"]`);
      if (currentHourEl) {
        currentHourEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setHasScrolled(true);
      }
    }
  }, [currentHour, hasScrolled]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-[600px] overflow-y-auto bg-card relative" ref={scrollRef}>
      {hours.map((hour) => {
        const hourRows = rowsByHour.get(hour) || [];
        const isCurrent = hour === currentHour;
        
        return (
          <div key={hour} data-hour={hour} className={`flex border-b border-border min-h-[60px] ${isCurrent ? 'bg-muted/10' : ''}`}>
            {/* Time column */}
            <div className={`w-16 flex flex-col items-end pr-2 py-2 border-r border-border shrink-0 ${isCurrent ? 'bg-primary/5 border-r-primary/30' : 'bg-muted/20'}`}>
              <span className={`text-xs ${isCurrent ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
            
            {/* Events column */}
            <div className="flex-1 p-2 flex flex-col gap-2 relative min-w-0">
              {/* Current time indicator line */}
              {isCurrent && (
                <div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary/40 z-0 pointer-events-none" />
              )}
              
              {hourRows.length === 0 ? (
                <div className="h-full flex items-center justify-start opacity-0 select-none">.</div>
              ) : (
                hourRows.map((row) => {
                  const isExpanded = !!expanded[row.id];
                  const time = new Date(row.startsAt).toLocaleTimeString("en-GB", { timeZone: HCM_TZ, hour: "2-digit", minute: "2-digit" });
                  const isScheduled = row.status === "scheduled" && row.sourceTable === "heartbeat_runs";
                  
                  return (
                    <div 
                      key={row.id} 
                      className={`relative z-10 text-xs border rounded p-2 cursor-pointer transition-colors shadow-sm ${
                        isScheduled 
                          ? 'border-dashed border-border/80 bg-background/50 hover:bg-accent/40 opacity-80' 
                          : 'border-border bg-background hover:bg-accent'
                      }`}
                      onClick={() => toggleRow(row.id)}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="shrink-0 text-[10px] font-mono bg-muted/50 px-1 rounded text-muted-foreground">{time}</span>
                          <strong className="truncate">{row.title}</strong>
                        </div>
                        <div className="shrink-0">
                          <StatusPill status={row.status} extra={row.statusExtra} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1.5 mb-1">
                        <KindPill kind={row.kind} />
                        <AgentCell row={row} />
                      </div>
                      
                      {row.description && (
                        <div className={`text-muted-foreground mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {row.description}
                        </div>
                      )}
                      
                      {(row.resultAuto || row.resultOverride) && !isExpanded && (
                        <div className="mt-1 text-[11px] text-muted-foreground italic truncate border-t border-border/40 pt-1">
                          ↳ {row.resultOverride ?? row.resultAuto}
                        </div>
                      )}
                      
                      {isExpanded && (
                        <div className="mt-2 text-foreground pt-2 border-t border-border/50 cursor-default" onClick={(e) => e.stopPropagation()}>
                          <RowDetail row={row} companyId={companyId} onClose={() => toggleRow(row.id)} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
