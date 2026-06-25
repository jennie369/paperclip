/**
 * Human-readable cron translator.
 *
 * Converts between structured {@link Schedule} descriptors and 5-field cron
 * strings used by `server/src/services/cron.ts`. The backend interprets cron
 * fields in system local time (POSIX convention), so these translations assume
 * the user's wall-clock time.
 *
 * Design:
 *   - `scheduleToCron(s)` is total — always returns a valid cron string (or null for "off").
 *   - `cronToSchedule(s)` is partial — returns null if the cron doesn't match any
 *     known preset shape. Callers should then fall back to "custom" mode.
 *   - Decoder is strict: we only recognize shapes our encoder can produce, so
 *     round-trip (cron → schedule → cron) is guaranteed stable.
 *
 * @module
 */

export type PresetId =
  | "off"
  | "minutes"
  | "hourly"
  | "daily"
  | "twiceDaily"
  | "thriceDaily"
  | "fourTimesDaily"
  | "fiveTimesDaily"
  | "weekdays"
  | "weeklyDays"
  | "weekly"
  | "monthly"
  | "custom";

/**
 * Structured schedule descriptor. The active fields depend on `preset`.
 */
export type Schedule =
  | { preset: "off" }
  | { preset: "minutes"; everyN: number }
  | { preset: "hourly"; minute: number }
  | { preset: "daily"; hour: number; minute: number }
  | {
      preset: "twiceDaily";
      hour1: number; minute1: number;
      hour2: number; minute2: number;
    }
  | {
      preset: "thriceDaily";
      hour1: number; minute1: number;
      hour2: number; minute2: number;
      hour3: number; minute3: number;
    }
  | {
      preset: "fourTimesDaily";
      hour1: number; minute1: number;
      hour2: number; minute2: number;
      hour3: number; minute3: number;
      hour4: number; minute4: number;
    }
  | {
      preset: "fiveTimesDaily";
      hour1: number; minute1: number;
      hour2: number; minute2: number;
      hour3: number; minute3: number;
      hour4: number; minute4: number;
      hour5: number; minute5: number;
    }
  | { preset: "weekdays"; hour: number; minute: number }
  | { preset: "weeklyDays"; daysOfWeek: number[]; hour: number; minute: number }
  | { preset: "weekly"; dayOfWeek: number; hour: number; minute: number }
  | { preset: "monthly"; dayOfMonth: number; hour: number; minute: number }
  | { preset: "custom"; cron: string };

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "off", label: "Không chạy theo lịch" },
  { id: "minutes", label: "Mỗi N phút" },
  { id: "hourly", label: "Mỗi giờ" },
  { id: "daily", label: "Hàng ngày" },
  { id: "twiceDaily", label: "Hàng ngày 2 lần" },
  { id: "thriceDaily", label: "Hàng ngày 3 lần" },
  { id: "fourTimesDaily", label: "Hàng ngày 4 lần" },
  { id: "fiveTimesDaily", label: "Hàng ngày 5 lần" },
  { id: "weekdays", label: "Từ thứ 2 - thứ 6" },
  { id: "weeklyDays", label: "Chọn ngày trong tuần (tùy ý)" },
  { id: "weekly", label: "Hàng tuần" },
  { id: "monthly", label: "Hàng tháng" },
  { id: "custom", label: "Tùy chỉnh (cron)" },
];

/** Vietnamese day-of-week labels (0=Sun). */
export const DAY_OF_WEEK_LABELS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

// ---------------------------------------------------------------------------
// Encode: Schedule → cron string
// ---------------------------------------------------------------------------

/**
 * Convert a {@link Schedule} descriptor to a 5-field cron string.
 *
 * @returns Cron string for the scheduler, or `""` for `preset: "off"`.
 * @throws {Error} if preset fields are out of range.
 */
