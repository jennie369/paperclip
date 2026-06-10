// ChannelBadge — compact channel indicator used in inbox, chat header, analytics
// Uses channelConfig SSOT for colors. Renders as small pill with platform-aware styling.

import { detectPlatform, PLATFORM_LABELS, type Platform } from "@/pages/channels/components/channelConfig";

interface ChannelBadgeProps {
  /** Channel display name (e.g. "Facebook Gemral", "Zalo Personal") */
  name: string;
  /** Size variant */
  size?: "xs" | "sm";
  /** Show only platform abbreviation (FB, Zalo, TG) instead of full name */
  compact?: boolean;
  className?: string;
}

// Platform-specific dot colors (semantic, not hardcoded per-channel)
const PLATFORM_DOT: Record<Platform, string> = {
  facebook: "bg-[#1877F2]",
  zalo: "bg-[#0068FF]",
  telegram: "bg-[#0088CC]",
  instagram: "bg-[#E4405F]",
  email: "bg-zinc-400",
  web: "bg-emerald-500",
  cskh: "bg-[#14B8A6]",
  unknown: "bg-zinc-400",
};

export function ChannelBadge({ name, size = "xs", compact = false, className = "" }: ChannelBadgeProps) {
  const platform = detectPlatform(name);
  const dotClass = PLATFORM_DOT[platform];

  // Extract the specific channel name (e.g. "Gemral" from "Facebook Gemral")
  const shortName = compact ? PLATFORM_LABELS[platform] : name;

  const sizeClasses = size === "xs"
    ? "text-[10px] px-1.5 py-0 leading-[18px] gap-1"
    : "text-[11px] px-2 py-0.5 leading-[18px] gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-sm font-medium bg-muted/60 text-muted-foreground border border-border/50 whitespace-nowrap ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span className="truncate max-w-[100px]">{shortName}</span>
    </span>
  );
}

/** Agent badge — subtle violet pill */
export function AgentBadge({ slug, size = "xs" }: { slug: string; size?: "xs" | "sm" }) {
  const sizeClasses = size === "xs"
    ? "text-[10px] px-1.5 py-0 leading-[18px]"
    : "text-[11px] px-2 py-0.5 leading-[18px]";

  return (
    <span className={`inline-flex items-center rounded-sm font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 whitespace-nowrap truncate max-w-[80px] ${sizeClasses}`}>
      {slug}
    </span>
  );
}
