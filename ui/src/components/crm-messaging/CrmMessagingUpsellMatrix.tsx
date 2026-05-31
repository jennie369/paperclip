/**
 * CrmMessagingUpsellMatrix — Upsell / Cross-sell Matrix
 * ─────────────────────────────────────────────────────
 * Two-pane layout: left = ongoing customer chat, right = an AI upsell panel
 * that reads a keyword from the conversation and recommends products to drag
 * into the chat (paid upsell, or a free lead-magnet). Each recommendation
 * shows icon, name, price and a CTA.
 *
 * Ported from the Gemral CRM mockup ("UPSELL / CROSS-SELL MATRIX").
 * Theme-aware via gem-* tokens. Presentational; CTA clicks surface via onPick.
 *
 * @param {string} [customerName] - Header name of the left chat pane.
 * @param {UpsellMessage[]} [messages] - Chat transcript (from "them" | "me").
 * @param {string} [panelTitle="Upsell Matrix (AI)"] - Right panel heading.
 * @param {string} [keyword="TradingView"] - Detected keyword the suggestions key off.
 * @param {UpsellProduct[]} [products] - Recommended products.
 * @param {(product: UpsellProduct, index: number) => void} [onPick] - Product CTA handler.
 * @param {string} [className] - Extra classes on the card root.
 */
import { PackagePlus, LineChart, LayoutTemplate } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { vnd } from "./_shared";

export interface UpsellMessage {
  from: "them" | "me";
  text: string;
}

export interface UpsellProduct {
  name: string;
  /** Number → formatted VND, or a free-form string like "Free (Lead Magnet)". */
  price: number | string;
  icon?: LucideIcon;
  ctaLabel: string;
  /** Highlight (primary recommendation) vs muted secondary. */
  highlight?: boolean;
}

const SAMPLE_MESSAGES: UpsellMessage[] = [
  { from: "me", text: 'Chào Linh, khóa học "Pro Trading" bạn đang học đến đâu rồi?' },
  {
    from: "them",
    text: "Mình học xong bài 5 rồi, thấy khá hay nhưng phần vẽ Chart trên TradingView mình còn hơi lúng túng.",
  },
];

const SAMPLE_PRODUCTS: UpsellProduct[] = [
  {
    name: "Mastering TradingView",
    price: 450000,
    icon: LineChart,
    ctaLabel: "Kéo thả vào Chat (Drag)",
    highlight: true,
  },
  {
    name: "Template Chart Chuẩn",
    price: "Free (Lead Magnet)",
    icon: LayoutTemplate,
    ctaLabel: "Tặng miễn phí",
  },
];

export function CrmMessagingUpsellMatrix({
  customerName = "Đoàn Linh",
  messages = SAMPLE_MESSAGES,
  panelTitle = "Upsell Matrix (AI)",
  keyword = "TradingView",
  products = SAMPLE_PRODUCTS,
  onPick,
  className,
}: {
  customerName?: string;
  messages?: UpsellMessage[];
  panelTitle?: string;
  keyword?: string;
  products?: UpsellProduct[];
  onPick?: (product: UpsellProduct, index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard p-0 h-[550px] flex">
        {/* Left: chat */}
        <div className="w-7/12 border-r border-gem-border/10 flex flex-col relative bg-gem-surface/30">
          <div className="h-14 border-b border-gem-border/10 flex items-center px-4 bg-gem-surface/80 backdrop-blur-md z-10">
            <span className="font-bold text-gem-text text-sm">{customerName}</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-end gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 max-w-[80%] text-sm",
                  m.from === "me" ? "chat-bubble-sent self-end" : "chat-bubble-received self-start",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: upsell panel */}
        <div className="w-5/12 flex flex-col relative overflow-hidden">
          <div
            className="aura aura-pulse"
            style={{
              background: "rgb(var(--gem-cyan-rgb))",
              width: 300,
              height: 300,
              top: 0,
              right: 0,
              opacity: "calc(var(--gem-aura-strength) * 0.6)",
            }}
          />
          <div className="h-14 border-b border-gem-border/10 flex items-center px-4 z-10">
            <span className="text-xs font-black tracking-widest text-gem-cyan uppercase flex items-center gap-1">
              <PackagePlus className="w-4 h-4" /> {panelTitle}
            </span>
          </div>
          <div className="flex-1 p-4 z-10 space-y-4 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] text-gem-text-muted">
              Dựa trên từ khóa <span className="text-gem-cyan">"{keyword}"</span>, hệ thống đề xuất:
            </div>

            {products.map((p, i) => {
              const Icon = p.icon ?? LineChart;
              return (
                <div
                  key={i}
                  className={cn(
                    "pcard-inner p-3 transition-colors group",
                    p.highlight
                      ? "border-gem-cyan/30 bg-gem-cyan/5 hover:bg-gem-cyan/10 cursor-pointer"
                      : "border-gem-border/20 opacity-70 hover:opacity-100 transition-opacity",
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded bg-gem-surface-overlay flex items-center justify-center shrink-0 border border-gem-border/20 transition-colors",
                        p.highlight && "group-hover:border-gem-cyan/50",
                      )}
                    >
                      <Icon className={cn("w-6 h-6", p.highlight ? "text-gem-cyan" : "text-gem-text-muted")} />
                    </div>
                    <div>
                      <div className={cn("font-bold text-sm leading-tight", p.highlight ? "text-gem-text" : "text-gem-text")}>
                        {p.name}
                      </div>
                      <div className={cn("text-xs font-bold mt-1", p.highlight ? "text-gem-cyan" : "text-gem-text")}>
                        {vnd(p.price)}
                      </div>
                      <button
                        type="button"
                        onClick={() => onPick?.(p, i)}
                        className={cn(
                          "mt-2 text-[10px] px-2 py-1 rounded font-bold transition-colors border",
                          p.highlight
                            ? "bg-gem-cyan/20 text-gem-cyan hover:bg-gem-cyan hover:text-black border-gem-cyan/30"
                            : "bg-gem-surface-raised text-gem-text hover:bg-gem-surface-overlay border-gem-border/20",
                        )}
                      >
                        {p.ctaLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingUpsellMatrix;
