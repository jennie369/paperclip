// Chat Panel — center panel showing messages + input
// With emoji reactions, reply-to (D3), in-chat search (D6), timestamp grouping (D8)

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronDown, SmilePlus, Bot, Reply } from "lucide-react";
import { channelsApi, type ChannelSession, type PendingMessage } from "@/api/channels";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageRenderer } from "./MessageRenderer";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface Props {
  conversation: ChannelSession;
  onToggleCustomer: () => void;
  onShowOrderPanel?: () => void;
  onAction: () => void;
  channelMap?: ChannelDisplayMap;
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

export function ChatPanel({ conversation: conv, onToggleCustomer, onShowOrderPanel, onAction, channelMap }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledSessionRef = useRef<string | null>(null); // Session we've already scrolled to bottom for (only set AFTER messages loaded)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null); // tin đang mở full reaction picker
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
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["session-messages", conv.session_key],
    queryFn: () => channelsApi.getSessionMessages(conv.session_key, 200),
    refetchInterval: 2_000,
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
      <ChatHeader conversation={conv} onToggleCustomer={onToggleCustomer} onShowOrderPanel={onShowOrderPanel} onAction={onAction} channelMap={channelMap} />

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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Đang tải tin nhắn...</div>
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
            const isAgentMsg = isOutbound && !!msg.sent_by && msg.sent_by !== "manual";
            const senderLabel = isOutbound
              ? (isAgentMsg ? (msg.sent_by as string) : "Bạn")
              : (msg.sender_name || "Khách");

            const msgId = msg.id || String(i);
            const reactions = messageReactions[msgId] || [];
            const bodyText = msg.body || "";

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
                  className={`relative flex items-center ${isOutbound ? "justify-end" : "justify-start"} ${isSameGroup ? "mt-0.5" : "mt-3"}`}
                  onMouseEnter={() => setHoveredMessageId(msgId)}
                  onMouseLeave={() => {
                    setHoveredMessageId(null);
                    setReactionPickerMsgId((cur) => (cur === msgId ? null : cur));
                  }}
                >
                  {/* Reply button left — always takes space (invisible for outbound) */}
                  <button
                    className={`shrink-0 mr-1.5 w-6 h-6 flex items-center justify-center rounded text-muted-foreground transition-all duration-150 ${
                      isOutbound ? "invisible pointer-events-none" :
                      hoveredMessageId === msgId ? "opacity-100 hover:bg-muted/60" : "opacity-0 pointer-events-none"
                    }`}
                    title="Trả lời"
                    onClick={() => !isOutbound && setReplyTo({ id: msgId, body: bodyText.substring(0, 100), senderLabel })}
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>

                  <div className={`relative max-w-[70%] ${isOutbound ? "items-end" : "items-start"}`}>
                    {/* Sender name + time (only for first in group) */}
                    {!isSameGroup && (
                      <div className={`flex items-center gap-2 mb-1 ${isOutbound ? "justify-end" : ""}`}>
                        {isOutbound ? (
                          <>
                            <span className="text-xs text-muted-foreground">{formatTime(ts)}</span>
                            <span className="text-xs font-medium text-violet-500 inline-flex items-center gap-1">
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

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        isOutbound
                          ? "bg-violet-500/10 text-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm border border-border/40"
                      }`}
                    >
                      {/* Image attachments from media array */}
                      {msg.media && Array.isArray(msg.media) && msg.media.length > 0 && (
                        <div className="mb-1.5 space-y-1">
                          {msg.media.map((url: string, j: number) => (
                            <img
                              key={j}
                              src={url}
                              alt=""
                              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => window.open(url, "_blank")}
                            />
                          ))}
                        </div>
                      )}
                      {/* Smart content render — with search highlight */}
                      {searchQuery ? (
                        <span className="text-sm leading-relaxed">{highlightText(bodyText, searchQuery)}</span>
                      ) : (
                        <MessageRenderer
                          body={bodyText}
                          content_type={msg.content_type}
                          extra_data={msg.extra_data}
                        />
                      )}
                    </div>

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

                    {/* Reaction trigger — icon nhỏ ở góc, chỉ hiện khi hover (và picker chưa mở) */}
                    <button
                      className={`absolute -top-3 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-popover border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150 ${
                        isOutbound ? "right-1" : "left-1"
                      } ${
                        hoveredMessageId === msgId && reactionPickerMsgId !== msgId
                          ? "opacity-100 scale-100 pointer-events-auto"
                          : "opacity-0 scale-90 pointer-events-none"
                      }`}
                      title="Bày tỏ cảm xúc"
                      onClick={() => setReactionPickerMsgId(msgId)}
                    >
                      <SmilePlus className="h-3.5 w-3.5" />
                    </button>

                    {/* Full reaction picker — chỉ hiện khi đã bấm icon */}
                    <div
                      className={`absolute -top-9 z-20 flex items-center gap-0.5 bg-popover border border-border rounded-full px-2 py-1 shadow-md transition-all duration-150 ${
                        isOutbound ? "right-0" : "left-0"
                      } ${
                        reactionPickerMsgId === msgId
                          ? "opacity-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 translate-y-1 pointer-events-none"
                      }`}
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="text-sm w-7 h-7 flex items-center justify-center rounded-full cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => {
                            toggleReaction(msgId, emoji);
                            setReactionPickerMsgId(null);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Reply button in reaction row */}
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer ml-0.5 border-l border-border/50 pl-1 text-sm hover:bg-muted/70 transition-colors text-muted-foreground"
                        onClick={() => {
                          setReplyTo({ id: msgId, body: bodyText.substring(0, 100), senderLabel });
                          setReactionPickerMsgId(null);
                        }}
                        title="Trả lời"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reply button right — always takes space (invisible for inbound) */}
                  <button
                    className={`shrink-0 ml-1.5 w-6 h-6 flex items-center justify-center rounded text-muted-foreground transition-all duration-150 ${
                      !isOutbound ? "invisible pointer-events-none" :
                      hoveredMessageId === msgId ? "opacity-100 hover:bg-muted/60" : "opacity-0 pointer-events-none"
                    }`}
                    title="Trả lời"
                    onClick={() => isOutbound && setReplyTo({ id: msgId, body: bodyText.substring(0, 100), senderLabel })}
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
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
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
