// Seed Pipelines — 8 end-to-end templates extracted from
// SOP Knowledge Manager v2 HTML (lines 5118-5278).
//
// Run on server startup or via POST /api/ops/sop-engine/pipelines/seed.
// Idempotent — upserts by pipeline_id.

import { supabase } from './zalo-personal/supabase.js';

interface PipelineBlock {
  type: 'sop' | 'approval' | 'action';
  ref: string;
  label: string;
  note?: string;
  executor?: string;
  trigger?: string;
}

interface PipelineTemplate {
  pipeline_id: string;
  title: string;
  emoji: string;
  category: 'Content' | 'Marketing' | 'Sales' | 'Ops' | 'Custom';
  schedule: string;
  description: string;
  blocks: PipelineBlock[];
  display_order: number;
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    pipeline_id: 'pipe-content-biweekly',
    title: 'Content Pipeline Biweekly End-to-End',
    emoji: '📅',
    category: 'Content',
    schedule: 'Bắt đầu Chủ Nhật 20h → chạy 14 ngày',
    description:
      'Pipeline lõi tạo + phân phối content social biweekly. Từ plan → gen batch → brand check → Jennie duyệt → schedule Meta BS → forum → analytics → repurpose top performers.',
    display_order: 1,
    blocks: [
      { type: 'sop', ref: 'MKT-001', label: 'Content Calendar Monthly', note: 'Plan 14 ngày + phân bổ pillar 40-40-20', executor: 'Content Strategist', trigger: 'Cron CN 20h' },
      { type: 'sop', ref: 'CNT-011', label: 'Content Planner 14 ngày', note: 'Generate calendar JSON + queue jobs vào cc_calendar_events', executor: 'Content Center', trigger: 'Sau MKT-001 done' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie duyệt plan', note: 'Review plan, chỉnh pillar/topic', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'CNT-018', label: 'Batch Generation', note: 'batch_processor.py chạy queue → ~60 cc_scripts', executor: 'Content Center', trigger: 'Cron T2 8h' },
      { type: 'sop', ref: 'CNT-019', label: 'Brand Voice Check', note: 'Filter bài lỗi giọng Jennie — 25 rules', executor: 'Content Strategist', trigger: 'Sau CNT-018' },
      { type: 'sop', ref: 'CNT-015', label: 'Review & Approval', note: 'Jennie review batch approved', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'DST-001', label: 'Meta Bulk Schedule', note: '3 account × 14 ngày × 3 slot — Playwright Meta BS', executor: 'Social Media Manager', trigger: 'Cron T2 11h' },
      { type: 'sop', ref: 'DST-002', label: 'Forum Auto-Post', note: 'Post lên Gemral Forum, link trong comment đầu', executor: 'Community Engagement', trigger: 'Sau DST-001' },
      { type: 'sop', ref: 'ANA-002', label: 'Content Analytics', note: 'Đo reach/engagement daily, write metadata JSON', executor: 'Data Analyst', trigger: 'Cron daily 23h' },
      { type: 'sop', ref: 'CNT-016', label: 'Repurpose Top Performers', note: 'Top 20% → repurpose sang format khác', executor: 'Content Strategist', trigger: 'Cron weekly CN 10h' },
    ],
  },
  {
    pipeline_id: 'pipe-email-biweekly',
    title: 'Email Marketing Biweekly (8 segments × 14 ngày)',
    emoji: '📧',
    category: 'Marketing',
    schedule: 'Bắt đầu Chủ Nhật 20h → chạy 14 ngày (112 emails)',
    description:
      'Plan 14 ngày × 8 segments × 1 email/ngày = 112 emails. Gen HTML batch sẵn T2 sáng, rồi pg_cron gửi 8 emails mỗi 8h sáng các ngày trong tuần.',
    display_order: 2,
    blocks: [
      { type: 'sop', ref: 'CNT-025', label: 'Email Planner Biweekly', note: 'AI gen plan 112 emails dựa trên 8 segments + pillar', executor: 'Email CRM Manager', trigger: 'Cron CN 20h' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie duyệt plan email', note: 'Review từng segment, chỉnh subject/CTA quan trọng', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'CNT-018', label: 'Batch Generate 112 HTML', note: 'batch_processor.py gen_email_html job type, save cc_email_campaigns', executor: 'Content Center', trigger: 'Cron T2 6h' },
      { type: 'sop', ref: 'CNT-019', label: 'Brand Voice Check Email', note: 'Check tone theo EMAIL_DESIGN_FRAMEWORK + DINH_VI_JENNIE', executor: 'Email CRM Manager', trigger: 'Sau CNT-018' },
      { type: 'sop', ref: 'DST-003', label: 'Email Campaign Test Send', note: 'Test send 1 email từ mỗi segment cho Jennie', executor: 'Email CRM Manager', trigger: 'Sau brand check' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie approve batch', note: 'OK toàn bộ 112 emails', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'DST-004', label: 'Email Automation Delivery', note: 'pg_cron gửi 8 emails/ngày qua Resend, track cc_email_sends', executor: 'System', trigger: 'Cron daily 8h' },
      { type: 'sop', ref: 'ANA-003', label: 'Email Performance Tracking', note: 'Track open/click/unsubscribe, first_opened_at', executor: 'Data Analyst', trigger: 'Cron daily 23h' },
      { type: 'action', ref: 'WEEKLY-REPORT', label: 'Weekly segment report', note: 'Send Telegram: segment nào tốt/xấu', executor: 'Data Analyst', trigger: 'Cron T2 9h' },
    ],
  },
  {
    pipeline_id: 'pipe-sales-lead-close',
    title: 'Sales Pipeline — Lead → Customer → Loyal',
    emoji: '💰',
    category: 'Sales',
    schedule: 'Realtime — triggered by lead arrival',
    description:
      'Pipeline bán hàng end-to-end. Bắt đầu từ lead (FB ad / landing form), qua qualifying → tư vấn → objection → close → onboarding → upsell → retention.',
    display_order: 3,
    blocks: [
      { type: 'action', ref: 'WEBHOOK-LEAD', label: 'Lead webhook đến', note: 'FB ad form / landing page form / Zalo DM', executor: 'System', trigger: 'Webhook' },
      { type: 'sop', ref: 'SAL-006', label: 'Lead Qualification', note: 'Score lead theo budget/intent/timeline', executor: 'Data Analyst', trigger: 'Sau webhook' },
      { type: 'sop', ref: 'SAL-001', label: 'Script Tư Vấn Khách Mới', note: 'Cold → Warm → Close. Giới thiệu ecosystem', executor: 'Sales Closer', trigger: 'Lead score >= 70' },
      { type: 'sop', ref: 'SAL-004', label: 'Master Objection Handler', note: '10 objections: giá, thời gian, sợ lùa gà...', executor: 'Sales Closer', trigger: 'Khi KH từ chối' },
      { type: 'sop', ref: 'SAL-007', label: 'FAQ Master 50+ câu', note: 'Answer technical questions về khóa học/scanner', executor: 'Sales Closer / Chatbot', trigger: 'On demand' },
      { type: 'sop', ref: 'COM-007', label: 'Course Enrollment & Access', note: 'Webhook Shopify → unlock course_enrollments', executor: 'Commerce Ops', trigger: 'Sau purchase' },
      { type: 'sop', ref: 'CNT-021', label: 'Onboarding Email Series (7 emails)', note: 'Day 0/1/3/5/7 drip theo khóa học mua', executor: 'Email CRM Manager', trigger: 'Webhook purchase' },
      { type: 'sop', ref: 'SAL-005', label: 'Upsell / Cross-sell (Day 14)', note: 'Gợi ý tier cao hơn / bundle / crystal', executor: 'Sales Closer', trigger: 'Cron day 14 after purchase' },
      { type: 'sop', ref: 'CS-011', label: 'Post-Purchase Care (Day 7/30)', note: 'Check-in, solve issues, collect feedback', executor: 'Customer Success', trigger: 'Cron day 7 + day 30' },
    ],
  },
  {
    pipeline_id: 'pipe-short-video-viral',
    title: 'Short Video Auto-Cut Viral Pipeline',
    emoji: '🎬',
    category: 'Content',
    schedule: 'Manual trigger (upload long video) → distribute 14 ngày',
    description:
      'Long video YouTube/FB → AI auto-cut 5-10 viral clips → distribute TikTok + YT Shorts + FB Reels + IG Reels × 14 ngày × 2 clips/ngày = 28 posts/platform. 2 paths: Opus Clip SaaS hoặc DIY FFmpeg.',
    display_order: 4,
    blocks: [
      { type: 'action', ref: 'INPUT-LONG-VIDEO', label: 'Upload long video', note: 'YouTube URL hoặc file MP4 local', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'CNT-024', label: 'Step 1: yt-dlp download', note: 'Download video từ URL về /tmp', executor: 'Content Center', trigger: 'Sau upload' },
      { type: 'sop', ref: 'CNT-024', label: 'Step 2: Whisper transcribe', note: 'Local Whisper hoặc Whisper API → SRT timestamps', executor: 'Content Center', trigger: 'Sau download' },
      { type: 'sop', ref: 'CNT-024', label: 'Step 3: Claude pick viral moments', note: 'Sonnet đọc SRT, pick 5-10 moments (hook 3s + payoff 30-60s)', executor: 'Content Center', trigger: 'Sau transcribe' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie duyệt moments chọn', note: 'Xem timestamps, approve hoặc adjust', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'CNT-024', label: 'Step 4: FFmpeg cut + 9:16', note: 'Cut theo timestamps, resize 9:16, burn caption VN', executor: 'Designer', trigger: 'Sau approve' },
      { type: 'sop', ref: 'CNT-023', label: 'Designer Asset Composition', note: 'Add logo Gemral + lower-third Jennie + CTA', executor: 'Designer', trigger: 'Sau FFmpeg' },
      { type: 'sop', ref: 'DST-001', label: 'Distribute TikTok (Playwright)', note: 'Schedule 2 clips/ngày × 14 ngày', executor: 'Social Media Manager', trigger: 'Sau composition' },
      { type: 'sop', ref: 'DST-001', label: 'Distribute YT Shorts', note: 'Playwright YouTube Studio upload', executor: 'Social Media Manager', trigger: 'Parallel với TikTok' },
      { type: 'sop', ref: 'DST-001', label: 'Distribute FB + IG Reels', note: 'Meta Business Suite bulk schedule', executor: 'Social Media Manager', trigger: 'Parallel' },
      { type: 'sop', ref: 'ANA-002', label: 'Track views / engagement', note: 'Daily report top 3 clips per platform', executor: 'Data Analyst', trigger: 'Cron daily 23h' },
    ],
  },
  {
    pipeline_id: 'pipe-onboarding-post-purchase',
    title: 'Onboarding Email Series (7 khóa học)',
    emoji: '🎓',
    category: 'Marketing',
    schedule: 'Webhook purchase → 14 ngày',
    description:
      'Webhook Shopify purchase → detect course_id → route to correct 7-email series. Support: Trading T1/T2/T3, Tình Yêu, Triệu Phú, 7 Ngày Tần Số, Starter.',
    display_order: 5,
    blocks: [
      { type: 'action', ref: 'WEBHOOK-SHOPIFY', label: 'Webhook Shopify purchase', note: 'shopify_orders insert → detect tier_purchased + course_id', executor: 'System', trigger: 'Webhook' },
      { type: 'sop', ref: 'COM-007', label: 'Course Enrollment Grant', note: 'Insert course_enrollments row + unlock profiles.course_tier', executor: 'Commerce Ops', trigger: 'Sau webhook' },
      { type: 'action', ref: 'ROUTE-SERIES', label: 'Route to correct series', note: 'Case course_id IN (T1/T2/T3/TinhYeu/TrieuPhu/7Ngay/Starter)', executor: 'System', trigger: 'Sau enrollment' },
      { type: 'sop', ref: 'CNT-021', label: 'Day 0: Welcome email', note: 'Thank you + how to access', executor: 'Email CRM Manager', trigger: 'Ngay sau enrollment' },
      { type: 'sop', ref: 'CNT-021', label: 'Day 1: Value email', note: 'Tại sao khóa này đáng học', executor: 'Email CRM Manager', trigger: 'Cron +1d' },
      { type: 'sop', ref: 'CNT-021', label: 'Day 3: Feature showcase', note: 'Highlight tính năng / nội dung khóa', executor: 'Email CRM Manager', trigger: 'Cron +3d' },
      { type: 'sop', ref: 'CNT-021', label: 'Day 5: Social proof', note: 'Testimonial + case study học viên cũ', executor: 'Email CRM Manager', trigger: 'Cron +5d' },
      { type: 'sop', ref: 'CNT-021', label: 'Day 7: CTA upsell', note: 'Gợi ý next tier + bundle', executor: 'Email CRM Manager', trigger: 'Cron +7d' },
      { type: 'sop', ref: 'ANA-003', label: 'Track engagement', note: 'Open rate + click rate per segment', executor: 'Data Analyst', trigger: 'Daily' },
      { type: 'sop', ref: 'SAL-005', label: 'Day 14: Upsell trigger', note: 'Nếu engaged → personalized upsell offer', executor: 'Sales Closer', trigger: 'Cron +14d' },
    ],
  },
  {
    pipeline_id: 'pipe-retention-winback',
    title: 'Customer Retention & Win-back',
    emoji: '🔁',
    category: 'Marketing',
    schedule: 'Cron daily + event-based',
    description:
      'Giữ chân khách hàng tồn tại: check-in Day 7, review Day 30, win-back Day 60 inactive, renewal reminder Day 90. Giảm churn.',
    display_order: 6,
    blocks: [
      { type: 'sop', ref: 'DST-009', label: 'Day 7: Check-in email', note: 'Cách bắt đầu / giải đáp thắc mắc', executor: 'Email CRM Manager', trigger: 'Cron day 7 after purchase' },
      { type: 'sop', ref: 'CS-011', label: 'Day 7: Personal check', note: 'CS DM cá nhân nếu engagement thấp', executor: 'Customer Success', trigger: 'Manual trigger if low engagement' },
      { type: 'sop', ref: 'DST-007', label: 'Day 30: Review email', note: 'Hỏi feedback + NPS', executor: 'Email CRM Manager', trigger: 'Cron day 30' },
      { type: 'sop', ref: 'DST-010', label: 'Day 60 inactive: Win-back', note: 'Discount code + social proof mạnh', executor: 'Email CRM Manager', trigger: 'Cron day 60 if inactive' },
      { type: 'sop', ref: 'SAL-009', label: 'Day 90: Renewal reminder', note: 'Nhắc gia hạn tier / subscription', executor: 'Sales Closer', trigger: 'Cron day 90' },
      { type: 'sop', ref: 'ANA-004', label: 'Cohort Retention Analysis', note: 'Weekly retention curve by cohort', executor: 'Data Analyst', trigger: 'Cron weekly' },
      { type: 'action', ref: 'CHURN-ALERT', label: 'Churn alert Telegram', note: 'Nếu rate > threshold → alert Jennie', executor: 'System', trigger: 'Realtime' },
    ],
  },
  {
    pipeline_id: 'pipe-ctv-onboarding-first-sale',
    title: 'CTV Onboarding → First Sale (14 ngày)',
    emoji: '👥',
    category: 'Sales',
    schedule: 'CTV application → First sale (14 ngày)',
    description:
      'Pipeline CTV: từ application → AI screen → Jennie approve → training materials → mock call với AI → grant access → first deal celebration.',
    display_order: 7,
    blocks: [
      { type: 'action', ref: 'APPLICATION-FORM', label: 'CTV application form', note: 'Webhook partnership_applications insert', executor: 'System', trigger: 'Webhook' },
      { type: 'sop', ref: 'HR-001', label: 'AI screen application', note: 'Check fit + background + social presence', executor: 'HR Agent', trigger: 'Sau webhook' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie approve application', note: 'Manual review + accept/reject', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'HR-002', label: 'Onboard CTV (10 bước)', note: 'Set ctv_tier=bronze + send welcome kit', executor: 'Partnership Manager', trigger: 'Sau approve' },
      { type: 'sop', ref: 'DST-011', label: 'CTV Onboard Email Sequence', note: '7 emails training materials (script, objections, catalog)', executor: 'Email CRM Manager', trigger: 'Day 1-7' },
      { type: 'sop', ref: 'HR-004', label: 'Đào tạo CTV Trading', note: 'GEM Scanner basics + script tư vấn trading', executor: 'Partnership Manager', trigger: 'Day 3' },
      { type: 'sop', ref: 'HR-005', label: 'Đào tạo CTV Spiritual', note: 'Crystal + script tâm linh + frequency work', executor: 'Partnership Manager', trigger: 'Day 4' },
      { type: 'sop', ref: 'SAL-005', label: 'AI mock call Day 5', note: 'Roleplay với AI → chấm điểm kịch bản', executor: 'AI Agent', trigger: 'Day 5' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Day 7: Grade + grant access', note: 'Nếu pass → full access affiliate dashboard', executor: 'Jennie', trigger: 'Day 7' },
      { type: 'sop', ref: 'COM-006', label: 'Affiliate dashboard unlock', note: 'Enable CTV links + commission tracking', executor: 'Commerce Ops', trigger: 'Sau approve' },
      { type: 'sop', ref: 'AFF-001', label: 'First commission celebration', note: 'Khi CTV có sale đầu tiên → celebrate + tăng tier progression', executor: 'Partnership Manager', trigger: 'Event first sale' },
    ],
  },
  {
    pipeline_id: 'pipe-launch-product',
    title: 'Launch Sản Phẩm / Khóa Học Mới (28 ngày)',
    emoji: '🚀',
    category: 'Marketing',
    schedule: 'D-14 tease → D-day launch → D+14 post-launch',
    description:
      'Pipeline ra mắt sản phẩm/khóa mới. 14 ngày tease + D-day → 14 ngày post-launch nurture + retargeting.',
    display_order: 8,
    blocks: [
      { type: 'sop', ref: 'MKT-009', label: 'Pre-launch planning (D-14)', note: 'Plan content tease, landing, email sequence, ads budget', executor: 'Head of Growth', trigger: 'Manual' },
      { type: 'sop', ref: 'PRD-003', label: 'Launch setup (course/product)', note: 'Set up Shopify variant + landing page + tracking', executor: 'Commerce Ops', trigger: 'D-10' },
      { type: 'sop', ref: 'CNT-011', label: 'Launch content plan', note: 'Plan 14 ngày × 3 posts/ngày × tease angles', executor: 'Content Strategist', trigger: 'D-10' },
      { type: 'sop', ref: 'CNT-018', label: 'Batch gen tease content', note: 'batch_processor gen tease posts + emails', executor: 'Content Center', trigger: 'D-7' },
      { type: 'sop', ref: 'DST-001', label: 'Schedule tease Meta BS', note: 'Schedule 14 ngày tease posts', executor: 'Social Media Manager', trigger: 'D-7' },
      { type: 'sop', ref: 'MKT-003', label: 'Activate Paid Ads', note: 'FB Ads tease campaign, budget allocation', executor: 'Ads Specialist', trigger: 'D-5' },
      { type: 'action', ref: 'D-DAY', label: 'D-Day launch 🎉', note: 'Mở bán, email blast all segments, ads push', executor: 'Jennie', trigger: 'Manual D-day' },
      { type: 'sop', ref: 'DST-004', label: 'D-day email blast', note: 'Gửi launch email cho all 8 segments', executor: 'Email CRM Manager', trigger: 'D-day 8h' },
      { type: 'sop', ref: 'CNT-025', label: 'D+1..14 follow-up emails', note: 'Nurture sequence 14 ngày cho non-buyers', executor: 'Email CRM Manager', trigger: 'D+1 daily' },
      { type: 'sop', ref: 'MKT-010', label: 'Retargeting unconverted', note: 'FB Ads retargeting pixel visitors chưa mua', executor: 'Growth Hacker', trigger: 'D+3' },
      { type: 'sop', ref: 'ANA-004', label: 'Post-launch cohort analysis', note: 'Cohort buyer vs visitor, funnel breakdown', executor: 'Data Analyst', trigger: 'D+14' },
      { type: 'action', ref: 'RETRO', label: 'Retrospective', note: 'Tổng kết launch, lessons learned vào memory', executor: 'Jennie', trigger: 'D+21' },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // Additional templates (Phase 1.12)
  // ─────────────────────────────────────────────────────────────
  {
    pipeline_id: 'pipe-ceo-morning-brief',
    title: 'CEO Morning Brief — Daily Executive Summary',
    emoji: '☀️',
    category: 'Ops',
    schedule: 'Mỗi sáng 7h',
    description:
      'Tổng hợp tự động cho Jennie: doanh thu 24h, metrics app, tickets mới, lead mới, cảnh báo cron fail, bottleneck pipelines. Gửi Telegram + Email.',
    display_order: 9,
    blocks: [
      { type: 'action', ref: 'CRON-7AM', label: 'Cron trigger 7h sáng', note: 'pg_cron: 0 7 * * *', executor: 'System', trigger: 'Cron 7:00' },
      { type: 'sop', ref: 'ANA-001', label: 'Revenue snapshot 24h', note: 'Query shopify_orders, cc_email_sends, affiliate_commissions', executor: 'Data Analyst', trigger: 'Sau cron' },
      { type: 'sop', ref: 'BGD-001', label: 'CEO Dashboard metrics', note: 'Weekly trend + mục tiêu progress từ goals table', executor: 'Data Analyst', trigger: 'Parallel' },
      { type: 'sop', ref: 'CS-005', label: 'Ticket backlog check', note: 'Pending >24h, escalated, critical tier', executor: 'Customer Success', trigger: 'Parallel' },
      { type: 'sop', ref: 'SAL-006', label: 'New leads last 24h', note: 'Score + top 10 hot leads cần follow-up', executor: 'Sales Closer', trigger: 'Parallel' },
      { type: 'action', ref: 'CRON-HEALTH', label: 'Cron health report', note: 'Query cron_registry tìm fail_count > 0 trong 24h qua', executor: 'System', trigger: 'Parallel' },
      { type: 'sop', ref: 'AI-005', label: 'AI anomaly detection', note: 'Flag bất thường so với avg 7 ngày', executor: 'AI Agent', trigger: 'Sau collect' },
      { type: 'action', ref: 'SEND-TELEGRAM-BRIEF', label: 'Gửi Telegram morning brief', note: 'Format markdown + emoji, ping @jennie', executor: 'System', trigger: 'Sau tổng hợp' },
      { type: 'action', ref: 'SEND-EMAIL-BRIEF', label: 'Gửi email backup', note: 'HTML version gửi jennie@gemral.com', executor: 'System', trigger: 'Parallel' },
    ],
  },
  {
    pipeline_id: 'pipe-ticket-resolution',
    title: 'Customer Support Ticket Resolution (SLA 4h)',
    emoji: '🎫',
    category: 'Ops',
    schedule: 'Event-based — trigger khi ticket tạo',
    description:
      'Pipeline xử lý ticket từ Zalo/FB/Email: classify → assign agent → AI first response → escalate nếu stuck → resolve → NPS survey. SLA 4h cho critical, 24h cho normal.',
    display_order: 10,
    blocks: [
      { type: 'action', ref: 'EVENT-TICKET-CREATED', label: 'Event: crm_tickets insert', note: 'Trigger từ webhook/DB', executor: 'System', trigger: 'DB Trigger' },
      { type: 'sop', ref: 'CS-001', label: 'AI Classify ticket', note: 'Category (billing/technical/refund/feedback), urgency', executor: 'Customer Success', trigger: 'Sau event' },
      { type: 'sop', ref: 'CS-002', label: 'Auto-assign agent', note: 'Match theo category, load balance workload', executor: 'Customer Success', trigger: 'Sau classify' },
      { type: 'sop', ref: 'AI-010', label: 'AI First Response', note: 'Gemma4 generate reply đầu tiên từ KB + history', executor: 'Customer Support Agent', trigger: 'Sau assign' },
      { type: 'approval', ref: 'APPROVAL-AGENT', label: 'Agent review reply', note: 'CS agent approve hoặc edit trước khi gửi', executor: 'Customer Success', trigger: 'Manual' },
      { type: 'action', ref: 'SEND-REPLY', label: 'Gửi reply qua channel', note: 'Zalo Personal / FB Messenger / Email Resend', executor: 'System', trigger: 'Sau approve' },
      { type: 'sop', ref: 'CS-003', label: 'Monitor SLA', note: 'Nếu >4h critical hoặc >24h normal → escalate', executor: 'Customer Success', trigger: 'Cron mỗi 30 phút' },
      { type: 'sop', ref: 'CS-004', label: 'Escalation to Jennie', note: 'Critical + no reply 6h → Telegram ping Jennie', executor: 'Customer Success', trigger: 'Conditional' },
      { type: 'sop', ref: 'CS-006', label: 'Resolve + feedback', note: 'Close ticket + gửi NPS survey', executor: 'Customer Success', trigger: 'Khi resolved' },
    ],
  },
  {
    pipeline_id: 'pipe-scanner-signal-alert',
    title: 'GEM Scanner Signal → Alert → Paper Trade',
    emoji: '📡',
    category: 'Ops',
    schedule: 'Realtime — trigger khi pattern detected',
    description:
      'Khi GEM Scanner phát hiện pattern (Quasimodo, H&S, Flag Limit, Decision Point): validate → score → push alert tới subscribers → auto-create paper trade → track PnL.',
    display_order: 11,
    blocks: [
      { type: 'action', ref: 'EVENT-PATTERN-DETECTED', label: 'Event: pattern detected', note: 'Scanner detects pattern matching criteria', executor: 'System', trigger: 'Realtime' },
      { type: 'sop', ref: 'ANA-002', label: 'Validate pattern quality', note: 'Check confidence score, volume, trend alignment', executor: 'Data Analyst', trigger: 'Sau detect' },
      { type: 'sop', ref: 'ANA-003', label: 'Score trade setup', note: 'R:R ratio, win rate history, correlation check', executor: 'Data Analyst', trigger: 'Sau validate' },
      { type: 'sop', ref: 'CNT-011', label: 'Generate alert content', note: 'Short text + chart image + entry/SL/TP', executor: 'Content Center', trigger: 'Sau score' },
      { type: 'action', ref: 'PUSH-MOBILE', label: 'Push notification mobile app', note: 'Expo Push to Scanner tier users', executor: 'System', trigger: 'Parallel' },
      { type: 'action', ref: 'TELEGRAM-CHANNEL', label: 'Post Telegram channel', note: 'Alert cho public Telegram + VIP group', executor: 'System', trigger: 'Parallel' },
      { type: 'action', ref: 'CREATE-PAPER-TRADE', label: 'Auto-create paper trade', note: 'Insert vào paper_trades với entry+SL+TP', executor: 'System', trigger: 'Sau push' },
      { type: 'sop', ref: 'ANA-002', label: 'Track PnL real-time', note: 'Hook vào paper-trade-monitor cron', executor: 'Data Analyst', trigger: 'Cron 1 phút' },
      { type: 'action', ref: 'CLOSE-TRADE', label: 'Auto-close khi hit SL/TP', note: 'Update status, compute final PnL, notify users', executor: 'System', trigger: 'Event' },
    ],
  },
  {
    pipeline_id: 'pipe-shopify-fulfillment',
    title: 'Shopify Order Fulfillment + Access Grant',
    emoji: '📦',
    category: 'Ops',
    schedule: 'Webhook trigger khi order paid',
    description:
      'Khi user mua khóa học/crystal qua Shopify: verify payment → unlock course access → send welcome → grant CTV tier nếu đủ điều kiện → sync CRM → trigger onboarding pipeline.',
    display_order: 12,
    blocks: [
      { type: 'action', ref: 'WEBHOOK-SHOPIFY-PAID', label: 'Shopify webhook: order paid', note: 'HMAC verify + idempotency check', executor: 'System', trigger: 'Webhook' },
      { type: 'sop', ref: 'COM-007', label: 'Grant course enrollment', note: 'Insert course_enrollments + unlock profiles.course_tier', executor: 'Commerce Ops', trigger: 'Sau verify' },
      { type: 'sop', ref: 'COM-008', label: 'Sync CRM customer', note: 'Upsert crm_customers, link order, update lifetime value', executor: 'Commerce Ops', trigger: 'Parallel' },
      { type: 'sop', ref: 'DST-004', label: 'Send welcome email', note: 'Email template theo course mua + access link', executor: 'Email CRM Manager', trigger: 'Sau grant' },
      { type: 'sop', ref: 'COM-006', label: 'CTV tier check', note: 'Nếu tổng order >= threshold → upgrade ctv_tier', executor: 'Commerce Ops', trigger: 'Parallel' },
      { type: 'action', ref: 'TRIGGER-ONBOARDING', label: 'Trigger onboarding pipeline', note: 'Fan-out tới pipe-onboarding-post-purchase', executor: 'System', trigger: 'Sau welcome' },
      { type: 'action', ref: 'PUSH-MOBILE-WELCOME', label: 'Push "Chào mừng!" mobile', note: 'Welcome notification cho app users', executor: 'System', trigger: 'Parallel' },
      { type: 'sop', ref: 'ANA-001', label: 'Revenue analytics update', note: 'Increment daily_revenue cache', executor: 'Data Analyst', trigger: 'Parallel' },
    ],
  },
  {
    pipeline_id: 'pipe-weekly-revenue-report',
    title: 'Weekly Revenue Report (Monday Morning)',
    emoji: '📊',
    category: 'Ops',
    schedule: 'Mỗi thứ 2 lúc 8h sáng',
    description:
      'Báo cáo doanh thu tuần qua cho Jennie + board: breakdown theo product, channel, segment; top CTV earners; refund rate; next week forecast.',
    display_order: 13,
    blocks: [
      { type: 'action', ref: 'CRON-MONDAY-8AM', label: 'Cron: 0 8 * * 1', note: 'Monday 8:00 AM', executor: 'System', trigger: 'Cron' },
      { type: 'sop', ref: 'ANA-001', label: 'Aggregate week revenue', note: 'SUM shopify_orders 7 ngày qua', executor: 'Data Analyst', trigger: 'Sau cron' },
      { type: 'sop', ref: 'ANA-003', label: 'Funnel conversion analysis', note: 'Leads → Qualified → Closed per channel', executor: 'Data Analyst', trigger: 'Parallel' },
      { type: 'sop', ref: 'ANA-004', label: 'Cohort retention analysis', note: 'New vs returning buyers breakdown', executor: 'Data Analyst', trigger: 'Parallel' },
      { type: 'sop', ref: 'AFF-003', label: 'Top CTV performers', note: 'Top 10 affiliates theo commission', executor: 'Data Analyst', trigger: 'Parallel' },
      { type: 'sop', ref: 'AI-005', label: 'AI forecast next week', note: 'Gemma4 predict dựa trên trend + seasonality', executor: 'AI Agent', trigger: 'Sau aggregate' },
      { type: 'action', ref: 'GENERATE-REPORT-PDF', label: 'Generate PDF report', note: 'HTML → PDF với charts từ Chart.js', executor: 'System', trigger: 'Sau analysis' },
      { type: 'action', ref: 'SEND-EMAIL-BOARD', label: 'Email board members', note: 'Attach PDF + executive summary text', executor: 'System', trigger: 'Sau generate' },
      { type: 'action', ref: 'TELEGRAM-HIGHLIGHTS', label: 'Telegram top 3 highlights', note: 'Ping @jennie với 3 insight quan trọng nhất', executor: 'System', trigger: 'Parallel' },
    ],
  },
  {
    pipeline_id: 'pipe-fb-ads-campaign',
    title: 'Facebook Ads Campaign Launch & Monitor',
    emoji: '📣',
    category: 'Marketing',
    schedule: 'Manual trigger — khi ra campaign mới',
    description:
      'Setup FB Ads campaign từ brief → creatives → audience → launch → monitor CPM/CTR/CPA → pause nếu kém → optimize → report.',
    display_order: 14,
    blocks: [
      { type: 'action', ref: 'CAMPAIGN-BRIEF', label: 'Campaign brief intake', note: 'Jennie hoặc Growth submit brief: objective, budget, audience', executor: 'Head of Growth', trigger: 'Manual' },
      { type: 'sop', ref: 'MKT-003', label: 'Creative generation', note: 'Gen image + copy variants (A/B/C) qua AI', executor: 'Ads Specialist', trigger: 'Sau brief' },
      { type: 'approval', ref: 'APPROVAL-JENNIE', label: 'Jennie approve creatives', note: 'Review text + hình + CTA', executor: 'Jennie', trigger: 'Manual' },
      { type: 'sop', ref: 'MKT-004', label: 'Audience build', note: 'Lookalike từ existing buyers + interest targeting', executor: 'Ads Specialist', trigger: 'Parallel' },
      { type: 'action', ref: 'FB-API-LAUNCH', label: 'Launch campaign qua FB Marketing API', note: 'Create campaign + ad set + ads', executor: 'System', trigger: 'Sau approve' },
      { type: 'sop', ref: 'ANA-003', label: 'Daily CPM/CTR/CPA monitor', note: 'Fetch insights, compute ratios', executor: 'Data Analyst', trigger: 'Cron daily' },
      { type: 'sop', ref: 'MKT-010', label: 'Auto-pause underperformers', note: 'Nếu CPA > 2× target → pause ad set', executor: 'Ads Specialist', trigger: 'Cron daily' },
      { type: 'sop', ref: 'MKT-003', label: 'Winner scale-up', note: 'Top ad set → tăng budget 20% mỗi 3 ngày', executor: 'Ads Specialist', trigger: 'Cron every 3d' },
      { type: 'sop', ref: 'ANA-004', label: 'Attribution report', note: 'Match FB clicks với Shopify orders', executor: 'Data Analyst', trigger: 'Cron weekly' },
      { type: 'action', ref: 'FINAL-REPORT', label: 'End-of-campaign report', note: 'ROAS, best creative, learnings → memory', executor: 'Head of Growth', trigger: 'Manual end' },
    ],
  },
];

/**
 * Seed all 8 templates into gem_pipelines. Idempotent — upserts by pipeline_id.
 * Only sets is_template=true so users' cloned copies (is_template=false) are
 * left untouched on re-seed.
 */
export async function seedPipelineTemplates(): Promise<{ seeded: number; errors: string[] }> {
  const errors: string[] = [];
  let seeded = 0;
  for (const tpl of PIPELINE_TEMPLATES) {
    const row = {
      pipeline_id: tpl.pipeline_id,
      title: tpl.title,
      emoji: tpl.emoji,
      category: tpl.category,
      schedule: tpl.schedule,
      description: tpl.description,
      blocks: tpl.blocks,
      is_template: true,
      display_order: tpl.display_order,
      enabled: true,
      created_by: 'paperclip_startup',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('gem_pipelines')
      .upsert(row, { onConflict: 'pipeline_id' });
    if (error) {
      errors.push(`${tpl.pipeline_id}: ${error.message}`);
    } else {
      seeded++;
    }
  }
  return { seeded, errors };
}
