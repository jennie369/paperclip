/**
 * CrmMessagingCustomer360 — Customer 360 (Deep Profile)
 * ──────────────────────────────────────────────────────
 * Split view focused on a customer's deep profile. Left = a deliberately
 * blurred chat log ("click to focus") so attention stays on the profile.
 * Right = the 360 panel: identity header, key data blocks, tags/segments,
 * an omnichannel touchpoint timeline, and a 4-up quick-action grid.
 *
 * Ported from the Gemral CRM mockup ("CUSTOMER 360 (Deep Profile)").
 * Theme-aware via gem-* tokens. Presentational; actions surface via callbacks.
 *
 * @param {Customer360Profile} [profile] - The customer being profiled.
 * @param {() => void} [onFocusChat] - Click handler for the blurred chat pane.
 * @param {() => void} [onAddTag] - "Add tag" handler.
 * @param {Customer360Action[]} [actions] - Quick-action grid (defaults to 4 actions).
 * @param {(action: Customer360Action, index: number) => void} [onAction] - Action click handler.
 * @param {string} [className] - Extra classes on the card root.
 */
import { FileSignature, CalendarPlus, PhoneCall, MoreHorizontal, Plus, Tags, GitMerge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials, vnd } from "./_shared";
import type { CrmChannel, CrmTag, CrmTone } from "./types";

export interface Customer360DataBlock {
  label: string;
  value: string;
  /** Tint the value (e.g. LTV in success green). */
  tone?: CrmTone;
}

export interface Customer360Touchpoint {
  /** "Hôm nay, 10:45 AM via Zalo" */
  when: string;
  title: string;
  /** First/active point gets the primary glowing node. */
  active?: boolean;
}

export interface Customer360Action {
  label: string;
  icon: LucideIcon;
  /** Hover accent for the icon. */
  hoverTone?: CrmTone;
}

export interface Customer360Profile {
  name: string;
  badge?: string;
  avatarUrl?: string;
  chatChannel?: CrmChannel;
  blocks?: Customer360DataBlock[];
  tags?: CrmTag[];
  timeline?: Customer360Touchpoint[];
}

const TAG_CHIP: Record<CrmTone, string> = {
  primary: "bg-gem-primary/20 text-gem-primary border-gem-primary/30",
  cyan: "bg-gem-cyan/20 text-gem-cyan border-gem-cyan/30",
  gold: "bg-gem-gold/20 text-gem-gold border-gem-gold/30",
  success: "bg-gem-success/20 text-gem-success border-gem-success/30",
  danger: "bg-gem-danger/20 text-gem-danger border-gem-danger/30",
  warning: "bg-gem-warning/20 text-gem-warning border-gem-warning/30",
  neutral: "bg-gem-surface-raised text-gem-text-muted border-gem-border/20",
};
const VALUE_TONE: Record<CrmTone, string> = {
  primary: "text-gem-primary",
  cyan: "text-gem-cyan",
  gold: "text-gem-gold",
  success: "text-gem-success",
  danger: "text-gem-danger",
  warning: "text-gem-warning",
  neutral: "text-gem-text",
};
const ACTION_HOVER: Record<CrmTone, string> = {
  primary: "group-hover:text-gem-primary",
  cyan: "group-hover:text-gem-cyan",
  gold: "group-hover:text-gem-gold",
  success: "group-hover:text-gem-success",
  danger: "group-hover:text-gem-danger",
  warning: "group-hover:text-gem-warning",
  neutral: "group-hover:text-gem-text",
};

const SAMPLE_PROFILE: Customer360Profile = {
  name: "Vũ Thành",
  badge: "Enterprise Customer",
  chatChannel: "zalo",
  blocks: [
    { label: "Company", value: "TechNova JSC" },
    { label: "Lifetime Value", value: vnd(125000000), tone: "success" },
  ],
  tags: [
    { label: "VIP_Tier1", tone: "primary" },
    { label: "Tech_Industry", tone: "neutral" },
    { label: "High_Churn_Risk", tone: "danger" },
  ],
  timeline: [
    { when: "Hôm nay, 10:45 AM via Zalo", title: "Yêu cầu gia hạn hợp đồng", active: true },
    { when: "3 ngày trước via Email", title: "Mở email Newsletter Tháng 6" },
    { when: "Tháng trước via Facebook", title: "Đăng ký tham gia Webinar" },
  ],
};

const SAMPLE_ACTIONS: Customer360Action[] = [
  { label: "Báo Giá", icon: FileSignature, hoverTone: "primary" },
  { label: "Lịch Hẹn", icon: CalendarPlus, hoverTone: "primary" },
  { label: "Gọi Ngay", icon: PhoneCall, hoverTone: "success" },
  { label: "Thêm", icon: MoreHorizontal, hoverTone: "neutral" },
];

