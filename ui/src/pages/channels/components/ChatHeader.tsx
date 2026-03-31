// Chat Header — customer info + quick actions
// Ticket modal reuses TicketForm + SimpleModal from CRM (no duplication)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Ticket, User, Pin, BellOff,
  ClipboardList, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { channelsApi, type ChannelSession } from "@/api/channels";
import { crmApi } from "@/api/crm";
import { SimpleModal } from "../../crm/components/SimpleModal";
import { type ChannelDisplayMap } from "../UnifiedInbox";

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

  const quickAction = async (fn: () => Promise<any>) => {
    await fn();
    onAction();
  };

  return (
    <>
      <div className="border-b px-4 py-2.5 space-y-1.5">
        {/* Row 1: Name + Toggle customer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: channelColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{displayName}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="px-2 py-0.5 rounded font-medium"
                  style={{ color: channelColor, backgroundColor: `${channelColor}15` }}
                >
                  {channelLabel}
                </span>
                {conv.agent_slug && (
                  <span className="text-violet-500">{conv.agent_slug}</span>
                )}
                {conv.label && (
                  <span className="uppercase font-bold text-red-500">{conv.label}</span>
                )}
                {leadScore != null && (
                  <span>Lead: {leadScore}/100</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={onToggleCustomer} className="p-1.5 rounded hover:bg-muted" title="Xem CRM">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Row 2: Quick actions */}
        <div className="flex items-center gap-1 flex-wrap">
          <QuickBtn
            icon={<Package className="h-4 w-4" />}
            label="Tạo đơn"
            onClick={() => onShowOrderPanel?.()}
          />
          <QuickBtn
            icon={<Ticket className="h-4 w-4" />}
            label="Phiếu HT"
            onClick={() => { setTicketForm(defaultTicketForm); setShowTicketModal(true); }}
          />
          {conv.customer?.id && (
            <QuickBtn
              icon={<User className="h-4 w-4" />}
              label="Xem CRM"
              onClick={() => navigate(`/crm/customers/${conv.customer!.id}`)}
            />
          )}
          <QuickBtn
            icon={<Pin className="h-4 w-4" />}
            label={conv.is_pinned ? "Bỏ ghim" : "Ghim"}
            onClick={() => quickAction(() => channelsApi.pinConversation(conv.session_key))}
            active={conv.is_pinned}
          />
          <QuickBtn
            icon={<BellOff className="h-4 w-4" />}
            label={conv.is_muted ? "Bật TB" : "Tắt TB"}
            onClick={() => quickAction(() => channelsApi.muteConversation(conv.session_key))}
            active={conv.is_muted}
          />
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

function QuickBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md border transition-colors ${
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
