import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  FileText,
  History,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SopExecutionStream } from "@/components/sop/SopExecutionStream";
import { SopStepCard, type SopStep, type StepStatus } from "@/components/sop/SopStepCard";

/* ═══ Types ═══ */

interface SopStats {
  total: number;
  done: number;
  draft: number;
  needed: number;
  p0: number;
  byDomain: Record<string, number>;
}

interface Sop {
  id: string;
  sopId: string;
  name: string;
  domain: string;
  status: "done" | "draft" | "needed" | "in_progress" | "deprecated";
  priority: "P0" | "P1" | "P2" | "P3";
  type?: string;
  description?: string;
  steps?: SopStep[];
  lastRunAt?: string;
  lastRunStatus?: string;
  tags?: string[];
}

interface Execution {
  id: string;
  sopId: string;
  status: "running" | "completed" | "failed" | "paused";
  startedAt: string;
  finishedAt?: string;
  triggeredBy?: string;
}

type StatusFilter = "all" | "done" | "draft" | "needed" | "in_progress" | "deprecated";
type PriorityFilter = "all" | "P0" | "P1" | "P2" | "P3";

/* ═══ Constants ═══ */

const DOMAINS = [
  "SOP", "AUTH", "CONTENT", "SCANNER", "CTV", "EMAIL",
  "SHOPIFY", "PAYMENT", "CHATBOT", "DEPLOY", "MOBILE",
  "BRIDGE", "PAPERCLIP", "CRM", "CHANNEL", "OPS",
] as const;

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  done: { label: "Hoàn thành", variant: "secondary" },
  draft: { label: "Bản nháp", variant: "outline" },
  needed: { label: "Cần tạo", variant: "destructive" },
  in_progress: { label: "Đang làm", variant: "default" },
  deprecated: { label: "Ngừng dùng", variant: "outline" },
};

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  P0: { label: "P0", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
  P1: { label: "P1", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  P2: { label: "P2", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  P3: { label: "P3", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30" },
};

/* ═══ API helpers ═══ */

async function fetchStats(): Promise<SopStats> {
  const res = await fetch("/api/ops/sop-engine/stats");
  if (!res.ok) throw new Error("Không tải được thống kê");
  return res.json();
}

async function fetchSops(params: {
  domain?: string;
  status?: string;
  priority?: string;
  search?: string;
}): Promise<Sop[]> {
  const qs = new URLSearchParams();
  if (params.domain && params.domain !== "all") qs.set("domain", params.domain);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.priority && params.priority !== "all") qs.set("priority", params.priority);
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`/api/ops/sop-engine/sops?${qs}`);
  if (!res.ok) throw new Error("Không tải được danh sách SOP");
  return res.json();
}

async function fetchExecutions(sopId: string): Promise<Execution[]> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}/executions?limit=5`);
  if (!res.ok) return [];
  return res.json();
}

async function runSop(sopId: string): Promise<{ executionId: string }> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}/run`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || "Không chạy được SOP");
  }
  return res.json();
}

async function controlExecution(executionId: string, action: "pause" | "stop" | "reset"): Promise<void> {
  const res = await fetch(`/api/ops/sop-engine/executions/${executionId}/${action}`, { method: "POST" });
  if (!res.ok) throw new Error(`Lỗi ${action}`);
}

/* ═══ Query Keys ═══ */

const QK_STATS = ["sop-engine-stats"] as const;
const qkSops = (filters: Record<string, string>) => ["sop-engine-sops", filters] as const;

/* ═══ Page Component ═══ */

