// YouTube Comments — Poll-based comment auto-reply
// YouTube Data API v3 has no webhooks for comments, so we poll periodically.
// Inbound comments are published to the bus for the consumer pipeline (agent auto-reply).
// Outbound replies are dispatched via bus.on('outbound') listener.

import { bus } from '../bus.js';
import { supabase } from '../zalo-personal/supabase.js';
import type { InboundMessage, OutboundMessage } from '../types.js';

// ─── Config from env ───

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const YOUTUBE_ACCESS_TOKEN = process.env.YOUTUBE_ACCESS_TOKEN || '';
const CHANNEL_NAME = 'youtube-gemral';
const YT_API = 'https://www.googleapis.com/youtube/v3';

// ─── State ───

/** Set of comment IDs we've already seen (prevents duplicates across polls) */
const seenCommentIds = new Set<string>();
/** Max size before we prune oldest entries */
const MAX_SEEN_SIZE = 10_000;

let pollerInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let lastPollAt: Date | null = null;
let pollCount = 0;
let errorCount = 0;
let lastError: string | null = null;

// ─── Polling ───

/**
 * Poll YouTube for recent comments on the channel's videos.
 * Fetches the 10 most recent videos, then the 20 most recent comment threads per video.
 * New (unseen) comments are published to the bus as InboundMessage.
 */
export async function pollYouTubeComments(): Promise<{
  videosChecked: number;
  newComments: number;
  errors: string[];
}> {
  if (!YOUTUBE_API_KEY) {
    return { videosChecked: 0, newComments: 0, errors: ['YOUTUBE_API_KEY not configured'] };
  }
  if (!YOUTUBE_CHANNEL_ID) {
    return { videosChecked: 0, newComments: 0, errors: ['YOUTUBE_CHANNEL_ID not configured'] };
  }

  const errors: string[] = [];
  let newComments = 0;

  // Step 1: Fetch recent videos
  const videos = await fetchRecentVideos();
  if (!videos) {
    return { videosChecked: 0, newComments: 0, errors: ['Failed to fetch videos'] };
  }

  // Step 2: For each video, fetch recent comments
  for (const video of videos) {
    try {
      const comments = await fetchCommentThreads(video.videoId);
      if (!comments) continue;

      for (const thread of comments) {
        const snippet = thread.snippet?.topLevelComment?.snippet;
        if (!snippet) continue;

        const commentId: string = thread.snippet?.topLevelComment?.id || thread.id;

        // Skip already-seen comments
        if (seenCommentIds.has(commentId)) continue;
        seenCommentIds.add(commentId);

        // Skip comments from the channel owner (our own replies)
        if (snippet.authorChannelId?.value === YOUTUBE_CHANNEL_ID) continue;

        // Build InboundMessage
        const inbound: InboundMessage = {
          id: commentId,
          channel: CHANNEL_NAME,
          channelType: 'youtube',
          chatId: video.videoId,    // Group by video
          senderId: snippet.authorChannelId?.value || snippet.authorDisplayName || 'unknown',
          senderName: snippet.authorDisplayName || 'YouTube User',
          content: snippet.textDisplay || snippet.textOriginal || '',
          contentType: 'text',
          peerKind: 'comment',
          metadata: {
            platform: 'youtube',
            comment_id: commentId,
            video_id: video.videoId,
            video_title: video.title,
            published_at: snippet.publishedAt,
            like_count: snippet.likeCount,
          },
          timestamp: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
          dedupeKey: `yt:${commentId}`,
        };

        await bus.publishInbound(inbound);
        newComments++;
      }
    } catch (err: any) {
      const msg = `Error fetching comments for video ${video.videoId}: ${err.message}`;
      console.error(`[YT] ${msg}`);
      errors.push(msg);
    }
  }

  // Prune seen set if it grows too large
  if (seenCommentIds.size > MAX_SEEN_SIZE) {
    const toRemove = seenCommentIds.size - MAX_SEEN_SIZE;
    const iter = seenCommentIds.values();
    for (let i = 0; i < toRemove; i++) {
      const val = iter.next().value;
      if (val !== undefined) seenCommentIds.delete(val);
    }
  }

  lastPollAt = new Date();
  pollCount++;

  if (newComments > 0) {
    console.log(`[YT] Poll #${pollCount}: ${newComments} new comments from ${videos.length} videos`);
  }

  return { videosChecked: videos.length, newComments, errors };
}

// ─── YouTube Data API helpers ───

interface VideoInfo {
  videoId: string;
  title: string;
}

