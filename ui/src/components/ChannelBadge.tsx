// ChannelBadge — compact channel indicator used in inbox, chat header, analytics
// Uses channelConfig SSOT for colors. Renders as small pill with platform-aware styling.
// Color resolution: per-account override (color prop, set in Cài đặt kênh) wins;
// otherwise falls back to the platform color so channel identity stays unambiguous.

import { detectPlatform, getChannelColor, PLATFORM_LABELS } from "@/pages/channels/components/channelConfig";
import { CornerDownRight } from "lucide-react";

interface ChannelBadgeProps {
  /** Channel display name (e.g. "Facebook Gemral", "Zalo Personal") */
  name: string;
  /**
   * Per-account/channel color (hex like "#0068FF" or oklch). When set (e.g. from
   * channelMap[].color), it overrides the platform fallback so the badge matches
   * the color the operator picked for that account.
   */
  color?: string;
  /** Size variant */
  size?: "xs" | "sm";
  /** Show only platform abbreviation (FB, Zalo, TG) instead of full name */
  compact?: boolean;
  /** Render a ↳ origin arrow before the pill (conversation list: "trả lời từ kênh này") */
  withOriginArrow?: boolean;
  className?: string;
}

export function ChannelBadge({
  name,
  color,
  size = "xs",
  compact = false,
  withOriginArrow = false,
  className = "",
}: ChannelBadgeProps) {
  const platform = detectPlatform(name);
  // Per-account override wins; else platform/hash color from SSOT.
  const resolved = color || getChannelColor(name);

  // Extract the specific channel name (e.g. "Gemral" from "Facebook Gemral")
  const shortName = compact ? PLATFORM_LABELS[platform] : name;

  const sizeClasses = size === "xs"
    ? "text-[10px] px-1.5 py-0 leading-[18px] gap-1"
    : "text-[11px] px-2 py-0.5 leading-[18px] gap-1.5";

  // color-mix is format-agnostic (handles hex AND oklch from getChannelColor's hash),
  // unlike string-concatenated hex alpha which breaks on oklch().
  const pill = (
    <span
      className={`inline-flex items-center rounded-sm font-medium border whitespace-nowrap ${sizeClasses} ${className}`}
      style={{
        color: resolved,
        backgroundColor: `color-mix(in srgb, ${resolved} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${resolved} 32%, transparent)`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: resolved }} />
      <span className="truncate max-w-[120px]">{shortName}</span>
    </span>
  );

  if (!withOriginArrow) return pill;

  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
      {pill}
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
