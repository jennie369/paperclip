// CRM Pipeline Card — clickable pipeline bars

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { crmApi } from "@/api/crm";

const pipelineStages = [
  { key: "lead_moi", label: "Lead mới", color: "bg-blue-500" },
  { key: "quan_tam", label: "Quan tâm", color: "bg-cyan-500" },
  { key: "tu_van", label: "Tư vấn", color: "bg-yellow-500" },
  { key: "da_mua", label: "Đã mua", color: "bg-green-500" },
  { key: "vip", label: "VIP", color: "bg-violet-500" },
];

function formatVND(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "TR";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export function CRMPipelineCard() {
  const navigate = useNavigate();
  const { data: stats } = useQuery({
    queryKey: ["crm", "stats"],
    queryFn: () => crmApi.getStats(),
    staleTime: 30_000,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["crm", "pipeline"],
    queryFn: () => crmApi.getPipeline(),
    staleTime: 30_000,
  });

  const pipelineData = pipeline || {};
  const total = Object.values(pipelineData as Record<string, number>).reduce((s: number, v) => s + (v as number || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">CRM Pipeline</h3>
        <button onClick={() => navigate("/crm")} className="text-xs text-primary hover:underline">
          Xem CRM
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.totalCustomers ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Khách hàng</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.totalOrders ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Đơn hàng</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{formatVND(stats.totalRevenue ?? 0)}₫</div>
            <div className="text-[10px] text-muted-foreground">Doanh thu</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.openTickets ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Phiếu mở</div>
          </div>
        </div>
      )}

      {/* Pipeline bars */}
      <div className="space-y-1.5">
        {pipelineStages.map((stage) => {
          const count = (pipelineData as any)?.[stage.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <button
              key={stage.key}
              onClick={() => navigate(`/crm/customers?status=${stage.key}`)}
              className="w-full flex items-center gap-2 group cursor-pointer"
            >
              <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{stage.label}</span>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all duration-500 group-hover:opacity-80`}
                  style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
