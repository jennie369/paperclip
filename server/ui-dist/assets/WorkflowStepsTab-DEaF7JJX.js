import { r as reactExports, ag as useQuery, j as jsxRuntimeExports, X, d as Sparkles, N as Lightbulb, bv as Flame, bw as Star, B as BookOpen, y as Search, k as LoaderCircle, K as ChevronRight, ah as TooltipProvider, F as FileText, ap as Tooltip, aq as TooltipTrigger, ar as TooltipContent } from './index-B6bTFNAD.js';
import { S as SopStepsEditor } from './SopStepsEditor-CDd0sGBG.js';

const DOMAIN_META = {
  CNT: { label: "Content", emoji: "📝", hint: "Brainstorm, write, review, publish content.", priorityRank: 1 },
  CS: { label: "Customer Service", emoji: "🎧", hint: "Reply, escalate, refund, ticket workflows.", priorityRank: 2 },
  SAL: { label: "Sales", emoji: "💸", hint: "Discovery → consult → close → upsell.", priorityRank: 3 },
  DST: { label: "Distribution", emoji: "🚀", hint: "Scheduling, posting, push, email distribution.", priorityRank: 4 },
  MKT: { label: "Marketing", emoji: "📣", hint: "Campaigns, KOL, ads, launches.", priorityRank: 5 },
  OPS: { label: "Operations", emoji: "⚙️", hint: "Incident response, refund, backup, inventory.", priorityRank: 6 },
  AI: { label: "AI & Automation", emoji: "🤖", hint: "Agent monitoring, skills, automation alerts.", priorityRank: 7 },
  FIN: { label: "Finance", emoji: "💰", hint: "Revenue, reconciliation, invoicing.", priorityRank: 8 },
  ANA: { label: "Analytics", emoji: "📊", hint: "Reports, dashboards, data pipelines.", priorityRank: 9 },
  COM: { label: "Community", emoji: "💬", hint: "Forum moderation, engagement, notifications.", priorityRank: 10 },
  HR: { label: "HR", emoji: "🧑‍💼", hint: "Onboarding, offboarding, team ops.", priorityRank: 11 },
  LEG: { label: "Legal", emoji: "⚖️", hint: "Contracts, compliance, policy reviews.", priorityRank: 12 },
  PRD: { label: "Product", emoji: "🧩", hint: "Feature specs, roadmap, QA gates.", priorityRank: 13 },
  BGD: { label: "Business Dev", emoji: "🤝", hint: "Partnerships, BD, integrations.", priorityRank: 14 },
  IT: { label: "IT & Infra", emoji: "🛠️", hint: "DevOps, server, deployment.", priorityRank: 15 },
  DOC: { label: "Documentation", emoji: "📚", hint: "Manual, reference docs, training.", priorityRank: 16 },
  ARCH: { label: "Architecture", emoji: "🏛️", hint: "System architecture decisions.", priorityRank: 17 },
  AFF: { label: "Affiliate", emoji: "🔗", hint: "CTV + affiliate program.", priorityRank: 18 },
  ENG: { label: "Engineering", emoji: "💻", hint: "Code quality, review, testing.", priorityRank: 19 },
  TEST: { label: "Testing", emoji: "🧪", hint: "QA automation, regression.", priorityRank: 20 }
};
const QUICK_ACCESS_IDS = [
  "CNT-001",
  "CNT-018",
  "CNT-015",
  // Brainstorm → Generate → Review
  "DST-001",
  "DST-004",
  "DST-005",
  // Publish → Email → Push
  "CS-001",
  "SAL-001",
  // Handle inbox, sales discovery
  "OPS-003",
  "AI-005"
  // Incident response, automation monitor
];
function PriorityBadge({ p }) {
  const lower = (p || "p2").toLowerCase();
  const cls = (() => {
    switch (lower) {
      case "p0":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      case "p1":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "p2":
        return "bg-muted text-muted-foreground/70 border-border";
      default:
        return "bg-muted text-muted-foreground/60 border-border";
    }
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-medium ${cls}`, children: lower });
}
function StatusDot({ status }) {
  const cls = status === "published" ? "bg-emerald-500" : status === "draft" ? "bg-amber-500" : "bg-muted-foreground/40";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block size-1.5 rounded-full ${cls}` });
}
function priorityWeight(p) {
  const v = (p || "p2").toLowerCase();
  if (v === "p0") return 0;
  if (v === "p1") return 1;
  if (v === "p2") return 2;
  return 3;
}
function scoreSop(query, s) {
  if (!query.trim()) return { score: 0, hits: [] };
  const q = query.toLowerCase();
  const tokens = Array.from(new Set(q.split(/[\s,;./()\-]+/).filter((t) => t.length >= 2)));
  const blob = [
    s.sop_id,
    s.name,
    s.description || "",
    s.body_markdown?.slice(0, 2e3) || "",
    (s.assigned_agents || []).join(" "),
    (s.related_sops || []).join(" ")
  ].join(" ").toLowerCase();
  let score = 0;
  const hits = [];
  for (const tok of tokens) {
    const count = (blob.match(new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g")) || []).length;
    if (count > 0) {
      score += count * (tok.length >= 5 ? 2 : 1);
      hits.push(tok);
    }
  }
  if ((s.priority || "").toLowerCase() === "p0") score += 3;
  if (s.status === "published") score += 2;
  return { score, hits };
}
function SopPicker({ value, onChange }) {
  const [search, setSearch] = reactExports.useState("");
  const [suggestInput, setSuggestInput] = reactExports.useState("");
  const [submittedSuggest, setSubmittedSuggest] = reactExports.useState("");
  const [openGroups, setOpenGroups] = reactExports.useState({});
  const { data, isLoading } = useQuery({
    queryKey: ["sop-picker", "all"],
    queryFn: async () => {
      const r = await fetch("/api/ops/sop-engine/sops?limit=500&status=published");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j.sops ?? [];
    },
    staleTime: 6e4
  });
  const allSops = data ?? [];
  const selected = reactExports.useMemo(() => allSops.find((s) => s.sop_id === value), [allSops, value]);
  const quickAccess = reactExports.useMemo(() => {
    return QUICK_ACCESS_IDS.map((id) => allSops.find((s) => s.sop_id === id)).filter(Boolean);
  }, [allSops]);
  const groups = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? allSops.filter(
      (s) => s.sop_id.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q) || (s.domain || "").toLowerCase().includes(q)
    ) : allSops;
    const bucket = /* @__PURE__ */ new Map();
    for (const s of filtered) {
      const d = s.domain || "OTHER";
      if (!bucket.has(d)) bucket.set(d, []);
      bucket.get(d).push(s);
    }
    for (const [, arr] of bucket) {
      arr.sort((a, b) => {
        const pa = priorityWeight(a.priority);
        const pb = priorityWeight(b.priority);
        if (pa !== pb) return pa - pb;
        return (a.sop_id || "").localeCompare(b.sop_id || "");
      });
    }
    return Array.from(bucket.entries()).map(([domain, rows]) => ({
      domain,
      meta: DOMAIN_META[domain] ?? { label: domain, emoji: "📦", hint: "", priorityRank: 99 },
      rows
    })).sort((a, b) => a.meta.priorityRank - b.meta.priorityRank);
  }, [allSops, search]);
  const suggestions = reactExports.useMemo(() => {
    if (!submittedSuggest.trim()) return [];
    return allSops.map((s) => ({ sop: s, ...scoreSop(submittedSuggest, s) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [allSops, submittedSuggest]);
  const toggleGroup = (d) => setOpenGroups((o) => ({ ...o, [d]: !o[d] }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    selected ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: selected.status }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono font-semibold text-primary", children: selected.sop_id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PriorityBadge, { p: selected.priority }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-foreground truncate", children: selected.name })
        ] }),
        selected.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1", children: selected.description })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onChange(""),
          className: "text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3 inline mr-1" }),
            " Đổi SOP"
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5 text-primary" }),
      "Chưa chọn SOP — duyệt danh sách hoặc dùng AI Smart Suggest bên dưới."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-lg p-3 bg-gradient-to-br from-primary/5 to-transparent", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { className: "size-3.5 text-amber-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-foreground", children: "AI Smart Suggest" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground/60", children: "Mô tả use case → ranked top SOPs phù hợp" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            setSubmittedSuggest(suggestInput);
          },
          className: "flex gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: suggestInput,
                onChange: (e) => setSuggestInput(e.target.value),
                placeholder: "VD: 'Khách hàng xin hoàn tiền khóa học' hoặc 'Đăng bài facebook hàng ngày' ...",
                className: "flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background focus:border-primary focus:outline-none"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "submit",
                className: "text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3" }),
                  " Đề xuất"
                ]
              }
            ),
            submittedSuggest && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setSubmittedSuggest("");
                  setSuggestInput("");
                },
                className: "text-xs px-2 py-2 rounded-md border border-border hover:bg-muted",
                children: "Xóa"
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground/60 mr-1 self-center", children: "Gợi ý nhanh:" }),
        [
          "Đăng bài mạng xã hội hàng ngày",
          "Khách hoàn tiền khóa học",
          "Sinh content bulk 2 tuần",
          "Email welcome khách mới",
          "Phân tích trading daily",
          "Chat tư vấn tâm linh",
          "Tính năng App GEMRAL use-case",
          "Cron scheduler Meta BS",
          "Sync Notion → cc_scripts",
          "Quét pattern nến BTC",
          "Affiliate onboarding",
          "Newsletter tuần"
        ].map((chip) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              setSuggestInput(chip);
              setSubmittedSuggest(chip);
            },
            className: "text-[10px] px-2 py-1 rounded-full border border-border bg-background hover:border-primary hover:bg-primary/10 transition-colors",
            children: chip
          },
          chip
        ))
      ] }),
      submittedSuggest && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-1", children: suggestions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground/60 italic py-2", children: 'Không tìm thấy SOP khớp. Thử dùng từ khóa khác (VD: "email", "refund", "đăng bài").' }) : suggestions.map(({ sop, score, hits }, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onChange(sop.sop_id),
          className: "w-full text-left p-2 rounded border border-border hover:bg-accent/30 transition-colors flex items-start gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono font-bold text-primary shrink-0 mt-0.5", children: [
              "#",
              idx + 1
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-mono text-primary", children: sop.sop_id }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(PriorityBadge, { p: sop.priority }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-foreground", children: sop.name })
              ] }),
              sop.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2", children: sop.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "size-2.5 text-amber-500" }),
                "Score ",
                score,
                " · matches: ",
                hits.slice(0, 4).map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "px-1 bg-muted rounded", children: h }, h))
              ] })
            ] })
          ]
        },
        sop.sop_id
      )) })
    ] }),
    quickAccess.length > 0 && !search && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-lg p-3 bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "size-3.5 text-amber-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-foreground", children: "Quick Access — SOPs hay dùng" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
          "(",
          quickAccess.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: quickAccess.map((sop) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onChange(sop.sop_id),
          className: "text-left p-2 rounded border border-border hover:border-primary/40 hover:bg-accent/30 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-primary", children: sop.sop_id }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PriorityBadge, { p: sop.priority })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-foreground truncate mt-0.5", children: sop.name }),
            sop.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5", children: sop.description })
          ]
        },
        sop.sop_id
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-lg p-3 bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "size-3.5 text-foreground/70" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-foreground", children: "Thư Viện SOP" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
          "(",
          allSops.length,
          " published)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto relative w-72", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Tìm theo name, id, domain, description...",
              className: "w-full text-xs pl-7 pr-2 py-1.5 rounded border border-border bg-background focus:border-primary focus:outline-none"
            }
          )
        ] })
      ] }),
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-10 text-muted-foreground text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin mr-2" }),
        " Đang tải ",
        allSops.length,
        " SOPs…"
      ] }),
      !isLoading && groups.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8 text-sm text-muted-foreground/60 italic", children: [
        'Không có SOP nào khớp "',
        search,
        '".'
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: groups.map((g) => {
        const isOpen = openGroups[g.domain] ?? (Boolean(search) || g.rows.length <= 3);
        const p0Count = g.rows.filter((r) => (r.priority || "").toLowerCase() === "p0").length;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => toggleGroup(g.domain),
              className: "w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/30 hover:bg-muted/60 rounded-t-md",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: `size-3.5 transition-transform text-muted-foreground/60 ${isOpen ? "rotate-90" : ""}` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base", children: g.meta.emoji }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-foreground", children: g.meta.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground/60", children: [
                  "(",
                  g.rows.length,
                  ")"
                ] }),
                p0Count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/30", children: [
                  p0Count,
                  " · P0"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] text-muted-foreground/60 italic truncate max-w-md", children: g.meta.hint })
              ]
            }
          ),
          isOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border", children: g.rows.map((sop) => {
            const isSelected = sop.sop_id === value;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => onChange(sop.sop_id),
                className: `w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-accent/30 transition-colors group ${isSelected ? "bg-primary/5" : ""}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status: sop.status }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-mono font-semibold text-primary", children: sop.sop_id }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(PriorityBadge, { p: sop.priority }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-foreground", children: sop.name }),
                      sop.sop_type && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground/60 border border-border", children: sop.sop_type })
                    ] }),
                    sop.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground/70 line-clamp-2 mt-0.5", children: sop.description }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/50", children: [
                      sop.assigned_agents && sop.assigned_agents.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        "Agents: ",
                        sop.assigned_agents.slice(0, 2).join(", "),
                        sop.assigned_agents.length > 2 ? ` +${sop.assigned_agents.length - 2}` : ""
                      ] }),
                      sop.related_sops && sop.related_sops.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        "Related: ",
                        sop.related_sops.length
                      ] }),
                      sop.outputs_to && sop.outputs_to.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        "→ ",
                        sop.outputs_to.slice(0, 2).join(", ")
                      ] })
                    ] })
                  ] }),
                  isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-semibold text-primary shrink-0 mt-1", children: "đã chọn" })
                ]
              },
              sop.sop_id
            );
          }) })
        ] }, g.domain);
      }) })
    ] })
  ] });
}

function WorkflowStepsTab() {
  const [selectedSopId, setSelectedSopId] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { delayDuration: 300, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-foreground", children: "Workflow Steps Editor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground cursor-help", children: "ℹ️" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "right", className: "max-w-md", children: "Editor đầy đủ 9-field cho workflow steps của bất kỳ SOP nào. Dùng AI Smart Suggest hoặc chọn từ thư viện grouped → editor load bên dưới với drag-drop reorder + auto-save 800ms debounce. Mọi field đều dropdown từ Registry SSOT." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SopPicker, { value: selectedSopId, onChange: setSelectedSopId }),
      selectedSopId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-[10px] text-muted-foreground", children: "💡 Mẹo: Component cùng source với editor khi expand 1 SOP block trong tab Pipelines. Auto-save 800ms. Mọi thay đổi ghi vào gem_sops.steps JSONB." })
    ] }),
    !selectedSopId ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-12 text-center border border-dashed border-border rounded-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-8 text-muted-foreground mx-auto mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground font-medium", children: "Chưa chọn SOP nào" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Dùng AI Smart Suggest hoặc chọn 1 SOP từ thư viện phía trên" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-3 max-w-md mx-auto", children: "161+ published SOPs — từ Content (CNT-*), Distribution (DST-*), Customer Service (CS-*), Sales (SAL-*), Operations (OPS-*), AI (AI-*), Analytics (ANA-*), v.v." })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-xl p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SopStepsEditor, { sopId: selectedSopId }) })
  ] }) });
}

export { WorkflowStepsTab as default };
