/**
 * AgentAvatarStack — compact stacked avatars for War Room channel header.
 * Shows top N members with online dot + tooltip; "+M" overflow chip for remainder.
 */
import { useMemo } from "react";
import type { ChannelMemberPresence } from "../../api/warRoom";
import { Tooltip } from "./Tooltip";

const GRADIENT_PALETTE = [
  "from-amber-500 to-orange-600",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-red-500",
  "from-lime-500 to-green-600",
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
];

function gradientForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return GRADIENT_PALETTE[Math.abs(hash) % GRADIENT_PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PRESENCE_LABEL: Record<ChannelMemberPresence["presence"], string> = {
  online: "đang online",
  idle: "vừa rời",
  offline: "offline",
};

const PRESENCE_DOT_BG: Record<ChannelMemberPresence["presence"], string> = {
  online: "bg-emerald-500 wr-online-dot",
  idle: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

interface AgentAvatarStackProps {
  members: ChannelMemberPresence[];
  maxShown?: number;
  onOverflowClick?: () => void;
}

export function AgentAvatarStack({ members, maxShown = 4, onOverflowClick }: AgentAvatarStackProps) {
  const sorted = useMemo(() => {
    // Online first, then idle, then offline; alphabetical within each tier
    const order: Record<string, number> = { online: 0, idle: 1, offline: 2 };
    return [...members].sort((a, b) => {
      const d = (order[a.presence] ?? 9) - (order[b.presence] ?? 9);
      if (d !== 0) return d;
      return a.agent_name.localeCompare(b.agent_name);
    });
  }, [members]);

  if (sorted.length === 0) return null;

  const visible = sorted.slice(0, maxShown);
  const overflow = sorted.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((m) => (
        <Tooltip key={m.agent_slug} label={`${m.agent_name} · ${PRESENCE_LABEL[m.presence]}`}>
          <span className="relative inline-flex">
            <span
              className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradientForSlug(m.agent_slug)} ring-2 ring-background flex items-center justify-center text-[9px] font-bold text-white`}
            >
              {initials(m.agent_name)}
            </span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-background ${PRESENCE_DOT_BG[m.presence]}`}
            />
          </span>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Tooltip label={`Xem tất cả ${sorted.length} agents`}>
          <button
            type="button"
            onClick={onOverflowClick}
            className="w-6 h-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-none cursor-pointer"
          >
            +{overflow}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
