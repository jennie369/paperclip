/**
 * CommandChatWindow — Command Center · column 3 (chat)
 * ──────────────────────────────────────────────────────
 * Header (contact + context + Bot/Human handoff segmented control + actions),
 * message thread (AI-reply marker, per-message hover action menu, positive-
 * sentiment AI-Capture affordance), and the smart composer: AI suggestion
 * chips + a ghost-typing overlay + a drag-drop dropzone + the Magic-Wand
 * rewrite button.
 *
 * Internal to the CrmMessaging family. The composer's drop highlight is local
 * UX state; everything else (draft, ghost text, bot mode, sends, rewrites,
 * drops) is owned by the parent CommandCenter and flows through callbacks.
 */
import { useState } from "react";
import {
  Phone,
  Star,
  MoreVertical,
  User,
  Bot,
  ChevronRight,
  Smile,
  Reply,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send as SendIcon,
  Wand2,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials } from "../_shared";
import type { CommandBotMode, CommandChatHeader, CommandDropPayload, CommandMessage } from "./types";

function MessageActions({
  side,
  onReact,
  onReply,
  onMore,
}: {
  side: "left" | "right";
  onReact?: () => void;
  onReply?: () => void;
  onMore?: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gem-surface-raised border border-gem-border/20 rounded-md p-0.5 shadow-lg z-10",
        side === "right" ? "-right-24" : "-left-24",
      )}
    >
      <button type="button" onClick={onReact} title="Thả cảm xúc" className="p-1 hover:bg-gem-surface-overlay rounded text-gem-text-muted hover:text-gem-text transition-colors">
        <Smile className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onReply} title="Trả lời" className="p-1 hover:bg-gem-surface-overlay rounded text-gem-text-muted hover:text-gem-text transition-colors">
        <Reply className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onMore} title="Thêm (Ghim, Copy...)" className="p-1 hover:bg-gem-surface-overlay rounded text-gem-text-muted hover:text-gem-text transition-colors">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function CommandChatWindow({
  chatHeader,
  botMode,
  onBotModeChange,
  dateLabel = "Hôm nay",
  messages,
  onMessageReact,
  onMessageReply,
  onMessageMore,
  onCaptureReview,
  aiSuggestions,
  onAiSuggestion,
  draft,
  onDraftChange,
  ghostText,
  onAcceptGhost,
  onSend,
  magicSpinning,
  onMagicRewrite,
  onDropPayload,
}: {
  chatHeader: CommandChatHeader;
  botMode: CommandBotMode;
  onBotModeChange?: (mode: CommandBotMode) => void;
  dateLabel?: string;
  messages: CommandMessage[];
  onMessageReact?: (i: number) => void;
  onMessageReply?: (i: number) => void;
  onMessageMore?: (i: number) => void;
  onCaptureReview?: (i: number) => void;
  aiSuggestions: string[];
  onAiSuggestion?: (text: string, i: number) => void;
  draft: string;
  onDraftChange: (text: string) => void;
  ghostText: string;
  onAcceptGhost?: () => void;
  onSend: () => void;
  magicSpinning?: boolean;
  onMagicRewrite?: () => void;
  onDropPayload?: (payload: CommandDropPayload) => void;
}) {
  const [dropActive, setDropActive] = useState(false);
  const magicVisible = draft.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col bg-gem-surface-overlay/20 min-w-0 min-h-0">
      {/* Header */}
      <div className="h-16 border-b border-gem-border/10 flex items-center justify-between px-6 backdrop-blur-md bg-gem-surface/30 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {chatHeader.avatarUrl ? (
              <img src={chatHeader.avatarUrl} alt={chatHeader.name} className="w-10 h-10 rounded-full shadow-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full shadow-lg bg-gem-gold/20 flex items-center justify-center text-gem-gold font-bold text-sm">
                {initials(chatHeader.name)}
              </div>
            )}
            <ChannelIcon channel={chatHeader.channel} className="absolute bottom-0 right-0 w-4 h-4 border border-gem-bg" iconClassName="w-2.5 h-2.5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-gem-text truncate">{chatHeader.name}</div>
            {(chatHeader.context || chatHeader.contextDetail) && (
              <div className="text-xs text-gem-text-muted flex items-center gap-1 truncate">
                {chatHeader.context}
                {chatHeader.contextDetail && (
                  <>
                    <ChevronRight className="w-3 h-3 shrink-0" /> {chatHeader.contextDetail}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Bot handoff segmented control */}
          <div className="flex items-center bg-gem-surface-raised/80 border border-gem-border/30 rounded-md p-0.5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => onBotModeChange?.("human")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-colors",
                botMode === "human"
                  ? "bg-gem-primary/15 text-gem-primary border border-gem-primary/20 font-bold"
                  : "text-gem-text-muted hover:text-gem-text font-medium",
              )}
            >
              <User className="w-3 h-3" /> Sale Trực
            </button>
            <button
              type="button"
              onClick={() => onBotModeChange?.("bot")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all relative overflow-hidden group/bot",
                botMode === "bot"
                  ? "bg-gem-cyan/15 text-gem-cyan border border-gem-cyan/20 shadow-[0_0_8px_rgb(var(--gem-cyan-rgb)/0.15)] font-bold"
                  : "text-gem-text-muted hover:text-gem-text font-medium",
              )}
            >
              {botMode === "bot" && <span className="absolute inset-0 bg-gem-cyan/10 animate-pulse" />}
              <Bot className="w-3 h-3 relative z-10 group-hover/bot:scale-110 transition-transform" />
              <span className="relative z-10">BOT Tự Động</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary"><Phone className="w-4 h-4" /></button>
            <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary"><Star className="w-4 h-4" /></button>
            <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        <div className="text-center text-xs text-gem-text-muted my-2">
          <span className="bg-gem-surface-raised px-3 py-1 rounded-full border border-gem-border/5">{dateLabel}</span>
        </div>

        {messages.map((m, i) =>
          m.from === "me" ? (
            <div key={i} className="flex flex-col gap-1 max-w-[70%] ml-auto items-end">
              <div className={cn("chat-bubble-sent p-3 text-sm relative group", m.aiReply && "overflow-hidden")}>
                {m.aiReply && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gem-cyan" />
                    <div className="flex items-center gap-1 text-[10px] font-black text-gem-cyan mb-1.5 border-b border-gem-cyan/20 pb-1 uppercase tracking-wider">
                      <Bot className="w-3 h-3" /> Trả lời tự động bằng AI
                    </div>
                  </>
                )}
                {m.text}
                <MessageActions side="left" onReact={() => onMessageReact?.(i)} onReply={() => onMessageReply?.(i)} onMore={() => onMessageMore?.(i)} />
              </div>
              {m.time && (
                <span className="text-[10px] text-gem-text-muted mr-1 flex items-center gap-1">
                  {m.time}
                  {m.read && <CheckCheck className="w-3 h-3 text-gem-cyan" />}
                </span>
              )}
            </div>
          ) : (
            <div key={i} className={cn("flex flex-col gap-1 max-w-[70%]", m.sentiment === "positive" && "max-w-[85%] mt-4")}>
              <div
                className={cn(
                  "chat-bubble-received p-3 text-sm shadow-md group relative",
                  m.sentiment === "positive" && "border-l-2 border-gem-gold bg-gem-gold/5",
                )}
              >
                {m.text}
                {m.sentiment === "positive" && (
                  <div className="absolute -right-2 top-0 translate-x-full flex flex-col gap-2 z-10 pl-2">
                    <button
                      type="button"
                      onClick={() => onCaptureReview?.(i)}
                      className="crm-bounce-short flex items-center gap-1.5 bg-gradient-to-r from-gem-gold/20 to-gem-gold/5 border border-gem-gold/40 text-gem-gold text-[10px] font-bold px-3 py-1.5 rounded-full shadow-[0_0_15px_rgb(var(--gem-gold-rgb)/0.2)] hover:bg-gem-gold hover:text-white transition-all whitespace-nowrap group/capture"
                    >
                      <Star className="w-3.5 h-3.5 fill-gem-gold group-hover/capture:fill-white" /> AI Capture Review
                    </button>
                  </div>
                )}
                <MessageActions side="right" onReact={() => onMessageReact?.(i)} onReply={() => onMessageReply?.(i)} onMore={() => onMessageMore?.(i)} />
              </div>
              {m.time && (
                <span className="text-[10px] text-gem-text-muted ml-1 flex items-center gap-1">
                  {m.time}
                  {m.sentimentLabel && (
                    <span className="bg-gem-gold/20 text-gem-gold px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px] font-bold">
                      {m.sentimentLabel}
                    </span>
                  )}
                </span>
              )}
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      <div className="p-4 bg-gem-surface/50 backdrop-blur-xl border-t border-gem-border/10 shrink-0">
        {aiSuggestions.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAiSuggestion?.(s, i)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors border",
                  i === 0
                    ? "bg-gem-primary/20 text-gem-primary border-gem-primary/30 hover:bg-gem-primary hover:text-white"
                    : "bg-gem-surface-raised border-gem-border/20 text-gem-text hover:bg-gem-border/40",
                )}
              >
                {i === 0 && <Sparkles className="w-3 h-3" />} {s}
              </button>
            ))}
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            const raw = e.dataTransfer.getData("application/json");
            if (raw && onDropPayload) {
              try {
                onDropPayload(JSON.parse(raw) as CommandDropPayload);
              } catch {
                /* ignore malformed drag payload */
              }
            }
          }}
          className={cn(
            "flex items-end gap-2 pcard-inner p-2 border transition-all",
            dropActive
              ? "border-gem-primary bg-gem-primary/10"
              : "border-gem-border/20 focus-within:border-gem-primary/50 focus-within:shadow-[0_0_15px_rgb(var(--gem-primary-rgb)/0.2)]",
          )}
        >
          <button type="button" className="p-2 text-gem-text-muted hover:text-gem-primary transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative flex items-center">
            {/* Ghost-typing overlay (shows only while input empty) */}
            {ghostText && !draft && (
              <div className="absolute left-2 right-10 text-sm text-gem-primary/60 pointer-events-none whitespace-nowrap overflow-hidden select-none font-medium flex items-center gap-2">
                <span className="bg-gem-primary text-white text-[9px] px-1 rounded uppercase font-black tracking-wider shrink-0">TAB</span>
                <span className="truncate">{ghostText}</span>
              </div>
            )}
            <input
              type="text"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && ghostText && !draft) {
                  e.preventDefault();
                  onAcceptGhost?.();
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="w-full bg-transparent border-none focus:outline-none text-sm text-gem-text py-2 pr-8 placeholder-gem-text-muted/50"
              placeholder="Nhập tin nhắn... (Dùng '/' để gọi mẫu câu, hoặc kéo thả Thẻ AI)"
            />
            {/* Magic Wand */}
            <button
              type="button"
              onClick={onMagicRewrite}
              title="Magic Rewrite: viết lại chuyên nghiệp"
              className={cn(
                "absolute right-0 z-20 p-1.5 rounded bg-gem-primary/10 hover:bg-gem-primary text-gem-primary hover:text-white shadow-[0_0_10px_rgb(var(--gem-primary-rgb)/0.2)] transition-all duration-300",
                magicVisible ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none",
                magicSpinning && "animate-spin bg-gem-primary text-white",
              )}
            >
              <Wand2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="p-2 text-gem-text-muted hover:text-gem-primary transition-colors"><Plus className="w-5 h-5" /></button>
            <button
              type="button"
              onClick={onSend}
              className="p-2 bg-gem-primary text-white rounded-lg hover:shadow-[0_0_15px_rgb(var(--gem-primary-rgb))] transition-all transform hover:scale-105"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
