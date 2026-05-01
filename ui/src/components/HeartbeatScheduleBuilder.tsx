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
  if (s.preset === "twiceDaily" || s.preset === "thriceDaily" || s.preset === "fourTimesDaily" || s.preset === "fiveTimesDaily") return s.hour1;
  return null;
}

function extractMinute(s: Schedule): number | null {
  if (s.preset === "daily" || s.preset === "weekly" || s.preset === "hourly" || s.preset === "weekdays" || s.preset === "monthly")
    return s.minute;
  if (s.preset === "twiceDaily" || s.preset === "thriceDaily" || s.preset === "fourTimesDaily" || s.preset === "fiveTimesDaily") return s.minute1;
  return null;
}
