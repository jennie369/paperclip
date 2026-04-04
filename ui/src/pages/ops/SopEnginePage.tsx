import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
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
  Save,
  Brain,
  Link2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SopExecutionPreview } from "@/components/sop/SopExecutionPreview";
import { SopStepCard, type StepDefinition } from "@/components/sop/SopStepCard";
import { useNavigate } from "@/lib/router";

/* ═══ Types ═══ */

interface SopStats {
  total: number;
  done: number;
  draft: number;
  needed: number;
  p0: number;
  p1: number;
  byDomain: Record<string, number>;
}

interface Sop {
  id: string;
  sopId: string;
  name: string;
  domain: string;
  status: "done" | "draft" | "needed" | "in_progress" | "deprecated" | "published" | "drafting" | "review" | "needs_creation";
  priority: "P0" | "P1" | "P2" | "P3";
  type?: string;
  description?: string;
  body?: string;
  steps?: StepDefinition[];
  agents?: string[];
  cron?: string;
  dependencies?: string[];
  reme_synced_at?: string;
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

type StatusFilter = "all" | "done" | "draft" | "needed" | "in_progress" | "deprecated" | "published" | "drafting" | "review" | "needs_creation";
type PriorityFilter = "all" | "P0" | "P1" | "P2" | "P3";
type TypeFilter = "all" | "automation" | "manual" | "hybrid";

/* ═══ Constants ═══ */

const DOMAINS = [
  "ARCH", "BGD", "HR", "FIN", "MKT", "SAL", "CNT", "DST",
  "OPS", "IT", "AI", "CS", "COM", "ANA", "PRD", "LEG", "DOC", "ENG",
] as const;

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  needs_creation: { label: "Cần tạo", variant: "destructive", className: "bg-red-100 text-red-700" },
  drafting: { label: "Đang soạn", variant: "outline", className: "bg-amber-100 text-amber-700" },
  review: { label: "Chờ duyệt", variant: "default", className: "bg-blue-100 text-blue-700" },
  published: { label: "Đã hoàn thành", variant: "secondary", className: "bg-green-100 text-green-700" },
  deprecated: { label: "Ngừng dùng", variant: "outline", className: "bg-zinc-100 text-zinc-500" },
  // Legacy keys for backward compatibility
  done: { label: "Hoàn thành", variant: "secondary", className: "bg-green-100 text-green-700" },
  draft: { label: "Bản nháp", variant: "outline", className: "bg-amber-100 text-amber-700" },
  needed: { label: "Cần tạo", variant: "destructive", className: "bg-red-100 text-red-700" },
  in_progress: { label: "Đang làm", variant: "default", className: "bg-blue-100 text-blue-700" },
};

