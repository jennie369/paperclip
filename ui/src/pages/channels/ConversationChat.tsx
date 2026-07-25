import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi, type PendingMessage } from "@/api/channels";
import { is4xx } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, User, Bot, MessageCircle } from "lucide-react";

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ConversationChat() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const decodedKey = sessionKey ? decodeURIComponent(sessionKey) : "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse session key to get channel_name and thread_id for sending
  const parts = decodedKey.split(":");
  const channelName = parts[0] || "";
  const threadId = parts[1] || "";

  // Load session info
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["channels", "session", decodedKey],
    queryFn: () => channelsApi.getSession(decodedKey),
    enabled: !!decodedKey,
  });

  // Load messages
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["channels", "session-messages", decodedKey],
    queryFn: () => channelsApi.getSessionMessages(decodedKey, 200),
    enabled: !!decodedKey,
    // 4xx = yêu cầu sai → dừng, đừng gõ server vô hạn. 5xx/mất mạng vẫn thử lại
    // (bắt buộc, vì mỗi lần `pm2 restart` là vài giây fetch fail).
    retry: (n, e) => !is4xx(e) && n < 3,
    refetchInterval: (q) => (is4xx(q.state.error) ? false : 3_000),
  });

  // Send message via the Zalo Personal route (channel-specific)
  const sendMut = useMutation({
    mutationFn: () =>
      channelsApi.sendMessage(channelName, threadId, input, session?.peer_kind === "group" ? "group" : "dm"),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["channels", "session-messages", decodedKey] });
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sort messages chronologically (oldest first)
  const sorted = [...messages].sort((a, b) => {
    const ta = a.ts || a.created_at || "";
    const tb = b.ts || b.created_at || "";
    return ta.localeCompare(tb);
  });

  // Group messages by date
  const groupedByDate = new Map<string, PendingMessage[]>();
  for (const msg of sorted) {
    const dateKey = formatDate(msg.ts || msg.created_at);
    const group = groupedByDate.get(dateKey) || [];
    group.push(msg);
    groupedByDate.set(dateKey, group);
  }

  const senderDisplayName = session?.sender_name || session?.sender_id || threadId;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("../channels/conversations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{senderDisplayName}</span>
            {session?.channel_name && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {session.channel_name.includes("zalo") ? "ZALO" : session.channel_name.toUpperCase().slice(0, 4)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {session?.peer_kind === "group" ? "Nhóm" : "Tin nhắn riêng"}
            {session?.agent_slug && (
              <>
                <span className="mx-0.5">·</span>
                <span>Agent: {session.agent_slug}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-1">
        {(sessionLoading || messagesLoading) && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* Lỗi + CHƯA có tin nào → nói THẬT là lỗi đọc, đừng giả vờ "hội thoại trống".
            `messages.length === 0` là bắt buộc: react-query giữ data cũ, nên mỗi lần
            restart server mọi hội thoại đang mở đều isError — thiếu điều kiện này thì
            transcript đang đọc bị thay bằng màn lỗi. */}
        {messagesError && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <p className="text-sm text-destructive">Không tải được tin nhắn của hội thoại này.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hội thoại vẫn còn trên hệ thống — đây là lỗi khi đọc, không phải hội thoại trống.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchMessages()}>
                Thử lại
              </Button>
            </div>
          </div>
        )}

        {messagesError && messages.length > 0 && (
          <div className="mb-2 text-[11px] text-muted-foreground text-center">Mất kết nối — đang thử lại…</div>
        )}

        {!messagesLoading && !messagesError && sorted.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">Chưa có tin nhắn</p>
            </div>
          </div>
        )}

        {Array.from(groupedByDate.entries()).map(([dateLabel, msgs]) => (
          <div key={dateLabel}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] text-muted-foreground shrink-0">{dateLabel}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {msgs.map((msg) => {
                const isOutbound = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                    {/* Avatar for inbound */}
                    {!isOutbound && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mr-2 mt-1 shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                        isOutbound
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {!isOutbound && msg.sender_name && (
                        <p className="text-[10px] font-medium mb-0.5 opacity-70">
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.body || "(media)"}
                      </p>
                      <div
                        className={`flex items-center gap-1 mt-0.5 ${
                          isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px]">{formatTime(msg.ts || msg.created_at)}</span>
                        {isOutbound && msg.sent_by && (
                          <>
                            <span className="text-[10px]">·</span>
                            <Bot className="h-2.5 w-2.5" />
                            <span className="text-[10px]">{msg.sent_by}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Avatar for outbound */}
                    {isOutbound && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center ml-2 mt-1 shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        {sendMut.isError && (
          <p className="text-xs text-destructive mb-2">
            Gửi thất bại: {sendMut.error instanceof Error ? sendMut.error.message : "Lỗi không xác định"}
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) sendMut.mutate();
          }}
        >
          <input
            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Nhập tin nhắn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                e.preventDefault();
                sendMut.mutate();
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="rounded-full px-3"
            disabled={!input.trim() || sendMut.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
