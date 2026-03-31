// Phase 5: Content Planner Board — drag & drop 2-week calendar
// Replaces static "Lịch Đăng" tab

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ChevronLeft, ChevronRight,
  Zap, CheckCircle, Trash2, RefreshCw, BarChart2, Bot,
  FileText, AlertCircle, Clock, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/context/ToastContext";

// ─── Constants ───────────────────────────────────────────────────
const ACCOUNTS = [
  { id: "profile_jennie", label: "👤 Profile Jennie", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "page_jennie",    label: "📘 Page Jennie",    color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "page_gemral",   label: "📘 Page Gemral",    color: "bg-violet-50 border-violet-200 text-violet-700" },
];
const TIME_SLOTS = ["10:00", "17:00", "19:45"];
const STATUS_COLOR: Record<string, string> = {
  topic:      "bg-gray-100 text-gray-600 border-gray-200",
  generating: "bg-amber-100 text-amber-700 border-amber-200",
  draft:      "bg-blue-100 text-blue-700 border-blue-200",
  review:     "bg-purple-100 text-purple-700 border-purple-200",
  approved:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  scheduled:  "bg-teal-100 text-teal-700 border-teal-200",
  published:  "bg-green-100 text-green-700 border-green-200",
  failed:     "bg-red-100 text-red-700 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  topic: "Chủ đề", generating: "Đang tạo", draft: "Nháp",
  review: "Review", approved: "Duyệt", scheduled: "Lên lịch",
  published: "Đã đăng", failed: "Lỗi",
};

function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

// ─── Script Card ─────────────────────────────────────────────────
function ScriptCard({
  script, onDragStart, onUnassign, compact = false,
}: {
  script: any;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onUnassign?: (id: string) => void;
  compact?: boolean;
}) {
  const status = script.status || 'topic';
  const colorClass = STATUS_COLOR[status] || STATUS_COLOR.topic;
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, script.id) : undefined}
      className={`group relative rounded border text-xs select-none ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''} ${colorClass} ${compact ? 'p-1.5' : 'p-2'}`}
    >
      <div className="font-medium truncate leading-tight" title={script.title}>
        {script.title || 'Không có tiêu đề'}
      </div>
      {!compact && (
        <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
          <span>{STATUS_LABEL[status] || status}</span>
          {script.metadata?.target_account && (
            <span>· {script.metadata.target_account.replace('_', ' ')}</span>
          )}
        </div>
      )}
      {onUnassign && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnassign(script.id); }}
          className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10"
          title="Bỏ gán"
        >
          <Trash2 size={9} />
        </button>
      )}
    </div>
  );
}

