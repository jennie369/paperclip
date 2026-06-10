// Chat Header — customer info + quick actions
// Ticket modal reuses TicketForm + SimpleModal from CRM (no duplication)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Ticket, User, Pin, BellOff,
  ClipboardList, X, Pause, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { crmApi } from "@/api/crm";
import { SimpleModal } from "../../crm/components/SimpleModal";
import { type ChannelDisplayMap } from "../UnifiedInbox";
import { AgentBadge } from "@/components/ChannelBadge";

interface Props {
  conversation: ChannelSession;
  onToggleCustomer: () => void;
  onShowOrderPanel?: () => void;
  onAction: () => void;
  channelMap?: ChannelDisplayMap;
}

const defaultTicketForm = { title: '', description: '', category: 'general', priority: 'medium', status: 'open', assigned_to_agent: '' };
export function ChatHeader({ conversation: conv, onToggleCustomer, onShowOrderPanel, onAction, channelMap }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState(defaultTicketForm);

  const chInfo = conv.channel_name && channelMap ? channelMap[conv.channel_name] : null;
  const channelLabel = chInfo?.display_name || conv.channel_name || "Kênh";
  const channelColor = chInfo?.color || "#6B7280";
  const displayName = conv.customer?.display_name || conv.sender_name || conv.sender_id || "Không rõ";
  const leadScore = conv.customer?.lead_score;
  // Per-conversation bot pause (metadata.bot_paused). Lets the operator take over
  // a single thread instantly — agent goes silent for THIS customer only,
  // messages still arrive. Channel-wide pause lives in Cài đặt kênh.
  const botPaused = (conv.metadata as { bot_paused?: boolean } | undefined)?.bot_paused === true;

  // Agent list for ticket assignment (same query as TicketListPage)
  const { data: agents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const res = await fetch('/api/channels/agent-configs');
      if (!res.ok) return [];
      return (await res.json()).map((a: any) => ({ slug: a.slug, name: a.display_name || a.slug }));
    },
    staleTime: 60_000,
    enabled: showTicketModal,
  });
  const agentList = (agents || []) as Array<{ slug: string; name: string }>;

  // Create ticket mutation (same as TicketListPage)
  const createTicketMut = useMutation({
    mutationFn: (d: any) => crmApi.createTicket(d),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      setShowTicketModal(false);
      setTicketForm(defaultTicketForm);
    },
  });

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
        {/* Compact single row: Avatar + Name + Badges + Actions */}
        <div className="flex items-center justify-between gap-2">
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

          {/* Quick actions inline */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Per-chat agent picker — turn bot ON (pick agent) / OFF (— Không bot —),
                works even when the channel has no default agent. */}
            <select
              value={conv.agent_slug || ""}
              disabled={changeAgentMut.isPending}
              onChange={(e) => changeAgentMut.mutate(e.target.value)}
              title="Chọn agent trả lời hội thoại này (bật bot) — hoặc '— Không bot —' để tắt bot riêng chat này"
              className={`text-[11px] rounded-md border px-1.5 py-1 max-w-[150px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 mr-1 ${
                conv.agent_slug
                  ? "border-border/60 bg-muted/50 text-foreground"
                  : "border-dashed border-amber-500/50 bg-amber-500/5 text-amber-600 font-medium"
              }`}
            >
              <option value="">— Không bot —</option>
              {chatAgentOptions.map((a: { slug: string; name: string }) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
            {conv.agent_slug && (
              <button
                onClick={() => quickAction(() => channelsApi.setBotPaused(conv.session_key, !botPaused))}
                title={botPaused
                  ? "Bot đang TẮT cho hội thoại này — bấm để bật AI trả lời lại"
                  : "Dừng bot cho hội thoại này để bạn trả tay (tin khách vẫn về)"}
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
            <IconBtn icon={<Package className="h-3.5 w-3.5" />} title="Tạo đơn" onClick={() => onShowOrderPanel?.()} />
            <IconBtn icon={<Ticket className="h-3.5 w-3.5" />} title="Phiếu HT" onClick={() => { setTicketForm(defaultTicketForm); setShowTicketModal(true); }} />
            {conv.customer?.id && (
              <IconBtn icon={<User className="h-3.5 w-3.5" />} title="Xem CRM" onClick={() => navigate(`/crm/customers/${conv.customer!.id}`)} />
            )}
            <IconBtn icon={<Pin className="h-3.5 w-3.5" />} title={conv.is_pinned ? "Bỏ ghim" : "Ghim"} onClick={() => quickAction(() => channelsApi.pinConversation(conv.session_key))} active={conv.is_pinned} />
            <IconBtn icon={<BellOff className="h-3.5 w-3.5" />} title={conv.is_muted ? "Bật TB" : "Tắt TB"} onClick={() => quickAction(() => channelsApi.muteConversation(conv.session_key))} active={conv.is_muted} />
            <IconBtn icon={<ClipboardList className="h-3.5 w-3.5" />} title="Xem CRM" onClick={onToggleCustomer} />
          </div>
        </div>
      </div>

      {/* ═══ Modal: Phiếu hỗ trợ (reuse TicketForm từ CRM) ═══ */}
      <SimpleModal open={showTicketModal} onClose={() => setShowTicketModal(false)} title="Tạo phiếu hỗ trợ mới" footer={<>
        <Button variant="outline" onClick={() => setShowTicketModal(false)}>Hủy</Button>
        <Button disabled={!ticketForm.title.trim() || createTicketMut.isPending} onClick={() => createTicketMut.mutate(ticketForm)}>
          {createTicketMut.isPending ? 'Đang tạo...' : 'Tạo phiếu'}
        </Button>
      </>}>
        {/* Same form as TicketListPage — Tiêu đề, Mô tả, Loại, Ưu tiên, Gán agent */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tiêu đề *</label>
            <Input value={ticketForm.title} onChange={e => setTicketForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề..." />
          </div>
          <div>
            <label className="text-sm font-medium">Mô tả</label>
            <textarea value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Mô tả chi tiết..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Loại</label>
              <select value={ticketForm.category} onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="general">Chung</option>
                <option value="product_inquiry">Hỏi sản phẩm</option>
                <option value="order_issue">Vấn đề đơn hàng</option>
                <option value="payment_issue">Thanh toán</option>
                <option value="shipping_issue">Giao hàng</option>
                <option value="refund_request">Hoàn tiền</option>
                <option value="technical_support">Kỹ thuật</option>
                <option value="complaint">Khiếu nại</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ưu tiên</label>
              <select value={ticketForm.priority} onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="critical">Nghiêm trọng</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Gán cho agent</label>
            <select value={ticketForm.assigned_to_agent} onChange={e => setTicketForm(f => ({ ...f, assigned_to_agent: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Không gán —</option>
              {agentList.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
            {ticketForm.assigned_to_agent && (
              <p className="text-xs text-blue-600 mt-1">
                Agent "{ticketForm.assigned_to_agent}" sẽ nhận thông báo qua War Room và xử lý ngay.
              </p>
            )}
          </div>
        </div>
      </SimpleModal>
    </>
  );
}

// Compact icon-only button for header actions
function IconBtn({
  icon,
  title,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}
