// Tab 2: Nội Dung — cc_scripts CRUD + expand panel + editor + images + schedule + agent review

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, Calendar, Copy, Trash2, Plus, ChevronDown, ChevronUp,
  Shield, Loader2, ExternalLink, Image, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { opsApi } from "@/api/ops";
import { SimpleModal } from "../../crm/components/SimpleModal";
import { useToast } from "@/context/ToastContext";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(d?: string): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + ' phút trước';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
  return Math.round(ms / 86400000) + ' ngày trước';
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  // escape HTML first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // headings
  html = html
    .replace(/^### (.+)$/gm, '<h3 style="font-size:0.875rem;font-weight:600;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1rem;font-weight:700;margin:16px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.125rem;font-weight:700;margin:16px 0 8px">$1</h1>');
  // bold / italic
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  // hashtags
  html = html.replace(/(^|\s)#([\wÀ-ỹ]+)/g, '$1<span style="color:#6366f1">#$2</span>');
  // paragraphs
  const parts = html.split(/\n\n+/);
  return parts.map(p => {
    if (/^<h[123]/.test(p.trimStart())) return p;
    return '<p style="margin-bottom:8px">' + p.replace(/\n/g, '<br/>') + '</p>';
  }).join('');
}

const statusLabels: Record<string, string> = {
  draft: 'Nháp', approved: 'Đã duyệt', rejected: 'Từ chối',
  published: 'Đã đăng', scheduled: 'Đã lên lịch',
};
const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600',
  approved: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
  published: 'bg-blue-500/10 text-blue-600',
  scheduled: 'bg-yellow-500/10 text-yellow-700',
};
const brandColors: Record<string, string> = {
  jennie: 'bg-pink-500/10 text-pink-600',
  generic: 'bg-violet-500/10 text-violet-600',
};

const defaultScheduleForm = { date: '', time: '10:00', account: 'profile_jennie' };
const defaultCreateForm = { title: '', body: '', pillar: 'trading', content_type: 'social_post', brand_voice: 'jennie' };

// ---------------------------------------------------------------------------
// ScriptExpandedPanel
// ---------------------------------------------------------------------------

