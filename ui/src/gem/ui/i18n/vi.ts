/**
 * GEM Content Control Center — Phase 4: Vietnamese UI Strings (vi.ts)
 *
 * Flat Record<string, string> format using dot-notation keys.
 * ALL Vietnamese strings use FULL DIACRITICS (dấu đầy đủ).
 * Exceptions: Brand names (Claude, Supabase, Gemral), technical terms (API, URL, token).
 *
 * Sections:
 *   1. Navigation       (14 items)
 *   2. Actions           (12 items)
 *   3. Status            (7 items)
 *   4. Content types     (6 items)
 *   5. Tracks            (3 items)
 *   6. Personas          (7 items)
 *   7. Errors            (8 items)
 *   8. Tooltips          (7 items — brand voice rules)
 *   9. Confirmations     (4 items)
 *  10. Empty states      (5 items)
 *
 * Total: 73 strings
 */

export const vi: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════
  // 1. NAVIGATION — Thanh Điều Hướng (14 items)
  // ═══════════════════════════════════════════════════════════════════
  'nav.dashboard': 'Bảng Điều Khiển',
  'nav.ai_gen': 'Trình Tạo Nội Dung AI',
  'nav.latc': 'Kịch Bản LATC',
  'nav.tmt': 'Kịch Bản TMT',
  'nav.short_clips': 'Clip Ngắn',
  'nav.social_posts': 'Bài Đăng MXH',
  'nav.titles': 'Tiêu Đề & Hình Thu Nhỏ',
  'nav.image_gen': 'Tạo Hình Ảnh',
  'nav.repurpose': 'Tái Sử Dụng',
  'nav.funnels': 'Phễu & CTA',
  'nav.calendar': 'Lịch Nội Dung',
  'nav.analytics': 'Phân Tích YouTube',
  'nav.brand': 'Khóa Giọng Thương Hiệu',
  'nav.settings': 'Cài Đặt',

  // ═══════════════════════════════════════════════════════════════════
  // 2. ACTIONS — Hành Động (12 items)
  // ═══════════════════════════════════════════════════════════════════
  'action.save': 'Lưu',
  'action.cancel': 'Hủy',
  'action.delete': 'Xóa',
  'action.edit': 'Sửa',
  'action.create': 'Tạo Mới',
  'action.generate': 'Tạo Nội Dung',
  'action.regenerate': 'Tạo Lại',
  'action.export': 'Xuất',
  'action.publish': 'Xuất Bản',
  'action.schedule': 'Lên Lịch',
  'action.preview': 'Xem Trước',
  'action.duplicate': 'Nhân Bản',

  // ═══════════════════════════════════════════════════════════════════
  // 3. STATUS — Trạng Thái (7 items)
  // ═══════════════════════════════════════════════════════════════════
  'status.draft': 'Bản Nháp',
  'status.generating': 'Đang Tạo',
  'status.pending_review': 'Chờ Duyệt',
  'status.revising': 'Đang Sửa',
  'status.approved': 'Đã Duyệt',
  'status.published': 'Đã Xuất Bản',
  'status.archived': 'Lưu Trữ',

  // ═══════════════════════════════════════════════════════════════════
  // 4. CONTENT TYPES — Loại Nội Dung (6 items)
  // ═══════════════════════════════════════════════════════════════════
  'content.latc_script': 'Kịch Bản Dài LATC',
  'content.tmt_script': 'Kịch Bản TMT',
  'content.short_clip': 'Clip Ngắn',
  'content.social_post': 'Bài Đăng MXH',
  'content.title': 'Tiêu Đề',
  'content.thumbnail': 'Hình Thu Nhỏ',

  // ═══════════════════════════════════════════════════════════════════
  // 5. TRACKS — Trụ Cột Nội Dung (3 items)
  // ═══════════════════════════════════════════════════════════════════
  'track.wealth': 'Tài Chính (Wealth)',
  'track.wellness': 'Tâm Thức (Wellness)',
  'track.integration': 'Tích Hợp (Integration)',

  // ═══════════════════════════════════════════════════════════════════
  // 6. PERSONAS — Chân Dung Khán Giả (7 items)
  // ═══════════════════════════════════════════════════════════════════
  'persona.crypto_newbie': 'Crypto Newbie — Người mới tìm hiểu crypto/trading',
  'persona.stuck_trader': 'Stuck Trader — Trader đang mắc kẹt, chưa có lợi nhuận ổn định',
  'persona.lost_professional': 'Lost Professional — Chuyên gia thành đạt nhưng mất phương hướng',
  'persona.spiritual_seeker': 'Spiritual Seeker — Người tìm kiếm tâm linh, năng lượng',
  'persona.side_hustler': 'Side Hustler — Người muốn thu nhập thêm từ trading',
  'persona.burned_investor': 'Burned Investor — Nhà đầu tư từng bị thua lỗ nặng',
  'persona.curious_skeptic': 'Curious Skeptic — Người tò mò nhưng hoài nghi',

  // ═══════════════════════════════════════════════════════════════════
  // 7. ERRORS — Lỗi (8 items)
  // ═══════════════════════════════════════════════════════════════════
  'error.network': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.',
  'error.auth': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'error.permission': 'Bạn không có quyền truy cập tính năng này.',
  'error.not_found': 'Không tìm thấy nội dung yêu cầu.',
  'error.ai_generation': 'Lỗi khi tạo nội dung AI. Vui lòng thử lại.',
  'error.ai_rate_limit': 'Đã vượt quá giới hạn yêu cầu AI. Vui lòng đợi vài phút.',
  'error.file_too_large': 'File quá lớn. Kích thước tối đa cho phép là {maxSize}.',
  'error.invalid_format': 'Định dạng file không hợp lệ. Chấp nhận: {formats}.',

  // ═══════════════════════════════════════════════════════════════════
  // 8. TOOLTIPS — Chú Thích Quy Tắc Giọng Thương Hiệu (7 items)
  // ═══════════════════════════════════════════════════════════════════
  'tooltip.brand_tone': 'Giọng điệu: Uy tín nhưng gần gũi — như người anh lớn chia sẻ với em.',
  'tooltip.brand_pronouns': 'Xưng hô: Dùng "anh" (ngôi 1) và "bạn/em" (ngôi 2). KHÔNG dùng "tôi" hay "mình".',
  'tooltip.brand_forbidden': 'Từ cấm: Không dùng "lambo", "tự do tài chính", "giàu nhanh", "passive income".',
  'tooltip.brand_hook_rule': 'Hook: Mỗi câu mở đầu phải tạo cảm giác "tôi cần xem tiếp" trong 3 giây đầu.',
  'tooltip.brand_dual_example': 'Ví dụ kép: Mỗi khái niệm cần 1 ví dụ crypto/trading VÀ 1 ví dụ đời thường.',
  'tooltip.brand_gem_mention': 'GEM: Luôn nhắc đến công cụ/phương pháp GEM một cách tự nhiên, không ép buộc.',
  'tooltip.brand_cta_style': 'CTA: Kết thúc bằng lời mời hành động cụ thể — subscribe, comment, hoặc link bio.',

  // ═══════════════════════════════════════════════════════════════════
  // 9. CONFIRMATIONS — Xác Nhận (4 items)
  // ═══════════════════════════════════════════════════════════════════
  'confirm.delete': 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
  'confirm.publish': 'Xác nhận xuất bản nội dung này? Nội dung sẽ được công khai.',
  'confirm.regenerate': 'Tạo lại nội dung sẽ thay thế phiên bản hiện tại. Bạn có muốn tiếp tục?',
  'confirm.discard_changes': 'Bạn có thay đổi chưa lưu. Bạn có muốn rời đi không?',

  // ═══════════════════════════════════════════════════════════════════
  // 10. EMPTY STATES — Trạng Thái Rỗng (5 items)
  // ═══════════════════════════════════════════════════════════════════
  'empty.scripts': 'Chưa có kịch bản nào. Bấm "Tạo Kịch Bản" để bắt đầu.',
  'empty.social_posts': 'Chưa có bài đăng nào. Tạo chiến dịch mới để bắt đầu.',
  'empty.calendar': 'Chưa có sự kiện nào trong lịch. Lên lịch xuất bản nội dung.',
  'empty.analytics': 'Chưa có dữ liệu phân tích. Kết nối YouTube API để bắt đầu.',
  'empty.search_results': 'Không tìm thấy kết quả phù hợp. Hãy thử từ khóa khác.',
};

