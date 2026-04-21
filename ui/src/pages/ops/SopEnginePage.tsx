// SOP Engine Page — 7-tab shell matching SOP Knowledge Manager v2 HTML.
//
// User-configurable tab order: tabs can be dragged to reorder. Order is
// persisted in localStorage under 'sop-engine-tab-order' so each user keeps
// their preferred layout. Pipelines is first by default per the original
// requirement, but user can override.
//
// Theme: uses semantic tokens (bg-background, text-foreground, border-border)
// so it respects Paperclip light/dark mode.
//
// Built 2026-04-08 as part of Phase 1 of the SOP Engine v2 refactor.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// SopMappingTab (legacy SOP Engine v1 list view) was removed 2026-04-10 —
// its functionality is now covered by Pipelines tab (workflow view) and
// Knowledge Library tab (file browser). Keeping it around was causing
// confusion about which tab is the canonical source of truth for SOPs.

// Lazy-load the heavier tabs so the default Pipelines tab paints fast.
const PipelinesTab = lazy(() => import('./sop-engine/PipelinesTab'));
const WorkflowStepsTab = lazy(() => import('./sop-engine/WorkflowStepsTab'));
// BatchGeneratorTab was moved into Content Pipeline → Nội Dung tab as a
// view-mode toggle (2026-04-10). No longer a standalone tab here.
const RegistryMarketplaceTab = lazy(() => import('./sop-engine/RegistryMarketplaceTab'));
const MindMapTab = lazy(() => import('./sop-engine/MindMapTab'));
const KnowledgeLibraryTab = lazy(() => import('./sop-engine/KnowledgeLibraryTab'));
const KnowledgeMappingTab = lazy(() =>
  import('./sop-engine/KnowledgeMappingTab').then((m) => ({ default: m.KnowledgeMappingTab })),
);
import { GlobalRegistrySearch, useGlobalSearchShortcut } from '@/components/sop-engine/GlobalRegistrySearch';
import { Search as SearchIcon } from 'lucide-react';

// ─── Tab config ──────────────────────────────────────────────────────────

interface TabDef {
  value: string;
  emoji: string;
  label: string;
  tooltip: string;
}

const DEFAULT_TABS: TabDef[] = [
  { value: 'pipelines',          emoji: '🔗', label: 'Pipelines',          tooltip: 'End-to-end pipelines với drag-drop. Pipelines tab mặc định mở đầu tiên — chứa 8 template (Content Biweekly, Email Biweekly, Sales Lead→Close, ...) và full workflow steps nested bên trong mỗi SOP block.' },
  { value: 'knowledge-mapping',  emoji: '🔗', label: 'SOP↔Knowledge',      tooltip: 'Gắn memory files vào từng SOP (gem_sops.knowledge_files). Pick từ 413 memory files — today.md, patterns.md, reports, decisions, SOPs, agents/*/daily — save trực tiếp vào DB.' },
  { value: 'workflow-steps',     emoji: '⚙️', label: 'Workflow Steps',     tooltip: 'Editor 9-field cho workflow steps — chọn SOP → thấy tất cả steps với drag-drop + auto-sync. Cùng component với nested editor trong Pipelines tab. (Phase 2)' },
  { value: 'knowledge-library',  emoji: '📚', label: 'Knowledge Library',  tooltip: 'Browse memory/ + knowledge files. Drag-drop vào Workflow Step Inputs/Outputs. (Phase 3)' },
  { value: 'registry',           emoji: '📋', label: 'Registry Marketplace', tooltip: 'Central hub: Agents, Skills, Plugins, MCP, Commands, Hooks, Channels, System. Import từ GitHub/Claude catalog. Cron & Heartbeats (23 jobs đã có). (Phase 3)' },
  { value: 'mindmap',            emoji: '🕸', label: 'Mind Map',           tooltip: 'Embed Mắt Thần CEO 3D graph với source mode SOP Engine. Nodes = Pipelines + SOPs + Agents. (Phase 5)' },
];

const STORAGE_KEY = 'sop-engine-tab-order';

function loadTabOrder(): TabDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TABS;
    const savedValues: string[] = JSON.parse(raw);
    if (!Array.isArray(savedValues)) return DEFAULT_TABS;
    const byValue = new Map(DEFAULT_TABS.map((t) => [t.value, t]));
    const ordered: TabDef[] = [];
    for (const v of savedValues) {
      const t = byValue.get(v);
      if (t) {
        ordered.push(t);
        byValue.delete(v);
      }
    }
    // Append any new tabs that weren't in the saved order
    byValue.forEach((t) => ordered.push(t));
    return ordered;
  } catch {
    return DEFAULT_TABS;
  }
}

