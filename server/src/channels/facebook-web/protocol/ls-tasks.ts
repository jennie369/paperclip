// packages/server/src/channels/facebook-web/protocol/ls-tasks.ts
//
// Lightspeed task payload composer for outbound /ls_req publishes.
// Verified from Phase 7 live capture (memory/reports/2026-05-17-fb-web-protocol-audit.md
// + ~/.claude/plans/fb-send-capture-ws.jsonl).
//
// Task labels observed:
//   "46" — send text/media message
//   "21" — mark thread read (auto-fired with send)
//   "3"  — typing indicator
//
// Wire format:
//   /ls_req PUBLISH body = {
//     "app_id": "514771569228061",
//     "payload": "<JSON-encoded inner>",
//     "request_id": <int>,
//     "type": 3  // task submission
//   }
//   inner.tasks[*].payload = "<JSON-encoded per-task body>"

import { FB_API } from './message.js';

let _requestIdCounter = 1;
let _taskIdCounter = 100;
let _epochCounter = BigInt(Date.now()) * BigInt(1_000_000);

function nextRequestId(): number {
  return _requestIdCounter++;
}

function nextTaskId(): number {
  return _taskIdCounter++;
}

/**
 * Generate epoch_id — observed format is large bigint (~19 digits).
 * Format: <timestamp_ms_high><random_low> packed.
 */
function nextEpochId(): string {
  _epochCounter += BigInt(1);
  return _epochCounter.toString();
}

/**
 * Generate OTID (offline thread id) — observed format ~19 digit numeric.
 * Used as idempotency token; server replaces with mid.$<hash> in response.
 */
export function generateOtid(): string {
  const ts = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1_000_000_000));
  return ((ts << BigInt(20)) | rand).toString();
}

interface SendTextTaskInner {
  thread_id: number;
  otid: string;
  source: number;
  send_type: number;
  sync_group: number;
  mark_thread_read?: number;
  text: string;
}

interface MarkReadTaskInner {
  thread_id: number;
  last_read_watermark_ts: number;
  sync_group: number;
}

interface LsTask {
  failure_count: null;
  label: string;
  payload: string;
  queue_name: string;
  task_id: number;
}

/**
 * Build a /ls_req publish body for sending a TEXT message to a 1:1 thread.
 * Mirrors the captured pattern (label 46 send + label 21 mark-read).
 *
 * @param threadId - target thread fbid (numeric string)
 * @param text - message body
 * @param versionId - schema version id observed from server (TBD: read from
 *                    initial /ls_resp on connect; default to captured value)
 */
export function buildSendTextRequest(
  threadId: string,
  text: string,
  versionId: string = '35877864545191913',
): { topic: string; body: string; request_id: number; otid: string } {
  const threadIdNum = Number(threadId);
  if (!threadIdNum || !Number.isFinite(threadIdNum)) {
    throw new Error(`Invalid thread_id: ${threadId}`);
  }
  const otid = generateOtid();

  const sendInner: SendTextTaskInner = {
    thread_id: threadIdNum,
    otid,
    source: 4456448, // observed constant — Business Inbox web client source enum
    send_type: 1, // 1 = TEXT
    sync_group: 127, // observed primary inbox sync group
    mark_thread_read: 1,
    text,
  };

  const sendTask: LsTask = {
    failure_count: null,
    label: '46',
    payload: JSON.stringify(sendInner),
    queue_name: String(threadIdNum),
    task_id: nextTaskId(),
  };

  const markReadInner: MarkReadTaskInner = {
    thread_id: threadIdNum,
    last_read_watermark_ts: Date.now(),
    sync_group: 127,
  };

  const markReadTask: LsTask = {
    failure_count: null,
    label: '21',
    payload: JSON.stringify(markReadInner),
    queue_name: String(threadIdNum),
    task_id: nextTaskId(),
  };

  const inner = {
    epoch_id: nextEpochId(),
    tasks: [sendTask, markReadTask],
    version_id: versionId,
  };

  const requestId = nextRequestId();
  const body = JSON.stringify({
    app_id: String(FB_API.BUSINESS_APP_ID),
    payload: JSON.stringify(inner),
    request_id: requestId,
    type: 3,
  });

  return { topic: '/ls_req', body, request_id: requestId, otid };
}

/**
 * Build a typing indicator publish (label "3").
 * Sent before the actual send to mimic human composition.
 */
export function buildTypingIndicator(
  threadId: string,
  isTyping: boolean = true,
  versionId: string = '35877864545191913',
): { topic: string; body: string } {
  const threadIdNum = Number(threadId);
  const typingInner = {
    thread_key: threadIdNum,
    is_group_thread: 0,
    is_typing: isTyping ? 1 : 0,
    attribution: 0,
    sync_group: 127,
    thread_type: 1,
  };
  const inner = {
    label: '3',
    payload: JSON.stringify(typingInner),
    version: versionId,
  };
  const requestId = nextRequestId();
  const body = JSON.stringify({
    app_id: String(FB_API.BUSINESS_APP_ID),
    payload: JSON.stringify(inner),
    request_id: requestId,
    type: 4, // type 4 = direct task (no queueing)
  });
  return { topic: '/ls_req', body };
}