function ScriptExpandedPanel({ script }: { script: any }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [body, setBody] = useState(script.body || script.caption || script.content || '');
  const [saving, setSaving] = useState(false);
  const [reviewAgent, setReviewAgent] = useState('ceo');
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '10:00', account: 'profile_jennie' });

  // Sync body when script id changes (e.g. different row expanded)
  useEffect(() => {
    setBody(script.body || script.caption || script.content || '');
  }, [script.id]);

  const inv = () => qc.invalidateQueries({ queryKey: ['ops'] });

  const handleSave = async () => {
    setSaving(true);
    try {
      await opsApi.updateScript(script.id, { body });
      inv();
      pushToast({ title: 'Đã lưu nội dung', tone: 'success' });
    } catch {
      pushToast({ title: 'Lỗi lưu nội dung', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(body)
      .then(() => pushToast({ title: 'Đã sao chép nội dung', tone: 'success' }))
      .catch(() => {});
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Try Supabase storage first (bucket 'cc-content' or 'content')
      const path = `cc-images/${script.id}/${Date.now()}-${file.name}`;
      let imageUrl: string | null = null;

      for (const bucket of ['cc-content', 'content', 'public']) {
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (!error) {
          imageUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          break;
        }
      }

      if (!imageUrl) {
        // Fallback: convert to data URL and save inline (max ~1MB)
        if (file.size > 1_000_000) {
          pushToast({ title: 'Ảnh quá lớn (>1MB), bucket storage chưa được tạo trên Supabase', tone: 'error' });
          e.target.value = '';
          return;
        }
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const newUrls = [...(script.image_urls || []), imageUrl];
      await opsApi.updateScript(script.id, { image_urls: newUrls });
      inv();
      pushToast({ title: 'Đã thêm hình ảnh', tone: 'success' });
    } catch {
      pushToast({ title: 'Lỗi upload hình ảnh', tone: 'error' });
    }
    e.target.value = '';
  };

  const handleSchedule = async () => {
    if (!scheduleForm.date) {
      pushToast({ title: 'Vui lòng chọn ngày đăng', tone: 'info' });
      return;
    }
    try {
      const scheduledAt = new Date(`${scheduleForm.date}T${scheduleForm.time}:00`).toISOString();
      const res = await fetch('/api/ops/content-pipeline/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: script.id, scheduled_at: scheduledAt, account: scheduleForm.account }),
      });
      if (!res.ok) throw new Error();
      pushToast({ title: 'Đã lên lịch đăng bài', tone: 'success' });
      inv();
    } catch {
      pushToast({ title: 'Lỗi lên lịch', tone: 'error' });
    }
  };

  const handleAgentReview = async () => {
    try {
      const res = await fetch('/api/ops/content-pipeline/agent-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_id: script.id,
          agent: reviewAgent,
          task: `Review bài "${script.title}": kiểm tra compliance, brand voice Jennie, chất lượng nội dung. Script ID: ${script.id}. Pillar: ${script.pillar}. Type: ${script.content_type}.`,
        }),
      });
      if (!res.ok) throw new Error();
      pushToast({ title: `Đã giao review cho ${reviewAgent}`, tone: 'success' });
    } catch {
      pushToast({ title: 'API review chưa sẵn sàng — sẽ kích hoạt sau', tone: 'info' });
    }
  };

  const meta = script.metadata || {};
  const wordCount = script.word_count || meta.word_count || body.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const images: string[] = script.image_urls || meta.images || [];

  return (
    <div className="border-t bg-gray-50/60 space-y-4 p-4" onClick={e => e.stopPropagation()}>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        {script.content_type && (
          <span className="px-2 py-0.5 bg-zinc-100 border rounded text-[10px] font-mono uppercase">
            {script.content_type}
          </span>
        )}
        {script.track && <><span className="opacity-40">·</span><span>{script.track}</span></>}
        {script.pillar && <><span className="opacity-40">·</span><span>{script.pillar}</span></>}
        {(script.persona || meta.persona) && (
          <><span className="opacity-40">·</span><span>{script.persona || meta.persona}</span></>
        )}
        {(script.writing_mode || meta.writing_mode) && (
          <><span className="opacity-40">·</span><span>{script.writing_mode || meta.writing_mode}</span></>
        )}
        <span className="opacity-40">·</span>
        <span>{wordCount} từ · ~{readTime} phút</span>
        {(script.brand_voice || meta.brand_voice) && (
          <><span className="opacity-40">·</span><span>Voice: {script.brand_voice || meta.brand_voice}</span></>
        )}
        <span className="ml-auto font-mono text-[10px] opacity-40">{script.id?.substring(0, 8)}…</span>
      </div>

      {/* Toggle + Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-0.5 bg-white border rounded-lg p-0.5">
          <button
            onClick={() => setMode('preview')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === 'preview' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Xem Trước
          </button>
          <button
            onClick={() => setMode('edit')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === 'edit' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Chỉnh Sửa
          </button>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />Sao chép
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/GEM/cc/scripts/${script.id}`)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />Mở đầy đủ
          </Button>
        </div>
      </div>

      {/* Body content */}
      {mode === 'preview' ? (
        <div
          className="bg-white p-4 rounded-lg border text-sm min-h-[200px] max-h-[500px] overflow-y-auto leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) || '<span class="text-gray-400">(Không có nội dung)</span>' }}
        />
      ) : (
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm border rounded-lg resize-y bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Nhập nội dung..."
        />
      )}

      {/* Hình ảnh đính kèm */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hình ảnh đính kèm</p>
        <div className="flex gap-2 flex-wrap items-center">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(img, '_blank')}
            />
          ))}
          <label className="w-20 h-20 border-2 border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors gap-1 text-zinc-400">
            <Image className="h-5 w-5" />
            <span className="text-[10px]">Thêm hình</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Đăng bài */}
      <div className="p-3 bg-blue-50/80 rounded-lg space-y-2 border border-blue-100">
        <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Đăng bài</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={scheduleForm.account}
            onChange={e => setScheduleForm(f => ({ ...f, account: e.target.value }))}
            className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="profile_jennie">👤 Profile Jennie</option>
            <option value="page_jennie">📘 Page Jennie</option>
            <option value="page_gemral">📘 Page Gemral</option>
          </select>
          <input
            type="time"
            value={scheduleForm.time}
            onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
            className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <input
            type="date"
            value={scheduleForm.date}
            onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
            className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <Button size="sm" onClick={handleSchedule} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Calendar className="h-3 w-3 mr-1" />Lên lịch
          </Button>
        </div>
      </div>

      {/* Agent review */}
      <div className="p-3 bg-zinc-50 rounded-lg flex items-center gap-2 flex-wrap border border-zinc-100">
        <span className="text-xs font-semibold text-muted-foreground">Giao review:</span>
        <select
          value={reviewAgent}
          onChange={e => setReviewAgent(e.target.value)}
          className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300"
        >
          <option value="ceo">🤖 CEO Agent</option>
          <option value="content-manager">📝 Content Manager</option>
          <option value="brand-manager">🎨 Brand Manager</option>
        </select>
        <Button size="sm" variant="outline" onClick={handleAgentReview}>
          <Send className="h-3 w-3 mr-1" />Giao review
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContentTab
// ---------------------------------------------------------------------------

