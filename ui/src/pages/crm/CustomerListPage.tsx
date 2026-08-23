// Customer List Page — Danh sách khách hàng CRM

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { Search, UserPlus, Upload, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadScoreBadge } from "./components/LeadScoreBadge";
import { SimpleModal } from "./components/SimpleModal";
import { crmApi, type CRMCustomer } from "@/api/crm";

const statusOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'lead_moi', label: 'Lead mới' },
  { value: 'quan_tam', label: 'Quan tâm' },
  { value: 'can_follow_up', label: 'Cần follow up' },
  { value: 'dang_tu_van', label: 'Đang tư vấn' },
  { value: 'da_mua', label: 'Đã mua' },
  { value: 'khach_vip', label: 'Khách VIP' },
  { value: 'churned', label: 'Churned' },
];

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';
}

function timeAgo(d?: string): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + ' phút trước';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
  return Math.round(ms / 86400000) + ' ngày trước';
}

const statusColors: Record<string, string> = {
  lead_moi: 'bg-blue-500/10 text-blue-600',
  quan_tam: 'bg-cyan-500/10 text-cyan-600',
  can_follow_up: 'bg-yellow-500/10 text-yellow-700',
  dang_tu_van: 'bg-orange-500/10 text-orange-600',
  cho_thanh_toan: 'bg-purple-500/10 text-purple-600',
  da_mua: 'bg-green-500/10 text-green-600',
  khach_vip: 'bg-amber-500/10 text-amber-700',
  khach_than_thiet: 'bg-emerald-500/10 text-emerald-600',
  churned: 'bg-gray-500/10 text-gray-600',
  blacklist: 'bg-red-500/10 text-red-600',
};

const statusLabels: Record<string, string> = {
  lead_moi: 'Lead mới', quan_tam: 'Quan tâm', can_follow_up: 'Follow up',
  dang_tu_van: 'Tư vấn', cho_thanh_toan: 'Chờ TT', da_mua: 'Đã mua',
  khach_vip: 'VIP', khach_than_thiet: 'Thân thiết', churned: 'Churned', blacklist: 'Blacklist',
};

const defaultNewCustomer = { display_name: '', phone: '', email: '', status: 'lead_moi' };

/**
 * @archetype form
 */
export function CustomerListPage() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = true;
  const validate = () => true;


  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tempFilter, setTempFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCustomer, setNewCustomer] = useState(defaultNewCustomer);

  const createMut = useMutation({
    mutationFn: (data: Partial<CRMCustomer>) => crmApi.createCustomer(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['crm', 'customers'] });
      setShowCreate(false);
      setNewCustomer(defaultNewCustomer);
      if (res?.id) navigate(`/crm/customers/${res.id}`);
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['crm', 'customers', { search, status, page, tempFilter }],
    queryFn: () => crmApi.getCustomers({
      ...(search && { search }),
      ...(status && { status }),
      ...(tempFilter && { lead_temperature: tempFilter }),
      page: String(page),
      limit: '25',
    }),
    staleTime: 15_000,
  });

  const list = data?.data || [];

  return (
    <div className="space-y-4 p-6">
      {/* Wraps below md: the three actions need 405px side by side, which overflows
          a 375px phone and drags the whole page into horizontal scroll. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Khách hàng</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            const rows = list.map((c: any) => [c.display_name, c.phone, c.email, c.status, c.lead_score, c.lead_temperature].join(','));
            const csv = ['Tên,SĐT,Email,Trạng thái,Lead Score,Nhiệt độ', ...rows].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `khach-hang-${new Date().toISOString().split('T')[0]}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4 mr-1" /> Xuất CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/crm/import')}>
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => { setNewCustomer(defaultNewCustomer); setShowCreate(true); }}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Thêm khách hàng
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT, email..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={tempFilter}
          onChange={e => { setTempFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tất cả nhiệt độ</option>
          <option value="cold">Cold</option>
          <option value="warm">Warm</option>
          <option value="hot">Hot</option>
          <option value="on_fire">On Fire 🔥</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">{selected.size} đã chọn</span>
          <Button size="sm" variant="outline" onClick={() => {
            selected.forEach(id => fetch(`/api/channels/crm/customers/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status:'da_mua'}) }));
            setSelected(new Set());
          }}>Đổi trạng thái</Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
          <Button size="sm" variant="destructive" onClick={async () => {
            if (!confirm('Xóa ' + selected.size + ' khách hàng đã chọn?')) return;
            await fetch('/api/channels/crm/customers/bulk-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: Array.from(selected) }),
            });
            setSelected(new Set());
            qc.invalidateQueries({ queryKey: ['crm', 'customers'] });
          }}>Xóa</Button>
        </div>
      )}

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            Lỗi tải dữ liệu: {(error as Error).message}
          </div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chưa có khách hàng nào. Nhấn "Thêm khách hàng" để tạo mới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={selected.size === list.length && list.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(list.map((c: any) => c.id)) : new Set())}
                      className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Khách hàng</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lead</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">App</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Doanh thu</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Liên hệ</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c: CRMCustomer) => (
                  <tr
                    key={c.id}
                    className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/crm/customers/${c.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => {
                        const next = new Set(selected);
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                        setSelected(next);
                      }} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.display_name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || c.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status] || 'bg-muted'}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <LeadScoreBadge score={c.lead_score} temperature={c.lead_temperature} />
                    </td>
                    <td className="px-4 py-3">
                      {c.gemral_user_id ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">Gemral</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.total_revenue > 0 ? formatVND(c.total_revenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {timeAgo(c.last_contact_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {data.total} khách hàng, trang {data.page}/{data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create customer modal */}
      <SimpleModal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm khách hàng mới" footer={<>
        <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
        <Button disabled={!newCustomer.display_name.trim() || createMut.isPending} onClick={() => createMut.mutate(newCustomer)}>
          {createMut.isPending ? 'Đang tạo...' : 'Tạo'}
        </Button>
      </>}>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Tên khách hàng *</label><Input value={newCustomer.display_name} onChange={e => setNewCustomer(f => ({ ...f, display_name: e.target.value }))} placeholder="Nguyễn Văn A" /></div>
          <div><label className="text-sm font-medium">Số điện thoại</label><Input value={newCustomer.phone} onChange={e => setNewCustomer(f => ({ ...f, phone: e.target.value }))} placeholder="0912345678" /></div>
          <div><label className="text-sm font-medium">Email</label><Input value={newCustomer.email} onChange={e => setNewCustomer(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
          <div><label className="text-sm font-medium">Trạng thái</label>
            <select value={newCustomer.status} onChange={e => setNewCustomer(f => ({ ...f, status: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {statusOptions.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </SimpleModal>
    </div>
  );
}
