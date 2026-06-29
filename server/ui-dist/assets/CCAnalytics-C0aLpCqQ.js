import { r as reactExports, s as supabase, p as React, j as jsxRuntimeExports, q as ChartColumn, t as TriangleAlert, R as RefreshCw, E as Eye, c as Clock, D as DollarSign, d as Sparkles, v as Play, w as Layers, F as FileText, x as ExternalLink, C as CircleCheckBig, k as LoaderCircle, i as Activity, U as Users, g as Calendar, l as TrendingUp, y as Search, z as CCSelect, G as ThumbsUp, H as MessageSquare, J as ChevronLeft, K as ChevronRight, N as Lightbulb, V as Target, X, W as Info, I as Image, Z as Zap, Y as ArrowUp, $ as ArrowDown, a0 as ArrowUpDown, a1 as WandSparkles, A as ArrowRight, a2 as Download, a3 as Monitor, a4 as Globe } from './index-DE6uMbR4.js';
import { y as youtubeService, a as analyticsAI } from './youtubeService-Duqda2Dw.js';
import { M as MousePointerClick } from './mouse-pointer-click-BH9TQ03b.js';
import { Y as Youtube, C as ChartPie } from './youtube-N7uo4hBU.js';
import { T as TrendingDown } from './trending-down-Cyy_Kz4x.js';

