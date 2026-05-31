/**
 * CrmMessagingCommandCenter — Omnichannel Inbox (Command Center)
 * ──────────────────────────────────────────────────────────────
 * The flagship 4-column messaging cockpit:
 *   1. Channels rail   — workspace identity + per-account inbox counts (Zalo /
 *                        Facebook / Telegram), grouped by platform.
 *   2. Conversations   — searchable, filterable list with channel-badged
 *                        avatars, unread/VIP states.
 *   3. Chat window     — header w/ contact + context, message thread (sent /
 *                        received bubbles), AI suggestion chips + composer.
 *   4. CRM 360 panel   — spend/LTV card, contact info grid, tags, deal stage.
 *
 * Ported from the Gemral CRM mockup ("COMMAND CENTER (Omnichannel Inbox)").
 * Theme-aware via gem-* tokens. Presentational; every affordance surfaces via
 * callbacks (select account/conversation, send, AI suggestion, deal-stage change).
 *
 * @param {CommandWorkspace} [workspace] - Top-left identity (name + online state).
 * @param {CommandChannelGroup[]} [channelGroups] - Platform-grouped account list.
 * @param {string} [allCount="24"] - Count badge for the "All Messages" row.
 * @param {CommandConversation[]} [conversations] - Conversation list items.
 * @param {string} [activeConversationId] - Focused conversation id (controlled).
 * @param {(id: string) => void} [onSelectConversation] - Conversation click handler.
 * @param {string[]} [listFilters] - Filter chips above the list.
 * @param {CommandChatHeader} [chatHeader] - Header of the active chat.
 * @param {CommandMessage[]} [messages] - Active chat transcript.
 * @param {string[]} [aiSuggestions] - One-tap AI reply chips above the composer.
 * @param {(text: string, index: number) => void} [onAiSuggestion] - AI chip handler.
 * @param {(text: string) => void} [onSend] - Composer send handler.
 * @param {CommandCrmProfile} [crm] - Right CRM-360 panel data.
 * @param {string} [className] - Extra classes on the card root.
 */
import { useState } from "react";
import {
  MessageSquare,
  Search,
  Phone,
  Star,
  MoreVertical,
  Paperclip,
  Smile,
  Send as SendIcon,
  Sparkles,
  Copy,
  Crown,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, initials, vnd } from "./_shared";
import type { CrmChannel, CrmTag, CrmTone } from "./types";

export interface CommandWorkspace {
  name: string;
  online?: boolean;
  avatarUrl?: string;
}

export interface CommandAccount {
  id: string;
  label: string;
  channel: CrmChannel;
  count?: number;
  /** Render the count as an urgent (danger) badge with glow. */
  urgent?: boolean;
}

export interface CommandChannelGroup {
  label: string;
  accounts: CommandAccount[];
}

export interface CommandConversation {
  id: string;
  name: string;
  channel: CrmChannel;
  avatarUrl?: string;
  preview: string;
  time: string;
  /** VIP ribbon under the name. */
  vip?: boolean;
  /** Unread → bolder preview + dot. */
  unread?: boolean;
  /** Dim the row (older / read). */
  muted?: boolean;
}

export interface CommandChatHeader {
  name: string;
  channel: CrmChannel;
  avatarUrl?: string;
  /** "Fanpage Chính" */
  context?: string;
  /** "Tương tác qua Bài Quảng Cáo" */
  contextDetail?: string;
}

export interface CommandMessage {
  from: "them" | "me";
  text: string;
  time?: string;
  /** Show read receipt (only meaningful for sent). */
  read?: boolean;
}

export interface CommandCrmInfo {
  label: string;
  value: string;
  copyable?: boolean;
  truncate?: boolean;
}