// ─── Progress Summary ─────────────────────────────────────────────
function ProgressSummary({ planId }: { planId: string }) {
  const { data } = useQuery({
    queryKey: ['planner', 'progress', planId],
    queryFn: async () => {
      const res = await fetch(`/api/ops/content-pipeline/planner/progress?plan_id=${planId}`);
      return res.json();
    },
    enabled: !!planId,
    refetchInterval: 8000,
  });
  if (!data?.total) return null;
  const statuses = ['topic', 'generating', 'draft', 'review', 'approved', 'scheduled', 'published', 'failed'];
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs mt-2 pt-2 border-t">
      <span className="font-medium text-muted-foreground">Tiến độ ({data.total}):</span>
      {statuses.map(s => data[s] > 0 ? (
        <span key={s} className={`px-1.5 py-0.5 rounded border ${STATUS_COLOR[s]}`}>
          {STATUS_LABEL[s]}: {data[s]}
        </span>
      ) : null)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function ScheduleTab() {
  const { pushToast } = useToast();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [planId, setPlanId] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showDelegateLog, setShowDelegateLog] = useState(false);
  const [delegateLines, setDelegateLines] = useState<string[]>([]);
  const [delegateDone, setDelegateDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(weekOffset);
  const start = weekDates[0], end = weekDates[6];

  const { data: plans = [] } = useQuery({
    queryKey: ['planner', 'plans'],
    queryFn: async () => {
      const res = await fetch('/api/ops/content-pipeline/planner/plans');
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: plannerData, isLoading, refetch } = useQuery({
    queryKey: ['planner', 'calendar', start, end, planId],
    queryFn: async () => {
      const params = new URLSearchParams({ start, end });
      if (planId) params.set('plan_id', planId);
      const res = await fetch(`/api/ops/content-pipeline/planner?${params}`);
      return res.json();
    },
    staleTime: 10_000,
  });

  const calendar = plannerData?.calendar || {};
  const unassigned: any[] = plannerData?.unassigned || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planner', 'calendar'] });
    qc.invalidateQueries({ queryKey: ['planner', 'progress'] });
  };

  const assignMut = useMutation({
    mutationFn: async ({ scriptId, date, time, account }: { scriptId: string; date: string; time: string; account: string }) => {
      const res = await fetch('/api/ops/content-pipeline/planner/assign', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: scriptId, date, time, account }),
      });
      return res.json();
    },
    onSuccess: invalidate,
    onError: () => pushToast({ title: 'Lỗi gán bài', tone: 'error' }),
  });

  const unassignMut = useMutation({
    mutationFn: async (scriptId: string) => {
      const res = await fetch('/api/ops/content-pipeline/planner/unassign', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: scriptId }),
      });
      return res.json();
    },
    onSuccess: invalidate,
  });

  const parseMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/content-pipeline/planner/parse-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planner_script_id: planId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Lỗi parse');
      return d;
    },
    onSuccess: (d) => { pushToast({ title: d.message, tone: 'success' }); invalidate(); qc.invalidateQueries({ queryKey: ['planner', 'plans'] }); },
    onError: (e: any) => pushToast({ title: `Lỗi parse: ${e.message}`, tone: 'error' }),
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/content-pipeline/planner/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Lỗi generate');
      return d;
    },
    onSuccess: (d) => { pushToast({ title: d.message, tone: 'success' }); invalidate(); },
    onError: (e: any) => pushToast({ title: `Lỗi generate: ${e.message}`, tone: 'error' }),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/content-pipeline/planner/bulk-approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Lỗi approve');
      return d;
    },
    onSuccess: (d) => { pushToast({ title: d.message, tone: 'success' }); invalidate(); },
    onError: (e: any) => pushToast({ title: `Lỗi approve: ${e.message}`, tone: 'error' }),
  });

  const handleDelegateCeo = useCallback(async () => {
    if (!planId) { pushToast({ title: 'Chọn Plan ID trước', tone: 'error' }); return; }
    setDelegateLines(['Đang khởi động CEO Agent...']);
    setDelegateDone(false);
    setShowDelegateLog(true);

    try {
      const res = await fetch('/api/ops/content-pipeline/planner/delegate-ceo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = dec.decode(value);
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const obj = JSON.parse(line.slice(6));
              if (obj.text) setDelegateLines(p => [...p, obj.text.trimEnd()]);
              if (obj.type === 'exit' || obj.type === 'error') setDelegateDone(true);
            } catch { /* ignore */ }
          }
        }
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    } catch (e: any) {
      setDelegateLines(p => [...p, `Lỗi: ${e.message}`]);
    }
    setDelegateDone(true);
    invalidate();
  }, [planId, pushToast]);

  // Drag handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('script_id', id);
    setDraggingId(id);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent, date: string, time: string, account: string) => {
    e.preventDefault();
    const scriptId = e.dataTransfer.getData('script_id');
    if (scriptId) assignMut.mutate({ scriptId, date, time, account });
    setDraggingId(null);
  };
  const onDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const scriptId = e.dataTransfer.getData('script_id');
    if (scriptId) unassignMut.mutate(scriptId);
    setDraggingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={planId}
            onChange={e => setPlanId(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 bg-background max-w-[220px]"
          >
            <option value="">— Tất cả (không filter plan) —</option>
            {(plans as any[]).map((p: any) => (
              <option key={p.id} value={p.id}>{p.title || p.id.slice(0, 16)}</option>
            ))}
          </select>

          <div className="h-4 w-px bg-border" />

          <Button size="sm" variant="outline" disabled={!planId || parseMut.isPending} onClick={() => parseMut.mutate()} title="Parse markdown table → tạo topic scripts">
            {parseMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            <span className="ml-1">Parse Plan</span>
          </Button>

          <Button size="sm" variant="outline" disabled={generateMut.isPending} onClick={() => generateMut.mutate()} title="Tạo cc_generation_jobs → batch_processor generate content">
            {generateMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            <span className="ml-1">Generate</span>
          </Button>

          <Button size="sm" variant="outline" disabled={approveMut.isPending} onClick={() => approveMut.mutate()} title="Bulk approve tất cả bài draft">
            {approveMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            <span className="ml-1">Bulk Approve</span>
          </Button>

          <Button size="sm" disabled={!planId} onClick={handleDelegateCeo} className="bg-violet-600 hover:bg-violet-700 text-white" title="CEO Agent tự động: generate → approve → schedule">
            <Bot size={12} />
            <span className="ml-1">Delegate CEO</span>
          </Button>

          <Button size="sm" variant="ghost" onClick={() => refetch()} className="ml-auto">
            <RefreshCw size={12} />
          </Button>
        </div>

        {planId && <ProgressSummary planId={planId} />}
      </Card>

      <div className="flex gap-4">
        {/* Unassigned pool */}
        <div
          className={`w-52 shrink-0 rounded-lg border-2 border-dashed transition-colors ${draggingId ? 'border-primary/40 bg-primary/5' : 'border-transparent'}`}
          onDragOver={onDragOver}
          onDrop={onDropUnassigned}
        >
          <Card className="p-3 h-full">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
              <BarChart2 size={12} />
              Chưa gán ({unassigned.length})
            </div>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin opacity-40" /></div>
            ) : unassigned.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-6">
                {planId ? 'Tất cả đã gán 🎉' : 'Chọn plan hoặc parse plan trước'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
                {unassigned.map((s: any) => (
                  <ScriptCard key={s.id} script={s} onDragStart={onDragStart} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Calendar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm font-medium">
              Tuần {weekOffset === 0 ? 'này' : weekOffset === 1 ? 'sau' : weekOffset < 0 ? `trước (${Math.abs(weekOffset)})` : `+${weekOffset}`}
              <span className="text-muted-foreground text-xs ml-2">{fmt(weekDates[0])} – {fmt(weekDates[6])}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-28 px-2 py-1.5 text-left text-muted-foreground font-medium border-b border-r bg-muted/30 text-[10px]">Account · Giờ</th>
                  {weekDates.map(d => {
                    const isToday = d === new Date().toISOString().split('T')[0];
                    return (
                      <th key={d} className={`px-1 py-1.5 text-center font-medium border-b text-[10px] ${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                        {fmt(d)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.flatMap((account, ai) =>
                  TIME_SLOTS.map((slot, si) => (
                    <tr key={`${account.id}-${slot}`} className={si === 0 && ai > 0 ? 'border-t-2 border-t-border/50' : ''}>
                      <td className={`px-2 py-1 border-r border-b align-middle text-[10px] ${si === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                        {si === 0 ? (
                          <span className={`inline-block px-1 py-0.5 rounded border ${account.color}`}>{account.label}</span>
                        ) : null}
                        <div className={`flex items-center gap-0.5 ${si === 0 ? 'mt-0.5 opacity-60' : ''}`}>
                          <Clock size={8} />{slot}
                        </div>
                      </td>
                      {weekDates.map(date => {
                        const cell = calendar[date]?.[account.id]?.[slot];
                        return (
                          <td
                            key={date}
                            className={`border-b border-r px-1 py-1 align-top min-w-[90px] ${draggingId && !cell ? 'hover:bg-primary/8' : 'hover:bg-muted/20'}`}
                            onDragOver={onDragOver}
                            onDrop={e => onDrop(e, date, slot, account.id)}
                          >
                            {cell ? (
                              <ScriptCard script={cell} onDragStart={onDragStart} onUnassign={(id) => unassignMut.mutate(id)} compact />
                            ) : draggingId ? (
                              <div className="text-[9px] text-primary/40 text-center py-1">thả vào</div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <Card className="p-3">
        <div className="grid grid-cols-3 gap-4 text-[10px] text-muted-foreground">
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1"><Users size={10} /> 3 Tài khoản</div>
            <div>👤 Profile Jennie — tinh_yeu, ritual, crystal</div>
            <div>📘 Page Jennie — trieu_phu, trading_mindset</div>
            <div>📘 Page Gemral — trading_technical, app, education</div>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1"><Clock size={10} /> Giờ đăng</div>
            <div>10:00 · 17:00 · 19:45</div>
            <div className="mt-1 flex items-center gap-1"><AlertCircle size={9} />Không cùng pillar liên tiếp</div>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1"><Zap size={10} /> Workflow</div>
            <div>Parse Plan → Generate (batch_processor) → Approve → Schedule MBS</div>
            <div className="mt-1 text-[9px] text-amber-600">⚠️ Content PHẢI qua batch_processor.py batch</div>
          </div>
        </div>
      </Card>

      {/* CEO Delegate log modal */}
      {showDelegateLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl w-full max-w-2xl shadow-xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bot size={16} className={delegateDone ? 'text-emerald-500' : 'text-amber-500 animate-pulse'} />
                CEO Agent — Delegate Planner
              </div>
              {delegateDone && <Button size="sm" variant="ghost" onClick={() => setShowDelegateLog(false)}>Đóng</Button>}
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-muted/30" style={{ minHeight: 200 }}>
              {delegateLines.map((l, i) => <div key={i} className="leading-relaxed whitespace-pre-wrap">{l || '\u00A0'}</div>)}
            </div>
            {!delegateDone && (
              <div className="px-4 py-2 border-t text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Đang chạy... Đừng đóng cửa sổ này
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
