// Phase 0: Channel color system — visual differentiation per channel

export interface ChannelVisual {
  color: string;
  bg: string;
  label: string;
}

export const CHANNEL_CONFIG: Record<string, ChannelVisual> = {
  "Zalo GEMRAL & YINYANG": {
    color: "#22C55E",
    bg: "#22C55E15",
    label: "Zalo GEMRAL",
  },
  "Zalo JN": {
    color: "#3B82F6",
    bg: "#3B82F615",
    label: "Zalo JN",
  },
  Facebook: {
    color: "#1877F2",
    bg: "#1877F215",
    label: "Facebook",
  },
  Telegram: {
    color: "#0088CC",
    bg: "#0088CC15",
    label: "Telegram",
  },
  _default: {
    color: "#6B7280",
    bg: "#6B728015",
    label: "Kênh",
  },
};

export function getChannelVisual(channelName: string | null): ChannelVisual {
  if (!channelName) return CHANNEL_CONFIG._default;
  return CHANNEL_CONFIG[channelName] || CHANNEL_CONFIG._default;
}

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
  // Handle composite reasons like "policy_rejected: reason_text"
  if (reason.startsWith("policy_rejected:")) {
    return `Chính sách: ${reason.replace("policy_rejected:", "").trim()}`;
  }
  return SKIP_REASONS[reason] || reason;
}
