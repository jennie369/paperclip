import { api } from "./client";

// ─── Types ──────────────────────────────────────────────────────

export interface FBPage {
  id: string;
  name: string;
}

export interface FBOverview {
  success: boolean;
  page_id: string;
  page_name: string;
  period: string;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  page_views: number;
  fan_adds: number;
}

export interface FBPost {
  id: string;
  message: string;
  created_time: string;
  image: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
}

export interface YTOverview {
  success: boolean;
  channel_id: string;
  channel_name: string;
  period: string;
  subscribers: number;
  total_views: number;
  total_videos: number;
  period_views: number;
  period_likes: number;
  period_comments: number;
  period_video_count: number;
  avg_duration_seconds: number;
  estimated_watch_minutes: number;
}

export interface YTVideo {
  id: string;
  title: string;
  published_at: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  duration_seconds: number;
  duration_formatted: string;
}

// ─── API Functions ──────────────────────────────────────────────

export const socialAnalyticsApi = {
  // Facebook
  facebookPages: () =>
    api.get<{ success: boolean; pages: FBPage[] }>("/social-analytics/facebook/pages"),

  facebookOverview: (pageId: string, period: string) =>
    api.get<FBOverview>(
      `/social-analytics/facebook/overview?page_id=${pageId}&period=${period}`,
    ),

  facebookPosts: (pageId: string, limit = 20) =>
    api.get<{ success: boolean; posts: FBPost[] }>(
      `/social-analytics/facebook/posts?page_id=${pageId}&limit=${limit}`,
    ),

  // YouTube
  youtubeOverview: (period: string) =>
    api.get<YTOverview>(`/social-analytics/youtube/overview?period=${period}`),

  youtubeVideos: (limit = 20) =>
    api.get<{ success: boolean; videos: YTVideo[] }>(
      `/social-analytics/youtube/videos?limit=${limit}`,
    ),
};
