// Status Pipeline — horizontal bar chart for CRM pipeline

const statusLabels: Record<string, { label: string; color: string }> = {
  lead_moi: { label: "Lead mới", color: "bg-blue-500" },
  quan_tam: { label: "Quan tâm", color: "bg-cyan-500" },
  can_follow_up: { label: "Cần follow up", color: "bg-yellow-500" },
  dang_tu_van: { label: "Đang tư vấn", color: "bg-orange-500" },
  cho_thanh_toan: { label: "Chờ thanh toán", color: "bg-purple-500" },
  da_mua: { label: "Đã mua", color: "bg-green-500" },
  khach_vip: { label: "Khách VIP", color: "bg-amber-500" },
  khach_than_thiet: { label: "Khách thân thiết", color: "bg-emerald-500" },
  churned: { label: "Churned", color: "bg-gray-500" },
  blacklist: { label: "Blacklist", color: "bg-red-600" },
};

export function StatusPipeline({
  data,
  onStatusClick,
}: {
  data: Record<string, number>;
  onStatusClick?: (status: string) => void;
}) {
  const maxCount = Math.max(...Object.values(data), 1);
  const statuses = Object.keys(statusLabels);

  return (
    <div className="space-y-2">
      {statuses.map((status) => {
        const count = data[status] || 0;
        if (count === 0) return null;
        const config = statusLabels[status];
        const width = Math.max((count / maxCount) * 100, 8);

        return (
          <button
            key={status}
            onClick={() => onStatusClick?.(status)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">
              {config.label}
            </span>
            <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full ${config.color} transition-all duration-500`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium tabular-nums">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
