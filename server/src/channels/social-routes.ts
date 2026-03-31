// ============================================================================
// Social Publish Routes — ported từ CC Next.js API routes
// POST /api/social/publish  → Đăng lên Facebook / Instagram / Threads
// POST /api/news/publish    → Đăng bài tin tức vào cc_news_articles + cross-post forum
// GET  /api/social/pages    → Danh sách Facebook Pages đã cấu hình
// ============================================================================

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase client (service role) — lazy init to avoid crash when env vars not set at module load
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgfkbcnzqozzkohwbgbk.supabase.co';
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMRAL_SUPABASE_SERVICE_KEY || '';
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    _supabase = createClient(SUPABASE_URL, key);
  }
  return _supabase;
}

const GEMRAL_ADMIN_USER_ID = '64f7f068-506e-463e-a5e4-c5a35ec176b6';
const GEMRAL_NEWS_CATEGORY_ID = 'cac0b844-da54-40fe-b822-6763487a5263';

// ─── Facebook Page Token Cache ───────────────────────────────────
const pageTokenCache = new Map<string, { token: string; expires: number }>();

// Map page IDs → tokens (using existing FB_PAGE_TOKEN_* env vars)
const PAGE_TOKEN_MAP: Record<string, string | undefined> = {
  [process.env.FB_PAGE_ID_JENNIE ?? '']:  process.env.FB_PAGE_TOKEN_JENNIE,
  [process.env.FB_PAGE_ID_GEMRAL ?? '']:  process.env.FB_PAGE_TOKEN_GEMRAL,
  [process.env.FB_PAGE_ID_YINYANG ?? '']: process.env.FB_PAGE_TOKEN_YINYANG,
};

async function getPageToken(pageId: string): Promise<string> {
  const cached = pageTokenCache.get(pageId);
  if (cached && cached.expires > Date.now()) return cached.token;

  // Check existing FB_PAGE_TOKEN_* env vars first
  const directToken = PAGE_TOKEN_MAP[pageId];
  if (directToken) {
    pageTokenCache.set(pageId, { token: directToken, expires: Date.now() + 3600000 });
    return directToken;
  }

  const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
  if (userToken) {
    // Try /me/accounts
    try {
      const res = await fetch(`https://graph.facebook.com/v24.0/me/accounts?access_token=${userToken}`);
      const data = await res.json();
      if (!data.error && data.data) {
        const page = data.data.find((p: any) => p.id === pageId);
        if (page) {
          pageTokenCache.set(pageId, { token: page.access_token, expires: Date.now() + 3600000 });
          return page.access_token;
        }
      }
    } catch {}

    // Fallback: /{pageId}?fields=access_token
    try {
      const res = await fetch(`https://graph.facebook.com/v24.0/${pageId}?fields=access_token&access_token=${userToken}`);
      const data = await res.json();
      if (!data.error && data.access_token) {
        pageTokenCache.set(pageId, { token: data.access_token, expires: Date.now() + 3600000 });
        return data.access_token;
      }
    } catch {}

    pageTokenCache.set(pageId, { token: userToken, expires: Date.now() + 300000 });
    return userToken;
  }

  throw new Error(`Không tìm thấy access token cho page ${pageId}. Kiểm tra FB_PAGE_TOKEN_* trong .env`);
}

function getFacebookPages(): { id: string; name: string }[] {
  // Build from existing FB_PAGE_ID/TOKEN vars
  const pages: { id: string; name: string }[] = [];
  if (process.env.FB_PAGE_ID_JENNIE) pages.push({ id: process.env.FB_PAGE_ID_JENNIE, name: 'Page Jennie' });
  if (process.env.FB_PAGE_ID_GEMRAL) pages.push({ id: process.env.FB_PAGE_ID_GEMRAL, name: 'Page Gemral' });
  if (process.env.FB_PAGE_ID_YINYANG) pages.push({ id: process.env.FB_PAGE_ID_YINYANG, name: 'Page Yinyang' });
  // Also support FACEBOOK_PAGES format: "id1|name1,id2|name2"
  const raw = process.env.FACEBOOK_PAGES ?? '';
  if (raw) {
    raw.split(',').filter(Boolean).forEach(entry => {
      const [id, ...nameParts] = entry.trim().split('|');
      if (id) pages.push({ id, name: nameParts.join('|') || id });
    });
  }
  return pages;
}

