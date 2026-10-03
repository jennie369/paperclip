// GEM-1155: lõi promptDialog (không React) — để api/client.ts và component dùng chung mà không import ngược từ components/.
// Giao diện hộp thoại = components/PromptDialog.tsx (<PromptHost /> đăng ký handler ở đây).

export interface PromptOptions {
  title: string;
  body?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Nhập nhiều dòng (mẫu trả lời dài). Enter xuống dòng, Ctrl/Cmd+Enter gửi. */
  multiline?: boolean;
  /** Che ký tự (API key, secret). */
  secret?: boolean;
}

/** Trả chuỗi ĐÃ trim, hoặc null khi huỷ/để trống. */
export type PromptFn = (options: PromptOptions) => Promise<string | null>;

export interface PendingPrompt extends PromptOptions {
  resolve: (value: string | null) => void;
}

let handler: ((p: PendingPrompt) => void) | null = null;
const queue: PendingPrompt[] = [];

/** Dùng ở bất kỳ đâu: const v = await promptDialog({ title }); if (!v) return;  Gọi trước khi host mount → xếp hàng, không mất. */
export const promptDialog: PromptFn = (options) =>
  new Promise<string | null>((resolve) => {
    const p: PendingPrompt = { ...options, resolve };
    if (handler) handler(p);
    else queue.push(p);
  });

/** Host đăng ký nhận lời gọi; trả hàm huỷ đăng ký. Lời gọi xếp hàng trước đó được trút sang host ngay. */
export function registerPromptHandler(h: (p: PendingPrompt) => void): () => void {
  handler = h;
  queue.splice(0).forEach(h);
  return () => { if (handler === h) handler = null; };
}
