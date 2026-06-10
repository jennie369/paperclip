// Phase 0: Customer Sidebar — right panel showing CRM mini profile
// Tags, stats, Gemral data, notes

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink, RefreshCw, ShoppingBag, Ticket, Pencil, Check, CalendarClock } from "lucide-react";
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
const TEMP_LABELS: Record<string, string> = { cold: "Lạnh", warm: "Ấm", hot: "Nóng", on_fire: "Rất nóng" };
const tempLabel = (t?: string | null) => TEMP_LABELS[t || "cold"] || "Lạnh";

function timeAgo(d?: string): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + " phút trước";
  if (ms < 86400000) return Math.round(ms / 3600000) + " giờ trước";
  return Math.round(ms / 86400000) + " ngày trước";
}

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
}

export function CustomerSidebar({ conversation: conv, onClose }: Props) {
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

  // ── Full CRM record (parity với trang detail: tags có id, lead_temperature_manual,
  //    stats, metadata, email_status...) — fetch riêng, KHÔNG phình payload conversations ──
  const { data: full } = useQuery({
    queryKey: ["crm", "customer", customer?.id],
    queryFn: () => crmApi.getCustomer(customer!.id),
    enabled: !!customer?.id,
  });
  const f = full || (customer as any) || {};

  // Tags (crm_tags) + segments (read-only) — như trang detail
  const { data: allTags = [] } = useQuery({ queryKey: ["crm", "tags"], queryFn: () => crmApi.getTags() });
  const { data: segments = [] } = useQuery({
    queryKey: ["crm", "customer-segments", customer?.id],
    queryFn: () => crmApi.getCustomerSegments(customer!.id),
    enabled: !!customer?.id,
  });
  const addTagMut = useMutation({
    mutationFn: (tagId: string) => crmApi.addTag(customer!.id, tagId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crm", "customer", customer?.id] }),
  });
  const removeTagMut = useMutation({
    mutationFn: (tagId: string) => crmApi.removeTag(customer!.id, tagId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["crm", "customer", customer?.id] }),
  });
  const fmtVND = (n: any) => (n && Number(n) > 0 ? `${Number(n).toLocaleString("vi-VN")}₫` : "0₫");

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

      {/* ── Bộ control đầy đủ (parity với cột trái trang CRM detail) ── */}
      {customer?.id && (
        <div className="space-y-3">
          {/* Trạng thái */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Trạng thái</label>
            <select
              value={f.status || customer.status || "lead_moi"}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
              disabled={updateMutation.isPending}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Nhiệt độ lead — override tay (lead_temperature_manual); __auto__ = về auto */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">
              Nhiệt độ {f.lead_temperature_manual ? "· tay" : `· tự động (${f.lead_score ?? customer.lead_score ?? 0}đ)`}
            </label>
            <select
              value={f.lead_temperature_manual || "__auto__"}
              onChange={(e) => updateMutation.mutate({ lead_temperature_manual: e.target.value === "__auto__" ? null : e.target.value })}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="__auto__">Tự động ({tempLabel(f.lead_temperature || customer.lead_temperature)})</option>
              {Object.entries(TEMP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Hẹn follow-up */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Hẹn follow-up
            </label>
            <input
              type="date"
              value={f.next_follow_up_at ? String(f.next_follow_up_at).slice(0, 10) : ""}
              onChange={(e) => updateMutation.mutate({ next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Phân loại (Tags) — add/remove inline */}
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Phân loại (Tags)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {((f.tags as any[]) || []).map((t: any) => (
                <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border bg-muted/40">
                  {t.name}
                  <button onClick={() => removeTagMut.mutate(t.id)} className="hover:text-destructive" title="Gỡ tag"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {((f.tags as any[]) || []).length === 0 && <span className="text-[11px] text-muted-foreground">Chưa có tag</span>}
            </div>
            <select
              value=""
              onChange={(e) => { if (e.target.value) addTagMut.mutate(e.target.value); }}
              disabled={addTagMut.isPending}
              className="w-full mt-1 text-xs px-2 py-1.5 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">+ Thêm tag...</option>
              {(allTags as any[])
                .filter((t: any) => !((f.tags as any[]) || []).some((ct: any) => ct.id === t.id))
                .map((t: any) => <option key={t.id} value={t.id}>{t.category ? `[${t.category}] ` : ""}{t.name}</option>)}
            </select>
          </div>

          {/* Segment (read-only — audience động theo rule) */}
          {segments.length > 0 && (
            <div>
              <label className="text-[11px] text-muted-foreground font-medium" title="Nhóm động tự gom theo điều kiện — không gán tay">Segment (tự động)</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {segments.map((s) => (
                  <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-dashed bg-primary/5 text-primary">{s.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats + Newsletter */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/30 p-2">
              <div className="font-bold text-base">{f.total_orders ?? 0}</div>
              <div className="text-muted-foreground">Đơn hàng</div>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <div className="font-bold text-base">{fmtVND(f.total_revenue)}</div>
              <div className="text-muted-foreground">Doanh thu</div>
            </div>
          </div>
          {f.email_status && customer.email && (
            <div className="flex items-center gap-2 text-[11px]" title="Newsletter quản lý ở Resend (suppression list), không sửa tại đây.">
              <span className="text-muted-foreground">Newsletter:</span>
              <span className={`px-1.5 py-0.5 rounded ${f.email_status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                {f.email_status === "active" ? "Đang nhận" : f.email_status === "unsubscribed" ? "Đã huỷ" : f.email_status}
              </span>
              <span className="text-muted-foreground/60">· qua Resend</span>
            </div>
          )}
        </div>
      )}

      {/* Rich Customer 360 card — contact + LTV + journey + quick actions (Gọi · Phiếu HT).
          Tags ẩn ở đây (đã có khối tag editable phía trên). Tạo đơn đã bỏ theo yêu cầu. */}
      {customer && (
        <CommandCustomer360
          crm={{
            ...mapCrm(conv),
            tags: [],
            quickActions: [
              ...(customer.phone ? [{ label: "Gọi Ngay", icon: "phone", tone: "success" as const }] : []),
              { label: "Phiếu HT", icon: "ticket", tone: "neutral" as const },
            ],
          } as CommandCrmProfile}
          onEdit={() => { setNameDraft(customer.display_name || displayName); setEditingName(true); }}
          onAddTag={goProfile}
          onCreateQuote={goProfile}
          onQuickAction={(a) => {
            if (a.icon === "phone" && customer.phone) window.location.href = `tel:${customer.phone}`;
            else if (a.icon === "ticket") { setTicketForm(defaultTicketForm); setShowTicketModal(true); }
          }}
        />
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

      {/* Tóm tắt AI (tab Tổng quan trang CRM) */}
      {(f.ai_summary || customer?.ai_summary) && (
        <div>
          <div className="text-[11px] text-muted-foreground font-medium mb-1">Tóm tắt AI</div>
          <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded-md p-2">
            {f.ai_summary || customer?.ai_summary}
          </p>
        </div>
      )}

      {/* Hoạt động gần đây (tab Tổng quan trang CRM) — từ crm_interactions */}
      {((f.interactions as any[]) || []).length > 0 && (
        <div>
          <div className="text-[11px] text-muted-foreground font-medium mb-1.5">Hoạt động gần đây</div>
          <div className="space-y-1.5">
            {((f.interactions as any[]) || []).slice(0, 8).map((i: any) => (
              <div key={i.id} className="flex items-start gap-2 text-xs border-b pb-1.5 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  i.type === "chat" ? "bg-blue-500" : i.type === "order" ? "bg-green-500" : i.type === "ticket" ? "bg-yellow-500" : "bg-muted-foreground"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{i.title || i.type}</p>
                  {i.content && <p className="text-[11px] text-muted-foreground truncate">{i.content}</p>}
                  <p className="text-[10px] text-muted-foreground">{timeAgo(i.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
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
