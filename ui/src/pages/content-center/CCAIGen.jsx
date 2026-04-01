import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  StopCircle,
  Clock,
  FileText,
  ChevronDown,
  CheckCircle2,
  Circle,
  ImageIcon,
  Hash,
  Send,
  Edit3,
  Check,
  Share2,
  Upload,
  X,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  BookOpen,
  Newspaper,
  Globe,
  CalendarPlus,
  MessageSquare,
  Timer,
  Tag,
  Mail,
  Eye,
  EyeOff,
  Code,
  Smartphone,
  Plus,
  Minus,
  ChevronRight,
  Columns,
  Square,
  Layout,
  Type,
  GripVertical,
  Layers,
  Mic,
} from 'lucide-react';
import { Card } from '@gem/ui';
import { Select } from '@gem/ui';
import { Textarea } from '@gem/ui';
import { Button } from '@gem/ui';
import { Badge } from '@gem/ui';
import { ProgressBar } from '@gem/ui';
import { useToast } from '@gem/ui';
import {
  claudeService,
  brandVoiceChecker,
  vietnameseNLP,
} from '@gem/services';
import { useCreateScript, useCreateSocialPost } from '@gem/hooks/useQueryHooks';
import { useJobSubscription } from '@gem/hooks/useJobSubscription';
import CCSelect from './CCSelect';
import ContentPlannerSidebar from './ContentPlannerSidebar';

// ============================================================================
// Constants — Loại nội dung
// ============================================================================

const OUTPUT_TYPE_OPTIONS = [
  { value: 'script_latc', label: 'Kịch Bản LATC', jobType: 'script', contentType: 'latc' },
  { value: 'script_tmt', label: 'Kịch Bản Thầy Minh Tuệ', jobType: 'script', contentType: 'tmt' },
  { value: 'script_short_clip', label: 'Kịch Bản Clip Ngắn (30-70s)', jobType: 'script', contentType: 'short_clip' },
  { value: 'title_latc', label: 'Tiêu Đề & Thumbnail LATC', jobType: 'title', contentType: 'latc' },
  { value: 'title_tmt', label: 'Tiêu Đề & Thumbnail TMT', jobType: 'title', contentType: 'tmt' },
  { value: 'social_post', label: 'Bài Đăng Mạng Xã Hội', jobType: 'social_post', contentType: 'social_post' },
  { value: 'banner_content', label: 'Nội Dung Banner App', jobType: 'banner', contentType: 'banner' },
  { value: 'push_notification', label: 'Push Notification Hàng Ngày', jobType: 'push_notification', contentType: 'push_notification' },
  { value: 'inapp_story', label: 'In-App Story / Carousel', jobType: 'inapp_story', contentType: 'inapp_story' },
  { value: 'sms_marketing', label: 'SMS Marketing', jobType: 'sms', contentType: 'sms' },
  { value: 'chatbot_script', label: 'Chatbot Script Templates', jobType: 'chatbot_script', contentType: 'chatbot_script' },
  { value: 'news_article', label: 'Bài Tin Tức / Blog SEO', jobType: 'news', contentType: 'news' },
  { value: 'email_html', label: 'Email Marketing HTML', jobType: 'email', contentType: 'email' },
  { value: 'content_planner', label: 'Content Planner (Lịch Nội Dung)', jobType: 'content_planner', contentType: 'content_planner' },
];

// ============================================================================
// Constants — Tin Tức category options
// ============================================================================

const NEWS_CATEGORY_OPTIONS = [
  { value: 'crypto_market', label: 'Tin Thị Trường Crypto & Blockchain' },
  { value: 'finance', label: 'Tin Tài Chính & Đầu Tư' },
  { value: 'saas_enterprise', label: 'Giải Pháp Gemral Cho Doanh Nghiệp' },
  { value: 'ai_tech', label: 'AI & Công Nghệ Mới' },
  { value: 'gemral_product', label: 'Gemral Product Updates' },
];

const NEWS_FORMAT_OPTIONS = [
  { value: 'news_analysis', label: 'Phân Tích Chuyên Sâu' },
  { value: 'news_brief', label: 'Tin Ngắn (300-500 từ)' },
  { value: 'news_longform', label: 'Bài Dài SEO (1500-3000 từ)' },
  { value: 'news_listicle', label: 'Danh Sách / Listicle' },
  { value: 'news_howto', label: 'Hướng Dẫn / How-To' },
];

// ============================================================================
// Constants — Email Marketing
// ============================================================================

const EMAIL_TYPE_OPTIONS = [
  { value: 'newsletter', label: 'Newsletter (Bản tin hàng tuần)' },
  { value: 'product_launch', label: 'Ra mắt sản phẩm / Tính năng mới' },
  { value: 'promotion', label: 'Khuyến mãi / Ưu đãi' },
  { value: 'welcome', label: 'Email chào mừng (Welcome Series)' },
  { value: 'event', label: 'Sự kiện / Workshop / Webinar' },
  { value: 'educational', label: 'Nội dung giáo dục / Tips' },
  { value: 'reengagement', label: 'Win-back / Tái kích hoạt' },
  { value: 'tier_upgrade', label: 'Nâng cấp Tier / Upsell' },
  { value: 'course_enrollment', label: 'Mời đăng ký Khóa học' },
  { value: 'onboarding_series', label: 'Onboarding (Chuỗi hướng dẫn user mới)' },
  { value: 'milestone', label: 'Milestone / Chúc mừng thành tích' },
  { value: 'survey_feedback', label: 'Khảo sát / Thu thập phản hồi' },
  { value: 'cart_abandonment', label: 'Nhắc thanh toán / Giỏ hàng bỏ quên' },
  { value: 'referral', label: 'Giới thiệu bạn bè / Affiliate' },
  { value: 'seasonal', label: 'Theo mùa (Tết, Valentine, Trung Thu...)' },
  { value: 'weekly_digest', label: 'Weekly Digest (Tổng hợp tuần)' },
  { value: 'personal_note', label: 'Thư cá nhân từ Jennie' },
];

// ============================================================================
// Email Toolbox — Draggable components for email builder
// ============================================================================

const EMAIL_TOOLBOX_CATEGORIES = [
  {
    id: 'placeholders',
    label: 'Placeholder Hình Ảnh',
    icon: ImageIcon,
    collapsed: false,
    items: [
      {
        id: 'hero-image',
        label: 'Hero Banner (600×300)',
        icon: Layout,
        description: 'Banner chính đầu email',
        html: `<tr><td align="center" style="padding:0;"><img src="https://placehold.co/600x300/112250/FFBD59?text=Hero+Banner" alt="Hero banner" width="600" style="max-width:100%;height:auto;display:block;" /></td></tr>`,
      },
      {
        id: 'content-image',
        label: 'Hình Nội Dung (560×280)',
        icon: ImageIcon,
        description: 'Hình minh họa trong body',
        html: `<tr><td align="center" style="padding:16px 20px;"><img src="https://placehold.co/560x280/112250/FFBD59?text=Content+Image" alt="Hình minh họa" width="560" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></td></tr>`,
      },
      {
        id: 'square-image',
        label: 'Hình Vuông (400×400)',
        icon: Square,
        description: 'Hình vuông cho sản phẩm',
        html: `<tr><td align="center" style="padding:16px 20px;"><img src="https://placehold.co/400x400/112250/FFBD59?text=Product" alt="Sản phẩm" width="400" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></td></tr>`,
      },
    ],
  },
  {
    id: 'components',
    label: 'Thành Phần Email',
    icon: Layers,
    collapsed: false,
    items: [
      {
        id: 'cta-button',
        label: 'Nút CTA (Gold)',
        icon: Zap,
        description: 'Nút hành động chính',
        html: `<tr><td align="center" style="padding:24px 20px;"><table cellpadding="0" cellspacing="0" align="center"><tr><td style="background-color:#FFBD59;padding:14px 32px;border-radius:8px;"><a href="#" style="color:#112250;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">Hành Động Ngay</a></td></tr></table></td></tr>`,
      },
      {
        id: 'cta-purple',
        label: 'Nút CTA (Purple)',
        icon: Zap,
        description: 'Nút hành động phụ',
        html: `<tr><td align="center" style="padding:24px 20px;"><table cellpadding="0" cellspacing="0" align="center"><tr><td style="background-color:#6A5BFF;padding:14px 32px;border-radius:8px;"><a href="#" style="color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">Tìm Hiểu Thêm</a></td></tr></table></td></tr>`,
      },
      {
        id: 'divider',
        label: 'Đường Kẻ Ngăn Cách',
        icon: Minus,
        description: 'Divider line',
        html: `<tr><td style="padding:16px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid rgba(255,255,255,0.1);"></td></tr></table></td></tr>`,
      },
      {
        id: 'spacer',
        label: 'Khoảng Cách (24px)',
        icon: Square,
        description: 'Khoảng trống giữa các phần',
        html: `<tr><td style="height:24px;line-height:24px;font-size:1px;">&nbsp;</td></tr>`,
      },
      {
        id: 'text-section',
        label: 'Đoạn Văn Bản',
        icon: Type,
        description: 'Khối text nội dung',
        html: `<tr><td style="padding:8px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;color:#1A1A2E;">Nội dung văn bản của bạn ở đây. Chỉnh sửa trong HTML Source.</td></tr>`,
      },
      {
        id: 'heading',
        label: 'Tiêu Đề',
        icon: Type,
        description: 'Heading lớn',
        html: `<tr><td style="padding:16px 20px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:700;color:#112250;">Tiêu đề section</td></tr>`,
      },
      {
        id: 'two-column',
        label: '2 Cột Nội Dung',
        icon: Columns,
        description: 'Layout 2 cột',
        html: `<tr><td style="padding:16px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48%" valign="top" style="padding-right:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong style="color:#112250;">Cột trái</strong><br/>Nội dung cột trái</td><td width="4%"></td><td width="48%" valign="top" style="padding-left:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong style="color:#112250;">Cột phải</strong><br/>Nội dung cột phải</td></tr></table></td></tr>`,
      },
      {
        id: 'feature-list',
        label: 'Danh Sách Tính Năng',
        icon: CheckCircle,
        description: 'List với checkmark',
        html: `<tr><td style="padding:8px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:2;color:#1A1A2E;">✅ Tính năng 1 — Mô tả ngắn<br/>✅ Tính năng 2 — Mô tả ngắn<br/>✅ Tính năng 3 — Mô tả ngắn</td></tr>`,
      },
      {
        id: 'highlight-box',
        label: 'Hộp Nổi Bật',
        icon: AlertTriangle,
        description: 'Box highlight với background',
        html: `<tr><td style="padding:8px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#FFF8E1;border-left:4px solid #FFBD59;padding:16px 20px;border-radius:0 8px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong style="color:#112250;">Lưu ý:</strong> Nội dung quan trọng cần nhấn mạnh ở đây.</td></tr></table></td></tr>`,
      },
      {
        id: 'social-icons',
        label: 'Social Media Icons',
        icon: Share2,
        description: 'Dãy icon mạng xã hội',
        html: `<tr><td align="center" style="padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;"><a href="#" style="color:#6A5BFF;text-decoration:none;margin:0 8px;">Facebook</a> · <a href="#" style="color:#6A5BFF;text-decoration:none;margin:0 8px;">Instagram</a> · <a href="#" style="color:#6A5BFF;text-decoration:none;margin:0 8px;">YouTube</a> · <a href="#" style="color:#6A5BFF;text-decoration:none;margin:0 8px;">TikTok</a></td></tr>`,
      },
    ],
  },
];

// Sub-topics cho từng news category — hiện checkbox khi chọn category tương ứng
const NEWS_SUBTOPIC_OPTIONS = {
  saas_enterprise: [
    { value: 'fnb', label: 'F&B (Nhà hàng, Quán ăn, Café)' },
    { value: 'clinic', label: 'Clinic (Phòng khám, Nha khoa, Chuyên khoa)' },
    { value: 'proptech', label: 'PropTech (Cho thuê nhà, Căn hộ DV, Văn phòng)' },
    { value: 'education', label: 'Education (Trung tâm ngoại ngữ, Kỹ năng, Gia sư)' },
    { value: 'spa_salon', label: 'Spa & Salon (Spa, Tóc, Nail, Làm đẹp)' },
    { value: 'contech', label: 'ConTech (Nhà thầu, Xây dựng)' },
    { value: 'agritech', label: 'AgriTech (Nông trại, HTX, Chuỗi thực phẩm)' },
    { value: 'logistics', label: 'Logistics (Vận chuyển, Kho bãi, Phân phối)' },
  ],
  crypto_market: [
    { value: 'bitcoin_macro', label: 'Bitcoin & Kinh tế Vĩ mô' },
    { value: 'altcoin_defi', label: 'Altcoin & DeFi' },
    { value: 'regulation', label: 'Pháp lý & Quy định Crypto' },
    { value: 'nft_gamefi', label: 'NFT & GameFi' },
  ],
  finance: [
    { value: 'stock_market', label: 'Thị trường Chứng khoán VN' },
    { value: 'personal_finance', label: 'Tài chính Cá nhân & Tiết kiệm' },
    { value: 'startup_funding', label: 'Startup & Gọi vốn' },
  ],
};

// ============================================================================
// Gemral Industry Knowledge — Kiến thức ngành cho AI prompt
// ============================================================================
const GEMRAL_INDUSTRY_KNOWLEDGE = {
  fnb: {
    name: 'F&B (Nhà hàng, Quán ăn, Café)',
    painPoints: [
      'Bếp lộn xộn, order sai, khách chờ lâu',
      'Không biết món nào lãi, món nào lỗ',
      'Nhân viên nghỉ không báo trước, ca kíp rối',
      'Nguyên liệu hết mà không biết, thất thoát kho',
      'Khách quen không quay lại, không có cách giữ chân',
    ],
    blocks: ['Thực đơn số', 'QR order tại bàn', 'Thu ngân thông minh', 'Màn hình bếp', 'Bán đa kênh', 'Quản lý kho nguyên liệu', 'Chăm sóc khách hàng', 'Hóa đơn tự động'],
    killerFeature: 'Điều phối bếp thông minh',
    killerDesc: 'Thay thế người tiếp thực — tự chia order cho từng bếp, ưu tiên món theo thời gian, hiển thị trên màn hình bếp để đầu bếp chỉ việc nấu',
    seoKeywords: ['quản lý nhà hàng', 'phần mềm quán cafe', 'order bàn QR', 'quản lý bếp', 'tối ưu nhà hàng'],
    transformation: 'Từ quán ăn ghi sổ tay, bếp hét order → nhà hàng vận hành mượt, khách không phải chờ, chủ ngồi đâu cũng biết bán được bao nhiêu',
  },
  clinic: {
    name: 'Phòng khám, Nha khoa, Chuyên khoa',
    painPoints: [
      'Bệnh nhân chờ đợi quá lâu, xếp hàng lộn xộn',
      'Hồ sơ bệnh án giấy, tìm kiếm mất thời gian',
      'Lịch hẹn chồng chéo, bác sĩ quá tải',
      'Quản lý thuốc/vật tư tồn kho phức tạp',
      'Không theo dõi được lộ trình điều trị bệnh nhân',
    ],
    blocks: ['Đặt lịch hẹn', 'Quản lý bệnh nhân', 'Hóa đơn & thanh toán', 'Quản lý thuốc/vật tư', 'Quản lý nhân sự'],
    killerFeature: 'Tối ưu luồng bệnh nhân',
    killerDesc: 'Hàng đợi thông minh — tự sắp xếp bệnh nhân theo mức độ ưu tiên, thời gian chờ, phòng trống, bác sĩ rảnh. Bệnh nhân biết chính xác khi nào đến lượt qua điện thoại.',
    seoKeywords: ['quản lý phòng khám', 'phần mềm nha khoa', 'đặt lịch khám online', 'quản lý bệnh nhân', 'phòng khám thông minh'],
    transformation: 'Từ phòng khám đông nghẹt, bệnh nhân chờ 2 tiếng → phòng khám trật tự, bệnh nhân đúng giờ, bác sĩ tập trung khám thay vì lo hành chính',
  },
  proptech: {
    name: 'Cho thuê nhà, Căn hộ DV, Văn phòng',
    painPoints: [
      'Thu tiền thuê mỗi tháng phải nhắc từng người',
      'Điện nước phải đi đọc đồng hồ rồi tính tay',
      'Hợp đồng giấy, gia hạn quên, tranh chấp',
      'Không biết phòng nào trống, khách nào sắp hết hạn',
      'Sửa chữa bảo trì không ai theo dõi',
    ],
    blocks: ['Quản lý khách thuê', 'Hóa đơn tự động', 'QR đọc đồng hồ', 'Quản lý nhân viên'],
    killerFeature: 'Tự động hóa tiện ích',
    killerDesc: 'Đồng hồ điện nước được đọc tự động qua QR hoặc thiết bị thông minh — hóa đơn tự tính, tự gửi cho khách thuê, tự nhắc thanh toán. Chủ nhà không cần đi gõ cửa thu tiền.',
    seoKeywords: ['quản lý cho thuê nhà', 'quản lý căn hộ dịch vụ', 'phần mềm quản lý tòa nhà', 'thu tiền thuê tự động', 'quản lý phòng trọ'],
    transformation: 'Từ chủ nhà đi gõ cửa thu tiền, ghi sổ điện nước → ngồi một chỗ, tiền tự về tài khoản, điện nước tự tính, hợp đồng tự nhắc gia hạn',
  },
  education: {
    name: 'Trung tâm ngoại ngữ, Kỹ năng, Gia sư',
    painPoints: [
      'Học viên bỏ học giữa chừng không biết lý do',
      'Quản lý lịch dạy, phòng học, giáo viên rối rắm',
      'Thu học phí trễ, nhắc nhở mệt mỏi',
      'Không đo lường được kết quả học tập thực tế',
      'Phụ huynh muốn biết con học đến đâu mà không có báo cáo',
    ],
    blocks: ['Đặt lịch/xếp lớp', 'Danh mục khóa học', 'Thu ngân', 'Quản lý học viên', 'Hóa đơn & học phí'],
    killerFeature: 'Theo dõi kết quả học tập',
    killerDesc: 'Cây kỹ năng trực quan cho từng học viên — phụ huynh và giáo viên thấy rõ tiến bộ. Hệ thống dự đoán học viên nào có nguy cơ bỏ học để can thiệp sớm.',
    seoKeywords: ['quản lý trung tâm ngoại ngữ', 'phần mềm trung tâm đào tạo', 'quản lý học viên', 'thu học phí online', 'quản lý gia sư'],
    transformation: 'Từ trung tâm gọi điện nhắc học phí, không biết học viên tiến bộ ra sao → phụ huynh tự xem tiến độ, học phí tự thu, học viên gắn bó lâu hơn',
  },
  spa_salon: {
    name: 'Spa, Tóc, Nail, Làm đẹp',
    painPoints: [
      'Khách muốn đúng thợ quen mà không đặt được',
      'Lịch hẹn chồng chéo, thợ ngồi chờ hoặc quá tải',
      'Không biết khách nào VIP, khách nào lâu không quay lại',
      'Khuyến mãi gửi đại, không đúng người đúng lúc',
      'Doanh thu theo thợ không rõ ràng, hoa hồng tính tay',
    ],
    blocks: ['Đặt lịch hẹn', 'Danh mục dịch vụ', 'Thu ngân', 'Quản lý khách hàng', 'Hóa đơn', 'Chương trình thân thiết'],
    killerFeature: 'Ghép thợ thông minh',
    killerDesc: 'Tự gợi ý thợ phù hợp nhất cho từng khách — dựa trên kỹ năng thợ, lịch sử phục vụ, sở thích khách. Khách quen luôn được thợ quen, khách mới được thợ giỏi nhất.',
    seoKeywords: ['quản lý spa', 'phần mềm salon tóc', 'đặt lịch spa online', 'quản lý tiệm nail', 'phần mềm làm đẹp'],
    transformation: 'Từ tiệm gọi điện nhắc lịch, ghi sổ tay ai làm gì → khách tự đặt lịch đúng thợ quen, thợ biết trước khách thích gì, doanh thu tăng vì khách quay lại nhiều hơn',
  },
  contech: {
    name: 'Nhà thầu, Xây dựng',
    painPoints: [
      'Vật tư mua thừa, mua thiếu, tính nhầm khối lượng',
      'Công nhân đi làm không chấm công, khai khống',
      'Dự toán ban đầu luôn vượt ngân sách thực tế',
      'Tiến độ công trình không ai nắm rõ, báo cáo bằng miệng',
      'Chủ đầu tư hỏi tiến độ mà không có gì để trình bày',
    ],
    blocks: ['Quản lý vật tư', 'Quản lý nhân công', 'Báo cáo tiến độ', 'Quy trình nghiệm thu', 'Hóa đơn & thanh toán'],
    killerFeature: 'Phát hiện chênh lệch vật tư',
    killerDesc: 'So sánh tự động giữa vật tư dự toán và vật tư thực xuất — phát hiện ngay chỗ nào đang hao hụt bất thường, chỗ nào mua thừa, hướng tới không lãng phí.',
    seoKeywords: ['quản lý công trình', 'phần mềm nhà thầu', 'quản lý xây dựng', 'quản lý vật tư xây dựng', 'tiến độ công trình'],
    transformation: 'Từ công trình vượt ngân sách, vật tư thất thoát không biết → biết chính xác từng viên gạch đi đâu, tiến độ rõ ràng, chủ đầu tư tin tưởng',
  },
  agritech: {
    name: 'Nông trại, HTX, Chuỗi thực phẩm',
    painPoints: [
      'Không truy xuất được nguồn gốc sản phẩm',
      'Khách hàng, siêu thị yêu cầu chứng nhận mà không có hệ thống',
      'Mùa vụ bấp bênh, không biết lúc nào thu hoạch bao nhiêu',
      'Phân phối lộn xộn, hàng tồn hỏng, lãng phí',
      'Muốn bán trực tiếp cho người tiêu dùng mà không có kênh',
    ],
    blocks: ['Quản lý kho', 'Mã QR truy xuất', 'Cảm biến thông minh', 'Sàn phân phối', 'Hóa đơn'],
    killerFeature: 'Truy xuất từ nông trại đến bàn ăn',
    killerDesc: 'Mỗi sản phẩm có mã QR — người mua quét là biết trồng ở đâu, thu hoạch ngày nào, vận chuyển ra sao. Minh bạch tuyệt đối, giá bán cao hơn, siêu thị tin tưởng.',
    seoKeywords: ['quản lý nông trại', 'truy xuất nguồn gốc', 'phần mềm HTX', 'nông nghiệp thông minh', 'chuỗi thực phẩm sạch'],
    transformation: 'Từ nông trại bán cho thương lái giá rẻ, không ai biết sản phẩm từ đâu → bán trực tiếp, giá cao hơn, khách hàng quét QR thấy cả hành trình sản phẩm',
  },
  logistics: {
    name: 'Vận chuyển, Kho bãi, Phân phối',
    painPoints: [
      'Xe chạy lòng vòng, tốn xăng, giao trễ',
      'Kho hàng không biết cái gì ở đâu, kiểm kê mất cả ngày',
      'Khách hàng gọi hỏi "hàng tôi đến đâu rồi" mà không trả lời được',
      'Tài xế giao sai, giao thiếu, không ai chịu trách nhiệm',
      'Đơn hàng tăng nhưng không dám nhận vì sợ không kham nổi',
    ],
    blocks: ['Quản lý kho', 'Quản lý khách hàng', 'Quy trình vận chuyển', 'Quản lý tài xế', 'Sàn kết nối'],
    killerFeature: 'Tối ưu tuyến đường',
    killerDesc: 'Tự tính tuyến đường ngắn nhất, gom đơn cùng khu vực, theo dõi vị trí xe thời gian thực. Khách hàng tự xem hàng đến đâu, không cần gọi hỏi.',
    seoKeywords: ['quản lý vận chuyển', 'phần mềm logistics', 'tối ưu giao hàng', 'quản lý kho bãi', 'theo dõi đơn hàng'],
    transformation: 'Từ giao hàng chạy lòng vòng, khách gọi hỏi liên tục → giao đúng giờ, tiết kiệm xăng, khách tự theo dõi đơn, dám nhận thêm đơn vì hệ thống kham được',
  },
};

// Combined AI Model selector — provider is derived from value
const AI_MODEL_COMBINED_OPTIONS = [
  { value: 'gemini|gemini-2.5-pro', label: '✨ Gemini 2.5 Pro (miễn phí)' },
  { value: 'gemini|gemini-2.5-flash', label: '✨ Gemini 2.5 Flash (miễn phí)' },
  { value: 'gemini|gemini-3.1-pro', label: '✨ Gemini 3.1 Pro (Experimental)' },
  { value: 'gemini|gemini-3-flash', label: '✨ Gemini 3 Flash (Experimental)' },
  { value: 'openai|cx/gpt-5.4', label: '🤖 GPT-5.4 (9Router)' },
  { value: 'openai|cx/gpt-4.1', label: '🤖 GPT-4.1 (9Router)' },
  { value: 'openai|cx/o4-mini', label: '🤖 o4-mini (9Router)' },
  { value: 'claude|sonnet', label: '⚡ Claude Sonnet 4.6 (local)' },
  { value: 'claude|opus', label: '⚡ Claude Opus 4.6 (local)' },
];

// Helper to parse combined value
function parseAiModelValue(combined) {
  const [provider, model] = (combined || 'gemini|gemini-2.5-pro').split('|');
  return { provider, model };
}

