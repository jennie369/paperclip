import { describe, expect, it } from "vitest";
import { detectAntigravityQuotaExhausted } from "@paperclipai/adapter-antigravity-local/server";
import {
  QUOTA_RETRY_MAX_ATTEMPTS,
  planQuotaRetry,
  readQuotaRetryPlan,
} from "../services/quota-retry.js";

// GEM-1004 — real agy stderr seen on 16/09 (7/7 genuine quota hits).
const REAL_QUOTA_STDERR = "error: RESOURCE_EXHAUSTED (code 429): Resource has been exhausted (e.g. check quota).";

describe("detectAntigravityQuotaExhausted", () => {
  it("flags the real agy RESOURCE_EXHAUSTED stderr line", () => {
    expect(detectAntigravityQuotaExhausted({ stdout: "", stderr: REAL_QUOTA_STDERR }).exhausted).toBe(true);
  });

  it("ignores quota / rate-limit words in the agent's own stdout prose (71/78 false positives)", () => {
    const stdout = [
      "Dạ chị, Reddit đang giãn cách đăng bài (rate limit 285 giây).",
      "| 5 | Pha 3: tuân thủ quota target caps | ✅ |",
      "- **2x Antigravity Ultra quota exhausted** (Gem Người Dùng).",
    ].join("\n");
    const stderr = "root agent idle; waiting up to 24h0m0s for 1 background task(s)";
    expect(detectAntigravityQuotaExhausted({ stdout, stderr }).exhausted).toBe(false);
  });

  it("ignores the adapter's own [paperclip] diagnostic lines on stderr", () => {
    const stderr = "[paperclip] Antigravity quota fallback note: rate limit handled upstream";
    expect(detectAntigravityQuotaExhausted({ stdout: "", stderr }).exhausted).toBe(false);
  });
});

describe("planQuotaRetry", () => {
  const now = new Date("2026-09-26T18:00:00.000Z");
  const base = { runId: "run-1", issueId: null, fromTimer: true, now };

  it("schedules a backoff retry for antigravity_quota_exhausted", () => {
    const plan = planQuotaRetry({ ...base, errorCode: "antigravity_quota_exhausted", priorAttempts: 0 });
    expect(plan).not.toBeNull();
    expect(plan!.attempt).toBe(1);
    expect(plan!.source).toBe("timer");
    expect(Date.parse(plan!.retryAt) - now.getTime()).toBe(30 * 60_000);
  });

  it("backs off further on each attempt and gives up after the cap", () => {
    const second = planQuotaRetry({ ...base, errorCode: "antigravity_quota_exhausted", priorAttempts: 1 });
    expect(Date.parse(second!.retryAt) - now.getTime()).toBe(60 * 60_000);
    const spent = planQuotaRetry({
      ...base,
      errorCode: "antigravity_quota_exhausted",
      priorAttempts: QUOTA_RETRY_MAX_ATTEMPTS,
    });
    expect(spent).toBeNull();
  });

  it("uses the provider resetsAt when given (Claude weekly cap)", () => {
    const resetsAt = "2026-09-27T02:00:00.000Z";
    const plan = planQuotaRetry({
      ...base,
      errorCode: "claude_weekly_limit",
      errorMeta: { resetsAt },
      priorAttempts: 0,
      fromTimer: false,
    });
    expect(Date.parse(plan!.retryAt)).toBe(Date.parse(resetsAt) + 2 * 60_000);
    expect(plan!.source).toBe("automation");
  });

  it("does not retry non-quota failures", () => {
    expect(planQuotaRetry({ ...base, errorCode: "adapter_failed", priorAttempts: 0 })).toBeNull();
    expect(planQuotaRetry({ ...base, errorCode: null, priorAttempts: 0 })).toBeNull();
  });

  it("round-trips through state_json and rejects malformed plans", () => {
    const plan = planQuotaRetry({ ...base, errorCode: "antigravity_quota_exhausted", priorAttempts: 0 });
    expect(readQuotaRetryPlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(readQuotaRetryPlan({ retryAt: "not-a-date", retryOfRunId: "x", errorCode: "y" })).toBeNull();
    expect(readQuotaRetryPlan(null)).toBeNull();
  });
});
