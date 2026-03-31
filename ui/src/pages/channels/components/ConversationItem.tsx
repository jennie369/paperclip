// Phase 0: Conversation row in the list
// Shows avatar, name, channel badge (display_name), agent badge, preview, timestamp, unread, labels

import { useState } from "react";
import { type ChannelSession } from "@/api/channels";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { ConversationActions } from "./ConversationActions";

interface Props {
  conversation: ChannelSession;
  isSelected: boolean;
  onClick: () => void;
  onAction: () => void;
  channelMap: ChannelDisplayMap;
}

function formatTime(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return d.toLocaleDateString("vi-VN", { weekday: "short" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

const LABEL_BADGES: Record<string, { text: string; className: string }> = {
  hot: { text: "HOT", className: "text-red-500 bg-red-500/10" },
  warm: { text: "Ấm", className: "text-amber-500 bg-amber-500/10" },
  cold: { text: "Lạnh", className: "text-blue-400 bg-blue-400/10" },
  vip: { text: "VIP", className: "text-purple-500 bg-purple-500/10" },
  spam: { text: "Spam", className: "text-zinc-400 bg-zinc-400/10" },
};

export function ConversationItem({ conversation: conv, isSelected, onClick, onAction, channelMap }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const isUnread = (conv.unread_count || 0) > 0;

  // Channel display info from channelMap
  const chInfo = conv.channel_name ? channelMap[conv.channel_name] : null;
  const channelLabel = chInfo?.display_name || conv.channel_name || "Kênh";
  const channelColor = chInfo?.color || "#6B7280";

  const isGroup = conv.is_group || conv.metadata?.is_group;
  const displayName = String(isGroup
    ? (conv.group_name || conv.metadata?.group_name || "Nhóm")
    : (conv.customer?.display_name || conv.sender_name || conv.sender_id || "Không rõ"));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`group relative px-3 py-3 cursor-pointer border-b border-border/50 transition-colors ${
          isSelected
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "hover:bg-muted/30"
        } ${isUnread ? "bg-muted/20" : ""}`}
      >
        {/* Row 1: Avatar + Name + Timestamp */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: isGroup ? "#6366f1" : channelColor }}
            >
              {isGroup ? "👥" : displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {/* Name */}
              <div className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                {displayName}
                {isGroup && conv.member_count ? (
                  <span className="text-xs text-muted-foreground ml-1">({conv.member_count})</span>
                ) : null}
              </div>
              {/* Channel + Agent */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ color: channelColor, backgroundColor: `${channelColor}15` }}
                >
                  {channelLabel}
                </span>
                {conv.agent_slug && (
                  <span className="text-xs text-violet-500 truncate">{conv.agent_slug}</span>
                )}
              </div>
            </div>
          </div>
          {/* Timestamp — separate from action button */}
          <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
            {formatTime(conv.last_message_at)}
          </span>
        </div>

        {/* Row 2: Message preview + unread badge */}
        <div className="mt-1.5 pl-[46px] flex items-center gap-2">
          <p className={`text-sm truncate flex-1 ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
            {conv.last_message_sender && <span className="font-medium">{conv.last_message_sender}: </span>}
            {conv.last_message_preview || "..."}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {conv.has_attachments && <span className="text-xs">📎</span>}
            {isUnread && (
              <span className="min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold text-white bg-red-500 rounded-full px-1">
                {(conv.unread_count || 0) > 99 ? "99+" : conv.unread_count}
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Labels (if any) */}
        {(conv.label || conv.is_pinned || conv.is_muted) && (
          <div className="flex items-center gap-1.5 mt-1 pl-[46px]">
            {conv.is_pinned && <span className="text-xs">📌</span>}
            {conv.is_muted && <span className="text-xs">🔇</span>}
            {conv.label && LABEL_BADGES[conv.label] && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${LABEL_BADGES[conv.label].className}`}>
                {LABEL_BADGES[conv.label].text}
              </span>
            )}
          </div>
        )}

        {/* Hover "..." button — positioned top-right, below timestamp */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ x: rect.right, y: rect.bottom });
            setShowMenu(true);
          }}
          className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-muted transition-opacity bg-background/80 border border-border/50"
          title="Thao tác"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-muted-foreground">
            <circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <ConversationActions
          conversation={conv}
          position={menuPos}
          onClose={() => setShowMenu(false)}
          onAction={onAction}
        />
      )}
    </>
  );
}
