// packages/server/src/channels/facebook-web/protocol/message.ts
//
// Type definitions for Facebook Page Messenger Web (Reverse Protocol).
// Based on Phase 0 audit findings — see memory/reports/2026-05-17-fb-web-protocol-audit.md

// ──────────────────────────────────────────────────────────────────────
// Constants (verified from Phase 0 audit)
// ──────────────────────────────────────────────────────────────────────

export const FB_API = {
  MQTT_HOST: 'edge-chat.facebook.com',
  MQTT_PATH: '/chat',
  MQTT_REGION: 'eag', // Eastern Asia Gateway — adjust if needed
  MQTT_PROTOCOL_NAME: 'MQIsdp', // FB legacy MQTT 3.1 name
  MQTT_PROTOCOL_LEVEL: 3,
  MQTT_CLIENT_ID: 'mqttwsclient',
  MQTT_KEEPALIVE_SEC: 15,

  // Business Suite app ID (from CONNECT payload `aid` field)
  BUSINESS_APP_ID: 514771569228061,

  // FB Web app ID (homepage)
  WEB_APP_ID: 119211728144504,

  // GraphQL endpoint
  GRAPHQL_URL: 'https://business.facebook.com/api/graphql/',

  // Inbox HTML page (for token refresh)
  INBOX_URL_TPL: 'https://business.facebook.com/latest/inbox/all/?asset_id={pageId}&mailbox_id={pageId}',

  // Cookie domains we accept/send
  COOKIE_DOMAINS: ['.facebook.com', '.messenger.com', 'business.facebook.com'],

  // Token TTL — refresh before expiry
  FB_DTSG_REFRESH_HOURS: 22,

  // Rate limits (anti-ban)
  MAX_SEND_PER_HOUR: 50,
  MAX_REPLY_DELAY_MS: 8000,
  MIN_REPLY_DELAY_MS: 2000,
} as const;

// MQTT topics (verified from Phase 0b)
export const MQTT_TOPICS = {
  // Subscribe (server → client)
  LS_RESP: '/ls_resp',
  LS_FOREGROUND_STATE: '/ls_foreground_state',

  // Publish (client → server)
  LS_REQ: '/ls_req',
  LS_APP_SETTINGS: '/ls_app_settings',
} as const;

// MQTT control packet types
export const MQTT_PACKET = {
  CONNECT: 1,
  CONNACK: 2,
  PUBLISH: 3,
  PUBACK: 4,
  SUBSCRIBE: 8,
  SUBACK: 9,
  UNSUBSCRIBE: 10,
  UNSUBACK: 11,
  PINGREQ: 12,
  PINGRESP: 13,
  DISCONNECT: 14,
} as const;

// ──────────────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────────────

/** Cookie format from Cookie-Editor JSON export */
export interface FbCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

/** Bootstrap tokens extracted from business.facebook.com HTML */
export interface FbBootstrapTokens {
  fb_dtsg: string;
  lsd: string;
  jazoest: string;
  spin_r: string;
  spin_b: string;
  spin_t: string;
  async_get_token?: string;
  /** Unix seconds when fb_dtsg was extracted (for TTL tracking) */
  extracted_at: number;
}

/** Page context resolved from inbox HTML / GraphQL */
export interface FbPageContext {
  /** Facebook Page ID (also mailbox_id) */
  page_id: string;
  /** Business Manager ID (from URL redirect after navigation) */
  business_id?: string;
  /** Linked Instagram account ID (from MQTT CONNECT aids.INSTAGRAM_ACCOUNT_V2) */
  ig_account_id?: string;
  /** Page display name */
  page_name?: string;
}

/** Per-channel credentials persisted in DB (encrypted) */
export interface FbWebCredentials {
  cookies: FbCookie[];
  user_agent: string;
  /** Device UUID v4 — generated once per channel, persisted */
  device_id: string;
  /** MQTT session ID (int64) — generated once, persisted */
  session_id: string;
  /** c_user from cookies (account FB ID) */
  c_user: string;
  /** Page context */
  page: FbPageContext;
  /** Last extracted tokens (for resume after restart) */
  tokens?: FbBootstrapTokens;
}

/** Live session state (in-memory, not persisted) */
export interface FbWebSession {
  credentials: FbWebCredentials;
  tokens: FbBootstrapTokens;
}

/** Inbound message event (parsed from /ls_resp PUBLISH payload) */
export interface FbInboundEvent {
  /** Heuristic event kind */
  kind: 'message' | 'thread_update' | 'presence' | 'typing' | 'unknown';
  /** Raw payload string (for debugging + iteration) */
  raw_payload: string;
  /** Extracted message id (if detected) */
  message_id?: string;
  /** Extracted thread id (if detected) */
  thread_id?: string;
  /** Extracted sender id (if detected) */
  sender_id?: string;
  /** Extracted text content (if detected) */
  text?: string;
  /** Timestamp from server */
  timestamp_ms?: number;
}

/** GraphQL operation descriptor */
export interface FbGraphQLOp {
  /** Friendly name e.g. "BizInboxMessageListLazyAutomationInitializerQuery" */
  friendly_name: string;
  /** Numeric doc_id hash */
  doc_id: string;
  /** Default variables JSON skeleton (pageId etc.) */
  default_variables?: Record<string, any>;
}

/** Send DM result */
export interface FbSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
}
