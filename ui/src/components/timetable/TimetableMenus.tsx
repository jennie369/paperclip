// Sort / Group / Column menus. Each is a state-managed popover closed by
// outside-click or Escape via useOnClickOutside. Buttons meet the 44px
// touch target on mobile (py-2 on sm+).

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Columns3, Eye, EyeOff, Layers } from "lucide-react";
import type { TimetableSort, TimetableGroup } from "@/types/timetable";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  type ColumnKey,
} from "@/lib/timetableFilters";

// ─── Reusable popover shell ───────────────────────────────────────────────

function Popover({
  label,
  badge,
  icon,
  tip,
  width = "w-56",
  children,
}: {
  label: string;
  badge?: string;
  icon: React.ReactNode;
  tip: string;
  width?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);
  useOnClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-accent sm:py-1"
        title={tip}
        aria-expanded={open}
      >
        {icon}
        <span>{label}</span>
        {badge && (
          <span className="rounded bg-muted/40 px-1 py-0.5 text-[10px] text-muted-foreground">
            {badge}
          </span>
        )}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full z-30 mt-1 ${width} max-w-[90vw] rounded border border-border bg-popover p-1 shadow-lg`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

// ─── Sort menu ────────────────────────────────────────────────────────────

const SORT_FIELDS: Array<{ key: TimetableSort["field"]; label: string }> = [
  { key: "time", label: "🕐 Giờ" },
  { key: "agent", label: "🤖 Agent" },
  { key: "kind", label: "🏷 Loại" },
  { key: "status", label: "🚦 Trạng thái" },
  { key: "result", label: "📊 Kết quả" },
];

export function SortMenu({
  sort,
  onChange,
}: {
  sort: TimetableSort;
  onChange: (sort: TimetableSort) => void;
}) {
  const activeLabel = SORT_FIELDS.find((f) => f.key === sort.field)?.label ?? "Giờ";
  const dirArrow = sort.dir === "asc" ? "↑" : "↓";

  return (
    <Popover
      icon={<ArrowUpDown size={12} />}
      label="Sắp xếp"
      badge={`${activeLabel.replace(/^[^\s]+\s/, "")} ${dirArrow}`}
      tip="Sắp xếp dòng theo cột · click để đổi field + hướng"
    >
      {() => (
        <>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Sắp xếp theo
          </div>
          {SORT_FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onChange({ field: f.key, dir: sort.dir })}
              className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-accent sm:py-1.5 ${
                sort.field === f.key ? "bg-accent/60 font-medium" : ""
              }`}
            >
              <span>{f.label}</span>
              {sort.field === f.key && (
                <span className="text-[10px] text-muted-foreground">đang chọn</span>
              )}
            </button>
          ))}
          <div className="mt-1 flex gap-1 border-t border-border p-1">
            <button
              type="button"
              onClick={() => onChange({ field: sort.field, dir: "asc" })}
              className={`flex-1 rounded px-2 py-1.5 text-xs hover:bg-accent ${
                sort.dir === "asc" ? "bg-accent/60 font-medium" : ""
              }`}
              title="A→Z · 00:00→23:59"
            >
              <ArrowUp size={10} className="inline" /> Tăng dần
            </button>
            <button
              type="button"
              onClick={() => onChange({ field: sort.field, dir: "desc" })}
              className={`flex-1 rounded px-2 py-1.5 text-xs hover:bg-accent ${
                sort.dir === "desc" ? "bg-accent/60 font-medium" : ""
              }`}
              title="Z→A · 23:59→00:00"
            >
              <ArrowDown size={10} className="inline" /> Giảm dần
            </button>
          </div>
        </>
      )}
    </Popover>
  );
}

// ─── Group menu ───────────────────────────────────────────────────────────

const GROUP_OPTIONS: Array<{ key: TimetableGroup; label: string }> = [
  { key: "none", label: "➖ Không nhóm" },
  { key: "time_of_day", label: "🕐 Giờ buổi (Sáng · Chiều · Tối)" },
  { key: "agent", label: "🤖 Agent" },
  { key: "kind", label: "🏷 Loại" },
  { key: "status", label: "🚦 Trạng thái" },
  { key: "has_note", label: "📝 Có/không ghi chú" },
];

export function GroupMenu({
  group,
  onChange,
}: {
  group: TimetableGroup;
  onChange: (g: TimetableGroup) => void;
}) {
  const activeLabel = GROUP_OPTIONS.find((o) => o.key === group)?.label ?? "Không nhóm";
  return (
    <Popover
      icon={<Layers size={12} />}
      label="Nhóm"
      badge={activeLabel.replace(/^[^\s]+\s/, "")}
      tip="Nhóm dòng theo cột"
      width="w-60"
    >
      {(close) => (
        <>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Nhóm theo
          </div>
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key);
                close();
              }}
              className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-accent sm:py-1.5 ${
                group === opt.key ? "bg-accent/60 font-medium" : ""
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </>
      )}
    </Popover>
  );
}

// ─── Column menu ──────────────────────────────────────────────────────────

export function ColumnMenu({
  visibleColumns,
  onChange,
}: {
  visibleColumns: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
}) {
  const visibleSet = new Set(visibleColumns);

  const toggle = (key: ColumnKey) => {
    const next = COLUMN_KEYS.filter((k) => {
      if (k === key) return !visibleSet.has(k);
      return visibleSet.has(k);
    });
    // Never allow hiding both "time" and "title" — rows become empty.
    if (!next.includes("time") && !next.includes("title")) return;
    onChange(next);
  };

  const resetDefault = () => onChange([...COLUMN_KEYS]);

  return (
    <Popover
      icon={<Columns3 size={12} />}
      label="Cột"
      badge={`${visibleColumns.length}/${COLUMN_KEYS.length}`}
      tip="Ẩn/hiện cột · lưu trên trình duyệt"
      width="w-52"
    >
      {() => (
        <>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Ẩn / hiện cột
          </div>
          {COLUMN_KEYS.map((key) => {
            const on = visibleSet.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-accent sm:py-1.5"
              >
                {on ? (
                  <Eye size={12} className="text-primary" />
                ) : (
                  <EyeOff size={12} className="text-muted-foreground" />
                )}
                <span className={on ? "" : "text-muted-foreground line-through"}>
                  {COLUMN_LABELS[key]}
                </span>
              </button>
            );
          })}
          <div className="mt-1 flex border-t border-border p-1">
            <button
              type="button"
              onClick={resetDefault}
              className="flex-1 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Reset về mặc định
            </button>
          </div>
        </>
      )}
    </Popover>
  );
}