async function fetchRecentVideos(): Promise<VideoInfo[] | null> {
  try {
    const url = `${YT_API}/search?channelId=${YOUTUBE_CHANNEL_ID}&order=date&type=video&maxResults=10&part=snippet&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[YT] Failed to fetch videos: ${res.status} ${body.slice(0, 200)}`);
      errorCount++;
      lastError = `Fetch videos: ${res.status}`;
      return null;
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId as string,
      title: (item.snippet?.title || '') as string,
    })).filter((v: VideoInfo) => v.videoId);
  } catch (err: any) {
    console.error(`[YT] Error fetching videos:`, err.message);
    errorCount++;
    lastError = err.message;
    return null;
  }
}

async function fetchCommentThreads(videoId: string): Promise<any[] | null> {
  try {
    const url = `${YT_API}/commentThreads?videoId=${videoId}&part=snippet&order=time&maxResults=20&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      // Comments might be disabled on this video — not an error
      if (res.status === 403) {
        return null;
      }
      const body = await res.text();
      console.error(`[YT] Failed to fetch comments for ${videoId}: ${res.status} ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.error(`[YT] Error fetching comments for ${videoId}:`, err.message);
    return null;
  }
}

// ─── Reply function ───

/**
 * Reply to a YouTube comment.
 * Requires OAuth access token (not just API key).
 */
export async function replyToYouTubeComment(parentId: string, text: string): Promise<{ success: boolean; commentId?: string; error?: string }> {
  if (!YOUTUBE_ACCESS_TOKEN) {
    return { success: false, error: 'YOUTUBE_ACCESS_TOKEN not configured' };
  }

  try {
    const res = await fetch(`${YT_API}/comments?part=snippet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUTUBE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        snippet: {
          parentId,
          textOriginal: text,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[YT] Reply failed: ${res.status} ${body.slice(0, 300)}`);
      return { success: false, error: `YouTube API ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    console.log(`[YT] Reply sent to comment ${parentId}: "${text.slice(0, 60)}"`);

    // Log to channel_sent_messages for audit trail (non-blocking)
    void supabase.from('channel_sent_messages').insert({
      channel_name: CHANNEL_NAME,
      thread_id: parentId,
      thread_type: 'comment',
      to_uid: parentId,
      body: text,
      content_type: 'text',
      status: 'sent',
      sent_by: 'agent',
    }).then(() => {}, () => {});

    return { success: true, commentId: data.id };
  } catch (err: any) {
    console.error(`[YT] Reply error:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Outbound bus listener ───

bus.on('outbound', async (msg: OutboundMessage) => {
  // Only handle youtube-gemral channel
  if (msg.channel !== CHANNEL_NAME) return;

  const commentId = msg.metadata?.comment_id as string | undefined;
  if (!commentId) {
    console.warn(`[YT] Outbound message missing comment_id in metadata, cannot reply`);
    return;
  }

  const result = await replyToYouTubeComment(commentId, msg.content);
  if (!result.success) {
    console.error(`[YT] Outbound reply failed: ${result.error}`);
  }
});

// ─── Poller lifecycle ───

/**
 * Start the YouTube comment poller.
 * @param intervalMs - Polling interval in milliseconds (default: 60 seconds)
 */
export function startYouTubeCommentPoller(intervalMs: number = 600_000): void {
  if (pollerInterval) {
    console.warn('[YT] Poller already running');
    return;
  }

  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    console.warn('[YT] Poller not started — YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not set');
    return;
  }

  console.log(`[YT] Starting comment poller (interval: ${intervalMs / 1000}s)`);
  isPolling = true;

  // Initial poll immediately
  pollYouTubeComments().catch(err => {
    console.error('[YT] Initial poll error:', err.message);
    errorCount++;
    lastError = err.message;
  });

  // Then poll on interval
  pollerInterval = setInterval(() => {
    pollYouTubeComments().catch(err => {
      console.error('[YT] Poll error:', err.message);
      errorCount++;
      lastError = err.message;
    });
  }, intervalMs);
}

/**
 * Stop the YouTube comment poller.
 */
export function stopYouTubeCommentPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
  isPolling = false;
  console.log('[YT] Poller stopped');
}

/**
 * Get current poller status.
 */
export function getPollerStatus(): {
  running: boolean;
  channelName: string;
  channelId: string;
  lastPollAt: string | null;
  pollCount: number;
  errorCount: number;
  lastError: string | null;
  seenCommentCount: number;
  hasApiKey: boolean;
  hasAccessToken: boolean;
} {
  return {
    running: isPolling,
    channelName: CHANNEL_NAME,
    channelId: YOUTUBE_CHANNEL_ID,
    lastPollAt: lastPollAt?.toISOString() || null,
    pollCount,
    errorCount,
    lastError,
    seenCommentCount: seenCommentIds.size,
    hasApiKey: !!YOUTUBE_API_KEY,
    hasAccessToken: !!YOUTUBE_ACCESS_TOKEN,
  };
}
