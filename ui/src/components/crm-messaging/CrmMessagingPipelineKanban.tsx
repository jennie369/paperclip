/**
 * CrmMessagingPipelineKanban — Lead Pipeline (Kanban)
 * ────────────────────────────────────────────────────
 * Horizontal kanban of lead stages (New Lead → In Progress → Follow Up → Won).
 * Each column has a colored status dot + count; cards show the contact (avatar
 * or initials + channel badge), a snippet, meta footer (time / value / tags)
 * and a status chip. Cards lift + glow on hover (cursor-grab affordance).
 *
 * Ported from the Gemral CRM mockup ("PIPELINE KANBAN (Lead Management)").
 * Theme-aware via gem-* tokens. Presentational; header actions + card clicks
 * surface via callbacks. Drag is visual-only here (real DnD wired by parent).
 *
 * @param {string} [title="Lead Pipeline"] - Header title.
 * @param {string} [subtitle] - Sub-line under the title.
 * @param {string} [filterLabel="Filter: Tháng Này"] - Left header button label.
 * @param {() => void} [onFilter] - Filter button handler.
 * @param {() => void} [onAddLead] - "Add Lead" button handler.
 * @param {KanbanColumn[]} [columns] - Pipeline columns with their cards.
 * @param {(card: KanbanCard, columnId: string) => void} [onCardClick] - Card click handler.
 * @param {string} [className] - Extra classes on the card root.
 */
import { Kanban, Filter, Plus, Clock, MessageSquare, CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials, vnd } from "./_shared";
import type { CrmChannel, CrmTone } from "./types";

export interface KanbanCard {
  id: string;
  name: string;
  channel: CrmChannel;
  /** Optional avatar URL; falls back to initials chip. */
  avatarUrl?: string;
  /** Small line under the name (source / OA / estimate). */
  meta?: string;
  /** Highlight the meta line in gold (e.g. estimated deal value). */
  metaGold?: boolean;
  /** Snippet body (quote / note). */
  snippet?: string;
  /** Small pill tags inside the card. */
  tags?: string[];
  /** Footer status chip text. */
  statusLabel?: string;
  statusTone?: CrmTone;
  /** Relative time string in the footer. */
  time?: string;
  /** Reminder line (e.g. "Nhắc lịch gọi 14:00"). */
  reminder?: string;
  /** Won-card amount (renders the success money block). */
  amount?: number | string;
  /** Won-card sub-line (payment method). */
  amountNote?: string;
}

export interface KanbanColumn {
  id: string;
  label: string;
  tone: CrmTone;
  count: number;
  cards: KanbanCard[];
}

const DOT: Record<CrmTone, string> = {
  primary: "bg-gem-primary shadow-[0_0_8px_rgb(var(--gem-primary-rgb))]",
  cyan: "bg-gem-cyan shadow-[0_0_8px_rgb(var(--gem-cyan-rgb))]",
  gold: "bg-gem-gold shadow-[0_0_8px_rgb(var(--gem-gold-rgb))]",
  success: "bg-gem-success shadow-[0_0_8px_rgb(var(--gem-success-rgb))]",
  danger: "bg-gem-danger shadow-[0_0_8px_rgb(var(--gem-danger-rgb))]",
  warning: "bg-gem-warning shadow-[0_0_8px_rgb(var(--gem-warning-rgb))]",
  neutral: "bg-gem-border/40",
};
const HOVER_BORDER: Record<CrmTone, string> = {
  primary: "hover:border-gem-primary/50 hover:shadow-[0_4px_15px_rgb(var(--gem-primary-rgb)/0.15)]",
  cyan: "hover:border-gem-cyan/50 hover:shadow-[0_4px_15px_rgb(var(--gem-cyan-rgb)/0.15)]",
  gold: "hover:border-gem-gold/50",
  success: "hover:border-gem-success/50",
  danger: "hover:border-gem-danger/50",
  warning: "hover:border-gem-warning/50",
  neutral: "hover:border-gem-border/40",
};
const CHIP: Record<CrmTone, string> = {
  primary: "bg-gem-primary/20 text-gem-primary",
  cyan: "bg-gem-cyan/20 text-gem-cyan",
  gold: "bg-gem-gold/20 text-gem-gold",
  success: "bg-gem-success/20 text-gem-success",
  danger: "bg-gem-danger/20 text-gem-danger",
  warning: "bg-gem-warning/20 text-gem-warning",
  neutral: "bg-gem-surface-raised text-gem-text-muted",
};

const SAMPLE_COLUMNS: KanbanColumn[] = [
  {
    id: "new",
    label: "New Lead",
    tone: "cyan",
    count: 12,
    cards: [
      {
        id: "n1",
        name: "Hoàng Bảo",
        channel: "zalo",
        meta: "Zalo OA",
        snippet: '"Cho mình xin giá khóa học Online nhé"',
        time: "5 phút trước",
        statusLabel: "Chưa Trả Lời",
        statusTone: "cyan",
      },
      {
        id: "n2",
        name: "Linh Nguyễn",
        channel: "messenger",
        meta: "Từ Ads: Campaign A",
        snippet: "Để lại SĐT: 0912xxx889",
        time: "1 giờ trước",
        statusLabel: "Cần Gọi",
        statusTone: "primary",
      },
    ],
  },
  {
    id: "progress",
    label: "Đang Tư Vấn",
    tone: "primary",
    count: 8,
    cards: [
      {
        id: "p1",
        name: "Tài Le",
        channel: "telegram",
        meta: "Est: 5.000.000₫",
        metaGold: true,
        tags: ["Gói Tháng", "Hỏi CK"],
        statusLabel: "Đang chat...",
        statusTone: "primary",
      },
    ],
  },
  {
    id: "followup",
    label: "Follow Up",
    tone: "warning",
    count: 3,
    cards: [
      {
        id: "f1",
        name: "Chị Hương VIP",
        channel: "zalo",
        reminder: "Nhắc lịch gọi lúc 14:00 hôm nay",
      },
    ],
  },
  {
    id: "won",
    label: "Won (Chốt)",
    tone: "success",
    count: 45,
    cards: [
      {
        id: "w1",
        name: "Đơn hàng #1092",
        channel: "zalo",
        amount: 12500000,
        amountNote: "Thanh toán thành công qua ZaloPay",
      },
    ],
  },
];

