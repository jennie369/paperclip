import { describe, expect, it } from "vitest";
import {
  isHeartbeatSkipped,
  HEARTBEAT_SKIP_STATUSES,
} from "../services/heartbeat-eligibility.ts";

describe("heartbeat eligibility — a failed run never stops an agent", () => {
  it("does NOT skip an agent in 'error' state (it keeps running its next heartbeat)", () => {
    // Core guarantee for GEM-622: a run failure leaves status 'error' (a badge),
    // but the scheduler must still fire the next heartbeat.
    expect(isHeartbeatSkipped("error")).toBe(false);
  });

  it("does NOT skip normal working states", () => {
    expect(isHeartbeatSkipped("idle")).toBe(false);
    expect(isHeartbeatSkipped("running")).toBe(false);
  });

  it("skips exactly paused / terminated / pending_approval", () => {
    expect(isHeartbeatSkipped("paused")).toBe(true);
    expect(isHeartbeatSkipped("terminated")).toBe(true);
    expect(isHeartbeatSkipped("pending_approval")).toBe(true);
  });

  it("skip set is exactly the three blocking statuses (error not among them)", () => {
    expect([...HEARTBEAT_SKIP_STATUSES].sort()).toEqual([
      "paused",
      "pending_approval",
      "terminated",
    ]);
    expect((HEARTBEAT_SKIP_STATUSES as readonly string[])).not.toContain("error");
  });

  it("treats null/undefined status as not-skipped (fail-open to running)", () => {
    expect(isHeartbeatSkipped(null)).toBe(false);
    expect(isHeartbeatSkipped(undefined)).toBe(false);
  });
});