const PRIORITY_BADGE: Record<string, { label: string; className: string; tooltip: string }> = {
  P0: { label: "P0", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30", tooltip: "Khẩn — Làm ngay" },
  P1: { label: "P1", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30", tooltip: "Quan trọng — Tháng này" },
  P2: { label: "P2", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", tooltip: "Bình thường — Quý này" },
  P3: { label: "P3", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30", tooltip: "Thấp — Khi rảnh" },
};

const DOMAIN_TOOLTIPS: Record<string, string> = {
  ARCH: "Standards & Architecture", BGD: "Ban Giám Đốc", HR: "Nhân Sự",
  FIN: "Tài Chính", MKT: "Marketing", SAL: "Sales / Tư Vấn",
  CNT: "Content Pipeline", DST: "Distribution", OPS: "Vận Hành",
  IT: "CNTT / AI", AI: "AI Repository", CS: "Chăm Sóc Khách Hàng",
  COM: "Commerce / Shopify", ANA: "Analytics", PRD: "Product",
  LEG: "Pháp Chế", DOC: "Tài Liệu", ENG: "Engineering",
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
  type?: string;
  search?: string;
}): Promise<Sop[]> {
  const qs = new URLSearchParams();
  if (params.domain && params.domain !== "all") qs.set("domain", params.domain);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.priority && params.priority !== "all") qs.set("priority", params.priority);
  if (params.type && params.type !== "all") qs.set("type", params.type);
  if (params.search) qs.set("search", params.search);
  qs.set("limit", "100");
  const res = await fetch(`/api/ops/sop-engine/sops?${qs}`);
  if (!res.ok) throw new Error("Không tải được danh sách SOP");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.sops ?? []);
}

async function fetchExecutions(sopId: string): Promise<Execution[]> {
  const res = await fetch(`/api/ops/sop-engine/executions/recent?sopId=${sopId}&limit=5`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.executions ?? []);
}

async function runSop(sopId: string): Promise<{ executionId: string }> {
  const res = await fetch(`/api/ops/sop-engine/execute/${sopId}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || "Không chạy được SOP");
  }
  return res.json();
}

async function saveSop(sopId: string, data: Partial<Sop>): Promise<void> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Không lưu được SOP");
}

async function injectReme(sopId: string): Promise<void> {
  const res = await fetch(`/api/ops/sop-engine/sops/${sopId}/reme`, { method: "POST" });
  if (!res.ok) throw new Error("Không inject được ReMe");
}

async function runSopBatch(sopIds: string[]): Promise<void> {
  const res = await fetch("/api/ops/sop-engine/execute/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sopIds }),
  });
  if (!res.ok) throw new Error("Không chạy batch được");
}

async function injectRemeBatch(sopIds: string[]): Promise<void> {
  const res = await fetch("/api/ops/sop-engine/reme/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sopIds }),
  });
  if (!res.ok) throw new Error("Không inject batch ReMe được");
}

/* ═══ Helpers ═══ */

function parseCron(cron?: string): string {
  if (!cron) return '';
  const map: Record<string, string> = {
    '0 20 * * 0': 'Chủ Nhật 20:00', '0 6 * * 1': 'Thứ 2 06:00',
    '0 7 * * *': 'Hàng ngày 07:00', '0 8 * * *': 'Hàng ngày 08:00',
    '*/15 * * * *': 'Mỗi 15 phút', '0 14 * * 4': 'Thứ 5 14:00',
  };
  return map[cron] || cron;
}

/* ═══ Query Keys ═══ */

const QK_STATS = ["sop-engine-stats"] as const;
const qkSops = (filters: Record<string, string>) => ["sop-engine-sops", filters] as const;

/* ═══ Page Component ═══ */

export function SopEnginePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Filters
  const [domain, setDomain] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedSopId, setExpandedSopId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      domain,
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      search: debouncedSearch,
    }),
    [domain, statusFilter, priorityFilter, typeFilter, debouncedSearch],
  );

  // Queries
  const statsQuery = useQuery({
    queryKey: QK_STATS,
    queryFn: fetchStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const sopsQuery = useQuery({
    queryKey: qkSops(filters as unknown as Record<string, string>),
    queryFn: () => fetchSops(filters),
    staleTime: 15_000,
  });

  const stats = statsQuery.data;
  const sops = sopsQuery.data ?? [];

  // Stat pill click
  const handleStatClick = useCallback((s: StatusFilter) => {
    setStatusFilter((prev) => (prev === s ? "all" : s));
  }, []);

  const clearFilters = useCallback(() => {
    setDomain("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  const hasFilters =
    domain !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    debouncedSearch !== "";

  // Checkbox selection
  const toggleSelect = useCallback((sopId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sopId)) next.delete(sopId);
      else next.add(sopId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Batch mutations
  const batchRunMutation = useMutation({
    mutationFn: () => runSopBatch(Array.from(selectedIds)),
    onSuccess: () => {
      clearSelection();
      qc.invalidateQueries({ queryKey: QK_STATS });
      qc.invalidateQueries({ queryKey: ["sop-engine-sops"] });
    },
  });

  const batchRemeMutation = useMutation({
    mutationFn: () => injectRemeBatch(Array.from(selectedIds)),
    onSuccess: () => {
      clearSelection();
      qc.invalidateQueries({ queryKey: ["sop-engine-sops"] });
    },
  });

  return (
    <div className="space-y-4 p-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">SOP Engine</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quản lý, chạy và theo dõi quy trình vận hành tự động
        </p>
      </div>

      {/* ─── SECTION 1: STATS BAR ─── */}
      <div className="flex flex-wrap gap-2">
        {statsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
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
            <StatPill
              label="P1"
              count={stats.p1 ?? 0}
              active={priorityFilter === "P1"}
              className="text-orange-600 dark:text-orange-400"
              onClick={() => setPriorityFilter((p) => (p === "P1" ? "all" : "P1"))}
            />
          </>
        ) : null}
      </div>

      {/* ─── SECTION 2: DOMAIN TABS ─── */}
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

      {/* ─── SECTION 3: SEARCH + FILTER ─── */}
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
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
              }}
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
            { value: "published", label: "Đã hoàn thành" },
            { value: "drafting", label: "Đang soạn" },
            { value: "review", label: "Chờ duyệt" },
            { value: "needs_creation", label: "Cần tạo" },
            { value: "deprecated", label: "Ngừng dùng" },
            { value: "done", label: "Hoàn thành (cũ)" },
            { value: "draft", label: "Bản nháp (cũ)" },
            { value: "needed", label: "Cần tạo (cũ)" },
            { value: "in_progress", label: "Đang làm (cũ)" },
          ]}
        />

        <NativeSelect
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as PriorityFilter)}
          options={[
            { value: "all", label: "Ưu tiên" },
            { value: "P0", label: "P0 — Khẩn cấp" },
            { value: "P1", label: "P1 — Cao" },
            { value: "P2", label: "P2 — Trung bình" },
            { value: "P3", label: "P3 — Thấp" },
          ]}
        />

        <NativeSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          options={[
            { value: "all", label: "Loại" },
            { value: "automation", label: "Tự động" },
            { value: "manual", label: "Thủ công" },
            { value: "hybrid", label: "Kết hợp" },
          ]}
        />

        {hasFilters && (
          <Button size="xs" variant="ghost" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* ─── SECTION 4: SOP LIST ─── */}
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
              selected={selectedIds.has(sop.sopId)}
              onToggle={() => setExpandedSopId((prev) => (prev === sop.id ? null : sop.id))}
              onSelect={() => toggleSelect(sop.sopId)}
              onInvalidate={() => {
                qc.invalidateQueries({ queryKey: QK_STATS });
                qc.invalidateQueries({ queryKey: ["sop-engine-sops"] });
              }}
              onNavigateRun={(runId) => navigate(`/ops/agent-runs/${runId}`)}
            />
          ))
        )}
      </div>

      {/* ─── FLOATING BULK BAR ─── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 z-50">
          <span className="text-sm font-medium">
            Đã chọn: {selectedIds.size}
          </span>
          <Button
            size="xs"
            disabled={batchRunMutation.isPending}
            onClick={() => batchRunMutation.mutate()}
          >
            {batchRunMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Generate batch
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={batchRemeMutation.isPending}
            onClick={() => batchRemeMutation.mutate()}
          >
            {batchRemeMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Brain className="h-3 w-3 mr-1" />
            )}
            Inject ReMe
          </Button>
          <Button size="xs" variant="ghost" onClick={clearSelection}>
            Bỏ chọn
          </Button>
        </div>
      )}
    </div>
  );
}

/* ═══ SOP Row ═══ */

function SopRow({
  sop,
  expanded,
  selected,
  onToggle,
  onSelect,
  onInvalidate,
  onNavigateRun,
}: {
  sop: Sop;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onInvalidate: () => void;
  onNavigateRun: (runId: string) => void;
}) {
  const qc = useQueryClient();
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Sop>>({});
  const [bodyEdit, setBodyEdit] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(sop.body ?? "");

  const statusCfg = STATUS_BADGE[sop.status] ?? STATUS_BADGE.needs_creation;
  const priorityCfg = PRIORITY_BADGE[sop.priority] ?? PRIORITY_BADGE.P2;

  const handleSopUpdate = useCallback(async (sopId: string, updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/ops/sop-engine/sops/${sopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      qc.invalidateQueries({ queryKey: ['sop-engine-sops'] });
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [qc]);

  // Run SOP mutation
  const runMutation = useMutation({
    mutationFn: () => runSop(sop.sopId),
    onSuccess: (data) => {
      setActiveExecutionId(data.executionId);
      onInvalidate();
    },
  });

  // Save SOP mutation
  const saveMutation = useMutation({
    mutationFn: () => saveSop(sop.sopId, { ...editDraft, body: bodyDraft }),
    onSuccess: () => {
      setEditMode(false);
      setEditDraft({});
      onInvalidate();
    },
  });

  // Inject ReMe mutation
  const remeMutation = useMutation({
    mutationFn: () => injectReme(sop.sopId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sop-engine-sops"] });
    },
  });

  // Fetch executions when expanded
  const executionsQuery = useQuery({
    queryKey: ["sop-engine-executions", sop.sopId],
    queryFn: () => fetchExecutions(sop.sopId),
    enabled: expanded,
    staleTime: 10_000,
  });

  // Step handlers
  const handleStepUpdate = useCallback(
    (stepIndex: number, updates: Partial<StepDefinition>) => {
      const newSteps = [...(sop.steps ?? [])];
      newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
      setEditDraft((prev) => ({ ...prev, steps: newSteps }));
    },
    [sop.steps],
  );

  const handleStepDelete = useCallback(
    (stepIndex: number) => {
      const newSteps = [...(sop.steps ?? [])];
      newSteps.splice(stepIndex, 1);
      // Re-order
      newSteps.forEach((s, i) => { s.order = i + 1; });
      setEditDraft((prev) => ({ ...prev, steps: newSteps }));
    },
    [sop.steps],
  );

  const handleStepMove = useCallback(
    (stepIndex: number, direction: "up" | "down") => {
      const newSteps = [...(sop.steps ?? [])];
      const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;
      if (targetIndex < 0 || targetIndex >= newSteps.length) return;
      [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];
      newSteps.forEach((s, i) => { s.order = i + 1; });
      setEditDraft((prev) => ({ ...prev, steps: newSteps }));
    },
    [sop.steps],
  );

  const handleExecuteSingle = useCallback(
    async (stepIndex: number) => {
      try {
        const res = await fetch(`/api/ops/sop-engine/execute/${sop.sopId}/step/${stepIndex}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Lỗi chạy step");
        const data = await res.json();
        if (data.executionId) setActiveExecutionId(data.executionId);
        onInvalidate();
      } catch {
        // Could use toast for error
      }
    },
    [sop.sopId, onInvalidate],
  );

  const getEditVal = <K extends keyof Sop>(key: K): Sop[K] => {
    return (editDraft[key] !== undefined ? editDraft[key] : sop[key]) as Sop[K];
  };

  const currentSteps = (editDraft.steps as StepDefinition[] | undefined) ?? sop.steps ?? [];

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      {/* ─── Collapsed row ─── */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="h-3.5 w-3.5 rounded border-input accent-primary shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />

        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
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

          <Badge variant={statusCfg.variant} className={cn("text-[10px] px-1.5 py-0", statusCfg.className)} title={statusCfg.label}>
            {statusCfg.label}
          </Badge>

          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted shrink-0"
            title={DOMAIN_TOOLTIPS[sop.domain] || sop.domain}
          >
            {sop.domain}
          </span>

          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
              priorityCfg.className,
            )}
            title={priorityCfg.tooltip}
          >
            {priorityCfg.label}
          </span>

          {currentSteps.length > 0 && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {currentSteps.length} bước
            </span>
          )}
        </button>

        {/* Row action buttons */}
        <div className="flex gap-1 shrink-0">
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
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── SECTION 5: Expanded Detail ─── */}
      {expanded && (
        <div className="border-t border-border/50 space-y-5 px-4 py-4">
          {/* Error from run */}
          {runMutation.isError && (
            <div className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {runMutation.error instanceof Error ? runMutation.error.message : "Lỗi chạy SOP"}
            </div>
          )}

          {/* ── 5.1 Editable info ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Thông tin SOP
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">SOP ID</div>
                <span className="font-mono text-foreground">{sop.sopId}</span>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Tên</div>
                {editMode ? (
                  <Input
                    className="h-7 text-xs"
                    value={(getEditVal("name") as string) ?? ""}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                  />
                ) : (
                  <span className="text-foreground">{sop.name}</span>
                )}
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Mô tả</div>
                {editMode ? (
                  <Textarea
                    className="min-h-[48px] text-xs"
                    value={(getEditVal("description") as string) ?? ""}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                  />
                ) : (
                  <p className="text-foreground">{sop.description || "—"}</p>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Domain</div>
                {editMode ? (
                  <NativeSelect
                    value={(getEditVal("domain") as string) ?? ""}
                    onChange={(v) => setEditDraft((prev) => ({ ...prev, domain: v }))}
                    options={DOMAINS.map((d) => ({ value: d, label: d }))}
                  />
                ) : (
                  <span className="text-foreground">{sop.domain}</span>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Ưu tiên</div>
                {editMode ? (
                  <NativeSelect
                    value={(getEditVal("priority") as string) ?? "P2"}
                    onChange={(v) => setEditDraft((prev) => ({ ...prev, priority: v as Sop["priority"] }))}
                    options={[
                      { value: "P0", label: "P0 — Khẩn cấp" },
                      { value: "P1", label: "P1 — Cao" },
                      { value: "P2", label: "P2 — Trung bình" },
                      { value: "P3", label: "P3 — Thấp" },
                    ]}
                  />
                ) : (
                  <span className={cn("font-medium", priorityCfg.className)}>{sop.priority}</span>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Trạng thái</div>
                {editMode ? (
                  <NativeSelect
                    value={(getEditVal("status") as string) ?? "needs_creation"}
                    onChange={(v) => setEditDraft((prev) => ({ ...prev, status: v as Sop["status"] }))}
                    options={[
                      { value: "needs_creation", label: "Cần tạo" },
                      { value: "drafting", label: "Đang soạn" },
                      { value: "review", label: "Chờ duyệt" },
                      { value: "published", label: "Đã hoàn thành" },
                      { value: "deprecated", label: "Ngừng dùng" },
                    ]}
                  />
                ) : (
                  <Badge variant={statusCfg.variant} className="text-[10px]">
                    {statusCfg.label}
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Cron</div>
                {editMode ? (
                  <div className="space-y-1">
                    <Input
                      className="h-7 text-xs font-mono"
                      placeholder="0 9 * * 1"
                      value={(getEditVal("cron") as string) ?? ""}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, cron: e.target.value }))}
                    />
                    {parseCron((getEditVal("cron") as string) ?? "") && (
                      <span className="text-[10px] text-muted-foreground">
                        {parseCron((getEditVal("cron") as string) ?? "")}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-foreground">
                    {sop.cron || "—"}
                    {sop.cron && parseCron(sop.cron) !== sop.cron && (
                      <span className="ml-2 text-[10px] text-muted-foreground font-sans">
                        ({parseCron(sop.cron)})
                      </span>
                    )}
                  </span>
                )}
              </div>
              {sop.agents && sop.agents.length > 0 && (
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Agents</div>
                  <div className="flex flex-wrap gap-1">
                    {sop.agents.map((a) => (
                      <span key={a} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sop.lastRunAt && (
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chạy lần cuối
                  </div>
                  <span className="text-foreground">
                    {new Date(sop.lastRunAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 5.2 Workflow Steps ── */}
          {currentSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Các bước thực thi ({currentSteps.length})
              </h4>
              <div className="space-y-1.5">
                {currentSteps.map((step, i) => (
                  <SopStepCard
                    key={`${sop.sopId}-step-${step.order}`}
                    step={step}
                    stepIndex={i}
                    sopId={sop.sopId}
                    editable={editMode || sop.status === "draft"}
                    onUpdate={handleStepUpdate}
                    onExecuteSingle={handleExecuteSingle}
                    onDelete={handleStepDelete}
                    onMoveUp={(idx) => handleStepMove(idx, "up")}
                    onMoveDown={(idx) => handleStepMove(idx, "down")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 5.3 Execution Preview ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Luồng thực thi
            </h4>
            <SopExecutionPreview
              executionId={activeExecutionId ?? undefined}
              sopId={sop.sopId}
              onNavigateRun={onNavigateRun}
            />
          </div>

          {/* ── 5.4 Body markdown ── */}
          {(sop.body || editMode) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Nội dung chi tiết
                </h4>
                {!editMode && sop.body && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => { setBodyEdit(!bodyEdit); setBodyDraft(sop.body ?? ""); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {bodyEdit ? "Xem" : "Sửa"}
                  </Button>
                )}
              </div>
              {editMode || bodyEdit ? (
                <Textarea
                  className="min-h-[120px] text-xs font-mono"
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                />
              ) : (
                <div className="bg-muted/30 rounded-md p-3 text-xs whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {sop.body}
                </div>
              )}
            </div>
          )}

          {/* ── 5.5 ReMe status ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              ReMe
            </h4>
            <div className="flex items-center gap-3">
              <Button
                size="xs"
                variant="outline"
                disabled={remeMutation.isPending}
                onClick={() => remeMutation.mutate()}
              >
                {remeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Brain className="h-3 w-3 mr-1" />
                )}
                Inject ReMe
              </Button>
              {sop.reme_synced_at && (
                <span className="text-[10px] text-muted-foreground">
                  Đồng bộ: {new Date(sop.reme_synced_at).toLocaleString("vi-VN")}
                </span>
              )}
              {remeMutation.isSuccess && (
                <span className="text-[10px] text-green-600">Đã inject</span>
              )}
            </div>
          </div>

          {/* ── 5.6 Dependencies ── */}
          {sop.dependencies && sop.dependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phụ thuộc
              </h4>
              <div className="flex flex-wrap gap-2">
                {sop.dependencies.map((dep) => (
                  <button
                    key={dep}
                    className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                    onClick={() => {
                      // Navigate or scroll to dep SOP
                      const el = document.getElementById(`sop-${dep}`);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Link2 className="h-3 w-3" />
                    {dep}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 5.7 Execution history ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <History className="h-3 w-3" />
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
                {(executionsQuery.data ?? []).slice(0, 5).map((exec) => (
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
                      variant={
                        exec.status === "completed"
                          ? "secondary"
                          : exec.status === "failed"
                            ? "destructive"
                            : "outline"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {exec.status === "completed"
                        ? "Xong"
                        : exec.status === "failed"
                          ? "Lỗi"
                          : exec.status === "running"
                            ? "Đang chạy"
                            : "Tạm dừng"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Actions bar ── */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
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
              variant={editMode ? "default" : "outline"}
              onClick={() => {
                if (editMode) {
                  saveMutation.mutate();
                } else {
                  setEditMode(true);
                }
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : editMode ? (
                <Save className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Pencil className="h-3.5 w-3.5 mr-1" />
              )}
              {editMode ? "Lưu" : "Sửa"}
            </Button>
            {editMode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditMode(false);
                  setEditDraft({});
                }}
              >
                Huỷ
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={remeMutation.isPending}
              onClick={() => remeMutation.mutate()}
            >
              {remeMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Brain className="h-3.5 w-3.5 mr-1" />
              )}
              Inject ReMe
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
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
      title={DOMAIN_TOOLTIPS[label] || label}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-border bg-background text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800",
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
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            colorClass,
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colorClass)} />
    </span>
  );
}
