// ============================================================================
// Slug Generator — Tạo slug từ tiêu đề tiếng Việt
// GEM Content Control Center
//
// Chuyển đổi tiêu đề tiếng Việt có dấu thành slug URL-safe:
// - Loại bỏ dấu tiếng Việt (unaccent)
// - Chuyển thường, thay khoảng trắng bằng dấu gạch ngang
// - Đảm bảo slug duy nhất trong bảng (append -2, -3, ...)
// ============================================================================

import { getSupabase } from '../api/supabase';

// ---------------------------------------------------------------------------
// Vietnamese diacritics mapping
// ---------------------------------------------------------------------------

/**
 * Bảng chuyển đổi dấu tiếng Việt sang ký tự không dấu.
 * Bao gồm tất cả biến thể: sắc, huyền, hỏi, ngã, nặng.
 */
const VIETNAMESE_MAP: Readonly<Record<string, string>> = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
  // Viết hoa
  'À': 'a', 'Á': 'a', 'Ả': 'a', 'Ã': 'a', 'Ạ': 'a',
  'Ă': 'a', 'Ắ': 'a', 'Ằ': 'a', 'Ẳ': 'a', 'Ẵ': 'a', 'Ặ': 'a',
  'Â': 'a', 'Ấ': 'a', 'Ầ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ậ': 'a',
  'È': 'e', 'É': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ẹ': 'e',
  'Ê': 'e', 'Ế': 'e', 'Ề': 'e', 'Ể': 'e', 'Ễ': 'e', 'Ệ': 'e',
  'Ì': 'i', 'Í': 'i', 'Ỉ': 'i', 'Ĩ': 'i', 'Ị': 'i',
  'Ò': 'o', 'Ó': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ọ': 'o',
  'Ô': 'o', 'Ố': 'o', 'Ồ': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ộ': 'o',
  'Ơ': 'o', 'Ớ': 'o', 'Ờ': 'o', 'Ở': 'o', 'Ỡ': 'o', 'Ợ': 'o',
  'Ù': 'u', 'Ú': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ụ': 'u',
  'Ư': 'u', 'Ứ': 'u', 'Ừ': 'u', 'Ử': 'u', 'Ữ': 'u', 'Ự': 'u',
  'Ỳ': 'y', 'Ý': 'y', 'Ỷ': 'y', 'Ỹ': 'y', 'Ỵ': 'y',
  'Đ': 'd',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const slugGenerator = {
  /**
   * Tạo slug URL-safe từ tiêu đề tiếng Việt.
   *
   * Quy trình:
   * 1. Chuyển dấu tiếng Việt → ký tự không dấu (đ → d, ư → u, v.v.)
   * 2. Chuyển thường toàn bộ
   * 3. Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
   * 4. Loại bỏ gạch ngang liên tiếp và gạch ngang đầu/cuối
   * 5. Giới hạn 100 ký tự
   *
   * @example
   * generateSlug("Từ 1 Đồng Xu → Tần Số Thay Đổi Cả Cuộc Đời")
   * // → "tu-1-dong-xu-tan-so-thay-doi-ca-cuoc-doi"
   */
  generateSlug(title: string): string {
    let slug = title;

    // 1. Chuyển đổi ký tự tiếng Việt
    slug = slug
      .split('')
      .map((char) => VIETNAMESE_MAP[char] ?? char)
      .join('');

    // 2. Chuyển thường
    slug = slug.toLowerCase();

    // 3. Thay ký tự không phải chữ/số bằng gạch ngang
    slug = slug.replace(/[^a-z0-9]+/g, '-');

    // 4. Loại bỏ gạch ngang liên tiếp
    slug = slug.replace(/-+/g, '-');

    // 5. Loại bỏ gạch ngang đầu/cuối
    slug = slug.replace(/^-|-$/g, '');

    // 6. Giới hạn độ dài
    slug = slug.slice(0, 100);

    // 7. Loại bỏ gạch ngang cuối sau khi cắt
    slug = slug.replace(/-$/, '');

    return slug || 'untitled';
  },

  /**
   * Đảm bảo slug duy nhất trong bảng Supabase.
   *
   * Kiểm tra xem slug đã tồn tại chưa. Nếu trùng,
   * thêm hậu tố -2, -3, ... cho đến khi tìm được slug duy nhất.
   *
   * @param slug - Slug cơ sở cần kiểm tra
   * @param table - Tên bảng Supabase (ví dụ: 'cc_scripts')
   * @param column - Tên cột chứa slug (mặc định: 'slug')
   * @param excludeId - ID bản ghi cần bỏ qua (khi cập nhật)
   */
  async ensureUnique(
    slug: string,
    table: string,
    column = 'slug',
    excludeId?: string,
  ): Promise<string> {
    const supabase = getSupabase();
    let candidate = slug;
    let suffix = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase
        .from(table as any)
        .select('id', { count: 'exact', head: true })
        .eq(column, candidate);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { count } = await query;

      if ((count ?? 0) === 0) {
        return candidate;
      }

      suffix += 1;
      candidate = `${slug}-${suffix}`;

      // An toàn: giới hạn 100 lần thử
      if (suffix > 100) {
        return `${slug}-${Date.now()}`;
      }
    }
  },

  /**
   * Tạo slug duy nhất từ tiêu đề tiếng Việt.
   *
   * Kết hợp generateSlug() và ensureUnique() trong một bước.
   */
  async createUniqueSlug(
    title: string,
    table: string,
    column = 'slug',
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = this.generateSlug(title);
    return this.ensureUnique(baseSlug, table, column, excludeId);
  },
};
