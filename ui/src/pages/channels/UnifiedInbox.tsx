// Phase 0: Unified Inbox — 3-panel layout (Slack/Intercom style)
// Replaces: Hội thoại + Hộp thư
// With Contacts tab (FIX 8)

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users } from "lucide-react";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { ConversationList } from "./components/ConversationList";
import { ChatPanel } from "./components/ChatPanel";
import { CustomerSidebar } from "./components/CustomerSidebar";
import { CreateOrderPanel } from "../crm/components/CreateOrderPanel";
import { ContactsPage } from "./ContactsPage";

export type ChannelDisplayMap = Record<string, { display_name: string; color: string }>;

type InboxTab = "inbox" | "contacts";

// Right panel modes
type RightPanel = "none" | "customer" | "order";

// Channel colors based on display_name patterns
function getChannelColor(displayName: string): string {
  const lower = displayName.toLowerCase();
  if (lower.includes("gemral") || lower.includes("yinyang")) return "#22C55E";
  if (lower.includes("jn")) return "#3B82F6";
  if (lower.includes("facebook")) return "#1877F2";
  if (lower.includes("telegram")) return "#0088CC";
  return "#8B5CF6";
}

export function UnifiedInbox() {
  const [activeTab, setActiveTab] = useState<InboxTab>("inbox");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [filters, setFilters] = useState<{
    status?: string;
    channel?: string;
    search?: string;
    label?: string;
  }>({});

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

  // Fetch conversations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => channelsApi.listConversations({ ...filters, limit: 50 }),
    refetchInterval: 10_000,
  });

  const conversations = data?.conversations || [];
  const selected = conversations.find((c) => c.session_key === selectedKey) || null;

  const handleSelect = useCallback((key: string) => {
    setSelectedKey(key);
    channelsApi.markRead(key, false).then(() => refetch());
  }, [refetch]);

  const handleAction = useCallback(() => {
    refetch();
  }, [refetch]);

  const displayName = selected?.customer?.display_name || selected?.sender_name || selected?.sender_id || "Khách hàng";

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden -m-4 md:-m-6">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b bg-background shrink-0 px-3 pt-2">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "inbox"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Hộp thư
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "contacts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Danh bạ
        </button>
      </div>

      {/* Contacts tab */}
      {activeTab === "contacts" && (
        <div className="flex-1 overflow-hidden">
          <ContactsPage />
        </div>
      )}

      {/* Inbox tab */}
      {activeTab === "inbox" && (
      <div className="flex flex-1 overflow-hidden">
      {/* Panel Left: Conversation List — 320px */}
      <div className="w-80 min-w-[280px] max-w-[360px] border-r flex flex-col bg-background">
        <ConversationList
          conversations={conversations}
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
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <ChatPanel
            conversation={selected}
            onToggleCustomer={() => setRightPanel(p => p === "customer" ? "none" : "customer")}
            onShowOrderPanel={() => setRightPanel(p => p === "order" ? "none" : "order")}
            onAction={handleAction}
            channelMap={channelMap}
          />
        ) : (
          <EmptyState count={conversations.length} />
        )}
      </div>

      {/* Panel Right: Customer Sidebar OR Order Panel — 360px */}
      {rightPanel === "customer" && selected && (
        <div className="w-[360px] min-w-[300px] border-l bg-background overflow-y-auto">
          <CustomerSidebar
            conversation={selected}
            onClose={() => setRightPanel("none")}
          />
        </div>
      )}

      {rightPanel === "order" && selected && (
        <div className="w-[400px] min-w-[360px] border-l bg-background overflow-hidden">
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
      )}
    </div>
  );
}

function EmptyState({ count }: { count: number }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3 max-w-xs">
        <div className="text-4xl opacity-30">💬</div>
        <h3 className="text-sm font-medium text-foreground/70">
          {count === 0 ? "Chưa có hội thoại nào" : "Chọn hội thoại để bắt đầu"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {count === 0
            ? "Khi khách nhắn tin, hội thoại sẽ hiện ở đây."
            : `${count} hội thoại`}
        </p>
      </div>
    </div>
  );
}
