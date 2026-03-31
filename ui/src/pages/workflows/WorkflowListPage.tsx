// Workflow List — Danh sách workflows + nút Tạo mới

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Play, Trash2, Loader2, GitBranch, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "@/lib/router";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkflowSummary {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  nodeCount: number;
  lastRunAt?: string;
  lastRunStatus?: "success" | "failure" | "running";
  created_at: string;
  updated_at: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const WF_BASE = "/api/ops/workflows";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || `Lỗi ${res.status}`);
  }
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: WorkflowSummary["status"]) {
  const map = {
    draft: { label: "Bản nháp", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    active: { label: "Đang hoạt động", cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    paused: { label: "Tạm dừng", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
    archived: { label: "Lưu trữ", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function runStatusIcon(status?: WorkflowSummary["lastRunStatus"]) {
  if (!status) return null;
  if (status === "success") return <CheckCircle2 className="size-3.5 text-green-600" />;
  if (status === "failure") return <XCircle className="size-3.5 text-red-600" />;
  return <Loader2 className="size-3.5 text-blue-600 animate-spin" />;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkflowListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetchJSON<WorkflowSummary[]>(WF_BASE),
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`${WF_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Quản lý Workflow</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xây dựng và quản lý các quy trình tự động
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/workflows/new")}>
          <Plus className="size-3.5" />
          <span>Tạo mới</span>
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Đang tải danh sách...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Lỗi tải danh sách: {error instanceof Error ? error.message : "Không xác định"}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!workflows || workflows.length === 0) && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <GitBranch className="size-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Chưa có workflow nào</p>
          <Button size="sm" className="mt-4" onClick={() => navigate("/workflows/new")}>
            <Plus className="size-3.5" />
            <span>Tạo workflow đầu tiên</span>
          </Button>
        </div>
      )}

      {/* Workflow list */}
      {workflows && workflows.length > 0 && (
        <div className="rounded-xl border bg-card divide-y">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/workflows/${wf.id}`)}
            >
              <GitBranch className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{wf.name}</span>
                  {statusBadge(wf.status)}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{wf.nodeCount} node</span>
                  <span>Tạo: {formatDate(wf.created_at)}</span>
                  {wf.lastRunAt && (
                    <span className="flex items-center gap-1">
                      {runStatusIcon(wf.lastRunStatus)}
                      Chạy lần cuối: {formatDate(wf.lastRunAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title="Chạy workflow"
                  onClick={() => {
                    fetchJSON(`${WF_BASE}/${wf.id}/run`, { method: "POST" }).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["workflows"] }),
                    );
                  }}
                >
                  <Play className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title="Xoá workflow"
                  onClick={() => {
                    if (window.confirm("Bạn có chắc muốn xoá workflow này?")) {
                      deleteMutation.mutate(wf.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
