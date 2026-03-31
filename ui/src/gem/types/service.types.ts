/**
 * GEM Content Control Center — Service Types
 *
 * Types used by service layer (auth, notifications, activity).
 * These bridge between the database row types and the service API.
 */

import type { UserRole, ActivityAction, Json } from './common.types';

// ═══════════════════════════════════════════════════════════
// SERVICE RESPONSE
// ═══════════════════════════════════════════════════════════

export interface ServiceResponse<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly success: boolean;
}

// ═══════════════════════════════════════════════════════════
// PROFILE (matches profiles table row used by auth service)
// ═══════════════════════════════════════════════════════════

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  preferences: Record<string, unknown> | null;
  onboarding_completed: Record<string, boolean> | null;
  youtube_access_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  preferences?: Record<string, unknown> | null;
  onboarding_completed?: Record<string, boolean> | null;
  youtube_access_token?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = {
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  preferences?: Record<string, unknown> | null;
  onboarding_completed?: Record<string, boolean> | null;
  youtube_access_token?: string | null;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// AUTH PARAMS
// ═══════════════════════════════════════════════════════════

export interface SignUpParams {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG PARAMS
// ═══════════════════════════════════════════════════════════

export interface ActivityLogParams {
  readonly user_id: string;
  readonly action: ActivityAction;
  readonly entity_type: string;
  readonly entity_id?: string | null;
  readonly metadata?: Record<string, Json> | null;
  readonly ip_address?: string | null;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION (simplified for service layer)
// ═══════════════════════════════════════════════════════════

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'task'
  | 'mention'
  | 'system';

export interface NotificationRow {
  readonly id: string;
  readonly user_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly link: string | null;
  readonly is_read: boolean;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

export type NotificationInsert = Omit<NotificationRow, 'id' | 'created_at' | 'is_read'> & {
  readonly id?: string;
  readonly is_read?: boolean;
  readonly created_at?: string;
};

export type NotificationUpdate = Partial<Pick<NotificationRow, 'is_read' | 'metadata'>>;
