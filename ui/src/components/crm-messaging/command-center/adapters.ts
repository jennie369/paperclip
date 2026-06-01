/**
 * adapters — map the live unified-inbox API (channelsApi / ChannelSession,
 * ConversationMessage) onto the Command Center prop shapes.
 *
 * Phase B (read-path wire): conversations / messages / chat header / Customer 360
 * come from the existing `/api/channels/conversations*` endpoints. AI-only fields
 * (sentiment intent, SLA, typing, copilot, review capture) have no backend yet —
 * they're left undefined here and surface via the component's showcase defaults
 * until Phase C. See paperclip-dashboard/architecture/crm-command-center-contract.md.
 */
import type { ChannelSession, ConversationMessage } from "@/api/channels";
import type {
  CommandChatHeader,
  CommandConversation,
  CommandCrmProfile,
  CommandMessage,
} from "@/components/crm-messaging";
import type { CrmChannel, CrmTag, CrmTone } from "../types";
import type { CommandSentiment } from "./types";

/** Best-effort map of a backend channel_name → the 3 CrmChannel glyphs. */
export function channelOf(name: string | null | undefined): CrmChannel {
  const n = (name ?? "").toLowerCase();
  if (n.includes("telegram") || n.includes("tele")) return "telegram";
  if (n.includes("facebook") || n.includes("messenger") || n.includes("fb")) return "messenger";
  return "zalo";
}

/** Human label for the receiving sub-account pill (strips the id suffix). */
function accountLabel(name: string | null | undefined): string {
  const n = name ?? "";
  if (n.startsWith("zalo")) return "Zalo";
  if (n.includes("facebook") || n.includes("messenger") || n.includes("fb")) return "Facebook";
  if (n.includes("telegram")) return "Telegram";
  return n || "Kênh";
}

/** lead_temperature/label → emotion ring (proxy; real sentiment is Phase C). */
function sentimentOf(temp: string | null | undefined, label: string | null | undefined): CommandSentiment {
  if (label === "hot") return "angry";
  if (temp === "hot") return "active";
  if (temp === "warm") return "happy";
  return "neutral";
}

/** ISO timestamp → short HH:MM (today) or DD/MM display. */
function timeOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function tagTone(label: string): CrmTone {
  const l = label.toLowerCase();
  if (l.includes("vip")) return "gold";
  if (l.includes("churn") || l.includes("risk")) return "danger";
  if (l.includes("tech") || l.includes("industry")) return "neutral";
  return "primary";
}

export function mapConversation(s: ChannelSession): CommandConversation {
  const channel = channelOf(s.channel_name);
  return {
    id: s.session_key,
    name: s.customer?.display_name || s.sender_name || "Khách",
    channel,
    avatarUrl: s.customer?.avatar_url || undefined,
    preview: s.last_message_preview || "",
    time: timeOf(s.last_message_at),
    vip: s.label === "vip",
    unread: (s.unread_count ?? 0) > 0,
    muted: s.is_muted || undefined,
    sentiment: sentimentOf(s.customer?.lead_temperature, s.label),
    targetAccount: { label: accountLabel(s.channel_name), channel },
  };
}

export function mapHeader(s: ChannelSession): CommandChatHeader {
  return {
    name: s.customer?.display_name || s.sender_name || "Khách",
    channel: channelOf(s.channel_name),
    avatarUrl: s.customer?.avatar_url || undefined,
    context: accountLabel(s.channel_name),
    contextDetail: s.is_group && s.group_name ? s.group_name : undefined,
  };
}

const DEFAULT_QUICK_ACTIONS: CommandCrmProfile["quickActions"] = [
  { label: "Báo Giá", icon: "file-text", tone: "primary" },
  { label: "Lịch Hẹn", icon: "calendar", tone: "primary" },
  { label: "Gọi Ngay", icon: "phone", tone: "success" },
  { label: "Thêm", icon: "more-horizontal", tone: "neutral" },
];

export function mapCrm(s: ChannelSession): CommandCrmProfile {
  const c = s.customer;
  const tags: CrmTag[] = (c?.tags ?? []).map((t) => ({ label: t, tone: tagTone(t) }));
  const spent = (c?.gemral_data as { total_spent?: number } | null | undefined)?.total_spent;
  return {
    company: undefined,
    phone: c?.phone || undefined,
    email: c?.email || undefined,
    ltv: typeof spent === "number" ? `${spent.toLocaleString("vi-VN")}₫` : "Chưa cập nhật",
    tags,
    quickActions: DEFAULT_QUICK_ACTIONS,
    // journey/dealStages: no read endpoint yet → omitted (Phase C / crm-routes enrich).
  };
}

export function mapMessages(msgs: ConversationMessage[]): CommandMessage[] {
  return msgs.map((m) => ({
    from: m.direction === "inbound" ? "them" : "me",
    text: m.content || m.body || "",
    time: timeOf(m.timestamp),
    read: m.direction === "outbound" && m.status === "sent" ? true : undefined,
  }));
}

/**
 * Map a session's `history` jsonb (zalo-personal et al. keep the transcript here
 * rather than the pending/sent tables). role 'assistant' → outbound, else inbound.
 */
export function mapHistory(
  history: Array<{ role: string; content: string; timestamp?: string; senderName?: string }>,
): CommandMessage[] {
  return history
    .filter((h) => h.content)
    .map((h) => ({
      from: h.role === "assistant" || h.role === "bot" ? "me" : "them",
      text: h.content,
      time: timeOf(h.timestamp),
      aiReply: h.role === "assistant" || undefined,
    }));
}
