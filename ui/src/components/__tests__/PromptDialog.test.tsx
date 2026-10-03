// @vitest-environment jsdom
// GEM-1155: promptDialog thay window.prompt — Promise<string|null>, Enter/nút = chuỗi đã trim, Esc/Huỷ/rỗng = null,
// gọi chồng = xếp hàng (không bỏ rơi promise), gọi trước khi PromptHost mount = không mất.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PromptHost } from "../PromptDialog";
import { promptDialog } from "@/lib/prompt-dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<PromptHost />));
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

const btn = (label: string) =>
  Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === label) as HTMLButtonElement | undefined;
const field = () => document.body.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement;

function type(value: string) {
  const el = field();
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Mở hộp thoại, chạy `interact`, trả kết quả đã settle. */
async function run(options: Parameters<typeof promptDialog>[0], interact: () => void) {
  let p!: Promise<string | null>;
  await act(async () => { p = promptDialog(options); });
  let result: string | null | undefined;
  await act(async () => { interact(); result = await p; });
  return result;
}

describe("promptDialog", () => {
  it("nhập rồi bấm nút → chuỗi đã trim", async () => {
    mount();
    expect(await run({ title: "Tên view", confirmLabel: "Lưu" }, () => { type("  view A  "); btn("Lưu")!.click(); })).toBe("view A");
  });

  it("defaultValue điền sẵn", async () => {
    mount();
    expect(await run({ title: "Secret name", defaultValue: "abc" }, () => btn("Đồng ý")!.click())).toBe("abc");
  });

  it("nút Huỷ → null", async () => {
    mount();
    expect(await run({ title: "x" }, () => { type("y"); btn("Huỷ")!.click(); })).toBeNull();
  });

  it("Esc → null", async () => {
    mount();
    expect(await run({ title: "x" }, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); })).toBeNull();
  });

  it("nhập toàn khoảng trắng → nút bị khoá, không trả chuỗi rỗng", async () => {
    mount();
    await act(async () => { void promptDialog({ title: "x" }); });
    type("   ");
    expect(btn("Đồng ý")!.disabled).toBe(true);
  });

  it("secret → input password; multiline → textarea", async () => {
    mount();
    await act(async () => { void promptDialog({ title: "k", secret: true }); });
    expect((field() as HTMLInputElement).type).toBe("password");
    await act(async () => { btn("Huỷ")!.click(); });
    await act(async () => { void promptDialog({ title: "m", multiline: true }); });
    expect(field().tagName).toBe("TEXTAREA");
  });

  it("2 lời gọi cùng lúc → xếp hàng, cả 2 đều được trả lời", async () => {
    mount();
    let a: string | null | undefined, b: string | null | undefined;
    await act(async () => {
      void promptDialog({ title: "A" }).then((v) => { a = v; });
      void promptDialog({ title: "B" }).then((v) => { b = v; });
    });
    expect(document.body.textContent).toContain("A");
    await act(async () => { type("một"); btn("Đồng ý")!.click(); });
    expect(a).toBe("một");
    expect(document.body.textContent).toContain("B");
    await act(async () => { type("hai"); btn("Đồng ý")!.click(); });
    expect(b).toBe("hai");
  });

  it("gọi TRƯỚC khi PromptHost mount → được hiện sau khi mount (không mất)", async () => {
    let got: string | null | undefined;
    const p = promptDialog({ title: "Sớm" }).then((v) => { got = v; });
    mount();
    expect(document.body.textContent).toContain("Sớm");
    await act(async () => { type("ok"); btn("Đồng ý")!.click(); await p; });
    expect(got).toBe("ok");
  });

  it("unmount giữa chừng → promise treo trả null", async () => {
    mount();
    let got: string | null | undefined = undefined;
    await act(async () => { void promptDialog({ title: "x" }).then((v) => { got = v; }); });
    await act(async () => { root!.unmount(); });
    root = null;
    expect(got).toBeNull();
  });
});
