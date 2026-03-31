// ============================================================================
// Analytics AI — Claude-powered YouTube Performance Analysis
// GEM Content Control Center
// ============================================================================

import { claudeService } from '../api/claudeService';
import { getSupabase } from '../api/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoPerformance {
  youtube_id: string;
  title: string;
  content_type?: string;
  track?: string;
  views: number;           // lifetime total
  likes: number;           // lifetime total
  comments: number;        // lifetime total
  ctr: number;             // averageViewPercentage in period
  avg_view_duration_sec: number;
  published_at: string;
  last_synced_at: string;
  // Period-specific metrics (optional)
  period_views?: number;
  period_likes?: number;
  period_comments?: number;
  revenue_in_period?: number;
  subscribers_gained_in_period?: number;
}

export interface TopPerformer {
  video_id: string;
  title: string;
  metric: string;
  value: number;
  why: string;
}

export interface Underperformer {
  video_id: string;
  title: string;
  issue: string;
  fix: string;
}

export interface ActionPlanItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string;
}

export interface ContentGaps {
  missing_tracks: string[];
  missing_personas: string[];
}

export interface TitleInsights {
  best_formula: string;
  worst_formula: string;
  recommendation: string;
}

export interface RevenueInsights {
  rpm_trend: string;
  best_revenue_track: string;
  optimization: string;
}

export interface YTInsight {
  id?: string;
  period_start: string;
  period_end: string;
  summary: string;
  top_performers: TopPerformer[];
  underperformers: Underperformer[];
  action_plan: ActionPlanItem[];
  content_gaps: ContentGaps;
  title_insights: TitleInsights;
  revenue_insights: RevenueInsights;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(
  videos: VideoPerformance[],
  periodStart: string,
  periodEnd: string,
): string {
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

// ---------------------------------------------------------------------------
// Safe JSON parse
// ---------------------------------------------------------------------------

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Analytics AI Service
// ---------------------------------------------------------------------------

export const analyticsAI = {
  async generateWeeklyInsights(
    periodStart: Date,
    periodEnd: Date,
    preloadedVideos?: VideoPerformance[],
    aiOptions?: { provider?: 'claude' | 'gemini'; model?: string },
  ): Promise<YTInsight> {
    const startStr = periodStart.toISOString().split('T')[0]!;
    const endStr = periodEnd.toISOString().split('T')[0]!;

    // 1. Use preloaded video data if available, otherwise query Supabase
    let videoList: VideoPerformance[] = preloadedVideos ?? [];
    if (videoList.length === 0) {
      try {
        const sb = getSupabase();
        if (sb) {
          const { data: videos } = await sb
            .from('cc_yt_videos')
            .select('*')
            .gte('metrics_updated_at', periodStart.toISOString())
            .lte('metrics_updated_at', periodEnd.toISOString())
            .order('views', { ascending: false })
            .limit(50);
          videoList = (videos ?? []) as unknown as VideoPerformance[];
        }
      } catch {
        // CC Supabase may not be available — continue with empty list
      }
    }

    if (videoList.length === 0) {
      return {
        period_start: startStr,
        period_end: endStr,
        summary: 'Không có dữ liệu video trong khoảng thời gian này.',
        top_performers: [],
        underperformers: [],
        action_plan: [
          { action: 'Đồng bộ dữ liệu YouTube', priority: 'high', deadline: 'today' },
        ],
        content_gaps: { missing_tracks: [], missing_personas: [] },
        title_insights: { best_formula: 'N/A', worst_formula: 'N/A', recommendation: 'Cần thêm dữ liệu' },
        revenue_insights: { rpm_trend: 'N/A', best_revenue_track: 'N/A', optimization: 'Cần thêm dữ liệu' },
      };
    }

    // 2. Build analysis prompt and call AI
    const prompt = buildAnalysisPrompt(videoList, startStr, endStr);
    const provider = aiOptions?.provider ?? 'claude';
    const model = aiOptions?.model ?? 'sonnet';
    const response = await claudeService.generate({
      systemPrompt: 'Bạn là chuyên gia phân tích YouTube analytics. Trả lời bằng JSON format.',
      userPrompt: prompt,
      maxTokens: 4096,
      temperature: 0.5,
      model,
      provider,
      jobType: 'analysis',
    });

    // 3. Parse response
    const defaultInsight: YTInsight = {
      period_start: startStr,
      period_end: endStr,
      summary: 'Không thể phân tích dữ liệu.',
      top_performers: [],
      underperformers: [],
      action_plan: [],
      content_gaps: { missing_tracks: [], missing_personas: [] },
      title_insights: { best_formula: '', worst_formula: '', recommendation: '' },
      revenue_insights: { rpm_trend: '', best_revenue_track: '', optimization: '' },
    };

    const parsed = safeParseJSON<Partial<YTInsight>>(response.content, {});
    const insight: YTInsight = {
      ...defaultInsight,
      ...parsed,
      period_start: startStr,
      period_end: endStr,
    };

    // 4. Save to Supabase (non-critical — may fail if CC Supabase not available)
    try {
      const sb = getSupabase();
      if (sb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: savedInsight } = await sb
          .from('cc_yt_insights')
          .insert({
            insight_type: 'weekly_analysis',
            title: `Weekly Analysis ${startStr} - ${endStr}`,
            description: insight.summary,
            severity: 'neutral' as const,
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
              revenue_insights: insight.revenue_insights,
            } as unknown as Record<string, unknown>,
          } as any)
          .select()
          .single();

        if (savedInsight) {
          insight.id = (savedInsight as Record<string, unknown>).id as string;
          insight.created_at = (savedInsight as Record<string, unknown>).created_at as string;
        }
      }
    } catch {
      // CC Supabase save failed — insight still returned to UI
      insight.created_at = new Date().toISOString();
    }

    return insight;
  },

  async getLatestInsight(): Promise<YTInsight | null> {
    try {
      const sb = getSupabase();
      if (!sb) return null;
      const { data } = await sb
        .from('cc_yt_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data as unknown as YTInsight | null;
    } catch {
      return null;
    }
  },

  async getInsightHistory(limit = 10): Promise<YTInsight[]> {
    try {
      const sb = getSupabase();
      if (!sb) return [];
      const { data } = await sb
        .from('cc_yt_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data ?? []) as unknown as YTInsight[];
    } catch {
      return [];
    }
  },
};
