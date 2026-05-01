// Training Room — live stream UI for CEO ↔ sales-closer training sessions.
//
// Layout:
//   ┌──────────────────────────────────────────────────────────────┐
//   │  Header: scenario picker + agent picker + start button       │
//   ├────────────────────────────┬─────────────────────────────────┤
//   │  CEO column (left)         │  Agent column (right)           │
//   │  ❓ test prompts            │  ✅ replies + tool calls         │
//   ├────────────────────────────┴─────────────────────────────────┤
//   │  Bottom: Opus rubric scores + recent sessions list           │
//   └──────────────────────────────────────────────────────────────┘
//
// Real-time updates via WebSocket /api/training/live/:session_id

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  History,
  Wrench,
} from "lucide-react";
import {
  trainingApi,
  openTrainingLiveSocket,
  type TrainingSession,
  type TrainingTurn,
  type TrainingScore,
} from "@/api/training";

const SCENARIO_OPTIONS = [
  { id: "S01_discovery_new_lead", label: "S01 — Khách mới hỏi tổng quát", difficulty: "easy" },
  { id: "S02_price_objection_crystal", label: "S02 — Khách chê đá đắt", difficulty: "easy" },
  { id: "S03_compare_t1_t2", label: "S03 — So sánh Tier 1 vs Tier 2", difficulty: "medium" },
  { id: "S04_order_lookup_no_verify", label: "S04 — Hỏi đơn (chưa verify)", difficulty: "medium" },
  { id: "S05_order_lookup_with_verify", label: "S05 — Hỏi đơn (có verify)", difficulty: "medium" },
  { id: "S06_refund_within_policy", label: "S06 — Refund trong policy", difficulty: "medium" },
  { id: "S07_refund_denied_consumed", label: "S07 — Refund bị từ chối", difficulty: "hard" },
  { id: "S08_public_complaint_threat", label: "S08 — Dọa bóc phốt 🚨", difficulty: "critical" },
  { id: "S09_crystal_recommendation", label: "S09 — Recommend crystal", difficulty: "medium" },
  { id: "S10_upsell_t1_to_t2", label: "S10 — Upsell T1 → T2", difficulty: "easy" },
  { id: "S11_recall_past_conversation", label: "S11 — Khách quay lại", difficulty: "medium" },
  { id: "S12_identity_verify_fail", label: "S12 — Verify fail 3 lần", difficulty: "hard" },
  { id: "S13_mental_health_distress", label: "S13 — Mental health 🚨", difficulty: "critical" },
  { id: "S14_international_shipping_misunderstanding", label: "S14 — Ship Mỹ", difficulty: "medium" },
];

