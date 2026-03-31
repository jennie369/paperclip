/**
 * GEM Content Control Center — Common Types & Enums
 *
 * Shared type definitions used across all modules.
 * Strict mode — no `any` types.
 */

// ═══════════════════════════════════════════════════════════
// CONTENT TAXONOMY
// ═══════════════════════════════════════════════════════════

/** Content format/series type */
export type ContentType = 'latc' | 'tmt' | 'short_clip' | 'social_post' | 'news' | 'banner' | 'push_notification' | 'inapp_story' | 'sms' | 'chatbot_script' | 'email' | 'content_planner';

/** Content track (high-level category) */
export type Track = 'wealth' | 'wellness' | 'integration';

/** Content pillar (thematic focus) */
export type Pillar = 'spiritual' | 'trading' | 'latc_money' | 'lifestyle';

/** Maps pillars to their parent tracks */
export const PILLAR_TRACK_MAP: Readonly<Record<Pillar, Track>> = {
  spiritual: 'wellness',
  trading: 'wealth',
  latc_money: 'wealth',
  lifestyle: 'integration',
} as const;

// ═══════════════════════════════════════════════════════════
// PERSONA & VOICE
// ═══════════════════════════════════════════════════════════

/**
 * The 7 distinct Jennie AI personas used for content generation.
 * Each persona has a unique voice, tone, and target audience.
 */
export type PersonaType =
  | 'jennie_mentor'
  | 'jennie_provocateur'
  | 'jennie_storyteller'
  | 'jennie_analyst'
  | 'jennie_motivator'
  | 'jennie_educator'
  | 'jennie_confidante';

/**
 * Writing mode determines the overall energy and approach of the content.
 * Mode 1: Calm, authoritative, nurturing
 * Mode 2: Bold, provocative, pattern-interrupting
 */
export type WritingMode = 'mode_1_calm' | 'mode_2_provocative';

// ═══════════════════════════════════════════════════════════
// USER & ACCESS CONTROL
// ═══════════════════════════════════════════════════════════

/** User roles for the Content Control Center */
export type UserRole = 'owner' | 'editor' | 'viewer' | 'ai_agent';

/** Permission actions that can be performed */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'publish'
  | 'generate';

/** Permission check result */
export interface Permission {
  readonly role: UserRole;
  readonly action: PermissionAction;
  readonly resource: string;
  readonly allowed: boolean;
}

// ═══════════════════════════════════════════════════════════
// STATUS ENUMS
// ═══════════════════════════════════════════════════════════

/** Script workflow status */
export type ScriptStatus =
  | 'draft'
  | 'generating'
  | 'review'
  | 'revision'
  | 'approved'
  | 'published'
  | 'archived';

/** Social post workflow status */
export type SocialPostStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'archived';

/** Calendar event status */
export type CalendarEventStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

/** Generation job status */
export type GenerationJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** YouTube video publication status */
export type VideoPublishStatus =
  | 'draft'
  | 'unlisted'
  | 'public'
  | 'private'
  | 'scheduled';

/** Image prompt generation status */
export type ImagePromptStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'approved'
  | 'rejected';

// ═══════════════════════════════════════════════════════════
// SEVERITY & PRIORITY
// ═══════════════════════════════════════════════════════════

/** Severity levels for notifications, alerts, and compliance issues */
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** Priority levels for tasks and calendar events */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

/** Notification channel */
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

/** Notification category */
export type NotificationCategory =
  | 'content'
  | 'analytics'
  | 'system'
  | 'approval'
  | 'generation'
  | 'calendar'
  | 'compliance';

// ═══════════════════════════════════════════════════════════
// SOCIAL PLATFORMS
// ═══════════════════════════════════════════════════════════

/** Supported social media platforms */
export type SocialPlatform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'threads'
  | 'linkedin';

// ═══════════════════════════════════════════════════════════
// API & PAGINATION
// ═══════════════════════════════════════════════════════════

/** Pagination parameters for list queries */
export interface PaginationParams {
  readonly page: number;
  readonly page_size: number;
  readonly sort_by?: string;
  readonly sort_order?: 'asc' | 'desc';
}

/** Pagination metadata returned with list responses */
export interface PaginationMeta {
  readonly page: number;
  readonly page_size: number;
  readonly total_count: number;
  readonly total_pages: number;
  readonly has_next: boolean;
  readonly has_previous: boolean;
}

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  readonly data: T;
  readonly meta?: PaginationMeta;
  readonly timestamp: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  readonly error: AppError;
  readonly timestamp: string;
}

/** Structured application error */
export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly severity: Severity;
  readonly retryable: boolean;
}

/** Result type for operations that can fail */
export type Result<T, E = AppError> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E };

// ═══════════════════════════════════════════════════════════
// DATE & TIME UTILITIES
// ═══════════════════════════════════════════════════════════

/** ISO 8601 date string (e.g. "2026-03-03T12:00:00Z") */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/** Date range filter */
export interface DateRange {
  readonly start: ISODateString;
  readonly end: ISODateString;
}

// ═══════════════════════════════════════════════════════════
// FILTER & SEARCH
// ═══════════════════════════════════════════════════════════

/** Generic filter for content list views */
export interface ContentFilter {
  readonly content_type?: ContentType;
  readonly track?: Track;
  readonly pillar?: Pillar;
  readonly status?: string;
  readonly persona?: PersonaType;
  readonly writing_mode?: WritingMode;
  readonly date_range?: DateRange;
  readonly search_query?: string;
  readonly tags?: readonly string[];
}

/** Search result with relevance score */
export interface SearchResult<T> {
  readonly item: T;
  readonly score: number;
  readonly highlights: readonly SearchHighlight[];
}

/** Highlighted text fragment from search */
export interface SearchHighlight {
  readonly field: string;
  readonly snippet: string;
  readonly match_start: number;
  readonly match_end: number;
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════

/** Types of actions recorded in the activity log */
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived'
  | 'generated'
  | 'scheduled'
  | 'viewed'
  | 'exported'
  | 'duplicated';

/** Entity types that can be referenced in the activity log */
export type ActivityEntityType =
  | 'script'
  | 'title'
  | 'social_post'
  | 'image_prompt'
  | 'yt_video'
  | 'calendar_event'
  | 'brand_voice_rule'
  | 'prompt_template'
  | 'generation_job';

// ═══════════════════════════════════════════════════════════
// JSON METADATA
// ═══════════════════════════════════════════════════════════

/**
 * Type-safe JSON value. Used in place of `any` for JSONB columns.
 * Matches the Supabase Json type.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json }
  | readonly Json[];

/**
 * Mutable version of Json for building objects before insertion.
 */
export type JsonMutable =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonMutable }
  | JsonMutable[];
