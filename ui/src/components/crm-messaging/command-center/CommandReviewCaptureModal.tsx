/**
 * CommandReviewCaptureModal — AI Capture Review (global modal)
 * ─────────────────────────────────────────────────────────────
 * Opened from a positive-sentiment message's "AI Capture Review" button. Lets
 * the agent push the customer's praise into review destinations (Landing Page
 * testimonial widget / Shopify store reviews) with a one-tap publish + a success
 * overlay. Destination toggles are local UX; publish surfaces via onPublish.
 *
 * Internal to the CrmMessaging family. Theme-aware via gem-* tokens; the modal
 * keeps the mockup's gold accent (positive sentiment).
 */
import { useEffect, useState } from "react";
import { Star, X, CheckCircle, Check, Sparkles, LayoutTemplate, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "../_shared";
import type { CommandReviewCapture, CommandReviewDestination } from "./types";

const DEST_ICON: Record<string, typeof LayoutTemplate> = {
  "layout-template": LayoutTemplate,
  "shopping-bag": ShoppingBag,
};

export function CommandReviewCaptureModal({
  open,
  capture,
  onClose,
  onPublish,
}: {
  open: boolean;
  capture: CommandReviewCapture;
  onClose?: () => void;
  onPublish?: (payload: { text: string; destinationIds: string[] }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);

  // Enter animation + reset state each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setSuccess(false);
    setActive(Object.fromEntries(capture.destinations.map((d) => [d.id, d.active ?? true])));
    const id = setTimeout(() => setMounted(true), 10);
    return () => {
      clearTimeout(id);
      setMounted(false);
    };
  }, [open, capture.destinations]);

  if (!open) return null;

  function toggle(id: string) {
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function publish() {
    const destinationIds = capture.destinations.filter((d) => active[d.id]).map((d) => d.id);
    onPublish?.({ text: capture.text, destinationIds });
    setSuccess(true);
    setTimeout(() => onClose?.(), 2000);
  }

  return (
    <div className="crm-scope fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          "relative bg-gem-surface border border-gem-gold/30 rounded-xl shadow-[0_10px_40px_rgb(var(--gem-gold-rgb)/0.15)] w-[500px] max-w-[90vw] overflow-hidden flex flex-col transition-transform duration-300",
          mounted ? "scale-100" : "scale-95",
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gem-border/20 bg-gradient-to-r from-gem-gold/10 to-transparent flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gem-gold/20 flex items-center justify-center border border-gem-gold/30">
              <Star className="w-4 h-4 text-gem-gold fill-gem-gold" />
            </div>
            <div>
              <h3 className="font-bold text-gem-text tracking-wide">AI Capture Review</h3>
              <p className="text-[10px] text-gem-gold uppercase tracking-widest font-bold">Sentiment Detected: Positive</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gem-text-muted hover:text-gem-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gem-text-muted mb-2 uppercase tracking-wider">
              Review Text <span className="text-gem-gold">*</span>
            </label>
            <textarea
              readOnly
              value={capture.text}
              className="w-full bg-gem-surface-raised border border-gem-border/30 rounded-lg p-3 text-sm text-gem-text focus:outline-none resize-none h-24 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gem-text-muted mb-2 uppercase tracking-wider">
              Destinations <span className="text-gem-gold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {capture.destinations.map((d) => {
                const Icon = DEST_ICON[d.icon] ?? LayoutTemplate;
                const on = active[d.id];
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggle(d.id)}
                    style={d.color ? { borderColor: on ? `${d.color}80` : undefined } : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-3 text-left transition-all border",
                      on
                        ? "bg-gem-primary/20 border-gem-primary/50 text-gem-text"
                        : "bg-gem-surface-raised border-gem-border/20 text-gem-text-muted opacity-50 grayscale",
                    )}
                  >
                    <Icon className="w-4 h-4" style={d.color ? { color: d.color } : undefined} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{d.label}</div>
                      <div className="text-[10px] text-gem-text-muted truncate">{d.sublabel}</div>
                    </div>
                    {on && <CheckCircle className="w-4 h-4 shrink-0" style={d.color ? { color: d.color } : undefined} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gem-surface-raised p-3 rounded-lg border border-gem-border/20">
            {capture.customerAvatarUrl ? (
              <img src={capture.customerAvatarUrl} alt={capture.customerName} className="w-8 h-8 rounded-full border border-gem-border/30 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full border border-gem-border/30 bg-gem-gold/20 flex items-center justify-center text-gem-gold font-bold text-[11px]">
                {initials(capture.customerName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gem-text truncate">{capture.customerName}</div>
              <div className="text-[10px] text-gem-text-muted truncate">{capture.customerMeta}</div>
            </div>
            <div className="text-[10px] bg-gem-gold/20 text-gem-gold px-2 py-1 rounded border border-gem-gold/30 font-bold flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" /> AI Verified
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gem-border/20 bg-gem-surface-raised flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-gem-border/30 text-gem-text hover:bg-gem-surface transition-all text-sm font-bold">
            Cancel
          </button>
          <button
            type="button"
            onClick={publish}
            className="px-6 py-2 rounded bg-gradient-to-r from-gem-gold to-amber-400 text-black shadow-[0_0_15px_rgb(var(--gem-gold-rgb)/0.4)] hover:shadow-[0_0_25px_rgb(var(--gem-gold-rgb)/0.6)] hover:scale-105 transition-all text-sm font-black flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Publish Review
          </button>
        </div>

        {/* Success overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gem-surface/90 backdrop-blur-md z-10 flex flex-col items-center justify-center transition-opacity duration-300",
            success ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
        >
          <div
            className={cn(
              "w-16 h-16 rounded-full bg-gem-gold/20 flex items-center justify-center border-2 border-gem-gold text-gem-gold mb-4 transition-transform duration-500",
              success ? "scale-100" : "scale-0",
            )}
          >
            <Check className="w-8 h-8" />
          </div>
          <h2 className={cn("text-xl font-black text-gem-text tracking-wide mb-1 transition-all duration-500", success ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
            Đã đăng thành công!
          </h2>
          <p className={cn("text-sm text-gem-gold transition-all duration-500 delay-100", success ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
            Review đã được đẩy vào các kênh đã chọn.
          </p>
        </div>
      </div>
    </div>
  );
}