// Legacy compat — keep these for code that still references them
const AI_PROVIDER_OPTIONS = [
  { value: 'claude', label: '⚡ Claude Code (local)' },
  { value: 'gemini', label: '✨ Gemini CLI (local — miễn phí)' },
  { value: 'openai', label: '🤖 OpenAI / GPT (9Router)' },
];
const AI_MODEL_OPTIONS = {
  claude: [{ value: 'sonnet', label: 'Claude Sonnet 4.6' }, { value: 'opus', label: 'Claude Opus 4.6' }],
  gemini: [{ value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }, { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' }, { value: 'gemini-3-flash', label: 'Gemini 3 Flash' }],
  openai: [{ value: 'cx/gpt-5.4', label: 'GPT-5.4' }, { value: 'cx/gpt-4.1', label: 'GPT-4.1' }, { value: 'cx/o4-mini', label: 'o4-mini' }],
};

// ============================================================================
// Constants — Tùy chỉnh nâng cao
// ============================================================================

const PERSONA_OPTIONS = [
  { value: 'auto', label: 'Tự động' },
  { value: 'jennie_mentor', label: 'Mentor — Người dẫn đường' },
  { value: 'jennie_provocateur', label: 'Provocateur — Thách thức tư duy' },
  { value: 'jennie_storyteller', label: 'Storyteller — Kể chuyện cuốn hút' },
  { value: 'jennie_analyst', label: 'Analyst — Phân tích dữ liệu' },
  { value: 'jennie_motivator', label: 'Motivator — Truyền năng lượng' },
  { value: 'jennie_educator', label: 'Educator — Giáo dục hệ thống' },
  { value: 'jennie_confidante', label: 'Confidante — Tâm sự gần gũi' },
];

const WRITING_MODE_OPTIONS = [
  { value: 'auto', label: 'Tự động' },
  { value: 'mode_1_calm', label: 'MODE 1 — Trầm - Tĩnh - Thủ Thỉ' },
  { value: 'mode_2_provocative', label: 'MODE 2 — Đanh - Thép - Provocative' },
];

const PRODUCT_HOOK_OPTIONS = [
  { value: 'none', label: 'Không có' },
  { value: 'app_download', label: 'Tải App Gemral' },
  { value: 'gem_scanner', label: 'GEM Scanner' },
  { value: 'vision_board', label: 'Vision Board' },
  { value: '7_ngay_tai_tao', label: '7 Ngày Tái Tạo Tư Duy' },
  { value: 'latc_money', label: 'LATC Money' },
  { value: 'tan_so_tinh_yeu', label: 'Kích Hoạt Tần Số Tình Yêu' },
  { value: 'master_ai', label: 'GEM Master Sư Phụ' },
];

// ============================================================================
// Constants — Clip Ngắn: Template chủ đề & Tính năng App
// ============================================================================

const CLIP_TEMPLATE_OPTIONS = [
  { value: 'app_feature', label: 'Tính năng App Gemral' },
  { value: 'course', label: 'Khóa học GEM' },
  { value: 'provocative', label: 'Provocative Contrast (Viral)' },
  { value: 'custom', label: 'Chủ đề tùy chỉnh' },
];

const APP_FEATURE_OPTIONS = [
  { value: 'tarot', label: 'Tarot (3 Lá / Tình Yêu / Trading)' },
  { value: 'kinh_dich', label: 'Kinh Dịch (64 Quẻ)' },
  { value: 'gem_master', label: 'GEM Master Sư Phụ (AI 24/7)' },
  { value: 'vision_board', label: 'Vision Board & Thư Gửi Vũ Trụ' },
  { value: 'ritual', label: 'Nghi Thức (Thở, Biết Ơn, Chữa Lành)' },
  { value: 'gem_scanner', label: 'GEM Scanner (Quét 400+ Coins)' },
];

const COURSE_OPTIONS = [
  { value: '7_ngay', label: '7 Ngày Khai Mở Tần Số Gốc (1.99tr)' },
  { value: 'tinh_yeu', label: 'Kích Hoạt Tần Số Tình Yêu (399K)' },
  { value: 'trieu_phu', label: 'Tái Tạo Tư Duy Triệu Phú 49 Ngày (499K)' },
  { value: 'starter', label: 'Gói Khởi Đầu Trading (299K)' },
  { value: 'tier_1', label: 'Gói Chuyên Nghiệp TIER 1 (11tr)' },
  { value: 'tier_2', label: 'Gói Nâng Cao TIER 2 (21tr)' },
  { value: 'tier_3', label: 'Gói Cao Cấp TIER 3 (68tr)' },
];

const CLIP_CTA_OPTIONS = [
  { value: 'subtle', label: 'Khéo léo — Không nói giá (cho Video/Clip)' },
  { value: 'classic', label: 'Classic — Có giá + Social Proof (cho Bài viết)' },
];

// ============================================================================
// Constants — Bài Đăng MXH: Nền tảng & Loại chiến dịch
// ============================================================================

const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_community', label: 'YouTube Community' },
  { value: 'threads', label: 'Threads' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const SOCIAL_TOPIC_OPTIONS = [
  { value: 'app_features', label: '📱 Tính năng App GEMRAL' },
  { value: 'trading_mindset', label: '🧠 Trading Mindset — Tâm lý & Kỷ luật' },
  { value: 'market_daily', label: '📊 Thị Trường Daily Brief — Tình hình nổi bật trong ngày' },
  { value: 'spiritual', label: '🔮 Tâm Linh & Huyền Học' },
  { value: 'self_development', label: '🚀 Phát Triển Bản Thân & Productivity' },
  { value: 'success_stories', label: '🏆 Success Stories & Testimonials' },
  { value: 'faq_tips', label: '❓ FAQ & Tips Nhanh' },
  { value: 'behind_scenes', label: '🎬 Behind The Scenes' },
  { value: 'weekly_recap', label: '📈 Tuần/Tháng Recap — Thống kê & Highlight' },
  { value: 'courses', label: '🎓 Khóa học GEM Academy' },
  { value: 'gem_packs', label: '💎 GEM Packs & Pricing' },
  { value: 'community', label: '👥 Xây dựng Cộng Đồng' },
  { value: 'custom', label: '✏️ Tùy chỉnh (nhập chủ đề)' },
];

const SOCIAL_APP_FEATURE_OPTIONS = [
  { value: 'scanner', label: '📊 GEM Scanner — Quét tín hiệu giao dịch (Free/Pro ₫997K/Premium ₫1.997K/VIP ₫5.997K)' },
  { value: 'vision_board', label: '🎯 Vision Board — Bảng mục tiêu cuộc sống (Goals, Habits, Affirmations)' },
  { value: 'chatbot_master', label: '🤖 GEM Master Sư Phụ AI — Chatbot tư vấn Trading + Tâm linh 24/7 (Free/Pro ₫39K/Premium ₫59K/VIP ₫99K)' },
  { value: 'ritual', label: '🧘 Nghi Thức (Ritual) — 8 nghi thức chuyển hóa (Mở Rộng Trái Tim, Biết Ơn, Thư Gửi Vũ Trụ...)' },
  { value: 'goal_creation', label: '🎯 Tạo Goal Mục Tiêu — Theo dõi tiến độ & đạt mục tiêu cá nhân' },
  { value: 'journal_template', label: '📝 Journal Template — 11 mẫu nhật ký theo Tier (Suy ngẫm, Biết ơn, Nhật ký giao dịch...)' },
  { value: 'tarot_iching', label: '🔮 Tarot & Kinh Dịch — Bói bài 78 lá, 64 quẻ Kinh Dịch, xem ngày tốt' },
  { value: 'paper_trading', label: '📈 Paper Trading — Giao dịch mô phỏng không rủi ro' },
  { value: 'community_forum', label: '👥 Community Forum — Thảo luận, chia sẻ Trade Ideas, Leaderboard' },
];

const SOCIAL_TRADING_MINDSET_OPTIONS = [
  { value: 'discipline', label: '🎯 Kỷ luật Trading — Giữ nguyên tắc, không phá vỡ hệ thống' },
  { value: 'psychology', label: '🧘 Quản lý tâm lý — Bình tĩnh sau thua lỗ, không revenge trade' },
  { value: 'risk_management', label: '🛡️ Quản lý vốn — Rủi ro 1-2%/lệnh, bảo toàn vốn' },
  { value: 'patience', label: '⏳ Kiên nhẫn — Đi hết kế hoạch, không thoát sớm vì sợ' },
  { value: 'self_awareness', label: '🪞 Tự nhận thức — Hiểu bản thân hơn hiểu thị trường' },
  { value: 'journal', label: '📓 Nhật ký giao dịch — Ghi chép, phân tích, cải thiện' },
];

const SOCIAL_COURSE_OPTIONS = [
  { value: '7_ngay_tan_so', label: '🔮 7 Ngày Khai Mở Tần Số Gốc — 7 ngày, nền tảng tần số rung động' },
  { value: 'tan_so_tinh_yeu', label: '💕 Kích Hoạt Tần Số Tình Yêu — ₫399,000 (42 ngày, chữa lành & thu hút tri kỷ)' },
  { value: 'tu_duy_trieu_phu', label: '💰 Tái Tạo Tư Duy Triệu Phú — ₫499,000 (49 ngày, thanh tẩy niềm tin tiền)' },
  { value: 'trading_starter', label: '🌟 GEM Trading Starter — ₫299,000 (nhập môn, 15 bài, Scanner 5/ngày)' },
  { value: 'trading_tier1', label: '🥉 GEM Trading Tier 1 — ₫11,000,000 (4 GEM Patterns + 3 Classic, Win Rate 67.8%)' },
  { value: 'trading_tier2', label: '🥈 GEM Trading Tier 2 — ₫21,000,000 (HFZ/LFZ Mastery, Multi-Timeframe)' },
  { value: 'trading_tier3', label: '🥇 GEM Trading Tier 3 — ₫68,000,000 (AI Signals, Whale Tracking, Elite)' },
];

const SOCIAL_GEM_PACK_OPTIONS = [
  { value: 'pack_starter', label: '🌱 Starter — 100 Gems (22,000₫)' },
  { value: 'pack_popular', label: '⭐ Popular — 550 Gems (99,000₫, tiết kiệm 10%)' },
  { value: 'pack_pro', label: '💼 Pro — 1,150 Gems (189,000₫, tiết kiệm 16%)' },
  { value: 'pack_vip', label: '👑 VIP — 6,000 Gems (890,000₫, tiết kiệm 26%) 🔥' },
];

const SOCIAL_SPIRITUAL_OPTIONS = [
  { value: 'realms', label: '🌌 Các Cõi Giới — Tam giới, Lục đạo luân hồi, cõi Phật' },
  { value: 'buddha_deities', label: '🙏 Chư Phật & Thiên — Phật Thích Ca, Quán Thế Âm, Di Lặc, Chư Thiên hộ pháp' },
  { value: 'astrology', label: '⭐ Tử Vi & Chiêm Tinh — Lá số tử vi, 12 cung hoàng đạo, bản đồ sao' },
  { value: 'mysticism', label: '🔮 Huyền Học — Kinh Dịch, Bát Quái, Ngũ Hành, số học huyền bí' },
  { value: 'feng_shui', label: '🏠 Phong Thủy — Bố trí không gian, hướng nhà, vật phẩm phong thủy' },
  { value: 'energy_healing', label: '✨ Năng Lượng & Chữa Lành — Chakra, Reiki, tần số rung động, thiền định' },
  { value: 'crystals', label: '💎 Pha Lê & Đá Phong Thủy — Thạch anh, Amethyst, Tiger Eye, ý nghĩa & cách sử dụng' },
  { value: 'tarot_divination', label: '🃏 Tarot & Bói Toán — 78 lá Tarot, Kinh Dịch 64 quẻ, xem ngày tốt xấu' },
  { value: 'meditation', label: '🧘 Thiền Định & Mindfulness — Thiền chánh niệm, thiền hơi thở, thiền quán tưởng' },
  { value: 'dharma_protectors', label: '🛡️ Hộ Pháp & Thần Chú — Chú Đại Bi, Lăng Nghiêm, hộ pháp Kim Cương' },
];

const SOCIAL_SELF_DEV_OPTIONS = [
  { value: 'morning_routine', label: '🌅 Morning Routine — Thói quen buổi sáng, 5AM Club, Miracle Morning' },
  { value: 'goal_setting', label: '🎯 Thiết Lập Mục Tiêu — SMART Goals, OKR cá nhân, Vision Board' },
  { value: 'time_management', label: '⏰ Quản Lý Thời Gian — Pomodoro, Time Blocking, Deep Work' },
  { value: 'habit_building', label: '🔄 Xây Dựng Thói Quen — Atomic Habits, 21 ngày, Habit Stacking' },
  { value: 'mindset_growth', label: '🧠 Growth Mindset — Tư duy phát triển, vượt qua giới hạn bản thân' },
  { value: 'journaling', label: '📓 Journaling — Nhật ký biết ơn, suy ngẫm, giao dịch, mục tiêu' },
  { value: 'emotional_mastery', label: '💪 Làm Chủ Cảm Xúc — EQ, quản lý stress, bình tĩnh trong khủng hoảng' },
  { value: 'financial_freedom', label: '💰 Tự Do Tài Chính — Đầu tư, tiết kiệm, thu nhập thụ động' },
  { value: 'reading_learning', label: '📚 Đọc Sách & Học Hỏi — Book review, tóm tắt sách, kiến thức mới' },
  { value: 'focus_productivity', label: '🔥 Tập Trung & Năng Suất — Loại bỏ xao nhãng, flow state, hiệu suất cao' },
];

const SOCIAL_MARKET_DAILY_OPTIONS = [
  { value: 'btc_eth', label: '₿ BTC & ETH — Biến động giá, xu hướng, phân tích kỹ thuật' },
  { value: 'altcoins', label: '🪙 Altcoins Nổi Bật — Top gainers/losers, pump/dump, trending coins' },
  { value: 'macro', label: '🌍 Macro & Kinh Tế Vĩ Mô — CPI, FED, lãi suất, chính sách tiền tệ' },
  { value: 'defi_nft', label: '🔗 DeFi & NFT — TVL, yield farming, NFT trends, GameFi' },
  { value: 'whale_movement', label: '🐋 Whale Movements — Dòng tiền lớn, on-chain data, exchange flow' },
  { value: 'regulation', label: '⚖️ Pháp Lý & Quy Định — SEC, luật crypto mới, ETF, chính sách các nước' },
  { value: 'sentiment', label: '📈 Tâm Lý Thị Trường — Fear & Greed Index, funding rate, long/short ratio' },
  { value: 'events', label: '📅 Sự Kiện Quan Trọng — Token unlock, hardfork, mainnet launch, airdrop' },
  { value: 'trading_ideas', label: '💡 Trading Ideas — Setup giao dịch tiềm năng, pattern đáng chú ý' },
];

const SOCIAL_SUCCESS_STORY_OPTIONS = [
  { value: 'trading_profit', label: '📈 Lợi Nhuận Trading — User đạt PnL ấn tượng với GEM Scanner' },
  { value: 'tier_upgrade', label: '🚀 Nâng Cấp Tier — Hành trình từ Free lên Tier 1/2/3' },
  { value: 'life_change', label: '🌟 Thay Đổi Cuộc Sống — Câu chuyện chuyển hóa nhờ nghi thức/thiền định' },
  { value: 'course_result', label: '🎓 Kết Quả Học Tập — Hoàn thành khóa học, áp dụng thành công' },
  { value: 'affiliate_income', label: '💰 Thu Nhập Affiliate — KOL/CTV đạt doanh số cao' },
  { value: 'community_impact', label: '👥 Tác Động Cộng Đồng — Chia sẻ giúp đỡ member khác' },
];

const SOCIAL_FAQ_TIPS_OPTIONS = [
  { value: 'getting_started', label: '🆕 Bắt Đầu — Hướng dẫn user mới sử dụng app' },
  { value: 'scanner_tips', label: '📊 Tips Scanner — Cách đọc tín hiệu, chọn pattern, timeframe' },
  { value: 'spiritual_tips', label: '🔮 Tips Tâm Linh — Cách bói Tarot, xem quẻ, thiền đúng cách' },
  { value: 'trading_tips', label: '💹 Tips Trading — Entry/exit, quản lý vốn, trailing stop' },
  { value: 'app_tricks', label: '📱 Mẹo Sử Dụng App — Tính năng ẩn, shortcut, tối ưu trải nghiệm' },
  { value: 'common_mistakes', label: '⚠️ Sai Lầm Phổ Biến — Những lỗi trader/user mới hay mắc' },
];

const SOCIAL_BTS_OPTIONS = [
  { value: 'dev_update', label: '💻 Dev Update — Tính năng đang phát triển, roadmap' },
  { value: 'team_story', label: '👩‍💻 Team Story — Câu chuyện thành viên, văn hóa team' },
  { value: 'design_process', label: '🎨 Design Process — Quá trình thiết kế UI/UX, lý do thay đổi' },
  { value: 'data_insights', label: '📊 Data Insights — Số liệu thú vị từ hệ thống (ẩn danh)' },
  { value: 'founder_journey', label: '🌱 Founder Journey — Hành trình xây dựng GEMRAL' },
];

const SOCIAL_RECAP_OPTIONS = [
  { value: 'top_patterns', label: '📊 Top Patterns — Pattern hiệu quả nhất tuần/tháng' },
  { value: 'top_traders', label: '🏆 Top Traders — Bảng xếp hạng PnL, karma cao nhất' },
  { value: 'platform_stats', label: '📈 Platform Stats — Tổng scans, users mới, gems distributed' },
  { value: 'content_highlights', label: '🎬 Content Highlights — Video/bài viết được xem nhiều nhất' },
  { value: 'community_growth', label: '👥 Community Growth — Forum posts, members mới, engagement' },
  { value: 'market_performance', label: '💹 Market Performance — BTC/ETH tuần qua, top coins' },
];

// ── In-App Story options ──
const STORY_TYPE_OPTIONS = [
  { value: 'feature_intro', label: '✨ Giới Thiệu Tính Năng — Slide giải thích tính năng mới' },
  { value: 'daily_tarot', label: '🔮 Tarot Ngày — Lá bài + thông điệp ngắn' },
  { value: 'trading_tip', label: '📊 Trading Tip — Mẹo giao dịch nhanh' },
  { value: 'motivation_quote', label: '🌅 Quote Truyền Cảm Hứng — Lời hay ý đẹp' },
  { value: 'course_promo', label: '🎓 Quảng Bá Khóa Học — CTA đăng ký' },
  { value: 'event_announce', label: '📅 Thông Báo Sự Kiện — Webinar, workshop' },
  { value: 'user_spotlight', label: '🏆 User Spotlight — Highlight user nổi bật' },
  { value: 'custom_story', label: '✏️ Tùy chỉnh' },
];

// ── SMS Marketing options ──
const SMS_TYPE_OPTIONS = [
  { value: 'flash_sale', label: '🔥 Flash Sale — Giảm giá giới hạn thời gian' },
  { value: 'course_launch', label: '🎓 Ra Mắt Khóa Học — Thông báo khóa mới' },
  { value: 'tier_expiry', label: '⏰ Hết Hạn Tier — Nhắc gia hạn' },
  { value: 'welcome', label: '👋 Welcome — Chào mừng user mới' },
  { value: 'reactivation', label: '🔄 Re-activation — Kéo user quay lại' },
  { value: 'event_reminder', label: '📅 Nhắc Sự Kiện — Webinar/workshop sắp diễn ra' },
  { value: 'custom_sms', label: '✏️ Tùy chỉnh' },
];

// ── Chatbot Script options ──
const CHATBOT_SCRIPT_TOPIC_OPTIONS = [
  { value: 'onboarding', label: '🆕 Onboarding — Hướng dẫn user mới làm quen app' },
  { value: 'scanner_guide', label: '📊 Hướng Dẫn Scanner — Cách dùng GEM Scanner' },
  { value: 'trading_qa', label: '💹 Q&A Trading — Trả lời câu hỏi trading phổ biến' },
  { value: 'spiritual_qa', label: '🔮 Q&A Tâm Linh — Giải đáp Tarot, Kinh Dịch, thiền' },
  { value: 'course_recommend', label: '🎓 Gợi Ý Khóa Học — Tư vấn chọn khóa phù hợp' },
  { value: 'tier_explain', label: '💎 Giải Thích Tier — So sánh Free/Tier 1/2/3' },
  { value: 'troubleshoot', label: '🔧 Xử Lý Lỗi — FAQ về lỗi app, thanh toán, tài khoản' },
  { value: 'motivation_chat', label: '🌅 Động Viên — Responses truyền cảm hứng khi user buồn/thất bại' },
];

// ── Target Audience & Tone ──
const TARGET_AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new_user', label: '🆕 User mới — Chưa biết gì về app' },
  { value: 'free_tier', label: '🆓 Free Tier — Đang dùng miễn phí' },
  { value: 'tier_1', label: '🥉 Tier 1 — Đã mua gói cơ bản' },
  { value: 'tier_2_3', label: '🥇 Tier 2-3 — High-value users' },
  { value: 'churned', label: '😴 Không hoạt động — 30+ ngày không login' },
  { value: 'affiliate', label: '🤝 Affiliate/KOL — Cộng tác viên' },
];

const TONE_OPTIONS = [
  { value: 'auto', label: 'Tự động (theo loại nội dung)' },
  { value: 'professional', label: '💼 Chuyên nghiệp — Formal, data-driven' },
  { value: 'inspirational', label: '🌟 Truyền cảm hứng — Uplifting, motivating' },
  { value: 'fomo', label: '🔥 Khẩn cấp (FOMO) — Giới hạn, không muốn bỏ lỡ' },
  { value: 'casual_genz', label: '😎 Gen Z Casual — Thân thiện, vui nhộn, relatable' },
  { value: 'spiritual_calm', label: '🧘 Tâm linh tĩnh lặng — Sâu sắc, bình an' },
  { value: 'educational', label: '📚 Giáo dục — Dạy kiến thức, step-by-step' },
];

// ── Banner content options ──
const BANNER_TYPE_OPTIONS = [
  { value: 'upgrade_tier', label: '🚀 Nâng cấp Tier — CTA nâng cấp tài khoản' },
  { value: 'new_course', label: '🎓 Khóa Học Mới — Quảng bá khóa học mới ra mắt' },
  { value: 'promotion', label: '🔥 Khuyến Mãi — Flash sale, giảm giá, ưu đãi đặc biệt' },
  { value: 'feature_highlight', label: '✨ Tính Năng Mới — Giới thiệu tính năng mới trong app' },
  { value: 'event', label: '🎪 Sự Kiện — Webinar, workshop, livestream' },
  { value: 'community', label: '👥 Cộng Đồng — CTA tham gia forum, group' },
  { value: 'crystal_shop', label: '💎 Shop Đá Phong Thủy — Quảng bá sản phẩm đá/pha lê' },
  { value: 'seasonal', label: '🌙 Theo Mùa — Tết, Valentine, Halloween, Trung Thu...' },
  { value: 'custom_banner', label: '✏️ Tùy chỉnh (nhập nội dung)' },
];

const BANNER_LAYOUT_OPTIONS = [
  { value: 'post', label: 'Post — Hình chữ nhật ngang' },
  { value: 'compact', label: 'Compact — Nhỏ gọn' },
  { value: 'featured', label: 'Featured — Nổi bật toàn màn hình' },
];

// ── Push Notification options ──
const PUSH_TOPIC_OPTIONS = [
  { value: 'trading_signal', label: '📊 Tín Hiệu Trading — Pattern mới, cơ hội giao dịch' },
  { value: 'daily_motivation', label: '🌅 Daily Motivation — Câu trích dẫn, lời khích lệ buổi sáng' },
  { value: 'spiritual_daily', label: '🔮 Tâm Linh Hàng Ngày — Lá bài Tarot, quẻ Kinh Dịch, năng lượng ngày' },
  { value: 'course_reminder', label: '🎓 Nhắc Học — Nhắc nhở tiến trình học, bài mới' },
  { value: 'market_update', label: '📈 Thị Trường — Cập nhật BTC, ETH, tin crypto nổi bật' },
  { value: 'new_feature', label: '✨ Tính Năng Mới — Thông báo cập nhật app' },
  { value: 'community_activity', label: '👥 Hoạt Động CĐ — Bài viết hot, thảo luận mới trên forum' },
  { value: 'promotion_push', label: '🔥 Khuyến Mãi — Flash sale, ưu đãi giới hạn' },
  { value: 'ritual_reminder', label: '🧘 Nhắc Nghi Thức — Nhắc nhở nghi thức hàng ngày, thiền, journaling' },
  { value: 'gem_reward', label: '💎 Phần Thưởng GEM — Thông báo nhận gems, thưởng hoạt động' },
  { value: 'custom_push', label: '✏️ Tùy chỉnh (nhập nội dung)' },
];

// ============================================================================
// Constants — Content Planner
// ============================================================================

const PLANNER_DURATION_OPTIONS = [
  { value: '7', label: '7 ngày' },
  { value: '14', label: '14 ngày' },
  { value: '30', label: '30 ngày' },
];

const PLANNER_PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'threads', label: 'Threads' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'forum_gemral', label: 'Forum Gemral' },
];

const PLANNER_CONTENT_TYPE_OPTIONS = [
  { value: 'social_post', label: 'Bài đăng MXH' },
  { value: 'short_clip', label: 'Short Clip / Reels (30-70s)' },
  { value: 'blog_seo', label: 'Blog / Bài viết SEO' },
  { value: 'news', label: 'Tin tức' },
  { value: 'story_carousel', label: 'Story / Carousel' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'push_notification', label: 'Push Notification' },
];

const PLANNER_TOPIC_OPTIONS = [
  { value: 'app_features', label: 'Tính năng App GEMRAL' },
  { value: 'trading_mindset', label: 'Trading Mindset & Kỷ luật' },
  { value: 'market_daily', label: 'Thị Trường & Crypto Daily' },
  { value: 'spiritual', label: 'Tâm Linh & Huyền Học' },
  { value: 'self_development', label: 'Phát Triển Bản Thân' },
  { value: 'courses', label: 'Khóa Học GEM Academy' },
  { value: 'success_stories', label: 'Success Stories & Testimonials' },
  { value: 'community', label: 'Xây Dựng Cộng Đồng' },
  { value: 'behind_scenes', label: 'Behind The Scenes' },
  { value: 'faq_tips', label: 'FAQ & Tips Nhanh' },
  { value: 'promotion', label: 'Khuyến Mãi & Ưu Đãi' },
  { value: 'gem_packs', label: 'GEM Packs & Pricing' },
];

// ============================================================================
// Pipeline Steps
// ============================================================================

const PIPELINE_STEPS = [
  { key: 'queued', label: 'Đang chờ' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'completed', label: 'Hoàn thành' },
];

function getPipelineIndex(step) {
  return PIPELINE_STEPS.findIndex((s) => s.key === step);
}

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const tips = [
    'Hệ thống đang phân tích yêu cầu của bạn...',
    'Đang áp dụng công thức viết bài chốt sale...',
    'Hệ thống đang sáng tạo nội dung độc quyền...',
    'Vui lòng chờ, quá trình này có thể kéo dài 1-2 phút...',
  ];
  const tip = tips[Math.floor(elapsed / 20) % tips.length] ?? tips[0];
  return (
    <div className="flex items-center gap-2 text-xs text-gold animate-pulse">
      <Clock size={14} />
      <span>{mins}m{secs.toString().padStart(2, '0')}s</span>
      <span className="text-txt-3">— {tip}</span>
    </div>
  );
}

// ============================================================================
// Helper
// ============================================================================

