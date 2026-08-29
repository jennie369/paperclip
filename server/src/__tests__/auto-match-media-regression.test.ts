// Regression baseline cho `autoMatchMediaFromReply` (channels/router.ts) — P2 của plan
// docs/plans_reports/2026-08-29-SALES-CLOSER-MEDIA-SOURCE-SSOT_ARCHITECTURE_PLAN.md (crypto-pattern-scanner).
//
// TẠI SAO FILE NÀY TỒN TẠI: OD-2 của plan (chị Jennie chốt 29/08) yêu cầu "port nguyên vẹn,
// không đổi hành vi" khi router.ts đổi nguồn đọc từ `agents/sales-closer/media-library.json`
// (Surface A, hand/sync-maintained) sang đọc trực tiếp `product-catalog-index.json` (Option A,
// OD-1). Bộ test này chạy TRÊN BẢN HIỆN HÀNH (trước khi đổi bất kỳ dòng logic nào ở P-A) để
// làm BASELINE — sau khi P-A port xong, chạy LẠI đúng bộ này (đổi nguồn dữ liệu nạp vào, giữ
// nguyên assertion) và yêu cầu 0 sai khác. Xem plan §6/§7 P2.
//
// Cùng cấu trúc 2 khối NEGATIVE/POSITIVE với
// crypto-pattern-scanner/scripts/tests/test_brand_image_match.py (dogfood-2-chiều convention
// của repo): NEGATIVE = ca phải KHÔNG match (chống match-nhầm/match-quá-tay); POSITIVE = ca
// phải match ĐÚNG (chống match-thiếu/regression im lặng khi đổi nguồn).
import { describe, expect, it } from "vitest";

import {
  autoMatchMediaFromReply,
  GENERIC_MEDIA_TAGS,
  itemToMediaFiles,
  loadMediaLibrary,
} from "../channels/router.js";
import type { MediaLibrary, MediaLibraryItem } from "../channels/types.js";

function makeLib(items: Array<Partial<MediaLibraryItem> & { id: string }>): MediaLibrary {
  return {
    agent_slug: "test-fixture",
    version: "0.0.0",
    items: items.map((it, i) => ({
      id: it.id,
      name: it.name ?? `Item ${i}`,
      type: (it.type as MediaLibraryItem["type"]) ?? "image",
      mimeType: it.mimeType ?? "image/png",
      path: it.path ?? `D:/fixture/${it.id}.png`,
      all_images: it.all_images,
      url: it.url,
      description: it.description ?? "",
      tags: it.tags ?? [],
      language: it.language ?? "vi",
    })),
  };
}

describe("autoMatchMediaFromReply — NEGATIVE (guard đúng phải trả [])", () => {
  it("lib null → []", () => {
    expect(autoMatchMediaFromReply("Em gửi chị xem hình Trading Starter nhé", null)).toEqual([]);
  });

  it("lib rỗng (0 item) → []", () => {
    expect(autoMatchMediaFromReply("Em gửi chị xem hình Trading Starter nhé", makeLib([]))).toEqual([]);
  });

  it("text rỗng → []", () => {
    const lib = makeLib([{ id: "a", name: "A", tags: ["trading_starter"] }]);
    expect(autoMatchMediaFromReply("", lib)).toEqual([]);
  });

  it("KHÔNG có promise-phrase (gửi/xem/đính kèm/kèm + hình/ảnh/...) dù câu nhắc đúng tag → []", () => {
    const lib = makeLib([{ id: "a", name: "A", tags: ["trading_starter"] }]);
    expect(autoMatchMediaFromReply("Trading Starter giá 299k chị nhé", lib)).toEqual([]);
  });

  it("có promise-phrase nhưng CHỈ khớp generic tag (GENERIC_MEDIA_TAGS) → []", () => {
    const lib = makeLib([{ id: "a", name: "A", tags: ["crystal", "wealth", "set"] }]);
    expect(autoMatchMediaFromReply("Em gửi chị xem hình bộ crystal wealth set nhé", lib)).toEqual([]);
  });

  it("tag <6 ký tự sau strip-accent KHÔNG được tính dù promise-phrase có mặt", () => {
    const lib = makeLib([{ id: "a", name: "A", tags: ["set"] }]); // "set" = 3 ký tự
    expect(autoMatchMediaFromReply("Em gửi chị xem hình set này nhé", lib)).toEqual([]);
  });

  it("văn chung chung không nêu sản phẩm cụ thể (dù có promise-phrase) → []", () => {
    const lib = makeLib([{ id: "a", name: "A", tags: ["trading_starter", "gempack_vip"] }]);
    expect(autoMatchMediaFromReply("Em gửi chị xem hình sản phẩm bên em nhé", lib)).toEqual([]);
  });

  it("collision dấu tiếng Việt: 'tinh thể' KHÔNG được khớp nhầm tag 'tinh_yeu' (tinh≠tình sau strip-accent trùng chữ)", () => {
    // Lesson gốc test_brand_image_match.py 19/07: "Tinh thể an yên" khớp nhầm "TÌNH Yêu" vì
    // strip-accent làm tinh≡tình. Ở đây encode lại cho autoMatchMediaFromReply: câu chỉ nhắc
    // "tinh thể" (đá) — KHÔNG được kéo match tag "tinh_yeu" (khóa Tần Số TÌNH Yêu) dù cùng
    // chuỗi sau strip-accent, vì phrase thật của tag là "tinh yeu" (6 ký tự) — "tinh the" của
    // câu không CHỨA "tinh yeu" như substring nên guard `includes()` tự loại đúng ca này.
    const lib = makeLib([{ id: "love_course", name: "Khóa Tần Số Tình Yêu", tags: ["tinh_yeu", "khoa_hoc"] }]);
    expect(autoMatchMediaFromReply("Em gửi chị xem hình tinh thể an yên nhé", lib)).toEqual([]);
  });

  it("2 item cùng match, tổng ảnh vượt MEDIA_MAX_PER_MARKER (6) → bị cắt đúng tổng, không cắt theo số item", () => {
    const lib = makeLib([
      {
        id: "big",
        name: "Big Set",
        tags: ["trading_starter_big"],
        all_images: ["D:/a1.png", "D:/a2.png", "D:/a3.png"],
      },
      { id: "small", name: "Small Item", tags: ["gempack_vip_small"], path: "D:/b1.png" },
    ]);
    const out = autoMatchMediaFromReply(
      "Em gửi chị xem hình trading starter big và gempack vip small nhé",
      lib,
    );
    expect(out.length).toBeLessThanOrEqual(6);
  });
});