const AGENT_OPTIONS = [
  { slug: "sales-closer", label: "Sales Closer (Ollama gemma4)" },
  { slug: "customer-success", label: "Customer Success" },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-[#3AF7A6]/12 text-[#3AF7A6]",
  medium: "bg-[#00F0FF]/12 text-[#00F0FF]",
  hard: "bg-[#FFB800]/12 text-[#FFB800]",
  critical: "bg-[#FF6B6B]/12 text-[#FF6B6B]",
};

// WebSocket events from training-orchestrator. The orchestrator emits a generic
// envelope: { type, session_id, data?: { ... } } where `type` is one of
// "started" | "turn" | "completed" | "failed" | "cancelled". For "turn" events
// the `data` payload contains the full TrainingTurn record. For terminal
// statuses, `data` carries the final status info (and the reviewer rows arrive
// separately via the next polling refetch).
interface LiveEvent {
  type: "started" | "turn" | "completed" | "failed" | "cancelled" | "connected";
  session_id?: string;
  data?: TrainingTurn & Record<string, unknown>;
}

export function TrainingRoomPage() {
  const queryClient = useQueryClient();

  const [selectedScenario, setSelectedScenario] = useState<string>(SCENARIO_OPTIONS[0]!.id);
  const [selectedAgent, setSelectedAgent] = useState<string>(AGENT_OPTIONS[0]!.slug);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveTurns, setLiveTurns] = useState<TrainingTurn[]>([]);
  const [liveScores, setLiveScores] = useState<TrainingScore[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>("idle");
  const wsRef = useRef<WebSocket | null>(null);

  // Recent sessions list (right of bottom panel)
  const { data: sessions = [] } = useQuery({
    queryKey: ["training", "sessions"],
    queryFn: () => trainingApi.listSessions(20),
    refetchInterval: 5_000,
  });

  // Hydrate turns + scores from REST when session selected (initial load)
  const { data: persistedTurns = [] } = useQuery({
    queryKey: ["training", "turns", activeSessionId],
    queryFn: () => trainingApi.getTurns(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: 3_000,
  });

  const { data: persistedScores = [] } = useQuery({
    queryKey: ["training", "scores", activeSessionId],
    queryFn: () => trainingApi.getScores(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: 5_000,
  });

  // Merge live + persisted turns (prefer live if same turn_no)
  const mergedTurns: TrainingTurn[] = useMemo(() => {
    const map = new Map<number, TrainingTurn>();
    for (const t of persistedTurns) map.set(t.turn_no, t);
    for (const t of liveTurns) map.set(t.turn_no, t);
    return Array.from(map.values()).sort((a, b) => a.turn_no - b.turn_no);
  }, [persistedTurns, liveTurns]);

  const mergedScores: TrainingScore[] = useMemo(() => {
    const map = new Map<string, TrainingScore>();
    for (const s of persistedScores) map.set(s.rubric_key, s);
    for (const s of liveScores) map.set(s.rubric_key, s);
    return Array.from(map.values());
  }, [persistedScores, liveScores]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!activeSessionId) return;

    const ws = openTrainingLiveSocket(activeSessionId);
    if (!ws) return;
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const evt = JSON.parse(event.data) as LiveEvent;

        if (evt.type === "started") setLiveStatus("running");
        if (evt.type === "completed") setLiveStatus("completed");
        if (evt.type === "failed") setLiveStatus("failed");
        if (evt.type === "cancelled") setLiveStatus("cancelled");

        if (evt.type === "turn" && evt.data && typeof evt.data.turn_no === "number") {
          const turn: TrainingTurn = {
            turn_no: evt.data.turn_no,
            role: (evt.data.role as "ceo" | "agent") || "agent",
            content: typeof evt.data.content === "string" ? evt.data.content : "",
            tool_calls: evt.data.tool_calls,
            tool_results: evt.data.tool_results,
            ts: typeof evt.data.ts === "string" ? evt.data.ts : new Date().toISOString(),
          };
          setLiveTurns((prev) => {
            const without = prev.filter((t) => t.turn_no !== turn.turn_no);
            return [...without, turn];
          });
        }
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeSessionId]);

  // Start session mutation
  const startMutation = useMutation({
    mutationFn: () =>
      trainingApi.start({
        agent_slug: selectedAgent,
        scenario: selectedScenario,
        max_turns: 10,
      }),
    onSuccess: (data) => {
      setActiveSessionId(data.session_id);
      setLiveTurns([]);
      setLiveScores([]);
      setLiveStatus("running");
      void queryClient.invalidateQueries({ queryKey: ["training", "sessions"] });
    },
  });

  const isRunning = liveStatus === "running" || startMutation.isPending;

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#0A0B1A] p-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-white mb-1">
          Phòng Training
        </h1>
        <p className="text-[12px] text-white/40">
          CEO Gemini đóng vai khách hàng để test agent. Opus 4.6 review sau mỗi
          session theo 10 tiêu chí. Mỗi feedback tự động inject vào lần training kế tiếp.
        </p>
      </div>

      {/* ── Control bar ────────────────────────────────────── */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/40 uppercase">
            Scenario
          </span>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            disabled={isRunning}
            className="h-8 px-2.5 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:border-[#6A5BFF]/40 focus:outline-none disabled:opacity-50"
          >
            {SCENARIO_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span
            className={`inline-flex items-center h-[22px] px-2 text-[10px] font-bold rounded uppercase ${
              DIFFICULTY_COLOR[
                SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.difficulty || "medium"
              ]
            }`}
          >
            {SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/40 uppercase">Agent</span>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={isRunning}
            className="h-8 px-2.5 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:border-[#6A5BFF]/40 focus:outline-none disabled:opacity-50"
          >
            {AGENT_OPTIONS.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {liveStatus !== "idle" && (
          <span
            className={`inline-flex items-center gap-1 h-[22px] px-2 text-[10px] font-bold rounded uppercase ${
              liveStatus === "running"
                ? "bg-[#FFB800]/12 text-[#FFB800]"
                : liveStatus === "completed"
                  ? "bg-[#3AF7A6]/12 text-[#3AF7A6]"
                  : liveStatus === "reviewing"
                    ? "bg-[#6A5BFF]/12 text-[#6A5BFF]"
                    : "bg-[#FF6B6B]/12 text-[#FF6B6B]"
            }`}
          >
            {liveStatus === "running" && <Loader2 size={10} className="animate-spin" />}
            {liveStatus === "completed" && <CheckCircle size={10} />}
            {liveStatus === "failed" && <XCircle size={10} />}
            {liveStatus}
          </span>
        )}

        <button
          onClick={() => startMutation.mutate()}
          disabled={isRunning}
          className="h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#FFBD59]/15 text-[#FFBD59] hover:bg-[#FFBD59]/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {isRunning ? "Đang chạy..." : "Bắt đầu session"}
        </button>
      </div>

      {/* ── Dual-column live stream ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* CEO column */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 min-h-[460px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-[#6A5BFF]/15 flex items-center justify-center">
              <MessageSquare size={16} className="text-[#6A5BFF]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">CEO (Gemini 2.5 Flash)</div>
              <div className="text-[10px] text-white/40">Đóng vai khách hàng</div>
            </div>
          </div>
          <TurnList turns={mergedTurns.filter((t) => t.role === "ceo")} accent="purple" />
        </div>

        {/* Agent column */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 min-h-[460px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-[#3AF7A6]/15 flex items-center justify-center">
              <CheckCircle size={16} className="text-[#3AF7A6]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">
                {selectedAgent === "sales-closer" ? "Sales Closer (Ollama gemma4)" : selectedAgent}
              </div>
              <div className="text-[10px] text-white/40">Reply tự nhiên + tool calls</div>
            </div>
          </div>
          <TurnList turns={mergedTurns.filter((t) => t.role === "agent")} accent="green" />
        </div>
      </div>

      {/* ── Bottom: Rubric scores + Recent sessions ─────────── */}
      <div className="grid grid-cols-[1fr_320px] gap-3">
        {/* Rubric scores */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-[#FFBD59]" />
            <h3 className="text-[13px] font-bold text-white">
              Rubric Opus 4.6 (10 tiêu chí)
            </h3>
            {mergedScores.length === 0 && (
              <span className="text-[10px] text-white/30 ml-auto">
                (chờ Opus review sau khi session xong)
              </span>
            )}
          </div>
          {mergedScores.length === 0 ? (
            <div className="text-center py-8">
              <Star size={32} className="mx-auto mb-2 text-white/10" />
              <div className="text-[12px] text-white/30">
                Chưa có scores. Chạy 1 session để xem rubric.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {mergedScores.map((s) => (
                <RubricRow key={s.rubric_key} score={s} />
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-[#00F0FF]" />
            <h3 className="text-[13px] font-bold text-white">Lịch sử gần đây</h3>
          </div>
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-[11px] text-white/30 text-center py-4">
                Chưa có session nào
              </div>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onClick={() => setActiveSessionId(s.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface TurnListProps {
  turns: TrainingTurn[];
  accent: "purple" | "green";
}

function TurnList({ turns, accent }: TurnListProps) {
  if (turns.length === 0) {
    return (
      <div className="text-center py-10 px-3">
        <MessageSquare size={28} className="mx-auto mb-2 text-white/10" />
        <div className="text-[12px] text-white/30">Chưa có message</div>
        <div className="text-[10px] text-white/20 mt-1">
          Bắt đầu session để xem live stream
        </div>
      </div>
    );
  }

  const accentBg = accent === "purple" ? "bg-[#6A5BFF]/8" : "bg-[#3AF7A6]/8";
  const accentBorder = accent === "purple" ? "border-[#6A5BFF]/15" : "border-[#3AF7A6]/15";

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {turns.map((t) => {
        const hasToolCalls =
          Array.isArray(t.tool_calls) && (t.tool_calls as unknown[]).length > 0;
        return (
          <div
            key={t.turn_no}
            className={`${accentBg} border ${accentBorder} rounded-lg p-2.5`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">
                Turn {t.turn_no}
              </span>
              {hasToolCalls && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00F0FF]">
                  <Wrench size={10} /> {(t.tool_calls as unknown[]).length} tool call(s)
                </span>
              )}
            </div>
            <div className="text-[12px] text-[#E0E0F0] leading-relaxed whitespace-pre-wrap">
              {t.content || "(empty)"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RubricRowProps {
  score: TrainingScore;
}

function RubricRow({ score }: RubricRowProps) {
  const color =
    score.score_0_100 >= 90
      ? "text-[#3AF7A6]"
      : score.score_0_100 >= 75
        ? "text-[#00F0FF]"
        : score.score_0_100 >= 60
          ? "text-[#FFB800]"
          : "text-[#FF6B6B]";

  const barColor =
    score.score_0_100 >= 90
      ? "bg-[#3AF7A6]"
      : score.score_0_100 >= 75
        ? "bg-[#00F0FF]"
        : score.score_0_100 >= 60
          ? "bg-[#FFB800]"
          : "bg-[#FF6B6B]";

  return (
    <div className="bg-white/[0.02] rounded-md p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-white/80">{score.rubric_key}</span>
        <span className={`text-[12px] font-bold ${color}`}>{score.score_0_100}</span>
      </div>
      <div className="w-full h-1 bg-white/[0.06] rounded overflow-hidden mb-1">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${score.score_0_100}%` }}
        />
      </div>
      {score.opus_feedback && (
        <div className="text-[10px] text-white/40 line-clamp-2">{score.opus_feedback}</div>
      )}
    </div>
  );
}

interface SessionRowProps {
  session: TrainingSession;
  active: boolean;
  onClick: () => void;
}

function SessionRow({ session, active, onClick }: SessionRowProps) {
  const statusColor =
    session.status === "completed"
      ? "text-[#3AF7A6]"
      : session.status === "running"
        ? "text-[#FFB800]"
        : session.status === "reviewing"
          ? "text-[#6A5BFF]"
          : "text-[#FF6B6B]";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md p-2 transition-colors border-none cursor-pointer ${
        active ? "bg-[#FFBD59]/10" : "bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-semibold text-white truncate">
          {session.scenario_focus.slice(0, 24)}
        </span>
        {session.opus_score !== null && (
          <span className="text-[11px] font-bold text-[#FFBD59] flex-shrink-0">
            {session.opus_score}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className={`font-semibold uppercase ${statusColor}`}>{session.status}</span>
        <span className="text-white/30">{session.agent_slug}</span>
      </div>
    </button>
  );
}