// ─── Facebook Publish ────────────────────────────────────────────
async function publishToFacebook(
  content: string, imageUrls?: string[], targetPageId?: string, scheduledTime?: number,
): Promise<{ id: string; url: string; scheduled?: boolean }> {
  const pages = getFacebookPages();
  const pageId = targetPageId ?? pages[0]?.id;
  if (!pageId) throw new Error('Thiếu FACEBOOK_PAGES trong .env');

  const token = await getPageToken(pageId);
  const graphUrl = `https://graph.facebook.com/v24.0/${pageId}`;

  if (scheduledTime) {
    const minTime = Math.floor(Date.now() / 1000) + 600;
    if (scheduledTime < minTime) throw new Error('Thời gian đặt lịch phải ít nhất 10 phút trong tương lai.');
  }

  if (imageUrls && imageUrls.length > 0) {
    if (imageUrls.length === 1) {
      const postBody: Record<string, unknown> = { url: imageUrls[0], message: content, access_token: token };
      if (scheduledTime) { postBody.published = false; postBody.scheduled_publish_time = scheduledTime; }
      const res = await fetch(`${graphUrl}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postBody) });
      const data = await res.json();
      if (data.error) throw new Error(`Facebook API: ${data.error.message}`);
      return { id: data.id, url: `https://facebook.com/${data.id}`, scheduled: !!scheduledTime };
    }

    // Multi-photo
    const photoIds: string[] = [];
    for (const url of imageUrls) {
      const res = await fetch(`${graphUrl}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, published: false, access_token: token }) });
      const data = await res.json();
      if (data.error) throw new Error(`Facebook Photo Upload: ${data.error.message}`);
      photoIds.push(data.id);
    }
    const attachedMedia = photoIds.reduce((acc, id, i) => { acc[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); return acc; }, {} as Record<string, string>);
    const feedParams: Record<string, string> = { message: content, access_token: token, ...attachedMedia };
    if (scheduledTime) { feedParams.published = 'false'; feedParams.scheduled_publish_time = String(scheduledTime); }
    const res = await fetch(`${graphUrl}/feed`, { method: 'POST', body: new URLSearchParams(feedParams) });
    const data = await res.json();
    if (data.error) throw new Error(`Facebook Feed: ${data.error.message}`);
    return { id: data.id, url: `https://facebook.com/${data.id}`, scheduled: !!scheduledTime };
  }

  // Text-only
  const feedBody: Record<string, unknown> = { message: content, access_token: token };
  if (scheduledTime) { feedBody.published = false; feedBody.scheduled_publish_time = scheduledTime; }
  const res = await fetch(`${graphUrl}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedBody) });
  const data = await res.json();
  if (data.error) throw new Error(`Facebook API: ${data.error.message}`);
  return { id: data.id, url: `https://facebook.com/${data.id}`, scheduled: !!scheduledTime };
}

// ─── Instagram Publish ───────────────────────────────────────────
async function publishToInstagram(content: string, imageUrls?: string[]): Promise<{ id: string; url: string }> {
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!igAccountId || !token) throw new Error('Thiếu INSTAGRAM_BUSINESS_ACCOUNT_ID hoặc FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!imageUrls || imageUrls.length === 0) throw new Error('Instagram yêu cầu ít nhất 1 hình ảnh.');

  const graphUrl = `https://graph.facebook.com/v21.0/${igAccountId}`;

  if (imageUrls.length === 1) {
    const containerRes = await fetch(`${graphUrl}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: imageUrls[0], caption: content, access_token: token }) });
    const container = await containerRes.json();
    if (container.error) throw new Error(`Instagram Container: ${container.error.message}`);
    const publishRes = await fetch(`${graphUrl}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: container.id, access_token: token }) });
    const result = await publishRes.json();
    if (result.error) throw new Error(`Instagram Publish: ${result.error.message}`);
    return { id: result.id, url: `https://instagram.com/p/${result.id}` };
  }

  // Carousel
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const res = await fetch(`${graphUrl}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token }) });
    const data = await res.json();
    if (data.error) throw new Error(`Instagram Carousel Item: ${data.error.message}`);
    childIds.push(data.id);
  }
  const carouselRes = await fetch(`${graphUrl}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ media_type: 'CAROUSEL', children: childIds, caption: content, access_token: token }) });
  const carousel = await carouselRes.json();
  if (carousel.error) throw new Error(`Instagram Carousel: ${carousel.error.message}`);
  const publishRes = await fetch(`${graphUrl}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: carousel.id, access_token: token }) });
  const result = await publishRes.json();
  if (result.error) throw new Error(`Instagram Publish: ${result.error.message}`);
  return { id: result.id, url: `https://instagram.com/p/${result.id}` };
}

