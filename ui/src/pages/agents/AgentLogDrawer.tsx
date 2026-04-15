// Agent session log drawer — Claude Agent Teams UI pattern.
// Per-section collapsible items, merged thinking, customer name extraction.

import { useEffect, useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, RefreshCw, ChevronRight, ChevronDown,
  User, Wrench, CircleAlert, Check, Loader2,
  Brain, Zap, Bot, MessageSquare, FileText,
  ListChecks, Image, Mail, AlertTriangle, Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownBody } from '@/components/MarkdownBody';
import { CopyButton } from '@/components/CopyButton';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
interface LogEvent {
  kind: 'user' | 'assistant' | 'hook' | 'result'; ts?: string; text?: string;
  thinking?: string; thinkingRedacted?: boolean;
  tools?: Array<{ name: string; input: Record<string, any> }>;
  name?: string; event?: string; exitCode?: number; durationMs?: number;
  command?: string; stdout?: string;
}
interface LogResponse { slug: string; sessionId: string | null; file?: string; fileKind?: 'claude-jsonl' | 'gemini-json'; totalLines?: number; events: LogEvent[]; error?: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  agentSlug: string;
  sessionId?: string | null;
  contextLabel?: string;
}

// ─── Turn grouping ──────────────────────────────────────────────────
interface Turn {
  role: 'user' | 'agent' | 'system'; ts?: string; userText?: string;
  messages: string[]; thinkingBlocks: string[]; thinkingRedacted: boolean;
  toolCalls: Array<{ name: string; input: Record<string, any> }>; hooks: LogEvent[]; results: string[];
}

function groupIntoTurns(events: LogEvent[]): Turn[] {
  const turns: Turn[] = []; let cur: Turn | null = null;
  let seenFirstMessage = false;
  function flush() { if (cur) { /* Merge consecutive thinking */ if (cur.thinkingBlocks.length > 1) cur.thinkingBlocks = [cur.thinkingBlocks.join('\n\n---\n\n')]; turns.push(cur); } cur = null; }
  function make(role: Turn['role'], ts?: string): Turn { return { role, ts, messages: [], thinkingBlocks: [], thinkingRedacted: false, toolCalls: [], hooks: [], results: [] }; }
  for (const e of events) {
    if (e.kind === 'user') { seenFirstMessage = true; flush(); const t = make('user', e.ts); t.userText = e.text || ''; turns.push(t); }
    else if (e.kind === 'assistant') {
      seenFirstMessage = true;
      if (!cur || cur.role !== 'agent') { flush(); cur = make('agent', e.ts); }
      if (e.thinking) cur.thinkingBlocks.push(e.thinking);
      if (e.thinkingRedacted) cur.thinkingRedacted = true;
      if (e.text) cur.messages.push(e.text);
      if (e.tools) cur.toolCalls.push(...e.tools);
    } else if (e.kind === 'hook') {
      // Skip SessionStart hooks before first message (rendered as SessionInvocation instead)
      if (!seenFirstMessage && e.event === 'SessionStart') continue;
      if (cur?.role === 'agent') cur.hooks.push(e);
      else { flush(); const t = make('system', e.ts); t.hooks.push(e); turns.push(t); }
    } else if (e.kind === 'result') { if (cur?.role === 'agent') cur.results.push(e.text || ''); }
  }
  flush(); return turns;
}

function fmtTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} ${time}`;
}

// ─── Parse SessionStart invocation (Paperclip runs Invocation pattern) ──
interface SessionInvocation {
  sessionId?: string; cwd?: string; transcriptPath?: string;
  additionalContext?: string; systemMessage?: string;
  previousSummary?: string;
  command?: string; commandNotes?: string;
  model?: string; prompt?: string;
  projectMemory?: string;
  rawStdout?: string;
  ts?: string;
  durationMs?: number;
}

function parseSessionInvocation(hooks: LogEvent[]): SessionInvocation {
  const inv: SessionInvocation = {};
  for (const h of hooks) {
    if (h.event !== 'SessionStart' || !h.stdout) continue;
    inv.ts = inv.ts || h.ts;
    inv.command = inv.command || h.command;
    inv.durationMs = inv.durationMs ?? h.durationMs;
    try {
      const parsed = JSON.parse(h.stdout);
      if (parsed.session_id) inv.sessionId = parsed.session_id;
      if (parsed.cwd) inv.cwd = parsed.cwd;
      if (parsed.transcript_path) inv.transcriptPath = parsed.transcript_path;
      if (parsed.systemMessage) inv.systemMessage = parsed.systemMessage;
      if (parsed.hookSpecificOutput?.additionalContext) {
        const ctx = parsed.hookSpecificOutput.additionalContext;
        if (ctx.includes('Previous session summary:')) {
          inv.previousSummary = (inv.previousSummary || '') + '\n' + ctx;
        } else {
          inv.additionalContext = (inv.additionalContext || '') + '\n\n' + ctx;
        }
      }
      inv.rawStdout = (inv.rawStdout || '') + h.stdout + '\n';
    } catch {
      // Plain text stdout
      if (h.stdout.trim().startsWith('SESSION START')) {
        inv.projectMemory = (inv.projectMemory || '') + h.stdout;
      } else {
        inv.rawStdout = (inv.rawStdout || '') + h.stdout + '\n';
      }
    }
  }
  return inv;
}

// ─── SessionInvocation card (Paperclip runs Invocation style) ────────
function SessionInvocationBlock({ inv, agentSlug }: { inv: SessionInvocation; agentSlug: string }) {
  const sections: Array<{ label: string; value: string; open?: boolean }> = [];
  if (inv.sessionId) sections.push({ label: 'Session ID', value: inv.sessionId });
  if (inv.cwd) sections.push({ label: 'Working Directory', value: inv.cwd });
  if (inv.transcriptPath) sections.push({ label: 'Transcript Path', value: inv.transcriptPath });
  if (inv.command) sections.push({ label: 'Command', value: inv.command });
  if (inv.systemMessage) sections.push({ label: 'System Message', value: inv.systemMessage });
  if (inv.previousSummary) sections.push({ label: 'Previous Session Summary', value: inv.previousSummary });
  if (inv.additionalContext) sections.push({ label: 'Additional Context', value: inv.additionalContext });
  if (inv.projectMemory) sections.push({ label: 'Project Memory', value: inv.projectMemory });

  if (sections.length === 0) return null;

  const preview = inv.sessionId ? `${inv.sessionId.slice(0, 12)}… · ${sections.length} fields` : `${sections.length} fields`;

  return (
    <BaseItem
      icon={<Zap className="size-4 text-emerald-500" />}
      label="Session Invocation"
      summary={preview}
      durationMs={inv.durationMs}
      ts={inv.ts}
      copyText={inv.rawStdout}
    >
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground/70">
          Agent: <span className="font-mono font-medium text-foreground/70">{agentSlug}</span>
        </div>
        {sections.map((sec, i) => (
          <BaseItem key={i} icon={<FileText className="size-4" />} label={sec.label} summary={sec.value.trim().split('\n')[0]?.slice(0, 100)} copyText={sec.value}>
            <pre className="max-h-60 overflow-auto rounded p-3 font-mono text-[12px] text-foreground/70 whitespace-pre-wrap break-all" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
              {sec.value.slice(0, 3000)}
            </pre>
          </BaseItem>
        ))}
      </div>
    </BaseItem>
  );
}

// ─── Parse user message into sections ───────────────────────────────
interface UserSection { label: string; icon: typeof User; body: string; }

function parseUserSections(text: string): { customerName: string; channel: string; sections: UserSection[] } {
  let customerName = 'Customer';
  let channel = '';

  // Extract customer name and channel from [Khách: NAME · type · channel-id]
  const khachMatch = text.match(/\[Khách:\s*([^\]·]+)/);
  if (khachMatch) customerName = khachMatch[1].trim();
  const channelMatch = text.match(/\[Khách:[^\]]*·\s*\w+\s*·\s*(\S+)/);
  if (channelMatch) channel = channelMatch[1];

  // Split by section markers
  const sectionDefs: Array<{ marker: RegExp; label: string; icon: typeof User }> = [
    { marker: /\[Khách:[^\]]*\]\s*/i, label: 'Khách hàng', icon: User },
    { marker: /\[HỒ SƠ KHÁCH HÀNG[^\]]*\]/i, label: 'Hồ sơ khách hàng', icon: FileText },
    { marker: /\[TÓM TẮT AI\]/i, label: 'Tóm tắt AI', icon: Brain },
    { marker: /\[HƯỚNG DẪN TOOLS?\]/i, label: 'Hướng dẫn Tools', icon: ListChecks },
    { marker: /\[TIN NHẮN MỚI\]/i, label: 'Tin nhắn mới', icon: Mail },
  ];

  const sections: UserSection[] = [];
  let remaining = text;

  // Try to split by markers
  for (const def of sectionDefs) {
    const match = remaining.match(def.marker);
    if (match && match.index !== undefined) {
      remaining = remaining.slice(match.index + match[0].length);

      // Find next marker
      let nextIdx = remaining.length;
      for (const other of sectionDefs) {
        const nm = remaining.match(other.marker);
        if (nm?.index !== undefined && nm.index < nextIdx) nextIdx = nm.index;
      }

      const body = remaining.slice(0, nextIdx).trim();
      remaining = remaining.slice(nextIdx);

      if (body) sections.push({ label: def.label, icon: def.icon, body });
    }
  }

  // If no sections found, just use full text
  if (sections.length === 0 && text.trim()) {
    sections.push({ label: 'Tin nhắn', icon: Mail, body: text.trim() });
  }

  return { customerName, channel, sections };
}

// ─── Parse agent message for SEND_MEDIA markers ────────────────────
type AgentSection = { type: 'text' | 'media' | 'escalation' | 'ticket'; body: string; mediaRef?: string };

function parseAgentSections(messages: string[]): AgentSection[] {
  const result: AgentSection[] = [];
  for (const msg of messages) {
    // Split by SEND_MEDIA markers first
    const parts = msg.split(/(\[\[SEND_MEDIA:\s*[^\]]+\]\])/);
    for (const part of parts) {
      const mediaMatch = part.match(/\[\[SEND_MEDIA:\s*([^\]]+)\]\]/);
      if (mediaMatch) {
        result.push({ type: 'media', body: part, mediaRef: mediaMatch[1].trim() });
      } else if (part.trim()) {
        const trimmed = part.trim();
        // Detect escalation / ticket markers
        if (/^🚨\s*ESCALATION\s*TRIGGERED/im.test(trimmed) || /ESCALATION\s*TRIGGERED/i.test(trimmed)) {
          result.push({ type: 'escalation', body: trimmed });
        } else if (/^✓\s*Ticket created/im.test(trimmed) || /Ticket created:/i.test(trimmed)) {
          result.push({ type: 'ticket', body: trimmed });
        } else {
          result.push({ type: 'text', body: trimmed });
        }
      }
    }
  }
  return result;
}

function tName(t: { name: string; input: Record<string, any> }): string {
  const { name, input } = t;
  if (name === 'Skill') return `Skill: ${input.skill || '?'}`;
  if (name === 'Bash') return `Bash${input.description ? `: ${input.description}` : ''}`;
  if (['Read', 'Edit', 'Write', 'Glob', 'Grep'].includes(name)) return `${name}: ${input.file_path || input.path || input.pattern || ''}`;
  if (name.startsWith('mcp__')) return `MCP: ${name.split('__').slice(2).join('__')}`;
  return name;
}

// Render tool input as key-value pairs (Claude Teams pattern)
function ToolInputRender({ t }: { t: { name: string; input: Record<string, any> } }) {
  const { name, input } = t;

  // Bash: show command + description
  if (name === 'Bash') {
    return (
      <div className="space-y-2">
        {input.description && <div className="text-xs text-muted-foreground">{input.description}</div>}
        {input.command && (
          <pre className="whitespace-pre-wrap break-all font-mono text-[13px] text-foreground/80">{input.command}</pre>
        )}
      </div>
    );
  }

  // Edit: show diff
  if (name === 'Edit' && input.old_string) {
    return (
      <div className="space-y-2">
        {input.file_path && <div className="text-xs text-muted-foreground">{input.file_path}</div>}
        <div className="whitespace-pre-wrap break-all text-[13px] text-red-600 dark:text-red-400">
          {String(input.old_string).split('\n').map((l: string, i: number) => <div key={i}>- {l}</div>)}
        </div>
        <div className="whitespace-pre-wrap break-all text-[13px] text-emerald-600 dark:text-emerald-400">
          {String(input.new_string || '').split('\n').map((l: string, i: number) => <div key={i}>+ {l}</div>)}
        </div>
      </div>
    );
  }

  // Default: key-value format — show ALL fields
  const entries = Object.entries(input);
  if (entries.length === 0) return <div className="text-xs text-muted-foreground italic">(no input)</div>;

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">{key}</div>
          <pre className="whitespace-pre-wrap break-all text-[13px] text-foreground/80 font-mono">
            {typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ─── BaseItem ───────────────────────────────────────────────────────

function BaseItem({ icon, label, summary, statusOk, durationMs, ts, children, defaultOpen, highlight, copyText }: {
  icon: React.ReactNode; label: string; summary?: string;
  statusOk?: boolean; durationMs?: number; ts?: string;
  children?: React.ReactNode; defaultOpen?: boolean; highlight?: boolean; copyText?: string;
}) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  const has = !!children;

  return (
    <div className={cn('rounded transition-all duration-200 group', highlight && 'bg-accent/30')}>
      <div
        role="button" tabIndex={0}
        onClick={() => has && setExpanded(!expanded)}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && has) { e.preventDefault(); setExpanded(!expanded); } }}
        className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 transition-colors', has ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default')}
      >
        <span className="size-4 shrink-0 text-muted-foreground/60">{icon}</span>
        <span className="shrink-0 text-sm font-medium text-foreground/80">{label}</span>
        {summary ? (<><span className="shrink-0 text-sm text-muted-foreground/30">-</span><span className="flex-1 truncate text-sm text-muted-foreground/50">{summary}</span></>) : <span className="flex-1" />}
        {copyText && (
          <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <CopyButton text={copyText} size={12} />
          </span>
        )}
        {statusOk !== undefined && <span className={cn('inline-block size-1.5 shrink-0 rounded-full', statusOk ? 'bg-emerald-500' : 'bg-red-500')} />}
        {durationMs != null && <span className="shrink-0 text-xs text-muted-foreground/40">{durationMs}ms</span>}
        {ts && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/40">{fmtTime(ts)}</span>}
        {has && <ChevronRight className={cn('size-3 shrink-0 text-muted-foreground/30 transition-transform duration-200', expanded && 'rotate-90')} />}
      </div>
      {expanded && children && <div className="ml-2 mt-2 min-w-0 space-y-3 pl-6 border-l-2 border-border">{children}</div>}
    </div>
  );
}

// NestedOutputSection — collapsible output inside a tool BaseItem
function NestedOutputSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isError = text.includes('"error"') || text.includes('"success":false');
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}
        className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span>Output</span>
        <span className={cn('inline-block size-1.5 rounded-full', isError ? 'bg-red-500' : 'bg-emerald-500')} />
      </button>
      {open && (
        <div className="max-h-96 overflow-auto rounded p-3" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
          <pre className="whitespace-pre-wrap break-all font-mono text-[13px] text-foreground/80">{text.slice(0, 2000)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── User Turn ──────────────────────────────────────────────────────

function UserTurnBlock({ turn }: { turn: Turn }) {
  const [expanded, setExpanded] = useState(true);
  const { customerName, channel, sections } = useMemo(() => parseUserSections(turn.userText || ''), [turn.userText]);

  return (
    <div className="space-y-1 border-l-2 border-blue-500/30 pl-3 py-2">
      {/* Header */}
      <div role="button" tabIndex={0} onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        className="group flex w-full min-w-0 cursor-pointer items-center gap-2">
        <User className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">{customerName}</span>
        {channel && <span className="shrink-0 rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">{channel.includes('zalo') ? 'Zalo' : channel.includes('facebook') ? 'Facebook' : channel}</span>}
        <span className="shrink-0 text-xs text-muted-foreground/30">·</span>
        <span className="flex-1 truncate text-xs text-muted-foreground/40">{sections.length} sections</span>
        {turn.ts && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/40">{fmtTime(turn.ts)}</span>}
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground/30 transition-transform duration-200', expanded ? 'rotate-0' : '-rotate-90')} />
      </div>

      {/* Sections as BaseItems */}
      {expanded && (
        <div className="min-w-0 space-y-1 py-1 pl-2">
          {sections.map((sec, i) => {
            const isMessage = sec.label === 'Tin nhắn mới';
            return (
              <BaseItem key={i} icon={<sec.icon className="size-4" />} label={sec.label} summary={sec.body.split('\n')[0]?.slice(0, 120)} defaultOpen={isMessage} highlight={isMessage} copyText={sec.body}>
                <div className="max-h-[32rem] overflow-auto rounded p-3" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{sec.body}</MarkdownBody>
                </div>
              </BaseItem>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Agent Turn ─────────────────────────────────────────────────────

function AgentTurnBlock({ turn, showThinking, showHooks, showResults, agentSlug }: {
  turn: Turn; showThinking: boolean; showHooks: boolean; showResults: boolean; agentSlug: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const itemsSummary = [
    turn.thinkingBlocks.length && `${turn.thinkingBlocks.length} thinking`,
    turn.toolCalls.length && `${turn.toolCalls.length} tool calls`,
    turn.messages.length && `${turn.messages.length} messages`,
  ].filter(Boolean).join(', ');

  const agentSections = useMemo(() => parseAgentSections(turn.messages), [turn.messages]);

  return (
    <div className="space-y-1 border-l-2 border-emerald-500/30 pl-3 py-2">
      {/* Header */}
      <div role="button" tabIndex={0} onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        className="group flex w-full min-w-0 cursor-pointer items-center gap-2">
        <Bot className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{agentSlug}</span>
        <span className="shrink-0 text-xs text-muted-foreground/30">·</span>
        <span className="flex-1 truncate text-xs text-muted-foreground/40">{itemsSummary}</span>
        {turn.ts && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/40">{fmtTime(turn.ts)}</span>}
        <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground/30 transition-transform duration-200', expanded ? 'rotate-0' : '-rotate-90')} />
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="min-w-0 space-y-1 py-1 pl-2">
          {/* Thinking (merged) */}
          {showThinking && turn.thinkingBlocks.map((text, i) => (
            <BaseItem key={`t-${i}`} icon={<Brain className="size-4" />} label="Thinking" summary={text.split('\n')[0]?.slice(0, 150)}>
              <MarkdownBody className="max-h-96 overflow-auto text-sm italic text-foreground/50 [&>*:first-child]:mt-0">{text}</MarkdownBody>
            </BaseItem>
          ))}

          {/* Tool calls — each has Input + collapsible Output nested inside */}
          {turn.toolCalls.map((t, i) => {
            const matchedResult = showResults && turn.results[i] ? turn.results[i] : null;
            return (
              <BaseItem key={`tool-${i}`} icon={<Wrench className="size-4" />} label={tName(t)} copyText={JSON.stringify(t.input, null, 2)}>
                {/* Input section */}
                <div>
                  <div className="mb-1.5 text-[13px] font-medium text-foreground/60">Input</div>
                  <div className="max-h-96 overflow-auto rounded p-3" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                    <ToolInputRender t={t} />
                  </div>
                </div>
                {/* Output nested inside tool — collapsible */}
                {matchedResult && <NestedOutputSection text={matchedResult} />}
              </BaseItem>
            );
          })}

          {/* Standalone results (not matched to tool) */}
          {showResults && turn.results.slice(turn.toolCalls.length).map((r, i) => (
            <BaseItem key={`r-${i}`} icon={<MessageSquare className="size-4" />} label="Output" summary={r.split('\n')[0]?.slice(0, 100)} statusOk copyText={r}>
              <pre className="max-h-96 overflow-auto rounded p-3 font-mono text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                {r.slice(0, 2000)}
              </pre>
            </BaseItem>
          ))}

          {/* Hooks */}
          {showHooks && turn.hooks.filter(h => h.durationMs || h.command || h.stdout).map((h, i) => {
            const ok = (h.exitCode ?? 0) === 0;
            return (
              <BaseItem key={`h-${i}`} icon={ok ? <Check className="size-4 text-emerald-500/60" /> : <CircleAlert className="size-4 text-red-500/60" />}
                label={h.event || h.name || 'hook'} statusOk={ok} durationMs={h.durationMs ?? undefined}>
                {h.command && <pre className="text-[13px] font-mono text-foreground/60">$ {h.command}</pre>}
                {h.stdout && h.stdout !== '{}' && <pre className="text-[13px] font-mono text-foreground/50 whitespace-pre-wrap break-words">{h.stdout.slice(0, 300)}</pre>}
              </BaseItem>
            );
          })}

          {/* Agent messages — BaseItems with SEND_MEDIA + escalation parsed */}
          {agentSections.map((sec, i) => (
            sec.type === 'media' ? (
              <BaseItem key={`msg-${i}`} icon={<Image className="size-4" />} label="Send Media" summary={sec.mediaRef} defaultOpen copyText={sec.body}>
                <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{sec.body}</MarkdownBody>
              </BaseItem>
            ) : sec.type === 'escalation' ? (
              <BaseItem key={`msg-${i}`} icon={<AlertTriangle className="size-4 text-orange-500" />} label="ESCALATION TRIGGERED" summary={sec.body.split('\n')[0]?.slice(0, 120)} defaultOpen copyText={sec.body}>
                <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{sec.body}</MarkdownBody>
              </BaseItem>
            ) : sec.type === 'ticket' ? (
              <BaseItem key={`msg-${i}`} icon={<Ticket className="size-4 text-blue-500" />} label="Ticket Created" summary={sec.body.split('\n')[0]?.slice(0, 120)} defaultOpen copyText={sec.body}>
                <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{sec.body}</MarkdownBody>
              </BaseItem>
            ) : (
              <BaseItem key={`msg-${i}`} icon={<MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />} label="Agent Reply" summary={sec.body.split('\n').find(l => l.trim())?.slice(0, 120)} defaultOpen highlight copyText={sec.body}>
                <div className="max-h-[32rem] overflow-auto rounded p-3" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <MarkdownBody className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{sec.body}</MarkdownBody>
                </div>
              </BaseItem>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ─── System Turn ────────────────────────────────────────────────────

function SystemTurnBlock({ turn }: { turn: Turn }) {
  const meaningful = turn.hooks.filter(h => h.durationMs || h.command || h.stdout);
  if (meaningful.length === 0) return null;
  return (
    <div className="py-1 pl-3">
      {meaningful.map((h, i) => {
        const ok = (h.exitCode ?? 0) === 0;
        return <BaseItem key={i} icon={ok ? <Check className="size-4 text-emerald-500/50" /> : <CircleAlert className="size-4 text-red-500/50" />}
          label={h.event || h.name || 'hook'} statusOk={ok} durationMs={h.durationMs ?? undefined} />;
      })}
    </div>
  );
}

// ─── Main Drawer ────────────────────────────────────────────────────

export function AgentLogDrawer({ open, onClose, agentSlug, sessionId, contextLabel }: Props) {
  const [showThinking, setShowThinking] = useState(true);
  const [showHooks, setShowHooks] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<LogResponse>({
    queryKey: ['agent-log', agentSlug, sessionId],
    queryFn: async () => { const p = new URLSearchParams(); p.set('limit', '200'); if (sessionId) p.set('session_id', sessionId); return (await fetch(`/api/channels/agent-configs/sessions/${agentSlug}/log?${p}`)).json(); },
    enabled: open, refetchInterval: autoRefresh && open ? 3000 : false,
  });

  const turns = useMemo(() => groupIntoTurns(data?.events || []), [data?.events]);

  const invocation = useMemo(() => {
    // Collect ALL SessionStart hooks from events — they contain metadata
    const events = data?.events || [];
    const sessionStartHooks = events.filter(e => e.kind === 'hook' && e.event === 'SessionStart');
    return parseSessionInvocation(sessionStartHooks);
  }, [data?.events]);

  useEffect(() => { if (autoRefresh && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [turns.length, autoRefresh]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[88vh] bg-background rounded-2xl border shadow-2xl flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Session: <span className="font-mono text-foreground/70">{agentSlug}</span></h2>
              {contextLabel && <p className="text-[11px] text-muted-foreground/50">{contextLabel}</p>}
              {data?.sessionId && (
                <p className="text-[10px] text-muted-foreground/40 font-mono">
                  {data.sessionId.slice(0, 12)}… · {data.totalLines} {data.fileKind === 'gemini-json' ? 'msgs' : 'lines'} · {turns.length} turns
                  {data.fileKind && <span className="ml-2 px-1 py-0.5 rounded bg-muted text-[9px] uppercase">{data.fileKind.replace('-', ' ')}</span>}
                </p>
              )}
              {data?.fileKind === 'gemini-json' && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                  ⚠ Gemini session — không log thinking/tool calls/hooks (chỉ text đối thoại)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-8 w-8"><RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /></Button>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-2 border-b flex flex-wrap gap-2 items-center shrink-0">
          <Chip active={showThinking} onClick={() => setShowThinking(!showThinking)} label="Thinking" />
          <Chip active={showHooks} onClick={() => setShowHooks(!showHooks)} label="Hooks" />
          <Chip active={showResults} onClick={() => setShowResults(!showResults)} label="Results" />
          <div className="flex-1" />
          <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer select-none',
            autoRefresh ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground/50')}
            onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>}
            {autoRefresh ? 'Live' : 'Paused'}
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-3">
          {isLoading && <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Loading...</span></div>}
          {!isLoading && data?.error && <div className="py-12 text-center"><CircleAlert className="h-5 w-5 mx-auto mb-2 text-destructive/60" /><p className="text-sm text-destructive">{data.error}</p></div>}
          {!isLoading && !data?.error && turns.length === 0 && <div className="py-12 text-center text-muted-foreground/40"><p className="text-sm">No events.</p></div>}
          {/* Session Invocation — Paperclip runs style */}
          {turns.length > 0 && (invocation.sessionId || invocation.cwd || invocation.additionalContext || data?.sessionId) && (
            <div className="mb-3">
              <SessionInvocationBlock
                inv={{
                  ...invocation,
                  sessionId: invocation.sessionId || data?.sessionId || undefined,
                }}
                agentSlug={agentSlug}
              />
            </div>
          )}

          {turns.length > 0 && (
            <div className="space-y-1">
              {turns.map((t, i) => {
                // Session boundary detection: time gap > 10 min between turns
                const prev = i > 0 ? turns[i - 1] : null;
                const showBoundary = prev && prev.ts && t.ts && (new Date(t.ts).getTime() - new Date(prev.ts).getTime() > 10 * 60 * 1000);
                const gapMinutes = showBoundary && prev && prev.ts && t.ts ? Math.floor((new Date(t.ts).getTime() - new Date(prev.ts!).getTime()) / 60000) : 0;

                return (
                  <div key={i}>
                    {showBoundary && (
                      <div className="flex items-center gap-3 my-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        <div className="flex-1 h-px bg-border/50" />
                        <span>── New Session · Gap {gapMinutes}m ──</span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                    )}
                    {t.role === 'user' && <UserTurnBlock turn={t} />}
                    {t.role === 'agent' && <AgentTurnBlock turn={t} showThinking={showThinking} showHooks={showHooks} showResults={showResults} agentSlug={agentSlug} />}
                    {t.role === 'system' && showHooks && <SystemTurnBlock turn={t} />}
                  </div>
                );
              })}
            </div>
          )}
          {autoRefresh && turns.length > 0 && (
            <div className="py-6 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Session is in progress...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={cn('px-3 py-1 rounded-full text-[11px] font-medium transition-all border',
    active ? 'bg-foreground/5 text-foreground border-border/60' : 'text-muted-foreground/40 border-transparent hover:text-muted-foreground/60')}>{label}</button>;
}
