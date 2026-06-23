// Chat Header — customer info + quick actions
// ("Tạo đơn" + "Phiếu HT" đã chuyển sang card Customer 360 trong panel Hồ sơ.)

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ClipboardList, X, Pause, Play,
} from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { AgentBadge } from "@/components/ChannelBadge";

interface Props {
  conversation: ChannelSession;
  onToggleCustomer: () => void;
  onAction: () => void;
  channelMap?: ChannelDisplayMap;
}

export function ChatHeader({ conversation: conv, onToggleCustomer, onAction, channelMap }: Props) {
  const chInfo = conv.channel_name && channelMap ? channelMap[conv.channel_name] : null;
  const channelLabel = chInfo?.display_name || conv.channel_name || "Kênh";
  const channelColor = chInfo?.color || "#6B7280";
  const displayName = conv.customer?.display_name || conv.sender_name || conv.sender_id || "Không rõ";
  const leadScore = conv.customer?.lead_score;
  // Per-conversation bot pause (metadata.bot_paused). Lets the operator take over
  // a single thread instantly — agent goes silent for THIS customer only,
  // messages still arrive. Channel-wide pause lives in Cài đặt kênh.
  const botPaused = (conv.metadata as { bot_paused?: boolean } | undefined)?.bot_paused === true;

  // Agent options for the inline per-chat picker (always loaded — lets the operator
  // turn the bot ON with a chosen agent even on a channel that has no default agent).
  const { data: chatAgentOptions = [] } = useQuery({
    queryKey: ['chat-agent-options'],
    queryFn: async () => {
      const res = await fetch('/api/channels/agent-configs');
      if (!res.ok) return [];
      return (await res.json()).map((a: any) => ({ slug: a.slug, name: a.display_name || a.slug }));
    },
    staleTime: 60_000,
  });
  // Assign / clear the agent for THIS conversation (writes a chat_id override that
  // resolveAgent matches; takes effect on the next inbound message).
  const changeAgentMut = useMutation({
    mutationFn: (slug: string) => channelsApi.changeAgent(conv.session_key, slug),
    onSettled: () => onAction(),
  });

  const quickAction = async (fn: () => Promise<any>) => {
    await fn();
    onAction();
  };

  return (
    <>
      <div className="border-b px-3 py-1.5">
        {/* Avatar + Name + Badges on the left; actions on the right. Wraps to a
            second row when the chat panel is narrow (e.g. customer panel open) so
            the labeled action buttons never overlap or get clipped. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: channelColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold truncate max-w-[200px]">{displayName}</h3>
                {conv.label && (
                  <span className="text-[10px] px-1.5 py-0 leading-[16px] rounded-sm font-semibold uppercase bg-red-500/10 text-red-500">
                    {conv.label}
                  </span>
                )}
                {leadScore != null && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">Lead: {leadScore}</span>
                )}
              </div>
              {/* Which connected account this thread belongs to — full name + the
                  channel's own color so the operator never replies from the wrong
                  account (e.g. Zalo Personal Jennie vs Zalo Yinyang Gemral). */}
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span className="text-[9px] text-muted-foreground shrink-0 uppercase tracking-wider font-medium">
                  Trả lời từ
                </span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold border min-w-0 max-w-[230px]"
                  style={{ backgroundColor: `${channelColor}1A`, color: channelColor, borderColor: `${channelColor}40` }}
                  title={channelLabel}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: channelColor }} />
                  <span className="truncate">{channelLabel}</span>
                </span>
                {conv.agent_slug && <AgentBadge slug={conv.agent_slug} size="sm" />}
              </div>
            </div>
          </div>

          {/* Quick actions — wrap as a group below when space is tight */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {/* Per-chat agent picker — turn bot ON (pick agent) / OFF (— Không bot —),
                works even when the channel has no default agent. */}
            <Select
              value={conv.agent_slug || "__none__"}
              onValueChange={(v) => changeAgentMut.mutate(v === "__none__" ? "" : v)}
              disabled={changeAgentMut.isPending}
            >
              <SelectTrigger
                size="sm"
                title="Đổi/TẮT AGENT xử lý hội thoại này (vĩnh viễn cho chat này). 'Không bot' = không agent nào tự trả lời. Khác nút Dừng Bot (tạm trực, bot vẫn còn agent)."
                className={`h-7 text-[11px] max-w-[170px] mr-1 ${
                  conv.agent_slug
                    ? ""
                    : "border-dashed border-amber-500/50 text-amber-600 [&>svg]:opacity-80"
                }`}
              >
                <SelectValue placeholder="— Không bot —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Không bot —</SelectItem>
                {chatAgentOptions.map((a: { slug: string; name: string }) => (
                  <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {conv.agent_slug && botPaused && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 font-semibold">Bạn đang trực</span>
            )}
            {conv.agent_slug && (
              <button
                onClick={() => quickAction(() => channelsApi.setBotPaused(conv.session_key, !botPaused))}
                title={botPaused
                  ? "Bạn đang TRỰC (bot tạm dừng cho hội thoại này) — bấm để bot tiếp tục tự trả lời"
                  : "TẠM DỪNG bot để bạn trực tiếp trả lời (takeover). Tin khách vẫn về. Bấm lại để bot tiếp tục. Khác 'Không bot' (bỏ hẳn agent)."}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors mr-1 ${
                  botPaused
                    ? "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {botPaused
                  ? <><Play className="h-3.5 w-3.5" /> Bật Bot</>
                  : <><Pause className="h-3.5 w-3.5" /> Dừng Bot</>}
              </button>
            )}
            {/* "Tạo đơn" + "Phiếu HT" đã chuyển vào card Customer 360 (panel Hồ sơ).
                "Ghim" + "Tắt TB" đã có ở cột danh sách hội thoại → bỏ khỏi header. */}
            <IconBtn icon={<ClipboardList className="h-4 w-4" />} label="Hồ sơ" title="Mở/đóng hồ sơ khách hàng" onClick={onToggleCustomer} />
          </div>
        </div>
      </div>

    </>
  );
}

// Header action button — icon + short label, larger hit area for easy clicking.
function IconBtn({
  icon,
  label,
  title,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
