import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  Bot,
  User,
  FlaskConical,
  Trash2,
} from "lucide-react";
import { agentConfigsApi, PROVIDER_LABELS, type AgentTestResult } from "@/api/agentConfigs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  duration_ms?: number;
  provider?: string;
  model?: string;
}

export function AgentTestPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-configs", slug],
    queryFn: () => agentConfigsApi.fetchBySlug(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isSending || !slug) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const result = await agentConfigsApi.test(slug, text);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toISOString(),
        duration_ms: result.duration_ms,
        provider: result.provider,
        model: result.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Lỗi: ${err.message || "Không thể gửi tin nhắn"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  if (!slug) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Thiếu slug agent
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("../agents-config")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Thử nghiệm: {isLoading ? "..." : agent?.display_name || slug}
          </h1>
          {agent && (
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px]">
                {PROVIDER_LABELS[agent.provider] || agent.provider}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {agent.model}
              </Badge>
            </div>
          )}
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={clearMessages}>
            <Trash2 className="h-3 w-3 mr-1" />
            Xóa
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              Gửi tin nhắn để thử nghiệm agent
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mỗi tin nhắn sẽ gọi API test riêng biệt (không giữ lịch sử)
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs">
                <Bot className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && msg.duration_ms != null && (
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground opacity-70">
                  <Clock className="h-3 w-3" />
                  <span>{(msg.duration_ms / 1000).toFixed(1)}s</span>
                  {msg.provider && <span>· {msg.provider}</span>}
                  {msg.model && <span className="font-mono">· {msg.model}</span>}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-muted rounded-lg px-3.5 py-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Nhập tin nhắn thử nghiệm..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isSending}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
