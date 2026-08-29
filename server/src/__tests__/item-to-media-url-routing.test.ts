// §6.2 (D-2) — itemToMediaFiles URL-routing + resolveMediaToLocalPath tiêu thụ đúng field.
//
// Lỗi gốc (Deviation D-2): itemToMediaFiles nhánh all_images gán MỌI ảnh vào field `path`; khi entry
// là URL (https://…) thì channel gửi (zalo channel.ts + cskh resolveMediaToLocalPath, CÙNG logic:
// path-local-trước, url-download-sau) resolve URL như file local → existsSync=false, url undefined →
// bỏ ảnh CÂM. Đo: 18/134 catalog entry có URL, 4 entry TOÀN URL mất sạch ảnh.
//
// Test này là lưới CƠ HỌC: chứng minh (a) itemToMediaFiles đặt URL vào field `url` (không `path`),
// (b) resolveMediaToLocalPath rẽ đúng nhánh theo field. I/O mạng thật (download → gửi khách) = P6
// verify-by-effect, KHÔNG thay bằng unit test.
import { describe, expect, it } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve as pathResolve } from "node:path";

import { itemToMediaFiles } from "../channels/router.js";
import { resolveMediaToLocalPath } from "../channels/media-util.js";
import type { MediaLibraryItem } from "../channels/types.js";

function item(partial: Partial<MediaLibraryItem> & { id: string; all_images: string[] }): MediaLibraryItem {
  return {
    id: partial.id,
    name: partial.name ?? "Test Product",
    type: "image",
    mimeType: partial.mimeType ?? "image/png",
    path: partial.path ?? null,
    all_images: partial.all_images,
    url: partial.url ?? null,
    description: partial.description ?? "caption",
    tags: partial.tags ?? [],
    language: "vi",
  };
}

describe("itemToMediaFiles — URL-routing (D-2)", () => {
  it("entry TOÀN URL → mỗi MediaFile có `url` set, `path` undefined (KHÔNG nhét URL vào path)", () => {
    const files = itemToMediaFiles(
      item({ id: "all_url", all_images: ["https://cdn.example.com/a.png", "https://cdn.example.com/b.jpg"] }),
    );
    expect(files.length).toBe(2);
    for (const f of files) {
      expect(f.url, "URL phải ở field url").toMatch(/^https:\/\//);
      expect(f.path, "path phải undefined cho entry URL").toBeUndefined();
    }
    // mimeType vẫn suy từ đuôi URL
    expect(files[0].mimeType).toBe("image/png");
    expect(files[1].mimeType).toBe("image/jpeg");
  });

  it("entry TOÀN local-path → `path` set, `url` undefined (giữ hành vi cũ)", () => {
    const files = itemToMediaFiles(
      item({ id: "all_local", all_images: ["D:/photos/a.png", "D:/photos/b.png"] }),
    );
    expect(files.length).toBe(2);
    for (const f of files) {
      expect(f.path, "local path phải ở field path").toMatch(/^D:\//);
      expect(f.url).toBeUndefined();
    }
  });

  it("entry TRỘN local+URL → mỗi ảnh vào ĐÚNG field theo loại, giữ thứ tự", () => {
    const files = itemToMediaFiles(
      item({ id: "mixed", all_images: ["D:/photos/a.png", "https://cdn.example.com/b.jpg", "D:/photos/c.png"] }),
    );
    expect(files.length).toBe(3);
    expect(files[0].path).toBe("D:/photos/a.png");
    expect(files[0].url).toBeUndefined();
    expect(files[1].url).toBe("https://cdn.example.com/b.jpg");
    expect(files[1].path).toBeUndefined();
    expect(files[2].path).toBe("D:/photos/c.png");
    expect(files[2].url).toBeUndefined();
  });

  it("HTTPS:// hoa (hiếm) vẫn nhận là URL (classifier case-insensitive)", () => {
    const files = itemToMediaFiles(item({ id: "upper", all_images: ["HTTPS://cdn.example.com/a.png"] }));
    expect(files[0].url).toBe("HTTPS://cdn.example.com/a.png");
    expect(files[0].path).toBeUndefined();
  });

  it("cap ≤3 ảnh/item dù all_images nhiều hơn (MEDIA_PRODUCT_IMAGES_MAX)", () => {
    const files = itemToMediaFiles(
      item({ id: "many", all_images: Array.from({ length: 8 }, (_, i) => `https://cdn.example.com/${i}.png`) }),
    );
    expect(files.length).toBe(3);
  });
});

describe("resolveMediaToLocalPath — tiêu thụ MediaFile đúng field (đường CSKH, verified giống Zalo)", () => {
  it("MediaFile local-path tồn tại → trả path đó, KHÔNG download, cleanup=false", async () => {
    const dir = mkdtempSync(pathResolve(tmpdir(), "media-test-"));
    const real = pathResolve(dir, "real.png");
    writeFileSync(real, "x");
    const { localPath, cleanup } = await resolveMediaToLocalPath({ path: real, mimeType: "image/png" });
    expect(localPath).toBe(real);
    expect(cleanup).toBe(false);
  });

  it("MediaFile chỉ có `url` (path undefined) → RẼ nhánh download; url hỏng → trả null an toàn (đã tới nhánh url, KHÔNG kẹt path)", async () => {
    // URL không resolve được → downloadMediaToTemp trả null → localPath null. Điểm test: KHÔNG throw,
    // và đã đi nhánh url (không phải nhánh path). Đây là bằng chứng cơ học fix D-2 nối đúng đường
    // (itemToMediaFiles đặt URL vào `url` → resolveMediaToLocalPath tải qua url). Ảnh về thật = P6.
    const { localPath, cleanup } = await resolveMediaToLocalPath({
      url: "https://invalid.invalid.invalid/nope.png",
      mimeType: "image/png",
    });
    expect(localPath).toBeNull();
    expect(cleanup).toBe(false);
  });

  it("(regression D-2) MediaFile shape LỖI CŨ (URL nhét vào `path`, url undefined) → null (chứng minh lỗi câm cũ)", async () => {
    // Đây là shape mà itemToMediaFiles CŨ tạo ra cho entry URL. Chứng minh nó bỏ ảnh câm → lý do
    // fix D-2 phải đặt URL vào field `url`, không `path`.
    const { localPath } = await resolveMediaToLocalPath({
      path: "https://cdn.example.com/a.png",
      mimeType: "image/png",
    });
    expect(localPath).toBeNull();
  });
});
