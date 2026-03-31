// Capabilities Grid — 12 interactive cards with stats + quick actions
// Each card: icon + title + status dot + stats + action buttons + navigate

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import {
  MessageSquare, Package, BarChart3, Mail, Ticket, BookOpen,
  Target, TrendingUp, Zap, FileText, Users, Search,
  Inbox, RefreshCw, Settings, Plus, AlertTriangle, LayoutGrid,
  Upload, Flame, ArrowDown, Send, Eye, Bell, Pencil,
} from "lucide-react";
import { PulseDot } from "./PulseDot";
import { channelsApi } from "@/api/channels";
import { crmApi } from "@/api/crm";

function formatVND(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "TR";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

interface CardAction {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
}

function CapCard({
  icon: Icon, title, statusDot, badge,
  stats, actions, onClick, disabled,
}: {
  icon: typeof MessageSquare;
  title: string;
  statusDot?: "green" | "yellow" | "red" | null;
  badge?: string;
  stats: string[];
  actions: CardAction[];
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-xl border bg-card p-3.5 transition-all ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
      }`}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
          {badge}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold flex-1 truncate">{title}</span>
        {statusDot && <PulseDot color={statusDot === "green" ? "bg-green-500" : statusDot === "yellow" ? "bg-yellow-500" : "bg-red-500"} />}
      </div>

      {/* Stats */}
      <div className="space-y-0.5 mb-2.5">
        {stats.map((s, i) => (
          <p key={i} className="text-[10px] text-muted-foreground leading-tight">{s}</p>
        ))}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {actions.map((a, i) => {
            const AIcon = a.icon;
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); a.onClick(); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <AIcon className="h-3 w-3" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CapabilitiesGrid() {
  const navigate = useNavigate();

  const { data: chStats } = useQuery({
    queryKey: ["channel-stats"],
    queryFn: () => channelsApi.getStats(),
    staleTime: 30_000,
  });

  const { data: crmStats } = useQuery({
    queryKey: ["crm", "stats"],
    queryFn: () => crmApi.getStats(),
    staleTime: 30_000,
  });

  const { data: ticketStats } = useQuery({
    queryKey: ["crm", "ticket-stats"],
    queryFn: () => crmApi.getTicketStats(),
    staleTime: 30_000,
  });

  const { data: orderStats } = useQuery({
    queryKey: ["crm", "order-stats"],
    queryFn: () => crmApi.getOrderStats(),
    staleTime: 30_000,
  });

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Tính năng</h3>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {/* 1. Kênh Chat */}
        <CapCard
          icon={MessageSquare}
          title="Kênh Chat"
          statusDot={(chStats?.channels || []).some((c: any) => c.status === "connected") ? "green" : "red"}
          stats={[
            `${(chStats?.channels || []).length} kênh · ${(chStats?.channels || []).filter((c: any) => c.status === "connected").length} đang kết nối`,
            `Tin nhắn: ${chStats?.messagesInboundToday || 0} · Đã xử lý: ${chStats?.messagesHandledToday || 0}`,
          ]}
          actions={[
            { label: "Mở Inbox", icon: Inbox, onClick: () => navigate("/channels/inbox") },
            { label: "Cấu hình", icon: Settings, onClick: () => navigate("/channels/settings") },
          ]}
          onClick={() => navigate("/channels/inbox")}
        />

        {/* 2. Đơn hàng */}
        <CapCard
          icon={Package}
          title="Đơn hàng"
          badge={orderStats?.pending_payment ? String(orderStats.pending_payment) : undefined}
          stats={[
            `Tháng: ${orderStats?.month_orders || 0} đơn · ${formatVND(orderStats?.month_revenue || 0)}₫`,
            `Hôm nay: ${orderStats?.today_orders || 0} đơn · ${orderStats?.pending_payment || 0} chờ TT`,
          ]}
          actions={[
            { label: "Tạo đơn", icon: Plus, onClick: () => navigate("/crm/orders") },
            { label: "Chờ xử lý", icon: AlertTriangle, onClick: () => navigate("/crm/orders?status=pending_payment") },
          ]}
          onClick={() => navigate("/crm/orders")}
        />

        {/* 3. CRM */}
        <CapCard
          icon={BarChart3}
          title="CRM"
          stats={[
            `${crmStats?.totalCustomers || 0} khách · ${crmStats?.newToday || 0} mới hôm nay`,
            `Doanh thu: ${formatVND(crmStats?.totalRevenue || 0)}₫`,
          ]}
          actions={[
            { label: "Thêm khách", icon: Plus, onClick: () => navigate("/crm/customers") },
            { label: "Import", icon: ArrowDown, onClick: () => navigate("/crm/import") },
          ]}
          onClick={() => navigate("/crm")}
        />

        {/* 4. Email Campaigns */}
        <CapCard
          icon={Mail}
          title="Email Campaigns"
          stats={[
            "Xem và quản lý chiến dịch email",
          ]}
          actions={[
            { label: "Tạo campaign", icon: Plus, onClick: () => navigate("/crm/campaigns") },
          ]}
          onClick={() => navigate("/crm/campaigns")}
        />

        {/* 5. Phiếu hỗ trợ */}
        <CapCard
          icon={Ticket}
          title="Phiếu hỗ trợ"
          statusDot={(ticketStats?.urgent || 0) > 0 ? "red" : null}
          badge={(ticketStats?.urgent || 0) > 0 ? `${ticketStats.urgent} urgent` : undefined}
          stats={[
            `${ticketStats?.open || 0} đang mở · ${ticketStats?.urgent || 0} khẩn cấp`,
            `Escalated: ${ticketStats?.escalated || 0}`,
          ]}
          actions={[
            { label: "Tạo phiếu", icon: Plus, onClick: () => navigate("/crm/tickets") },
            { label: "Kanban", icon: LayoutGrid, onClick: () => navigate("/crm/tickets?view=kanban") },
          ]}
          onClick={() => navigate("/crm/tickets")}
        />

        {/* 6. Knowledge Base */}
        <CapCard
          icon={BookOpen}
          title="Knowledge Base"
          stats={[
            "Collections, tài liệu, FAQ",
          ]}
          actions={[
            { label: "Upload", icon: Upload, onClick: () => navigate("/crm/knowledge-base") },
            { label: "Test tìm kiếm", icon: Search, onClick: () => navigate("/crm/knowledge-base") },
          ]}
          onClick={() => navigate("/crm/knowledge-base")}
        />

        {/* 7. Audiences */}
        <CapCard
          icon={Target}
          title="Custom Audiences"
          stats={[
            "Facebook Custom Audiences + Lookalike",
            `${crmStats?.totalCustomers || 0} khách có thể target`,
          ]}
          actions={[
            { label: "Xem tệp", icon: Eye, onClick: () => navigate("/crm/audiences") },
          ]}
          onClick={() => navigate("/crm/audiences")}
        />

        {/* 8. Quảng cáo & Attribution */}
        <CapCard
          icon={TrendingUp}
          title="Quảng cáo & Attribution"
          stats={[
            "CAPI + UTM + ROAS tracking",
            `${orderStats?.month_orders || 0} conversions tháng này`,
          ]}
          actions={[
            { label: "Xem báo cáo", icon: BarChart3, onClick: () => navigate("/crm/analytics") },
          ]}
          onClick={() => navigate("/crm/analytics")}
        />

        {/* 9. War Room */}
        <CapCard
          icon={Zap}
          title="War Room"
          statusDot="green"
          stats={[
            "6 channels · Realtime alerts",
          ]}
          actions={[
            { label: "Mở War Room", icon: MessageSquare, onClick: () => navigate("/war-room") },
            { label: "Alerts", icon: Bell, onClick: () => navigate("/war-room") },
          ]}
          onClick={() => navigate("/war-room")}
        />

        {/* 10. Content Pipeline */}
        <CapCard
          icon={FileText}
          title="Content Pipeline"
          stats={["Tạo + duyệt + đăng nội dung"]}
          actions={[
            { label: "Chạy Pipeline", icon: Zap, onClick: () => navigate("/ops/content-pipeline") },
          ]}
          onClick={() => navigate("/ops/content-pipeline")}
        />

        {/* 11. Affiliate & CTV */}
        <CapCard
          icon={Users}
          title="Affiliate & CTV"
          stats={["Quản lý CTV · KOL · Hoa hồng"]}
          actions={[
            { label: "Duyệt đơn", icon: Plus, onClick: () => navigate("/ops/affiliate") },
          ]}
          onClick={() => navigate("/ops/affiliate")}
        />

        {/* 12. Scanner */}
        <CapCard
          icon={Search}
          title="GEM Scanner"
          stats={["24 patterns · 437+ coins"]}
          actions={[
            { label: "Quét ngay", icon: Zap, onClick: () => navigate("/ops/scanner") },
          ]}
          onClick={() => navigate("/ops/scanner")}
        />
      </div>
    </div>
  );
}
