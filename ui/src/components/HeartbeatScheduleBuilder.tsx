/**
 * HeartbeatScheduleBuilder — human-readable schedule builder for agent heartbeats.
 *
 * Replaces raw cron expression input with a preset-driven UI. Decodes existing
 * cron strings into structured {@link Schedule} when possible; falls back to
 * "Tùy chỉnh (cron)" mode for unrecognized shapes.
 *
 * The backend (`server/src/services/cron.ts`) interprets cron fields in system
 * **local time** after GEMRAL FIX 2026-04-15, so all times shown here are the
 * user's wall-clock time (HCM for our fleet). No timezone conversion needed.
 */

import { useCallback, useMemo } from "react";
import {
  cronToSchedule,
  describeCron,
  PRESETS,
  scheduleToCron,
  type PresetId,
  type Schedule,
  DAY_OF_WEEK_LABELS,
} from "../lib/human-cron";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const smallInputClass =
  "rounded-md border border-border px-2 py-1 bg-transparent outline-none text-sm font-mono w-16";

/** Compact day-of-week labels (0=Sun) for the weeklyDays chip selector. */
const SHORT_DAY_OF_WEEK_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayChipClass(active: boolean): string {
  return (
    "rounded-md border px-2.5 py-1 text-xs font-sans transition-colors " +
    (active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-muted-foreground hover:bg-muted")
  );
}

/**
 * Toggle a day in/out of the selection. Keeps the result sorted ascending and
 * never returns an empty set (un-checking the last remaining day is a no-op) —
 * an empty day list would produce an invalid cron.
 */
function toggleDay(days: number[], day: number): number[] {
  if (days.includes(day)) {
    const next = days.filter((d) => d !== day);
    return next.length === 0 ? days : next;
  }
  return [...days, day].sort((a, b) => a - b);
}

/**
 * Pick a sensible default hour for a newly-added time slot that isn't already
 * used. Prefers spread-out daytime hours; falls back to the next free hour.
 */
function nextHourSlot(hours: number[]): number {
  const used = new Set(hours);
  for (const cand of [9, 12, 15, 18, 21, 7, 6, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 0]) {
    if (!used.has(cand)) return cand;
  }
  return (Math.max(...hours, 0) + 1) % 24;
}

interface Props {
  /** Current cron expression string (may be empty). */
  value: string;
  /** Called with the new cron string whenever user edits schedule. */
  onChange: (cron: string) => void;
}

export function HeartbeatScheduleBuilder({ value, onChange }: Props) {
  // Decode cron → schedule descriptor. If decode fails, fall back to custom.
  const schedule = useMemo<Schedule>(() => {
    const decoded = cronToSchedule(value);
    if (decoded !== null) return decoded;
    // Unknown cron shape — expose in "custom" mode so user can see/edit raw.
    return { preset: "custom", cron: value };
  }, [value]);

  const emit = useCallback(
    (next: Schedule) => {
      try {
        onChange(scheduleToCron(next));
      } catch {
        // Out-of-range — no-op; UI validation should prevent this.
      }
    },
    [onChange],
  );

  const changePreset = useCallback(
    (preset: PresetId) => {
      emit(defaultScheduleForPreset(preset, schedule));
    },
    [emit, schedule],
  );

  const summary = useMemo(
    () => (value.trim() === "" ? "Chưa đặt lịch" : describeCron(value)),
    [value],
  );

  return (
    <div className="space-y-2">
      {/* Preset selector */}
      <div className="flex items-center gap-2">
        <select
          className={inputClass + " w-auto flex-1 font-sans"}
          value={schedule.preset}
          onChange={(e) => changePreset(e.target.value as PresetId)}
          data-testid="heartbeat-preset-select"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preset-specific fields */}
      {schedule.preset === "minutes" && (
        <InlineRow label="Mỗi">
          <input
            type="number"
            min={1}
            max={59}
            value={schedule.everyN}
            onChange={(e) =>
              emit({
                preset: "minutes",
                everyN: clamp(parseInt(e.target.value, 10) || 1, 1, 59),
              })
            }
            className={smallInputClass}
            data-testid="heartbeat-minutes-n"
          />
          <span className="text-xs text-muted-foreground">phút</span>
        </InlineRow>
      )}

      {schedule.preset === "hourly" && (
        <InlineRow label="Vào phút thứ">
          <input
            type="number"
            min={0}
            max={59}
            value={schedule.minute}
            onChange={(e) =>
              emit({
                preset: "hourly",
                minute: clamp(parseInt(e.target.value, 10) || 0, 0, 59),
              })
            }
            className={smallInputClass}
          />
          <span className="text-xs text-muted-foreground">của mỗi giờ</span>
        </InlineRow>
      )}

      {schedule.preset === "daily" && (
        <InlineRow label="Lúc">
          <TimePicker
            hour={schedule.hour}
            minute={schedule.minute}
            onChange={(hour, minute) => emit({ preset: "daily", hour, minute })}
          />
          <TimezoneHint />
        </InlineRow>
      )}

      {schedule.preset === "twiceDaily" && (
        <div className="space-y-2">
          <InlineRow label="Lần 1">
            <TimePicker
              hour={schedule.hour1}
              minute={schedule.minute1}
              onChange={(hour1, minute1) =>
                emit({
                  ...schedule,
                  hour1,
                  minute1,
                  minute2: minute1,
                })
              }
            />
          </InlineRow>
          <InlineRow label="Lần 2">
            <TimePicker
              hour={schedule.hour2}
              minute={schedule.minute2}
              onChange={(hour2, minute2) =>
                emit({
                  ...schedule,
                  hour2,
                  minute2,
                  minute1: minute2,
                })
              }
            />
            <TimezoneHint />
          </InlineRow>
        </div>
      )}

      {schedule.preset === "thriceDaily" && (
        <div className="space-y-2">
          <InlineRow label="Lần 1">
            <TimePicker hour={schedule.hour1} minute={schedule.minute1} onChange={(h, m) => emit({ ...schedule, hour1: h, minute1: m, minute2: m, minute3: m })} />
          </InlineRow>
          <InlineRow label="Lần 2">
            <TimePicker hour={schedule.hour2} minute={schedule.minute2} onChange={(h, m) => emit({ ...schedule, hour2: h, minute1: m, minute2: m, minute3: m })} />
          </InlineRow>
          <InlineRow label="Lần 3">
            <TimePicker hour={schedule.hour3} minute={schedule.minute3} onChange={(h, m) => emit({ ...schedule, hour3: h, minute1: m, minute2: m, minute3: m })} />
            <TimezoneHint />
          </InlineRow>
        </div>
      )}

      {schedule.preset === "fourTimesDaily" && (
        <div className="space-y-2">
          <InlineRow label="Lần 1">
            <TimePicker hour={schedule.hour1} minute={schedule.minute1} onChange={(h, m) => emit({ ...schedule, hour1: h, minute1: m, minute2: m, minute3: m, minute4: m })} />
          </InlineRow>
          <InlineRow label="Lần 2">
            <TimePicker hour={schedule.hour2} minute={schedule.minute2} onChange={(h, m) => emit({ ...schedule, hour2: h, minute1: m, minute2: m, minute3: m, minute4: m })} />
          </InlineRow>
          <InlineRow label="Lần 3">
            <TimePicker hour={schedule.hour3} minute={schedule.minute3} onChange={(h, m) => emit({ ...schedule, hour3: h, minute1: m, minute2: m, minute3: m, minute4: m })} />
          </InlineRow>
          <InlineRow label="Lần 4">
            <TimePicker hour={schedule.hour4} minute={schedule.minute4} onChange={(h, m) => emit({ ...schedule, hour4: h, minute1: m, minute2: m, minute3: m, minute4: m })} />
            <TimezoneHint />
          </InlineRow>
        </div>
      )}

      {schedule.preset === "fiveTimesDaily" && (
        <div className="space-y-2">
          <InlineRow label="Lần 1">
            <TimePicker hour={schedule.hour1} minute={schedule.minute1} onChange={(h, m) => emit({ ...schedule, hour1: h, minute1: m, minute2: m, minute3: m, minute4: m, minute5: m })} />
          </InlineRow>
          <InlineRow label="Lần 2">
            <TimePicker hour={schedule.hour2} minute={schedule.minute2} onChange={(h, m) => emit({ ...schedule, hour2: h, minute1: m, minute2: m, minute3: m, minute4: m, minute5: m })} />
          </InlineRow>
          <InlineRow label="Lần 3">
            <TimePicker hour={schedule.hour3} minute={schedule.minute3} onChange={(h, m) => emit({ ...schedule, hour3: h, minute1: m, minute2: m, minute3: m, minute4: m, minute5: m })} />
          </InlineRow>
          <InlineRow label="Lần 4">
            <TimePicker hour={schedule.hour4} minute={schedule.minute4} onChange={(h, m) => emit({ ...schedule, hour4: h, minute1: m, minute2: m, minute3: m, minute4: m, minute5: m })} />
          </InlineRow>
          <InlineRow label="Lần 5">
            <TimePicker hour={schedule.hour5} minute={schedule.minute5} onChange={(h, m) => emit({ ...schedule, hour5: h, minute1: m, minute2: m, minute3: m, minute4: m, minute5: m })} />
            <TimezoneHint />
          </InlineRow>
        </div>
      )}

      {schedule.preset === "weekly" && (
        <InlineRow label="Vào">
          <select
            className={inputClass + " w-auto font-sans"}
            value={schedule.dayOfWeek}
            onChange={(e) =>
              emit({ ...schedule, dayOfWeek: parseInt(e.target.value, 10) })
            }
          >
            {DAY_OF_WEEK_LABELS.map((label, idx) => (
              <option key={idx} value={idx}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">lúc</span>
          <TimePicker
            hour={schedule.hour}
            minute={schedule.minute}
            onChange={(hour, minute) => emit({ ...schedule, hour, minute })}
          />
          <TimezoneHint />
        </InlineRow>
      )}

      {schedule.preset === "weekdays" && (
        <InlineRow label="Lúc">
          <TimePicker
            hour={schedule.hour}
            minute={schedule.minute}
            onChange={(hour, minute) => emit({ preset: "weekdays", hour, minute })}
          />
          <TimezoneHint />
        </InlineRow>
      )}

      {schedule.preset === "weeklyDays" && (
        <div className="space-y-2">
          <InlineRow label="Vào các thứ">
            <div className="flex flex-wrap gap-1" data-testid="heartbeat-weeklydays-chips">
              {SHORT_DAY_OF_WEEK_LABELS.map((label, idx) => {
                const active = schedule.daysOfWeek.includes(idx);
                return (
                  <button
                    type="button"
                    key={idx}
                    aria-pressed={active}
                    onClick={() => emit({ ...schedule, daysOfWeek: toggleDay(schedule.daysOfWeek, idx) })}
                    className={dayChipClass(active)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </InlineRow>
          <InlineRow label="Các mốc giờ">
            <div className="flex flex-col gap-1" data-testid="heartbeat-weeklydays-times">
              {schedule.hours.map((h, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <TimePicker
                    hour={h}
                    minute={schedule.minute}
                    onChange={(hour, minute) =>
                      emit({
                        ...schedule,
                        hours: schedule.hours.map((hh, i) => (i === idx ? hour : hh)),
                        minute, // shared minute across all slots (cron limitation)
                      })
                    }
                  />
                  {schedule.hours.length > 1 && (
                    <button
                      type="button"
                      aria-label="Xóa mốc giờ"
                      onClick={() =>
                        emit({ ...schedule, hours: schedule.hours.filter((_, i) => i !== idx) })
                      }
                      className="rounded-md border border-border px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                data-testid="heartbeat-weeklydays-add-time"
                onClick={() => emit({ ...schedule, hours: [...schedule.hours, nextHourSlot(schedule.hours)] })}
                className="mt-0.5 self-start rounded-md border border-dashed border-border px-2 py-1 text-xs font-sans text-muted-foreground hover:bg-muted"
              >
                + Thêm mốc giờ
              </button>
            </div>
            <TimezoneHint />
          </InlineRow>
          <p className="text-[10px] text-muted-foreground/70 leading-snug">
            Các mốc giờ áp dụng cho TẤT CẢ ngày đã chọn và dùng chung số phút (vd 09:00, 15:00, 20:00).
          </p>
        </div>
      )}

      {schedule.preset === "monthly" && (
        <InlineRow label="Vào ngày">
          <input
            type="number"
            min={1}
            max={31}
            value={schedule.dayOfMonth}
            onChange={(e) =>
              emit({
                ...schedule,
                dayOfMonth: clamp(parseInt(e.target.value, 10) || 1, 1, 31),
              })
            }
            className={smallInputClass}
          />
          <span className="text-xs text-muted-foreground">lúc</span>
          <TimePicker
            hour={schedule.hour}
            minute={schedule.minute}
            onChange={(hour, minute) => emit({ ...schedule, hour, minute })}
          />
          <TimezoneHint />
        </InlineRow>
      )}

      {schedule.preset === "custom" && (
        <div>
          <input
            type="text"
            value={schedule.cron}
            onChange={(e) => emit({ preset: "custom", cron: e.target.value })}
            placeholder="VD: 0 9 * * 1-5 (weekday 09:00)"
            className={inputClass}
            data-testid="heartbeat-custom-cron"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cron 5-field: phút giờ ngày tháng thứ. Thời gian theo giờ máy (HCM).
          </p>
        </div>
      )}

      {/* Live summary */}
      <p className="text-xs text-muted-foreground italic" data-testid="heartbeat-schedule-summary">
        → {summary}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InlineRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground min-w-[60px]">{label}</span>
      {children}
    </div>
  );
}

function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 font-mono">
      <input
        type="number"
        min={0}
        max={23}
        value={hour}
        onChange={(e) =>
          onChange(clamp(parseInt(e.target.value, 10) || 0, 0, 23), minute)
        }
        className={smallInputClass}
      />
      <span className="text-muted-foreground">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={minute}
        onChange={(e) =>
          onChange(hour, clamp(parseInt(e.target.value, 10) || 0, 0, 59))
        }
        className={smallInputClass}
      />
    </div>
  );
}

function TimezoneHint() {
  return (
    <span className="text-[10px] text-muted-foreground/70">(giờ Việt Nam)</span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * When user switches preset, try to carry over similar fields from the current
 * schedule so the transition feels intuitive. Fill in reasonable defaults for
 * fields that have no equivalent in the previous preset.
 */
function defaultScheduleForPreset(
  preset: PresetId,
  current: Schedule,
): Schedule {
  // Extract current time-like fields (if any) for carry-over.
  const currentHour = extractHour(current);
  const currentMinute = extractMinute(current);

  switch (preset) {
    case "off":
      return { preset: "off" };
    case "minutes":
      return { preset: "minutes", everyN: 15 };
    case "hourly":
      return { preset: "hourly", minute: currentMinute ?? 0 };
    case "daily":
      return {
        preset: "daily",
        hour: currentHour ?? 9,
        minute: currentMinute ?? 0,
      };
    case "twiceDaily":
      return {
        preset: "twiceDaily",
        hour1: 9, minute1: currentMinute ?? 0,
        hour2: 17, minute2: currentMinute ?? 0,
      };
    case "thriceDaily":
      return {
        preset: "thriceDaily",
        hour1: 9, minute1: currentMinute ?? 0,
        hour2: 13, minute2: currentMinute ?? 0,
        hour3: 17, minute3: currentMinute ?? 0,
      };
    case "fourTimesDaily":
      return {
        preset: "fourTimesDaily",
        hour1: 9, minute1: currentMinute ?? 0,
        hour2: 12, minute2: currentMinute ?? 0,
        hour3: 15, minute3: currentMinute ?? 0,
        hour4: 18, minute4: currentMinute ?? 0,
      };
    case "fiveTimesDaily":
      return {
        preset: "fiveTimesDaily",
        hour1: 8, minute1: currentMinute ?? 0,
        hour2: 11, minute2: currentMinute ?? 0,
        hour3: 14, minute3: currentMinute ?? 0,
        hour4: 17, minute4: currentMinute ?? 0,
        hour5: 20, minute5: currentMinute ?? 0,
      };
    case "weekly":
      return {
        preset: "weekly",
        dayOfWeek: 1, // Monday default
        hour: currentHour ?? 9,
        minute: currentMinute ?? 0,
      };
    case "weekdays":
      return {
        preset: "weekdays",
        hour: currentHour ?? 9,
        minute: currentMinute ?? 0,
      };
    case "weeklyDays":
      return {
        preset: "weeklyDays",
        // Carry over days from the previous schedule when possible (weekly →
        // its single day, weekdays → Mon–Fri); otherwise a sensible default.
        daysOfWeek: extractDaysOfWeek(current) ?? [1, 3, 5],
        // Carry over time slots from a multi-time preset; otherwise one slot.
        hours: extractHours(current) ?? [currentHour ?? 9],
        minute: currentMinute ?? 0,
      };
    case "monthly":
      return {
        preset: "monthly",
        dayOfMonth: 1, // 1st of month default
        hour: currentHour ?? 9,
        minute: currentMinute ?? 0,
      };
    case "custom":
      return { preset: "custom", cron: "" };
  }
}

function extractHour(s: Schedule): number | null {
  if (s.preset === "daily" || s.preset === "weekly" || s.preset === "weekdays" || s.preset === "monthly") return s.hour;
  if (s.preset === "weeklyDays") return s.hours[0] ?? null;
  if (s.preset === "twiceDaily" || s.preset === "thriceDaily" || s.preset === "fourTimesDaily" || s.preset === "fiveTimesDaily") return s.hour1;
  return null;
}

/** Hour list to carry over when switching INTO a multi-time preset (weeklyDays). */
function extractHours(s: Schedule): number[] | null {
  if (s.preset === "weeklyDays") return s.hours;
  if (s.preset === "twiceDaily") return [s.hour1, s.hour2];
  if (s.preset === "thriceDaily") return [s.hour1, s.hour2, s.hour3];
  if (s.preset === "fourTimesDaily") return [s.hour1, s.hour2, s.hour3, s.hour4];
  if (s.preset === "fiveTimesDaily") return [s.hour1, s.hour2, s.hour3, s.hour4, s.hour5];
  if (s.preset === "daily" || s.preset === "weekly" || s.preset === "weekdays") return [s.hour];
  return null;
}

function extractMinute(s: Schedule): number | null {
  if (s.preset === "daily" || s.preset === "weekly" || s.preset === "hourly" || s.preset === "weekdays" || s.preset === "weeklyDays" || s.preset === "monthly")
    return s.minute;
  if (s.preset === "twiceDaily" || s.preset === "thriceDaily" || s.preset === "fourTimesDaily" || s.preset === "fiveTimesDaily") return s.minute1;
  return null;
}

/** Days-of-week to carry over when switching INTO the weeklyDays preset. */
function extractDaysOfWeek(s: Schedule): number[] | null {
  if (s.preset === "weeklyDays") return s.daysOfWeek;
  if (s.preset === "weekly") return [s.dayOfWeek];
  if (s.preset === "weekdays") return [1, 2, 3, 4, 5];
  return null;
}