export interface CommandCrmProfile {
  spendLabel?: string;
  spend: string;
  ltvDeltaLabel?: string;
  orderCountLabel?: string;
  orderCount?: string;
  tierLabel?: string;
  tier?: string;
  info?: CommandCrmInfo[];
  tags?: CrmTag[];
  dealStages?: string[];
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

const SAMPLE_WORKSPACE: CommandWorkspace = { name: "Admin Workspace", online: true };

const SAMPLE_GROUPS: CommandChannelGroup[] = [
  {
    label: "Zalo Accounts",
    accounts: [
      { id: "zalo-oa", label: "Zalo OA Tổng", channel: "zalo", count: 12 },
      { id: "zalo-sale1", label: "Zalo Cá Nhân (Sale 1)", channel: "zalo" },
    ],
  },
  {
    label: "Facebook Pages",
    accounts: [{ id: "fb-main", label: "Fanpage Chính", channel: "messenger", count: 5, urgent: true }],
  },
  {
    label: "Telegram Bots",
    accounts: [{ id: "tele-vip", label: "Support Bot VIP", channel: "telegram", count: 7 }],
  },
];

const SAMPLE_CONVERSATIONS: CommandConversation[] = [
  {
    id: "c1",
    name: "Trần Văn A",
    channel: "messenger",
    preview: "Dạ cho mình hỏi gói Ngọc Bích còn slot không shop?",
    time: "10:42 AM",
    vip: true,
  },
  {
    id: "c2",
    name: "Lê Ngọc",
    channel: "zalo",
    preview: "Mình đã chuyển khoản rồi nha.",
    time: "09:15 AM",
    unread: true,
  },
  {
    id: "c3",
    name: "Pham Minh",
    channel: "telegram",
    preview: "Cảm ơn shop nhiều ạ.",
    time: "Hôm qua",
    muted: true,
  },
];

const SAMPLE_HEADER: CommandChatHeader = {
  name: "Trần Văn A",
  channel: "messenger",
  context: "Fanpage Chính",
  contextDetail: "Tương tác qua Bài Quảng Cáo",
};

const SAMPLE_MESSAGES: CommandMessage[] = [
  { from: "them", text: "Chào shop, mình quan tâm đến khóa học phong thủy bên mình.", time: "10:40 AM" },
  {
    from: "me",
    text: "Chào bạn Trần Văn A! Cảm ơn bạn đã quan tâm. Bạn đang muốn tìm hiểu về khóa học cơ bản hay chuyên sâu ạ?",
  },
  {
    from: "me",
    text: "Hiện tại bên mình đang có chương trình giảm 20% cho người mới đăng ký trong tháng này.",
    time: "10:41 AM",
    read: true,
  },
  { from: "them", text: "Dạ cho mình hỏi gói Ngọc Bích còn slot không shop?", time: "10:42 AM" },
];

const SAMPLE_AI = ["Dạ còn 3 slot cuối cùng ạ", "Gửi link thanh toán Ngọc Bích"];

const SAMPLE_CRM: CommandCrmProfile = {
  spendLabel: "Tổng Chi Tiêu",
  spend: vnd(45000000),
  ltvDeltaLabel: "+15% LTV",
  orderCountLabel: "SỐ ĐƠN",
  orderCount: "4 Đơn Hàng",
  tierLabel: "PHÂN HẠNG",
  tier: "VVIP",
  info: [
    { label: "Số Điện Thoại", value: "0901 234 567", copyable: true },
    { label: "Email", value: "tranvana.vip@gmail.com", truncate: true },
  ],
  tags: [
    { label: "Quan Tâm Phong Thủy", tone: "danger" },
    { label: "Khách Cũ", tone: "primary" },
  ],
  dealStages: ["Đang Tư Vấn (In Progress)", "Chốt Đơn (Won)", "Từ Chối (Lost)"],
};

export function CrmMessagingCommandCenter({
  workspace = SAMPLE_WORKSPACE,
  channelGroups = SAMPLE_GROUPS,
  allCount = "24",
  conversations = SAMPLE_CONVERSATIONS,
  activeConversationId = "c1",
  onSelectConversation,
  listFilters = ["Chưa đọc", "Cần Follow-up", "VIP"],
  chatHeader = SAMPLE_HEADER,
  messages = SAMPLE_MESSAGES,
  aiSuggestions = SAMPLE_AI,
  onAiSuggestion,
  onSend,
  crm = SAMPLE_CRM,
  className,
}: {
  workspace?: CommandWorkspace;
  channelGroups?: CommandChannelGroup[];
  allCount?: string;
  conversations?: CommandConversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  listFilters?: string[];
  chatHeader?: CommandChatHeader;
  messages?: CommandMessage[];
  aiSuggestions?: string[];
  onAiSuggestion?: (text: string, index: number) => void;
  onSend?: (text: string) => void;
  crm?: CommandCrmProfile;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function send() {
    const text = draft.trim();
    if (!text) return;
    onSend?.(text);
    setDraft("");
  }

  return (
    <div className={cn("crm-scope", className)}>
      <div className="pcard h-[800px] w-full p-0">
        <div
          className="aura"
          style={{ background: "rgb(var(--gem-primary-rgb))", width: 400, height: 400, top: -100, left: -100, opacity: "var(--gem-aura-strength)" }}
        />
        <div
          className="aura"
          style={{ background: "rgb(var(--gem-cyan-rgb))", width: 300, height: 300, bottom: -50, right: "20%", opacity: "calc(var(--gem-aura-strength) * 0.7)" }}
        />

        <div className="flex h-full relative z-10 min-h-0">
          {/* ── 1. Channels rail ──────────────────────────── */}
          <div className="hidden lg:flex w-64 border-r border-gem-border/10 bg-gem-surface-overlay/40 p-4 flex-col gap-6 shrink-0">
            <div className="flex items-center gap-3 p-2 pcard-inner border-transparent">
              {workspace.avatarUrl ? (
                <img src={workspace.avatarUrl} alt={workspace.name} className="w-10 h-10 rounded-full border-2 border-gem-primary object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-gem-primary bg-gem-primary/15 flex items-center justify-center text-gem-primary font-bold text-sm">
                  {initials(workspace.name)}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-gem-text">{workspace.name}</div>
                {workspace.online && (
                  <div className="text-xs text-gem-success flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gem-success shadow-[0_0_8px_rgb(var(--gem-success-rgb))]" /> Online
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-bold text-gem-text-muted uppercase tracking-wider mb-2">Omnichannel Inbox</div>

              <button
                type="button"
                className="flex items-center justify-between p-2 rounded-lg bg-gem-primary/10 border border-gem-primary/30 shadow-[0_0_15px_rgb(var(--gem-primary-rgb)/0.15)] text-gem-primary"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="w-4 h-4" /> All Messages
                </div>
                <span className="bg-gem-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{allCount}</span>
              </button>

              {channelGroups.map((group) => (
                <div key={group.label}>
                  <div className="mt-4 mb-1 text-[10px] font-bold text-gem-text-faint uppercase">{group.label}</div>
                  {group.accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gem-surface-raised transition-colors text-sm group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChannelIcon channel={acc.channel} iconClassName="w-3 h-3" />
                        <span className="text-gem-text-muted group-hover:text-gem-text truncate">{acc.label}</span>
                      </div>
                      {acc.count != null &&
                        (acc.urgent ? (
                          <span className="bg-gem-danger text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgb(var(--gem-danger-rgb))]">
                            {acc.count}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gem-text-muted">{acc.count}</span>
                        ))}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. Conversation list ──────────────────────── */}
          <div className="w-72 xl:w-80 border-r border-gem-border/10 bg-gem-surface/30 flex flex-col shrink-0 min-h-0">
            <div className="p-4 border-b border-gem-border/10 backdrop-blur-md">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gem-text-muted" />
                <input
                  type="text"
                  placeholder="Tìm tên, số điện thoại..."
                  className="w-full bg-gem-surface-overlay border border-gem-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gem-primary transition-colors shadow-inner text-gem-text"
                />
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                {listFilters.map((f, i) => (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border",
                      i === 0
                        ? "bg-gem-primary/20 text-gem-primary border-gem-primary/30"
                        : "bg-gem-surface-raised text-gem-text-muted border-gem-border/10 hover:bg-gem-surface-overlay",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
              {conversations.map((c) => {
                const active = c.id === activeConversationId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectConversation?.(c.id)}
                    className={cn(
                      "text-left p-3 rounded-xl cursor-pointer relative transition-colors border",
                      active
                        ? "bg-gem-primary/10 border-gem-primary/30 shadow-[inset_4px_0_0_rgb(var(--gem-primary-rgb))]"
                        : c.muted
                          ? "border-transparent opacity-70 hover:opacity-100 hover:bg-gem-surface-raised hover:border-gem-border/10"
                          : "border-transparent hover:bg-gem-surface-raised hover:border-gem-border/10",
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gem-gold/20 flex items-center justify-center text-gem-gold font-bold text-[11px]">
                              {initials(c.name)}
                            </div>
                          )}
                          <ChannelIcon channel={c.channel} className="absolute -bottom-1 -right-1 w-4 h-4" iconClassName="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gem-text flex items-center gap-1 truncate">
                            {c.name}
                            {c.unread && <span className="w-2 h-2 rounded-full bg-gem-primary shrink-0" />}
                          </div>
                          {c.vip && (
                            <div className="text-[10px] text-gem-gold border border-gem-gold/30 px-1.5 rounded bg-gem-gold/10 inline-block">
                              VIP Customer
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gem-text-muted shrink-0">{c.time}</span>
                    </div>
                    <p className={cn("text-xs line-clamp-1 mt-1", c.unread ? "text-gem-text font-semibold" : "text-gem-text-muted")}>
                      {c.preview}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. Chat window ────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-gem-surface-overlay/20 min-w-0 min-h-0">
            <div className="h-16 border-b border-gem-border/10 flex items-center justify-between px-6 backdrop-blur-md bg-gem-surface/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {chatHeader.avatarUrl ? (
                    <img src={chatHeader.avatarUrl} alt={chatHeader.name} className="w-10 h-10 rounded-full shadow-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full shadow-lg bg-gem-gold/20 flex items-center justify-center text-gem-gold font-bold text-sm">
                      {initials(chatHeader.name)}
                    </div>
                  )}
                  <ChannelIcon channel={chatHeader.channel} className="absolute bottom-0 right-0 w-4 h-4 border border-gem-surface" iconClassName="w-2.5 h-2.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-gem-text truncate">{chatHeader.name}</div>
                  {(chatHeader.context || chatHeader.contextDetail) && (
                    <div className="text-xs text-gem-text-muted flex items-center gap-1 truncate">
                      {chatHeader.context}
                      {chatHeader.contextDetail && (
                        <>
                          <ChevronRight className="w-3 h-3 shrink-0" /> {chatHeader.contextDetail}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary">
                  <Phone className="w-4 h-4" />
                </button>
                <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary">
                  <Star className="w-4 h-4" />
                </button>
                <button type="button" className="glass-btn p-2 rounded-lg text-gem-text hover:text-gem-primary">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {messages.map((m, i) =>
                m.from === "me" ? (
                  <div key={i} className="flex flex-col gap-1 max-w-[70%] ml-auto items-end">
                    <div className="chat-bubble-sent p-3 text-sm">{m.text}</div>
                    {m.time && (
                      <span className="text-[10px] text-gem-text-muted mr-1 flex items-center gap-1">
                        {m.time}
                        {m.read && <CheckCheck className="w-3 h-3 text-gem-cyan" />}
                      </span>
                    )}
                  </div>
                ) : (
                  <div key={i} className="flex flex-col gap-1 max-w-[70%]">
                    <div className="chat-bubble-received p-3 text-sm shadow-md">{m.text}</div>
                    {m.time && <span className="text-[10px] text-gem-text-muted ml-1">{m.time}</span>}
                  </div>
                ),
              )}
            </div>

            <div className="p-4 bg-gem-surface/50 backdrop-blur-xl border-t border-gem-border/10 shrink-0">
              {aiSuggestions.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAiSuggestion?.(s, i)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors border",
                        i === 0
                          ? "bg-gem-primary/20 text-gem-primary border-gem-primary/30 hover:bg-gem-primary hover:text-white"
                          : "bg-gem-surface-raised border-gem-border/20 text-gem-text hover:bg-gem-border/40",
                      )}
                    >
                      {i === 0 && <Sparkles className="w-3 h-3" />} {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 pcard-inner p-2 border border-gem-border/20 focus-within:border-gem-primary/50 focus-within:shadow-[0_0_15px_rgb(var(--gem-primary-rgb)/0.2)] transition-all">
                <button type="button" className="p-2 text-gem-text-muted hover:text-gem-primary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className="flex-1 bg-transparent border-none focus:outline-none resize-none text-sm text-gem-text py-2 max-h-32 custom-scrollbar"
                  placeholder="Nhập tin nhắn... (Dùng '/' để gọi mẫu câu)"
                />
                <div className="flex items-center gap-1">
                  <button type="button" className="p-2 text-gem-text-muted hover:text-gem-primary transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    className="p-2 bg-gem-primary text-white rounded-lg hover:shadow-[0_0_15px_rgb(var(--gem-primary-rgb))] transition-all transform hover:scale-105"
                  >
                    <SendIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. CRM 360 panel ──────────────────────────── */}
          <div className="hidden xl:flex w-80 border-l border-gem-border/10 bg-gem-surface-overlay/40 p-5 overflow-y-auto custom-scrollbar shrink-0 flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm text-gem-text uppercase tracking-wider">Thông Tin Khách Hàng</h3>
              <button type="button" className="text-gem-primary text-xs font-bold hover:underline">
                Sửa
              </button>
            </div>

            {/* Spend card */}
            <div className="pcard p-4 mb-6" style={{ borderRadius: 16 }}>
              <div className="flex justify-between mb-4">
                <div className="text-xs text-gem-text-muted">{crm.spendLabel ?? "Tổng Chi Tiêu"}</div>
                {crm.ltvDeltaLabel && (
                  <div className="text-gem-success text-xs font-bold bg-gem-success/10 px-2 py-0.5 rounded border border-gem-success/20">
                    {crm.ltvDeltaLabel}
                  </div>
                )}
              </div>
              <div className="text-2xl font-black text-gem-text">{crm.spend}</div>
              <div className="mt-4 pt-4 border-t border-gem-border/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-gem-text-muted">{crm.orderCountLabel ?? "SỐ ĐƠN"}</div>
                  <div className="font-bold text-sm text-gem-text">{crm.orderCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gem-text-muted">{crm.tierLabel ?? "PHÂN HẠNG"}</div>
                  <div className="font-bold text-sm text-gem-gold flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {crm.tier}
                  </div>
                </div>
              </div>
            </div>

            {/* Info grid */}
            {crm.info && crm.info.length > 0 && (
              <div className="space-y-4 mb-6">
                {crm.info.map((it, i) => (
                  <div key={i}>
                    <div className="text-[10px] font-bold text-gem-text-muted uppercase mb-1">{it.label}</div>
                    <div
                      className={cn(
                        "text-sm font-semibold bg-gem-surface-raised p-2 rounded-lg border border-gem-border/5 text-gem-text",
                        it.copyable && "flex justify-between items-center",
                        it.truncate && "truncate",
                      )}
                    >
                      {it.value}
                      {it.copyable && (
                        <button type="button" className="text-gem-primary shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {crm.tags && crm.tags.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gem-text-muted uppercase mb-1">Tags (Nhãn)</div>
                    <div className="flex flex-wrap gap-1">
                      {crm.tags.map((t, i) => (
                        <span key={i} className={cn("text-[10px] px-2 py-1 rounded-md font-bold border", TAG_CHIP[t.tone ?? "neutral"])}>
                          {t.label}
                        </span>
                      ))}
                      <span className="bg-gem-surface-raised text-gem-text-muted text-[10px] px-2 py-1 rounded-md border border-gem-border/10 cursor-pointer hover:bg-gem-surface-overlay">
                        + Add Tag
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deal status */}
            {crm.dealStages && crm.dealStages.length > 0 && (
              <div className="mb-6">
                <div className="text-[10px] font-bold text-gem-text-muted uppercase mb-2">Quy Trình Chốt Sale</div>
                <div className="pcard-inner p-3">
                  {/* Native select — Radix Select crashes in Paperclip (see CLAUDE.md). */}
                  <select className="w-full bg-gem-surface border border-gem-border/20 rounded-md p-2 text-sm font-semibold text-gem-warning outline-none mb-3">
                    {crm.dealStages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="w-full py-2 bg-gem-primary/20 text-gem-primary font-bold text-xs rounded-md border border-gem-primary/30 hover:bg-gem-primary hover:text-white transition-colors"
                  >
                    + Tạo Báo Giá / Đơn Hàng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrmMessagingCommandCenter;
