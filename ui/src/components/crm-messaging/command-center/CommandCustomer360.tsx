/**
 * CommandCustomer360 — Command Center · column 4a (profile + journey)
 * ─────────────────────────────────────────────────────────────────────
 * The Customer-360 deep profile card (company, phone/email grid, LTV, deal
 * stage + create-quote, tags, 4-up quick actions) plus the merged omnichannel
 * journey timeline. The AI Copilot (column 4b) is rendered separately by the
 * parent below this block in the same scroll container.
 *
 * Internal to the CrmMessaging family. Presentational; actions via callbacks.
 */
import {
  Building2,
  Route,
  FilePlus2,
  Plus,
  FileText,
  Calendar,
  Phone,
  MoreHorizontal,
  Package,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCrmProfile, CommandQuickAction } from "./types";
import type { CrmTone } from "../types";

const QUICK_ICON: Record<string, LucideIcon> = {
  "file-text": FileText,
  calendar: Calendar,
  phone: Phone,
  "more-horizontal": MoreHorizontal,
  package: Package,
  ticket: Ticket,
};

const TAG_CHIP: Record<CrmTone, string> = {
  primary: "bg-gem-primary/20 text-gem-primary border-gem-primary/30",
  cyan: "bg-gem-cyan/20 text-gem-cyan border-gem-cyan/30",
  gold: "bg-gem-gold/20 text-gem-gold border-gem-gold/30",
  success: "bg-gem-success/20 text-gem-success border-gem-success/30",
  danger: "bg-gem-danger/20 text-gem-danger border-gem-danger/30",
  warning: "bg-gem-warning/20 text-gem-warning border-gem-warning/30",
  neutral: "bg-gem-surface-raised text-gem-text border-gem-border/30",
};

const QUICK_HOVER: Record<CrmTone, string> = {
  primary: "group-hover:bg-gem-primary/20 group-hover:border-gem-primary/30 group-hover:text-gem-primary",
  cyan: "group-hover:bg-gem-cyan/20 group-hover:border-gem-cyan/30 group-hover:text-gem-cyan",
  gold: "group-hover:bg-gem-gold/20 group-hover:border-gem-gold/30 group-hover:text-gem-gold",
  success: "group-hover:bg-gem-success/20 group-hover:border-gem-success/30 group-hover:text-gem-success",
  danger: "group-hover:bg-gem-danger/20 group-hover:border-gem-danger/30 group-hover:text-gem-danger",
  warning: "group-hover:bg-gem-warning/20 group-hover:border-gem-warning/30 group-hover:text-gem-warning",
  neutral: "group-hover:bg-gem-surface-overlay group-hover:border-gem-border/30 group-hover:text-gem-text",
};

