// Agent Session Reconcile Cron
//
// Periodically scans agent_sessions rows with status IN ('running','idle') and
// verifies each session's JSONL file still exists under `~/.claude/projects/*/`.
// Missing file → mark status='stopped' so router.ts#getAgentSessionId doesn't
// try to `--resume` a ghost session.
//
// Why: Claude CLI's cleanupPeriodDays (default 30) silently deletes old JSONLs;
// spawn crashes can also leave DB rows pointing at never-flushed sessions.
// Without reconciliation, router keeps resurfacing dead session_ids until an
// agent tries to use them and fails.

import { supabase } from './zalo-personal/supabase.js';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve as pathResolve, join as pathJoin } from 'node:path';
import { homedir } from 'node:os';

const RECONCILE_INTERVAL_MS = 30 * 60 * 1000; // 30 min

async function reconcileOnce(): Promise<void> {
  const projectsRoot = pathResolve(homedir(), '.claude', 'projects');
  if (!existsSync(projectsRoot)) {
    console.warn('[SessionReconcile] ~/.claude/projects not found, skipping');
    return;
  }

  const dirs = readdirSync(projectsRoot).filter((d) => {
    try {
      return statSync(pathJoin(projectsRoot, d)).isDirectory();
    } catch {
      return false;
    }
  });

  const { data: rows, error } = await supabase
    .from('agent_sessions')
    .select('id, agent_slug, session_id, status')
    .in('status', ['running', 'idle']);

  if (error) {
    console.error('[SessionReconcile] DB query failed:', error.message);
    return;
  }
  if (!rows || rows.length === 0) return;

  let archived = 0;
  for (const row of rows as Array<{ id: string; agent_slug: string; session_id: string }>) {
    if (!row.session_id) continue;
    const found = dirs.some((d) =>
      existsSync(pathJoin(projectsRoot, d, `${row.session_id}.jsonl`)),
    );
    if (!found) {
      const { error: updateErr } = await supabase
        .from('agent_sessions')
        .update({ status: 'stopped' })
        .eq('id', row.id);
      if (updateErr) {
        console.error(`[SessionReconcile] Update failed for ${row.agent_slug}: ${updateErr.message}`);
        continue;
      }
      archived++;
      console.log(
        `[SessionReconcile] Archived ${row.agent_slug} → ${String(row.session_id).substring(0, 8)}… (file missing)`,
      );
    }
  }

  console.log(
    `[SessionReconcile] Scanned ${rows.length} active rows, archived ${archived} stale`,
  );
}

export function startAgentSessionReconcileCron(): void {
  // Run once at startup, then every 30 min
  reconcileOnce().catch((err) =>
    console.error('[SessionReconcile] First run failed:', err.message),
  );
  setInterval(() => {
    reconcileOnce().catch((err) =>
      console.error('[SessionReconcile] Run failed:', err.message),
    );
  }, RECONCILE_INTERVAL_MS);
}
