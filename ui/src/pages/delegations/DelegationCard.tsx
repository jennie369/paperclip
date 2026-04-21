import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "@/lib/router";
import {
  ArrowLeft,
  ArrowRight,
  Share2,
  Clock,
  Hash,
  Activity,
  MessageSquareText,
  ExternalLink,
  Copy,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { delegationsApi } from "../../api/delegations";
import { agentsApi } from "../../api/agents";
import { issuesApi } from "../../api/issues";
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
  pending: "Chờ agent nhận",
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

const TURN_MODE_LABELS: Record<string, string> = {
  ask: "Hỏi ý kiến (không làm thay)",
  do: "Thực thi (làm xong rồi báo cáo)",
  delegate: "Điều phối (chia việc cho specialists)",
};

function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return raw;
  }
}

function fmtDuration(fromIso: string, toIso: string | null | undefined): string {
  if (!toIso) return "đang chạy...";
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} giây`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút ${s % 60} giây`;
  const h = Math.floor(m / 60);
  return `${h} giờ ${m % 60} phút`;
}

function fmtTimeoutVi(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} giây`;
  const m = Math.round(s / 60);
  return `${m} phút`;
}

function LabeledField({
  icon: Icon,
  label,
  tooltip,
  children,
}: {
  icon: typeof Clock;
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px] text-muted-foreground uppercase tracking-wide cursor-help"
          title={tooltip}
        >
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export function DelegationCard() {
  const { traceId } = useParams<{ traceId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.delegations.detail(traceId ?? ""),
    queryFn: () => delegationsApi.get(traceId!),
    enabled: !!traceId,
    refetchInterval: (query) => {
      const d = query.state.data as { status?: DelegationStatus } | undefined;
      // Poll every 3s while still active; stop once terminal.
      if (!d) return 3_000;
      return ["pending", "in_progress"].includes(d.status ?? "") ? 3_000 : false;
    },
  });

  const { data: issue } = useQuery({
    queryKey: queryKeys.issues.detail(data?.id ?? ""),
    queryFn: () => issuesApi.get(data!.id),
    enabled: !!data?.id,
  });

  const { data: comments } = useQuery({
    queryKey: queryKeys.issues.comments(data?.id ?? ""),
    queryFn: () => issuesApi.listComments(data!.id),
    enabled: !!data?.id,
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

  const agentSlug = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const a of agents ?? []) map.set(a.id, (a as Agent & { slug?: string }).slug ?? null);
    return (id: string) => map.get(id) ?? null;
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

  const resultComment = (() => {
    if (!comments?.length) return null;
    // Prefer last comment from the target agent (the answer), else last overall.
    const fromTarget = [...comments]
      .reverse()
      .find((c) => c.authorAgentId === data.targetAgentId);
    return fromTarget ?? comments[comments.length - 1];
  })();

  const narrative = (() => {
    const caller = agentName(data.callerAgentId);
    const target = agentName(data.targetAgentId);
    const requested = fmtDateTime(data.requestedAt);
    switch (data.status) {
      case "done":
        return `${caller} ủy quyền cho ${target} lúc ${requested}. ${target} hoàn thành sau ${fmtDuration(data.requestedAt, data.completedAt)}.`;
      case "in_progress":
        return `${caller} ủy quyền cho ${target} lúc ${requested}. ${target} đang xử lý (đã ${fmtDuration(data.requestedAt, new Date().toISOString())}).`;
      case "pending":
        return `${caller} vừa ủy quyền cho ${target} lúc ${requested}. Đang chờ ${target} thức dậy và nhận việc.`;
      case "cancelled":
        return `${caller} ủy quyền cho ${target} lúc ${requested}, đã bị huỷ sau ${fmtDuration(data.requestedAt, data.completedAt)}.`;
      case "timeout":
        return `${caller} ủy quyền cho ${target} lúc ${requested} nhưng quá thời gian chờ (${fmtTimeoutVi(data.meta.timeoutMs)}). Đã tự động huỷ.`;
      case "failed":
        return `${caller} ủy quyền cho ${target} lúc ${requested}. ${target} không xử lý được.`;
      default:
        return "";
    }
  })();

  const StatusIcon =
    data.status === "done" ? CheckCircle2 :
    data.status === "failed" || data.status === "timeout" ? AlertCircle :
    Circle;

  const issueIdentifier = issue?.identifier ?? data.id.slice(0, 8);

  async function handleCopyTrace() {
    try {
      await navigator.clipboard?.writeText(data!.traceId);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        to="/delegations"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Danh sách ủy quyền
      </Link>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span title={`Agent ủy quyền: ${agentName(data.callerAgentId)}`}>
                {agentName(data.callerAgentId)}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span title={`Agent nhận việc: ${agentName(data.targetAgentId)}`}>
                {agentName(data.targetAgentId)}
              </span>
            </CardTitle>
            <Badge
              variant={STATUS_VARIANTS[data.status]}
              className="flex items-center gap-1"
              title={`Trạng thái hiện tại: ${STATUS_LABELS[data.status]}`}
            >
              <StatusIcon className="h-3 w-3" />
              {STATUS_LABELS[data.status]}
            </Badge>
          </div>
          {narrative && (
            <p className="text-sm text-muted-foreground pt-2">{narrative}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 text-sm">
          {/* Task */}
          <section>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Việc được giao
            </h3>
            <div className="bg-muted/30 rounded-md px-3 py-2 whitespace-pre-wrap border border-border">
              {data.task || "— không có mô tả —"}
            </div>
          </section>

          {/* Result */}
          <section>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" /> Kết quả
              <span
                className="text-[10px] normal-case font-normal"
                title="Comment mới nhất từ agent nhận việc (nếu có). Nếu chưa xong, mục này sẽ trống."
              >
                (comment mới nhất từ {agentName(data.targetAgentId)})
              </span>
            </h3>
            {resultComment ? (
              <div className="bg-muted/30 rounded-md px-3 py-2 border border-border space-y-1">
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>
                    {resultComment.authorAgentId === data.targetAgentId
                      ? `✅ Phản hồi từ ${agentName(data.targetAgentId)}`
                      : `💬 Ghi chú nội bộ`}
                  </span>
                  <span>{fmtDateTime(resultComment.createdAt as unknown as string)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{resultComment.body}</div>
              </div>
            ) : (
              <p className="text-muted-foreground italic text-xs">
                {data.status === "pending"
                  ? `Chưa có — ${agentName(data.targetAgentId)} chưa nhận việc.`
                  : data.status === "in_progress"
                  ? `Đang chờ ${agentName(data.targetAgentId)} báo cáo kết quả...`
                  : `${agentName(data.targetAgentId)} đã xong nhưng chưa để lại comment nào.`}
              </p>
            )}
          </section>

          {/* Timeline */}
          <section>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Diễn biến
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledField
                icon={Clock}
                label="Bắt đầu"
                tooltip={`${agentName(data.callerAgentId)} tạo yêu cầu ủy quyền lúc này.`}
              >
                {fmtDateTime(data.requestedAt)}
              </LabeledField>
              <LabeledField
                icon={Clock}
                label={data.completedAt ? "Kết thúc" : "Chưa kết thúc"}
                tooltip="Thời điểm issue chuyển sang done/cancelled."
              >
                {data.completedAt ? fmtDateTime(data.completedAt) : "—"}
              </LabeledField>
              <LabeledField
                icon={Activity}
                label="Thời lượng"
                tooltip="Tính từ lúc ủy quyền đến khi issue kết thúc (hoặc đến bây giờ nếu đang chạy)."
              >
                {fmtDuration(data.requestedAt, data.completedAt ?? null)}
              </LabeledField>
              <LabeledField
                icon={Hash}
                label="Thời gian cho phép"
                tooltip="Nếu vượt quá, server sẽ tự cancel và trả status timeout."
              >
                Tối đa {fmtTimeoutVi(data.meta.timeoutMs)}
              </LabeledField>
            </div>
          </section>

          {/* Links */}
          <section>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Liên kết
            </h3>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link
                to={`/issues/${data.id}`}
                className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                title="Mở issue gốc để xem attachments, workspace, full activity log"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Xem issue <span className="font-mono text-xs">{issueIdentifier}</span>
              </Link>
              {agentSlug(data.targetAgentId) && (
                <Link
                  to={`/agents/${agentSlug(data.targetAgentId)}`}
                  className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                  title="Xem agent nhận việc — phiên chạy gần nhất, nhật ký, cấu hình"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Xem agent {agentName(data.targetAgentId)}
                </Link>
              )}
            </div>
          </section>

          {/* Technical details (collapsed feel via smaller text) */}
          <section className="pt-3 border-t border-border space-y-2">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Thông số kỹ thuật
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledField
                icon={Hash}
                label="Mức sâu chain"
                tooltip="Delegation có thể lồng nhau: A→B→C. Tối đa 3 cấp; vượt sẽ bị chặn để tránh loop."
              >
                {data.depth} / 3
              </LabeledField>
              <LabeledField
                icon={Activity}
                label="Cách làm"
                tooltip="ask = trả lời không làm thay; do = làm xong báo cáo; delegate = chia việc cho chuyên gia."
              >
                <span className="font-mono text-xs">{data.meta.turnMode}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  — {TURN_MODE_LABELS[data.meta.turnMode] ?? "?"}
                </span>
              </LabeledField>
            </div>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground font-mono border-t border-border">
              <span title="ID duy nhất để tra cứu delegation này trong logs + DB.">Trace:</span>
              <span className="flex-1 truncate">{data.traceId}</span>
              <button
                type="button"
                onClick={handleCopyTrace}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-foreground"
                title="Sao chép trace id"
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
            </div>
            {data.parentIssueId && (
              <div className="text-[11px] text-muted-foreground font-mono">
                <span title="Issue mẹ đã tạo ra delegation này (nếu có). Dùng để trace chuỗi công việc.">
                  Issue mẹ:
                </span>{" "}
                <Link
                  to={`/issues/${data.parentIssueId}`}
                  className="hover:underline"
                >
                  {data.parentIssueId.slice(0, 8)}
                </Link>
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
