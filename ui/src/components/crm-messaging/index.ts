/**
 * CrmMessaging* — SSOT component family (Paperclip).
 *
 * The omnichannel CRM-messaging surface. After the 2026-06-01 merge, the
 * flagship `CrmMessagingCommandCenter` absorbs the former standalone widgets
 * (Sentiment Matrix → conversation sentiment rings, Customer 360 → profile +
 * journey, Objection / Upsell / Urgency / Script → the AI Copilot's transform
 * modes). Only the Command Center + the separate `CrmMessagingPipelineKanban`
 * (lead pipeline, a distinct surface) remain.
 *
 * Theme-aware (light + dark) via gem-* tokens in `styles/crm-messaging.css`.
 * Self-contained (plain-TS prop types, no Paperclip API imports) so the folder
 * + token CSS can be ported into Gemral (frontend/src/) later.
 */
export { CrmMessagingCommandCenter } from "./CrmMessagingCommandCenter";
export type {
  CommandWorkspace,
  CommandAccount,
  CommandChannelGroup,
  CommandConversation,
  CommandChatHeader,
  CommandMessage,
  CommandCrmProfile,
  CommandBotMode,
  CommandCopilotData,
  CommandQuickAction,
  CommandJourneyPoint,
  CommandReviewCapture,
} from "./CrmMessagingCommandCenter";

export { CrmMessagingPipelineKanban } from "./CrmMessagingPipelineKanban";
export type { KanbanCard, KanbanColumn } from "./CrmMessagingPipelineKanban";

export type { CrmChannel, CrmTone, CrmTag } from "./types";
