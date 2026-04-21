import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  Settings,
  MessageCircle,
  Zap,
  Activity,
  BarChart3,
  UserCircle,
  Ticket,
  ShoppingBag,
  Mail,
  BookOpen,
  Terminal,
  Database,
  Sparkles,
  FileText,
  Calendar,
  RefreshCw,
  Image,
  Video,
  Filter,
  ClipboardList,
  GripVertical
} from "lucide-react";
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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { DraggableSidebarSection } from "./DraggableSidebarSection";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { Button } from "@/components/ui/button";
import { PluginSlotOutlet } from "@/plugins/slots";
import { useSidebarStaticItems } from "../hooks/useSidebarStaticItems";

function useSectionOrder(defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sidebar-sections-order-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
           const combined = [...new Set([...parsed, ...defaultOrder])].filter(id => defaultOrder.includes(id));
           return combined;
        }
      }
    } catch {}
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-sections-order-v1", JSON.stringify(order));
  }, [order]);

  return [order, setOrder] as const;
}

function SortableSectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  return (
    <div
      ref={setNodeRef}
      {...{ style: {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        position: "relative",
      } }}
      className={`group/sectwrapper ${isDragging ? "opacity-80" : ""}`}
    >
      <div
         {...attributes}
         {...listeners}
         className="absolute -left-1 top-2 opacity-0 group-hover/sectwrapper:opacity-100 cursor-grab active:cursor-grabbing z-50 p-0.5"
       >
         <GripVertical className="size-3 text-muted-foreground" />
       </div>
      {children}
    </div>
  );
}


function SortableStaticItem({ id, children, isDragging }: { id: string, children: React.ReactNode, isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: selfDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: selfDragging ? 10 : 1, position: "relative" as const };
  return <div ref={setNodeRef} {...{ style: style }} {...attributes} {...listeners} className={selfDragging ? "opacity-50" : ""}>{children}</div>;
}