// ─── Threads Publish ─────────────────────────────────────────────
async function publishToThreads(content: string, imageUrls?: string[]): Promise<{ id: string; url: string }> {
  const userId = process.env.THREADS_USER_ID;
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !token) throw new Error('Thiếu THREADS_USER_ID hoặc THREADS_ACCESS_TOKEN trong .env');

  const graphUrl = `https://graph.threads.net/v1.0/${userId}`;
  const containerBody: Record<string, string> = {
    text: content,
    media_type: imageUrls && imageUrls.length > 0 ? 'IMAGE' : 'TEXT',
    access_token: token,
  };
  if (imageUrls && imageUrls.length > 0) containerBody.image_url = imageUrls[0] ?? '';

  const containerRes = await fetch(`${graphUrl}/threads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(containerBody) });
  const container = await containerRes.json();
  if (container.error) throw new Error(`Threads Container: ${container.error.message}`);

  const publishRes = await fetch(`${graphUrl}/threads_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: container.id, access_token: token }) });
  const result = await publishRes.json();
  if (result.error) throw new Error(`Threads Publish: ${result.error.message}`);
  return { id: result.id, url: `https://threads.net/@jennieuyenchu/post/${result.id}` };
}

// ─── POST /social/publish ────────────────────────────────────────
router.post('/social/publish', async (req, res) => {
  try {
    const { platform, content, imageUrls, facebookPageId, scheduledTime, scriptId } = req.body;
    if (!platform || !content) return res.status(400).json({ error: 'Thiếu platform hoặc content', success: false });

    let result: { id: string; url: string; scheduled?: boolean };
    switch (platform) {
      case 'facebook':
        result = await publishToFacebook(content, imageUrls, facebookPageId, scheduledTime);
        break;
      case 'instagram':
        if (scheduledTime) return res.status(400).json({ error: 'Instagram chưa hỗ trợ đặt lịch qua API', success: false });
        result = await publishToInstagram(content, imageUrls);
        break;
      case 'threads':
        if (scheduledTime) return res.status(400).json({ error: 'Threads chưa hỗ trợ đặt lịch qua API', success: false });
        result = await publishToThreads(content, imageUrls);
        break;
      default:
        return res.status(400).json({ error: `Platform "${platform}" chưa được hỗ trợ`, success: false });
    }

    // Lưu vào cc_social_posts
    await getSupabase().from('cc_social_posts').insert({
      script_id: scriptId || null,
      platform,
      content,
      media_urls: imageUrls || [],
      status: result.scheduled ? 'scheduled' : 'published',
      published_at: result.scheduled ? null : new Date().toISOString(),
      external_post_id: result.id,
      external_post_url: result.url,
    });

    res.json({
      success: true,
      platform,
      postId: result.id,
      postUrl: result.url,
      scheduled: result.scheduled ?? false,
      message: result.scheduled ? `Đã đặt lịch đăng lên ${platform}!` : `Đã đăng thành công lên ${platform}!`,
    });
  } catch (err: any) {
    console.error('[/social/publish]', err.message);
    res.status(500).json({ error: err.message, success: false });
  }
});