const AI_PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude Code (local)" },
  { value: "gemini", label: "Gemini CLI (local)" }
];
const AI_MODEL_OPTIONS = {
  claude: [
    { value: "opus-4-7", label: "Claude Opus 4.7" },
    { value: "sonnet", label: "Claude Sonnet 4.6" },
    { value: "opus", label: "Claude Opus 4.6" }
  ],
  gemini: [
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
  ]
};
const TRACK_LABELS = {
  wealth: "Tài Chính",
  wellness: "Tâm Thức",
  integration: "Tích Hợp"
};
const TRACK_COLORS = {
  wealth: "text-gold",
  wellness: "text-purple",
  integration: "text-emerald"
};
const TRACK_BG = {
  wealth: "bg-gold/10",
  wellness: "bg-purple/10",
  integration: "bg-emerald/10"
};
const RETENTION_TEMPLATE = [100, 92, 85, 78, 72, 65, 60, 55, 50, 46, 42, 38, 35, 32, 30];
const YT_CACHE_KEY = "yt_analytics_cache";
const YT_CACHE_MAX_AGE = 10 * 60 * 1e3;
function saveAnalyticsCache(dateRange, data) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(YT_CACHE_KEY) || "{}");
    cache[dateRange] = { ...data, _ts: Date.now() };
    sessionStorage.setItem(YT_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {
  }
}
function loadAnalyticsCache(dateRange) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(YT_CACHE_KEY) || "{}");
    const entry = cache[dateRange];
    if (entry && Date.now() - entry._ts < YT_CACHE_MAX_AGE) {
      return entry;
    }
  } catch (_) {
  }
  return null;
}
function formatNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}
function formatCurrency(n) {
  return `$${n.toLocaleString("en-US")}`;
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function getTrackHexColor(color) {
  const map = {
    gold: "#D4A843",
    purple: "#A855F7",
    emerald: "#34D399",
    blue: "#5B9CF5",
    cyan: "#22D3EE"
  };
  return map[color] ?? "#D4A843";
}
function getStartDate(range) {
  const now = /* @__PURE__ */ new Date();
  switch (range) {
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "365d":
      now.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      return "2020-01-01";
    default:
      now.setDate(now.getDate() - 90);
  }
  return now.toISOString().split("T")[0];
}
function getPrevStartDate(range, currentStart) {
  const start = new Date(currentStart);
  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "365d":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "all":
      return "2015-01-01";
    default:
      start.setDate(start.getDate() - 90);
  }
  return start.toISOString().split("T")[0];
}
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function parseSeconds(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(":");
  return parseInt(parts[0] || "0") * 60 + parseInt(parts[1] || "0");
}
function mapTrafficSource(apiSource) {
  const map = {
    "YT_SEARCH": "Tìm kiếm YouTube",
    "SUGGESTED": "Đề xuất",
    "BROWSE": "Duyệt trang chủ",
    "EXT_URL": "Bên ngoài",
    "NOTIFICATION": "Thông báo",
    "PLAYLIST": "Playlist",
    "NO_LINK_OTHER": "Khác",
    "SUBSCRIBER": "Subscriber",
    "SHORTS": "Shorts",
    "END_SCREEN": "Màn hình kết thúc"
  };
  return map[apiSource] || apiSource;
}
function getTrafficIcon(sourceName) {
  if (sourceName.includes("Tìm kiếm") || sourceName.includes("SEARCH")) return Search;
  if (sourceName.includes("Đề xuất") || sourceName.includes("SUGGESTED")) return Sparkles;
  if (sourceName.includes("Duyệt") || sourceName.includes("BROWSE")) return Monitor;
  return Globe;
}
function getTrafficColor(index) {
  const colors = ["#D4A843", "#A855F7", "#22D3EE", "#34D399", "#5B9CF5", "#F472B6", "#FB923C", "#A3E635"];
  return colors[index % colors.length];
}
function StatCardMini({
  label,
  value,
  change,
  icon: Icon,
  colorClass,
  scVariant
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `sc ${scVariant}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2 uppercase tracking-wider font-medium", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-card bg-glass-bg/50 ${colorClass}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 18 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-heading font-bold text-txt mb-1", children: value }),
    change !== void 0 && change !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `flex items-center gap-1 text-xs font-medium ${change >= 0 ? "text-success" : "text-danger"}`,
        children: [
          change >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { size: 14 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            change >= 0 ? "+" : "",
            change.toFixed(1),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3 ml-1", children: "so với kỳ trước" })
        ]
      }
    )
  ] });
}
function TabButton({
  active,
  onClick,
  icon: Icon,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick,
      className: `px-4 py-2.5 text-sm font-medium rounded-card transition-all duration-200 inline-flex items-center gap-2 ${active ? "bg-gold/20 text-gold border border-gold/30" : "text-txt-2 hover:text-txt hover:bg-glass-bg/50 border border-transparent"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 16 }),
        children
      ]
    }
  );
}
function DateRangePicker({
  value,
  onChange
}) {
  const options = [
    { value: "7d", label: "7 ngày" },
    { value: "30d", label: "30 ngày" },
    { value: "90d", label: "90 ngày" },
    { value: "365d", label: "1 năm" },
    { value: "all", label: "Tất cả" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 bg-glass-bg/30 rounded-card p-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 14, className: "text-txt-3 ml-2 mr-1" }),
    options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => onChange(opt.value),
        className: `px-3 py-1.5 text-xs rounded-sm transition-all ${value === opt.value ? "bg-bg-4 text-txt font-medium shadow-sm" : "text-txt-3 hover:text-txt-2"}`,
        children: opt.label
      },
      opt.value
    ))
  ] });
}
function StaleBadge() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-badge bg-warning/10 border border-warning/20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "text-warning" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-warning font-medium", children: "Dữ liệu cũ hơn 24 giờ" })
  ] });
}
function EmptyState({ message }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-12 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex p-4 rounded-full bg-glass-bg/50 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 36, className: "text-txt-3" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 font-medium mb-2", children: "Chưa có dữ liệu" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 max-w-md mx-auto", children: message })
  ] });
}
function LoadingOverlay() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-16 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 36, className: "mx-auto mb-4 text-gold animate-spin" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt-2 font-medium", children: "Đang tải dữ liệu phân tích..." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mt-1", children: "Vui lòng chờ trong giây lát" })
  ] });
}
function CTRChart({ data }) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt mb-4", children: "% Xem Theo Thời Gian" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu % xem. Dữ liệu sẽ hiển thị sau khi đồng bộ." })
    ] });
  }
  const maxCtr = Math.max(...data.map((d) => d.ctr));
  const minCtr = Math.min(...data.map((d) => d.ctr));
  const maxViews = Math.max(...data.map((d) => d.views));
  const chartHeight = 200;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "% Xem Theo Thời Gian" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-full bg-gold" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "% Xem" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-full bg-purple/60" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Lượt xem" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", style: { height: chartHeight + 40 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute left-0 top-0 bottom-10 w-10 flex flex-col justify-between text-right pr-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3", children: [
          maxCtr.toFixed(0),
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3", children: [
          ((maxCtr + minCtr) / 2).toFixed(0),
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3", children: [
          minCtr.toFixed(0),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-12 right-0 top-0 bottom-10", children: [0, 1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "absolute left-0 right-0 border-t border-border/30",
          style: { top: `${i / 4 * 100}%` }
        },
        i
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-12 right-0 top-0 bottom-10 flex items-end justify-between gap-1 px-1", children: data.map((d, i) => {
        const ctrRatio = (d.ctr - minCtr + 1) / (maxCtr - minCtr + 2);
        const viewsRatio = d.views / maxViews;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center gap-0.5 group relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute -top-16 left-1/2 -translate-x-1/2 bg-bg-4 border border-border rounded-card px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-lg", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-gold font-medium", children: [
              "% Xem: ",
              d.ctr,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-purple", children: [
              formatNumber(d.views),
              " lượt xem"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full flex gap-0.5", style: { height: chartHeight }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "flex-1 rounded-t-sm bg-gradient-to-t from-gold/40 to-gold/80 transition-all duration-500 self-end group-hover:from-gold/60 group-hover:to-gold",
                style: { height: `${ctrRatio * 100}%` }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "flex-1 rounded-t-sm bg-gradient-to-t from-purple/20 to-purple/50 transition-all duration-500 self-end group-hover:from-purple/40 group-hover:to-purple/70",
                style: { height: `${viewsRatio * 100}%` }
              }
            )
          ] })
        ] }, i);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-12 right-0 bottom-0 flex justify-between px-1", children: data.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-center text-[10px] text-txt-3", children: d.label }, i)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-6 mt-4 pt-4 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 14, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
          "% Xem cao nhất: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-gold", children: [
            maxCtr,
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 14, className: "text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
          "% Xem trung bình: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-txt", children: [
            (data.reduce((s, d) => s + d.ctr, 0) / data.length).toFixed(1),
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, className: "text-purple" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
          "Tổng lượt xem: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-txt", children: formatNumber(data.reduce((s, d) => s + d.views, 0)) })
        ] })
      ] })
    ] })
  ] });
}
function TrafficSourcesDisplay({ trafficSources }) {
  if (!trafficSources || trafficSources.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Nguồn Lưu Lượng" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu nguồn lưu lượng." })
    ] });
  }
  const total = trafficSources.reduce((s, t) => s + t.percentage, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, { size: 18, className: "text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Nguồn Lưu Lượng" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 rounded-full overflow-hidden flex mb-5", children: trafficSources.map((src, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full",
        style: { width: `${total > 0 ? src.percentage / total * 100 : 0}%`, backgroundColor: src.color || getTrafficColor(idx) },
        title: `${src.source}: ${src.percentage}%`
      },
      src.source
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: trafficSources.map((src, idx) => {
      const Icon = src.icon || getTrafficIcon(src.source);
      const color = src.color || getTrafficColor(idx);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "w-8 h-8 rounded-card flex items-center justify-center flex-shrink-0",
            style: { backgroundColor: `${color}20` },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 14, style: { color } })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2 flex-1 group-hover:text-txt transition-colors", children: src.source }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 w-48", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-2 bg-bg-4 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "h-full rounded-full transition-all duration-700",
              style: { width: `${src.percentage}%`, backgroundColor: color }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-txt w-10 text-right", children: [
            src.percentage,
            "%"
          ] })
        ] })
      ] }, src.source);
    }) })
  ] });
}
function RetentionDisplay({ videoId, videos, accessToken }) {
  const [retention, setRetention] = reactExports.useState(RETENTION_TEMPLATE);
  const [title, setTitle] = reactExports.useState("Trung bình toàn kênh");
  const [loadingRetention, setLoadingRetention] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!videoId || !accessToken) {
      setRetention(RETENTION_TEMPLATE);
      setTitle("Trung bình toàn kênh");
      return;
    }
    const video = videos.find((v) => v.id === videoId);
    if (video && video.retention && video.retention.length > 0) {
      setRetention(video.retention);
      setTitle(video.title || videoId);
      return;
    }
    setLoadingRetention(true);
    youtubeService.getRetentionData(accessToken, videoId).then((data) => {
      if (data && data.length > 0) {
        const buckets = 15;
        const retArr = [];
        for (let i = 0; i < buckets; i++) {
          const ratio = i / (buckets - 1);
          const closest = data.reduce(
            (prev, curr) => Math.abs(curr.timeRatio - ratio) < Math.abs(prev.timeRatio - ratio) ? curr : prev
          );
          retArr.push(Math.round((closest.watchRatio || 0) * 100));
        }
        setRetention(retArr);
      } else {
        setRetention(RETENTION_TEMPLATE);
      }
      setTitle(video?.title || videoId);
    }).catch(() => {
      setRetention(RETENTION_TEMPLATE);
      setTitle(video?.title || videoId);
    }).finally(() => setLoadingRetention(false));
  }, [videoId, accessToken, videos]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Đường Cong Giữ Chân" })
      ] }),
      loadingRetention && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "text-gold animate-spin" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-4 truncate", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative h-40 flex items-end gap-0.5", children: retention.map((val, i) => {
      const isDropOff = i > 0 && (retention[i - 1] ?? 0) - val > 5;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex-1 relative group",
          style: { height: "100%" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${isDropOff ? "bg-gradient-to-t from-danger/30 to-danger/60" : "bg-gradient-to-t from-emerald/20 to-emerald/60"}`,
                style: { height: `${val}%` }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-4 border border-border rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt", children: [
              val,
              "%"
            ] }) }),
            isDropOff && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 10, className: "text-danger" }) })
          ]
        },
        i
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: "Bắt đầu" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: "Giữa video" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: "Kết thúc" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 mt-4 pt-3 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-lg font-heading font-bold text-emerald", children: [
          retention[Math.floor(retention.length / 2)] ?? 0,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3", children: "Giữ chân giữa video" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-8 bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-lg font-heading font-bold text-txt", children: [
          retention[retention.length - 1] ?? 0,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3", children: "Giữ chân cuối video" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-8 bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-lg font-heading font-bold ${(retention[3] ?? 0) > 75 ? "text-success" : "text-danger"}`, children: [
          retention[3] ?? 0,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3", children: "Sau 30 giây đầu" })
      ] })
    ] })
  ] });
}
function DemographicsDisplay({ demographics }) {
  if (!demographics || demographics.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Đối Tượng Khán Giả" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu đối tượng khán giả." })
    ] });
  }
  const maxTotal = Math.max(...demographics.map((d) => d.total), 1);
  const totalMale = demographics.reduce((s, d) => s + (d.male || 0), 0);
  const totalFemale = demographics.reduce((s, d) => s + (d.female || 0), 0);
  const grandTotal = totalMale + totalFemale || 1;
  const malePct = Math.round(totalMale / grandTotal * 100);
  const femalePct = 100 - malePct;
  const largestGroup = demographics.reduce((max, d) => d.total > (max?.total || 0) ? d : max, demographics[0]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 18, className: "text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Đối Tượng Khán Giả" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-5 p-3 rounded-card bg-glass-bg/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-cyan", children: [
          malePct,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3", children: "Nam" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-8 bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-purple", children: [
          femalePct,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3", children: "Nữ" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: demographics.map((demo) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-txt font-medium", children: [
          demo.ageGroup,
          " tuổi"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-txt", children: [
          demo.total,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 h-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "rounded-l-sm bg-gradient-to-r from-cyan/40 to-cyan/70 transition-all duration-700",
            style: { width: `${demo.male / maxTotal * 100}%` },
            title: `Nam: ${demo.male}%`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "rounded-r-sm bg-gradient-to-r from-purple/40 to-purple/70 transition-all duration-700",
            style: { width: `${demo.female / maxTotal * 100}%` },
            title: `Nữ: ${demo.female}%`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-bg-4 rounded-r-sm" })
      ] })
    ] }, demo.ageGroup)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-sm bg-cyan/60" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Nam" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-sm bg-purple/60" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Nữ" })
      ] })
    ] }),
    largestGroup && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 p-3 rounded-card bg-gold/5 border border-gold/10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14, className: "text-gold mt-0.5 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-2 leading-relaxed", children: [
        "Nhóm ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-gold", children: [
          largestGroup.ageGroup,
          " tuổi"
        ] }),
        " chiếm tỷ lệ lớn nhất (",
        largestGroup.total,
        "%)."
      ] })
    ] }) })
  ] });
}
function ThumbnailABResults({ thumbnailTests }) {
  if (!thumbnailTests || thumbnailTests.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "A/B Test Thumbnail" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu A/B test thumbnail. Tính năng này cần YouTube Studio API." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 18, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "A/B Test Thumbnail" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge badge-new", children: [
        thumbnailTests.filter((t) => t.status === "running").length,
        " đang chạy"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: thumbnailTests.map((test) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-card bg-glass-bg/30 border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium truncate flex-1", children: test.videoTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `badge ml-3 ${test.status === "running" ? "badge-new" : "badge-gold"}`,
            children: test.status === "running" ? "Đang chạy" : "Hoàn thành"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `p-3 rounded-card border transition-all ${test.winner === "A" ? "border-success/30 bg-success/5" : "border-border bg-glass-bg/20"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt-2", children: "Phiên bản A" }),
                test.winner === "A" && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-2", children: test.variantA.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-lg font-heading font-bold ${test.winner === "A" ? "text-success" : "text-txt"}`, children: [
                  test.variantA.ctr,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: "% Xem" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-txt-3 mt-1", children: [
                formatNumber(test.variantA.impressions),
                " lượt hiển thị"
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `p-3 rounded-card border transition-all ${test.winner === "B" ? "border-success/30 bg-success/5" : "border-border bg-glass-bg/20"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-txt-2", children: "Phiên bản B" }),
                test.winner === "B" && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-2", children: test.variantB.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-lg font-heading font-bold ${test.winner === "B" ? "text-success" : "text-txt"}`, children: [
                  test.variantB.ctr,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: "% Xem" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-txt-3 mt-1", children: [
                formatNumber(test.variantB.impressions),
                " lượt hiển thị"
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pt-3 border-t border-border flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 12, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
          "Chênh lệch % Xem:",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "text-success", children: [
            "+",
            Math.abs(test.variantA.ctr - test.variantB.ctr).toFixed(1),
            "%"
          ] }),
          " ",
          "cho phiên bản ",
          test.winner
        ] })
      ] })
    ] }, test.id)) })
  ] });
}
function OverviewTab({
  dateRange,
  selectedVideoId,
  onSelectVideo,
  ctrTrend,
  trafficSources,
  demographics,
  videos,
  accessToken
}) {
  const dateLabel = dateRange === "7d" ? "7 ngày" : dateRange === "30d" ? "30 ngày" : dateRange === "90d" ? "90 ngày" : dateRange === "365d" ? "1 năm" : "toàn bộ";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CTRChart, { data: ctrTrend }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrafficSourcesDisplay, { trafficSources }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DemographicsDisplay, { demographics })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RetentionDisplay, { videoId: selectedVideoId, videos, accessToken }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 18, className: "text-gold" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-heading text-lg font-semibold text-txt", children: [
              "Top Video (",
              dateLabel,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3", children: [
            videos.length,
            " video"
          ] })
        ] }),
        videos.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu video. Nhấn Đồng bộ dữ liệu để bắt đầu." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: videos.slice(0, 6).map((video, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => onSelectVideo(selectedVideoId === video.id ? null : video.id),
            className: `w-full flex items-start gap-3 p-3 rounded-card transition-all text-left ${selectedVideoId === video.id ? "bg-gold/10 border border-gold/20" : "bg-glass-bg/20 hover:bg-glass-bg/40 border border-transparent"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-heading font-bold text-txt-3 w-6 text-center flex-shrink-0", children: i + 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium truncate", children: video.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mt-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-medium ${TRACK_COLORS[video.track] || "text-txt-3"}`, children: TRACK_LABELS[video.track] || video.track || "N/A" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3 flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 10 }),
                    " ",
                    formatNumber(video.views || 0)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3", children: [
                    "% Xem ",
                    video.ctr || 0,
                    "%"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-success flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 10 }),
                    " ",
                    formatCurrency(video.revenue || 0)
                  ] })
                ] })
              ] })
            ]
          },
          video.id
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3 mt-3 text-center", children: "Nhấn vào video để xem đường cong giữ chân chi tiết" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbnailABResults, { thumbnailTests: [] })
  ] });
}
function ByVideoTab({ videos }) {
  const [sortBy, setSortBy] = reactExports.useState("views");
  const [sortOrder, setSortOrder] = reactExports.useState("desc");
  const [page, setPage] = reactExports.useState(1);
  const [filterTrack, setFilterTrack] = reactExports.useState("all");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const perPage = 8;
  const handleSort = reactExports.useCallback((key) => {
    if (sortBy === key) {
      setSortOrder((o) => o === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);
  const filteredAndSorted = reactExports.useMemo(() => {
    let list = [...videos];
    if (filterTrack !== "all") {
      list = list.filter((v) => v.track === filterTrack);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => (v.title || "").toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    });
    return list;
  }, [videos, sortBy, sortOrder, filterTrack, searchQuery]);
  const totalPages = Math.ceil(filteredAndSorted.length / perPage);
  const paginatedVideos = filteredAndSorted.slice((page - 1) * perPage, page * perPage);
  const totalViews = filteredAndSorted.reduce((s, v) => s + (v.views || 0), 0);
  const totalRevenue = filteredAndSorted.reduce((s, v) => s + (v.revenue || 0), 0);
  const avgCtr = filteredAndSorted.length > 0 ? filteredAndSorted.reduce((s, v) => s + (v.ctr || 0), 0) / filteredAndSorted.length : 0;
  function SortHeader({
    label,
    sortKey,
    align = "left"
  }) {
    const isActive = sortBy === sortKey;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "th",
      {
        className: `cursor-pointer select-none hover:text-txt transition-colors ${align === "right" ? "text-right" : "text-left"}`,
        onClick: () => handleSort(sortKey),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
          label,
          isActive ? sortOrder === "asc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "w-3 h-3 text-gold" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "w-3 h-3 text-gold" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { className: "w-3 h-3 opacity-40" })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt", children: "Hiệu Suất Theo Video" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-txt-3" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "Tìm video...",
                value: searchQuery,
                onChange: (e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                },
                className: "fi pl-9 !w-48 text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            CCSelect,
            {
              value: filterTrack,
              onChange: (e) => {
                setFilterTrack(e.target.value);
                setPage(1);
              },
              className: "text-xs !w-36",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "Tất cả track" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wealth", children: "Tài Chính" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wellness", children: "Tâm Thức" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "integration", children: "Tích Hợp" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-badge bg-glass-bg/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 12, className: "text-gold" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
            formatNumber(totalViews),
            " lượt xem"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-badge bg-glass-bg/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointerClick, { size: 12, className: "text-purple" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
            "% Xem TB: ",
            avgCtr.toFixed(1),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-badge bg-glass-bg/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 12, className: "text-emerald" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
            formatCurrency(totalRevenue),
            " doanh thu"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-badge bg-glass-bg/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12, className: "text-txt-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-2", children: [
            filteredAndSorted.length,
            " video"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass-card p-6", children: filteredAndSorted.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Không tìm thấy video nào phù hợp với bộ lọc hiện tại." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "dt", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8 text-center", children: "#" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Tiêu Đề", sortKey: "title" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Track", sortKey: "track" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Lượt Xem", sortKey: "views", align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "% Xem", sortKey: "ctr", align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Thời Gian TB", sortKey: "avgDurationSec", align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Doanh Thu", sortKey: "revenue", align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SortHeader, { label: "Ngày Đăng", sortKey: "publishedAt", align: "right" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: paginatedVideos.map((video, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "cursor-pointer group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: (page - 1) * perPage + idx + 1 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 max-w-sm", children: [
            video.thumbnailUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: video.thumbnailUrl,
                alt: "",
                className: "w-16 h-9 rounded object-cover flex-shrink-0",
                loading: "lazy"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium truncate group-hover:text-gold transition-colors", children: video.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3 flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbsUp, { size: 9 }),
                  " ",
                  formatNumber(video.likes || 0)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3 flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 9 }),
                  " ",
                  formatNumber(video.comments || 0)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3 flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 9 }),
                  " +",
                  video.subscribers || 0
                ] })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: `inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-badge ${TRACK_BG[video.track] || "bg-glass-bg/30"} ${TRACK_COLORS[video.track] || "text-txt-3"}`,
              children: TRACK_LABELS[video.track] || video.track || "N/A"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt font-medium", children: formatNumber(video.views || 0) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: `text-sm font-semibold ${(video.ctr || 0) >= 10 ? "text-success" : (video.ctr || 0) >= 7 ? "text-txt" : "text-danger"}`,
                children: [
                  video.ctr || 0,
                  "%"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-1 bg-bg-4 rounded-full overflow-hidden mt-1 ml-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `h-full rounded-full ${(video.ctr || 0) >= 10 ? "bg-success" : (video.ctr || 0) >= 7 ? "bg-gold" : "bg-danger"}`,
                style: { width: `${Math.min((video.ctr || 0) * 7, 100)}%` }
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2", children: video.avgDuration || formatDuration(video.avgDurationSec || 0) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-success font-medium", children: formatCurrency(video.revenue || 0) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-3", children: formatDate(video.publishedAt) }) })
        ] }, video.id)) })
      ] }) }),
      totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mt-4 pt-4 border-t border-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3", children: [
          "Trang ",
          page,
          " / ",
          totalPages,
          " — Hiển thị ",
          paginatedVideos.length,
          " / ",
          filteredAndSorted.length,
          " video"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              disabled: page === 1,
              className: "p-1.5 rounded-card text-txt-2 hover:text-txt hover:bg-glass-bg/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 16 })
            }
          ),
          Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setPage(p),
              className: `w-7 h-7 rounded-card text-xs font-medium transition-all ${p === page ? "bg-gold/20 text-gold border border-gold/30" : "text-txt-3 hover:text-txt hover:bg-glass-bg/50"}`,
              children: p
            },
            p
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
              disabled: page === totalPages,
              className: "p-1.5 rounded-card text-txt-2 hover:text-txt hover:bg-glass-bg/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16 })
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
function ByTrackTab({ trackMetrics }) {
  if (!trackMetrics || trackMetrics.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có dữ liệu track. Dữ liệu sẽ hiển thị sau khi đồng bộ video." }) });
  }
  const totalViews = trackMetrics.reduce((s, t) => s + (t.totalViews || 0), 0);
  const totalRevenue = trackMetrics.reduce((s, t) => s + (t.revenue || 0), 0);
  const trackMap = {};
  for (const tm of trackMetrics) {
    trackMap[tm.track] = tm;
  }
  const wealthTm = trackMap["wealth"] || { totalViews: 0, avgCtr: 0, avgDuration: "0:00", subscribersGained: 0, revenue: 0};
  const wellnessTm = trackMap["wellness"] || { totalViews: 0, avgCtr: 0, avgDuration: "0:00", subscribersGained: 0, revenue: 0};
  const integrationTm = trackMap["integration"] || { totalViews: 0, avgCtr: 0, avgDuration: "0:00", subscribersGained: 0, revenue: 0};
  const bestTrack = trackMetrics.reduce((best, t) => (t.avgCtr || 0) > (best.avgCtr || 0) ? t : best, trackMetrics[0]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: trackMetrics.map((tm) => {
      const colorClassMap = {
        gold: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/20", hex: "#D4A843" },
        purple: { text: "text-purple", bg: "bg-purple/10", border: "border-purple/20", hex: "#A855F7" },
        emerald: { text: "text-emerald", bg: "bg-emerald/10", border: "border-emerald/20", hex: "#34D399" }
      };
      const colors = colorClassMap[tm.color] ?? colorClassMap["gold"];
      const viewShare = totalViews > 0 ? (tm.totalViews / totalViews * 100).toFixed(1) : "0.0";
      const revenueShare = totalRevenue > 0 ? (tm.revenue / totalRevenue * 100).toFixed(1) : "0.0";
      const engagement = tm.videoCount > 0 ? (tm.totalViews / tm.videoCount / 1e4 || 0).toFixed(1) : "0.0";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `glass-card p-6 border ${colors.border}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2.5 rounded-card ${colors.bg}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 20, className: colors.text }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: `font-heading text-base font-semibold ${colors.text}`, children: tm.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-txt-3", children: [
                  tm.videoCount,
                  " video"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Tổng lượt xem" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-txt", children: formatNumber(tm.totalViews) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "% tổng lượt xem" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-txt", children: [
                  viewShare,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "% Xem TB" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-sm font-semibold ${tm.avgCtr >= 9 ? "text-success" : "text-txt"}`, children: [
                  tm.avgCtr,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Thời gian xem TB" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-txt", children: tm.avgDuration })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Subscribers mới" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-success", children: [
                  "+",
                  formatNumber(tm.subscribersGained)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Doanh thu" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-success", children: formatCurrency(tm.revenue) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "% doanh thu" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-txt", children: [
                  revenueShare,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Engagement" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-txt", children: [
                  engagement,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-1", children: "Video tốt nhất" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium truncate", children: tm.topVideo || "N/A" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-txt-3 mb-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hiệu suất tổng thể" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  engagement,
                  "/10"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 bg-bg-4 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "h-full rounded-full transition-all duration-700",
                  style: {
                    width: `${Math.min(parseFloat(engagement) * 10, 100)}%`,
                    background: `linear-gradient(90deg, ${colors.hex}, ${colors.hex}cc)`
                  }
                }
              ) })
            ] })
          ]
        },
        tm.track
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt mb-4", children: "Phân Bổ Lượt Xem Theo Track" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-6 rounded-full overflow-hidden flex mb-4", children: trackMetrics.map((tm) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full relative group",
          style: {
            width: `${totalViews > 0 ? tm.totalViews / totalViews * 100 : 0}%`,
            backgroundColor: getTrackHexColor(tm.color)
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-bold text-bg", children: [
            totalViews > 0 ? (tm.totalViews / totalViews * 100).toFixed(0) : 0,
            "%"
          ] }) })
        },
        tm.track
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center gap-6", children: trackMetrics.map((tm) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "w-3 h-3 rounded-full",
            style: { backgroundColor: getTrackHexColor(tm.color) }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2", children: tm.label })
      ] }, tm.track)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-lg font-semibold text-txt mb-4", children: "So Sánh Chi Tiết Giữa Các Track" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "dt", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left", children: "Chỉ Số" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right text-gold", children: "Tài Chính" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right text-purple", children: "Tâm Thức" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right text-emerald", children: "Tích Hợp" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-sm text-txt-2", children: "Tổng lượt xem" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: formatNumber(wealthTm.totalViews) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: formatNumber(wellnessTm.totalViews) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: formatNumber(integrationTm.totalViews) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-sm text-txt-2", children: "% Xem TB" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-txt", children: [
              wealthTm.avgCtr || 0,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-txt", children: [
              wellnessTm.avgCtr || 0,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-txt", children: [
              integrationTm.avgCtr || 0,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-sm text-txt-2", children: "Thời gian xem TB" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: wealthTm.avgDuration || "0:00" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: wellnessTm.avgDuration || "0:00" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: integrationTm.avgDuration || "0:00" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-sm text-txt-2", children: "Subscribers mới" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-success", children: [
              "+",
              formatNumber(wealthTm.subscribersGained || 0)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-success", children: [
              "+",
              formatNumber(wellnessTm.subscribersGained || 0)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right text-sm font-medium text-success", children: [
              "+",
              formatNumber(integrationTm.subscribersGained || 0)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-sm text-txt-2", children: "Doanh thu" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-success", children: formatCurrency(wealthTm.revenue || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: formatCurrency(wellnessTm.revenue || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right text-sm font-medium text-txt", children: formatCurrency(integrationTm.revenue || 0) })
          ] })
        ] })
      ] }) }),
      bestTrack && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 p-3 rounded-card bg-gold/5 border border-gold/10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { size: 14, className: "text-gold mt-0.5 flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-2 leading-relaxed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-gold", children: "Khuyến nghị:" }),
          " Track ",
          bestTrack.label,
          " dẫn đầu về % Xem (",
          bestTrack.avgCtr,
          "%). Xem xét tăng sản lượng nội dung cho track này."
        ] })
      ] }) })
    ] })
  ] });
}
const AI_INSIGHTS_CACHE_KEY = "cc_ai_insights_cache";
function InsightActions({ type, data }) {
  const btnClass = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium transition-all";
  const primary = `${btnClass} bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20`;
  const secondary = `${btnClass} text-txt-3 hover:text-txt hover:bg-bg-4 border border-border`;
  const goTo = (path, params) => {
    const url = new URL(window.location.origin + path);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.location.href = url.toString();
  };
  switch (type) {
    case "summary":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/ai-gen"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 13 }),
          " Tạo nội dung từ insight"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => {
          navigator.clipboard.writeText(data.content.join("\n"));
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 13 }),
          " Copy tóm tắt"
        ] })
      ] });
    case "top":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/ai-gen", { ref: "top_video" }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 13 }),
          " Tạo script tương tự"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/repurpose"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 13 }),
          " Tái sử dụng nội dung"
        ] })
      ] });
    case "underperform":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/ai-gen", { ref: "improve" }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 13 }),
          " Tạo script cải thiện"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/optim"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 13 }),
          " Tối ưu tiêu đề & CTA"
        ] })
      ] });
    case "action":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/calendar"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 13 }),
          " Tạo lịch hành động"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/ai-gen"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 13 }),
          " Bắt đầu thực hiện"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => {
          navigator.clipboard.writeText(data.content.join("\n"));
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 13 }),
          " Copy kế hoạch"
        ] })
      ] });
    case "gap":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/ai-gen", { ref: "fill_gap" }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 13 }),
          " Tạo nội dung mới"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/calendar"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 13 }),
          " Lên lịch đăng"
        ] })
      ] });
    case "title":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/optim"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 13 }),
          " Tối ưu tiêu đề"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/ai-gen", { ref: "titles" }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 13 }),
          " Tạo tiêu đề mới"
        ] })
      ] });
    case "revenue":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: primary, onClick: () => goTo("/admin/cc/funnels"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 13 }),
          " Xem phễu chuyển đổi"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: secondary, onClick: () => goTo("/admin/cc/optim"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 13 }),
          " Tối ưu CTA & doanh thu"
        ] })
      ] });
    default:
      return null;
  }
}
function AIAnalysisTab({ stats, channelStats, insights, onReanalyze, onClearInsights, analyzingAI, aiProvider, aiModel, onProviderChange, onModelChange }) {
  const [expandedId, setExpandedId] = reactExports.useState(null);
  const insightCards = reactExports.useMemo(() => {
    if (!insights || insights.length === 0) return [];
    const latest = insights[0];
    const dp = latest.data_points || latest;
    const cards = [];
    if (latest.description || dp.summary) {
      cards.push({
        id: "summary",
        type: "summary",
        icon: ChartColumn,
        color: "text-emerald",
        title: "Tổng Quan Hiệu Suất",
        content: (latest.description || dp.summary || "").split(". ").filter(Boolean).map((s) => s.endsWith(".") ? s : s + ".")
      });
    }
    if (dp.top_performers && dp.top_performers.length > 0) {
      cards.push({
        id: "top",
        type: "top",
        icon: TrendingUp,
        color: "text-gold",
        title: "Video Hiệu Suất Cao",
        content: dp.top_performers.map((tp) => `"${tp.title}" -- ${tp.metric}: ${tp.value}. ${tp.why || ""}`)
      });
    }
    if (dp.underperformers && dp.underperformers.length > 0) {
      cards.push({
        id: "underperform",
        type: "underperform",
        icon: TriangleAlert,
        color: "text-danger",
        title: "Cần Cải Thiện",
        content: dp.underperformers.map((up) => `"${up.title}" -- ${up.issue}. ${up.fix || ""}`)
      });
    }
    if (dp.action_plan && dp.action_plan.length > 0) {
      cards.push({
        id: "action",
        type: "action",
        icon: Target,
        color: "text-cyan",
        title: "Kế Hoạch Hành Động",
        content: dp.action_plan.map((ap) => `[${ap.priority}] ${ap.action} (${ap.deadline})`)
      });
    }
    if (dp.content_gaps) {
      const gapItems = [
        ...dp.content_gaps.missing_tracks || [],
        ...dp.content_gaps.missing_personas || []
      ];
      if (gapItems.length > 0) {
        cards.push({
          id: "gap",
          type: "gap",
          icon: Search,
          color: "text-purple",
          title: "Khoảng Trống Nội Dung",
          content: gapItems
        });
      }
    }
    if (dp.title_insights && dp.title_insights.recommendation) {
      cards.push({
        id: "title",
        type: "title",
        icon: Lightbulb,
        color: "text-gold",
        title: "Phân Tích Tiêu Đề & Thumbnail",
        content: [
          `Công thức tốt nhất: ${dp.title_insights.best_formula}`,
          `Công thức kém nhất: ${dp.title_insights.worst_formula}`,
          `Khuyến nghị: ${dp.title_insights.recommendation}`
        ]
      });
    }
    if (dp.revenue_insights && dp.revenue_insights.optimization) {
      cards.push({
        id: "revenue",
        type: "revenue",
        icon: DollarSign,
        color: "text-emerald",
        title: "Gợi Ý Tối Ưu Doanh Thu",
        content: [
          `RPM trend: ${dp.revenue_insights.rpm_trend}`,
          `Track doanh thu tốt nhất: ${dp.revenue_insights.best_revenue_track}`,
          `Tối ưu: ${dp.revenue_insights.optimization}`
        ]
      });
    }
    return cards;
  }, [insights]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-4 rounded-card bg-purple/10 border border-purple/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 20, className: "text-gold flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-txt font-medium", children: "Phân tích được tạo bởi AI dựa trên dữ liệu YouTube thực" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mt-0.5", children: insights.length > 0 && insights[0].created_at ? `Cập nhật lần cuối: ${new Date(insights[0].created_at).toLocaleString("vi-VN")}` : 'Chưa có phân tích — nhấn "Phân tích lại" để bắt đầu' })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        insights.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onClearInsights,
            className: "btn btn-gh text-xs !px-3 !py-1.5",
            title: "Xóa phân tích",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 }),
              "Xóa"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onReanalyze,
            disabled: analyzingAI,
            className: "btn btn-o text-xs !px-3 !py-1.5",
            children: [
              analyzingAI ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 12 }),
              analyzingAI ? "Đang phân tích..." : "Phân tích lại"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CCSelect,
        {
          label: "AI Provider",
          options: AI_PROVIDER_OPTIONS,
          value: aiProvider,
          onChange: (e) => onProviderChange(e.target.value),
          disabled: analyzingAI
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CCSelect,
        {
          label: aiProvider === "gemini" ? "Gemini Model" : "Claude Model",
          options: AI_MODEL_OPTIONS[aiProvider] ?? [],
          value: aiModel,
          onChange: (e) => onModelChange(e.target.value),
          disabled: analyzingAI
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-2xl font-heading font-bold text-gold", children: [
          stats?.ctr || 0,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3 mt-1", children: "% Xem TB" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-heading font-bold text-purple", children: stats?.avgDuration || "0:00" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3 mt-1", children: "Thời gian xem TB" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-heading font-bold text-emerald", children: formatNumber(channelStats?.subscriberCount || stats?.subscribers || 0) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3 mt-1", children: "Subscribers" }),
        stats?.subscribersGained ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-txt-3", children: [
          "+",
          formatNumber(stats.subscribersGained),
          " trong kỳ"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-heading font-bold text-cyan", children: formatCurrency(stats?.revenue || 0) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-txt-3 mt-1", children: "Doanh thu" }),
        stats?.revenueChange ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-[10px] ${stats.revenueChange >= 0 ? "text-success" : "text-danger"}`, children: [
          stats.revenueChange >= 0 ? "+" : "",
          stats.revenueChange,
          "% so với kỳ trước"
        ] }) : null
      ] })
    ] }),
    insightCards.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { message: "Chưa có phân tích AI. Nhấn 'Phân tích lại' để AI phân tích dữ liệu YouTube của bạn." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: insightCards.map((insight) => {
      const Icon = insight.icon;
      const isExpanded = expandedId === insight.id;
      const isFullWidth = insight.type === "action" || insight.type === "summary";
      const displayItems = isExpanded ? insight.content : insight.content.slice(0, 3);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `glass-card p-5 transition-all duration-300 ${isFullWidth ? "lg:col-span-2" : ""}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-card bg-glass-bg/50 ${insight.color}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 18 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-base font-semibold text-txt flex-1", children: insight.title }),
              insight.content.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => setExpandedId(isExpanded ? null : insight.id),
                  className: "text-xs text-gold hover:text-gold-l transition-colors",
                  children: isExpanded ? "Thu gọn" : `+${insight.content.length - 3} mục`
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2.5", children: displayItems.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${insight.type === "action" ? "bg-cyan" : insight.type === "top" ? "bg-gold" : insight.type === "underperform" ? "bg-danger" : "bg-txt-3"}`
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-txt-2 leading-relaxed", children: item })
            ] }, i)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(InsightActions, { type: insight.type, data: insight })
          ]
        },
        insight.id
      );
    }) })
  ] });
}
function ConnectYouTubeCTA() {
  const [connecting, setConnecting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const handleConnect = reactExports.useCallback(() => {
    const clientId = ("").trim();
    if (!clientId) {
      setError("Chưa cấu hình Google Client ID. Vui lòng thêm VITE_GOOGLE_CLIENT_ID vào .env.local");
      return;
    }
    setConnecting(true);
    setError("");
    const redirectUri = `${window.location.origin}/admin`;
    const scope = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/yt-analytics-monetary.readonly"
    ].join(" ");
    const state = crypto.randomUUID();
    sessionStorage.setItem("yt_oauth_state", state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      state,
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent"
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-[60vh] flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-12 text-center max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex p-5 rounded-full bg-danger/10 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Youtube, { size: 56, className: "text-danger" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-3xl font-semibold text-txt mb-3", children: "Kết Nối YouTube Analytics" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-txt-2 max-w-md mx-auto mb-4 leading-relaxed", children: [
      "Kết nối kênh ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-gold", children: "Jennie Uyên Chu — Thức Tỉnh Tâm Thức" }),
      " để xem phân tích chi tiết về lượt xem, % xem, thời gian xem, doanh thu, và nhiều chỉ số khác."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-4 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Chỉ đọc dữ liệu" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "An toàn & bảo mật" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-txt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 14, className: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hủy bất kỳ lúc nào" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: handleConnect,
        disabled: connecting,
        className: "btn btn-primary inline-flex items-center gap-2 text-base !px-8 !py-3",
        children: connecting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 20, className: "animate-spin" }),
          "Đang kết nối..."
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Youtube, { size: 20 }),
          "Kết Nối Kênh YouTube"
        ] })
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-danger mt-3 bg-danger/10 p-2 rounded-card", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mt-5 leading-relaxed", children: "Chúng tôi sử dụng OAuth 2.0 để kết nối an toàn. Ứng dụng chỉ đọc dữ liệu phân tích, không chỉnh sửa kênh của bạn." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 pt-6 border-t border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mb-4", children: "Sau khi kết nối, bạn sẽ có:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: [
        { icon: Eye, label: "Phân tích lượt xem" },
        { icon: MousePointerClick, label: "Theo dõi % xem" },
        { icon: Activity, label: "Đường cong giữ chân" },
        { icon: DollarSign, label: "Báo cáo doanh thu" },
        { icon: Users, label: "Phân tích đối tượng" },
        { icon: Sparkles, label: "AI phân tích tự động" }
      ].map(({ icon: FIcon, label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2 rounded-card bg-glass-bg/20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FIcon, { size: 14, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-2", children: label })
      ] }, label)) })
    ] })
  ] }) });
}
function AnalyticsPage() {
  const [activeTab, setActiveTab] = reactExports.useState("ai_analysis");
  const [dateRange, setDateRange] = reactExports.useState("90d");
  const [selectedVideoId, setSelectedVideoId] = reactExports.useState(null);
  const [isConnected, setIsConnected] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [accessToken, setAccessToken] = reactExports.useState(null);
  const [tokenExpired, setTokenExpired] = reactExports.useState(false);
  const [channelStats, setChannelStats] = reactExports.useState(null);
  const [videos, setVideos] = reactExports.useState([]);
  const [stats, setStats] = reactExports.useState(null);
  const [syncing, setSyncing] = reactExports.useState(false);
  const [lastSync, setLastSync] = reactExports.useState(null);
  const [insights, setInsights] = reactExports.useState(() => {
    try {
      const cached = localStorage.getItem(AI_INSIGHTS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [trafficSources, setTrafficSources] = reactExports.useState([]);
  const [demographics, setDemographics] = reactExports.useState([]);
  const [ctrTrend, setCtrTrend] = reactExports.useState([]);
  const [analyzingAI, setAnalyzingAI] = reactExports.useState(false);
  const [dataStale, setDataStale] = reactExports.useState(false);
  const [aiProvider, setAiProvider] = reactExports.useState("claude");
  const [aiModel, setAiModel] = reactExports.useState("sonnet");
  reactExports.useEffect(() => {
    if (insights.length > 0) {
      try {
        localStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify(insights));
      } catch {
      }
    }
  }, [insights]);
  const handleClearInsights = reactExports.useCallback(() => {
    setInsights([]);
    localStorage.removeItem(AI_INSIGHTS_CACHE_KEY);
  }, []);
  const clearExpiredToken = reactExports.useCallback(() => {
    localStorage.removeItem("yt_access_token");
    localStorage.removeItem("yt_token_expires_at");
    setAccessToken(null);
    setIsConnected(false);
    setTokenExpired(true);
  }, []);
  const isTokenExpired = reactExports.useCallback(() => {
    const expiresAt = localStorage.getItem("yt_token_expires_at");
    if (!expiresAt) return false;
    return Date.now() >= parseInt(expiresAt, 10);
  }, []);
  const trackMetrics = reactExports.useMemo(() => {
    const tracks = {};
    for (const v of videos) {
      const t = v.track || "integration";
      if (!tracks[t]) {
        tracks[t] = {
          track: t,
          label: TRACK_LABELS[t] || t,
          totalViews: 0,
          totalCtr: 0,
          ctrCount: 0,
          totalDuration: 0,
          durationCount: 0,
          videoCount: 0,
          subscribersGained: 0,
          revenue: 0,
          topVideo: "",
          topViews: 0
        };
      }
      tracks[t].totalViews += v.views || 0;
      tracks[t].totalCtr += v.ctr || 0;
      tracks[t].ctrCount += v.ctr ? 1 : 0;
      tracks[t].totalDuration += v.avgDurationSec || 0;
      tracks[t].durationCount += v.avgDurationSec ? 1 : 0;
      tracks[t].videoCount++;
      tracks[t].subscribersGained += v.subscribers || 0;
      tracks[t].revenue += v.revenue || 0;
      if ((v.views || 0) > tracks[t].topViews) {
        tracks[t].topViews = v.views;
        tracks[t].topVideo = v.title;
      }
    }
    return Object.values(tracks).map((t) => ({
      ...t,
      avgCtr: t.ctrCount > 0 ? parseFloat((t.totalCtr / t.ctrCount).toFixed(1)) : 0,
      avgDuration: t.durationCount > 0 ? formatDuration(t.totalDuration / t.durationCount) : "0:00",
      color: t.track === "wealth" ? "gold" : t.track === "wellness" ? "purple" : "emerald"
    }));
  }, [videos]);
  const callYouTubeOAuth = reactExports.useCallback(async (action, extraBody = {}) => {
    const supabaseUrl = "https://pgfkbcnzqozzkohwbgbk.supabase.co";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch(`${supabaseUrl}/functions/v1/youtube-oauth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action, ...extraBody })
    });
    return res.json();
  }, []);
  const tryRefreshToken = reactExports.useCallback(async () => {
    console.log("[Analytics] Attempting token refresh...");
    const result = await callYouTubeOAuth("refresh");
    if (result?.success && result.access_token) {
      console.log("[Analytics] Token refreshed successfully");
      const expiresAt = Date.now() + (result.expires_in || 3600) * 1e3;
      localStorage.setItem("yt_access_token", result.access_token);
      localStorage.setItem("yt_token_expires_at", String(expiresAt));
      setAccessToken(result.access_token);
      setIsConnected(true);
      setTokenExpired(false);
      return result.access_token;
    }
    console.warn("[Analytics] Token refresh failed:", result?.error);
    return null;
  }, [callYouTubeOAuth]);
  const fetchAllData = reactExports.useCallback(async (token, range) => {
    try {
      const currentRange = range || dateRange;
      try {
        const channel = await youtubeService.getChannelStats(token);
        setChannelStats(channel);
        setTokenExpired(false);
      } catch (err) {
        console.error("[Analytics] Channel stats error:", err);
        if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
          console.warn("[Analytics] Token expired — attempting auto-refresh...");
          const newToken = await tryRefreshToken();
          if (newToken) {
            try {
              const channel = await youtubeService.getChannelStats(newToken);
              setChannelStats(channel);
              token = newToken;
            } catch (retryErr) {
              console.error("[Analytics] Retry after refresh failed:", retryErr);
              clearExpiredToken();
              return;
            }
          } else {
            clearExpiredToken();
            return;
          }
        }
      }
      try {
        const syncedVideos = await youtubeService.getSyncedVideos(50).catch(() => []);
        if (syncedVideos.length > 0) {
          setVideos(syncedVideos.map((v) => ({
            ...v,
            avgDurationSec: v.durationSeconds || 0,
            avgDuration: formatDuration(v.durationSeconds || 0),
            ctr: 0,
            revenue: 0,
            subscribers: 0,
            track: "integration",
            retention: []
          })));
        }
      } catch (_) {
      }
      try {
        const syncTime = await youtubeService.getLastSyncTime().catch(() => null);
        setLastSync(syncTime);
        if (syncTime) {
          const syncDate = new Date(syncTime);
          setDataStale((Date.now() - syncDate.getTime()) / 36e5 > 24);
        }
      } catch (_) {
      }
      const endDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const startDate = getStartDate(currentRange);
      try {
        const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,estimatedRevenue&sort=-views`;
        let analyticsRes = await fetch(analyticsUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (analyticsRes.status === 401 || analyticsRes.status === 403) {
          const newToken = await tryRefreshToken();
          if (newToken) {
            token = newToken;
            analyticsRes = await fetch(analyticsUrl, { headers: { Authorization: `Bearer ${token}` } });
          } else {
            clearExpiredToken();
            return;
          }
        }
        if (!analyticsRes.ok) {
          const errBody = await analyticsRes.text().catch(() => "");
          console.error(`[Analytics] Channel analytics API ${analyticsRes.status}:`, errBody);
        }
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          const row = analyticsData.rows?.[0];
          if (row) {
            const totalViews = row[0] || 0;
            const avgViewDuration = row[2] || 0;
            const avgViewPercentage = row[3] || 0;
            const subscribersGained = row[4] || 0;
            const estimatedRevenue = row[6] || 0;
            setStats({
              views: totalViews,
              viewsChange: 0,
              ctr: parseFloat(avgViewPercentage.toFixed(1)),
              // Use avg view % as engagement proxy
              ctrChange: 0,
              avgDuration: formatDuration(avgViewDuration),
              avgDurationChange: 0,
              revenue: Math.round(estimatedRevenue),
              revenueChange: 0,
              subscribers: 0,
              subscribersGained,
              subscribersChange: 0
            });
          }
        }
      } catch (err) {
        console.error("[Analytics] Channel analytics error:", err);
      }
      try {
        const trafficUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views&dimensions=insightTrafficSourceType&sort=-views&maxResults=10`;
        const trafficRes = await fetch(trafficUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!trafficRes.ok) {
          const errBody = await trafficRes.text().catch(() => "");
          console.error(`[Analytics] Traffic API ${trafficRes.status}:`, errBody);
        }
        if (trafficRes.ok) {
          const trafficData = await trafficRes.json();
          const totalTrafficViews = (trafficData.rows || []).reduce((sum, r) => sum + r[1], 0);
          setTrafficSources((trafficData.rows || []).map((r, idx) => ({
            source: mapTrafficSource(r[0]),
            percentage: totalTrafficViews > 0 ? Math.round(r[1] / totalTrafficViews * 100) : 0,
            views: r[1],
            color: getTrafficColor(idx)
          })));
        }
      } catch (err) {
        console.error("[Analytics] Traffic sources error:", err);
      }
      try {
        const demoUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=viewerPercentage&dimensions=ageGroup,gender&sort=ageGroup`;
        const demoRes = await fetch(demoUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!demoRes.ok) {
          console.error(`[Analytics] Demographics API ${demoRes.status}:`, await demoRes.text().catch(() => ""));
        } else {
          const demoData = await demoRes.json();
          console.log("[Analytics] Demographics data:", demoData.rows?.length, "rows");
          const ageMap = {};
          for (const row of demoData.rows || []) {
            const [age, gender, pct] = row;
            if (!ageMap[age]) ageMap[age] = { ageGroup: age, male: 0, female: 0, total: 0 };
            if (gender === "male") ageMap[age].male = Math.round(pct);
            else ageMap[age].female = Math.round(pct);
            ageMap[age].total = ageMap[age].male + ageMap[age].female;
          }
          setDemographics(Object.values(ageMap));
        }
      } catch (err) {
        console.error("[Analytics] Demographics error:", err);
      }
      try {
        const trendUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,averageViewPercentage&dimensions=month&sort=month`;
        const trendRes = await fetch(trendUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!trendRes.ok) {
          console.error(`[Analytics] CTR trend API ${trendRes.status}:`, await trendRes.text().catch(() => ""));
        }
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          console.log("[Analytics] CTR trend data:", trendData.rows?.length, "rows");
          setCtrTrend((trendData.rows || []).map((r) => ({
            label: `T${parseInt(r[0].split("-")[1])}`,
            views: r[1],
            ctr: parseFloat((r[2] || 0).toFixed(1))
          })));
        }
      } catch (err) {
        console.error("[Analytics] CTR trend error:", err);
      }
      try {
        const videoAnalyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,estimatedRevenue,subscribersGained,likes,comments&dimensions=video&sort=-views&maxResults=50`;
        const videoAnalyticsRes = await fetch(videoAnalyticsUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!videoAnalyticsRes.ok) {
          const errBody = await videoAnalyticsRes.text().catch(() => "");
          console.error(`[Analytics] Video analytics API ${videoAnalyticsRes.status}:`, errBody);
        }
        if (videoAnalyticsRes.ok) {
          const videoAnalyticsData = await videoAnalyticsRes.json();
          const videoRows = videoAnalyticsData.rows || [];
          if (videoRows.length > 0) {
            const videoIds = videoRows.map((r) => r[0]);
            let detailMap = {};
            try {
              const videoDetails = await youtubeService.getVideoPerformance(token, videoIds);
              detailMap = Object.fromEntries(videoDetails.map((v) => [v.id, v]));
              await youtubeService.syncToSupabase(videoDetails).catch(() => {
              });
            } catch (detailErr) {
              console.error("[Analytics] Video details error:", detailErr);
            }
            const enrichedVideos = videoRows.map((r) => {
              const detail = detailMap[r[0]] || {};
              return {
                id: r[0],
                title: detail.title || r[0],
                publishedAt: detail.publishedAt || "",
                thumbnailUrl: detail.thumbnailUrl || "",
                views: detail.views || r[1] || 0,
                // lifetime total
                likes: detail.likes || r[7] || 0,
                // lifetime total
                comments: detail.comments || r[8] || 0,
                // lifetime total
                // Period-specific metrics from Analytics API v2
                periodViews: r[1] || 0,
                avgDurationSec: r[3],
                avgDuration: formatDuration(r[3]),
                ctr: parseFloat((r[4] || 0).toFixed(1)),
                // averageViewPercentage (period)
                revenue: parseFloat(r[5]?.toFixed(2) || "0"),
                subscribers: r[6] || 0,
                periodLikes: r[7] || 0,
                periodComments: r[8] || 0,
                durationSeconds: detail.durationSeconds || 0,
                track: "integration",
                // Default, can be enriched from cc_yt_videos
                retention: []
              };
            });
            setVideos(enrichedVideos);
          }
        }
      } catch (err) {
        console.error("[Analytics] Video analytics error:", err);
      }
      try {
        const prevStartDate = getPrevStartDate(currentRange, startDate);
        const prevEndDate = startDate;
        const prevAnalyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${prevStartDate}&endDate=${prevEndDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,estimatedRevenue`;
        const prevRes = await fetch(prevAnalyticsUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (prevRes.ok) {
          const prevData = await prevRes.json();
          const prevRow = prevData.rows?.[0];
          if (prevRow) {
            setStats((prev) => {
              if (!prev) return prev;
              const calcChange = (current, previous) => previous > 0 ? parseFloat(((current - previous) / previous * 100).toFixed(1)) : 0;
              return {
                ...prev,
                viewsChange: calcChange(prev.views, prevRow[0]),
                ctrChange: calcChange(prev.ctr, prevRow[3] || 0),
                avgDurationChange: calcChange(parseSeconds(prev.avgDuration), prevRow[2]),
                revenueChange: calcChange(prev.revenue, prevRow[6])
              };
            });
          }
        }
      } catch (err) {
        console.error("[Analytics] Prev period comparison error:", err);
      }
      try {
        const insightHistory = await analyticsAI.getInsightHistory(5);
        if (insightHistory && insightHistory.length > 0) {
          setInsights(insightHistory);
        }
      } catch (err) {
        console.error("[Analytics] Insights error:", err);
      }
    } catch (err) {
      console.error("[Analytics] Fetch error:", err);
    }
  }, [dateRange, clearExpiredToken, tryRefreshToken]);
  reactExports.useEffect(() => {
    if (!isConnected || !channelStats) return;
    saveAnalyticsCache(dateRange, {
      channelStats,
      videos,
      stats,
      trafficSources,
      demographics,
      ctrTrend,
      insights,
      lastSync
    });
  }, [isConnected, dateRange, channelStats, videos, stats, trafficSources, demographics, ctrTrend, insights, lastSync]);
  const restoreCache = reactExports.useCallback((range) => {
    const cached = loadAnalyticsCache(range || dateRange);
    if (!cached) return false;
    console.log("[Analytics] Restoring cached data (age:", Math.round((Date.now() - cached._ts) / 1e3), "s)");
    if (cached.channelStats) setChannelStats(cached.channelStats);
    if (cached.videos?.length) setVideos(cached.videos);
    if (cached.stats) setStats(cached.stats);
    if (cached.trafficSources?.length) setTrafficSources(cached.trafficSources);
    if (cached.demographics?.length) setDemographics(cached.demographics);
    if (cached.ctrTrend?.length) setCtrTrend(cached.ctrTrend);
    if (cached.insights?.length) setInsights(cached.insights);
    if (cached.lastSync) setLastSync(cached.lastSync);
    return true;
  }, [dateRange]);
  reactExports.useEffect(() => {
    async function init() {
      try {
        if (!supabase) {
          console.error("[Analytics] Main Supabase not initialized");
          setLoading(false);
          return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get("code");
        const returnedState = urlParams.get("state");
        const savedState = sessionStorage.getItem("yt_oauth_state");
        if (authCode) {
          window.history.replaceState(null, "", window.location.pathname);
          sessionStorage.removeItem("yt_oauth_state");
          if (!savedState || returnedState === savedState) {
            console.log("[Analytics] Authorization code received, exchanging...");
            const redirectUri = `${window.location.origin}/admin`;
            const result = await callYouTubeOAuth("exchange", { code: authCode, redirect_uri: redirectUri });
            if (result?.success && result.access_token) {
              const expiresAt = Date.now() + (result.expires_in || 3600) * 1e3;
              localStorage.setItem("yt_access_token", result.access_token);
              localStorage.setItem("yt_token_expires_at", String(expiresAt));
              setAccessToken(result.access_token);
              setIsConnected(true);
              setTokenExpired(false);
              console.log(`[Analytics] Token received (expires in ${result.expires_in}s, refresh: ${result.has_refresh_token})`);
              await fetchAllData(result.access_token);
              setLoading(false);
              return;
            } else {
              console.error("[Analytics] Code exchange failed:", result?.error);
            }
          }
        }
        const stashedHash = sessionStorage.getItem("yt_oauth_token");
        if (stashedHash) {
          const params = new URLSearchParams(stashedHash);
          const oauthToken = params.get("access_token");
          sessionStorage.removeItem("yt_oauth_token");
          sessionStorage.removeItem("yt_oauth_state");
          if (oauthToken) {
            const expiresIn = parseInt(params.get("expires_in") || "3600", 10);
            localStorage.setItem("yt_access_token", oauthToken);
            localStorage.setItem("yt_token_expires_at", String(Date.now() + expiresIn * 1e3));
            setAccessToken(oauthToken);
            setIsConnected(true);
            setTokenExpired(false);
            await fetchAllData(oauthToken);
            setLoading(false);
            return;
          }
        }
        let token = localStorage.getItem("yt_access_token");
        if (!token) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from("profiles").select("youtube_access_token").eq("id", user.id).single();
            token = data?.youtube_access_token;
          }
        }
        if (token) {
          if (isTokenExpired()) {
            console.warn("[Analytics] Stored token expired — trying refresh...");
            const hadCache2 = restoreCache();
            if (hadCache2) {
              setIsConnected(true);
              setLoading(false);
            }
            const newToken = await tryRefreshToken();
            if (newToken) {
              await fetchAllData(newToken);
              setLoading(false);
              return;
            }
            localStorage.removeItem("yt_access_token");
            localStorage.removeItem("yt_token_expires_at");
            setTokenExpired(true);
            setLoading(false);
            return;
          }
          setAccessToken(token);
          setIsConnected(true);
          const hadCache = restoreCache();
          if (hadCache) {
            setLoading(false);
            fetchAllData(token).catch(console.error);
            return;
          }
          await fetchAllData(token);
        }
      } catch (err) {
        console.error("[Analytics] Init error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);
  const initialMount = React.useRef(true);
  reactExports.useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (accessToken) {
      restoreCache(dateRange);
      fetchAllData(accessToken, dateRange);
    }
  }, [dateRange, accessToken]);
  const handleSync = reactExports.useCallback(async () => {
    if (!accessToken) return;
    setSyncing(true);
    try {
      await fetchAllData(accessToken);
      setLastSync((/* @__PURE__ */ new Date()).toISOString());
      setDataStale(false);
    } catch (err) {
      console.error("[Analytics] Sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [accessToken, fetchAllData]);
  const handleReanalyze = reactExports.useCallback(async () => {
    setAnalyzingAI(true);
    try {
      const endDate = /* @__PURE__ */ new Date();
      const startDate = /* @__PURE__ */ new Date();
      startDate.setDate(startDate.getDate() - 90);
      const videoData = videos.map((v) => ({
        youtube_id: v.id,
        title: v.title,
        content_type: v.contentType || "latc",
        track: v.track || "integration",
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0,
        ctr: v.ctr || 0,
        avg_view_duration_sec: v.avgDurationSec || 0,
        published_at: v.publishedAt || "",
        last_synced_at: (/* @__PURE__ */ new Date()).toISOString(),
        // Period-specific metrics (for date range comparison)
        period_views: v.periodViews || 0,
        period_likes: v.periodLikes || 0,
        period_comments: v.periodComments || 0,
        revenue_in_period: v.revenue || 0,
        subscribers_gained_in_period: v.subscribers || 0
      }));
      const result = await analyticsAI.generateWeeklyInsights(startDate, endDate, videoData, {
        provider: aiProvider,
        model: aiModel
      });
      if (result) {
        setInsights((prev) => [result, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      console.error("[Analytics] AI analysis error:", err);
    } finally {
      setAnalyzingAI(false);
    }
  }, [videos, aiProvider, aiModel]);
  if (!loading && (!isConnected || tokenExpired)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2.5 rounded-card bg-emerald/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 24, className: "text-emerald" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-2xl font-semibold text-txt", children: "Phân Tích YouTube" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mt-0.5", children: "Jennie Uyên Chu — Thức Tỉnh Tâm Thức" })
        ] })
      ] }),
      tokenExpired && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-4 rounded-card bg-warning/10 border border-warning/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 18, className: "text-warning flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-warning font-medium", children: "Phiên YouTube đã hết hạn" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3 mt-0.5", children: "Token truy cập YouTube chỉ có hiệu lực ~1 giờ. Vui lòng kết nối lại để xem dữ liệu phân tích." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectYouTubeCTA, {})
    ] });
  }
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2.5 rounded-card bg-emerald/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 24, className: "text-emerald" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-2xl font-semibold text-txt", children: "Phân Tích YouTube" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingOverlay, {})
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2.5 rounded-card bg-emerald/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 24, className: "text-emerald" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-2xl font-semibold text-txt", children: "Phân Tích YouTube" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3 mt-0.5 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-success animate-pulse" }),
            channelStats?.title || "Jennie Uyên Chu — Thức Tỉnh Tâm Thức",
            " • ",
            formatNumber(channelStats?.subscriberCount || 0),
            " subscribers • Cập nhật: ",
            lastSync ? new Date(lastSync).toLocaleString("vi-VN") : "Chưa đồng bộ"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
        dataStale && /* @__PURE__ */ jsxRuntimeExports.jsx(StaleBadge, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DateRangePicker, { value: dateRange, onChange: setDateRange }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleSync,
            disabled: syncing,
            className: "btn btn-o inline-flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 16, className: syncing ? "animate-spin" : "" }),
              syncing ? "Đang đồng bộ..." : "Đồng bộ dữ liệu"
            ]
          }
        )
      ] })
    ] }),
    syncing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 rounded-full overflow-hidden bg-glass-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-to-r from-gold via-purple to-emerald animate-pulse rounded-full", style: { width: "60%" } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "g4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatCardMini,
        {
          label: "Lượt Xem",
          value: formatNumber(stats?.views || 0),
          change: stats?.viewsChange ?? null,
          icon: Eye,
          colorClass: "text-gold",
          scVariant: "gd"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatCardMini,
        {
          label: "% XEM TRUNG BÌNH",
          value: `${stats?.ctr || 0}%`,
          change: stats?.ctrChange ?? null,
          icon: MousePointerClick,
          colorClass: "text-purple",
          scVariant: "pu"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatCardMini,
        {
          label: "Thời Gian Xem TB",
          value: stats?.avgDuration || "0:00",
          change: stats?.avgDurationChange ?? null,
          icon: Clock,
          colorClass: "text-cyan",
          scVariant: "bl"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatCardMini,
        {
          label: "Doanh Thu",
          value: formatCurrency(stats?.revenue || 0),
          change: stats?.revenueChange ?? null,
          icon: DollarSign,
          colorClass: "text-emerald",
          scVariant: "em"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap border-b border-border pb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TabButton,
        {
          active: activeTab === "ai_analysis",
          onClick: () => setActiveTab("ai_analysis"),
          icon: Sparkles,
          children: "AI Phân Tích"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TabButton,
        {
          active: activeTab === "overview",
          onClick: () => setActiveTab("overview"),
          icon: ChartColumn,
          children: "Tổng Quan"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TabButton,
        {
          active: activeTab === "by_video",
          onClick: () => setActiveTab("by_video"),
          icon: Play,
          children: "Theo Video"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TabButton,
        {
          active: activeTab === "by_track",
          onClick: () => setActiveTab("by_track"),
          icon: Layers,
          children: "Theo Track"
        }
      )
    ] }),
    activeTab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      OverviewTab,
      {
        dateRange,
        selectedVideoId,
        onSelectVideo: setSelectedVideoId,
        ctrTrend,
        trafficSources,
        demographics,
        videos,
        accessToken
      }
    ),
    activeTab === "by_video" && /* @__PURE__ */ jsxRuntimeExports.jsx(ByVideoTab, { videos }),
    activeTab === "by_track" && /* @__PURE__ */ jsxRuntimeExports.jsx(ByTrackTab, { trackMetrics }),
    activeTab === "ai_analysis" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AIAnalysisTab,
      {
        stats,
        channelStats,
        insights,
        onReanalyze: handleReanalyze,
        onClearInsights: handleClearInsights,
        analyzingAI,
        aiProvider,
        aiModel,
        onProviderChange: (p) => {
          setAiProvider(p);
          const models = AI_MODEL_OPTIONS[p] ?? [];
          setAiModel(models[0]?.value ?? "");
        },
        onModelChange: setAiModel
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-4 rounded-card bg-glass-bg/20 border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14, className: "text-txt-3 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-txt-3", children: [
        "Dữ liệu được lấy trực tiếp từ YouTube Analytics API. Kênh: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-txt-2", children: channelStats?.title || "Jennie Uyên Chu — Thức Tỉnh Tâm Thức" }),
        ".",
        lastSync ? ` Đồng bộ lần cuối: ${new Date(lastSync).toLocaleString("vi-VN")}.` : " Chưa đồng bộ."
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "#", className: "text-gold hover:text-gold-l text-xs inline-flex items-center gap-1 whitespace-nowrap transition-colors", children: [
        "Hướng dẫn kết nối ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
      ] })
    ] })
  ] });
}

export { AnalyticsPage as default };
