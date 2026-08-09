// In-memory liveness tracker for background setInterval loops.
//
// Incident 2026-08-09: `/api/health` stayed 200 (it only does a DB `SELECT 1`)
// for ~6.5h while the background loops below had silently stopped — no error,
// no log, nothing. The external watcher (troly-ntp/paperclip_heartbeat.py)
// never noticed because it only checks HTTP+DB, not "is this specific timer
// still ticking".
//
// Deliberately in-memory (no DB/network round-trip): the point is to measure
// "did this loop actually run recently", independent of Supabase being up —
// a DB-backed liveness check would itself go stale during a Supabase outage,
// which is exactly the kind of false signal this is trying to avoid.
// See docs/plans_reports/2026-08-09-PAPERCLIP-CRON-LIVENESS-WATCHDOG_ARCHITECTURE_PLAN.md

export interface LivenessTarget {
  id: string;
  label: string;
  expectedIntervalMs: number;
  staleFactor: number;
  /**
   * If true, staleness is expected/normal whenever the underlying connection
   * (e.g. Zalo channel) is disconnected — so it must NOT drive `/api/health`
   * into `degraded` (that would restart-loop the server every time Zalo is
   * logged out, which fixes nothing). Informational only.
   */
  connectionGated: boolean;
}

const TARGETS: LivenessTarget[] = [
  {
    id: 'heartbeat-scheduler-tick',
    label: 'Heartbeat Scheduler Tick',
    expectedIntervalMs: 30_000,
    staleFactor: 3,
    connectionGated: false,
  },
  {
    id: 'zalo-listener-ping',
    label: 'Zalo WebSocket Ping',
    expectedIntervalMs: 30_000,
    staleFactor: 3,
    connectionGated: true,
  },
  {
    id: 'zalo-health-check',
    label: 'Zalo Health Check',
    expectedIntervalMs: 120_000,
    staleFactor: 3,
    connectionGated: true,
  },
];

const lastTickAt = new Map<string, number>();

/** Call from inside a background loop each time it fires (or, for async
 * loops, each time the async chain settles — success or failure — so a hung
 * promise that never settles correctly shows up as stale). */
export function markAlive(id: string): void {
  lastTickAt.set(id, Date.now());
}

export interface LivenessSnapshotEntry {
  id: string;
  label: string;
  lastTickAt: string | null;
  ageMs: number | null;
  expectedIntervalMs: number;
  stale: boolean;
  connectionGated: boolean;
}

export function getLivenessSnapshot(now: number = Date.now()): LivenessSnapshotEntry[] {
  return TARGETS.map((t) => {
    const last = lastTickAt.get(t.id);
    const ageMs = last === undefined ? null : now - last;
    const staleThresholdMs = t.expectedIntervalMs * t.staleFactor;
    return {
      id: t.id,
      label: t.label,
      lastTickAt: last === undefined ? null : new Date(last).toISOString(),
      ageMs,
      expectedIntervalMs: t.expectedIntervalMs,
      // Never-ticked-yet (ageMs === null) is treated as stale=false — a
      // just-started server hasn't had a chance to tick yet, that's not a
      // degraded state.
      stale: ageMs !== null && ageMs > staleThresholdMs,
      connectionGated: t.connectionGated,
    };
  });
}

/** Non-connection-gated targets that are stale — these are what `/api/health`
 * uses to decide `status: "degraded"`. Connection-gated targets (Zalo) are
 * exposed for visibility only, never drive the actionable status. */
export function getActionableStaleness(now: number = Date.now()): LivenessSnapshotEntry[] {
  return getLivenessSnapshot(now).filter((e) => e.stale && !e.connectionGated);
}
