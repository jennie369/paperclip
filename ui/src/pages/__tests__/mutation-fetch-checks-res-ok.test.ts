// GEM-1131 (ENG-1002-F1113-01): mutationFn gọi fetch() mà KHÔNG kiểm res.ok → lỗi 4xx/5xx thành "thành công" câm,
// onSuccess đóng modal / báo thành công giả. Guard tĩnh: mọi mutationFn có fetch( phải có .ok / readJsonOrThrow / throw.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const CHECK = /\.ok\b|OrThrow\(|\bthrow\b/;

/** Lấy đúng phần giá trị của mutationFn: quét ngoặc cân bằng đến dấu phẩy cấp 0 hoặc dấu đóng của object useMutation. */
function mutationFnBody(rest: string): string {
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) { if (--depth < 0) return rest.slice(0, i); }
    else if (c === "," && depth === 0) return rest.slice(0, i);
  }
  return rest;
}

/** Trả về dòng của các mutationFn có fetch( nhưng không có dấu hiệu kiểm lỗi (.ok / readJsonOrThrow / throw). */
export function findUncheckedFetchMutations(source: string): number[] {
  const bad: number[] = [];
  const re = /mutationFn\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const body = mutationFnBody(source.slice(m.index + m[0].length));
    if (/\bfetch\(/.test(body) && !CHECK.test(body)) bad.push(source.slice(0, m.index).split("\n").length);
  }
  return bad;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "__tests__" && name !== "node_modules") walk(p, out); }
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("mutationFn + fetch() phải kiểm res.ok (GEM-1131)", () => {
  it("đối chứng: bắt đúng dạng code cũ, thả dạng đã sửa", () => {
    const old = `const m = useMutation({\n mutationFn: async () => {\n const res = await fetch("/x", { method: "POST" });\n return res.json();\n },\n onSuccess: () => close(),\n});`;
    const fixed = old.replace("return res.json();", 'return readJsonOrThrow(res, "Lỗi");');
    expect(findUncheckedFetchMutations(old)).toHaveLength(1);
    expect(findUncheckedFetchMutations(fixed)).toHaveLength(0);
  });

  it("không còn mutationFn nào nuốt lỗi HTTP trong ui/src", () => {
    const offenders = walk(SRC).flatMap((f) =>
      findUncheckedFetchMutations(readFileSync(f, "utf8")).map((l) => `${relative(SRC, f)}:${l}`),
    );
    expect(offenders).toEqual([]);
  });
});