function saveTabOrder(tabs: TabDef[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.map((t) => t.value)));
  } catch {
    /* ignore */
  }
}

// ─── Draggable tab trigger ────────────────────────────────────────────────

function DraggableTab({
  tab,
  isActive,
  onClick,
}: {
  tab: TabDef;
  isActive: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.value,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          onClick={onClick}
          className={`
            group relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap
            border-b-2 transition-colors cursor-pointer select-none
            ${isActive
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }
          `}
        >
          <button
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing -ml-1"
            onClick={(e) => e.stopPropagation()}
            aria-label="Kéo để sắp xếp tab"
          >
            <GripVertical className="size-3 text-muted-foreground" />
          </button>
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        {tab.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Phase placeholder (for stub tabs) ────────────────────────────────────

function PhasePlaceholder({ phase, name, features }: { phase: string; name: string; features: string[] }) {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="max-w-xl text-center space-y-4">
        <div className="text-5xl">🚧</div>
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">
          Tab này sẽ được triển khai trong <b className="text-primary">{phase}</b> của kế hoạch SOP Engine v2.
        </p>
        <div className="border border-border rounded-lg p-4 text-left bg-card">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tính năng dự kiến:</div>
          <ul className="text-xs text-foreground space-y-1">
            {features.map((f, i) => (
              <li key={i}>• {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export function SopEnginePage() {
  const [tabs, setTabs] = useState<TabDef[]>(() => loadTabOrder());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const first = loadTabOrder()[0];
    return first?.value || 'pipelines';
  });

  useEffect(() => {
    saveTabOrder(tabs);
  }, [tabs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [searchOpen, setSearchOpen] = useState(false);
  useGlobalSearchShortcut(() => setSearchOpen(true));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tabs.findIndex((t) => t.value === active.id);
    const newIdx = tabs.findIndex((t) => t.value === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setTabs((prev) => arrayMove(prev, oldIdx, newIdx));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col bg-background text-foreground">
        {/* Page header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>⚙️</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>SOP Engine v2</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  Trung tâm điều phối SOP Engine: Pipelines, SOP Mapping, Workflow Steps, Batch Generator, Knowledge Library, Registry Marketplace, Mind Map.
                  Tất cả đều drag-drop, centralized, auto-sync với cron registry và goal SSOT.
                </TooltipContent>
              </Tooltip>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pipelines · SOPs · Workflows · Knowledge · Registry · Mind Map — tất cả centralized
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted/50 hover:bg-muted border border-border rounded-md text-muted-foreground hover:text-foreground"
                >
                  <SearchIcon className="size-3.5" />
                  <span>Tìm kiếm trong tất cả registries...</span>
                  <kbd className="ml-1 px-1 py-0.5 bg-background border border-border rounded font-mono text-[10px]">⌘K</kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                Global search across 15 registries (MCP, Skills, Scripts, Plugins, Subagents, Rules, Docs, Edge Functions, Memory Files, Dropdowns...) + SOPs + Pipelines + Agents + Crons. Debounced 250ms. Ctrl+K mọi lúc.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-[11px] text-muted-foreground cursor-help">
                  15 registries · 1,415+ resources
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                Phase 0-5.5 DONE. Registry Marketplace unified 15 entity types. Cron registry 23 jobs. Goals SSOT. Real-time updates. Agent stub fixed. All DB-backed — no hardcoded dropdowns.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <GlobalRegistrySearch open={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Tab bar — draggable */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 border-b border-border overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tabs.map((t) => t.value)} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center gap-1 -mb-px">
                  {tabs.map((tab) => (
                    <DraggableTab
                      key={tab.value}
                      tab={tab}
                      isActive={activeTab === tab.value}
                      onClick={() => setActiveTab(tab.value)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="pipelines" className="m-0 h-full" forceMount hidden={activeTab !== 'pipelines'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Pipelines...</div>}>
                <PipelinesTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="knowledge-mapping" className="m-0 h-full" hidden={activeTab !== 'knowledge-mapping'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải SOP↔Knowledge mapping...</div>}>
                <KnowledgeMappingTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="workflow-steps" className="m-0 h-full" hidden={activeTab !== 'workflow-steps'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Workflow Steps...</div>}>
                <WorkflowStepsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="knowledge-library" className="m-0 h-full" hidden={activeTab !== 'knowledge-library'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Knowledge Library...</div>}>
                <KnowledgeLibraryTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="registry" className="m-0 h-full" hidden={activeTab !== 'registry'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Registry Marketplace...</div>}>
                <RegistryMarketplaceTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="mindmap" className="m-0 h-full" hidden={activeTab !== 'mindmap'}>
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Mind Map...</div>}>
                <MindMapTab />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default SopEnginePage;
