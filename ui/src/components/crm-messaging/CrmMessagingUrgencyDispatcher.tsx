/**
 * CrmMessagingUrgencyDispatcher — Urgency / Flash Deal Dispatcher
 * ───────────────────────────────────────────────────────────────
 * Left: a compose form to mint a time-boxed discount code (percent + countdown
 * minutes) to drop into a chat and force a close. Right: a live preview of the
 * flash-deal card the customer will receive, with an animated countdown.
 *
 * Ported from the Gemral CRM mockup ("URGENCY / FLASH DEAL DISPATCHER").
 * The preview card keeps the mockup's fixed red/white palette (it represents
 * an outgoing branded coupon, not app chrome) — intentionally NOT theme-flipped.
 * The form/left pane IS theme-aware. The countdown ticks live (display only).
 *
 * @param {string} [title="Flash Deal Dispatcher"] - Left pane heading.
 * @param {string} [description] - Helper text under the title.
 * @param {number} [discountPercent=30] - Initial discount percent (controlled if onChange provided).
 * @param {number} [countdownMinutes=15] - Initial countdown minutes.
 * @param {(next: { discountPercent: number; countdownMinutes: number }) => void} [onChange] - Field change handler.
 * @param {(payload: { discountPercent: number; countdownMinutes: number }) => void} [onDispatch] - "Create & send" handler.
 * @param {boolean} [live=true] - Animate the preview countdown each second.
 * @param {string} [className] - Extra classes on the card root.
 */
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Inline dotted-grid background (from mockup base64 SVG) — neutral, theme-safe.
const DOT_BG =
  "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=\")";

export function CrmMessagingUrgencyDispatcher({
  title = "Flash Deal Dispatcher",
  description = "Tạo mã giảm giá độc quyền có thời hạn đếm ngược trực tiếp trong tin nhắn để ép chốt sale.",
  discountPercent = 30,
  countdownMinutes = 15,
  onChange,
  onDispatch,
  live = true,
  className,
}: {
  title?: string;
  description?: string;
  discountPercent?: number;
  countdownMinutes?: number;
  onChange?: (next: { discountPercent: number; countdownMinutes: number }) => void;
  onDispatch?: (payload: { discountPercent: number; countdownMinutes: number }) => void;
  live?: boolean;
  className?: string;
}) {
  const [pct, setPct] = useState(discountPercent);
  const [mins, setMins] = useState(countdownMinutes);
  // Preview countdown — starts a hair under the configured minutes (mockup showed 14:59).
  const [remaining, setRemaining] = useState(countdownMinutes * 60 - 1);

  useEffect(() => {
    setPct(discountPercent);
  }, [discountPercent]);
  useEffect(() => {
    setMins(countdownMinutes);
    setRemaining(countdownMinutes * 60 - 1);
  }, [countdownMinutes]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 0 ? mins * 60 - 1 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [live, mins]);

  function update(next: Partial<{ pct: number; mins: number }>) {
    const np = next.pct ?? pct;
    const nm = next.mins ?? mins;
    if (next.pct !== undefined) setPct(np);
    if (next.mins !== undefined) {
      setMins(nm);
      setRemaining(nm * 60 - 1);
    }
    onChange?.({ discountPercent: np, countdownMinutes: nm });
  }

  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard p-0 flex h-[350px]">
        {/* Left: compose form */}
        <div className="w-1/2 p-6 flex flex-col justify-center bg-gem-surface/50 border-r border-gem-border/10 relative overflow-hidden">
          <div
            className="aura aura-pulse"
            style={{
              background: "rgb(var(--gem-danger-rgb))",
              width: 300,
              height: 300,
              left: -50,
              opacity: "calc(var(--gem-aura-strength) * 0.8)",
            }}
          />
          <h3 className="text-sm font-black text-gem-danger uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
            <Timer className="w-5 h-5" /> {title}
          </h3>
          <p className="text-xs text-gem-text-muted mb-6 relative z-10">{description}</p>

          <div className="space-y-3 relative z-10">
            <div className="flex gap-2">
              <input
                type="number"
                value={pct}
                onChange={(e) => update({ pct: Number(e.target.value) || 0 })}
                className="w-16 bg-gem-surface-raised border border-gem-border/20 rounded px-2 text-center text-gem-text text-sm font-bold focus:outline-none focus:border-gem-danger/50"
              />
              <span className="text-sm self-center text-gem-text">% Giảm giá</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={mins}
                onChange={(e) => update({ mins: Number(e.target.value) || 0 })}
                className="w-16 bg-gem-surface-raised border border-gem-border/20 rounded px-2 text-center text-gem-text text-sm font-bold focus:outline-none focus:border-gem-danger/50"
              />
              <span className="text-sm self-center text-gem-text">Phút đếm ngược</span>
            </div>
            <button
              type="button"
              onClick={() => onDispatch?.({ discountPercent: pct, countdownMinutes: mins })}
              className="mt-2 bg-gem-danger text-white px-4 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_rgb(var(--gem-danger-rgb)/0.4)] hover:brightness-110 transition-all w-full"
            >
              Tạo &amp; Gửi Mã
            </button>
          </div>
        </div>

        {/* Right: outgoing coupon preview (fixed brand palette) */}
        <div className="w-1/2 flex items-center justify-center" style={{ backgroundImage: DOT_BG }}>
          <div className="w-[80%] bg-white rounded-xl shadow-2xl overflow-hidden transform rotate-2 flash-ring">
            <div className="bg-red-600 p-3 text-center">
              <div className="text-[10px] text-white/80 font-bold uppercase tracking-widest mb-1">Mã Ưu Đãi Độc Quyền</div>
              <div className="text-2xl font-black text-white">GIẢM {pct}%</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-2">Chỉ còn hiệu lực trong:</div>
              <div className="text-xl font-black text-red-600 font-mono tracking-widest bg-red-50 py-2 rounded-lg border border-red-100">
                {fmtCountdown(Math.max(0, remaining))}
              </div>
              <button type="button" className="mt-3 w-full bg-black text-white text-xs font-bold py-2 rounded">
                Áp dụng ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingUrgencyDispatcher;
