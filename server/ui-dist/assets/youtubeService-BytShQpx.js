import{a7 as l,bd as y}from"./index-DvD4HVnv.js";function f(n,e,i){return`Bạn là chuyên gia phân tích YouTube và chiến lược nội dung cho hệ sinh thái Gemral.

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

=== DỮ LIỆU VIDEO (kỳ ${e} → ${i}) ===
LƯU Ý QUAN TRỌNG:
- "views", "likes", "comments" = SỐ LIỆU LIFETIME (tổng tất cả thời gian)
- "period_views", "period_likes", "period_comments" = SỐ LIỆU TRONG KỲ (chỉ trong khoảng ${e} → ${i})
- "ctr" = % xem trung bình (averageViewPercentage, TRONG KỲ)
- "revenue_in_period", "subscribers_gained_in_period" = doanh thu và subscriber mới TRONG KỲ
- Khi đánh giá engagement, dùng LIFETIME stats. Khi so sánh hiệu suất gần đây, dùng PERIOD stats.

${JSON.stringify(n,null,2)}

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

CHỈ trả về JSON, không thêm gì khác.`}function b(n,e){try{const i=n.match(/\{[\s\S]*\}/);return i?JSON.parse(i[0]):e}catch{return e}}const w={async generateWeeklyInsights(n,e,i,t){const r=n.toISOString().split("T")[0],s=e.toISOString().split("T")[0];let o=i??[];if(o.length===0)try{const c=l();if(c){const{data:u}=await c.from("cc_yt_videos").select("*").gte("metrics_updated_at",n.toISOString()).lte("metrics_updated_at",e.toISOString()).order("views",{ascending:!1}).limit(50);o=u??[]}}catch{}if(o.length===0)return{period_start:r,period_end:s,summary:"Không có dữ liệu video trong khoảng thời gian này.",top_performers:[],underperformers:[],action_plan:[{action:"Đồng bộ dữ liệu YouTube",priority:"high",deadline:"today"}],content_gaps:{missing_tracks:[],missing_personas:[]},title_insights:{best_formula:"N/A",worst_formula:"N/A",recommendation:"Cần thêm dữ liệu"},revenue_insights:{rpm_trend:"N/A",best_revenue_track:"N/A",optimization:"Cần thêm dữ liệu"}};const h=f(o,r,s),d=(t==null?void 0:t.provider)??"claude",m=(t==null?void 0:t.model)??"sonnet",p=await y.generate({systemPrompt:"Bạn là chuyên gia phân tích YouTube analytics. Trả lời bằng JSON format.",userPrompt:h,maxTokens:4096,temperature:.5,model:m,provider:d,jobType:"analysis"}),g={period_start:r,period_end:s,summary:"Không thể phân tích dữ liệu.",top_performers:[],underperformers:[],action_plan:[],content_gaps:{missing_tracks:[],missing_personas:[]},title_insights:{best_formula:"",worst_formula:"",recommendation:""},revenue_insights:{rpm_trend:"",best_revenue_track:"",optimization:""}},_=b(p.content,{}),a={...g,..._,period_start:r,period_end:s};try{const c=l();if(c){const{data:u}=await c.from("cc_yt_insights").insert({insight_type:"weekly_analysis",title:`Weekly Analysis ${r} - ${s}`,description:a.summary,severity:"neutral",impact_score:0,confidence:1,data_points:{period_start:a.period_start,period_end:a.period_end,top_performers:a.top_performers,underperformers:a.underperformers,action_plan:a.action_plan,content_gaps:a.content_gaps,title_insights:a.title_insights,revenue_insights:a.revenue_insights}}).select().single();u&&(a.id=u.id,a.created_at=u.created_at)}}catch{a.created_at=new Date().toISOString()}return a},async getLatestInsight(){try{const n=l();if(!n)return null;const{data:e}=await n.from("cc_yt_insights").select("*").order("created_at",{ascending:!1}).limit(1).single();return e}catch{return null}},async getInsightHistory(n=10){try{const e=l();if(!e)return[];const{data:i}=await e.from("cc_yt_insights").select("*").order("created_at",{ascending:!1}).limit(n);return i??[]}catch{return[]}}},k={async isConnected(){const{data:n}=await l().from("profiles").select("youtube_access_token").single();return!!(n!=null&&n.youtube_access_token)},async getChannelStats(n){var r,s,o;const e=await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",{headers:{Authorization:`Bearer ${n}`}});if(!e.ok)throw new Error(`YouTube API error: ${e.status}`);const t=(r=(await e.json()).items)==null?void 0:r[0];if(!t)throw new Error("Không tìm thấy kênh YouTube");return{subscriberCount:parseInt(t.statistics.subscriberCount??"0",10),videoCount:parseInt(t.statistics.videoCount??"0",10),viewCount:parseInt(t.statistics.viewCount??"0",10),title:t.snippet.title,thumbnailUrl:(o=(s=t.snippet.thumbnails)==null?void 0:s.default)==null?void 0:o.url}},async getVideoPerformance(n,e){const i=e.join(","),t=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${i}`,{headers:{Authorization:`Bearer ${n}`}});if(!t.ok)throw new Error(`YouTube API error: ${t.status}`);return((await t.json()).items??[]).map(s=>{var o,h,d,m,p,g,_,a,c,u;return{id:s.id,title:((o=s.snippet)==null?void 0:o.title)??"",publishedAt:((h=s.snippet)==null?void 0:h.publishedAt)??"",thumbnailUrl:((p=(m=(d=s.snippet)==null?void 0:d.thumbnails)==null?void 0:m.medium)==null?void 0:p.url)??"",views:parseInt(((g=s.statistics)==null?void 0:g.viewCount)??"0",10),likes:parseInt(((_=s.statistics)==null?void 0:_.likeCount)??"0",10),comments:parseInt(((a=s.statistics)==null?void 0:a.commentCount)??"0",10),duration:((c=s.contentDetails)==null?void 0:c.duration)??"",durationSeconds:v(((u=s.contentDetails)==null?void 0:u.duration)??"")}})},async getRetentionData(n,e){const i=await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2020-01-01&endDate=${new Date().toISOString().split("T")[0]}&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video==${e}`,{headers:{Authorization:`Bearer ${n}`}});return i.ok?((await i.json()).rows??[]).map(r=>({timeRatio:r[0],watchRatio:r[1]})):[]},async syncToSupabase(n){const e=l();if(!e)return 0;let i=0;try{for(const t of n){const{error:r}=await e.from("cc_yt_videos").upsert({youtube_video_id:t.id,title:t.title,views:t.views,likes:t.likes,comments_count:t.comments,published_at:t.publishedAt,duration_seconds:t.durationSeconds,thumbnail_url:t.thumbnailUrl,content_type:"latc",track:"integration",pillar:"lifestyle",metrics_updated_at:new Date().toISOString()},{onConflict:"youtube_video_id"});r||i++}}catch{}return i},async getLastSyncTime(){const n=l();if(!n)return null;try{const{data:e}=await n.from("cc_yt_videos").select("metrics_updated_at").order("metrics_updated_at",{ascending:!1}).limit(1).single();return(e==null?void 0:e.metrics_updated_at)??null}catch{return null}},async getSyncedVideos(n=50){const e=l();if(!e)return[];try{const{data:i}=await e.from("cc_yt_videos").select("*").order("views",{ascending:!1}).limit(n);return(i??[]).map(t=>({id:t.youtube_video_id,title:t.title,publishedAt:t.published_at??"",thumbnailUrl:t.thumbnail_url??"",views:t.views,likes:t.likes,comments:t.comments_count,duration:"",durationSeconds:t.duration_seconds??0}))}catch{return[]}}};function v(n){const e=n.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!e)return 0;const i=parseInt(e[1]??"0",10),t=parseInt(e[2]??"0",10),r=parseInt(e[3]??"0",10);return i*3600+t*60+r}export{w as a,k as y};
