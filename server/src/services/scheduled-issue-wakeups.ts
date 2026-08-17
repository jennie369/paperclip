import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issues } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { boundedPoll } from "./bounded-poll.js";
import { heartbeatService } from "./heartbeat.js";
import { queueIssueAssignmentWakeup, type IssueAssignmentWakeupDeps } from "./issue-assignment-wakeup.js";
import { logActivity } from "./activity-log.js";

/**
 * Scheduled one-shot wake for assigned issues.
 *
 * An issue created with `scheduledWakeAt` is parked in `backlog` (the
 * assignment path never wakes it early — see issue-assignment-wakeup.ts).
 * Each scheduler tick this service flips due issues to `todo` and wakes the
 * assignee, exactly as if the issue had just been assigned.
 *
 * The status flip itself is the atomic claim: the UPDATE only matches rows
 * still in `backlog` with a non-null `scheduled_wake_at`, and clears the
 * column in the same statement, so a concurrent tick cannot double-fire.
 * The `<= now` predicate also gives free catch-up after downtime — a
 * scheduled task must never silently vanish.
 */
export function scheduledIssueWakeupService(db: Db, deps: { heartbeat?: IssueAssignmentWakeupDeps } = {}) {
  const heartbeat = deps.heartbeat ?? heartbeatService(db);

  async function tickScheduledIssueWakeups(now: Date) {
    // F2: claim atomic UPDATE...RETURNING bounded 15s (SET LOCAL) — đây là write, KHÔNG phải
    // SELECT; nếu để ngoài bound thì dưới cùng lớp pooler stall nó vẫn giữ 1 slot runtime pool
    // tới statement_timeout global 2 phút (Codex R2). Vòng wake per-issue bên dưới dùng db thường.
    const due = await boundedPoll(db, (tx) =>
      tx
        .update(issues)
        .set({ scheduledWakeAt: null, status: "todo", updatedAt: now })
        .where(
          and(
            eq(issues.status, "backlog"),
            isNotNull(issues.scheduledWakeAt),
            lte(issues.scheduledWakeAt, now),
            isNull(issues.hiddenAt),
            isNotNull(issues.assigneeAgentId),
          ),
        )
        .returning(),
    );

    let woken = 0;
    for (const issue of due) {
      try {
        await queueIssueAssignmentWakeup({
          heartbeat,
          issue,
          reason: "issue_assigned",
          mutation: "update",
          contextSource: "issue.scheduled_wake",
          requestedByActorType: "system",
          requestedByActorId: "scheduled-issue-wakeup",
          rethrowOnError: true,
        });
        woken += 1;
        await logActivity(db, {
          companyId: issue.companyId,
          actorType: "system",
          actorId: "scheduled-issue-wakeup",
          action: "issue.scheduled_wake_fired",
          entityType: "issue",
          entityId: issue.id,
          details: {
            identifier: issue.identifier,
            agentId: issue.assigneeAgentId,
          },
        }).catch((err) =>
          logger.warn({ err, issueId: issue.id }, "failed to log scheduled wake activity"),
        );
      } catch (err) {
        // Issue is already in todo — the agent's next heartbeat will pick it
        // up even though this wake failed (agent paused, budget, ...). Leave a
        // trace so the miss is visible instead of silent.
        logger.warn({ err, issueId: issue.id }, "scheduled issue wake failed");
        await logActivity(db, {
          companyId: issue.companyId,
          actorType: "system",
          actorId: "scheduled-issue-wakeup",
          action: "issue.scheduled_wake_failed",
          entityType: "issue",
          entityId: issue.id,
          details: {
            identifier: issue.identifier,
            agentId: issue.assigneeAgentId,
            error: err instanceof Error ? err.message : String(err),
          },
        }).catch((logErr) =>
          logger.warn({ err: logErr, issueId: issue.id }, "failed to log scheduled wake failure"),
        );
      }
    }

    return { due: due.length, woken };
  }

  return { tickScheduledIssueWakeups };
}
