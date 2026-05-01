// AgentActivityLogTab — "Nhật ký" tab for agent detail page.
// Full session transcript: user messages, agent replies, tool calls, thinking.
// Reuses AgentLogDrawer turn-grouping logic inline.

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Loader2,
  MessageCircle,
  MessageSquare,
  Terminal,
  Timer,
  User,
  Wrench,
} from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { MarkdownBody } from '@/components/MarkdownBody';
import { cn } from '@/lib/utils';
import { api } from '@/api/client';

// ─── Activity API types (channel messages) ──────────────────────────
interface ActivityEntry {
  id: string;
  kind: 'inbound' | 'outbound' | 'follow-up';
  channel: string | null;
  channel_raw: string | null;
  sender: string | null;
  customer_name: string | null;
  body: string;
  preview: string;
  status: string;
  ts: string;
}

// ─── Session log types ──────────────────────────────────────────────
interface LogEvent {
  kind: 'user' | 'assistant' | 'hook' | 'result';
  ts?: string;
  text?: string;
  thinking?: string;
  thinkingRedacted?: boolean;
  tools?: Array<{ name: string; input: Record<string, any> }>;
  name?: string;
  event?: string;
  exitCode?: number;
  durationMs?: number;
}

interface LogResponse {
  slug: string;
  sessionId: string | null;
  totalLines?: number;
  events: LogEvent[];
  error?: string;
}

// ─── Turn grouping (same as AgentLogDrawer) ─────────────────────────
interface Turn {
  role: 'user' | 'agent' | 'system';
  ts?: string;
  userText?: string;
  messages: string[];
  thinkingBlocks: string[];
  thinkingRedacted: boolean;
  toolCalls: Array<{ name: string; input: Record<string, any> }>;
  hooks: LogEvent[];
  results: string[];
}

function groupIntoTurns(events: LogEvent[]): Turn[] {
  const turns: Turn[] = [];
  let current: Turn | null = null;

  function flush() { if (current) turns.push(current); current = null; }
  function newTurn(role: Turn['role'], ts?: string): Turn {
    return { role, ts, messages: [], thinkingBlocks: [], thinkingRedacted: false, toolCalls: [], hooks: [], results: [] };
  }

  for (const e of events) {
    if (e.kind === 'user') {
      flush();
      const t = newTurn('user', e.ts);
      t.userText = e.text || '';
      turns.push(t);
    } else if (e.kind === 'assistant') {
      if (!current || current.role !== 'agent') { flush(); current = newTurn('agent', e.ts); }
      if (e.thinking) current.thinkingBlocks.push(e.thinking);
      if (e.thinkingRedacted) current.thinkingRedacted = true;
      if (e.text) current.messages.push(e.text);
      if (e.tools) current.toolCalls.push(...e.tools);
    } else if (e.kind === 'hook') {
      if (current?.role === 'agent') current.hooks.push(e);
      else { flush(); const t = newTurn('system', e.ts); t.hooks.push(e); turns.push(t); }
    } else if (e.kind === 'result') {
      if (current?.role === 'agent') current.results.push(e.text || '');
    }
  }
  flush();
  return turns;
}

function toolLabel(t: { name: string; input: Record<string, any> }): { label: string; detail: string } {
  const { name, input } = t;
  if (name === 'Skill') return { label: `Skill: ${input.skill || '?'}`, detail: input.args || '' };
  if (name === 'Bash') return { label: `Bash${input.description ? `: ${input.description}` : ''}`, detail: input.command || '' };
  if (['Read', 'Edit', 'Write', 'Glob', 'Grep'].includes(name)) return { label: `${name}: ${input.file_path || input.path || input.pattern || ''}`, detail: '' };
  if (name.startsWith('mcp__')) return { label: `MCP: ${name.split('__').slice(2).join('__')}`, detail: String(input.query || input.sql || input.message || '').slice(0, 200) };
  return { label: name, detail: '' };
}

// ─── Turn components ────────────────────────────────────────────────

function UserTurnInline({ turn }: { turn: Turn }) {
  return (
    <div className="border-l-2 border-blue-500/40 pl-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">User</span>
        {turn.ts && <span className="text-[10px] text-muted-foreground font-mono ml-auto">{new Date(turn.ts).toLocaleTimeString('vi-VN')}</span>}
      </div>
      <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{turn.userText || ''}</MarkdownBody>
    </div>
  );
}

