// Tab 4: Email & Push — V3: send_daily_newsletter ĐÃ TẮT, dùng drip sequence

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, Pencil, Play, Loader2, AlertTriangle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/context/ToastContext";
import { useNavigate } from "@/lib/router";

const SEGMENTS = [
  { key: 'course_tinh_yeu', label: 'Khóa Tình Yêu', desc: 'Đã mua khóa Tần Số Tình Yêu' },
  { key: 'course_trading', label: 'Khóa Trading', desc: 'Đã mua khóa Trading 3 Tiers' },
  { key: 'course_trieu_phu', label: 'Khóa Tư Duy Triệu Phú', desc: 'Đã mua khóa Triệu Phú' },
  { key: 'course_7_ngay', label: 'Khóa 7 Ngày Tần Số Gốc', desc: 'Đã mua khóa 7 Ngày' },
  { key: 'crystal_customers', label: 'Crystal Customers YYM', desc: 'Khách mua tinh thể' },
  { key: 'general', label: 'General (CTV, affiliate)', desc: 'CTV, affiliates, partners' },
  { key: 'ctv_kol', label: 'CTV/KOL', desc: 'Chỉ CTV và KOL' },
  { key: 'lead_nurture', label: 'Lead nurture (chưa mua)', desc: 'Leads chưa convert' },
];

export function EmailPushTab() {
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const { data: segmentStats } = useQuery({
    queryKey: ['ops', 'email', 'segment-stats'],
    queryFn: async () => {
      const res = await fetch('/api/ops/content-pipeline/email-stats');
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60_000,
  });

  const execMut = useMutation({
    mutationFn: async (script: string) => {
      const res = await fetch(`/api/ops/content-pipeline/execute/${script}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as any).error || "Lỗi"); }
      return res.json();
    },
    onSuccess: () => pushToast({ title: "Đã trigger script", tone: "success" }),
    onError: (e: Error) => pushToast({ title: e.message, tone: "error" }),
  });

  return (
    <div className="space-y-4">
      {/* ⚠️ Email System Status */}
      <div className="bg-amber-500/5 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">send_daily_newsletter.py đã TẮT</p>
            <p className="text-xs text-amber-700 mt-0.5">Script cũ hardcode content và gửi lặp. Email hiện dùng <strong>Drip Sequence</strong> (edge functions + pg_cron).</p>
          </div>
        </div>
      </div>

      {/* Drip Sequence System */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Hệ thống Email (Drip Sequence)</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-sm font-medium">email-automation-scheduler</div>
              <div className="text-[10px] text-muted-foreground">pg_cron #19 · Mỗi 15 phút · Drip sequence processing</div>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-sm font-medium">waitlist-email-nurture</div>
              <div className="text-[10px] text-muted-foreground">pg_cron #17 · Daily 01:00 UTC · Lead nurture (day 0/1/3/7/14)</div>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-sm font-medium">send-email (Edge Function)</div>
              <div className="text-[10px] text-muted-foreground">HTTP POST · 14+ templates · Resend API · partnership@gemral.com</div>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-sm font-medium">process_email_queue.py</div>
              <div className="text-[10px] text-muted-foreground">Đọc email_automation_queue → gửi qua edge function</div>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        </div>
      </Card>

      {/* 8 Segments — drip reference */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">8 Email Segments (Drip Sequence)</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Segment</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subscribers</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Hành động</th>
          </tr></thead>
          <tbody>
            {SEGMENTS.map((seg, i) => (
              <tr key={seg.key} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium">{seg.label}</div>
                  {activeSegment === seg.key && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{seg.desc}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {segmentStats?.[seg.key]?.subscribers != null
                    ? Number(segmentStats[seg.key].subscribers).toLocaleString()
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setActiveSegment(seg.key === activeSegment ? null : seg.key)}>
                      <Eye className="h-3 w-3 mr-0.5" /> Stats
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => navigate('/config?tab=email')}>
                      <Pencil className="h-3 w-3 mr-0.5" /> Template
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[10px] text-muted-foreground mt-2">
          {segmentStats
            ? `Tổng: ${Object.values(segmentStats as Record<string, { subscribers?: number }>).reduce((s, v) => s + (v?.subscribers ?? 0), 0).toLocaleString()} subscribers`
            : '8 segments · Dữ liệu từ Resend API'}
        </div>
      </Card>

      {/* Push */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Push Notifications</h3>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="text-sm font-medium">daily_pipeline_orchestrator.py --stage push</div>
            <div className="text-[10px] text-muted-foreground">09:00 hàng ngày · Expo Push API</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={execMut.isPending} onClick={() => execMut.mutate("daily_push")}>
              {execMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />} Gửi push ngay
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              try {
                await fetch("/api/ops/content-pipeline/delegate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent_slug: "email-crm-manager", task: "Gửi push notification cho hôm nay" }) });
                pushToast({ title: "Đã giao cho Email CRM Manager", tone: "success" });
              } catch { pushToast({ title: "Lỗi giao việc", tone: "error" }); }
            }}><Bot className="h-3 w-3 mr-1" /> Giao agent</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
