// Channel Status Cards — show connected channels with status + unread

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { MessageCircle } from "lucide-react";
import { channelsApi } from "@/api/channels";
import { PulseDot } from "./PulseDot";

const statusColors: Record<string, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  connected: "Đang kết nối",
  connecting: "Đang kết nối...",
  disconnected: "Ngắt kết nối",
  error: "Lỗi",
};

export function ChannelStatusCards() {
  const navigate = useNavigate();
  const { data: instances = [] } = useQuery({
    queryKey: ["channel-instances"],
    queryFn: () => channelsApi.listInstances(),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["channel-stats"],
    queryFn: () => channelsApi.getStats(),
    staleTime: 15_000,
  });

  const activeChannels = instances.filter((c: any) => c.enabled);
  const liveCount = activeChannels.filter((c: any) => c.status === "connected").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Kênh Chat</h3>
        <span className="text-xs text-muted-foreground">{liveCount}/{activeChannels.length} kênh live</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {activeChannels.map((ch: any) => (
          <button
            key={ch.id}
            onClick={() => navigate("/channels/inbox")}
            className="flex items-center gap-2.5 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {ch.status === "connected" && <PulseDot color={statusColors[ch.status]} />}
                <span className="text-xs font-medium truncate">{ch.display_name || ch.name}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {statusLabels[ch.status] || ch.status}
                {ch.agent_slug && <span className="ml-1 text-violet-500">{ch.agent_slug}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {stats && (
        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
          <span>Tin nhắn hôm nay: {stats.messagesInboundToday || 0}</span>
          <span>Đã xử lý: {stats.messagesHandledToday || 0}</span>
          <span>Tỉ lệ: {stats.responseRate || 0}%</span>
        </div>
      )}
    </div>
  );
}
