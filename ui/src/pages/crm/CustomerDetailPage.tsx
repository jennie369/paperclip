// Customer Detail — 360° view with tabs

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useNavigate } from "@/lib/router";
import { ArrowLeft, RefreshCw, Link2, Phone, Mail, Calendar, User, ShoppingBag, Ticket, MessageSquare, Brain, StickyNote, History, Network } from "lucide-react";
import KGMiniGraph from "@/components/knowledge-graph/KGMiniGraph";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadScoreBadge } from "./components/LeadScoreBadge";
import { crmApi } from "@/api/crm";

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

const statusLabels: Record<string, string> = {
  lead_moi: 'Lead mới', quan_tam: 'Quan tâm', can_follow_up: 'Follow up',
  dang_tu_van: 'Tư vấn', cho_thanh_toan: 'Chờ TT', da_mua: 'Đã mua',
  khach_vip: 'VIP', khach_than_thiet: 'Thân thiết', churned: 'Churned', blacklist: 'Blacklist',
};
const tempLabel = (t?: string): string =>
  ({ cold: 'Lạnh', warm: 'Ấm', hot: 'Nóng', on_fire: 'Rất nóng' }[t || 'cold'] || 'Lạnh');

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: User },
  { key: 'conversations', label: 'Hội thoại', icon: MessageSquare },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { key: 'tickets', label: 'Phiếu hỗ trợ', icon: Ticket },
  { key: 'gemral', label: 'Gemral', icon: Brain },
  { key: 'memory', label: 'Memory', icon: History },
  { key: 'notes', label: 'Ghi chú', icon: StickyNote },
  { key: 'kg', label: 'Bản đồ quan hệ', icon: Network },
];

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Back: ưu tiên ?from= (deep-link/refresh), fallback lịch sử trình duyệt
  const goBack = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    if (from) navigate(from);
    else navigate(-1);
  };

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['crm', 'customer', id],
    queryFn: () => crmApi.getCustomer(id!),
    enabled: !!id,
  });

  const syncGemralMut = useMutation({
    mutationFn: () => crmApi.syncGemral(id!),
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'customer', id] }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => crmApi.updateCustomer(id!, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'customer', id] }),
  });

  const addNoteMut = useMutation({
    mutationFn: () => fetch(`/api/channels/crm/customers/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote, note_type: 'manual', created_by: 'board' }),
    }),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm', 'customer', id] }); setNewNote(''); },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (error || !customer) return (
    <div className="p-6 text-center">
      <p className="text-destructive">Không tìm thấy khách hàng</p>
      <Button variant="outline" className="mt-4" onClick={goBack}>Quay lại</Button>
    </div>
  );

  const c = customer;
  const gd = c.gemral_data as any;

  return (
    <div className="flex h-full">
      {/* LEFT PANEL — Profile */}
      <div className="w-80 shrink-0 border-r p-5 space-y-4 overflow-y-auto">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại
        </Button>

        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {(c.display_name || '?')[0]}
          </div>
          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={() => {
                const v = nameDraft.trim();
                if (v && v !== c.display_name) updateMut.mutate({ display_name: v });
                setEditingName(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="mt-2 text-center text-lg font-bold h-9"
            />
          ) : (
            <h2
              className="mt-2 text-lg font-bold cursor-text rounded px-1 hover:bg-muted/50 inline-block"
              title="Bấm để sửa tên"
              onClick={() => { setNameDraft(c.display_name || ''); setEditingName(true); }}
            >
              {c.display_name || 'Chưa có tên'}
            </h2>
          )}
          <LeadScoreBadge score={c.lead_score} temperature={c.lead_temperature} size="md" />
        </div>

        <div className="space-y-2 text-sm">
          {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
          {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
          <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Liên hệ: {timeAgo(c.last_contact_at)}</div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Trạng thái</label>
          <select value={c.status} onChange={e => updateMut.mutate({ status: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm mt-1">
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Nhiệt độ lead — READ-ONLY: cột dẫn xuất do trigger trg_lead_score tự
            tính từ lead_score (>=80 on_fire, >=60 hot, >=30 warm, else cold). */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nhiệt độ lead</label>
          <div className="w-full rounded-md border border-input bg-muted/30 px-3 py-1.5 text-sm mt-1 flex items-center justify-between">
            <span className="capitalize">{tempLabel(c.lead_temperature)}</span>
            <span className="text-xs text-muted-foreground" title="Tự động tính từ điểm lead, không sửa tay">tự động · {c.lead_score ?? 0}đ</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted/30 p-2">
            <div className="font-bold text-lg">{c.total_orders}</div>
            <div className="text-muted-foreground">Đơn hàng</div>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="font-bold text-lg">{formatVND(c.total_revenue)}</div>
            <div className="text-muted-foreground">Doanh thu</div>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="font-bold text-lg">{c.total_conversations}</div>
            <div className="text-muted-foreground">Hội thoại</div>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="font-bold text-lg">{c.gemral_user_id ? 'Có' : 'Không'}</div>
            <div className="text-muted-foreground">Gemral App</div>
          </div>
        </div>

        {/* Gemral sync */}
        <Button variant="outline" size="sm" className="w-full" onClick={() => syncGemralMut.mutate()} disabled={syncGemralMut.isPending}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncGemralMut.isPending ? 'animate-spin' : ''}`} />
          {syncGemralMut.isPending ? 'Đang đồng bộ...' : 'Đồng bộ Gemral'}
        </Button>
      </div>

      {/* RIGHT PANEL — Tabs */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab Bar */}
        <div className="border-b px-5 flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* TAB: Tổng quan */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {c.ai_summary && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-2">Tóm tắt AI</h3>
                  <p className="text-sm text-muted-foreground">{c.ai_summary}</p>
                  {(c as any).ai_summary_updated_at && <p className="text-xs text-muted-foreground mt-1">Cập nhật: {timeAgo((c as any).ai_summary_updated_at)}</p>}
                </Card>
              )}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Hoạt động gần đây</h3>
                {(c.interactions || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
                ) : (
                  <div className="space-y-2">
                    {(c.interactions || []).slice(0, 10).map((i: any) => (
                      <div key={i.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">{i.title}</p>
                          {i.content && <p className="text-xs text-muted-foreground truncate">{i.content}</p>}
                          <p className="text-xs text-muted-foreground">{timeAgo(i.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Hội thoại */}
          {activeTab === 'conversations' && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Lịch sử hội thoại</h3>
                {(c.interactions || []).filter((i: any) => i.type === 'chat').length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có hội thoại nào.</p>
                ) : (
                  <div className="space-y-3">
                    {(c.interactions || []).filter((i: any) => i.type === 'chat').map((i: any) => (
                      <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{i.title || 'Hội thoại'}</p>
                            <span className="text-xs text-muted-foreground">{timeAgo(i.created_at)}</span>
                          </div>
                          {i.content && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{i.content}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {i.channel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">{i.channel}</span>}
                            {i.agent_slug && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600">{i.agent_slug}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Tất cả tương tác</h3>
                {(c.interactions || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có tương tác nào.</p>
                ) : (
                  <div className="space-y-2">
                    {(c.interactions || []).slice(0, 20).map((i: any) => (
                      <div key={i.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                          i.type === 'chat' ? 'bg-blue-500' : i.type === 'order' ? 'bg-green-500' : i.type === 'ticket' ? 'bg-yellow-500' : 'bg-muted-foreground'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{i.title || i.type}</p>
                            <span className="text-xs text-muted-foreground">{timeAgo(i.created_at)}</span>
                          </div>
                          {i.content && <p className="text-xs text-muted-foreground truncate">{i.content}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Đơn hàng */}
          {activeTab === 'orders' && (
            <div>
              {(c.orders || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Chưa có đơn hàng nào.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left">Mã đơn</th>
                    <th className="px-4 py-2 text-left">Trạng thái</th>
                    <th className="px-4 py-2 text-right">Tổng</th>
                    <th className="px-4 py-2 text-right">Ngày</th>
                  </tr></thead>
                  <tbody>{(c.orders || []).map((o: any) => (
                    <tr key={o.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{o.order_number}</td>
                      <td className="px-4 py-2"><span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-xs">{o.status}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatVND(parseFloat(o.total))}</td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{timeAgo(o.created_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: Phiếu hỗ trợ */}
          {activeTab === 'tickets' && (
            <div>
              {(c.tickets || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Chưa có phiếu hỗ trợ nào.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left">Mã</th>
                    <th className="px-4 py-2 text-left">Tiêu đề</th>
                    <th className="px-4 py-2 text-left">Ưu tiên</th>
                    <th className="px-4 py-2 text-left">Trạng thái</th>
                    <th className="px-4 py-2 text-right">Ngày</th>
                  </tr></thead>
                  <tbody>{(c.tickets || []).map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{t.ticket_number}</td>
                      <td className="px-4 py-2">{t.title}</td>
                      <td className="px-4 py-2"><span className="rounded-full bg-yellow-500/10 text-yellow-700 px-2 py-0.5 text-xs">{t.priority}</span></td>
                      <td className="px-4 py-2"><span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-xs">{t.status}</span></td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{timeAgo(t.created_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: Gemral */}
          {activeTab === 'gemral' && (
            <div className="space-y-4">
              {!gd?.is_app_user ? (
                <Card className="p-6 text-center">
                  <Brain className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Khách chưa liên kết tài khoản Gemral App.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => syncGemralMut.mutate()}>
                    <Link2 className="mr-1.5 h-4 w-4" /> Thử liên kết
                  </Button>
                </Card>
              ) : (
                <>
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">Tiers</h3>
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div className="rounded-md bg-muted/30 p-3">
                        <div className="font-bold">{gd.chatbot_tier}</div>
                        <div className="text-xs text-muted-foreground">Chatbot</div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-3">
                        <div className="font-bold">{gd.scanner_tier}</div>
                        <div className="text-xs text-muted-foreground">Scanner</div>
                      </div>
                      <div className="rounded-md bg-muted/30 p-3">
                        <div className="font-bold">{gd.course_tier}</div>
                        <div className="text-xs text-muted-foreground">Khóa học</div>
                      </div>
                    </div>
                  </Card>
                  {(gd.courses_enrolled || []).length > 0 && (
                    <Card className="p-4">
                      <h3 className="text-sm font-medium mb-3">Khóa học ({gd.total_courses})</h3>
                      <div className="space-y-2">
                        {gd.courses_enrolled.map((co: any) => (
                          <div key={co.id} className="flex items-center justify-between text-sm">
                            <span>{co.title}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${co.progress}%` }} />
                              </div>
                              <span className="text-xs tabular-nums">{co.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {gd.is_affiliate && (
                    <Card className="p-4">
                      <h3 className="text-sm font-medium mb-2">CTV/Affiliate</h3>
                      <div className="text-sm space-y-1">
                        <p>Tier: <strong>{gd.affiliate_tier?.toUpperCase()}</strong></p>
                        <p>Mã: <strong>{gd.affiliate_code}</strong></p>
                        <p>Doanh số: {formatVND(gd.affiliate_total_sales || 0)}</p>
                        <p>Hoa hồng: {formatVND(gd.affiliate_commission || 0)}</p>
                      </div>
                    </Card>
                  )}
                  <p className="text-xs text-muted-foreground">Đồng bộ lần cuối: {gd.last_synced_at ? timeAgo(gd.last_synced_at) : 'Chưa'}</p>
                </>
              )}
            </div>
          )}

          {/* TAB: Memory */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Memory của khách hàng</h3>
                  <Button variant="outline" size="sm" onClick={() => syncGemralMut.mutate()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Làm mới
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Thông tin AI ghi nhớ từ các cuộc hội thoại trước. Agent sẽ tự động sử dụng memory này khi chat với khách.
                </p>
                {c.ai_summary ? (
                  <div className="rounded-lg bg-muted/30 p-4 text-sm whitespace-pre-wrap">{c.ai_summary}</div>
                ) : (
                  <div className="py-8 text-center">
                    <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Chưa có memory nào.</p>
                    <p className="text-xs text-muted-foreground mt-1">Memory sẽ được tạo tự động sau khi agent chat với khách.</p>
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Tóm tắt hội thoại gần đây</h3>
                {(c.interactions || []).filter((i: any) => i.type === 'chat').slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu.</p>
                ) : (
                  <div className="space-y-2">
                    {(c.interactions || []).filter((i: any) => i.type === 'chat').slice(0, 5).map((i: any) => (
                      <div key={i.id} className="text-sm p-2 rounded bg-muted/20">
                        <div className="flex justify-between"><span className="font-medium">{i.channel || 'Chat'}</span><span className="text-xs text-muted-foreground">{timeAgo(i.created_at)}</span></div>
                        {i.content && <p className="text-xs text-muted-foreground mt-1">{i.content}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Ghi chú */}
          {activeTab === 'kg' && id && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Bản đồ quan hệ 2 bước từ khách hàng này</p>
              <div className="rounded-lg border border-border overflow-hidden" style={{ height: 400 }}>
                <KGMiniGraph centerId={`customer:${id}`} centerType="customer" depth={2} maxNodes={20} className="h-full" />
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Thêm ghi chú..." className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) addNoteMut.mutate(); }} />
                <Button size="sm" disabled={!newNote.trim() || addNoteMut.isPending} onClick={() => addNoteMut.mutate()}>Thêm</Button>
              </div>
              {(c.notes || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Chưa có ghi chú nào.</p>
              ) : (
                <div className="space-y-2">
                  {(c.notes || []).map((n: any) => (
                    <Card key={n.id} className="p-3">
                      <p className="text-sm">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.created_by} — {timeAgo(n.created_at)}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
