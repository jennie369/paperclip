import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router";
import { formatDate } from "../lib/utils";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import { MoreHorizontal, Pencil, Archive, Trash2, GripHorizontal } from "lucide-react";
import type { Issue } from "@paperclipai/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const defaultBoardStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
];

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusDescriptions: Record<string, string> = {
  backlog: "Danh sách các ý tưởng, yêu cầu hoặc công việc chưa được đưa vào kế hoạch.",
  todo: "Các công việc đã được phê duyệt và sẵn sàng để bắt đầu.",
  in_progress: "Các công việc đang được thực hiện bởi Agents hoặc User.",
  in_review: "Các công việc đã làm xong nhưng đang chờ kiểm tra, duyệt lại.",
  blocked: "Các công việc đang bị kẹt hoặc chờ phản hồi/phụ thuộc vào bên thứ 3.",
  done: "Các công việc đã hoàn tất nghiệm thu.",
  cancelled: "Các công việc đã bị hủy bỏ.",
};

interface Agent {
  id: string;
  name: string;
}

interface KanbanBoardProps {
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
  onDeleteIssue?: (id: string) => void;
  onArchiveIssue?: (id: string) => void;
}

/* ── Sortable Column ── */

function SortableKanbanColumn({
  status,
  issues,
  agents,
  liveIssueIds,
  isCollapsed,
  onToggleCollapse,
  onDeleteIssue,
  onArchiveIssue,
}: {
  status: string;
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDeleteIssue?: (id: string) => void;
  onArchiveIssue?: (id: string) => void;
}) {
  const { setNodeRef, isOver, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: status,
    data: { type: "Column", status },
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
        title={statusDescriptions[status] || statusLabel(status)}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
           <GripHorizontal className="h-3.5 w-3.5" />
        </div>
        <StatusIcon status={status} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
          {statusLabel(status)}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/80 ml-auto">{issues.length}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col min-w-[260px] w-[260px] shrink-0 h-full max-h-full"
    >
      <div 
        className="flex items-center gap-2 px-2 py-2 mb-1 group/col cursor-pointer hover:bg-accent/40 rounded-md transition-colors shrink-0"
        onClick={onToggleCollapse}
        title={statusDescriptions[status] || statusLabel(status)}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground" onClick={(e) => e.stopPropagation()}>
           <GripHorizontal className="h-3.5 w-3.5" />
        </div>
        <StatusIcon status={status} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 select-none">
          {statusLabel(status)}
        </span>
        <span className="text-xs text-muted-foreground/60 tabular-nums">
          {issues.length}
        </span>
      </div>
      <div
        className={`flex-1 min-h-[120px] overflow-y-auto overflow-x-hidden rounded-md p-1 space-y-1 transition-colors ${
          isOver ? "bg-accent/40" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <KanbanCard
              key={issue.id}
              issue={issue}
              agents={agents}
              isLive={liveIssueIds?.has(issue.id)}
              onDelete={onDeleteIssue ? () => onDeleteIssue(issue.id) : undefined}
              onArchive={onArchiveIssue ? () => onArchiveIssue(issue.id) : undefined}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Draggable Card ── */

function KanbanCard({
  issue,
  agents,
  isLive,
  isOverlay,
  onDelete,
  onArchive,
}: {
  issue: Issue;
  agents?: Agent[];
  isLive?: boolean;
  isOverlay?: boolean;
  onDelete?: () => void;
  onArchive?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { type: "Issue", issue } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const navigate = useNavigate();

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group/card relative rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm"}`}
    >
      {/* Action menu button — appears on hover */}
      {!isOverlay && (
        <div
          className="absolute top-1.5 right-1.5 z-10"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded hover:bg-accent/60 text-muted-foreground"
            onClick={() => setMenuOpen((o) => !o)}
            title="Thao tác"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-6 z-20 w-36 rounded-md border border-border bg-popover shadow-md py-1 text-xs">
                <Link
                  to={`/issues/${issue.identifier ?? issue.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 no-underline text-inherit"
                  onClick={() => setMenuOpen(false)}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Xem / Sửa
                </Link>
                {onArchive && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent/50 text-left"
                    onClick={() => { setMenuOpen(false); onArchive(); }}
                  >
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    Lưu trữ
                  </button>
                )}
                {onDelete && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-destructive/10 text-destructive text-left"
                    onClick={() => {
                      setMenuOpen(false);
                      if (window.confirm("Xóa issue này? Hành động không thể hoàn tác.")) {
                        onDelete();
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={`/issues/${issue.identifier ?? issue.id}`}
            className="block no-underline text-inherit"
            onClick={(e) => {
              if (isDragging) e.preventDefault();
            }}
          >
            <div className="flex items-start gap-1.5 mb-1.5">
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {issue.identifier ?? issue.id.slice(0, 8)} · {formatDate(issue.createdAt)}
              </span>
              {isLive && (
                <span className="relative flex h-2 w-2 shrink-0 mt-0.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              )}
            </div>
            <p className="text-sm leading-snug line-clamp-2 mb-2 pr-5">{issue.title}</p>
            <div className="flex items-center gap-2">
              <PriorityIcon priority={issue.priority} />
              {issue.assigneeAgentId && (() => {
                const name = agentName(issue.assigneeAgentId);
                return (
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/agents/${issue.assigneeAgentId}`);
                    }}
                    className="cursor-pointer hover:opacity-80"
                  >
                    {name ? (
                      <Identity name={name} size="xs" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {issue.assigneeAgentId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </Link>
        </TooltipTrigger>
        {!isDragging && issue.description && (
          <TooltipContent
            side="right"
            align="start"
            sideOffset={10}
            className="z-[100] max-w-xs md:max-w-md w-full whitespace-pre-wrap break-words bg-popover text-popover-foreground border shadow-md"
          >
            <p className="text-xs text-muted-foreground line-clamp-[10]">{issue.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}

/* ── Main Board ── */

export function KanbanBoard({
  issues,
  agents,
  liveIssueIds,
  onUpdateIssue,
  onDeleteIssue,
  onArchiveIssue,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kanbanColumnOrder");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === defaultBoardStatuses.length) {
          return parsed;
        }
      }
    } catch {}
    return [...defaultBoardStatuses];
  });

  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() => {
    // v3 (2026-04-22): hard reset state cũ — tất cả columns mặc định expanded
    try {
      localStorage.removeItem("kanbanCollapsedColumns");
      localStorage.removeItem("kanbanCollapsedColumns-v2");
    } catch {}
    return []; // luôn start với tất cả expanded
  });

  useEffect(() => {
    localStorage.setItem("kanbanColumnOrder", JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    // v3: persist collapse state nhưng không đọc lại khi reload — tránh UX bị kẹt tab dọc
    localStorage.setItem("kanbanCollapsedColumns-v3-session", JSON.stringify(collapsedColumns));
  }, [collapsedColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnIssues = useMemo(() => {
    const grouped: Record<string, Issue[]> = {};
    for (const status of columnOrder) {
      grouped[status] = [];
    }
    for (const issue of issues) {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      } else {
        // Fallback for unexpected status
        grouped[issue.status] = [issue];
        if (!columnOrder.includes(issue.status)) {
           setColumnOrder(prev => [...prev, issue.status]);
        }
      }
    }
    return grouped;
  }, [issues, columnOrder]);

  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) : null),
    [activeId, issues]
  );

  function toggleColumn(status: string) {
    setCollapsedColumns((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === "Column") {
      setActiveColumnId(active.id as string);
    } else {
      setActiveId(active.id as string);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setActiveColumnId(null);
    
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === "Column") {
      if (active.id !== over.id) {
        setColumnOrder((prev) => {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
      return;
    }

    // It's an issue
    const issueId = active.id as string;
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    let targetStatus: string | null = null;

    if (over.data.current?.type === "Column") {
      targetStatus = over.id as string;
    } else {
      const targetIssue = issues.find((i) => i.id === over.id);
      if (targetIssue) {
        targetStatus = targetIssue.status;
      }
    }

    if (targetStatus && targetStatus !== issue.status) {
      onUpdateIssue(issueId, { status: targetStatus });
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // visual feedback handled by isOver state in column
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 items-start h-[calc(100vh-14rem)] min-h-[400px]">
        <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
          {columnOrder.map((status) => (
            <SortableKanbanColumn
              key={status}
              status={status}
              issues={columnIssues[status] ?? []}
              agents={agents}
              liveIssueIds={liveIssueIds}
              isCollapsed={collapsedColumns.includes(status)}
              onToggleCollapse={() => toggleColumn(status)}
              onDeleteIssue={onDeleteIssue}
              onArchiveIssue={onArchiveIssue}
            />
          ))}
        </SortableContext>
      </div>
      <DragOverlay>
        {activeColumnId ? (
          <SortableKanbanColumn
            status={activeColumnId}
            issues={columnIssues[activeColumnId] ?? []}
            isCollapsed={collapsedColumns.includes(activeColumnId)}
            onToggleCollapse={() => {}}
          />
        ) : activeIssue ? (
          <KanbanCard issue={activeIssue} agents={agents} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

