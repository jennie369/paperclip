// Chat Panel — center panel showing messages + input
// With emoji reactions, reply-to (D3), in-chat search (D6), timestamp grouping (D8)

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronDown, SmilePlus, Bot, Reply, MoreHorizontal, Copy, Pin, Star, ListChecks, RotateCcw, Trash2, Check, Pencil } from "lucide-react";
import { channelsApi, type ChannelSession, type PendingMessage } from "@/api/channels";
import { is4xx } from "@/api/client";
import { isHumanSent } from "@/lib/sent-by";
import { useImageLightbox } from "@/components/ImageLightbox";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageRenderer } from "./MessageRenderer";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface Props {
  conversation: ChannelSession;
  onToggleCustomer: () => void;
  onAction: () => void;
  channelMap?: ChannelDisplayMap;
  /** Set on narrow layouts, where the list and the thread share one column. */
  onBack?: () => void;
}

interface ReplyTo {
  id: string;
  body: string;
  senderLabel: string;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// FIX 5: Date label helper
function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hôm nay";
  if (sameDay(date, yesterday)) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-300/50 text-foreground rounded px-0.5">{part}</mark>
      : part
  );
}

// Row in the "..." message-actions menu. `soon` = BE not wired yet (disabled,
// labelled "sắp có" — honest, not a fake-working button). `danger` = destructive.
function MenuItem({
  icon,
  label,
  onClick,
  soon,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  soon?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={soon}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors [&>span>svg]:h-4 [&>span>svg]:w-4 ${
        soon
          ? "opacity-40 cursor-not-allowed"
          : danger
            ? "text-red-500 hover:bg-red-500/10"
            : "hover:bg-muted/70"
      }`}
    >
      <span className="shrink-0 flex items-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {soon && <span className="text-[10px] text-muted-foreground">sắp có</span>}
    </button>
  );
}

export function ChatPanel({ conversation: conv, onToggleCustomer, onAction, channelMap, onBack }: Props) {
  const { openImage } = useImageLightbox();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledSessionRef = useRef<string | null>(null); // Session we've already scrolled to bottom for (only set AFTER messages loaded)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null); // tin đang mở full reaction picker
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null); // tin đang mở menu "..." (copy/ghim/thu hồi...)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null); // feedback "Đã copy"
  // Sửa tin CSKH ngay tại chỗ. KHÔNG dùng Radix Dialog (crash ở dự án này) và
  // KHÔNG dùng prompt() — sửa ngay trong bong bóng thì thấy được ngữ cảnh xung quanh.
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  // D7: Scroll to bottom button
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // FIX 3: Reply-to state
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  // FIX 4: In-chat search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use existing session messages endpoint — already merges inbound + outbound
  const { data: messages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["session-messages", conv.session_key],
    queryFn: () => channelsApi.getSessionMessages(conv.session_key, 200),
    // 4xx = yêu cầu sai, thử lại vô ích → dừng ngay (trước đây gõ ~0.45 req/s VÔ HẠN suốt
    // 6 ngày trên 7 hội thoại gem-master mà không ai thấy, vì lỗi bị nuốt thành "trống").
    retry: (n, e) => !is4xx(e) && n < 3,
    refetchInterval: (q) => (is4xx(q.state.error) ? false : 2_000),
  });

  // Auto-scroll to bottom — CRITICAL LOGIC:
  // 1. When user opens a new conversation, we MUST scroll to bottom AFTER messages have loaded
  // 2. We track `scrolledSessionRef` = the session key we've already scrolled for
  // 3. Only mark as "scrolled" when messages.length > 0 (messages actually loaded)
  // 4. For the same conversation, only auto-scroll if user is already near bottom (preserve scroll)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || showSearch) return;

    const hasScrolledThisSession = scrolledSessionRef.current === conv.session_key;
    const messagesLoaded = !isLoading && messages.length > 0;

    // NEW CONVERSATION: force scroll to bottom once messages are loaded
    if (!hasScrolledThisSession) {
      // Don't mark as scrolled until messages actually rendered
      if (!messagesLoaded) return;

      const forceScroll = () => { if (el) el.scrollTop = el.scrollHeight; };
      // Immediate scroll + multiple delayed scrolls to handle async images/stickers
      forceScroll();
      requestAnimationFrame(forceScroll);
      const t1 = setTimeout(forceScroll, 50);
      const t2 = setTimeout(forceScroll, 200);
      const t3 = setTimeout(forceScroll, 500);
      const t4 = setTimeout(forceScroll, 1000);
      // NOW mark this session as scrolled (only after messages loaded)
      scrolledSessionRef.current = conv.session_key;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }

    // SAME CONVERSATION: only auto-scroll on new messages if user was already near bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages.length, showSearch, conv.session_key, isLoading]);

  // D7: Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBottom(distFromBottom > 200);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // FIX 4: Ctrl+F opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  const handleSend = async (text: string, replyToId?: string) => {
    if (!conv.channel_name) return;
    const parts = conv.session_key.split(":");
    const threadId = parts[1] || conv.chat_id;
    await channelsApi.sendMessage(conv.channel_name, threadId, text, conv.peer_kind);
    setReplyTo(null);
    refetch();
    onAction();
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const current = prev[msgId] || [];
      const exists = current.includes(emoji);
      return {
        ...prev,
        [msgId]: exists ? current.filter((e) => e !== emoji) : [...current, emoji],
      };
    });
  };

  // Copy message text to clipboard (real, FE-only — no BE needed).
  const copyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId((cur) => (cur === msgId ? null : cur)), 1500);
    } catch {
      // clipboard blocked (insecure context) — fall back to a temporary textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopiedMsgId(msgId); setTimeout(() => setCopiedMsgId((cur) => (cur === msgId ? null : cur)), 1500); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setMenuMsgId(null);
  };

  // Toggle/persist an operator-side message flag (star / pin / delete-for-me) via BE.
  const setFlag = async (
    msgId: string,
    patch: { starred?: boolean; pinned?: boolean; deleted_for_me?: boolean }
  ) => {
    setMenuMsgId(null);
    try {
      await channelsApi.setMessageFlag(msgId, { ...patch, session_key: conv.session_key });
    } catch (e) {
      console.error("setMessageFlag failed", e);
    }
    refetch();
  };

  // ── Thu hồi / Sửa tin CSKH ─────────────────────────────────────────────────
  // Chốt chặn THẬT nằm ở máy chủ (hàm cskh_admin_*_message + quyền UPDATE đã thu);
  // ẩn/hiện nút ở đây chỉ là lớp lịch sự. Chị Jennie chốt 08/08: KHÔNG hộp thoại
  // xác nhận, KHÔNG báo kết quả — bấm là gỡ, chỉ nổ khi HỎNG.
  // `:id` truyền lên là id kho PAPERCLIP; máy chủ tra ngược sang kho khách qua dây nối.
  const isCskh = !!conv.channel_name?.startsWith("cskh");

  const recallMessage = async (msgId: string) => {
    setMenuMsgId(null);
    try {
      const r = await fetch(`/api/channels/cskh/messages/${msgId}/recall`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.success === false) throw new Error(d?.error || `HTTP ${r.status}`);
    } catch (e) {
      // Chỉ nổ khi hỏng — im lặng lúc hỏng mới là thứ nguy hiểm.
      alert(`Không thu hồi được: ${(e as Error).message}`);
    }
    refetch();
  };

  const saveEdit = async () => {
    const id = editingMsgId;
    const text = editDraft.trim();
    if (!id || !text) return;
    setEditingMsgId(null);
    setEditDraft("");
    try {
      const r = await fetch(`/api/channels/cskh/messages/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.success === false) throw new Error(d?.error || `HTTP ${r.status}`);
    } catch (e) {
      alert(`Không sửa được: ${(e as Error).message}`);
    }
    refetch();
  };

  // Reverse messages (API returns newest first)
  const sortedMsgs = [...messages].reverse();

  // FIX 4: Filter by search query
  const filteredMsgs = searchQuery
    ? sortedMsgs.filter((msg) => {
        const body = msg.body || "";
        return body.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : sortedMsgs;

  const matchCount = searchQuery ? filteredMsgs.length : 0;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conv} onToggleCustomer={onToggleCustomer} onAction={onAction} channelMap={channelMap} onBack={onBack} />

      {/* FIX 4: Search bar (slides in on Ctrl+F) */}
      {showSearch && (
        <div className="border-b px-3 py-2 bg-muted/20 flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm trong hội thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-[13px] bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {matchCount} kết quả
            </span>
          )}
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Mất kết nối NHƯNG vẫn còn tin cũ → giữ nguyên transcript, chỉ báo chip nhỏ.
          (Thay cả màn bằng lỗi sẽ nháy mỗi lần restart server — xem nhánh isError bên dưới.) */}
      {isError && messages.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-muted-foreground bg-muted/40 border-b">
          Mất kết nối — đang thử lại…
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Đang tải tin nhắn...</div>
          </div>
        ) : isError && messages.length === 0 ? (
          /* Lỗi + CHƯA có tin nào → hiện lỗi THẬT. Không được để rơi xuống nhánh "Chưa có
             tin nhắn": empty-state giả chính là thứ đã giấu bug 400 suốt 6 ngày.
             ⚠️ Bắt buộc kèm `messages.length === 0` — react-query giữ data cũ trong cache,
             nên MỖI LẦN `pm2 restart` mọi hội thoại đang mở đều isError=true; thiếu điều
             kiện này thì transcript đang đọc bị thay bằng màn lỗi mỗi lần deploy. */
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <div className="text-sm text-destructive">Không tải được tin nhắn của hội thoại này.</div>
            <div className="text-xs text-muted-foreground">
              Hội thoại vẫn còn trên hệ thống — đây là lỗi khi đọc, không phải hội thoại trống.
            </div>
            <button
              onClick={() => refetch()}
              className="mt-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-accent"
            >
              Thử lại
            </button>
          </div>
        ) : filteredMsgs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">
              {searchQuery ? `Không tìm thấy tin nhắn nào khớp với "${searchQuery}"` : "Chưa có tin nhắn"}
            </div>
          </div>
        ) : (
          filteredMsgs.map((msg, i) => {
            const prev = filteredMsgs[i - 1];
            const ts = msg.ts || msg.created_at;
            const prevTs = prev ? (prev.ts || prev.created_at) : null;

            // FIX 5: Date separator with proper label
            const showDate = !prevTs || new Date(ts).toDateString() !== new Date(prevTs).toDateString();
            const dateLabel = showDate ? formatDateLabel(new Date(ts)) : null;

            const isOutbound = msg.direction === "outbound" || msg.status === "sent" || msg.from_uid === "";
            const prevIsOutbound = prev
              ? prev.direction === "outbound" || prev.status === "sent" || prev.from_uid === ""
              : null;
            const isSameGroup = prev ? isOutbound === prevIsOutbound && (isOutbound || msg.sender_name === prev.sender_name) : false;

            // D9: agent-sent messages get a Bot icon (rendered at the sender label,
            // not baked into the string — keeps reply-quote previews clean).
            const isAgentMsg = isOutbound && !!msg.sent_by && !isHumanSent(msg.sent_by);
            const senderLabel = isOutbound
              ? (isAgentMsg ? (msg.sent_by as string) : "Bạn")
              : (msg.sender_name || "Khách");

            const msgId = msg.id || String(i);
            const reactions = messageReactions[msgId] || [];
            const bodyText = msg.body || "";
            const isPinned = !!(msg as { pinned?: boolean }).pinned;
            const isStarred = !!(msg as { starred?: boolean }).starred;

            // Consolidated hover toolbar — reaction + reply + "..." menu, grouped.
            // Sits on the INNER side of the bubble (toward the center): right of an
            // inbound bubble, left of an outbound bubble.
            const actionBar = (
              <div
                className={`relative shrink-0 self-end mb-1 flex items-center transition-opacity duration-150 ${
                  hoveredMessageId === msgId || reactionPickerMsgId === msgId || menuMsgId === msgId
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <div className="flex items-center gap-0.5 rounded-full bg-popover border border-border shadow-sm px-0.5 py-0.5">
                  <button
                    title="Bày tỏ cảm xúc"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    onClick={() => { setReactionPickerMsgId((c) => (c === msgId ? null : msgId)); setMenuMsgId(null); }}
                  >
                    <SmilePlus className="h-4 w-4" />
                  </button>
                  <button
                    title="Trả lời"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    onClick={() => { setReplyTo({ id: msgId, body: bodyText.substring(0, 100), senderLabel }); setReactionPickerMsgId(null); setMenuMsgId(null); }}
                  >
                    <Reply className="h-4 w-4" />
                  </button>
                  <button
                    title="Thêm"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    onClick={() => { setMenuMsgId((c) => (c === msgId ? null : msgId)); setReactionPickerMsgId(null); }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {/* Reaction picker (above the toolbar) */}
                {reactionPickerMsgId === msgId && (
                  <div className={`absolute bottom-full mb-1 z-30 flex items-center gap-0.5 bg-popover border border-border rounded-full px-2 py-1 shadow-md ${isOutbound ? "right-0" : "left-0"}`}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        className="text-sm w-7 h-7 flex items-center justify-center rounded-full cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => { toggleReaction(msgId, emoji); setReactionPickerMsgId(null); }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* "..." actions menu (Zalo-style). Copy works now; BE-backed actions
                    land in later phases and are disabled ("sắp có") meanwhile. */}
                {menuMsgId === msgId && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuMsgId(null)} />
                    <div className={`absolute bottom-full mb-1 z-50 w-52 py-1 rounded-xl bg-popover border border-border shadow-lg ${isOutbound ? "right-0" : "left-0"}`}>
                      <MenuItem
                        icon={copiedMsgId === msgId ? <Check /> : <Copy />}
                        label={copiedMsgId === msgId ? "Đã copy" : "Copy tin nhắn"}
                        onClick={() => copyMessage(msgId, bodyText)}
                      />
                      <MenuItem
                        icon={<Pin />}
                        label={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                        onClick={() => setFlag(msgId, { pinned: !isPinned })}
                      />
                      <MenuItem
                        icon={<Star />}
                        label={isStarred ? "Bỏ đánh dấu" : "Đánh dấu tin nhắn"}
                        onClick={() => setFlag(msgId, { starred: !isStarred })}
                      />
                      <MenuItem icon={<ListChecks />} label="Chọn nhiều tin nhắn" soon />
                      <div className="my-1 border-t border-border/60" />
                      {/* CSKH: admin gỡ được MỌI tin (kể cả tin khách) — chị Jennie chốt 08/08.
                          Kênh khác giữ nguyên trạng thái "sắp có". */}
                      {isCskh && !msg.is_recalled && (
                        <MenuItem
                          icon={<RotateCcw />}
                          label="Thu hồi"
                          danger
                          onClick={() => recallMessage(msgId)}
                        />
                      )}
                      {/* Sửa: CHỈ tin do phía CSKH gửi. Máy chủ cũng từ chối tin của khách (42501),
                          đây chỉ là lớp lịch sự để chị không bấm vào rồi mới báo lỗi. */}
                      {isCskh && isOutbound && !msg.is_recalled && (
                        <MenuItem
                          icon={<Pencil />}
                          label="Sửa nội dung"
                          onClick={() => { setMenuMsgId(null); setEditingMsgId(msgId); setEditDraft(bodyText); }}
                        />
                      )}
                      {!isCskh && isOutbound && <MenuItem icon={<RotateCcw />} label="Thu hồi" soon danger />}
                      <MenuItem
                        icon={<Trash2 />}
                        label="Xóa chỉ ở phía tôi"
                        danger
                        onClick={() => setFlag(msgId, { deleted_for_me: true })}
                      />
                    </div>
                  </>
                )}
              </div>
            );

            return (
              <div key={msgId}>
                {/* FIX 5: Date divider */}
                {showDate && (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {dateLabel}
                    </span>
                  </div>
                )}

                <div
                  className={`relative flex items-end gap-1 ${isOutbound ? "justify-end" : "justify-start"} ${isSameGroup ? "mt-0.5" : "mt-3"}`}
                  onMouseEnter={() => setHoveredMessageId(msgId)}
                  onMouseLeave={() => {
                    setHoveredMessageId(null);
                    setReactionPickerMsgId((cur) => (cur === msgId ? null : cur));
                  }}
                >
                  {/* Action toolbar on the inner side — outbound bubble: toolbar on its LEFT */}
                  {isOutbound && actionBar}

                  <div className={`relative max-w-[70%] ${isOutbound ? "items-end" : "items-start"}`}>
                    {/* Sender name + time (only for first in group) */}
                    {!isSameGroup && (
                      <div className={`flex items-center gap-2 mb-1 ${isOutbound ? "justify-end" : ""}`}>
                        {isOutbound ? (
                          <>
                            <span className="text-xs text-muted-foreground">{formatTime(ts)}</span>
                            <span className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1">
                              {isAgentMsg && <Bot className="h-3 w-3 shrink-0" />}{senderLabel}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-foreground/80">{senderLabel}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(ts)}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Tin đã THU HỒI: bong bóng gạch-nét-đứt, KHÔNG dựng ảnh, KHÔNG đọc nội dung.
                        Chặn ở đây vì ChatPanel là nơi hộp thư thật sự vẽ tin (MessageBubble.tsx
                        là mã chết — 0 nơi gọi, đã đo bằng grep toàn kho ui/src). */}
                    {msg.is_recalled ? (
                      <div className="rounded-2xl border border-dashed border-border px-3.5 py-2 text-sm italic text-muted-foreground">
                        Tin nhắn đã được thu hồi
                      </div>
                    ) : editingMsgId === msgId ? (
                      <div className="rounded-2xl border border-primary/50 bg-background p-2">
                        <textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") { setEditingMsgId(null); setEditDraft(""); }
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void saveEdit(); }
                          }}
                          rows={3}
                          className="w-full resize-none rounded-lg bg-muted/40 px-2.5 py-1.5 text-sm outline-none"
                        />
                        <div className="mt-1.5 flex items-center justify-end gap-2 text-xs">
                          <span className="mr-auto text-muted-foreground">Enter để lưu · Esc để huỷ</span>
                          <button
                            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
                            onClick={() => { setEditingMsgId(null); setEditDraft(""); }}
                          >
                            Huỷ
                          </button>
                          <button
                            className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground disabled:opacity-40"
                            disabled={!editDraft.trim()}
                            onClick={() => void saveEdit()}
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm font-medium leading-relaxed ${
                        isOutbound
                          ? "bg-zinc-800 text-zinc-50 rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm border border-border/40"
                      }`}
                    >
                      {/* Image attachments from media array — CHỈ render <img> cho tin ẢNH
                          (content_type='image'); tin TỆP đi qua MessageRenderer FileMsg (tránh <img> vỡ). */}
                      {msg.content_type === "image" && Array.isArray(msg.media) && msg.media.length > 0 && (
                        <div className="mb-1.5 space-y-1">
                          {msg.media.map((url: string, j: number) => (
                            <img
                              key={j}
                              src={url}
                              alt="Hình ảnh"
                              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
                              loading="lazy"
                              data-lightbox=""
                              onClick={() => openImage(url, "Hình ảnh")}
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                el.parentElement?.insertAdjacentHTML(
                                  "beforeend",
                                  '<div class="flex items-center gap-2 text-muted-foreground text-[13px] py-1"><span>📷</span><span>Không thể tải hình ảnh</span></div>',
                                );
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {/* Smart content render — with search highlight.
                          Bỏ qua khi tin ẢNH đã render qua media[] (tránh double: ảnh + placeholder
                          "[Hình ảnh]" của MessageRenderer khi content_type=image không có extra_data). */}
                      {msg.content_type === "image" && Array.isArray(msg.media) && msg.media.length > 0 ? null : (
                        searchQuery ? (
                          <span className="text-sm leading-relaxed">{highlightText(bodyText, searchQuery)}</span>
                        ) : (
                          <MessageRenderer
                            body={bodyText}
                            content_type={msg.content_type}
                            extra_data={msg.extra_data}
                            onDark={isOutbound}
                          />
                        )
                      )}
                      {/* Nhãn "đã chỉnh sửa" (OD-4) — CSKH cần thấy tin nào đã bị sửa lại. */}
                      {msg.edited_at && (
                        <span className="mt-0.5 block text-[10px] italic opacity-70">đã chỉnh sửa</span>
                      )}
                    </div>
                    )}

                    {/* Pin / star indicators (operator-side flags) */}
                    {(isPinned || isStarred) && (
                      <div className={`flex items-center gap-1.5 mt-0.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
                        {isPinned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-500">
                            <Pin className="h-3 w-3" /> Đã ghim
                          </span>
                        )}
                        {isStarred && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-yellow-600 dark:text-yellow-500">
                            <Star className="h-3 w-3 fill-current" /> Đã đánh dấu
                          </span>
                        )}
                      </div>
                    )}

                    {/* Existing reactions */}
                    {reactions.length > 0 && (
                      <div className={`flex gap-0.5 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                        <div className="inline-flex items-center gap-0.5 bg-muted/80 rounded-full px-1.5 py-0.5 border border-border/50">
                          {reactions.map((emoji, ri) => (
                            <span key={ri} className="text-xs cursor-pointer">
                              {emoji}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Action toolbar on the inner side — inbound bubble: toolbar on its RIGHT */}
                  {!isOutbound && actionBar}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* D7: Scroll to bottom button */}
      {showScrollBottom && (
        <div className="relative">
          <button
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            className="absolute bottom-2 right-4 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Tin mới
          </button>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        channelName={conv.channel_name}
        threadId={conv.session_key.split(":")[1] || conv.chat_id}
        threadType={conv.peer_kind}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
