/**
 * CommandConversationList — Command Center · column 2 (conversations)
 * ────────────────────────────────────────────────────────────────────
 * Searchable conversation list. Each row carries the merged "Sentiment Matrix"
 * language: an emotion ring around the avatar (angry/happy/active/neutral), a
 * sub-account target-avatar overlay + a "receiving account" pill, an AI intent
 * chip on the preview, plus a live typing indicator OR an SLA-breach badge.
 *
 * Internal to the CrmMessaging family. Presentational; selection via callback.
 */
import { Search, SlidersHorizontal, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials } from "../_shared";
import type { CommandConversation, CommandSentiment } from "./types";
import type { CrmTone } from "../types";

/** Emotion ring (+ glow) around the avatar. */
const RING: Record<CommandSentiment, string> = {
  angry: "ring-2 ring-gem-danger shadow-[0_0_15px_rgb(var(--gem-danger-rgb))]",
  happy: "ring-2 ring-gem-success/50 shadow-[0_0_10px_rgb(var(--gem-success-rgb)/0.3)]",
  active: "ring-2 ring-gem-primary/50 shadow-[0_0_10px_rgb(var(--gem-primary-rgb)/0.5)]",
  neutral: "ring-2 ring-gem-surface",
};

const INTENT_CHIP: Record<CrmTone, string> = {
  primary: "bg-gem-primary/20 text-gem-primary",
  cyan: "bg-gem-cyan/20 text-gem-cyan",
  gold: "bg-gem-gold/20 text-gem-gold",
  success: "bg-gem-success/20 text-gem-success",
  danger: "bg-gem-danger/20 text-gem-danger",
  warning: "bg-gem-warning/20 text-gem-warning",
  neutral: "bg-gem-surface-raised text-gem-text-muted",
};

function TypingDots() {
  return (
    <span className="text-[10px] text-gem-primary font-bold animate-pulse flex items-center gap-1">
      Đang nhập
      <span className="flex gap-0.5">
        <span className="w-1 h-1 bg-gem-primary rounded-full animate-bounce" />
        <span className="w-1 h-1 bg-gem-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
        <span className="w-1 h-1 bg-gem-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
      </span>
    </span>
  );
}

function ConversationRow({
  c,
  active,
  onSelect,
}: {
  c: CommandConversation;
  active: boolean;
  onSelect?: (id: string) => void;
}) {
  const sentiment = c.sentiment ?? "neutral";
  const isUnreadDanger = c.unread && sentiment === "angry";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(c.id)}
      className={cn(
        "text-left p-3 rounded-xl cursor-pointer relative transition-colors border w-full",
        active
          ? "bg-gem-primary/10 border-gem-primary/30 shadow-[inset_4px_0_0_rgb(var(--gem-primary-rgb))]"
          : isUnreadDanger
            ? "bg-gem-danger/5 border-gem-danger/30"
            : c.muted
              ? "border-transparent opacity-70 hover:opacity-100 hover:bg-gem-surface-raised hover:border-gem-border/10"
              : "border-transparent hover:bg-gem-surface-raised hover:border-gem-border/10",
      )}
    >
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Avatar + sentiment ring + target-account overlay */}
          <div className="relative mt-0.5 shrink-0">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt={c.name} className={cn("w-10 h-10 rounded-full object-cover", RING[sentiment])} />
            ) : (
              <div
                className={cn(
                  "w-10 h-10 rounded-full bg-gem-gold/20 flex items-center justify-center text-gem-gold font-bold text-xs",
                  RING[sentiment],
                )}
              >
                {initials(c.name)}
              </div>
            )}
            {c.targetAccount &&
              (c.targetAccount.avatarUrl ? (
                <img
                  src={c.targetAccount.avatarUrl}
                  alt={c.targetAccount.label}
                  title={`Gửi đến: ${c.targetAccount.label}`}
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md ring-2 ring-gem-surface shadow-md object-cover"
                />
              ) : (
                <ChannelIcon
                  channel={c.targetAccount.channel}
                  className="absolute -bottom-1 -right-1 w-4 h-4 !rounded-md ring-2 ring-gem-surface shadow-md"
                  iconClassName="w-2.5 h-2.5"
                />
              ))}
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "text-sm leading-tight flex items-center gap-1 truncate",
                c.muted ? "font-semibold text-gem-text" : "font-bold text-gem-text",
              )}
            >
              {c.name}
              {c.vip && (
                <span className="text-[9px] text-gem-gold border border-gem-gold/30 px-1 rounded bg-gem-gold/10 font-bold uppercase shrink-0">
                  VIP
                </span>
              )}
            </div>
            {c.targetAccount && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gem-text-muted font-medium">
                <CornerDownRight className="w-3 h-3 text-gem-text-faint shrink-0" />
                <div className="flex items-center gap-1 bg-gem-surface-overlay px-1.5 py-0.5 rounded border border-gem-border/10 min-w-0">
                  <ChannelIcon channel={c.targetAccount.channel} className="w-2.5 h-2.5 !rounded-none !bg-transparent" iconClassName="w-2.5 h-2.5" />
                  <span className="truncate">{c.targetAccount.label}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top-right slot: typing > SLA > time */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {c.typing ? (
            <TypingDots />
          ) : c.sla ? (
            <span
              className={cn(
                "bg-gem-danger text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgb(var(--gem-danger-rgb))]",
                c.sla.blink && "animate-pulse",
              )}
            >
              {c.sla.label}
            </span>
          ) : (
            <span className="text-[10px] text-gem-text-muted font-mono">{c.time}</span>
          )}
        </div>
      </div>

      <p
        className={cn(
          "text-[13px] line-clamp-1 mt-0.5",
          active ? "text-gem-text font-medium" : c.unread ? "text-gem-text font-bold" : "text-gem-text-muted",
        )}
      >
        {c.intentTag && (
          <span
            className={cn("text-[10px] px-1 rounded mr-1 font-bold", INTENT_CHIP[c.intentTag.tone ?? "primary"])}
          >
            ✨ {c.intentTag.label}
          </span>
        )}
        {c.preview}
      </p>
    </button>
  );
}

export function CommandConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  listFilters,
  searchPlaceholder = "Tìm tên, số điện thoại...",
}: {
  conversations: CommandConversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  listFilters: string[];
  searchPlaceholder?: string;
}) {
  return (
    <div className="w-[300px] border-r border-gem-border/10 bg-gem-surface/30 flex flex-col shrink-0 min-h-0">
      <div className="p-4 border-b border-gem-border/10 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gem-text-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full bg-gem-surface-overlay border border-gem-border/20 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-gem-primary transition-colors shadow-inner text-gem-text"
          />
          <button type="button" className="absolute right-2 top-2 p-0.5 text-gem-text-muted hover:text-gem-primary">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
          {listFilters.map((f, i) => (
            <button
              key={f}
              type="button"
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border",
                i === 0
                  ? "bg-gem-primary/20 text-gem-primary border-gem-primary/30 shadow-[0_0_10px_rgb(var(--gem-primary-rgb)/0.1)]"
                  : "bg-gem-surface-raised text-gem-text-muted border-gem-border/10 hover:bg-gem-surface-overlay",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
        {conversations.map((c) => (
          <ConversationRow key={c.id} c={c} active={c.id === activeConversationId} onSelect={onSelectConversation} />
        ))}
      </div>
    </div>
  );
}
