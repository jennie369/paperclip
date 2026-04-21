// ConversationItem — Professional conversation row with avatar, badges, and actions
// Features: Real avatars, online status, channel badges, labels, smooth hover states

import { useState } from "react";
import { type ChannelSession } from "@/api/channels";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { ConversationActions } from "./ConversationActions";
import { Pin, VolumeX, Phone, Facebook, Globe, Mail, Users, Bot, Paperclip } from "lucide-react";

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

const LABEL_CONFIG: Record<string, { text: string; color: string; bg: string }> = {
  hot: { text: "HOT", color: "text-red-500", bg: "bg-red-500/10" },
  warm: { text: "Ấm", color: "text-amber-500", bg: "bg-amber-500/10" },
  cold: { text: "Lạnh", color: "text-blue-400", bg: "bg-blue-400/10" },
  vip: { text: "VIP", color: "text-purple-500", bg: "bg-purple-500/10" },
  spam: { text: "Spam", color: "text-zinc-400", bg: "bg-zinc-400/10" },
  khach_hang: { text: "Khách hàng", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  doi_tac: { text: "Đối tác", color: "text-blue-500", bg: "bg-blue-500/10" },
  ctv: { text: "CTV", color: "text-orange-500", bg: "bg-orange-500/10" },
};

// Channel icon by type
function ChannelIcon({ channel }: { channel: string }) {
  const ch = channel.toLowerCase();
  if (ch.includes("zalo")) {
    return (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.46 14.5c-.2.22-.58.32-.84.32h-7.4c-.26 0-.45-.05-.6-.15-.26-.17-.35-.46-.35-.73v-.15l.52-1.67c.1-.32.35-.52.67-.52h4.38l-4.96-5.62c-.23-.27-.3-.6-.15-.93.15-.33.46-.5.84-.5h5.75c.28 0 .55.1.73.28.2.2.27.48.2.75l-.5 1.55c-.1.32-.4.55-.73.55H10.6l4.98 5.62c.25.3.33.65.18 1-.13.3-.4.5-.74.5h-.46l.46.1c.15.04.3.12.44.3z"/>
      </svg>
    );
  }
  if (ch.includes("facebook") || ch.includes("fb")) return <Facebook className="h-3 w-3" />;
  if (ch.includes("telegram")) {
    return (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    );
  }
  if (ch.includes("phone") || ch.includes("call")) return <Phone className="h-3 w-3" />;
  if (ch.includes("email")) return <Mail className="h-3 w-3" />;
  return <Globe className="h-3 w-3" />;
}

// Avatar component with fallback
function Avatar({
  src,
  name,
  isGroup,
  isOnline,
  size = "md"
}: {
  src?: string | null;
  name: string;
  isGroup?: boolean;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initial = name.charAt(0).toUpperCase();

  // Generate consistent color from name
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = isGroup ? "bg-indigo-500" : colors[colorIndex];

  return (
    <div className="relative shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-background`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div className={`
        ${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center
        font-semibold text-white ring-2 ring-background
        ${src ? "hidden" : ""}
      `}>
        {isGroup ? <Users className="h-4 w-4" /> : initial}
      </div>

      {/* Online indicator */}
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
      )}
    </div>
  );
}

export function ConversationItem({ conversation: conv, isSelected, onClick, onAction, channelMap }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const isUnread = (conv.unread_count || 0) > 0;

  // Channel display info
  const chInfo = conv.channel_name ? channelMap[conv.channel_name] : null;
  const channelLabel = chInfo?.display_name || conv.channel_name || "Kênh";

  // Determine if group (with proper type assertion)
  const isGroup = Boolean(conv.is_group || (conv.metadata as Record<string, unknown>)?.is_group);

  // Get display name - prioritize customer display_name, then sender_name, finally sender_id
  const displayName = String(
    isGroup
      ? (conv.group_name || (conv.metadata as Record<string, unknown>)?.group_name || "Nhóm")
      : (conv.customer?.display_name || conv.sender_name || formatPhoneNumber(conv.sender_id) || "Khách hàng")
  );

  // Get avatar URL (with proper type assertion)
  const avatarUrl = (conv.customer?.avatar_url || (conv.metadata as Record<string, unknown>)?.avatar_url || null) as string | null;

  // Check if online (last activity within 5 minutes)
  const lastActivity = conv.last_message_at ? new Date(conv.last_message_at) : null;
  const isOnline = lastActivity ? (Date.now() - lastActivity.getTime()) < 5 * 60 * 1000 : false;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  // Format message preview - truncate and clean up
  const preview = formatPreview(conv.last_message_preview);

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`
          group relative px-3 py-3 cursor-pointer transition-all duration-150
          ${isSelected
            ? "bg-primary/8 border-l-[3px] border-l-primary"
            : "hover:bg-muted/40 border-l-[3px] border-l-transparent"
          }
          ${isUnread ? "bg-muted/20" : ""}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar
            src={avatarUrl}
            name={displayName}
            isGroup={isGroup}
            isOnline={isOnline}
            size="md"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Time */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[14px] truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                  {displayName}
                </span>
                {isGroup && conv.member_count != null && (
                  <span className="text-[11px] text-muted-foreground">({String(conv.member_count)})</span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatTime(conv.last_message_at)}
              </span>
            </div>

            {/* Row 2: Channel badge + Agent badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`
                inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                ${getChannelStyle(conv.channel_name || "")}
              `}>
                <ChannelIcon channel={conv.channel_name || ""} />
                {channelLabel}
              </span>

              {conv.agent_slug && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-500">
                  <Bot className="h-3 w-3" />
                  {conv.agent_slug}
                </span>
              )}
            </div>

            {/* Row 3: Message preview */}
            <div className="flex items-center gap-2">
              <p className={`text-[13px] truncate flex-1 ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                {conv.last_message_sender && (
                  <span className="font-medium">{conv.last_message_sender}: </span>
                )}
                {preview || "..."}
              </p>

              {/* Badges */}
              <div className="flex items-center gap-1 shrink-0">
                {conv.has_attachments && (
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {isUnread && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold text-white bg-red-500 rounded-full px-1.5">
                    {(conv.unread_count || 0) > 99 ? "99+" : conv.unread_count}
                  </span>
                )}
              </div>
            </div>

            {/* Row 4: Labels & status indicators */}
            {(conv.label || conv.is_pinned || conv.is_muted) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {conv.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                    <Pin className="h-3 w-3" />
                  </span>
                )}
                {conv.is_muted && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <VolumeX className="h-3 w-3" />
                  </span>
                )}
                {conv.label && LABEL_CONFIG[conv.label] && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LABEL_CONFIG[conv.label].color} ${LABEL_CONFIG[conv.label].bg}`}>
                    {LABEL_CONFIG[conv.label].text}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hover action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ x: rect.right, y: rect.bottom });
            setShowMenu(true);
          }}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            p-1.5 rounded-md transition-all duration-150
            bg-background/90 border border-border/50 shadow-sm
            opacity-0 group-hover:opacity-100
            hover:bg-muted
          `}
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

// Helper: Format phone number for display
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("84")) {
    return `+84 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
}

// Helper: Clean and truncate message preview
function formatPreview(preview: string | null | undefined): string {
  if (!preview) return "";

  // Remove JSON-like content
  if (preview.startsWith("{") && preview.includes('"')) {
    try {
      const parsed = JSON.parse(preview);
      if (parsed.type === "system") return "[Hệ thống]";
      if (parsed.type === "sticker") return "[Sticker]";
      if (parsed.type === "image" || parsed.href) return "[Hình ảnh]";
      if (parsed.fileName) return `[Tệp] ${parsed.fileName}`;
    } catch {
      // Not JSON, continue
    }
    return "[Tin nhắn]";
  }

  return preview.slice(0, 80);
}

// Helper: Get channel-specific styles
function getChannelStyle(channel: string): string {
  const ch = channel.toLowerCase();
  if (ch.includes("zalo")) return "bg-blue-500/10 text-blue-500";
  if (ch.includes("facebook") || ch.includes("fb")) return "bg-blue-600/10 text-blue-600";
  if (ch.includes("telegram")) return "bg-sky-500/10 text-sky-500";
  if (ch.includes("email")) return "bg-orange-500/10 text-orange-500";
  return "bg-muted text-muted-foreground";
}
