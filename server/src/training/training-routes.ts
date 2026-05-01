// Training Room REST + WebSocket routes.
//
// REST endpoints:
//   POST   /api/training/start    { agent_slug, scenario, max_turns?, ceo_model? }
//   POST   /api/training/cancel   { session_id }
//   GET    /api/training/sessions                    — list recent sessions
//   GET    /api/training/sessions/:id                — single session detail
//   GET    /api/training/sessions/:id/turns          — turn-by-turn transcript
//   GET    /api/training/sessions/:id/scores         — Opus rubric scores
//   GET    /api/training/audit-log                   — agent_tool_audit_log (Tool Audit UI)
//   GET    /api/training/audit-log?agent=...&limit=... — filtered
//
// WebSocket:
//   /api/training/live/:session_id   — broadcast every TrainingEvent for that
//     session as JSON. Client subscribes once, receives turn_no/role/content
//     for each turn as it happens.

import { Router, type Request, type Response } from 'express';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { trainingOrchestrator, type TrainingEvent } from './training-orchestrator.js';
import { supabase } from '../channels/zalo-personal/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// REST router
// ─────────────────────────────────────────────────────────────────────────────

export const trainingRouter = Router();

trainingRouter.post('/start', async (req: Request, res: Response) => {
  const { agent_slug, scenario, max_turns, ceo_model } = req.body || {};
  if (!agent_slug || typeof agent_slug !== 'string') {
    return res.status(400).json({ error: 'agent_slug required' });
  }
  if (!scenario || typeof scenario !== 'string') {
    return res.status(400).json({ error: 'scenario required' });
  }

  try {
    const { sessionId } = await trainingOrchestrator.startSession({
      agentSlug: agent_slug,
      scenario,
      maxTurns: typeof max_turns === 'number' ? max_turns : undefined,
      ceoModel: typeof ceo_model === 'string' ? ceo_model : undefined,
    });
    res.json({ session_id: sessionId, status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start training' });
  }
});

trainingRouter.post('/cancel', (req: Request, res: Response) => {
  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  const ok = trainingOrchestrator.cancelSession(session_id);
  res.json({ cancelled: ok });
});

trainingRouter.get('/sessions', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const agentSlug = (req.query.agent_slug as string) || undefined;

  let query = supabase
    .from('agent_training_sessions')
    .select('id, agent_slug, ceo_model, reviewer_model, scenario_focus, status, total_turns, max_turns, opus_score, started_at, ended_at')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (agentSlug) query = query.eq('agent_slug', agentSlug);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sessions: data || [] });
});

trainingRouter.get('/sessions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('agent_training_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Session not found' });
  res.json({ session: data });
});

trainingRouter.get('/sessions/:id/turns', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('agent_training_turns')
    .select('turn_no, role, content, tool_calls, tool_results, ts')
    .eq('session_id', id)
    .order('turn_no', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ turns: data || [] });
});

trainingRouter.get('/sessions/:id/scores', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('agent_training_scores')
    .select('rubric_key, score_0_100, opus_feedback, ts')
    .eq('session_id', id)
    .order('rubric_key', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ scores: data || [] });
});

// ── Training logs (terminal panel hydration) ─────────────────────────────────
// Returns up to N most recent logs for a session, optionally filtered by
// turn or kind. Used by UI to backfill the live terminal panel when user
// opens an old session.
trainingRouter.get('/sessions/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const turnNo = req.query.turn_no ? Number(req.query.turn_no) : undefined;
  const kind = (req.query.kind as string) || undefined;

  let query = supabase
    .from('agent_training_logs')
    .select('id, turn_no, role, level, kind, provider, content, tokens, duration_ms, meta, ts')
    .eq('session_id', id)
    .order('ts', { ascending: true })
    .limit(limit);
  if (typeof turnNo === 'number' && Number.isFinite(turnNo)) query = query.eq('turn_no', turnNo);
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data || [] });
});

// DELETE all logs for a session — UI "Clear logs" button. Idempotent.
// Useful for re-running a session to reduce noise, or for privacy cleanup.
trainingRouter.delete('/sessions/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('agent_training_logs').delete().eq('session_id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE entire session (logs cascade via FK ON DELETE CASCADE).
// UI "Delete session" button — also removes turns + scores via FKs.
trainingRouter.delete('/sessions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('agent_training_sessions').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Tool Audit Log (Sprint C2 backend) ───────────────────────────────────────
trainingRouter.get('/audit-log', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const agentSlug = (req.query.agent as string) || undefined;
  const tool = (req.query.tool as string) || undefined;
  const success = req.query.success;

  let query = supabase
    .from('agent_tool_audit_log')
    .select('id, agent_slug, session_key, tool_name, args, result_summary, target_customer_id, success, error, ts')
    .order('ts', { ascending: false })
    .limit(limit);

  if (agentSlug) query = query.eq('agent_slug', agentSlug);
  if (tool) query = query.eq('tool_name', tool);
  if (success === 'true') query = query.eq('success', true);
  if (success === 'false') query = query.eq('success', false);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ entries: data || [] });
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket — live stream training events
// ─────────────────────────────────────────────────────────────────────────────

import { WebSocketServer, WebSocket as WsType } from 'ws';

type WsSocket = InstanceType<typeof WsType>;

/**
 * Setup the /api/training/live/:session_id WebSocket route.
 *
 * Mounts on the existing HTTP server's `upgrade` event. When a client connects,
 * it subscribes to TrainingEvent broadcasts from the singleton orchestrator
 * and forwards events whose session_id matches.
 *
 * Auth: dev mode — no auth, localhost only. Add later if exposing to public.
 */
export function setupTrainingWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  // session_id → set of connected sockets
  const subscribers = new Map<string, Set<WsSocket>>();

  // Listen to orchestrator events and broadcast
  trainingOrchestrator.on('event', (event: TrainingEvent) => {
    const sockets = subscribers.get(event.session_id);
    if (!sockets || sockets.size === 0) return;
    const payload = JSON.stringify(event);
    for (const sock of sockets) {
      if (sock.readyState === sock.OPEN) {
        try { sock.send(payload); } catch { /* ignore */ }
      }
    }
  });

  wss.on('connection', (socket: WsSocket, req: IncomingMessage) => {
    if (!req.url) {
      socket.close(1008, 'missing url');
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    const match = url.pathname.match(/^\/api\/training\/live\/([a-z0-9-]+)\/?$/i);
    if (!match) {
      socket.close(1008, 'invalid path');
      return;
    }
    const sessionId = match[1];

    let set = subscribers.get(sessionId);
    if (!set) {
      set = new Set<WsSocket>();
      subscribers.set(sessionId, set);
    }
    set.add(socket);

    socket.send(JSON.stringify({ type: 'connected', session_id: sessionId }));

    socket.on('close', () => {
      const s = subscribers.get(sessionId);
      if (s) {
        s.delete(socket);
        if (s.size === 0) subscribers.delete(sessionId);
      }
    });

    socket.on('error', (err: Error) => {
      console.warn(`[Training/WS] socket error for ${sessionId}: ${err.message}`);
    });
  });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url) return;
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/training/live/')) return; // not ours

    wss.handleUpgrade(req, socket as any, head, (ws: WsSocket) => {
      wss.emit('connection', ws, req);
    });
  });

  console.log('[Training/WS] Live stream WebSocket listening on /api/training/live/:session_id');
}
