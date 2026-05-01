// ChannelTabs — Horizontal tabs for filtering by channel type
// Professional design with channel icons and unread counts

import { useMemo } from "react";
import { MessageSquare, Phone, Facebook, Mail, Globe, Users } from "lucide-react";
import type { ChannelSession } from "@/api/channels";

interface Props {
  conversations: ChannelSession[];
  activeChannel: string | null;
  onChannelChange: (channel: string | null) => void;
}

interface ChannelConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  match: (channelName: string) => boolean;
}

// Zalo icon component
function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.46 14.5c-.2.22-.58.32-.84.32h-7.4c-.26 0-.45-.05-.6-.15-.26-.17-.35-.46-.35-.73v-.15l.52-1.67c.1-.32.35-.52.67-.52h4.38l-4.96-5.62c-.23-.27-.3-.6-.15-.93.15-.33.46-.5.84-.5h5.75c.28 0 .55.1.73.28.2.2.27.48.2.75l-.5 1.55c-.1.32-.4.55-.73.55H10.6l4.98 5.62c.25.3.33.65.18 1-.13.3-.4.5-.74.5h-.46l.46.1c.15.04.3.12.44.3z"/>
    </svg>
  );
}

const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    id: "all",
    label: "Tất cả",
    icon: MessageSquare,
    color: "text-foreground",
    bgColor: "bg-primary/10",
    match: () => true,
  },
  {
    id: "zalo",
    label: "Zalo",
    icon: ZaloIcon,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    match: (ch) => ch.toLowerCase().includes("zalo"),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    match: (ch) => ch.toLowerCase().includes("facebook") || ch.toLowerCase().includes("fb"),
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    match: (ch) => ch.toLowerCase().includes("telegram"),
  },
  {
    id: "webchat",
    label: "Website",
    icon: Globe,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    match: (ch) => ch.toLowerCase().includes("webchat") || ch.toLowerCase().includes("web"),
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    match: (ch) => ch.toLowerCase().includes("email"),
  },
];

export function ChannelTabs({ conversations, activeChannel, onChannelChange }: Props) {
  // Count conversations per channel type
  const channelCounts = useMemo(() => {
    const counts: Record<string, { total: number; unread: number }> = {
      all: { total: 0, unread: 0 },
    };

    CHANNEL_CONFIGS.forEach((cfg) => {
      if (cfg.id !== "all") {
        counts[cfg.id] = { total: 0, unread: 0 };
      }
    });

    conversations.forEach((conv) => {
      const channelName = conv.channel_name || "";
      counts.all.total++;
      if ((conv.unread_count || 0) > 0) counts.all.unread++;

      for (const cfg of CHANNEL_CONFIGS) {
        if (cfg.id !== "all" && cfg.match(channelName)) {
          counts[cfg.id].total++;
          if ((conv.unread_count || 0) > 0) counts[cfg.id].unread++;
          break;
        }
      }
    });

    return counts;
  }, [conversations]);

  // Only show tabs that have conversations
  const visibleTabs = useMemo(() => {
    return CHANNEL_CONFIGS.filter((cfg) => {
      if (cfg.id === "all") return true;
      return channelCounts[cfg.id]?.total > 0;
    });
  }, [channelCounts]);

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-background/50 backdrop-blur-sm overflow-x-auto scrollbar-none">
      {visibleTabs.map((cfg) => {
        const isActive = activeChannel === (cfg.id === "all" ? null : cfg.id);
        const counts = channelCounts[cfg.id] || { total: 0, unread: 0 };
        const Icon = cfg.icon;

        return (
          <button
            key={cfg.id}
            onClick={() => onChannelChange(cfg.id === "all" ? null : cfg.id)}
            className={`
              group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 shrink-0
              ${isActive
                ? `${cfg.bgColor} ${cfg.color}`
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`} />
            <span>{cfg.label}</span>

            {/* Unread badge */}
            {counts.unread > 0 && (
              <span className={`
                min-w-[18px] h-[18px] flex items-center justify-center
                text-[10px] font-bold rounded-full px-1
                ${isActive
                  ? "bg-red-500 text-white"
                  : "bg-red-500/20 text-red-500"
                }
              `}>
                {counts.unread > 99 ? "99+" : counts.unread}
              </span>
            )}

            {/* Count badge (when no unread) */}
            {counts.unread === 0 && counts.total > 0 && cfg.id !== "all" && (
              <span className="text-[11px] text-muted-foreground/60">
                {counts.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
