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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
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
            style={{ backgroundColor: selectedCompany.brandColor }}
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

        <SidebarSection label="Kênh Chat">
          <SidebarNavItem
            to="/channels/inbox"
            label="Hộp thư"
            icon={Inbox}
            badge={totalUnread > 0 ? totalUnread : inboxBadge.inbox}
            badgeTone={totalUnread > 0 ? "danger" : inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={totalUnread > 0 || inboxBadge.failedRuns > 0}
          />
          <SidebarNavItem to="/channels/settings" label="Cài đặt kênh" icon={Settings} />
          <SidebarNavItem to="/war-room" label="War Room" icon={Zap} />
          <SidebarNavItem to="/agents-config/sessions" label="Phiên Agent" icon={Activity} />
        </SidebarSection>

        <SidebarSection label="Vận hành">
          <SidebarNavItem to="/ops/content-pipeline" label="Content Pipeline" icon={Activity} />
          <SidebarNavItem to="/ops/affiliate" label="Affiliate & CTV" icon={UserCircle} />
          <SidebarNavItem to="/ops/scanner" label="GEM Scanner" icon={Search} />
        </SidebarSection>

        <SidebarSection label="Trung tâm Nội dung">
          <SidebarNavItem to="/cc" label="Tổng quan" icon={LayoutDashboard} end />
          <SidebarNavItem to="/cc/ai-gen" label="AI Tạo Nội dung" icon={Sparkles} />
          <SidebarNavItem to="/cc/scripts" label="Kịch bản" icon={FileText} />
          <SidebarNavItem to="/cc/calendar" label="Lịch đăng bài" icon={Calendar} />
          <SidebarNavItem to="/cc/repurpose" label="Tái sử dụng" icon={RefreshCw} />
          <SidebarNavItem to="/cc/analytics" label="Thống kê" icon={BarChart3} />
          <SidebarNavItem to="/cc/image-gen" label="Tạo hình" icon={Image} />
          <SidebarNavItem to="/cc/video-reels" label="Video & Reels" icon={Video} />
          <SidebarNavItem to="/cc/email" label="Email Campaign" icon={Mail} />
          <SidebarNavItem to="/cc/funnels" label="Phễu chuyển đổi" icon={Filter} />
          <SidebarNavItem to="/cc/settings" label="Cài đặt CC" icon={Settings} />
        </SidebarSection>

        <SidebarSection label="Cấu hình">
          <SidebarNavItem to="/agents-config" label="Cấu hình Agent LLM" icon={Database} />
          <SidebarNavItem to="/config" label="Trung tâm Cấu hình" icon={Settings} />
        </SidebarSection>

        <SidebarSection label="CRM">
          <SidebarNavItem to="/crm" label="Tổng quan CRM" icon={BarChart3} end />
          <SidebarNavItem to="/crm/customers" label="Khách hàng" icon={UserCircle} />
          <SidebarNavItem to="/crm/tickets" label="Phiếu hỗ trợ" icon={Ticket} />
          <SidebarNavItem to="/crm/orders" label="Đơn hàng" icon={ShoppingBag} />
          <SidebarNavItem to="/crm/campaigns" label="Email Campaigns" icon={Mail} />
          <SidebarNavItem to="/crm/knowledge-base" label="Knowledge Base" icon={BookOpen} />
        </SidebarSection>

        <SidebarSection label="Work">
          <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />
          <SidebarNavItem to="/routines" label="Routines" icon={Repeat} textBadge="Beta" textBadgeTone="amber" />
          <SidebarNavItem to="/goals" label="Goals" icon={Target} />
          <SidebarNavItem to="/workflows" label="Workflows" icon={Activity} />
          <SidebarNavItem to="/channels/qa" label="Đánh giá & Trí tuệ" icon={BarChart3} />
          <SidebarNavItem to="/ops/console" label="Console" icon={Terminal} />
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label="Company">
          <SidebarNavItem to="/org" label="Org" icon={Network} />
          <SidebarNavItem to="/skills" label="Skills" icon={Boxes} />
          <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Activity" icon={History} />
        </SidebarSection>

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
