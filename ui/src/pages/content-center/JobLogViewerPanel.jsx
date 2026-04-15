// JobLogViewerPanel — Content Pipeline job log viewer
// Uses Paperclip design tokens (bg-card/bg-muted/text-foreground) so it adapts
// to light & dark themes instead of hardcoded slate-* that looked wrong in both.
//
// Data sources:
//   GET /api/ops/content-pipeline/jobs/recent?limit=20
//   GET /api/ops/content-pipeline/jobs/:id/logs      → job meta + events + input_params + metadata + output_data
//   GET /api/ops/content-pipeline/jobs/:id/logs/stream  (SSE)
//
// Embed modes:
//   <JobLogViewerPanel mode="inline" selectedJobId={...} onSelectJob={...} />
//   <JobLogViewerPanel mode="modal"  jobId={...} open onClose={...} />

import { useEffect, useRef, useState, useMemo } from 'react';

// Stage colors — semi-transparent tints that work on both light & dark backgrounds.
// Text uses foreground-aware variants so it never goes "light text on light bg".
const STAGE_META = {
  queued:           { icon: '🕒', tone: 'slate',   label: 'Queued' },
  start:            { icon: '▶️', tone: 'blue',    label: 'Start' },
  started:          { icon: '▶️', tone: 'blue',    label: 'Started' },
  'knowledge-load': { icon: '📚', tone: 'violet',  label: 'Knowledge Load' },
  'prompt-build':   { icon: '🔧', tone: 'violet',  label: 'Prompt Build' },
  'ai-call':        { icon: '🤖', tone: 'amber',   label: 'AI Call' },
  response:         { icon: '💬', tone: 'emerald', label: 'Response' },
  save:             { icon: '💾', tone: 'emerald', label: 'Save' },
  completed:        { icon: '✅', tone: 'emerald', label: 'Completed' },
  failed:           { icon: '❌', tone: 'red',     label: 'Failed' },
  retry:            { icon: '🔁', tone: 'amber',   label: 'Retry' },
  error:            { icon: '🔥', tone: 'red',     label: 'Error' },
  batch:            { icon: '📦', tone: 'cyan',    label: 'Batch' },
};

