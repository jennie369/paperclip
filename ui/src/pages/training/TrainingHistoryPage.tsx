// Training History — list tất cả training sessions với rubric chart trend.
//
// Layout:
//   ┌──────────────────────────────────────────────────────────┐
//   │  Trend chart: average score per session (sparkline)      │
//   ├──────────────────────────────────────────────────────────┤
//   │  Sessions table: scenario | agent | status | score | ts  │
//   ├──────────────────────────────────────────────────────────┤
//   │  Detail panel (when row clicked): full rubric breakdown  │
//   └──────────────────────────────────────────────────────────┘

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Star,
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  trainingApi,
  type TrainingSession,
  type TrainingScore,
} from "@/api/training";

const RUBRIC_LABELS: Record<string, string> = {
  language_correctness: "Tiếng Việt có dấu",
  tone_alignment: "Tone sales closer",
  hallucination_free: "Không bịa info/marker",
  marker_compliance: "SEND_MEDIA + CALL đúng",
  factual_accuracy: "Giá / khóa đúng",
  empathy: "Đồng cảm khách",
  actionability: "Đề xuất bước rõ",
  brand_voice_jennie: "Brand voice Jennie",
  escalation_correctness: "Escalate đúng lúc",
  conciseness: "Ngắn gọn 2-4 câu",
};

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-[#3AF7A6]";
  if (score >= 75) return "text-[#00F0FF]";
  if (score >= 60) return "text-[#FFB800]";
  return "text-[#FF6B6B]";
}

function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-[#3AF7A6]";
  if (score >= 75) return "bg-[#00F0FF]";
  if (score >= 60) return "bg-[#FFB800]";
  return "bg-[#FF6B6B]";
}

