// Channel visual system — color, label, platform detection
// SSOT for channel display across inbox, chat header, analytics

export type Platform = "facebook" | "zalo" | "telegram" | "instagram" | "email" | "web" | "unknown";

export interface ChannelVisual {
  color: string;
  bg: string;
  label: string;
  platform: Platform;
}

// Platform detection from channel name/display_name
const PLATFORM_PATTERNS: { pattern: RegExp; platform: Platform; color: string }[] = [
  { pattern: /facebook/i, platform: "facebook", color: "#1877F2" },
  { pattern: /zalo/i, platform: "zalo", color: "#0068FF" },
  { pattern: /telegram/i, platform: "telegram", color: "#0088CC" },
  { pattern: /instagram/i, platform: "instagram", color: "#E4405F" },
  { pattern: /email/i, platform: "email", color: "#6B7280" },
  { pattern: /web|widget|live/i, platform: "web", color: "#10B981" },
];

// Deterministic color for unknown channels (hash-based, avoids random)
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `oklch(0.65 0.15 ${hue})`;
}

export function detectPlatform(name: string): Platform {
  for (const { pattern, platform } of PLATFORM_PATTERNS) {
    if (pattern.test(name)) return platform;
  }
  return "unknown";
}

export function getChannelVisual(channelName: string | null, displayName?: string): ChannelVisual {
  if (!channelName) return { color: "#6B7280", bg: "#6B728015", label: "Kênh", platform: "unknown" };

  const nameToCheck = displayName || channelName;
  const platform = detectPlatform(nameToCheck);

  const match = PLATFORM_PATTERNS.find(({ pattern }) => pattern.test(nameToCheck));
  const color = match?.color || hashColor(nameToCheck);

  return {
    color,
    bg: `${color}12`,
    label: displayName || channelName,
    platform,
  };
}

// Build channel color from display_name (replaces UnifiedInbox.getChannelColor)
export function getChannelColor(displayName: string): string {
  const match = PLATFORM_PATTERNS.find(({ pattern }) => pattern.test(displayName));
  return match?.color || hashColor(displayName);
}

// Platform short labels for compact badges
export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "FB",
  zalo: "Zalo",
  telegram: "TG",
  instagram: "IG",
  email: "Email",
  web: "Web",
  unknown: "—",
};

// Skip reason labels (Vietnamese)
export const SKIP_REASONS: Record<string, string> = {
  duplicate: "Tin nhắn trùng lặp",
  no_channel: "Kênh không tồn tại",
  channel_disabled: "Kênh đã tắt",
  rate_limited: "Vượt giới hạn tin nhắn/giờ",
  group_no_mention: "Tin nhắn nhóm, không có @mention",
  no_agent: "Kênh không có agent gán",
  model_error: "Agent model không khả dụng",
  ignored: "Chat bị bỏ qua (override)",
  paused: "Agent đang tạm dừng",
  debounced: "Tin nhắn gộp (debounce)",
  self_message: "Tin nhắn từ chính mình",
};

export function getSkipReasonLabel(reason: string | null): string {
  if (!reason) return "Không rõ";
  if (reason.startsWith("policy_rejected:")) {
    return `Chính sách: ${reason.replace("policy_rejected:", "").trim()}`;
  }
  return SKIP_REASONS[reason] || reason;
}