// Tone → Tailwind classes (all paired light/dark so contrast never fails).
const TONE_CLASSES = {
  slate:   { border: 'border-slate-400/40',   bg: 'bg-slate-500/5',   badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-200' },
  blue:    { border: 'border-blue-400/40',    bg: 'bg-blue-500/5',    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-200' },
  violet:  { border: 'border-violet-400/40',  bg: 'bg-violet-500/5',  badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-200' },
  amber:   { border: 'border-amber-400/40',   bg: 'bg-amber-500/5',   badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-200' },
  emerald: { border: 'border-emerald-400/40', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' },
  red:     { border: 'border-red-400/40',     bg: 'bg-red-500/5',     badge: 'bg-red-500/15 text-red-700 dark:text-red-200' },
  cyan:    { border: 'border-cyan-400/40',    bg: 'bg-cyan-500/5',    badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200' },
};

const STATUS_TONE = {
  queued: 'slate',
  processing: 'blue',
  completed: 'emerald',
  failed: 'red',
  cancelled: 'slate',
};

function formatTs(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
    return d.toLocaleTimeString('vi-VN', opts);
  } catch { return ts; }
}

function formatDateTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
  } catch { return ts; }
}

// ────────────────────────── Input field list ──────────────────────────
// Read-only Inputs panel. Pulls from both job columns (pillar/persona/...)
// and input_params jsonb. Designed to show EVERY input so user can debug
// "AI output wrong" by inspecting what was actually sent.
function InputsPanel({ job }) {
  if (!job) return null;
  const ip = job.input_params || {};
  const md = job.metadata || {};

  // Structured rows from known columns first, then spread input_params for the rest.
  const knownKeys = new Set([
    'topic', 'theme', 'audience', 'target_audience', 'voice', 'brand_voice',
    'tone', 'cta', 'hashtags', 'length', 'word_count', 'language',
    'framework', 'hook_type', 'format', 'platform', 'channel',
  ]);

  const structured = [
    { label: 'Job type',     value: job.job_type, mono: true },
    { label: 'Content type', value: job.content_type, mono: true },
    { label: 'Pillar',       value: job.pillar },
    { label: 'Track',        value: job.track },
    { label: 'Persona',      value: job.persona },
    { label: 'Writing mode', value: job.writing_mode },
    { label: 'Model',        value: job.model_used, mono: true },
    { label: 'Processor',    value: job.processor, mono: true },
    { label: 'Priority',     value: job.priority },
    { label: 'Entity',       value: job.entity_type && job.entity_id ? `${job.entity_type}:${job.entity_id}` : null, mono: true },
  ];

  const topicFields = knownKeys
    .values()
    ? Array.from(knownKeys)
        .map((k) => ({ label: k, value: ip[k] }))
        .filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
    : [];

  // Remaining input_params keys (anything not in knownKeys)
  const extraIpEntries = Object.entries(ip).filter(([k]) => !knownKeys.has(k));

  return (
    <div className="border border-border rounded-md bg-card/50 mb-3">
      <details open>
        <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 hover:bg-accent/40 transition-colors select-none">
          <span className="text-sm">📥</span>
          <span className="text-xs font-semibold text-foreground">Inputs</span>
          <span className="text-[10px] text-muted-foreground">— mọi thông tin gửi vào batch_processor</span>
          <span className="ml-auto text-[10px] text-muted-foreground">chi tiết ▾</span>
        </summary>
        <div className="px-3 pb-3 space-y-3">
          {/* Column fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
            {structured.map((f) => (
              <FieldRow key={f.label} {...f} />
            ))}
          </div>

          {/* Known topic fields from input_params */}
          {topicFields.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Content inputs</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {topicFields.map((f) => (
                  <FieldRow key={f.label} {...f} wide />
                ))}
              </div>
            </div>
          )}

          {/* Any remaining input_params */}
          {extraIpEntries.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground select-none">
                Raw input_params JSON ({extraIpEntries.length} field khác)
              </summary>
              <pre className="mt-1 text-[10px] p-2 rounded border border-border bg-muted/40 text-foreground overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(Object.fromEntries(extraIpEntries), null, 2)}
              </pre>
            </details>
          )}

          {/* Metadata (batch_processor internal tags) */}
          {md && Object.keys(md).length > 0 && (
            <details>
              <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground select-none">
                metadata ({Object.keys(md).length} field)
              </summary>
              <pre className="mt-1 text-[10px] p-2 rounded border border-border bg-muted/40 text-foreground overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(md, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}

function FieldRow({ label, value, mono, wide }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <div className={wide ? 'col-span-1 md:col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-xs text-foreground break-all ${mono ? 'font-mono' : ''}`}>
        {display}
      </div>
    </div>
  );
}

// ────────────────────────── Stage card ──────────────────────────
// Prompt-build events get special treatment: full prompt text is always
// visible (no truncation) when the card is open, with a Copy button.
function StageCard({ event, defaultOpen = false }) {
  const meta = STAGE_META[event.stage] || STAGE_META.start;
  const tone = TONE_CLASSES[meta.tone] || TONE_CLASSES.slate;
  const [open, setOpen] = useState(defaultOpen);

  const isPromptStage = event.stage === 'prompt-build' || event.stage === 'ai-call';
  const promptText =
    event.metadata?.prompt ||
    event.metadata?.full_prompt ||
    event.metadata?.rendered_prompt ||
    (isPromptStage && event.message && event.message.length > 200 ? event.message : null);

  const hasDetails =
    (event.metadata && Object.keys(event.metadata).length > 0) ||
    (event.message && event.message.length > 80) ||
    !!promptText;

  return (
    <div className={`border-l-2 ${tone.border} ${tone.bg} border border-border rounded-md mb-2 overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="text-base shrink-0 leading-none mt-0.5">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${tone.badge}`}>
              {meta.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{formatTs(event.ts)}</span>
            {event.level && event.level !== 'info' && (
              <span
                className={`text-[9px] px-1 py-0.5 rounded uppercase font-bold ${
                  event.level === 'error'
                    ? TONE_CLASSES.red.badge
                    : event.level === 'warn'
                    ? TONE_CLASSES.amber.badge
                    : TONE_CLASSES.cyan.badge
                }`}
              >
                {event.level}
              </span>
            )}
          </div>
          <div className={`text-xs text-foreground mt-1 ${open ? 'whitespace-pre-wrap wrap-break-word' : 'line-clamp-2'}`}>
            {event.message}
          </div>

          {open && promptText && (
            <PromptBlock text={promptText} />
          )}

          {open && event.metadata && Object.keys(event.metadata).length > 0 && (
            <pre className="text-[10px] mt-2 p-2 rounded border border-border bg-muted/50 text-foreground overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(event.metadata, null, 2)}
            </pre>
          )}
        </div>
        {hasDetails && (
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
        )}
      </button>
    </div>
  );
}

function PromptBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Prompt ({text.length.toLocaleString()} chars)
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
        >
          {copied ? '✓ Copied' : '📋 Copy prompt'}
        </button>
      </div>
      <pre className="text-[11px] p-2 rounded border border-border bg-muted/60 text-foreground overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
{text}
      </pre>
    </div>
  );
}

// ────────────────────────── Header ──────────────────────────
function JobMetaHeader({ job, isLive, onClose }) {
  if (!job) return null;
  const status = job.status || 'unknown';
  const statusTone = TONE_CLASSES[STATUS_TONE[status] || 'slate'];
  return (
    <div className="px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">📜</span>
        <h2 className="text-sm font-semibold text-foreground">Job Transcript</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${statusTone.badge} ${status === 'processing' ? 'animate-pulse' : ''}`}>
          {status}
        </span>
        {isLive && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-200 border border-red-400/40 animate-pulse flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-red-500" /> Live
          </span>
        )}
        {onClose && (
          <>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-lg leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>id: <code className="text-foreground">{job.id?.slice(0, 8)}…</code></span>
        <span>type: <code className="text-foreground">{job.job_type}/{job.content_type || '—'}</code></span>
        <span>model: <code className="text-foreground">{job.model_used || '?'}</code></span>
        {job.pillar && <span>pillar: <code className="text-foreground">{job.pillar}</code></span>}
        {job.persona && <span>persona: <code className="text-foreground">{job.persona}</code></span>}
        {job.total_tokens ? <span>tokens: {job.total_tokens}</span> : null}
        {job.generation_time_ms ? <span>elapsed: {(job.generation_time_ms / 1000).toFixed(1)}s</span> : null}
        {job.retry_count ? <span>retries: {job.retry_count}/{job.max_retries ?? '?'}</span> : null}
        {job.error_message && (
          <span className="text-red-600 dark:text-red-300">⚠ {job.error_message.slice(0, 80)}</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
        <span>created: <code className="text-foreground/80">{formatDateTs(job.created_at)}</code></span>
        {job.started_at && <span>started: <code className="text-foreground/80">{formatDateTs(job.started_at)}</code></span>}
        {job.completed_at && <span>completed: <code className="text-foreground/80">{formatDateTs(job.completed_at)}</code></span>}
      </div>
    </div>
  );
}

// ────────────────────────── Body ──────────────────────────
function JobLogBody({ jobId, recentJobs, onSelectJob, embedded }) {
  const [events, setEvents] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const shouldAutoScroll = useRef(true);
  const esRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      setEvents([]);
      setCurrentJob(null);
      setIsLive(false);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);

    const load = async () => {
      try {
        const r = await fetch(`/api/ops/content-pipeline/jobs/${jobId}/logs`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        setCurrentJob(data.job);
        setEvents(data.events || []);
        setIsLive(!!data.isLive);
        setLoading(false);

        if (data.isLive) {
          const es = new EventSource(`/api/ops/content-pipeline/jobs/${jobId}/logs/stream`);
          esRef.current = es;
          es.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === 'event' && msg.event) {
                setEvents((prev) => [...prev, msg.event]);
              } else if (msg.type === 'done') {
                setIsLive(false);
                es.close();
                esRef.current = null;
              }
            } catch {}
          };
          es.onerror = () => { es.close(); esRef.current = null; setIsLive(false); };
        }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    };
    load();
    return () => {
      cancelled = true;
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [jobId]);

  useEffect(() => {
    if (shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    shouldAutoScroll.current = scrollTop + clientHeight >= scrollHeight - 80;
  };

  const filtered = useMemo(() => {
    return events.filter(
      (e) => (!levelFilter || e.level === levelFilter) && (!stageFilter || e.stage === stageFilter)
    );
  }, [events, levelFilter, stageFilter]);

  const transcript = useMemo(
    () =>
      filtered
        .map((e) => `[${formatTs(e.ts)}] [${(e.level || 'info').toUpperCase().padEnd(5)}] (${e.stage || '-'}) ${e.message}`)
        .join('\n'),
    [filtered]
  );

  const handleCopy = () => navigator.clipboard?.writeText(transcript);
  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId?.slice(0, 8) || 'latest'}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allStages = useMemo(() => Array.from(new Set(events.map((e) => e.stage).filter(Boolean))), [events]);

  return (
    <>
      {/* Recent jobs picker */}
      {recentJobs && onSelectJob && (
        <div className="px-4 py-2 border-b border-border bg-card">
          <label htmlFor="job-picker" className="sr-only">Chọn job</label>
          <select
            id="job-picker"
            value={jobId || ''}
            onChange={(e) => onSelectJob(e.target.value || null)}
            className="w-full text-xs bg-background border border-border text-foreground rounded px-2 py-1.5"
          >
            <option value="">— Chọn job gần đây —</option>
            {recentJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {new Date(j.created_at).toLocaleString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })} · {j.job_type}/{j.content_type || '-'} · {j.status} · {(j.topic || '').slice(0, 40)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Toolbar */}
      {currentJob && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-card text-[11px]">
          <label htmlFor="level-filter" className="sr-only">Level filter</label>
          <select
            id="level-filter"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-background border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground"
          >
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <label htmlFor="stage-filter" className="sr-only">Stage filter</label>
          <select
            id="stage-filter"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-background border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground"
          >
            <option value="">All stages</option>
            {allStages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!transcript}
            className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40"
          >
            📋 Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!transcript}
            className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40"
          >
            ⬇ .log
          </button>
          <span className="text-[10px] text-muted-foreground">{filtered.length}/{events.length} events</span>
        </div>
      )}

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto p-3 bg-background"
        style={{ minHeight: embedded ? 320 : undefined }}
      >
        {loading && <div className="text-muted-foreground px-2 py-1 text-xs">Đang tải logs...</div>}
        {error && <div className="text-red-600 dark:text-red-300 px-2 py-1 text-xs">Lỗi: {error}</div>}
        {!loading && !error && !jobId && (
          <div className="text-muted-foreground px-3 py-8 text-center text-xs">
            Chưa chọn job. Chọn từ dropdown ở trên hoặc bấm "Tạo" để sinh content — job mới sẽ hiện ở đây.
          </div>
        )}

        {/* Inputs panel — always visible when a job is loaded */}
        {!loading && !error && currentJob && <InputsPanel job={currentJob} />}

        {!loading && !error && jobId && filtered.length === 0 && (
          <div className="text-muted-foreground px-3 py-8 text-center text-xs italic">
            Job này chưa có log entry nào (batch_processor có thể chưa support write_job_log cho job_type này).
          </div>
        )}
        {filtered.map((ev, i) => (
          <StageCard
            key={i}
            event={ev}
            defaultOpen={i === filtered.length - 1 || ev.level === 'error' || ev.level === 'warn' || ev.stage === 'prompt-build'}
          />
        ))}

        {/* Output preview */}
        {!loading && !error && currentJob?.output_data && (
          <details className="mt-3 border border-border rounded-md bg-card/50">
            <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 hover:bg-accent/40 select-none">
              <span className="text-sm">📤</span>
              <span className="text-xs font-semibold text-foreground">Output data</span>
              <span className="ml-auto text-[10px] text-muted-foreground">chi tiết ▾</span>
            </summary>
            <pre className="text-[11px] px-3 pb-3 text-foreground overflow-x-auto whitespace-pre-wrap">
{typeof currentJob.output_data === 'string' ? currentJob.output_data : JSON.stringify(currentJob.output_data, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-border text-[10px] text-muted-foreground bg-card flex justify-between items-center">
        <span>{filtered.length} / {events.length} events</span>
        <span>{isLive ? '● Job đang chạy — auto-refresh SSE' : 'Snapshot (history)'}</span>
      </div>
    </>
  );
}

// ────────────────────────── Wrapper ──────────────────────────
export default function JobLogViewerPanel({
  mode = 'inline',
  selectedJobId,
  onSelectJob,
  jobId,
  open = true,
  onClose,
}) {
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    if (mode !== 'inline') return;
    let mounted = true;
    const loadRecent = async () => {
      try {
        const r = await fetch('/api/ops/content-pipeline/jobs/recent?limit=20');
        const data = await r.json();
        if (mounted) setRecentJobs(data.jobs || []);
      } catch {}
    };
    loadRecent();
    const interval = setInterval(loadRecent, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [mode]);

  const [modalJob, setModalJob] = useState(null);
  useEffect(() => {
    if (mode !== 'modal' || !jobId) { setModalJob(null); return; }
    let cancelled = false;
    fetch(`/api/ops/content-pipeline/jobs/${jobId}/logs`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setModalJob(d.job); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode, jobId]);

  if (mode === 'modal') {
    if (!open || !jobId) return null;
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
          style={{ height: '88vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <JobMetaHeader
            job={modalJob}
            isLive={modalJob?.status === 'queued' || modalJob?.status === 'processing'}
            onClose={onClose}
          />
          <JobLogBody jobId={jobId} recentJobs={null} onSelectJob={null} embedded={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
      <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-2">
        <span className="text-base">📜</span>
        <h2 className="text-sm font-semibold text-foreground">Job Log Viewer</h2>
        <span className="text-[10px] text-muted-foreground">batch_processor + AI generation transcript</span>
      </div>
      <JobLogBody jobId={selectedJobId} recentJobs={recentJobs} onSelectJob={onSelectJob} embedded={true} />
    </div>
  );
}
