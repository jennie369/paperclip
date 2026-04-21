import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "@/lib/router";
import { ArrowLeft, ArrowRight, Share2, Clock, Hash, Activity } from "lucide-react";
import { delegationsApi } from "../../api/delegations";
import { agentsApi } from "../../api/agents";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { queryKeys } from "../../lib/queryKeys";
import { EmptyState } from "../../components/EmptyState";
import { PageSkeleton } from "../../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DelegationStatus } from "../../api/delegations";
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

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("vi-VN");
  } catch {
    return raw;
  }
}

export function DelegationCard() {
  const { traceId } = useParams<{ traceId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.delegations.detail(traceId ?? ""),
    queryFn: () => delegationsApi.get(traceId!),
    enabled: !!traceId,
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

  useEffect(() => {
    setBreadcrumbs([
      { label: "Ủy quyền", href: "/delegations" },
      { label: traceId?.slice(0, 8) ?? "" },
    ]);
  }, [setBreadcrumbs, traceId]);

  if (!traceId) return <EmptyState icon={Share2} message="Không tìm thấy trace id." />;
  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error) {
    return (
      <div className="space-y-3">
        <Link
          to="/delegations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Quay lại
        </Link>
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) return null;

  const timeoutSec = Math.round(data.meta.timeoutMs / 1000);

  return (
    <div className="space-y-4">
      <Link
        to="/delegations"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Danh sách ủy quyền
      </Link>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{agentName(data.callerAgentId)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span>{agentName(data.targetAgentId)}</span>
            </CardTitle>
            <Badge variant={STATUS_VARIANTS[data.status]}>
              {STATUS_LABELS[data.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Công việc</div>
            <p className="whitespace-pre-wrap">{data.task || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-muted-foreground">Tạo lúc</div>
                <div>{fmtDate(data.requestedAt)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-muted-foreground">Kết thúc</div>
                <div>{fmtDate(data.completedAt)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-muted-foreground">Depth</div>
                <div>{data.depth}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-muted-foreground">Chế độ / Timeout</div>
                <div>
                  {data.meta.turnMode} · {timeoutSec}s
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono pt-2 border-t border-border">
            Trace: {data.traceId}
            {data.parentIssueId && <> · Parent: {data.parentIssueId.slice(0, 8)}</>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