// ─── GET /social/pages ───────────────────────────────────────────
router.get('/social/pages', (_req, res) => {
  res.json({ success: true, pages: getFacebookPages() });
});

// ─── Helpers for news ───────────────────────────────────────────
function generateSlug(title: string): string {
  return title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 100)
    + '-' + Date.now().toString(36);
}

function estimateReadingTime(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

function cleanContentForForum(content: string, title: string): string {
  const lines = content.split('\n');
  const firstIdx = lines.findIndex(l => l.trim().length > 0);
  if (firstIdx >= 0) {
    const headingText = lines[firstIdx]!.trim().replace(/^#+\s*/, '');
    if (headingText && (headingText === title || title.includes(headingText) || headingText.includes(title))) {
      lines.splice(firstIdx, 1);
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── POST /news/publish ──────────────────────────────────────────
router.post('/news/publish', async (req, res) => {
  try {
    const { title, content, metaDescription, excerpt: excerptIn, category, tags, coverImageUrl, status } = req.body;
    if (!title || !content || !category) return res.status(400).json({ success: false, error: 'Thiếu title, content hoặc category' });

    const slug = generateSlug(title);
    const readingTime = estimateReadingTime(content);
    const excerpt = excerptIn ?? content.replace(/[#*\n]/g, ' ').trim().slice(0, 200) + '...';

    const article = {
      title, slug,
      meta_description: metaDescription ?? excerpt.slice(0, 155),
      content, excerpt, category,
      tags: tags ?? [],
      cover_image_url: coverImageUrl ?? null,
      author: 'Gemral Editorial',
      status: status ?? 'draft',
      published_at: status === 'published' ? new Date().toISOString() : null,
      reading_time_minutes: readingTime,
    };

    const { data: ccArticle, error: ccError } = await getSupabase()
      .from('cc_news_articles').insert(article).select().single();
    if (ccError) throw ccError;

    // Cross-post to forum_posts if published
    let forumPostId: string | null = null;
    let publishUrl = '';
    if (status === 'published') {
      try {
        const forumContent = cleanContentForForum(content, title);
        const { data: forumPost, error: forumError } = await supabase
          .from('forum_posts').insert({
            user_id: GEMRAL_ADMIN_USER_ID,
            title,
            content: forumContent,
            category_id: GEMRAL_NEWS_CATEGORY_ID,
            status: 'published',
            feed_type: 'news',
            post_type: 'news',
            topic: 'tin-tuc',
            content_category: 'general',
            hashtags: tags ?? [],
            image_url: coverImageUrl ?? null,
            media_urls: coverImageUrl ? [coverImageUrl] : [],
            visibility: 'public',
            is_admin_post: true,
          }).select('id').single();

        if (!forumError && forumPost) {
          forumPostId = forumPost.id;
          publishUrl = `https://gemral.com/forum/thread/${forumPost.id}`;
          await getSupabase().from('cc_news_articles').update({ metadata: { forum_post_id: forumPost.id } }).eq('id', ccArticle.id);
        }
      } catch (e) {
        console.error('[/news/publish] cross-post error:', e);
      }
    }

    const statusLabel = status === 'published' ? 'xuất bản' : 'lưu nháp';
    res.json({
      success: true,
      message: `Bài "${title}" đã được ${statusLabel} thành công${forumPostId ? ' và đăng lên Gemral forum' : ''}.`,
      article: ccArticle,
      forumPostId,
      publishUrl,
    });
  } catch (err: any) {
    console.error('[/news/publish]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /news/articles ──────────────────────────────────────────
router.get('/news/articles', async (req, res) => {
  try {
    const { status = 'published', category, limit = '20' } = req.query as Record<string, string>;
    let query = getSupabase().from('cc_news_articles').select('*').eq('status', status)
      .order('published_at', { ascending: false }).limit(parseInt(limit));
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, articles: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
