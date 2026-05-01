import { describe, expect, it } from "vitest";
import {
  cronToSchedule,
  describeCron,
  scheduleToCron,
  type Schedule,
} from "./human-cron";

describe("scheduleToCron", () => {
  it("off → empty string", () => {
    expect(scheduleToCron({ preset: "off" })).toBe("");
  });

  it("minutes every 15", () => {
    expect(scheduleToCron({ preset: "minutes", everyN: 15 })).toBe("*/15 * * * *");
  });

  it("hourly at minute 0", () => {
    expect(scheduleToCron({ preset: "hourly", minute: 0 })).toBe("0 * * * *");
  });

  it("hourly at minute 30", () => {
    expect(scheduleToCron({ preset: "hourly", minute: 30 })).toBe("30 * * * *");
  });

  it("daily 09:00", () => {
    expect(scheduleToCron({ preset: "daily", hour: 9, minute: 0 })).toBe("0 9 * * *");
  });

  it("twiceDaily 09:00 + 17:00", () => {
    expect(
      scheduleToCron({
        preset: "twiceDaily",
        hour1: 9,
        minute1: 0,
        hour2: 17,
        minute2: 0,
      }),
    ).toBe("0 9,17 * * *");
  });

  it("twiceDaily sorts hours ascending", () => {
    expect(
      scheduleToCron({
        preset: "twiceDaily",
        hour1: 17,
        minute1: 0,
        hour2: 9,
        minute2: 0,
      }),
    ).toBe("0 9,17 * * *");
  });

  it("weekly Monday 14:30", () => {
    expect(
      scheduleToCron({ preset: "weekly", dayOfWeek: 1, hour: 14, minute: 30 }),
    ).toBe("30 14 * * 1");
  });

  it("custom passes through", () => {
    expect(scheduleToCron({ preset: "custom", cron: "0 9,12,17 * * 1-5" })).toBe(
      "0 9,12,17 * * 1-5",
    );
  });

  it("out-of-range throws", () => {
    expect(() =>
      scheduleToCron({ preset: "daily", hour: 25, minute: 0 }),
    ).toThrow();
    expect(() =>
      scheduleToCron({ preset: "minutes", everyN: 0 }),
    ).toThrow();
  });
});

describe("cronToSchedule", () => {
  it("empty → off", () => {
    expect(cronToSchedule("")).toEqual({ preset: "off" });
    expect(cronToSchedule("   ")).toEqual({ preset: "off" });
  });

  it("decodes minutes", () => {
    expect(cronToSchedule("*/5 * * * *")).toEqual({
      preset: "minutes",
      everyN: 5,
    });
  });

  it("decodes hourly", () => {
    expect(cronToSchedule("0 * * * *")).toEqual({ preset: "hourly", minute: 0 });
    expect(cronToSchedule("45 * * * *")).toEqual({ preset: "hourly", minute: 45 });
  });

  it("decodes daily", () => {
    expect(cronToSchedule("0 9 * * *")).toEqual({
      preset: "daily",
      hour: 9,
      minute: 0,
    });
  });

  it("decodes twiceDaily", () => {
    expect(cronToSchedule("0 9,17 * * *")).toEqual({
      preset: "twiceDaily",
      hour1: 9,
      minute1: 0,
      hour2: 17,
      minute2: 0,
    });
  });

  it("decodes weekly", () => {
    expect(cronToSchedule("30 14 * * 1")).toEqual({
      preset: "weekly",
      dayOfWeek: 1,
      hour: 14,
      minute: 30,
    });
  });

  it("rejects complex crons (3+ hours list)", () => {
    expect(cronToSchedule("0 9,12,17 * * *")).toBeNull();
  });

  it("rejects range syntax", () => {
    expect(cronToSchedule("0 9 * * 1-5")).toBeNull();
  });

  it("rejects out-of-range values", () => {
    expect(cronToSchedule("0 25 * * *")).toBeNull();
    expect(cronToSchedule("60 9 * * *")).toBeNull();
  });

  it("rejects wrong field count", () => {
    expect(cronToSchedule("0 9 * *")).toBeNull();
  });
});

describe("round-trip (schedule → cron → schedule)", () => {
  const cases: Schedule[] = [
    { preset: "off" },
    { preset: "minutes", everyN: 1 },
    { preset: "minutes", everyN: 15 },
    { preset: "minutes", everyN: 59 },
    { preset: "hourly", minute: 0 },
    { preset: "hourly", minute: 59 },
    { preset: "daily", hour: 0, minute: 0 },
    { preset: "daily", hour: 9, minute: 0 },
    { preset: "daily", hour: 23, minute: 59 },
    { preset: "twiceDaily", hour1: 9, minute1: 0, hour2: 17, minute2: 0 },
    { preset: "twiceDaily", hour1: 6, minute1: 30, hour2: 18, minute2: 30 },
    { preset: "weekly", dayOfWeek: 0, hour: 0, minute: 0 },
    { preset: "weekly", dayOfWeek: 6, hour: 23, minute: 59 },
    { preset: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
  ];

  for (const original of cases) {
    const cron = scheduleToCron(original);
    it(`${JSON.stringify(original)} ↔ "${cron}"`, () => {
      const decoded = cronToSchedule(cron);
      expect(decoded).toEqual(original);
    });
  }
});

describe("describeCron", () => {
  it("empty", () => {
    expect(describeCron("")).toBe("Không chạy theo lịch");
  });

  it("daily", () => {
    expect(describeCron("0 9 * * *")).toBe("Hàng ngày lúc 09:00");
  });

  it("twiceDaily", () => {
    expect(describeCron("0 9,17 * * *")).toBe(
      "Hàng ngày lúc 09:00 và 17:00",
    );
  });

  it("weekly", () => {
    expect(describeCron("0 14 * * 1")).toBe("Thứ Hai hàng tuần lúc 14:00");
  });

  it("minutes", () => {
    expect(describeCron("*/15 * * * *")).toBe("Mỗi 15 phút");
  });

  it("unknown falls back to raw", () => {
    expect(describeCron("0 9 * * 1-5")).toBe("Tùy chỉnh: 0 9 * * 1-5");
  });
});
