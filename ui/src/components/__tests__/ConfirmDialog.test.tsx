// @vitest-environment jsdom
// GEM-1153: ConfirmProvider/useConfirm thay window.confirm — promise<boolean>, Esc/backdrop/Huỷ = false, gọi chồng = từ chối cái cũ.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm, type ConfirmOptions } from "../ConfirmDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let ask: (o: ConfirmOptions) => Promise<boolean>;

function Probe() {
  ask = useConfirm();
  return null;
}

const btn = (label: string) =>
  Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === label) as HTMLButtonElement | undefined;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ConfirmProvider><Probe /></ConfirmProvider>));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Mở hộp thoại, thực hiện `act` rồi trả kết quả đã settle. */
async function run(options: ConfirmOptions, interact: () => void) {
  let result: boolean | undefined;
  let p!: Promise<boolean>;
  await act(async () => { p = ask(options); p.then((v) => { result = v; }); });
  await act(async () => { interact(); await p; });
  return result;
}

describe("useConfirm", () => {
  it("nút xác nhận → true", async () => {
    expect(await run({ title: "Xoá?", confirmLabel: "Xoá" }, () => btn("Xoá")!.click())).toBe(true);
  });

  it("nút Huỷ → false", async () => {
    expect(await run({ title: "Xoá?" }, () => btn("Huỷ")!.click())).toBe(false);
  });

  it("Esc → false", async () => {
    expect(await run({ title: "Xoá?" }, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); })).toBe(false);
  });

  it("hiện tiêu đề + nội dung, đóng hộp thoại sau khi trả lời", async () => {
    await act(async () => { void ask({ title: "Tiêu đề X", body: "Nội dung Y" }); });
    expect(document.body.textContent).toContain("Tiêu đề X");
    expect(document.body.textContent).toContain("Nội dung Y");
    await act(async () => { btn("Huỷ")!.click(); });
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("gọi chồng: câu hỏi cũ bị từ chối (không thực thi hành động phá huỷ ngầm)", async () => {
    let first: boolean | undefined;
    let second: boolean | undefined;
    await act(async () => {
      void ask({ title: "Cũ" }).then((v) => { first = v; });
      void ask({ title: "Mới", confirmLabel: "OK" }).then((v) => { second = v; });
    });
    await act(async () => { btn("OK")!.click(); });
    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it("ngoài ConfirmProvider → lỗi rõ ràng, không rơi về window.confirm", () => {
    const orphan = document.createElement("div");
    const r = createRoot(orphan);
    expect(() => act(() => r.render(<Probe />))).toThrow(/ConfirmProvider/);
    act(() => r.unmount());
  });
});
