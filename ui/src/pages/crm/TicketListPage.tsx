// Ticket List Page — CRUD + Agent Assignment (gộp assign/escalate)
// v2: + cột Người tạo, + click row mở detail, + notification khi tạo, + customer picker

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Ticket, Trash2, Pencil, CheckCircle, AlertTriangle, List, Kanban, ExternalLink, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleModal } from "./components/SimpleModal";
import { crmApi } from "@/api/crm";
import { useLiveInvalidate } from "@/hooks/useLiveInvalidate";
import { useNavigate } from "react-router-dom";

function timeAgo(d?: string): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + ' phút trước';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
  return Math.round(ms / 86400000) + ' ngày trước';
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-600 text-white', urgent: 'bg-red-500/10 text-red-600',
  high: 'bg-orange-500/10 text-orange-600', medium: 'bg-yellow-500/10 text-yellow-700',
  low: 'bg-gray-500/10 text-gray-600',
};
const statusLabels: Record<string, string> = {
  open: 'Mới', assigned: 'Đã gán', in_progress: 'Đang xử lý',
  waiting_customer: 'Chờ khách', escalated: 'Escalated',
  resolved: 'Đã giải quyết', closed: 'Đóng',
};
const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600', assigned: 'bg-cyan-500/10 text-cyan-600',
  in_progress: 'bg-yellow-500/10 text-yellow-700', escalated: 'bg-red-500/10 text-red-600',
  resolved: 'bg-green-500/10 text-green-600', closed: 'bg-gray-500/10 text-gray-600',
};

const defaultForm = {
  title: '', description: '', category: 'general', priority: 'medium',
  status: 'open', assigned_to_agent: '',
  customer_id: '', created_by_agent: 'board',
};

// ═══ Toast ═══
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-xl animate-in slide-in-from-top-2 duration-300">
      <Bell className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{msg}</span>
    </div>
  );
}