export function scheduleToCron(s: Schedule): string {
  switch (s.preset) {
    case "off":
      return "";

    case "minutes": {
      const n = clampInt(s.everyN, 1, 59, "everyN");
      return `*/${n} * * * *`;
    }

    case "hourly": {
      const m = clampInt(s.minute, 0, 59, "minute");
      return `${m} * * * *`;
    }

    case "daily": {
      const h = clampInt(s.hour, 0, 23, "hour");
      const m = clampInt(s.minute, 0, 59, "minute");
      return `${m} ${h} * * *`;
    }

    case "twiceDaily": {
      const h1 = clampInt(s.hour1, 0, 23, "hour1");
      const m1 = clampInt(s.minute1, 0, 59, "minute1");
      const h2 = clampInt(s.hour2, 0, 23, "hour2");
      const m2 = clampInt(s.minute2, 0, 59, "minute2");
      return `${m1} ${sortAndDedup([h1, h2]).join(",")} * * *`;
    }

    case "thriceDaily": {
      const h1 = clampInt(s.hour1, 0, 23, "h1");
      const h2 = clampInt(s.hour2, 0, 23, "h2");
      const h3 = clampInt(s.hour3, 0, 23, "h3");
      const m1 = clampInt(s.minute1, 0, 59, "m1");
      return `${m1} ${sortAndDedup([h1, h2, h3]).join(",")} * * *`;
    }

    case "fourTimesDaily": {
      const h1 = clampInt(s.hour1, 0, 23, "h1");
      const h2 = clampInt(s.hour2, 0, 23, "h2");
      const h3 = clampInt(s.hour3, 0, 23, "h3");
      const h4 = clampInt(s.hour4, 0, 23, "h4");
      const m1 = clampInt(s.minute1, 0, 59, "m1");
      return `${m1} ${sortAndDedup([h1, h2, h3, h4]).join(",")} * * *`;
    }

    case "fiveTimesDaily": {
      const h1 = clampInt(s.hour1, 0, 23, "h1");
      const h2 = clampInt(s.hour2, 0, 23, "h2");
      const h3 = clampInt(s.hour3, 0, 23, "h3");
      const h4 = clampInt(s.hour4, 0, 23, "h4");
      const h5 = clampInt(s.hour5, 0, 23, "h5");
      const m1 = clampInt(s.minute1, 0, 59, "m1");
      return `${m1} ${sortAndDedup([h1, h2, h3, h4, h5]).join(",")} * * *`;
    }

    case "weekdays": {
      const h = clampInt(s.hour, 0, 23, "hour");
      const m = clampInt(s.minute, 0, 59, "minute");
      return `${m} ${h} * * 1-5`;
    }

    case "weeklyDays": {
      const h = clampInt(s.hour, 0, 23, "hour");
      const m = clampInt(s.minute, 0, 59, "minute");
      const days = sortAndDedup(
        s.daysOfWeek.map((d, i) => clampInt(d, 0, 6, `dayOfWeek[${i}]`)),
      );
      if (days.length === 0) {
        throw new Error("weeklyDays requires at least one day of week");
      }
      return `${m} ${h} * * ${days.join(",")}`;
    }

    case "weekly": {
      const dow = clampInt(s.dayOfWeek, 0, 6, "dayOfWeek");
      const h = clampInt(s.hour, 0, 23, "hour");
      const m = clampInt(s.minute, 0, 59, "minute");
      return `${m} ${h} * * ${dow}`;
    }

    case "monthly": {
      const dom = clampInt(s.dayOfMonth, 1, 31, "dayOfMonth");
      const h = clampInt(s.hour, 0, 23, "hour");
      const m = clampInt(s.minute, 0, 59, "minute");
      return `${m} ${h} ${dom} * *`;
    }

    case "custom":
      return s.cron.trim();
  }
}

// ---------------------------------------------------------------------------
// Decode: cron string → Schedule (strict)
// ---------------------------------------------------------------------------

/**
 * Parse a cron string into a preset-shaped {@link Schedule}.
 *
 * Returns `null` if the cron doesn't match any recognized preset pattern —
 * callers should then use `{preset: "custom", cron}` or prompt the user to
 * reset.
 *
 * Recognized shapes (must match exactly — no extra whitespace, no ranges we
 * don't emit):
 *   - `""` (empty)             → off
 *   - `* /N * * * *`           → minutes (1–59)
 *   - `M * * * *` (M=0-59)     → hourly
 *   - `M H * * *`              → daily
 *   - `M H1,H2 * * *`          → twiceDaily (2 hours, same minute)
 *   - `M H * * D` (D=0-6)      → weekly
 */
