// YouTube Channel — API Routes
// Status, manual poll trigger, and monitored videos list

import { Router, type Request, type Response } from 'express';
import {
  getPollerStatus,
  pollYouTubeComments,
  startYouTubeCommentPoller,
  stopYouTubeCommentPoller,
} from './comments.js';

const router = Router();

/**
 * GET /api/channels/youtube/status — poller status and health
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json(getPollerStatus());
});

/**
 * POST /api/channels/youtube/poll — trigger a manual poll immediately
 */
router.post('/poll', async (_req: Request, res: Response) => {
  try {
    const result = await pollYouTubeComments();
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/channels/youtube/start — start the poller
 * Body: { intervalMs?: number }
 */
router.post('/start', (req: Request, res: Response) => {
  const intervalMs = req.body?.intervalMs || 60_000;
  startYouTubeCommentPoller(intervalMs);
  res.json({ success: true, message: `Poller started with ${intervalMs / 1000}s interval` });
});

/**
 * POST /api/channels/youtube/stop — stop the poller
 */
router.post('/stop', (_req: Request, res: Response) => {
  stopYouTubeCommentPoller();
  res.json({ success: true, message: 'Poller stopped' });
});

/**
 * GET /api/channels/youtube/videos — list monitored videos with comment counts
 * Fetches the 10 most recent videos from the configured channel.
 */
router.get('/videos', async (_req: Request, res: Response) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    res.status(400).json({ error: 'YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not configured' });
    return;
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&order=date&type=video&maxResults=10&part=snippet&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const body = await searchRes.text();
      res.status(searchRes.status).json({ error: `YouTube API error: ${body.slice(0, 200)}` });
      return;
    }

    const searchData = await searchRes.json();
    const videoIds: string[] = (searchData.items || [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      res.json({ videos: [] });
      return;
    }

    // Fetch video statistics (view count, comment count)
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet,statistics&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);

    if (!statsRes.ok) {
      // Fallback: return videos without stats
      const videos = (searchData.items || []).map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        publishedAt: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.medium?.url,
      }));
      res.json({ videos });
      return;
    }

    const statsData = await statsRes.json();
    const videos = (statsData.items || []).map((item: any) => ({
      videoId: item.id,
      title: item.snippet?.title,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      viewCount: parseInt(item.statistics?.viewCount || '0', 10),
      commentCount: parseInt(item.statistics?.commentCount || '0', 10),
      likeCount: parseInt(item.statistics?.likeCount || '0', 10),
    }));

    res.json({ videos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── YouTube OAuth Flow ────────────────────────────────────────────
const YT_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '759835159842-6hfaegpdb2sj1lsj734dfcbvarac0leh.apps.googleusercontent.com';
const YT_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
const YT_SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl';

/**
 * GET /api/channels/youtube/oauth/url — get OAuth consent URL
 * User clicks this link to authorize YouTube comment replies
 */
router.get('/oauth/url', (req: Request, res: Response) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/youtube/oauth/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(YT_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(YT_SCOPES)}&` +
    `access_type=offline&` +
    `prompt=consent`;
  res.json({ url, redirect_uri: redirectUri });
});

/**
 * GET /api/channels/youtube/oauth/callback — handle Google OAuth redirect
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing code parameter');
    return;
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/channels/youtube/oauth/callback`;

  if (!YT_CLIENT_SECRET) {
    res.status(500).send(`
      <h2>YouTube Client Secret chưa cấu hình</h2>
      <p>Thêm YOUTUBE_CLIENT_SECRET vào .env rồi restart server.</p>
      <p>Auth code: <code>${code}</code></p>
    `);
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      res.status(400).send(`<h2>OAuth Error</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
      return;
    }

    // Save access token to env (runtime)
    process.env.YOUTUBE_ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) {
      process.env.YOUTUBE_REFRESH_TOKEN = tokens.refresh_token;
    }

    console.log(`[YouTube] OAuth success! Access token: ${tokens.access_token?.substring(0, 20)}...`);
    console.log(`[YouTube] Refresh token: ${tokens.refresh_token ? 'YES' : 'NO'}`);
    console.log(`[YouTube] Expires in: ${tokens.expires_in}s`);

    // Append to .env file for persistence
    const { appendFileSync } = await import('node:fs');
    const envPath = require('path').resolve(process.cwd(), '../.env');
    try {
      const envContent = require('fs').readFileSync(envPath, 'utf-8');
      if (!envContent.includes('YOUTUBE_ACCESS_TOKEN=')) {
        appendFileSync(envPath, `\nYOUTUBE_ACCESS_TOKEN=${tokens.access_token}\n`);
      }
      if (tokens.refresh_token && !envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
        appendFileSync(envPath, `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      }
    } catch { /* .env write is best-effort */ }

    res.send(`
      <h2>✅ YouTube OAuth Thành Công!</h2>
      <p>Access token đã lưu. YouTube comment reply đã sẵn sàng.</p>
      <p>Expires in: ${tokens.expires_in}s</p>
      <p>Refresh token: ${tokens.refresh_token ? '✅ Có' : '❌ Không (cần re-auth với prompt=consent)'}</p>
      <p><a href="/GEM/analytics">← Quay lại Dashboard</a></p>
    `);
  } catch (err: any) {
    res.status(500).send(`<h2>Error</h2><pre>${err.message}</pre>`);
  }
});

export default router;
