// TicketDetailPanel — shared read-only ticket overlay (SSOT 2026-08-03).
// Extracted from TicketListPage so BOTH the CRM ticket page AND the inbox
// CustomerSidebar / ConversationList badge open the SAME overlay (no split-brain).
// `onEdit` is optional: surfaces without an edit flow (inbox) simply hide the Sửa button.

import { Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

export function TicketDetailPanel({
  ticket, onClose, onEdit,
}: {
  ticket: any;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const nav = useNavigate();
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background border-l shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
            <h2 className="text-base font-semibold mt-0.5 leading-tight">{ticket.title}</h2>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] || ""}`}>
            {ticket.priority}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] || ""}`}>
            {statusLabels[ticket.status] || ticket.status}
          </span>
          {ticket.category && (
            <span className="rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">{ticket.category}</span>
          )}
        </div>

        {ticket.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Mô tả</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>
        )}

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

        {Array.isArray(ticket.timeline) && ticket.timeline.length > 0 && (
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
