// packages/server/src/channels/facebook-web/protocol/graphql.ts
//
// GraphQL POST builder for business.facebook.com/api/graphql/.
// Holds a registry of operations + doc_ids captured during Phase 0 audit.
// Send / comment-reply mutation doc_ids are TBD — must be captured at first
// real send during Phase 7 (no observed traffic during passive Phase 0).

import axios from 'axios';
import { URLSearchParams } from 'url';
import { FbCookieManager } from './cookies.js';
import { browserHeaders } from './anti-detect.js';
import { FB_API, type FbBootstrapTokens, type FbGraphQLOp } from './message.js';

/**
 * Registry of GraphQL operations captured during Phase 0b audit (2026-05-17).
 * doc_ids ROTATE — refresh periodically by capturing live Business Suite traffic.
 *
 * NOTE: Many of these are scaffolding queries Business Suite fires on inbox
 * load. The CRITICAL one we still need is SendMessage + CommentReply
 * mutations — populated below as TODO placeholders.
 */
export const GRAPHQL_OPS: Record<string, FbGraphQLOp> = {
  // ── Inbox initialization ───────────────────────────────────────────
  BIZ_INBOX_SUGGESTION_BAR: {
    friendly_name: 'BizInboxSuggestionBarQuery',
    doc_id: '25272076285748559',
  },
  BIZ_INBOX_MESSAGE_LIST_INIT: {
    friendly_name: 'BizInboxMessageListLazyAutomationInitializerQuery',
    doc_id: '25391602937119190',
  },
  BIZ_INBOX_CONTEXT_CARD: {
    friendly_name: 'BizKitContextCardNoBizCRMIdentityQuery',
    doc_id: '25449140978003349',
  },
  BIZ_INBOX_CTXMD: {
    friendly_name: 'BizInboxCTXMDGuidanceCardQuery',
    doc_id: '35095961996714197',
  },
  BIZ_INBOX_REENGAGEMENT_UPSELL: {
    friendly_name: 'BizInboxReengagementUpsellAdsQuery',
    doc_id: '26060346180284920',
  },
  BIZ_KIT_HELP_TRAY_NOTIFICATIONS: {
    friendly_name: 'BizKitHelpTraySideBarNotificationWrapperQuery',
    doc_id: '27702410199359823',
    default_variables: { filterOutAdsAIThreads: true, first: 20 },
  },
  HIGH_PRIORITY_NOTIFICATIONS: {
    friendly_name: 'HighPriorityNotificationsQuery',
    doc_id: '26432628609737971',
    default_variables: { activity_log_query_env: 'BIZ_NOTIFICATION', activity_log_page_size: 7 },
  },
  OTHER_PRIORITY_NOTIFICATIONS: {
    friendly_name: 'OtherPriorityNotificationsQuery',
    doc_id: '34936185175996698',
    default_variables: { activity_log_query_env: 'BIZ_NOTIFICATION', activity_log_page_size: 20 },
  },

  // ── Outbound mutations ──
  // SEND_MESSAGE is NOT GraphQL — verified Phase 7: FB Business Suite sends
  // text DMs via MQTT /ls_req task submission (label "46"). See ls-tasks.ts.
  //
  // COMMENT_REPLY doc_id is still TBD — Phase 7b will capture during first
  // real comment reply action. Until then, sending will fail with
  // "TODO_CAPTURE" error.
  COMMENT_REPLY: {
    friendly_name: 'CometFeedCommentCreateMutation', // tentative name from FB Web bundle
    doc_id: 'TODO_CAPTURE',
  },
};

interface GraphQLRequestOpts {
  cookies: FbCookieManager;
  tokens: FbBootstrapTokens;
  userAgent: string;
  /** GraphQL operation key from GRAPHQL_OPS, OR a custom op object */
  op: keyof typeof GRAPHQL_OPS | FbGraphQLOp;
  variables: Record<string, any>;
  /** Optional extra POST params (FB router fields like __user, __a, __req) */
  extraParams?: Record<string, string>;
  /** Origin host for Referer header — default business.facebook.com */
  referer?: string;
  /** c_user (for __user field) */
  cUser?: string;
}

/**
 * POST a GraphQL operation against business.facebook.com/api/graphql/.
 * Returns the parsed JSON response body.
 */
export async function graphqlPost(opts: GraphQLRequestOpts): Promise<any> {
  const op: FbGraphQLOp = typeof opts.op === 'string' ? GRAPHQL_OPS[opts.op] : opts.op;
  if (!op) throw new Error(`Unknown GraphQL op: ${String(opts.op)}`);
  if (op.doc_id === 'TODO_CAPTURE') {
    throw new Error(`GraphQL op ${op.friendly_name} has no doc_id yet (Phase 7 capture pending)`);
  }

  const merged = { ...(op.default_variables || {}), ...opts.variables };
  const variablesJson = JSON.stringify(merged);

  const body = new URLSearchParams();
  body.set('av', opts.cUser || '0');
  body.set('__user', opts.cUser || '0');
  body.set('__a', '1');
  body.set('__req', String(Math.floor(Math.random() * 30)));
  body.set('__hs', '0.0');
  body.set('__rev', opts.tokens.spin_r);
  body.set('__s', `${randomShortHex()}:${randomShortHex()}:${randomShortHex()}`);
  body.set('__hsi', opts.tokens.spin_t);
  body.set('__comet_req', '1');
  body.set('fb_dtsg', opts.tokens.fb_dtsg);
  body.set('jazoest', opts.tokens.jazoest);
  body.set('lsd', opts.tokens.lsd);
  body.set('fb_api_caller_class', 'RelayModern');
  body.set('fb_api_req_friendly_name', op.friendly_name);
  body.set('variables', variablesJson);
  body.set('server_timestamps', 'true');
  body.set('doc_id', op.doc_id);

  if (opts.extraParams) {
    for (const [k, v] of Object.entries(opts.extraParams)) body.set(k, v);
  }

  const cookieHeader = opts.cookies.buildCookieHeaderForHost('business.facebook.com');
  const referer = opts.referer || 'https://business.facebook.com/latest/inbox/all/';

  const res = await axios.post(FB_API.GRAPHQL_URL, body.toString(), {
    headers: {
      ...browserHeaders(opts.userAgent),
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://business.facebook.com',
      Referer: referer,
      'x-fb-friendly-name': op.friendly_name,
      'x-fb-lsd': opts.tokens.lsd,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      Cookie: cookieHeader,
    },
    timeout: 30_000,
    validateStatus: () => true,
    decompress: true,
  });

  // Update cookies from response (in case FB rotates anything)
  opts.cookies.collectFromResponse(res.headers as Record<string, any>);

  if (res.status !== 200) {
    throw new Error(`GraphQL ${op.friendly_name} HTTP ${res.status}: ${String(res.data).slice(0, 200)}`);
  }

  // FB sometimes returns `for (;;);` prefix to defuse JSONP — strip if present
  let data = res.data;
  if (typeof data === 'string') {
    const stripped = data.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/, '');
    try {
      data = JSON.parse(stripped);
    } catch (err: any) {
      throw new Error(`GraphQL ${op.friendly_name}: non-JSON response: ${String(data).slice(0, 200)}`);
    }
  }

  if (data?.errors) {
    const msg = data.errors[0]?.message || 'unknown';
    throw new Error(`GraphQL ${op.friendly_name} errors: ${msg}`);
  }
  return data;
}

function randomShortHex(): string {
  return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}
