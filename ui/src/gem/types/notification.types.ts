/**
 * GEM Content Control Center — Notification Types
 *
 * Types for the notification system including in-app alerts,
 * push notifications, and notification preferences.
 */

import type {
  Severity,
  NotificationChannel,
  NotificationCategory,
  ActivityAction,
  ActivityEntityType,
  Json,
} from './common.types';

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

/** A notification delivered to a user */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly message: string;
  readonly category: NotificationCategory;
  readonly severity: Severity;
  readonly channel: NotificationChannel;
  readonly is_read: boolean;
  readonly is_archived: boolean;
  readonly action_url?: string;
  readonly action_label?: string;
  readonly entity_type?: ActivityEntityType;
  readonly entity_id?: string;
  readonly sender_id?: string;
  readonly sender_name?: string;
  readonly group_key?: string;
  readonly metadata: Record<string, Json>;
  readonly expires_at?: string;
  readonly read_at?: string;
  readonly created_at: string;
}

/** Parameters for creating a new notification */
export interface CreateNotificationParams {
  readonly user_id: string;
  readonly title: string;
  readonly message: string;
  readonly category: NotificationCategory;
  readonly severity: Severity;
  readonly channel?: NotificationChannel;
  readonly action_url?: string;
  readonly action_label?: string;
  readonly entity_type?: ActivityEntityType;
  readonly entity_id?: string;
  readonly sender_id?: string;
  readonly sender_name?: string;
  readonly group_key?: string;
  readonly metadata?: Record<string, Json>;
  readonly expires_at?: string;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════

/** User notification preferences */
export interface NotificationPreferences {
  readonly user_id: string;
  readonly enabled: boolean;
  readonly channels: NotificationChannelPreferences;
  readonly categories: NotificationCategoryPreferences;
  readonly quiet_hours?: QuietHours;
  readonly digest_frequency: DigestFrequency;
  readonly updated_at: string;
}

/** Per-channel enable/disable preferences */
export type NotificationChannelPreferences = Readonly<Record<NotificationChannel, boolean>>;

/** Per-category notification settings */
export type NotificationCategoryPreferences = Readonly<
  Record<NotificationCategory, CategoryPreference>
>;

/** Settings for a single notification category */
export interface CategoryPreference {
  readonly enabled: boolean;
  readonly channels: readonly NotificationChannel[];
  readonly min_severity: Severity;
}

/** Quiet hours during which notifications are suppressed */
export interface QuietHours {
  readonly enabled: boolean;
  readonly start_time: string; // HH:mm format
  readonly end_time: string;   // HH:mm format
  readonly timezone: string;
  readonly days: readonly number[]; // 0=Sun, 6=Sat
}

/** How often digest emails are sent */
export type DigestFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never';

// ═══════════════════════════════════════════════════════════
// NOTIFICATION GROUPING & BADGE
// ═══════════════════════════════════════════════════════════

/** Grouped notifications for the notification center UI */
export interface NotificationGroup {
  readonly group_key: string;
  readonly title: string;
  readonly category: NotificationCategory;
  readonly notifications: readonly Notification[];
  readonly unread_count: number;
  readonly latest_at: string;
}

/** Badge count for the notification bell icon */
export interface NotificationBadge {
  readonly total_unread: number;
  readonly by_category: Readonly<Record<NotificationCategory, number>>;
  readonly by_severity: Readonly<Record<Severity, number>>;
  readonly has_critical: boolean;
}

/** Notification list query parameters */
export interface NotificationQuery {
  readonly user_id: string;
  readonly category?: NotificationCategory;
  readonly severity?: Severity;
  readonly channel?: NotificationChannel;
  readonly is_read?: boolean;
  readonly is_archived?: boolean;
  readonly since?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════

/** An entry in the activity log */
export interface ActivityLogEntry {
  readonly id: string;
  readonly user_id: string;
  readonly user_name?: string;
  readonly user_role?: string;
  readonly action: ActivityAction;
  readonly entity_type: ActivityEntityType;
  readonly entity_id: string;
  readonly entity_title?: string;
  readonly description?: string;
  readonly changes?: Record<string, FieldChange>;
  readonly ip_address?: string;
  readonly user_agent?: string;
  readonly metadata: Record<string, Json>;
  readonly created_at: string;
}

/** Describes a single field change in an activity log entry */
export interface FieldChange {
  readonly field: string;
  readonly old_value: Json;
  readonly new_value: Json;
}

/** Activity log query parameters */
export interface ActivityLogQuery {
  readonly user_id?: string;
  readonly action?: ActivityAction;
  readonly entity_type?: ActivityEntityType;
  readonly entity_id?: string;
  readonly since?: string;
  readonly until?: string;
  readonly limit?: number;
  readonly offset?: number;
}