/**
 * Build the post-SUBACK sync activation sequence observed in Phase 0 capture.
 * Without these publishes, FB does NOT push /ls_resp events even though
 * subscription succeeded.
 *
 * Phase 0 captured 5 databases needing subscription:
 *   db=2   — main messages stream
 *   db=26  — locale/init (type=1)
 *   db=127 — primary inbox folder
 *   db=205 — secondary folder (priority/spam classification)
 *   db=1   — events firehose
 *
 * Em use last_applied_cursor=null for ALL databases (fresh client) — FB will
 * replay recent backlog. Type=3 tasks (label 207/313/228/21/209) skipped
 * because they require dynamic context (specific thread_ids, cursors) em
 * don't have at startup.
 */
export function buildSyncActivationSequence(
  versionId: string = '35877864545191913',
): Array<{ topic: string; body: string; qos: 0 | 1 }> {
  const seq: Array<{ topic: string; body: string; qos: 0 | 1 }> = [];

  // [1] /ls_app_settings
  seq.push({
    topic: '/ls_app_settings',
    body: JSON.stringify({ ls_fdid: '', ls_sv: versionId }),
    qos: 1,
  });

  // [2] /ls_req type=2 database=2 — main messages stream
  seq.push(buildDbSync(2, 2, versionId, null));

  // [3] /ls_req type=1 database=26 — locale init
  seq.push({
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify({
        database: 26,
        epoch_id: nextEpochId(),
        failure_count: null,
        last_applied_cursor: null,
        sync_params: JSON.stringify({ locale: 'vi_VN' }),
        version: Number(versionId),
      }),
      request_id: nextRequestId(),
      type: 1,
    }),
    qos: 1,
  });

  // [4] /ls_req type=2 database=127 — primary inbox folder
  seq.push(buildDbSync(127, 2, versionId, null));

  // [5] /ls_req type=2 database=205 — secondary folder
  seq.push(buildDbSync(205, 2, versionId, null));

  // NOTE: database=1 firehose was tried — Phase 0 capture does NOT include it
  // and adding it doesn't help. Codex verified absence from baseline. Removed.

  return seq;
}

function buildDbSync(
  database: number,
  type: number,
  versionId: string,
  lastCursor: string | null,
): { topic: string; body: string; qos: 0 | 1 } {
  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify({
        database,
        epoch_id: nextEpochId(),
        failure_count: null,
        last_applied_cursor: lastCursor,
        sync_params: null,
        version: Number(versionId),
      }),
      request_id: nextRequestId(),
      type,
    }),
    qos: 1,
  };
}

/**
 * Parse /ls_resp response to detect send confirmation.
 * Look for "replaceOptimsiticMessage" opcode + extract server-assigned mid.
 */
export function parseSendConfirmation(rawPayload: string): { otid?: string; mid?: string } | null {
  if (!rawPayload.includes('replaceOptimsiticMessage')) return null;
  // Pattern observed: [5,"replaceOptimsiticMessage","<otid>","mid.$<hash>"]
  const match = rawPayload.match(/"replaceOptimsiticMessage","(\d+)","(mid\.\$[A-Za-z0-9_-]+)"/);
  if (!match) return null;
  return { otid: match[1], mid: match[2] };
}

/**
 * Extract contact IDs from `deleteThenInsertContact` opcode in /ls_resp.
 * Pattern: [5,"deleteThenInsertContact",[19,"<contact_id>"],...].
 * Returns numeric contact IDs (FB user/contact PSID) for warmup task creation.
 */
export function extractContactIds(rawPayload: string): string[] {
  const ids = new Set<string>();
  // Tolerant pattern — works with escaped JSON OR raw JSON
  const re = /deleteThenInsertContact\\?",\[19,\\?"(\d{10,20})\\?"\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawPayload)) !== null) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}

/**
 * Build a /ls_req contact warmup task (label "207").
 * Tells FB: "I'm interested in messages from this contact — push events to me".
 * Observed in Phase 0 capture — fired for each contact in thread list after sync.
 */
export function buildContactWarmup(contactIds: string[]): { topic: string; body: string; qos: 0 | 1 } {
  const tasks = contactIds.map((cid, idx) => ({
    failure_count: null,
    label: '207',
    payload: JSON.stringify({ contact_id: Number(cid) }),
    queue_name: 'cpq_v2',
    task_id: nextTaskId() + idx,
  }));

  const inner = {
    epoch_id: nextEpochId(),
    tasks,
    version_id: '35877864545191913',
  };

  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify(inner),
      request_id: nextRequestId(),
      type: 3,
    }),
    qos: 1,
  };
}

