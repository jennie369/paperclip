// StepComposer — inline Composer inside Workflow Step cards.
//
// Phase 10 / parent plan §659-672 (2026-04-10):
// Each agent-typed step in SopStepsEditor gets a collapsible Composer panel
// at the bottom so Jennie can send a test message to the assigned agent and
// see the reply inline — without leaving SOP Engine page.
//
// Features:
// - Textarea + Send button
// - Stable session key `sop-composer:{stepId}:{sessionId}` so multi-turn
//   conversation persists across Send clicks (instinct: stable-session-key-for-agent-history)
// - Conversation history displayed inline as chat bubbles
// - AbortController cancel (instinct: cancel-controller-three-checkpoints)
// - Uses existing /api/channels/agent-configs/:slug/test endpoint
//
// NOTE on WebSocket streaming: the existing agent-configs/test endpoint
// returns a single JSON reply (not SSE). For Phase 10 MVP I use the simple
// JSON response. True streaming can be added later by extending the endpoint
// to emit SSE chunks — NOT needed for the "talk to agent inline" use case.

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Trash2, Bot, User, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface Turn {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  error?: boolean;
}

interface StepComposerProps {
  agentSlug: string;
  stepId: string;
  stepLabel?: string;
  defaultCollapsed?: boolean;
}

// Session keys are scoped per step so reopening the composer continues the
// same conversation with the agent. Persisted to sessionStorage so page
// refresh doesn't reset mid-conversation.
function getSessionKey(stepId: string): string {
  const storageKey = `sop-composer-session:${stepId}`;
  let sid = typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) : null;
  if (!sid) {
    sid = `${stepId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== 'undefined') window.sessionStorage.setItem(storageKey, sid);
  }
  return `sop-composer:${stepId}:${sid}`;
}

export function StepComposer({ agentSlug, stepId, stepLabel, defaultCollapsed = true }: StepComposerProps) {
  const { pushToast } = useToast();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const sessionKey = useMemo(() => getSessionKey(stepId), [stepId]);

  // Auto-scroll to bottom when new turns arrive
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [turns]);

  // Cancel in-flight request if component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !agentSlug) return;

    // Checkpoint #1 — before turn starts
    const userTurn: Turn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);
    setText('');
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/channels/agent-configs/${agentSlug}/test`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-training-session-id': sessionKey,
        },
        body: JSON.stringify({ message: trimmed, contentType: 'text' }),
      });

      // Checkpoint #2 — after fetch
      if (controller.signal.aborted) return;

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Checkpoint #3 — before persisting reply
      if (controller.signal.aborted) return;

      const reply = data.reply || data.response || data.message || '(empty reply)';
      const agentTurn: Turn = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, agentTurn]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setTurns((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'agent',
          text: `❌ ${err.message}`,
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
      pushToast({ title: 'Send thất bại', body: err.message, tone: 'error' });
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const handleClear = () => {
    // New session — reset storage to get a fresh sessionKey on next send
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(`sop-composer-session:${stepId}`);
    }
    setTurns([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-3 border border-border rounded-md bg-muted/20">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-accent/30 text-xs"
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        <Bot className="size-3 text-primary" />
        <span className="font-semibold text-foreground">Composer</span>
        <span className="text-muted-foreground">→ talk to</span>
        <code className="font-mono text-primary">{agentSlug || '(no agent)'}</code>
        {turns.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{turns.length} turns</span>
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-border">
          {/* Conversation body */}
          <div
            ref={bodyRef}
            className="max-h-64 overflow-y-auto p-3 space-y-2 text-xs"
          >
            {turns.length === 0 && (
              <div className="text-muted-foreground italic text-center py-4">
                Chưa có tin nhắn. Gõ gì đó và bấm Send để thử agent này.
              </div>
            )}
            {turns.map((t) => (
              <div key={t.id} className={`flex gap-2 ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {t.role === 'agent' && (
                  <div className="shrink-0 size-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="size-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-1.5 rounded-lg ${
                    t.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : t.error
                        ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                        : 'bg-background border border-border text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{t.text}</div>
                  <div className="text-[9px] opacity-60 mt-0.5">
                    {new Date(t.timestamp).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
                {t.role === 'user' && (
                  <div className="shrink-0 size-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="size-3" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <Loader2 className="size-3 animate-spin" />
                Agent đang suy nghĩ...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-2 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Nhắn cho ${agentSlug || 'agent'}... (Ctrl+Enter để gửi)`}
              rows={2}
              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground resize-y min-h-[40px] focus:border-ring outline-none"
              disabled={sending}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending || !agentSlug}
                className="p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-40"
                title="Gửi (Ctrl+Enter)"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </button>
              {turns.length > 0 && (
                <button
                  onClick={handleClear}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                  title="Xóa hội thoại + reset session"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StepComposer;
