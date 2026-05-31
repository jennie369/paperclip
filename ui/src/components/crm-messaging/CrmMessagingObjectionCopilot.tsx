/**
 * CrmMessagingObjectionCopilot — AI Objection Handling (Copilot)
 * ──────────────────────────────────────────────────────────────
 * Split panel: left = live customer chat showing an objection, right = an AI
 * copilot that proposes ready-to-insert rebuttals (e.g. value-emphasis vs
 * down-sell). Each suggestion is colour-coded by strategy tone and has an
 * "insert into chat" action.
 *
 * Ported 1:1 from the Gemral CRM messaging mockup
 * (docs/designs/2026-06-01-gemral-crm-messaging-layouts, "AI OBJECTION HANDLING").
 * Theme-aware (light + dark) via gem-* tokens. Presentational: all data comes
 * through props; `onInsert` surfaces the chosen rebuttal to the parent.
 *
 * @param {string} [title="AI Copilot"] - Copilot panel heading.
 * @param {string} [subtitle="Phân tích từ chối"] - Small uppercase eyebrow under the title.
 * @param {ObjectionCustomer} [customer] - Customer header (name, channel, status line).
 * @param {ObjectionMessage[]} [messages] - Chat transcript (from "them" | "me").
 * @param {string} [inputPlaceholder="Gõ câu trả lời..."] - Faux input placeholder.
 * @param {ObjectionSuggestion[]} [suggestions] - AI rebuttal cards.
 * @param {(text: string, index: number) => void} [onInsert] - Called when an "insert" button is clicked.
 * @param {string} [className] - Extra classes on the card root.
 */
import { Bot, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon } from "./_shared";
import type { CrmChannel, CrmTone } from "./types";

export interface ObjectionCustomer {
  name: string;
  channel: CrmChannel;
  statusLabel?: string;
}

export interface ObjectionMessage {
  from: "them" | "me";
  text: string;
}

export interface ObjectionSuggestion {
  label: string;
  /** Strategy accent — drives the left border + label colour. */
  tone: CrmTone;
  text: string;
  actionLabel?: string;
}

const SAMPLE_CUSTOMER: ObjectionCustomer = {
  name: "Khách Hàng (Đang do dự)",
  channel: "messenger",
};

const SAMPLE_MESSAGES: ObjectionMessage[] = [
  { from: "them", text: "Giá bên em hơi cao so với bên X, anh thấy chức năng cũng tương tự." },
];

const SAMPLE_SUGGESTIONS: ObjectionSuggestion[] = [
  {
    label: "Đề xuất 1: Nhấn mạnh giá trị độc bản",
    tone: "primary",
    text: "Dạ anh, bên em tuy giá nhỉnh hơn nhưng hệ thống bên em có tích hợp AI phân tích sâu và 3 công cụ độc quyền mà bên X không có, giúp anh tiết kiệm 2h làm việc mỗi ngày.",
    actionLabel: "Chèn vào chat",
  },
  {
    label: "Đề xuất 2: Down-sell (Đánh giá thấp rủi ro)",
    tone: "success",
    text: "Hay anh dùng thử gói Basic 1 tháng trước nhé? Gói này rẻ hơn bên X mà vẫn full tính năng cốt lõi để anh trải nghiệm chất lượng.",
    actionLabel: "Chèn vào chat",
  },
];

