// GEM-1131 (ENG-1002-F1113-01): mutationFn gọi fetch() mà KHÔNG kiểm res.ok → lỗi 4xx/5xx thành "thành công" câm,
// onSuccess đóng modal / báo thành công giả. Guard tĩnh: mọi mutationFn có fetch( phải có .ok / readJsonOrThrow / throw.
import { describe, it, expect } from "vitest";
import { fetchOk } from "@/lib/readJsonOrThrow";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const CHECK = /\.ok\b|OrThrow\(|\bfetchOk\(|\bthrow\b/;

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

/** Các file đã dọn (GEM-1152). Thêm file vào đây khi dọn xong để guard giữ sạch. */
const HARDENED_FILES = [
  "pages/agents/AgentSessionsPage.tsx",
  "pages/ops/components/GenerationJobsBlock.tsx",
  "pages/ops/tabs/PipelineTab.tsx",
  "pages/config/ConfigHubPage.tsx",
  "pages/channels/ChannelSettingsPage.tsx",
  "pages/channels/components/CustomerSidebar.tsx",
  "pages/ops/ContentPipelinePage.tsx",
  "pages/crm/CustomerListPage.tsx",
  "pages/ops/tabs/EmailPushTab.tsx",
];
/** GEM-1190 (ENG-1003-F1152-01): file còn nhiều fetch ghi đã tự kiểm `.ok` thủ công — chỉ bắt lời gọi KHÔNG có dấu hiệu kiểm lỗi. */
const CHECKED_FILES = [
  "pages/ops/AffiliatePage.tsx",
  "pages/ops/sop-engine/BatchGeneratorTab.tsx",
  "pages/ops/sop-engine/CronLogDrawer.tsx",
  "pages/ops/sop-engine/RegistryMarketplaceTab.tsx",
  "pages/ops/sop-engine/PipelinesTab.tsx",
  "pages/ops/CommandConsolePage.tsx",
  "components/ops/PlannerBoard.tsx",
  "pages/ops/tabs/ScheduleTab.tsx",
];
const WRITE_VERB = /method\s*:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/;

/** Toàn bộ đối số của 1 lời gọi (từ sau dấu `(` mở) — dừng ở ngoặc đóng cân bằng, KHÔNG dừng ở dấu phẩy. */
function callArgs(rest: string): string {
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c) && --depth < 0) return rest.slice(0, i);
  }
  return rest;
}

/** Dòng của các lời gọi `fetch(` thô có method ghi (args quét ngoặc cân bằng nên bắt được object nhiều dòng). */
export function findRawWriteFetches(source: string): number[] {
  const bad: number[] = [];
  const re = /\bfetch\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (WRITE_VERB.test(callArgs(source.slice(m.index + m[0].length)))) bad.push(source.slice(0, m.index).split("\n").length);
  }
  return bad;
}

/** Như findRawWriteFetches nhưng bỏ qua lời gọi mà 400 ký tự sau đó (đến fetch kế tiếp) có .ok / OrThrow / fetchOk / throw. */
export function findUncheckedRawWriteFetches(source: string): number[] {
  const bad: number[] = [];
  const re = /\bfetch\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const rest = source.slice(m.index + m[0].length);
    if (!WRITE_VERB.test(callArgs(rest))) continue;
    const next = rest.search(/\bfetch\(/);
    const tail = rest.slice(0, Math.min(next < 0 ? 400 : next, 400));
    if (!CHECK.test(tail)) bad.push(source.slice(0, m.index).split("\n").length);
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

  // GEM-1152 (ENG-1003-F1131-01): handler onClick/submit gọi `await fetch(..., {method: POST|PUT|PATCH|DELETE})` trần → 4xx/5xx im lặng.
  // Các file đã chuyển sang fetchOk/readJsonOrThrow KHÔNG được quay lại fetch ghi trần (mở rộng danh sách khi dọn thêm file).
  it("đối chứng: findRawWriteFetches bắt fetch ghi trần (kể cả object nhiều dòng), thả fetchOk/GET", () => {
    expect(findRawWriteFetches('await fetch(`/a/${id}`, { method: "DELETE" });')).toHaveLength(1);
    expect(findRawWriteFetches('await fetch("/a", {\n headers: {},\n method: "POST",\n});')).toHaveLength(1);
    expect(findRawWriteFetches('await fetchOk(`/a`, { method: "DELETE" });')).toHaveLength(0);
    expect(findRawWriteFetches('const r = await fetch("/api/x");')).toHaveLength(0);
  });

  it("fetchOk: 2xx trả Response; 4xx/5xx ném Error mang thông điệp server, không có body thì dùng fallback + status", async () => {
    const real = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;
      expect((await fetchOk("/x", { method: "POST" })).status).toBe(200);
      globalThis.fetch = (async () => new Response(JSON.stringify({ error: "Thiếu quyền" }), { status: 403 })) as typeof fetch;
      await expect(fetchOk("/x", { method: "DELETE" }, "Lỗi xoá")).rejects.toThrow("Thiếu quyền");
      globalThis.fetch = (async () => new Response("<html>", { status: 502 })) as typeof fetch;
      await expect(fetchOk("/x", { method: "PUT" }, "Lỗi lưu")).rejects.toThrow("Lỗi lưu (502)");
    } finally {
      globalThis.fetch = real;
    }
  });

  it("file đã dọn không còn fetch ghi trần", () => {
    const offenders = HARDENED_FILES.flatMap((f) =>
      findRawWriteFetches(readFileSync(join(SRC, f), "utf8")).map((l) => `${f}:${l}`),
    );
    expect(offenders).toEqual([]);
  });

  it("GEM-1190: findUncheckedRawWriteFetches bắt fetch ghi không kiểm lỗi, thả khi có .ok", () => {
    expect(findUncheckedRawWriteFetches('fetch("/a", { method: "POST" }).then(() => close());')).toHaveLength(1);
    expect(findUncheckedRawWriteFetches('const r = await fetch("/a", { method: "POST" });\nif (!r.ok) throw new Error("x");')).toHaveLength(0);
  });

  it("file GEM-1190 không còn fetch ghi nào thiếu kiểm res.ok", () => {
    const offenders = CHECKED_FILES.flatMap((f) =>
      findUncheckedRawWriteFetches(readFileSync(join(SRC, f), "utf8")).map((l) => `${f}:${l}`),
    );
    expect(offenders).toEqual([]);
  });
});
