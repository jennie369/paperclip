import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Download } from "lucide-react";

import { lockBodyScroll } from "@/lib/body-scroll-lock";

/**
 * Single viewer for every image in the inbox. Four call sites used to
 * `window.open(url, "_blank")`, which throws the operator out of the thread and
 * loses their place — reading a conversation means glancing at an attachment,
 * not navigating away from it.
 */
type LightboxContextValue = { openImage: (src: string, alt?: string) => void };

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<{ src: string; alt?: string } | null>(null);
  const [failed, setFailed] = useState(false);

  const openImage = useCallback((src: string, alt?: string) => {
    if (!src) return;
    setFailed(false);
    setImage({ src, alt });
  }, []);

  const close = useCallback(() => setImage(null), []);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const releaseScroll = lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      releaseScroll();
    };
  }, [image, close]);

  return (
    <LightboxContext.Provider value={{ openImage }}>
      {children}
      {image && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 pt-[max(1rem,env(safe-area-inset-top))]"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={image.alt || "Xem ảnh"}
        >
          <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex items-center gap-1">
            <a
              href={image.src}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Mở trong tab mới"
              aria-label="Mở trong tab mới"
              className="rounded-full bg-white/10 p-2 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <a
              href={image.src}
              download
              onClick={(e) => e.stopPropagation()}
              title="Tải ảnh về"
              aria-label="Tải ảnh về"
              className="rounded-full bg-white/10 p-2 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={close}
              title="Đóng (Esc)"
              aria-label="Đóng"
              className="rounded-full bg-white/10 p-2 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Zalo CDN links expire, so a dead image is routine — say so instead of
              leaving the operator staring at a broken 20px alt-text box. */}
          {failed ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-2 rounded-lg bg-white/5 px-8 py-10 text-center text-white/70"
            >
              <span className="text-3xl">📷</span>
              <p className="text-sm">Không tải được ảnh — liên kết gốc có thể đã hết hạn.</p>
              <a
                href={image.src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline underline-offset-4 hover:text-white"
              >
                Thử mở liên kết gốc
              </a>
            </div>
          ) : (
            /* Clicking the image itself must not close — only the backdrop does. */
            <img
              src={image.src}
              alt={image.alt || "Hình ảnh"}
              onClick={(e) => e.stopPropagation()}
              onError={() => setFailed(true)}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>,
        document.body,
      )}
    </LightboxContext.Provider>
  );
}

/**
 * Falls back to opening a tab when no provider is mounted, so a call site added
 * outside the inbox tree still shows the image instead of doing nothing.
 */
export function useImageLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (ctx) return ctx;
  return { openImage: (src: string) => { if (src) window.open(src, "_blank"); } };
}
