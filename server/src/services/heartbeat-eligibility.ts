// SSOT predicate: which agent statuses the scheduler / invoke-guards must skip.
//
// ⚠️ INVARIANT: "error" is DELIBERATELY ABSENT from this set. A failed run leaves
// the agent in status "error" (a badge to review later), but it MUST keep running
// its next scheduled heartbeat and stay invokable — a run failure never stops an
// agent. Only an explicit pause/terminate, or a pending-approval gate, blocks it.
// See docs/plans_reports/2026-08-31-PAPERCLIP-NO-AUTOPAUSE-ON-ERROR-SPLIT-BUTTON.
export const HEARTBEAT_SKIP_STATUSES = [
  "paused",
  "terminated",
  "pending_approval",
] as const;

export function isHeartbeatSkipped(status: string | null | undefined): boolean {
  return (HEARTBEAT_SKIP_STATUSES as readonly string[]).includes(status ?? "");
}