export function TrainingHistoryPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["training", "history-sessions"],
    queryFn: () => trainingApi.listSessions(100),
    refetchInterval: 10_000,
  });

  const { data: selectedScores = [] } = useQuery({
    queryKey: ["training", "scores", selectedSessionId],
    queryFn: () => trainingApi.getScores(selectedSessionId!),
    enabled: !!selectedSessionId,
  });

  // Build sparkline data: last 30 sessions with completed status + opus_score
  const trendData = useMemo(() => {
    const completed = sessions
      .filter((s) => s.status === "completed" && typeof s.opus_score === "number")
      .slice(0, 30)
      .reverse();
    return completed;
  }, [sessions]);

  const avgScore = useMemo(() => {
    if (trendData.length === 0) return 0;
    return Math.round(
      trendData.reduce((sum, s) => sum + (s.opus_score || 0), 0) / trendData.length,
    );
  }, [trendData]);

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#0A0B1A] p-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-white mb-1">Lịch sử Training</h1>
        <p className="text-[12px] text-white/40">
          Tất cả training session đã chạy. Mỗi session được Opus 4.6 chấm 10 tiêu chí.
          Click 1 row để xem chi tiết feedback per criterion.
        </p>
      </div>

      {/* Stats + trend chart */}
      <div className="grid grid-cols-[200px_1fr] gap-3 mb-4">
        {/* Avg score card */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
          <Star size={20} className="mx-auto mb-1.5 text-[#FFBD59] opacity-70" />
          <div className={`text-[22px] font-bold ${scoreColor(avgScore)}`}>{avgScore}</div>
          <div className="text-[11px] text-white/40 mt-0.5">
            Avg score ({trendData.length} session)
          </div>
        </div>

        {/* Sparkline trend */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[#00F0FF]" />
            <span className="text-[12px] font-semibold text-white">Trend score qua thời gian</span>
          </div>
          <Sparkline data={trendData.map((s) => s.opus_score || 0)} />
        </div>
      </div>

      {/* Sessions table + detail panel */}
      <div className="grid grid-cols-[1fr_360px] gap-3">
        {/* Table */}
        <div className="overflow-x-auto rounded-xl bg-[rgba(15,16,48,0.2)]">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                  Scenario
                </th>
                <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                  Agent
                </th>
                <th className="text-center p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04]">
                  Status
                </th>
                <th className="text-center p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04]">
                  Turns
                </th>
                <th className="text-right p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04]">
                  Score
                </th>
                <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                  Bắt đầu
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-white/30">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!isLoading && sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <History size={32} className="mx-auto mb-2 text-white/10" />
                    <div className="text-[14px] text-white/35">Chưa có session nào</div>
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === selectedSessionId}
                  onClick={() => setSelectedSessionId(s.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 sticky top-3 self-start max-h-[calc(100vh-100px)] overflow-y-auto">
          {!selectedSessionId ? (
            <div className="text-center py-10">
              <Star size={32} className="mx-auto mb-2 text-white/10" />
              <div className="text-[12px] text-white/30">Chọn 1 session để xem rubric chi tiết</div>
            </div>
          ) : selectedScores.length === 0 ? (
            <div className="text-center py-10">
              <Loader2 size={20} className="mx-auto mb-2 text-white/30 animate-spin" />
              <div className="text-[11px] text-white/30">
                Đang load scores... (hoặc Opus chưa review xong)
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                <Star size={14} className="text-[#FFBD59]" />
                <h3 className="text-[13px] font-bold text-white">Rubric chi tiết</h3>
              </div>
              <div className="space-y-2">
                {selectedScores.map((score) => (
                  <RubricDetail key={score.rubric_key} score={score} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SessionRowProps {
  session: TrainingSession;
  active: boolean;
  onClick: () => void;
}

function SessionRow({ session, active, onClick }: SessionRowProps) {
  const statusBadge =
    session.status === "completed"
      ? { color: "bg-[#3AF7A6]/12 text-[#3AF7A6]", icon: <CheckCircle size={10} /> }
      : session.status === "running"
        ? { color: "bg-[#FFB800]/12 text-[#FFB800]", icon: <Loader2 size={10} className="animate-spin" /> }
        : session.status === "reviewing"
          ? { color: "bg-[#6A5BFF]/12 text-[#6A5BFF]", icon: <Loader2 size={10} className="animate-spin" /> }
          : { color: "bg-[#FF6B6B]/12 text-[#FF6B6B]", icon: <XCircle size={10} /> };

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer hover:[&>td]:bg-white/[0.02] ${
        active ? "[&>td]:bg-[#FFBD59]/8" : ""
      }`}
    >
      <td className="p-2.5 border-b border-white/[0.02] align-middle">
        <div className="flex items-center gap-1.5">
          {active && <ChevronRight size={12} className="text-[#FFBD59] flex-shrink-0" />}
          <span className="text-[12px] font-semibold text-white truncate">
            {session.scenario_focus.slice(0, 40)}
          </span>
        </div>
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle whitespace-nowrap">
        <span className="inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded bg-[#6A5BFF]/12 text-[#6A5BFF]">
          {session.agent_slug}
        </span>
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle text-center">
        <span
          className={`inline-flex items-center gap-1 h-[22px] px-2 text-[10px] font-bold rounded uppercase ${statusBadge.color}`}
        >
          {statusBadge.icon}
          {session.status}
        </span>
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle text-center text-[11px] text-white/60">
        {session.total_turns ?? 0}/{session.max_turns ?? 10}
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle text-right">
        {session.opus_score !== null ? (
          <span className={`text-[14px] font-bold ${scoreColor(session.opus_score)}`}>
            {session.opus_score}
          </span>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </td>
      <td className="p-2.5 border-b border-white/[0.02] align-middle text-[11px] text-white/40 whitespace-nowrap">
        {formatDate(session.started_at)}
      </td>
    </tr>
  );
}

interface RubricDetailProps {
  score: TrainingScore;
}

function RubricDetail({ score }: RubricDetailProps) {
  const label = RUBRIC_LABELS[score.rubric_key] || score.rubric_key;
  return (
    <div className="bg-white/[0.02] rounded-md p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-white/80">{label}</span>
        <span className={`text-[12px] font-bold ${scoreColor(score.score_0_100)}`}>
          {score.score_0_100}
        </span>
      </div>
      <div className="w-full h-1 bg-white/[0.06] rounded overflow-hidden mb-1.5">
        <div
          className={`h-full ${scoreBarColor(score.score_0_100)} transition-all`}
          style={{ width: `${score.score_0_100}%` }}
        />
      </div>
      {score.opus_feedback && (
        <div className="text-[10px] text-white/50 leading-relaxed">{score.opus_feedback}</div>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
}

function Sparkline({ data }: SparklineProps) {
  if (data.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-[11px] text-white/30">
        (chưa có dữ liệu)
      </div>
    );
  }

  const max = 100;
  const min = 0;
  const width = 100;
  const height = 100;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((value, i) => {
      const x = i * step;
      const y = height - ((value - min) / (max - min)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  // Color based on latest value
  const latest = data[data.length - 1] || 0;
  const stroke = latest >= 90 ? "#3AF7A6" : latest >= 75 ? "#00F0FF" : latest >= 60 ? "#FFB800" : "#FF6B6B";

  return (
    <div className="relative h-16">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Threshold line at 75 (pass) */}
        <line
          x1="0"
          y1={height - ((75 - min) / (max - min)) * height}
          x2={width}
          y2={height - ((75 - min) / (max - min)) * height}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((value, i) => {
          const x = i * step;
          const y = height - ((value - min) / (max - min)) * height;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.2"
              fill={stroke}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    </div>
  );
}
