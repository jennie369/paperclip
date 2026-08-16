import { logger } from "../middleware/logger.js";

type WakeupTriggerDetail = "manual" | "ping" | "callback" | "system";
type WakeupSource = "timer" | "assignment" | "on_demand" | "automation";

export interface IssueAssignmentWakeupDeps {
  wakeup: (
    agentId: string,
    opts: {
      source?: WakeupSource;
      triggerDetail?: WakeupTriggerDetail;
      reason?: string | null;
      payload?: Record<string, unknown> | null;
      requestedByActorType?: "user" | "agent" | "system";
      requestedByActorId?: string | null;
      contextSnapshot?: Record<string, unknown>;
    },
  ) => Promise<unknown>;
}

export function queueIssueAssignmentWakeup(input: {
  heartbeat: IssueAssignmentWakeupDeps;
  issue: { id: string; assigneeAgentId: string | null; status: string; scheduledWakeAt?: Date | null };
  reason: string;
  mutation: string;
  contextSource: string;
  requestedByActorType?: "user" | "agent" | "system";
  requestedByActorId?: string | null;
  rethrowOnError?: boolean;
}) {
  if (!input.issue.assigneeAgentId) return;
  // Board users may legitimately park work in `backlog` for later triage — don't wake.
  // Agent-to-agent delegation, however, must always wake the assignee: otherwise the
  // delegated task sits in backlog forever (it's not returned by /agents/me/inbox-lite
  // which filters to todo|in_progress|blocked) and the escalation loop breaks.
  if (input.issue.status === "backlog" && input.requestedByActorType !== "agent") return;
  // Scheduled issues must NOT wake before their time — the scheduler tick
  // (scheduled-issue-wakeups.ts) flips them to todo and wakes at the right
  // moment. This guard is the ONLY gate on the agent-created path: the
  // backlog check above intentionally lets agent actors through.
  if (input.issue.scheduledWakeAt && input.issue.scheduledWakeAt.getTime() > Date.now()) return;

  return input.heartbeat
    .wakeup(input.issue.assigneeAgentId, {
      source: "assignment",
      triggerDetail: "system",
      reason: input.reason,
      payload: { issueId: input.issue.id, mutation: input.mutation },
      requestedByActorType: input.requestedByActorType,
      requestedByActorId: input.requestedByActorId ?? null,
      // wakeReason drives shouldResetTaskSessionForWake in heartbeat.ts —
      // without it the agent resumes its previous Claude session and
      // answers the wrong topic (observed 2026-04-18: assigning GEM-175
      // to CTO replayed a stale MCP watchdog discussion instead of
      // working the new issue).
      contextSnapshot: {
        issueId: input.issue.id,
        source: input.contextSource,
        wakeReason: "issue_assigned",
      },
    })
    .catch((err) => {
      logger.warn({ err, issueId: input.issue.id }, "failed to wake assignee on issue assignment");
      if (input.rethrowOnError) throw err;
      return null;
    });
}
