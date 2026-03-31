import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Radio,
  Send,
  Clock,
  CheckCircle,
  ArrowRight,
  User,
} from "lucide-react";
import { channelsApi, type ChannelSession, type ChannelStats } from "@/api/channels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ChannelCardInfo {
  type: string;
  label: string;
  description: string;
  icon: typeof MessageCircle;
  color: string;
  dotColor: string;
}

const CHANNEL_TYPES: ChannelCardInfo[] = [
  {
    type: "zalo_personal",
    label: "Zalo Cá Nhân",
    description: "Tin nhắn tự động qua Zalo Personal",
    icon: MessageCircle,
    color: "text-blue-500",
    dotColor: "bg-green-500",
  },
  {
    type: "facebook",
    label: "Facebook",
    description: "Messenger & Facebook Page",
    icon: MessageCircle,
    color: "text-blue-600",
    dotColor: "bg-gray-400",
  },
  {
    type: "zalo_oa",
    label: "Zalo OA",
    description: "Zalo Official Account",
    icon: Radio,
    color: "text-blue-500",
    dotColor: "bg-gray-400",
  },
  {
    type: "telegram",
    label: "Telegram",
    description: "Telegram Bot",
    icon: Send,
    color: "text-sky-500",
    dotColor: "bg-gray-400",
  },
];

function formatTime(ts: string | null) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "vừa xong";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} phút trước`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} giờ trước`;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

function channelBadge(channelName: string | null) {
  if (!channelName) return null;
  if (channelName.includes("zalo")) return "ZALO";
  if (channelName.includes("fb") || channelName.includes("facebook")) return "FB";
  if (channelName.includes("telegram")) return "TG";
  return channelName.toUpperCase().slice(0, 4);
}

export function ChannelsOverview() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["channels", "stats"],
    queryFn: channelsApi.getStats,
    refetchInterval: 15_000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["channels", "sessions", "recent"],
    queryFn: () => channelsApi.listSessions({ limit: 10 }),
    refetchInterval: 10_000,
  });

  const connectedChannels = new Set(
    (stats?.channels || [])
      .filter((ch) => ch.status === "connected")
      .map((ch) => ch.channel_type)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Kênh giao tiếp
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tổng quan các kênh tự động trả lời
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Tin nhắn hôm nay"
          value={stats?.messagesInboundToday ?? 0}
          icon={MessageCircle}
          loading={statsLoading}
        />
        <StatCard
          label="Đã trả lời"
          value={stats?.messagesHandledToday ?? 0}
          icon={CheckCircle}
          loading={statsLoading}
        />
        <StatCard
          label="Tỷ lệ phản hồi"
          value={`${stats?.responseRate ?? 0}%`}
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          label="Phiên hoạt động"
          value={stats?.activeSessions ?? 0}
          icon={User}
          loading={statsLoading}
        />
      </div>

      {/* Channel type cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Các kênh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNEL_TYPES.map((ct) => {
            const isConnected = connectedChannels.has(ct.type);
            const Icon = ct.icon;
            return (
              <div
                key={ct.type}
                className="border rounded-lg p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (ct.type === "zalo_personal") {
                    navigate("../channels/zalo-personal");
                  } else {
                    navigate(`../channels/settings/${ct.type}`);
                  }
                }}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${ct.color}`} />
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                      isConnected ? ct.dotColor : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{ct.label}</div>
                  <div className="text-xs text-muted-foreground">{ct.description}</div>
                </div>
                <Badge variant={isConnected ? "default" : "secondary"} className="text-[10px]">
                  {isConnected ? "Đã kết nối" : "Chưa kết nối"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent conversations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Hội thoại gần đây</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate("../channels/conversations")}
          >
            Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {sessionsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        )}

        {!sessionsLoading && sessions.length === 0 && (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-muted-foreground text-sm">Chưa có hội thoại nào</p>
          </div>
        )}

        {!sessionsLoading && sessions.length > 0 && (
          <div className="border rounded-lg divide-y">
            {sessions.map((s: ChannelSession) => {
              const badge = channelBadge(s.channel_name);
              const lastMsg =
                s.history && s.history.length > 0
                  ? s.history[s.history.length - 1]?.content?.substring(0, 80)
                  : null;
              return (
                <div
                  key={s.session_key}
                  className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() =>
                    navigate(`../channels/conversations/${encodeURIComponent(s.session_key)}`)
                  }
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
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
                      {s.agent_slug && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          Agent: {s.agent_slug}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg || "(không có tin nhắn)"}
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(s.last_message_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: typeof MessageCircle;
  loading: boolean;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className="text-2xl font-semibold">{value}</div>
      )}
    </div>
  );
}
