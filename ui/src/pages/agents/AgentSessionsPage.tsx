import { useState, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Copy,
  Check,
  Trash2,
  Settings,
  RefreshCw,
  Loader2,
  Terminal,
  Clock,
  AlertCircle,
  Square,
  ChevronDown,
  ChevronRight,
  Route,
  Ban,
  UserCog,
  MessageSquare,
} from "lucide-react";
import {
  agentConfigsApi,
  type AgentSession,
  type ActivityLogEntry,
} from "@/api/agentConfigs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import { ClipboardList, FileText } from "lucide-react";
import { AgentLogDrawer } from "./AgentLogDrawer";

type StatusFilter = "all" | "running" | "idle" | "stopped";

// ── Local-only "hide row from table" — does NOT delete session data ──
// Hidden IDs persist in localStorage so reload keeps them hidden.
// Per-browser only (intentional — paperclip dashboard is single-machine).
const HIDDEN_SESSIONS_KEY = "paperclip:hiddenSessionIds";

function loadHiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_SESSIONS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveHiddenIds(ids: Set<string>): void {
  try {
    localStorage.setItem(HIDDEN_SESSIONS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage full or disabled — silent fallback (state still in memory)
  }
}

// ── Types for Smart Routing ──
interface IgnoredChat {
  id: string;
  chat_id: string;
  channel_name: string | null;
  display_name: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

interface AgentOverride {
  id: string;
  match_type: string;
  match_value: string;
  action: string;
  agent_slug: string | null;
  reason: string | null;
  priority: number | null;
  is_active: boolean | null;
  created_at: string;
}


const MATCH_TYPE_LABELS: Record<string, string> = {
  sender_id: "Sender ID",
  chat_id: "Chat ID",
  keyword: "Từ khóa",
  phone: "Số điện thoại",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "bg-green-500";
    case "idle":
      return "bg-yellow-500";
    case "stopped":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "running":
      return "Đang chạy";
    case "idle":
      return "Nhàn rỗi";
    case "stopped":
      return "Đã dừng";
    default:
      return status;
  }
}

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group"
      title="Nhấn để sao chép"
    >
      <span className="truncate max-w-[180px]">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-500 shrink-0" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0" />
      )}
    </button>
  );
}