export function cronToSchedule(cron: string): Schedule | null {
  const trimmed = cron.trim();

  if (trimmed === "") return { preset: "off" };

  const tokens = trimmed.split(/\s+/);
  if (tokens.length !== 5) return null;

  const [minStr, hourStr, domStr, monStr, dowStr] = tokens as [
    string,
    string,
    string,
    string,
    string,
  ];

  if (monStr !== "*") return null;

  // ---- minutes: */N * * * *
  if (/^\*\/\d+$/.test(minStr) && hourStr === "*" && domStr === "*" && dowStr === "*") {
    const n = parseInt(minStr.slice(2), 10);
    if (n >= 1 && n <= 59) {
      return { preset: "minutes", everyN: n };
    }
    return null;
  }

  // Hereafter, minute must be a single integer.
  const minute = parseSingleInt(minStr, 0, 59);
  if (minute === null) return null;

  // ---- hourly: M * * * *
  if (hourStr === "*" && domStr === "*" && dowStr === "*") {
    return { preset: "hourly", minute };
  }

  // ---- monthly: M H D * *
  if (dowStr === "*" && /^\d+$/.test(domStr)) {
    const dom = parseSingleInt(domStr, 1, 31);
    const hour = parseSingleInt(hourStr, 0, 23);
    if (dom !== null && hour !== null) {
      return { preset: "monthly", dayOfMonth: dom, hour, minute };
    }
    return null;
  }

  // From here, domStr must be "*" for weekly/weekdays/daily/twiceDaily
  if (domStr !== "*") return null;

  // ---- weekdays: M H * * 1-5
  if (dowStr === "1-5") {
    const hour = parseSingleInt(hourStr, 0, 23);
    if (hour !== null) {
      return { preset: "weekdays", hour, minute };
    }
    return null;
  }

  // ---- weeklyDays: M H * * D1,D2,...  (specific multiple days of week, same time)
  if (/^\d+(,\d+)+$/.test(dowStr) && /^\d+$/.test(hourStr)) {
    const hour = parseSingleInt(hourStr, 0, 23);
    const days = dowStr.split(",").map((x) => parseSingleInt(x, 0, 6));
    if (hour !== null && days.every((x) => x !== null)) {
      return {
        preset: "weeklyDays",
        daysOfWeek: sortAndDedup(days as number[]),
        hour,
        minute,
      };
    }
    return null;
  }

  // ---- weekly: M H * * D (day-of-week specific, dom must be *)
  if (dowStr !== "*") {
    const dow = parseSingleInt(dowStr, 0, 6);
    const hour = parseSingleInt(hourStr, 0, 23);
    if (dow !== null && hour !== null) {
      return { preset: "weekly", dayOfWeek: dow, hour, minute };
    }
    return null;
  }

  // ---- daily: M H * * *
  if (/^\d+$/.test(hourStr)) {
    const hour = parseSingleInt(hourStr, 0, 23);
    if (hour !== null) {
      return { preset: "daily", hour, minute };
    }
    return null;
  }


  // ---- multiDaily: M H1,H2,... * * *
  if (/^\d+(,\d+)+$/.test(hourStr)) {
    const parts = hourStr.split(",").map((x) => parseSingleInt(x, 0, 23));
    if (parts.every((x) => x !== null)) {
      const uniqueSorted = sortAndDedup(parts as number[]);
      if (uniqueSorted.length === 2) {
        return {
          preset: "twiceDaily",
          hour1: uniqueSorted[0], minute1: minute,
          hour2: uniqueSorted[1], minute2: minute,
        };
      }
      if (uniqueSorted.length === 3) {
        return {
          preset: "thriceDaily",
          hour1: uniqueSorted[0], minute1: minute,
          hour2: uniqueSorted[1], minute2: minute,
          hour3: uniqueSorted[2], minute3: minute,
        };
      }
      if (uniqueSorted.length === 4) {
        return {
          preset: "fourTimesDaily",
          hour1: uniqueSorted[0], minute1: minute,
          hour2: uniqueSorted[1], minute2: minute,
          hour3: uniqueSorted[2], minute3: minute,
          hour4: uniqueSorted[3], minute4: minute,
        };
      }
      if (uniqueSorted.length === 5) {
        return {
          preset: "fiveTimesDaily",
          hour1: uniqueSorted[0], minute1: minute,
          hour2: uniqueSorted[1], minute2: minute,
          hour3: uniqueSorted[2], minute3: minute,
          hour4: uniqueSorted[3], minute4: minute,
          hour5: uniqueSorted[4], minute5: minute,
        };
      }
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Describe: cron → short human label (for read-only display)
// ---------------------------------------------------------------------------

/**
 * Short Vietnamese label describing a cron schedule, for badges/summaries.
 * Falls back to raw cron if unrecognized.
 */
export function describeCron(cron: string): string {
  const s = cronToSchedule(cron);
  if (s === null) return `Tùy chỉnh: ${cron}`;

  switch (s.preset) {
    case "off":
      return "Không chạy theo lịch";
    case "minutes":
      return `Mỗi ${s.everyN} phút`;
    case "hourly":
      return s.minute === 0
        ? "Mỗi giờ (đầu giờ)"
        : `Mỗi giờ vào phút ${pad2(s.minute)}`;
    case "daily":
      return `Hàng ngày lúc ${pad2(s.hour)}:${pad2(s.minute)}`;
    case "twiceDaily":
      return `Hàng ngày lúc ${pad2(s.hour1)}:${pad2(s.minute1)} và ${pad2(s.hour2)}:${pad2(s.minute2)}`;
    case "thriceDaily":
      return `Hàng ngày lúc ${pad2(s.hour1)}:${pad2(s.minute1)}, ${pad2(s.hour2)}:${pad2(s.minute2)} và ${pad2(s.hour3)}:${pad2(s.minute3)}`;
    case "fourTimesDaily":
      return `Hàng ngày lúc ${pad2(s.hour1)}:${pad2(s.minute1)}, ${pad2(s.hour2)}:${pad2(s.minute2)}, ${pad2(s.hour3)}:${pad2(s.minute3)} và ${pad2(s.hour4)}:${pad2(s.minute4)}`;
    case "fiveTimesDaily":
      return `Hàng ngày lúc ${pad2(s.hour1)}:${pad2(s.minute1)}, ${pad2(s.hour2)}:${pad2(s.minute2)}, ${pad2(s.hour3)}:${pad2(s.minute3)}, ${pad2(s.hour4)}:${pad2(s.minute4)} và ${pad2(s.hour5)}:${pad2(s.minute5)}`;
    case "weekdays":
      return `Từ Thứ 2 đến Thứ 6 lúc ${pad2(s.hour)}:${pad2(s.minute)}`;
    case "weeklyDays":
      return `${s.daysOfWeek.map((d) => DAY_OF_WEEK_LABELS[d]).join(", ")} hàng tuần lúc ${pad2(s.hour)}:${pad2(s.minute)}`;
    case "weekly":
      return `${DAY_OF_WEEK_LABELS[s.dayOfWeek]} hàng tuần lúc ${pad2(s.hour)}:${pad2(s.minute)}`;
    case "monthly":
      return `Ngày ${s.dayOfMonth} hàng tháng lúc ${pad2(s.hour)}:${pad2(s.minute)}`;
    case "custom":
      return `Tùy chỉnh: ${s.cron}`;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clampInt(n: number, min: number, max: number, field: string): number {
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${field} must be integer in [${min},${max}], got ${n}`);
  }
  return n;
}

function parseSingleInt(token: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(token)) return null;
  const n = parseInt(token, 10);
  if (n < min || n > max) return null;
  return n;
}

function sortAndDedup(arr: number[]): number[] {
  return [...new Set(arr)].sort((a, b) => a - b);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
