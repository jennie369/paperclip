/**
 * Command Center — shared prop/data contract (SSOT)
 * ──────────────────────────────────────────────────
 * Every type the upgraded `CrmMessagingCommandCenter` and its internal
 * sub-components (CommandSidebar / CommandConversationList / CommandChatWindow /
 * CommandCustomer360 / CommandAiCopilot / CommandReviewCaptureModal) consume.
 *
 * Framework-agnostic (plain TS, no Paperclip API imports) so the whole folder
 * can be ported to Gemral later. The public surface is re-exported from
 * `CrmMessagingCommandCenter.tsx` → `index.ts` unchanged.
 *
 * This file IS the prop half of the contract documented in
 * `paperclip-dashboard/architecture/crm-command-center-contract.md` — the BE
 * wiring (Phase B) maps real data onto these shapes.
 */
import type { CrmChannel, CrmTag, CrmTone } from "../types";

/* ── Column 1 — Sidebar (channels & accounts) ─────────────────────────── */

export interface CommandWorkspace {
  name: string;
  online?: boolean;
  avatarUrl?: string;
}

export interface CommandAccount {
  id: string;
  label: string;
  channel: CrmChannel;
  /** Square sub-account avatar (mockup: 24×24). Falls back to channel glyph. */
  avatarUrl?: string;
  count?: number;
  /** Render count as an urgent (danger) badge with glow. */
  urgent?: boolean;
  /** Active row → raised bg + a small danger notification dot on the avatar. */
  active?: boolean;
}

export interface CommandChannelGroup {
  /** Display label incl. count, e.g. "Zalo (3)". */
  label: string;
  channel: CrmChannel;
  accounts: CommandAccount[];
  /** Collapsed → hide accounts (chevron rotates). Default open. */
  collapsed?: boolean;
}

/* ── Column 2 — Conversation list ─────────────────────────────────────── */

/** Emotion ring around the customer avatar. */
export type CommandSentiment = "angry" | "happy" | "active" | "neutral";

/** The sub-account a customer's message landed in (overlay + receiving pill). */
export interface CommandTargetAccount {
  label: string;
  channel: CrmChannel;
  avatarUrl?: string;
}

/** AI-detected intent chip prefixed to the preview line. */
export interface CommandIntentTag {
  label: string;
  tone?: CrmTone;
}

/** SLA breach badge (e.g. "⏳ QUÁ HẠN 5P"). */
export interface CommandSla {
  label: string;
  blink?: boolean;
}

export interface CommandConversation {
  id: string;
  name: string;
  channel: CrmChannel;
  avatarUrl?: string;
  preview: string;
  time: string;
  vip?: boolean;
  unread?: boolean;
  muted?: boolean;
  /** Emotion ring colour. */
  sentiment?: CommandSentiment;
  /** Sub-account overlay + receiving-account pill. */
  targetAccount?: CommandTargetAccount;
  /** AI intent chip on the preview. */
  intentTag?: CommandIntentTag;
  /** SLA breach badge (top-right). */
  sla?: CommandSla;
  /** Live "Đang nhập…" typing indicator (top-right). */
  typing?: boolean;
}

/* ── Column 3 — Chat window ───────────────────────────────────────────── */

export interface CommandChatHeader {
  name: string;
  channel: CrmChannel;
  avatarUrl?: string;
  context?: string;
  contextDetail?: string;
}

export type CommandBotMode = "human" | "bot";

/** A rich card bubble dropped into the chat (from the copilot drag arsenal). */
export type CommandMessageCard =
  | { kind: "product"; name: string; price: string }
  | { kind: "voucher"; code: string; countdownLabel: string };

export interface CommandMessage {
  from: "them" | "me";
  text: string;
  time?: string;
  /** Read receipt (sent only). */
  read?: boolean;
  /** Sent-by-AI → cyan left rail + "Trả lời tự động bằng AI" eyebrow. */
  aiReply?: boolean;
  /** Positive-sentiment received message → AI Capture Review affordance + label. */
  sentiment?: "positive";
  /** Label under a sentiment message, e.g. "Positive Sentiment". */
  sentimentLabel?: string;
  /** Rich card payload (product/voucher) — renders a card bubble instead of text. */
  card?: CommandMessageCard;
}

/* ── Column 4a — Customer 360 (profile + journey) ─────────────────────── */

export interface CommandCrmInfo {
  label: string;
  value: string;
  copyable?: boolean;
  truncate?: boolean;
}

export interface CommandQuickAction {
  label: string;
  icon: string; // lucide icon name (resolved in component)
  tone?: CrmTone;
}

export interface CommandJourneyPoint {
  /** "Hôm nay, 10:45 AM via" — channel rendered separately. */
  when: string;
  channelLabel: string;
  /** Brand colour for the channel word (hex) — fixed, theme-safe. */
  channelColor?: string;
  title: string;
  /** Newest point → cyan glowing node. */
  latest?: boolean;
}

export interface CommandCrmProfile {
  company?: string;
  phone?: string;
  email?: string;
  ltv: string;
  ltvDeltaLabel?: string;
  dealStages?: string[];
  tags?: CrmTag[];
  quickActions?: CommandQuickAction[];
  journey?: CommandJourneyPoint[];
}

/* ── Column 4b — AI Copilot (mode-switcher) ───────────────────────────── */

export type CommandCopilotMode = "default" | "objection" | "upsell" | "urgency";

/** A tool button in the default copilot grid. */
export interface CommandCopilotTool {
  mode: Exclude<CommandCopilotMode, "default">;
  label: string;
  hint: string;
  icon: string;
  tone: CrmTone;
}

/** Objection mode: tone-matched rebuttal variants (slider 1→3). */
export interface CommandObjectionData {
  /** Incoming objection shown in the chat when mode opens. */
  objection: string;
  winRateLabel?: string;
  /** 3 tone variants [Mềm mỏng, Cân bằng, Đanh thép]. */
  toneVariants: string[];
}

/** Upsell mode: a draggable premium product card. */
export interface CommandUpsellData {
  trigger: string;
  productName: string;
  price: string;
  ghostDraft: string;
}

/** Urgency mode: a time-boxed voucher + 1-click combo. */
export interface CommandUrgencyData {
  code: string;
  countdownLabel: string;
  ghostDraft: string;
}

export interface CommandCopilotData {
  /** Live brain-activity stages cycled before a mode renders. */
  brainStages?: string[];
  winRatePct: number;
  winRateLabel: string;
  nextBestActionText: string;
  nextBestActionCta: string;
  tools: CommandCopilotTool[];
  objection: CommandObjectionData;
  upsell: CommandUpsellData;
  urgency: CommandUrgencyData;
}

/* ── AI Capture Review modal ──────────────────────────────────────────── */

export interface CommandReviewDestination {
  id: string;
  label: string;
  sublabel: string;
  /** Brand colour (hex) for icon/border. */
  color?: string;
  icon: string;
  active?: boolean;
}

export interface CommandReviewCapture {
  text: string;
  customerName: string;
  customerMeta: string;
  customerAvatarUrl?: string;
  destinations: CommandReviewDestination[];
}

/** Payload of a drag-and-drop drop into the composer. */
export type CommandDropPayload =
  | { kind: "text"; text: string }
  | { kind: "product"; name: string; price: string }
  | { kind: "voucher"; code: string; countdownLabel: string };
