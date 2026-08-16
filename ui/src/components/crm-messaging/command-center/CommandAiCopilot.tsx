/**
 * CommandAiCopilot — Command Center · column 4b (AI Copilot)
 * ────────────────────────────────────────────────────────────
 * The contextual copilot that absorbs the Objection / Upsell / Urgency widgets
 * as stateful "transform modes". Default mode shows the live Brain-Activity
 * feed + Win-Rate bar + Next-Best-Action + a tools grid + magic actions.
 * Selecting a tool plays a brain-activity transition, then morphs into that
 * mode's body (tone slider + draggable rebuttal / draggable product /
 * draggable voucher + 1-click combo). Drag items carry a JSON payload that the
 * chat composer dropzone consumes.
 *
 * Internal to the CrmMessaging family. Mode/loading/tone state is owned by the
 * parent CommandCenter; this component renders + emits callbacks.
 */
import {
  Bot,
  Minus,
  ExternalLink,
  X,
  Loader2,
  Zap,
  ShieldAlert,
  TrendingUp,
  Timer,
  Flame,
  PackagePlus,
  Gem,
  Ticket,
  GripVertical,
  GripHorizontal,
  SlidersHorizontal,
  Wand2,
  Keyboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCopilotData, CommandCopilotMode, CommandDropPayload } from "./types";
import type { CrmTone } from "../types";

const TOOL_ICON: Record<string, LucideIcon> = {
  "shield-alert": ShieldAlert,
  "trending-up": TrendingUp,
  timer: Timer,
};

const TOOL_HOVER: Record<CrmTone, string> = {
  primary: "hover:border-gem-primary/50 hover:bg-gem-primary/10",
  cyan: "hover:border-gem-cyan/50 hover:bg-gem-cyan/10",
  gold: "hover:border-gem-gold/50 hover:bg-gem-gold/10",
  success: "hover:border-gem-success/50 hover:bg-gem-success/10",
  danger: "hover:border-gem-danger/50 hover:bg-gem-danger/10",
  warning: "hover:border-gem-warning/50 hover:bg-gem-warning/10",
  neutral: "hover:border-gem-border/40 hover:bg-gem-surface-raised",
};

const TOOL_ICON_COLOR: Record<CrmTone, string> = {
  primary: "text-gem-primary",
  cyan: "text-gem-cyan",
  gold: "text-gem-gold",
  success: "text-gem-success",
  danger: "text-gem-danger",
  warning: "text-gem-warning",
  neutral: "text-gem-text-muted",
};

const MODE_HEAD: Record<Exclude<CommandCopilotMode, "default">, { title: string; icon: LucideIcon; tone: CrmTone }> = {
  objection: { title: "Xử Lý Từ Chối", icon: ShieldAlert, tone: "danger" },
  upsell: { title: "Upsell Matrix", icon: PackagePlus, tone: "cyan" },
  urgency: { title: "Cứu Đơn (Flash Deal)", icon: Timer, tone: "warning" },
};

function dragProps(payload: CommandDropPayload) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
      (e.currentTarget as HTMLElement).style.opacity = "0.5";
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.opacity = "1";
    },
  };
}

