import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, heartbeatRuns, issues, projects } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { issueService } from "../services/issues.ts";
import {
  DELEGATION_ORIGIN_KIND,
  DELEGATION_WAKE_REASON,
  agentDelegationService,
  encodeDelegationMeta,
  extractDelegationTask,
  parseDelegationMeta,
} from "../services/agent-delegation.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Pure-function tests (run regardless of embedded postgres availability)
// ─────────────────────────────────────────────────────────────────────────────

describe("agent-delegation / pure helpers", () => {
  it("encodeDelegationMeta + parseDelegationMeta round-trip", () => {
    const meta = { timeoutMs: 300_000, turnMode: "do" as const };
    const encoded = encodeDelegationMeta(meta);
    expect(encoded.startsWith("<!-- DELEGATION meta:")).toBe(true);
    const decoded = parseDelegationMeta(`${encoded}\nActual task text`);
    expect(decoded).toEqual(meta);
  });

  it("parseDelegationMeta returns null for unrelated descriptions", () => {
    expect(parseDelegationMeta("just a normal issue body")).toBeNull();
    expect(parseDelegationMeta("")).toBeNull();
    expect(parseDelegationMeta(null)).toBeNull();
  });

  it("parseDelegationMeta rejects unknown turnMode values", () => {
    const bad = "<!-- DELEGATION meta: " + JSON.stringify({ timeoutMs: 1000, turnMode: "yolo" }) + " -->\ntask";
    expect(parseDelegationMeta(bad)).toBeNull();
  });

  it("extractDelegationTask strips the meta prefix", () => {
    const task = "Do the thing\nwith multiple lines";
    const full = encodeDelegationMeta({ timeoutMs: 5_000, turnMode: "do" }) + "\n" + task;
    expect(extractDelegationTask(full)).toBe(task);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests (require embedded Postgres)
// ─────────────────────────────────────────────────────────────────────────────

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres agent-delegation tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("agent-delegation service / integration", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-agent-delegation-");
    db = createDb(tempDb.connectionString);
  }, 30_000);

  afterEach(async () => {
    await db.delete(heartbeatRuns);
    await db.delete(issues);
    await db.delete(projects);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  interface WakeupLogEntry {
    agentId: string;
    opts: Record<string, unknown>;
  }

  async function seed(opts?: { targetStatus?: string; differentCompany?: boolean }) {
    const companyId = randomUUID();
    const otherCompanyId = randomUUID();
    const callerAgentId = randomUUID();
    const targetAgentId = randomUUID();
    const issuePrefix = `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const otherIssuePrefix = `O${otherCompanyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const wakeups: WakeupLogEntry[] = [];

    await db.insert(companies).values([
      {
        id: companyId,
        name: "Paperclip-Delegation-Test",
        issuePrefix,
        requireBoardApprovalForNewAgents: false,
      },
      ...(opts?.differentCompany
        ? [
            {
              id: otherCompanyId,
              name: "Paperclip-Other",
              issuePrefix: otherIssuePrefix,
              requireBoardApprovalForNewAgents: false,
            },
          ]
        : []),
    ]);

    // Raw SQL insert for `agents` — Drizzle's schema declares a
    // `heartbeat_thread_issue_id` column that the embedded-postgres test
    // migration set does not yet include (schema drift between prod
    // Supabase and checked-in migrations). Using raw SQL avoids Drizzle
    // listing the unknown column in the INSERT statement.
    const targetCompanyId = opts?.differentCompany ? otherCompanyId : companyId;
    const targetStatus = opts?.targetStatus ?? "active";
    await db.execute(sql`
      INSERT INTO agents (id, company_id, name, role, status, adapter_type, adapter_config, runtime_config, permissions)
      VALUES
        (${callerAgentId}, ${companyId}, 'CEO', 'lead', 'active', 'claude_local', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),
        (${targetAgentId}, ${targetCompanyId}, 'CTO', 'engineer', ${targetStatus}, 'claude_local', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
    `);

    const issuesSvc = issueService(db);

    const svc = agentDelegationService(
      db,
      {
        heartbeat: {
          wakeup: async (agentId, wakeupOpts) => {
            wakeups.push({ agentId, opts: wakeupOpts as Record<string, unknown> });
            return { id: randomUUID() };
          },
        },
        issues: issuesSvc,
        sleep: () => Promise.resolve(), // Run polling loop without real delays in tests
      },
      { pollIntervalMs: 5, maxConcurrentPerCaller: 3, maxDepth: 3 },
    );

    return { companyId, otherCompanyId, callerAgentId, targetAgentId, issuesSvc, svc, wakeups };
  }

  it("create() inserts a delegation issue with origin_kind=delegation", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed();
    const runId = randomUUID();
    const delegation = await svc.create({
      companyId,
      callerAgentId,
      callerRunId: runId,
      targetAgentId,
      task: "Fix BUG-041 in agent-config-routes.ts",
      timeoutMs: 120_000,
      turnMode: "do",
    });

    expect(delegation.traceId).toBeTruthy();
    expect(delegation.companyId).toBe(companyId);
    expect(delegation.callerAgentId).toBe(callerAgentId);
    expect(delegation.targetAgentId).toBe(targetAgentId);
    expect(delegation.depth).toBe(1);
    expect(delegation.meta.timeoutMs).toBe(120_000);
    expect(delegation.meta.turnMode).toBe("do");
    expect(delegation.task).toContain("Fix BUG-041");

    const row = await db
      .select()
      .from(issues)
      .where(eq(issues.id, delegation.id))
      .then((rows) => rows[0]);
    expect(row.originKind).toBe(DELEGATION_ORIGIN_KIND);
    expect(row.originId).toBe(delegation.traceId);
    expect(row.originRunId).toBe(runId);
    expect(row.createdByAgentId).toBe(callerAgentId);
    expect(row.assigneeAgentId).toBe(targetAgentId);
    expect(row.requestDepth).toBe(1);
  });

  it("create() triggers wakeup with delegation context", async () => {
    const { companyId, callerAgentId, targetAgentId, svc, wakeups } = await seed();
    const delegation = await svc.create({
      companyId,
      callerAgentId,
      targetAgentId,
      task: "Quick probe",
    });
    expect(wakeups).toHaveLength(1);
    const entry = wakeups[0];
    expect(entry.agentId).toBe(targetAgentId);
    const contextSnapshot = entry.opts.contextSnapshot as Record<string, unknown>;
    expect(contextSnapshot.wakeReason).toBe(DELEGATION_WAKE_REASON);
    expect(contextSnapshot.delegationTraceId).toBe(delegation.traceId);
    expect(contextSnapshot.fromAgentId).toBe(callerAgentId);
    expect(entry.opts.requestedByActorType).toBe("agent");
    expect(entry.opts.requestedByActorId).toBe(callerAgentId);
  });

  it("create() enforces maxDepth", async () => {
    const { companyId, callerAgentId, targetAgentId, issuesSvc, svc } = await seed();
    // Seed an ancestor chain at depth 3 (already at the max).
    const parent = await issuesSvc.create(companyId, {
      title: "Ancestor at depth 3",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: callerAgentId,
      createdByAgentId: callerAgentId,
      originKind: DELEGATION_ORIGIN_KIND,
      originId: randomUUID(),
      requestDepth: 3,
    });

    await expect(
      svc.create({
        companyId,
        callerAgentId,
        callerIssueId: parent.id,
        targetAgentId,
        task: "Should be rejected",
      }),
    ).rejects.toThrow(/depth/i);
  });

  it("create() enforces maxConcurrentPerCaller", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed();
    // maxConcurrentPerCaller was overridden to 3 in seed().
    for (let i = 0; i < 3; i += 1) {
      await svc.create({
        companyId,
        callerAgentId,
        targetAgentId,
        task: `Active delegation #${i}`,
      });
    }
    await expect(
      svc.create({
        companyId,
        callerAgentId,
        targetAgentId,
        task: "Fourth — should be rejected",
      }),
    ).rejects.toThrow(/active delegations/i);
  });

  it("create() rejects target from a different company", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed({ differentCompany: true });
    await expect(
      svc.create({
        companyId,
        callerAgentId,
        targetAgentId,
        task: "cross-company attempt",
      }),
    ).rejects.toThrow(/different company/i);
  });

  it("create() rejects terminated target", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed({ targetStatus: "terminated" });
    await expect(
      svc.create({
        companyId,
        callerAgentId,
        targetAgentId,
        task: "should refuse",
      }),
    ).rejects.toThrow(/terminated/i);
  });

  it("cancel() marks the delegation cancelled", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed();
    const delegation = await svc.create({
      companyId,
      callerAgentId,
      targetAgentId,
      task: "Soon to be cancelled",
    });
    await svc.cancel(delegation.traceId, "user-requested");

    const row = await db
      .select()
      .from(issues)
      .where(eq(issues.id, delegation.id))
      .then((rows) => rows[0]);
    expect(row.status).toBe("cancelled");
    expect(row.cancelledAt).not.toBeNull();
  });

  it("await() returns immediately when target already completed", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed();
    const delegation = await svc.create({
      companyId,
      callerAgentId,
      targetAgentId,
      task: "Already done",
    });
    await db
      .update(issues)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(issues.id, delegation.id));

    const [result] = await svc.await([delegation.traceId], 5_000);
    expect(result.status).toBe("done");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("await() times out and cancels pending delegations", async () => {
    const { companyId, callerAgentId, targetAgentId, svc } = await seed();
    const delegation = await svc.create({
      companyId,
      callerAgentId,
      targetAgentId,
      task: "Pending forever",
    });
    const [result] = await svc.await([delegation.traceId], 1_000);
    expect(result.status).toBe("timeout");
    expect(result.error).toBe("timeout");

    const row = await db
      .select()
      .from(issues)
      .where(eq(issues.id, delegation.id))
      .then((rows) => rows[0]);
    expect(row.status).toBe("cancelled");
  });

  it("fan-out: three delegations produce three wakeups", async () => {
    const { companyId, callerAgentId, targetAgentId, svc, wakeups } = await seed();
    const results = await Promise.all(
      ["A", "B", "C"].map((task) =>
        svc.create({
          companyId,
          callerAgentId,
          targetAgentId,
          task,
        }),
      ),
    );
    expect(new Set(results.map((r) => r.traceId)).size).toBe(3);
    expect(wakeups).toHaveLength(3);
  });
});
