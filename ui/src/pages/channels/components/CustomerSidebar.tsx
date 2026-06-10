// Phase 0: Customer Sidebar — right panel showing CRM mini profile
// Tags, stats, Gemral data, notes

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink, RefreshCw, ShoppingBag, Ticket, Flame, CloudSun, Snowflake, Pencil, Check, CalendarClock } from "lucide-react";
import { type ChannelSession } from "@/api/channels";
import { crmApi } from "@/api/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleModal } from "../../crm/components/SimpleModal";
import { getChannelVisual } from "./channelConfig";
import type { CommandCrmProfile } from "@/components/crm-messaging/command-center/types";
import { CommandCustomer360 } from "@/components/crm-messaging/command-center/CommandCustomer360";
import { mapCrm } from "@/components/crm-messaging/command-center/adapters";

const defaultTicketForm = { title: "", description: "", category: "general", priority: "medium", status: "open", assigned_to_agent: "" };

// SSOT enums (crm_customers) — khớp docs/design_and_architecture/CRM_AND_META_CAPI_SSOT.md
const STATUS_LABELS: Record<string, string> = {
  lead_moi: "Lead mới", quan_tam: "Quan tâm", can_follow_up: "Follow up",
  dang_tu_van: "Tư vấn", cho_thanh_toan: "Chờ TT", da_mua: "Đã mua",
  khach_vip: "VIP", khach_than_thiet: "Thân thiết", churned: "Churned", blacklist: "Blacklist",
};

interface RecentOrder {
  id: string;
  order_number?: string;
  total?: number;
  currency?: string;
  status?: string;
  created_at: string;
}

interface RecentTicket {
  id: string;
  subject?: string;
  status?: string;
  priority?: string;
  created_at: string;
}

interface Props {
  conversation: ChannelSession;
  onClose: () => void;
  onShowOrderPanel?: () => void;
}

