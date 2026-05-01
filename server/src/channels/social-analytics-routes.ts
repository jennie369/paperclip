// ============================================================================
// Social Analytics Routes — Facebook + YouTube read-only analytics
// GET /api/social-analytics/facebook/overview
// GET /api/social-analytics/facebook/posts
// GET /api/social-analytics/youtube/overview
// GET /api/social-analytics/youtube/videos
// ============================================================================

import { Router, type Request, type Response } from 'express';

const router = Router();

const FB_GRAPH_BASE = 'https://graph.facebook.com/v25.0';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ─── Facebook Page Tokens ───────────────────────────────────────────

interface FBPageConfig {
  id: string;
  name: string;
  token: string;
}

function getFBPages(): FBPageConfig[] {
  const pages: FBPageConfig[] = [];
  if (process.env.FB_PAGE_ID_JENNIE && process.env.FB_PAGE_TOKEN_JENNIE) {
    pages.push({ id: process.env.FB_PAGE_ID_JENNIE, name: 'Page Jennie', token: process.env.FB_PAGE_TOKEN_JENNIE });
  }
  if (process.env.FB_PAGE_ID_GEMRAL && process.env.FB_PAGE_TOKEN_GEMRAL) {
    pages.push({ id: process.env.FB_PAGE_ID_GEMRAL, name: 'Page Gemral', token: process.env.FB_PAGE_TOKEN_GEMRAL });
  }
  if (process.env.FB_PAGE_ID_YINYANG && process.env.FB_PAGE_TOKEN_YINYANG) {
    pages.push({ id: process.env.FB_PAGE_ID_YINYANG, name: 'Page Yinyang', token: process.env.FB_PAGE_TOKEN_YINYANG });
  }
  return pages;
}

function getFBPageConfig(pageId: string): FBPageConfig | null {
  return getFBPages().find(p => p.id === pageId) ?? null;
}

function periodToDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

// ─── GET /facebook/pages ─────────────────────────────────────────
router.get('/facebook/pages', (_req: Request, res: Response) => {
  const pages = getFBPages().map(p => ({ id: p.id, name: p.name }));
  res.json({ success: true, pages });
});

