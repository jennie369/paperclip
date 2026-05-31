/**
 * Shared types for the CrmMessaging* component family.
 *
 * These types are intentionally framework-agnostic (plain TS, no Paperclip
 * API imports) so the whole `crm-messaging/` folder can be copied into Gemral
 * (frontend/src/) with only the token CSS (`crm-messaging.css`) ported.
 */

/** Messaging channel a conversation/lead came through. */
export type CrmChannel = "zalo" | "messenger" | "telegram";

/** Semantic accent used across cards/badges. Maps to gem-* tokens. */
export type CrmTone = "primary" | "cyan" | "gold" | "success" | "danger" | "warning" | "neutral";

/** A colored tag/segment chip. */
export interface CrmTag {
  label: string;
  tone?: CrmTone;
}
