/**
 * CrmMessagingScriptLibrary — Winning Script Library & A/B Tester
 * ───────────────────────────────────────────────────────────────
 * A grid of reusable sales scripts, each tagged with its measured conversion
 * rate (A/B variants). Hovering a card reveals a "copy to chat" action. The
 * best-converting variant is tinted success; weaker variants warning; the
 * "B" variant uses a dashed border to read as the experiment arm.
 *
 * Ported from the Gemral CRM mockup ("SCRIPT LIBRARY & A/B TESTER").
 * Theme-aware via gem-* tokens. Presentational; copy clicks surface via onCopy.
 *
 * @param {string} [title="Winning Script Library"] - Card heading.
 * @param {ScriptItem[]} [scripts] - Scripts to display (rendered in a 2-col grid).
 * @param {(script: ScriptItem, index: number) => void} [onCopy] - "Copy to chat" handler.
 * @param {string} [className] - Extra classes on the card root.
 */
import { Library, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScriptItem {
  title: string;
  /** Conversion rate label, e.g. "Conv: 18.5%". */
  convLabel: string;
  /** Accent for the conv badge: success (winner) | warning (lower). */
  convTone?: "success" | "warning" | "primary";
  body: string;
  /** Dashed border + "experiment" feel (e.g. the B variant). */
  variant?: boolean;
}

const SAMPLE_SCRIPTS: ScriptItem[] = [
  {
    title: "Chốt Sale Cuối Tháng (Mẫu A)",
    convLabel: "Conv: 18.5%",
    convTone: "success",
    body: '"Chỉ còn 2 slot cuối cùng cho gói ưu đãi tháng này. Nếu anh/chị chuyển khoản trong hôm nay..."',
  },
  {
    title: "Chốt Sale Cuối Tháng (Mẫu B)",
    convLabel: "Conv: 12.1%",
    convTone: "warning",
    body: '"Đừng bỏ lỡ cơ hội nhận ngay khuyến mãi lớn nhất trong năm. Hãy đăng ký ngay..."',
    variant: true,
  },
];

const CONV_CHIP: Record<NonNullable<ScriptItem["convTone"]>, string> = {
  success: "bg-gem-success/20 text-gem-success",
  warning: "bg-gem-warning/20 text-gem-warning",
  primary: "bg-gem-primary/20 text-gem-primary",
};

export function CrmMessagingScriptLibrary({
  title = "Winning Script Library",
  scripts = SAMPLE_SCRIPTS,
  onCopy,
  className,
}: {
  title?: string;
  scripts?: ScriptItem[];
  onCopy?: (script: ScriptItem, index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard p-6 border-gem-primary/20">
        <h3 className="text-sm font-black text-gem-text uppercase tracking-widest mb-4 flex items-center gap-2">
          <Library className="w-5 h-5 text-gem-primary" /> {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scripts.map((s, i) => (
            <div
              key={i}
              className={cn(
                "pcard-inner p-4 hover:border-gem-primary/50 transition-colors cursor-pointer group",
                s.variant && "border-dashed border-gem-border/30",
              )}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="text-xs font-bold text-gem-text">{s.title}</div>
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 rounded shrink-0",
                    CONV_CHIP[s.convTone ?? "primary"],
                  )}
                >
                  {s.convLabel}
                </span>
              </div>
              <p className="text-[11px] text-gem-text-muted line-clamp-2 mb-3">{s.body}</p>
              <button
                type="button"
                onClick={() => onCopy?.(s, i)}
                className="text-[10px] uppercase font-bold text-gem-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3 h-3" /> Copy to chat
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingScriptLibrary;