const BORDER_BY_TONE: Record<CrmTone, string> = {
  primary: "border-gem-primary",
  cyan: "border-gem-cyan",
  gold: "border-gem-gold",
  success: "border-gem-success",
  danger: "border-gem-danger",
  warning: "border-gem-warning",
  neutral: "border-gem-border/40",
};
const TEXT_BY_TONE: Record<CrmTone, string> = {
  primary: "text-gem-primary",
  cyan: "text-gem-cyan",
  gold: "text-gem-gold",
  success: "text-gem-success",
  danger: "text-gem-danger",
  warning: "text-gem-warning",
  neutral: "text-gem-text-muted",
};
const TINT_BY_TONE: Record<CrmTone, string> = {
  primary: "bg-gem-primary/5",
  cyan: "bg-gem-cyan/5",
  gold: "bg-gem-gold/5",
  success: "bg-gem-success/5",
  danger: "bg-gem-danger/5",
  warning: "bg-gem-warning/5",
  neutral: "bg-gem-surface/40",
};
const HOVER_BY_TONE: Record<CrmTone, string> = {
  primary: "hover:bg-gem-primary hover:text-white",
  cyan: "hover:bg-gem-cyan hover:text-white",
  gold: "hover:bg-gem-gold hover:text-white",
  success: "hover:bg-gem-success hover:text-white",
  danger: "hover:bg-gem-danger hover:text-white",
  warning: "hover:bg-gem-warning hover:text-white",
  neutral: "hover:bg-gem-surface-overlay",
};

export function CrmMessagingObjectionCopilot({
  title = "AI Copilot",
  subtitle = "Phân tích từ chối",
  customer = SAMPLE_CUSTOMER,
  messages = SAMPLE_MESSAGES,
  inputPlaceholder = "Gõ câu trả lời...",
  suggestions = SAMPLE_SUGGESTIONS,
  onInsert,
  className,
}: {
  title?: string;
  subtitle?: string;
  customer?: ObjectionCustomer;
  messages?: ObjectionMessage[];
  inputPlaceholder?: string;
  suggestions?: ObjectionSuggestion[];
  onInsert?: (text: string, index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard h-[500px] w-full p-0 flex overflow-hidden">
        <div
          className="aura aura-pulse"
          style={{
            background: "rgb(var(--gem-primary-rgb))",
            width: 500,
            height: 500,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: "calc(var(--gem-aura-strength) * 0.5)",
          }}
        />

        {/* Chat Area */}
        <div className="w-1/2 flex flex-col relative z-10 border-r border-gem-border/10">
          <div className="p-4 border-b border-gem-border/10 bg-gem-surface/50 backdrop-blur-md font-bold text-gem-text flex items-center gap-2">
            <ChannelIcon channel={customer.channel} className="w-5 h-5" iconClassName="w-3 h-3" />
            {customer.name}
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar flex flex-col">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 max-w-[90%] text-sm",
                  m.from === "me"
                    ? "chat-bubble-sent self-end"
                    : "chat-bubble-received self-start",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gem-border/10 bg-gem-surface-overlay/50">
            <div className="bg-gem-surface-raised border border-gem-border/20 rounded-full h-10 px-4 flex items-center text-sm text-gem-text-muted">
              {inputPlaceholder}
            </div>
          </div>
        </div>

        {/* AI Copilot Panel */}
        <div className="w-1/2 bg-gem-surface/80 backdrop-blur-xl p-5 flex flex-col relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gem-primary to-gem-cyan flex items-center justify-center shadow-[0_0_15px_rgb(var(--gem-primary-rgb)/0.5)]">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gem-text">{title}</h3>
              <div className="text-[10px] text-gem-cyan font-bold tracking-widest uppercase">{subtitle}</div>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={cn("pcard-inner p-4 border-l-2", BORDER_BY_TONE[s.tone], TINT_BY_TONE[s.tone])}
              >
                <div className={cn("text-xs font-bold mb-2", TEXT_BY_TONE[s.tone])}>{s.label}</div>
                <p className="text-sm text-gem-text italic mb-3">{s.text}</p>
                <button
                  type="button"
                  onClick={() => onInsert?.(s.text, i)}
                  className={cn(
                    "text-xs bg-gem-surface-raised border border-gem-border/20 px-3 py-1.5 rounded transition-colors w-full font-bold",
                    HOVER_BY_TONE[s.tone],
                  )}
                >
                  {s.actionLabel ?? "Chèn vào chat"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingObjectionCopilot;
