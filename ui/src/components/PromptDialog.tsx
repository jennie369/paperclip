// GEM-1155 (ENG-1003-F1153-01): thay window.prompt bằng hộp nhập trong-app (không chặn luồng JS, theo theme, không bị PWA/iframe chặn câm).
// Giao diện hộp thoại. Gọi: import { promptDialog } from "@/lib/prompt-dialog"; const v = await promptDialog({ title }); (null = huỷ/rỗng)
// Mount <PromptHost /> 1 lần ở gốc app (main.tsx).
import { useEffect, useRef, useState } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { registerPromptHandler, type PendingPrompt } from "@/lib/prompt-dialog";

/** Mount 1 lần ở gốc app. Nhiều lời gọi cùng lúc được xếp hàng, hiện lần lượt (không bỏ rơi promise nào). */
export function PromptHost() {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const pendingRef = useRef<PendingPrompt | null>(null);
  const waiting = useRef<PendingPrompt[]>([]);
  const [value, setValue] = useState("");

  const show = (p: PendingPrompt) => {
    pendingRef.current = p;
    setValue(p.defaultValue ?? "");
    setPending(p);
  };

  const settle = (result: string | null) => {
    const cur = pendingRef.current;
    if (!cur) return;
    pendingRef.current = null;
    cur.resolve(result);
    const next = waiting.current.shift();
    if (next) show(next);
    else setPending(null);
  };

  useEffect(() => {
    const unregister = registerPromptHandler((p) => {
      if (pendingRef.current) waiting.current.push(p);
      else show(p);
    });
    return () => {
      unregister();
      // Unmount giữa chừng: trả null cho mọi promise đang treo (không treo luồng gọi mãi).
      pendingRef.current?.resolve(null);
      pendingRef.current = null;
      waiting.current.splice(0).forEach((p) => p.resolve(null));
    };
  }, []);

  const open = pending !== null;
  useEffect(() => {
    if (!open) return;
    const releaseScroll = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") settle(null); };
    window.addEventListener("keydown", onKey);
    return () => { releaseScroll(); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!pending) return null;

  const submit = () => {
    const trimmed = value.trim();
    settle(trimmed ? trimmed : null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={pending.title}>
      <div className="fixed inset-0 bg-black/50" onClick={() => settle(null)} />
      <form
        className="relative z-[110] mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <h2 className="text-lg font-semibold">{pending.title}</h2>
        {pending.body && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{pending.body}</p>}
        <div className="mt-4">
          {pending.multiline ? (
            <Textarea
              autoFocus
              rows={4}
              value={value}
              placeholder={pending.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
            />
          ) : (
            <Input
              autoFocus
              type={pending.secret ? "password" : "text"}
              autoComplete="off"
              value={value}
              placeholder={pending.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => settle(null)}>
            {pending.cancelLabel ?? "Huỷ"}
          </Button>
          <Button type="submit" size="sm" disabled={!value.trim()}>
            {pending.confirmLabel ?? "Đồng ý"}
          </Button>
        </div>
      </form>
    </div>
  );
}