function countWords(text) {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

// ============================================================================
// GEM Tools & Brand Voice Helpers (shared with detail page)
// ============================================================================

const DEFAULT_GEM_TOOLS = [
  { key: 'P1', label: 'Thở Thanh Lọc', present: false },
  { key: 'P2', label: 'Template Tần Số', present: false },
  { key: 'P3', label: 'Thiền Dẫn Dắt', present: false },
  { key: 'P4', label: 'Tần Số Tình Yêu', present: false },
  { key: 'P5', label: 'Vision Board', present: false },
];

function computeBrandScore(text) {
  const violations = [];
  let score = 100;
  if (!text) return { score: 0, violations: [] };

  const bannedWords = ['shopify', 'amazon', 'clickbank'];
  for (const word of bannedWords) {
    if (text.toLowerCase().includes(word)) {
      violations.push({ rule: `Tên sản phẩm bên ngoài: "${word}"`, location: 'Nội dung', severity: 'error' });
      score -= 15;
    }
  }

  const viChars = text.match(/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi);
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars > 100 && viChars) {
    const ratio = viChars.length / totalChars;
    if (ratio < 0.02) {
      violations.push({ rule: 'Tỷ lệ dấu tiếng Việt quá thấp', location: 'Toàn bộ nội dung', severity: 'warning' });
      score -= 8;
    }
  }

  const sentences = text.split(/[.!?]+/);
  const englishSentences = sentences.filter((s) => /^[a-zA-Z\s,;:'"()-]+$/.test(s.trim()) && s.trim().length > 20);
  if (englishSentences.length > 0) {
    violations.push({ rule: `${englishSentences.length} câu tiếng Anh phát hiện`, location: 'Nội dung', severity: 'warning' });
    score -= englishSentences.length * 5;
  }

  return { score: Math.max(0, Math.min(100, score)), violations };
}

function detectGemTools(text) {
  if (!text) return DEFAULT_GEM_TOOLS;
  const lower = text.toLowerCase();
  return DEFAULT_GEM_TOOLS.map((tool) => ({
    ...tool,
    present: lower.includes(tool.label.toLowerCase()),
    section: lower.includes(tool.label.toLowerCase()) ? 'Phát hiện trong nội dung' : undefined,
  }));
}

// ============================================================================
// Checkbox Group Component
// ============================================================================

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  disabled,
}) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-txt-2 mb-2">{label}</label>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-card border cursor-pointer transition-all duration-fast ${selected.includes(opt.value)
              ? 'border-gold/40 bg-gold/10'
              : 'border-border bg-glass-bg hover:border-border-2'
              } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              disabled={disabled}
              className="accent-[var(--gold)] w-4 h-4"
            />
            <span className={`text-xs ${selected.includes(opt.value) ? 'text-gold font-medium' : 'text-txt-2'}`}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function AiGenPage() {
  const searchParams = useSearchParams();

  // -- Form state --
  const [outputType, setOutputType] = useState('script_latc');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-2.5-pro');
  const [brief, setBrief] = useState('');
  const [briefError, setBriefError] = useState('');

  // -- Speech-to-text (Groq Whisper large-v3) --
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  const toggleSpeech = useCallback(async () => {
    // ─── STOP recording ───
    if (isRecording) {
      console.log('[Speech] Stopping recording...');
      if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
      setIsRecording(false);
      setRecordingTime(0);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        console.warn('[Speech] Recorder already inactive');
        return;
      }

      // Wait for recorder to finish and collect final chunk
      const audioBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          console.log('[Speech] Recorder stopped, chunks:', audioChunksRef.current.length);
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          console.log('[Speech] Blob size:', blob.size);
          resolve(blob);
        };
        recorder.stop();
      });

      // Release mic
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      if (!audioBlob || audioBlob.size < 100) {
        console.warn('[Speech] Audio too small, skipping:', audioBlob?.size);
        return;
      }

      // Transcribe via Groq Whisper
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('language', 'vi');
        console.log('[Speech] Sending to /api/speech...');
        const res = await fetch('/api/speech', { method: 'POST', body: formData });
        console.log('[Speech] Response status:', res.status);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[Speech] API error:', errData);
          return;
        }
        const data = await res.json();
        console.log('[Speech] Transcript:', data.text);
        if (data.text) {
          setBrief((prev) => {
            const sep = prev && !prev.endsWith('\n') && !prev.endsWith(' ') ? ' ' : '';
            return prev + sep + data.text;
          });
          if (briefError) setBriefError('');
        }
      } catch (err) {
        console.error('[Speech] Transcribe error:', err);
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // ─── START recording ───
    try {
      console.log('[Speech] Requesting mic access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log('[Speech] Chunk collected, size:', e.data.size);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      console.log('[Speech] Recording started, mimeType:', mimeType);
    } catch (err) {
      console.error('[Speech] Mic access denied:', err);
    }
  }, [isRecording, briefError]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Auto-switch model based on job type and provider
  React.useEffect(() => {
    if (aiProvider === 'gemini') {
      setAiModel('gemini-2.5-pro'); // Gemini default — stable
    } else if (outputType === 'script_latc' || outputType === 'script_tmt') {
      setAiModel('opus');
    } else {
      setAiModel('sonnet');
    }
  }, [outputType, aiProvider]);

  // Reset model when switching provider
  const handleProviderChange = (newProvider) => {
    setAiProvider(newProvider);
    const models = AI_MODEL_OPTIONS[newProvider] ?? [];
    setAiModel(models[0]?.value ?? '');
  };

  // Derived from outputType
  const selectedOption = OUTPUT_TYPE_OPTIONS.find((o) => o.value === outputType) ?? OUTPUT_TYPE_OPTIONS[0];
  const jobType = selectedOption.jobType;
  const contentType = selectedOption.contentType;

  // -- Clip Ngắn fields --
  const [clipTemplate, setClipTemplate] = useState('app_feature');
  const [clipFeatures, setClipFeatures] = useState([]);
  const [clipCourses, setClipCourses] = useState([]);
  const [clipCtaType, setClipCtaType] = useState('subtle');

  // -- Social Post fields --
  const [socialPlatforms, setSocialPlatforms] = useState(['facebook']);
  const [socialTopic, setSocialTopic] = useState('app_features');
  const [socialTopicDetails, setSocialTopicDetails] = useState([]);

  // -- Banner fields --
  const [bannerTypes, setBannerTypes] = useState([]);
  const [bannerLayout, setBannerLayout] = useState('post');

  // -- Push Notification fields --
  const [pushTopics, setPushTopics] = useState([]);

  // -- In-App Story fields --
  const [storyTypes, setStoryTypes] = useState([]);

  // -- SMS Marketing fields --
  const [smsTypes, setSmsTypes] = useState([]);

  // -- Chatbot Script fields --
  const [chatbotTopics, setChatbotTopics] = useState([]);

  // -- Content Planner fields --
  const [plannerDuration, setPlannerDuration] = useState('7');
  const [plannerPlatforms, setPlannerPlatforms] = useState(['facebook', 'instagram']);
  const [plannerContentTypes, setPlannerContentTypes] = useState(['social_post']);
  const [plannerTopics, setPlannerTopics] = useState(['app_features', 'trading_mindset']);

  // -- Target Audience & Tone --
  const [targetAudience, setTargetAudience] = useState('all');
  const [contentTone, setContentTone] = useState('auto');
  const [brandVoice, setBrandVoice] = useState('jennie'); // 'jennie' | 'generic'

  // -- News article fields --
  const [newsCategories, setNewsCategories] = useState(['crypto_market']);
  const [newsSubtopics, setNewsSubtopics] = useState([]);
  const [newsFormat, setNewsFormat] = useState('news_analysis');

  // -- Advanced options (collapsed by default) --
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [persona, setPersona] = useState('auto');
  const [writingMode, setWritingMode] = useState('auto');
  const [productHook, setProductHook] = useState('none');

  // -- Batch & extra options --
  const [batchCount, setBatchCount] = useState(1);

  // -- Generation state --
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [pipelineStep, setPipelineStep] = useState('queued');
  const [brandResult, setBrandResult] = useState(null);
  const [generationDone, setGenerationDone] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [savedId, setSavedId] = useState(null);
  // -- Session reuse state (Persistent Session Architecture) --
  const [sessionId, setSessionId] = useState(null);       // Claude Code session ID cho iterate
  const [iterateHistory, setIterateHistory] = useState([]); // Lịch sử iterate [{role, text}]
  const [iterateInput, setIterateInput] = useState('');     // Input cho iterate chat
  const [iterating, setIterating] = useState(false);        // Đang gửi iterate request
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(null); // platform name or null
  const [publishResults, setPublishResults] = useState([]);
  const [feedbackSending, setFeedbackSending] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(new Set());
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFbPage, setSelectedFbPage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [newsPublishing, setNewsPublishing] = useState(false);
  const [newsPublished, setNewsPublished] = useState(null);
  const [showNewsSchedule, setShowNewsSchedule] = useState(false);
  const [newsScheduleDate, setNewsScheduleDate] = useState('');
  const [newsScheduleTime, setNewsScheduleTime] = useState('08:00');
  const [newsMetadata, setNewsMetadata] = useState(null);
  // -- Email state --
  const [manualEmailHtml, setManualEmailHtml] = useState('');
  const [emailType, setEmailType] = useState('newsletter');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSender, setEmailSender] = useState('Jennie Uyen Chu <hello@gemral.com>');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(true);
  const [showEmailSource, setShowEmailSource] = useState(false);
  const [emailReplacingIdx, setEmailReplacingIdx] = useState(null);
  const [showEmailToolbox, setShowEmailToolbox] = useState(true);
  const [emailToolboxCategories, setEmailToolboxCategories] = useState(
    EMAIL_TOOLBOX_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: !cat.collapsed }), {})
  );
  const emailFileInputRef = useRef(null);
  const emailIframeRef = useRef(null);
  const emailSrcDocRef = useRef('');  // Cache srcDoc to prevent re-render during editing
  const emailSyncingRef = useRef(false);  // Flag to skip srcDoc recalc on iframe-initiated syncs
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // -- Auto-comment state --
  const [autoCommentEnabled, setAutoCommentEnabled] = useState(false);
  const [autoCommentText, setAutoCommentText] = useState('');
  const [autoCommentLink, setAutoCommentLink] = useState('');
  // -- Schedule state --
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  // -- Calendar integration --
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [calendarScheduleDate, setCalendarScheduleDate] = useState('');
  const [calendarScheduleTime, setCalendarScheduleTime] = useState('08:00');
  const [calendarPlatform, setCalendarPlatform] = useState('facebook');
  const [creatingCalendarEvent, setCreatingCalendarEvent] = useState(false);
  // -- Calendar → AI Gen linking (via URL query params) --
  const [linkedEventId, setLinkedEventId] = useState(null);
  // -- Content Planner sidebar (Supabase-synced) --
  const [plannerData, setPlannerData] = useState({});
  const [plannerCollapsed, setPlannerCollapsed] = useState(false);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const isRestoringRef = useRef(false);

  // -- SessionStorage: giữ state khi chuyển tab --
  const SESSION_KEY = 'gem-aigen-state';

  // Restore state on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const s = JSON.parse(saved);
      isRestoringRef.current = true;

      // Form inputs
      if (s.brief) setBrief(s.brief);
      if (s.outputType) setOutputType(s.outputType);
      if (s.aiProvider) setAiProvider(s.aiProvider);
      if (s.aiModel) setAiModel(s.aiModel);
      if (s.clipTemplate) setClipTemplate(s.clipTemplate);
      if (s.clipFeatures) setClipFeatures(s.clipFeatures);
      if (s.clipCourses) setClipCourses(s.clipCourses);
      if (s.clipCtaType) setClipCtaType(s.clipCtaType);
      if (s.socialPlatforms) setSocialPlatforms(s.socialPlatforms);
      if (s.socialTopic) setSocialTopic(s.socialTopic);
      if (s.socialTopicDetails) setSocialTopicDetails(s.socialTopicDetails);
      if (s.newsCategories) setNewsCategories(s.newsCategories);
      if (s.newsSubtopics) setNewsSubtopics(s.newsSubtopics);
      if (s.newsFormat) setNewsFormat(s.newsFormat);
      if (s.plannerDuration) setPlannerDuration(s.plannerDuration);
      if (s.plannerPlatforms) setPlannerPlatforms(s.plannerPlatforms);
      if (s.plannerContentTypes) setPlannerContentTypes(s.plannerContentTypes);
      if (s.plannerTopics) setPlannerTopics(s.plannerTopics);
      if (s.persona) setPersona(s.persona);
      if (s.writingMode) setWritingMode(s.writingMode);
      if (s.productHook) setProductHook(s.productHook);
      if (s.batchCount) setBatchCount(s.batchCount);

      // Generated output
      if (s.output) setOutput(s.output);
      if (s.imagePrompt) setImagePrompt(s.imagePrompt);
      if (s.generationDone) setGenerationDone(true);
      if (s.brandResult) setBrandResult(s.brandResult);
      if (s.newsMetadata) setNewsMetadata(s.newsMetadata);
      if (s.newsPublished) setNewsPublished(s.newsPublished);
      if (s.publishResults) setPublishResults(s.publishResults);
      if (s.savedId) setSavedId(s.savedId);

      // Auto-comment & schedule
      if (s.autoCommentEnabled) setAutoCommentEnabled(s.autoCommentEnabled);
      if (s.autoCommentText) setAutoCommentText(s.autoCommentText);
      if (s.autoCommentLink) setAutoCommentLink(s.autoCommentLink);
      if (s.scheduleMode) setScheduleMode(s.scheduleMode);
      if (s.scheduledDateTime) setScheduledDateTime(s.scheduledDateTime);

      // Email state
      if (s.emailType) setEmailType(s.emailType);
      if (s.emailSubject) setEmailSubject(s.emailSubject);
      if (s.emailRecipients) setEmailRecipients(s.emailRecipients);
      if (s.emailSender) setEmailSender(s.emailSender);
      if (s.emailSent) setEmailSent(s.emailSent);

      setTimeout(() => { isRestoringRef.current = false; }, 100);
    } catch { /* ignore corrupt data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Calendar → AI Gen: Read event_id & content_type from URL query params --
  useEffect(() => {
    const eventId = searchParams.get('event_id');
    const ct = searchParams.get('content_type');
    if (eventId) {
      setLinkedEventId(eventId);
      // Map content_type → outputType
      if (ct) {
        const contentTypeToOutputType = {
          latc: 'script_latc',
          tmt: 'script_tmt',
          short_clip: 'script_short_clip',
          social_post: 'social_post',
          news: 'news',
          email: 'email_html',
        };
        const mapped = contentTypeToOutputType[ct];
        if (mapped) setOutputType(mapped);
      }
    }
  }, [searchParams]);

  // Save state on every change (debounced via key states)
  useEffect(() => {
    if (isRestoringRef.current) return;
    const state = {
      brief, outputType, aiProvider, aiModel,
      clipTemplate, clipFeatures, clipCourses, clipCtaType,
      socialPlatforms, socialTopic, socialTopicDetails,
      newsCategories, newsSubtopics, newsFormat,
      plannerDuration, plannerPlatforms, plannerContentTypes, plannerTopics,
      persona, writingMode, productHook, batchCount,
      output, imagePrompt, generationDone, brandResult,
      newsMetadata, newsPublished, publishResults, savedId,
      autoCommentEnabled, autoCommentText, autoCommentLink,
      scheduleMode, scheduledDateTime,
      emailType, emailSubject, emailRecipients, emailSender, emailSent,
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch { /* storage full — ignore */ }
  }, [
    brief, outputType, aiProvider, aiModel,
    clipTemplate, clipFeatures, clipCourses, clipCtaType,
    socialPlatforms, socialTopic, socialTopicDetails,
    newsCategories, newsSubtopics, newsFormat,
    plannerDuration, plannerPlatforms, plannerContentTypes, plannerTopics,
    persona, writingMode, productHook, batchCount,
    output, imagePrompt, generationDone, brandResult,
    newsMetadata, newsPublished, publishResults, savedId,
    autoCommentEnabled, autoCommentText, autoCommentLink,
    scheduleMode, scheduledDateTime,
    emailType, emailSubject, emailRecipients, emailSender, emailSent,
  ]);

  // -- Load planner data from Supabase + Realtime sync --
  useEffect(() => {
    let cancelled = false;
    import('@gem/services').then(async ({ plannerService }) => {
      // One-time migration from localStorage → Supabase
      const LS_KEY = 'cc_content_planner_v2';
      const LS_MIGRATED = 'cc_planner_migrated';
      if (!localStorage.getItem(LS_MIGRATED)) {
        try {
          const old = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
          const inserts = [];
          for (const [date, items] of Object.entries(old)) {
            for (const item of items) {
              inserts.push(plannerService.itemToRow(date, item));
            }
          }
          if (inserts.length) await plannerService.createMany(inserts);
          localStorage.setItem(LS_MIGRATED, '1');
          localStorage.removeItem(LS_KEY);
        } catch { /* ignore migration errors */ }
      }
      // Load from Supabase
      const res = await plannerService.getAll();
      if (!cancelled && res.success && res.data) {
        setPlannerData(plannerService.rowsToMap(res.data));
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let unsubscribe;
    import('@gem/services').then(({ plannerService }) => {
      unsubscribe = plannerService.subscribe(() => {
        // Reload all on any change from other devices
        plannerService.getAll().then(res => {
          if (res.success && res.data) {
            setPlannerData(plannerService.rowsToMap(res.data));
          }
        });
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // -- Load Facebook Pages --
  React.useEffect(() => {
    fetch('/api/social/publish')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pages?.length) {
          setFacebookPages(data.pages);
          setSelectedFbPage(data.pages[0].id);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // -- Hooks --
  const { addToast } = useToast();
  const createScript = useCreateScript();
  const createSocialPost = useCreateSocialPost();
  const { hasActiveJobs, processingCount, isSubscribed } = useJobSubscription({
    autoCleanup: true,
    onCompleted: (job) => {
      addToast({
        type: 'success',
        title: 'Công việc hoàn thành',
        message: `Job "${job.job_type}" đã xử lý xong.`,
      });
    },
    onFailed: (job) => {
      addToast({
        type: 'error',
        title: 'Công việc thất bại',
        message: job.error_message ?? 'Lỗi không xác định.',
      });
    },
  });

  // -- Derived --
  const briefWordCount = countWords(brief);
  const outputWordCount = output ? vietnameseNLP.countWords(output) : 0;
  const outputDuration = output ? vietnameseNLP.formatDuration(vietnameseNLP.estimateDuration(output)) : '';
  const localBrandAnalysis = React.useMemo(() => computeBrandScore(output), [output]);
  const localGemTools = React.useMemo(() => detectGemTools(output), [output]);
  const presentToolCount = localGemTools.filter((t) => t.present).length;
  const isShortClip = outputType === 'script_short_clip';
  const isSocialPost = outputType === 'social_post';
  const isBanner = outputType === 'banner_content';
  const isPushNotification = outputType === 'push_notification';
  const isInAppStory = outputType === 'inapp_story';
  const isSms = outputType === 'sms_marketing';
  const isChatbotScript = outputType === 'chatbot_script';
  const isNews = outputType === 'news_article';
  const isEmail = outputType === 'email_html';
  const isContentPlanner = outputType === 'content_planner';

  // -- Planner: copy to brief callback --
  const handlePlannerCopyToBrief = useCallback((planBrief, planType) => {
    const typeMap = { news: 'news_article', email: 'email_html', social_post: 'social_post', script: 'script_latc', short_clip: 'script_short_clip' };
    const matchedOutputType = typeMap[planType];
    if (matchedOutputType) setOutputType(matchedOutputType);
    setBrief(planBrief);
    addToast({ type: 'success', message: 'Đã copy nội dung vào Brief. Chỉnh sửa và bấm Tạo!' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [addToast]);

  // -- Auto-send scheduled emails (polls every 60s) --
  useEffect(() => {
    const timer = setInterval(async () => {
      const now = new Date();
      const { plannerService } = await import('@gem/services');
      Object.entries(plannerData).forEach(([date, items]) => {
        items.forEach((item) => {
          if (item.status !== 'scheduled' || !item.scheduledContent?.emailData) return;
          const scheduledTime = new Date(`${date}T${item.time || '00:00'}`);
          if (now >= scheduledTime) {
            const { from, to, subject, html } = item.scheduledContent.emailData;
            fetch('/api/ops/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ from, to, subject, html }),
            })
              .then(r => r.json())
              .then(data => {
                const newStatus = data.success ? 'published' : 'planned';
                plannerService.update(item.id, { status: newStatus });
                if (data.success) {
                  addToast({ type: 'success', title: 'Email tự động đã gửi!', message: `"${subject}" → ${Array.isArray(to) ? to.length : 1} người nhận` });
                }
              })
              .catch(() => {
                plannerService.update(item.id, { status: 'planned' });
              });
          }
        });
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [plannerData, addToast]);

  // -- Validate --
  const validateBrief = useCallback(() => {
    // Brief là tuỳ chọn khi Social Post hoặc Clip Ngắn hoặc Email (đã có checkbox nội dung)
    const hasDynamicContent = isSocialPost || isShortClip || isNews || isEmail || isBanner || isPushNotification || isInAppStory || isSms || isChatbotScript || isContentPlanner;
    if (!brief.trim() && !hasDynamicContent) {
      setBriefError('Vui lòng nhập nội dung tóm tắt (bắt buộc cho Kịch bản / Tiêu đề)');
      return false;
    }
    setBriefError('');
    return true;
  }, [brief, isSocialPost, isShortClip, isNews, isEmail, isBanner, isPushNotification, isInAppStory, isSms, isChatbotScript, isContentPlanner]);

  // -- Build context from dynamic fields --
  const buildDynamicContext = useCallback(() => {
    const parts = [];

    if (isShortClip) {
      const templateLabel = CLIP_TEMPLATE_OPTIONS.find((o) => o.value === clipTemplate)?.label ?? '';
      parts.push(`\nTEMPLATE CHỦ ĐỀ: ${templateLabel}`);

      if (clipTemplate === 'app_feature' && clipFeatures.length > 0) {
        const labels = clipFeatures.map((v) => APP_FEATURE_OPTIONS.find((o) => o.value === v)?.label ?? v);
        parts.push(`TÍNH NĂNG APP: ${labels.join(', ')}`);
      }
      if (clipTemplate === 'course' && clipCourses.length > 0) {
        const labels = clipCourses.map((v) => COURSE_OPTIONS.find((o) => o.value === v)?.label ?? v);
        parts.push(`KHÓA HỌC: ${labels.join(', ')}`);
      }

      const ctaLabel = CLIP_CTA_OPTIONS.find((o) => o.value === clipCtaType)?.label ?? '';
      parts.push(`KIỂU CTA: ${ctaLabel}`);
    }

    if (isSocialPost) {
      const platformLabels = socialPlatforms.map((v) => SOCIAL_PLATFORM_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nNỀN TẢNG: ${platformLabels.join(', ')}`);

      const topicLabel = SOCIAL_TOPIC_OPTIONS.find((o) => o.value === socialTopic)?.label ?? '';
      parts.push(`CHỦ ĐỀ BÀI ĐĂNG: ${topicLabel}`);

      if (socialTopicDetails.length > 0) {
        let detailOptions = [];
        if (socialTopic === 'app_features') detailOptions = SOCIAL_APP_FEATURE_OPTIONS;
        else if (socialTopic === 'trading_mindset') detailOptions = SOCIAL_TRADING_MINDSET_OPTIONS;
        else if (socialTopic === 'courses') detailOptions = SOCIAL_COURSE_OPTIONS;
        else if (socialTopic === 'gem_packs') detailOptions = SOCIAL_GEM_PACK_OPTIONS;
        else if (socialTopic === 'spiritual') detailOptions = SOCIAL_SPIRITUAL_OPTIONS;
        else if (socialTopic === 'self_development') detailOptions = SOCIAL_SELF_DEV_OPTIONS;
        else if (socialTopic === 'market_daily') detailOptions = SOCIAL_MARKET_DAILY_OPTIONS;

        const detailLabels = socialTopicDetails.map((v) => detailOptions.find((o) => o.value === v)?.label ?? v);
        parts.push(`CHI TIẾT: ${detailLabels.join(', ')}`);
      }
    }

    if (isBanner) {
      const bannerLabels = bannerTypes.map((v) => BANNER_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nLOẠI BANNER: ${bannerLabels.join(', ')}`);
      const layoutLabel = BANNER_LAYOUT_OPTIONS.find((o) => o.value === bannerLayout)?.label ?? '';
      parts.push(`BỐ CỤC: ${layoutLabel}`);
      parts.push('YÊU CẦU: Viết tiêu đề banner (ngắn gọn, thu hút, có emoji), mô tả ngắn (1-2 câu), CTA text. Phù hợp với app GEMRAL.');
    }

    if (isPushNotification) {
      const pushLabels = pushTopics.map((v) => PUSH_TOPIC_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nCHỦ ĐỀ PUSH: ${pushLabels.join(', ')}`);
      parts.push('YÊU CẦU: Viết 5-10 mẫu push notification. Mỗi mẫu gồm: Title (tối đa 50 ký tự, có emoji), Body (tối đa 100 ký tự, gây tò mò/hành động). Phù hợp với user app GEMRAL.');
    }

    if (isInAppStory) {
      const storyLabels = storyTypes.map((v) => STORY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nLOẠI STORY: ${storyLabels.join(', ')}`);
      parts.push('YÊU CẦU: Viết 3-5 slides cho mỗi story. Mỗi slide gồm: Headline (ngắn gọn, có emoji), Body text (1-2 câu), CTA button text (nếu có). Format như Instagram Stories trong app.');
    }

    if (isSms) {
      const smsLabels = smsTypes.map((v) => SMS_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nLOẠI SMS: ${smsLabels.join(', ')}`);
      parts.push('YÊU CẦU: Viết 3-5 mẫu SMS. Mỗi mẫu TỐI ĐA 160 ký tự (bao gồm cả link rút gọn). Có emoji, CTA rõ ràng, tạo urgency. Ký tên GEMRAL.');
    }

    if (isChatbotScript) {
      const chatbotLabels = chatbotTopics.map((v) => CHATBOT_SCRIPT_TOPIC_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nCHỦ ĐỀ CHATBOT: ${chatbotLabels.join(', ')}`);
      parts.push('YÊU CẦU: Viết kịch bản hội thoại cho GEM Master AI chatbot. Mỗi chủ đề gồm: 3-5 câu hỏi phổ biến của user + câu trả lời tương ứng. Giọng thân thiện, ấm áp, như một người thầy/sư phụ. Có gợi ý follow-up questions.');
    }

    // ── Content Planner injection ──
    if (isContentPlanner) {
      const durLabel = PLANNER_DURATION_OPTIONS.find((o) => o.value === plannerDuration)?.label ?? plannerDuration + ' ngày';
      const platLabels = plannerPlatforms.map((v) => PLANNER_PLATFORM_OPTIONS.find((o) => o.value === v)?.label ?? v);
      const ctLabels = plannerContentTypes.map((v) => PLANNER_CONTENT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v);
      const topicLabels = plannerTopics.map((v) => PLANNER_TOPIC_OPTIONS.find((o) => o.value === v)?.label ?? v);

      parts.push(`
=== CONTENT PLANNER ===
THỜI GIAN: ${durLabel} (bắt đầu từ ngày mai)
NỀN TẢNG: ${platLabels.join(', ')}
LOẠI NỘI DUNG: ${ctLabels.join(', ')}
CHỦ ĐỀ: ${topicLabels.join(', ')}

YÊU CẦU:
1. Tạo lịch nội dung CHI TIẾT cho ${durLabel}, mỗi ngày có 1-3 bài tùy số lượng platform.
2. Mỗi mục gồm: Ngày (YYYY-MM-DD), Nền tảng, Loại nội dung, Chủ đề, Tiêu đề bài viết, Tóm tắt nội dung (2-3 câu), Hashtags gợi ý, Giờ đăng tối ưu.
3. Phân bổ chủ đề đa dạng, xen kẽ giữa các chủ đề đã chọn, không lặp liên tiếp.
4. Tối ưu giờ đăng cho từng nền tảng (Facebook: 11h-13h, 19h-21h; Instagram: 7h-9h, 17h-19h; TikTok: 12h, 19h-22h; Forum: bất kỳ).

FORMAT OUTPUT — MARKDOWN TABLE (dễ copy vào Notion):

| Ngày | Nền tảng | Loại | Chủ đề | Tiêu đề | Tóm tắt | Hashtags | Giờ đăng |
|------|----------|------|--------|---------|---------|----------|----------|
| YYYY-MM-DD | Facebook | Bài đăng | ... | ... | ... | #tag1 #tag2 | 19:00 |

Sau bảng, thêm phần:
## Tổng Kết
- Tổng số bài: X
- Phân bổ theo nền tảng: ...
- Phân bổ theo chủ đề: ...
- Ghi chú chiến lược: ...
`);
    }

    // ── Target Audience & Tone injection ──
    if (targetAudience !== 'all') {
      const audLabel = TARGET_AUDIENCE_OPTIONS.find((o) => o.value === targetAudience)?.label ?? '';
      parts.push(`\nĐỐI TƯỢNG MỤC TIÊU: ${audLabel}`);
    }
    if (contentTone !== 'auto') {
      const toneLabel = TONE_OPTIONS.find((o) => o.value === contentTone)?.label ?? '';
      parts.push(`GIỌNG VĂN: ${toneLabel}`);
    }

    if (isNews) {
      const categoryLabels = newsCategories.map((v) => NEWS_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`\nLOẠI TIN TỨC: ${categoryLabels.join(', ')}`);

      const formatLabel = NEWS_FORMAT_OPTIONS.find((o) => o.value === newsFormat)?.label ?? '';
      parts.push(`ĐỊNH DẠNG: ${formatLabel}`);

      // Inject industry knowledge khi chọn ngành cụ thể
      const isSaasWithIndustry = newsCategories.includes('saas_enterprise') && newsSubtopics.length > 0;
      if (isSaasWithIndustry) {
        const industries = newsSubtopics
          .map((v) => GEMRAL_INDUSTRY_KNOWLEDGE[v])
          .filter((x) => !!x);

        for (const ind of industries) {
          parts.push(`
=== KIẾN THỨC NGÀNH: ${ind.name.toUpperCase()} ===

VỀ GEMRAL:
Gemral là giải pháp giúp doanh nghiệp Việt Nam vận hành hàng ngày (nhận đơn, bán hàng, chăm sóc khách, quảng bá) VÀ quản trị chiến lược (mục tiêu, tài chính, nhân sự) — tất cả trên một ứng dụng duy nhất, không cần biết lập trình, được tích hợp trí tuệ nhân tạo.

NỖI ĐAU CỦA CHỦ DOANH NGHIỆP NGÀNH ${ind.name.toUpperCase()}:
${ind.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

GEMRAL GIÚP GÌ (viết bằng ngôn ngữ lợi ích, KHÔNG liệt kê tính năng):
${ind.blocks.map((b) => `- ${b}`).join('\n')}

ĐIỂM NỔI BẬT NHẤT — ${ind.killerFeature.toUpperCase()}:
${ind.killerDesc}

SỰ CHUYỂN HÓA (TRƯỚC → SAU):
${ind.transformation}

TỪ KHÓA SEO CẦN TÍCH HỢP TỰ NHIÊN VÀO BÀI:
${ind.seoKeywords.join(', ')}`);
        }

        parts.push(`
QUY TẮC VIẾT BÀI GIẢI PHÁP GEMRAL — TUYỆT ĐỐI TUÂN THỦ:

1. TÊN SẢN PHẨM: Luôn gọi "Gemral" — KHÔNG BAO GIỜ gọi là "nền tảng SaaS", "phần mềm", "hệ thống ERP", "giải pháp CRM"
2. CẤM THUẬT NGỮ: TUYỆT ĐỐI KHÔNG dùng: SaaS, API, cloud, platform, software, ERP, CRM, dashboard, module, integration, automation, digital transformation, tech stack, KPI, AI (viết "trí tuệ nhân tạo" nếu cần), hay BẤT KỲ từ kỹ thuật tiếng Anh nào
3. KHÔNG GIẢI THÍCH KHÁI NIỆM: Không viết "SaaS là gì", "AI là gì", "Digital transformation là gì". Người đọc là CHỦ DOANH NGHIỆP, họ chỉ quan tâm KẾT QUẢ.
4. KHÔNG LIỆT KÊ TÍNH NĂNG: Không viết "Gemral có tính năng X, Y, Z". PHẢI viết về lợi ích, sự thay đổi, câu chuyện.
5. CẤU TRÚC BÀI — BẮT BUỘC CHIA HEADING RÕ RÀNG (dùng ## cho heading chính, ### cho heading phụ):
   ## [Heading mở đầu — vẽ bức tranh nỗi đau thực tế của chủ doanh nghiệp ngành đó]
   (1-2 đoạn văn kể câu chuyện/bức tranh thực tế)

   ## [Heading — Gemral thay đổi cuộc sống họ thế nào]
   ### [Heading phụ — khía cạnh thay đổi 1]
   (đoạn văn kể trước/sau, kết quả cụ thể)
   ### [Heading phụ — khía cạnh thay đổi 2]
   (đoạn văn tiếp)

   ## [Heading — Điểm nhấn: ${industries[0]?.killerFeature ?? 'giải pháp chuyên biệt'}]
   (giá trị đột phá riêng của Gemral cho ngành này)

   ## [Heading kết — tương lai tốt đẹp hơn]
   (rảnh tay hơn, kiếm nhiều hơn, bớt stress, tự tin phát triển)

   QUAN TRỌNG: Mỗi phần PHẢI có heading ## hoặc ### riêng. KHÔNG ĐƯỢC viết một khối text dài không có heading.

VÍ DỤ ĐÚNG:
"Chị Hương mở quán phở 3 năm. Mỗi sáng, chị phải dậy từ 4h, vừa nấu vừa ghi order bằng tay, cuối ngày ngồi cộng sổ đến 11h đêm. Từ khi dùng Gemral, khách quét mã tại bàn để gọi món, bếp nhận order ngay trên màn hình — chị không cần thuê thêm người tiếp thực. Cuối ngày, mở điện thoại là biết bán được bao nhiêu tô, nguyên liệu còn bao nhiêu. Chị nói: 'Giờ tôi về nhà lúc 8h tối, có thời gian cho con.'"

VÍ DỤ SAI (TUYỆT ĐỐI KHÔNG VIẾT THẾ NÀY):
"Gemral là nền tảng SaaS all-in-one tích hợp POS, CRM, KDS module cho ngành F&B. Với dashboard real-time analytics và API integration, doanh nghiệp có thể digital transform toàn bộ quy trình vận hành..."`);
      }

      parts.push(`
YÊU CẦU TIN TỨC (QUAN TRỌNG):
- TUYỆT ĐỐI KHÔNG dùng tên "Jennie", "Jennie Uyên Chu" hay bất kỳ tên cá nhân nào. Viết dưới danh nghĩa "Gemral", "đội ngũ Gemral".
- TUYỆT ĐỐI KHÔNG dùng emoji. Bài báo chuyên nghiệp KHÔNG CÓ emoji.
- TUYỆT ĐỐI KHÔNG dùng thuật ngữ kỹ thuật tiếng Anh (SaaS, API, cloud, platform, module, CRM, ERP, dashboard, automation, digital transformation, KPI, tech stack...). Viết HOÀN TOÀN bằng tiếng Việt dễ hiểu.
- KHÔNG viết giọng cá nhân. Giọng báo chí: ấm áp, gần gũi nhưng uy tín — như CafeBiz, Brands Vietnam.
- Ngôn ngữ: Tiếng Việt thuần, tự nhiên
- BẮT BUỘC CHIA HEADING: Bài viết PHẢI có ít nhất 3-5 heading (dùng ## và ###). Mỗi phần nội dung tối đa 2-3 đoạn văn rồi PHẢI có heading mới. TUYỆT ĐỐI KHÔNG viết một khối text dài liên tục không có heading.
- Tối ưu SEO: tiêu đề hấp dẫn, heading chứa từ khóa, cấu trúc rõ ràng

CẤU TRÚC BÀI VIẾT — PHẢI TÁCH RÕ 2 PHẦN:
===NEWS_METADATA===
Tiêu đề SEO: (viết tiêu đề tối ưu SEO)
Meta Description: (155 ký tự mô tả cho search engine)
Tags: (từ khóa phân cách bằng dấu phẩy)
TL;DR: (tóm tắt 1-2 câu cho AI search)
===NEWS_CONTENT===
(Nội dung bài viết đầy đủ ở đây — CHỈ CÓ nội dung, KHÔNG có metadata)`);
    }

    if (isEmail) {
      const emailTypeLabel = EMAIL_TYPE_OPTIONS.find((o) => o.value === emailType)?.label ?? '';
      parts.push(`\nLOẠI EMAIL: ${emailTypeLabel}`);
      if (emailSubject.trim()) {
        parts.push(`TIÊU ĐỀ EMAIL: ${emailSubject}`);
      }
    }

    return parts.join('\n');
  }, [isShortClip, isSocialPost, isNews, isEmail, isContentPlanner, clipTemplate, clipFeatures, clipCourses, clipCtaType, socialPlatforms, socialTopic, socialTopicDetails, newsCategories, newsSubtopics, newsFormat, emailType, emailSubject, plannerDuration, plannerPlatforms, plannerContentTypes, plannerTopics]);

  // -- Generate --
  const handleGenerate = useCallback(async () => {
    console.log('[DEBUG] handleGenerate called, validateBrief() =', validateBrief());
    if (!validateBrief()) return;

    console.log('[DEBUG] Form validated, setting generating to true');
    setGenerating(true);
    setOutput('');
    setPipelineStep('queued');
    setBrandResult(null);
    setGenerationDone(false);
    setNewsMetadata(null);
    setNewsPublished(null);
    setEmailSent(null);

    const controller = claudeService.createAbortController();
    abortRef.current = controller;

    const productHookLabel = productHook !== 'none'
      ? PRODUCT_HOOK_OPTIONS.find((o) => o.value === productHook)?.label ?? ''
      : '';

    const isNewsContent = isNews;
    const isEmailContent = isEmail;
    const systemPrompt = isEmailContent
      ? `Bạn là Email Marketing Designer chuyên nghiệp của Gemral. Tạo email HTML đẹp, responsive, tương thích mọi email client.

⚠️ QUY TẮC TUYỆT ĐỐI — VI PHẠM = BỊ TỪ CHỐI:
- Output bắt đầu bằng <!DOCTYPE html> và kết thúc bằng </html>.
- KHÔNG markdown, KHÔNG giải thích, KHÔNG text trước HTML.
- SAU </html>, thêm phần ===IMAGE_PROMPT=== với prompt tạo hình ảnh minh họa cho hero banner email (luxurious editorial style).

QUY TẮC EMAIL HTML:
- TABLE LAYOUT cho tương thích Outlook, Gmail, Apple Mail. KHÔNG div cho layout chính.
- ALL CSS INLINE (style="..."). KHÔNG <style> tag (Outlook bỏ qua).
- Max width: 600px, center align. Responsive: width="100%" cho mobile.
- Font: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif.

BRAND DESIGN SYSTEM GEMRAL:
- Primary background: #112250 (navy đậm) — TUYỆT ĐỐI KHÔNG dùng #000000 hay #0A0F1C.
- Light content background: #FFFFFF
- Gold accent: #FFBD59 (CTA buttons, highlights, logo text)
- Purple accent: #6A5BFF (badges, links, secondary CTA)
- Cyan accent: #00F0FF (decorative elements, icons)
- Text primary: #FFFFFF (trên nền navy) hoặc #1A1A2E (trên nền trắng)
- Text secondary: rgba(255,255,255,0.7) hoặc #666666
- CTA button: <table> + <td> background-color:#FFBD59, color:#112250, padding 14px 32px, font-weight bold.

HEADER (BẮT BUỘC — PHẢI CÓ LOGO HÌNH ẢNH):
- Background: #112250, padding 24px, text-align center.
- Logo hình ảnh GEM STAR: <img src="https://gemral.com/assets/gemral-logo.png" alt="Gemral" width="48" height="48" style="display:block;margin:0 auto 8px;" />
- Bên dưới logo hình: text "GEMRAL" — font-size 28px, color #FFBD59, font-weight 800, letter-spacing 3px.
- Dưới text logo: tagline "Công nghệ • Giáo dục • Tài chính" — font-size 12px, color rgba(255,255,255,0.5).

CTA BUTTON LINKS (BẮT BUỘC — PHẢI CÓ LINK THẬT, TUYỆT ĐỐI KHÔNG dùng href="#"):
- App Store: https://apps.apple.com/vn/app/gemral/id6756418547
- Dùng App Store link làm mặc định cho tất cả CTA buttons (vì email client không hỗ trợ deep link gem://).
- Map CTA text → link phù hợp:
  * CTA về Vision Board / Goals / Affirmation → https://apps.apple.com/vn/app/gemral/id6756418547
  * CTA về Scanner / Trading → https://apps.apple.com/vn/app/gemral/id6756418547
  * CTA về Khóa học → https://gemral.com/khoa-hoc
  * CTA về Tarot / Kinh Dịch / Tâm linh → https://apps.apple.com/vn/app/gemral/id6756418547
  * CTA về Forum / Cộng đồng → https://gemral.com/cong-dong
  * CTA về Shop / Sản phẩm → https://gemral.com/shop
  * CTA đăng ký / Nâng cấp Tier → https://apps.apple.com/vn/app/gemral/id6756418547
- TUYỆT ĐỐI KHÔNG để href="#" — mọi CTA button phải có link thật hoạt động được.

FOOTER (BẮT BUỘC):
- Background: #112250, padding 24px, text-align center.
- Dòng 1: "GEMRAL" — font-size 16px, color #FFBD59, font-weight bold.
- Dòng 2: "gemral.com" — font-size 12px, color rgba(255,255,255,0.5).
- KHÔNG có link hủy đăng ký / unsubscribe. KHÔNG có địa chỉ công ty, KHÔNG "123 Innovation Drive", KHÔNG địa chỉ giả.
- Footer chỉ có 2 dòng: GEMRAL + gemral.com. Giữ ngắn gọn.

HÌNH ẢNH:
- Dùng placeholder: https://placehold.co/600x300/112250/FFBD59?text=Hero+Image (hoặc tương tự).
- Người dùng sẽ thay placeholder bằng hình thật sau. Có alt text tiếng Việt.
- Preheader text: thêm hidden preheader ở đầu email body.
- NỘI DUNG bằng tiếng Việt có dấu đầy đủ.

CẤU TRÚC EMAIL: Header (Logo hình + GEMRAL text + tagline) → Preheader → Hero section → Nội dung chính → CTA → Footer.`
      : isNewsContent
      ? `Bạn là Content Editor chuyên nghiệp của Gemral — tổ chức công nghệ giáo dục. Viết bài tin tức/blog với giọng báo chí khách quan, uy tín.

QUY TẮC BÀI TIN TỨC (BẮT BUỘC):
- TUYỆT ĐỐI KHÔNG dùng tên "Jennie", "Jennie Uyên Chu" hay tên cá nhân. Chỉ dùng "Gemral", "đội ngũ Gemral", "Gemral Editorial".
- TUYỆT ĐỐI KHÔNG dùng emoji. Bài báo chuyên nghiệp KHÔNG CÓ emoji.
- KHÔNG viết giọng cá nhân, KHÔNG "chia sẻ với các bạn", KHÔNG "các bạn ơi". Giọng trung lập, khách quan.
- Giọng văn: như VnExpress, CafeBiz, Tuổi Trẻ — chuyên nghiệp, rõ ràng, có chiều sâu.
- MỖI BÀI PHẢI MỞ ĐẦU KHÁC NHAU. Đa dạng: nhận định, số liệu thị trường, câu hỏi, xu hướng...
- Sáng tạo, không lặp khuôn mẫu.`
      : `Bạn là Content Agent chuyên tạo nội dung sáng tạo cho Jennie Uyên Chu. Đọc knowledge files để hiểu phong cách và framework.

QUY TẮC SÁNG TẠO BẮT BUỘC:
- MỖI BÀI VIẾT PHẢI MỞ ĐẦU KHÁC NHAU. TUYỆT ĐỐI KHÔNG lặp lại câu mở đầu giống nhau.
- KHÔNG copy nguyên mẫu câu từ knowledge files (ví dụ: "Nhiều bạn nhắn cho Jennie", "Có chị nhắn cho Jennie"). Đó là VÍ DỤ để tham khảo, KHÔNG phải template.
- Sáng tạo các kiểu mở đầu đa dạng: câu hỏi, nhận định, câu chuyện ngắn, số liệu, trích dẫn, tình huống thực tế...
- Mỗi lần tạo nội dung là một góc nhìn mới, cách tiếp cận mới.
- Giữ giọng nói Jennie nhưng đừng lặp khuôn.

QUY TẮC EMOJI (ÁP DỤNG CHO BÀI ĐĂNG MXH, KỊCH BẢN):
- LUÔN thêm emoji vào nội dung bài viết ở những vị trí phù hợp để tạo sự bắt mắt và dễ đọc.
- Sử dụng 3-8 emoji mỗi bài (tuỳ độ dài), KHÔNG quá lố, VỪA ĐỦ để tạo điểm nhấn.
- Đặt emoji ở: đầu mỗi ý chính, sau tiêu đề phụ, ở CTA, và ở những điểm chuyển ý quan trọng.
- Ưu tiên emoji phù hợp brand: ✨ 💎 🌟 💫 🔥 💪 🙏 💜 🌈 ⭐ 🎯 💡 🌸 🦋
- TUYỆT ĐỐI KHÔNG dùng emoji thay thế từ ngữ, chỉ dùng để bổ sung visual.

QUY TẮC FACEBOOK COMPLIANCE (BẮT BUỘC — ĐỂ TRÁNH BỊ GIẢM REACH):
- TUYỆT ĐỐI KHÔNG sử dụng quá 2 con số trong toàn bài viết. Nếu cần đề cập số liệu, dùng từ ngữ mô tả thay thế (ví dụ: "phần lớn", "hầu hết", "rất nhiều", "một số ít" thay vì "90%", "78%", "50-55%").
- KHÔNG viết giá tiền cụ thể (299K, 11M, 21M, 68M...). Thay vào đó dùng: "chi phí hợp lý", "đầu tư xứng đáng", "giá trị vượt xa kỳ vọng".
- KHÔNG liệt kê nhiều số phần trăm (%, ROI, win rate, lợi nhuận cụ thể). Facebook sẽ flag là "bán hàng" hoặc "lừa đảo tài chính".
- KHÔNG dùng ngôn ngữ "làm giàu nhanh" hoặc "get-rich-quick": tránh các cụm từ như "kiếm tiền dễ dàng", "thu nhập thụ động ngay", "giàu sau X tháng", "tự do tài chính nhanh chóng", "lợi nhuận khủng", "x2 x3 tài khoản".
- KHÔNG viết kiểu hứa hẹn kết quả cụ thể: "cam kết lợi nhuận", "chắc chắn thành công", "100% hiệu quả", "đảm bảo có lãi". Thay vào đó dùng: "nhiều học viên đã chia sẻ", "cộng đồng đã trải nghiệm".
- KHÔNG viết nội dung có tính chất mê tín dị đoan quá mức: tránh đề cập trực tiếp "phong thuỷ quyết định giàu nghèo", "vận mệnh tiền bạc", "bùa may mắn tài chính". Thay vào đó dùng góc nhìn phát triển bản thân: "năng lượng", "tư duy", "mindset".
- KHÔNG viết kiểu lừa đảo/deceive: tránh "bí mật mà KHÔNG AI nói cho bạn", "phương pháp ĐỘC QUYỀN chỉ có ở đây", "cơ hội CUỐI CÙNG". Thay vào đó dùng giọng chia sẻ chân thành.
- KHÔNG viết clickbait quá mức: tránh viết hoa toàn bộ tiêu đề, tránh dùng quá nhiều dấu chấm than (!!!), tránh tạo FOMO giả.
- Ưu tiên STORYTELLING thay vì hard-sell: kể câu chuyện thực → rút ra bài học → CTA nhẹ nhàng (câu hỏi mở, mời comment).
- CTA nên dạng mềm: "Bạn nghĩ sao?", "Chia sẻ trải nghiệm của bạn nha", "Comment cho Jennie biết" — KHÔNG dùng "Đăng ký ngay", "Mua ngay", "Inbox ngay kẻo hết".`;

    const dynamicContext = buildDynamicContext();
    const userPromptParts = [
      `LOẠI NỘI DUNG: ${selectedOption.label}`,
    ];
    if (batchCount > 1) {
      userPromptParts.push(`\nSỐ LƯỢNG BÀI CẦN TẠO: ${batchCount} (phân cách mỗi bài bằng dòng "===BÀI MỚI===")`);
    }
    if (brief.trim()) {
      userPromptParts.push(`\nNỘI DUNG TÓM TẮT:\n${brief}`);
    }
    if (dynamicContext) {
      userPromptParts.push(dynamicContext);
    }
    // Brand voice instruction
    if (brandVoice === 'generic') {
      userPromptParts.push(`\n⚠️ GIỌNG THƯƠNG HIỆU: GENERIC (KHÔNG PHẢI JENNIE)
- TUYỆT ĐỐI KHÔNG nhắc đến tên "Jennie", "Jennie Uyên Chu", hoặc bất kỳ tên cá nhân nào.
- KHÔNG dùng ngôi thứ nhất "Jennie" ("Jennie quan sát thấy...", "Jennie chia sẻ...").
- Viết với giọng thương hiệu chuyên nghiệp, trung tính: "Bạn có biết...", "Chúng tôi nhận thấy...", "Nhiều người đã..."
- Có thể nhắc tên thương hiệu Gemral nếu liên quan.`);
    }

    if (persona !== 'auto') {
      userPromptParts.push(`\nPERSONA: ${persona}`);
    }
    if (writingMode !== 'auto') {
      userPromptParts.push(`\nCHẾ ĐỘ VIẾT: ${writingMode}`);
    }
    if (productHookLabel) {
      userPromptParts.push(`\nPRODUCT HOOK: ${productHookLabel}`);
    }
    userPromptParts.push('\nTạo nội dung đầy đủ theo cấu trúc và quy tắc trong knowledge files.');
    userPromptParts.push(`\nSau nội dung bài viết, thêm phần:
===IMAGE_PROMPT===
Viết 1 prompt chi tiết bằng tiếng Anh để tạo hình ảnh minh hoạ. Prompt PHẢI phản ánh chính xác NỘI DUNG CỤ THỂ của bài viết.

QUAN TRỌNG — NGƯỜI VÀ BỐI CẢNH PHẢI KHỚP NỘI DUNG BÀI:
- Mỗi bài viết có chủ đề riêng → hình ảnh PHẢI thể hiện đúng chủ đề đó.
- TUYỆT ĐỐI KHÔNG dùng hình generic "người mặc blazer đứng cười". Đó là SAI.
- Người trong ảnh PHẢI ĐANG LÀM một hành động liên quan đến nội dung bài:
  * Bài về F&B → chủ quán đang nấu ăn, phục vụ khách, đứng trong bếp nhà hàng
  * Bài về Clinic → bác sĩ đang khám bệnh nhân, y tá tại quầy lễ tân, phòng khám hiện đại
  * Bài về PropTech → quản lý toà nhà đang kiểm tra căn hộ, khách hàng xem nhà
  * Bài về Education → giáo viên đang giảng bài, học viên trong lớp học
  * Bài về Spa/Salon → thợ đang làm tóc/nail, khách đang thư giãn, không gian spa
  * Bài về ConTech → kỹ sư tại công trường, đang xem bản vẽ, mũ bảo hộ
  * Bài về AgriTech → nông dân tại vườn/trang trại, thu hoạch, đóng gói
  * Bài về Logistics → nhân viên kho bãi, xe tải giao hàng, scan barcode
  * Bài về crypto/tài chính → trader xem biểu đồ, nhà đầu tư tại bàn làm việc
  * Bài về lifestyle → người thật trong hoạt động đời thường, yoga, cafe, đọc sách
- MÔI TRƯỜNG XUNG QUANH phải phù hợp: nhà hàng → bếp/phòng ăn, clinic → phòng khám, v.v.
- ĐỒ VẬT trong ảnh phải liên quan: dao thớt cho F&B, ống nghe cho clinic, máy tính cho văn phòng, v.v.

QUAN TRỌNG VỀ TEXT TRONG HÌNH:
- Nếu hình ảnh cần có chữ/text/title/quote hiển thị trên hình, BẮT BUỘC viết chữ đó bằng TIẾNG VIỆT CÓ DẤU đầy đủ.
- TUYỆT ĐỐI KHÔNG viết text nội dung bằng tiếng Anh.
- Phần mô tả kỹ thuật (camera, lighting, style...) viết tiếng Anh bình thường, chỉ riêng TEXT HIỂN THỊ TRÊN HÌNH phải là tiếng Việt.

QUY TẮC BẮT BUỘC CHO IMAGE PROMPT:
- PHONG CÁCH: Luxurious high-end editorial photography. KHÔNG BAO GIỜ dùng illustration, digital art, cartoon, anime, painting. KHÔNG minimalist/tối giản.
- NGƯỜI: Người thật Việt Nam, da châu Á, tóc đen, nét mặt tự nhiên. KHÔNG hoạt hình, CGI.
- TRANG PHỤC: TUYỆT ĐỐI KHÔNG cho nhân vật mặc blazer, vest, suit jacket. Thay bằng elegant casual: áo lụa, áo trễ vai, áo cổ V thanh lịch, hoặc outfit phù hợp ngữ cảnh (ví dụ: trader mặc áo sơ mi đơn giản, yoga mặc đồ tập).
- ĐỒ VẬT & BỐI CẢNH: Rich textures (marble, velvet, warm wood, golden accents). Không gian thật, sang trọng, premium.
- CAMERA: lens (35mm environmental, 50mm, 85mm portrait), cinematic golden hour lighting, dramatic rim lighting, soft warm bokeh, depth of field.
- BẮT ĐẦU PROMPT bằng: "Luxurious editorial photograph, cinematic golden hour lighting, shot on Canon EOS R5 with 85mm f/1.4 lens,"
- Mô tả CHI TIẾT: ai đang làm gì, ở đâu, xung quanh có gì, cảm xúc, ánh sáng ấm, màu sắc sang trọng.${isNews ? `

QUY TẮC BỔ SUNG CHO HÌNH ẢNH BÀI TIN TỨC:
- TITLE OVERLAY: Hình ảnh PHẢI có text overlay — một câu tiêu đề ngắn gọn hoặc quote viral lấy từ nội dung bài tin tức.
- Tiêu đề/quote phải: ngắn (tối đa 8-12 từ), gây tò mò, viral-worthy, PHẢI VIẾT BẰNG TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ.
- HIỆU ỨNG NỀN: gradient background từ Navy #112250 → Deep Blue #0A1628, subtle purple glow effect (#6A5BFF at low opacity), scattered small light particles (bokeh-like sparkling dots).
- FONT CHỮ: Montserrat Bold, Gold #FFBD59, IN HOA (UPPERCASE), kích thước lớn nổi bật, soft golden glow effect xung quanh chữ.
- Vị trí text: centered, căn giữa hình.
- PHẦN NỀN PHÍA SAU TEXT phải có hình ảnh mờ (blurred) liên quan đến nội dung bài viết, KHÔNG để nền trống.
- Ví dụ: bài về F&B → nền mờ bếp nhà hàng, bài crypto → nền mờ biểu đồ trading.
- Ví dụ câu tiêu đề: "KHÁCH CHỜ LÂU: ĐÃ CÓ LỜI GIẢI?", "5 XU HƯỚNG AI THAY ĐỔI DOANH NGHIỆP 2026"
- TUYỆT ĐỐI KHÔNG viết title bằng tiếng Anh.
- Text PHẢI liên quan trực tiếp đến nội dung chính của bài viết, KHÔNG generic.` : ''}`);


    const userPrompt = userPromptParts.join('');
    console.log('[DEBUG] userPrompt:', userPrompt);

    try {
      console.log(`[DEBUG] Calling claudeService.generate — provider=${aiProvider}, model=${aiModel}, jobType=${jobType}`);
      const result = await claudeService.generate({
        model: aiModel,
        provider: aiProvider,
        systemPrompt,
        userPrompt,
        maxTokens: contentType === 'short_clip' ? 2048 : jobType === 'title' ? 4096 : jobType === 'email' ? 16384 : jobType === 'news' ? 16384 : 16384,
        temperature: writingMode === 'mode_2_provocative' ? 0.85 : 0.7,
        signal: controller.signal,
        jobType,
        source: 'web_app',
        contentType: contentType ?? undefined,
        persona: persona !== 'auto' ? persona : undefined,
        writingMode: writingMode !== 'auto' ? writingMode : undefined,
        brandVoice,
        onStream: (chunk) => {
          setOutput(chunk);
          setPipelineStep('processing');
        },
        onProgress: () => {
          setPipelineStep('processing');
        },
      });

      console.log('[DEBUG] claudeService.generate success:', result);

      // Email HTML: clean up, strip IMAGE_PROMPT, extract HTML only
      if (isEmailContent) {
        let htmlContent = result.content.trim();
        // Strip markdown code fences if AI wrapped in ```html ... ```
        if (htmlContent.startsWith('```')) {
          htmlContent = htmlContent.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        // Extract and remove ===IMAGE_PROMPT=== section if AI included it
        let emailImgPrompt = '';
        const imgMarkerIdx = htmlContent.indexOf('===IMAGE_PROMPT===');
        if (imgMarkerIdx !== -1) {
          emailImgPrompt = htmlContent.slice(imgMarkerIdx + '===IMAGE_PROMPT==='.length).trim();
          htmlContent = htmlContent.slice(0, imgMarkerIdx).trim();
        }
        // Strip any non-HTML preamble before <!DOCTYPE or <html
        const doctypeIdx = htmlContent.indexOf('<!DOCTYPE');
        const htmlTagIdx = htmlContent.indexOf('<html');
        const cleanStartIdx = doctypeIdx !== -1 ? doctypeIdx : htmlTagIdx;
        if (cleanStartIdx > 0) {
          htmlContent = htmlContent.slice(cleanStartIdx);
        }
        // Strip any trailing text after </html>
        const htmlEndIdx = htmlContent.lastIndexOf('</html>');
        if (htmlEndIdx !== -1) {
          htmlContent = htmlContent.slice(0, htmlEndIdx + '</html>'.length);
        }
        setOutput(htmlContent);
        setImagePrompt(emailImgPrompt);
        setPipelineStep('completed');
        setGenerationDone(true);
        // Auto-extract subject from HTML <title> if not set
        if (!emailSubject) {
          const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
          if (titleMatch?.[1]) setEmailSubject(titleMatch[1]);
        }
        addToast({ type: 'success', title: 'Hoàn thành', message: 'Email HTML đã được tạo thành công.' });
        setGenerating(false);
        abortRef.current = null;
        return;
      }

      // Tách image prompt nếu có
      const imgMarker = '===IMAGE_PROMPT===';
      let mainContent = result.content;
      let imgPrompt = '';
      const imgIdx = result.content.indexOf(imgMarker);
      if (imgIdx !== -1) {
        mainContent = result.content.slice(0, imgIdx).trim();
        imgPrompt = result.content.slice(imgIdx + imgMarker.length).trim();
      }

      // Tách metadata (META DESCRIPTION, Tags, TL;DR, Tiêu đề SEO) ra khỏi nội dung chính cho tin tức
      let cleanContent = mainContent;
      const extractedMeta = { metaDescription: '', tags: '', tldr: '', title: '' };
      if (isNews) {
        // Phương pháp 1: Tách theo markers ===NEWS_METADATA=== và ===NEWS_CONTENT===
        const metaMarker = '===NEWS_METADATA===';
        const contentMarker = '===NEWS_CONTENT===';
        const hasStructuredFormat = mainContent.includes(metaMarker) || mainContent.includes(contentMarker);

        if (hasStructuredFormat) {
          const metaIdx = mainContent.indexOf(metaMarker);
          const contentIdx = mainContent.indexOf(contentMarker);
          let metaBlock = '';

          if (metaIdx !== -1 && contentIdx !== -1) {
            metaBlock = mainContent.slice(metaIdx + metaMarker.length, contentIdx).trim();
            cleanContent = mainContent.slice(contentIdx + contentMarker.length).trim();
          } else if (metaIdx !== -1) {
            metaBlock = mainContent.slice(metaIdx + metaMarker.length).trim();
            cleanContent = '';
          } else if (contentIdx !== -1) {
            cleanContent = mainContent.slice(contentIdx + contentMarker.length).trim();
          }

          // Parse metadata block
          const titleMatch = metaBlock.match(/(?:Tiêu đề\s*(?:SEO)?|TIÊU ĐỀ\s*(?:SEO)?)\s*:\s*(.+)/i);
          const metaDescMatch = metaBlock.match(/(?:Meta\s*Description|META\s*DESCRIPTION)\s*:\s*(.+)/i);
          const tagsMatch = metaBlock.match(/(?:Tags?|TAGS?|Keywords?)\s*:\s*(.+)/i);
          const tldrMatch = metaBlock.match(/(?:TL;?DR|Tóm tắt|TÓM TẮT)\s*:\s*(.+)/i);

          if (titleMatch?.[1]) extractedMeta.title = titleMatch[1].trim();
          if (metaDescMatch?.[1]) extractedMeta.metaDescription = metaDescMatch[1].trim();
          if (tagsMatch?.[1]) extractedMeta.tags = tagsMatch[1].trim();
          if (tldrMatch?.[1]) extractedMeta.tldr = tldrMatch[1].trim();
        } else {
          // Phương pháp 2: Fallback — regex tìm từng field trong nội dung
          const metaPatterns = [
            { key: 'metaDescription', regex: /(?:^|\n)\s*\**\s*(?:META\s*DESCRIPTION|Meta\s*Description)[:\s]*\**\s*(.+?)(?=\n\s*\**\s*(?:TAG|Tag|TL;?DR|TIÊU ĐỀ|Tiêu đề|Keywords|##|\n\n)|\n*$)/si },
            { key: 'tags', regex: /(?:^|\n)\s*\**\s*(?:TAGS?|Tags?|KEYWORDS?|Keywords?)[:\s/]*\**\s*(.+?)(?=\n\s*\**\s*(?:META|TL;?DR|TIÊU ĐỀ|Tiêu đề|##|\n\n)|\n*$)/si },
            { key: 'tldr', regex: /(?:^|\n)\s*\**\s*(?:TL;?DR|Tl;?dr|TÓM TẮT)[:\s]*\**\s*(.+?)(?=\n\s*\**\s*(?:META|TAG|TIÊU ĐỀ|##|\n\n)|\n*$)/si },
            { key: 'title', regex: /(?:^|\n)\s*\**\s*(?:TIÊU ĐỀ\s*(?:SEO)?|Tiêu đề\s*(?:SEO)?)[:\s]*\**\s*(.+?)(?=\n\s*\**\s*(?:META|TAG|TL;?DR|##|\n\n)|\n*$)/si },
          ];
          for (const { key, regex } of metaPatterns) {
            const match = mainContent.match(regex);
            if (match?.[1]) {
              extractedMeta[key] = match[1].trim().replace(/^\*+|\*+$/g, '');
              cleanContent = cleanContent.replace(match[0], '\n');
            }
          }
        }
        // Clean up multiple blank lines
        cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();
        setNewsMetadata(extractedMeta);
      } else {
        setNewsMetadata(null);
      }

      setOutput(cleanContent);
      setImagePrompt(imgPrompt);
      setPipelineStep('completed');
      setGenerationDone(true);

      if (contentType) {
        const checkResult = brandVoiceChecker.check(mainContent, contentType);
        setBrandResult(checkResult);
      }

      addToast({
        type: 'success',
        title: 'Hoàn thành',
        message: `Đã tạo ${vietnameseNLP.countWords(mainContent)} từ thành công.`,
      });
    } catch (err) {
      console.error('[DEBUG] claudeService.generate error:', err);
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      if (message.includes('huỷ') || message.includes('hủy')) {
        addToast({ type: 'info', message: 'Đã hủy tạo nội dung.' });
      } else {
        addToast({ type: 'error', title: 'Lỗi tạo nội dung', message, duration: 15000 });
        // Hiển thị lỗi ngay trong output area để user thấy rõ
        setOutput(`❌ LỖI TẠO NỘI DUNG\n\n${message}\n\n💡 Gợi ý khắc phục:\n• Kiểm tra đã đăng nhập Supabase chưa (F12 → Console)\n• Chạy batch_processor: python scripts/batch_processor.py --batch\n• Kiểm tra bảng cc_generation_jobs trong Supabase Dashboard`);
        setPipelineStep('queued');
      }
    } finally {
      console.log('[DEBUG] handleGenerate finished, setting generating to false');
      setGenerating(false);
      abortRef.current = null;
    }
  }, [brief, outputType, selectedOption, jobType, contentType, persona, writingMode, productHook, batchCount, buildDynamicContext, validateBrief, addToast, aiProvider, aiModel, isEmail, emailSubject]);

  // -- Cancel --
  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
    setPipelineStep('queued');
    addToast({ type: 'info', message: 'Đã hủy tạo nội dung.' });
  }, [addToast]);

  // -- Copy --
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      addToast({ type: 'success', message: 'Đã sao chép vào clipboard.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    }
  }, [output, addToast]);

  // -- Auto-save: batch_processor đã tự động lưu (server-side)
  useEffect(() => {
    if (!generationDone || !output) return;
    setSavedId('batch_processor');
    // Ghi nhận session_id từ batch processor output (nếu có)
    try {
      const parsed = typeof output === 'string' ? JSON.parse(output) : output;
      if (parsed?.session_id) setSessionId(parsed.session_id);
    } catch {
      // Output không phải JSON — bỏ qua
    }
    addToast({ type: 'success', title: 'Đã tự động lưu', message: 'Nội dung đã được lưu nháp bởi batch processor.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationDone]);

  // Reset savedId khi bắt đầu tạo mới
  useEffect(() => {
    if (generating) {
      setSavedId(null);
      setSessionId(null);
      setIterateHistory([]);
      setIterateInput('');
      setImagePrompt('');
      setIsEditing(false);
      setUploadedImages([]);
      setPublishResults([]);
    }
  }, [generating]);

  // ═══════════════════════════════════════════════
  // ITERATE — Sửa script trong cùng session
  // ═══════════════════════════════════════════════
  const handleIterate = useCallback(async (instruction) => {
    if (!instruction?.trim() || !sessionId) return;

    setIterating(true);
    setIterateHistory(prev => [...prev, { role: 'user', text: instruction }]);
    setIterateInput('');

    try {
      const { generationJobService } = await import('../../gem/services/data/generationJobService');
      // Tạo iterate job → batch processor sẽ dùng --continue
      const result = await generationJobService.create({
        job_type: 'script',
        input_params: {
          action: 'iterate',
          session_id: sessionId,
          instruction: instruction,
          content_type: outputType?.replace('script_', '') || 'latc',
        },
        content_type: outputType?.replace('script_', '') || null,
        created_by: 'current_user', // Will be replaced by auth context
        source: 'web_iterate',
      });

      if (result.success) {
        setIterateHistory(prev => [...prev, {
          role: 'ai',
          text: `Đã gửi yêu cầu chỉnh sửa. Job ID: ${result.data?.id}`,
        }]);
        addToast({ type: 'info', message: 'Đã gửi yêu cầu chỉnh sửa cho AI.' });
      } else {
        setIterateHistory(prev => [...prev, { role: 'ai', text: `Lỗi: ${result.error}` }]);
      }
    } catch (err) {
      setIterateHistory(prev => [...prev, { role: 'ai', text: `Lỗi: ${err.message}` }]);
    } finally {
      setIterating(false);
    }
  }, [sessionId, outputType, addToast]);

  // Quick iterate shortcuts
  const ITERATE_SHORTCUTS = [
    { label: 'Sửa Hook', instruction: 'Sửa phần Hook cho mạnh hơn, emotional hơn.' },
    { label: 'Thêm VD', instruction: 'Thêm ví dụ đời sống vào phần thiếu ví dụ nhất.' },
    { label: 'Mềm CTA', instruction: 'Làm mềm CTA cuối theo MODE 1 (nhẹ nhàng, không aggressive).' },
    { label: 'Kiểm tra', instruction: 'Kiểm tra 10 quy tắc vàng. Liệt kê các vi phạm nếu có.' },
    { label: 'Tạo Tiêu Đề', instruction: 'Tạo 4 tiêu đề cho kịch bản này theo 4 công thức khác nhau.' },
  ];

  // -- Image upload handlers --
  const handleImageFiles = useCallback(async (files) => {
    const newImages = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10 - uploadedImages.length);
    if (newImages.length === 0) return;

    const previews = newImages.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setUploadedImages(prev => [...prev, ...previews]);
  }, [uploadedImages.length]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleImageFiles(e.dataTransfer.files);
    }
  }, [handleImageFiles]);

  const removeImage = useCallback((index) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      if (updated[index]) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // -- Upload images to Supabase then publish --
  const handlePublish = useCallback(async (platform) => {
    if (!output) return;
    setPublishing(platform);

    try {
      let imageUrls = [];

      // Upload images first if any
      if (uploadedImages.length > 0) {
        setUploading(true);
        const formData = new FormData();
        uploadedImages.forEach(img => formData.append('files', img.file));

        const uploadRes = await fetch('/api/social/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error);
        imageUrls = uploadData.urls;
        setUploading(false);

        // Update image previews with URLs
        setUploadedImages(prev => prev.map((img, i) => ({
          ...img,
          url: imageUrls[i] || img.url,
        })));
      }

      // Publish to platform
      const publishBody = {
        platform: platform.toLowerCase(),
        content: output,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };
      // Nếu đăng Facebook → gửi page ID được chọn
      if (platform === 'Facebook' && selectedFbPage) {
        publishBody.facebookPageId = selectedFbPage;
      }
      // Nếu đang ở chế độ đặt lịch → gửi scheduledTime
      if (scheduleMode && scheduledDateTime && platform === 'Facebook') {
        publishBody.scheduledTime = Math.floor(new Date(scheduledDateTime).getTime() / 1000);
      }
      const publishRes = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishBody),
      });
      const publishData = await publishRes.json();
      if (!publishData.success) throw new Error(publishData.error);

      setPublishResults(prev => [...prev, { platform, url: publishData.postUrl }]);

      // Auto-comment nếu đã bật và đăng Facebook thành công (không phải scheduled)
      if (autoCommentEnabled && autoCommentText.trim() && platform === 'Facebook' && !publishData.scheduled && publishData.postId) {
        try {
          const commentRes = await fetch('/api/social/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: publishData.postId,
              pageId: selectedFbPage || undefined,
              message: autoCommentText,
              link: autoCommentLink || undefined,
            }),
          });
          const commentData = await commentRes.json();
          if (commentData.success) {
            addToast({ type: 'success', title: 'Auto-comment', message: 'Đã đăng comment tự động!' });
          }
        } catch {
          addToast({ type: 'warning', title: 'Auto-comment thất bại', message: 'Bài đăng đã thành công nhưng comment tự động bị lỗi.' });
        }
      }

      addToast({
        type: 'success',
        title: publishData.scheduled ? `Đã đặt lịch ${platform}!` : `Đã đăng lên ${platform}!`,
        message: publishData.message,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đăng bài';
      addToast({ type: 'error', title: `Lỗi ${platform}`, message: msg });
    } finally {
      setPublishing(null);
      setUploading(false);
    }
  }, [output, uploadedImages, addToast, selectedFbPage, autoCommentEnabled, autoCommentText, autoCommentLink, scheduleMode, scheduledDateTime]);

  // -- Post to Gemral Forum --
  const handlePostToForum = useCallback(async () => {
    if (!output) return;
    setPublishing('Forum Gemral');
    try {
      const { supabase: gemralSupabase } = await import('../../lib/supabaseClient');
      const { data: { user } } = await gemralSupabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập Gemral');

      // Upload images to CC Supabase storage (where the bucket exists), then use public URLs
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        setUploading(true);
        const { getSupabase } = await import('@gem/services/api/supabase');
        const ccSupa = getSupabase();
        for (const img of uploadedImages) {
          if (!img.file) { if (img.url) imageUrls.push(img.url); continue; }
          const ext = img.file.name.split('.').pop() || 'jpg';
          const filePath = `forum/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await ccSupa.storage
            .from('social-media-images')
            .upload(filePath, img.file, { contentType: img.file.type, upsert: false });
          if (upErr) { console.warn('[CCAIGen] Forum image upload failed:', upErr); continue; }
          const { data: urlData } = ccSupa.storage.from('social-media-images').getPublicUrl(filePath);
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
        }
        setUploading(false);
      }

      const { data: post, error } = await gemralSupabase.from('forum_posts').insert({
        user_id: user.id,
        title: '',
        content: output,
        image_url: imageUrls[0] || null,
        media_urls: imageUrls.length > 0 ? imageUrls : [],
        status: 'published',
        category_id: null,
        feed_type: 'general',
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
      }).select('id').single();

      if (error) throw new Error(error.message);

      const postUrl = `https://gemral.com/cong-dong?post=${post?.id || ''}`;
      setPublishResults(prev => [...prev, { platform: 'Forum Gemral', url: postUrl }]);
      addToast({ type: 'success', title: 'Đã đăng lên Forum Gemral!', message: 'Bài viết đã xuất hiện trên cộng đồng.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đăng forum';
      addToast({ type: 'error', title: 'Lỗi Forum Gemral', message: msg });
    } finally {
      setPublishing(null);
      setUploading(false);
    }
  }, [output, uploadedImages, addToast]);

  // -- Publish news article via Supabase directly --
  const handlePublishNews = useCallback(async (status) => {
    if (!output) return;
    setNewsPublishing(true);

    try {
      const { getSupabase } = await import('@gem/services/api/supabase');
      const supabase = getSupabase();

      // Upload images to CC Supabase Storage (public bucket)
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        const { getSupabase: getCCSupabase } = await import('@gem/services/api/supabase');
        const ccSupa = getCCSupabase();
        for (const img of uploadedImages) {
          if (!img.file) continue;
          const ext = img.file.name.split('.').pop() || 'jpg';
          const filePath = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await ccSupa.storage
            .from('social-media-images')
            .upload(filePath, img.file, { contentType: img.file.type, upsert: false });
          if (uploadErr) {
            console.warn('[CCAIGen] Image upload failed:', uploadErr);
            continue;
          }
          const { data: urlData } = ccSupa.storage.from('social-media-images').getPublicUrl(filePath);
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
        }
        if (imageUrls.length > 0) {
          setUploadedImages(prev => prev.map((img, i) => ({
            ...img,
            url: imageUrls[i] || img.url,
          })));
        }
      }

      // Split content/imagePrompt if combined
      const imgMarker = '===IMAGE_PROMPT===';
      let articleContent = output;
      const coverImageUrl = imageUrls[0] || uploadedImages[0]?.url || undefined;
      if (output.includes(imgMarker)) {
        articleContent = output.split(imgMarker)[0]?.trim() ?? output;
      }

      // Generate slug
      const slug = (newsMetadata?.title || brief || 'article')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 100)
        + '-' + Date.now().toString(36);

      // Dùng metadata đã tách nếu có, fallback nếu không
      const title = newsMetadata?.title || brief || articleContent.split('\n')[0]?.replace(/^#+\s*/, '') || 'Untitled';
      const metaDesc = newsMetadata?.metaDescription || articleContent.replace(/[#*\n]/g, ' ').trim().slice(0, 155);
      const tags = newsMetadata?.tags
        ? newsMetadata.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : newsCategories;

      const wordCount = articleContent.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));

      const { data: article, error } = await supabase
        .from('cc_news_articles')
        .insert({
          title,
          slug,
          meta_description: metaDesc,
          content: articleContent,
          excerpt: articleContent.replace(/[#*\n]/g, ' ').trim().slice(0, 200) + '...',
          category: newsCategories[0] ?? 'crypto_market',
          tags,
          cover_image_url: coverImageUrl,
          author: 'Gemral Editorial',
          status,
          published_at: status === 'published' ? new Date().toISOString() : null,
          reading_time_minutes: readingTime,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Cross-post to Gemral forum_posts (so it appears on the forum)
      let forumPostId = null;
      if (status === 'published') {
        try {
          const { supabase: gemralSupabase } = await import('../../lib/supabaseClient');
          const { data: { user } } = await gemralSupabase.auth.getUser();
          if (user) {
            const { data: forumPost } = await gemralSupabase.from('forum_posts').insert({
              user_id: user.id,
              title,
              content: articleContent,
              image_url: coverImageUrl || null,
              media_urls: imageUrls.length > 0 ? imageUrls : (coverImageUrl ? [coverImageUrl] : []),
              status: 'published',
              category_id: null,
              post_type: 'news',
              feed_type: 'news',
              topic: 'tin-tuc',
              likes_count: 0,
              comments_count: 0,
              views_count: 0,
            }).select('id').single();
            forumPostId = forumPost?.id;
          }
        } catch (crossPostErr) {
          console.warn('[CCAIGen] Cross-post to forum failed:', crossPostErr);
          // Don't fail the whole publish if cross-post fails
        }
      }

      setNewsPublished({
        id: article?.id ?? `local-${Date.now()}`,
        slug: article?.slug ?? slug,
        publishUrl: forumPostId
          ? `https://gemral.com/forum/thread/${forumPostId}`
          : `https://gemral.com/forum`,
      });
      addToast({
        type: 'success',
        title: status === 'published' ? 'Đã xuất bản tin tức!' : 'Đã lưu nháp!',
        message: `Bài "${title}" đã được ${status === 'published' ? 'xuất bản' : 'lưu nháp'} thành công.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đăng tin tức';
      addToast({ type: 'error', title: 'Lỗi đăng tin', message: msg });
    } finally {
      setNewsPublishing(false);
    }
  }, [output, brief, newsCategories, uploadedImages, addToast, newsMetadata]);

  // -- Send email via Resend + track in cc_email_campaigns --
  const handleSendEmail = useCallback(async () => {
    const htmlContent = output || manualEmailHtml;
    if (!htmlContent || !emailRecipients.trim()) {
      addToast({ type: 'error', message: 'Vui lòng nhập HTML email và địa chỉ người nhận.' });
      return;
    }
    if (!emailSubject.trim()) {
      addToast({ type: 'error', message: 'Vui lòng nhập tiêu đề email.' });
      return;
    }

    setEmailSending(true);
    try {
      const recipients = emailRecipients.split(',').map(e => e.trim()).filter(Boolean);

      // 1. Gửi email qua API
      const res = await fetch('/api/ops/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailSender,
          to: recipients,
          subject: emailSubject,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 2. Track campaign trong cc_email_campaigns
      try {
        const OWNER_UUID = '01fe99b8-ef1b-4cdd-892a-3e976d6b1881';
        const { supabase: gemralSupa } = await import('../../lib/supabaseClient');
        let userId = OWNER_UUID;
        try {
          const { data: { user } } = await gemralSupa.auth.getUser();
          if (user?.id) userId = user.id;
        } catch {}
        const campaignName = emailSubject.slice(0, 80) || `Email ${new Date().toLocaleDateString('vi-VN')}`;
        {
          const { data: campaign, error: insertErr } = await gemralSupa.from('cc_email_campaigns').insert({
            created_by: userId,
            name: campaignName,
            subject: emailSubject,
            html_body: htmlContent,
            from_name: emailSender.split('<')[0]?.trim() || 'Jennie Uyen Chu',
            from_email: emailSender.match(/<(.+)>/)?.[1] || emailSender,
            campaign_type: 'one_time',
            audience_type: 'manual',
            audience_count: recipients.length,
            total_sent: recipients.length,
            status: 'sent',
            sent_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            resend_batch_id: data.id || null,
          }).select('id').single();

          if (insertErr) console.error('[CCAIGen] INSERT cc_email_campaigns error:', insertErr);
          // 3. Tạo cc_email_sends cho từng recipient
          if (campaign?.id) {
            const sends = recipients.map((email) => ({
              campaign_id: campaign.id,
              recipient_email: email,
              resend_message_id: data.id || null,
              status: 'sent',
              sent_at: new Date().toISOString(),
            }));
            await gemralSupa.from('cc_email_sends').insert(sends);
          }
        }
      } catch (trackErr) {
        console.error('[CCAIGen] Email campaign tracking failed:', trackErr);
        // Không fail toàn bộ flow nếu tracking thất bại
      }

      setEmailSent({ id: data.id, recipients });
      addToast({
        type: 'success',
        title: 'Email đã gửi!',
        message: `Đã gửi thành công đến ${recipients.length} người nhận. Campaign đã được ghi nhận.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi email';
      addToast({ type: 'error', title: 'Lỗi gửi email', message: msg });
    } finally {
      setEmailSending(false);
    }
  }, [output, emailSubject, emailRecipients, emailSender, addToast]);

  // -- Email: detect image placeholders --
  const emailPlaceholders = React.useMemo(() => {
    if (!isEmail || !output) return [];
    const regex = /https?:\/\/placehold\.co\/[^\s"'<>]+/gi;
    const matches = [];
    let m;
    while ((m = regex.exec(output)) !== null) {
      matches.push({ url: m[0], index: m.index });
    }
    return matches;
  }, [isEmail, output]);

  // -- Email: handle image upload to replace placeholder --
  const handleEmailImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'Chỉ chấp nhận file hình ảnh.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Hình ảnh tối đa 5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result;
      if (emailReplacingIdx !== null && emailPlaceholders[emailReplacingIdx]) {
        // Replace specific placeholder
        const placeholder = emailPlaceholders[emailReplacingIdx].url;
        setOutput((prev) => prev.split(placeholder).join(dataUri));
        addToast({ type: 'success', message: 'Đã thay hình placeholder.' });
      } else {
        // Insert at end of body before </body> or append
        const imgTag = `<tr><td align="center" style="padding:16px;"><img src="${dataUri}" alt="Hình ảnh email" width="560" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></td></tr>`;
        setOutput((prev) => {
          const bodyEnd = prev.lastIndexOf('</table>');
          if (bodyEnd !== -1) {
            return prev.slice(0, bodyEnd) + imgTag + prev.slice(bodyEnd);
          }
          return prev + imgTag;
        });
        addToast({ type: 'success', message: 'Đã thêm hình ảnh vào email.' });
      }
      setEmailReplacingIdx(null);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [emailReplacingIdx, emailPlaceholders, addToast]);

  // -- Email: handle drag-drop image onto preview --
  const handleEmailDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Hình ảnh tối đa 5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result;
      const imgTag = `<tr><td align="center" style="padding:16px;"><img src="${dataUri}" alt="Hình ảnh email" width="560" style="max-width:100%;height:auto;display:block;border-radius:8px;" /></td></tr>`;
      setOutput((prev) => {
        const bodyEnd = prev.lastIndexOf('</table>');
        if (bodyEnd !== -1) {
          return prev.slice(0, bodyEnd) + imgTag + prev.slice(bodyEnd);
        }
        return prev + imgTag;
      });
      addToast({ type: 'success', message: 'Đã thêm hình ảnh vào email.' });
    };
    reader.readAsDataURL(file);
  }, [addToast]);

  // -- Email toolbox: insert component into email HTML --
  const handleEmailToolboxInsert = useCallback((item) => {
    if (!output) {
      addToast({ type: 'error', message: 'Chưa có email HTML để chèn.' });
      return;
    }
    setOutput((prev) => {
      // Try to insert before footer (last navy background section or before </body>)
      // Look for the footer marker: the last table with #112250 or #0A0F1C background before </body>
      const bodyEndIdx = prev.lastIndexOf('</body>');
      const lastMainTableEnd = prev.lastIndexOf('</table>');

      // Find the footer section: last occurrence of background-color:#112250 near the end
      const footerPatterns = [
        /(<table[^>]*width="100%"[^>]*>[\s\S]*?<td[^>]*style="[^"]*background[^"]*#112250[^"]*"[^>]*>[\s\S]*?GEMRAL[\s\S]*?gemral\.com[\s\S]*?<\/table>)\s*(<\/td>)?\s*(<\/tr>)?\s*(<\/table>)?\s*<\/body>/i,
      ];

      // Simple approach: insert before the last </table> before </body>
      // This typically places content before the footer's outer wrapper
      if (bodyEndIdx !== -1) {
        // Find the position just before the footer (look for the footer's table)
        const footerRegex = /<table[^>]*width="100%"[^>]*>[\s\S]*?<td[^>]*style="[^"]*background[^"]*#112250[^"]*"[\s\S]*?gemral\.com[\s\S]*?<\/table>/gi;
        let lastFooterMatch = null;
        let match;
        while ((match = footerRegex.exec(prev)) !== null) {
          lastFooterMatch = match;
        }

        if (lastFooterMatch) {
          // Insert before the footer
          const insertPos = lastFooterMatch.index;
          return prev.slice(0, insertPos) + item.html + '\n' + prev.slice(insertPos);
        }
        // Fallback: insert before </body>
        return prev.slice(0, bodyEndIdx) + item.html + '\n' + prev.slice(bodyEndIdx);
      }
      // Last fallback: append
      return prev + item.html;
    });
    addToast({ type: 'success', message: `Đã chèn "${item.label}" vào email.` });
  }, [output, addToast]);

  // -- Email iframe auto-resize to content height --
  const handleEmailIframeLoad = useCallback(() => {
    const iframe = emailIframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        iframe.style.height = height + 40 + 'px';
      }
    } catch (e) {
      // cross-origin error — ignore, keep minHeight
    }
  }, []);

  // -- Listen for postMessage from iframe (drop, delete, edit events) --
  useEffect(() => {
    const handler = (e) => {
      if (!e.data?.type) return;

      if (e.data.type === 'email-drop-insert' && e.data.insertBeforeIndex != null) {
        const pendingHtml = window.__emailPendingDropHtml;
        if (!pendingHtml) return;
        window.__emailPendingDropHtml = null;

        // Tell iframe to insert the HTML directly into its DOM (works in edit mode too)
        const iframe = emailIframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'email-insert-html', html: pendingHtml, insertBeforeIndex: e.data.insertBeforeIndex }, '*');
        }
        addToast({ type: 'success', message: 'Đã chèn thành phần vào email.' });
      }

      // Delete a <tr> by index — tell iframe to remove it from DOM
      if (e.data.type === 'email-delete-row' && e.data.rowIndex != null) {
        const iframe = emailIframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'email-remove-row', rowIndex: e.data.rowIndex }, '*');
        }
        addToast({ type: 'success', message: 'Đã xóa phần tử.' });
      }

      // Sync edited HTML back from iframe (from insert/delete/exit-edit)
      if (e.data.type === 'email-content-updated' && e.data.html) {
        // Mark as syncing so the memo returns cached srcDoc (prevents iframe reload)
        emailSyncingRef.current = true;
        setOutput(e.data.html);
        // Reset flag after React finishes re-rendering
        setTimeout(() => { emailSyncingRef.current = false; }, 50);
      }

      if (e.data.type === 'email-history-state') {
        setCanUndo(!!e.data.canUndo);
        setCanRedo(!!e.data.canRedo);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addToast]);

  // -- Email preview srcDoc with base tag + interactive editing script --
  const emailPreviewSrcDoc = React.useMemo(() => {
    // When iframe syncs its DOM back to parent, don't regenerate srcDoc (iframe already has correct state)
    if (emailSyncingRef.current && emailSrcDocRef.current) return emailSrcDocRef.current;
    if (!output) return '';
    const baseTag = `<base href="${window.location.origin}/">`;

    // Comprehensive script: drag-drop, inline editing, delete, image replace
    const interactiveScript = `
<script>
(function() {
  var editMode = false;
  var undoStack = [];
  var redoStack = [];
  var maxHistory = 50;

  function saveSnapshot() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.edt-drop-row, .edt-del-btn, script').forEach(function(el) { el.remove(); });
    clone.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
    var body = clone.querySelector('body');
    if (body) body.classList.remove('edt-edit-mode');
    var snap = '<!DOCTYPE html><html>' + clone.innerHTML + '</html>';
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== snap) {
      undoStack.push(snap);
      if (undoStack.length > maxHistory) undoStack.shift();
      redoStack = [];
      window.parent.postMessage({ type: 'email-history-state', canUndo: undoStack.length > 1, canRedo: false }, '*');
    }
  }

  function applySnapshot(html) {
    // Replace body content only, preserve scripts
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var newBody = doc.querySelector('body');
    if (newBody) {
      document.body.innerHTML = newBody.innerHTML;
      setupInteractive();
      if (editMode) enableEditMode();
      syncToParent();
    }
  }

  function doUndo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    applySnapshot(undoStack[undoStack.length - 1]);
    window.parent.postMessage({ type: 'email-history-state', canUndo: undoStack.length > 1, canRedo: redoStack.length > 0 }, '*');
  }

  function doRedo() {
    if (redoStack.length === 0) return;
    var snap = redoStack.pop();
    undoStack.push(snap);
    applySnapshot(snap);
    window.parent.postMessage({ type: 'email-history-state', canUndo: undoStack.length > 1, canRedo: redoStack.length > 0 }, '*');
  }

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
  });

  // --- STYLES ---
  var style = document.createElement('style');
  style.textContent = [
    '.edt-drop-line { display:none; height:4px; background:#FFBD59; border-radius:2px; box-shadow:0 0 8px rgba(255,189,89,0.5); }',
    '.edt-drop-line.show { display:block; }',
    'tr.edt-hover > td { outline:2px dashed #FFBD59 !important; outline-offset:-2px; }',
    '.edt-del-btn { position:absolute; top:-8px; right:-8px; width:22px; height:22px; background:#EF4444; color:#fff; border:2px solid #fff; border-radius:50%; font-size:13px; line-height:18px; text-align:center; cursor:pointer; z-index:9999; display:none; box-shadow:0 2px 6px rgba(0,0,0,0.4); pointer-events:auto; }',
    'tr:hover > .edt-del-btn, td:hover > .edt-del-btn, tr.edt-active:hover .edt-del-btn { display:block; }',
    'tr.edt-active { position:relative; }',
    '.edt-edit-mode td[contenteditable=true] { cursor:text; outline:1px dashed rgba(106,91,255,0.3); outline-offset:2px; }',
    '.edt-edit-mode td[contenteditable=true]:focus { outline:2px solid #6A5BFF; background:rgba(106,91,255,0.05); }',
    '.edt-edit-mode img { cursor:pointer; }',
    '.edt-edit-mode img:hover { outline:3px solid #FFBD59; outline-offset:2px; }',
    '.edt-edit-mode a[contenteditable=true] { pointer-events:auto; cursor:text; }',
  ].join('\\n');
  document.head.appendChild(style);

  // --- HELPERS ---
  function getOriginalTrs() {
    return Array.from(document.querySelectorAll('tr:not(.edt-drop-row)'));
  }

  function syncToParent() {
    // Clone the DOM to extract clean HTML without mutating the live document
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.edt-drop-row, .edt-del-btn, script').forEach(function(el) { el.remove(); });
    clone.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
    var body = clone.querySelector('body');
    if (body) body.classList.remove('edt-edit-mode');
    var html = '<!DOCTYPE html><html>' + clone.innerHTML + '</html>';
    window.parent.postMessage({ type: 'email-content-updated', html: html }, '*');
  }

  // --- DRAG-DROP ---
  document.body.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    var allTr = getOriginalTrs();
    document.querySelectorAll('.edt-drop-row').forEach(function(r) { r.classList.remove('show'); });
    var best = -1, bestDist = Infinity;
    allTr.forEach(function(tr, i) {
      var rect = tr.getBoundingClientRect();
      var dist = Math.abs(e.clientY - (rect.top + rect.height / 2));
      if (dist < bestDist) { bestDist = dist; best = e.clientY < (rect.top + rect.height/2) ? i : i+1; }
    });
    var indicator = document.querySelector('.edt-drop-row[data-idx="'+best+'"]');
    if (indicator) indicator.classList.add('show');
  });

  document.body.addEventListener('dragleave', function(e) {
    if (!document.body.contains(e.relatedTarget)) {
      document.querySelectorAll('.edt-drop-row').forEach(function(r) { r.classList.remove('show'); });
    }
  });

  document.body.addEventListener('drop', function(e) {
    e.preventDefault();
    document.querySelectorAll('.edt-drop-row').forEach(function(r) { r.classList.remove('show'); });
    var allTr = getOriginalTrs();
    var insertBefore = allTr.length;
    allTr.forEach(function(tr, i) {
      var rect = tr.getBoundingClientRect();
      if (e.clientY < (rect.top + rect.height/2) && i < insertBefore) insertBefore = i;
    });
    window.parent.postMessage({ type: 'email-drop-insert', insertBeforeIndex: insertBefore }, '*');
  });

  // --- INJECT DROP INDICATORS + DELETE BUTTONS ---
  function setupInteractive() {
    // Remove old
    document.querySelectorAll('.edt-drop-row, .edt-del-btn').forEach(function(el) { el.remove(); });
    var allTr = document.querySelectorAll('tr');
    allTr.forEach(function(tr, i) {
      // Drop indicator row
      var dropRow = document.createElement('tr');
      dropRow.className = 'edt-drop-row edt-drop-line';
      dropRow.setAttribute('data-idx', i);
      dropRow.innerHTML = '<td colspan="99" style="padding:0;height:4px;background:#FFBD59;border-radius:2px;"></td>';
      tr.parentNode.insertBefore(dropRow, tr);
      // Delete button on each content tr
      tr.classList.add('edt-active');
      tr.style.position = 'relative';
      var del = document.createElement('div');
      del.className = 'edt-del-btn';
      del.innerHTML = '&times;';
      del.title = 'Xóa phần tử này';
      del.addEventListener('click', function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var origTrs = getOriginalTrs();
        var rowIdx = origTrs.indexOf(tr);
        if (rowIdx >= 0) {
          window.parent.postMessage({ type: 'email-delete-row', rowIndex: rowIdx }, '*');
        }
      }, true);  // useCapture = true to fire before image click handlers
      // Append to first td or tr itself — ensure overflow visible for images
      var firstTd = tr.querySelector('td');
      if (firstTd) { firstTd.style.position = 'relative'; firstTd.style.overflow = 'visible'; firstTd.appendChild(del); }
    });
    // One more drop indicator at the very end
    var lastTable = document.querySelector('table');
    if (lastTable) {
      var endRow = document.createElement('tr');
      endRow.className = 'edt-drop-row edt-drop-line';
      endRow.setAttribute('data-idx', document.querySelectorAll('tr:not(.edt-drop-row)').length);
      endRow.innerHTML = '<td colspan="99" style="padding:0;height:4px;background:#FFBD59;border-radius:2px;"></td>';
      var tbody = lastTable.querySelector('tbody') || lastTable;
      tbody.appendChild(endRow);
    }
  }
  setTimeout(function() { setupInteractive(); saveSnapshot(); }, 100);

  // --- EDIT MODE (toggled via postMessage from parent) ---
  // Debounced snapshot saver for text edits
  var _snapTimer = null;
  function debouncedSnapshot() {
    if (_snapTimer) clearTimeout(_snapTimer);
    _snapTimer = setTimeout(function() { saveSnapshot(); }, 800);
  }

  function enableEditMode() {
    editMode = true;
    document.body.classList.add('edt-edit-mode');
    // Make text-containing tds editable (skip image-only and table-only tds)
    document.querySelectorAll('td').forEach(function(td) {
      var imgs = td.querySelectorAll('img');
      var tables = td.querySelectorAll('table');
      // If td has ONLY an image or nested table, don't make editable
      if (imgs.length > 0 && td.textContent.trim().length < 5 && !td.querySelector('span,p,h1,h2,h3,h4')) return;
      if (tables.length > 0 && !td.querySelector('span,p,h1,h2,h3,h4,a')) return;
      // Make td with text content editable
      if (td.textContent.trim().length > 0) {
        td.setAttribute('contenteditable', 'true');
        td.addEventListener('input', debouncedSnapshot);
      }
    });
    // Make CTA link text editable
    document.querySelectorAll('a').forEach(function(a) {
      if (a.textContent.trim().length > 0) {
        a.setAttribute('contenteditable', 'true');
        a.addEventListener('click', function(ev) { ev.preventDefault(); }, { capture: true });
        a.addEventListener('input', debouncedSnapshot);
      }
    });
    // Click images to replace (no overlay, just click handler)
    document.querySelectorAll('img').forEach(function(img) {
      img._edtClickHandler = function(ev) {
        // Don't trigger if clicking delete button
        if (ev && ev.target && ev.target.classList && ev.target.classList.contains('edt-del-btn')) return;
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function() {
          var file = input.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function() { img.src = reader.result; saveSnapshot(); syncToParent(); };
          reader.readAsDataURL(file);
        };
        input.click();
      };
      img.addEventListener('click', img._edtClickHandler);
    });
  }

  function disableEditMode() {
    editMode = false;
    document.body.classList.remove('edt-edit-mode');
    document.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
    // Remove image click handlers
    document.querySelectorAll('img').forEach(function(img) {
      if (img._edtClickHandler) { img.removeEventListener('click', img._edtClickHandler); delete img._edtClickHandler; }
    });
    // Save snapshot for undo after edits, then sync
    saveSnapshot();
    syncToParent();
  }

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;

    if (e.data.type === 'email-toggle-edit') {
      if (e.data.editing) enableEditMode();
      else disableEditMode();
    }

    // Insert HTML at a specific <tr> index (from drop or toolbox)
    if (e.data.type === 'email-insert-html' && e.data.html) {
      var allTr = getOriginalTrs();
      var idx = e.data.insertBeforeIndex;
      var temp = document.createElement('tbody');
      temp.innerHTML = e.data.html;
      var newRows = Array.from(temp.children);
      if (idx >= 0 && idx < allTr.length) {
        newRows.forEach(function(row) { allTr[idx].parentNode.insertBefore(row, allTr[idx]); });
      } else if (allTr.length > 0) {
        var lastTr = allTr[allTr.length - 1];
        newRows.forEach(function(row) { lastTr.parentNode.insertBefore(row, lastTr.nextSibling); });
      }
      setupInteractive();
      if (editMode) enableEditMode();
      saveSnapshot();
      syncToParent();
    }

    // Remove a <tr> by index
    if (e.data.type === 'email-remove-row' && e.data.rowIndex != null) {
      var trs = getOriginalTrs();
      var ri = e.data.rowIndex;
      if (ri >= 0 && ri < trs.length) {
        trs[ri].remove();
        setupInteractive();
        if (editMode) enableEditMode();
        saveSnapshot();
        syncToParent();
      }
    }

    // Undo/Redo from parent buttons
    if (e.data.type === 'email-undo') doUndo();
    if (e.data.type === 'email-redo') doRedo();
  });

  // No auto-sync during editing — sync only happens in disableEditMode()
})();
</script>`;

    // Inject base tag + script
    const bodyEndIdx = output.lastIndexOf('</body>');
    let result = output;
    if (bodyEndIdx !== -1) {
      result = result.slice(0, bodyEndIdx) + interactiveScript + result.slice(bodyEndIdx);
    } else {
      result = result + interactiveScript;
    }
    const headIdx = result.indexOf('<head>');
    if (headIdx !== -1) {
      return result.slice(0, headIdx + 6) + baseTag + result.slice(headIdx + 6);
    }
    const headUpperIdx = result.indexOf('<HEAD>');
    if (headUpperIdx !== -1) {
      return result.slice(0, headUpperIdx + 6) + baseTag + result.slice(headUpperIdx + 6);
    }
    const finalSrcDoc = baseTag + result;
    emailSrcDocRef.current = finalSrcDoc;
    return finalSrcDoc;
  }, [output, isEditing]);

  // -- Default design system --
  const DEFAULT_DESIGN_SYSTEM = `\n\nQUY TẮC BẮT BUỘC:\n- Use my attached photo for character face.\n- Tất cả text bằng tiếng Việt có dấu\n- Người Việt thật 27-35 tuổi (KHÔNG cartoon, KHÔNG illustration)\n- Style: Luxurious, premium, high-end editorial photography — KHÔNG minimalist/tối giản\n- Lighting: cinematic golden hour, dramatic rim lighting, soft bokeh with warm tones\n- TUYỆT ĐỐI KHÔNG cho nhân vật mặc blazer, vest, suit jacket — thay bằng elegant casual: áo lụa, áo trễ vai, áo cổ V thanh lịch, hoặc outfit phù hợp ngữ cảnh\n- Background: rich textures (marble, velvet, warm wood, golden accents), NOT plain/empty\n- Tỷ lệ mặc định: 3:4 (dọc)\n\nDESIGN SYSTEM:\nNavy đậm #112250\nGold #FFBD59\nAccent: Purple #6A5BFF\nBurgundy #9C0612\nPink #FF6B9D\nText: White #FFFFFF\nFooter: "gemral.com" centered`;

  // -- Copy image prompt (with design system appended) --
  const handleCopyImagePrompt = useCallback(async () => {
    try {
      const fullPrompt = 'Tạo hình ảnh mới: Use my attached photo for character face.\n\n' + imagePrompt + DEFAULT_DESIGN_SYSTEM;
      await navigator.clipboard.writeText(fullPrompt);
      addToast({ type: 'success', message: 'Đã sao chép prompt + design system.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    }
  }, [imagePrompt, addToast]);

  // -- Send feedback to improve knowledge --
  const handleFeedback = useCallback(async (
    type,
    rule,
    suggestion,
  ) => {
    const key = `${type}:${rule}`;
    if (feedbackSent.has(key)) return;
    setFeedbackSending(key);
    try {
      const res = await fetch('/api/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          rule,
          suggestion,
          contentType: contentType ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSent(prev => new Set(prev).add(key));
        addToast({ type: 'success', title: 'Đã ghi nhận', message: 'Hệ thống sẽ cải thiện từ lần tạo tiếp theo.' });
      } else {
        addToast({ type: 'error', message: data.error ?? 'Không thể gửi feedback.' });
      }
    } catch {
      addToast({ type: 'error', message: 'Không thể gửi feedback.' });
    } finally {
      setFeedbackSending(null);
    }
  }, [feedbackSent, contentType, addToast]);

  // -- Regenerate --
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // -- Create Calendar Event from AI Gen (or update linked event) --
  const handleCreateCalendarEvent = useCallback(async () => {
    if (!output || !calendarScheduleDate) return;
    setCreatingCalendarEvent(true);
    try {
      const { calendarService } = await import('@gem/services');
      const eventPayload = {
        title: brief ? brief.slice(0, 100) : `${selectedOption.label} — ${new Date().toLocaleDateString('vi-VN')}`,
        content_type: contentType ?? 'social_post',
        track: 'integration',
        pillar: 'lifestyle',
        persona: (persona !== 'auto' ? persona : 'jennie_mentor'),
        writing_mode: (writingMode !== 'auto' ? writingMode : 'mode_1_calm'),
        priority: 'medium',
        scheduled_date: calendarScheduleDate,
        scheduled_time: calendarScheduleTime || null,
        description: output.slice(0, 500),
        platform: calendarPlatform,
        auto_comment_text: autoCommentEnabled ? autoCommentText || null : null,
        auto_comment_link: autoCommentEnabled ? autoCommentLink || null : null,
        scheduled_publish_time: calendarScheduleDate && calendarScheduleTime
          ? new Date(`${calendarScheduleDate}T${calendarScheduleTime}`).toISOString()
          : null,
        publish_status: 'scheduled',
      };

      if (linkedEventId) {
        await calendarService.update(linkedEventId, eventPayload);
        addToast({ type: 'success', title: 'Đã cập nhật!', message: `Sự kiện lịch đã được cập nhật với nội dung AI.` });
      } else {
        await calendarService.create({
          ...eventPayload,
          created_by: 'current-user',
        });
        addToast({ type: 'success', title: 'Đã lên lịch!', message: `Sự kiện đã được tạo trên Lịch Nội Dung cho ngày ${calendarScheduleDate}.` });
      }

      // Also add to Content Planner sidebar (via Supabase)
      const plannerType = ContentPlannerSidebar.OUTPUT_TO_PLANNER_TYPE[outputType] || 'other';
      const { plannerService } = await import('@gem/services');
      await plannerService.create({
        scheduled_date: calendarScheduleDate,
        time_slot: calendarScheduleTime || '',
        content_type: plannerType,
        title: brief ? brief.slice(0, 60) : `${selectedOption.label}`,
        brief: brief || output.slice(0, 200),
        source: 'generated',
        status: 'scheduled',
        scheduled_content: {
          output,
          platform: calendarPlatform,
          emailData: isEmail ? {
            from: emailSender,
            to: emailRecipients.split(',').map(e => e.trim()).filter(Boolean),
            subject: emailSubject,
            html: output,
          } : null,
        },
      });
      // Realtime subscription will update plannerData automatically

      setShowScheduleModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo sự kiện';
      addToast({ type: 'error', title: 'Lỗi', message: msg });
    } finally {
      setCreatingCalendarEvent(false);
    }
  }, [output, calendarScheduleDate, calendarScheduleTime, calendarPlatform, brief, selectedOption, contentType, persona, writingMode, autoCommentEnabled, autoCommentText, autoCommentLink, addToast, linkedEventId, outputType, isEmail, emailSender, emailRecipients, emailSubject]);

  return (
    <div className="flex gap-4 animate-fade-in">
      {/* Content Planner Sidebar */}
      <ContentPlannerSidebar
        plannerData={plannerData}
        onPlannerChange={setPlannerData}
        onCopyToBrief={handlePlannerCopyToBrief}
        collapsed={plannerCollapsed}
        onToggleCollapse={() => setPlannerCollapsed(!plannerCollapsed)}
      />

      {/* Main AI Gen content */}
      <div className="space-y-6 flex-1 min-w-0">
      {/* Calendar → AI Gen linked banner */}
      {linkedEventId && (
        <div className="p-3 rounded-card bg-emerald/10 border border-emerald/20 flex items-center gap-2">
          <CalendarPlus size={16} className="text-emerald shrink-0" />
          <span className="text-xs text-emerald font-medium">
            Tạo nội dung cho sự kiện lịch. Sau khi tạo xong, bấm &ldquo;Lên Lịch Đăng&rdquo; để liên kết về Calendar.
          </span>
          <a href="/admin/cc/calendar" className="ml-auto text-xxs text-emerald hover:underline shrink-0">Quay lại Lịch</a>
        </div>
      )}

      {/* -- Form -- */}
      <Card variant="glass" padding="md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-gold" />
            <h2 className="font-heading text-xl font-semibold text-txt">
              Trình Tạo Nội Dung AI
            </h2>
          </div>
          {hasActiveJobs && (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="text-gold animate-spin" />
              <span className="text-xs text-gold font-medium">{processingCount} công việc đang xử lý</span>
            </div>
          )}
          {!hasActiveJobs && isSubscribed && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xxs text-txt-3">Realtime</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loại nội dung */}
            <Select
              label="Loại nội dung"
              options={OUTPUT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={outputType}
              onChange={setOutputType}
              disabled={generating}
            />
            {/* AI Model (combined provider + model) */}
            <Select
              label="AI Model"
              options={AI_MODEL_COMBINED_OPTIONS}
              value={`${aiProvider}|${aiModel}`}
              onChange={(v) => {
                const { provider, model } = parseAiModelValue(v);
                setAiProvider(provider);
                setAiModel(model);
              }}
              disabled={generating}
            />
          </div>

          {/* Số lượng bài */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-txt-2 font-medium whitespace-nowrap flex items-center gap-1.5">
              <Hash size={14} className="text-txt-3" />
              Số lượng bài
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={batchCount}
              onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              disabled={generating}
              className="fi w-20 text-center text-sm"
            />
            {batchCount > 1 && (
              <span className="text-xxs text-gold">Batch: tạo {batchCount} bài cùng lúc</span>
            )}
          </div>

          {/* ── Clip Ngắn: Dynamic fields ── */}
          {isShortClip && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Clip Ngắn
              </h4>

              <Select
                label="Template chủ đề"
                options={CLIP_TEMPLATE_OPTIONS}
                value={clipTemplate}
                onChange={setClipTemplate}
                disabled={generating}
              />

              {clipTemplate === 'app_feature' && (
                <CheckboxGroup
                  label="Tính năng App (chọn nhiều)"
                  options={APP_FEATURE_OPTIONS}
                  selected={clipFeatures}
                  onChange={setClipFeatures}
                  disabled={generating}
                />
              )}

              {clipTemplate === 'course' && (
                <CheckboxGroup
                  label="Khóa học (chọn nhiều)"
                  options={COURSE_OPTIONS}
                  selected={clipCourses}
                  onChange={setClipCourses}
                  disabled={generating}
                />
              )}

              <Select
                label="Kiểu CTA"
                options={CLIP_CTA_OPTIONS}
                value={clipCtaType}
                onChange={setClipCtaType}
                disabled={generating}
              />
            </div>
          )}

          {/* ── Bài Đăng MXH: Dynamic fields ── */}
          {isSocialPost && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Bài Đăng MXH
              </h4>

              <CheckboxGroup
                label="Nền tảng (chọn nhiều)"
                options={SOCIAL_PLATFORM_OPTIONS}
                selected={socialPlatforms}
                onChange={setSocialPlatforms}
                disabled={generating}
              />

              <Select
                label="Chủ đề bài đăng"
                options={SOCIAL_TOPIC_OPTIONS}
                value={socialTopic}
                onChange={(v) => {
                  setSocialTopic(v);
                  setSocialTopicDetails([]);
                }}
                disabled={generating}
              />

              {socialTopic === 'app_features' && (
                <CheckboxGroup
                  label="Tính năng App (chọn nhiều)"
                  options={SOCIAL_APP_FEATURE_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'trading_mindset' && (
                <CheckboxGroup
                  label="Chủ đề Trading Mindset (chọn nhiều)"
                  options={SOCIAL_TRADING_MINDSET_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'courses' && (
                <CheckboxGroup
                  label="Khóa học (chọn nhiều)"
                  options={SOCIAL_COURSE_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'gem_packs' && (
                <CheckboxGroup
                  label="Gói GEM Packs (chọn nhiều)"
                  options={SOCIAL_GEM_PACK_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'spiritual' && (
                <CheckboxGroup
                  label="Chủ đề Tâm Linh & Huyền Học (chọn nhiều)"
                  options={SOCIAL_SPIRITUAL_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'self_development' && (
                <CheckboxGroup
                  label="Chủ đề Phát Triển Bản Thân (chọn nhiều)"
                  options={SOCIAL_SELF_DEV_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}

              {socialTopic === 'market_daily' && (
                <CheckboxGroup
                  label="Nội dung Daily Brief (chọn nhiều)"
                  options={SOCIAL_MARKET_DAILY_OPTIONS}
                  selected={socialTopicDetails}
                  onChange={setSocialTopicDetails}
                  disabled={generating}
                />
              )}
            </div>
          )}

          {/* ── Content Planner: Dynamic fields ── */}
          {isContentPlanner && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Content Planner
              </h4>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-2">Thời gian lập kế hoạch</label>
                <div className="flex gap-2">
                  {PLANNER_DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={generating}
                      onClick={() => setPlannerDuration(opt.value)}
                      className={`flex-1 h-9 text-xs font-semibold rounded-card border transition-all ${plannerDuration === opt.value
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-border bg-glass-bg text-txt-3 hover:border-border-2'
                        } ${generating ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <CheckboxGroup
                label="Nền tảng đăng bài (chọn nhiều)"
                options={PLANNER_PLATFORM_OPTIONS}
                selected={plannerPlatforms}
                onChange={setPlannerPlatforms}
                disabled={generating}
              />

              <CheckboxGroup
                label="Loại nội dung (chọn nhiều)"
                options={PLANNER_CONTENT_TYPE_OPTIONS}
                selected={plannerContentTypes}
                onChange={setPlannerContentTypes}
                disabled={generating}
              />

              <CheckboxGroup
                label="Chủ đề nội dung (chọn nhiều)"
                options={PLANNER_TOPIC_OPTIONS}
                selected={plannerTopics}
                onChange={setPlannerTopics}
                disabled={generating}
              />

              <div className="p-2.5 rounded bg-[#FFBD59]/5 border border-[#FFBD59]/20">
                <p className="text-[10px] text-[#FFBD59]/80 leading-relaxed">
                  Output sẽ ở dạng Markdown Table — copy trực tiếp vào Notion, Google Sheets hoặc bất kỳ app nào hỗ trợ Markdown.
                </p>
              </div>
            </div>
          )}

          {/* ── Nội Dung Banner App: Dynamic fields ── */}
          {isBanner && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Nội Dung Banner
              </h4>

              <CheckboxGroup
                label="Loại banner (chọn nhiều)"
                options={BANNER_TYPE_OPTIONS}
                selected={bannerTypes}
                onChange={setBannerTypes}
                disabled={generating}
              />

              <Select
                label="Bố cục banner"
                options={BANNER_LAYOUT_OPTIONS}
                value={bannerLayout}
                onChange={setBannerLayout}
                disabled={generating}
              />
            </div>
          )}

          {/* ── Push Notification: Dynamic fields ── */}
          {isPushNotification && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Push Notification
              </h4>

              <CheckboxGroup
                label="Chủ đề notification (chọn nhiều)"
                options={PUSH_TOPIC_OPTIONS}
                selected={pushTopics}
                onChange={setPushTopics}
                disabled={generating}
              />

              {/* Quick Select Templates */}
              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-2">Chọn nhanh template</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Buổi sáng động lực', brief: 'Push notification buổi sáng: câu trích dẫn truyền cảm hứng, nhắc nhở bắt đầu ngày mới tích cực, kèm CTA mở app.' },
                    { label: 'Tín hiệu Trading', brief: 'Push notification tín hiệu trading: có pattern mới được phát hiện, cơ hội giao dịch tiềm năng, kèm CTA mở Scanner.' },
                    { label: 'Nhắc thiền / nghi thức', brief: 'Push notification nhắc nhở nghi thức: đã đến giờ thiền, thở thanh lọc, journaling. Giọng nhẹ nhàng, ấm áp.' },
                    { label: 'Tarot ngày', brief: 'Push notification Tarot hàng ngày: lá bài hôm nay, thông điệp ngắn bí ẩn gây tò mò, CTA xem chi tiết trong app.' },
                    { label: 'Thị trường crypto', brief: 'Push notification cập nhật thị trường: BTC/ETH biến động, tin crypto nổi bật trong ngày, CTA xem phân tích.' },
                    { label: 'Khuyến mãi flash', brief: 'Push notification khuyến mãi: ưu đãi giới hạn thời gian, giảm giá khóa học/tier, tạo urgency với countdown.' },
                    { label: 'Nhắc học bài', brief: 'Push notification nhắc học: tiến trình khóa học, bài mới đã mở khóa, streak learning, kèm CTA tiếp tục học.' },
                    { label: 'Cộng đồng sôi nổi', brief: 'Push notification hoạt động cộng đồng: bài viết hot trên forum, thảo luận mới, ai đó reply bạn, CTA tham gia.' },
                    { label: 'Thưởng GEM', brief: 'Push notification phần thưởng: bạn vừa nhận gems, hoàn thành challenge, streak bonus, CTA xem ví GEM.' },
                    { label: 'Tính năng mới', brief: 'Push notification tính năng mới: cập nhật app, tính năng vừa ra mắt, cải tiến UX, CTA khám phá ngay.' },
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      disabled={generating}
                      onClick={() => setBrief(tpl.brief)}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-all cursor-pointer ${brief === tpl.brief
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-border bg-bg-4 text-txt-2 hover:border-border-2 hover:text-txt'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── In-App Story: Dynamic fields ── */}
          {isInAppStory && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn In-App Story / Carousel
              </h4>
              <CheckboxGroup
                label="Loại story (chọn nhiều)"
                options={STORY_TYPE_OPTIONS}
                selected={storyTypes}
                onChange={setStoryTypes}
                disabled={generating}
              />
            </div>
          )}

          {/* ── SMS Marketing: Dynamic fields ── */}
          {isSms && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn SMS Marketing
              </h4>
              <CheckboxGroup
                label="Loại SMS (chọn nhiều)"
                options={SMS_TYPE_OPTIONS}
                selected={smsTypes}
                onChange={setSmsTypes}
                disabled={generating}
              />
            </div>
          )}

          {/* ── Chatbot Script: Dynamic fields ── */}
          {isChatbotScript && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy chọn Chatbot Script
              </h4>
              <CheckboxGroup
                label="Chủ đề chatbot (chọn nhiều)"
                options={CHATBOT_SCRIPT_TOPIC_OPTIONS}
                selected={chatbotTopics}
                onChange={setChatbotTopics}
                disabled={generating}
              />
            </div>
          )}

          {/* ── Target Audience & Tone (always visible) ── */}
          <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
            <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
              Đối tượng & Giọng văn
            </h4>

            {/* Brand Voice Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-txt-2 shrink-0">Thương hiệu:</span>
              <button
                type="button"
                onClick={() => setBrandVoice('jennie')}
                disabled={generating}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
                  brandVoice === 'jennie'
                    ? 'bg-gold/15 text-gold border-2 border-gold/40'
                    : 'bg-bg-4 text-txt-3 border border-border hover:text-txt'
                }`}
              >
                Jennie (Cá nhân)
              </button>
              <button
                type="button"
                onClick={() => setBrandVoice('generic')}
                disabled={generating}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
                  brandVoice === 'generic'
                    ? 'bg-purple/15 text-purple border-2 border-purple/40'
                    : 'bg-bg-4 text-txt-3 border border-border hover:text-txt'
                }`}
              >
                Thương hiệu chung
              </button>
              <span className="text-[11px] text-txt-3 ml-auto">
                {brandVoice === 'jennie' ? 'Viết với phong cách Jennie Uyên Chu' : 'Không nhắc Jennie — cho fanpage/brand khác'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Đối tượng mục tiêu"
                options={TARGET_AUDIENCE_OPTIONS}
                value={targetAudience}
                onChange={setTargetAudience}
                disabled={generating}
              />
              <Select
                label="Giọng văn / Tone"
                options={TONE_OPTIONS}
                value={contentTone}
                onChange={setContentTone}
                disabled={generating}
              />
            </div>
          </div>

          {/* ── Tin Tức / Blog SEO: Dynamic fields ── */}
          {isNews && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">
                Tùy Chọn Bài Tin Tức / Blog
              </h4>

              <CheckboxGroup
                label="Chủ đề tin tức (chọn nhiều)"
                options={NEWS_CATEGORY_OPTIONS}
                selected={newsCategories}
                onChange={(val) => {
                  setNewsCategories(val);
                  // Clear subtopics khi đổi category
                  setNewsSubtopics([]);
                }}
                disabled={generating}
              />

              {/* Subtopic checkboxes — hiện khi category có sub-options */}
              {newsCategories.some((cat) => NEWS_SUBTOPIC_OPTIONS[cat]) && (
                <div className="ml-2 pl-3 border-l-2 border-gold/30 space-y-2">
                  {newsCategories
                    .filter((cat) => NEWS_SUBTOPIC_OPTIONS[cat])
                    .map((cat) => {
                      const catLabel = NEWS_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? cat;
                      return (
                        <CheckboxGroup
                          key={cat}
                          label={`Chủ đề ngành — ${catLabel}`}
                          options={NEWS_SUBTOPIC_OPTIONS[cat] ?? []}
                          selected={newsSubtopics}
                          onChange={setNewsSubtopics}
                          disabled={generating}
                        />
                      );
                    })}
                  <p className="text-xxs text-gold/70">
                    Chọn ngành cụ thể để bài viết tập trung vào vấn đề thực tế, không giải thích khái niệm chung.
                  </p>
                </div>
              )}

              <Select
                label="Định dạng bài viết"
                options={NEWS_FORMAT_OPTIONS}
                value={newsFormat}
                onChange={setNewsFormat}
                disabled={generating}
              />
            </div>
          )}

          {/* ── Email Marketing HTML: Dynamic fields ── */}
          {isEmail && (
            <div className="space-y-3 p-4 rounded-card border border-border bg-glass-bg">
              <h4 className="text-xs font-semibold text-txt-2 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} className="text-gold" />
                Tùy Chọn Email Marketing
              </h4>

              <Select
                label="Loại email"
                options={EMAIL_TYPE_OPTIONS}
                value={emailType}
                onChange={setEmailType}
                disabled={generating}
              />

              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-1.5">Tiêu đề email (Subject)</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="VD: Tính năng mới trên Gemral App — Bạn đã thử chưa?"
                  className="fi text-sm w-full"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-1.5">Người nhận (cách nhau bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email1@gmail.com, email2@gmail.com"
                  className="fi text-sm w-full"
                  disabled={generating}
                />
                <p className="text-xxs text-txt-3 mt-1">Gửi qua Resend (gemral.com) • Giới hạn: 100 email/ngày (miễn phí)</p>
              </div>

              {/* Quick Select — Tiêu đề email */}
              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-2">Chọn nhanh tiêu đề email</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Tuần này trên Gemral — Thị trường & Cơ hội',
                    'Chào mừng bạn đến với Gemral!',
                    'Flash Sale 48h — Giảm 30% Khóa Học Trading',
                    'Tính năng mới trên Gemral — Bạn sẽ thích điều này!',
                    'Mở khóa toàn bộ sức mạnh GEM Scanner',
                    'Khóa học mới — Đăng ký sớm giảm 20%',
                    'Chúng tôi nhớ bạn — Quay lại với ưu đãi đặc biệt',
                    'Workshop miễn phí — Đăng ký ngay',
                    '3 Tips Trading Tuần Này — Áp Dụng Ngay',
                    'Jennie muốn chia sẻ với bạn điều này...',
                    'Năng lượng tuần mới — Thông điệp từ vũ trụ',
                    'Lá bài Tarot tuần này nói gì về bạn?',
                    'Bí mật của những trader kỷ luật',
                    '5 thói quen buổi sáng thay đổi cuộc đời tôi',
                    'Dự báo năng lượng tháng mới — Cơ hội & Thử thách',
                    'Chúc mừng! Bạn vừa đạt một cột mốc quan trọng',
                    'Góp ý 2 phút — Nhận 100 Gems miễn phí',
                    'Mời bạn bè — Cả hai cùng nhận thưởng!',
                  ].map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      disabled={generating}
                      onClick={() => setEmailSubject(subj)}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-all cursor-pointer ${emailSubject === subj
                        ? 'border-blue/40 bg-blue/10 text-blue'
                        : 'border-border bg-bg-4 text-txt-2 hover:border-border-2 hover:text-txt'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Select — Template nội dung */}
              <div>
                <label className="block text-xs font-semibold text-txt-2 mb-2">Chọn nhanh template nội dung</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    // --- Marketing & Bán hàng ---
                    { label: 'Newsletter thị trường tuần', brief: 'Newsletter tổng hợp tuần: top 3 tin crypto nổi bật, phân tích BTC/ETH, pattern đáng chú ý trên GEM Scanner, bài viết hot trên forum, tip trading ngắn. Kèm CTA mở app xem chi tiết.', type: 'newsletter', subject: 'Tuần này trên Gemral — Thị trường & Cơ hội' },
                    { label: 'Chào mừng user mới', brief: 'Email chào mừng user mới đăng ký Gemral: giới thiệu 3 tính năng nổi bật (Scanner, GEM Master AI, Vision Board), hướng dẫn bước đầu tiên, tặng 50 gems miễn phí, CTA khám phá app.', type: 'welcome', subject: 'Chào mừng bạn đến với Gemral!' },
                    { label: 'Flash sale khóa học', brief: 'Email khuyến mãi flash sale 48h: giảm 30% tất cả khóa học Trading (Starter, Tier 1, Tier 2). Social proof từ học viên cũ, countdown urgency, CTA đăng ký ngay.', type: 'promotion', subject: 'Flash Sale 48h — Giảm 30% Khóa Học Trading' },
                    { label: 'Ra mắt tính năng mới', brief: 'Email thông báo tính năng mới trên app Gemral: mô tả tính năng, lợi ích cho user, screenshot/preview, CTA cập nhật app và trải nghiệm ngay.', type: 'product_launch', subject: 'Tính năng mới trên Gemral — Bạn sẽ thích điều này!' },
                    { label: 'Nâng cấp Tier', brief: 'Email upsell nâng cấp Tier: so sánh Free vs Tier 1 (tính năng, signal chính xác hơn, scanner không giới hạn). Testimonial từ user Tier 1, ưu đãi giới hạn, CTA nâng cấp.', type: 'tier_upgrade', subject: 'Mở khóa toàn bộ sức mạnh GEM Scanner' },
                    { label: 'Win-back user cũ', brief: 'Email tái kích hoạt user không hoạt động 30+ ngày: nhắc những gì họ bỏ lỡ (tính năng mới, cộng đồng phát triển), ưu đãi quay lại, tặng gems, CTA mở app.', type: 'reengagement', subject: 'Chúng tôi nhớ bạn — Quay lại với ưu đãi đặc biệt' },
                    { label: 'Sự kiện webinar', brief: 'Email mời tham gia webinar/workshop: chủ đề hấp dẫn, diễn giả, thời gian, nội dung chính, giới hạn slot, CTA đăng ký tham gia miễn phí.', type: 'event', subject: 'Workshop miễn phí — Đăng ký ngay' },
                    { label: 'Giới thiệu bạn bè', brief: 'Email chương trình referral: mời bạn bè dùng Gemral, cả 2 nhận thưởng gems/discount, cách chia sẻ link giới thiệu, CTA sao chép link referral.', type: 'referral', subject: 'Mời bạn bè — Cả hai cùng nhận thưởng!' },
                    { label: 'Chúc mừng milestone', brief: 'Email chúc mừng user đạt milestone: hoàn thành khóa học, 100 ngày sử dụng app, đạt profit target, streak learning. Tặng badge/gems, CTA chia sẻ thành tích.', type: 'milestone', subject: 'Chúc mừng! Bạn vừa đạt một cột mốc quan trọng' },
                    { label: 'Khảo sát phản hồi', brief: 'Email khảo sát: hỏi trải nghiệm sử dụng app, tính năng muốn cải thiện, đề xuất mới. Ngắn gọn 2-3 phút, tặng 100 gems khi hoàn thành, CTA làm khảo sát.', type: 'survey_feedback', subject: 'Góp ý 2 phút — Nhận 100 Gems miễn phí' },
                    { label: 'Tết / Lễ hội', brief: 'Email theo mùa lễ: chúc mừng, chia sẻ ý nghĩa ngày lễ, ưu đãi đặc biệt dịp lễ, CTA mua sắm/đăng ký. Design festive phù hợp dịp.', type: 'seasonal', subject: 'Ưu đãi mừng lễ — Quà tặng đặc biệt cho bạn' },
                    // --- Khóa học & Giáo dục ---
                    { label: 'Mời học khóa mới', brief: 'Email giới thiệu khóa học mới: nội dung khóa học, ai nên học, kết quả mong đợi, lộ trình chi tiết, early bird discount, CTA đăng ký.', type: 'course_enrollment', subject: 'Khóa học mới — Đăng ký sớm giảm 20%' },
                    { label: 'Tips trading tuần', brief: 'Email giáo dục: 3 tips trading thực chiến tuần này — quản lý rủi ro, đọc pattern, kiên nhẫn chờ setup. Kèm ví dụ chart thực tế, sai lầm cần tránh, CTA mở Scanner.', type: 'educational', subject: '3 Tips Trading Tuần Này — Áp Dụng Ngay' },
                    { label: 'Bài học tâm lý trading', brief: 'Email chia sẻ bài học tâm lý trading: cách kiểm soát FOMO, revenge trade, quá tự tin sau chuỗi thắng. Câu chuyện thực tế từ Jennie hoặc học viên, 3 bước thực hành ngay, CTA thiền/journaling trên app.', type: 'educational', subject: 'Bí mật của những trader kỷ luật' },
                    { label: 'Hướng dẫn dùng Scanner', brief: 'Email hướng dẫn chi tiết cách sử dụng GEM Scanner: chọn timeframe, đọc tín hiệu pattern, thiết lập alerts, chiến lược entry/exit. Step-by-step có hình minh họa, CTA mở Scanner thực hành.', type: 'educational', subject: 'Hướng dẫn: Dùng GEM Scanner như Pro Trader' },
                    { label: 'Onboarding ngày 3', brief: 'Email onboarding ngày 3: nhắc user khám phá tính năng chưa dùng (Tarot, Vision Board, Journaling), gợi ý goal đầu tiên nên tạo, chia sẻ tip sử dụng app hiệu quả, CTA thiết lập goal.', type: 'onboarding_series', subject: 'Ngày 3 trên Gemral — Bạn đã thử tính năng này chưa?' },
                    { label: 'Weekly Digest', brief: 'Email tổng hợp tuần: top 3 bài viết hay nhất trên forum, thống kê cá nhân (số lần scan, streak, gems kiếm được), sự kiện sắp tới, CTA quay lại app.', type: 'weekly_digest', subject: 'Tổng hợp tuần — Bạn đã làm được nhiều hơn bạn nghĩ' },
                    // --- Tâm linh, Huyền học, Năng lượng ---
                    { label: 'Thông điệp vũ trụ tuần', brief: 'Email chia sẻ thông điệp vũ trụ tuần mới: năng lượng chủ đạo của tuần (dựa trên chiêm tinh/số học), lời khuyên cho từng khía cạnh (tài chính, tình cảm, sức khỏe), mantra/affirmation tuần, CTA mở Tarot trong app.', type: 'educational', subject: 'Năng lượng tuần mới — Thông điệp từ vũ trụ' },
                    { label: 'Tarot tuần', brief: 'Email Tarot reading hàng tuần: rút 3 lá bài đại diện cho tuần (quá khứ-hiện tại-tương lai), giải nghĩa chi tiết từng lá, thông điệp tổng hợp và lời khuyên hành động. CTA xem chi tiết trên app Tarot.', type: 'educational', subject: 'Lá bài Tarot tuần này nói gì về bạn?' },
                    { label: 'Dự báo năng lượng tháng', brief: 'Email dự báo năng lượng tháng mới: phân tích chu kỳ mặt trăng, các ngày năng lượng mạnh, lời khuyên cho trading (ngày nên/không nên giao dịch), nghi thức nên thực hiện, CTA thiết lập intention trên Vision Board.', type: 'educational', subject: 'Dự báo năng lượng tháng mới — Cơ hội & Thử thách' },
                    { label: 'Nghi thức trăng tròn', brief: 'Email hướng dẫn nghi thức đêm trăng tròn: ý nghĩa trăng tròn tháng này, 5 bước nghi thức buông bỏ và đón nhận (thắp nến, viết thư, thiền, biết ơn, affirmation), CTA làm nghi thức trên app Ritual.', type: 'educational', subject: 'Đêm trăng tròn — Nghi thức buông bỏ & Đón nhận' },
                    { label: 'Chữa lành năng lượng', brief: 'Email chia sẻ phương pháp chữa lành năng lượng: 7 chakra và cách cân bằng, dấu hiệu năng lượng bị tắc nghẽn, bài thiền 10 phút chữa lành, đá pha lê phù hợp. CTA mở Nghi Thức Chữa Lành trên app.', type: 'educational', subject: 'Khi năng lượng bị tắc nghẽn — 3 cách chữa lành' },
                    { label: 'Kinh Dịch & Quẻ tuần', brief: 'Email chia sẻ quẻ Kinh Dịch tuần: gieo quẻ đại diện cho tuần, giải nghĩa theo Ngũ Hành, lời khuyên ứng dụng cho tài chính và cuộc sống, CTA xem quẻ cá nhân trên app.', type: 'educational', subject: 'Quẻ Kinh Dịch tuần này — Lời khuyên từ cổ nhân' },
                    { label: 'Phong thuỷ tài lộc', brief: 'Email tips phong thuỷ tài lộc: hướng bàn làm việc tốt cho trader, vật phẩm phong thuỷ thu hút tiền tài (tỳ hưu, cóc vàng, cây kim tiền), màu sắc may mắn theo mệnh, CTA xem sản phẩm đá phong thuỷ trên shop.', type: 'educational', subject: 'Phong thuỷ bàn trading — Thu hút tài lộc' },
                    // --- Phát triển bản thân & Lifestyle ---
                    { label: 'Thói quen buổi sáng', brief: 'Email chia sẻ morning routine: 5 thói quen buổi sáng thay đổi cuộc sống (thiền 5 phút, journaling, affirmation, tập thể dục, review goals). Câu chuyện cá nhân Jennie, CTA thiết lập ritual buổi sáng trên app.', type: 'educational', subject: '5 thói quen buổi sáng thay đổi cuộc đời tôi' },
                    { label: 'Journaling & Biết ơn', brief: 'Email hướng dẫn journaling hiệu quả: 3 câu hỏi biết ơn mỗi tối, cách viết nhật ký giao dịch, template suy ngẫm cuối ngày, lợi ích khoa học của journaling. CTA mở Journal Template trên app.', type: 'educational', subject: 'Viết 3 dòng mỗi tối — Phép màu biết ơn' },
                    { label: 'Tư duy triệu phú', brief: 'Email chia sẻ bài học tư duy triệu phú: sự khác biệt giữa mindset giàu vs nghèo, 3 niềm tin giới hạn về tiền bạc cần phá bỏ, bài tập thay đổi lập trình tiềm thức. CTA đăng ký khóa Tư Duy Triệu Phú 49 Ngày.', type: 'educational', subject: 'Tại sao bạn chưa giàu — 3 niềm tin cần phá bỏ' },
                    { label: 'Câu chuyện thành công', brief: 'Email chia sẻ success story từ học viên/user: hành trình trước-sau, kết quả đạt được (trading profit, thay đổi mindset, cuộc sống tốt hơn), quote từ user, CTA bắt đầu hành trình tương tự.', type: 'educational', subject: 'Từ thua lỗ liên tục đến trader kỷ luật — Câu chuyện thật' },
                    { label: 'Vision Board & Mục tiêu', brief: 'Email hướng dẫn tạo Vision Board hiệu quả: tại sao visualization hoạt động (khoa học), 5 bước tạo vision board (chọn mục tiêu, tìm hình ảnh, affirmation, review hàng ngày, hành động), CTA tạo Vision Board trên app.', type: 'educational', subject: 'Hình dung tương lai — Tạo Vision Board đầu tiên' },
                    { label: 'Thư từ Jennie', brief: 'Thư cá nhân từ Jennie: chia sẻ câu chuyện, suy ngẫm sâu sắc, bài học trading/cuộc sống/tâm linh tuần qua. Giọng chân thành, gần gũi như viết cho bạn thân. Không bán hàng, chỉ kết nối và truyền cảm hứng.', type: 'personal_note', subject: 'Jennie muốn chia sẻ với bạn điều này...' },
                    { label: 'Thiền & Chánh niệm', brief: 'Email chia sẻ bài thiền chánh niệm: hướng dẫn thiền 10 phút cho người bận rộn, lợi ích cho trader (bình tĩnh, tập trung, giảm stress), 3 kỹ thuật thở đơn giản, CTA mở Nghi Thức Thiền trên app.', type: 'educational', subject: '10 phút thiền — Bí quyết bình tĩnh giữa thị trường' },
                    { label: 'Affirmation tuần', brief: 'Email chia sẻ 7 affirmation cho tuần mới (mỗi ngày 1 affirmation): về sự thịnh vượng, sức khỏe, tình yêu, sự nghiệp, lòng biết ơn. Hướng dẫn cách đọc affirmation hiệu quả (trước gương, buổi sáng), CTA lưu vào app.', type: 'educational', subject: '7 lời khẳng định cho tuần mới tràn đầy năng lượng' },
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      disabled={generating}
                      onClick={() => {
                        setBrief(tpl.brief);
                        if (tpl.type) setEmailType(tpl.type);
                        if (tpl.subject) setEmailSubject(tpl.subject);
                      }}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-all cursor-pointer ${brief === tpl.brief
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-border bg-bg-4 text-txt-2 hover:border-border-2 hover:text-txt'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nội dung tóm tắt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-txt-2">Nội dung tóm tắt</label>
              <button
                type="button"
                onClick={toggleSpeech}
                disabled={generating || isTranscribing}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : isTranscribing
                    ? 'bg-purple/20 text-purple border border-purple/40'
                    : 'bg-bg-3/60 text-txt-3 border border-border hover:text-gold hover:border-gold/30 hover:bg-gold/5'
                } disabled:opacity-40`}
                title={isRecording ? 'Dừng ghi âm & chuyển văn bản' : isTranscribing ? 'Đang chuyển văn bản...' : 'Nhập bằng giọng nói (Whisper)'}
              >
                {isRecording ? (
                  <>
                    <Square size={10} className="fill-current" />
                    Dừng ({recordingTime}s)
                  </>
                ) : isTranscribing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Đang chuyển...
                  </>
                ) : (
                  <>
                    <Mic size={12} />
                    Giọng nói
                  </>
                )}
              </button>
            </div>
            {isRecording && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-1 rounded-full bg-red-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-[11px] text-red-400 font-medium">Đang ghi âm... Nói xong bấm Dừng</span>
                <span className="text-[11px] text-txt-3 ml-auto tabular-nums">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
              </div>
            )}
            <Textarea
              placeholder="Paste toàn bộ brief/tóm tắt chủ đề vào đây. Claude Code sẽ tự đọc knowledge files, reframe, tạo outline, và viết nội dung hoàn chỉnh."
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                if (briefError) setBriefError('');
              }}
              error={briefError}
              disabled={generating}
              rows={10}
              showCount
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xxs text-txt-3">{briefWordCount} từ</span>
              <span className="text-xxs text-txt-3">tối đa 500 từ</span>
            </div>
          </div>

          {/* Tùy chỉnh nâng cao */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-txt-2 hover:text-txt transition-colors"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              />
              Tùy chỉnh nâng cao
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 pl-5 border-l border-border">
                <Select
                  label="Persona"
                  options={PERSONA_OPTIONS}
                  value={persona}
                  onChange={setPersona}
                  disabled={generating}
                />
                <Select
                  label="Chế độ viết"
                  options={WRITING_MODE_OPTIONS}
                  value={writingMode}
                  onChange={setWritingMode}
                  disabled={generating}
                />
                <Select
                  label="Product Hook"
                  options={PRODUCT_HOOK_OPTIONS}
                  value={productHook}
                  onChange={setProductHook}
                  disabled={generating}
                />
              </div>
            )}
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-3 pt-2">
            {generating ? (
              <>
                <Button variant="danger" icon={StopCircle} onClick={handleCancel}>
                  Hủy
                </Button>
                <span className="text-xs text-txt-3 flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tạo nội dung ({aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'openai' ? 'GPT' : 'Claude'})...
                </span>
              </>
            ) : (
              <>
                <Button variant="gold" icon={Sparkles} onClick={handleGenerate}>
                  Tạo Nội Dung ({aiProvider === 'gemini' ? `Gemini` : aiProvider === 'openai' ? `GPT` : `Claude`})
                </Button>
                {output && (
                  <Button variant="outline" icon={RefreshCw} onClick={handleRegenerate}>
                    Tạo Lại
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* -- Pipeline Status -- */}
      {generating && (
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center gap-4">
            {PIPELINE_STEPS.map((step, i) => {
              const currentIdx = getPipelineIndex(pipelineStep);
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;

              return (
                <div key={step.key} className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="text-gold animate-spin" />
                  ) : (
                    <Circle size={16} className="text-txt-3" />
                  )}
                  <span className={`text-xs ${isCurrent ? 'text-gold font-semibold' : isDone ? 'text-success' : 'text-txt-3'}`}>
                    {step.label}
                  </span>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <span className="text-txt-3 mx-1">&mdash;</span>
                  )}
                </div>
              );
            })}
          </div>
          <ElapsedTimer />
        </div>
      )}

      {/* Email Toolbox — fixed position in left margin, outside content flow */}
      {output && isEmail && showEmailToolbox && (
        <div
          className="rounded-card border border-border bg-glass-bg overflow-hidden z-50"
          style={{ position: 'fixed', right: '16px', top: '80px', width: '190px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
        >
            {/* Toolbox Header */}
            <div className="px-3 py-2 border-b border-border bg-gold/10 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-gold" />
                <span className="text-xs font-semibold text-gold">Toolbox</span>
              </div>
              <button onClick={() => setShowEmailToolbox(false)} className="text-txt-3 hover:text-txt transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-2">
              {EMAIL_TOOLBOX_CATEGORIES.map((category) => (
                <div key={category.id} className="mb-2">
                  <button
                    onClick={() => setEmailToolboxCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }))}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left rounded bg-glass-bg hover:bg-bg-3 transition-colors"
                  >
                    {emailToolboxCategories[category.id] ? <ChevronDown size={12} className="text-txt-3" /> : <ChevronRight size={12} className="text-txt-3" />}
                    <category.icon size={12} className="text-gold" />
                    <span className="text-xxs font-semibold text-txt-2">{category.label}</span>
                    <span className="text-xxs text-txt-3 ml-auto">({category.items.length})</span>
                  </button>

                  {emailToolboxCategories[category.id] && (
                    <div className="flex flex-col gap-1 mt-1 pl-1">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('application/x-email-toolbox', JSON.stringify(item));
                            e.dataTransfer.setData('text/html', item.html);
                            e.dataTransfer.setData('text/plain', item.label);
                            // Store the HTML for the iframe postMessage handler
                            window.__emailPendingDropHtml = item.html;
                          }}
                          onClick={() => handleEmailToolboxInsert(item)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent bg-white/[0.03] hover:bg-gold/10 hover:border-gold/20 cursor-grab transition-all group"
                          title={`${item.description} — Kéo vào email preview hoặc click để thêm`}
                        >
                          <GripVertical size={10} className="text-txt-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <item.icon size={12} className="text-gold flex-shrink-0" />
                          <span className="text-xxs text-txt-2 leading-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Hint */}
              <div className="mt-2 p-2 rounded bg-purple/5 border border-purple/10 text-center">
                <p className="text-xxs text-txt-3 leading-relaxed">
                  Kéo thả trực tiếp vào email preview hoặc click để chèn
                </p>
              </div>
            </div>
          </div>
      )}

      {/* -- Kết quả -- */}
      {output && (
        <Card variant="glass" padding="md">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-txt">Kết Quả</h3>
              {savedId && (
                <Badge text="Đã lưu tự động" variant="success" size="sm" dot />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? 'gold' : 'outline'}
                size="sm"
                icon={isEditing ? Check : Edit3}
                onClick={() => {
                  const next = !isEditing;
                  if (isEmail) {
                    // Toggle contentEditable mode inside the iframe via postMessage
                    const iframe = emailIframeRef.current;
                    if (iframe?.contentWindow) {
                      iframe.contentWindow.postMessage({ type: 'email-toggle-edit', editing: next }, '*');
                    }
                    // Ensure preview is visible
                    if (next && !showEmailPreview) {
                      setShowEmailPreview(true);
                      setShowEmailSource(false);
                    }
                  }
                  setIsEditing(next);
                }}
              >
                {isEditing ? 'Xong' : 'Sửa'}
              </Button>
              <Button variant="outline" size="sm" icon={Copy} onClick={handleCopy}>
                Sao Chép
              </Button>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRegenerate}>
                Tạo Lại
              </Button>
            </div>
          </div>

          {/* ═══ Iterate Chat Panel (Persistent Session) ═══ */}
          {sessionId && (
            <div className="mb-4 p-3 rounded-xl bg-bg-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-purple" />
                <span className="text-[12px] font-semibold text-purple">Chat Với AI</span>
                <span className="text-[10px] text-txt-3 ml-auto">Session: {sessionId}</span>
              </div>

              {/* Quick iterate shortcuts */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ITERATE_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    disabled={iterating}
                    onClick={() => handleIterate(s.instruction)}
                    className="h-[22px] px-2 text-[10px] font-semibold rounded bg-purple/10 text-purple border border-purple/20 cursor-pointer hover:bg-purple/20 transition-colors disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Chat history */}
              {iterateHistory.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto space-y-1.5 mb-2 p-2 rounded-lg bg-bg-4">
                  {iterateHistory.map((msg, i) => (
                    <div key={i} className={`text-[11px] ${msg.role === 'user' ? 'text-gold' : 'text-txt-2'}`}>
                      <span className="font-semibold">{msg.role === 'user' ? 'Bạn' : 'AI'}:</span> {msg.text}
                    </div>
                  ))}
                </div>
              )}

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  value={iterateInput}
                  onChange={(e) => setIterateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleIterate(iterateInput)}
                  placeholder="Sửa phần 3, thêm ví dụ, làm mềm CTA..."
                  disabled={iterating}
                  className="flex-1 h-8 px-3 text-[12px] bg-bg-4 border border-border rounded-lg text-txt placeholder:text-txt-3 focus:border-purple/40 focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => handleIterate(iterateInput)}
                  disabled={iterating || !iterateInput.trim()}
                  className="h-8 px-3 text-[11px] font-semibold rounded-lg bg-purple/15 text-purple border border-purple/20 cursor-pointer hover:bg-purple/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {iterating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Gửi
                </button>
              </div>
            </div>
          )}

          {/* Content: Email HTML Preview or standard markdown */}
          {isEmail ? (
            <div className="mb-4 space-y-3">
              {/* Email toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setShowEmailPreview(true); setShowEmailSource(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showEmailPreview && !showEmailSource ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
                >
                  <Eye size={14} />
                  Preview
                </button>
                <button
                  onClick={() => { setShowEmailSource(true); setShowEmailPreview(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showEmailSource && !showEmailPreview ? 'bg-purple/20 text-purple border border-purple/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-purple/20'}`}
                >
                  <Code size={14} />
                  HTML Source
                </button>
                <button
                  onClick={() => { setShowEmailPreview(true); setShowEmailSource(true); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showEmailPreview && showEmailSource ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-cyan/20'}`}
                >
                  <Smartphone size={14} />
                  Split View
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Toolbox toggle */}
                <button
                  onClick={() => setShowEmailToolbox(!showEmailToolbox)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all ${showEmailToolbox ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-glass-bg text-txt-3 border border-border hover:border-gold/20'}`}
                >
                  <Layers size={14} />
                  Toolbox
                </button>

                {/* Image Management */}
                <input
                  ref={emailFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEmailImageUpload}
                />
                <button
                  onClick={() => { setEmailReplacingIdx(null); emailFileInputRef.current?.click(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium bg-glass-bg text-txt-3 border border-border hover:border-emerald/30 hover:text-emerald transition-all"
                >
                  <Upload size={14} />
                  Thêm Hình Ảnh
                </button>
                {emailPlaceholders.length > 0 && (
                  <span className="text-xxs text-txt-3">
                    {emailPlaceholders.length} placeholder •
                  </span>
                )}
                {emailPlaceholders.map((ph, i) => (
                  <button
                    key={i}
                    onClick={() => { setEmailReplacingIdx(i); emailFileInputRef.current?.click(); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xxs bg-amber/10 text-amber border border-amber/20 hover:bg-amber/20 transition-all"
                    title={ph.url}
                  >
                    <ImageIcon size={10} />
                    Thay #{i + 1}
                  </button>
                ))}
              </div>

              {/* Preview / Source area — full width since toolbox is outside Card */}
              <div
                className={`${showEmailPreview && showEmailSource ? 'grid grid-cols-2 gap-3' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Handle image drops on the outer container
                  handleEmailDrop(e);
                }}
              >
                {/* HTML Source Editor */}
                {showEmailSource && (
                  <div className="rounded-card bg-glass-bg border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                      <Code size={14} className="text-purple" />
                      <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">HTML Source</span>
                    </div>
                    <textarea
                      value={output}
                      onChange={(e) => setOutput(e.target.value)}
                      className="w-full bg-transparent text-xs text-txt-2 leading-relaxed focus:outline-none resize-y p-3 font-mono"
                      style={{ minHeight: 'calc(100vh - 260px)' }}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* HTML Preview */}
                {showEmailPreview && (
                  <div className="rounded-card border border-border overflow-hidden bg-white">
                    <div className="px-3 py-2 border-b border-border bg-glass-bg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gold" />
                        <span className="text-xxs font-semibold text-txt-2 uppercase tracking-wider">Email Preview</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!canUndo}
                          onClick={() => emailIframeRef.current?.contentWindow?.postMessage({ type: 'email-undo' }, '*')}
                          className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Hoàn tác (Ctrl+Z)"
                        >
                          <RefreshCw size={12} className="scale-x-[-1]" />
                          Undo
                        </button>
                        <button
                          disabled={!canRedo}
                          onClick={() => emailIframeRef.current?.contentWindow?.postMessage({ type: 'email-redo' }, '*')}
                          className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-4 hover:text-txt transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Làm lại (Ctrl+Y)"
                        >
                          <RefreshCw size={12} />
                          Redo
                        </button>
                        <span className="text-xxs text-txt-3">600px max-width</span>
                      </div>
                    </div>
                    <div className="flex justify-center bg-[#e8e8ec] p-4">
                      <iframe
                        ref={emailIframeRef}
                        key="email-preview-stable"
                        title="Email Preview"
                        srcDoc={emailPreviewSrcDoc}
                        className="border-0 w-full max-w-[620px] bg-white shadow-lg rounded"
                        style={{ minHeight: '800px' }}
                        sandbox="allow-same-origin allow-scripts"
                        onLoad={handleEmailIframeLoad}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-card bg-glass-bg border border-border mb-4">
              {isEditing ? (
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  className="w-full bg-transparent text-sm text-txt-2 leading-relaxed focus:outline-none resize-none min-h-[300px] font-sans"
                  style={{ minHeight: `${Math.max(300, output.split('\n').length * 22)}px` }}
                />
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  {output.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return (
                        <h2 key={i} className="font-heading text-lg text-gold font-semibold mt-4 mb-2">
                          {line.replace(/^##\s+/, '')}
                        </h2>
                      );
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h3 key={i} className="font-heading text-md text-txt font-semibold mt-3 mb-1">
                          {line.replace(/^###\s+/, '')}
                        </h3>
                      );
                    }
                    if (line.trim() === '') {
                      return <div key={i} className="h-2" />;
                    }
                    const renderBold = (text) => {
                      const parts = text.split(/(\*\*.*?\*\*)/g);
                      return parts.map((part, index) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={index} className="text-txt font-bold">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={index}>{part}</span>;
                      });
                    };
                    return (
                      <p key={i} className="text-sm text-txt-2 leading-relaxed mb-3">
                        {renderBold(line)}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Image Prompt */}
          {imagePrompt && (
            <div className="p-4 rounded-card border border-purple/20 bg-purple/5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  Prompt Tạo Hình Ảnh Minh Họa
                </h4>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyImagePrompt}>
                    Sao Chép Tất Cả
                  </Button>
                </div>
              </div>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full min-h-[120px] text-xs text-txt-2 leading-relaxed whitespace-pre-wrap bg-glass-bg rounded-card p-3 resize-y focus:outline-none focus:ring-1 focus:ring-purple/50 border border-transparent placeholder:text-txt-3"
                placeholder="PROMPT Tạo hình ảnh minh họa..."
                spellCheck={false}
              />
              {/* Default Design System */}
              <div className="mt-3 p-3 rounded-card bg-glass-bg border border-gold/20">
                <p className="text-xxs font-semibold text-gold uppercase tracking-wider mb-2">Quy Tắc &amp; Design System Mặc Định (tự động ghép khi sao chép)</p>
                <p className="text-xxs text-txt-3 leading-relaxed whitespace-pre-wrap font-mono">QUY TẮC BẮT BUỘC:{'\n'}- Use my attached photo for character face.{'\n'}- Tất cả text bằng tiếng Việt có dấu{'\n'}- Người Việt thật 27-35 tuổi (KHÔNG cartoon, KHÔNG illustration){'\n'}- Style: Luxurious, premium, high-end editorial photography{'\n'}- Lighting: cinematic golden hour, dramatic rim lighting, soft bokeh{'\n'}- KHÔNG blazer, vest, suit jacket — elegant casual only{'\n'}- Background: rich textures (marble, velvet, warm wood, golden accents){'\n'}- Tỷ lệ mặc định: 3:4 (dọc){'\n'}{'\n'}DESIGN SYSTEM:{'\n'}Navy đậm #112250{'\n'}Gold #FFBD59{'\n'}Accent: Purple #6A5BFF{'\n'}Burgundy #9C0612{'\n'}Pink #FF6B9D{'\n'}Text: White #FFFFFF{'\n'}Footer: &quot;gemral.com&quot; centered</p>
              </div>
            </div>
          )}

          {/* Thống kê */}
          {generationDone && !isEmail && (
            <div className="flex items-center gap-6 flex-wrap mb-4">
              {brandResult && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-txt-3">Giọng thương hiệu:</span>
                  <span className={`text-lg font-heading font-bold ${brandResult.score >= 80 ? 'text-success' : brandResult.score >= 60 ? 'text-amber' : 'text-danger'}`}>
                    {brandResult.score}/100
                  </span>
                  {brandResult.passed ? (
                    <Badge text="ĐẠT" variant="new" size="sm" />
                  ) : (
                    <Badge text="KHÔNG ĐẠT" variant="danger" size="sm" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-txt-3" />
                <span className="text-xs text-txt-3">Số từ:</span>
                <span className="text-sm font-semibold text-txt">
                  {outputWordCount.toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-txt-3" />
                <span className="text-xs text-txt-3">Thời lượng:</span>
                <span className="text-sm font-semibold text-txt">
                  {outputDuration}
                </span>
              </div>
            </div>
          )}

          {/* Brand Voice + GEM Tools Analysis Cards */}
          {generationDone && !isEmail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Card 1: Giọng Thương Hiệu */}
              <Card variant="glass" padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-purple" />
                  <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider">
                    Giọng Thương Hiệu
                  </h3>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="stroke-bg-4"
                        fill="none"
                        strokeWidth="3"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={
                          localBrandAnalysis.score >= 80
                            ? 'stroke-emerald'
                            : localBrandAnalysis.score >= 60
                              ? 'stroke-amber'
                              : 'stroke-danger'
                        }
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${localBrandAnalysis.score}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-txt">{localBrandAnalysis.score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-txt">{localBrandAnalysis.score}/100</p>
                    <p className="text-xxs text-txt-3">
                      {localBrandAnalysis.score >= 80
                        ? 'Tốt'
                        : localBrandAnalysis.score >= 60
                          ? 'Cần cải thiện'
                          : 'Cần sửa ngay'}
                    </p>
                  </div>
                </div>

                {localBrandAnalysis.violations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xxs text-amber flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {localBrandAnalysis.violations.length} vi phạm
                    </p>
                    {localBrandAnalysis.violations.map((v, i) => {
                      const fbKey = `brand_violation:${v.rule}`;
                      const isSent = feedbackSent.has(fbKey);
                      const isSending = feedbackSending === fbKey;
                      return (
                        <div
                          key={i}
                          className={`p-2 rounded-card text-xxs ${v.severity === 'error'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-amber/10 text-amber'
                          }`}
                        >
                          <p className="font-medium">{v.rule}</p>
                          <p className="opacity-70">{v.location}</p>
                          <button
                            disabled={isSent || isSending}
                            onClick={() => handleFeedback(
                              'brand_violation',
                              v.rule,
                              `TUYỆT ĐỐI KHÔNG sử dụng hoặc tạo nội dung vi phạm: "${v.rule}". Quy tắc này áp dụng cho TẤT CẢ loại nội dung.`,
                            )}
                            className={`mt-1.5 flex items-center gap-1 px-2 py-1 rounded-badge text-xxs font-medium transition-all ${isSent
                              ? 'bg-success/10 text-success cursor-default'
                              : 'bg-glass-bg text-txt-2 hover:bg-gold/10 hover:text-gold border border-border hover:border-gold/30'
                            }`}
                          >
                            {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <Check size={10} /> : <Zap size={10} />}
                            {isSent ? 'Đã cập nhật knowledge' : 'Gửi sửa lỗi vào knowledge'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick action: Tổng thể */}
                {localBrandAnalysis.score < 80 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      disabled={feedbackSent.has('brand_violation:Điểm brand voice thấp') || feedbackSending === 'brand_violation:Điểm brand voice thấp'}
                      onClick={() => handleFeedback(
                        'brand_violation',
                        'Điểm brand voice thấp',
                        'Cần tăng cường giọng thương hiệu Jennie: dùng nhiều tiếng Việt có dấu hơn, tránh câu tiếng Anh dài, giữ tone ấm áp và tự nhiên. Áp dụng cho TẤT CẢ nội dung.',
                      )}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has('brand_violation:Điểm brand voice thấp')
                        ? 'bg-success/10 text-success'
                        : 'bg-purple/10 text-purple hover:bg-purple/20 border border-purple/20'
                      }`}
                    >
                      {feedbackSending === 'brand_violation:Điểm brand voice thấp' ? <Loader2 size={12} className="animate-spin" /> : feedbackSent.has('brand_violation:Điểm brand voice thấp') ? <Check size={12} /> : <BookOpen size={12} />}
                      {feedbackSent.has('brand_violation:Điểm brand voice thấp') ? 'Đã ghi nhận' : 'Cải thiện giọng thương hiệu cho lần sau'}
                    </button>
                  </div>
                )}
              </Card>

              {/* Card 2: GEM Tools Distribution */}
              <Card variant="glass" padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-gold" />
                  <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider">
                    GEM Tools
                  </h3>
                  <Badge
                    text={`${presentToolCount}/5`}
                    variant={presentToolCount >= 4 ? 'success' : presentToolCount >= 2 ? 'gold' : 'danger'}
                    size="sm"
                  />
                </div>

                <ProgressBar
                  value={(presentToolCount / 5) * 100}
                  color={presentToolCount >= 4 ? 'emerald' : presentToolCount >= 2 ? 'gold' : 'danger'}
                  size="sm"
                  className="mb-3"
                />

                <div className="space-y-2">
                  {localGemTools.map((tool) => {
                    const fbKey = `gem_tool_missing:${tool.key}`;
                    const isSent = feedbackSent.has(fbKey);
                    const isSending = feedbackSending === fbKey;
                    return (
                      <div key={tool.key} className="flex items-center gap-2">
                        {tool.present ? (
                          <CheckCircle size={14} className="text-emerald shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-txt-3 shrink-0" />
                        )}
                        <span className="text-xs text-txt-2 flex-1">
                          <span className="font-mono text-txt-3 mr-1">{tool.key}:</span>
                          {tool.label}
                        </span>
                        {!tool.present && (
                          <button
                            disabled={isSent || isSending}
                            onClick={() => handleFeedback(
                              'gem_tool_missing',
                              `Thiếu GEM Tool: ${tool.label} (${tool.key})`,
                              `BẮT BUỘC tích hợp GEM Tool "${tool.label}" vào nội dung. Tool này phải được nhắc đến tự nhiên trong kịch bản, không phải chỉ liệt kê tên.`,
                            )}
                            className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-badge text-xxs font-medium transition-all ${isSent
                              ? 'text-success'
                              : 'text-danger hover:text-gold hover:bg-gold/10'
                            }`}
                          >
                            {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <Check size={10} /> : <Zap size={10} />}
                            {isSent ? 'Đã ghi' : 'Sửa'}
                          </button>
                        )}
                        {tool.present && (
                          <CheckCircle size={10} className="text-emerald shrink-0 opacity-50" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick action: Enforce tất cả GEM tools */}
                {presentToolCount < 5 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      disabled={feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools')}
                      onClick={() => handleFeedback(
                        'gem_tool_missing',
                        'Thiếu nhiều GEM Tools',
                        `BẮT BUỘC tích hợp ĐẦY ĐỦ 5 GEM Tools vào MỌI kịch bản: (1) Thở Thanh Lọc, (2) Template Tần Số, (3) Thiền Dẫn Dắt, (4) Tần Số Tình Yêu, (5) Vision Board. Mỗi tool phải được nhắc tự nhiên trong nội dung, KHÔNG chỉ liệt kê.`,
                      )}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-card text-xs font-medium transition-all ${feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools')
                        ? 'bg-success/10 text-success'
                        : 'bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20'
                      }`}
                    >
                      {feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools') ? <Check size={12} /> : <Sparkles size={12} />}
                      {feedbackSent.has('gem_tool_missing:Thiếu nhiều GEM Tools') ? 'Đã ghi nhận' : 'Enforce tất cả GEM Tools cho lần sau'}
                    </button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Đăng lên MXH */}
          {generationDone && isSocialPost && (
            <div className="p-4 rounded-card border border-gold/20 bg-gold/5 space-y-4">
              <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <Share2 size={14} />
                Đăng Lên Mạng Xã Hội
              </h4>

              {/* Image Upload Zone */}
              <div
                className={`relative border-2 border-dashed rounded-card p-4 transition-all cursor-pointer ${isDragging ? 'border-gold bg-gold/10' : 'border-border hover:border-gold/30'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2 text-center">
                  <Upload size={24} className={isDragging ? 'text-gold' : 'text-txt-3'} />
                  <p className="text-xs text-txt-3">
                    <span className="text-gold font-medium">Kéo thả hình ảnh</span> hoặc bấm để chọn
                  </p>
                  <p className="text-xxs text-txt-3">JPEG, PNG, WebP, GIF &bull; Tối đa 10 ảnh &bull; 10MB/ảnh</p>
                </div>
              </div>

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xxs text-txt-3 font-medium">{uploadedImages.length} hình ảnh đính kèm</p>
                  <div className={`grid gap-2 ${uploadedImages.length === 1 ? 'grid-cols-1' :
                    uploadedImages.length === 2 ? 'grid-cols-2' :
                      uploadedImages.length === 3 ? 'grid-cols-3' :
                        uploadedImages.length === 4 ? 'grid-cols-2' :
                          'grid-cols-3'
                    }`}>
                    {uploadedImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg overflow-hidden border border-border bg-glass-bg"
                      >
                        <img
                          src={img.preview}
                          alt={`Preview ${i + 1}`}
                          className="w-full max-h-48 object-contain bg-white/5"
                        />
                        <button
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        >
                          <X size={12} />
                        </button>
                        {img.url && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-success/80 text-white text-xxs">
                            ✓ Uploaded
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Preview */}
              {(output || uploadedImages.length > 0) && (
                <div className="p-3 rounded-card border border-border bg-glass-bg">
                  <p className="text-xxs text-txt-3 font-medium mb-2">Preview bài đăng</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">J</div>
                    <div>
                      <p className="text-xs font-semibold text-txt">Jennie Uyen Chu</p>
                      <p className="text-xxs text-txt-3">Vừa xong</p>
                    </div>
                  </div>
                  <p className="text-xs text-txt-2 leading-relaxed mb-2 line-clamp-4 whitespace-pre-wrap">
                    {output.slice(0, 300)}{output.length > 300 ? '...' : ''}
                  </p>
                  {uploadedImages.length > 0 && (
                    <div className={`grid gap-1 rounded-lg overflow-hidden ${uploadedImages.length === 1 ? 'grid-cols-1' :
                      uploadedImages.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                      {uploadedImages.slice(0, 4).map((img, i) => (
                        <div key={i} className="relative">
                          <img src={img.preview} alt="" className="w-full max-h-40 object-contain bg-white/5 rounded" />
                          {i === 3 && uploadedImages.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold rounded">
                              +{uploadedImages.length - 4}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Publish Results */}
              {publishResults.length > 0 && (
                <div className="space-y-1">
                  {publishResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20">
                      <CheckCircle2 size={14} className="text-success" />
                      <span className="text-xs text-success font-medium">Đã đăng lên {r.platform}</span>
                      <div className="flex items-center gap-2 ml-auto">
                        {r.platform === 'Forum Gemral' && (
                          <button
                            disabled={publishing === 'Forum Gemral'}
                            onClick={() => {
                              setPublishResults(prev => prev.filter(x => x.platform !== 'Forum Gemral'));
                              handlePostToForum();
                            }}
                            className="text-xs text-[#FFBD59] flex items-center gap-1 hover:text-[#FFBD59]/80 transition-colors disabled:opacity-50"
                          >
                            {publishing === 'Forum Gemral' ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                            Đăng lại
                          </button>
                        )}
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold flex items-center gap-1">
                          Xem bài <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-Comment Settings */}
              <div className="p-3 rounded-card border border-border bg-glass-bg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-txt-2">
                    <MessageSquare size={14} className="text-purple" />
                    Comment tự động sau khi đăng
                  </label>
                  <button
                    onClick={() => setAutoCommentEnabled(!autoCommentEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoCommentEnabled ? 'bg-purple' : 'bg-bg-4'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoCommentEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {autoCommentEnabled && (
                  <div className="space-y-2">
                    <textarea
                      value={autoCommentText}
                      onChange={(e) => setAutoCommentText(e.target.value)}
                      placeholder="Nhập nội dung comment tự động (VD: Link tải app, CTA, link sản phẩm...)"
                      rows={2}
                      className="fi text-xs w-full resize-y"
                    />
                    <input
                      type="url"
                      value={autoCommentLink}
                      onChange={(e) => setAutoCommentLink(e.target.value)}
                      placeholder="Link đính kèm (optional) — VD: https://gemral.com/download"
                      className="fi text-xs w-full"
                    />
                  </div>
                )}
              </div>

              {/* Schedule Settings (Facebook only) */}
              <div className="p-3 rounded-card border border-border bg-glass-bg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-txt-2">
                    <Timer size={14} className="text-cyan" />
                    Đặt lịch đăng (Facebook)
                  </label>
                  <button
                    onClick={() => setScheduleMode(!scheduleMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${scheduleMode ? 'bg-cyan' : 'bg-bg-4'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${scheduleMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {scheduleMode && (
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date(Date.now() + 600000).toISOString().slice(0, 16)}
                      className="fi text-xs w-full"
                    />
                    <p className="text-xxs text-txt-3">Thời gian phải ít nhất 10 phút trong tương lai. Chỉ hỗ trợ Facebook.</p>
                  </div>
                )}
              </div>

              {/* Facebook Page Selector */}
              {facebookPages.length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-txt-3">Facebook Page:</span>
                  <CCSelect
                    value={selectedFbPage}
                    onChange={(e) => setSelectedFbPage(e.target.value)}
                    className="text-xs py-1 px-2"
                  >
                    {facebookPages.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </CCSelect>
                </div>
              )}

              {/* Publish & Schedule Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Facebook', color: 'hover:bg-blue-500/10 hover:border-blue-400/40 hover:text-blue-400' },
                  { name: 'Instagram', color: 'hover:bg-pink-500/10 hover:border-pink-400/40 hover:text-pink-400' },
                  { name: 'Threads', color: 'hover:bg-gray-400/10 hover:border-gray-300/40 hover:text-gray-300' },
                ].map(({ name, color }) => {
                  const alreadyPublished = publishResults.some(r => r.platform === name);
                  const isPublishing = publishing === name;
                  const isScheduling = scheduleMode && name === 'Facebook';
                  return (
                    <button
                      key={name}
                      disabled={isPublishing || !!publishing || alreadyPublished || (isScheduling && !scheduledDateTime)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-card border text-xs font-medium transition-all ${alreadyPublished
                        ? 'border-success/30 text-success bg-success/5 cursor-default'
                        : `border-border bg-glass-bg text-txt-3 ${color}`
                        } disabled:opacity-50`}
                      onClick={() => handlePublish(name)}
                    >
                      {isPublishing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : alreadyPublished ? (
                        <CheckCircle2 size={12} />
                      ) : isScheduling ? (
                        <Timer size={12} />
                      ) : (
                        <Send size={12} />
                      )}
                      {isPublishing
                        ? (uploading ? 'Đang upload ảnh...' : isScheduling ? 'Đang đặt lịch...' : 'Đang đăng...')
                        : alreadyPublished
                          ? `Đã đăng`
                          : isScheduling
                            ? `Đặt Lịch ${name}`
                            : `Đăng ${name}`
                      }
                    </button>
                  );
                })}

                {/* Đăng Forum Gemral */}
                {(() => {
                  const forumPublished = publishResults.some(r => r.platform === 'Forum Gemral');
                  const forumPublishing = publishing === 'Forum Gemral';
                  return (
                    <button
                      disabled={forumPublishing || (!!publishing && !forumPublishing)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-card border text-xs font-medium transition-all ${forumPublished
                        ? 'border-[#FFBD59]/30 bg-[#FFBD59]/5 text-[#FFBD59] hover:bg-[#FFBD59]/10 hover:border-[#FFBD59]/40 cursor-pointer'
                        : 'border-[#FFBD59]/30 bg-[#FFBD59]/5 text-[#FFBD59] hover:bg-[#FFBD59]/10 hover:border-[#FFBD59]/40'
                        } disabled:opacity-50`}
                      onClick={() => {
                        if (forumPublished) {
                          setPublishResults(prev => prev.filter(x => x.platform !== 'Forum Gemral'));
                        }
                        handlePostToForum();
                      }}
                    >
                      {forumPublishing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : forumPublished ? (
                        <RefreshCw size={12} />
                      ) : (
                        <Globe size={12} />
                      )}
                      {forumPublishing
                        ? (uploading ? 'Đang upload ảnh...' : 'Đang đăng...')
                        : forumPublished
                          ? 'Đăng lại Forum'
                          : 'Đăng Forum Gemral'
                      }
                    </button>
                  );
                })()}

                {/* Lên Lịch Đăng → Calendar */}
                <button
                  onClick={() => {
                    setCalendarScheduleDate(new Date().toISOString().split('T')[0] ?? '');
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/5 text-emerald hover:bg-emerald/10 text-xs font-medium transition-all"
                >
                  <CalendarPlus size={12} />
                  Lên Lịch Đăng
                </button>
              </div>
            </div>
          )}

          {/* Lên Lịch Đăng — Calendar Integration Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowScheduleModal(false)} />
              <div className="relative glass-card p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading text-lg font-bold text-txt flex items-center gap-2">
                    <CalendarPlus size={20} className="text-emerald" />
                    Lên Lịch Đăng Bài
                  </h2>
                  <button onClick={() => setShowScheduleModal(false)} className="btn btn-gh p-1.5">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-txt-2 block mb-1">Ngày đăng *</label>
                    <input
                      type="date"
                      value={calendarScheduleDate}
                      onChange={(e) => setCalendarScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="fi text-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-txt-2 block mb-1">Giờ đăng</label>
                    <input
                      type="time"
                      value={calendarScheduleTime}
                      onChange={(e) => setCalendarScheduleTime(e.target.value)}
                      className="fi text-sm w-full"
                    />
                  </div>
                  {!isEmail && (
                    <div>
                      <label className="text-xs font-medium text-txt-2 block mb-1">Nền tảng</label>
                      <CCSelect
                        value={calendarPlatform}
                        onChange={(e) => setCalendarPlatform(e.target.value)}
                        className="text-sm w-full"
                      >
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="threads">Threads</option>
                      </CCSelect>
                    </div>
                  )}
                  <div className="p-3 rounded-card bg-glass-bg border border-border">
                    <p className="text-xxs text-txt-3 mb-1">{isEmail ? 'Email sẽ được tự động gửi:' : 'Nội dung preview:'}</p>
                    {isEmail ? (
                      <div className="text-xs text-txt-2 space-y-1">
                        <p><span className="text-txt-3">Từ:</span> {emailSender}</p>
                        <p><span className="text-txt-3">Đến:</span> {emailRecipients || '(chưa nhập)'}</p>
                        <p><span className="text-txt-3">Tiêu đề:</span> {emailSubject || '(chưa nhập)'}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-txt-2 line-clamp-3">{output.slice(0, 200)}{output.length > 200 ? '...' : ''}</p>
                    )}
                  </div>
                  {isEmail && (
                    <p className="text-xxs text-emerald/70 flex items-center gap-1">
                      <Clock size={10} />
                      Email sẽ tự động gửi qua Resend khi đến giờ (cần giữ tab mở).
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
                  <button onClick={() => setShowScheduleModal(false)} className="btn btn-gh text-xs">Hủy</button>
                  <button
                    onClick={handleCreateCalendarEvent}
                    disabled={creatingCalendarEvent || !calendarScheduleDate}
                    className="btn btn-p text-xs flex items-center gap-1.5"
                  >
                    {creatingCalendarEvent ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                    {linkedEventId ? 'Cập Nhật Sự Kiện' : 'Tạo Sự Kiện'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEO Metadata tách riêng cho tin tức */}
          {generationDone && isNews && newsMetadata && (newsMetadata.metaDescription || newsMetadata.tags || newsMetadata.tldr || newsMetadata.title) && (
            <div className="p-4 rounded-card border border-purple/20 bg-purple/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-purple uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} />
                  SEO &amp; Metadata
                </h4>
                <Button variant="outline" size="sm" icon={Copy} onClick={async () => {
                  const parts = [];
                  if (newsMetadata.title) parts.push(`Tiêu đề SEO: ${newsMetadata.title}`);
                  if (newsMetadata.metaDescription) parts.push(`Meta Description: ${newsMetadata.metaDescription}`);
                  if (newsMetadata.tags) parts.push(`Tags: ${newsMetadata.tags}`);
                  if (newsMetadata.tldr) parts.push(`TL;DR: ${newsMetadata.tldr}`);
                  await navigator.clipboard.writeText(parts.join('\n'));
                  addToast({ type: 'success', message: 'Đã sao chép metadata.' });
                }}>
                  Sao Chép Metadata
                </Button>
              </div>
              <div className="space-y-2 text-xs">
                {newsMetadata.title && (
                  <div className="flex gap-2">
                    <span className="text-txt-3 w-28 shrink-0 font-medium">Tiêu đề SEO:</span>
                    <span className="text-txt-2">{newsMetadata.title}</span>
                  </div>
                )}
                {newsMetadata.metaDescription && (
                  <div className="flex gap-2">
                    <span className="text-txt-3 w-28 shrink-0 font-medium">Meta Description:</span>
                    <span className="text-txt-2">{newsMetadata.metaDescription}</span>
                  </div>
                )}
                {newsMetadata.tags && (
                  <div className="flex gap-2">
                    <span className="text-txt-3 w-28 shrink-0 font-medium">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {newsMetadata.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-badge bg-purple/10 text-purple text-xxs">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {newsMetadata.tldr && (
                  <div className="flex gap-2">
                    <span className="text-txt-3 w-28 shrink-0 font-medium">TL;DR:</span>
                    <span className="text-txt-2 italic">{newsMetadata.tldr}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Đăng Tin Tức lên Gemral Website & App */}
          {generationDone && isNews && (
            <div className="p-4 rounded-card border border-cyan/20 bg-cyan/5 space-y-4">
              <h4 className="text-xs font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Newspaper size={14} />
                Đăng Lên Gemral Tin Tức
              </h4>
              <p className="text-xxs text-txt-3">
                Bài tin tức sẽ hiện trong tab <strong className="text-txt-2">Tin Tức</strong> trên
                Gemral App và tại <strong className="text-txt-2">gemral.com/tin-tuc/</strong> trên website.
              </p>

              {/* Image Upload Zone cho tin tức */}
              <div
                className={`relative border-2 border-dashed rounded-card p-4 transition-all cursor-pointer ${isDragging ? 'border-cyan bg-cyan/10' : 'border-border hover:border-cyan/30'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2 text-center">
                  <Upload size={24} className={isDragging ? 'text-cyan' : 'text-txt-3'} />
                  <p className="text-xs text-txt-3">
                    <span className="text-cyan font-medium">Kéo thả hình ảnh</span> hoặc bấm để chọn
                  </p>
                  <p className="text-xxs text-txt-3">Ảnh bìa bài viết &bull; JPEG, PNG, WebP &bull; Tối đa 10 ảnh &bull; 10MB/ảnh</p>
                </div>
              </div>

              {/* Image Preview Grid cho tin tức */}
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xxs text-txt-3 font-medium">{uploadedImages.length} hình ảnh đính kèm {uploadedImages.length > 0 && '(ảnh đầu tiên = ảnh bìa)'}</p>
                  <div className={`grid gap-2 ${uploadedImages.length === 1 ? 'grid-cols-1' :
                    uploadedImages.length === 2 ? 'grid-cols-2' :
                      uploadedImages.length === 3 ? 'grid-cols-3' :
                        uploadedImages.length === 4 ? 'grid-cols-2' :
                          'grid-cols-3'
                    }`}>
                    {uploadedImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg overflow-hidden border border-border bg-glass-bg"
                      >
                        <img
                          src={img.preview}
                          alt={`Preview ${i + 1}`}
                          className="w-full max-h-48 object-contain bg-white/5"
                        />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-cyan/80 text-white text-xxs font-medium">
                            Ảnh bìa
                          </div>
                        )}
                        <button
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        >
                          <X size={12} />
                        </button>
                        {img.url && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-success/80 text-white text-xxs">
                            ✓ Uploaded
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* News Article Preview */}
              {(output || uploadedImages.length > 0) && (
                <div className="p-3 rounded-card border border-border bg-glass-bg">
                  <p className="text-xxs text-txt-3 font-medium mb-2">Preview bài viết</p>
                  {uploadedImages.length > 0 && (
                    <div className="rounded-lg overflow-hidden mb-3">
                      <img src={uploadedImages[0]?.preview} alt="Cover" className="w-full max-h-48 object-contain bg-white/5" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-wrap gap-1">
                      {newsCategories.map((cat) => {
                        const label = NEWS_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? cat;
                        return (
                          <span key={cat} className="px-2 py-0.5 rounded-badge bg-cyan/10 text-cyan text-xxs font-medium">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-xxs text-txt-3">
                      {NEWS_FORMAT_OPTIONS.find((o) => o.value === newsFormat)?.label ?? newsFormat}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-txt mb-1 line-clamp-2">
                    {newsMetadata?.title || brief || output.split('\n')[0]?.replace(/^#+\s*/, '') || '(Chưa có tiêu đề)'}
                  </h5>
                  <p className="text-xs text-txt-2 leading-relaxed line-clamp-3">
                    {newsMetadata?.metaDescription || output.replace(/[#*\n]/g, ' ').trim().slice(0, 200)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xxs text-txt-3">
                    <span>Gemral Editorial</span>
                    <span>&bull;</span>
                    <span>{Math.max(1, Math.round(output.trim().split(/\s+/).length / 200))} phút đọc</span>
                  </div>
                </div>
              )}

              {/* Published result */}
              {newsPublished && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-card bg-success/10 border border-success/20">
                    <CheckCircle2 size={14} className="text-success shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-success font-medium">Đã đăng tin tức thành công!</p>
                      <p className="text-xxs text-success/70">ID: {newsPublished.id}</p>
                    </div>
                    {newsPublished.publishUrl ? (
                      <a
                        href={newsPublished.publishUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gold hover:underline"
                      >
                        <Globe size={10} />
                        Xem bài trên Gemral
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xxs text-muted">Đã lưu nháp</span>
                    )}
                  </div>
                  <button
                    onClick={() => setNewsPublished(null)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-glass-bg text-cyan hover:bg-cyan/10 text-xs font-medium transition-all"
                  >
                    <Newspaper size={12} />
                    Đăng Lại
                  </button>
                </div>
              )}

              {/* Publish & Schedule buttons */}
              {!newsPublished && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={newsPublishing}
                      onClick={() => handlePublishNews('draft')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-border bg-glass-bg text-txt-3 hover:bg-amber/10 hover:border-amber/40 hover:text-amber text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {newsPublishing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      Lưu Nháp
                    </button>
                    <button
                      disabled={newsPublishing}
                      onClick={() => handlePublishNews('published')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {newsPublishing ? <Loader2 size={12} className="animate-spin" /> : <Newspaper size={12} />}
                      Xuất Bản Ngay
                    </button>
                    <button
                      onClick={() => setShowNewsSchedule(!showNewsSchedule)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/5 text-emerald hover:bg-emerald/10 text-xs font-medium transition-all"
                    >
                      <CalendarPlus size={12} />
                      Lên Lịch Đăng
                    </button>
                  </div>

                  {/* Schedule date/time picker */}
                  {showNewsSchedule && (
                    <div className="p-3 rounded-card border border-emerald/20 bg-emerald/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarPlus size={14} className="text-emerald" />
                        <span className="text-xs font-semibold text-emerald">Lên Lịch Xuất Bản</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xxs text-txt-3 block mb-1">Ngày đăng *</label>
                          <input
                            type="date"
                            value={newsScheduleDate}
                            onChange={(e) => setNewsScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="fi text-xs w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xxs text-txt-3 block mb-1">Giờ đăng</label>
                          <input
                            type="time"
                            value={newsScheduleTime}
                            onChange={(e) => setNewsScheduleTime(e.target.value)}
                            className="fi text-xs w-full"
                          />
                        </div>
                      </div>
                      <button
                        disabled={newsPublishing || !newsScheduleDate}
                        onClick={async () => {
                          await handlePublishNews('draft');
                          setCalendarScheduleDate(newsScheduleDate);
                          setCalendarScheduleTime(newsScheduleTime);
                          setCalendarPlatform('facebook');
                          setTimeout(() => handleCreateCalendarEvent(), 100);
                          setShowNewsSchedule(false);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/10 text-emerald hover:bg-emerald/20 text-xs font-medium transition-all w-full justify-center disabled:opacity-50"
                      >
                        <CalendarPlus size={12} />
                        Xác Nhận Lên Lịch
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Email: Gửi qua Resend — luôn hiển thị khi chọn email type ── */}
          {isEmail && (
            <div className="p-4 rounded-card border border-gold/20 bg-gold/5 space-y-4">
              <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} />
                Gửi Email qua Resend
              </h4>
              {/* Sender & Subject & Recipients */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xxs font-medium text-txt-2 mb-1">Gửi từ (Sender) *</label>
                  <select
                    value={emailSender}
                    onChange={(e) => setEmailSender(e.target.value)}
                    className="fi text-sm w-full"
                  >
                    <option value="Jennie Uyen Chu <hello@gemral.com>">Jennie Uyen Chu &lt;hello@gemral.com&gt;</option>
                    <option value="Jennie Uyen Chu <jennieuyenchu@gemral.com>">Jennie Uyen Chu &lt;jennieuyenchu@gemral.com&gt;</option>
                    <option value="Gemral <no_reply@gemral.com>">Gemral &lt;no_reply@gemral.com&gt;</option>
                    <option value="Gemral <info@gemral.com>">Gemral &lt;info@gemral.com&gt;</option>
                    <option value="Gemral <support@gemral.com>">Gemral &lt;support@gemral.com&gt;</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-medium text-txt-2 mb-1">Tiêu đề email *</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Nhập tiêu đề email..."
                    className="fi text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-txt-2 mb-1">Người nhận * (dấu phẩy phân cách)</label>
                  <input
                    type="text"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="email1@gmail.com, email2@gmail.com"
                    className="fi text-sm w-full"
                  />
                </div>
                {/* Manual HTML — chỉ hiển thị khi chưa có output từ AI */}
                {!output && (
                  <div>
                    <label className="block text-xxs font-medium text-txt-2 mb-1">
                      HTML Email * <span className="text-txt-3 font-normal">(dán code HTML vào đây nếu không dùng AI tạo nội dung)</span>
                    </label>
                    <textarea
                      value={manualEmailHtml}
                      onChange={(e) => setManualEmailHtml(e.target.value)}
                      placeholder="<!DOCTYPE html><html>...</html>"
                      rows={10}
                      className="fi text-xs w-full font-mono resize-y"
                    />
                    {manualEmailHtml && (
                      <div className="mt-1 text-xxs text-txt-3">{manualEmailHtml.length.toLocaleString()} ký tự</div>
                    )}
                  </div>
                )}
                {output && (
                  <div className="p-2 rounded bg-success/10 border border-success/20 text-xxs text-success flex items-center gap-1.5">
                    <CheckCircle2 size={11} />
                    Sẽ gửi nội dung AI đã tạo ({output.length.toLocaleString()} ký tự)
                  </div>
                )}
              </div>

              {/* Send result */}
              {emailSent && (
                <div className="flex items-center gap-2 p-3 rounded-card bg-success/10 border border-success/20">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-success font-medium">Email đã gửi thành công!</p>
                    <p className="text-xxs text-success/70">ID: {emailSent.id} • {emailSent.recipients.length} người nhận</p>
                  </div>
                </div>
              )}

              {/* Send button */}
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={emailSending || !emailSubject.trim() || !emailRecipients.trim()}
                  onClick={handleSendEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 text-xs font-medium transition-all disabled:opacity-50"
                >
                  {emailSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {emailSending ? 'Đang gửi...' : emailSent ? 'Gửi Lại' : 'Gửi Email'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(output);
                      addToast({ type: 'success', message: 'Đã sao chép HTML email.' });
                    } catch {
                      addToast({ type: 'error', message: 'Không thể sao chép.' });
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-border bg-glass-bg text-txt-3 hover:bg-purple/10 hover:border-purple/30 hover:text-purple text-xs font-medium transition-all"
                >
                  <Copy size={12} />
                  Sao Chép HTML
                </button>
                <button
                  onClick={() => {
                    setCalendarScheduleDate(new Date().toISOString().split('T')[0] ?? '');
                    setCalendarPlatform('email');
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-card border border-emerald/30 bg-emerald/5 text-emerald hover:bg-emerald/10 text-xs font-medium transition-all"
                >
                  <CalendarPlus size={12} />
                  Lên Lịch Gửi
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
      </div>{/* end main content */}
    </div>
  );
}
