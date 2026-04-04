import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Info,
  RotateCcw,
  SkipForward,
  Square,
  ExternalLink,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

interface LogLine {
  ts?: string;
  level: "INFO" | "OK" | "WARN" | "ERROR";
  text: string;
}

interface ExecutionStep {
  order: number;
  name: string;
  status: "completed" | "running" | "waiting" | "failed" | "pending";
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  log_lines?: LogLine[];
}

interface Execution {
  id: string;
  sopId: string;
  status: "idle" | "running" | "paused" | "completed" | "failed";
  steps: ExecutionStep[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

interface SopExecutionPreviewProps {
  executionId?: string;
  sopId?: string;
  compact?: boolean;
  onNavigateRun?: (runId: string) => void;
}

/* ─── Status helpers ─── */

const STEP_STATUS_ICON: Record<ExecutionStep["status"], typeof CheckCircle> = {
  completed: CheckCircle,
  running: Loader2,
  waiting: Clock,
  failed: XCircle,
  pending: Clock,
};

const STEP_STATUS_CLASS: Record<ExecutionStep["status"], string> = {
  completed: "text-green-600 dark:text-green-400",
  running: "text-blue-600 dark:text-blue-400",
  waiting: "text-amber-600 dark:text-amber-400",
  failed: "text-red-600 dark:text-red-400",
  pending: "text-zinc-400 dark:text-zinc-500",
};

const LOG_LEVEL_CLASS: Record<string, string> = {
  INFO: "text-zinc-600 dark:text-zinc-400",
  OK: "text-green-600 dark:text-green-400",
  WARN: "text-amber-600 dark:text-amber-400",
  ERROR: "text-red-600 dark:text-red-400",
};

const PROGRESS_SEGMENT_CLASS: Record<ExecutionStep["status"], string> = {
  completed: "bg-green-500",
  running: "bg-blue-500 animate-pulse",
  waiting: "bg-amber-400 animate-pulse",
  failed: "bg-red-500",
  pending: "bg-zinc-200 dark:bg-zinc-700",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ─── Component ─── */

export function SopExecutionPreview({
  executionId,
  sopId,
  compact = false,
  onNavigateRun,
}: SopExecutionPreviewProps) {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState("");

  // Fetch execution data with polling
  const executionQuery = useQuery<Execution>({
    queryKey: ["sop-execution", executionId],
    queryFn: async () => {
      const res = await fetch(`/api/ops/sop-engine/executions/${executionId}`);
      if (!res.ok) throw new Error("Không tải được thông tin thực thi");
      return res.json();
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "paused" ? 5000 : false;
    },
    staleTime: 3000,
  });

  const execution = executionQuery.data;

  // Auto-scroll on new data
  useEffect(() => {
    if (execution?.status === "running") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [execution]);

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const res = await fetch(`/api/ops/sop-engine/executions/${executionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: feedback || undefined }),
      });
      if (!res.ok) throw new Error("Không thể thực hiện hành động");
    },
    onSuccess: () => {
      setFeedback("");
      qc.invalidateQueries({ queryKey: ["sop-execution", executionId] });
    },
  });

  // Error action mutation
  const errorActionMutation = useMutation({
    mutationFn: async (action: "retry" | "skip" | "stop") => {
      const res = await fetch(`/api/ops/sop-engine/executions/${executionId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Lỗi khi ${action}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sop-execution", executionId] });
    },
  });

  /* ─── Empty state ─── */
  if (!executionId) {
    return (
      <div className="rounded-lg border border-border bg-background p-8 flex items-center justify-center min-h-[180px]">
        <div className="text-center space-y-2">
          <Play className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Chưa chạy. Bấm ▶ Chạy SOP để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Loading state ─── */
  if (executionQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <Skeleton className="h-4 w-48 animate-pulse" />
        <Skeleton className="h-3 w-full animate-pulse" />
        <Skeleton className="h-20 w-full animate-pulse" />
      </div>
    );
  }

  /* ─── Error state ─── */
  if (executionQuery.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive">
          Không tải được thông tin thực thi.
        </p>
        <Button size="xs" variant="outline" onClick={() => executionQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!execution) return null;

  const steps = execution.steps ?? [];
  const totalSteps = steps.length;
  const isPaused = execution.status === "paused";
  const isFailed = execution.status === "failed";

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            #{executionId.slice(0, 8)}
          </span>
          <ExecutionStatusBadge status={execution.status} />
        </div>
        {execution.startedAt && (
          <span className="text-[10px] text-muted-foreground">
            Bắt đầu: {formatTime(execution.startedAt)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="flex h-2 w-full">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "h-full transition-all",
                PROGRESS_SEGMENT_CLASS[step.status],
                i < totalSteps - 1 && "border-r border-background",
              )}
              style={{ width: `${100 / totalSteps}%` }}
              title={`Bước ${step.order}: ${step.name} — ${step.status}`}
            />
          ))}
        </div>
      )}

      {/* Log lines */}
      <div
        className={cn(
          "overflow-y-auto px-4 py-3 space-y-2",
          compact ? "max-h-[240px]" : "max-h-[400px]",
        )}
      >
        {steps.map((step, i) => {
          const Icon = STEP_STATUS_ICON[step.status];
          return (
            <div key={i} className="space-y-0.5">
              {/* Step header line */}
              <div className="flex items-center gap-2 text-sm">
                {step.startedAt && (
                  <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">
                    {formatTime(step.startedAt)}
                  </span>
                )}
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    STEP_STATUS_CLASS[step.status],
                    step.status === "running" && "animate-spin",
                  )}
                />
                <span className="font-medium text-foreground">
                  Bước {step.order}: {step.name}
                </span>
                {step.durationMs != null && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDuration(step.durationMs)}
                  </span>
                )}
              </div>

              {/* Sub-lines (log_lines) */}
              {step.log_lines && step.log_lines.length > 0 && (
                <div className="ml-[calc(4rem+1.25rem)] space-y-0 border-l-2 border-border/40 pl-3">
                  {step.log_lines.map((line, li) => (
                    <div key={li} className="flex items-start gap-1.5 text-xs font-mono leading-relaxed">
                      <span
                        className={cn(
                          "shrink-0 font-semibold",
                          LOG_LEVEL_CLASS[line.level] ?? LOG_LEVEL_CLASS.INFO,
                        )}
                      >
                        [{line.level}]
                      </span>
                      <span className="text-foreground/80 break-all whitespace-pre-wrap">
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Approval inline block */}
        {isPaused && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Đang chờ phê duyệt
            </div>
            <Textarea
              placeholder="Ghi chú phê duyệt (tuỳ chọn)..."
              className="min-h-[60px] text-xs"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="xs"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate("approve")}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                Duyệt & tiếp tục
              </Button>
              <Button
                size="xs"
                variant="destructive"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate("reject")}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Từ chối
              </Button>
            </div>
          </div>
        )}

        {/* Error inline block */}
        {isFailed && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Thực thi thất bại
            </div>
            {execution.error && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono">{execution.error}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={errorActionMutation.isPending}
                onClick={() => errorActionMutation.mutate("retry")}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Thử lại
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={errorActionMutation.isPending}
                onClick={() => errorActionMutation.mutate("skip")}
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Bỏ qua
              </Button>
              <Button
                size="xs"
                variant="destructive"
                disabled={errorActionMutation.isPending}
                onClick={() => errorActionMutation.mutate("stop")}
              >
                <Square className="h-3 w-3 mr-1" />
                Dừng
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {onNavigateRun && executionId && (
        <div className="border-t border-border/50 px-4 py-2 flex justify-end">
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground text-xs"
            onClick={() => onNavigateRun(executionId)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Xem chi tiết Agent Runs
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Execution status badge ─── */

function ExecutionStatusBadge({ status }: { status: Execution["status"] }) {
  const config: Record<Execution["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    idle: { label: "Chờ", variant: "secondary" },
    running: { label: "Đang chạy", variant: "default" },
    paused: { label: "Chờ duyệt", variant: "outline" },
    completed: { label: "Hoàn thành", variant: "secondary" },
    failed: { label: "Thất bại", variant: "destructive" },
  };

  const cfg = config[status] ?? config.idle;

  return (
    <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 gap-1">
      {status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {cfg.label}
    </Badge>
  );
}
