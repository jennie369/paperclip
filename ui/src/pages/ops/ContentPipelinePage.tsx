// Content Pipeline Page — 6 tabs + clickable stats cards + quick actions

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Play, CheckCircle, RefreshCw, Loader2, Calendar as CalIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { opsApi } from "@/api/ops";
import { useToast } from "@/context/ToastContext";
import { PipelineTab } from "./tabs/PipelineTab";
import { ContentTab } from "./tabs/ContentTab";
import { EmailPushTab } from "./tabs/EmailPushTab";
import { LinksTab } from "./tabs/LinksTab";
import { SkillsMemoryTab } from "./tabs/SkillsMemoryTab";
import { PlannerBoard } from "@/components/ops/PlannerBoard";
import AiGenPage from "../content-center/CCAIGen";

const TABS = [
  { key: "pipeline", label: "Pipeline" },
  { key: "aigen", label: "✨ AI Tạo Nội Dung" },
  { key: "content", label: "Nội Dung" },
  { key: "schedule", label: "Lịch Nội Dung" },
  { key: "email", label: "Email & Push" },
  { key: "links", label: "Links" },
  { key: "skills", label: "Skills & Memory" },
] as const;

type TabKey = typeof TABS[number]["key"];

export function ContentPipelinePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
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

      {/* Stats cards — CLICKABLE + QUICK ACTIONS */}
      <div className="grid grid-cols-4 gap-3">
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

      {/* Tab bar */}
      <div className="flex border-b">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pipeline" && <PipelineTab onSwitchTab={(tab) => setActiveTab(tab as TabKey)} />}
      {activeTab === "aigen" && <div className="cc-scope"><AiGenPage /></div>}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "schedule" && <PlannerBoard />}
      {activeTab === "email" && <EmailPushTab />}
      {activeTab === "links" && <LinksTab />}
      {activeTab === "skills" && <SkillsMemoryTab />}
    </div>
  );
}
