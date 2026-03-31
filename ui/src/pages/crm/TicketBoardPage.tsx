// Ticket Board — Kanban view with drag & drop columns

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crmApi } from "@/api/crm";

const columns = [
  { status: 'open', label: 'Mới', color: 'border-blue-500' },
  { status: 'assigned', label: 'Đã gán', color: 'border-cyan-500' },
  { status: 'in_progress', label: 'Đang xử lý', color: 'border-yellow-500' },
  { status: 'escalated', label: 'Escalated', color: 'border-red-500' },
  { status: 'resolved', label: 'Đã giải quyết', color: 'border-green-500' },
  { status: 'closed', label: 'Đóng', color: 'border-gray-400' },
];

const priorityColors: Record<string, string> = {
  critical: 'bg-red-600 text-white', urgent: 'bg-red-500/10 text-red-600',
  high: 'bg-orange-500/10 text-orange-600', medium: 'bg-yellow-500/10 text-yellow-700',
  low: 'bg-gray-500/10 text-gray-600',
};

function timeAgo(d?: string): string {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + 'p';
  if (ms < 86400000) return Math.round(ms / 3600000) + 'h';
  return Math.round(ms / 86400000) + 'd';
}

export function TicketBoardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dragTicket, setDragTicket] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['crm', 'tickets', 'board'],
    queryFn: () => crmApi.getTickets({ limit: '200' }),
    staleTime: 10_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      crmApi.updateTicket(id, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'tickets'] }),
  });

  const tickets = data?.data || [];

  const handleDragStart = (e: React.DragEvent, ticket: any) => {
    setDragTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (dragTicket && dragTicket.status !== newStatus) {
      updateMut.mutate({ id: dragTicket.id, status: newStatus });
    }
    setDragTicket(null);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Phiếu hỗ trợ — Kanban</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/crm/tickets')}>Danh sách</Button>
          <Button size="sm" onClick={() => navigate('/crm/tickets')}>
            <Plus className="mr-1.5 h-4 w-4" /> Tạo phiếu
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 h-full min-w-max">
          {columns.map(col => {
            const colTickets = tickets.filter((t: any) => t.status === col.status);
            return (
              <div key={col.status}
                className={`w-72 shrink-0 flex flex-col rounded-lg bg-muted/20 border-t-2 ${col.color}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.status)}
              >
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">{colTickets.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {isLoading ? (
                    <div className="h-20 bg-muted/30 rounded animate-pulse" />
                  ) : colTickets.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">Trống</div>
                  ) : colTickets.map((t: any) => (
                    <div key={t.id}
                      draggable
                      onDragStart={e => handleDragStart(e, t)}
                      onClick={() => navigate(`/crm/tickets`)}
                      className="rounded-md border bg-background p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[t.priority] || ''}`}>
                          {t.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t.ticket_number}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                        <span>{t.customer?.display_name || '—'}</span>
                        <span>{t.assigned_to_agent || ''} {timeAgo(t.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
