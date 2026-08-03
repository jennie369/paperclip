// TicketDetailPanel — shared ticket overlay (SSOT 2026-08-03).
// Extracted from TicketListPage so BOTH the CRM ticket page AND the inbox
// (CustomerSidebar / ConversationList badge) open the SAME overlay.
//
// Edit: the panel has a BUILT-IN inline editor (status / priority / assign /
// title / description + quick resolve) so every consumer can edit without wiring
// its own modal. `onEdit` is an optional OVERRIDE — the CRM ticket page passes it
// to keep using its richer edit modal; the inbox omits it → built-in inline edit.
// `onUpdated` fires after a save so consumers can refetch (e.g. the list badge).

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { crmApi } from "@/api/crm";

export function timeAgo(d?: string): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + " phút trước";
  if (ms < 86400000) return Math.round(ms / 3600000) + " giờ trước";
  return Math.round(ms / 86400000) + " ngày trước";
}

export const priorityColors: Record<string, string> = {
  critical: "bg-red-600 text-white", urgent: "bg-red-500/10 text-red-600",
  high: "bg-orange-500/10 text-orange-600", medium: "bg-yellow-500/10 text-yellow-700",
  low: "bg-gray-500/10 text-gray-600",
};
export const statusLabels: Record<string, string> = {
  open: "Mới", assigned: "Đã gán", in_progress: "Đang xử lý",
  waiting_customer: "Chờ khách", escalated: "Escalated",
  resolved: "Đã giải quyết", closed: "Đóng",
};
export const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600", assigned: "bg-cyan-500/10 text-cyan-600",
  in_progress: "bg-yellow-500/10 text-yellow-700", escalated: "bg-red-500/10 text-red-600",
  resolved: "bg-green-500/10 text-green-600", closed: "bg-gray-500/10 text-gray-600",
};

// Priority ranking for "max priority" comparisons (badge color on the list).
export const PRIORITY_RANK: Record<string, number> = {
  critical: 5, urgent: 4, high: 3, medium: 2, low: 1,
};

const STATUS_OPTS = ["open", "assigned", "in_progress", "waiting_customer", "escalated", "resolved", "closed"];
const PRIORITY_OPTS = ["low", "medium", "high", "urgent", "critical"];
const priorityLabelVi: Record<string, string> = {
  low: "Thấp", medium: "Trung bình", high: "Cao", urgent: "Khẩn cấp", critical: "Nghiêm trọng",
};

const inputCls = "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm";

export function TicketDetailPanel({
  ticket: initialTicket, onClose, onEdit, onUpdated,
}: {
  ticket: any;
  onClose: () => void;
  onEdit?: () => void;       // external edit override (CRM page richer modal)
  onUpdated?: () => void;    // fired after a built-in save (consumer refetch)
}) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [ticket, setTicket] = useState<any>(initialTicket);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initialTicket.title || initialTicket.subject || "",
    description: initialTicket.description || "",
    status: initialTicket.status || "open",
    priority: initialTicket.priority || "medium",
    assigned_to_agent: initialTicket.assigned_to_agent || "",
  });

  // Agents list for the assign dropdown (only when editing inline).
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const res = await fetch("/api/channels/agent-configs");
      if (!res.ok) return [];
      return (await res.json()).map((a: any) => ({ slug: a.slug, name: a.display_name || a.slug }));
    },
    staleTime: 60_000,
    enabled: editing && !onEdit,
  });

  const afterMutate = (patch: Record<string, any>) => {
    setTicket((t: any) => ({ ...t, ...patch }));
    qc.invalidateQueries({ queryKey: ["crm"] });
    onUpdated?.();
  };

  const save = async () => {
    setSaving(true);
    try {
      await crmApi.updateTicket(ticket.id, form);
      afterMutate(form);
      setEditing(false);
    } catch {
      /* keep editing open so the operator can retry; data preserved */
    } finally {
      setSaving(false);
    }
  };

  const quickResolve = async () => {
    setSaving(true);
    try {
      await crmApi.resolveTicket(ticket.id);
      afterMutate({ status: "resolved" });
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const startEdit = () => {
    if (onEdit) { onEdit(); return; }  // CRM page: defer to its richer modal
    setForm({
      title: ticket.title || ticket.subject || "",
      description: ticket.description || "",
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
      assigned_to_agent: ticket.assigned_to_agent || "",
    });
    setEditing(true);
  };

  const isClosed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background border-l shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
            {editing ? (
              <input
                className={`${inputCls} mt-1 font-semibold`}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Tiêu đề..."
              />
            ) : (
              <h2 className="text-base font-semibold mt-0.5 leading-tight">{ticket.title || ticket.subject}</h2>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {editing ? (
              <>
                <Button size="sm" onClick={save} disabled={saving || !form.title.trim()}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Lưu"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Hủy</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
              </>
            )}
          </div>
        </div>

        {/* Status / priority — badges (view) or selects (edit) */}
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ưu tiên</p>
              <select className={inputCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITY_OPTS.map(p => <option key={p} value={p}>{priorityLabelVi[p]}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] || ""}`}>
              {ticket.priority}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] || ""}`}>
              {statusLabels[ticket.status] || ticket.status}
            </span>
            {ticket.category && (
              <span className="rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">{ticket.category}</span>
            )}
            {/* Quick resolve — one click, no need to open the editor */}
            {!isClosed && (
              <button
                onClick={quickResolve}
                disabled={saving}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:bg-green-500/10 rounded-md px-2 py-1 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Giải quyết
              </button>
            )}
          </div>
        )}

        {/* Assigned agent (edit) */}
        {editing && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gán cho agent</p>
            <select className={inputCls} value={form.assigned_to_agent} onChange={e => setForm(f => ({ ...f, assigned_to_agent: e.target.value }))}>
              <option value="">— Không gán —</option>
              {(agents as Array<{ slug: string; name: string }>).map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Description */}
        {editing ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Mô tả</p>
            <textarea
              className={`${inputCls} min-h-[100px]`}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả chi tiết..."
            />
          </div>
        ) : ticket.description ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Mô tả</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>
        ) : null}

        {!editing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Agent phụ trách</p>
              <p className="font-medium">{ticket.assigned_to_agent || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Người tạo</p>
              {ticket.created_by_agent ? (
                <button
                  className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  onClick={() => nav(`/GEM/agents/${ticket.created_by_agent}/configuration`)}
                >
                  {ticket.created_by_agent} <ExternalLink className="h-3 w-3" />
                </button>
              ) : <p className="font-medium">—</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Khách hàng</p>
              {ticket.customer ? (
                <button
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => nav(`/GEM/crm/customers/${ticket.customer.id}`)}
                >
                  {ticket.customer.display_name}
                </button>
              ) : <p className="font-medium">—</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SLA</p>
              {ticket.sla_deadline ? (
                <span className={`text-xs font-medium ${new Date(ticket.sla_deadline) < new Date() ? "text-red-600" : "text-green-600"}`}>
                  {new Date(ticket.sla_deadline) < new Date() ? "Quá hạn" : timeAgo(ticket.sla_deadline).replace("trước", "còn")}
                </span>
              ) : <p className="font-medium">—</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tạo lúc</p>
              <p className="font-medium">{timeAgo(ticket.created_at)}</p>
            </div>
          </div>
        )}

        {!editing && Array.isArray(ticket.timeline) && ticket.timeline.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Lịch sử</p>
            <div className="space-y-1.5">
              {ticket.timeline.slice().reverse().map((e: any, i: number) => (
                <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 text-[10px]">{e.ts ? new Date(e.ts).toLocaleString("vi-VN") : ""}</span>
                  <span>{e.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