export function CommandAiCopilot({
  mode,
  loading,
  brainStageText,
  brainProgress,
  data,
  tone,
  onToneChange,
  onSelectTool,
  onClose,
  onNextBestAction,
  onExecuteCombo,
}: {
  mode: CommandCopilotMode;
  loading: boolean;
  brainStageText: string;
  brainProgress: number;
  data: CommandCopilotData;
  tone: number;
  onToneChange?: (tone: number) => void;
  onSelectTool?: (mode: Exclude<CommandCopilotMode, "default">) => void;
  onClose?: () => void;
  onNextBestAction?: () => void;
  onExecuteCombo?: () => void;
}) {
  const head = mode !== "default" ? MODE_HEAD[mode] : null;

  return (
    <div className="mb-2 bg-gradient-to-b from-gem-surface-raised to-gem-surface-overlay border border-gem-primary/30 rounded-xl overflow-hidden shadow-[0_5px_20px_rgb(var(--gem-primary-rgb)/0.15)] relative">
      {/* Header */}
      <div className="p-3 border-b border-gem-primary/20 flex justify-between items-center bg-gem-surface-raised/60">
        <div className="flex items-center gap-2 min-w-0">
          {head ? (
            <>
              <div className={cn("w-6 h-6 rounded flex items-center justify-center bg-gem-surface-overlay", TOOL_ICON_COLOR[head.tone])}>
                <head.icon className="w-3.5 h-3.5" />
              </div>
              <span className={cn("text-sm font-black uppercase tracking-widest truncate", TOOL_ICON_COLOR[head.tone])}>{head.title}</span>
            </>
          ) : (
            <>
              <div className="relative w-6 h-6 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gem-primary relative z-10" />
                <div className="absolute inset-0 bg-gem-primary/30 blur-md rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-black text-gem-text tracking-widest uppercase">AI Copilot</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {head ? (
            <button type="button" onClick={onClose} title="Đóng" className="text-gem-text-muted hover:text-gem-text bg-gem-surface-overlay/50 rounded-full p-1 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button type="button" title="Thu nhỏ" className="text-gem-text-muted hover:text-gem-text transition-colors"><Minus className="w-3.5 h-3.5" /></button>
              <button type="button" title="Pop-out" className="text-gem-text-muted hover:text-gem-text transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>

      {/* Loading takeover (brain activity) */}
      {loading ? (
        <div className="h-44 flex flex-col justify-center items-center text-center font-mono text-[11px] p-4">
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-gem-cyan/20 blur-md rounded-full animate-pulse" />
            <Loader2 className="w-8 h-8 relative z-10 text-gem-cyan animate-spin" />
          </div>
          <div className="tracking-widest text-gem-cyan font-bold w-full truncate">{brainStageText || "Initializing AI..."}</div>
          <div className="w-full h-1 bg-gem-border/30 rounded mt-4 overflow-hidden">
            <div className="h-full bg-gem-cyan transition-all duration-200" style={{ width: `${brainProgress}%` }} />
          </div>
        </div>
      ) : mode === "default" ? (
        <>
          {/* Live Brain Activity (ambient) + Win Rate */}
          <div className="p-3 bg-gem-bg/40 border-b border-gem-border/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gem-cyan/5 to-transparent crm-shimmer" />
            <div className="flex items-center gap-2 relative z-10 mb-3">
              <Loader2 className="w-3 h-3 text-gem-cyan animate-spin" />
              <span className="text-[10px] text-gem-cyan font-mono tracking-widest uppercase truncate">{data.brainStages?.[0] ?? "Quét DB Khách VIP → Tính xác suất..."}</span>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-gem-text-muted uppercase tracking-wider">Tỉ lệ chốt đơn (Win Rate)</span>
                <span className="text-gem-success drop-shadow-[0_0_5px_rgb(var(--gem-success-rgb))]">{data.winRateLabel}</span>
              </div>
              <div className="w-full bg-gem-surface h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-gem-primary to-gem-success h-full rounded-full shadow-[0_0_10px_rgb(var(--gem-success-rgb))] relative overflow-hidden"
                  style={{ width: `${data.winRatePct}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent crm-shimmer opacity-50" />
                </div>
              </div>
            </div>
          </div>

          {/* Next Best Action */}
          <div className="p-3 border-b border-gem-border/10 relative overflow-hidden bg-gem-surface-overlay/30">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gem-cyan/10 rounded-full blur-xl" />
            <div className="text-[11px] text-gem-text-muted font-bold uppercase mb-1 flex items-center gap-1 relative z-10">
              <Zap className="w-3 h-3 text-gem-gold" /> Next Best Action
            </div>
            <div className="text-sm text-gem-text font-medium mb-3 leading-relaxed relative z-10">{data.nextBestActionText}</div>
            <button
              type="button"
              onClick={onNextBestAction}
              className="w-full py-1.5 bg-gem-cyan/20 text-gem-cyan text-xs font-bold rounded border border-gem-cyan/30 hover:bg-gem-cyan hover:text-white transition-all shadow-[0_0_10px_rgb(var(--gem-cyan-rgb)/0.2)] hover:shadow-[0_0_15px_rgb(var(--gem-cyan-rgb)/0.5)] relative z-10"
            >
              {data.nextBestActionCta}
            </button>
          </div>

          {/* Tools Grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            {data.tools.map((t) => {
              const Icon = TOOL_ICON[t.icon] ?? ShieldAlert;
              return (
                <button
                  key={t.mode}
                  type="button"
                  onClick={() => onSelectTool?.(t.mode)}
                  className={cn(
                    "flex flex-col items-start p-2 rounded-lg bg-gem-surface-overlay/80 border border-gem-border/20 transition-all text-left group/tool",
                    TOOL_HOVER[t.tone],
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={cn("w-3.5 h-3.5", TOOL_ICON_COLOR[t.tone])} />
                    <GripVertical className="w-3 h-3 text-gem-text-muted opacity-0 group-hover/tool:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] font-bold text-gem-text mb-0.5">{t.label}</span>
                  <span className="text-[9px] text-gem-text-muted line-clamp-1">{t.hint}</span>
                </button>
              );
            })}
          </div>

          {/* Magic AI Actions */}
          <div className="px-3 pb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectTool?.("objection")}
              title="Trượt để đổi Tone giọng"
              className="flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded border border-gem-border/30 bg-gem-surface-overlay hover:bg-gem-surface-raised transition-colors text-[11px] font-medium text-gem-text-muted hover:text-gem-text"
            >
              <SlidersHorizontal className="w-3 h-3" /> Tone Matcher
            </button>
            <button
              type="button"
              title="Magic Rewrite trong khung soạn tin"
              className="flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded border border-gem-primary/30 bg-gem-primary/10 hover:bg-gem-primary hover:text-white transition-all text-[11px] font-medium text-gem-primary shadow-[inset_0_0_10px_rgb(var(--gem-primary-rgb)/0.1)] group/magic"
            >
              <Wand2 className="w-3 h-3 group-hover/magic:rotate-12 transition-transform" /> Magic Rewrite
            </button>
          </div>

          {/* Footer hints */}
          <div className="bg-gem-bg/60 py-1.5 px-3 flex justify-between items-center text-[9px] text-gem-text-muted uppercase tracking-widest border-t border-gem-border/10">
            <div className="flex items-center gap-1"><GripHorizontal className="w-2.5 h-2.5" /> Smart Drag &amp; Drop</div>
            <div className="flex items-center gap-1 text-gem-cyan/70"><Keyboard className="w-2.5 h-2.5 animate-pulse" /> Ghost-Typing</div>
          </div>
        </>
      ) : mode === "objection" ? (
        <div className="p-4">
          <div className="text-[11px] text-gem-danger font-bold mb-2 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> ĐỀ XUẤT TỪ AI ({data.objection.winRateLabel ?? "Tỉ lệ chốt: 85%"})
          </div>
          {/* Tone Matcher slider */}
          <div className="mb-3 px-1 mt-3">
            <div className="flex justify-between text-[10px] text-gem-text-muted font-bold uppercase mb-2">
              <span>Mềm mỏng</span>
              <span className="text-gem-danger">Tone Giọng</span>
              <span>Đanh thép</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              value={tone}
              onChange={(e) => onToneChange?.(Number(e.target.value))}
              className="w-full h-1 bg-gem-border/30 rounded-lg appearance-none cursor-pointer accent-gem-danger"
            />
          </div>
          {/* Draggable rebuttal */}
          <div
            {...dragProps({ kind: "text", text: data.objection.toneVariants[tone - 1] ?? data.objection.toneVariants[0]! })}
            className="p-3 bg-gem-danger/10 border border-gem-danger/20 rounded-lg text-sm text-gem-text mb-2 cursor-grab active:cursor-grabbing hover:border-gem-danger/50 hover:bg-gem-danger/20 transition-all shadow-sm hover:shadow-[0_5px_15px_rgb(var(--gem-danger-rgb)/0.2)]"
          >
            "{data.objection.toneVariants[tone - 1] ?? data.objection.toneVariants[0]}"
          </div>
          <div className="text-[11px] text-center text-gem-text-muted mt-2 animate-pulse">
            Kéo đoạn text thả vào ô Chat bên trái, hoặc nhấn TAB
          </div>
        </div>
      ) : mode === "upsell" ? (
        <div className="p-4">
          <div className="text-[11px] text-gem-cyan font-bold mb-2 flex items-center gap-1">
            <PackagePlus className="w-3 h-3" /> GỢI Ý SẢN PHẨM CAO CẤP
          </div>
          <div
            {...dragProps({ kind: "product", name: data.upsell.productName, price: data.upsell.price })}
            className="flex gap-3 bg-gem-cyan/10 border border-gem-cyan/20 rounded-lg p-2 mb-2 items-center hover:bg-gem-cyan/20 transition-all cursor-grab active:cursor-grabbing hover:border-gem-cyan/50 shadow-sm hover:shadow-[0_5px_15px_rgb(var(--gem-cyan-rgb)/0.2)]"
          >
            <div className="w-12 h-12 rounded bg-gem-surface flex items-center justify-center border border-gem-cyan/30 shrink-0">
              <Gem className="w-6 h-6 text-gem-cyan" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-gem-text leading-tight truncate">{data.upsell.productName}</div>
              <div className="text-sm text-gem-cyan font-bold mt-0.5">{data.upsell.price}</div>
            </div>
          </div>
          <div className="text-[11px] text-center text-gem-text-muted mt-3 animate-pulse">Kéo Thẻ Sản Phẩm thả vào ô Chat bên trái</div>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-[11px] text-gem-warning font-bold mb-2 flex items-center gap-1">
            <Flame className="w-3 h-3" /> KHÁCH ĐANG DO DỰ!
          </div>
          <p className="text-sm text-gem-text-muted mb-3 leading-relaxed">Tạo nhanh 1 mã Freeship + Giảm 5% có hiệu lực 15 phút để ép chốt ngay.</p>
          <div
            {...dragProps({ kind: "voucher", code: data.urgency.code, countdownLabel: data.urgency.countdownLabel })}
            className="flex gap-2 mb-2 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform shadow-sm hover:shadow-[0_5px_15px_rgb(var(--gem-warning-rgb)/0.2)]"
          >
            <div className="flex-1 bg-gem-surface border border-gem-border/20 rounded p-2 text-center text-gem-text font-bold text-base tracking-widest border-dashed">{data.urgency.code}</div>
            <div className="w-16 bg-gem-warning/10 border border-gem-warning/30 rounded p-2 text-center text-gem-warning font-bold text-base shrink-0 flex items-center justify-center">{data.urgency.countdownLabel}</div>
          </div>
          <div className="text-[11px] text-center text-gem-text-muted mt-3 animate-pulse">Kéo Voucher thả vào ô Chat bên trái</div>
          {/* 1-Click Combo */}
          <div className="mt-3 border-t border-gem-border/20 pt-3">
            <button
              type="button"
              onClick={onExecuteCombo}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-gem-primary/10 to-gem-warning/10 border border-gem-warning/30 hover:border-gem-warning rounded p-2 flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgb(var(--gem-warning-rgb)/0.1)] hover:shadow-[0_0_20px_rgb(var(--gem-warning-rgb)/0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gem-primary/20 to-gem-warning/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center gap-1 text-[11px] uppercase font-black tracking-widest text-gem-text mb-1">
                <Zap className="w-3 h-3 text-gem-warning" /> COMBO CHỐT SALE
              </div>
              <div className="relative z-10 text-[10px] text-gem-text-muted text-center leading-tight">[Gửi Voucher] + [Hối Thúc]</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
