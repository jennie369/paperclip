/**
 * Quota-exhausted run → scheduled retry instead of a hard agent `error` (GEM-1004).
 *
 * A provider quota wall (Antigravity Ultra 429, Claude weekly cap, Gemini 429) is a
 * TIME problem, not an agent problem: the same run succeeds once the window resets.
 * Before this, the run failed, `finalizeAgentStatus` flipped the agent to `error`,
 * and a daily-cron agent simply lost that day's slot.
 *
 * Pure policy only — heartbeat.ts persists the plan in
 * `agent_runtime_state.state_json.quotaRetry` (survives a server restart) and
 * `tickTimers` fires it when due.
 */

export const QUOTA_RETRY_ERROR_CODES: ReadonlySet<string> = new Set([
  "antigravity_quota_exhausted",
  "claude_weekly_limit",
  "gemini_quota_exhausted",
]);

/** Backoff per attempt when the provider gives no reset time (minutes). */
export const QUOTA_RETRY_BACKOFF_MIN = [30, 60, 120] as const;
export const QUOTA_RETRY_MAX_ATTEMPTS = QUOTA_RETRY_BACKOFF_MIN.length;

const MIN_DELAY_MS = 5 * 60_000;
const MAX_DELAY_MS = 7 * 24 * 60 * 60_000;
const RESET_SLACK_MS = 2 * 60_000;

export type QuotaRetryPlan = {
  retryAt: string;
  attempt: number;
  errorCode: string;
  retryOfRunId: string;
  issueId: string | null;
  /** Wake source for the retry: a timer run retries as timer (honours heartbeat.enabled). */
  source: "timer" | "automation";
};

function readResetsAt(errorMeta: Record<string, unknown> | null | undefined, now: Date): number | null {
  const raw = errorMeta?.resetsAt;
  if (typeof raw !== "string") return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms) || ms <= now.getTime()) return null;
  return ms;
}

/**
 * Returns the retry plan for a failed run, or null when the failure is not a quota
 * wall or the retry budget is spent (→ caller keeps the normal failed/error path so
 * a quota that never resets stays visible instead of looping silently).
 *
 * `priorAttempts` = how many quota retries already led to this run
 * (contextSnapshot.quotaRetryAttempt of the run that just failed).
 */
export function planQuotaRetry(input: {
  errorCode: string | null | undefined;
  errorMeta?: Record<string, unknown> | null;
  priorAttempts: number;
  runId: string;
  issueId: string | null;
  fromTimer: boolean;
  now: Date;
}): QuotaRetryPlan | null {
  const { errorCode, now } = input;
  if (!errorCode || !QUOTA_RETRY_ERROR_CODES.has(errorCode)) return null;
  const prior = Number.isFinite(input.priorAttempts) && input.priorAttempts > 0 ? Math.floor(input.priorAttempts) : 0;
  if (prior >= QUOTA_RETRY_MAX_ATTEMPTS) return null;

  const resetsAtMs = readResetsAt(input.errorMeta, now);
  const rawDelay =
    resetsAtMs !== null
      ? resetsAtMs - now.getTime() + RESET_SLACK_MS
      : QUOTA_RETRY_BACKOFF_MIN[prior] * 60_000;
  const delay = Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, rawDelay));

  return {
    retryAt: new Date(now.getTime() + delay).toISOString(),
    attempt: prior + 1,
    errorCode,
    retryOfRunId: input.runId,
    issueId: input.issueId,
    source: input.fromTimer ? "timer" : "automation",
  };
}

/** Narrow an unknown `state_json.quotaRetry` value back to a plan (null if malformed). */
export function readQuotaRetryPlan(value: unknown): QuotaRetryPlan | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.retryAt !== "string" || !Number.isFinite(Date.parse(v.retryAt))) return null;
  if (typeof v.retryOfRunId !== "string" || typeof v.errorCode !== "string") return null;
  const attempt = typeof v.attempt === "number" && v.attempt > 0 ? Math.floor(v.attempt) : 1;
  const issueId = typeof v.issueId === "string" && v.issueId ? v.issueId : null;
  const source = v.source === "timer" ? "timer" : "automation";
  return { retryAt: v.retryAt, attempt, errorCode: v.errorCode, retryOfRunId: v.retryOfRunId, issueId, source };
}
