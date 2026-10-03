// GEM-1153 (ENG-1003-F1132-01): window.alert/confirm chặn luồng JS, không theo theme, bị trình duyệt nhúng/PWA chặn câm
// (confirm trả false → thao tác tưởng "người dùng huỷ"). Dùng useConfirm() (components/ConfirmDialog) + pushToast.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** Dòng (1-based) có `alert(`/`confirm(` native: `window.`/`globalThis.` tường minh, hoặc lời gọi trần không có `await ` / `.` đứng trước. */
export function findNativeDialogCalls(source: string): number[] {
  const bad: number[] = [];
  source.split("\n").forEach((line, i) => {
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
    if (/\b(window|globalThis|self)\.(alert|confirm)\(/.test(line)) { bad.push(i + 1); return; }
    const re = /(^|[^\w.$])(alert|confirm)\(/g;
    const code = line.replace(/\s\/\/\s.*$/, ""); // bỏ comment cuối dòng
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      const before = code.slice(0, m.index + m[1].length);
      if (!/\bawait\s*$/.test(before)) { bad.push(i + 1); break; }
    }
  });
  return bad;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === "__tests__" || name === "gem") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe("không còn window.alert/confirm trong Paperclip UI", () => {
  it("scanner bắt được dạng cũ (đối chứng)", () => {
    expect(findNativeDialogCalls('if (window.confirm("x")) go();')).toEqual([1]);
    expect(findNativeDialogCalls("a;\nif (!confirm(`Xoá ${n}?`)) return;")).toEqual([2]);
    expect(findNativeDialogCalls('alert("lỗi");')).toEqual([1]);
    expect(findNativeDialogCalls('const ok = await confirm({ title: "x" });')).toEqual([]);
    expect(findNativeDialogCalls("dialog.confirm(x); // alert(1)")).toEqual([]);
  });

  it("src/ sạch", () => {
    const offenders = walk(SRC).flatMap((f) =>
      findNativeDialogCalls(readFileSync(f, "utf8")).map((l) => `${relative(SRC, f).replace(/\\/g, "/")}:${l}`),
    );
    expect(offenders).toEqual([]);
  });
});
