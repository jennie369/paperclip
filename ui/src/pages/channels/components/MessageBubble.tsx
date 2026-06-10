// Phase 0: Message bubble — inbound (left) / outbound (right)
// Shows sender name, timestamp, content, media, agent badge

import { Bot } from "lucide-react";
import { type ConversationMessage } from "@/api/channels";
import { MessageRenderer } from "./MessageRenderer";

interface Props {
  message: ConversationMessage;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message: msg }: Props) {
  const isOutbound = msg.direction === "outbound";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1.5`}>
      <div className={`max-w-[70%] group ${isOutbound ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        <div className={`flex items-center gap-1.5 mb-0.5 ${isOutbound ? "justify-end" : ""}`}>
          {!isOutbound && (
            <span className="text-[11px] font-medium text-foreground/70">
              {msg.senderName || "Khách"}
            </span>
          )}
          {isOutbound && msg.handledBy && msg.handledBy !== "manual" && (
            <span className="text-[11px] font-medium text-violet-500 inline-flex items-center gap-1">
              <Bot className="h-3 w-3 shrink-0" /> {msg.handledBy}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatTime(msg.timestamp)}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
            isOutbound
              ? "bg-primary/10 text-foreground rounded-br-sm"
              : "bg-muted/50 text-foreground rounded-bl-sm"
          }`}
        >
          {/* Media/images */}
          {msg.media && msg.media.length > 0 && (
            <div className="mb-1.5 space-y-1">
              {msg.media.map((url, i) => (
                <div key={i}>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(url) ? (
                    <img
                      src={url}
                      alt="attachment"
                      className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(url, "_blank")}
                    />
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-500 underline"
                    >
                      📎 {url.split("/").pop()}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Smart content render */}
          <MessageRenderer
            body={msg.content || ""}
            content_type={msg.contentType}
            extra_data={Array.isArray(msg.media) ? undefined : (msg.media ?? msg.extraData) as Record<string, unknown> | undefined}
          />

          {/* Skipped indicator */}
          {msg.status === "skipped" && msg.skipReason && (
            <div className="mt-1 text-[10px] text-amber-500/80 italic">
              ⏭ {msg.skipReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
