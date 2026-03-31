// Phase 0: Conversation List — Left panel
// Search, status tabs, channel filter, sorted conversation rows

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { ConversationItem } from "./ConversationItem";

interface Props {
  conversations: ChannelSession[];
  isLoading: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  filters: { status?: string; channel?: string; search?: string; label?: string };
  onFiltersChange: (f: Props["filters"]) => void;
  onAction: () => void;
  channelMap: ChannelDisplayMap;
}

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ xử lý" },
  { key: "resolved", label: "Đã xong" },
  { key: "pinned", label: "Đã ghim" },
] as const;

export function ConversationList({
  conversations,
  isLoading,
  selectedKey,
  onSelect,
  filters,
  onFiltersChange,
  onAction,
  channelMap,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [showChannelFilter, setShowChannelFilter] = useState(false);

  // FIX 7: New chat modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatChannel, setNewChatChannel] = useState("");
  const [newChatTarget, setNewChatTarget] = useState("");
  const [newChatCreating, setNewChatCreating] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [newChatSuccess, setNewChatSuccess] = useState(false);

  // Fetch channel instances for the new chat modal
  const { data: instances } = useQuery({
    queryKey: ["channel-instances"],
    queryFn: () => channelsApi.listInstances(),
    staleTime: 60_000,
  });

  // B5: Recent contacts for new chat suggestions
  const { data: recentContacts = [] } = useQuery({
    queryKey: ["inbox-contacts-recent"],
    queryFn: async () => {
      const r = await fetch("/api/channels/contacts?limit=8");
      return r.json();
    },
    staleTime: 30_000,
    enabled: showNewChat,
  });

  // Unique channels from conversations
  const channels = useMemo(() => {
    const set = new Set<string>();
    conversations.forEach((c) => {
      if (c.channel_name) set.add(c.channel_name);
    });
    return Array.from(set);
  }, [conversations]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  const handleSearch = (value: string) => {
    setSearchInput(value);
    // Debounce search
    clearTimeout((window as any).__inboxSearchTimer);
    (window as any).__inboxSearchTimer = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  };

  return (
    <>
      {/* Search bar + [+] button */}
      <div className="p-2 border-b flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm hội thoại..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-[13px] rounded-md border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => setShowChannelFilter((v) => !v)}
            className="absolute right-2 top-2 p-0.5 rounded hover:bg-muted"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        {/* FIX 7: New chat button */}
        <button
          onClick={() => { setShowNewChat(true); setNewChatError(null); setNewChatSuccess(false); setNewChatTarget(""); }}
          className="p-1.5 rounded-md border bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          title="Tạo hội thoại mới"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* FIX 7: New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Tạo hội thoại mới</h3>
              <button onClick={() => setShowNewChat(false)} className="p-0.5 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Kênh</label>
                <select
                  value={newChatChannel}
                  onChange={(e) => setNewChatChannel(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Chọn kênh —</option>
                  {(instances || []).map((inst: any) => (
                    <option key={inst.name} value={inst.name}>
                      {inst.display_name || inst.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">SĐT / Zalo ID / User ID</label>
                <input
                  type="text"
                  value={newChatTarget}
                  onChange={(e) => setNewChatTarget(e.target.value)}
                  placeholder="Nhập SĐT hoặc ID người dùng..."
                  className="w-full border rounded-md px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {/* B5: Recent contacts suggestions */}
                {recentContacts.length > 0 && !newChatTarget && (
                  <div className="mt-1.5">
                    <div className="text-[10px] text-muted-foreground mb-1">Liên hệ gần đây:</div>
                    <div className="flex flex-wrap gap-1">
                      {recentContacts.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewChatTarget(c.zalo_id || c.phone || c.facebook_id || "")}
                          className="px-2 py-0.5 text-[11px] rounded-full border bg-muted/50 hover:bg-muted text-foreground max-w-[120px] truncate"
                          title={c.name}
                        >
                          {c.name || c.zalo_id || c.phone}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {newChatError && (
                <p className="text-xs text-red-500">{newChatError}</p>
              )}
              {newChatSuccess && (
                <p className="text-xs text-green-600">Hội thoại đã được tạo!</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={() => setShowNewChat(false)}
                className="px-3 py-1.5 text-[13px] rounded-md border hover:bg-muted"
              >
                Hủy
              </button>
              <button
                disabled={!newChatChannel || !newChatTarget.trim() || newChatCreating}
                onClick={async () => {
                  setNewChatCreating(true);
                  setNewChatError(null);
                  try {
                    const res = await fetch("/api/channels/conversations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ channel: newChatChannel, target_id: newChatTarget.trim() }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || "Không thể tạo hội thoại");
                    }
                    setNewChatSuccess(true);
                    onAction();
                    setTimeout(() => setShowNewChat(false), 1500);
                  } catch (err: any) {
                    setNewChatError(err.message || "Tính năng đang phát triển");
                  } finally {
                    setNewChatCreating(false);
                  }
                }}
                className="px-3 py-1.5 text-[13px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {newChatCreating ? "Đang tạo..." : "Tạo hội thoại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 px-2 py-1.5 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFiltersChange({ ...filters, status: tab.key || undefined })}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              (filters.status || "") === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            {tab.key === "" && totalUnread > 0 && (
              <span className="ml-1 text-[10px] font-bold text-red-500">{totalUnread}</span>
            )}
          </button>
        ))}
      </div>

      {/* Channel filter dropdown */}
      {showChannelFilter && (
        <div className="px-2 py-1.5 border-b space-y-2">
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Kênh</div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onFiltersChange({ ...filters, channel: undefined })}
                className={`px-2 py-0.5 text-[11px] rounded-full ${
                  !filters.channel ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Tất cả
              </button>
              {channels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => onFiltersChange({ ...filters, channel: ch })}
                  className={`px-2 py-0.5 text-[11px] rounded-full truncate max-w-[140px] ${
                    filters.channel === ch ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  title={channelMap[ch]?.display_name || ch}
                >
                  {channelMap[ch]?.display_name || ch}
                </button>
              ))}
            </div>
          </div>

          {/* C2: Label filter */}
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Phân loại</div>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "", label: "Tất cả" },
                { key: "khach_hang", label: "Khách hàng" },
                { key: "doi_tac", label: "Đối tác" },
                { key: "ctv", label: "CTV" },
                { key: "vip", label: "⭐ VIP" },
                { key: "spam", label: "🚫 Spam" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onFiltersChange({ ...filters, label: key || undefined })}
                  className={`px-2 py-0.5 text-[11px] rounded-full ${
                    (filters.label || "") === key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground">
              {filters.search
                ? `Không tìm thấy hội thoại nào khớp với "${filters.search}"`
                : "Chưa có hội thoại nào"}
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.session_key}
              conversation={conv}
              isSelected={selectedKey === conv.session_key}
              onClick={() => onSelect(conv.session_key)}
              onAction={onAction}
              channelMap={channelMap}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t text-[11px] text-muted-foreground">
        {conversations.length} hội thoại{totalUnread > 0 ? ` · ${totalUnread} chưa đọc` : ""}
      </div>
    </>
  );
}
