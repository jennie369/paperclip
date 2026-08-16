import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  companies,
  createDb,
  issues,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { scheduledIssueWakeupService } from "../services/scheduled-issue-wakeups.ts";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres scheduled-issue-wakeups tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describe("queueIssueAssignmentWakeup scheduled gate", () => {
  it("does not wake an issue whose scheduledWakeAt is still in the future", async () => {
    const wakeups: string[] = [];
    await queueIssueAssignmentWakeup({
      heartbeat: {
        wakeup: async (agentId) => {
          wakeups.push(agentId);
          return null;
        },
      },
      issue: {
        id: randomUUID(),
        assigneeAgentId: randomUUID(),
        // agent actor + backlog would normally wake — the schedule must win
        status: "backlog",
        scheduledWakeAt: new Date(Date.now() + 60_000),
      },
      reason: "issue_assigned",
      mutation: "create",
      contextSource: "test",
      requestedByActorType: "agent",
    });
    expect(wakeups).toHaveLength(0);
  });

  it("wakes once the scheduled time has passed", async () => {
    const wakeups: string[] = [];
    await queueIssueAssignmentWakeup({
      heartbeat: {
        wakeup: async (agentId) => {
          wakeups.push(agentId);
          return null;
        },
      },
      issue: {
        id: randomUUID(),
        assigneeAgentId: randomUUID(),
        status: "todo",
        scheduledWakeAt: new Date(Date.now() - 1_000),
      },
      reason: "issue_assigned",
      mutation: "update",
      contextSource: "test",
    });
    expect(wakeups).toHaveLength(1);
  });
});

describeEmbeddedPostgres("scheduledIssueWakeupService.tickScheduledIssueWakeups", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-scheduled-issue-wake-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(issues);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedFixture() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const issuePrefix = `S${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "ScheduledWorker",
      role: "engineer",
      status: "idle",
      adapterType: "claude_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    async function seedIssue(overrides: Partial<typeof issues.$inferInsert> = {}) {
      const id = randomUUID();
      await db.insert(issues).values({
        id,
        companyId,
        title: "scheduled task",
        status: "backlog",
        priority: "medium",
        assigneeAgentId: agentId,
        ...overrides,
      });
      return id;
    }

    return { companyId, agentId, seedIssue };
  }

  it("flips a due backlog issue to todo, clears the schedule, and wakes the assignee", async () => {
    const { agentId, seedIssue } = await seedFixture();
    const dueId = await seedIssue({ scheduledWakeAt: new Date(Date.now() - 60_000) });
    const wakeups: Array<{ agentId: string; issueId: unknown }> = [];

    const svc = scheduledIssueWakeupService(db, {
      heartbeat: {
        wakeup: async (wakeAgentId, opts) => {
          wakeups.push({ agentId: wakeAgentId, issueId: opts.payload?.issueId });
          return null;
        },
      },
    });

    const result = await svc.tickScheduledIssueWakeups(new Date());
    expect(result).toEqual({ due: 1, woken: 1 });
    expect(wakeups).toEqual([{ agentId, issueId: dueId }]);

    const [row] = await db.select().from(issues).where(eq(issues.id, dueId));
    expect(row.status).toBe("todo");
    expect(row.scheduledWakeAt).toBeNull();

    const activities = await db.select().from(activityLog);
    expect(activities.some((a) => a.action === "issue.scheduled_wake_fired")).toBe(true);
  });

  it("leaves future schedules and non-backlog issues untouched", async () => {
    const { seedIssue } = await seedFixture();
    const futureId = await seedIssue({ scheduledWakeAt: new Date(Date.now() + 60 * 60_000) });
    const doneId = await seedIssue({
      status: "done",
      scheduledWakeAt: new Date(Date.now() - 60_000),
    });
    const wakeups: string[] = [];

    const svc = scheduledIssueWakeupService(db, {
      heartbeat: {
        wakeup: async (wakeAgentId) => {
          wakeups.push(wakeAgentId);
          return null;
        },
      },
    });

    const result = await svc.tickScheduledIssueWakeups(new Date());
    expect(result).toEqual({ due: 0, woken: 0 });
    expect(wakeups).toHaveLength(0);

    const [future] = await db.select().from(issues).where(eq(issues.id, futureId));
    expect(future.status).toBe("backlog");
    expect(future.scheduledWakeAt).not.toBeNull();
    const [done] = await db.select().from(issues).where(eq(issues.id, doneId));
    expect(done.status).toBe("done");
  });

  it("records a failure activity but keeps the issue in todo when the wake throws", async () => {
    const { seedIssue } = await seedFixture();
    const dueId = await seedIssue({ scheduledWakeAt: new Date(Date.now() - 60_000) });

    const svc = scheduledIssueWakeupService(db, {
      heartbeat: {
        wakeup: async () => {
          throw new Error("agent paused");
        },
      },
    });

    const result = await svc.tickScheduledIssueWakeups(new Date());
    expect(result).toEqual({ due: 1, woken: 0 });

    // Already flipped to todo — the agent's next heartbeat picks it up.
    const [row] = await db.select().from(issues).where(eq(issues.id, dueId));
    expect(row.status).toBe("todo");
    expect(row.scheduledWakeAt).toBeNull();

    const activities = await db.select().from(activityLog);
    expect(activities.some((a) => a.action === "issue.scheduled_wake_failed")).toBe(true);
  });
});
