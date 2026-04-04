// Seed top 50 P0/P1 SOPs into gem_sops table
// One-time script — can be called from POST /api/ops/sop-engine/seed

import { supabase } from './zalo-personal/supabase.js';

interface SopSeed {
  sop_id: string;
  domain: string;
  name: string;
  sop_type: 'workflow' | 'document';
  description: string;
  status: 'needs_creation';
  priority: 'p0' | 'p1';
}

const P0_SOPS: SopSeed[] = [
  { sop_id: 'CNT-001', domain: 'CNT', name: 'Brainstorm Chủ Đề Hàng Tuần', sop_type: 'workflow', description: 'Quy trình brainstorm và chọn chủ đề nội dung mỗi tuần', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CNT-011', domain: 'CNT', name: 'Content Planner 7/14/30 Ngày', sop_type: 'workflow', description: 'Lên kế hoạch nội dung theo chu kỳ 7, 14, hoặc 30 ngày', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CNT-018', domain: 'CNT', name: 'Tạo Script Hàng Loạt (batch)', sop_type: 'workflow', description: 'Tạo nhiều script nội dung cùng lúc qua batch processor', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CNT-015', domain: 'CNT', name: 'Review & Duyệt Script', sop_type: 'workflow', description: 'Quy trình review, phê duyệt hoặc từ chối script nội dung', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CNT-023', domain: 'CNT', name: 'Tạo Hình Ảnh Cho Bài Đăng', sop_type: 'workflow', description: 'Tạo hình ảnh minh họa phù hợp cho từng bài đăng', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'DST-001', domain: 'DST', name: 'Đăng Bài Facebook', sop_type: 'workflow', description: 'Quy trình đăng bài lên Facebook Pages & Groups', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'DST-002', domain: 'DST', name: 'Đăng Bài Forum Gemral', sop_type: 'workflow', description: 'Đăng bài lên diễn đàn cộng đồng Gemral', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'DST-004', domain: 'DST', name: 'Gửi Email Newsletter', sop_type: 'workflow', description: 'Gửi email newsletter định kỳ cho danh sách subscriber', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'DST-005', domain: 'DST', name: 'Gửi Push Notification', sop_type: 'workflow', description: 'Gửi push notification tới người dùng mobile app', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'OPS-001', domain: 'OPS', name: 'Pipeline Audit Hàng Ngày', sop_type: 'workflow', description: 'Kiểm tra pipeline nội dung hàng ngày: trạng thái, lỗi, tiến độ', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'SAL-001', domain: 'SAL', name: 'Script Tư Vấn Khách Mới', sop_type: 'workflow', description: 'Script chatbot tư vấn cho khách hàng mới tiềm năng', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'SAL-002', domain: 'SAL', name: 'Script Tư Vấn Trading', sop_type: 'workflow', description: 'Script tư vấn khóa học Trading (Tier 1-3)', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'SAL-008', domain: 'SAL', name: 'Chuyển Khách Từ Sales → CS', sop_type: 'workflow', description: 'Quy trình handoff khách từ sales sang customer success sau khi mua', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CS-001', domain: 'CS', name: 'Chào Mừng Khách Mua Khóa', sop_type: 'workflow', description: 'Gửi email chào mừng, hướng dẫn truy cập sau khi mua khóa học', status: 'needs_creation', priority: 'p0' },
  { sop_id: 'CS-007', domain: 'CS', name: 'Hướng Dẫn Sử Dụng Scanner', sop_type: 'workflow', description: 'Hướng dẫn khách hàng cách sử dụng GEM Scanner hiệu quả', status: 'needs_creation', priority: 'p0' },
];

const P1_WORKFLOW_SOPS: SopSeed[] = [
  { sop_id: 'CNT-002', domain: 'CNT', name: 'Tạo Outline Nội Dung Chi Tiết', sop_type: 'workflow', description: 'Tạo outline chi tiết cho bài viết từ chủ đề đã chọn', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CNT-003', domain: 'CNT', name: 'Viết Bài Blog/Tin Tức', sop_type: 'workflow', description: 'Viết bài blog hoặc tin tức cho website Gemral', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CNT-005', domain: 'CNT', name: 'Repurpose Content Cross-Platform', sop_type: 'workflow', description: 'Chuyển đổi nội dung giữa các nền tảng (blog → social, video → text)', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CNT-008', domain: 'CNT', name: 'Tạo Video/Reels Script', sop_type: 'workflow', description: 'Viết script cho video ngắn và Reels trên các nền tảng', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CNT-010', domain: 'CNT', name: 'Tạo Ads Copy', sop_type: 'workflow', description: 'Viết copy cho quảng cáo Facebook, Google, TikTok', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'SAL-003', domain: 'SAL', name: 'Script Tư Vấn Wellness', sop_type: 'workflow', description: 'Script tư vấn khóa học Wellness & Sức Khỏe', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'SAL-004', domain: 'SAL', name: 'Script Tư Vấn Crystal', sop_type: 'workflow', description: 'Script tư vấn sản phẩm Crystal từ YinyangMasters', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'SAL-005', domain: 'SAL', name: 'Script Tư Vấn 7 Ngày Khai Mở', sop_type: 'workflow', description: 'Script tư vấn khóa 7 Ngày Khai Mở Tần Số', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'SAL-006', domain: 'SAL', name: 'Script Tư Vấn Triệu Phú', sop_type: 'workflow', description: 'Script tư vấn khóa Tư Duy Triệu Phú', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'SAL-007', domain: 'SAL', name: 'Script Bán Thêm (Upsell/Cross-sell)', sop_type: 'workflow', description: 'Quy trình upsell/cross-sell cho khách hiện tại', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CS-002', domain: 'CS', name: 'Nhắc Nhở Học Bài', sop_type: 'workflow', description: 'Gửi nhắc nhở học bài cho học viên không hoạt động', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CS-003', domain: 'CS', name: 'Hỗ Trợ Kỹ Thuật Scanner', sop_type: 'workflow', description: 'Xử lý yêu cầu hỗ trợ kỹ thuật liên quan đến Scanner', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CS-004', domain: 'CS', name: 'Xử Lý Khiếu Nại', sop_type: 'workflow', description: 'Quy trình tiếp nhận và xử lý khiếu nại khách hàng', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CS-005', domain: 'CS', name: 'Follow-up Khách Bỏ Giữa Chừng', sop_type: 'workflow', description: 'Follow-up khách hàng đã mua nhưng bỏ học giữa chừng', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'CS-006', domain: 'CS', name: 'Khảo Sát Hài Lòng', sop_type: 'workflow', description: 'Gửi khảo sát mức độ hài lòng cho khách hàng', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'AFF-001', domain: 'AFF', name: 'Onboard CTV Mới', sop_type: 'workflow', description: 'Quy trình onboard cộng tác viên mới (tài khoản, tài liệu, training)', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'AFF-002', domain: 'AFF', name: 'Training CTV Hàng Tuần', sop_type: 'workflow', description: 'Buổi training định kỳ hàng tuần cho đội ngũ CTV', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'AFF-003', domain: 'AFF', name: 'Theo Dõi Hiệu Suất CTV', sop_type: 'workflow', description: 'Theo dõi và đánh giá hiệu suất bán hàng của CTV', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'ANA-001', domain: 'ANA', name: 'Báo Cáo Doanh Thu Hàng Ngày', sop_type: 'workflow', description: 'Tổng hợp báo cáo doanh thu hàng ngày từ tất cả kênh', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'ANA-002', domain: 'ANA', name: 'Phân Tích Hiệu Quả Nội Dung', sop_type: 'workflow', description: 'Phân tích hiệu quả nội dung: views, engagement, conversion', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'MKT-001', domain: 'MKT', name: 'Chiến Dịch Ra Mắt Sản Phẩm', sop_type: 'workflow', description: 'Quy trình chạy chiến dịch ra mắt sản phẩm/khóa học mới', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'MKT-002', domain: 'MKT', name: 'Chạy Facebook Ads', sop_type: 'workflow', description: 'Quy trình setup và tối ưu Facebook Ads campaigns', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DST-003', domain: 'DST', name: 'Đăng Video YouTube', sop_type: 'workflow', description: 'Quy trình upload, SEO, và publish video lên YouTube', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DST-006', domain: 'DST', name: 'Tương Tác Cộng Đồng', sop_type: 'workflow', description: 'Tương tác với cộng đồng: trả lời comment, DM, group posts', status: 'needs_creation', priority: 'p1' },
];

const DOC_SOPS: SopSeed[] = [
  { sop_id: 'DOC-MKT-001', domain: 'DOC', name: 'Brand Overview & Guidelines', sop_type: 'document', description: 'Tài liệu hướng dẫn thương hiệu Gemral: logo, màu sắc, tone of voice', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-CRS-001', domain: 'DOC', name: 'Khóa Tình Yêu Chi Tiết', sop_type: 'document', description: 'Tài liệu chi tiết về khóa Tình Yêu & Mối Quan Hệ', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-CRS-002', domain: 'DOC', name: 'Khóa Trading Tier 1-3', sop_type: 'document', description: 'Tài liệu chi tiết về 3 tiers khóa Trading', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-CRS-003', domain: 'DOC', name: 'Khóa Tư Duy Triệu Phú', sop_type: 'document', description: 'Tài liệu chi tiết về khóa Tư Duy Triệu Phú', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-CRS-004', domain: 'DOC', name: 'Khóa 7 Ngày Khai Mở Tần Số', sop_type: 'document', description: 'Tài liệu chi tiết về khóa 7 Ngày Khai Mở Tần Số', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-CRS-004S', domain: 'DOC', name: 'Trading Starter', sop_type: 'document', description: 'Tài liệu chi tiết về gói Trading Starter cho người mới', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-PRD-001', domain: 'DOC', name: 'GEM Scanner Features', sop_type: 'document', description: 'Tài liệu tính năng GEM Scanner: pattern detection, zones, alerts', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-PRD-002', domain: 'DOC', name: 'Crystal Catalog (YinyangMasters)', sop_type: 'document', description: 'Catalog sản phẩm Crystal từ YinyangMasters', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-ONB-001', domain: 'DOC', name: 'Onboarding Flow Tổng Quát', sop_type: 'document', description: 'Quy trình onboarding tổng quát cho khách hàng mới', status: 'needs_creation', priority: 'p1' },
  { sop_id: 'DOC-ONB-002', domain: 'DOC', name: 'Onboarding Tier 1', sop_type: 'document', description: 'Quy trình onboarding chi tiết cho khách Tier 1', status: 'needs_creation', priority: 'p1' },
];

const ALL_SOPS: SopSeed[] = [...P0_SOPS, ...P1_WORKFLOW_SOPS, ...DOC_SOPS];

export async function seedSops(): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  // Check which sop_ids already exist
  const { data: existing, error: fetchErr } = await supabase
    .from('gem_sops')
    .select('sop_id')
    .in('sop_id', ALL_SOPS.map(s => s.sop_id));

  if (fetchErr) {
    throw new Error(`Lỗi kiểm tra SOPs hiện có: ${fetchErr.message}`);
  }

  const existingIds = new Set((existing || []).map((r: any) => r.sop_id));

  // Filter out existing entries
  const toInsert = ALL_SOPS.filter(s => {
    if (existingIds.has(s.sop_id)) {
      skipped++;
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) {
    return { inserted: 0, skipped, errors: [] };
  }

  // Insert in batches of 25 to avoid payload size issues
  const batchSize = 25;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error: insertErr } = await supabase.from('gem_sops').insert(batch);

    if (insertErr) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  // Audit log
  if (inserted > 0) {
    await supabase.from('gem_sop_audit').insert({
      sop_id: 'SYSTEM',
      action: 'seed',
      actor: 'system',
      detail: { inserted, skipped, total: ALL_SOPS.length },
    });
  }

  return { inserted, skipped, errors };
}

export { ALL_SOPS };
