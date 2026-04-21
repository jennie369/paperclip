// CRM Overview — Tổng quan CRM: metrics + pipeline + activity

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Users, ShoppingBag, Ticket, TrendingUp, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPipeline } from "./components/StatusPipeline";
import { crmApi } from "@/api/crm";
import { useLiveInvalidate } from "@/hooks/useLiveInvalidate";

function formatVND(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'TR';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function CRMOverview() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: () => crmApi.getStats(),
    staleTime: 30_000,
  });

  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ['crm', 'pipeline'],
    queryFn: () => crmApi.getPipeline(),
    staleTime: 30_000,
  });

  const { data: ticketStats } = useQuery({
    queryKey: ['crm', 'ticket-stats'],
    queryFn: () => crmApi.getTicketStats(),
    staleTime: 30_000,
  });

  // Live: CRM overview page auto-refreshes on any CRM table mutation
  useLiveInvalidate({
    tables: ['crm_customers', 'crm_tickets', 'crm_orders', 'crm_interactions', 'shopify_orders'],
    queryKeys: [['crm', 'stats'], ['crm', 'pipeline'], ['crm', 'ticket-stats']],
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tổng quan CRM</h1>
        <Button size="sm" onClick={() => navigate('/crm/customers')}>
          <Plus className="mr-1.5 h-4 w-4" />
          Thêm khách hàng
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Khách hàng"
          value={stats?.totalCustomers}
          sub={stats?.newToday ? `+${stats.newToday} mới hôm nay` : undefined}
          loading={statsLoading}
          onClick={() => navigate('/crm/customers')}
        />
        <MetricCard
          icon={ShoppingBag}
          label="Đơn hàng"
          value={stats?.totalOrders}
          loading={statsLoading}
          onClick={() => navigate('/crm/orders')}
        />
        <MetricCard
          icon={TrendingUp}
          label="Doanh thu tổng"
          value={stats ? formatVND(stats.totalRevenue) + '₫' : undefined}
          loading={statsLoading}
        />
        <MetricCard
          icon={Ticket}
          label="Phiếu hỗ trợ mở"
          value={stats?.openTickets}
          sub={ticketStats?.urgent ? `${ticketStats.urgent} khẩn cấp` : undefined}
          subColor={ticketStats?.urgent ? "text-red-500" : undefined}
          loading={statsLoading}
          onClick={() => navigate('/crm/tickets')}
        />
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
            Pipeline khách hàng
          </h2>
          {pipelineLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : pipeline && Object.keys(pipeline).length > 0 ? (
            <StatusPipeline
              data={pipeline}
              onStatusClick={(status) => navigate(`/crm/customers?status=${status}`)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu pipeline</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
            Phiếu hỗ trợ theo trạng thái
          </h2>
          {ticketStats?.by_status ? (
            <div className="space-y-2">
              {Object.entries(ticketStats.by_status as Record<string, number>).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có phiếu hỗ trợ nào</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  loading,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value?: number | string;
  sub?: string;
  subColor?: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{value ?? 0}</p>
          )}
          {sub && (
            <p className={`text-xs ${subColor || 'text-muted-foreground'}`}>{sub}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
