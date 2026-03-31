/**
 * GEM Content Control Center — Database Types
 *
 * Supabase-style type definitions for all cc_ prefixed tables.
 * Each table has Row (full record), Insert (for creating), and
 * Update (for patching) variants.
 *
 * NOTE: Row/Insert/Update use `type` aliases (not interfaces) so they
 * satisfy Supabase SDK's `Record<string, unknown>` constraint.
 *
 * Strict mode — no `any` types. All JSONB columns use the Json type.
 */

import type {
  ContentType,
  Track,
  Pillar,
  PersonaType,
  WritingMode,
  UserRole,
  ScriptStatus,
  SocialPostStatus,
  CalendarEventStatus,
  GenerationJobStatus,
  VideoPublishStatus,
  ImagePromptStatus,
  Severity,
  Priority,
  NotificationChannel,
  NotificationCategory,
  SocialPlatform,
  ActivityAction,
  ActivityEntityType,
  Json,
} from './common.types';

import type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
} from './service.types';

// ═══════════════════════════════════════════════════════════
// DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════

export type Database = {
  public: {
    Tables: {
      cc_scripts: {
        Row: CcScriptsRow;
        Insert: CcScriptsInsert;
        Update: CcScriptsUpdate;
        Relationships: [];
      };
      cc_titles: {
        Row: CcTitlesRow;
        Insert: CcTitlesInsert;
        Update: CcTitlesUpdate;
        Relationships: [];
      };
      cc_social_posts: {
        Row: CcSocialPostsRow;
        Insert: CcSocialPostsInsert;
        Update: CcSocialPostsUpdate;
        Relationships: [];
      };
      cc_image_prompts: {
        Row: CcImagePromptsRow;
        Insert: CcImagePromptsInsert;
        Update: CcImagePromptsUpdate;
        Relationships: [];
      };
      cc_yt_videos: {
        Row: CcYtVideosRow;
        Insert: CcYtVideosInsert;
        Update: CcYtVideosUpdate;
        Relationships: [];
      };
      cc_yt_insights: {
        Row: CcYtInsightsRow;
        Insert: CcYtInsightsInsert;
        Update: CcYtInsightsUpdate;
        Relationships: [];
      };
      cc_calendar_events: {
        Row: CcCalendarEventsRow;
        Insert: CcCalendarEventsInsert;
        Update: CcCalendarEventsUpdate;
        Relationships: [];
      };
      cc_brand_voice_rules: {
        Row: CcBrandVoiceRulesRow;
        Insert: CcBrandVoiceRulesInsert;
        Update: CcBrandVoiceRulesUpdate;
        Relationships: [];
      };
      cc_prompt_templates: {
        Row: CcPromptTemplatesRow;
        Insert: CcPromptTemplatesInsert;
        Update: CcPromptTemplatesUpdate;
        Relationships: [];
      };
      cc_notifications: {
        Row: CcNotificationsRow;
        Insert: CcNotificationsInsert;
        Update: CcNotificationsUpdate;
        Relationships: [];
      };
      cc_generation_jobs: {
        Row: CcGenerationJobsRow;
        Insert: CcGenerationJobsInsert;
        Update: CcGenerationJobsUpdate;
        Relationships: [];
      };
      cc_activity_log: {
        Row: CcActivityLogRow;
        Insert: CcActivityLogInsert;
        Update: CcActivityLogUpdate;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

// ═══════════════════════════════════════════════════════════
// cc_scripts
// ═══════════════════════════════════════════════════════════

export type CcScriptsRow = {
  id: string;
  title: string;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  status: ScriptStatus;
  body: string;
  sections: Json;
  emotional_arc: Json;
  word_count: number;
  estimated_duration_seconds: number;
  hook: string;
  cta: string;
  tags: string[];
  compliance_result: Json | null;
  brand_voice_result: Json | null;
  version: number;
  parent_script_id: string | null;
  notes: string | null;
  session_id: string | null;
  draft_body: string | null;
  metadata: Json;
  created_by: string;
  updated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CcScriptsInsert = {
  id?: string;
  title: string;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  status?: ScriptStatus;
  body: string;
  sections?: Json;
  emotional_arc?: Json;
  word_count: number;
  estimated_duration_seconds: number;
  hook: string;
  cta: string;
  tags?: string[];
  compliance_result?: Json | null;
  brand_voice_result?: Json | null;
  version?: number;
  parent_script_id?: string | null;
  notes?: string | null;
  session_id?: string | null;
  draft_body?: string | null;
  metadata?: Json;
  created_by: string;
  updated_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CcScriptsUpdate = {
  id?: string;
  title?: string;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  persona?: PersonaType;
  writing_mode?: WritingMode;
  status?: ScriptStatus;
  body?: string;
  sections?: Json;
  emotional_arc?: Json;
  word_count?: number;
  estimated_duration_seconds?: number;
  hook?: string;
  cta?: string;
  tags?: string[];
  compliance_result?: Json | null;
  brand_voice_result?: Json | null;
  version?: number;
  parent_script_id?: string | null;
  notes?: string | null;
  session_id?: string | null;
  draft_body?: string | null;
  metadata?: Json;
  created_by?: string;
  updated_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_titles
// ═══════════════════════════════════════════════════════════

export type CcTitlesRow = {
  id: string;
  script_id: string | null;
  title_text: string;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  click_score: number | null;
  seo_score: number | null;
  is_selected: boolean;
  source: 'ai_generated' | 'manual' | 'ab_test';
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CcTitlesInsert = {
  id?: string;
  script_id?: string | null;
  title_text: string;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  click_score?: number | null;
  seo_score?: number | null;
  is_selected?: boolean;
  source: 'ai_generated' | 'manual' | 'ab_test';
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CcTitlesUpdate = {
  id?: string;
  script_id?: string | null;
  title_text?: string;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  persona?: PersonaType;
  writing_mode?: WritingMode;
  click_score?: number | null;
  seo_score?: number | null;
  is_selected?: boolean;
  source?: 'ai_generated' | 'manual' | 'ab_test';
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_social_posts
// ═══════════════════════════════════════════════════════════

export type CcSocialPostsRow = {
  id: string;
  script_id: string | null;
  yt_video_id: string | null;
  platform: SocialPlatform;
  post_type: 'caption' | 'thread' | 'story' | 'reel_caption' | 'community_post';
  content: string;
  hashtags: string[];
  mentions: string[];
  media_urls: string[];
  status: SocialPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  external_post_url: string | null;
  engagement_metrics: Json | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CcSocialPostsInsert = {
  id?: string;
  script_id?: string | null;
  yt_video_id?: string | null;
  platform: SocialPlatform;
  post_type: 'caption' | 'thread' | 'story' | 'reel_caption' | 'community_post';
  content: string;
  hashtags?: string[];
  mentions?: string[];
  media_urls?: string[];
  status?: SocialPostStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  engagement_metrics?: Json | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CcSocialPostsUpdate = {
  id?: string;
  script_id?: string | null;
  yt_video_id?: string | null;
  platform?: SocialPlatform;
  post_type?: 'caption' | 'thread' | 'story' | 'reel_caption' | 'community_post';
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  media_urls?: string[];
  status?: SocialPostStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  engagement_metrics?: Json | null;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  persona?: PersonaType;
  writing_mode?: WritingMode;
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_image_prompts
// ═══════════════════════════════════════════════════════════

export type CcImagePromptsRow = {
  id: string;
  script_id: string | null;
  yt_video_id: string | null;
  social_post_id: string | null;
  prompt_text: string;
  negative_prompt: string | null;
  style: string;
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  purpose: 'thumbnail' | 'social_media' | 'banner' | 'story' | 'community_post';
  status: ImagePromptStatus;
  generated_image_url: string | null;
  generated_image_urls: string[];
  selected_image_index: number | null;
  model_used: string | null;
  generation_params: Json | null;
  feedback: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CcImagePromptsInsert = {
  id?: string;
  script_id?: string | null;
  yt_video_id?: string | null;
  social_post_id?: string | null;
  prompt_text: string;
  negative_prompt?: string | null;
  style: string;
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  purpose: 'thumbnail' | 'social_media' | 'banner' | 'story' | 'community_post';
  status?: ImagePromptStatus;
  generated_image_url?: string | null;
  generated_image_urls?: string[];
  selected_image_index?: number | null;
  model_used?: string | null;
  generation_params?: Json | null;
  feedback?: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CcImagePromptsUpdate = {
  id?: string;
  script_id?: string | null;
  yt_video_id?: string | null;
  social_post_id?: string | null;
  prompt_text?: string;
  negative_prompt?: string | null;
  style?: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  purpose?: 'thumbnail' | 'social_media' | 'banner' | 'story' | 'community_post';
  status?: ImagePromptStatus;
  generated_image_url?: string | null;
  generated_image_urls?: string[];
  selected_image_index?: number | null;
  model_used?: string | null;
  generation_params?: Json | null;
  feedback?: string | null;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_yt_videos
// ═══════════════════════════════════════════════════════════

export type CcYtVideosRow = {
  id: string;
  youtube_video_id: string;
  script_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  publish_status: VideoPublishStatus;
  published_at: string | null;
  scheduled_publish_at: string | null;
  duration_seconds: number | null;
  tags: string[];
  category_id: string | null;
  language: string | null;
  views: number;
  likes: number;
  dislikes: number;
  comments_count: number;
  shares: number;
  watch_time_hours: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
  impressions: number;
  impression_ctr: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_revenue_usd: number | null;
  metrics_updated_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type CcYtVideosInsert = {
  id?: string;
  youtube_video_id: string;
  script_id?: string | null;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  publish_status?: VideoPublishStatus;
  published_at?: string | null;
  scheduled_publish_at?: string | null;
  duration_seconds?: number | null;
  tags?: string[];
  category_id?: string | null;
  language?: string | null;
  views?: number;
  likes?: number;
  dislikes?: number;
  comments_count?: number;
  shares?: number;
  watch_time_hours?: number;
  average_view_duration_seconds?: number;
  average_view_percentage?: number;
  impressions?: number;
  impression_ctr?: number;
  subscribers_gained?: number;
  subscribers_lost?: number;
  estimated_revenue_usd?: number | null;
  metrics_updated_at?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

export type CcYtVideosUpdate = {
  id?: string;
  youtube_video_id?: string;
  script_id?: string | null;
  title?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  publish_status?: VideoPublishStatus;
  published_at?: string | null;
  scheduled_publish_at?: string | null;
  duration_seconds?: number | null;
  tags?: string[];
  category_id?: string | null;
  language?: string | null;
  views?: number;
  likes?: number;
  dislikes?: number;
  comments_count?: number;
  shares?: number;
  watch_time_hours?: number;
  average_view_duration_seconds?: number;
  average_view_percentage?: number;
  impressions?: number;
  impression_ctr?: number;
  subscribers_gained?: number;
  subscribers_lost?: number;
  estimated_revenue_usd?: number | null;
  metrics_updated_at?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_yt_insights
// ═══════════════════════════════════════════════════════════

export type CcYtInsightsRow = {
  id: string;
  yt_video_id: string | null;
  insight_type: string;
  title: string;
  description: string;
  severity: 'positive' | 'neutral' | 'negative';
  impact_score: number;
  confidence: number;
  data_points: Json;
  recommendations: string[];
  is_actionable: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type CcYtInsightsInsert = {
  id?: string;
  yt_video_id?: string | null;
  insight_type: string;
  title: string;
  description: string;
  severity: 'positive' | 'neutral' | 'negative';
  impact_score: number;
  confidence: number;
  data_points?: Json;
  recommendations?: string[];
  is_actionable?: boolean;
  is_dismissed?: boolean;
  expires_at?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

export type CcYtInsightsUpdate = {
  id?: string;
  yt_video_id?: string | null;
  insight_type?: string;
  title?: string;
  description?: string;
  severity?: 'positive' | 'neutral' | 'negative';
  impact_score?: number;
  confidence?: number;
  data_points?: Json;
  recommendations?: string[];
  is_actionable?: boolean;
  is_dismissed?: boolean;
  expires_at?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_calendar_events
// ═══════════════════════════════════════════════════════════

export type CcCalendarEventsRow = {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  status: CalendarEventStatus;
  priority: Priority;
  scheduled_date: string;
  scheduled_time: string | null;
  publish_date: string | null;
  deadline: string | null;
  script_id: string | null;
  yt_video_id: string | null;
  platforms: string[];
  tags: string[];
  color: string | null;
  is_recurring: boolean;
  recurrence_rule: Json | null;
  assigned_to: string | null;
  notes: string | null;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
  generation_job_id: string | null;
  auto_comment_text: string | null;
  auto_comment_link: string | null;
  scheduled_publish_time: string | null;
  publish_status: 'draft' | 'scheduled' | 'published' | 'failed';
  publish_result: Json | null;
  platform: SocialPlatform | null;
};

export type CcCalendarEventsInsert = {
  id?: string;
  title: string;
  description?: string | null;
  content_type: ContentType;
  track: Track;
  pillar: Pillar;
  persona: PersonaType;
  writing_mode: WritingMode;
  status?: CalendarEventStatus;
  priority?: Priority;
  scheduled_date: string;
  scheduled_time?: string | null;
  publish_date?: string | null;
  deadline?: string | null;
  script_id?: string | null;
  yt_video_id?: string | null;
  platforms?: string[];
  tags?: string[];
  color?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Json | null;
  assigned_to?: string | null;
  notes?: string | null;
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  generation_job_id?: string | null;
  auto_comment_text?: string | null;
  auto_comment_link?: string | null;
  scheduled_publish_time?: string | null;
  publish_status?: 'draft' | 'scheduled' | 'published' | 'failed';
  publish_result?: Json | null;
  platform?: SocialPlatform | null;
};

export type CcCalendarEventsUpdate = {
  id?: string;
  title?: string;
  description?: string | null;
  content_type?: ContentType;
  track?: Track;
  pillar?: Pillar;
  persona?: PersonaType;
  writing_mode?: WritingMode;
  status?: CalendarEventStatus;
  priority?: Priority;
  scheduled_date?: string;
  scheduled_time?: string | null;
  publish_date?: string | null;
  deadline?: string | null;
  script_id?: string | null;
  yt_video_id?: string | null;
  platforms?: string[];
  tags?: string[];
  color?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Json | null;
  assigned_to?: string | null;
  notes?: string | null;
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  generation_job_id?: string | null;
  auto_comment_text?: string | null;
  auto_comment_link?: string | null;
  scheduled_publish_time?: string | null;
  publish_status?: 'draft' | 'scheduled' | 'published' | 'failed';
  publish_result?: Json | null;
  platform?: SocialPlatform | null;
};

// ═══════════════════════════════════════════════════════════
// cc_brand_voice_rules
// ═══════════════════════════════════════════════════════════

export type CcBrandVoiceRulesRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  rule_type: 'required' | 'preferred' | 'forbidden' | 'conditional';
  severity: Severity;
  applies_to_personas: PersonaType[];
  applies_to_content_types: ContentType[];
  applies_to_writing_modes: WritingMode[];
  pattern: string | null;
  regex_pattern: string | null;
  examples_good: string[];
  examples_bad: string[];
  suggestion_template: string | null;
  is_active: boolean;
  priority: number;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CcBrandVoiceRulesInsert = {
  id?: string;
  name: string;
  description: string;
  category: string;
  rule_type: 'required' | 'preferred' | 'forbidden' | 'conditional';
  severity: Severity;
  applies_to_personas?: PersonaType[];
  applies_to_content_types?: ContentType[];
  applies_to_writing_modes?: WritingMode[];
  pattern?: string | null;
  regex_pattern?: string | null;
  examples_good?: string[];
  examples_bad?: string[];
  suggestion_template?: string | null;
  is_active?: boolean;
  priority?: number;
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CcBrandVoiceRulesUpdate = {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  rule_type?: 'required' | 'preferred' | 'forbidden' | 'conditional';
  severity?: Severity;
  applies_to_personas?: PersonaType[];
  applies_to_content_types?: ContentType[];
  applies_to_writing_modes?: WritingMode[];
  pattern?: string | null;
  regex_pattern?: string | null;
  examples_good?: string[];
  examples_bad?: string[];
  suggestion_template?: string | null;
  is_active?: boolean;
  priority?: number;
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_prompt_templates
// ═══════════════════════════════════════════════════════════

export type CcPromptTemplatesRow = {
  id: string;
  name: string;
  description: string;
  category: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'custom';
  template_text: string;
  variables: Json;
  default_values: Json;
  model_config: Json;
  applies_to_personas: PersonaType[];
  applies_to_content_types: ContentType[];
  applies_to_writing_modes: WritingMode[];
  version: number;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  avg_quality_score: number | null;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CcPromptTemplatesInsert = {
  id?: string;
  name: string;
  description: string;
  category: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'custom';
  template_text: string;
  variables?: Json;
  default_values?: Json;
  model_config?: Json;
  applies_to_personas?: PersonaType[];
  applies_to_content_types?: ContentType[];
  applies_to_writing_modes?: WritingMode[];
  version?: number;
  is_active?: boolean;
  is_default?: boolean;
  usage_count?: number;
  avg_quality_score?: number | null;
  metadata?: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CcPromptTemplatesUpdate = {
  id?: string;
  name?: string;
  description?: string;
  category?: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'custom';
  template_text?: string;
  variables?: Json;
  default_values?: Json;
  model_config?: Json;
  applies_to_personas?: PersonaType[];
  applies_to_content_types?: ContentType[];
  applies_to_writing_modes?: WritingMode[];
  version?: number;
  is_active?: boolean;
  is_default?: boolean;
  usage_count?: number;
  avg_quality_score?: number | null;
  metadata?: Json;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_notifications
// ═══════════════════════════════════════════════════════════

export type CcNotificationsRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: Severity;
  channel: NotificationChannel;
  is_read: boolean;
  is_archived: boolean;
  action_url: string | null;
  action_label: string | null;
  entity_type: ActivityEntityType | null;
  entity_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  group_key: string | null;
  metadata: Json;
  expires_at: string | null;
  read_at: string | null;
  created_at: string;
};

export type CcNotificationsInsert = {
  id?: string;
  user_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: Severity;
  channel?: NotificationChannel;
  is_read?: boolean;
  is_archived?: boolean;
  action_url?: string | null;
  action_label?: string | null;
  entity_type?: ActivityEntityType | null;
  entity_id?: string | null;
  sender_id?: string | null;
  sender_name?: string | null;
  group_key?: string | null;
  metadata?: Json;
  expires_at?: string | null;
  read_at?: string | null;
  created_at?: string;
};

export type CcNotificationsUpdate = {
  id?: string;
  user_id?: string;
  title?: string;
  message?: string;
  category?: NotificationCategory;
  severity?: Severity;
  channel?: NotificationChannel;
  is_read?: boolean;
  is_archived?: boolean;
  action_url?: string | null;
  action_label?: string | null;
  entity_type?: ActivityEntityType | null;
  entity_id?: string | null;
  sender_id?: string | null;
  sender_name?: string | null;
  group_key?: string | null;
  metadata?: Json;
  expires_at?: string | null;
  read_at?: string | null;
  created_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_generation_jobs
// ═══════════════════════════════════════════════════════════

export type CcGenerationJobsRow = {
  id: string;
  job_type: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'compliance_check' | 'brand_voice_check';
  status: GenerationJobStatus;
  priority: Priority;
  input_params: Json;
  output_data: Json | null;
  error_message: string | null;
  error_code: string | null;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  generation_time_ms: number | null;
  retry_count: number;
  max_retries: number;
  entity_type: ActivityEntityType | null;
  entity_id: string | null;
  content_type: ContentType | null;
  track: Track | null;
  pillar: Pillar | null;
  persona: PersonaType | null;
  writing_mode: WritingMode | null;
  source: string | null;
  processor: string | null;
  metadata: Json;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CcGenerationJobsInsert = {
  id?: string;
  job_type: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'compliance_check' | 'brand_voice_check';
  status?: GenerationJobStatus;
  priority?: Priority;
  input_params: Json;
  output_data?: Json | null;
  error_message?: string | null;
  error_code?: string | null;
  model_used?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  generation_time_ms?: number | null;
  retry_count?: number;
  max_retries?: number;
  entity_type?: ActivityEntityType | null;
  entity_id?: string | null;
  content_type?: ContentType | null;
  track?: Track | null;
  pillar?: Pillar | null;
  persona?: PersonaType | null;
  writing_mode?: WritingMode | null;
  source?: string | null;
  processor?: string | null;
  metadata?: Json;
  created_by: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CcGenerationJobsUpdate = {
  id?: string;
  job_type?: 'script' | 'title' | 'social_post' | 'image_prompt' | 'analysis' | 'compliance_check' | 'brand_voice_check';
  status?: GenerationJobStatus;
  priority?: Priority;
  input_params?: Json;
  output_data?: Json | null;
  error_message?: string | null;
  error_code?: string | null;
  model_used?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  generation_time_ms?: number | null;
  retry_count?: number;
  max_retries?: number;
  entity_type?: ActivityEntityType | null;
  entity_id?: string | null;
  content_type?: ContentType | null;
  track?: Track | null;
  pillar?: Pillar | null;
  persona?: PersonaType | null;
  writing_mode?: WritingMode | null;
  source?: string | null;
  processor?: string | null;
  metadata?: Json;
  created_by?: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ═══════════════════════════════════════════════════════════
// cc_activity_log
// ═══════════════════════════════════════════════════════════

export type CcActivityLogRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: UserRole | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string;
  entity_title: string | null;
  description: string | null;
  changes: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: string;
};

export type CcActivityLogInsert = {
  id?: string;
  user_id: string;
  user_name?: string | null;
  user_role?: UserRole | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string;
  entity_title?: string | null;
  description?: string | null;
  changes?: Json | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Json;
  created_at?: string;
};

export type CcActivityLogUpdate = {
  id?: string;
  user_id?: string;
  user_name?: string | null;
  user_role?: UserRole | null;
  action?: ActivityAction;
  entity_type?: ActivityEntityType;
  entity_id?: string;
  entity_title?: string | null;
  description?: string | null;
  changes?: Json | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Json;
  created_at?: string;
};

// ═══════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════

/** Extract the Row type from any table */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Extract the Insert type from any table */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Extract the Update type from any table */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/** All table names in the cc_ schema */
export type TableName = keyof Database['public']['Tables'];
