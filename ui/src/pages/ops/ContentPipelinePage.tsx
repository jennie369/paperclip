// Content Pipeline Page — 6 tabs + clickable stats cards + quick actions

import React, { useState, useCallback, useEffect } from "react";
import { useUIOrder } from "@/hooks/useUIOrder";
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
import { GenerationJobsBlock } from "./components/GenerationJobsBlock";
import MediaGallerySection from "../content-center/components/MediaGallerySection";

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

// ─── Block IDs for top-level draggable sections ───────────────────────────────
const DEFAULT_BLOCKS = [
  "publish-triggers",
  "stats",
  "notion-sync",
  "tab-nav",
] as const;
type BlockId = typeof DEFAULT_BLOCKS[number];

// ─── AiGen tab section ordering ──────────────────────────────────────────────
const DEFAULT_AIGEN_SECTIONS = ["batch-gen", "ai-gen", "media-gallery", "gen-jobs"] as const;
type AigenSectionId = typeof DEFAULT_AIGEN_SECTIONS[number];

/** Chuyển tab object array thành key array để dùng với useUIOrder */
function tabKeysToTabs(keys: TabKey[]): Tab[] {
  const byKey = new Map(DEFAULT_TABS.map((t) => [t.key, t]));
  const ordered: Tab[] = [];
  for (const key of keys) {
    const hit = byKey.get(key);
    if (hit) { ordered.push(hit); byKey.delete(key); }
  }
  for (const tab of byKey.values()) ordered.push(tab);
  return ordered;
}