function AgentTurnInline({ turn, showThinking }: { turn: Turn; showThinking: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailCount = turn.toolCalls.length + turn.thinkingBlocks.length + turn.results.length + turn.hooks.length;

  return (
    <div className="border-l-2 border-emerald-500/40 pl-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Agent Reply</span>
        {turn.ts && <span className="text-[10px] text-muted-foreground font-mono ml-auto">{new Date(turn.ts).toLocaleTimeString('vi-VN')}</span>}
      </div>

      {turn.messages.map((msg, i) => (
        <div key={i} className="flex items-start gap-2">
          <MarkdownBody className="flex-1 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{msg}</MarkdownBody>
          <CopyButton text={msg} size={14} className="shrink-0 mt-0.5 opacity-30 hover:opacity-100" />
        </div>
      ))}

      {detailCount > 0 && (
        <div className="ml-2">
          <button type="button" className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setDetailsOpen(!detailsOpen)}>
            {detailsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="font-medium">{detailCount} details</span>
          </button>
          {detailsOpen && (
            <div className="mt-2 ml-4 space-y-1.5 border-l border-border/30 pl-3">
              {showThinking && turn.thinkingBlocks.map((t, i) => <CollapsibleItem key={`t${i}`} icon="thinking" label="Thinking" preview={t.split('\n')[0]?.slice(0, 100)} fullText={t} markdown />)}
              {turn.toolCalls.map((t, i) => { const info = toolLabel(t); return <CollapsibleItem key={`tool${i}`} icon="tool" label={info.label} preview="" fullText={info.detail || JSON.stringify(t.input, null, 2).slice(0, 500)} />; })}
              {turn.results.map((r, i) => <CollapsibleItem key={`r${i}`} icon="result" label="Result" preview={r.split('\n')[0]?.slice(0, 100)} fullText={r.slice(0, 2000)} />)}
              {turn.hooks.map((h, i) => <HookLine key={`h${i}`} event={h} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleItem({ icon, label, preview, fullText, markdown }: { icon: 'thinking' | 'tool' | 'result'; label: string; preview?: string; fullText: string; markdown?: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = icon === 'tool' ? Wrench : icon === 'result' ? Terminal : ChevronRight;
  return (
    <div>
      <button type="button" className="flex items-start gap-1.5 text-[11px] w-full text-left" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/40" />}
        {icon !== 'thinking' && <Icon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />}
        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">{label}</span>
        {!open && preview && <span className="text-muted-foreground/40 truncate flex-1">{preview}</span>}
      </button>
      {open && (
        markdown
          ? <div className="ml-4 mt-1"><MarkdownBody className="text-xs italic text-foreground/50 [&>*:first-child]:mt-0">{fullText}</MarkdownBody></div>
          : <pre className="ml-4 mt-1 text-[11px] font-mono text-muted-foreground/50 whitespace-pre-wrap break-words max-h-[200px] overflow-auto">{fullText}</pre>
      )}
    </div>
  );
}

function HookLine({ event }: { event: LogEvent }) {
  const ok = (event.exitCode ?? 0) === 0;
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {ok ? <Check className="h-3 w-3 shrink-0 text-emerald-600/60" /> : <CircleAlert className="h-3 w-3 shrink-0 text-red-500/60" />}
      <span className="font-semibold uppercase tracking-widest text-muted-foreground/50">{event.event || event.name}</span>
      <span className={cn('text-[10px] uppercase', ok ? 'text-emerald-600/50' : 'text-red-500/50')}>{ok ? 'OK' : `Exit ${event.exitCode}`}</span>
      {event.durationMs != null && <span className="text-[10px] text-muted-foreground/30 font-mono">({event.durationMs}ms)</span>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export function AgentActivityLogTab({ agentSlug }: { agentSlug: string }) {
  const [showThinking, setShowThinking] = useState(true);
  const [showHooks, setShowHooks] = useState(false);
  const [dataSource, setDataSource] = useState<'session' | 'channel'>('session');

  // Session log (full transcript with tools/thinking)
  const { data: logData, isLoading: logLoading } = useQuery<LogResponse>({
    queryKey: ['agent-log-tab', agentSlug],
    queryFn: async () => {
      const r = await fetch(`/api/channels/agent-configs/sessions/${agentSlug}/log?limit=200`);
      return r.json();
    },
    refetchInterval: 15_000,
    enabled: dataSource === 'session',
  });

  // Channel activity (messages only, for fallback)
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['agent-activity', agentSlug],
    queryFn: () => api.get<{ slug: string; total: number; items: ActivityEntry[] }>(
      `/channels/agent-configs/${encodeURIComponent(agentSlug)}/activity`
    ),
    refetchInterval: 15_000,
    enabled: dataSource === 'channel',
  });

  const turns = useMemo(() => {
    if (dataSource === 'session' && logData?.events) return groupIntoTurns(logData.events);
    return [];
  }, [dataSource, logData]);

  const channelItems = activityData?.items || [];
  const isLoading = dataSource === 'session' ? logLoading : activityLoading;
  const hasSessionData = !logData?.error && (logData?.events?.length ?? 0) > 0;

  // Auto-fallback to channel view if no session log
  const effectiveSource = dataSource === 'session' && !logLoading && !hasSessionData ? 'channel' : dataSource;

  // Channel groups by date
  const channelGroups = useMemo(() => {
    const groups = new Map<string, ActivityEntry[]>();
    for (const item of channelItems) {
      const date = new Date(item.ts).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      const arr = groups.get(date) || [];
      arr.push(item);
      groups.set(date, arr);
    }
    return groups;
  }, [channelItems]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button type="button" onClick={() => setDataSource('session')} className={cn('px-2.5 py-1 rounded text-[11px] font-medium transition-colors', dataSource === 'session' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            Session Log
          </button>
          <button type="button" onClick={() => setDataSource('channel')} className={cn('px-2.5 py-1 rounded text-[11px] font-medium transition-colors', dataSource === 'channel' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            Channel Messages
          </button>
        </div>
        {dataSource === 'session' && (
          <>
            <ToggleChip active={showThinking} onClick={() => setShowThinking(!showThinking)} label="Thinking" />
            <ToggleChip active={showHooks} onClick={() => setShowHooks(!showHooks)} label="Hooks" />
          </>
        )}
        {logData?.sessionId && dataSource === 'session' && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">
            {logData.sessionId.slice(0, 12)}… · {turns.length} turns
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {/* Session transcript view */}
      {effectiveSource === 'session' && !isLoading && turns.length > 0 && (
        <div className="space-y-1">
          {turns.map((turn, i) => {
            if (turn.role === 'user') return <UserTurnInline key={i} turn={turn} />;
            if (turn.role === 'agent') return <AgentTurnInline key={i} turn={turn} showThinking={showThinking} />;
            if (turn.role === 'system' && showHooks) return <div key={i} className="py-1">{turn.hooks.map((h, j) => <HookLine key={j} event={h} />)}</div>;
            return null;
          })}
        </div>
      )}

      {/* Channel messages view (fallback or explicit) */}
      {effectiveSource === 'channel' && !isLoading && (
        <>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{channelItems.length} entries</span>
            <span className="flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" />{channelItems.filter(i => i.kind === 'inbound').length} inbound</span>
            <span className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{channelItems.filter(i => i.kind === 'outbound').length} replies</span>
            <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{channelItems.filter(i => i.kind === 'follow-up').length} follow-ups</span>
          </div>

          {channelItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
              <MessageCircle className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground/60">No channel activity yet</p>
            </div>
          )}

          {[...channelGroups.entries()].map(([date, entries]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5 mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">{date}</div>
              </div>
              <div className="space-y-1.5">
                {entries.map((entry) => <ChannelActivityRow key={entry.id} entry={entry} />)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* No data at all */}
      {!isLoading && effectiveSource === 'session' && turns.length === 0 && channelItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
          <MessageCircle className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/60">No activity yet</p>
        </div>
      )}
    </div>
  );
}

// ─── Channel message row (for channel view) ─────────────────────────

const KIND_META = {
  inbound: { icon: ArrowDownLeft, label: 'INBOUND' },
  outbound: { icon: ArrowUpRight, label: 'REPLY' },
  'follow-up': { icon: Timer, label: 'FOLLOW-UP' },
} as const;

function ChannelActivityRow({ entry }: { entry: ActivityEntry }) {
  const [open, setOpen] = useState(false);
  const kind = KIND_META[entry.kind] || KIND_META.inbound;
  const KindIcon = kind.icon;
  const isFailed = entry.status === 'failed';
  const statusTone = isFailed ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300';

  return (
    <div className={cn(isFailed && 'rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3')}>
      <div role="button" tabIndex={0} className="flex items-start gap-2 cursor-pointer select-none" onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(!open); }}>
        {isFailed ? <CircleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" /> : <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600/60" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kind.label}</span>
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', statusTone)}>{isFailed ? 'Failed' : 'Done'}</span>
            {entry.channel && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 border border-border/40">{entry.channel}</span>}
            {(entry.customer_name || entry.sender) && <span className="text-[10px] text-muted-foreground">{entry.customer_name || entry.sender}</span>}
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono shrink-0">{new Date(entry.ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {!open && <p className="mt-1 text-xs text-foreground/70 truncate leading-5">{entry.preview || '—'}</p>}
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />}
      </div>
      {open && (
        <div className="mt-2 ml-5 space-y-2">
          <div className="flex items-start gap-2">
            <MarkdownBody className="flex-1 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{entry.body || '—'}</MarkdownBody>
            <CopyButton text={entry.body || ''} size={14} className="shrink-0 mt-0.5 opacity-40 hover:opacity-100" />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 font-mono">
            <span>{entry.id.substring(0, 8)}</span>
            {entry.channel_raw && <span>{entry.channel_raw}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('px-2 py-1 rounded text-[11px] font-medium transition-colors', active ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground/50 hover:text-muted-foreground')}>
      {label}
    </button>
  );
}
