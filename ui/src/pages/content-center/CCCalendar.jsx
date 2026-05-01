import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  Clock,
  Filter,
  Link2,
  CalendarDays,
  CalendarRange,
  Info,
  Sparkles,
  Timer,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { calendarService } from '@gem/services';
import { useCalendarEvents, useScripts } from '@gem/hooks/useQueryHooks';
import CCSelect from './CCSelect';
import { Link, useNavigate } from 'react-router-dom';
// ============================================================================
// Constants
// ============================================================================

const TRACK_COLORS = {
  wealth: { dot: 'bg-gold', bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/30' },
  wellness: { dot: 'bg-purple', bg: 'bg-purple/10', text: 'text-purple', border: 'border-purple/30' },
  integration: { dot: 'bg-emerald', bg: 'bg-emerald/10', text: 'text-emerald', border: 'border-emerald/30' },
};

const TRACK_LABELS = {
  wealth: 'Tài Chính',
  wellness: 'Tâm Thức',
  integration: 'Tích Hợp',
};

const CONTENT_TYPE_LABELS = {
  latc: 'LATC',
  tmt: 'TMT',
  short_clip: 'Clip Ngắn',
  social_post: 'Bài Đăng MXH',
  news: 'Tin Tức',
};

const STATUS_LABELS = {
  planned: 'Đã lên kế hoạch',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  rescheduled: 'Đã dời lịch',
};

const PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

const PUBLISH_STATUS_LABELS = {
  draft: { label: 'Nháp', color: 'text-txt-3' },
  scheduled: { label: 'Đã lên lịch', color: 'text-cyan' },
  published: { label: 'Đã đăng', color: 'text-success' },
  failed: { label: 'Thất bại', color: 'text-danger' },
};

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
};

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const WEEKLY_SCHEDULE = {
  1: { track: 'wealth', label: 'Wealth' },
  3: { track: 'wellness', label: 'Wellness' },
  5: { track: 'integration', label: 'Integration' },
  0: { track: 'integration', label: 'Deep Dive' },
};

const TARGET_RATIO = { wealth: 30, wellness: 30, integration: 40 };

// ============================================================================
// Date Helpers
// ============================================================================

function formatYM(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatISO(d) {
  return d.toISOString().split('T')[0] ?? '';
}

function isSameDay(a, b) {
  return a === b;
}

function getMonthDays(year, month) {
  const days = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Pad start (Monday=0 convention)
  let startDay = first.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  // Pad end to fill 6 rows
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
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];
  return names[month] ?? '';
}

function isPastDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

// ============================================================================
// Constants (Form Default)
// ============================================================================

const DEFAULT_FORM = {
  title: '',
  content_type: 'latc',
  track: 'wealth',
  persona: 'jennie_mentor',
  priority: 'medium',
  scheduled_date: '',
  scheduled_time: '08:00',
  script_id: '',
  description: '',
  platform: '',
  auto_comment_text: '',
  auto_comment_link: '',
  scheduled_publish_time: '',
  publish_status: 'draft',
  generation_job_id: '',
};