// ═════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═════════════════════════════════════════════════════════════════════

/** Union type of all valid translation keys */
export type TranslationKey = keyof typeof vi;

// ═════════════════════════════════════════════════════════════════════
// t() HELPER — Translation lookup with fallback
// ═════════════════════════════════════════════════════════════════════

/**
 * Look up a Vietnamese UI string by its dot-notation key.
 *
 * @param key   — A valid key from the `vi` dictionary (e.g. 'nav.dashboard').
 * @param vars  — Optional substitution map for template variables.
 *                Example: t('error.file_too_large', { maxSize: '10MB' })
 * @returns     — The translated string, or the raw key if not found.
 *
 * Usage:
 *   t('nav.dashboard')                           → 'Bảng Điều Khiển'
 *   t('error.ai_rate_limit')                     → 'Đã vượt quá giới hạn...'
 *   t('error.file_too_large', { maxSize: '10MB' }) → 'File quá lớn. Kích thước tối đa cho phép là 10MB.'
 */
export function t(key: string, vars?: Record<string, string>): string {
  let value = vi[key];

  // Fallback: return the raw key when no translation is found
  if (value === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }

  // Substitute {variable} placeholders if vars are provided
  if (vars) {
    for (const [varName, varValue] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${varName}\\}`, 'g'), varValue);
    }
  }

  return value;
}