export function CrmMessagingPipelineKanban({
  title = "Lead Pipeline",
  subtitle = "Quản lý trạng thái khách hàng đa kênh theo phễu chuyển đổi",
  filterLabel = "Filter: Tháng Này",
  onFilter,
  onAddLead,
  columns = SAMPLE_COLUMNS,
  onCardClick,
  className,
}: {
  title?: string;
  subtitle?: string;
  filterLabel?: string;
  onFilter?: () => void;
  onAddLead?: () => void;
  columns?: KanbanColumn[];
  onCardClick?: (card: KanbanCard, columnId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard p-6 min-h-[600px]">
        <div
          className="aura"
          style={{
            background: "rgb(var(--gem-warning-rgb))",
            width: 500,
            height: 300,
            top: 0,
            left: "20%",
            opacity: "calc(var(--gem-aura-strength) * 0.5)",
          }}
        />

        {/* Header */}
        <div className="flex flex-wrap gap-3 justify-between items-end border-b border-gem-border/10 pb-4 mb-6 relative z-10">
          <div>
            <h2 className="text-xl font-black text-gem-text flex items-center gap-2">
              <Kanban className="text-gem-warning" /> {title}
            </h2>
            <div className="text-xs text-gem-text-muted mt-1">{subtitle}</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFilter}
              className="glass-btn px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 text-gem-text"
            >
              <Filter className="w-4 h-4" /> {filterLabel}
            </button>
            <button
              type="button"
              onClick={onAddLead}
              className="bg-gem-warning text-gem-surface-overlay px-4 py-2 rounded-lg text-sm font-black shadow-[0_0_15px_rgb(var(--gem-warning-rgb)/0.4)] flex items-center gap-2 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar relative z-10">
          {columns.map((col) => (
            <div key={col.id} className="w-[300px] flex-shrink-0 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="text-sm font-bold text-gem-text flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", DOT[col.tone])} /> {col.label}
                </div>
                <span className="bg-gem-surface-raised px-2 py-0.5 rounded text-xs font-bold text-gem-text-muted">
                  {col.count}
                </span>
              </div>

              {col.cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onCardClick?.(card, col.id)}
                  className={cn(
                    "text-left pcard-inner p-4 cursor-grab transition-all group",
                    card.amount ? "border-gem-success/30 bg-gem-success/5" : HOVER_BORDER[col.tone],
                  )}
                >
                  {/* Won card variant */}
                  {card.amount ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-bold text-gem-text">{card.name}</div>
                        <CheckCircle2 className="w-4 h-4 text-gem-success" />
                      </div>
                      <div className="text-xl font-black text-gem-success mb-1">{vnd(card.amount)}</div>
                      {card.amountNote && <div className="text-[10px] text-gem-text-muted">{card.amountNote}</div>}
                    </>
                  ) : card.reminder ? (
                    <>
                      <div className="flex gap-2 items-center mb-2">
                        <ChannelIcon channel={card.channel} className="w-5 h-5" iconClassName="w-3 h-3" />
                        <div className="text-sm font-bold text-gem-text">{card.name}</div>
                      </div>
                      <div className="text-[10px] bg-gem-warning/10 text-gem-warning border border-gem-warning/20 p-1.5 rounded flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {card.reminder}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            {card.avatarUrl ? (
                              <img src={card.avatarUrl} alt={card.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gem-cyan/20 flex items-center justify-center text-gem-cyan font-bold text-xs">
                                {initials(card.name)}
                              </div>
                            )}
                            <ChannelIcon
                              channel={card.channel}
                              className="absolute -bottom-1 -right-1 w-4 h-4"
                              iconClassName="w-2.5 h-2.5"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gem-text">{card.name}</div>
                            {card.meta && (
                              <div className={cn("text-[10px]", card.metaGold ? "font-bold text-gem-gold" : "text-gem-text-muted")}>
                                {card.meta}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {card.snippet && (
                        <div className="text-xs text-gem-text line-clamp-2 mb-3 bg-gem-surface/50 p-2 rounded border border-gem-border/5">
                          {card.snippet}
                        </div>
                      )}

                      {card.tags && card.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-3">
                          {card.tags.map((t, i) => (
                            <span
                              key={i}
                              className="bg-gem-surface-overlay text-[9px] px-1.5 py-0.5 rounded text-gem-text-muted border border-gem-border/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-gem-border/10">
                        <div className="text-[10px] text-gem-text-muted flex items-center gap-1">
                          {card.time && (
                            <>
                              <Clock className="w-3 h-3" /> {card.time}
                            </>
                          )}
                          {!card.time && card.statusTone === "primary" && card.statusLabel === "Đang chat..." && null}
                        </div>
                        {card.statusLabel && (
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1", CHIP[card.statusTone ?? "neutral"])}>
                            {card.statusLabel === "Đang chat..." && <MessageSquare className="w-3 h-3" />}
                            {card.statusLabel}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingPipelineKanban;