// ─── GET /facebook/overview ──────────────────────────────────────
router.get('/facebook/overview', async (req: Request, res: Response) => {
  try {
    const pageId = (req.query.page_id as string) || getFBPages()[0]?.id;
    const period = (req.query.period as string) || '7d';
    if (!pageId) return res.status(400).json({ error: 'Chưa cấu hình Facebook Page' });

    const config = getFBPageConfig(pageId);
    if (!config) return res.status(400).json({ error: `Không tìm thấy cấu hình cho page ${pageId}` });

    const days = periodToDays(period);
    const since = daysAgoISO(days);
    const until = new Date().toISOString().split('T')[0]!;

    // Fetch page info (followers, fan count)
    const pageUrl = `${FB_GRAPH_BASE}/${pageId}?fields=followers_count,fan_count,name&access_token=${config.token}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json() as any;
    if (pageData.error) {
      return res.status(400).json({ error: `Facebook API: ${pageData.error.message}` });
    }

    // Fetch recent posts with engagement metrics (more reliable than page insights)
    const postsUrl = `${FB_GRAPH_BASE}/${pageId}/posts`
      + `?fields=created_time,reactions.summary(true),comments.summary(true),shares`
      + `&since=${since}&until=${until}&limit=100`
      + `&access_token=${config.token}`;
    const postsRes = await fetch(postsUrl);
    const postsData = await postsRes.json() as any;

    // Aggregate engagement from posts
    let totalReactions = 0, totalComments = 0, totalShares = 0, postCount = 0;
    for (const post of postsData.data ?? []) {
      totalReactions += post.reactions?.summary?.total_count ?? 0;
      totalComments += post.comments?.summary?.total_count ?? 0;
      totalShares += post.shares?.count ?? 0;
      postCount++;
    }

    const totalEngagement = totalReactions + totalComments + totalShares;
    const followers = pageData.followers_count ?? pageData.fan_count ?? 0;
    const engagementRate = followers > 0 && postCount > 0
      ? ((totalEngagement / postCount) / followers * 100).toFixed(2)
      : '0';

    res.json({
      success: true,
      page_id: pageId,
      page_name: pageData.name || config.name,
      period,
      followers,
      impressions: totalReactions + totalComments,
      reach: totalEngagement,
      engagement: parseFloat(engagementRate),
      page_views: postCount,
      fan_adds: 0,
      details: { totalReactions, totalComments, totalShares, postCount },
    });
  } catch (err: any) {
    console.error('[social-analytics/facebook/overview]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /facebook/posts ─────────────────────────────────────────
router.get('/facebook/posts', async (req: Request, res: Response) => {
  try {
    const pageId = (req.query.page_id as string) || getFBPages()[0]?.id;
    const limit = parseInt((req.query.limit as string) || '20', 10);
    if (!pageId) return res.status(400).json({ error: 'Chưa cấu hình Facebook Page' });

    const config = getFBPageConfig(pageId);
    if (!config) return res.status(400).json({ error: `Không tìm thấy cấu hình cho page ${pageId}` });

    const postsUrl = `${FB_GRAPH_BASE}/${pageId}/posts`
      + `?fields=message,created_time,full_picture,`
      + `comments.summary(true),reactions.summary(true),shares`
      + `&limit=${limit}`
      + `&access_token=${config.token}`;

    const postsRes = await fetch(postsUrl);
    const postsData = await postsRes.json() as any;

    if (postsData.error) {
      return res.status(400).json({ error: `Facebook API: ${postsData.error.message}` });
    }

    const posts = (postsData.data ?? []).map((post: any) => {
      const likes = post.reactions?.summary?.total_count ?? 0;
      const comments = post.comments?.summary?.total_count ?? 0;
      const shares = post.shares?.count ?? 0;
      return {
        id: post.id,
        message: post.message ?? '',
        created_time: post.created_time,
        image: post.full_picture ?? null,
        likes,
        comments,
        shares,
        reach: likes + comments + shares,
        impressions: likes + comments,
      };
    });

    res.json({ success: true, posts });
  } catch (err: any) {
    console.error('[social-analytics/facebook/posts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /youtube/overview ───────────────────────────────────────
router.get('/youtube/overview', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const period = (req.query.period as string) || '7d';

    if (!apiKey || !channelId) {
      return res.status(400).json({ error: 'Chưa cấu hình YouTube API (YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID)' });
    }

    // Fetch channel statistics
    const channelUrl = `${YT_API_BASE}/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json() as any;

    if (channelData.error) {
      return res.status(400).json({ error: `YouTube API: ${channelData.error.message}` });
    }

    const channel = channelData.items?.[0];
    if (!channel) {
      return res.status(404).json({ error: 'Không tìm thấy kênh YouTube' });
    }

    const stats = channel.statistics ?? {};

    // Fetch recent videos to compute period stats
    const days = periodToDays(period);
    const publishedAfter = new Date(Date.now() - days * 86400000).toISOString();

    const searchUrl = `${YT_API_BASE}/search?part=id&channelId=${channelId}`
      + `&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=50&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as any;

    let periodViews = 0;
    let periodLikes = 0;
    let periodComments = 0;
    let totalDurationSeconds = 0;
    let videoCount = 0;

    const videoIds = (searchData.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length > 0) {
      const videosUrl = `${YT_API_BASE}/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json() as any;

      for (const video of videosData.items ?? []) {
        const vs = video.statistics ?? {};
        periodViews += parseInt(vs.viewCount ?? '0', 10);
        periodLikes += parseInt(vs.likeCount ?? '0', 10);
        periodComments += parseInt(vs.commentCount ?? '0', 10);
        totalDurationSeconds += parseDuration(video.contentDetails?.duration ?? '');
        videoCount++;
      }
    }

    const avgDuration = videoCount > 0 ? Math.round(totalDurationSeconds / videoCount) : 0;

    res.json({
      success: true,
      channel_id: channelId,
      channel_name: channel.snippet?.title ?? '',
      period,
      subscribers: parseInt(stats.subscriberCount ?? '0', 10),
      total_views: parseInt(stats.viewCount ?? '0', 10),
      total_videos: parseInt(stats.videoCount ?? '0', 10),
      period_views: periodViews,
      period_likes: periodLikes,
      period_comments: periodComments,
      period_video_count: videoCount,
      avg_duration_seconds: avgDuration,
      estimated_watch_minutes: Math.round(periodViews * avgDuration / 60),
    });
  } catch (err: any) {
    console.error('[social-analytics/youtube/overview]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /youtube/videos ─────────────────────────────────────────
router.get('/youtube/videos', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const limit = parseInt((req.query.limit as string) || '20', 10);

    if (!apiKey || !channelId) {
      return res.status(400).json({ error: 'Chưa cấu hình YouTube API (YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID)' });
    }

    // Search for recent videos
    const searchUrl = `${YT_API_BASE}/search?part=id&channelId=${channelId}`
      + `&type=video&order=date&maxResults=${limit}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as any;

    if (searchData.error) {
      return res.status(400).json({ error: `YouTube API: ${searchData.error.message}` });
    }

    const videoIds = (searchData.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return res.json({ success: true, videos: [] });
    }

    const videosUrl = `${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json() as any;

    if (videosData.error) {
      return res.status(400).json({ error: `YouTube API: ${videosData.error.message}` });
    }

    const videos = (videosData.items ?? []).map((video: any) => {
      const snippet = video.snippet ?? {};
      const stats = video.statistics ?? {};
      const durationSec = parseDuration(video.contentDetails?.duration ?? '');

      return {
        id: video.id,
        title: snippet.title ?? '',
        published_at: snippet.publishedAt ?? '',
        thumbnail: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? '',
        views: parseInt(stats.viewCount ?? '0', 10),
        likes: parseInt(stats.likeCount ?? '0', 10),
        comments: parseInt(stats.commentCount ?? '0', 10),
        duration_seconds: durationSec,
        duration_formatted: formatDuration(durationSec),
      };
    });

    res.json({ success: true, videos });
  } catch (err: any) {
    console.error('[social-analytics/youtube/videos]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────

/** Parse ISO 8601 duration (PT1H2M3S) to seconds */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  return h * 3600 + m * 60 + s;
}

/** Format seconds to mm:ss or hh:mm:ss */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default router;
