/**
 * GEM Content Control Center — Analytics Types
 *
 * Types for YouTube analytics, channel insights,
 * performance tracking, and data visualization.
 */

import type {
  ContentType,
  Track,
  Pillar,
  DateRange,
  Json,
} from './common.types';

// ═══════════════════════════════════════════════════════════
// YOUTUBE VIDEO
// ═══════════════════════════════════════════════════════════

/** YouTube video record linked to a script */
export interface YtVideo {
  readonly id: string;
  readonly youtube_video_id: string;
  readonly script_id?: string;
  readonly title: string;
  readonly description?: string;
  readonly thumbnail_url?: string;
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly publish_status: 'draft' | 'unlisted' | 'public' | 'private' | 'scheduled';
  readonly published_at?: string;
  readonly scheduled_publish_at?: string;
  readonly duration_seconds?: number;
  readonly tags: readonly string[];
  readonly category_id?: string;
  readonly language?: string;
  readonly latest_metrics?: VideoMetrics;
  readonly metadata: Record<string, Json>;
  readonly created_at: string;
  readonly updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// VIDEO METRICS
// ═══════════════════════════════════════════════════════════

/** Core engagement metrics for a video at a point in time */
export interface VideoMetrics {
  readonly views: number;
  readonly likes: number;
  readonly dislikes: number;
  readonly comments: number;
  readonly shares: number;
  readonly watch_time_hours: number;
  readonly average_view_duration_seconds: number;
  readonly average_view_percentage: number;
  readonly impressions: number;
  readonly impression_click_through_rate: number;
  readonly subscribers_gained: number;
  readonly subscribers_lost: number;
  readonly estimated_revenue_usd?: number;
  readonly recorded_at: string;
}

/** Video metrics with period comparison */
export interface VideoMetricsWithDelta extends VideoMetrics {
  readonly delta: VideoMetricsDelta;
}

/** Delta values showing change between periods */
export interface VideoMetricsDelta {
  readonly views: number;
  readonly views_percent: number;
  readonly likes: number;
  readonly likes_percent: number;
  readonly comments: number;
  readonly comments_percent: number;
  readonly shares: number;
  readonly shares_percent: number;
  readonly watch_time_hours: number;
  readonly watch_time_percent: number;
  readonly average_view_duration_seconds: number;
  readonly average_view_duration_percent: number;
  readonly impressions: number;
  readonly impressions_percent: number;
  readonly impression_click_through_rate: number;
  readonly subscribers_gained: number;
  readonly subscribers_gained_percent: number;
}

// ═══════════════════════════════════════════════════════════
// YOUTUBE INSIGHTS
// ═══════════════════════════════════════════════════════════

/** AI-generated insight derived from YouTube analytics */
export interface YtInsight {
  readonly id: string;
  readonly yt_video_id?: string;
  readonly insight_type: InsightType;
  readonly title: string;
  readonly description: string;
  readonly severity: 'positive' | 'neutral' | 'negative';
  readonly impact_score: number; // 0-100
  readonly confidence: number; // 0-100
  readonly data_points: Record<string, Json>;
  readonly recommendations: readonly string[];
  readonly is_actionable: boolean;
  readonly is_dismissed: boolean;
  readonly expires_at?: string;
  readonly created_at: string;
}

/** Categories of insights */
export type InsightType =
  | 'trend_up'
  | 'trend_down'
  | 'anomaly'
  | 'milestone'
  | 'opportunity'
  | 'audience_shift'
  | 'content_performance'
  | 'optimal_timing'
  | 'topic_suggestion'
  | 'competitor_alert';

// ═══════════════════════════════════════════════════════════
// CHANNEL ANALYTICS
// ═══════════════════════════════════════════════════════════

/** Channel-level analytics overview */
export interface ChannelAnalytics {
  readonly period: DateRange;
  readonly subscriber_count: number;
  readonly total_views: number;
  readonly total_watch_time_hours: number;
  readonly average_views_per_video: number;
  readonly average_engagement_rate: number;
  readonly top_videos: readonly VideoPerformance[];
  readonly metrics_history: readonly ChannelMetricsSnapshot[];
  readonly audience_demographics: AudienceDemographics;
  readonly traffic_sources: readonly TrafficSource[];
}

/** Individual video performance summary */
export interface VideoPerformance {
  readonly video_id: string;
  readonly youtube_video_id: string;
  readonly title: string;
  readonly content_type: ContentType;
  readonly track: Track;
  readonly pillar: Pillar;
  readonly published_at: string;
  readonly metrics: VideoMetrics;
  readonly rank: number;
}

/** Channel metrics at a specific point in time */
export interface ChannelMetricsSnapshot {
  readonly date: string;
  readonly subscriber_count: number;
  readonly views: number;
  readonly watch_time_hours: number;
  readonly estimated_revenue_usd?: number;
  readonly videos_published: number;
}

// ═══════════════════════════════════════════════════════════
// AUDIENCE
// ═══════════════════════════════════════════════════════════

/** Audience demographics breakdown */
export interface AudienceDemographics {
  readonly age_groups: readonly AgeGroup[];
  readonly gender_split: GenderSplit;
  readonly top_countries: readonly GeoEntry[];
  readonly top_languages: readonly LanguageEntry[];
  readonly device_types: DeviceTypes;
}

/** Age group distribution */
export interface AgeGroup {
  readonly range: string; // e.g. "25-34"
  readonly percentage: number;
  readonly viewer_count: number;
}

/** Gender distribution */
export interface GenderSplit {
  readonly male: number;
  readonly female: number;
  readonly other: number;
}

/** Geographic viewer distribution entry */
export interface GeoEntry {
  readonly country_code: string;
  readonly country_name: string;
  readonly percentage: number;
  readonly viewer_count: number;
}

/** Language distribution entry */
export interface LanguageEntry {
  readonly language_code: string;
  readonly language_name: string;
  readonly percentage: number;
}

/** Device type distribution */
export interface DeviceTypes {
  readonly mobile: number;
  readonly desktop: number;
  readonly tablet: number;
  readonly tv: number;
  readonly other: number;
}

// ═══════════════════════════════════════════════════════════
// TRAFFIC SOURCES
// ═══════════════════════════════════════════════════════════

/** Traffic source breakdown */
export interface TrafficSource {
  readonly source_type: TrafficSourceType;
  readonly views: number;
  readonly percentage: number;
  readonly watch_time_hours: number;
  readonly impressions?: number;
}

/** YouTube traffic source types */
export type TrafficSourceType =
  | 'yt_search'
  | 'suggested'
  | 'browse_features'
  | 'channel_pages'
  | 'external'
  | 'direct'
  | 'playlists'
  | 'notifications'
  | 'shorts_feed'
  | 'other';

// ═══════════════════════════════════════════════════════════
// CONTENT PERFORMANCE ANALYSIS
// ═══════════════════════════════════════════════════════════

/** Performance breakdown by content taxonomy */
export interface ContentPerformanceByTaxonomy {
  readonly period: DateRange;
  readonly by_content_type: readonly TaxonomyMetric<ContentType>[];
  readonly by_track: readonly TaxonomyMetric<Track>[];
  readonly by_pillar: readonly TaxonomyMetric<Pillar>[];
}

/** Metrics aggregated by a taxonomy category */
export interface TaxonomyMetric<T extends string> {
  readonly category: T;
  readonly video_count: number;
  readonly total_views: number;
  readonly average_views: number;
  readonly total_watch_time_hours: number;
  readonly average_engagement_rate: number;
  readonly average_ctr: number;
  readonly trend: 'up' | 'flat' | 'down';
  readonly trend_percentage: number;
}

// ═══════════════════════════════════════════════════════════
// CHART DATA
// ═══════════════════════════════════════════════════════════

/** Time series data point for charts */
export interface TimeSeriesPoint {
  readonly date: string;
  readonly value: number;
  readonly label?: string;
}

/** Named time series for multi-line charts */
export interface TimeSeries {
  readonly name: string;
  readonly color?: string;
  readonly data: readonly TimeSeriesPoint[];
}

/** Dashboard KPI card data */
export interface KpiCard {
  readonly label: string;
  readonly value: number;
  readonly formatted_value: string;
  readonly delta: number;
  readonly delta_percent: number;
  readonly trend: 'up' | 'flat' | 'down';
  readonly period: string;
  readonly variant: 'gold' | 'purple' | 'blue' | 'emerald';
}

/** Analytics query parameters */
export interface AnalyticsQuery {
  readonly date_range: DateRange;
  readonly content_type?: ContentType;
  readonly track?: Track;
  readonly pillar?: Pillar;
  readonly video_ids?: readonly string[];
  readonly granularity: 'daily' | 'weekly' | 'monthly';
  readonly metrics: readonly AnalyticsMetricKey[];
}

/** Available metric keys for analytics queries */
export type AnalyticsMetricKey =
  | 'views'
  | 'watch_time'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'subscribers'
  | 'impressions'
  | 'ctr'
  | 'avg_view_duration'
  | 'avg_view_percentage'
  | 'revenue';
