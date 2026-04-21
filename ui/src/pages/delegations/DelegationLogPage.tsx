import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { ArrowRight, Share2 } from "lucide-react";
import { delegationsApi } from "../../api/delegations";
import { agentsApi } from "../../api/agents";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { queryKeys } from "../../lib/queryKeys";
import { EmptyState } from "../../components/EmptyState";
import { PageSkeleton } from "../../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import type { DelegationRow, DelegationStatus } from "../../api/delegations";
import type { Agent } from "@paperclipai/shared";

const STATUS_LABELS: Record<DelegationStatus, string> = {
  pending: "Chờ",
  in_progress: "Đang chạy",
  done: "Hoàn thành",
  failed: "Lỗi",
  cancelled: "Đã huỷ",
  timeout: "Hết giờ",
};

const STATUS_VARIANTS: Record<
  DelegationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  in_progress: "default",
  done: "secondary",
  failed: "destructive",
  cancelled: "outline",
  timeout: "destructive",
};

function formatElapsed(row: DelegationRow): string {
  const start = new Date(row.requestedAt).getTime();
  const end = row.completedAt ? new Date(row.completedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatRequestedAt(row: DelegationRow): string {
  try {
    return new Date(row.requestedAt).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return row.requestedAt;
  }
}

export function DelegationLogPage() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Ủy quyền" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.delegations.list(selectedCompanyId!),
    queryFn: () => delegationsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents ?? []) map.set(a.id, (a as Agent).name);
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [agents]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Share2} message="Chọn một công ty để xem nhật ký ủy quyền." />;
  }

  if (isLoading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Nhật ký ủy quyền</h1>
          <p className="text-xs text-muted-foreground">
            Agent ủy quyền công việc cho nhau — chỉ đọc.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          icon={Share2}
          message="Chưa có ủy quyền nào. Agent sẽ tự tạo khi cần phối hợp."
        />
      )}

      {data && data.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Từ → Đến</th>
                <th className="px-3 py-2 text-left font-medium">Công việc</th>
                <th className="px-3 py-2 text-left font-medium">Bắt đầu</th>
                <th className="px-3 py-2 text-left font-medium">Thời lượng</th>
                <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr key={row.traceId} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      to={`/delegations/${row.traceId}`}
                      className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                    >
                      <span className="font-medium">{agentName(row.callerAgentId)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{agentName(row.targetAgentId)}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-md truncate">
                    {row.task || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatRequestedAt(row)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatElapsed(row)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANTS[row.status]}>
                      {STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
