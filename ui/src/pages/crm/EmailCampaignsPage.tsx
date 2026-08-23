// Email Campaigns Page — list + create campaigns

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Mail, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleModal } from "./components/SimpleModal";

function timeAgo(d?: string): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
  return Math.round(ms / 86400000) + ' ngày trước';
}

const templates = [
  { value: 'welcome', label: 'Chào mừng' },
  { value: 'thank_you', label: 'Cảm ơn mua hàng' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'win_back', label: 'Win back' },
  { value: 'course_reminder', label: 'Nhắc khóa học' },
];

const SEGMENTS = [
  { value: 'all', label: 'Tất cả', desc: 'Toàn bộ subscribers' },
  { value: 'course_tinh_yeu', label: 'Khóa Tình Yêu', desc: 'Đã mua khóa Tần Số Tình Yêu' },
  { value: 'course_trading', label: 'Khóa Trading', desc: 'Đã mua khóa Trading 3 Tiers' },
  { value: 'course_trieu_phu', label: 'Khóa Tư Duy Triệu Phú', desc: 'Đã mua khóa Triệu Phú' },
  { value: 'course_7_ngay', label: 'Khóa 7 Ngày Tần Số Gốc', desc: 'Đã mua khóa 7 Ngày' },
  { value: 'crystal_customers', label: 'Crystal Customers YYM', desc: 'Khách mua tinh thể' },
  { value: 'general', label: 'General (CTV, affiliate)', desc: 'CTV, affiliates, partners' },
  { value: 'ctv_kol', label: 'CTV/KOL', desc: 'Chỉ CTV và KOL' },
  { value: 'lead_nurture', label: 'Lead nurture (chưa mua)', desc: 'Leads chưa convert' },
];

const defaultForm = { name: '', subject: '', template: 'welcome', segment: 'all', sendTime: 'now' as 'now' | 'schedule', scheduledAt: '', body: '' };

/**
 * @archetype form
 */
export function EmailCampaignsPage() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = true;
  const validate = () => true;


  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['crm', 'campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/channels/crm/campaigns');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (d: typeof defaultForm) => {
      const res = await fetch('/api/channels/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      return res.json();
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm', 'campaigns'] }); setShowCreate(false); setForm(defaultForm); },
  });

  const sendMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/channels/crm/campaigns/${id}/send`, { method: 'POST' });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Lỗi gửi'); }
      return res.json();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'campaigns'] }),
  });

  const list = campaigns || [];

  // Stats
  const totalSent = list.reduce((s: number, c: any) => s + (c.sent_count || 0), 0);
  const totalOpened = list.reduce((s: number, c: any) => s + (c.opened_count || 0), 0);
  const totalClicked = list.reduce((s: number, c: any) => s + (c.clicked_count || 0), 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Campaigns</h1>
        <Button size="sm" onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Tạo Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{totalSent}</div><div className="text-xs text-muted-foreground">Tổng gửi</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{openRate}%</div><div className="text-xs text-muted-foreground">Tỉ lệ mở</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{clickRate}%</div><div className="text-xs text-muted-foreground">Tỉ lệ click</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{list.length}</div><div className="text-xs text-muted-foreground">Campaigns</div></Card>
      </div>

      {/* List */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12">
            <Mail className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có campaign nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gửi</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Mở</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Click</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ngày</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Hành động</th>
            </tr></thead>
            <tbody>{list.map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-xs">{c.template}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.sent_count || 0}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.opened_count || 0}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.clicked_count || 0}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'completed' ? 'bg-green-500/10 text-green-600' : c.status === 'sending' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-gray-500/10 text-gray-600'}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{timeAgo(c.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {(c.status === 'draft' || c.status === 'created') && (
                    <Button size="sm" variant="outline" disabled={sendMut.isPending} onClick={(e) => { e.stopPropagation(); sendMut.mutate(c.id); }}>
                      <Send className="h-3 w-3 mr-1" /> Gửi
                    </Button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {/* Create */}
      <SimpleModal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Email Campaign" footer={<>
        <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
        <Button disabled={!form.name.trim() || !form.subject.trim() || createMut.isPending} onClick={() => createMut.mutate(form)}>
          <Send className="mr-1.5 h-4 w-4" /> {createMut.isPending ? 'Đang tạo...' : 'Tạo Campaign'}
        </Button>
      </>}>
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Tên campaign *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Welcome Q1 2026" /></div>
          <div><label className="text-sm font-medium">Tiêu đề email *</label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="VD: Chào mừng bạn đến Gemral!" /></div>
          <div><label className="text-sm font-medium">Template</label>
            <select value={form.template} onChange={e => setForm(f => ({ ...f, template: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {templates.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select></div>
          <div><label className="text-sm font-medium">Đối tượng</label>
            <select value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>)}
            </select></div>
          <div>
            <label className="text-sm font-medium">Thời gian gửi</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="sendTime" value="now" checked={form.sendTime === 'now'} onChange={() => setForm(f => ({ ...f, sendTime: 'now' }))} /> Gửi ngay
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="sendTime" value="schedule" checked={form.sendTime === 'schedule'} onChange={() => setForm(f => ({ ...f, sendTime: 'schedule' }))} /> Lên lịch
              </label>
            </div>
            {form.sendTime === 'schedule' && (
              <Input type="datetime-local" className="mt-2" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Nội dung email</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] mt-1 font-mono"
              placeholder="Nhập nội dung email hoặc chỉnh sửa template..."
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>
        </div>
      </SimpleModal>
    </div>
  );
}
