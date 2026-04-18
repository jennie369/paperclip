// Content Pipeline Page — 6 tabs + clickable stats cards + quick actions

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Play, CheckCircle, RefreshCw, Loader2, Calendar as CalIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { opsApi } from "@/api/ops";
import { useToast } from "@/context/ToastContext";
import { useLiveInvalidate } from "@/hooks/useLiveInvalidate";
import { PipelineTab } from "./tabs/PipelineTab";
import { ContentTab } from "./tabs/ContentTab";
import { EmailPushTab } from "./tabs/EmailPushTab";
import { LinksTab } from "./tabs/LinksTab";
import { SkillsMemoryTab } from "./tabs/SkillsMemoryTab";
import { PlannerBoard } from "@/components/ops/PlannerBoard";
import AiGenPage from "../content-center/CCAIGen";
import BatchJobsView from "./sop-engine/BatchGeneratorTab";

// 2026-04-18 — TABS is now a mutable default; the live order lives in state so
// the user can drag tabs to reorder. aigen moved in front of pipeline per
// Jennie's request.
const DEFAULT_TABS = [
  { key: "aigen", label: "✨ AI Tạo Nội Dung" },
  { key: "pipeline", label: "Pipeline" },
  { key: "content", label: "Nội Dung" },
  { key: "schedule", label: "Lịch Nội Dung" },
  { key: "email", label: "Email & Push" },
  { key: "links", label: "Links" },
  { key: "skills", label: "Skills & Memory" },
] as const;

type TabKey = typeof DEFAULT_TABS[number]["key"];
type Tab = { key: TabKey; label: string };

const TAB_ORDER_STORAGE_KEY = "paperclip.contentPipeline.tabOrder.v1";

function loadSavedTabOrder(): Tab[] {
  try {
    const raw = localStorage.getItem(TAB_ORDER_STORAGE_KEY);
    if (!raw) return [...DEFAULT_TABS];
    const savedKeys = JSON.parse(raw) as TabKey[];
    const byKey = new Map(DEFAULT_TABS.map((t) => [t.key, t]));
    const ordered: Tab[] = [];
    for (const key of savedKeys) {
      const hit = byKey.get(key);
      if (hit) {
        ordered.push(hit);
        byKey.delete(key);
      }
    }
    // Append any new tabs added in code since the last save.
    for (const tab of byKey.values()) ordered.push(tab);
    return ordered;
  } catch {
    return [...DEFAULT_TABS];
  }
}

