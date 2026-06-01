/**
 * CrmMessaging* — SSOT component family (Paperclip).
 *
 * 8 omnichannel CRM-messaging widgets ported from the Gemral CRM mockup,
 * theme-aware (light + dark) via gem-* tokens in `styles/crm-messaging.css`.
 * Self-contained (plain-TS prop types, no Paperclip API imports) so the whole
 * folder + the token CSS can be ported into Gemral (frontend/src/) later.
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

export { CrmMessagingObjectionCopilot } from "./CrmMessagingObjectionCopilot";
export type { ObjectionCustomer, ObjectionMessage, ObjectionSuggestion } from "./CrmMessagingObjectionCopilot";

export { CrmMessagingUpsellMatrix } from "./CrmMessagingUpsellMatrix";
export type { UpsellMessage, UpsellProduct } from "./CrmMessagingUpsellMatrix";

export { CrmMessagingUrgencyDispatcher } from "./CrmMessagingUrgencyDispatcher";

export { CrmMessagingScriptLibrary } from "./CrmMessagingScriptLibrary";
export type { ScriptItem } from "./CrmMessagingScriptLibrary";

export { CrmMessagingPipelineKanban } from "./CrmMessagingPipelineKanban";
export type { KanbanCard, KanbanColumn } from "./CrmMessagingPipelineKanban";

export { CrmMessagingCustomer360 } from "./CrmMessagingCustomer360";
export type {
  Customer360Profile,
  Customer360DataBlock,
  Customer360Touchpoint,
  Customer360Action,
} from "./CrmMessagingCustomer360";

export { CrmMessagingSentimentMatrix } from "./CrmMessagingSentimentMatrix";
export type { SentimentFilter, SentimentThread, SentimentMood } from "./CrmMessagingSentimentMatrix";

export type { CrmChannel, CrmTone, CrmTag } from "./types";