/**
 * Build /ls_req task label "209" — force_upsert thread fbid.
 * Tells FB: "Make sure I have latest state for this thread".
 * Phase 0 verified shape includes sync_group + metadata_only + preview_only.
 */
export function buildThreadUpsert(threadFbid: string): { topic: string; body: string; qos: 0 | 1 } {
  const taskInner = {
    thread_fbid: Number(threadFbid),
    force_upsert: 0,
    use_open_messenger_transport: 0,
    sync_group: 205,
    metadata_only: 0,
    preview_only: 0,
  };
  const inner = {
    epoch_id: nextEpochId(),
    tasks: [
      {
        failure_count: null,
        label: '209',
        payload: JSON.stringify(taskInner),
        queue_name: String(threadFbid),
        task_id: nextTaskId(),
      },
    ],
    version_id: '35877864545191913',
  };
  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify(inner),
      request_id: nextRequestId(),
      type: 3,
    }),
    qos: 1,
  };
}

/**
 * Build label "228" — thread interest subscribe (CRITICAL for message body push).
 *
 * Without this signal, FB does NOT push insertMessage events to MQTT client —
 * only meta (typing, contact info). Verified Codex root cause analysis 2026-05-17.
 *
 * Fired reactively per-thread once we learn its thread_key. For 1:1 DMs,
 * thread_key = contact PSID. cursor/reference_message_id can be empty for
 * fresh subscribe — FB will start streaming from current.
 */
export function buildThreadInterest(
  threadKey: string,
  opts: { referenceMessageId?: string; cursor?: string; referenceTsMs?: number } = {},
): { topic: string; body: string; qos: 0 | 1 } {
  const taskInner = {
    thread_key: Number(threadKey),
    direction: 0,
    reference_timestamp_ms: opts.referenceTsMs ?? Date.now(),
    reference_message_id: opts.referenceMessageId ?? '',
    sync_group: 127,
    cursor: opts.cursor ?? '',
  };
  const inner = {
    epoch_id: nextEpochId(),
    tasks: [
      {
        failure_count: null,
        label: '228',
        payload: JSON.stringify(taskInner),
        queue_name: `mrq.${threadKey}`,
        task_id: nextTaskId(),
      },
    ],
    version_id: '35877864545191913',
  };
  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify(inner),
      request_id: nextRequestId(),
      type: 3,
    }),
    qos: 1,
  };
}

/**
 * Build label "313" — cursor advance (sync group 205).
 * Tells FB "I've read up to this cursor — push events AFTER it".
 * For fresh startup, can use empty cursor with reference_thread_key=0.
 */
export function buildCursorAdvance(
  opts: { cursor?: string; referenceThreadKey?: string; referenceTsMs?: number } = {},
): { topic: string; body: string; qos: 0 | 1 } {
  const taskInner = {
    cursor: opts.cursor ?? '',
    filter: 0,
    is_after: 0,
    parent_thread_key: 0,
    reference_activity_timestamp: opts.referenceTsMs ?? Date.now(),
    reference_thread_key: opts.referenceThreadKey ? Number(opts.referenceThreadKey) : 0,
    secondary_filter: 24,
    filter_value: '',
    sync_group: 205,
  };
  const inner = {
    epoch_id: nextEpochId(),
    tasks: [
      {
        failure_count: null,
        label: '313',
        payload: JSON.stringify(taskInner),
        queue_name: 'trq',
        task_id: nextTaskId(),
      },
    ],
    version_id: '35877864545191913',
  };
  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify(inner),
      request_id: nextRequestId(),
      type: 3,
    }),
    qos: 1,
  };
}

/**
 * Build label "21" — mark thread read (startup variant).
 * Phase 0 fired this at startup for the currently-active thread.
 */
export function buildStartupMarkRead(threadId: string): { topic: string; body: string; qos: 0 | 1 } {
  const taskInner = {
    thread_id: Number(threadId),
    last_read_watermark_ts: Date.now(),
    sync_group: 127,
  };
  const inner = {
    epoch_id: nextEpochId(),
    tasks: [
      {
        failure_count: null,
        label: '21',
        payload: JSON.stringify(taskInner),
        queue_name: String(threadId),
        task_id: nextTaskId(),
      },
    ],
    version_id: '35877864545191913',
  };
  return {
    topic: '/ls_req',
    body: JSON.stringify({
      app_id: String(FB_API.BUSINESS_APP_ID),
      payload: JSON.stringify(inner),
      request_id: nextRequestId(),
      type: 3,
    }),
    qos: 1,
  };
}