export function ContentPipelinePage() {
  // ── Persistent order via useUIOrder (localStorage cache + Supabase SSOT) ──
  const DEFAULT_TAB_KEYS = DEFAULT_TABS.map((t) => t.key) as TabKey[];
  const [tabKeys, setTabKeys] = useUIOrder<TabKey>('pipeline.tabs.v1', DEFAULT_TAB_KEYS);
  const tabs = tabKeysToTabs(tabKeys);

  const [blocks, setBlocks] = useUIOrder<BlockId>(
    'pipeline.blocks.v1',
    [...DEFAULT_BLOCKS] as BlockId[],
  );
  const [aigenSections, setAigenSections] = useUIOrder<AigenSectionId>(
    'pipeline.aigenSections.v1',
    [...DEFAULT_AIGEN_SECTIONS] as AigenSectionId[],
  );

  // 2026-04-19 — Read initial tab từ URL `?tab=xxx` để right-click open new tab hoạt động.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const fromUrl = new URL(window.location.href).searchParams.get('tab');
      if (fromUrl) return fromUrl as TabKey;
    } catch {}
    return tabKeys[0] ?? "aigen";
  });
  const [dragKey, setDragKey] = useState<TabKey | null>(null);

  // Block-level drag state
  const [dragBlock, setDragBlock] = useState<BlockId | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<BlockId | null>(null);

  // AiGen tab section drag state
  const [dragAigenSection, setDragAigenSection] = useState<AigenSectionId | null>(null);
  const [dragOverAigenSection, setDragOverAigenSection] = useState<AigenSectionId | null>(null);

  const reorderAigenSection = useCallback((src: AigenSectionId, dst: AigenSectionId) => {
    if (src === dst) return;
    // useUIOrder#setOrder nhận T[] trực tiếp, KHÔNG phải functional updater
    // Dùng functional updater sẽ pass function object → save sai vào localStorage
    const current = aigenSections.slice();
    const si = current.indexOf(src);
    const di = current.indexOf(dst);
    if (si === -1 || di === -1) return;
    current.splice(si, 1);
    current.splice(di, 0, src);
    setAigenSections(current);
  }, [aigenSections, setAigenSections]);

  const reorderBlock = useCallback((src: BlockId, dst: BlockId) => {
    if (src === dst) return;
    const current = blocks.slice();
    const si = current.indexOf(src);
    const di = current.indexOf(dst);
    if (si === -1 || di === -1) return;
    current.splice(si, 1);
    current.splice(di, 0, src);
    setBlocks(current);
  }, [blocks, setBlocks]);

  const reorderTab = useCallback((sourceKey: TabKey, targetKey: TabKey) => {
    if (sourceKey === targetKey) return;
    const current = tabKeys.slice();
    const src = current.indexOf(sourceKey);
    const dst = current.indexOf(targetKey);
    if (src === -1 || dst === -1) return;
    const [moved] = current.splice(src, 1);
    current.splice(dst, 0, moved);
    setTabKeys(current);
  }, [tabKeys, setTabKeys]);

  const [bulkApproving, setBulkApproving] = useState(false);
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();

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

  const execScript = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/ops/content-pipeline/execute/${key}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json().catch(() => ({})); pushToast({ title: (err as any).error || "Lỗi", tone: "error" }); return; }
      pushToast({ title: `Đã trigger ${key}`, tone: "success" });
    } catch { pushToast({ title: "Lỗi kết nối", tone: "error" }); }
  }, [pushToast]);

  const handleBulkApprove = useCallback(async () => {
    setBulkApproving(true);
    try {
      const scriptsRes = await fetch("/api/ops/content-pipeline/scripts?status=draft&limit=200");
      const scriptsList = await scriptsRes.json();
      const drafts = scriptsList || [];
      if (!drafts.length) { pushToast({ title: "Không có bài chờ duyệt", tone: "info" }); setBulkApproving(false); return; }

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

  // ── drag helpers for blocks ──────────────────────────────────────────────────
  // Tách 2 set props để text-selection trong block không bị browser intercept
  // thành drag-start. Wrapper CHỈ là drop-target, drag-source phải gắn vào
  // handle ⠿ riêng. Trước đây wrapper có draggable=true → bôi text bất cứ
  // đâu trong block đều trigger drag → user không bôi được. Incident 28/04.
  const blockDropTargetProps = (id: BlockId) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverBlock(id); },
    onDragLeave: () => setDragOverBlock(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragBlock && dragBlock !== id) reorderBlock(dragBlock, id);
      setDragBlock(null); setDragOverBlock(null);
    },
  });
  const blockDragSourceProps = (id: BlockId) => ({
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      setDragBlock(id);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => { setDragBlock(null); setDragOverBlock(null); },
  });
  // Backwards-compat alias — keep until all renderBlock cases migrated.
  const blockDragProps = blockDropTargetProps;

  // Drag handle indicator style
  const blockWrapCls = (id: BlockId) =>
    `relative group/block transition-all duration-150 ${dragBlock === id ? "opacity-40 scale-[0.99]" : ""} ${dragOverBlock === id && dragBlock !== id ? "ring-2 ring-primary/50 rounded-xl" : ""}`;
  const dragHandleCls = "absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover/block:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing z-10 text-muted-foreground select-none";

  // ── render blocks ─────────────────────────────────────────────────────────────
  const renderBlock = (id: BlockId) => {
    switch (id) {

      case "publish-triggers":
        return (
          <div key={id} className={blockWrapCls(id)} {...blockDragProps(id)}>
            <span className={dragHandleCls} title="Kéo để đổi vị trí" {...blockDragSourceProps(id)}>⠿</span>
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
                      const r = await fetch("/api/ops/content-pipeline/publish-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
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
                      const r = await fetch("/api/ops/content-pipeline/publish-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force_all: true }) });
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
          </div>
        );

      case "stats":
        return (
          <div key={id} className={blockWrapCls(id)} {...blockDragProps(id)}>
            <span className={dragHandleCls} title="Kéo để đổi vị trí" {...blockDragSourceProps(id)}>⠿</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("schedule")}>
                <div className="text-xl font-bold text-center">{posted}/{target}</div>
                <div className="text-[10px] text-muted-foreground text-center">Đã đăng hôm nay</div>
                <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => execScript("daily_post")} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500/20"><Play className="h-2.5 w-2.5 inline mr-0.5" />Đăng ngay</button>
                  <button onClick={() => navigate('/GEM/cc/calendar')} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80"><CalIcon className="h-2.5 w-2.5 inline mr-0.5" />Lịch CC</button>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:ring-2 hover:ring-orange-500/30 transition-all" onClick={() => setActiveTab("content")}>
                <div className="text-xl font-bold text-center">{pending}</div>
                <div className="text-[10px] text-muted-foreground text-center">Chờ duyệt</div>
                <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
                  <button onClick={handleBulkApprove} disabled={bulkApproving} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500/20 disabled:opacity-50">
                    {bulkApproving ? <Loader2 className="h-2.5 w-2.5 inline animate-spin mr-0.5" /> : <CheckCircle className="h-2.5 w-2.5 inline mr-0.5" />}Duyệt tất cả
                  </button>
                  <button onClick={async () => { const res = await fetch("/api/ops/content-pipeline/compliance-check-all", { method: "POST" }); const data = await res.json().catch(() => ({})); pushToast({ title: data?.message || "Compliance check done", tone: data?.violations ? "error" : "success" }); }} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20">Compliance</button>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:ring-2 hover:ring-blue-500/30 transition-all" onClick={() => { setActiveTab("pipeline"); setTimeout(() => document.getElementById("generation-jobs")?.scrollIntoView({ behavior: "smooth" }), 100); }}>
                <div className="text-xl font-bold text-center">{generating}</div>
                <div className="text-[10px] text-muted-foreground text-center">Đang tạo</div>
                <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => execScript("batch_generate")} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-600 rounded-full hover:bg-violet-500/20"><Play className="h-2.5 w-2.5 inline mr-0.5" />Generate</button>
                  <button onClick={async () => { await fetch("/api/ops/content-pipeline/jobs/retry-failed", { method: "POST" }); qc.invalidateQueries({ queryKey: ["ops"] }); pushToast({ title: "Retry failed jobs", tone: "success" }); }} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full hover:bg-red-500/20"><RefreshCw className="h-2.5 w-2.5 inline mr-0.5" />Retry</button>
                </div>
              </Card>
              <Card className="p-3 cursor-pointer hover:ring-2 hover:ring-foreground/10 transition-all" onClick={() => setActiveTab("content")}>
                <div className="text-xl font-bold text-center">{total}</div>
                <div className="text-[10px] text-muted-foreground text-center">Tổng nội dung</div>
                <div className="flex gap-1 mt-2 justify-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate('/GEM/cc/scripts')} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80">Xem tất cả</button>
                  <button onClick={() => navigate('/GEM/cc/ai-gen')} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-600 rounded-full hover:bg-violet-500/20">✨ Tạo mới</button>
                </div>
              </Card>
            </div>
          </div>
        );

      case "notion-sync":
        return (
          <div key={id} className={blockWrapCls(id)} {...blockDragProps(id)}>
            <span className={dragHandleCls} title="Kéo để đổi vị trí" {...blockDragSourceProps(id)}>⠿</span>
            <NotionSyncCard />
          </div>
        );

      case "tab-nav":
        return (
          <div key={id} className={`${blockWrapCls(id)} space-y-0`} {...blockDragProps(id)}>
            <span className={dragHandleCls} title="Kéo để đổi vị trí" {...blockDragSourceProps(id)}>⠿</span>
            {/* Tab bar — 2026-04-19 fix: dùng <a href> để right-click mở new tab/window được.
                Drag-reorder chuyển qua handle "⋮⋮" riêng để không intercept click selection text.
                2026-05-07: dùng dataTransfer thay vì state để tránh stale closure trong onDrop. */}
            <div className="flex border-b overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.key}
                  className={`group flex items-center shrink-0 border-b-2 transition-colors ${
                    activeTab === tab.key ? "border-primary" : "border-transparent hover:border-border"
                  } ${dragKey === tab.key ? "opacity-50" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const src = e.dataTransfer.getData("text/tab-key") as TabKey;
                    if (src && src !== tab.key) reorderTab(src, tab.key);
                    setDragKey(null);
                  }}
                >
                  <a
                    href={`?tab=${tab.key}`}
                    onClick={(e) => {
                      // Cho middle/ctrl/cmd/shift click qua native (open new tab/window)
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      setActiveTab(tab.key);
                      try {
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', tab.key);
                        window.history.replaceState(null, '', url.toString());
                      } catch {}
                    }}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none ${
                      activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </a>
                  {/* Drag handle riêng — chỉ visible khi hover để bớt làm phân tán */}
                  <span
                    draggable
                    onDragStart={(e) => {
                      setDragKey(tab.key);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/tab-key", tab.key);
                      e.stopPropagation();
                    }}
                    onDragEnd={() => setDragKey(null)}
                    className="px-1 text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing select-none"
                    title="Kéo thả để đổi vị trí tab"
                    aria-label="Kéo thả để đổi vị trí tab"
                  >
                    ⋮⋮
                  </span>
                </div>
              ))}
            </div>
            {/* Tab content */}
            {activeTab === "pipeline" && <PipelineTab onSwitchTab={(tab) => setActiveTab(tab as TabKey)} />}
            {activeTab === "aigen" && (
              <div className="cc-scope space-y-4">
                <p className="text-[10px] text-muted-foreground opacity-60 -mb-2">
                  💡 Kéo handle ⠿ để đổi thứ tự các section — thứ tự được lưu tự động.
                </p>
                {aigenSections.map((sectionId) => {
                  const isBeingDragged = dragAigenSection === sectionId;
                  const isDragTarget = dragOverAigenSection === sectionId && dragAigenSection !== sectionId;
                  const anyDragging = dragAigenSection !== null;
                  const wrapCls = `relative group/aigen-block transition-all duration-150 ${
                    isBeingDragged ? "opacity-40 scale-[0.99]" : ""
                  } ${isDragTarget ? "ring-2 ring-primary/50 rounded-xl" : ""}`;

                  const dropTargetProps = {
                    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverAigenSection(sectionId); },
                    onDragLeave: () => setDragOverAigenSection(null),
                    onDrop: (e: React.DragEvent) => {
                      e.preventDefault();
                      if (dragAigenSection && dragAigenSection !== sectionId) reorderAigenSection(dragAigenSection, sectionId);
                      setDragAigenSection(null); setDragOverAigenSection(null);
                    },
                  };

                  // Drag bar nhỏ gọn ở đầu section — chỉ có ký hiệu kéo, không có label
                  // (label đã có trong nội dung component bên trong, tránh duplicate)
                  const DragBar = (
                    <div
                      className={`flex items-center gap-2 px-2 py-1 rounded-t-md border-b select-none cursor-grab active:cursor-grabbing ${
                        isDragTarget ? 'bg-primary/10 border-primary/40' : 'border-border/50 bg-muted/20'
                      }`}
                      draggable
                      title="Kéo để đổi vị trí"
                      onDragStart={(e) => {
                        setDragAigenSection(sectionId);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/aigen-section", sectionId);
                      }}
                      onDragEnd={() => { setDragAigenSection(null); setDragOverAigenSection(null); }}
                    >
                      <span className="text-muted-foreground/60 text-sm leading-none select-none">⠿⠿</span>
                      <span className="text-[10px] text-muted-foreground/40 ml-1">kéo để đổi vị trí</span>
                    </div>
                  );

                  if (sectionId === "batch-gen") return (
                    <div key="batch-gen" className={wrapCls} {...dropTargetProps}>
                      {DragBar}
                      {/* overlay ngăn content bắt pointer events khi đang drag section khác */}
                      {anyDragging && !isBeingDragged && (
                        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'all' }} />
                      )}
                      <BatchJobsView />
                    </div>
                  );

                  if (sectionId === "ai-gen") return (
                    <div key="ai-gen" className={wrapCls} {...dropTargetProps}>
                      {DragBar}
                      {anyDragging && !isBeingDragged && (
                        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'all' }} />
                      )}
                      <AiGenPage />
                    </div>
                  );

                  if (sectionId === "media-gallery") return (
                    <div key="media-gallery" className={wrapCls} {...dropTargetProps}>
                      {DragBar}
                      {anyDragging && !isBeingDragged && (
                        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'all' }} />
                      )}
                      <MediaGallerySection />
                    </div>
                  );

                  if (sectionId === "gen-jobs") return (
                    <div key="gen-jobs" className={wrapCls} {...dropTargetProps}>
                      {DragBar}
                      {anyDragging && !isBeingDragged && (
                        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'all' }} />
                      )}
                      <GenerationJobsBlock />
                    </div>
                  );

                  return null;
                })}
              </div>
            )}
            {activeTab === "content" && <ContentTab />}
            {activeTab === "schedule" && <PlannerBoard />}
            {activeTab === "email" && <EmailPushTab />}
            {activeTab === "links" && <LinksTab />}
            {activeTab === "skills" && <SkillsMemoryTab />}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Content Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{posted}/{target} bài/ngày · 3 tài khoản · 8 segment email</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 opacity-60">💡 Kéo thả các section (hover để thấy handle ⠿) để đổi vị trí — thứ tự được lưu tự động.</p>
      </div>
      {blocks.map(renderBlock)}
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
