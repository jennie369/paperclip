// Phase 0: Conversation context menu — right-click or [...] button
// Pin, read, mute, label, agent, export, delete

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { channelsApi, type ChannelSession, type ConversationLabel } from "@/api/channels";

interface Props {
  conversation: ChannelSession;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: () => void;
}

const LABELS: { key: ConversationLabel; icon: string; text: string }[] = [
  { key: "hot", icon: "🔥", text: "Nóng" },
  { key: "warm", icon: "🌤", text: "Ấm" },
  { key: "cold", icon: "❄️", text: "Lạnh" },
  { key: "vip", icon: "⭐", text: "VIP" },
  { key: "spam", icon: "🚫", text: "Spam" },
];

export function ConversationActions({ conversation: conv, position, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<"label" | "agent" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch agents for "change agent" submenu
  const { data: agents } = useQuery({
    queryKey: ["agent-configs"],
    queryFn: () => fetch("/api/channels/agent-configs").then((r) => r.json()),
    enabled: subMenu === "agent",
  });

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const key = conv.session_key;

  const doAction = async (fn: () => Promise<any>) => {
    await fn();
    onAction();
    onClose();
  };

  // Position adjustment to stay in viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 240),
    top: Math.min(position.y, window.innerHeight - 400),
    zIndex: 9999,
  };

  if (subMenu === "label") {
    return (
      <div ref={ref} style={style} className="w-48 bg-popover border rounded-lg shadow-lg py-1 text-[13px]">
        <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Phân loại</div>
        {LABELS.map((l) => (
          <button
            key={l.key}
            onClick={() => doAction(() => channelsApi.labelConversation(key, l.key))}
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2"
          >
            <span>{l.icon}</span> {l.text}
          </button>
        ))}
        {conv.label && (
          <button
            onClick={() => doAction(() => channelsApi.labelConversation(key, null))}
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-muted-foreground"
          >
            Gỡ phân loại
          </button>
        )}
        <div className="border-t my-1" />
        <button onClick={() => setSubMenu(null)} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-muted-foreground">
          ← Quay lại
        </button>
      </div>
    );
  }

  if (subMenu === "agent") {
    const agentList = Array.isArray(agents) ? agents : [];
    return (
      <div ref={ref} style={style} className="w-52 bg-popover border rounded-lg shadow-lg py-1 text-[13px] max-h-72 overflow-y-auto">
        <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Đổi Agent</div>
        {agentList.map((a: any) => (
          <button
            key={a.slug}
            onClick={() => doAction(() => channelsApi.changeAgent(key, a.slug))}
            className={`w-full px-3 py-1.5 text-left hover:bg-muted/50 ${conv.agent_slug === a.slug ? "bg-primary/5 font-medium" : ""}`}
          >
            {a.display_name || a.slug}
          </button>
        ))}
        <div className="border-t my-1" />
        <button onClick={() => setSubMenu(null)} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-muted-foreground">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} style={style} className="w-52 bg-popover border rounded-lg shadow-lg py-1 text-[13px]">
      {/* Pin */}
      <button onClick={() => doAction(() => channelsApi.pinConversation(key))} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <span>📌</span> {conv.is_pinned ? "Bỏ ghim" : "Ghim hội thoại"}
      </button>

      <div className="border-t my-1" />

      {/* Read/Unread */}
      <button
        onClick={() => doAction(() => channelsApi.markRead(key, !(conv.unread_count && conv.unread_count > 0)))}
        className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2"
      >
        <span>{(conv.unread_count || 0) > 0 ? "✅" : "✉️"}</span>
        {(conv.unread_count || 0) > 0 ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
      </button>

      <div className="border-t my-1" />

      {/* Mute */}
      <button onClick={() => doAction(() => channelsApi.muteConversation(key))} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <span>{conv.is_muted ? "🔔" : "🔇"}</span> {conv.is_muted ? "Bật thông báo" : "Tắt thông báo"}
      </button>

      <div className="border-t my-1" />

      {/* Label submenu */}
      <button onClick={() => setSubMenu("label")} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <span>🏷</span> Phân loại →
      </button>

      {/* Agent submenu */}
      <button onClick={() => setSubMenu("agent")} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <span>🤖</span> Đổi agent →
      </button>

      <div className="border-t my-1" />

      {/* Export */}
      <button
        onClick={() => {
          // Download as txt
          const url = `/api/channels/conversations/${encodeURIComponent(key)}/export`;
          const link = document.createElement("a");
          link.href = url;
          link.download = `conversation_${key}.txt`;
          link.click();
          onClose();
        }}
        className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2"
      >
        <span>📥</span> Xuất hội thoại
      </button>

      <div className="border-t my-1" />

      {/* Delete */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 flex items-center gap-2"
        >
          <span>🗑</span> Xóa hội thoại
        </button>
      ) : (
        <div className="px-3 py-1.5 space-y-1">
          <p className="text-xs text-red-500">Xác nhận xóa?</p>
          <div className="flex gap-2">
            <button
              onClick={() => doAction(() => channelsApi.deleteConversation(key))}
              className="px-2 py-0.5 text-xs bg-red-500 text-white rounded"
            >
              Xóa
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-2 py-0.5 text-xs bg-muted rounded">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
