import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageCircle, User, Filter, Inbox } from "lucide-react";
import { channelsApi, type ChannelSession, type ChannelInstance } from "@/api/channels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type FilterTab = "all" | "active" | "closed";

function channelBadge(channelName: string | null) {
  if (!channelName) return null;
  if (channelName.includes("zalo")) return "ZALO";
  if (channelName.includes("fb") || channelName.includes("facebook")) return "FB";
  if (channelName.includes("telegram")) return "TG";
  return channelName.toUpperCase().slice(0, 4);
}

function formatTime(ts: string | null) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "vừa xong";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}p`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>("all");

  const statusFilter = filter === "all" ? undefined : filter;

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["channels", "sessions", filter],
    queryFn: () =>
      channelsApi.listSessions({
        status: statusFilter,
        limit: 100,
      }),
    refetchInterval: 5_000,
  });

  // Fetch channel instances to map channel_name → display_name
  const { data: instances = [] } = useQuery({
    queryKey: ["channels", "instances"],
    queryFn: () => channelsApi.listInstances(),
    staleTime: 30_000,
  });

  const channelDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const inst of instances) {
      if (inst.display_name) map.set(inst.name, inst.display_name);
    }
    return map;
  }, [instances]);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Chờ xử lý" },
    { key: "closed", label: "Đã giải quyết" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Hội thoại
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tất cả các cuộc hội thoại từ mọi kênh
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 border-b shrink-0">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {filter === "all"
                  ? "Chưa có hội thoại nào"
                  : `Không có hội thoại "${TABS.find((t) => t.key === filter)?.label}"`}
              </p>
            </div>
          </div>
        )}

        {!isLoading &&
          sessions.map((s: ChannelSession) => {
            const badge = channelBadge(s.channel_name);
            const lastMsg =
              s.history && s.history.length > 0
                ? s.history[s.history.length - 1]
                : null;
            const lastContent = lastMsg?.content?.substring(0, 100) || "(không có tin nhắn)";
            const lastRole = lastMsg?.role;

            const accountName = s.channel_name ? channelDisplayNames.get(s.channel_name) : null;

            return (
              <div
                key={s.session_key}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer border-b transition-colors"
                onClick={() => {
                  // Navigate to Zalo chat view directly (has all features)
                  const cn = s.channel_name || '';
                  const tid = s.chat_id || '';
                  if (cn && tid) {
                    navigate(`../channels/zalo-personal/${cn}/${tid}`);
                  } else {
                    navigate(`../channels/conversations/${encodeURIComponent(s.session_key)}`);
                  }
                }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {s.status === "active" && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {s.sender_name || s.sender_id || s.chat_id}
                    </span>
                    {badge && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {badge}
                      </Badge>
                    )}
                    {accountName && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 border-blue-300 text-blue-600 dark:text-blue-400">
                        {accountName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastRole === "assistant" && (
                      <span className="text-primary font-medium">Bot: </span>
                    )}
                    {lastContent}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(s.last_message_at)}
                  </span>
                  {s.agent_slug && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {s.agent_slug}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
