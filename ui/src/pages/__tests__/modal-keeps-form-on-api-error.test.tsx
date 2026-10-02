// @vitest-environment jsdom
// GEM-1090: modal tạo/lưu chỉ được đóng + xoá form khi API THÀNH CÔNG.
// API lỗi → modal vẫn mở, dữ liệu người dùng nhập còn nguyên, có thông báo lỗi.
// Scanner: modal cấu hình phải controlled — Lưu gửi giá trị đã chỉnh, không phải config gốc.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EmailCampaignsPage } from "../crm/EmailCampaignsPage";
import { KnowledgeBasePage } from "../crm/KnowledgeBasePage";
import { ScannerPage } from "../ops/ScannerPage";
import { TicketListPage } from "../crm/TicketListPage";
import { MemoryRouter } from "react-router-dom";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Call = { url: string; method: string; body: any };

let container: HTMLDivElement;
let root: Root;
let calls: Call[];
let writeStatus: number;
const TICKET = { id: "t1", ticket_number: "TK-001", title: "Phiếu cũ", description: "", category: "general", priority: "medium", status: "open" };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  calls = [];
  writeStatus = 500;
  container = document.createElement("div");
  document.body.appendChild(container);
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined); // TicketListPage báo chuông khi tạo xong
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET") {
      if (url.endsWith("/scanner/config")) return json(200, { auto_scan_interval: "4h", alert_threshold: 70 });
      if (url.includes("/crm/tickets") && !url.includes("/stats")) return json(200, { data: [TICKET], total: 1 });
      if (url.includes("/kb/stats")) return json(200, { collections: 0, documents: 0, chunks: 0 });
      if (url.includes("/scanner/") && !url.includes("/recent-patterns")) return json(200, {});
      return json(200, []);
    }
    return writeStatus >= 400 ? json(writeStatus, { error: "boom" }) : json(writeStatus, { success: true });
  }));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function flush() {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

async function mount(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  root = createRoot(container);
  await act(async () => { root.render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>); });
  await flush();
}

const byText = (sel: string, text: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(sel)).find((el) => el.textContent?.includes(text));

async function click(el: HTMLElement | undefined) {
  if (!el) throw new Error("không tìm thấy phần tử để click");
  await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await flush();
}

async function setValue(el: HTMLInputElement | HTMLSelectElement | undefined, value: string) {
  if (!el) throw new Error("không tìm thấy ô nhập");
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

const inputByPlaceholder = (ph: string) =>
  document.querySelector<HTMLInputElement>(`input[placeholder^="${ph}"]`) ?? undefined;

describe("EmailCampaignsPage — modal tạo campaign", () => {
  async function fillAndSubmit() {
    await mount(<EmailCampaignsPage />);
    await click(byText("button", "Tạo Campaign"));
    await setValue(inputByPlaceholder("VD: Welcome"), "Chiến dịch Q4");
    await setValue(inputByPlaceholder("VD: Chào mừng"), "Tiêu đề thử");
    await click(Array.from(document.querySelectorAll<HTMLElement>("button")).filter((b) => b.textContent?.includes("Tạo Campaign")).pop());
  }

  it("API lỗi → modal còn mở, giữ nguyên dữ liệu nhập, hiện lỗi", async () => {
    await fillAndSubmit();
    expect(calls.some((c) => c.method === "POST")).toBe(true);
    expect(document.body.textContent).toContain("Tạo Email Campaign");
    expect(inputByPlaceholder("VD: Welcome")?.value).toBe("Chiến dịch Q4");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });

  it("API thành công → modal đóng", async () => {
    writeStatus = 201;
    await fillAndSubmit();
    expect(document.body.textContent).not.toContain("Tạo Email Campaign");
  });
});

describe("KnowledgeBasePage — modal tạo bộ sưu tập", () => {
  async function fillAndSubmit() {
    await mount(<KnowledgeBasePage />);
    await click(byText("button", "Tạo bộ sưu tập"));
    await setValue(inputByPlaceholder("VD: Sản phẩm"), "Đá phong thủy");
    await click(Array.from(document.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === "Tạo"));
  }

  it("API lỗi → modal còn mở, giữ nguyên dữ liệu nhập, hiện lỗi", async () => {
    await fillAndSubmit();
    expect(document.body.textContent).toContain("Tạo bộ sưu tập");
    expect(inputByPlaceholder("VD: Sản phẩm")?.value).toBe("Đá phong thủy");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });

  it("API thành công → modal đóng", async () => {
    writeStatus = 201;
    await fillAndSubmit();
    expect(inputByPlaceholder("VD: Sản phẩm")).toBeUndefined();
  });
});

describe("ScannerPage — modal cấu hình", () => {
  async function openConfig() {
    await mount(<ScannerPage />);
    await click(byText("button", "Cấu hình"));
  }
  const intervalSelect = () => document.querySelector<HTMLSelectElement>("select") ?? undefined;
  const saveButton = () => Array.from(document.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent?.includes("Lưu cấu hình"));

  it("Lưu gửi giá trị đã chỉnh (không phải config gốc)", async () => {
    writeStatus = 200;
    await openConfig();
    expect(intervalSelect()?.value).toBe("4h"); // hiển thị đúng config từ server
    await setValue(intervalSelect(), "8h");
    await click(saveButton());
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body.auto_scan_interval).toBe("8h");
    expect(document.body.textContent).not.toContain("Cấu hình scanner sẽ được cập nhật");
  });

  it("API lỗi → modal còn mở, lựa chọn đã chỉnh còn nguyên, hiện lỗi", async () => {
    await openConfig();
    await setValue(intervalSelect(), "8h");
    await click(saveButton());
    expect(document.body.textContent).toContain("Cấu hình scanner sẽ được cập nhật");
    expect(intervalSelect()?.value).toBe("8h");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });
});

