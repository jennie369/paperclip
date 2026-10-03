// GEM-1153 (ENG-1003-F1132-01): thay window.confirm bằng hộp thoại trong-app (không chặn luồng JS, theo theme).
// Dùng: const confirm = useConfirm(); if (!(await confirm({ title, body, destructive: true }))) return;
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Hành động phá huỷ (xoá/tắt) → nút xác nhận màu đỏ, focus mặc định ở nút Huỷ. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    // Đang có hộp thoại mở mà gọi tiếp → từ chối cái cũ (an toàn: không thực thi hành động phá huỷ ngầm).
    // pendingRef cập nhật ĐỒNG BỘ (không đợi render) để 2 lời gọi cùng batch cũng không bỏ rơi promise nào.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next: Pending = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const open = pending !== null;
  useEffect(() => {
    if (!open) return;
    const releaseScroll = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") settle(false); };
    window.addEventListener("keydown", onKey);
    return () => { releaseScroll(); window.removeEventListener("keydown", onKey); };
  }, [open, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-label={pending.title}>
          <div className="fixed inset-0 bg-black/50" onClick={() => settle(false)} />
          <div className="relative z-[100] mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{pending.title}</h2>
            {pending.body && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{pending.body}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" autoFocus={pending.destructive} onClick={() => settle(false)}>
                {pending.cancelLabel ?? "Huỷ"}
              </Button>
              <Button variant={pending.destructive ? "destructive" : "default"} size="sm" autoFocus={!pending.destructive} onClick={() => settle(true)}>
                {pending.confirmLabel ?? "Đồng ý"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
