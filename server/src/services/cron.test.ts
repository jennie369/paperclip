/**
 * Smoke tests for cron.ts, focused on the GEMRAL FIX 2026-04-15
 * UTC → local-time interpretation.
 *
 * These tests assume the Node process runs in a non-UTC timezone
 * (e.g. Asia/Ho_Chi_Minh UTC+7). On CI with TZ=UTC they degenerate to
 * identity checks, which is still a valid correctness baseline.
 */

import { describe, expect, it } from "vitest";
import { nextCronTickFromExpression, parseCron, validateCron } from "./cron.js";

describe("parseCron / validateCron (unchanged by 2026-04-15 fix)", () => {
  it("parses daily 09:00", () => {
    const p = parseCron("0 9 * * *");
    expect(p.minutes).toEqual([0]);
    expect(p.hours).toEqual([9]);
  });

  it("parses every-15-min", () => {
    const p = parseCron("*/15 * * * *");
    expect(p.minutes).toEqual([0, 15, 30, 45]);
  });

  it("parses twice-daily list", () => {
    const p = parseCron("0 9,17 * * *");
    expect(p.hours).toEqual([9, 17]);
  });

  it("rejects invalid expressions", () => {
    expect(validateCron("")).not.toBeNull();
    expect(validateCron("0 25 * * *")).not.toBeNull();
    expect(validateCron("0 9 * *")).not.toBeNull();
  });

  it("accepts valid expressions", () => {
    expect(validateCron("0 9 * * *")).toBeNull();
    expect(validateCron("*/5 * * * *")).toBeNull();
  });
});

describe("nextCronTick local-time interpretation (GEMRAL FIX 2026-04-15)", () => {
  it("daily 09:00 from 08:59 fires at 09:00 same local day", () => {
    // Build a local-time reference: Apr 15 2026 08:59 local
    const ref = new Date(2026, 3, 15, 8, 59, 0, 0);
    const next = nextCronTickFromExpression("0 9 * * *", ref);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(9);
    expect(next!.getMinutes()).toBe(0);
    // Should be the same calendar day in local time
    expect(next!.getDate()).toBe(15);
    expect(next!.getMonth()).toBe(3);
    expect(next!.getFullYear()).toBe(2026);
  });

  it("daily 09:00 from 09:01 fires next day at 09:00", () => {
    const ref = new Date(2026, 3, 15, 9, 1, 0, 0);
    const next = nextCronTickFromExpression("0 9 * * *", ref);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(9);
    expect(next!.getMinutes()).toBe(0);
    expect(next!.getDate()).toBe(16);
  });

  it("*/15 * * * * from 10:07 fires at 10:15", () => {
    const ref = new Date(2026, 3, 15, 10, 7, 30, 0);
    const next = nextCronTickFromExpression("*/15 * * * *", ref);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(10);
    expect(next!.getMinutes()).toBe(15);
  });

  it("weekly Monday 14:00 from Tuesday 10:00 fires next Monday 14:00", () => {
    // 2026-04-15 is Wednesday. Use 2026-04-14 Tuesday at 10:00.
    // Actually 2026-04-15 is Wednesday per ISO calendar. Check: Apr 13 2026 is Monday.
    // For the test, just pick a Tuesday relative to the next Monday.
    const tuesday = new Date(2026, 3, 14, 10, 0, 0, 0); // Tue Apr 14 2026
    expect(tuesday.getDay()).toBe(2); // sanity
    const next = nextCronTickFromExpression("0 14 * * 1", tuesday);
    expect(next).not.toBeNull();
    expect(next!.getDay()).toBe(1); // Monday
    expect(next!.getHours()).toBe(14);
    expect(next!.getMinutes()).toBe(0);
  });

  it("twice-daily 0 9,17 * * * from 10:00 fires at 17:00 same day", () => {
    const ref = new Date(2026, 3, 15, 10, 0, 0, 0);
    const next = nextCronTickFromExpression("0 9,17 * * *", ref);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(17);
    expect(next!.getMinutes()).toBe(0);
    expect(next!.getDate()).toBe(15);
  });

  it("twice-daily 0 9,17 * * * from 18:00 fires at 09:00 next day", () => {
    const ref = new Date(2026, 3, 15, 18, 0, 0, 0);
    const next = nextCronTickFromExpression("0 9,17 * * *", ref);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(9);
    expect(next!.getDate()).toBe(16);
  });
});
