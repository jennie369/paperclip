import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import {
  Hash,
  Zap,
  Search as SearchIcon,
  BookOpen,
  AlertTriangle,
  Users,
  GraduationCap,
  Pin,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Send,
  Reply,
  Megaphone,
  FileText,
  MessageSquare,
  Plus,
  Folder,
  Target,
  Lock,
  Settings,
  Archive,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { warRoomApi, type WarRoomChannel, type WarRoomMessage } from "../api/warRoom";
import { CreateRoomModal } from "../components/war-room/CreateRoomModal";

// ─── Icon resolver ──────────────────────────────────────────

const ICON_MAP: Record<string, typeof Hash> = {
  hash: Hash,
  folder: Folder,
  target: Target,
  zap: Zap,
  megaphone: Megaphone,
  "alert-triangle": AlertTriangle,
  "book-open": BookOpen,
  users: Users,
  settings: Settings,
  "graduation-cap": GraduationCap,
  search: SearchIcon,
};

function getIcon(name?: string): typeof Hash {
  return ICON_MAP[name ?? "hash"] ?? Hash;
}

// Legacy mapping for default channels
const CHANNEL_ICONS: Record<string, typeof Hash> = {
  general: Hash,
  skills: Zap,
  research: SearchIcon,
  incidents: AlertTriangle,
  standup: Users,
  "learning-room": GraduationCap,
};

// ─── Time helper ────────────────────────────────────────────

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

// ─── Priority / type badges ─────────────────────────────────

const PRIORITY_CLASSES: Record<string, string> = {
  P0: "bg-destructive/15 text-destructive",
  P1: "bg-orange-500/15 text-orange-500",
  P2: "bg-primary/15 text-primary",
  P3: "bg-muted text-muted-foreground",
};

const TYPE_META: Record<string, { icon: typeof Megaphone; label: string; cls: string } | null> = {
  text: null,
  announcement: { icon: Megaphone, label: "Thông báo", cls: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  alert: { icon: AlertTriangle, label: "Cảnh báo", cls: "bg-destructive/12 text-destructive" },
  report: { icon: FileText, label: "Báo cáo", cls: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  task: { icon: FileText, label: "Tác vụ", cls: "bg-primary/12 text-primary" },
  status: { icon: Bot, label: "Trạng thái", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
};

const SENDER_COLORS: Record<string, string> = {
  agent: "text-sky-500",
  system: "text-amber-500",
  owner: "text-emerald-500",
  human: "text-emerald-500",
};

// ─── Message Types for Input ────────────────────────────────

const MESSAGE_TYPES = [
  { value: "text", label: "Tin nhắn", icon: MessageSquare },
  { value: "announcement", label: "Thông báo", icon: Megaphone },
  { value: "alert", label: "Cảnh báo", icon: AlertTriangle },
];

// ═══════════════════════════════════════════════════════════════
// CHANNEL ITEM — sidebar
// ═══════════════════════════════════════════════════════════════

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: WarRoomChannel;
  isActive: boolean;
  onClick: () => void;
}) {
  // Prefer explicit icon, fallback to legacy mapping by name
  const IconComponent = channel.icon ? getIcon(channel.icon) : (CHANNEL_ICONS[channel.name] ?? Hash);
  const channelColor = channel.color ?? "amber";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 h-[34px] px-2.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors border-none text-left mb-0.5 ${
        isActive
          ? `bg-${channelColor}-500/10 text-${channelColor}-600 dark:text-${channelColor}-400`
          : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      title={channel.description ?? channel.name}
    >
      <IconComponent className={`h-3.5 w-3.5 shrink-0 ${isActive ? `text-${channelColor}-500` : ""}`} />
      <span className="flex-1 truncate">{channel.display_name ?? `#${channel.name}`}</span>
      {channel.is_private && <Lock size={10} className="text-muted-foreground shrink-0" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function WarRoomMessageRow({
  message,
  replyCount = 0,
  isExpanded = false,
  onToggleThread,
  onPin,
  onReply,
  isCompact = false,
}: {
  message: WarRoomMessage;
  replyCount?: number;
  isExpanded?: boolean;
  onToggleThread?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onReply?: (msg: WarRoomMessage) => void;
  isCompact?: boolean;
}) {
  const { id, sender_name, sender_type, message_type, content, priority, is_pinned, created_at } = message;
  const typeMeta = TYPE_META[message_type] ?? null;
  const SenderIcon = sender_type === "agent" ? Bot : User;
  const senderColor = SENDER_COLORS[sender_type] ?? "text-muted-foreground";

  return (
    <div
      className={`group relative flex gap-2.5 px-3 rounded-lg transition-colors hover:bg-accent/50 ${
        is_pinned ? "border-l-2 border-amber-500/40 pl-2.5" : ""
      } ${isCompact ? "py-1.5" : "py-2"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          sender_type === "agent"
            ? "bg-sky-500/12"
            : sender_type === "system"
            ? "bg-amber-500/12"
            : "bg-primary/12"
        }`}
      >
        <SenderIcon className={`h-3.5 w-3.5 ${senderColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${senderColor}`}>{sender_name || "Ẩn danh"}</span>
          {priority && (
            <span className={`inline-flex items-center h-[18px] px-1.5 text-[9px] font-bold rounded ${PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.P3}`}>
              {priority}
            </span>
          )}
          {typeMeta && (
            <span className={`inline-flex items-center gap-0.5 h-[18px] px-1.5 text-[9px] font-semibold rounded ${typeMeta.cls}`}>
              <typeMeta.icon className="h-2.5 w-2.5" />
              {typeMeta.label}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{timeAgo(created_at)}</span>
        </div>

        <div className="text-[13px] leading-relaxed mt-0.5 whitespace-pre-wrap break-words text-foreground/80">
          {content}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {replyCount > 0 && (
            <button
              onClick={() => onToggleThread?.(id)}
              className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-primary/10 text-primary border-none cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <MessageSquare className="h-2.5 w-2.5" />
              {replyCount} phản hồi
              {isExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>
          )}
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={() => onReply?.(message)}
              className="inline-flex items-center h-6 px-1.5 text-[10px] text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground hover:bg-accent rounded transition-colors"
              title="Trả lời"
            >
              <Reply className="h-3 w-3" />
            </button>
            <button
              onClick={() => onPin?.(id, !is_pinned)}
              className={`inline-flex items-center h-6 px-1.5 text-[10px] bg-transparent border-none cursor-pointer rounded transition-colors ${
                is_pinned ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title={is_pinned ? "Bỏ ghim" : "Ghim"}
            >
              <Pin className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════

function WarRoomInput({
  channelName = "#general",
  replyingTo,
  onCancelReply,
  onSend,
}: {
  channelName: string;
  replyingTo: WarRoomMessage | null;
  onCancelReply: () => void;
  onSend: (payload: { content: string; messageType: string; replyTo: string | null }) => void;
}) {
  const [text, setText] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowTypeMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ content: trimmed, messageType, replyTo: replyingTo?.id ?? null });
    setText("");
    setMessageType("text");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeType = MESSAGE_TYPES.find((t) => t.value === messageType) ?? MESSAGE_TYPES[0];

  return (
    <div className="border-t border-border bg-background">
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-b border-border">
          <div className="w-0.5 h-4 bg-primary rounded-full" />
          <span className="text-[10px] text-primary font-medium">Trả lời {replyingTo.sender_name}</span>
          <span className="text-[10px] text-muted-foreground flex-1 truncate">{replyingTo.content?.slice(0, 80)}</span>
          <button onClick={onCancelReply} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground border-none bg-transparent cursor-pointer transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className={`h-8 px-2 rounded-lg border border-border bg-muted/30 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors ${
              messageType !== "text" ? "text-primary border-primary/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <activeType.icon className="h-3.5 w-3.5" />
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          {showTypeMenu && (
            <div className="absolute bottom-10 left-0 w-40 bg-popover border border-border rounded-lg shadow-xl overflow-hidden z-20">
              {MESSAGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => { setMessageType(type.value); setShowTypeMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium border-none cursor-pointer transition-colors text-left ${
                    messageType === type.value ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <type.icon className="h-3.5 w-3.5" />
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Trả lời ${replyingTo.sender_name}...` : `Gửi tin nhắn trong #${channelName}...`}
          rows={1}
          className="flex-1 min-h-[32px] max-h-[120px] resize-none rounded-lg px-3 py-1.5 text-[13px] bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none transition-colors"
          style={{ lineHeight: "1.5" }}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="h-8 w-8 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors disabled:opacity-25 disabled:cursor-not-allowed bg-primary/20 text-primary hover:bg-primary/30"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN WAR ROOM PAGE
// ═══════════════════════════════════════════════════════════════

export function WarRoom() {
  const [channels, setChannels] = useState<WarRoomChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<WarRoomMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<WarRoomMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});

  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<WarRoomMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [replyingTo, setReplyingTo] = useState<WarRoomMessage | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [goals, setGoals] = useState<Array<{ id: string; title: string }>>([]);

  // Room settings
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof warRoomApi.subscribeToChannel> | null>(null);
  const channelSubRef = useRef<ReturnType<typeof warRoomApi.subscribeToChannels> | null>(null);

  // ─── Load channels + Paperclip data ─────────────────────
  useEffect(() => {
    warRoomApi.getChannels().then((chs) => {
      setChannels(chs);
      if (chs.length > 0 && chs[0].id) setActiveChannelId(chs[0].id);
    });

    // Load Paperclip data for create modal
    warRoomApi.getAgents().then(setAgents);
    warRoomApi.getProjects().then(setProjects);
    warRoomApi.getGoals().then(setGoals);

    // Subscribe to channel changes (new rooms, archive)
    channelSubRef.current = warRoomApi.subscribeToChannels((channel, eventType) => {
      if (eventType === "insert" && !channel.is_archived) {
        setChannels((prev) => prev.find((c) => c.id === channel.id) ? prev : [...prev, channel]);
      } else if (eventType === "update") {
        if (channel.is_archived) {
          setChannels((prev) => prev.filter((c) => c.id !== channel.id));
        } else {
          setChannels((prev) => prev.map((c) => c.id === channel.id ? channel : c));
        }
      }
    });
    return () => { channelSubRef.current?.unsubscribe(); };
  }, []);

  // ─── Load messages ──────────────────────────────────────
  const loadMessages = useCallback(async (channelId: string) => {
    setLoading(true);
    setExpandedThreadId(null);
    setThreadMessages([]);
    setReplyingTo(null);
    setShowRoomSettings(false);

    const [msgs, pinned] = await Promise.all([
      warRoomApi.getMessages(channelId),
      warRoomApi.getPinned(channelId),
    ]);
    setMessages(msgs);
    setPinnedMessages(pinned);
    setLoading(false);

    const counts: Record<string, number> = {};
    await Promise.all(
      msgs.map(async (msg) => {
        const count = await warRoomApi.getReplyCount(msg.id);
        if (count > 0) counts[msg.id] = count;
      }),
    );
    setReplyCounts(counts);
  }, []);

  useEffect(() => {
    if (activeChannelId) loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  // ─── Realtime ───────────────────────────────────────────
  useEffect(() => {
    subscriptionRef.current?.unsubscribe();
    if (!activeChannelId) return;
    subscriptionRef.current = warRoomApi.subscribeToChannel(activeChannelId, (msg, eventType) => {
      if (eventType === "update") {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        if (msg.is_pinned) {
          setPinnedMessages((prev) => (prev.find((p) => p.id === msg.id) ? prev : [msg, ...prev]));
        } else {
          setPinnedMessages((prev) => prev.filter((p) => p.id !== msg.id));
        }
        return;
      }
      if (msg.reply_to) {
        setReplyCounts((prev) => ({ ...prev, [msg.reply_to!]: (prev[msg.reply_to!] ?? 0) + 1 }));
        if (expandedThreadId === msg.reply_to) {
          setThreadMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      } else {
        setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    });
    return () => { subscriptionRef.current?.unsubscribe(); };
  }, [activeChannelId, expandedThreadId]);

  // ─── Auto-scroll ────────────────────────────────────────
  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ─── Handlers ───────────────────────────────────────────

  async function handleToggleThread(messageId: string) {
    if (expandedThreadId === messageId) {
      setExpandedThreadId(null);
      setThreadMessages([]);
      return;
    }
    setExpandedThreadId(messageId);
    setThreadLoading(true);
    const data = await warRoomApi.getThread(messageId);
    setThreadMessages(data);
    setThreadLoading(false);
  }

  async function handleSend(payload: { content: string; messageType: string; replyTo: string | null }) {
    const data = await warRoomApi.sendMessage({
      channelId: activeChannelId,
      content: payload.content,
      messageType: payload.messageType,
      replyTo: payload.replyTo,
    });
    setReplyingTo(null);
    if (data && !payload.replyTo) {
      setMessages((prev) => (prev.find((m) => m.id === data.id) ? prev : [...prev, data]));
    } else if (data && payload.replyTo) {
      setReplyCounts((prev) => ({ ...prev, [payload.replyTo!]: (prev[payload.replyTo!] ?? 0) + 1 }));
      if (expandedThreadId === payload.replyTo) setThreadMessages((prev) => [...prev, data]);
    }
  }

  async function handlePin(messageId: string, pinned: boolean) {
    await warRoomApi.pinMessage(messageId, pinned);
  }

  async function handleArchiveChannel() {
    if (!activeChannel || activeChannel.is_default) return;
    setArchiving(true);
    await warRoomApi.archiveChannel(activeChannelId);
    setChannels((prev) => prev.filter((c) => c.id !== activeChannelId));
    const remaining = channels.filter((c) => c.id !== activeChannelId);
    if (remaining.length > 0) setActiveChannelId(remaining[0].id);
    setShowRoomSettings(false);
    setArchiving(false);
  }

  function handleRoomCreated(channelId: string) {
    setActiveChannelId(channelId);
    // Refresh channels to get the new room
    warRoomApi.getChannels().then(setChannels);
  }

  // ─── Derived ────────────────────────────────────────────

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const activeChannelName = activeChannel?.name ?? "general";
  const ActiveChannelIcon = activeChannel?.icon
    ? getIcon(activeChannel.icon)
    : (CHANNEL_ICONS[activeChannelName] ?? Hash);

  // Group channels by type
  const defaultChannels = channels.filter((c) => c.is_default && !c.is_archived);
  const projectChannels = channels.filter((c) => c.channel_type === "project" && !c.is_archived);
  const goalChannels = channels.filter((c) => c.channel_type === "goal" && !c.is_archived);
  const customChannels = channels.filter(
    (c) => !c.is_default && !c.is_archived && c.channel_type !== "project" && c.channel_type !== "goal",
  );

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ─── Channel sidebar ─────────────────────────────── */}
      <aside
        className={`w-[200px] shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[240px] max-lg:z-50
          ${mobileSidebarOpen ? "max-lg:block" : "max-lg:hidden"}`}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[13px] font-bold text-amber-500">War Room</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border-none bg-transparent cursor-pointer"
              title="Tạo phòng mới"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg border-none bg-transparent cursor-pointer text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-2 py-2 flex-1">
          {/* Default channels */}
          <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground px-2.5 mb-1.5">
            KÊNH
          </div>
          {defaultChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              onClick={() => { setActiveChannelId(channel.id); setMobileSidebarOpen(false); }}
            />
          ))}

          {/* Non-default channels that aren't project/goal (legacy or group) */}
          {customChannels.length > 0 && (
            <>
              <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-muted-foreground px-2.5 mt-3 mb-1">
                TÙY CHỈNH
              </div>
              {customChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => { setActiveChannelId(channel.id); setMobileSidebarOpen(false); }}
                />
              ))}
            </>
          )}

          {/* Project rooms */}
          {projectChannels.length > 0 && (
            <>
              <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-muted-foreground px-2.5 mt-3 mb-1">
                DỰ ÁN
              </div>
              {projectChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => { setActiveChannelId(channel.id); setMobileSidebarOpen(false); }}
                />
              ))}
            </>
          )}

          {/* Goal rooms */}
          {goalChannels.length > 0 && (
            <>
              <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-muted-foreground px-2.5 mt-3 mb-1">
                MỤC TIÊU
              </div>
              {goalChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => { setActiveChannelId(channel.id); setMobileSidebarOpen(false); }}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ─── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2.5 px-4 h-[44px]">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1 rounded border-none bg-transparent cursor-pointer text-muted-foreground"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <ActiveChannelIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">#{activeChannelName}</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline flex-1 truncate">
              {activeChannel?.description ?? ""}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* Project/Goal link */}
              {activeChannel?.project_id && (
                <span className="hidden md:inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-blue-500/10 text-blue-500">
                  <Folder size={10} /> Project
                  <ExternalLink size={8} />
                </span>
              )}
              {activeChannel?.goal_id && (
                <span className="hidden md:inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded bg-green-500/10 text-green-500">
                  <Target size={10} /> Goal
                  <ExternalLink size={8} />
                </span>
              )}
              {/* Pinned */}
              {pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinned(!showPinned)}
                  className={`h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 border-none cursor-pointer transition-colors ${
                    showPinned ? "bg-amber-500/15 text-amber-500" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  title="Tin đã ghim"
                >
                  <Pin className="h-3 w-3" />
                  <span className="hidden sm:inline">{pinnedMessages.length}</span>
                </button>
              )}
              {/* Settings (non-default channels only) */}
              {activeChannel && !activeChannel.is_default && (
                <button
                  onClick={() => setShowRoomSettings(!showRoomSettings)}
                  className={`h-7 px-1.5 rounded-md text-[11px] flex items-center border-none cursor-pointer transition-colors ${
                    showRoomSettings ? "bg-accent text-foreground" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  title="Cài đặt phòng"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Room settings panel (inline) */}
          {showRoomSettings && activeChannel && !activeChannel.is_default && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  Loại: <span className="text-foreground font-medium">{activeChannel.channel_type ?? "group"}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Tạo bởi: <span className="text-foreground font-medium">{activeChannel.created_by ?? "system"}</span>
                </span>
                {activeChannel.auto_created && (
                  <span className="text-[10px] text-amber-500 font-medium">Tự động tạo</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleArchiveChannel}
                    disabled={archiving}
                    className="h-6 px-2 text-[10px] font-medium rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border-none cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                    title="Lưu trữ phòng này"
                  >
                    {archiving ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
                    Lưu trữ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Pinned bar */}
          {showPinned && pinnedMessages.length > 0 && (
            <div className="border-b border-border bg-amber-500/5 max-h-[160px] overflow-y-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Pin className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                  Tin ghim ({pinnedMessages.length})
                </span>
              </div>
              {pinnedMessages.map((msg) => (
                <WarRoomMessageRow key={`pinned-${msg.id}`} message={msg} isCompact onPin={handlePin} />
              ))}
            </div>
          )}

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-1 py-2">
            {loading ? (
              <div className="space-y-3 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <ActiveChannelIcon className="h-8 w-8 mx-auto mb-2.5 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground">Chưa có tin nhắn</div>
                <div className="text-xs text-muted-foreground/60 mt-1">
                  Gửi tin nhắn đầu tiên trong #{activeChannelName}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <Fragment key={msg.id}>
                    <WarRoomMessageRow
                      message={msg}
                      replyCount={replyCounts[msg.id] ?? 0}
                      isExpanded={expandedThreadId === msg.id}
                      onToggleThread={handleToggleThread}
                      onPin={handlePin}
                      onReply={setReplyingTo}
                    />
                    {expandedThreadId === msg.id && (
                      <div className="ml-10 border-l-2 border-primary/20 pl-2 mb-2">
                        {threadLoading ? (
                          <div className="py-2 px-3">
                            <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                          </div>
                        ) : threadMessages.length === 0 ? (
                          <div className="py-2 px-3 text-[11px] text-muted-foreground/50">Chưa có phản hồi</div>
                        ) : (
                          threadMessages.map((reply) => (
                            <WarRoomMessageRow key={reply.id} message={reply} isCompact onPin={handlePin} onReply={setReplyingTo} />
                          ))
                        )}
                      </div>
                    )}
                  </Fragment>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <WarRoomInput
            channelName={activeChannelName}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onSend={handleSend}
          />
        </div>
      </div>

      {/* ─── Create Room Modal ───────────────────────────── */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRoomCreated}
        agents={agents}
        projects={projects}
        goals={goals}
      />
    </div>
  );
}
