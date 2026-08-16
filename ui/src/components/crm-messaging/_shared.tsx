/**
 * Internal shared primitives for the CrmMessaging* family.
 * Not exported from the package index — used only by sibling components.
 */
import { MessageCircle, Facebook, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmChannel, CrmTone } from "./types";

/** lucide icon per channel (matches mockup data-lucide usage). */
export const CHANNEL_ICON: Record<CrmChannel, LucideIcon> = {
  zalo: MessageCircle,
  messenger: Facebook,
  telegram: Send,
};

/**
 * Channel pill — colored rounded square with the channel glyph.
 * Mirrors `.channel-icon .channel-{zalo|messenger|telegram}` from the mockup.
 */
export function ChannelIcon({
  channel,
  className,
  iconClassName,
}: {
  channel: CrmChannel;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <div className={cn("channel-icon", `channel-${channel}`, className)}>
      <Icon className={iconClassName ?? "w-3 h-3"} />
    </div>
  );
}

/** Tailwind text-color class for a tone (theme-aware via gem tokens). */
export const TONE_TEXT: Record<CrmTone, string> = {
  primary: "text-gem-primary",
  cyan: "text-gem-cyan",
  gold: "text-gem-gold",
  success: "text-gem-success",
  danger: "text-gem-danger",
  warning: "text-gem-warning",
  neutral: "text-gem-text-muted",
};

/** Background + border + text classes for a soft tonal chip. */
export const TONE_CHIP: Record<CrmTone, string> = {
  primary: "bg-gem-primary/20 text-gem-primary border-gem-primary/30",
  cyan: "bg-gem-cyan/20 text-gem-cyan border-gem-cyan/30",
  gold: "bg-gem-gold/10 text-gem-gold border-gem-gold/30",
  success: "bg-gem-success/20 text-gem-success border-gem-success/30",
  danger: "bg-gem-danger/20 text-gem-danger border-gem-danger/30",
  warning: "bg-gem-warning/20 text-gem-warning border-gem-warning/30",
  neutral: "bg-gem-surface-raised text-gem-text-muted border-gem-border/20",
};

/** Dot color class for a tone (kanban column markers, status dots). */
export const TONE_DOT: Record<CrmTone, string> = {
  primary: "bg-gem-primary",
  cyan: "bg-gem-cyan",
  gold: "bg-gem-gold",
  success: "bg-gem-success",
  danger: "bg-gem-danger",
  warning: "bg-gem-warning",
  neutral: "bg-gem-border/40",
};

/** Initials fallback (max 2 chars, uppercase) for avatar-less contacts. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Format a VND amount: 45000000 -> "45.000.000₫". Pass strings through as-is. */
export function vnd(value: number | string): string {
  if (typeof value === "string") return value;
  return `${value.toLocaleString("vi-VN")}₫`;
}
