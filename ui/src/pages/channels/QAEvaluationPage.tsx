import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  XCircle,
  BarChart3,
  Play,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Users,
  MessageCircle,
  MessagesSquare,
  Database,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  Download,
} from "lucide-react";
import { qaApi, type QAEvaluation } from "@/api/qa";
import { channelsApi } from "@/api/channels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";

type Tab = "overview" | "evaluations" | "criteria" | "conversations" | "messages" | "reports";

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function verdictBadge(verdict: string) {
  if (verdict === "pass") {
    return (
      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Đạt
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
      <XCircle className="h-3 w-3 mr-0.5" /> Không đạt
    </Badge>
  );
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function QAEvaluationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [verdictFilter, setVerdictFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pushToast } = useToast();
  const qc = useQueryClient();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["qa", "stats"],
    queryFn: qaApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: evaluations = [], isLoading: evalsLoading } = useQuery({
    queryKey: ["qa", "evaluations", verdictFilter],
    queryFn: () => qaApi.listEvaluations({ verdict: verdictFilter || undefined, limit: 50 }),
    enabled: tab === "evaluations" || tab === "overview",
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ["qa", "criteria"],
    queryFn: qaApi.listCriteria,
    enabled: tab === "criteria",
  });

  // Conversations tab
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["qa", "conversations"],
    queryFn: () => channelsApi.listSessions({ limit: 100 }),
    enabled: tab === "conversations",
  });

  // Messages tab (training data)
  const [messageChannel, setMessageChannel] = useState<string>("");
  const { data: trainingMessages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["qa", "messages", messageChannel],
    queryFn: () => channelsApi.getActivityLog({ channel: messageChannel || undefined, limit: 200 }),
    enabled: tab === "messages",
  });

  // Reports tab
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["qa", "reports"],
    queryFn: () => qaApi.listReports({ limit: 30 }),
    enabled: tab === "reports",
  });

  // Mutations
  const batchEvalMut = useMutation({
    mutationFn: () => qaApi.evaluateBatch({ all_unreviewed: true, limit: 20 }),
    onSuccess: (data) => {
      pushToast({
        title: "Đánh giá hoàn tất",
        body: `Đã đánh giá ${data.evaluated} cuộc hội thoại${data.remaining > 0 ? `, còn ${data.remaining}` : ""}`,
        tone: "success",
        ttlMs: 4000,
      });
      qc.invalidateQueries({ queryKey: ["qa"] });
    },
    onError: (err: any) => {
      pushToast({
        title: "Lỗi đánh giá",
        body: err.message || "Không thể đánh giá",
        tone: "error",
        ttlMs: 4000,
      });
    },
  });

  const generateReportMut = useMutation({
    mutationFn: () => qaApi.generateReport({ report_type: "daily" }),
    onSuccess: (data) => {
      pushToast({
        title: "Báo cáo đã tạo",
        body: `Điểm TB: ${data.avg_score}/100, Tỷ lệ đạt: ${data.pass_rate}%`,
        tone: "success",
        ttlMs: 5000,
      });
      qc.invalidateQueries({ queryKey: ["qa"] });
    },
    onError: (err: any) => {
      pushToast({
        title: "Lỗi tạo báo cáo",
        body: err.message || "Không thể tạo báo cáo",
        tone: "error",
        ttlMs: 4000,
      });
    },
  });

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Tổng quan", icon: BarChart3 },
    { key: "evaluations", label: "Đánh giá", icon: FileText },
    { key: "criteria", label: "Tiêu chí", icon: Shield },
    { key: "conversations", label: "Hội thoại", icon: MessagesSquare },
    { key: "messages", label: "Tin nhắn", icon: Database },
    { key: "reports", label: "Báo cáo", icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Đánh giá chất lượng (QA)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tự động đánh giá chất lượng trả lời của Agent
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => batchEvalMut.mutate()}
              disabled={batchEvalMut.isPending}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {batchEvalMut.isPending ? "Đang đánh giá..." : "Đánh giá tất cả"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => generateReportMut.mutate()}
              disabled={generateReportMut.isPending}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Tạo báo cáo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b shrink-0">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="h-3.5 w-3.5 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <div className="p-4 space-y-4">
            {/* Stats cards */}
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Tổng đánh giá"
                  value={stats?.totalEvaluations || 0}
                  icon={FileText}
                  color="text-blue-600"
                />
                <StatCard
                  label="Hôm nay"
                  value={stats?.todayEvaluations || 0}
                  icon={TrendingUp}
                  color="text-green-600"
                />
                <StatCard
                  label="Điểm TB"
                  value={`${stats?.avgScore || 0}/100`}
                  icon={BarChart3}
                  color={scoreColor(stats?.avgScore || 0)}
                />
                <StatCard
                  label="Tỷ lệ đạt"
                  value={`${stats?.passRate || 0}%`}
                  icon={CheckCircle2}
                  color={stats?.passRate && stats.passRate >= 70 ? "text-green-600" : "text-red-600"}
                />
              </div>
            )}

            {/* Recent evaluations */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Đánh giá gần đây</h2>
              {evalsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : evaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có đánh giá nào</p>
                  <p className="text-xs mt-1">Nhấn "Đánh giá tất cả" để bắt đầu</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {evaluations.slice(0, 10).map((e: QAEvaluation) => (
                    <EvalRow key={e.id} evaluation={e} expanded={expandedId === e.id} onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Evaluations tab ── */}
        {tab === "evaluations" && (
          <div className="p-4">
            {/* Filter */}
            <div className="flex gap-1 mb-3">
              {[
                { key: "", label: "Tất cả" },
                { key: "pass", label: "Đạt" },
                { key: "fail", label: "Không đạt" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={verdictFilter === f.key ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => setVerdictFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {evalsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {evaluations.map((e: QAEvaluation) => (
                  <EvalRow key={e.id} evaluation={e} expanded={expandedId === e.id} onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Criteria tab ── */}
        {tab === "criteria" && (
          <div className="p-4">
            <div className="space-y-2">
              {criteria.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.display_name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {c.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        x{c.weight}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                  </div>
                  <div className={`text-xs font-medium ${c.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                    {c.enabled ? "Bật" : "Tắt"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Conversations tab ── */}
        {tab === "conversations" && (
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Hội thoại theo khách hàng</h3>
            {convsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessagesSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có hội thoại nào</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-2.5 font-medium">Khách hàng</th>
                      <th className="text-left p-2.5 font-medium">Kênh</th>
                      <th className="text-left p-2.5 font-medium hidden md:table-cell">Tin nhắn cuối</th>
                      <th className="text-center p-2.5 font-medium">Nhãn</th>
                      <th className="text-center p-2.5 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conv) => (
                      <tr key={conv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium truncate block">
                                {conv.customer?.display_name || conv.sender_name || "Khách"}
                              </span>
                              {conv.customer?.phone && (
                                <span className="text-muted-foreground text-[10px]">{conv.customer.phone}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {conv.channel_name || "—"}
                          </Badge>
                        </td>
                        <td className="p-2.5 hidden md:table-cell">
                          <span className="text-muted-foreground truncate block max-w-[200px]">
                            {conv.last_message_preview || "—"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <ConversationLabel label={conv.label || conv.customer?.lead_temperature || null} />
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 ${
                              conv.status === "running" || conv.status === "active"
                                ? "bg-green-500/15 text-green-600"
                                : conv.status === "idle"
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {conv.status === "running" || conv.status === "active"
                              ? "Đang hoạt động"
                              : conv.status === "idle"
                              ? "Chờ"
                              : conv.status === "closed"
                              ? "Đã đóng"
                              : conv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Messages tab (Training data) ── */}
        {tab === "messages" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Kho dữ liệu huấn luyện</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const jsonl = trainingMessages
                      .filter((m) => m.status === "handled")
                      .map((m) => JSON.stringify({
                        messages: [
                          { role: "user", content: m.body },
                          { role: "assistant", content: m.handled_by || "" },
                        ],
                        metadata: { channel: m.channel_name, agent: m.agent_slug, ts: m.created_at },
                      }))
                      .join("\n");
                    const blob = new Blob([jsonl], { type: "application/jsonl" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `training-data-${new Date().toISOString().slice(0, 10)}.jsonl`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Xuất JSONL
                </Button>
              </div>
            </div>

            {/* Channel filter */}
            <div className="flex gap-1 mb-3">
              {[
                { key: "", label: "Tất cả kênh" },
                { key: "telegram", label: "Telegram" },
                { key: "zalo", label: "Zalo" },
                { key: "web", label: "Web" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={messageChannel === f.key ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => setMessageChannel(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-blue-600">{trainingMessages.length}</div>
                <div className="text-[10px] text-muted-foreground">Tổng tin nhắn</div>
              </div>
              <div className="border rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-green-600">
                  {trainingMessages.filter((m) => m.status === "handled").length}
                </div>
                <div className="text-[10px] text-muted-foreground">Đã xử lý</div>
              </div>
              <div className="border rounded-lg p-2.5 text-center">
                <div className="text-lg font-bold text-amber-600">
                  {trainingMessages.filter((m) => m.status === "skipped").length}
                </div>
                <div className="text-[10px] text-muted-foreground">Bỏ qua</div>
              </div>
            </div>

            {msgsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : trainingMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có tin nhắn nào</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-2.5 font-medium">Nội dung</th>
                      <th className="text-left p-2.5 font-medium">Người gửi</th>
                      <th className="text-left p-2.5 font-medium hidden md:table-cell">Agent</th>
                      <th className="text-left p-2.5 font-medium hidden md:table-cell">Kênh</th>
                      <th className="text-center p-2.5 font-medium">Trạng thái</th>
                      <th className="text-right p-2.5 font-medium">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingMessages.map((msg) => (
                      <tr key={msg.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-2.5 max-w-[300px]">
                          <span className="truncate block">{msg.body}</span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{msg.sender_name || "—"}</td>
                        <td className="p-2.5 hidden md:table-cell">
                          {msg.agent_slug ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {msg.agent_slug}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2.5 hidden md:table-cell">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {msg.channel_name}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 ${
                              msg.status === "handled"
                                ? "bg-green-500/15 text-green-600"
                                : msg.status === "skipped"
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {msg.status === "handled"
                              ? "Đã xử lý"
                              : msg.status === "skipped"
                              ? "Bỏ qua"
                              : msg.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {formatDate(msg.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Reports tab ── */}
        {tab === "reports" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Báo cáo hàng ngày</h3>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => generateReportMut.mutate()}
                disabled={generateReportMut.isPending}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                {generateReportMut.isPending ? "Đang tạo..." : "Tạo báo cáo mới"}
              </Button>
            </div>

            {reportsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có báo cáo nào</p>
                <p className="text-xs mt-1">Nhấn "Tạo báo cáo mới" để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report, idx) => {
                  const prev = reports[idx + 1]; // previous report for comparison
                  const scoreDiff = prev ? report.avg_score - prev.avg_score : 0;
                  const convDiff = prev ? report.total_conversations - prev.total_conversations : 0;
                  const passDiff = prev ? report.pass_rate - prev.pass_rate : 0;

                  return (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      {/* Report header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">
                            {new Date(report.period_start).toLocaleDateString("vi-VN")}
                            {report.period_end && report.period_end !== report.period_start && (
                              <> — {new Date(report.period_end).toLocaleDateString("vi-VN")}</>
                            )}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-2">
                            {report.report_type}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(report.created_at)}
                        </span>
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <ReportMetric
                          label="Tổng hội thoại"
                          value={report.total_conversations}
                          diff={convDiff}
                        />
                        <ReportMetric
                          label="Đã đánh giá"
                          value={report.total_evaluated}
                          diff={prev ? report.total_evaluated - prev.total_evaluated : 0}
                        />
                        <ReportMetric
                          label="Điểm trung bình"
                          value={`${report.avg_score}/100`}
                          diff={scoreDiff}
                          highlight
                        />
                        <ReportMetric
                          label="Tỷ lệ đạt"
                          value={`${report.pass_rate}%`}
                          diff={passDiff}
                          highlight
                        />
                      </div>

                      {/* Agent breakdown */}
                      {report.agent_scores && Object.keys(report.agent_scores).length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-1.5">Hiệu suất Agent</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                            {Object.entries(report.agent_scores).map(([slug, data]) => (
                              <div
                                key={slug}
                                className="flex items-center justify-between text-xs p-2 rounded border bg-background"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                    {slug}
                                  </Badge>
                                  <span className="text-muted-foreground">({data.count})</span>
                                </div>
                                <span className={`font-medium ${scoreColor(data.avg_score)}`}>
                                  {data.avg_score}đ · {data.pass_rate}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top violations */}
                      {report.top_violations && report.top_violations.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-1.5 text-amber-600">Vi phạm phổ biến</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {report.top_violations.map((v, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-600"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {v.name} ({v.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function EvalRow({ evaluation: e, expanded, onToggle }: { evaluation: QAEvaluation; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Score circle */}
        <div className={`w-10 h-10 rounded-full ${scoreBg(e.score)} flex items-center justify-center shrink-0`}>
          <span className={`text-sm font-bold ${scoreColor(e.score)}`}>{e.score}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {e.customer_name || e.customer_id || "Khách"}
            </span>
            {verdictBadge(e.verdict)}
            {e.agent_slug && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {e.agent_slug}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <MessageCircle className="h-3 w-3 inline mr-1" />
            {e.message_count} tin nhắn · {formatDate(e.evaluated_at)}
            {e.violations.length > 0 && (
              <span className="text-amber-600 ml-2">
                <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                {e.violations.length} vi phạm
              </span>
            )}
          </p>
        </div>

        {/* Expand */}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t p-3 bg-muted/10 space-y-3">
          {/* Summary */}
          <p className="text-xs">{e.summary}</p>

          {/* Criteria scores */}
          <div>
            <h4 className="text-xs font-semibold mb-1.5">Điểm theo tiêu chí</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(e.criteria_scores).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded bg-background border">
                  <span className="text-muted-foreground">{name}</span>
                  <span className={`font-medium ${data.score >= data.maxScore * 0.7 ? "text-green-600" : "text-red-600"}`}>
                    {data.score}/{data.maxScore}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Violations */}
          {e.violations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1.5 text-amber-600">Vi phạm</h4>
              <div className="space-y-1">
                {e.violations.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{v.criterion}</span>: {v.description}
                      <Badge variant="outline" className="ml-1.5 text-[8px] px-1 py-0">
                        {v.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {e.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1">Đề xuất cải thiện</h4>
              <ul className="text-xs space-y-0.5 text-muted-foreground">
                {e.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Conversation snapshot */}
          {e.conversation_snapshot && e.conversation_snapshot.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1">Lịch sử hội thoại</h4>
              <div className="max-h-48 overflow-auto space-y-1 text-xs">
                {e.conversation_snapshot.map((m, i) => (
                  <div
                    key={i}
                    className={`p-1.5 rounded ${
                      m.role === "assistant"
                        ? "bg-primary/10 ml-4"
                        : m.role === "user"
                        ? "bg-muted mr-4"
                        : "bg-muted/50 text-muted-foreground italic"
                    }`}
                  >
                    <span className="font-medium">
                      {m.role === "assistant" ? "Agent" : m.role === "user" ? "Khách" : "Hệ thống"}:
                    </span>{" "}
                    {m.content.substring(0, 200)}
                    {m.content.length > 200 && "..."}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationLabel({ label }: { label: string | null }) {
  if (!label) return <span className="text-muted-foreground text-[10px]">—</span>;
  const map: Record<string, { bg: string; text: string; display: string }> = {
    hot: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", display: "HOT" },
    warm: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", display: "WARM" },
    cold: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", display: "COLD" },
    vip: { bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400", display: "VIP" },
    spam: { bg: "bg-muted", text: "text-muted-foreground", display: "SPAM" },
  };
  const style = map[label.toLowerCase()] || { bg: "bg-muted", text: "text-muted-foreground", display: label };
  return (
    <Badge className={`${style.bg} ${style.text} border-transparent text-[9px] px-1.5 py-0 font-semibold`}>
      {style.display}
    </Badge>
  );
}

function ReportMetric({
  label,
  value,
  diff,
  highlight,
}: {
  label: string;
  value: string | number;
  diff: number;
  highlight?: boolean;
}) {
  return (
    <div className="border rounded-lg p-2.5">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${highlight ? scoreColor(typeof value === "number" ? value : parseFloat(String(value)) || 0) : ""}`}>
        {value}
      </div>
      {diff !== 0 && (
        <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
          {diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {diff > 0 ? "+" : ""}{typeof diff === "number" && diff % 1 !== 0 ? diff.toFixed(1) : diff} so với hôm qua
        </div>
      )}
    </div>
  );
}