export function SopEnginePage() {
  const qc = useQueryClient();

  // Filters
  const [domain, setDomain] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedSopId, setExpandedSopId] = useState<string | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const filters = useMemo(
    () => ({ domain, status: statusFilter, priority: priorityFilter, search: debouncedSearch }),
    [domain, statusFilter, priorityFilter, debouncedSearch],
  );

  // Queries
  const statsQuery = useQuery({
    queryKey: QK_STATS,
    queryFn: fetchStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const sopsQuery = useQuery({
    queryKey: qkSops(filters as Record<string, string>),
    queryFn: () => fetchSops(filters),
    staleTime: 15_000,
  });

  const stats = statsQuery.data;
  const sops = sopsQuery.data ?? [];

  // Click stat pill → set filter
  const handleStatClick = useCallback((s: StatusFilter) => {
    setStatusFilter((prev) => (prev === s ? "all" : s));
  }, []);

  const clearFilters = useCallback(() => {
    setDomain("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  const hasFilters = domain !== "all" || statusFilter !== "all" || priorityFilter !== "all" || debouncedSearch !== "";

  return (
    <div className="space-y-4 p-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">SOP Engine</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quản lý, chạy và theo dõi quy trình vận hành tự động
        </p>
      </div>

      {/* ─── STATS BAR ─── */}
      <div className="flex flex-wrap gap-2">
        {statsQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full animate-pulse" />
          ))
        ) : statsQuery.error ? (
          <div className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Lỗi tải thống kê
            <Button size="xs" variant="ghost" onClick={() => statsQuery.refetch()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        ) : stats ? (
          <>
            <StatPill
              label="Tổng"
              count={stats.total}
              active={statusFilter === "all" && !hasFilters}
              onClick={() => clearFilters()}
            />
            <StatPill
              label="Hoàn thành"
              count={stats.done}
              active={statusFilter === "done"}
              className="text-green-600 dark:text-green-400"
              onClick={() => handleStatClick("done")}
            />
            <StatPill
              label="Bản nháp"
              count={stats.draft}
              active={statusFilter === "draft"}
              className="text-blue-600 dark:text-blue-400"
              onClick={() => handleStatClick("draft")}
            />
            <StatPill
              label="Cần tạo"
              count={stats.needed}
              active={statusFilter === "needed"}
              className="text-red-600 dark:text-red-400"
              onClick={() => handleStatClick("needed")}
            />
            <StatPill
              label="P0"
              count={stats.p0}
              active={priorityFilter === "P0"}
              className="text-red-600 dark:text-red-400"
              onClick={() => setPriorityFilter((p) => (p === "P0" ? "all" : "P0"))}
            />
          </>
        ) : null}
      </div>

      {/* ─── DOMAIN TABS ─── */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1 min-w-max">
          <DomainTab
            label="Tất cả"
            count={stats?.total}
            active={domain === "all"}
            onClick={() => setDomain("all")}
          />
          {DOMAINS.map((d) => (
            <DomainTab
              key={d}
              label={d}
              count={stats?.byDomain?.[d]}
              active={domain === d}
              onClick={() => setDomain((prev) => (prev === d ? "all" : d))}
            />
          ))}
        </div>
      </div>

      {/* ─── SEARCH + FILTERS ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Tìm SOP theo tên, ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearchInput(""); setDebouncedSearch(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <NativeSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "all", label: "Trạng thái" },
            { value: "done", label: "Hoàn thành" },
            { value: "draft", label: "Bản nháp" },
            { value: "needed", label: "Cần tạo" },
            { value: "in_progress", label: "Đang làm" },
            { value: "deprecated", label: "Ngừng dùng" },
          ]}
        />

        <NativeSelect
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as PriorityFilter)}
          options={[
            { value: "all", label: "Độ ưu tiên" },
            { value: "P0", label: "P0 — Khẩn cấp" },
            { value: "P1", label: "P1 — Cao" },
            { value: "P2", label: "P2 — Trung bình" },
            { value: "P3", label: "P3 — Thấp" },
          ]}
        />

        {hasFilters && (
          <Button size="xs" variant="ghost" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* ─── SOP LIST ─── */}
      <div className="space-y-2">
        {sopsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg animate-pulse" />
          ))
        ) : sopsQuery.error ? (
          <Card className="p-6 flex flex-col items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">Không tải được danh sách SOP</p>
            <Button size="sm" variant="outline" onClick={() => sopsQuery.refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </Card>
        ) : sops.length === 0 ? (
          <Card className="p-8 flex flex-col items-center gap-2">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Không tìm thấy SOP nào phù hợp với bộ lọc."
                : "Chưa có SOP nào. Tạo SOP đầu tiên để bắt đầu."}
            </p>
            {hasFilters && (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Xoá bộ lọc
              </Button>
            )}
          </Card>
        ) : (
          sops.map((sop) => (
            <SopRow
              key={sop.id}
              sop={sop}
              expanded={expandedSopId === sop.id}
              onToggle={() => setExpandedSopId((prev) => (prev === sop.id ? null : sop.id))}
              onInvalidate={() => {
                qc.invalidateQueries({ queryKey: QK_STATS });
                qc.invalidateQueries({ queryKey: ["sop-engine-sops"] });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══ SOP Row ═══ */

function SopRow({
  sop,
  expanded,
  onToggle,
  onInvalidate,
}: {
  sop: Sop;
  expanded: boolean;
  onToggle: () => void;
  onInvalidate: () => void;
}) {
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  const statusCfg = STATUS_BADGE[sop.status] ?? STATUS_BADGE.needed;
  const priorityCfg = PRIORITY_BADGE[sop.priority] ?? PRIORITY_BADGE.P2;

  const runMutation = useMutation({
    mutationFn: () => runSop(sop.sopId),
    onSuccess: (data) => {
      setActiveExecutionId(data.executionId);
      onInvalidate();
    },
  });

  // Fetch executions when expanded
  const executionsQuery = useQuery({
    queryKey: ["sop-engine-executions", sop.sopId],
    queryFn: () => fetchExecutions(sop.sopId),
    enabled: expanded,
    staleTime: 10_000,
  });

  const handleControl = useCallback(
    async (action: "pause" | "stop" | "reset") => {
      if (!activeExecutionId) return;
      try {
        await controlExecution(activeExecutionId, action);
        if (action === "stop" || action === "reset") {
          setActiveExecutionId(null);
        }
        onInvalidate();
      } catch {
        // Error handling could use toast
      }
    },
    [activeExecutionId, onInvalidate],
  );

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      {/* Collapsed row */}
      <button
        className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 shrink-0">
          {sop.sopId}
        </Badge>

        <span className="text-sm font-medium flex-1 truncate">{sop.name}</span>

        <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0">
          {statusCfg.label}
        </Badge>

        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted shrink-0">
          {sop.domain}
        </span>

        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0", priorityCfg.className)}>
          {priorityCfg.label}
        </span>

        {/* Row actions */}
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate()}
            title="Chạy SOP"
          >
            {runMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onToggle}
            title="Soạn"
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => { if (!expanded) onToggle(); }}
            title="Lịch sử"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="border-t border-border/50 space-y-4 px-4 py-4">
          {/* Error message for run */}
          {runMutation.isError && (
            <div className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {runMutation.error instanceof Error ? runMutation.error.message : "Lỗi chạy SOP"}
            </div>
          )}

          {/* SOP Info */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{sop.name}</h3>
            {sop.description && (
              <p className="text-xs text-muted-foreground">{sop.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {sop.lastRunAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Chạy lần cuối: {new Date(sop.lastRunAt).toLocaleString("vi-VN")}
                </span>
              )}
              {sop.tags?.map((tag) => (
                <span key={tag} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{tag}</span>
              ))}
            </div>
          </div>

          {/* Workflow Steps */}
          {sop.steps && sop.steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Các bước thực thi
              </h4>
              <div className="space-y-1.5">
                {sop.steps.map((step) => (
                  <SopStepCard
                    key={step.id}
                    step={step}
                    status={getStepStatus(step, activeExecutionId)}
                    editable={sop.status === "draft"}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Execution Stream */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Luồng thực thi
            </h4>
            <SopExecutionStream
              executionId={activeExecutionId ?? undefined}
              sopId={sop.sopId}
              onComplete={onInvalidate}
            />
          </div>

          {/* Control buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate()}
            >
              {runMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1" />
              )}
              Chạy FULL
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!activeExecutionId}
              onClick={() => handleControl("pause")}
            >
              <Pause className="h-3.5 w-3.5 mr-1" />
              Tạm dừng
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!activeExecutionId}
              onClick={() => handleControl("stop")}
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Dừng
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!activeExecutionId}
              onClick={() => handleControl("reset")}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>

          {/* Execution History */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Lịch sử chạy gần đây
            </h4>
            {executionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải...
              </div>
            ) : (executionsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có lần chạy nào.</p>
            ) : (
              <div className="space-y-1">
                {(executionsQuery.data ?? []).map((exec) => (
                  <button
                    key={exec.id}
                    className={cn(
                      "flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-xs hover:bg-accent/50 transition-colors",
                      activeExecutionId === exec.id && "bg-accent",
                    )}
                    onClick={() => setActiveExecutionId(exec.id)}
                  >
                    <ExecutionStatusDot status={exec.status} />
                    <span className="font-mono text-muted-foreground">{exec.id.slice(0, 8)}</span>
                    <span className="flex-1 text-muted-foreground">
                      {new Date(exec.startedAt).toLocaleString("vi-VN")}
                    </span>
                    {exec.triggeredBy && (
                      <span className="text-muted-foreground">{exec.triggeredBy}</span>
                    )}
                    <Badge
                      variant={exec.status === "completed" ? "secondary" : exec.status === "failed" ? "destructive" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {exec.status === "completed" ? "Xong" : exec.status === "failed" ? "Lỗi" : exec.status === "running" ? "Đang chạy" : "Tạm dừng"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══ Helpers ═══ */

function getStepStatus(_step: SopStep, _activeExecutionId: string | null): StepStatus {
  // The actual status comes from the execution stream;
  // without real-time step data, default to pending
  return "pending";
}

/* ═══ Sub-components ═══ */

function StatPill({
  label,
  count,
  active,
  className,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-accent/50",
        className,
      )}
    >
      <span className="font-bold">{count}</span>
      <span>{label}</span>
    </button>
  );
}

function DomainTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count != null && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ExecutionStatusDot({ status }: { status: string }) {
  const colorClass =
    status === "completed"
      ? "bg-green-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "running"
          ? "bg-blue-500"
          : "bg-amber-500";

  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {status === "running" && (
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colorClass)} />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colorClass)} />
    </span>
  );
}
