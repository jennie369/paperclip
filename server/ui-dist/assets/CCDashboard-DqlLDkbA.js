const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-CvPgjxWl.js","assets/index-DBbg9hhQ.css"])))=>i.map(i=>d[i]);
import { u as useDashboardStats, b as useRecentActivity, F as FileText, C as CircleCheckBig, c as Clock, P as PenLine, j as jsxRuntimeExports, L as LayoutDashboard, R as RefreshCw, d as Sparkles, B as BookOpen, U as Users, e as Share2, f as Type, I as Image, g as Calendar, h as Link, A as ArrowRight, i as Activity, k as LoaderCircle, l as TrendingUp, r as reactExports, _ as __vitePreload, m as Mail, n as Send, D as DollarSign } from './index-CvPgjxWl.js';
import { F as Film } from './film-B2s5OUZj.js';
import { T as TrendingDown } from './trending-down-Dn-1cAQp.js';
import { M as MousePointer } from './mouse-pointer-XKithQrF.js';

function DashboardStatCard({ stat }) {
  const colorClasses = {
    gold: "sc gd",
    purple: "sc pu",
    blue: "sc bl",
    emerald: "sc em"
  };
  const iconColorClasses = {
    gold: "text-gold",
    purple: "text-purple",
    blue: "text-blue",
    emerald: "text-emerald"
  };
  const Icon = stat.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: colorClasses[stat.color], title: stat.tooltip, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2 uppercase tracking-wider", children: stat.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 18, className: iconColorClasses[stat.color] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl font-heading font-bold text-txt mb-1", children: stat.value.toLocaleString("vi-VN") }),
    stat.change !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xxs", children: [
      stat.change >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 12, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-success", children: [
          "+",
          stat.change,
          "%"
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { size: 12, className: "text-danger" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-danger", children: [
          stat.change,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3 ml-1", children: "so với tuần trước" })
    ] })
  ] });
}
const quickActions = [
  { label: "Tạo Kịch Bản AI", icon: Sparkles, href: "/admin/cc/ai-gen", color: "text-gold", iconBg: "bg-gold/10" },
  { label: "Kịch Bản LATC", icon: BookOpen, href: "/admin/cc/ai-gen", color: "text-gold", iconBg: "bg-gold/10" },
  { label: "Kịch Bản TMT", icon: Users, href: "/admin/cc/ai-gen", color: "text-purple", iconBg: "bg-purple/10" },
  { label: "Clip Ngắn", icon: Film, href: "/admin/cc/ai-gen", color: "text-rose", iconBg: "bg-rose/10" },
  { label: "Bài Đăng MXH", icon: Share2, href: "/admin/cc/ai-gen", color: "text-blue", iconBg: "bg-blue/10" },
  { label: "Tiêu Đề", icon: Type, href: "/admin/cc/ai-gen", color: "text-amber", iconBg: "bg-amber/10" },
  { label: "Tạo Hình Ảnh", icon: Image, href: "/admin/cc/image-gen", color: "text-cyan", iconBg: "bg-cyan/10" },
  { label: "Lịch Nội Dung", icon: Calendar, href: "/admin/cc/calendar", color: "text-emerald", iconBg: "bg-emerald/10" }
];
const pillars = [
  {
    name: "Tài Chính (Wealth)",
    description: "Trading, LATC Money, đầu tư",
    color: "text-gold",
    borderColor: "border-l-gold",
    items: ["Chiến lược giao dịch", "Luật Hấp Dẫn & Tiền", "Tư duy triệu phú"]
  },
  {
    name: "Tâm Thức (Wellness)",
    description: "Thiền, tâm linh, chữa lành",
    color: "text-purple",
    borderColor: "border-l-purple",
    items: ["Thiền định hàng ngày", "Chữa lành tổn thương", "Nâng cao tần số"]
  },
  {
    name: "Tích Hợp (Integration)",
    description: "Lifestyle, cân bằng, ứng dụng",
    color: "text-emerald",
    borderColor: "border-l-emerald",
    items: ["Phong cách sống GEM", "Cân bằng cuộc sống", "Ứng dụng thực tế"]
  }
];
function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(8);
  const statCards = [
    {
      label: "Tổng Kịch Bản",
      value: stats?.totalScripts ?? 0,
      icon: FileText,
      color: "gold",
      tooltip: "Tổng số kịch bản đã tạo trên hệ thống"
    },
    {
      label: "Đã Xuất Bản",
      value: stats?.publishedScripts ?? 0,
      icon: CircleCheckBig,
      color: "emerald",
      tooltip: "Kịch bản đã được duyệt và xuất bản"
    },
    {
      label: "Chờ Duyệt",
      value: stats?.pendingReview ?? 0,
      icon: Clock,
      color: "purple",
      tooltip: "Kịch bản đang chờ kiểm duyệt nội dung"
    },
    {
      label: "Bản Nháp",
      value: stats?.drafts ?? 0,
      icon: PenLine,
      color: "blue",
      tooltip: "Kịch bản đang trong quá trình soạn thảo"
    }
  ];
  const actionLabels = {
    create: "đã tạo",
    update: "đã cập nhật",
    delete: "đã xóa",
    publish: "đã xuất bản",
    approve: "đã duyệt",
    reject: "đã từ chối",
    login: "đã đăng nhập",
    logout: "đã đăng xuất"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-8 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { size: 20, className: "text-gold" }),
          "Tổng Quan"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => refetchStats(),
            className: "flex items-center gap-1.5 text-xs text-txt-3 hover:text-txt transition-button",
            title: "Làm mới dữ liệu",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 14 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Làm Mới" })
            ]
          }
        )
      ] }),
      statsError ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-danger text-sm mb-3", children: "Không thể tải dữ liệu thống kê" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => refetchStats(),
            className: "btn btn-o text-xs",
            children: "Thử Lại"
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g4", children: statCards.map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        DashboardStatCard,
        {
          stat: statsLoading ? { ...stat, value: 0 } : stat
        },
        stat.label
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 20, className: "text-gold" }),
        "Tạo Nhanh"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g4", children: quickActions.map((action) => {
        const Icon = action.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            href: action.href,
            className: "card p-4 flex items-center gap-4 hover:shadow-glass-hover transition-all duration-normal group",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-10 h-10 rounded-card flex items-center justify-center ${action.iconBg}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 20, className: action.color }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2 group-hover:text-txt transition-button flex-1", children: action.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14, className: "text-txt-3 opacity-0 group-hover:opacity-100 transition-all duration-normal" })
            ]
          },
          action.href
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(EmailKPISection, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 20, className: "text-gold" }),
          "Trụ Cột Nội Dung"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: pillars.map((pillar) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `card p-5 border-l-[3px] ${pillar.borderColor}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: `text-md font-semibold ${pillar.color} mb-2`, children: pillar.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-3", children: pillar.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: pillar.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-sm text-txt-2 flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-1 h-1 rounded-full ${pillar.color.replace("text-", "bg-")}` }),
                item
              ] }, item)) })
            ]
          },
          pillar.name
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 20, className: "text-gold" }),
          "Hoạt Động Gần Đây"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card p-4", children: activitiesLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-txt-3" }) }) : !activities?.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 32, className: "mx-auto mb-3 text-txt-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3", children: "Chưa có hoạt động nào" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "Bắt đầu tạo nội dung để xem lịch sử hoạt động" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-3", children: activities.map((activity) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "li",
          {
            className: "flex items-start gap-3 py-2 border-b border-border last:border-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 rounded-full bg-bg-4 flex items-center justify-center mt-0.5 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 12, className: "text-txt-3" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-2 truncate", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt font-medium", children: activity.entity_type ?? "Hệ thống" }),
                  " ",
                  actionLabels[activity.action ?? ""] ?? activity.action
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-0.5", children: activity.created_at ? new Date(activity.created_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                }) : "" })
              ] })
            ]
          },
          activity.id
        )) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 20, className: "text-gold" }),
        "Lịch Tuần Này"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g4", children: [
          { day: "T2", track: "Wealth", color: "bg-gold", textColor: "text-gold" },
          { day: "T4", track: "Wellness", color: "bg-purple", textColor: "text-purple" },
          { day: "T6", track: "Integration", color: "bg-emerald", textColor: "text-emerald" },
          { day: "CN", track: "Deep Dive", color: "bg-blue", textColor: "text-blue" }
        ].map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 rounded-card", style: { background: "rgba(15, 16, 48, 0.55)", border: "1px solid rgba(106, 91, 255, 0.15)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-8 h-8 rounded-badge ${slot.color} bg-opacity-20 flex items-center justify-center`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-bold ${slot.textColor}`, children: slot.day }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-sm font-medium ${slot.textColor}`, children: slot.track }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3", children: "Chưa có nội dung" })
          ] })
        ] }, slot.day)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            href: "/admin/cc/calendar",
            className: "text-xs text-txt-3 hover:text-gold transition-button inline-flex items-center gap-1",
            children: [
              "Xem lịch đầy đủ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 12 })
            ]
          }
        ) })
      ] })
    ] })
  ] });
}
function EmailKPISection() {
  const [kpis, setKpis] = reactExports.useState(null);
  const [topCampaigns, setTopCampaigns] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    loadEmailKPIs();
  }, []);
  async function loadEmailKPIs() {
    try {
      const { getSupabase } = await __vitePreload(async () => { const { getSupabase } = await import('./index-CvPgjxWl.js').then(n => n.dq);return { getSupabase }},true              ?__vite__mapDeps([0,1]):void 0);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [kpiRes, campaignsRes] = await Promise.allSettled([
        supabase.rpc("get_email_dashboard_kpis", { p_user_id: user.id, p_days: 30 }),
        supabase.from("cc_email_campaigns").select("id, name, subject, open_rate, revenue_attributed, sent_at").eq("created_by", user.id).eq("status", "sent").order("sent_at", { ascending: false }).limit(3)
      ]);
      if (kpiRes.status === "fulfilled" && kpiRes.value.data) {
        setKpis(kpiRes.value.data);
      }
      if (campaignsRes.status === "fulfilled" && campaignsRes.value.data) {
        setTopCampaigns(campaignsRes.value.data);
      }
    } catch (err) {
      console.warn("[CCDashboard] Email KPIs error:", err);
    } finally {
      setLoading(false);
    }
  }
  const emailStats = [
    { label: "Campaigns", value: kpis?.total_campaigns ?? 0, icon: Mail, color: "blue" },
    { label: "Đã Gửi", value: kpis?.total_sent ?? 0, icon: Send, color: "gold" },
    { label: "Tỷ Lệ Mở", value: `${kpis?.avg_open_rate ?? 0}%`, icon: MousePointer, color: "purple" },
    { label: "ROI", value: kpis?.total_roi ? `${kpis.total_roi}%` : "—", icon: DollarSign, color: "emerald" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-heading text-xl font-semibold text-txt flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 20, className: "text-gold" }),
        "Hiệu Suất Email (30 ngày)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          href: "/admin/cc/emails",
          className: "text-xs text-txt-3 hover:text-gold transition-button inline-flex items-center gap-1",
          children: [
            "Xem tất cả ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 12 })
          ]
        }
      )
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card p-8 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-txt-3" }) }) : !kpis || kpis.total_campaigns === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 32, className: "mx-auto mb-3 text-txt-3 opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-3", children: "Chưa gửi email campaign nào" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xxs text-txt-3 mt-1", children: "Tạo email từ AI Tạo Nội Dung → Gửi Email để bắt đầu theo dõi hiệu suất" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "g4", children: emailStats.map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardStatCard, { stat }, stat.label)) }),
      topCampaigns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 uppercase tracking-wider mb-3", children: "Top Campaigns Gần Nhất" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: topCampaigns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            href: `/admin/cc/emails/${c.id}`,
            className: "flex items-center gap-3 py-2 px-2 rounded-card hover:bg-bg-3 transition-all group",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-txt-3 w-5", children: [
                i + 1,
                "."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 truncate group-hover:text-txt transition-button", children: c.name || c.subject }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-gold font-medium", children: [
                c.open_rate,
                "% mở"
              ] }),
              c.revenue_attributed > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-emerald font-medium", children: [
                Number(c.revenue_attributed).toLocaleString("vi-VN"),
                "₫"
              ] })
            ]
          },
          c.id
        )) })
      ] })
    ] })
  ] });
}

export { DashboardPage as default };