describe("TicketListPage — modal tạo / sửa / xoá phiếu (GEM-1113)", () => {
  const buttonByText = (text: string) =>
    Array.from(document.querySelectorAll<HTMLElement>("button")).filter((b) => b.textContent?.includes(text)).pop();
  const titleInput = () => inputByPlaceholder("Nhập tiêu đề");

  async function fillCreate() {
    await mount(<MemoryRouter><TicketListPage /></MemoryRouter>);
    await click(byText("button", "Tạo phiếu mới"));
    await setValue(titleInput(), "Khách chưa nhận hàng");
    await click(buttonByText("Tạo phiếu"));
  }

  it("tạo: API lỗi → modal còn mở, giữ nguyên dữ liệu nhập, hiện lỗi", async () => {
    await fillCreate();
    expect(calls.some((c) => c.method === "POST")).toBe(true);
    expect(document.body.textContent).toContain("Tạo phiếu hỗ trợ mới");
    expect(titleInput()?.value).toBe("Khách chưa nhận hàng");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });

  it("tạo: API thành công → modal đóng", async () => {
    writeStatus = 201;
    await fillCreate();
    expect(document.body.textContent).not.toContain("Tạo phiếu hỗ trợ mới");
  });

  async function fillEdit() {
    await mount(<MemoryRouter><TicketListPage /></MemoryRouter>);
    await click(document.querySelector<HTMLElement>("button[title^='Sửa']") ?? undefined);
    await setValue(titleInput(), "Phiếu đã sửa");
    await click(buttonByText("Lưu thay đổi"));
  }

  it("sửa: API lỗi → modal còn mở, giữ nguyên chỉnh sửa, hiện lỗi", async () => {
    await fillEdit();
    expect(calls.some((c) => c.method === "PUT")).toBe(true);
    expect(document.body.textContent).toContain("Sửa phiếu TK-001");
    expect(titleInput()?.value).toBe("Phiếu đã sửa");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });

  it("sửa: API thành công → modal đóng", async () => {
    writeStatus = 200;
    await fillEdit();
    expect(document.body.textContent).not.toContain("Sửa phiếu TK-001");
  });

  async function confirmDelete() {
    await mount(<MemoryRouter><TicketListPage /></MemoryRouter>);
    await click(document.querySelector<HTMLElement>("button[title='Xóa']") ?? undefined);
    await click(buttonByText("Xóa phiếu"));
  }

  it("xoá: API lỗi → modal còn mở, hiện lỗi (không báo xoá thành công)", async () => {
    await confirmDelete();
    expect(calls.some((c) => c.method === "DELETE")).toBe(true);
    expect(document.body.textContent).toContain("Xác nhận xóa phiếu");
    expect(document.querySelector("[role=alert]")?.textContent).toContain("boom");
  });

  it("xoá: API thành công → modal đóng", async () => {
    writeStatus = 200;
    await confirmDelete();
    expect(document.body.textContent).not.toContain("Xác nhận xóa phiếu");
  });
});

// Hàng rào hồi quy (GEM-1090): cấm đóng modal / xoá form trong onSettled — onSettled chạy cả khi API LỖI.
// Đóng modal + xoá form phải nằm trong onSuccess.
describe("lớp lỗi: onSettled đóng modal / xoá form", () => {
  const pagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === "__tests__" ? [] : walk(path.join(dir, e.name))) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []);
  const BAD = /onSettled:[^\n]*(set\w*(Show|Open|Modal)\w*\(\s*(false|null)\s*\)|set\w*Form\()/;

  // Nợ đã đăng ký ledger (thêm tên file + mã ENG khi còn nợ). Trống từ GEM-1113 (TicketListPage đã sửa).
  const KNOWN_DEBT = new Set<string>();

  it("không trang nào gọi setShow*/setOpen*/set*Form trong onSettled", () => {
    const offenders = walk(pagesDir)
      .filter((f) => BAD.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(pagesDir, f).replace(/\\/g, "/"))
      .filter((rel) => !KNOWN_DEBT.has(rel));
    expect(offenders).toEqual([]);
  });

  it("dogfood: regex bắt đúng mẫu cũ", () => {
    expect(BAD.test("onSettled: () => { inv(); setShowCreate(false); setForm(defaultForm); },")).toBe(true);
    expect(BAD.test("onSuccess: () => { setShowCreate(false); },\n onSettled: inv,")).toBe(false);
  });
});
