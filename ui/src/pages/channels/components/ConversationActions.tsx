// Phase 0: Conversation context menu — right-click or [...] button
// Pin, read, mute, label, agent, export, delete

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Pin, PinOff, Mail, CheckCheck, Bell, BellOff, Tag, Bot, Download, Trash2,
  Flame, CloudSun, Snowflake, Star, Ban, ChevronRight, ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { channelsApi, type ChannelSession, type ConversationLabel } from "@/api/channels";

interface Props {
  conversation: ChannelSession;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: () => void;
}

const LABELS: { key: ConversationLabel; Icon: LucideIcon; text: string; color: string }[] = [
  { key: "hot", Icon: Flame, text: "Nóng", color: "text-red-500" },
  { key: "warm", Icon: CloudSun, text: "Ấm", color: "text-amber-500" },
  { key: "cold", Icon: Snowflake, text: "Lạnh", color: "text-sky-500" },
  { key: "vip", Icon: Star, text: "VIP", color: "text-yellow-500" },
  { key: "spam", Icon: Ban, text: "Spam", color: "text-zinc-500" },
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
            <l.Icon className={`h-4 w-4 shrink-0 ${l.color}`} /> {l.text}
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
        <button onClick={() => setSubMenu(null)} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-muted-foreground flex items-center gap-2">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Quay lại
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
        <button onClick={() => setSubMenu(null)} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 text-muted-foreground flex items-center gap-2">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} style={style} className="w-52 bg-popover border rounded-lg shadow-lg py-1 text-[13px]">
      {/* Pin */}
      <button onClick={() => doAction(() => channelsApi.pinConversation(key))} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        {conv.is_pinned
          ? <PinOff className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />}
        {conv.is_pinned ? "Bỏ ghim" : "Ghim hội thoại"}
      </button>

      <div className="border-t my-1" />

      {/* Read/Unread */}
      <button
        onClick={() => doAction(() => channelsApi.markRead(key, !(conv.unread_count && conv.unread_count > 0)))}
        className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2"
      >
        {(conv.unread_count || 0) > 0
          ? <CheckCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />}
        {(conv.unread_count || 0) > 0 ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
      </button>

      <div className="border-t my-1" />

      {/* Mute */}
      <button onClick={() => doAction(() => channelsApi.muteConversation(key))} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        {conv.is_muted
          ? <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" />}
        {conv.is_muted ? "Bật thông báo" : "Tắt thông báo"}
      </button>

      <div className="border-t my-1" />

      {/* Label submenu */}
      <button onClick={() => setSubMenu("label")} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <Tag className="h-4 w-4 shrink-0 text-muted-foreground" /> Phân loại
        <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-auto text-muted-foreground" />
      </button>

      {/* Agent submenu */}
      <button onClick={() => setSubMenu("agent")} className="w-full px-3 py-1.5 text-left hover:bg-muted/50 flex items-center gap-2">
        <Bot className="h-4 w-4 shrink-0 text-muted-foreground" /> Đổi agent
        <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-auto text-muted-foreground" />
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
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" /> Xuất hội thoại
      </button>

      <div className="border-t my-1" />

      {/* Delete */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4 shrink-0" /> Xóa hội thoại
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