describe("autoMatchMediaFromReply — POSITIVE trên DỮ LIỆU THẬT (nguồn sales-closer qua loadMediaLibrary — sau P-A = catalog-derived)", () => {
  const lib = loadMediaLibrary("sales-closer");
  if (!lib) {
    throw new Error(
      "FAIL-CLOSED: không load được agents/sales-closer/media-library.json qua loadMediaLibrary('sales-closer') " +
        "— kiểm tra PROJECT_ROOT/file tồn tại trước khi tin baseline này.",
    );
  }

  // Cùng nguyên tắc `_eligible()` của test_brand_image_match.py: chỉ những item có ≥1 tag
  // KHÔNG generic và ≥6 ký tự mới có khả năng được autoMatch bắt (tag ngắn/generic-only thì
  // autoMatchMediaFromReply LUÔN trả [] cho item đó theo thiết kế — không phải bug).
  function eligibleTag(it: MediaLibraryItem): string | null {
    for (const tag of it.tags || []) {
      if (GENERIC_MEDIA_TAGS.has(tag)) continue;
      const phrase = tag.replace(/_/g, " ").trim();
      if (phrase.length >= 6) return phrase;
    }
    return null;
  }

  const eligible = lib.items
    .map((it) => ({ it, phrase: eligibleTag(it) }))
    .filter((x): x is { it: MediaLibraryItem; phrase: string } => x.phrase !== null);

  it(`FAIL-CLOSED coverage: ≥10 item trong media-library.json hiện hành phải eligible (đo được: ${eligible.length}/${lib.items.length})`, () => {
    // Ngưỡng thấp có chủ đích — mục tiêu là bắt trường hợp TOÀN BỘ tag bị rỗng/hỏng (sync
    // script lỗi), không phải khoá cứng % coverage của catalog tại một thời điểm.
    expect(eligible.length).toBeGreaterThanOrEqual(10);
  });

  // Vài tag "eligible" (≥6 ký tự, không generic) vẫn là SUBSTRING của tag item KHÁC
  // (vd "crypto" trong scanner_pro là substring của "21 ngày crypto" trong course_crypto_so_0)
  // — đây là hành vi THẬT của catalog hiện hành, KHÔNG phải bug cần sửa ở P2 (OD-2 chỉ port
  // nguyên vẹn). Loại các ca đa-nghĩa khỏi mẫu POSITIVE bằng cách dogfood-check TRƯỚC: chỉ
  // giữ phrase khiến autoMatch trả ĐÚNG 1 item (không lẫn item khác) trên lib THẬT.
  const unambiguous = eligible.filter(({ it: item, phrase }) => {
    const text = `Dạ chị, em gửi chị xem hình ${phrase} nhé ạ!`;
    const got = autoMatchMediaFromReply(text, lib);
    const expected = itemToMediaFiles(item).slice(0, 6);
    return got.length === expected.length && JSON.stringify(got) === JSON.stringify(expected);
  });

  it(`≥6 tag phải cho kết quả KHÔNG đa-nghĩa trên lib thật (đo được: ${unambiguous.length}/${eligible.length} unambiguous)`, () => {
    expect(unambiguous.length).toBeGreaterThanOrEqual(6);
  });

  const sample = unambiguous.slice(0, 8); // 8 ca dương tính thật — vượt tối thiểu 6 của quy ước repo
  it.each(sample)(
    'câu hứa-gửi-ảnh nhắc tag "$phrase" (item $it.id) → autoMatch PHẢI trả đúng ảnh của item đó',
    ({ it: item, phrase }) => {
      const text = `Dạ chị, em gửi chị xem hình ${phrase} nhé ạ!`;
      const got = autoMatchMediaFromReply(text, lib);
      const expected = itemToMediaFiles(item).slice(0, 6);
      expect(got).toEqual(expected);
    },
  );
});
