const fs = require('fs');
const code = fs.readFileSync('ui/src/components/Sidebar.tsx', 'utf8');

let newCode = code.replace(
  `import { useSectionOrder } from "@/hooks/useSectionOrder";`,
  `import { useSectionOrder } from "@/hooks/useSectionOrder";\nimport { useSidebarStaticItems } from "@/hooks/useSidebarStaticItems";\nimport { useSortable } from "@dnd-kit/sortable";\nimport { CSS } from "@dnd-kit/utilities";\nimport { DraggableSidebarSection } from "./DraggableSidebarSection";\n`
);

const additions = `
function SortableStaticItem({ id, children, isDragging }: { id: string, children: React.ReactNode, isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: selfDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: selfDragging ? 10 : 1, position: "relative" as const };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={selfDragging ? "opacity-50" : ""}>{children}</div>;
}

function StaticSectionWrapper({ sectionId, label, items, itemComponents }: { sectionId: string, label: string, items: string[], itemComponents: Record<string, React.ReactNode> }) {
  // Use SortableContext for the items in this section
  return (
    <DraggableSidebarSection sectionId={sectionId} label={label}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5">
          {items.map(itemId => itemComponents[itemId] ? (
            <SortableStaticItem key={itemId} id={itemId}>
              {itemComponents[itemId]}
            </SortableStaticItem>
          ) : null)}
        </div>
      </SortableContext>
    </DraggableSidebarSection>
  );
}
`;

newCode = newCode.replace(
  `export function Sidebar() {`,
  additions + `\nexport function Sidebar() {`
);

const sectionRegistry = `
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
`;

newCode = newCode.replace(
  `  const [sectionOrder, setSectionOrder] = useSectionOrder(ALL_SECTIONS);`,
  `  const [sectionOrder, setSectionOrder] = useSectionOrder(ALL_SECTIONS);\n${sectionRegistry}`
);

const originalRenderStart = newCode.indexOf(`        <DndContext id="sections-context" sensors={sensors}`);
const originalRenderEnd = newCode.indexOf(`        </DndContext>`, originalRenderStart) + `        </DndContext>`.length;

const newRender = `        <DndContext id="items-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndStatic} onDragOver={handleDragOverStatic}>
          <DndContext id="sections-context" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSections}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map(sectionId => {
                if (sectionId === "projects") return <SidebarProjects key={sectionId} />;
                if (sectionId === "agents") return <SidebarAgents key={sectionId} />;
                
                return (
                  <StaticSectionWrapper 
                    key={sectionId}
                    sectionId={sectionId} 
                    label={SECTION_LABELS[sectionId]} 
                    items={staticItems[sectionId] || []} 
                    itemComponents={ITEM_COMPONENTS} 
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </DndContext>`;

newCode = newCode.substring(0, originalRenderStart) + newRender + newCode.substring(originalRenderEnd);
fs.writeFileSync('ui/src/components/Sidebar.tsx', newCode);
console.log("Done transforming.");