// ============================================================================
// Main Component
// ============================================================================

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = formatISO(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterTrack, setFilterTrack] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- Date range for query ---
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m + 2, 0);
      return { start: formatISO(start), end: formatISO(end) };
    }
    const weekDays = getWeekDays(currentDate);
    return { start: formatISO(weekDays[0]), end: formatISO(weekDays[6]) };
  }, [currentDate, viewMode]);

  // --- Data ---
  const { data: events, isLoading, refetch } = useCalendarEvents(dateRange.start, dateRange.end);
  const { data: scriptsData } = useScripts({ pageSize: 100 });
  const scripts = scriptsData?.data ?? [];

  // --- Filtered events ---
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    let filtered = events;
    if (filterTrack) filtered = filtered.filter((e) => e.track === filterTrack);
    if (filterType) filtered = filtered.filter((e) => e.content_type === filterType);
    if (filterStatus) filtered = filtered.filter((e) => e.status === filterStatus);
    return filtered;
  }, [events, filterTrack, filterType, filterStatus]);

  // --- Track distribution for current month ---
  const distribution = useMemo(() => {
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

  // --- Alerts ---
  const trackImbalanceAlert = useMemo(() => {
    if (distribution.total < 4) return null;
    const pctW = Math.round((distribution.wealth / distribution.total) * 100);
    const pctWl = Math.round((distribution.wellness / distribution.total) * 100);
    const pctI = Math.round((distribution.integration / distribution.total) * 100);
    const offW = Math.abs(pctW - TARGET_RATIO.wealth);
    const offWl = Math.abs(pctWl - TARGET_RATIO.wellness);
    const offI = Math.abs(pctI - TARGET_RATIO.integration);
    if (offW > 15 || offWl > 15 || offI > 15) {
      return `Mất cân bằng track: W=${pctW}% / Wl=${pctWl}% / I=${pctI}% (Mục tiêu: 30/30/40)`;
    }
    return null;
  }, [distribution]);

  // --- Double-booking check ---
  const doubleBookingWarning = useMemo(() => {
    if (!form.scheduled_date || !form.scheduled_time) return null;
    const existing = filteredEvents.find(
      (e) =>
        e.scheduled_date === form.scheduled_date &&
        e.scheduled_time === form.scheduled_time &&
        e.id !== editingEventId,
    );
    return existing ? `Trùng lịch với "${existing.title}" vào ${form.scheduled_time}` : null;
  }, [form.scheduled_date, form.scheduled_time, filteredEvents, editingEventId]);

  // --- Calendar grid ---
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    }
    return getWeekDays(currentDate);
  }, [currentDate, viewMode]);

  // --- Navigation ---
  const navigatePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 7);
      return nd;
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 7);
      return nd;
    });
  }, [viewMode]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // --- Event handlers ---
  const openCreateModal = useCallback((date) => {
    setForm({ ...DEFAULT_FORM, scheduled_date: date });
    setEditingEventId(null);
    setSelectedDate(date);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback(
    (event) => {
      setForm({
        title: event.title ?? '',
        content_type: event.content_type ?? 'latc',
        track: event.track ?? 'wealth',
        persona: event.persona ?? 'jennie_mentor',
        priority: event.priority ?? 'medium',
        scheduled_date: event.scheduled_date ?? '',
        scheduled_time: event.scheduled_time ?? '08:00',
        script_id: event.script_id ?? '',
        description: event.description ?? '',
        platform: event.platform ?? '',
        auto_comment_text: event.auto_comment_text ?? '',
        auto_comment_link: event.auto_comment_link ?? '',
        scheduled_publish_time: event.scheduled_publish_time ?? '',
        publish_status: event.publish_status ?? 'draft',
        generation_job_id: event.generation_job_id ?? '',
      });
      setEditingEventId(event.id);
      setSelectedDate(event.scheduled_date);
      setShowModal(true);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingEventId(null);
    setSelectedDate(null);
    setForm(DEFAULT_FORM);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.scheduled_date) return;
    setSaving(true);
    try {
      const extraFields = {
        platform: form.platform || null,
        auto_comment_text: form.auto_comment_text || null,
        auto_comment_link: form.auto_comment_link || null,
        scheduled_publish_time: form.scheduled_publish_time || null,
        publish_status: form.publish_status || 'draft',
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
          ...extraFields,
        });
      } else {
        await calendarService.create({
          title: form.title,
          content_type: form.content_type,
          track: form.track,
          pillar: form.track === 'wealth' ? 'trading' : form.track === 'wellness' ? 'spiritual' : 'lifestyle',
          persona: form.persona,
          writing_mode: 'mode_1_calm',
          priority: form.priority,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || null,
          script_id: form.script_id || null,
          description: form.description || null,
          created_by: 'current-user',
          ...extraFields,
        });
      }
      await refetch();
      closeModal();
    } catch {
      // error handled silently
    }
    setSaving(false);
  }, [form, editingEventId, refetch, closeModal]);

  const handleDelete = useCallback(async () => {
    if (!editingEventId) return;
    setDeleting(true);
    try {
      await calendarService.remove(editingEventId);
      await refetch();
      closeModal();
    } catch {
      // error handled silently
    }
    setDeleting(false);
  }, [editingEventId, refetch, closeModal]);

  const updateField = useCallback((key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  // --- Events for a given day ---
  const eventsForDay = useCallback(
    (dateStr) => filteredEvents.filter((e) => isSameDay(e.scheduled_date, dateStr)),
    [filteredEvents],
  );

  // --- Title ---
  const headerTitle = viewMode === 'month'
    ? `${monthName(currentDate.getMonth())} ${currentDate.getFullYear()}`
    : (() => {
      const weekDays = getWeekDays(currentDate);
      return `${formatISO(weekDays[0])} -- ${formatISO(weekDays[6])}`;
    })();

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-gold" />
          <h1 className="font-heading text-2xl font-bold text-txt">Lịch Nội Dung</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn btn-gh text-xs">Hôm nay</button>
          <button onClick={navigatePrev} className="btn btn-gh p-2"><ChevronLeft size={16} /></button>
          <div className="relative flex items-center justify-center min-w-[180px]">
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={currentDate.toISOString().slice(0, 10)}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(new Date(e.target.value));
                }
              }}
              onClick={(e) => {
                if ('showPicker' in HTMLInputElement.prototype) {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }
              }}
            />
            <span className="text-sm font-medium text-txt text-center pointer-events-none relative z-10">{headerTitle}</span>
          </div>
          <button onClick={navigateNext} className="btn btn-gh p-2"><ChevronRight size={16} /></button>
          <div className="h-5 w-px bg-border mx-1" />
          <button
            onClick={() => setViewMode('month')}
            className={`btn text-xs px-3 py-1.5 ${viewMode === 'month' ? 'btn-p' : 'btn-gh'}`}
          >
            <CalendarDays size={14} className="mr-1" />
            Tháng
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`btn text-xs px-3 py-1.5 ${viewMode === 'week' ? 'btn-p' : 'btn-gh'}`}
          >
            <CalendarRange size={14} className="mr-1" />
            Tuần
          </button>
        </div>
      </div>

      {/* Track Distribution Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-txt-2 uppercase tracking-wider">
            Phân Bổ Track Tháng Này
          </span>
          <span className="text-xxs text-txt-3">
            Mục tiêu: Wealth 30% / Wellness 30% / Integration 40%
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-bg-4">
          {distribution.total > 0 ? (
            <>
              <div
                className="bg-gold transition-all"
                style={{ width: `${(distribution.wealth / distribution.total) * 100}%` }}
                title={`Wealth: ${distribution.wealth}`}
              />
              <div
                className="bg-purple transition-all"
                style={{ width: `${(distribution.wellness / distribution.total) * 100}%` }}
                title={`Wellness: ${distribution.wellness}`}
              />
              <div
                className="bg-emerald transition-all"
                style={{ width: `${(distribution.integration / distribution.total) * 100}%` }}
                title={`Integration: ${distribution.integration}`}
              />
            </>
          ) : (
            <div className="w-full bg-bg-4" />
          )}
        </div>
        <div className="flex items-center gap-4 mt-2">
          {['wealth', 'wellness', 'integration'].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${TRACK_COLORS[t].dot}`} />
              <span className="text-xxs text-txt-3">
                {TRACK_LABELS[t]}: {distribution[t]}
                {distribution.total > 0 && ` (${Math.round((distribution[t] / distribution.total) * 100)}%)`}
              </span>
            </div>
          ))}
        </div>
        {trackImbalanceAlert && (
          <div className="mt-2 p-2 rounded-card bg-amber/10 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber shrink-0" />
            <span className="text-xxs text-amber">{trackImbalanceAlert}</span>
          </div>
        )}
      </div>

      {/* Weekly Schedule Reference */}
      <div className="glass-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-txt-3" />
          <span className="text-xs font-medium text-txt-2">Lịch tuần tham khảo</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { day: 'T2', track: 'wealth', label: 'Wealth' },
            { day: 'T4', track: 'wellness', label: 'Wellness' },
            { day: 'T6', track: 'integration', label: 'Integration' },
            { day: 'CN', track: 'integration', label: 'Deep Dive' },
          ].map((item) => (
            <div key={item.day} className={`flex items-center gap-1.5 px-2 py-1 rounded-badge ${TRACK_COLORS[item.track].bg}`}>
              <span className={`text-xs font-bold ${TRACK_COLORS[item.track].text}`}>{item.day}</span>
              <span className="text-xxs text-txt-2">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-txt-3" />
        <CCSelect
          value={filterTrack}
          onChange={(e) => setFilterTrack(e.target.value)}
          className="text-xs w-auto"
        >
          <option value="">Tất cả Track</option>
          {['wealth', 'wellness', 'integration'].map((t) => (
            <option key={t} value={t}>{TRACK_LABELS[t]}</option>
          ))}
        </CCSelect>
        <CCSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs w-auto"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </CCSelect>
        <CCSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs w-auto"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </CCSelect>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gold" />
          <span className="ml-2 text-sm text-txt-2">Đang tải lịch...</span>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && (
        <div className="glass-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map((name, i) => {
              const scheduleInfo = WEEKLY_SCHEDULE[i === 6 ? 0 : i + 1];
              return (
                <div key={name} className="px-2 py-2 text-center border-r border-border last:border-r-0">
                  <span className="text-xs font-bold text-txt-2">{name}</span>
                  {scheduleInfo && (
                    <span className={`block text-[10px] ${TRACK_COLORS[scheduleInfo.track].text}`}>
                      {scheduleInfo.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dateStr = formatISO(day);
              const isToday = dateStr === today;
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayEvents = eventsForDay(dateStr);
              const isPast = isPastDate(dateStr);

              return (
                <div
                  key={i}
                  onClick={() => openCreateModal(dateStr)}
                  className={`
                    min-h-[90px] p-1.5 border-r border-b border-border last:border-r-0 cursor-pointer
                    transition-colors hover:bg-glass-bg
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isToday ? 'bg-gold/5 ring-1 ring-gold/30 ring-inset' : ''}
                  `}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${isToday
                        ? 'bg-gold text-bg rounded-full w-6 h-6 flex items-center justify-center'
                        : isPast
                          ? 'text-txt-3'
                          : 'text-txt-2'
                        }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-txt-3">{dayEvents.length}</span>
                    )}
                  </div>

                  {/* Event dots / cards */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const track = evt.track;
                      const colors = TRACK_COLORS[track] || TRACK_COLORS.wealth;
                      const pubStatus = evt.publish_status;
                      return (
                        <button
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(evt);
                          }}
                          className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate border ${colors.bg} ${colors.border} ${colors.text} hover:opacity-80 transition-opacity flex items-center gap-0.5`}
                          title={evt.title}
                        >
                          {pubStatus === 'scheduled' && <Timer size={8} className="text-cyan shrink-0" />}
                          {pubStatus === 'published' && <CheckCircle2 size={8} className="text-success shrink-0" />}
                          {!!evt.generation_job_id && <Sparkles size={8} className="text-emerald shrink-0" />}
                          <span className="truncate">{String(evt.title ?? '')}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-txt-3 pl-1">+{dayEvents.length - 3} khác</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list for selected date (weekly view) */}
      {viewMode === 'week' && selectedDate && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-bold text-txt mb-3">
            Sự kiện ngày {selectedDate}
          </h3>
          <div className="space-y-2">
            {eventsForDay(selectedDate).length === 0 && (
              <p className="text-xs text-txt-3">Không có sự kiện nào.</p>
            )}
            {eventsForDay(selectedDate).map((evt) => {
              const track = evt.track;
              const colors = TRACK_COLORS[track] || TRACK_COLORS.wealth;
              return (
                <div
                  key={evt.id}
                  onClick={() => openEditModal(evt)}
                  className={`card p-3 border-l-[3px] cursor-pointer hover:bg-glass-bg transition-colors ${colors.border.replace('/30', '')}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-txt">{evt.title}</span>
                    <span className="badge text-[10px]">{STATUS_LABELS[evt.status ?? 'planned']}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xxs text-txt-3">
                    {!!evt.scheduled_time && (
                      <span className="flex items-center gap-1"><Clock size={10} />{evt.scheduled_time}</span>
                    )}
                    <span className={colors.text}>{TRACK_LABELS[track]}</span>
                    <span>{CONTENT_TYPE_LABELS[evt.content_type ?? ''] ?? evt.content_type}</span>
                    {!!evt.platform && (
                      <span className="text-txt-3">{PLATFORM_LABELS[String(evt.platform)] ?? String(evt.platform)}</span>
                    )}
                    {evt.publish_status === 'scheduled' && (
                      <span className="flex items-center gap-0.5 text-cyan"><Timer size={10} />Đã lên lịch</span>
                    )}
                    {evt.publish_status === 'published' && (
                      <span className="flex items-center gap-0.5 text-success"><CheckCircle2 size={10} />Đã đăng</span>
                    )}
                    {!!evt.generation_job_id && (
                      <span className="flex items-center gap-0.5 text-emerald"><Sparkles size={10} />AI</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Event */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold text-txt">
                {editingEventId ? 'Chỉnh Sửa Sự Kiện' : 'Tạo Sự Kiện Mới'}
              </h2>
              <button onClick={closeModal} className="btn btn-gh p-1.5">
                <X size={18} />
              </button>
            </div>

            {/* Past date warning */}
            {form.scheduled_date && isPastDate(form.scheduled_date) && (
              <div className="mb-4 p-2 rounded-card bg-amber/10 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber shrink-0" />
                <span className="text-xxs text-amber">Ngày này đã qua. Bạn có chắc muốn lên lịch cho ngày cũ?</span>
              </div>
            )}

            {/* Double-booking warning */}
            {doubleBookingWarning && (
              <div className="mb-4 p-2 rounded-card bg-danger/10 flex items-center gap-2">
                <AlertTriangle size={14} className="text-danger shrink-0" />
                <span className="text-xxs text-danger">{doubleBookingWarning}</span>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-txt-2 block mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="VD: Video LATC - 5 Sự Thật Về Tiền Số..."
                  className="fi text-sm w-full"
                />
              </div>

              {/* Content Type + Track row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Loại nội dung</label>
                  <CCSelect
                    value={form.content_type}
                    onChange={(e) => updateField('content_type', e.target.value)}
                    className="text-sm w-full"
                  >
                    {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </CCSelect>
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Track</label>
                  <CCSelect
                    value={form.track}
                    onChange={(e) => updateField('track', e.target.value)}
                    className="text-sm w-full"
                  >
                    {Object.entries(TRACK_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </CCSelect>
                </div>
              </div>

              {/* Persona + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Persona</label>
                  <CCSelect
                    value={form.persona}
                    onChange={(e) => updateField('persona', e.target.value)}
                    className="text-sm w-full"
                  >
                    <option value="jennie_mentor">Mentor</option>
                    <option value="jennie_provocateur">Provocateur</option>
                    <option value="jennie_storyteller">Storyteller</option>
                    <option value="jennie_analyst">Analyst</option>
                    <option value="jennie_motivator">Motivator</option>
                    <option value="jennie_educator">Educator</option>
                    <option value="jennie_confidante">Confidante</option>
                  </CCSelect>
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Mức độ ưu tiên</label>
                  <CCSelect
                    value={form.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="text-sm w-full"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </CCSelect>
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Ngày *</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) => updateField('scheduled_date', e.target.value)}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        try {
                          e.target.showPicker();
                        } catch (err) {}
                      }
                    }}
                    className="fi text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-2 block mb-1">Giờ</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => updateField('scheduled_time', e.target.value)}
                    className="fi text-sm w-full"
                  />
                </div>
              </div>

              {/* Link to Script */}
              <div>
                <label className="text-xs font-medium text-txt-2 block mb-1">
                  <Link2 size={12} className="inline mr-1" />
                  Liên kết kịch bản
                </label>
                <CCSelect
                  value={form.script_id}
                  onChange={(e) => updateField('script_id', e.target.value)}
                  className="text-sm w-full"
                >
                  <option value="">-- Không liên kết --</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </CCSelect>
              </div>

              {/* Platform */}
              <div>
                <label className="text-xs font-medium text-txt-2 block mb-1">Nền tảng đăng bài</label>
                <CCSelect
                  value={form.platform}
                  onChange={(e) => updateField('platform', e.target.value)}
                  className="text-sm w-full"
                >
                  <option value="">-- Chưa chọn --</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="threads">Threads</option>
                </CCSelect>
              </div>

              {/* Scheduled Publish Time */}
              <div>
                <label className="text-xs font-medium text-txt-2 block mb-1">
                  <Timer size={12} className="inline mr-1" />
                  Thời gian đăng dự kiến
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_publish_time ? form.scheduled_publish_time.slice(0, 16) : ''}
                  onChange={(e) => updateField('scheduled_publish_time', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="fi text-sm w-full"
                />
              </div>

              {/* Publish Status Badge */}
              {form.publish_status && form.publish_status !== 'draft' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-txt-3">Trạng thái đăng:</span>
                  {form.publish_status === 'scheduled' && <Timer size={14} className="text-cyan" />}
                  {form.publish_status === 'published' && <CheckCircle2 size={14} className="text-success" />}
                  {form.publish_status === 'failed' && <AlertTriangle size={14} className="text-danger" />}
                  <span className={`text-xs font-medium ${PUBLISH_STATUS_LABELS[form.publish_status]?.color ?? 'text-txt-3'}`}>
                    {PUBLISH_STATUS_LABELS[form.publish_status]?.label ?? form.publish_status}
                  </span>
                </div>
              )}

              {/* Generation Job Link */}
              {form.generation_job_id && (
                <div className="flex items-center gap-2 p-2 rounded-card bg-emerald/10 border border-emerald/20">
                  <Sparkles size={14} className="text-emerald" />
                  <span className="text-xs text-emerald font-medium">Đã có nội dung AI</span>
                </div>
              )}

              {/* Auto-Comment */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-txt-2 block mb-1">
                  <MessageSquare size={12} className="inline mr-1" />
                  Comment tự động (optional)
                </label>
                <textarea
                  value={form.auto_comment_text}
                  onChange={(e) => updateField('auto_comment_text', e.target.value)}
                  rows={2}
                  placeholder="Nội dung comment tự động sau khi đăng bài..."
                  className="fi text-xs w-full resize-y"
                />
                <input
                  type="url"
                  value={form.auto_comment_link}
                  onChange={(e) => updateField('auto_comment_link', e.target.value)}
                  placeholder="Link đính kèm comment (optional)"
                  className="fi text-xs w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-txt-2 block mb-1">Ghi chú</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Mô tả thêm..."
                  className="fi text-sm w-full resize-y"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                {editingEventId && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn btn-gh text-danger text-xs flex items-center gap-1.5"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Xóa
                  </button>
                )}
                {/* Tạo Nội Dung AI — navigate to AI Gen with event context */}
                {editingEventId && !form.generation_job_id && (
                  <a
                    href={`/admin/cc/ai-gen?event_id=${editingEventId}&content_type=${form.content_type}`}
                    className="btn btn-gh text-emerald text-xs flex items-center gap-1.5 hover:bg-emerald/10 hover:border-emerald/30"
                  >
                    <Sparkles size={14} />
                    Tạo Nội Dung AI
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeModal} className="btn btn-gh text-xs">Hủy</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.scheduled_date}
                  className="btn btn-p text-xs flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingEventId ? 'Cập Nhật' : 'Tạo Sự Kiện'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
