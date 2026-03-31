// ============================================================================
// YouTube Data API v3 Service
// GEM Content Control Center
// ============================================================================

import { getSupabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelStats {
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  title: string;
  thumbnailUrl?: string;
}

export interface VideoStats {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  durationSeconds: number;
}

export interface VideoPerformance extends VideoStats {
  ctr: number;
  avgViewDuration: number;
  avgViewPercentage: number;
  impressions: number;
  subscribersGained: number;
  estimatedRevenue: number;
  track?: string;
  contentType?: string;
}

export interface RetentionPoint {
  timeRatio: number;
  watchRatio: number;
}

export interface TrafficSource {
  source: string;
  views: number;
  percentage: number;
}

export interface DemographicData {
  ageGroup: string;
  gender: string;
  viewPercentage: number;
}

export interface AnalyticsData {
  totalViews: number;
  totalWatchTimeMinutes: number;
  avgViewDuration: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedRevenue: number;
  rpm: number;
  ctr: number;
  impressions: number;
}

// ---------------------------------------------------------------------------
// YouTube Service
// ---------------------------------------------------------------------------

export const youtubeService = {
  /**
   * Check if YouTube is connected (OAuth token exists)
   */
  async isConnected(): Promise<boolean> {
    const { data } = await getSupabase()
      .from('profiles')
      .select('youtube_access_token')
      .single();
    return !!(data as Record<string, unknown> | null)?.youtube_access_token;
  },

  /**
   * Get channel statistics
   */
  async getChannelStats(accessToken: string): Promise<ChannelStats> {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) {
      throw new Error('Không tìm thấy kênh YouTube');
    }

    return {
      subscriberCount: parseInt(channel.statistics.subscriberCount ?? '0', 10),
      videoCount: parseInt(channel.statistics.videoCount ?? '0', 10),
      viewCount: parseInt(channel.statistics.viewCount ?? '0', 10),
      title: channel.snippet.title,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url,
    };
  },

  /**
   * Get video performance data
   */
  async getVideoPerformance(
    accessToken: string,
    videoIds: string[],
  ): Promise<VideoStats[]> {
    const ids = videoIds.join(',');
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${ids}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items ?? []).map((item: Record<string, any>) => ({
      id: item.id as string,
      title: (item.snippet?.title as string) ?? '',
      publishedAt: (item.snippet?.publishedAt as string) ?? '',
      thumbnailUrl: (item.snippet?.thumbnails?.medium?.url as string) ?? '',
      views: parseInt((item.statistics?.viewCount as string) ?? '0', 10),
      likes: parseInt((item.statistics?.likeCount as string) ?? '0', 10),
      comments: parseInt((item.statistics?.commentCount as string) ?? '0', 10),
      duration: (item.contentDetails?.duration as string) ?? '',
      durationSeconds: parseDuration((item.contentDetails?.duration as string) ?? ''),
    }));
  },

  /**
   * Get retention data for a specific video
   */
  async getRetentionData(
    accessToken: string,
    videoId: string,
  ): Promise<RetentionPoint[]> {
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2020-01-01&endDate=${new Date().toISOString().split('T')[0]}&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.rows ?? []).map((row: number[]) => ({
      timeRatio: row[0],
      watchRatio: row[1],
    }));
  },

  /**
   * Sync video data to Supabase
   */
  async syncToSupabase(videos: VideoStats[]): Promise<number> {
    const sb = getSupabase();
    if (!sb) return 0;
    let synced = 0;
    try {
      for (const video of videos) {
        const { error } = await sb
          .from('cc_yt_videos')
          .upsert(
            {
              youtube_video_id: video.id,
              title: video.title,
              views: video.views,
              likes: video.likes,
              comments_count: video.comments,
              published_at: video.publishedAt,
              duration_seconds: video.durationSeconds,
              thumbnail_url: video.thumbnailUrl,
              content_type: 'latc' as const,
              track: 'integration' as const,
              pillar: 'lifestyle' as const,
              metrics_updated_at: new Date().toISOString(),
            },
            { onConflict: 'youtube_video_id' },
          );
        if (!error) synced++;
      }
    } catch { /* CC Supabase cache — non-critical */ }
    return synced;
  },

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data } = await sb
        .from('cc_yt_videos')
        .select('metrics_updated_at')
        .order('metrics_updated_at', { ascending: false })
        .limit(1)
        .single();
      return data?.metrics_updated_at ?? null;
    } catch { return null; }
  },

  /**
   * Get all synced videos from Supabase
   */
  async getSyncedVideos(limit = 50): Promise<VideoStats[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data } = await sb
        .from('cc_yt_videos')
        .select('*')
        .order('views', { ascending: false })
        .limit(limit);

      return (data ?? []).map((v: any) => ({
        id: v.youtube_video_id,
        title: v.title,
        publishedAt: v.published_at ?? '',
        thumbnailUrl: v.thumbnail_url ?? '',
        views: v.views,
        likes: v.likes,
        comments: v.comments_count,
        duration: '',
        durationSeconds: v.duration_seconds ?? 0,
      }));
    } catch { return []; }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
