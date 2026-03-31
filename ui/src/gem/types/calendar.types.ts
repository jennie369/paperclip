/**
 * GEM Content Control Center — Calendar Types
 *
 * Types for the content calendar, scheduling, and
 * editorial planning workflows.
 */

import type {
  ContentType,
  Track,
  Pillar,
  PersonaType,
  WritingMode,
  CalendarEventStatus,
  Priority,
  SocialPlatform,
  Json,
} from './common.types';

// ═══════════════════════════════════════════════════════════
// CALENDAR EVENTS
// ═══════════════════════════════════════════════════════════

/** Publish status for scheduled social posts */
export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'failed';

/** A calendar event representing a scheduled content item */
export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly persona: PersonaType;
  readonly writing_mode: WritingMode;
  readonly status: CalendarEventStatus;
  readonly priority: Priority;
  readonly scheduled_date: string;
  readonly scheduled_time?: string;
  readonly publish_date?: string;
  readonly deadline?: string;
  readonly script_id?: string;
  readonly yt_video_id?: string;
  readonly platforms: readonly SocialPlatform[];
  readonly tags: readonly string[];
  readonly color?: string;
  readonly is_recurring: boolean;
  readonly recurrence_rule?: RecurrenceRule;
  readonly assigned_to?: string;
  readonly notes?: string;
  readonly metadata: Record<string, Json>;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly generation_job_id?: string;
  readonly auto_comment_text?: string;
  readonly auto_comment_link?: string;
  readonly scheduled_publish_time?: string;
  readonly publish_status?: PublishStatus;
  readonly publish_result?: Record<string, Json>;
  readonly platform?: SocialPlatform;
}

// ═══════════════════════════════════════════════════════════
// RECURRENCE
// ═══════════════════════════════════════════════════════════

/** Recurrence rule for repeating calendar events */
export interface RecurrenceRule {
  readonly frequency: RecurrenceFrequency;
  readonly interval: number;
  readonly days_of_week?: readonly DayOfWeek[];
  readonly day_of_month?: number;
  readonly end_type: 'never' | 'after_count' | 'on_date';
  readonly end_count?: number;
  readonly end_date?: string;
  readonly exceptions?: readonly string[]; // ISO date strings of skipped occurrences
}

/** Recurrence frequency options */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

/** Days of the week */
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ═══════════════════════════════════════════════════════════
// CALENDAR VIEWS
// ═══════════════════════════════════════════════════════════

/** Calendar view mode */
export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda' | 'timeline';

/** Filters for the calendar view */
export interface CalendarFilter {
  readonly content_types?: readonly ContentType[];
  readonly tracks?: readonly Track[];
  readonly pillars?: readonly Pillar[];
  readonly statuses?: readonly CalendarEventStatus[];
  readonly priorities?: readonly Priority[];
  readonly platforms?: readonly SocialPlatform[];
  readonly assigned_to?: string;
  readonly tags?: readonly string[];
  readonly show_recurring: boolean;
}

/** Calendar date range query parameters */
export interface CalendarQuery {
  readonly start_date: string;
  readonly end_date: string;
  readonly view_mode: CalendarViewMode;
  readonly filter?: CalendarFilter;
}

/** Calendar view state for the UI */
export interface CalendarViewState {
  readonly current_date: string;
  readonly view_mode: CalendarViewMode;
  readonly filter: CalendarFilter;
  readonly selected_event_id?: string;
  readonly is_creating: boolean;
  readonly drag_target_date?: string;
}

// ═══════════════════════════════════════════════════════════
// CALENDAR SLOTS & PLANNING
// ═══════════════════════════════════════════════════════════

/** A time slot on the calendar that may or may not have an event */
export interface CalendarSlot {
  readonly date: string;
  readonly time?: string;
  readonly event?: CalendarEvent;
  readonly is_available: boolean;
  readonly is_optimal: boolean;
  readonly optimal_reason?: string;
}

/** Content plan for a date range */
export interface ContentPlan {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly events: readonly CalendarEvent[];
  readonly track_distribution: TrackDistribution;
  readonly pillar_distribution: PillarDistribution;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Distribution of content across tracks */
export interface TrackDistribution {
  readonly wealth: number;
  readonly wellness: number;
  readonly integration: number;
  readonly total: number;
}

/** Distribution of content across pillars */
export interface PillarDistribution {
  readonly spiritual: number;
  readonly trading: number;
  readonly latc_money: number;
  readonly lifestyle: number;
  readonly total: number;
}

// ═══════════════════════════════════════════════════════════
// CALENDAR ANALYTICS
// ═══════════════════════════════════════════════════════════

/** Summary statistics for a calendar period */
export interface CalendarSummary {
  readonly period_start: string;
  readonly period_end: string;
  readonly total_events: number;
  readonly events_by_status: Readonly<Record<CalendarEventStatus, number>>;
  readonly events_by_track: TrackDistribution;
  readonly events_by_pillar: PillarDistribution;
  readonly events_by_content_type: Readonly<Record<ContentType, number>>;
  readonly completion_rate: number;
  readonly on_time_rate: number;
  readonly upcoming_deadlines: readonly CalendarEvent[];
}

/** Suggested optimal publish times from analytics */
export interface OptimalPublishTime {
  readonly platform: SocialPlatform;
  readonly day_of_week: DayOfWeek;
  readonly hour_utc: number;
  readonly engagement_score: number;
  readonly sample_size: number;
  readonly confidence: number;
}
