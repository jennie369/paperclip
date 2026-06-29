import { aC as getSupabase, bx as claudeService } from './index-C7HOhyqm.js';

function buildAnalysisPrompt(videos, periodStart, periodEnd) {
  return `Bạn là chuyên gia phân tích YouTube và chiến lược nội dung cho hệ sinh thái Gemral.

=== CONTEXT DỰ ÁN GEMRAL ===
Kênh YouTube: "Jennie Uyên Chu — Thức Tỉnh Tâm Thức" (280K+ subscribers)
Người sáng lập: Jennie Uyên Chu — Life Coach, NLP Master Practitioner, Trader, Spiritual Mentor

Gemral (gemral.com) là nền tảng "Thức Tỉnh Tâm Thức" kết hợp:
- Tài chính thông minh (crypto trading tools, AI scanner, portfolio tracker)
- Phát triển bản thân & tâm linh (tarot, meditation, coaching)
- Cộng đồng (forum, livestream, khóa học online)
- Mobile app (iOS/Android) với đầy đủ tính năng

Sản phẩm & doanh thu:
- Tier 1 (Miễn phí): Scanner cơ bản, forum, daily check-in
- Tier 2 (Premium): AI predictions, advanced scanner, trading journal — 299K-499K VND/tháng
- Tier 3 (VIP): Whale tracker, backtesting, 1-on-1 coaching — 999K-1.99M VND/tháng
- Khóa học online: "Thức Tỉnh Tài Chính", "NLP & Crypto Mindset"
- Partnership/Affiliate program: commission-based

Mục tiêu marketing YouTube:
1. Thu hút subscribers → chuyển đổi sang app users (CAC target < 50K VND)
2. Video = top-of-funnel → CTA download app / đăng ký Tier 2/3
3. Xây dựng authority trong niche "tài chính + tâm linh" tại VN
4. ROI: mỗi video cần đóng góp vào funnel conversion (view → app install → paid tier)

=== HỆ THỐNG NỘI DUNG ===
3 Track (tỉ lệ mục tiêu):
- Wealth (30%): Trading, crypto, tài chính cá nhân
- Wellness (30%): Tâm linh, meditation, NLP, healing
- Integration (40%): Kết hợp cả hai — lifestyle, motivation, phỏng vấn

7 Personas mục tiêu: Gen Z Trader, Career Woman, Spiritual Seeker, Healing Seeker, Side Hustler, Wealthy Collector, Millennial Pro

=== DỮ LIỆU VIDEO (kỳ ${periodStart} → ${periodEnd}) ===
LƯU Ý QUAN TRỌNG:
- "views", "likes", "comments" = SỐ LIỆU LIFETIME (tổng tất cả thời gian)
- "period_views", "period_likes", "period_comments" = SỐ LIỆU TRONG KỲ (chỉ trong khoảng ${periodStart} → ${periodEnd})
- "ctr" = % xem trung bình (averageViewPercentage, TRONG KỲ)
- "revenue_in_period", "subscribers_gained_in_period" = doanh thu và subscriber mới TRONG KỲ
- Khi đánh giá engagement, dùng LIFETIME stats. Khi so sánh hiệu suất gần đây, dùng PERIOD stats.

${JSON.stringify(videos, null, 2)}

=== YÊU CẦU PHÂN TÍCH ===
Phân tích toàn diện và trả về JSON:
{
  "summary": "Tóm tắt 3-4 câu bằng tiếng Việt, bao gồm đánh giá ROI và hiệu quả funnel conversion",
  "top_performers": [{"video_id":"...", "title":"...", "metric":"views/likes/engagement", "value":12345, "why":"Giải thích tại sao video này hiệu quả cho funnel Gemral"}],
  "underperformers": [{"video_id":"...", "title":"...", "issue":"Mô tả vấn đề cụ thể", "fix":"Giải pháp cụ thể liên quan đến funnel/conversion"}],
  "action_plan": [
    {"action":"Hành động cụ thể liên quan đến mục tiêu Gemral", "priority":"high", "deadline":"next_week"},
    {"action":"Chiến lược content phù hợp với sản phẩm app", "priority":"medium", "deadline":"next_2weeks"}
  ],
  "content_gaps": {
    "missing_tracks": ["track nào thiếu so với tỉ lệ mục tiêu"],
    "missing_personas": ["persona nào chưa được target"]
  },
  "title_insights": {
    "best_formula": "Công thức tiêu đề hiệu quả nhất (dựa trên engagement lifetime)",
    "worst_formula": "Công thức tiêu đề kém nhất",
    "recommendation": "Gợi ý cải thiện tiêu đề gắn với funnel Gemral"
  },
  "revenue_insights": {
    "rpm_trend": "Phân tích doanh thu YouTube + tiềm năng conversion sang app",
    "best_revenue_track": "Track nào mang lại giá trị cao nhất (cả YouTube revenue + app conversion)",
    "optimization": "Gợi ý tối ưu CTA và funnel conversion cụ thể"
  }
}

CHỈ trả về JSON, không thêm gì khác.`;
}
function safeParseJSON(text, fallback) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return fallback;
  } catch {
    return fallback;
  }
}
const analyticsAI = {
  async generateWeeklyInsights(periodStart, periodEnd, preloadedVideos, aiOptions) {
    const startStr = periodStart.toISOString().split("T")[0];
    const endStr = periodEnd.toISOString().split("T")[0];
    let videoList = preloadedVideos ?? [];
    if (videoList.length === 0) {
      try {
        const sb = getSupabase();
        if (sb) {
          const { data: videos } = await sb.from("cc_yt_videos").select("*").gte("metrics_updated_at", periodStart.toISOString()).lte("metrics_updated_at", periodEnd.toISOString()).order("views", { ascending: false }).limit(50);
          videoList = videos ?? [];
        }
      } catch {
      }
    }
    if (videoList.length === 0) {
      return {
        period_start: startStr,
        period_end: endStr,
        summary: "Không có dữ liệu video trong khoảng thời gian này.",
        top_performers: [],
        underperformers: [],
        action_plan: [
          { action: "Đồng bộ dữ liệu YouTube", priority: "high", deadline: "today" }
        ],
        content_gaps: { missing_tracks: [], missing_personas: [] },
        title_insights: { best_formula: "N/A", worst_formula: "N/A", recommendation: "Cần thêm dữ liệu" },
        revenue_insights: { rpm_trend: "N/A", best_revenue_track: "N/A", optimization: "Cần thêm dữ liệu" }
      };
    }
    const prompt = buildAnalysisPrompt(videoList, startStr, endStr);
    const provider = aiOptions?.provider ?? "claude";
    const model = aiOptions?.model ?? "sonnet";
    const response = await claudeService.generate({
      systemPrompt: "Bạn là chuyên gia phân tích YouTube analytics. Trả lời bằng JSON format.",
      userPrompt: prompt,
      maxTokens: 4096,
      temperature: 0.5,
      model,
      provider,
      jobType: "analysis"
    });
    const defaultInsight = {
      period_start: startStr,
      period_end: endStr,
      summary: "Không thể phân tích dữ liệu.",
      top_performers: [],
      underperformers: [],
      action_plan: [],
      content_gaps: { missing_tracks: [], missing_personas: [] },
      title_insights: { best_formula: "", worst_formula: "", recommendation: "" },
      revenue_insights: { rpm_trend: "", best_revenue_track: "", optimization: "" }
    };
    const parsed = safeParseJSON(response.content, {});
    const insight = {
      ...defaultInsight,
      ...parsed,
      period_start: startStr,
      period_end: endStr
    };
    try {
      const sb = getSupabase();
      if (sb) {
        const { data: savedInsight } = await sb.from("cc_yt_insights").insert({
          insight_type: "weekly_analysis",
          title: `Weekly Analysis ${startStr} - ${endStr}`,
          description: insight.summary,
          severity: "neutral",
          impact_score: 0,
          confidence: 1,
          data_points: {
            period_start: insight.period_start,
            period_end: insight.period_end,
            top_performers: insight.top_performers,
            underperformers: insight.underperformers,
            action_plan: insight.action_plan,
            content_gaps: insight.content_gaps,
            title_insights: insight.title_insights,
            revenue_insights: insight.revenue_insights
          }
        }).select().single();
        if (savedInsight) {
          insight.id = savedInsight.id;
          insight.created_at = savedInsight.created_at;
        }
      }
    } catch {
      insight.created_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    return insight;
  },
  async getLatestInsight() {
    try {
      const sb = getSupabase();
      if (!sb) return null;
      const { data } = await sb.from("cc_yt_insights").select("*").order("created_at", { ascending: false }).limit(1).single();
      return data;
    } catch {
      return null;
    }
  },
  async getInsightHistory(limit = 10) {
    try {
      const sb = getSupabase();
      if (!sb) return [];
      const { data } = await sb.from("cc_yt_insights").select("*").order("created_at", { ascending: false }).limit(limit);
      return data ?? [];
    } catch {
      return [];
    }
  }
};

const youtubeService = {
  /**
   * Check if YouTube is connected (OAuth token exists)
   */
  async isConnected() {
    const { data } = await getSupabase().from("profiles").select("youtube_access_token").single();
    return !!data?.youtube_access_token;
  },
  /**
   * Get channel statistics
   */
  async getChannelStats(accessToken) {
    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("Không tìm thấy kênh YouTube");
    }
    return {
      subscriberCount: parseInt(channel.statistics.subscriberCount ?? "0", 10),
      videoCount: parseInt(channel.statistics.videoCount ?? "0", 10),
      viewCount: parseInt(channel.statistics.viewCount ?? "0", 10),
      title: channel.snippet.title,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url
    };
  },
  /**
   * Get video performance data
   */
  async getVideoPerformance(accessToken, videoIds) {
    const ids = videoIds.join(",");
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${ids}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    const data = await response.json();
    return (data.items ?? []).map((item) => ({
      id: item.id,
      title: item.snippet?.title ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? "",
      views: parseInt(item.statistics?.viewCount ?? "0", 10),
      likes: parseInt(item.statistics?.likeCount ?? "0", 10),
      comments: parseInt(item.statistics?.commentCount ?? "0", 10),
      duration: item.contentDetails?.duration ?? "",
      durationSeconds: parseDuration(item.contentDetails?.duration ?? "")
    }));
  },
  /**
   * Get retention data for a specific video
   */
  async getRetentionData(accessToken, videoId) {
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2020-01-01&endDate=${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return (data.rows ?? []).map((row) => ({
      timeRatio: row[0],
      watchRatio: row[1]
    }));
  },
  /**
   * Sync video data to Supabase
   */
  async syncToSupabase(videos) {
    const sb = getSupabase();
    if (!sb) return 0;
    let synced = 0;
    try {
      for (const video of videos) {
        const { error } = await sb.from("cc_yt_videos").upsert(
          {
            youtube_video_id: video.id,
            title: video.title,
            views: video.views,
            likes: video.likes,
            comments_count: video.comments,
            published_at: video.publishedAt,
            duration_seconds: video.durationSeconds,
            thumbnail_url: video.thumbnailUrl,
            content_type: "latc",
            track: "integration",
            pillar: "lifestyle",
            metrics_updated_at: (/* @__PURE__ */ new Date()).toISOString()
          },
          { onConflict: "youtube_video_id" }
        );
        if (!error) synced++;
      }
    } catch {
    }
    return synced;
  },
  /**
   * Get last sync time
   */
  async getLastSyncTime() {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data } = await sb.from("cc_yt_videos").select("metrics_updated_at").order("metrics_updated_at", { ascending: false }).limit(1).single();
      return data?.metrics_updated_at ?? null;
    } catch {
      return null;
    }
  },
  /**
   * Get all synced videos from Supabase
   */
  async getSyncedVideos(limit = 50) {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data } = await sb.from("cc_yt_videos").select("*").order("views", { ascending: false }).limit(limit);
      return (data ?? []).map((v) => ({
        id: v.youtube_video_id,
        title: v.title,
        publishedAt: v.published_at ?? "",
        thumbnailUrl: v.thumbnail_url ?? "",
        views: v.views,
        likes: v.likes,
        comments: v.comments_count,
        duration: "",
        durationSeconds: v.duration_seconds ?? 0
      }));
    } catch {
      return [];
    }
  }
};
function parseDuration(iso8601) {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export { analyticsAI as a, youtubeService as y };