export function CrmMessagingCustomer360({
  profile = SAMPLE_PROFILE,
  onFocusChat,
  onAddTag,
  actions = SAMPLE_ACTIONS,
  onAction,
  className,
}: {
  profile?: Customer360Profile;
  onFocusChat?: () => void;
  onAddTag?: () => void;
  actions?: Customer360Action[];
  onAction?: (action: Customer360Action, index: number) => void;
  className?: string;
}) {
  const blocks = profile.blocks ?? [];
  const tags = profile.tags ?? [];
  const timeline = profile.timeline ?? [];

  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard p-0 h-[600px] flex overflow-hidden">
        {/* Left: blurred chat (focus magnet) */}
        <div className="w-1/2 border-r border-gem-border/10 flex flex-col bg-gem-surface-overlay/40 z-10">
          <div className="h-16 border-b border-gem-border/10 flex items-center px-4 bg-gem-surface/50 backdrop-blur-md">
            <div className="text-sm font-bold text-gem-text flex items-center gap-2">
              <ChannelIcon channel={profile.chatChannel ?? "zalo"} className="w-5 h-5" iconClassName="w-3 h-3" /> Chat Log
            </div>
          </div>
          <button
            type="button"
            onClick={onFocusChat}
            className="flex-1 p-4 overflow-y-auto custom-scrollbar opacity-50 blur-[1px] hover:blur-none hover:opacity-100 transition-all cursor-pointer text-left"
          >
            <div className="flex flex-col gap-2">
              <div className="w-3/4 h-8 bg-gem-surface-raised rounded-lg border border-gem-border/10" />
              <div className="w-1/2 h-16 bg-gem-surface-raised rounded-lg border border-gem-border/10 ml-auto" />
              <div className="w-2/3 h-10 bg-gem-surface-raised rounded-lg border border-gem-border/10" />
            </div>
            <div className="text-center mt-4 text-xs font-bold text-gem-primary border border-gem-primary/30 py-2 rounded bg-gem-primary/10">
              Click to Focus Chat
            </div>
          </button>
        </div>

        {/* Right: 360 profile */}
        <div className="w-1/2 flex flex-col z-10 bg-gem-surface/30 relative">
          <div
            className="aura"
            style={{
              background: "rgb(var(--gem-gold-rgb))",
              width: 300,
              height: 300,
              top: 0,
              right: 0,
              opacity: "calc(var(--gem-aura-strength) * 0.3)",
            }}
          />

          <div className="p-6 pb-2 relative z-10 flex items-center gap-4 border-b border-gem-border/10">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-16 h-16 rounded-xl shadow-lg border border-gem-gold/30 object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl shadow-lg border border-gem-gold/30 bg-gem-gold/15 flex items-center justify-center text-gem-gold font-black text-xl">
                {initials(profile.name)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-gem-text">{profile.name}</h2>
              {profile.badge && (
                <div className="text-xs text-gem-gold font-bold bg-gem-gold/10 border border-gem-gold/20 px-2 py-0.5 rounded inline-block mt-1">
                  {profile.badge}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10 flex flex-col gap-6">
            {/* Data blocks */}
            {blocks.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {blocks.map((b, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-gem-text-muted uppercase mb-1">{b.label}</div>
                    <div className={cn("text-sm font-semibold", b.tone ? `font-bold ${VALUE_TONE[b.tone]}` : "text-gem-text")}>
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gem-text-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Tags className="w-4 h-4" /> Phân loại (Tags)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={i} className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", TAG_CHIP[t.tone ?? "neutral"])}>
                      {t.label}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={onAddTag}
                    className="text-[10px] bg-gem-surface-overlay text-gem-text px-2 py-1 rounded-full border border-dashed border-gem-border/40 hover:bg-gem-surface-raised transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm Tag
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            {timeline.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gem-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" /> Hành trình đa kênh
                </h3>
                <div className="relative border-l border-gem-border/20 ml-2 space-y-4 pb-4">
                  {timeline.map((tp, i) => (
                    <div key={i} className="relative pl-6">
                      {tp.active ? (
                        <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-gem-primary shadow-[0_0_8px_rgb(var(--gem-primary-rgb))]" />
                      ) : (
                        <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-gem-border/30" />
                      )}
                      <div className="text-[10px] text-gem-text-muted mb-0.5">{tp.when}</div>
                      <div className={cn("text-sm", tp.active ? "font-semibold text-gem-text" : "text-gem-text")}>{tp.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action grid */}
            {actions.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-auto">
                {actions.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAction?.(a, i)}
                      className="p-3 bg-gem-surface-raised border border-gem-border/10 rounded-xl hover:bg-gem-surface-overlay hover:border-gem-primary/30 transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                      <Icon className={cn("w-4 h-4 text-gem-text-muted transition-colors", ACTION_HOVER[a.hoverTone ?? "primary"])} />
                      <span className="text-[9px] font-bold mt-1 text-gem-text">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingCustomer360;