function StaticSectionWrapper({ sectionId, label, items, itemComponents, onLabelChange }: { sectionId: string, label: string, items: string[], itemComponents: Record<string, React.ReactNode>, onLabelChange: (val: string) => void }) {
  return (
    <SortableSectionWrapper id={sectionId}>
      <SidebarSection label={label} onLabelChange={onLabelChange}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5 min-h-[10px]">
            {items.map(itemId => itemComponents[itemId] ? (
              <SortableStaticItem key={itemId} id={itemId}>
                {itemComponents[itemId]}
              </SortableStaticItem>
            ) : null)}
          </div>
        </SortableContext>
      </SidebarSection>
    </SortableSectionWrapper>
  );
}

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { totalUnread } = useUnreadCount();
  // Activate notification sound globally
  useNotificationSound();
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;

  const ALL_SECTIONS = [
    "kenh-chat",
    "van-hanh",
    "trung-tam-noi-dung",
    "cau-hinh",
    "crm",
    "work",
    "projects",
    "agents",
    "company"
  ];
  const [sectionOrder, setSectionOrder] = useSectionOrder(ALL_SECTIONS);

    const { items: staticItems, handleDragOver: handleDragOverStatic, handleDragEnd: handleDragEndStatic } = useSidebarStaticItems();
    
    // Note: totalUnread, inboxBadge, selectedCompanyId, pluginContext etc. are in scope.
    const ITEM_COMPONENTS: Record<string, React.ReactNode> = {
      "/channels/inbox": <SidebarNavItem to="/channels/inbox" label="Hộp thư" icon={Inbox} badge={totalUnread > 0 ? totalUnread : inboxBadge.inbox} badgeTone={totalUnread > 0 ? "danger" : inboxBadge.failedRuns > 0 ? "danger" : "default"} alert={totalUnread > 0 || inboxBadge.failedRuns > 0} />,
      "/channels/settings": <SidebarNavItem to="/channels/settings" label="Cài đặt kênh" icon={Settings} />,
      "/war-room": <SidebarNavItem to="/war-room" label="War Room" icon={Zap} />,
      "/training": <SidebarNavItem to="/training" label="Phòng Training" icon={Activity} />,
      "/training/history": <SidebarNavItem to="/training/history" label="Lịch sử Training" icon={Activity} />,
      "/training/audit-log": <SidebarNavItem to="/training/audit-log" label="Tool Audit Log" icon={Activity} />,
      "/agents-config/sessions": <SidebarNavItem to="/agents-config/sessions" label="Phiên Agent" icon={Activity} />,
      "/ops/content-pipeline": <SidebarNavItem to="/ops/content-pipeline" label="Content Pipeline" icon={Activity} />,
      "/ops/sop-engine": <SidebarNavItem to="/ops/sop-engine" label="SOP Engine" icon={ClipboardList} />,
      "/ops/affiliate": <SidebarNavItem to="/ops/affiliate" label="Affiliate & CTV" icon={UserCircle} />,
      "/ops/scanner": <SidebarNavItem to="/ops/scanner" label="GEM Scanner" icon={Search} />,
      "/ops/knowledge-graph": <SidebarNavItem to="/ops/knowledge-graph" label="Mắt Thần CEO" icon={Network} />,
      "/analytics": <SidebarNavItem to="/analytics" label="Phân Tích MXH" icon={BarChart3} />,
      "/cc": <SidebarNavItem to="/cc" label="Tổng quan" icon={LayoutDashboard} end />,
      "/cc/ai-gen": <SidebarNavItem to="/cc/ai-gen" label="AI Tạo Nội dung" icon={Sparkles} />,
      "/cc/scripts": <SidebarNavItem to="/cc/scripts" label="Kịch bản" icon={FileText} />,
      "/cc/calendar": <SidebarNavItem to="/cc/calendar" label="Lịch đăng bài" icon={Calendar} />,
      "/cc/repurpose": <SidebarNavItem to="/cc/repurpose" label="Tái sử dụng" icon={RefreshCw} />,
      "/cc/analytics": <SidebarNavItem to="/cc/analytics" label="Thống kê" icon={BarChart3} />,
      "/cc/image-gen": <SidebarNavItem to="/cc/image-gen" label="Tạo hình" icon={Image} />,
      "/cc/video-reels": <SidebarNavItem to="/cc/video-reels" label="Video & Reels" icon={Video} />,
      "/cc/email": <SidebarNavItem to="/cc/email" label="Email Campaign" icon={Mail} />,
      "/cc/funnels": <SidebarNavItem to="/cc/funnels" label="Phễu chuyển đổi" icon={Filter} />,
      "/cc/settings": <SidebarNavItem to="/cc/settings" label="Cài đặt CC" icon={Settings} />,
      "/ops/sop-registry": <SidebarNavItem to="/ops/sop-engine" label="Registry Marketplace" icon={Database} />,
      "/agents-config": <SidebarNavItem to="/agents-config" label="Agent LLM (→ Registry)" icon={Database} textBadge="Deprecated" textBadgeTone="amber" />,
      "/config": <SidebarNavItem to="/config" label="Trung tâm Cấu hình (→ Registry)" icon={Settings} textBadge="Deprecated" textBadgeTone="amber" />,
      "/crm": <SidebarNavItem to="/crm" label="Tổng quan CRM" icon={BarChart3} end />,
      "/crm/customers": <SidebarNavItem to="/crm/customers" label="Khách hàng" icon={UserCircle} />,
      "/crm/tickets": <SidebarNavItem to="/crm/tickets" label="Phiếu hỗ trợ" icon={Ticket} />,
      "/crm/orders": <SidebarNavItem to="/crm/orders" label="Đơn hàng" icon={ShoppingBag} />,
      "/crm/campaigns": <SidebarNavItem to="/crm/campaigns" label="Email Campaigns" icon={Mail} />,
      "/crm/knowledge-base": <SidebarNavItem to="/crm/knowledge-base" label="Knowledge Base" icon={BookOpen} />,
      "/issues": <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />,
      "/routines": <SidebarNavItem to="/routines" label="Routines" icon={Repeat} textBadge="Beta" textBadgeTone="amber" />,
      "/goals": <SidebarNavItem to="/goals" label="Goals" icon={Target} />,
      "/workflows": <SidebarNavItem to="/workflows" label="Workflows" icon={Activity} />,
      "/channels/qa": <SidebarNavItem to="/channels/qa" label="Đánh giá & Trí tuệ" icon={BarChart3} />,
      "/ops/console": <SidebarNavItem to="/ops/console" label="Console" icon={Terminal} />,
      "/org": <SidebarNavItem to="/org" label="Org" icon={Network} />,
      "/skills": <SidebarNavItem to="/skills" label="Skills" icon={Boxes} />,
      "/costs": <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />,
      "/activity": <SidebarNavItem to="/activity" label="Activity" icon={History} />
    };

    const SECTION_LABELS: Record<string, string> = {
      "kenh-chat": "Kênh Chat",
      "van-hanh": "Vận hành",
      "trung-tam-noi-dung": "Trung tâm Nội dung",
      "cau-hinh": "Cấu hình",
      "crm": "CRM",
      "work": "Work",
      "company": "Company"
    };

  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("sidebar-custom-labels-v1");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("sidebar-custom-labels-v1", JSON.stringify(customLabels));
  }, [customLabels]);

  const handleUpdateSectionLabel = (sectionId: string, newLabel: string) => {
    setCustomLabels(prev => ({ ...prev, [sectionId]: newLabel }));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEndSections = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setSectionOrder((prev) => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    },
    [setSectionOrder]
  );

  const handleUniversalDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (typeof active.id === 'string' && active.id.startsWith('/')) {
        handleDragEndStatic(event);
      } else {
        handleDragEndSections(event);
      }
    },
    [handleDragEndSections, handleDragEndStatic]
  );

  const handleUniversalDragOver = useCallback(
    (event: DragEndEvent) => {
      const { active } = event;
      if (typeof active.id === 'string' && active.id.startsWith('/')) {
        handleDragOverStatic(event);
      }
    },
    [handleDragOverStatic]
  );

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className="w-60 h-full min-h-0 border-r border-border bg-background flex flex-col">
      {/* Top bar: Company name (bold) + Search — aligned with top sections (no visible border) */}
      <div className="flex items-center gap-1 px-3 h-12 shrink-0">
        {selectedCompany?.brandColor && (
          <div
            className="w-4 h-4 rounded-sm shrink-0 ml-1"
            {...{ style: { backgroundColor: selectedCompany.brandColor } }}
          />
        )}
        <span className="flex-1 text-sm font-bold text-foreground truncate pl-1">
          {selectedCompany?.name ?? "Select company"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide flex flex-col gap-4 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {/* New Issue button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">New Issue</span>
          </button>
          <SidebarNavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} liveCount={liveRunCount} />
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-[13px] font-medium"
            missingBehavior="placeholder"
          />
        </div>

        <DndContext id="universal-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUniversalDragEnd} onDragOver={handleUniversalDragOver}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map(sectionId => {
                if (sectionId === "projects") return <SortableSectionWrapper key={sectionId} id={sectionId}><SidebarProjects label={customLabels[sectionId] || "Projects"} onLabelChange={(val) => handleUpdateSectionLabel(sectionId, val)} /></SortableSectionWrapper>;
                if (sectionId === "agents") return <SortableSectionWrapper key={sectionId} id={sectionId}><SidebarAgents label={customLabels[sectionId] || "Agents"} onLabelChange={(val) => handleUpdateSectionLabel(sectionId, val)} /></SortableSectionWrapper>;
                
                return (
                  <StaticSectionWrapper 
                    key={sectionId}
                    sectionId={sectionId} 
                    label={customLabels[sectionId] || SECTION_LABELS[sectionId] || sectionId} 
                    onLabelChange={(val) => handleUpdateSectionLabel(sectionId, val)}
                    items={staticItems[sectionId] || []} 
                    itemComponents={ITEM_COMPONENTS} 
                  />
                );
              })}
            </SortableContext>
          </DndContext>

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />
      </nav>
    </aside>
  );
}
