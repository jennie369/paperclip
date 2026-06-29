import { ae as useNavigate, r as reactExports, s as supabase, j as jsxRuntimeExports, n as Send, m as Mail, D as DollarSign, y as Search, k as LoaderCircle, E as Eye, ac as Copy, af as Trash2, J as ChevronLeft, K as ChevronRight, t as TriangleAlert, X } from './index-C7HOhyqm.js';
import { M as MousePointer } from './mouse-pointer-BBt6E5mk.js';

const PAGE_SIZE = 15;
const STATUS_CONFIG = {
  draft: { label: "Bản nháp", color: "text-white/50", bg: "bg-bg-4" },
  sending: { label: "Đang gửi", color: "text-[#00F0FF]", bg: "bg-[#00F0FF]/12" },
  sent: { label: "Đã gửi", color: "text-[#3AF7A6]", bg: "bg-[#3AF7A6]/12" },
  failed: { label: "Thất bại", color: "text-[#FF6B6B]", bg: "bg-[#FF6B6B]/10" }
};
const TRACK_CONFIG = {
  wealth: { label: "Wealth", color: "text-[#FFBD59]" },
  wellness: { label: "Wellness", color: "text-[#6A5BFF]" },
  integration: { label: "Integration", color: "text-[#3AF7A6]" }
};
function formatNumber(num) {
  if (num == null) return "0";
  return Number(num).toLocaleString("vi-VN");
}
function formatVND(amount) {
  if (amount == null) return "0 ₫";
  return Number(amount).toLocaleString("vi-VN") + " ₫";
}
function formatPercent(val) {
  if (val == null) return "0%";
  return Number(val).toFixed(1) + "%";
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function KPICard({ icon: Icon, label, value, iconColor, iconBg }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-3.5 text-center shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mx-auto mb-2`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 20, className: iconColor }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[22px] font-bold text-foreground", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: label })
  ] });
}
function MiniProgressBar({ value, color }) {
  const clampedValue = Math.min(Math.max(value || 0, 0), 100);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `h-full rounded-full ${color}`,
        style: { width: `${clampedValue}%` }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground w-[36px] text-right", children: formatPercent(value) })
  ] });
}
function CCEmailCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = reactExports.useState([]);
  const [totalCount, setTotalCount] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [kpis, setKpis] = reactExports.useState({
    total_sent: 0,
    avg_open_rate: 0,
    avg_click_rate: 0,
    total_revenue: 0
  });
  const [kpiLoading, setKpiLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [trackFilter, setTrackFilter] = reactExports.useState("");
  const [page, setPage] = reactExports.useState(0);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [deleting, setDeleting] = reactExports.useState(false);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  reactExports.useEffect(() => {
    let cancelled = false;
    async function fetchKPIs() {
      setKpiLoading(true);
      try {
        const [sentRes, openedRes, clickedRes, revenueRes] = await Promise.all([
          supabase.from("cc_email_sends").select("*", { count: "exact", head: true }),
          supabase.from("cc_email_sends").select("*", { count: "exact", head: true }).not("first_opened_at", "is", null),
          supabase.from("cc_email_sends").select("*", { count: "exact", head: true }).not("first_clicked_at", "is", null),
          supabase.from("cc_email_campaigns").select("revenue_attributed").eq("status", "sent")
        ]);
        const total_sent = sentRes.count || 0;
        const total_opened = openedRes.count || 0;
        const total_clicked = clickedRes.count || 0;
        const avg_open_rate = total_sent > 0 ? total_opened / total_sent * 100 : 0;
        const avg_click_rate = total_sent > 0 ? total_clicked / total_sent * 100 : 0;
        const total_revenue = (revenueRes.data || []).reduce((s, r) => s + (r.revenue_attributed || 0), 0);
        if (!cancelled) {
          setKpis({ total_sent, avg_open_rate, avg_click_rate, total_revenue });
        }
      } catch (err) {
        console.error("KPI fetch error:", err);
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    }
    fetchKPIs();
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    let cancelled = false;
    async function fetchCampaigns() {
      setLoading(true);
      setError(null);
      try {
        let query = supabase.from("cc_email_campaigns").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (search.trim()) {
          query = query.ilike("name", `%${search.trim()}%`);
        }
        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }
        if (trackFilter) {
          query = query.eq("track", trackFilter);
        }
        const { data, count, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        const rows = data ?? [];
        let enriched = rows;
        if (rows.length > 0) {
          const ids = rows.map((c) => c.id);
          const { data: sends } = await supabase.from("cc_email_sends").select("campaign_id, first_opened_at, first_clicked_at").in("campaign_id", ids);
          if (sends?.length) {
            const statsMap = {};
            sends.forEach((s) => {
              if (!statsMap[s.campaign_id]) statsMap[s.campaign_id] = { sent: 0, opened: 0, clicked: 0 };
              statsMap[s.campaign_id].sent++;
              if (s.first_opened_at) statsMap[s.campaign_id].opened++;
              if (s.first_clicked_at) statsMap[s.campaign_id].clicked++;
            });
            enriched = rows.map((c) => {
              const st = statsMap[c.id];
              if (!st) return c;
              return {
                ...c,
                sent_count: st.sent,
                open_rate: st.sent > 0 ? st.opened / st.sent * 100 : 0,
                click_rate: st.sent > 0 ? st.clicked / st.sent * 100 : 0
              };
            });
          }
        }
        if (!cancelled) {
          setCampaigns(enriched);
          setTotalCount(count ?? 0);
        }
      } catch (err) {
        console.error("Campaign fetch error:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCampaigns();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, trackFilter, page]);
  reactExports.useEffect(() => {
    setPage(0);
  }, [search, statusFilter, trackFilter]);
  const handleRowClick = reactExports.useCallback((id) => {
    navigate(`/GEM/cc/email/${id}`);
  }, [navigate]);
  const handleClone = reactExports.useCallback(async (e, campaign) => {
    e.stopPropagation();
    try {
      const { id, created_at, updated_at, ...rest } = campaign;
      const { data, error: cloneErr } = await supabase.from("cc_email_campaigns").insert({
        ...rest,
        name: `${campaign.name} (Bản sao)`,
        status: "draft"
      }).select().single();
      if (cloneErr) throw cloneErr;
      if (data) {
        setCampaigns((prev) => [data, ...prev]);
        setTotalCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Clone error:", err);
    }
  }, []);
  const handleDeleteClick = reactExports.useCallback((e, campaign) => {
    e.stopPropagation();
    setDeleteTarget(campaign);
  }, []);
  const handleDeleteConfirm = reactExports.useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: delErr } = await supabase.from("cc_email_campaigns").delete().eq("id", deleteTarget.id);
      if (delErr) throw delErr;
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setTotalCount((prev) => prev - 1);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-[20px] font-bold text-foreground mb-1", children: "Email Campaigns" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-muted-foreground", children: "Quản lý và theo dõi các chiến dịch email marketing" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-4 gap-2.5 max-md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        KPICard,
        {
          icon: Send,
          label: "Đã Gửi",
          value: kpiLoading ? "—" : formatNumber(kpis.total_sent),
          iconColor: "text-[#00F0FF]",
          iconBg: "bg-[#00F0FF]/12"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        KPICard,
        {
          icon: Mail,
          label: "Tỷ Lệ Mở",
          value: kpiLoading ? "—" : formatPercent(kpis.avg_open_rate),
          iconColor: "text-[#FFBD59]",
          iconBg: "bg-[#FFBD59]/15"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        KPICard,
        {
          icon: MousePointer,
          label: "Tỷ Lệ Click",
          value: kpiLoading ? "—" : formatPercent(kpis.avg_click_rate),
          iconColor: "text-[#6A5BFF]",
          iconBg: "bg-[#6A5BFF]/12"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        KPICard,
        {
          icon: DollarSign,
          label: "Doanh Thu",
          value: kpiLoading ? "—" : formatVND(kpis.total_revenue),
          iconColor: "text-[#3AF7A6]",
          iconBg: "bg-[#3AF7A6]/12"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-[320px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "h-8 w-full pl-8 pr-3 text-[12px] bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none transition-colors",
            placeholder: "Tìm tên campaign...",
            value: search,
            onChange: (e) => setSearch(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-[150px] shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: statusFilter,
          onChange: (e) => setStatusFilter(e.target.value),
          className: "h-8 w-full px-2.5 text-[12px] bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả trạng thái" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "draft", children: "Bản nháp" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "sending", children: "Đang gửi" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "sent", children: "Đã gửi" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "failed", children: "Thất bại" })
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-[140px] shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: trackFilter,
          onChange: (e) => setTrackFilter(e.target.value),
          className: "h-8 w-full px-2.5 text-[12px] bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/40 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả track" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Wealth" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wellness", children: "Wellness" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Integration" })
          ]
        }
      ) })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-txt-3" }) }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-10 px-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 32, className: "mx-auto mb-2.5 text-[#FF6B6B]/40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[14px] text-white/35", children: "Không thể tải dữ liệu" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] text-white/20 mt-1", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setPage((p) => p),
          className: "mt-3 h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#FFBD59]/15 text-[#FFBD59] hover:bg-[#FFBD59]/25 transition-colors",
          children: "Thử lại"
        }
      )
    ] }) : campaigns.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-10 px-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 32, className: "mx-auto mb-2.5 text-white/10" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[14px] text-white/35", children: "Chưa có chiến dịch email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] text-white/20 mt-1", children: search || statusFilter || trackFilter ? "Không tìm thấy kết quả phù hợp với bộ lọc hiện tại" : "Tạo chiến dịch email đầu tiên để bắt đầu" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-xl border border-border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-[12px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap", children: "Chiến dịch" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap", children: "Gửi" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap min-w-[120px]", children: "Mở" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap min-w-[120px]", children: "Click" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap", children: "ROI" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap", children: "Thao tác" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: campaigns.map((c) => {
          const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
          const trackCfg = TRACK_CONFIG[c.track];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              onClick: () => handleRowClick(c.id),
              className: "cursor-pointer hover:[&>td]:bg-muted/50 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle max-w-[300px]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-semibold text-foreground truncate", children: c.name || "Chiến dịch không tên" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded ${statusCfg.bg} ${statusCfg.color}`, children: statusCfg.label })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground truncate", children: c.subject || "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: formatDate(c.created_at) }),
                    trackCfg && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-medium ${trackCfg.color}`, children: trackCfg.label })
                  ] })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-medium text-foreground", children: formatNumber(c.sent_count) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniProgressBar, { value: c.open_rate, color: "bg-[#FFBD59]" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniProgressBar, { value: c.click_rate, color: "bg-[#6A5BFF]" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[12px] font-medium ${(c.roi ?? 0) > 0 ? "text-[#3AF7A6]" : (c.roi ?? 0) < 0 ? "text-[#FF6B6B]" : "text-txt-3"}`, children: c.roi != null ? `${Number(c.roi).toFixed(1)}%` : "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2.5 border-b border-border align-middle", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        handleRowClick(c.id);
                      },
                      className: "h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-3 hover:text-txt transition-colors cursor-pointer inline-flex items-center gap-1",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 12 }),
                        "Xem"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: (e) => handleClone(e, c),
                      className: "h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-3 hover:text-txt transition-colors cursor-pointer inline-flex items-center gap-1",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 12 }),
                        "Clone"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: (e) => handleDeleteClick(e, c),
                      className: "h-7 px-2.5 text-[11px] font-semibold rounded-md border border-[#FF6B6B]/20 bg-transparent text-[#FF6B6B]/60 hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B] transition-colors cursor-pointer inline-flex items-center gap-1",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 12 }),
                        "Xóa"
                      ]
                    }
                  )
                ] }) })
              ]
            },
            c.id
          );
        }) })
      ] }) }),
      totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-txt-3", children: [
          "Trang ",
          page + 1,
          " / ",
          totalPages,
          " (",
          formatNumber(totalCount),
          " chiến dịch)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: page === 0,
              onClick: () => setPage((p) => Math.max(0, p - 1)),
              className: "h-7 px-2 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-3 hover:text-txt transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 14 }),
                "Trước"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: page >= totalPages - 1,
              onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
              className: "h-7 px-2 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 hover:bg-bg-3 hover:text-txt transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed",
              children: [
                "Sau",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14 })
              ]
            }
          )
        ] })
      ] })
    ] }),
    deleteTarget && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-5 w-full max-w-[380px] shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-destructive/12 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 16, className: "text-destructive" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14px] font-bold text-foreground", children: "Xác nhận xóa" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setDeleteTarget(null),
            className: "w-7 h-7 rounded-md bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center justify-center",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-muted-foreground mb-1", children: "Bạn có chắc muốn xóa chiến dịch này?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] font-semibold text-foreground mb-4 truncate", children: deleteTarget.name || "Chiến dịch không tên" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setDeleteTarget(null),
            disabled: deleting,
            className: "h-8 px-3.5 text-[12px] font-semibold rounded-lg border border-border bg-transparent text-foreground/70 hover:bg-accent hover:text-foreground transition-colors cursor-pointer",
            children: "Hủy"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleDeleteConfirm,
            disabled: deleting,
            className: "h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none bg-[#FF6B6B]/15 text-[#FF6B6B] hover:bg-[#FF6B6B]/25 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50",
            children: [
              deleting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 12 }),
              deleting ? "Đang xóa..." : "Xóa chiến dịch"
            ]
          }
        )
      ] })
    ] }) })
  ] });
}

export { CCEmailCampaigns as default };
