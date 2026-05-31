/**
 * CrmMessagingSentimentMatrix — Omnichannel Inbox · Sentiment / Emotion AI
 * ───────────────────────────────────────────────────────────────────────
 * Left: an inbox filtered by detected emotion (angry / neutral / happy) with
 * per-thread sentiment score. Right: an AI "empathy guide" that tells the
 * agent how to respond, plus one-tap smart replies. A tri-color gradient bar
 * (danger → warning → success) tops the card as the sentiment spectrum.
 *
 * Ported from the Gemral CRM mockup ("SENTIMENT MATRIX (Emotion AI)").
 * Theme-aware via gem-* tokens. Presentational; selecting a thread or reply
 * is surfaced via callbacks.
 *
 * @param {string} [title="Sentiment Matrix"] - Inbox column heading.
 * @param {SentimentFilter[]} [filters] - Emotion filter toggles (frown/meh/smile by default).
 * @param {SentimentThread[]} [threads] - Conversations with sentiment label + score.
 * @param {string} [activeThreadId] - Currently focused thread id (controlled).
 * @param {(id: string) => void} [onSelectThread] - Thread click handler.
 * @param {string} [guideTitle="AI Empathy Guide"] - Heading of the guidance callout.
 * @param {string} [guideText] - Empathy guidance body.
 * @param {string[]} [smartReplies] - One-tap reply suggestions.
 * @param {(reply: string, index: number) => void} [onSmartReply] - Smart reply click handler.
 * @param {string} [className] - Extra classes on the card root.
 */
import { BarChart2, Frown, Meh, Smile, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SentimentMood = "angry" | "neutral" | "happy";

export interface SentimentFilter {
  mood: SentimentMood;
  icon?: LucideIcon;
}

export interface SentimentThread {
  id: string;
  name: string;
  /** e.g. "Angry (89%)" / "Joy (95%)". */
  sentimentLabel: string;
  preview: string;
  mood: SentimentMood;
  /** Dim the row (already-handled / low priority). */
  muted?: boolean;
}

const MOOD_META: Record<SentimentMood, { icon: LucideIcon; text: string; bg: string; border: string; hover: string }> = {
  angry: { icon: Frown, text: "text-gem-danger", bg: "bg-gem-danger/10", border: "border-gem-danger/30", hover: "hover:bg-gem-danger/20" },
  neutral: { icon: Meh, text: "text-gem-warning", bg: "bg-gem-warning/10", border: "border-gem-warning/30", hover: "hover:bg-gem-warning/20" },
  happy: { icon: Smile, text: "text-gem-success", bg: "bg-gem-success/10", border: "border-gem-success/30", hover: "hover:bg-gem-success/20" },
};

const SAMPLE_FILTERS: SentimentFilter[] = [
  { mood: "angry" },
  { mood: "neutral" },
  { mood: "happy" },
];

const SAMPLE_THREADS: SentimentThread[] = [
  {
    id: "t1",
    name: "Chị Thủy",
    sentimentLabel: "Angry (89%)",
    preview: '"Sao hàng giao 3 ngày rồi chưa tới???"',
    mood: "angry",
  },
  {
    id: "t2",
    name: "Anh Tú",
    sentimentLabel: "Joy (95%)",
    preview: '"Sản phẩm dùng tốt lắm, cảm ơn shop."',
    mood: "happy",
    muted: true,
  },
];

const SAMPLE_GUIDE_TEXT =
  "Khách hàng đang bức xúc về thời gian giao hàng. Hãy xin lỗi chân thành, không đổ lỗi cho vận chuyển, và offer mã giảm giá 10% cho đơn sau để xoa dịu.";

const SAMPLE_REPLIES = [
  '"Dạ em xin lỗi chị, để em check lại ngay..."',
  '"Mong chị thông cảm, đơn hỏa tốc..."',
];

export function CrmMessagingSentimentMatrix({
  title = "Sentiment Matrix",
  filters = SAMPLE_FILTERS,
  threads = SAMPLE_THREADS,
  activeThreadId,
  onSelectThread,
  guideTitle = "AI Empathy Guide",
  guideText = SAMPLE_GUIDE_TEXT,
  smartReplies = SAMPLE_REPLIES,
  onSmartReply,
  className,
}: {
  title?: string;
  filters?: SentimentFilter[];
  threads?: SentimentThread[];
  activeThreadId?: string;
  onSelectThread?: (id: string) => void;
  guideTitle?: string;
  guideText?: string;
  smartReplies?: string[];
  onSmartReply?: (reply: string, index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard h-[500px] w-full p-0 flex flex-col overflow-hidden group">
        {/* Sentiment spectrum bar */}
        <div className="h-1 bg-gradient-to-r from-gem-danger via-gem-warning to-gem-success" />
        <div className="flex-1 flex bg-gem-surface/80 backdrop-blur-xl relative z-10 min-h-0">
          {/* Left: sentiment-filtered inbox */}
          <div className="w-1/3 border-r border-gem-border/10 p-4 flex flex-col gap-4 min-h-0">
            <div className="text-sm font-black text-gem-text tracking-widest uppercase flex justify-between items-center">
              {title}
              <BarChart2 className="w-4 h-4 text-gem-text-muted" />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {filters.map((f) => {
                const meta = MOOD_META[f.mood];
                const Icon = f.icon ?? meta.icon;
                return (
                  <button
                    key={f.mood}
                    type="button"
                    aria-label={f.mood}
                    className={cn(
                      "flex-1 p-2 rounded border flex justify-center transition-colors",
                      meta.bg,
                      meta.border,
                      meta.text,
                      meta.hover,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {threads.map((t) => {
                const meta = MOOD_META[t.mood];
                const active = t.id === activeThreadId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectThread?.(t.id)}
                    className={cn(
                      "w-full text-left pcard-inner p-3 border-l-4 cursor-pointer transition-colors",
                      t.mood === "angry" ? "border-l-gem-danger" : t.mood === "happy" ? "border-l-gem-success" : "border-l-gem-warning",
                      active ? meta.bg : t.muted ? "bg-gem-surface opacity-70" : `${meta.bg.replace("/10", "/5")}`,
                      meta.hover,
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-bold text-sm", t.muted ? "text-gem-text" : "text-gem-text")}>{t.name}</span>
                      <span className={cn("text-[10px] font-bold", meta.text)}>{t.sentimentLabel}</span>
                    </div>
                    <div className="text-xs text-gem-text-muted truncate">{t.preview}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: empathy guide + smart replies */}
          <div className="w-2/3 p-6 flex flex-col relative min-h-0">
            <div className="absolute inset-0 bg-gem-danger/5 opacity-50 pointer-events-none" />

            <div className="bg-gem-danger/10 border border-gem-danger/30 rounded-xl p-4 mb-6 relative z-10 backdrop-blur-md flex items-start gap-4 shadow-[0_0_20px_rgb(var(--gem-danger-rgb)/0.1)]">
              <div className="w-10 h-10 rounded-full bg-gem-danger/20 flex items-center justify-center text-gem-danger shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gem-danger mb-1">{guideTitle}</h4>
                <p className="text-xs text-gem-text-muted">{guideText}</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Smart replies */}
            <div className="flex flex-wrap gap-2 relative z-10">
              {smartReplies.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSmartReply?.(r, i)}
                  className="px-4 py-2 bg-gem-surface border border-gem-border/20 rounded text-xs text-gem-text-muted hover:text-gem-text hover:bg-gem-surface-raised transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingSentimentMatrix;
