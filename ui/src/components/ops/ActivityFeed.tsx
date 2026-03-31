// Activity Feed — recent activity with realtime updates

import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { Package, Ticket, MessageSquare, AlertTriangle, Zap } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "order" | "ticket" | "chat" | "alert" | "workflow";
  title: string;
  subtitle: string;
  timestamp: string;
  link?: string;
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "Vừa xong";
  if (ms < 3600000) return Math.round(ms / 60000) + " phút trước";
  if (ms < 86400000) return Math.round(ms / 3600000) + " giờ trước";
  return Math.round(ms / 86400000) + " ngày trước";
}

const typeConfig: Record<string, { icon: typeof Package; color: string }> = {
  order: { icon: Package, color: "text-blue-500 bg-blue-500/10" },
  ticket: { icon: Ticket, color: "text-orange-500 bg-orange-500/10" },
  chat: { icon: MessageSquare, color: "text-green-500 bg-green-500/10" },
  alert: { icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
  workflow: { icon: Zap, color: "text-violet-500 bg-violet-500/10" },
};

function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export function ActivityFeed() {
  const navigate = useNavigate();

  // Fetch recent activity from multiple sources
  const { data: orders } = useQuery({
    queryKey: ["crm", "recent-orders"],
    queryFn: async () => {
      const res = await fetch("/api/channels/crm/orders?limit=5");
      if (!res.ok) return [];
      const d = await res.json();
      return (d.orders || d.data || d || []).slice(0, 5);
    },
    staleTime: 15_000,
  });

  const { data: tickets } = useQuery({
    queryKey: ["crm", "recent-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/channels/crm/tickets?limit=5");
      if (!res.ok) return [];
      const d = await res.json();
      return (d.tickets || d.data || d || []).slice(0, 5);
    },
    staleTime: 15_000,
  });

  const { data: activity } = useQuery({
    queryKey: ["channels", "activity"],
    queryFn: async () => {
      const res = await fetch("/api/channels/activity?limit=10");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10_000,
  });

  // Merge all into activity items
  const items: ActivityItem[] = [
    ...(orders || []).map((o: any) => ({
      id: `order-${o.id}`,
      type: "order" as const,
      title: `Đơn ${o.order_number || "mới"}`,
      subtitle: `${formatVND(parseFloat(o.total) || 0)} — ${o.customer?.display_name || o.shipping_name || "Khách"}`,
      timestamp: o.created_at,
      link: `/crm/orders/${o.id}`,
    })),
    ...(tickets || []).map((t: any) => ({
      id: `ticket-${t.id}`,
      type: "ticket" as const,
      title: `Phiếu ${t.ticket_number || "mới"}`,
      subtitle: t.title || "",
      timestamp: t.created_at,
      link: `/crm/tickets/${t.id}`,
    })),
    ...(activity || []).filter((a: any) => a.status === "handled").slice(0, 5).map((a: any) => ({
      id: `chat-${a.id}`,
      type: "chat" as const,
      title: a.sender_name || "Khách",
      subtitle: (a.body || "").substring(0, 60),
      timestamp: a.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Hoạt động gần đây</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Chưa có hoạt động</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const cfg = typeConfig[item.type] || typeConfig.chat;
            const Icon = cfg.icon;
            return (
              <button
                key={item.id}
                onClick={() => item.link && navigate(item.link)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.timestamp)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
