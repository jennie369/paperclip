// packages/server/src/channels/facebook-web/protocol/ls-parser.ts
//
// Lightspeed (/ls_resp) payload heuristic parser.
//
// Strategy v1: do NOT decode full Lightspeed RPC instruction tree. Instead,
// extract string tokens (thread IDs, message IDs, sender IDs, text bodies)
// via regex + structural pattern detection. Iterate as we observe real
// inbound payloads during testing.
//
// Reasoning: Lightspeed payloads encode Thrift-like ops e.g.
//   [5,"executeFirstBlockForSyncTransaction",[19,"2"],[19,"7461656064723866828"],"GTwVfh..."]
// Full decoding requires knowing every opcode + Thrift struct schema.
// For inbound message detection, regex on `[19, "<digits>"]` pattern + payload
// search for known field names suffices.

import * as zlib from 'zlib';
import type { FbInboundEvent } from './message.js';

// Lightspeed inbound message opcodes — `insertMessage` (own-send echo) OR
// `upsertMessage` (inbound from sender). FB Web Business Inbox uses upsert
// for tin nhắn từ user → Page. Pattern tolerates escaped JSON (\\\") AND raw (").
const MESSAGE_OPCODE_RE = /\[5,\\?"(insertMessage|upsertMessage)\\?",\\?"((?:[^"\\]|\\\\.|\\")*?)\\?",/;
const MID_RE = /\\?"(mid\.\$[A-Za-z0-9_-]+)\\?"/;
const NUMERIC_TOKEN_RE = /\[19,\\?"(\d{10,20})\\?"\]/g;

/**
 * Parse a /ls_resp PUBLISH payload (zlib-decompressed if needed) into a
 * structured FbInboundEvent.
 *
 * The payload format observed:
 *   {"request_id": <num|null>, "payload": "<JSON-encoded-string with step tree>"}
 *
 * We focus on the INNER `payload` string for content detection.
 */
export function parseLsResp(rawPayload: Buffer | string): FbInboundEvent {
  const text = typeof rawPayload === 'string' ? rawPayload : safeDecode(rawPayload);

  // Outer wrapper parse (best effort)
  let inner = text;
  try {
    const outer = JSON.parse(text);
    if (typeof outer === 'object' && outer && typeof outer.payload === 'string') {
      inner = outer.payload;
    }
  } catch {
    // Not JSON-wrapped — work with raw
  }

  const event: FbInboundEvent = {
    kind: 'unknown',
    raw_payload: (inner.length > 2000 ? inner : text).slice(0, 2000),
  };

  // Primary detection: `insertMessage` OR `upsertMessage` opcode in step tree
  const insertIdx = inner.indexOf('insertMessage');
  const upsertIdx = inner.indexOf('upsertMessage');
  const msgIdxs = [insertIdx, upsertIdx].filter((n) => n >= 0);
  if (msgIdxs.length > 0) {
    const slice = inner.slice(Math.min(...msgIdxs));
    const textMatch = slice.match(MESSAGE_OPCODE_RE);
    const midMatch = slice.match(MID_RE);
    // Extract numeric tokens [19,"..."] — first 12-15 digit = thread_id,
    // first 15-17 digit AFTER mid = sender_id, first 13-digit ms-timestamp.
    const tokens: string[] = [];
    let m: RegExpExecArray | null;
    const tokenRe = new RegExp(NUMERIC_TOKEN_RE.source, 'g');
    while ((m = tokenRe.exec(slice)) !== null) {
      tokens.push(m[1]);
    }

    // Heuristic field extraction from token positions
    let threadId: string | undefined;
    let senderId: string | undefined;
    let tsMs: number | undefined;
    for (const tok of tokens) {
      if (!threadId && tok.length >= 12 && tok.length <= 16) threadId = tok;
      if (!tsMs && tok.length === 13) tsMs = parseInt(tok, 10);
      if (threadId && !senderId && tok !== threadId && tok.length >= 14 && tok.length <= 17) senderId = tok;
    }

    event.kind = 'message';
    if (textMatch) event.text = unescapeJson(textMatch[2]);
    if (midMatch) event.message_id = midMatch[1];
    if (threadId) event.thread_id = threadId;
    if (senderId) event.sender_id = senderId;
    if (tsMs) event.timestamp_ms = tsMs;
    return event;
  }

  // Secondary detection: typing indicator
  if (inner.includes('updateTypingIndicator') || inner.includes('typingIndicator')) {
    event.kind = 'typing';
    const tokenRe = new RegExp(NUMERIC_TOKEN_RE.source, 'g');
    const first = tokenRe.exec(inner);
    if (first) event.sender_id = first[1];
    return event;
  }

  // Tertiary: thread state updates (no message body)
  if (inner.includes('bumpThread') || inner.includes('updateThreadSnippet') || inner.includes('markThreadReadV2')) {
    event.kind = 'thread_update';
    const tokenRe = new RegExp(NUMERIC_TOKEN_RE.source, 'g');
    const first = tokenRe.exec(inner);
    if (first) event.thread_id = first[1];
    return event;
  }

  // Presence
  if (inner.includes('presence') || inner.includes('Presence')) {
    event.kind = 'presence';
    return event;
  }

  return event;
}

/**
 * Try to decompress zlib payload, fall back to UTF-8 decode.
 * FB sometimes zlib-compresses /ls_resp bodies, sometimes sends plain JSON.
 */
function safeDecode(buf: Buffer): string {
  // Try zlib first
  try {
    const decompressed = zlib.inflateSync(buf);
    return decompressed.toString('utf-8');
  } catch {
    // Not compressed — decode as UTF-8 directly
  }
  return buf.toString('utf-8');
}

function unescapeJson(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Helper: extract all numeric IDs from a raw Lightspeed payload (for debugging
 * during Phase 7 iteration when adding new event types).
 */
export function extractAllNumericIds(payload: string): string[] {
  const ids: string[] = [];
  let match;
  const re = new RegExp(NUMERIC_TOKEN_RE.source, 'g');
  while ((match = re.exec(payload)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}