export function CommandCustomer360({
  crm,
  onEdit,
  onDealStageChange,
  onCreateQuote,
  onAddTag,
  onQuickAction,
  hideTitle = false,
  hideLtv = false,
}: {
  crm: CommandCrmProfile;
  onEdit?: () => void;
  onDealStageChange?: (stage: string) => void;
  onCreateQuote?: () => void;
  onAddTag?: () => void;
  onQuickAction?: (action: CommandQuickAction, index: number) => void;
  /** Ẩn header "Customer 360" khi panel cha đã có tiêu đề riêng (vd CustomerSidebar inbox). */
  hideTitle?: boolean;
  /** Ẩn block Lifetime Value khi panel cha đã có khối Đơn hàng/Doanh thu riêng. */
  hideLtv?: boolean;
}) {
  const tags = crm.tags ?? [];
  const quickActions = crm.quickActions ?? [];
  const journey = crm.journey ?? [];

  return (
    <>
      {!hideTitle && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-base text-gem-text uppercase tracking-wider">Customer 360</h3>
          {onEdit && (
            <button type="button" onClick={onEdit} className="text-gem-primary text-sm font-bold hover:underline">
              Sửa
            </button>
          )}
        </div>
      )}

      {/* Deep Profile Card */}
      <div className="pcard pcard-static p-4 mb-6" style={{ borderRadius: 16 }}>
        {crm.company && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-gem-text-muted uppercase tracking-wider mb-1">Company</div>
            <div className="text-base font-bold text-gem-text flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gem-primary" /> {crm.company}
            </div>
          </div>
        )}

        {(crm.phone || crm.email) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {crm.phone && (
              <div>
                <div className="text-[11px] font-bold text-gem-text-muted uppercase mb-1">Số Điện Thoại</div>
                <div className="text-sm font-semibold bg-gem-surface-raised p-1.5 rounded-lg border border-gem-border/5 text-gem-text">{crm.phone}</div>
              </div>
            )}
            {crm.email && (
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gem-text-muted uppercase mb-1">Email</div>
                <div className="text-sm font-semibold bg-gem-surface-raised p-1.5 rounded-lg border border-gem-border/5 text-gem-text truncate" title={crm.email}>
                  {crm.email}
                </div>
              </div>
            )}
          </div>
        )}

        {!hideLtv && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <div className="text-[11px] font-bold text-gem-text-muted uppercase tracking-wider">Lifetime Value</div>
              {crm.ltvDeltaLabel && (
                <div className="text-gem-success text-[11px] font-bold bg-gem-success/10 px-1.5 py-0.5 rounded border border-gem-success/20">{crm.ltvDeltaLabel}</div>
              )}
            </div>
            <div className="text-2xl font-black text-gem-text">{crm.ltv}</div>
          </div>
        )}

        {crm.dealStages && crm.dealStages.length > 0 && (
          <div className="mb-4 pt-4 border-t border-gem-border/10">
            <div className="text-[11px] font-bold text-gem-text-muted uppercase mb-2">Quy Trình Chốt Sale</div>
            <div className="flex gap-2">
              {/* Native select — Radix Select crashes in Paperclip (see CLAUDE.md). */}
              <select
                onChange={(e) => onDealStageChange?.(e.target.value)}
                className="flex-1 bg-gem-surface border border-gem-border/20 rounded-md px-2 py-1.5 text-sm font-bold text-gem-warning outline-none"
              >
                {crm.dealStages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onCreateQuote}
                title="Tạo Báo Giá / Đơn Hàng"
                className="shrink-0 px-2 py-1.5 bg-gem-primary/20 text-gem-primary font-bold text-[11px] rounded-md border border-gem-primary/30 hover:bg-gem-primary hover:text-white transition-colors"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-4 pt-4 border-t border-gem-border/10">
            <div className="text-[11px] font-bold text-gem-text-muted uppercase tracking-wider mb-2">Phân loại (Tags)</div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <span key={i} className={cn("px-2 py-1 rounded text-[11px] font-bold border", TAG_CHIP[t.tone ?? "neutral"])}>
                  {t.label}
                </span>
              ))}
              <button
                type="button"
                onClick={onAddTag}
                className="px-2 py-1 rounded border border-dashed border-gem-border/40 text-gem-text-muted hover:text-gem-text hover:border-gem-text/50 transition-colors text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm Tag
              </button>
            </div>
          </div>
        )}

        {quickActions.length > 0 && (
          <div className="pt-4 border-t border-gem-border/10 grid grid-cols-4 gap-2">
            {quickActions.map((a, i) => {
              const Icon = QUICK_ICON[a.icon] ?? MoreHorizontal;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onQuickAction?.(a, i)}
                  className="flex flex-col items-center gap-1.5 text-gem-text-muted hover:text-gem-text transition-colors group"
                >
                  <div className={cn("w-9 h-9 rounded-full bg-gem-surface-raised flex items-center justify-center border border-transparent shadow-inner transition-all", QUICK_HOVER[a.tone ?? "primary"])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">{a.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Omnichannel journey */}
      {journey.length > 0 && (
        <div className="mb-6 bg-gem-surface/30 border border-gem-border/10 rounded-xl p-4">
          <div className="text-[11px] font-bold text-gem-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Route className="w-3.5 h-3.5" /> Hành trình đa kênh
          </div>
          <div className="relative pl-3.5 border-l-2 border-gem-border/20 flex flex-col gap-4">
            {journey.map((p, i) => (
              <div key={i} className="relative">
                <div
                  className={cn(
                    "absolute -left-[19px] top-1 rounded-full border-[2px] border-gem-bg",
                    p.latest ? "w-2.5 h-2.5 bg-gem-cyan shadow-[0_0_8px_rgb(var(--gem-cyan-rgb))]" : "w-2.5 h-2.5 bg-gem-border/40",
                  )}
                />
                <div className="text-[11px] text-gem-text-muted mb-0.5 font-medium">
                  {p.when}{" "}
                  <span className="font-bold" style={p.channelColor ? { color: p.channelColor } : undefined}>
                    {p.channelLabel}
                  </span>
                </div>
                <div className={cn("text-base leading-snug", p.latest ? "text-gem-text font-medium" : "text-gem-text")}>{p.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