export function AgentSessionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("all");

  // ── Hidden rows (UI-only, not destructive) ──
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadHiddenIds());

  // ── Collapse whole sessions table ──
  const [tableCollapsed, setTableCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("paperclip:sessionsTableCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleTable = useCallback(() => {
    setTableCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("paperclip:sessionsTableCollapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  // ── Expand individual rows (click anywhere in row) ──
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const toggleRow = useCallback((id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hideRow = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveHiddenIds(next);
      return next;
    });
  }, []);
  const restoreAll = useCallback(() => {
    setHiddenIds(new Set());
    saveHiddenIds(new Set());
  }, []);

  // ── Modal state: Add Ignore ──
  const [showAddIgnore, setShowAddIgnore] = useState(false);
  const [newIgnoreChatId, setNewIgnoreChatId] = useState("");
  const [newIgnoreDisplayName, setNewIgnoreDisplayName] = useState("");
  const [newIgnoreReason, setNewIgnoreReason] = useState("");
  const [newIgnoreChannel, setNewIgnoreChannel] = useState("");

  // ── Modal state: Add Override ──
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOvMatchType, setNewOvMatchType] = useState("sender_id");
  const [newOvMatchValue, setNewOvMatchValue] = useState("");
  const [newOvAgentSlug, setNewOvAgentSlug] = useState("");
  const [newOvAction, setNewOvAction] = useState("route");
  const [newOvReason, setNewOvReason] = useState("");

  // ── Modal state: Add Keyword Rule ──
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKwKeywords, setNewKwKeywords] = useState("");
  const [newKwAgentSlug, setNewKwAgentSlug] = useState("");
  const [newKwReason, setNewKwReason] = useState("");

  // ── Agent log drawer state ──
  const [logDrawer, setLogDrawer] = useState<{
    open: boolean;
    slug: string;
    context: string;
  }>({ open: false, slug: "", context: "" });

  const openLogForEntry = (entry: any) => {
    const slug = entry.handled_by || entry.agent_slug || "";
    if (!slug) return;
    const channel = entry.channel_name || "—";
    const sender = entry.sender_name || entry.from_uid || entry.sender_id || "—";
    setLogDrawer({
      open: true,
      slug,
      context: `Hội thoại: ${sender} · ${channel}`,
    });
  };

  // Sessions query — auto-refresh every 10s
  const {
    data: sessions = [],
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["agent-sessions"],
    queryFn: agentConfigsApi.listSessions,
    refetchInterval: 10_000,
  });

  // Activity log query
  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["agent-sessions-activity"],
    queryFn: agentConfigsApi.listActivity,
    refetchInterval: 10_000,
  });

  // Smart Routing queries
  const { data: ignored = [], refetch: refetchIgnored } = useQuery<IgnoredChat[]>({
    queryKey: ["routing-ignored"],
    queryFn: () => fetch("/api/channels/routing/ignored").then((r) => r.json()),
  });

  const { data: overrides = [], refetch: refetchOverrides } = useQuery<AgentOverride[]>({
    queryKey: ["routing-overrides"],
    queryFn: () => fetch("/api/channels/routing/overrides").then((r) => r.json()),
  });

  const { data: keywordRules = [], refetch: refetchKeywords } = useQuery<AgentOverride[]>({
    queryKey: ["routing-keywords"],
    queryFn: () => fetch("/api/channels/routing/keywords").then((r) => r.json()),
  });

  const clearAllMut = useMutation({
    mutationFn: () => agentConfigsApi.clearAllSessions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-sessions"] });
    },
  });

  const deleteIgnored = async (id: string) => {
    await fetch(`/api/channels/routing/ignored/${id}`, { method: "DELETE" });
    refetchIgnored();
  };

  const deleteOverride = async (id: string) => {
    await fetch(`/api/channels/routing/overrides/${id}`, { method: "DELETE" });
    refetchOverrides();
  };

  const submitAddIgnore = async () => {
    if (!newIgnoreChatId.trim()) return;
    await fetch("/api/channels/routing/ignored", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: newIgnoreChatId.trim(),
        display_name: newIgnoreDisplayName.trim() || null,
        reason: newIgnoreReason.trim() || null,
        channel_name: newIgnoreChannel.trim() || null,
      }),
    });
    refetchIgnored();
    setShowAddIgnore(false);
    setNewIgnoreChatId("");
    setNewIgnoreDisplayName("");
    setNewIgnoreReason("");
    setNewIgnoreChannel("");
  };

  const deleteKeyword = async (id: string) => {
    await fetch(`/api/channels/routing/keywords/${id}`, { method: "DELETE" });
    refetchKeywords();
  };

  const submitAddKeyword = async () => {
    if (!newKwKeywords.trim() || !newKwAgentSlug.trim()) return;
    await fetch("/api/channels/routing/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: newKwKeywords.trim(),
        agent_slug: newKwAgentSlug.trim(),
        reason: newKwReason.trim() || null,
      }),
    });
    refetchKeywords();
    setShowAddKeyword(false);
    setNewKwKeywords("");
    setNewKwAgentSlug("");
    setNewKwReason("");
  };

  const submitAddOverride = async () => {
    if (!newOvMatchValue.trim()) return;
    await fetch("/api/channels/routing/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_type: newOvMatchType,
        match_value: newOvMatchValue.trim(),
        agent_slug: newOvAgentSlug.trim() || null,
        action: newOvAction,
        reason: newOvReason.trim() || null,
      }),
    });
    refetchOverrides();
    setShowAddOverride(false);
    setNewOvMatchType("sender_id");
    setNewOvMatchValue("");
    setNewOvAgentSlug("");
    setNewOvAction("route");
    setNewOvReason("");
  };

  const visibleSessions = sessions.filter((s) => !hiddenIds.has(s.id));
  const filtered =
    filter === "all"
      ? visibleSessions
      : visibleSessions.filter((s) => s.status === filter);
  const hiddenCount = sessions.length - visibleSessions.length;

  const activeCount = sessions.filter((s) => s.status === "running").length;

  // ── SOP stats per agent ──
  const { data: sopStats } = useQuery({
    queryKey: ["sop-engine-stats"],
    queryFn: async () => {
      const res = await fetch("/api/ops/sop-engine/stats");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
  });

  // Count unique agent slugs from sessions
  const agentSlugs = [...new Set(sessions.map((s) => s.agent_slug))];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Phiên Agent
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi các phiên agent đang hoạt động &middot;{" "}
            <span className="font-medium text-foreground">
              {activeCount} đang chạy
            </span>
            {" "}&middot; {sessions.length} tổng cộng
            {isRefetching && (
              <RefreshCw className="inline h-3 w-3 ml-1.5 animate-spin text-muted-foreground" />
            )}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => clearAllMut.mutate()}
          disabled={clearAllMut.isPending || sessions.length === 0}
        >
          {clearAllMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Xóa tất cả
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(
          [
            { key: "all", label: "Tất cả" },
            { key: "running", label: "Đang chạy" },
            { key: "idle", label: "Nhàn rỗi" },
            { key: "stopped", label: "Đã dừng" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
            {key === "all" && sessions.length > 0 && (
              <span className="ml-1.5 opacity-70">{sessions.length}</span>
            )}
            {key === "running" && activeCount > 0 && (
              <span className="ml-1.5 opacity-70">{activeCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* SOP Quick View */}
      {sopStats && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-violet-500" />
              SOP Engine
            </h3>
            <button
              onClick={() => navigate("/ops/sop-engine")}
              className="text-[10px] text-primary hover:underline"
            >
              Xem tất cả →
            </button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {sopStats.total} SOPs &middot; {sopStats.done} hoàn thành &middot; {sopStats.needed} cần tạo
          </div>
          {agentSlugs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {agentSlugs.slice(0, 6).map((slug) => (
                <button
                  key={slug}
                  onClick={() => navigate(`/ops/sop-engine?assigned_agent=${slug}`)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 transition-colors"
                >
                  {slug}
                  <span className="text-muted-foreground">→ SOPs</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Chưa có phiên agent nào"
              : `Không có phiên nào ở trạng thái "${statusLabel(filter)}"`}
          </p>
        </div>
      )}

      {/* Restore-hidden banner (only when something is hidden) */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/40 border border-dashed text-xs">
          <span className="text-muted-foreground">
            Đã ẩn {hiddenCount} phiên khỏi bảng (data vẫn còn nguyên — chỉ ẩn UI)
          </span>
          <button
            type="button"
            onClick={restoreAll}
            className="text-primary hover:underline font-medium"
          >
            Hiện lại tất cả
          </button>
        </div>
      )}

      {/* Sessions Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={toggleTable}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors border-b text-left"
          >
            <div className="flex items-center gap-2">
              {tableCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-semibold">
                Danh sách phiên ({filtered.length})
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {tableCollapsed ? "Hiện bảng" : "Ẩn bảng"}
            </span>
          </button>
          {!tableCollapsed && (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[24%]" />{/* Agent */}
              <col className="w-[26%]" />{/* Session ID */}
              <col className="w-[10%]" />{/* Trạng thái */}
              <col className="w-[12%]" />{/* Bắt đầu */}
              <col className="w-[12%]" />{/* Hoạt động */}
              <col className="w-[16%]" />{/* Hành động */}
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Agent
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Session ID
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Trạng thái
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Bắt đầu
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Hoạt động gần nhất
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  expanded={expandedRowIds.has(session.id)}
                  onToggle={() => toggleRow(session.id)}
                  onHide={() => hideRow(session.id)}
                  onViewConfig={() =>
                    navigate(`/agents-config/${session.agent_slug}/edit`)
                  }
                  pushToast={pushToast}
                />
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* ── Smart Routing Panel ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Route className="h-4 w-4" />
          Smart Routing
          <span className="text-xs font-normal text-muted-foreground">— 3 tầng lọc tin nhắn tự động</span>
        </h2>

        {/* Tier 1: Ignored chats */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
            <div className="flex items-center gap-2">
              <Ban className="h-3.5 w-3.5 text-destructive" />
              <h3 className="text-xs font-semibold">Tầng 1 — Bỏ qua hoàn toàn</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5">{ignored.length}</Badge>
            </div>
            <button
              onClick={() => setShowAddIgnore(true)}
              className="text-xs text-primary hover:underline"
            >
              + Thêm
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {ignored.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">
                Chưa có chat nào bị bỏ qua
              </p>
            )}
            {ignored.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {item.display_name || item.chat_id}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.chat_id}
                    </span>
                    {item.channel_name && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {item.channel_name}
                      </Badge>
                    )}
                    {item.reason && (
                      <span className="text-xs text-muted-foreground">· {item.reason}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteIgnored(item.id)}
                  className="ml-3 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Xóa khỏi danh sách bỏ qua"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 2: Agent overrides */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
            <div className="flex items-center gap-2">
              <UserCog className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold">Tầng 2 — Gán agent theo điều kiện</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5">{overrides.length}</Badge>
            </div>
            <button
              onClick={() => setShowAddOverride(true)}
              className="text-xs text-primary hover:underline"
            >
              + Thêm
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {overrides.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">
                Chưa có rule nào
              </p>
            )}
            {overrides.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                    {MATCH_TYPE_LABELS[item.match_type] || item.match_type}
                  </Badge>
                  <span className="font-mono text-xs font-medium truncate max-w-[140px]">
                    {item.match_value}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  {item.action === "ignore" ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      Bỏ qua
                    </Badge>
                  ) : item.agent_slug ? (
                    <Badge className="text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20">
                      {item.agent_slug}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {!item.is_active && (
                    <Badge variant="secondary" className="text-[10px] px-1">tắt</Badge>
                  )}
                  {item.reason && (
                    <span className="text-xs text-muted-foreground">· {item.reason}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteOverride(item.id)}
                  className="ml-3 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Xóa rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 3: Keyword rules */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
              <h3 className="text-xs font-semibold">Tầng 3 — Keyword rules (mặc định)</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5">{keywordRules.length}</Badge>
            </div>
            <button onClick={() => setShowAddKeyword(true)} className="text-xs text-primary hover:underline">
              + Thêm
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {keywordRules.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">
                Chưa có keyword rule — tin nhắn không khớp Tầng 1/2 sẽ dùng agent mặc định của kênh
              </p>
            )}
            {keywordRules.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {item.match_value.split(",").map((kw, ki) => (
                      <span key={ki} className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono">
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                  <span className="text-muted-foreground text-xs">→</span>
                  {item.agent_slug && (
                    <Badge className="text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20">
                      {item.agent_slug}
                    </Badge>
                  )}
                  {item.reason && <span className="text-xs text-muted-foreground">· {item.reason}</span>}
                </div>
                <button
                  onClick={() => deleteKeyword(item.id)}
                  className="ml-3 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Activity Log (existing) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Hoạt động gần đây
        </h2>

        {activityLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        )}

        {!activityLoading && activity.length === 0 && (
          <div className="border border-dashed rounded-lg p-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-1.5 opacity-50" />
            <p className="text-muted-foreground text-xs">
              Chưa có hoạt động nào được ghi nhận
            </p>
          </div>
        )}

        {!activityLoading && activity.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Thời gian
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Kênh
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Hội thoại
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Khách hàng
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Tin nhắn
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Agent xử lý
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows: React.ReactNode[] = [];
                  let prevThreadKey = "";

                  activity.forEach((entry: any) => {
                    const threadKey = `${entry.channel_raw || entry.channel_name}:${entry.thread_id || entry.sender_id}`;
                    const isNewThread = threadKey !== prevThreadKey;
                    const senderName =
                      entry.sender_name ||
                      entry.from_uid ||
                      entry.sender_id ||
                      "—";
                    const isOutbound = entry.type === "outbound";

                    rows.push(
                      <tr
                        key={entry.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isNewThread
                            ? "border-t-2 border-border"
                            : "border-b border-border/30"
                        }`}
                      >
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(entry.handled_at)}
                        </td>
                        <td className="px-4 py-2">
                          {isNewThread ? (
                            <div className="flex gap-1 items-center">
                              <Badge variant="outline" className="text-[10px]">
                                {entry.channel_name}
                              </Badge>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium truncate max-w-[140px]">
                          <div className="flex items-center gap-1">
                            {isOutbound ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 shrink-0"
                              >
                                ↑
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 bg-green-500/10 text-green-600 shrink-0"
                              >
                                ↓
                              </Badge>
                            )}
                            <span className="truncate">{senderName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs truncate max-w-[120px]">
                          {(entry as any).customer_name || "—"}
                        </td>
                        <td
                          className="px-4 py-2 text-xs truncate max-w-[250px] cursor-pointer hover:text-primary"
                          onClick={() => {
                            const cn =
                              entry.channel_raw || entry.channel_name;
                            const tid = entry.thread_id;
                            if (cn && tid)
                              navigate(
                                `/channels/zalo-personal/${cn}/${tid}`
                              );
                          }}
                        >
                          {entry.body || entry.message || "—"}
                        </td>
                        <td className="px-4 py-2">
                          {entry.handled_by ? (
                            <button
                              onClick={() => openLogForEntry(entry)}
                              className="group inline-flex items-center gap-1 hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors"
                              title="Xem log phiên agent"
                            >
                              <Badge variant="secondary" className="text-[10px] group-hover:bg-primary group-hover:text-primary-foreground">
                                {entry.handled_by}
                              </Badge>
                              <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              entry.status === "done"
                                ? "default"
                                : entry.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    );

                    prevThreadKey = threadKey;
                  });

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Add Ignored Chat ── */}
      {showAddIgnore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-sm">Thêm chat vào danh sách bỏ qua</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Chat ID / Sender ID <span className="text-destructive">*</span>
                </label>
                <input
                  value={newIgnoreChatId}
                  onChange={(e) => setNewIgnoreChatId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: 123456789"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tên hiển thị</label>
                <input
                  value={newIgnoreDisplayName}
                  onChange={(e) => setNewIgnoreDisplayName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Zip Shop"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Kênh (tuỳ chọn)</label>
                <input
                  value={newIgnoreChannel}
                  onChange={(e) => setNewIgnoreChannel(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: zalo-personal (để trống = tất cả)"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Lý do</label>
                <input
                  value={newIgnoreReason}
                  onChange={(e) => setNewIgnoreReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Group chat spam"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddIgnore(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitAddIgnore}
                disabled={!newIgnoreChatId.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Keyword Rule ── */}
      {showAddKeyword && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-sm">Thêm keyword rule (Tầng 3)</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Từ khóa <span className="text-destructive">*</span>
                </label>
                <input
                  value={newKwKeywords}
                  onChange={(e) => setNewKwKeywords(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: giá, mua, bao nhiêu (phân cách bằng dấu phẩy)"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Gán agent <span className="text-destructive">*</span>
                </label>
                <input
                  value={newKwAgentSlug}
                  onChange={(e) => setNewKwAgentSlug(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: sales-closer"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ghi chú</label>
                <input
                  value={newKwReason}
                  onChange={(e) => setNewKwReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Câu hỏi về giá & mua hàng"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddKeyword(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitAddKeyword}
                disabled={!newKwKeywords.trim() || !newKwAgentSlug.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Agent Override ── */}
      {showAddOverride && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-sm">Thêm rule định tuyến</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Loại điều kiện</label>
                <select
                  value={newOvMatchType}
                  onChange={(e) => setNewOvMatchType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="sender_id">Sender ID</option>
                  <option value="chat_id">Chat ID</option>
                  <option value="keyword">Từ khóa trong tin nhắn</option>
                  <option value="phone">Số điện thoại</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Giá trị khớp <span className="text-destructive">*</span>
                </label>
                <input
                  value={newOvMatchValue}
                  onChange={(e) => setNewOvMatchValue(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: 123456789"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hành động</label>
                <select
                  value={newOvAction}
                  onChange={(e) => setNewOvAction(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="route">Chuyển đến agent</option>
                  <option value="ignore">Bỏ qua hoàn toàn</option>
                </select>
              </div>
              {newOvAction === "route" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Agent slug</label>
                  <input
                    value={newOvAgentSlug}
                    onChange={(e) => setNewOvAgentSlug(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="VD: customer-success"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ghi chú</label>
                <input
                  value={newOvReason}
                  onChange={(e) => setNewOvReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="VD: Khách VIP luôn dùng CEO agent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddOverride(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitAddOverride}
                disabled={!newOvMatchValue.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Agent Session Log Drawer ── */}
      <AgentLogDrawer
        open={logDrawer.open}
        onClose={() => setLogDrawer({ ...logDrawer, open: false })}
        agentSlug={logDrawer.slug}
        contextLabel={logDrawer.context}
      />
    </div>
  );
}

function SessionRow({
  session,
  expanded,
  onToggle,
  onHide,
  onViewConfig,
  pushToast,
}: {
  session: AgentSession;
  expanded: boolean;
  onToggle: () => void;
  onHide: () => void;
  onViewConfig: () => void;
  pushToast: (t: any) => void;
}) {
  // Stop propagation on interactive children so row-click toggle doesn't fire
  // when user clicks buttons, copy widgets, or badges inside the row.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
    <tr
      onClick={onToggle}
      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
      title={expanded ? "Nhấn để thu gọn" : "Nhấn để mở rộng"}
    >
      {/* Agent */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm">
            {session.avatar ||
              (session.display_name ?? session.agent_slug).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {session.display_name ?? session.agent_slug}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {session.agent_slug}
            </div>
          </div>
        </div>
      </td>

      {/* Session ID + Channel */}
      <td className="px-4 py-3" onClick={stop}>
        <CopyableId value={session.session_id} />
        {(session as any).channels?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {(session as any).channels.map((ch: any) => (
              <Badge
                key={ch.name}
                variant="outline"
                className="text-[9px] px-1 py-0 border-blue-300 text-blue-600 dark:text-blue-400"
              >
                {ch.display_name || ch.name}
                <span
                  className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                    ch.status === "connected" ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </Badge>
            ))}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${statusColor(session.status)}`}
          />
          <span className="text-xs">{statusLabel(session.status)}</span>
        </div>
      </td>

      {/* Started at */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {timeAgo(session.started_at)}
      </td>

      {/* Last activity */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {timeAgo(session.last_activity_at ?? session.last_poll_at)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right" onClick={stop}>
        <div className="flex items-center gap-1 justify-end flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-orange-600 hover:text-orange-700"
            title="Dừng agent — tắt auto-reply + xóa khỏi tất cả kênh + xóa session"
            onClick={async () => {
              try {
                await fetch(`/api/channels/agent-configs/${session.agent_slug}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: false }),
                });
                const instRes = await fetch("/api/channels/instances");
                const instances = await instRes.json();
                for (const ch of Array.isArray(instances) ? instances : []) {
                  if (ch.agent_slug === session.agent_slug) {
                    await fetch(`/api/channels/settings/${ch.name}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ agent_slug: null }),
                    });
                  }
                }
                await fetch(
                  `/api/channels/agent-configs/${session.agent_slug}/sessions/clear`,
                  { method: "POST" }
                );
                pushToast({
                  title: "Đã dừng hoàn toàn",
                  body: `Agent ${session.display_name || session.agent_slug} đã tắt + xóa khỏi tất cả kênh`,
                  tone: "success",
                  ttlMs: 4000,
                });
              } catch {
                pushToast({
                  title: "Lỗi",
                  body: "Không thể dừng agent",
                  tone: "error",
                  ttlMs: 3000,
                });
              }
            }}
          >
            <Square className="h-3 w-3 mr-1" />
            Dừng
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            title="Sao chép lệnh mở terminal"
            onClick={async () => {
              const agentDir = `C:\\Users\\Jennie Chu\\Desktop\\Projects\\crypto-pattern-scanner\\agents\\${session.agent_slug}`;
              const modelFlag = (session as any).model
                ? ` --model ${(session as any).model}`
                : "";
              const cmd = `cd "${agentDir}"; claude --resume ${session.session_id}${modelFlag} --dangerously-skip-permissions`;
              try {
                await navigator.clipboard.writeText(cmd);
                pushToast({
                  title: "Đã sao chép",
                  body: cmd,
                  tone: "success",
                  ttlMs: 4000,
                });
              } catch {
                pushToast({
                  title: "Lỗi",
                  body: "Không thể sao chép",
                  tone: "error",
                  ttlMs: 3000,
                });
              }
            }}
          >
            <Terminal className="h-3 w-3 mr-1" />
            Terminal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onViewConfig}
          >
            <Settings className="h-3 w-3 mr-1" />
            Cấu hình
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onHide}
            title="Ẩn dòng này khỏi bảng — session vẫn được giữ nguyên (data + history). Reload trình duyệt sẽ vẫn ẩn. Có nút 'Hiện lại tất cả' ở banner phía trên."
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Ẩn
          </Button>
        </div>
      </td>
    </tr>
    {expanded && (
      <tr className="bg-muted/20 border-b last:border-b-0">
        <td colSpan={6} className="px-6 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
            <DetailField label="Agent slug" value={session.agent_slug} mono />
            <DetailField
              label="Session ID"
              value={session.session_id}
              mono
              full
            />
            <DetailField
              label="Model"
              value={(session as any).model ?? "—"}
              mono
            />
            <DetailField
              label="Trạng thái"
              value={statusLabel(session.status)}
            />
            <DetailField
              label="Bắt đầu"
              value={
                session.started_at
                  ? new Date(session.started_at).toLocaleString("vi-VN")
                  : "—"
              }
            />
            <DetailField
              label="Hoạt động gần nhất"
              value={
                session.last_activity_at
                  ? new Date(session.last_activity_at).toLocaleString("vi-VN")
                  : session.last_poll_at
                  ? new Date(session.last_poll_at).toLocaleString("vi-VN")
                  : "—"
              }
            />
            <DetailField
              label="Số kênh"
              value={`${(session as any).channels?.length ?? 0}`}
            />
            <DetailField
              label="Display name"
              value={session.display_name ?? "—"}
            />
          </div>
        </td>
      </tr>
    )}
    </>
  );
}

function DetailField({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 md:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </div>
      <div
        className={`${mono ? "font-mono" : ""} text-xs text-foreground break-all`}
      >
        {value}
      </div>
    </div>
  );
}
