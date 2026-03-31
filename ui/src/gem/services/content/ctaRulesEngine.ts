// ============================================================================
// CTA Rules Engine — Funnel & CTA Validation
// GEM Content Control Center
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CTAValidation {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  passed: boolean;
  suggestion?: string;
}

export interface CTAStep {
  step: number;
  product: string;
  price?: string;
  cta: string;
  conversionRate?: number;
}

export interface CTARecommendation {
  track: string;
  steps: CTAStep[];
  patterns: string[];
}

export interface FunnelConfig {
  name: string;
  track: 'wealth' | 'wellness' | 'integration';
  color: string;
  steps: CTAStep[];
  description: string;
  conversionNote?: string;
}

// ---------------------------------------------------------------------------
// Funnel Definitions
// ---------------------------------------------------------------------------

export const FUNNELS: FunnelConfig[] = [
  {
    name: 'Wealth Funnel',
    track: 'wealth',
    color: '#d4a853',
    description: 'Từ Drama Content → Scanner → Khóa học Trading',
    conversionNote: 'TIER 2 có 78% lựa chọn — sweet spot pricing',
    steps: [
      { step: 1, product: 'Drama Content', cta: 'Organic reach', conversionRate: 100 },
      { step: 2, product: 'Scanner Free Trial', price: 'Miễn phí', cta: 'Soft invite', conversionRate: 35 },
      { step: 3, product: 'GEM Trading Starter', price: '299K', cta: 'Problem-Solution', conversionRate: 18 },
      { step: 4, product: 'TIER 1', price: '11M', cta: 'Transformation', conversionRate: 8 },
      { step: 5, product: 'TIER 2', price: '21M', cta: 'Social proof + Urgency', conversionRate: 6.2 },
      { step: 6, product: 'TIER 3', price: '68M', cta: 'Legacy + Vision', conversionRate: 1.5 },
    ],
  },
  {
    name: 'Wellness Funnel',
    track: 'wellness',
    color: '#9b6dff',
    description: 'Từ Tâm Thức Content → App → Khóa Healing',
    steps: [
      { step: 1, product: 'Tâm Thức Content', cta: 'Organic reach', conversionRate: 100 },
      { step: 2, product: 'App Free', price: 'Miễn phí', cta: 'Value', conversionRate: 42 },
      { step: 3, product: 'Tần Số Tình Yêu', price: '399K', cta: 'Story', conversionRate: 22 },
      { step: 4, product: '7 Ngày Khai Mở', price: '1.99M', cta: 'Transformation', conversionRate: 9 },
      { step: 5, product: 'Crystals Shopify', price: 'Varies', cta: 'Lifestyle', conversionRate: 5 },
    ],
  },
  {
    name: 'Integration Funnel',
    track: 'integration',
    color: '#10B981',
    description: 'Từ Bridge Content → App → Khóa Tư Duy — Best Conversion',
    conversionNote: 'Integration track có tỷ lệ chuyển đổi cao nhất',
    steps: [
      { step: 1, product: 'Bridge Content', cta: 'Organic reach', conversionRate: 100 },
      { step: 2, product: 'App Free', price: 'Miễn phí', cta: 'Question', conversionRate: 45 },
      { step: 3, product: 'Tư Duy Triệu Phú', price: '499K / 1.99M', cta: 'Before/After', conversionRate: 25 },
      { step: 4, product: 'TIER 2', price: '21M', cta: 'Legacy + Vision', conversionRate: 7 },
      { step: 5, product: 'Crystals + Community', price: 'Varies', cta: 'Belonging', conversionRate: 4 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CTA Patterns (30 patterns)
// ---------------------------------------------------------------------------

export const CTA_PATTERNS: { id: number; name: string; example: string; track: string }[] = [
  { id: 1, name: 'Soft Invite', example: 'Nếu bạn muốn tìm hiểu sâu hơn...', track: 'all' },
  { id: 2, name: 'Problem-Solution', example: 'Nếu bạn đang mắc kẹt trong...thì đây là giải pháp', track: 'all' },
  { id: 3, name: 'Transformation', example: 'Từ [trước] → [sau] chỉ trong 7 ngày', track: 'all' },
  { id: 4, name: 'Social Proof', example: '2.847 học viên đã thay đổi...', track: 'wealth' },
  { id: 5, name: 'Urgency', example: 'Chỉ còn 48 giờ để đăng ký...', track: 'wealth' },
  { id: 6, name: 'Question Hook', example: 'Bạn có muốn biết bí mật mà...?', track: 'all' },
  { id: 7, name: 'Story Bridge', example: 'Câu chuyện của Hương bắt đầu giống bạn...', track: 'wellness' },
  { id: 8, name: 'Data Point', example: '93% người áp dụng thấy kết quả trong 30 ngày', track: 'wealth' },
  { id: 9, name: 'Before/After', example: 'Trước khi học: lo lắng. Sau: tự tin với mỗi quyết định', track: 'integration' },
  { id: 10, name: 'Legacy', example: 'Đây không chỉ là đầu tư cho bạn, mà cho con cháu bạn', track: 'integration' },
  { id: 11, name: 'Fear of Missing', example: 'Mỗi ngày không hành động là một ngày bạn mất...', track: 'wealth' },
  { id: 12, name: 'Vision Paint', example: 'Hãy tưởng tượng 6 tháng sau...', track: 'all' },
  { id: 13, name: 'Community', example: 'Tham gia cộng đồng 10.000+ người cùng tần số', track: 'wellness' },
  { id: 14, name: 'Expert Authority', example: 'Với 8 năm kinh nghiệm và 277K subscribers...', track: 'all' },
  { id: 15, name: 'Risk Reversal', example: 'Nếu không hài lòng, hoàn tiền 100% trong 7 ngày', track: 'wealth' },
  { id: 16, name: 'Curiosity Gap', example: 'Có 1 điều mà 95% trader không biết...', track: 'wealth' },
  { id: 17, name: 'Value Stack', example: 'Bạn nhận được: Scanner + Cộng đồng + Mentor...', track: 'wealth' },
  { id: 18, name: 'Emotional', example: 'Bạn xứng đáng được sống với tần số cao nhất', track: 'wellness' },
  { id: 19, name: 'Challenge', example: 'Thử 7 ngày, nếu không thay đổi, tôi chịu trách nhiệm', track: 'integration' },
  { id: 20, name: 'Exclusive', example: 'Chỉ dành cho những ai thực sự sẵn sàng thay đổi', track: 'all' },
  { id: 21, name: 'Frequency Bridge', example: 'Khi tần số bạn thay đổi, mọi thứ xung quanh cũng thay đổi', track: 'wellness' },
  { id: 22, name: 'Karma Connect', example: 'Nghiệp lực không phải là số phận — bạn có thể chuyển hóa', track: 'wellness' },
  { id: 23, name: 'Tool Demo', example: 'Scanner vừa phát hiện 3 tín hiệu mà...', track: 'wealth' },
  { id: 24, name: 'Milestone', example: 'Bước đầu tiên luôn là bước khó nhất. Hãy bắt đầu hôm nay', track: 'all' },
  { id: 25, name: 'Comparison', example: 'Giá 1 ly cà phê mỗi ngày = trọn bộ kiến thức...', track: 'wealth' },
  { id: 26, name: 'Deadline', example: 'Ưu đãi kết thúc vào [ngày]. Sau đó giá sẽ...', track: 'wealth' },
  { id: 27, name: 'Bio Link', example: 'Link ở bio — bấm ngay khi còn slot', track: 'all' },
  { id: 28, name: 'Comment Trigger', example: 'Comment "SẴN SÀNG" để nhận link đăng ký', track: 'all' },
  { id: 29, name: 'DM Invite', example: 'Nhắn tin "KHOÁ HỌC" để được tư vấn riêng', track: 'all' },
  { id: 30, name: 'Gentle Close', example: 'Dù bạn chọn gì, hãy nhớ: bạn xứng đáng nhiều hơn thế', track: 'wellness' },
];

// ---------------------------------------------------------------------------
// CTA Rules Engine
// ---------------------------------------------------------------------------

export const ctaRulesEngine = {
  validateScript(body: string, contentType: string): CTAValidation[] {
    const validations: CTAValidation[] = [];

    // Rule 1: CTA khóa học TRƯỚC closing
    const closingIndex = body.toLowerCase().indexOf('lời nhắn');
    const ctaIndex = body.toLowerCase().indexOf('khóa học');
    if (closingIndex > 0 && ctaIndex > closingIndex) {
      validations.push({
        rule: 'CTA khóa học phải đặt TRƯỚC phần closing',
        severity: 'critical',
        passed: false,
        suggestion: 'Di chuyển phần CTA lên trước "Lời nhắn touching"',
      });
    } else {
      validations.push({
        rule: 'CTA khóa học TRƯỚC closing',
        severity: 'critical',
        passed: true,
      });
    }

    // Rule 2: KHÔNG CTA tài liệu
    if (/tải.*tài liệu|download.*pdf|link.*document/i.test(body)) {
      validations.push({
        rule: 'KHÔNG được CTA tải tài liệu tóm tắt',
        severity: 'critical',
        passed: false,
        suggestion: 'Thay bằng CTA app download hoặc khóa học',
      });
    } else {
      validations.push({
        rule: 'Không CTA tài liệu',
        severity: 'critical',
        passed: true,
      });
    }

    // Rule 3: Video CTA không nói giá
    if (contentType === 'short_clip' && /\d+K|\d+M|giá|chi phí|phí/i.test(body)) {
      validations.push({
        rule: 'CTA Khéo Léo: KHÔNG nói giá trong video ngắn',
        severity: 'high',
        passed: false,
        suggestion: 'Chỉ gợi mở benefit: "Link ở bio" hoặc "Comment để nhận"',
      });
    } else {
      validations.push({
        rule: 'Không nói giá trong video ngắn',
        severity: 'high',
        passed: true,
      });
    }

    // Rule 4: Tối đa 3 sản phẩm
    const productMentions = (body.match(/khóa học|scanner|app|tier|tần số tình yêu|khai mở|tư duy triệu phú|crystals/gi) ?? []);
    const uniqueProducts = new Set(productMentions.map((m) => m.toLowerCase()));
    if (uniqueProducts.size > 3) {
      validations.push({
        rule: 'Tối đa 3 sản phẩm mỗi kịch bản',
        severity: 'medium',
        passed: false,
        suggestion: `Đang nhắc ${uniqueProducts.size} sản phẩm, giảm xuống 3`,
      });
    } else {
      validations.push({
        rule: 'Tối đa 3 sản phẩm mỗi kịch bản',
        severity: 'medium',
        passed: true,
      });
    }

    // Rule 5: Sản phẩm không trong tiêu đề (check first line)
    const firstLine = body.split('\n')[0] ?? '';
    if (/scanner|tier|khóa học|app gem/i.test(firstLine)) {
      validations.push({
        rule: 'Sản phẩm KHÔNG trong tiêu đề',
        severity: 'critical',
        passed: false,
        suggestion: 'Ưu tiên giáo dục, share value trước khi mention sản phẩm',
      });
    } else {
      validations.push({
        rule: 'Sản phẩm không trong tiêu đề',
        severity: 'critical',
        passed: true,
      });
    }

    // Rule 6: CTA có trong kịch bản
    if (!/link|đăng ký|tham gia|comment|nhắn tin|bio/i.test(body)) {
      validations.push({
        rule: 'Kịch bản phải có ít nhất 1 CTA',
        severity: 'high',
        passed: false,
        suggestion: 'Thêm CTA: "Link ở bio", "Comment để nhận", hoặc "Đăng ký ngay"',
      });
    } else {
      validations.push({
        rule: 'Kịch bản có CTA',
        severity: 'high',
        passed: true,
      });
    }

    return validations;
  },

  getRecommendedCTA(track: string): CTARecommendation {
    const funnel = FUNNELS.find((f) => f.track === track) ?? FUNNELS[2]!;
    const patterns = CTA_PATTERNS
      .filter((p) => p.track === 'all' || p.track === track)
      .slice(0, 5)
      .map((p) => p.name);

    return {
      track: funnel.track,
      steps: funnel.steps,
      patterns,
    };
  },

  getFunnelByTrack(track: string): FunnelConfig | undefined {
    return FUNNELS.find((f) => f.track === track);
  },

  getPatternsByTrack(track: string): typeof CTA_PATTERNS {
    return CTA_PATTERNS.filter((p) => p.track === 'all' || p.track === track);
  },

  getAllFunnels(): FunnelConfig[] {
    return FUNNELS;
  },

  getAllPatterns(): typeof CTA_PATTERNS {
    return CTA_PATTERNS;
  },
};