export function CustomerSidebar({ conversation: conv, onClose, onShowOrderPanel }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customer = conv.customer;
  const channelCfg = getChannelVisual(conv.channel_name);
  const displayName = customer?.display_name || conv.sender_name || "Không rõ";
  // "Xem hồ sơ đầy đủ" + tag/quote (subsystem riêng) mới mở trang CRM full;
  // name/status/temperature/note đều sửa INLINE tại panel này.
  const goProfile = () => {
    if (customer?.id) navigate(`/crm/customers/${customer.id}?from=${encodeURIComponent(window.location.pathname)}`);
  };

  // ── Inline edit + autosave (PUT /customers/:id qua crmApi — không duplicate route) ──
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, any>) =>
      customer?.id ? crmApi.updateCustomer(customer.id, patch) : Promise.resolve(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (customer?.id) queryClient.invalidateQueries({ queryKey: ["crm", "customer", customer.id] });
    },
  });
  const saveName = () => {
    const v = nameDraft.trim();
    if (v && v !== customer?.display_name) updateMutation.mutate({ display_name: v });
    setEditingName(false);
  };

  // ── Lịch Hẹn: inline date picker → next_follow_up_at (cột đã whitelist) ──
  const [showFollowUp, setShowFollowUp] = useState(false);

  // ── Phiếu HT: ticket modal (move từ ChatHeader vào card) ──
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState(defaultTicketForm);
  const { data: agentList = [] } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const res = await fetch("/api/channels/agent-configs");
      if (!res.ok) return [];
      return (await res.json()).map((a: any) => ({ slug: a.slug, name: a.display_name || a.slug }));
    },
    staleTime: 60_000,
    enabled: showTicketModal,
  });
  const createTicketMut = useMutation({
    mutationFn: (d: any) => crmApi.createTicket({ ...d, customer_id: customer?.id }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      queryClient.invalidateQueries({ queryKey: ["customer-tickets", customer?.id] });
      setShowTicketModal(false);
      setTicketForm(defaultTicketForm);
    },
  });

  // Sync Gemral data
  const syncMutation = useMutation({
    mutationFn: () =>
      customer?.id
        ? fetch(`/api/channels/crm/customers/${customer.id}/sync-gemral`, { method: "POST" }).then((r) => r.json())
        : Promise.resolve(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Add note
  const [noteText, setNoteText] = useState("");
  const addNoteMutation = useMutation({
    mutationFn: () =>
      customer?.id
        ? fetch(`/api/channels/crm/customers/${customer.id}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: noteText }),
          }).then((r) => r.json())
        : Promise.resolve(null),
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const gemral = customer?.gemral_data as Record<string, any> | null | undefined;

  // Recent orders (last 3)
  const { data: recentOrders = [] } = useQuery<RecentOrder[]>({
    queryKey: ["customer-orders", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const res = await fetch(`/api/channels/crm/customers/${customer.id}/orders?limit=3`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.orders ?? [];
    },
    enabled: !!customer?.id,
    staleTime: 30_000,
  });

  // Recent tickets (last 3)
  const { data: recentTickets = [] } = useQuery<RecentTicket[]>({
    queryKey: ["customer-tickets", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const res = await fetch(`/api/channels/crm/customers/${customer.id}/tickets?limit=3`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.tickets ?? [];
    },
    enabled: !!customer?.id,
    staleTime: 30_000,
  });

  return (
    <div className="p-3 space-y-4">
      {/* Header: avatar + name + close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-medium text-white"
            style={{ backgroundColor: channelCfg.color }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="w-full text-sm font-semibold px-1.5 py-0.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onMouseDown={(e) => e.preventDefault()} onClick={saveName} className="p-1 rounded hover:bg-muted shrink-0" title="Lưu">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setNameDraft(customer?.display_name || displayName); setEditingName(true); }}
                disabled={!customer?.id}
                className="group flex items-center gap-1 text-sm font-semibold truncate hover:text-primary disabled:cursor-default disabled:hover:text-foreground"
                title={customer?.id ? "Bấm để sửa tên" : undefined}
              >
                <span className="truncate">{displayName}</span>
                {customer?.id && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />}
              </button>
            )}
            {customer?.status && (
              <div className="text-[11px] text-muted-foreground">{STATUS_LABELS[customer.status] || customer.status}</div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Inline edit: Trạng thái (funnel thủ công) — autosave xuống crm_customers.
          Nhiệt độ lead KHÔNG có ở đây vì là cột dẫn xuất (trigger tự tính từ
          lead_score) — chỉ hiển thị read-only ở khối Lead Score bên dưới. */}
      {customer?.id && (
        <div>
          <label className="text-[11px] text-muted-foreground font-medium">Trạng thái</label>
          <select
            value={customer.status || "lead_moi"}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            disabled={updateMutation.isPending}
            className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      {/* Rich Customer 360 card — same component as /crm-inbox Command Center.
          Quick actions THẬT (không showcase/navigate): Gọi (tel) · Lịch Hẹn
          (inline date) · Tạo đơn (mở order panel) · Phiếu HT (modal ticket). */}
      {customer && (
        <CommandCustomer360
          crm={{
            ...mapCrm(conv),
            quickActions: [
              ...(customer.phone ? [{ label: "Gọi Ngay", icon: "phone", tone: "success" as const }] : []),
              { label: "Lịch Hẹn", icon: "calendar", tone: "primary" as const },
              { label: "Tạo đơn", icon: "package", tone: "primary" as const },
              { label: "Phiếu HT", icon: "ticket", tone: "neutral" as const },
            ],
          } as CommandCrmProfile}
          onEdit={() => { setNameDraft(customer.display_name || displayName); setEditingName(true); }}
          onAddTag={goProfile}
          onCreateQuote={goProfile}
          onQuickAction={(a) => {
            if (a.icon === "phone" && customer.phone) window.location.href = `tel:${customer.phone}`;
            else if (a.icon === "calendar") setShowFollowUp((v) => !v);
            else if (a.icon === "package") onShowOrderPanel?.();
            else if (a.icon === "ticket") { setTicketForm(defaultTicketForm); setShowTicketModal(true); }
          }}
        />
      )}

      {/* Lịch Hẹn — inline date, autosave next_follow_up_at */}
      {customer?.id && showFollowUp && (
        <div className="rounded-md border bg-muted/20 p-2">
          <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> Hẹn follow-up
          </label>
          <input
            type="date"
            value={customer.next_follow_up_at ? customer.next_follow_up_at.slice(0, 10) : ""}
            onChange={(e) => {
              updateMutation.mutate({ next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null });
              setShowFollowUp(false);
            }}
            className="w-full mt-1 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* Lead score (Command Center card omits it) */}
      {customer?.lead_score != null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Lead Score</span>
          <span className={`text-xs font-bold flex items-center gap-1 ${
            customer.lead_score >= 70 ? "text-red-500" :
            customer.lead_score >= 40 ? "text-amber-500" : "text-blue-400"
          }`}>
            {customer.lead_temperature === "hot"
              ? <Flame className="h-3.5 w-3.5 shrink-0" />
              : customer.lead_temperature === "warm"
              ? <CloudSun className="h-3.5 w-3.5 shrink-0" />
              : <Snowflake className="h-3.5 w-3.5 shrink-0" />}
            {customer.lead_score}/100
          </span>
        </div>
      )}

      {/* Gemral Data */}
      {gemral && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground font-medium">Gemral</span>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="p-0.5 rounded hover:bg-muted"
              title="Đồng bộ lại"
            >
              <RefreshCw className={`h-3 w-3 text-muted-foreground ${syncMutation.isPending ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="space-y-1 text-xs">
            {gemral.tier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tier</span>
                <span className="font-medium uppercase">{gemral.tier}</span>
              </div>
            )}
            {gemral.scanner_tier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scanner</span>
                <span>{gemral.scanner_tier}</span>
              </div>
            )}
            {gemral.enrollments && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khóa học</span>
                <span>{gemral.enrollments} đăng ký</span>
              </div>
            )}
            {gemral.ctv_tier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CTV</span>
                <span className="capitalize">{gemral.ctv_tier}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders (last 3) */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Đơn hàng gần đây</span>
          </div>
          <div className="space-y-1.5">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-xs bg-muted/20 rounded-md px-2 py-1.5">
                <div className="min-w-0">
                  <span className="font-medium">#{order.order_number || order.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-1.5">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.total != null && (
                    <span className="font-medium">
                      {order.total.toLocaleString("vi-VN")}{order.currency === "VND" ? "đ" : ` ${order.currency || ""}`}
                    </span>
                  )}
                  {order.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      order.status === "paid" || order.status === "fulfilled"
                        ? "bg-green-500/10 text-green-600"
                        : order.status === "pending"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted/50 text-muted-foreground"
                    }`}>
                      {order.status === "paid" ? "Đã TT" : order.status === "fulfilled" ? "Hoàn thành" : order.status === "pending" ? "Chờ" : order.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tickets (last 3) */}
      {recentTickets.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Ticket className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Yêu cầu gần đây</span>
          </div>
          <div className="space-y-1.5">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="text-xs bg-muted/20 rounded-md px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium flex-1 min-w-0">
                    {ticket.subject || `Ticket #${ticket.id.slice(0, 8)}`}
                  </span>
                  {ticket.priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                      ticket.priority === "high" || ticket.priority === "urgent"
                        ? "bg-red-500/10 text-red-500"
                        : ticket.priority === "medium"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted/50 text-muted-foreground"
                    }`}>
                      {ticket.priority === "urgent" ? "Gấp" : ticket.priority === "high" ? "Cao" : ticket.priority === "medium" ? "TB" : "Thấp"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                  <span>{ticket.status === "open" ? "Mở" : ticket.status === "closed" ? "Đóng" : ticket.status || "Mở"}</span>
                  <span>
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {customer?.ai_summary && (
        <div>
          <div className="text-[11px] text-muted-foreground font-medium mb-1">Tóm tắt AI</div>
          <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded-md p-2">
            {customer.ai_summary}
          </p>
        </div>
      )}

      {/* Quick note */}
      <div>
        <div className="text-[11px] text-muted-foreground font-medium mb-1">Ghi chú nhanh</div>
        <div className="flex gap-1">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Thêm ghi chú..."
            className="flex-1 text-xs px-2 py-1.5 rounded border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && noteText.trim()) addNoteMutation.mutate();
            }}
          />
          <button
            onClick={() => noteText.trim() && addNoteMutation.mutate()}
            disabled={!noteText.trim() || addNoteMutation.isPending}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Link to full CRM profile */}
      {customer?.id && (
        <button
          onClick={goProfile}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:underline py-2"
        >
          Xem hồ sơ đầy đủ <ExternalLink className="h-3 w-3" />
        </button>
      )}

      {/* No customer linked */}
      {!customer && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">Khách chưa xác định</p>
          <p className="text-[11px] text-muted-foreground">
            Khách sẽ tự động liên kết khi có thông tin CRM
          </p>
        </div>
      )}

      {/* Modal: Phiếu hỗ trợ (chuyển từ ChatHeader vào card — reuse SimpleModal) */}
      <SimpleModal open={showTicketModal} onClose={() => setShowTicketModal(false)} title="Tạo phiếu hỗ trợ mới" footer={<>
        <Button variant="outline" onClick={() => setShowTicketModal(false)}>Hủy</Button>
        <Button disabled={!ticketForm.title.trim() || createTicketMut.isPending} onClick={() => createTicketMut.mutate(ticketForm)}>
          {createTicketMut.isPending ? "Đang tạo..." : "Tạo phiếu"}
        </Button>
      </>}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tiêu đề *</label>
            <Input value={ticketForm.title} onChange={(e) => setTicketForm((f) => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề..." />
          </div>
          <div>
            <label className="text-sm font-medium">Mô tả</label>
            <textarea value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Mô tả chi tiết..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Loại</label>
              <select value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
              <select value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
            <select value={ticketForm.assigned_to_agent} onChange={(e) => setTicketForm((f) => ({ ...f, assigned_to_agent: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Không gán —</option>
              {(agentList as Array<{ slug: string; name: string }>).map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </SimpleModal>
    </div>
  );
}
