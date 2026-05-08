import { o as createLucideIcon, a_ as useNavigate, r as reactExports, a$ as useCalendarEvents, b0 as useScripts, j as jsxRuntimeExports, g as Calendar, J as ChevronLeft, K as ChevronRight, b1 as CalendarDays, t as TriangleAlert, W as Info, ao as Funnel, z as CCSelect, k as LoaderCircle, b2 as Timer, b3 as CircleCheck, d as Sparkles, c as Clock, X, b4 as Link2, H as MessageSquare, af as Trash2, aA as Save } from './index-DNX_Fd1q.js';
import { c as calendarService } from './calendarService-BvIfniq5.js';

/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["path", { d: "M3 10h18", key: "8toen8" }],
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M17 14h-6", key: "bkmgh3" }],
  ["path", { d: "M13 18H7", key: "bb0bb7" }],
  ["path", { d: "M7 14h.01", key: "1qa3f1" }],
  ["path", { d: "M17 18h.01", key: "1bdyru" }]
];
const CalendarRange = createLucideIcon("calendar-range", __iconNode);

const TRACK_COLORS = {
  wealth: { dot: "bg-gold", bg: "bg-gold/10", text: "text-gold", border: "border-gold/30" },
  wellness: { dot: "bg-purple", bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" },
  integration: { dot: "bg-emerald", bg: "bg-emerald/10", text: "text-emerald", border: "border-emerald/30" }
};
const TRACK_LABELS = {
  wealth: "Tài Chính",
  wellness: "Tâm Thức",
  integration: "Tích Hợp"
};
const CONTENT_TYPE_LABELS = {
  latc: "LATC",
  tmt: "TMT",
  short_clip: "Clip Ngắn",
  social_post: "Bài Đăng MXH",
  news: "Tin Tức"
};
const STATUS_LABELS = {
  planned: "Đã lên kế hoạch",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rescheduled: "Đã dời lịch"
};
const PRIORITY_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp"
};
const PUBLISH_STATUS_LABELS = {
  draft: { label: "Nháp", color: "text-txt-3" },
  scheduled: { label: "Đã lên lịch", color: "text-cyan" },
  published: { label: "Đã đăng", color: "text-success" },
  failed: { label: "Thất bại", color: "text-danger" }
};
const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads"
};
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKLY_SCHEDULE = {
  1: { track: "wealth", label: "Wealth" },
  3: { track: "wellness", label: "Wellness" },
  5: { track: "integration", label: "Integration" },
  0: { track: "integration", label: "Deep Dive" }
};
const TARGET_RATIO = { wealth: 30, wellness: 30, integration: 40 };
function formatYM(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatISO(d) {
  return d.toISOString().split("T")[0] ?? "";
}
function isSameDay(a, b) {
  return a === b;
}
function getMonthDays(year, month) {
  const days = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDay = first.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - last.getDate() - startDay + 1));
  }
  return days;
}
function getWeekDays(base) {
  const d = new Date(base);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
  }
  return days;
}
function monthName(month) {
  const names = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12"
  ];
  return names[month] ?? "";
}
function isPastDate(dateStr) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}
const DEFAULT_FORM = {
  title: "",
  content_type: "latc",
  track: "wealth",
  persona: "jennie_mentor",
  priority: "medium",
  scheduled_date: "",
  scheduled_time: "08:00",
  script_id: "",
  description: "",
  platform: "",
  auto_comment_text: "",
  auto_comment_link: "",
  scheduled_publish_time: "",
  publish_status: "draft",
  generation_job_id: ""
};
function CalendarPage() {
  useNavigate();
  const today = formatISO(/* @__PURE__ */ new Date());
  const [viewMode, setViewMode] = reactExports.useState("month");
  const [currentDate, setCurrentDate] = reactExports.useState(/* @__PURE__ */ new Date());
  const [selectedDate, setSelectedDate] = reactExports.useState(null);
  const [showModal, setShowModal] = reactExports.useState(false);
  const [editingEventId, setEditingEventId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState(DEFAULT_FORM);
  const [saving, setSaving] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [filterTrack, setFilterTrack] = reactExports.useState("");
  const [filterType, setFilterType] = reactExports.useState("");
  const [filterStatus, setFilterStatus] = reactExports.useState("");
  const dateRange = reactExports.useMemo(() => {
    if (viewMode === "month") {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m + 2, 0);
      return { start: formatISO(start), end: formatISO(end) };
    }
    const weekDays = getWeekDays(currentDate);
    return { start: formatISO(weekDays[0]), end: formatISO(weekDays[6]) };
  }, [currentDate, viewMode]);
  const { data: events, isLoading, refetch } = useCalendarEvents(dateRange.start, dateRange.end);
  const { data: scriptsData } = useScripts({ pageSize: 100 });
  const scripts = scriptsData?.data ?? [];
  const filteredEvents = reactExports.useMemo(() => {
    if (!events) return [];
    let filtered = events;
    if (filterTrack) filtered = filtered.filter((e) => e.track === filterTrack);
    if (filterType) filtered = filtered.filter((e) => e.content_type === filterType);
    if (filterStatus) filtered = filtered.filter((e) => e.status === filterStatus);
    return filtered;
  }, [events, filterTrack, filterType, filterStatus]);
  const distribution = reactExports.useMemo(() => {
    if (!events) return { wealth: 0, wellness: 0, integration: 0, total: 0 };
    const monthEvents = events.filter((e) => {
      const d = e.scheduled_date;
      return d.startsWith(formatYM(currentDate));
    });
    const dist = { wealth: 0, wellness: 0, integration: 0, total: monthEvents.length };
    for (const e of monthEvents) {
      const t = e.track;
      if (t in dist) dist[t]++;
    }
    return dist;
  }, [events, currentDate]);
  const trackImbalanceAlert = reactExports.useMemo(() => {
    if (distribution.total < 4) return null;
    const pctW = Math.round(distribution.wealth / distribution.total * 100);
    const pctWl = Math.round(distribution.wellness / distribution.total * 100);
    const pctI = Math.round(distribution.integration / distribution.total * 100);
    const offW = Math.abs(pctW - TARGET_RATIO.wealth);
    const offWl = Math.abs(pctWl - TARGET_RATIO.wellness);
    const offI = Math.abs(pctI - TARGET_RATIO.integration);
    if (offW > 15 || offWl > 15 || offI > 15) {
      return `Mất cân bằng track: W=${pctW}% / Wl=${pctWl}% / I=${pctI}% (Mục tiêu: 30/30/40)`;
    }
    return null;
  }, [distribution]);
  const doubleBookingWarning = reactExports.useMemo(() => {
    if (!form.scheduled_date || !form.scheduled_time) return null;
    const existing = filteredEvents.find(
      (e) => e.scheduled_date === form.scheduled_date && e.scheduled_time === form.scheduled_time && e.id !== editingEventId
    );
    return existing ? `Trùng lịch với "${existing.title}" vào ${form.scheduled_time}` : null;
  }, [form.scheduled_date, form.scheduled_time, filteredEvents, editingEventId]);
  const calendarDays = reactExports.useMemo(() => {
    if (viewMode === "month") {
      return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    }
    return getWeekDays(currentDate);
  }, [currentDate, viewMode]);
  const navigatePrev = reactExports.useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 7);
      return nd;
    });
  }, [viewMode]);
  const navigateNext = reactExports.useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 7);
      return nd;
    });
  }, [viewMode]);
  const goToday = reactExports.useCallback(() => setCurrentDate(/* @__PURE__ */ new Date()), []);
  const openCreateModal = reactExports.useCallback((date) => {
    setForm({ ...DEFAULT_FORM, scheduled_date: date });
    setEditingEventId(null);
    setSelectedDate(date);
    setShowModal(true);
  }, []);
  const openEditModal = reactExports.useCallback(
    (event) => {
      setForm({
        title: event.title ?? "",
        content_type: event.content_type ?? "latc",
        track: event.track ?? "wealth",
        persona: event.persona ?? "jennie_mentor",
        priority: event.priority ?? "medium",
        scheduled_date: event.scheduled_date ?? "",
        scheduled_time: event.scheduled_time ?? "08:00",
        script_id: event.script_id ?? "",
        description: event.description ?? "",
        platform: event.platform ?? "",
        auto_comment_text: event.auto_comment_text ?? "",
        auto_comment_link: event.auto_comment_link ?? "",
        scheduled_publish_time: event.scheduled_publish_time ?? "",
        publish_status: event.publish_status ?? "draft",
        generation_job_id: event.generation_job_id ?? ""
      });
      setEditingEventId(event.id);
      setSelectedDate(event.scheduled_date);
      setShowModal(true);
    },
    []
  );
  const closeModal = reactExports.useCallback(() => {
    setShowModal(false);
    setEditingEventId(null);
    setSelectedDate(null);
    setForm(DEFAULT_FORM);
  }, []);
  const handleSave = reactExports.useCallback(async () => {
    if (!form.title.trim() || !form.scheduled_date) return;
    setSaving(true);
    try {
      const extraFields = {
        platform: form.platform || null,
        auto_comment_text: form.auto_comment_text || null,
        auto_comment_link: form.auto_comment_link || null,
        scheduled_publish_time: form.scheduled_publish_time || null,
        publish_status: form.publish_status || "draft"
      };
      if (editingEventId) {
        await calendarService.update(editingEventId, {
          title: form.title,
          content_type: form.content_type,
          track: form.track,
          persona: form.persona,
          priority: form.priority,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          script_id: form.script_id || null,
          description: form.description || null,
          ...extraFields
        });
      } else {
        await calendarService.create({
          title: form.title,
          content_type: form.content_type,
          track: form.track,
          pillar: form.track === "wealth" ? "trading" : form.track === "wellness" ? "spiritual" : "lifestyle",
          persona: form.persona,
          writing_mode: "mode_1_calm",
          priority: form.priority,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          script_id: form.script_id || null,
          description: form.description || null,
          created_by: "current-user",
          ...extraFields
        });
      }
      await refetch();
      closeModal();
    } catch {
    }
    setSaving(false);
  }, [form, editingEventId, refetch, closeModal]);
  const handleDelete = reactExports.useCallback(async () => {
    if (!editingEventId) return;
    setDeleting(true);
    try {
      await calendarService.remove(editingEventId);
      await refetch();
      closeModal();
    } catch {
    }
    setDeleting(false);
  }, [editingEventId, refetch, closeModal]);
  const updateField = reactExports.useCallback((key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);
  const eventsForDay = reactExports.useCallback(
    (dateStr) => filteredEvents.filter((e) => isSameDay(e.scheduled_date, dateStr)),
    [filteredEvents]
  );
  const headerTitle = viewMode === "month" ? `${monthName(currentDate.getMonth())} ${currentDate.getFullYear()}` : (() => {
    const weekDays = getWeekDays(currentDate);
    return `${formatISO(weekDays[0])} -- ${formatISO(weekDays[6])}`;
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 24, className: "text-gold" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-heading text-2xl font-bold text-txt", children: "Lịch Nội Dung" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: goToday, className: "btn btn-gh text-xs", children: "Hôm nay" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: navigatePrev, className: "btn btn-gh p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-center min-w-[180px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "absolute inset-0 opacity-0 cursor-pointer w-full h-full",
              value: currentDate.toISOString().slice(0, 10),
              onChange: (e) => {
                if (e.target.value) {
                  setCurrentDate(new Date(e.target.value));
                }
              },
              onClick: (e) => {
                if ("showPicker" in HTMLInputElement.prototype) {
                  try {
                    e.target.showPicker();
                  } catch (err) {
                  }
                }
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-txt text-center pointer-events-none relative z-10", children: headerTitle })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: navigateNext, className: "btn btn-gh p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-5 w-px bg-border mx-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setViewMode("month"),
            className: `btn text-xs px-3 py-1.5 ${viewMode === "month" ? "btn-p" : "btn-gh"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { size: 14, className: "mr-1" }),
              "Tháng"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setViewMode("week"),
            className: `btn text-xs px-3 py-1.5 ${viewMode === "week" ? "btn-p" : "btn-gh"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarRange, { size: 14, className: "mr-1" }),
              "Tuần"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-txt-2 uppercase tracking-wider", children: "Phân Bổ Track Tháng Này" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-3", children: "Mục tiêu: Wealth 30% / Wellness 30% / Integration 40%" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-3 rounded-full overflow-hidden bg-bg-4", children: distribution.total > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-gold transition-all",
            style: { width: `${distribution.wealth / distribution.total * 100}%` },
            title: `Wealth: ${distribution.wealth}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-purple transition-all",
            style: { width: `${distribution.wellness / distribution.total * 100}%` },
            title: `Wellness: ${distribution.wellness}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "bg-emerald transition-all",
            style: { width: `${distribution.integration / distribution.total * 100}%` },
            title: `Integration: ${distribution.integration}`
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-bg-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-4 mt-2", children: ["wealth", "wellness", "integration"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2.5 h-2.5 rounded-full ${TRACK_COLORS[t].dot}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xxs text-txt-3", children: [
          TRACK_LABELS[t],
          ": ",
          distribution[t],
          distribution.total > 0 && ` (${Math.round(distribution[t] / distribution.total * 100)}%)`
        ] })
      ] }, t)) }),
      trackImbalanceAlert && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 p-2 rounded-card bg-amber/10 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "text-amber shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-amber", children: trackImbalanceAlert })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14, className: "text-txt-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-txt-2", children: "Lịch tuần tham khảo" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3 flex-wrap", children: [
        { day: "T2", track: "wealth", label: "Wealth" },
        { day: "T4", track: "wellness", label: "Wellness" },
        { day: "T6", track: "integration", label: "Integration" },
        { day: "CN", track: "integration", label: "Deep Dive" }
      ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-1.5 px-2 py-1 rounded-badge ${TRACK_COLORS[item.track].bg}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-bold ${TRACK_COLORS[item.track].text}`, children: item.day }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-txt-2", children: item.label })
      ] }, item.day)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { size: 14, className: "text-txt-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        CCSelect,
        {
          value: filterTrack,
          onChange: (e) => setFilterTrack(e.target.value),
          className: "text-xs w-auto",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả Track" }),
            ["wealth", "wellness", "integration"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: TRACK_LABELS[t] }, t))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        CCSelect,
        {
          value: filterType,
          onChange: (e) => setFilterType(e.target.value),
          className: "text-xs w-auto",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả loại" }),
            Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        CCSelect,
        {
          value: filterStatus,
          onChange: (e) => setFilterStatus(e.target.value),
          className: "text-xs w-auto",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tất cả trạng thái" }),
            Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k))
          ]
        }
      )
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 24, className: "animate-spin text-gold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-sm text-txt-2", children: "Đang tải lịch..." })
    ] }),
    !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7 border-b border-border", children: DAY_NAMES.map((name, i) => {
        const scheduleInfo = WEEKLY_SCHEDULE[i === 6 ? 0 : i + 1];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-2 py-2 text-center border-r border-border last:border-r-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-txt-2", children: name }),
          scheduleInfo && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `block text-[10px] ${TRACK_COLORS[scheduleInfo.track].text}`, children: scheduleInfo.label })
        ] }, name);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7", children: calendarDays.map((day, i) => {
        const dateStr = formatISO(day);
        const isToday = dateStr === today;
        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const dayEvents = eventsForDay(dateStr);
        const isPast = isPastDate(dateStr);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            onClick: () => openCreateModal(dateStr),
            className: `
                    min-h-[90px] p-1.5 border-r border-b border-border last:border-r-0 cursor-pointer
                    transition-colors hover:bg-glass-bg
                    ${!isCurrentMonth ? "opacity-40" : ""}
                    ${isToday ? "bg-gold/5 ring-1 ring-gold/30 ring-inset" : ""}
                  `,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `text-xs font-medium ${isToday ? "bg-gold text-bg rounded-full w-6 h-6 flex items-center justify-center" : isPast ? "text-txt-3" : "text-txt-2"}`,
                    children: day.getDate()
                  }
                ),
                dayEvents.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-txt-3", children: dayEvents.length })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
                dayEvents.slice(0, 3).map((evt) => {
                  const track = evt.track;
                  const colors = TRACK_COLORS[track] || TRACK_COLORS.wealth;
                  const pubStatus = evt.publish_status;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        openEditModal(evt);
                      },
                      className: `w-full text-left px-1 py-0.5 rounded text-[10px] truncate border ${colors.bg} ${colors.border} ${colors.text} hover:opacity-80 transition-opacity flex items-center gap-0.5`,
                      title: evt.title,
                      children: [
                        pubStatus === "scheduled" && /* @__PURE__ */ jsxRuntimeExports.jsx(Timer, { size: 8, className: "text-cyan shrink-0" }),
                        pubStatus === "published" && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 8, className: "text-success shrink-0" }),
                        !!evt.generation_job_id && /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 8, className: "text-emerald shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: String(evt.title ?? "") })
                      ]
                    },
                    evt.id
                  );
                }),
                dayEvents.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-txt-3 pl-1", children: [
                  "+",
                  dayEvents.length - 3,
                  " khác"
                ] })
              ] })
            ]
          },
          i
        );
      }) })
    ] }),
    viewMode === "week" && selectedDate && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-bold text-txt mb-3", children: [
        "Sự kiện ngày ",
        selectedDate
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        eventsForDay(selectedDate).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-txt-3", children: "Không có sự kiện nào." }),
        eventsForDay(selectedDate).map((evt) => {
          const track = evt.track;
          const colors = TRACK_COLORS[track] || TRACK_COLORS.wealth;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onClick: () => openEditModal(evt),
              className: `card p-3 border-l-[3px] cursor-pointer hover:bg-glass-bg transition-colors ${colors.border.replace("/30", "")}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-txt", children: evt.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge text-[10px]", children: STATUS_LABELS[evt.status ?? "planned"] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-xxs text-txt-3", children: [
                  !!evt.scheduled_time && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
                    evt.scheduled_time
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: colors.text, children: TRACK_LABELS[track] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: CONTENT_TYPE_LABELS[evt.content_type ?? ""] ?? evt.content_type }),
                  !!evt.platform && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-txt-3", children: PLATFORM_LABELS[String(evt.platform)] ?? String(evt.platform) }),
                  evt.publish_status === "scheduled" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-0.5 text-cyan", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Timer, { size: 10 }),
                    "Đã lên lịch"
                  ] }),
                  evt.publish_status === "published" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-0.5 text-success", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 10 }),
                    "Đã đăng"
                  ] }),
                  !!evt.generation_job_id && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-0.5 text-emerald", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 10 }),
                    "AI"
                  ] })
                ] })
              ]
            },
            evt.id
          );
        })
      ] })
    ] }),
    showModal && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/60", onClick: closeModal }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-lg font-bold text-txt", children: editingEventId ? "Chỉnh Sửa Sự Kiện" : "Tạo Sự Kiện Mới" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: closeModal, className: "btn btn-gh p-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 }) })
        ] }),
        form.scheduled_date && isPastDate(form.scheduled_date) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-2 rounded-card bg-amber/10 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "text-amber shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-amber", children: "Ngày này đã qua. Bạn có chắc muốn lên lịch cho ngày cũ?" })
        ] }),
        doubleBookingWarning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-2 rounded-card bg-danger/10 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "text-danger shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xxs text-danger", children: doubleBookingWarning })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Tiêu đề *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: form.title,
                onChange: (e) => updateField("title", e.target.value),
                placeholder: "VD: Video LATC - 5 Sự Thật Về Tiền Số...",
                className: "fi text-sm w-full"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Loại nội dung" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CCSelect,
                {
                  value: form.content_type,
                  onChange: (e) => updateField("content_type", e.target.value),
                  className: "text-sm w-full",
                  children: Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Track" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CCSelect,
                {
                  value: form.track,
                  onChange: (e) => updateField("track", e.target.value),
                  className: "text-sm w-full",
                  children: Object.entries(TRACK_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Persona" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CCSelect,
                {
                  value: form.persona,
                  onChange: (e) => updateField("persona", e.target.value),
                  className: "text-sm w-full",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_mentor", children: "Mentor" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_provocateur", children: "Provocateur" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_storyteller", children: "Storyteller" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_analyst", children: "Analyst" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_motivator", children: "Motivator" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_educator", children: "Educator" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "jennie_confidante", children: "Confidante" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Mức độ ưu tiên" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CCSelect,
                {
                  value: form.priority,
                  onChange: (e) => updateField("priority", e.target.value),
                  className: "text-sm w-full",
                  children: Object.entries(PRIORITY_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Ngày *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "date",
                  value: form.scheduled_date,
                  onChange: (e) => updateField("scheduled_date", e.target.value),
                  onClick: (e) => {
                    if ("showPicker" in HTMLInputElement.prototype) {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                      }
                    }
                  },
                  className: "fi text-sm w-full"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Giờ" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "time",
                  value: form.scheduled_time,
                  onChange: (e) => updateField("scheduled_time", e.target.value),
                  className: "fi text-sm w-full"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 12, className: "inline mr-1" }),
              "Liên kết kịch bản"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              CCSelect,
              {
                value: form.script_id,
                onChange: (e) => updateField("script_id", e.target.value),
                className: "text-sm w-full",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "-- Không liên kết --" }),
                  scripts.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.title }, s.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Nền tảng đăng bài" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              CCSelect,
              {
                value: form.platform,
                onChange: (e) => updateField("platform", e.target.value),
                className: "text-sm w-full",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "-- Chưa chọn --" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "facebook", children: "Facebook" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "instagram", children: "Instagram" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "threads", children: "Threads" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Timer, { size: 12, className: "inline mr-1" }),
              "Thời gian đăng dự kiến"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "datetime-local",
                value: form.scheduled_publish_time ? form.scheduled_publish_time.slice(0, 16) : "",
                onChange: (e) => updateField("scheduled_publish_time", e.target.value ? new Date(e.target.value).toISOString() : ""),
                className: "fi text-sm w-full"
              }
            )
          ] }),
          form.publish_status && form.publish_status !== "draft" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-txt-3", children: "Trạng thái đăng:" }),
            form.publish_status === "scheduled" && /* @__PURE__ */ jsxRuntimeExports.jsx(Timer, { size: 14, className: "text-cyan" }),
            form.publish_status === "published" && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14, className: "text-success" }),
            form.publish_status === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "text-danger" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-medium ${PUBLISH_STATUS_LABELS[form.publish_status]?.color ?? "text-txt-3"}`, children: PUBLISH_STATUS_LABELS[form.publish_status]?.label ?? form.publish_status })
          ] }),
          form.generation_job_id && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2 rounded-card bg-emerald/10 border border-emerald/20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 14, className: "text-emerald" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-emerald font-medium", children: "Đã có nội dung AI" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 12, className: "inline mr-1" }),
              "Comment tự động (optional)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: form.auto_comment_text,
                onChange: (e) => updateField("auto_comment_text", e.target.value),
                rows: 2,
                placeholder: "Nội dung comment tự động sau khi đăng bài...",
                className: "fi text-xs w-full resize-y"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "url",
                value: form.auto_comment_link,
                onChange: (e) => updateField("auto_comment_link", e.target.value),
                placeholder: "Link đính kèm comment (optional)",
                className: "fi text-xs w-full"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-txt-2 block mb-1", children: "Ghi chú" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: form.description,
                onChange: (e) => updateField("description", e.target.value),
                rows: 3,
                placeholder: "Mô tả thêm...",
                className: "fi text-sm w-full resize-y"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mt-6 pt-4 border-t border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            editingEventId && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleDelete,
                disabled: deleting,
                className: "btn btn-gh text-danger text-xs flex items-center gap-1.5",
                children: [
                  deleting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 }),
                  "Xóa"
                ]
              }
            ),
            editingEventId && !form.generation_job_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: `/admin/cc/ai-gen?event_id=${editingEventId}&content_type=${form.content_type}`,
                className: "btn btn-gh text-emerald text-xs flex items-center gap-1.5 hover:bg-emerald/10 hover:border-emerald/30",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 14 }),
                  "Tạo Nội Dung AI"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: closeModal, className: "btn btn-gh text-xs", children: "Hủy" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleSave,
                disabled: saving || !form.title.trim() || !form.scheduled_date,
                className: "btn btn-p text-xs flex items-center gap-1.5",
                children: [
                  saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 14 }),
                  editingEventId ? "Cập Nhật" : "Tạo Sự Kiện"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}

export { CalendarPage as default };
