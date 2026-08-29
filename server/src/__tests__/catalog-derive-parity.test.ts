// §6.1 PARITY GATE (Codex R1 [high] + R2 [high]) — chống drift 2 bản derive-tags Python↔TypeScript.
//
// OD-1=A tạo 2 bản derive-tags: Python (crypto-pattern-scanner/scripts/
// sync_media_library_from_sales_closer_catalog.py) + TypeScript (catalog-media-source.ts). Nếu 2 bản
// lệch → tags sản phẩm khác nhau → cheat-sheet system prompt + lưới autoMatch sai câm cho khách.
//
// Gate so output TƯƠI: shell-out `python … --emit-tags` (derive từ CODE Python HIỆN TẠI + catalog
// HIỆN TẠI) rồi so per-id với TS deriveTags áp lên CÙNG catalog. KHÔNG so với media-library.json đã
// commit (Codex R2: file đó có thể stale — P4 freshness gate đến sau P-A → false-green). FAIL nếu
// BẤT KỲ id nào lệch tags (thứ tự + nội dung).
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

import { deriveTags, catalogPath } from "../channels/catalog-media-source.js";

const PROJECT_ROOT =
  process.env.PROJECT_ROOT || "C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner";
const PY_SCRIPT = pathResolve(
  PROJECT_ROOT,
  "scripts",
  "sync_media_library_from_sales_closer_catalog.py",
);

describe("§6.1 parity gate — Python derive_tags ↔ TypeScript deriveTags (per-id, cả catalog)", () => {
  it("output TƯƠI của `python … --emit-tags` khớp deriveTags TS cho MỌI id (0 lệch)", () => {
    // Fail-closed: thiếu catalog/script = KHÔNG được coi là PASS (không có gì để so ≠ khớp).
    const catPath = catalogPath(PROJECT_ROOT);
    expect(existsSync(catPath), `catalog không tồn tại: ${catPath}`).toBe(true);
    expect(existsSync(PY_SCRIPT), `python script không tồn tại: ${PY_SCRIPT}`).toBe(true);

    // 1. Python TƯƠI (derive từ code + catalog hiện tại, KHÔNG đọc media-library.json).
    const py = spawnSync("python", [PY_SCRIPT, "--emit-tags"], {
      encoding: "utf-8",
      env: { ...process.env, PYTHONUTF8: "1" },
      maxBuffer: 32 * 1024 * 1024,
    });
    expect(py.status, `python --emit-tags exit ${py.status}: ${py.stderr}`).toBe(0);
    const pyTags = JSON.parse(py.stdout) as Record<string, string[]>;

    // 2. TS deriveTags áp lên CÙNG catalog.
    const catalog = JSON.parse(readFileSync(catPath, "utf-8")) as { items: any[] };
    // Trước khi key theo id: assert RAW catalog KHÔNG có id trùng (Codex P5-R1 [medium] — nếu trùng,
    // cả 2 bên key-by-id sẽ collapse mà runtime giữ cả 2 → parity "khớp giả" nhưng send resolve nhầm).
    const rawIds = (catalog.items || []).filter((e: any) => e && e.id).map((e: any) => e.id);
    const dupIds = rawIds.filter((id: string, i: number) => rawIds.indexOf(id) !== i);
    expect(dupIds, `catalog có id TRÙNG (parity gate mù dup): ${[...new Set(dupIds)].join(", ")}`).toEqual([]);
    const tsTags: Record<string, string[]> = {};
    for (const e of catalog.items || []) {
      if (e && e.id) tsTags[e.id] = deriveTags(e.covers);
    }

    // 3. So per-id — cả tập id lẫn tags từng id.
    const pyIds = Object.keys(pyTags).sort();
    const tsIds = Object.keys(tsTags).sort();
    expect(tsIds, "tập id 2 bên phải giống nhau").toEqual(pyIds);

    const mismatches: string[] = [];
    for (const id of pyIds) {
      if (JSON.stringify(pyTags[id]) !== JSON.stringify(tsTags[id])) {
        mismatches.push(
          `  id=${id}\n    python=${JSON.stringify(pyTags[id])}\n    ts    =${JSON.stringify(tsTags[id])}`,
        );
      }
    }
    expect(
      mismatches.length,
      `\n${mismatches.length} id lệch tags giữa Python và TypeScript derive:\n${mismatches.join("\n")}`,
    ).toBe(0);
  });
});
