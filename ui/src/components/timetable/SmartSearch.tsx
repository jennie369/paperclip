// SmartSearch input with live suggestion dropdown.
// Parser accepts `@agent` `#task` `word:value` and free text. Chips in the
// dropdown append tokens to the input so users discover the syntax by
// clicking rather than by memorizing.

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Clock } from "lucide-react";
import { agentsApi } from "@/api/agents";
import { loadRecentSearches } from "@/lib/timetableFilters";

interface Chip {
  tag: string;
  value: string;
  label: string;
  hint: string;
}

const CHIPS: Chip[] = [
  { tag: "type:", value: "post", label: "Post", hint: "Chỉ dòng Post" },
  { tag: "type:", value: "email", label: "Email", hint: "Chỉ dòng Email" },
  { tag: "type:", value: "task", label: "Task", hint: "Chỉ dòng Task" },
  { tag: "type:", value: "heartbeat", label: "Heartbeat", hint: "Chỉ heartbeat runs" },
  { tag: "type:", value: "reel", label: "Reel", hint: "Chỉ Reel" },
  { tag: "status:", value: "failed", label: "Failed", hint: "Chỉ dòng thất bại" },
  { tag: "status:", value: "running", label: "Running", hint: "Đang chạy" },
  { tag: "status:", value: "scheduled", label: "Scheduled", hint: "Sắp chạy" },
  { tag: "status:", value: "done", label: "Done", hint: "Đã xong" },
  { tag: "time:", value: "morning", label: "Sáng", hint: "06:00 → 11:59" },
  { tag: "time:", value: "afternoon", label: "Chiều", hint: "12:00 → 17:59" },
  { tag: "time:", value: "evening", label: "Tối", hint: "18:00 → 23:59" },
  { tag: "time:", value: "upcoming", label: "Sắp tới", hint: "Dòng chưa tới giờ" },
  { tag: "has:", value: "note", label: "Có ghi chú", hint: "Chỉ dòng có note" },
];

export function SmartSearch({
  value,
  onChange,
  companyId,
  onOpenStateChange,
  placeholder = "Tìm nhanh... @agent · #task · :filter",
}: {
  value: string;
  onChange: (q: string) => void;
  companyId: string;
  onOpenStateChange?: (open: boolean) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onOpenStateChange?.(open);
  }, [open, onOpenStateChange]);

  // Refresh recent list when the popup opens so edits from another tab show up.
  useEffect(() => {
    if (open) setRecent(loadRecentSearches());
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { data: agents } = useQuery({
    queryKey: ["agents", "list", companyId],
    queryFn: () => agentsApi.list(companyId),
    enabled: open && Boolean(companyId),
  });

  const appendToken = (token: string) => {
    const trimmed = value.trim();
    const next = trimmed ? `${trimmed} ${token}` : token;
    onChange(next);
    inputRef.current?.focus();
  };

  const clear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const agentList = (agents ?? []).slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center gap-2 rounded border bg-background px-2 py-1.5 text-sm ${
          open ? "border-primary" : "border-border"
        }`}
      >
        <Search size={14} className="text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          aria-label="Smart search"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            title="Xoá tìm kiếm"
            aria-label="Clear"
          >
            <X size={12} />
          </button>
        )}
        <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          /
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-auto rounded border border-border bg-popover shadow-lg">
          <div className="border-b border-border p-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Bộ lọc nhanh
            </div>
            <div className="flex flex-wrap gap-1">
              {CHIPS.map((chip) => (
                <button
                  key={`${chip.tag}${chip.value}`}
                  type="button"
                  onClick={() => appendToken(`${chip.tag}${chip.value}`)}
                  title={chip.hint}
                  className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] hover:bg-accent"
                >
                  <span className="text-muted-foreground">{chip.tag}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {agentList.length > 0 && (
            <div className="border-b border-border p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Agents · click để thêm <code>@</code>
              </div>
              <div className="flex flex-col">
                {agentList.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => appendToken(`@${a.name.split(/\s+/)[0]?.toLowerCase() ?? ""}`)}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent"
                    title={`Filter theo @${a.name}`}
                  >
                    <span className="text-muted-foreground">🤖</span>
                    <span className="flex-1 truncate">{a.name}</span>
                    {a.title && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                        {a.title}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Tìm kiếm gần đây
              </div>
              <div className="flex flex-col">
                {recent.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onChange(q);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent"
                    title="Chạy lại tìm kiếm này"
                  >
                    <Clock size={11} className="text-muted-foreground" />
                    <span className="truncate font-mono">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartSearch;