// ═══ Detail side panel (read-only) ═══
function TicketDetailPanel({ ticket, onClose, onEdit }: { ticket: any; onClose: () => void; onEdit: () => void }) {
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
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] || ''}`}>
            {ticket.priority}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] || ''}`}>
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
            <p className="font-medium">{ticket.assigned_to_agent || '—'}</p>
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
              <span className={`text-xs font-medium ${new Date(ticket.sla_deadline) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                {new Date(ticket.sla_deadline) < new Date() ? 'Quá hạn' : timeAgo(ticket.sla_deadline).replace('trước', 'còn')}
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
                  <span className="shrink-0 text-[10px]">{e.ts ? new Date(e.ts).toLocaleString('vi-VN') : ''}</span>
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

export function TicketListPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioFilter, setPrioFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload sound + request browser notification permission
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.6;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fireNotification = (title: string, body: string) => {
    // In-page toast
    setToast(`${title}: ${body}`);
    // Sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    // Browser push
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  // Agents list for dropdown
  const { data: agents } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const res = await fetch('/api/channels/agent-configs');
      if (!res.ok) return [];
      return (await res.json()).map((a: any) => ({ slug: a.slug, name: a.display_name || a.slug }));
    },
    staleTime: 60_000,
  });

  // Customers list for picker
  const { data: customersData } = useQuery({
    queryKey: ['crm', 'customers-picker'],
    queryFn: () => crmApi.getCustomers({ limit: '200' }),
    staleTime: 60_000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['crm', 'tickets', { search, statusFilter, prioFilter, page }],
    queryFn: () => crmApi.getTickets({
      ...(search && { search }), ...(statusFilter && { status: statusFilter }),
      ...(prioFilter && { priority: prioFilter }), page: String(page), limit: '25',
    }),
    staleTime: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['crm', 'ticket-stats'],
    queryFn: () => crmApi.getTicketStats(),
    staleTime: 30_000,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['crm'] });

  // Live subscription — auto-refresh when tickets table changes
  useLiveInvalidate({
    table: 'crm_tickets',
    queryKeys: [['crm', 'tickets'], ['crm', 'ticket-stats'], ['crm', 'stats']],
  });

  const createMut = useMutation({
    mutationFn: (d: any) => crmApi.createTicket(d),
    onSuccess: (ticket) => {
      inv();
      setModal(null);
      setForm(defaultForm);
      fireNotification('✅ Phiếu mới đã tạo', `${ticket.ticket_number} — ${ticket.title}`);
    },
    onError: () => {
      inv();
      setModal(null);
      setForm(defaultForm);
    }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => crmApi.updateTicket(id, d),
    onSettled: () => { inv(); setModal(null); },
  });
  const resolveMut = useMutation({
    mutationFn: (id: string) => crmApi.resolveTicket(id),
    onSuccess: inv,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/channels/crm/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => { inv(); setModal(null); },
  });

  const agentList = (agents || []) as Array<{ slug: string; name: string }>;
  const customerList = customersData?.data || [];
  const tickets = data?.data || [];

  const openEdit = (t: any) => {
    setActiveTicket(t);
    setForm({
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      status: t.status,
      assigned_to_agent: t.assigned_to_agent || '',
      customer_id: t.customer_id || '',
      created_by_agent: t.created_by_agent || 'board',
    });
    setDetailTicket(null);
    setModal('edit');
  };

  return (
    <div className="space-y-4 p-6">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Phiếu hỗ trợ</h1>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input">
            <button onClick={() => setView('list')} className={`px-2.5 py-1.5 text-sm ${view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} aria-label="Danh sách">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView('kanban')} className={`px-2.5 py-1.5 text-sm border-l border-input ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} aria-label="Kanban">
              <Kanban className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => { setForm(defaultForm); setModal('create'); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Tạo phiếu mới
          </Button>
        </div>
      </div>

      {stats && (
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Tổng: <strong>{stats.total || 0}</strong></span>
          <span className="text-muted-foreground">Đang mở: <strong className="text-blue-600">{stats.open || 0}</strong></span>
          <span className="text-muted-foreground">Khẩn cấp: <strong className="text-red-600">{stats.urgent || 0}</strong></span>
          <span className="text-muted-foreground">Escalated: <strong className="text-orange-600">{stats.escalated || 0}</strong></span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tiêu đề, mã phiếu..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="open">Mới</option>
          <option value="assigned,in_progress">Đang xử lý</option>
          <option value="escalated">Escalated</option>
          <option value="resolved,closed">Đã giải quyết</option>
        </select>
        <select value={prioFilter} onChange={e => { setPrioFilter(e.target.value); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Tất cả ưu tiên</option>
          <option value="critical">Nghiêm trọng</option>
          <option value="urgent">Khẩn cấp</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
      </div>

      {/* BULK ACTIONS BAR */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
          <span className="text-sm font-medium">{selected.size} phiếu đã chọn</span>
          <select onChange={e => {
            if (!e.target.value) return;
            const newStatus = e.target.value;
            selected.forEach(id => fetch(`/api/channels/crm/tickets/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status: newStatus}) }));
            setSelected(new Set());
            e.target.value = '';
            setTimeout(inv, 500);
          }} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            <option value="">Đổi trạng thái...</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">Lỗi: {(error as Error).message}</div>
        ) : !data?.data?.length ? (
          <div className="flex flex-col items-center gap-3 p-12">
            <Ticket className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có phiếu hỗ trợ nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="px-2 py-3 w-8">
                  <input type="checkbox" className="rounded border-input" checked={data?.data?.length > 0 && selected.size === data.data.length} onChange={e => {
                    if (e.target.checked) setSelected(new Set(data.data.map((t: any) => t.id)));
                    else setSelected(new Set());
                  }} />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mã</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tiêu đề</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ưu tiên</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SLA</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Người tạo</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tạo lúc</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
              </tr></thead>
              <tbody>{data.data.map((t: any) => (
                <tr
                  key={t.id}
                  className={`border-b hover:bg-muted/30 cursor-pointer ${selected.has(t.id) ? 'bg-primary/5' : ''}`}
                  onClick={() => setDetailTicket(t)}
                >
                  <td className="px-2 py-3 w-8" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-input" checked={selected.has(t.id)} onChange={e => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(t.id); else next.delete(t.id);
                      setSelected(next);
                    }} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{t.ticket_number}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{t.title}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[t.status] || ''}`}>{statusLabels[t.status] || t.status}</span></td>
                  <td className="px-4 py-3">
                    {t.sla_deadline ? (
                      <span className={`text-[10px] font-medium ${new Date(t.sla_deadline) < new Date() ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {new Date(t.sla_deadline) < new Date() ? 'Quá hạn' : timeAgo(t.sla_deadline).replace('trước', 'còn')}
                      </span>
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.assigned_to_agent || '—'}</td>
                  <td className="px-4 py-3 text-xs" onClick={e => e.stopPropagation()}>
                    {t.created_by_agent && t.created_by_agent !== 'board' ? (
                      <button
                        className="text-blue-600 hover:underline flex items-center gap-0.5"
                        onClick={() => nav(`/GEM/agents/${t.created_by_agent}/configuration`)}
                      >
                        {t.created_by_agent} <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{t.created_by_agent || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{timeAgo(t.created_at)}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {!['resolved', 'closed'].includes(t.status) && (
                        <button onClick={() => resolveMut.mutate(t.id)} className="p-1 rounded hover:bg-green-500/10 text-green-600" title="Giải quyết">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-blue-500/10 text-blue-600" title="Sửa / Gán agent">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setActiveTicket(t); setModal('delete'); }} className="p-1 rounded hover:bg-red-500/10 text-red-600" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>}

      {/* KANBAN VIEW */}
      {view === 'kanban' && <KanbanView tickets={tickets} onStatusChange={(id, status) => updateMut.mutate({ id, d: { status } })} />}

      {/* Detail side panel */}
      {detailTicket && (
        <TicketDetailPanel
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
          onEdit={() => openEdit(detailTicket)}
        />
      )}

      {/* ═══ CREATE ═══ */}
      <SimpleModal open={modal === 'create'} onClose={() => setModal(null)} title="Tạo phiếu hỗ trợ mới" footer={<>
        <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
        <Button disabled={!form.title.trim() || createMut.isPending} onClick={() => createMut.mutate(form)}>
          {createMut.isPending ? 'Đang tạo...' : 'Tạo phiếu'}
        </Button>
      </>}>
        <TicketForm form={form} setForm={setForm} agents={agentList} customers={customerList} />
      </SimpleModal>

      {/* ═══ EDIT ═══ */}
      <SimpleModal open={modal === 'edit'} onClose={() => setModal(null)} title={`Sửa phiếu ${activeTicket?.ticket_number || ''}`} footer={<>
        <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
        <Button disabled={updateMut.isPending} onClick={() => activeTicket && updateMut.mutate({ id: activeTicket.id, d: form })}>
          {updateMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </>}>
        <TicketForm form={form} setForm={setForm} agents={agentList} customers={customerList} showStatus />
      </SimpleModal>

      {/* ═══ DELETE ═══ */}
      <SimpleModal open={modal === 'delete'} onClose={() => setModal(null)} title="Xác nhận xóa phiếu" footer={<>
        <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
        <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => activeTicket && deleteMut.mutate(activeTicket.id)}>
          {deleteMut.isPending ? 'Đang xóa...' : 'Xóa phiếu'}
        </Button>
      </>}>
        <div className="flex items-start gap-3 py-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa phiếu <strong>{activeTicket?.ticket_number}</strong> — "{activeTicket?.title}"?
          </p>
        </div>
      </SimpleModal>
    </div>
  );
}

// ═══ Shared form component ═══
function TicketForm({ form, setForm, agents, customers, showStatus }: {
  form: typeof defaultForm;
  setForm: React.Dispatch<React.SetStateAction<typeof defaultForm>>;
  agents: Array<{ slug: string; name: string }>;
  customers: Array<{ id: string; display_name: string; phone?: string; channels?: any[]; gemral_user_id?: string }>;
  showStatus?: boolean;
}) {
  const [customerSearch, setCustomerSearch] = useState('');

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return (
      c.display_name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.gemral_user_id || '').toLowerCase().includes(q)
    );
  });

  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Tiêu đề *</label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề..." />
      </div>
      <div>
        <label className="text-sm font-medium">Mô tả</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Mô tả chi tiết..." />
      </div>

      {/* Customer picker */}
      <div>
        <label className="text-sm font-medium">Khách hàng</label>
        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2 mt-1">
            <div>
              <p className="text-sm font-medium">{selectedCustomer.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedCustomer.phone || ''}
                {selectedCustomer.gemral_user_id ? ` · ID: ${selectedCustomer.gemral_user_id.slice(0, 8)}…` : ''}
              </p>
            </div>
            <button className="text-xs text-red-500 hover:text-red-700" onClick={() => setForm(f => ({ ...f, customer_id: '' }))}>✕ Bỏ chọn</button>
          </div>
        ) : (
          <div className="mt-1 border border-input rounded-md overflow-hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-3 py-2 text-sm bg-background outline-none border-b border-input"
                placeholder="Tìm tên, số điện thoại, ID..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 italic"
                onClick={() => setForm(f => ({ ...f, customer_id: '' }))}
              >— Không liên kết khách hàng —</button>
              {filteredCustomers.slice(0, 30).map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted/50 flex items-center justify-between"
                  onClick={() => { setForm(f => ({ ...f, customer_id: c.id })); setCustomerSearch(''); }}
                >
                  <span className="text-sm font-medium">{c.display_name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.phone || c.gemral_user_id?.slice(0, 8) || ''}</span>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Không tìm thấy khách hàng</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Loại</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="critical">Nghiêm trọng</option>
          </select>
        </div>
      </div>
      {showStatus && (
        <div>
          <label className="text-sm font-medium">Trạng thái</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="open">Mới</option>
            <option value="assigned">Đã gán</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="waiting_customer">Chờ khách</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="closed">Đóng</option>
          </select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium">Gán cho agent</label>
        <select value={form.assigned_to_agent} onChange={e => setForm(f => ({ ...f, assigned_to_agent: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">— Không gán —</option>
          {agents.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
        </select>
        {form.assigned_to_agent && (
          <p className="text-xs text-blue-600 mt-1">
            Agent "{form.assigned_to_agent}" sẽ nhận thông báo qua War Room và xử lý ngay.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══ Kanban View (inline) ═══
const kanbanColumns = [
  { status: 'open', label: 'Mới', color: 'border-blue-500' },
  { status: 'assigned', label: 'Đã gán', color: 'border-cyan-500' },
  { status: 'in_progress', label: 'Đang xử lý', color: 'border-yellow-500' },
  { status: 'escalated', label: 'Escalated', color: 'border-red-500' },
  { status: 'resolved', label: 'Đã giải quyết', color: 'border-green-500' },
  { status: 'closed', label: 'Đóng', color: 'border-gray-400' },
];

function KanbanView({ tickets, onStatusChange }: { tickets: any[]; onStatusChange: (id: string, status: string) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {kanbanColumns.map(col => {
        const colTickets = tickets.filter((t: any) => t.status === col.status);
        return (
          <div key={col.status}
            className={`w-64 shrink-0 flex flex-col rounded-lg bg-muted/20 border-t-2 ${col.color}`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragId) { onStatusChange(dragId, col.status); setDragId(null); } }}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2">{colTickets.length}</span>
            </div>
            <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
              {colTickets.map((t: any) => (
                <div key={t.id} draggable onDragStart={() => setDragId(t.id)}
                  className="rounded-md border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm text-xs">
                  <div className="flex justify-between mb-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</span>
                    <span className="text-muted-foreground">{t.ticket_number}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.sla_deadline && (
                    <span className={`text-[10px] font-medium ${new Date(t.sla_deadline) < new Date() ? 'text-red-600' : 'text-muted-foreground'}`}>
                      SLA: {new Date(t.sla_deadline) < new Date() ? 'Quá hạn' : timeAgo(t.sla_deadline).replace('trước', 'còn')}
                    </span>
                  )}
                  {t.assigned_to_agent && <p className="text-muted-foreground mt-1">{t.assigned_to_agent}</p>}
                  {t.created_by_agent && t.created_by_agent !== 'board' && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Tạo bởi: {t.created_by_agent}</p>
                  )}
                </div>
              ))}
              {colTickets.length === 0 && <div className="text-center text-muted-foreground py-4">Trống</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
