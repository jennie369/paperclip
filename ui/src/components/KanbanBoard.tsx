// KanbanBoard — Issues board. Thin wrapper around GenericKanban (SSOT visual, 2026-06-22 refactor).
// External API unchanged so Issues call sites are untouched. The Issue-specific card +
// status columns + drag→status-update live here; the shared board mechanics live in GenericKanban.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { formatDate } from "../lib/utils";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import type { Issue } from "@paperclipai/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GenericKanban, type KanbanColumnDef } from "./GenericKanban";

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

/* ── Issue Card (presentational — drag handled by GenericKanban wrapper) ── */
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
  const navigate = useNavigate();

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  return (
    <div
      className={`group/card relative rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-shadow ${
        isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm"
      }`}
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
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
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
                    onPointerDown={(e) => e.stopPropagation()}
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
        {issue.description && (
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

/* ── Main Board (wrapper) ── */
export function KanbanBoard({
  issues,
  agents,
  liveIssueIds,
  onUpdateIssue,
  onDeleteIssue,
  onArchiveIssue,
}: KanbanBoardProps) {
  const columns: KanbanColumnDef[] = useMemo(
    () => defaultBoardStatuses.map((s) => ({ id: s, label: statusLabel(s), description: statusDescriptions[s] })),
    [],
  );

  return (
    <GenericKanban<Issue>
      items={issues}
      columns={columns}
      getId={(i) => i.id}
      getColumnId={(i) => i.status}
      onMove={(id, status) => onUpdateIssue(id, { status })}
      storageKey="kanbanColumnOrder"
      renderColumnIcon={(id) => <StatusIcon status={id} />}
      renderCard={(issue, { isOverlay }) => (
        <KanbanCard
          issue={issue}
          agents={agents}
          isLive={liveIssueIds?.has(issue.id)}
          isOverlay={isOverlay}
          onDelete={onDeleteIssue ? () => onDeleteIssue(issue.id) : undefined}
          onArchive={onArchiveIssue ? () => onArchiveIssue(issue.id) : undefined}
        />
      )}
    />
  );
}