export function ContentPipelinePage() {
  const [tabs, setTabs] = useState<Tab[]>(() => loadSavedTabOrder());
  const [activeTab, setActiveTab] = useState<TabKey>(() => loadSavedTabOrder()[0]?.key ?? "aigen");
  const [dragKey, setDragKey] = useState<TabKey | null>(null);

  const reorderTab = useCallback((sourceKey: TabKey, targetKey: TabKey) => {
    if (sourceKey === targetKey) return;
    setTabs((prev) => {
      const src = prev.findIndex((t) => t.key === sourceKey);
      const dst = prev.findIndex((t) => t.key === targetKey);
      if (src === -1 || dst === -1) return prev;
      const next = prev.slice();
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved);
      try {
        localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(next.map((t) => t.key)));
      } catch {
        // localStorage disabled — non-fatal, order just won't persist.
      }
      return next;
    });
  }, []);
  const [bulkApproving, setBulkApproving] = useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  // Re-fetch when user navigates back to this page from CC
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['ops', 'content-stats'] });
    qc.invalidateQueries({ queryKey: ['ops', 'scripts'] });
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["ops", "content-stats"],
    queryFn: () => opsApi.getContentStats(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Live: auto-refresh content stats + script list on any CC table mutation
  useLiveInvalidate({
    tables: [
      'cc_scripts', 'cc_generation_jobs', 'cc_calendar_events',
      'cc_email_campaigns', 'cc_email_sends', 'cc_notifications',
    ],
    queryKeys: [
      ['ops', 'content-stats'],
      ['ops', 'scripts'],
      ['ops', 'calendar'],
      ['ops', 'email-campaigns'],
    ],
  });

  // Execute script helper
  const execScript = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/ops/content-pipeline/execute/${key}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json().catch(() => ({})); pushToast({ title: (err as any).error || "Lỗi", tone: "error" }); return; }
      pushToast({ title: `Đã trigger ${key}`, tone: "success" });
    } catch { pushToast({ title: "Lỗi kết nối", tone: "error" }); }
  }, [pushToast]);

  // Bulk approve
  const handleBulkApprove = useCallback(async () => {
    setBulkApproving(true);
    try {
      const scriptsRes = await fetch("/api/ops/content-pipeline/scripts?status=draft&limit=200");
      const scriptsList = await scriptsRes.json();
      const drafts = scriptsList || [];
      if (!drafts.length) { pushToast({ title: "Không có bài chờ duyệt", tone: "info" }); setBulkApproving(false); return; }

      // Compliance check + approve
      const passIds: string[] = [];
      const failCount = { value: 0 };
      for (const s of drafts) {
        const checkRes = await fetch("/api/ops/content-pipeline/compliance-check", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: s.body || s.caption || "" }),
        });
        const check = await checkRes.json();
        if (check.pass) passIds.push(s.id);
        else failCount.value++;
      }

      if (passIds.length) {
        await fetch("/api/ops/content-pipeline/scripts/bulk-approve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script_ids: passIds }),
        });
      }

      pushToast({ title: `Đã duyệt ${passIds.length} bài. ${failCount.value} cần review.`, tone: "success" });
      qc.invalidateQueries({ queryKey: ["ops"] });
    } catch { pushToast({ title: "Lỗi bulk approve", tone: "error" }); }
    finally { setBulkApproving(false); }
  }, [pushToast, qc]);

  const posted = stats?.posted_today ?? 0;
  const target = stats?.target_today ?? 9;
  const pending = stats?.pending_approval ?? 0;
  const generating = stats?.generating ?? 0;
  const total = stats?.total_scripts ?? 0;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Content Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{posted}/{target} bài/ngày · 3 tài khoản · 8 segment email</p>
      </div>

      {/* Publish Triggers — Immediate + Batch (2026-04-15) */}
      <Card className="p-3 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Play className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Publish Triggers</div>
          <span className="text-[10px] text-muted-foreground">Đăng liền không đợi cron hoặc gom đủ 5 bài rồi đăng batch</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={async () => {
              if (!confirm("Publish batch TẤT CẢ bài approved có publish_mode=threshold_5 ngay bây giờ?")) return;
              try {
                const r = await fetch("/api/ops/content-pipeline/publish-batch", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                const data = await r.json();
                pushToast({ title: data.message || `Đã enqueue ${data.count || 0} bài`, tone: "success" });
                qc.invalidateQueries({ queryKey: ["ops"] });
              } catch { pushToast({ title: "Lỗi publish-batch", tone: "error" }); }
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
          >
            <Play className="h-3 w-3" /> Đăng batch ngay (threshold_5)
          </button>
          <button
            onClick={async () => {
              if (!confirm("Publish TẤT CẢ bài approved chưa published (bỏ qua publish_mode)?")) return;
              try {
                const r = await fetch("/api/ops/content-pipeline/publish-batch", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ force_all: true }),
                });
                const data = await r.json();
                pushToast({ title: data.message || `Đã enqueue ${data.count || 0} bài`, tone: "success" });
                qc.invalidateQueries({ queryKey: ["ops"] });
              } catch { pushToast({ title: "Lỗi publish-batch force", tone: "error" }); }
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent/30 flex items-center gap-1.5"
          >
            ⚡ Force publish all approved
          </button>
          <div className="flex-1" />
          <div className="text-[10px] text-muted-foreground">
            <b>scheduled</b>=đợi cron · <b>immediate</b>=approve→đăng liền · <b>threshold_5</b>=gom 5 bài rồi đăng batch
          </div>
        </div>
      </Card>

      {/* Stats cards — CLICKABLE + QUICK ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Đã đăng hôm nay */}
        <Card
          className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
          onClick={() => setActiveTab("schedule")}
        >
          <div className="text-xl font-bold text-center">{posted}/{target}</div>
          <div className="text-[10px] text-muted-foreground text-center">Đã đăng hôm nay</div>
          <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => execScript("daily_post")} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500/20">
              <Play className="h-2.5 w-2.5 inline mr-0.5" />Đăng ngay
            </button>
            <button onClick={() => navigate('/GEM/cc/calendar')} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80">
              <CalIcon className="h-2.5 w-2.5 inline mr-0.5" />Lịch CC
            </button>
          </div>
        </Card>

        {/* Card 2: Chờ duyệt */}
        <Card
          className="p-3 cursor-pointer hover:ring-2 hover:ring-orange-500/30 transition-all"
          onClick={() => setActiveTab("content")}
        >
          <div className="text-xl font-bold text-center">{pending}</div>
          <div className="text-[10px] text-muted-foreground text-center">Chờ duyệt</div>
          <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={handleBulkApprove} disabled={bulkApproving} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500/20 disabled:opacity-50">
              {bulkApproving ? <Loader2 className="h-2.5 w-2.5 inline animate-spin mr-0.5" /> : <CheckCircle className="h-2.5 w-2.5 inline mr-0.5" />}
              Duyệt tất cả
            </button>
            <button onClick={async () => {
              const res = await fetch("/api/ops/content-pipeline/compliance-check-all", { method: "POST" });
              const data = await res.json().catch(() => ({}));
              pushToast({ title: data?.message || "Compliance check done", tone: data?.violations ? "error" : "success" });
            }} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20">
              Compliance
            </button>
          </div>
        </Card>

        {/* Card 3: Đang tạo — click scroll to jobs */}
        <Card
          className="p-3 cursor-pointer hover:ring-2 hover:ring-blue-500/30 transition-all"
          onClick={() => { setActiveTab("pipeline"); setTimeout(() => document.getElementById("generation-jobs")?.scrollIntoView({ behavior: "smooth" }), 100); }}
        >
          <div className="text-xl font-bold text-center">{generating}</div>
          <div className="text-[10px] text-muted-foreground text-center">Đang tạo</div>
          <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => execScript("batch_generate")} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-600 rounded-full hover:bg-violet-500/20">
              <Play className="h-2.5 w-2.5 inline mr-0.5" />Generate
            </button>
            <button onClick={async () => {
              await fetch("/api/ops/content-pipeline/jobs/retry-failed", { method: "POST" });
              qc.invalidateQueries({ queryKey: ["ops"] });
              pushToast({ title: "Retry failed jobs", tone: "success" });
            }} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full hover:bg-red-500/20">
              <RefreshCw className="h-2.5 w-2.5 inline mr-0.5" />Retry
            </button>
          </div>
        </Card>

        {/* Card 4: Tổng nội dung */}
        <Card
          className="p-3 cursor-pointer hover:ring-2 hover:ring-foreground/10 transition-all"
          onClick={() => setActiveTab("content")}
        >
          <div className="text-xl font-bold text-center">{total}</div>
          <div className="text-[10px] text-muted-foreground text-center">Tổng nội dung</div>
          <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => navigate('/GEM/cc/scripts')} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80">
              Xem tất cả
            </button>
            <button onClick={() => navigate('/GEM/cc/ai-gen')} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-600 rounded-full hover:bg-violet-500/20">
              ✨ Tạo mới
            </button>
          </div>
        </Card>
      </div>

      {/* Notion Sync status */}
      <NotionSyncCard />

      {/* Tab bar — drag to reorder (order persisted in localStorage). */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            draggable
            onDragStart={() => setDragKey(tab.key)}
            onDragOver={(e) => {
              // Required so onDrop fires. Also hints the user this is a valid drop target.
              e.preventDefault();
            }}
            onDrop={() => {
              if (dragKey && dragKey !== tab.key) reorderTab(dragKey, tab.key);
              setDragKey(null);
            }}
            onDragEnd={() => setDragKey(null)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-grab active:cursor-grabbing ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            } ${dragKey === tab.key ? "opacity-50" : ""}`}
            title="Kéo thả để đổi vị trí tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pipeline" && <PipelineTab onSwitchTab={(tab) => setActiveTab(tab as TabKey)} />}
      {activeTab === "aigen" && (
        <div className="cc-scope space-y-4">
          {/* 2026-04-18 — Jobs Queue moved from Nội Dung sub-tab into here,
              above the Content Planner, per Jennie. Same component; single
              source of truth for batch runs. */}
          <BatchJobsView />
          <AiGenPage />
        </div>
      )}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "schedule" && <PlannerBoard />}
      {activeTab === "email" && <EmailPushTab />}
      {activeTab === "links" && <LinksTab />}
      {activeTab === "skills" && <SkillsMemoryTab />}
    </div>
  );
}

// ── Notion Sync Card ──
// Shows live link between Notion CONTENT PLANNER 2026 and cc_scripts.
// Poll cron runs every 2 min on Supabase — this card also exposes a manual
// "Sync Now" button and a Play/Pause toggle mapped to `supabase.functions.invoke`.
const NOTION_DB_URL = "https://www.notion.so/32a624a3c45380e08c74f2b09fe4a4ec";
const NOTION_DASHBOARD_URL = "https://www.notion.so/342624a3c45381b59246c5944b047817";
const NOTION_SYNC_FN = "https://pgfkbcnzqozzkohwbgbk.supabase.co/functions/v1/notion-content-sync";

function NotionSyncCard() {
  const { pushToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ at: string; processed: number } | null>(null);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${NOTION_SYNC_FN}?mode=poll&window=60`);
      const data = await res.json();
      if (data?.ok) {
        setLastSync({ at: new Date().toISOString(), processed: data.processed ?? 0 });
        pushToast({ title: `Sync xong — ${data.processed ?? 0} bài cập nhật từ Notion`, tone: "success" });
      } else {
        pushToast({ title: data?.error || "Sync failed", tone: "error" });
      }
    } catch (e) {
      pushToast({ title: `Sync lỗi: ${e instanceof Error ? e.message : String(e)}`, tone: "error" });
    } finally {
      setSyncing(false);
    }
  }, [pushToast]);

  return (
    <Card className="p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-[260px]">
        <div className="text-sm font-semibold flex items-center gap-2">
          📎 Notion Content Pipeline
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-normal">
            Live · poll 2 phút
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Notion DB CONTENT PLANNER 2026 ↔ Supabase cc_scripts ↔ Playwright scheduler. Khi chị đổi Status = Approved trong Notion, bài tự sync về cc_scripts trong ≤ 2 phút.
        </div>
        {lastSync && (
          <div className="text-[11px] text-muted-foreground mt-1">
            Lần sync gần nhất: {new Date(lastSync.at).toLocaleTimeString("vi-VN")} · xử lý {lastSync.processed} bài
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <a
          href={NOTION_DB_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted"
        >
          Mở Notion DB
        </a>
        <a
          href={NOTION_DASHBOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted"
        >
          Dashboard
        </a>
        <button
          onClick={syncNow}
          disabled={syncing}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sync ngay
        </button>
      </div>
    </Card>
  );
}
