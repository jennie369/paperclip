// SOP Picker v2 — replaces flat dropdown with a searchable grouped browser.
//
// Features:
//  - Live search (name, sop_id, description, domain)
//  - AI Smart Suggest (client-side scoring: type use case → ranked top 5)
//  - Quick Access row: P0 SOPs frequently used (domains Content, Customer Service, Sales, Ops)
//  - Accordion groups by domain (CNT, CS, SAL, …) with priority-sorted rows
//  - Each row: sop_id, priority badge, name, truncated description, related-SOPs count
//  - Click row → commits selection via onSelect(sop_id)
//
// Data source: GET /api/ops/sop-engine/sops?limit=500&status=published

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

// ─────────── Types ───────────

export interface SopRow {
  id: string;
  sop_id: string;
  domain: string;
  name: string;
  description?: string | null;
  body_markdown?: string | null;
  sop_type?: string | null;
  priority?: string | null;        // p0 / p1 / p2
  status?: string | null;           // published / draft / archived
  assigned_agents?: string[] | null;
  related_sops?: string[] | null;
  depends_on?: string[] | null;
  outputs_to?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Props {
  value: string;
  onChange: (sopId: string) => void;
}

// Domain → emoji + label + one-liner hint. Any domain not here fallback to gray + code.
const DOMAIN_META: Record<string, { label: string; emoji: string; hint: string; priorityRank: number }> = {
  CNT: { label: 'Content',           emoji: '📝', hint: 'Brainstorm, write, review, publish content.', priorityRank: 1 },
  CS:  { label: 'Customer Service',  emoji: '🎧', hint: 'Reply, escalate, refund, ticket workflows.', priorityRank: 2 },
  SAL: { label: 'Sales',             emoji: '💸', hint: 'Discovery → consult → close → upsell.', priorityRank: 3 },
  DST: { label: 'Distribution',      emoji: '🚀', hint: 'Scheduling, posting, push, email distribution.', priorityRank: 4 },
  MKT: { label: 'Marketing',         emoji: '📣', hint: 'Campaigns, KOL, ads, launches.', priorityRank: 5 },
  OPS: { label: 'Operations',        emoji: '⚙️', hint: 'Incident response, refund, backup, inventory.', priorityRank: 6 },
  AI:  { label: 'AI & Automation',   emoji: '🤖', hint: 'Agent monitoring, skills, automation alerts.', priorityRank: 7 },
  FIN: { label: 'Finance',           emoji: '💰', hint: 'Revenue, reconciliation, invoicing.', priorityRank: 8 },
  ANA: { label: 'Analytics',         emoji: '📊', hint: 'Reports, dashboards, data pipelines.', priorityRank: 9 },
  COM: { label: 'Community',         emoji: '💬', hint: 'Forum moderation, engagement, notifications.', priorityRank: 10 },
  HR:  { label: 'HR',                emoji: '🧑‍💼', hint: 'Onboarding, offboarding, team ops.', priorityRank: 11 },
  LEG: { label: 'Legal',             emoji: '⚖️', hint: 'Contracts, compliance, policy reviews.', priorityRank: 12 },
  PRD: { label: 'Product',           emoji: '🧩', hint: 'Feature specs, roadmap, QA gates.', priorityRank: 13 },
  BGD: { label: 'Business Dev',      emoji: '🤝', hint: 'Partnerships, BD, integrations.', priorityRank: 14 },
  IT:  { label: 'IT & Infra',        emoji: '🛠️', hint: 'DevOps, server, deployment.', priorityRank: 15 },
  DOC: { label: 'Documentation',     emoji: '📚', hint: 'Manual, reference docs, training.', priorityRank: 16 },
  ARCH:{ label: 'Architecture',      emoji: '🏛️', hint: 'System architecture decisions.', priorityRank: 17 },
  AFF: { label: 'Affiliate',         emoji: '🔗', hint: 'CTV + affiliate program.', priorityRank: 18 },
  ENG: { label: 'Engineering',       emoji: '💻', hint: 'Code quality, review, testing.', priorityRank: 19 },
  TEST:{ label: 'Testing',           emoji: '🧪', hint: 'QA automation, regression.', priorityRank: 20 },
};

// Hand-curated quick-access — P0 SOPs representing common flows.
const QUICK_ACCESS_IDS = [
  'CNT-001', 'CNT-018', 'CNT-015',         // Brainstorm → Generate → Review
  'DST-001', 'DST-004', 'DST-005',         // Publish → Email → Push
  'CS-001',  'SAL-001',                     // Handle inbox, sales discovery
  'OPS-003', 'AI-005',                      // Incident response, automation monitor
];

// ─────────── Primitives ───────────

function PriorityBadge({ p }: { p?: string | null }) {
  const lower = (p || 'p2').toLowerCase();
  const cls = (() => {
    switch (lower) {
      case 'p0': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'p1': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'p2': return 'bg-muted text-muted-foreground/70 border-border';
      default:   return 'bg-muted text-muted-foreground/60 border-border';
    }
  })();
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-medium ${cls}`}>
      {lower}
    </span>
  );
}

function StatusDot({ status }: { status?: string | null }) {
  const cls = status === 'published' ? 'bg-emerald-500'
    : status === 'draft' ? 'bg-amber-500'
    : 'bg-muted-foreground/40';
  return <span className={`inline-block size-1.5 rounded-full ${cls}`} />;
}

function priorityWeight(p?: string | null) {
  const v = (p || 'p2').toLowerCase();
  if (v === 'p0') return 0;
  if (v === 'p1') return 1;
  if (v === 'p2') return 2;
  return 3;
}

// Tiny AI-suggest scorer — cheap keyword match, no LLM call. Upgradable later.
function scoreSop(query: string, s: SopRow): { score: number; hits: string[] } {
  if (!query.trim()) return { score: 0, hits: [] };
  const q = query.toLowerCase();
  const tokens = Array.from(new Set(q.split(/[\s,;./()\-]+/).filter((t) => t.length >= 2)));
  const blob = [
    s.sop_id, s.name, s.description || '',
    s.body_markdown?.slice(0, 2000) || '',
    (s.assigned_agents || []).join(' '),
    (s.related_sops || []).join(' '),
  ].join(' ').toLowerCase();
  let score = 0;
  const hits: string[] = [];
  for (const tok of tokens) {
    const count = (blob.match(new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length;
    if (count > 0) {
      score += count * (tok.length >= 5 ? 2 : 1);
      hits.push(tok);
    }
  }
  // Boost P0 + published
  if ((s.priority || '').toLowerCase() === 'p0') score += 3;
  if (s.status === 'published') score += 2;
  return { score, hits };
}

// ─────────── Main component ───────────

/**
 * @archetype form
 */
export function SopPicker({
 value, onChange }: Props) {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = true;
  const validate = () => true;

  const [search, setSearch] = useState('');
  const [suggestInput, setSuggestInput] = useState('');
  const [submittedSuggest, setSubmittedSuggest] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['sop-picker', 'all'],
    queryFn: async () => {
      const r = await fetch('/api/ops/sop-engine/sops?limit=500&status=published');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return (j.sops ?? []) as SopRow[];
    },
    staleTime: 60_000,
  });

  const allSops = data ?? [];

  const selected = useMemo(() => allSops.find((s) => s.sop_id === value), [allSops, value]);

  const quickAccess = useMemo(() => {
    return QUICK_ACCESS_IDS
      .map((id) => allSops.find((s) => s.sop_id === id))
      .filter(Boolean) as SopRow[];
  }, [allSops]);

  // Filtered + grouped
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allSops.filter((s) =>
          s.sop_id.toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.domain || '').toLowerCase().includes(q)
        )
      : allSops;
    const bucket = new Map<string, SopRow[]>();
    for (const s of filtered) {
      const d = s.domain || 'OTHER';
      if (!bucket.has(d)) bucket.set(d, []);
      bucket.get(d)!.push(s);
    }
    // sort within group
    for (const [, arr] of bucket) {
      arr.sort((a, b) => {
        const pa = priorityWeight(a.priority);
        const pb = priorityWeight(b.priority);
        if (pa !== pb) return pa - pb;
        return (a.sop_id || '').localeCompare(b.sop_id || '');
      });
    }
    return Array.from(bucket.entries())
      .map(([domain, rows]) => ({
        domain,
        meta: DOMAIN_META[domain] ?? { label: domain, emoji: '📦', hint: '', priorityRank: 99 },
        rows,
      }))
      .sort((a, b) => a.meta.priorityRank - b.meta.priorityRank);
  }, [allSops, search]);

  // AI Suggest — top 5
  const suggestions = useMemo(() => {
    if (!submittedSuggest.trim()) return [];
    return allSops
      .map((s) => ({ sop: s, ...scoreSop(submittedSuggest, s) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [allSops, submittedSuggest]);

  const toggleGroup = (d: string) => setOpenGroups((o) => ({ ...o, [d]: !o[d] }));

  return (
    <div className="space-y-3">
      {/* Current selection card */}
      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <StatusDot status={selected.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-primary">{selected.sop_id}</span>
              <PriorityBadge p={selected.priority} />
              <span className="text-sm font-medium text-foreground truncate">{selected.name}</span>
            </div>
            {selected.description && (
              <div className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">{selected.description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
          >
            <X className="size-3 inline mr-1" /> Đổi SOP
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          Chưa chọn SOP — duyệt danh sách hoặc dùng AI Smart Suggest bên dưới.
        </div>
      )}

      {/* AI Smart Suggest */}
      <div className="border border-border rounded-lg p-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="size-3.5 text-amber-500" />
          <div className="text-sm font-semibold text-foreground">AI Smart Suggest</div>
          <span className="text-[11px] text-muted-foreground/60">Mô tả use case → ranked top SOPs phù hợp</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmittedSuggest(suggestInput); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={suggestInput}
            onChange={(e) => setSuggestInput(e.target.value)}
            placeholder="VD: 'Khách hàng xin hoàn tiền khóa học' hoặc 'Đăng bài facebook hàng ngày' ..."
            className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
          >
            <Sparkles className="size-3" /> Đề xuất
          </button>
          {submittedSuggest && (
            <button
              type="button"
              onClick={() => { setSubmittedSuggest(''); setSuggestInput(''); }}
              className="text-xs px-2 py-2 rounded-md border border-border hover:bg-muted"
            >
              Xóa
            </button>
          )}
        </form>
        {/* Quick Chips — preset use cases bấm nhanh */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground/60 mr-1 self-center">Gợi ý nhanh:</span>
          {[
            'Đăng bài mạng xã hội hàng ngày',
            'Khách hoàn tiền khóa học',
            'Sinh content bulk 2 tuần',
            'Email welcome khách mới',
            'Phân tích trading daily',
            'Chat tư vấn tâm linh',
            'Tính năng App GEMRAL use-case',
            'Cron scheduler Meta BS',
            'Sync Notion → cc_scripts',
            'Quét pattern nến BTC',
            'Affiliate onboarding',
            'Newsletter tuần',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => { setSuggestInput(chip); setSubmittedSuggest(chip); }}
              className="text-[10px] px-2 py-1 rounded-full border border-border bg-background hover:border-primary hover:bg-primary/10 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
        {submittedSuggest && (
          <div className="mt-3 space-y-1">
            {suggestions.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 italic py-2">Không tìm thấy SOP khớp. Thử dùng từ khóa khác (VD: "email", "refund", "đăng bài").</div>
            ) : (
              suggestions.map(({ sop, score, hits }, idx) => (
                <button
                  key={sop.sop_id}
                  type="button"
                  onClick={() => onChange(sop.sop_id)}
                  className="w-full text-left p-2 rounded border border-border hover:bg-accent/30 transition-colors flex items-start gap-2"
                >
                  <span className="text-[10px] font-mono font-bold text-primary shrink-0 mt-0.5">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-primary">{sop.sop_id}</span>
                      <PriorityBadge p={sop.priority} />
                      <span className="text-sm font-medium text-foreground">{sop.name}</span>
                    </div>
                    {sop.description && (
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{sop.description}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-2">
                      <Flame className="size-2.5 text-amber-500" />
                      Score {score} · matches: {hits.slice(0, 4).map((h) => <code key={h} className="px-1 bg-muted rounded">{h}</code>)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Access */}
      {quickAccess.length > 0 && !search && (
        <div className="border border-border rounded-lg p-3 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Star className="size-3.5 text-amber-500" />
            <div className="text-sm font-semibold text-foreground">Quick Access — SOPs hay dùng</div>
            <span className="text-[11px] text-muted-foreground/60">({quickAccess.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickAccess.map((sop) => (
              <button
                key={sop.sop_id}
                type="button"
                onClick={() => onChange(sop.sop_id)}
                className="text-left p-2 rounded border border-border hover:border-primary/40 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-primary">{sop.sop_id}</span>
                  <PriorityBadge p={sop.priority} />
                </div>
                <div className="text-sm font-medium text-foreground truncate mt-0.5">{sop.name}</div>
                {sop.description && (
                  <div className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">{sop.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + grouped browser */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="size-3.5 text-foreground/70" />
          <div className="text-sm font-semibold text-foreground">Thư Viện SOP</div>
          <span className="text-[11px] text-muted-foreground/60">({allSops.length} published)</span>
          <div className="ml-auto relative w-72">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo name, id, domain, description..."
              className="w-full text-xs pl-7 pr-2 py-1.5 rounded border border-border bg-background focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin mr-2" /> Đang tải {allSops.length} SOPs…
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground/60 italic">
            Không có SOP nào khớp "{search}".
          </div>
        )}

        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = openGroups[g.domain] ?? (Boolean(search) || g.rows.length <= 3);
            const p0Count = g.rows.filter((r) => (r.priority || '').toLowerCase() === 'p0').length;
            return (
              <div key={g.domain} className="border border-border rounded-md">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.domain)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/30 hover:bg-muted/60 rounded-t-md"
                >
                  <ChevronRight className={`size-3.5 transition-transform text-muted-foreground/60 ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="text-base">{g.meta.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{g.meta.label}</span>
                  <span className="text-[11px] text-muted-foreground/60">({g.rows.length})</span>
                  {p0Count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/30">
                      {p0Count} · P0
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground/60 italic truncate max-w-md">{g.meta.hint}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-border">
                    {g.rows.map((sop) => {
                      const isSelected = sop.sop_id === value;
                      return (
                        <button
                          key={sop.sop_id}
                          type="button"
                          onClick={() => onChange(sop.sop_id)}
                          className={`w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-accent/30 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <StatusDot status={sop.status} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-semibold text-primary">{sop.sop_id}</span>
                              <PriorityBadge p={sop.priority} />
                              <span className="text-sm font-medium text-foreground">{sop.name}</span>
                              {sop.sop_type && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground/60 border border-border">
                                  {sop.sop_type}
                                </span>
                              )}
                            </div>
                            {sop.description && (
                              <div className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-0.5">
                                {sop.description}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/50">
                              {sop.assigned_agents && sop.assigned_agents.length > 0 && (
                                <span>Agents: {sop.assigned_agents.slice(0, 2).join(', ')}{sop.assigned_agents.length > 2 ? ` +${sop.assigned_agents.length - 2}` : ''}</span>
                              )}
                              {sop.related_sops && sop.related_sops.length > 0 && (
                                <span>Related: {sop.related_sops.length}</span>
                              )}
                              {sop.outputs_to && sop.outputs_to.length > 0 && (
                                <span>→ {sop.outputs_to.slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-semibold text-primary shrink-0 mt-1">đã chọn</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
