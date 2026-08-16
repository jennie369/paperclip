// GenericKanban — reusable kanban board (SSOT visual extracted from KanbanBoard 2026-06-22).
// Used by: Issues board (via KanbanBoard wrapper) + Content "Nội Dung" tab + future surfaces.
// Keeps ONE visual/DnD implementation so all kanban boards stay in sync.
//
// Generic over item type T. Caller supplies:
//   - columns: ordered column defs (id + label + optional description)
//   - getId / getColumnId: map item → its id + which column it sits in
//   - renderCard: render a single card (caller owns card content/links)
//   - onMove(id, toColumnId): called when a card is dragged to another column (omit = read-only)
//   - renderColumnIcon: optional icon before the column label (e.g. StatusIcon)
//   - storageKey: localStorage key for persisted column order (omit = no persistence / no reorder)

import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { GripHorizontal } from "lucide-react";

export interface KanbanColumnDef {
  id: string;
  label: string;
  description?: string;
}

export interface GenericKanbanProps<T> {
  items: T[];
  columns: KanbanColumnDef[];
  getId: (item: T) => string;
  getColumnId: (item: T) => string;
  renderCard: (item: T, opts: { isOverlay?: boolean }) => ReactNode;
  onMove?: (id: string, toColumnId: string) => void;
  renderColumnIcon?: (columnId: string) => ReactNode;
  storageKey?: string;
  /** Height class for the board scroll container. Default matches Issues board. */
  heightClass?: string;
}

/* ── Sortable Column ── */
function SortableColumn<T>({
  column,
  items,
  getId,
  renderCard,
  isCollapsed,
  onToggleCollapse,
  renderColumnIcon,
  reorderable,
}: {
  column: KanbanColumnDef;
  items: T[];
  getId: (item: T) => string;
  renderCard: (item: T, opts: { isOverlay?: boolean }) => ReactNode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  renderColumnIcon?: (columnId: string) => ReactNode;
  reorderable: boolean;
}) {
  const { setNodeRef, isOver, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "Column", status: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-row items-center gap-2 w-[180px] shrink-0 rounded-md border border-dashed border-border/60 py-2 px-3 bg-muted/10 hover:border-border transition-colors cursor-pointer self-start"
        onClick={onToggleCollapse}
        title={column.description || column.label}
      >
        {reorderable && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <GripHorizontal className="h-3.5 w-3.5" />
          </div>
        )}
        {renderColumnIcon?.(column.id)}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{column.label}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground/80 ml-auto">{items.length}</span>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col min-w-[260px] w-[260px] shrink-0 h-full max-h-full">
      <div
        className="flex items-center gap-2 px-2 py-2 mb-1 group/col cursor-pointer hover:bg-accent/40 rounded-md transition-colors shrink-0"
        onClick={onToggleCollapse}
        title={column.description || column.label}
      >
        {reorderable && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <GripHorizontal className="h-3.5 w-3.5" />
          </div>
        )}
        {renderColumnIcon?.(column.id)}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 select-none">{column.label}</span>
        <span className="text-xs text-muted-foreground/60 tabular-nums">{items.length}</span>
      </div>
      <div className={`flex-1 min-h-[120px] overflow-y-auto overflow-x-hidden rounded-md p-1 space-y-1 transition-colors ${isOver ? "bg-accent/40" : "bg-muted/20"}`}>
        <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableCard key={getId(item)} id={getId(item)} item={item} renderCard={renderCard} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Sortable Card wrapper (drag affordance; card content from caller) ── */
function SortableCard<T>({ id, item, renderCard }: { id: string; item: T; renderCard: (item: T, opts: { isOverlay?: boolean }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: "Item", item } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(item, {})}
    </div>
  );
}

/* ── Main Board ── */
export function GenericKanban<T>({
  items,
  columns,
  getId,
  getColumnId,
  renderCard,
  onMove,
  renderColumnIcon,
  storageKey,
  heightClass = "h-[calc(100vh-14rem)]",
}: GenericKanbanProps<T>) {
  const reorderable = !!storageKey;
  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === columnIds.length && parsed.every((s) => columnIds.includes(s))) {
            return parsed;
          }
        }
      } catch { /* ignore */ }
    }
    return [...columnIds];
  });

  // Keep columnOrder in sync if the column set changes (e.g. dynamic statuses).
  useEffect(() => {
    setColumnOrder((prev) => {
      const filtered = prev.filter((id) => columnIds.includes(id));
      const added = columnIds.filter((id) => !filtered.includes(id));
      const next = [...filtered, ...added];
      return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next;
    });
  }, [columnIds]);

  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(columnOrder));
  }, [columnOrder, storageKey]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columnMap = useMemo(() => {
    const m: Record<string, KanbanColumnDef> = {};
    for (const c of columns) m[c.id] = c;
    return m;
  }, [columns]);

  const itemsByColumn = useMemo(() => {
    const grouped: Record<string, T[]> = {};
    for (const id of columnOrder) grouped[id] = [];
    for (const item of items) {
      const col = getColumnId(item);
      if (grouped[col]) grouped[col].push(item);
      else grouped[col] = [item]; // tolerate unexpected column
    }
    return grouped;
  }, [items, columnOrder, getColumnId]);

  const activeItem = useMemo(() => (activeId ? items.find((i) => getId(i) === activeId) ?? null : null), [activeId, items, getId]);

  function toggleColumn(id: string) {
    setCollapsedColumns((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === "Column") setActiveColumnId(event.active.id as string);
    else setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setActiveColumnId(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "Column") {
      if (reorderable && active.id !== over.id) {
        setColumnOrder((prev) => arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string)));
      }
      return;
    }

    if (!onMove) return;
    const itemId = active.id as string;
    const item = items.find((i) => getId(i) === itemId);
    if (!item) return;

    let targetColumn: string | null = null;
    if (over.data.current?.type === "Column") targetColumn = over.id as string;
    else {
      const overItem = items.find((i) => getId(i) === over.id);
      if (overItem) targetColumn = getColumnId(overItem);
    }
    if (targetColumn && targetColumn !== getColumnId(item)) onMove(itemId, targetColumn);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 items-start ${heightClass} min-h-[400px]`}>
        <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
          {columnOrder.map((id) => (
            <SortableColumn
              key={id}
              column={columnMap[id] ?? { id, label: id }}
              items={itemsByColumn[id] ?? []}
              getId={getId}
              renderCard={renderCard}
              isCollapsed={collapsedColumns.includes(id)}
              onToggleCollapse={() => toggleColumn(id)}
              renderColumnIcon={renderColumnIcon}
              reorderable={reorderable}
            />
          ))}
        </SortableContext>
      </div>
      <DragOverlay>
        {activeColumnId ? (
          <SortableColumn
            column={columnMap[activeColumnId] ?? { id: activeColumnId, label: activeColumnId }}
            items={itemsByColumn[activeColumnId] ?? []}
            getId={getId}
            renderCard={renderCard}
            isCollapsed={collapsedColumns.includes(activeColumnId)}
            onToggleCollapse={() => {}}
            renderColumnIcon={renderColumnIcon}
            reorderable={reorderable}
          />
        ) : activeItem ? (
          renderCard(activeItem, { isOverlay: true })
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