export function ContentTab() {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [pillarFilter, setPillarFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);

  const { data: scripts, isLoading } = useQuery({
    queryKey: ['ops', 'scripts', statusFilter, pillarFilter],
    queryFn: () => opsApi.getScripts({
      ...(statusFilter && { status: statusFilter }),
      ...(pillarFilter && { pillar: pillarFilter }),
    }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['ops'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => opsApi.approveScript(id),
    onSuccess: () => { inv(); pushToast({ title: 'Đã duyệt', tone: 'success' }); },
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => opsApi.rejectScript(id, reason),
    onSettled: () => { inv(); setRejectId(null); setRejectReason(''); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => opsApi.deleteScript(id),
    onSuccess: () => { inv(); pushToast({ title: 'Đã xóa', tone: 'info' }); },
  });

  const complianceMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/ops/content-pipeline/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: (data) => pushToast({
      title: data?.pass ? '✅ Compliance OK' : `❌ Vi phạm: ${(data?.violations || []).join(', ')}`,
      tone: data?.pass ? 'success' : 'error',
    }),
  });

  const list = scripts || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="published">Đã đăng</option>
          </select>
          <select
            value={pillarFilter}
            onChange={e => setPillarFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả pillar</option>
            <option value="trading">Trading</option>
            <option value="spiritual">Spiritual</option>
            <option value="lifestyle">Lifestyle</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/GEM/cc/ai-gen')}>
            ✨ AI Tạo nội dung
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/GEM/cc/scripts')}>
            📄 Kịch bản CC
          </Button>
          <Button size="sm" onClick={() => { setCreateForm(defaultCreateForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" />Tạo nội dung
          </Button>
        </div>
      </div>

      {/* List */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chưa có nội dung nào.</div>
        ) : (
          <div className="divide-y">
            {list.map((s: any) => {
              const isExpanded = expandedId === s.id;
              const fullText = s.body || s.caption || s.content || '';
              return (
                <div key={s.id} className="hover:bg-muted/20 transition-colors">
                  {/* Row header */}
                  <div
                    className="p-4 cursor-pointer flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[s.status] || 'bg-muted'}`}>
                          {statusLabels[s.status] || s.status}
                        </span>
                        {s.brand_voice && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${brandColors[s.brand_voice] || 'bg-muted'}`}>
                            {s.brand_voice}
                          </span>
                        )}
                        {s.pillar && <span className="text-[10px] text-muted-foreground">{s.pillar}</span>}
                        {s.content_type && <span className="text-[10px] text-muted-foreground">· {s.content_type}</span>}
                        {s.posted_account && <span className="text-[10px] text-blue-500">· {s.posted_account}</span>}
                        {s.posted_time_slot && <span className="text-[10px] text-muted-foreground">· {s.posted_time_slot}</span>}
                      </div>
                      <p className="text-sm font-medium">{s.title || '(Không có tiêu đề)'}</p>
                      {!isExpanded && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{fullText.substring(0, 120)}</p>
                      )}
                      {!isExpanded && s.image_urls && Array.isArray(s.image_urls) && s.image_urls.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {s.image_urls.slice(0, 2).map((u: string, i: number) => (
                            <img key={i} src={u} alt="" className="h-8 w-8 rounded object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(s.created_at)}</div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {s.status === 'draft' && (
                        <>
                          <Button size="sm" variant="outline" disabled={approveMut.isPending} onClick={() => approveMut.mutate(s.id)}>
                            <Check className="h-3 w-3 mr-1" />Duyệt
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectId(s.id)}>
                            <X className="h-3 w-3 mr-1" />Từ chối
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(fullText).then(() => pushToast({ title: 'Đã copy', tone: 'success' })).catch(() => {});
                      }} title="Sao chép">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => complianceMut.mutate(fullText)} title="Compliance check">
                        <Shield className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Xóa bài này?')) deleteMut.mutate(s.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && <ScriptExpandedPanel script={s} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Reject modal */}
      <SimpleModal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Từ chối nội dung"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectId(null)}>Hủy</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => rejectId && rejectMut.mutate({ id: rejectId, reason: rejectReason })}
            >
              Từ chối
            </Button>
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
        />
      </SimpleModal>

      {/* Create modal */}
      <SimpleModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo nội dung mới"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button
              disabled={!createForm.title.trim()}
              onClick={() => {
                fetch('/api/ops/content-pipeline/scripts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(createForm),
                })
                  .then(res => { if (!res.ok) throw new Error(); return res.json(); })
                  .then(() => {
                    pushToast({ title: 'Đã tạo nội dung', tone: 'success' });
                    inv();
                    setShowCreate(false);
                    setCreateForm(defaultCreateForm);
                  })
                  .catch(() => pushToast({ title: 'Lỗi tạo nội dung', tone: 'error' }));
              }}
            >
              Tạo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Tiêu đề *</label>
            <Input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Nội dung</label>
            <textarea
              value={createForm.body}
              onChange={e => setCreateForm(f => ({ ...f, body: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Pillar</label>
              <select value={createForm.pillar} onChange={e => setCreateForm(f => ({ ...f, pillar: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="trading">Trading</option>
                <option value="spiritual">Spiritual</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Loại</label>
              <select value={createForm.content_type} onChange={e => setCreateForm(f => ({ ...f, content_type: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="social_post">Social post</option>
                <option value="blog">Blog</option>
                <option value="email">Email</option>
                <option value="push_notification">Push</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Brand voice</label>
              <select value={createForm.brand_voice} onChange={e => setCreateForm(f => ({ ...f, brand_voice: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="jennie">Jennie cá nhân</option>
                <option value="generic">Gemral chung</option>
              </select>
            </div>
          </div>
        </div>
      </SimpleModal>
    </div>
  );
}
