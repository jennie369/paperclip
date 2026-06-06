// UnifiedInbox — Professional 3-panel inbox layout
// Features: Channel tabs, conversation list, chat panel, customer sidebar
// Design: Clean, modern, consistent with Paperclip theme

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users, Settings, Bell, BellOff, RefreshCw, Keyboard, HelpCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { ConversationList } from "./components/ConversationList";
import { ChatPanel } from "./components/ChatPanel";
import { CustomerSidebar } from "./components/CustomerSidebar";
import { CreateOrderPanel } from "../crm/components/CreateOrderPanel";
import { ContactsPage } from "./ContactsPage";
import { getChannelColor } from "./components/channelConfig";

export type ChannelDisplayMap = Record<string, { display_name: string; color: string }>;

type InboxTab = "inbox" | "contacts";
type RightPanel = "none" | "customer" | "order";

// Notification sound using Web Audio API (no external file needed)
let audioContext: AudioContext | null = null;

function playNotificationSound() {
  try {
    // Create or reuse audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // Create a subtle, pleasant notification sound
    // Two-tone chime: higher note followed by lower note

    // First tone (higher pitch)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (lower pitch, slight delay)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);

  } catch (e) {
    // Web Audio API not supported or blocked, ignore
  }
}

export function UnifiedInbox() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InboxTab>("inbox");
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<{
    status?: string;
    channel?: string;
    search?: string;
    label?: string;
  }>({});

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Fetch channel instances for display_name mapping
  const { data: instances } = useQuery({
    queryKey: ["channel-instances"],
    queryFn: () => channelsApi.listInstances(),
    staleTime: 60_000,
  });

  const channelMap: ChannelDisplayMap = useMemo(() => {
    const map: ChannelDisplayMap = {};
    (instances || []).forEach((ci) => {
      map[ci.name] = {
        display_name: ci.display_name || ci.name,
        color: getChannelColor(ci.display_name || ci.name),
      };
    });
    return map;
  }, [instances]);

  // Build API filters (channel filtering is done client-side for better UX)
  // Note: We removed API-level channel filter because channel_name values in DB
  // don't match simple strings like "zalo" - client-side filtering handles this properly
  const apiFilters = useMemo(() => {
    return { ...filters };
  }, [filters]);

  // Fetch conversations — 3s refetch for near-realtime preview updates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations", apiFilters],
    queryFn: () => channelsApi.listConversations({ ...apiFilters, limit: 100 }),
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
  });

  // Filter conversations by channel tab (client-side for instant filtering)
  const filteredConversations = useMemo(() => {
    const convs = data?.conversations || [];
    if (!activeChannel) return convs;

    return convs.filter((conv) => {
      const ch = (conv.channel_name || "").toLowerCase();
      switch (activeChannel) {
        case "zalo": return ch.includes("zalo");
        case "facebook": return ch.includes("facebook") || ch.includes("fb");
        case "telegram": return ch.includes("telegram");
        case "webchat": return ch.includes("webchat") || ch.includes("web");
        case "email": return ch.includes("email");
        default: return true;
      }
    });
  }, [data?.conversations, activeChannel]);

  const selected = filteredConversations.find((c) => c.session_key === selectedKey) || null;

  // Play sound on new unread message (use ALL conversations, not filtered, to avoid false triggers on tab switch).
  // Muted conversations are excluded: muting suppresses the notification sound AND the inbox badge.
  // (The per-row unread count is still shown — muted ≠ marked read, matching WhatsApp/Telegram.)
  const totalUnreadCount = useMemo(() => {
    return (data?.conversations || [])
      .filter((c) => !c.is_muted)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [data?.conversations]);

  const prevUnreadRef = usePrevious(totalUnreadCount);

  useEffect(() => {
    // Only play sound when total unread count increases (new message arrived)
    if (soundEnabled && prevUnreadRef !== undefined && totalUnreadCount > prevUnreadRef) {
      playNotificationSound();
    }
  }, [totalUnreadCount, soundEnabled, prevUnreadRef]);

  const handleSelect = useCallback((key: string) => {
    setSelectedKey(key);
    setRightPanel("none"); // Reset right panel when selecting new conversation
    channelsApi.markRead(key, false).then(() => refetch());
  }, [refetch]);

  const handleAction = useCallback(() => {
    refetch();
  }, [refetch]);

  const displayName = selected?.customer?.display_name || selected?.sender_name || selected?.sender_id || "Khách hàng";

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden -m-4 md:-m-6 bg-background">
      {/* Compact header: Main tabs + Channel tabs + Settings (ALL IN ONE ROW) */}
      <div className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm shrink-0 px-2">
        {/* Left: Main tabs + Channel tabs inline */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {/* Main tabs */}
          <button
            onClick={() => setActiveTab("inbox")}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors shrink-0
              ${activeTab === "inbox"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }
            `}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Hộp thư</span>
            {totalUnreadCount > 0 && (
              <span className="min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full px-1">
                {totalUnreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors shrink-0
              ${activeTab === "contacts"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }
            `}
          >
            <Users className="h-4 w-4" />
            <span>Danh bạ</span>
          </button>

          {/* Channel tabs inline (only when inbox active) */}
          {activeTab === "inbox" && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <ChannelTabsInline
                conversations={data?.conversations || []}
                activeChannel={activeChannel}
                onChannelChange={setActiveChannel}
              />
            </>
          )}
        </div>

        {/* Right side: Sound toggle + Settings */}
        <div className="flex items-center gap-1 pr-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`
              p-2 rounded-md transition-colors
              ${soundEnabled
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-muted-foreground/50 hover:bg-muted"
              }
            `}
            title={soundEnabled ? "Tắt âm thanh thông báo" : "Bật âm thanh thông báo"}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-2 rounded-md transition-colors ${showSettingsMenu ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title="Cài đặt"
            >
              <Settings className="h-4 w-4" />
            </button>
            {showSettingsMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-lg shadow-2xl py-1 z-[9999] border border-border bg-white dark:bg-zinc-900"
                style={{ isolation: 'isolate' }}
              >
                <button
                  type="button"
                  onClick={() => { refetch(); setShowSettingsMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  Làm mới danh sách
                </button>
                <button
                  type="button"
                  onClick={() => { navigate('/GEM/channels/settings'); setShowSettingsMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt kênh
                </button>
                <button
                  type="button"
                  onClick={() => { navigate('/GEM/ops/sop-engine?tab=registry&sub=agents'); setShowSettingsMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Quản lý agent
                </button>
                <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />
                <div className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Keyboard className="h-3 w-3" />
                    Ctrl+F: Tìm trong chat
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contacts tab */}
      {activeTab === "contacts" && (
        <div className="flex-1 overflow-hidden">
          <ContactsPage />
        </div>
      )}

      {/* Inbox tab */}
      {activeTab === "inbox" && (
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* Panel Left: Conversation List — 340px */}
            <div className="w-[340px] min-w-[300px] max-w-[400px] border-r border-border flex flex-col bg-background">
              <ConversationList
                conversations={filteredConversations}
                isLoading={isLoading}
                selectedKey={selectedKey}
                onSelect={handleSelect}
                filters={filters}
                onFiltersChange={setFilters}
                onAction={handleAction}
                channelMap={channelMap}
              />
            </div>

            {/* Panel Center: Chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              {selected ? (
                <ChatPanel
                  conversation={selected}
                  onToggleCustomer={() => setRightPanel(p => p === "customer" ? "none" : "customer")}
                  onShowOrderPanel={() => setRightPanel(p => p === "order" ? "none" : "order")}
                  onAction={handleAction}
                  channelMap={channelMap}
                />
              ) : (
                <EmptyState count={filteredConversations.length} />
              )}
            </div>

            {/* Panel Right: Customer Sidebar OR Order Panel */}
            {rightPanel === "customer" && selected && (
              <div className="w-[380px] min-w-[320px] border-l border-border bg-background overflow-y-auto">
                <CustomerSidebar
                  conversation={selected}
                  onClose={() => setRightPanel("none")}
                />
              </div>
            )}

            {rightPanel === "order" && selected && (
              <div className="w-[420px] min-w-[380px] border-l border-border bg-background overflow-hidden">
                <CreateOrderPanel
                  customer={{
                    id: selected.customer?.id || '',
                    display_name: displayName,
                    phone: selected.customer?.phone || null,
                    email: selected.customer?.email || null,
                    lead_score: selected.customer?.lead_score ?? undefined,
                    status: selected.customer?.status ?? undefined,
                  }}
                  sourceChannel={selected.channel_name || undefined}
                  onClose={() => setRightPanel("none")}
                  onSuccess={() => setRightPanel("none")}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ count }: { count: number }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted/10">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-primary/60" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground mb-1">
            {count === 0 ? "Chưa có hội thoại nào" : "Chọn hội thoại để bắt đầu"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {count === 0
              ? "Khi khách nhắn tin qua các kênh đã kết nối, hội thoại sẽ hiện ở đây."
              : `Bạn có ${count} hội thoại đang chờ xử lý`}
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook: Track previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Inline channel tabs for compact header
function ChannelTabsInline({
  conversations,
  activeChannel,
  onChannelChange,
}: {
  conversations: ChannelSession[];
  activeChannel: string | null;
  onChannelChange: (channel: string | null) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { zalo: 0, facebook: 0 };
    conversations.forEach((conv) => {
      const ch = (conv.channel_name || "").toLowerCase();
      if (ch.includes("zalo")) c.zalo++;
      else if (ch.includes("facebook") || ch.includes("fb")) c.facebook++;
    });
    return c;
  }, [conversations]);

  const tabs = [
    { id: null, label: "Tất cả", count: conversations.length },
    { id: "zalo", label: "Zalo", count: counts.zalo },
    { id: "facebook", label: "Facebook", count: counts.facebook },
  ].filter((t) => t.id === null || t.count > 0);

  return (
    <>
      {tabs.map((tab) => (
        <button
          key={tab.id ?? "all"}
          onClick={() => onChannelChange(tab.id)}
          className={`
            flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0
            ${activeChannel === tab.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }
          `}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="text-[10px] text-muted-foreground/70">{tab.count}</span>
          )}
        </button>
      ))}
    </>
  );
}
