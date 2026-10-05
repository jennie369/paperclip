import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  heartbeatRuns,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { runningProcesses } from "../adapters/index.ts";
import { heartbeatService } from "../services/heartbeat.ts";
import {
  evaluateFleetClaim,
  fleetWindowStart,
  orderTimerCandidatesFairly,
  readFleetThrottleConfig,
} from "../services/fleet-throttle.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

const FLEET_ENV_KEYS = [
  "PAPERCLIP_FLEET_MAX_RUNNING",
  "PAPERCLIP_FLEET_STARTS_PER_10MIN",
  "PAPERCLIP_FLEET_TIMER_WAKES_PER_HOUR",
  "PAPERCLIP_FLEET_TIMER_EXEMPT_AGENTS",
] as const;

function setFleetEnv(values: Partial<Record<(typeof FLEET_ENV_KEYS)[number], string>>) {
  for (const key of FLEET_ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

describe("fleet throttle pure helpers", () => {
  it("defaults to 2 running / 2 starts per 10 min / 3 timer wakes per hour", () => {
    const cfg = readFleetThrottleConfig({});
    expect(cfg.maxRunning).toBe(2);
    expect(cfg.startsPerWindow).toBe(2);
    expect(cfg.timerWakesPerHour).toBe(3);
    expect(cfg.timerExemptAgents.size).toBe(0);
  });

  it("aligns windows to Asia/Ho_Chi_Minh wall clock", () => {
    // 2026-10-05 17:47:13 +07:00 → 10-min window 17:40 local, hour window 17:00 local
    const now = new Date("2026-10-05T10:47:13.000Z");
    expect(fleetWindowStart(now, 10 * 60 * 1000).toISOString()).toBe("2026-10-05T10:40:00.000Z");
    expect(fleetWindowStart(now, 60 * 60 * 1000).toISOString()).toBe("2026-10-05T10:00:00.000Z");
  });

  it("blocks on running cap before start-window cap", () => {
    const cfg = readFleetThrottleConfig({});
    expect(evaluateFleetClaim(cfg, { running: 1, startsInWindow: 1 }).ok).toBe(true);
    expect(evaluateFleetClaim(cfg, { running: 2, startsInWindow: 0 })).toMatchObject({ ok: false, reason: "max_running" });
    expect(evaluateFleetClaim(cfg, { running: 0, startsInWindow: 2 })).toMatchObject({ ok: false, reason: "start_window" });
    const off = readFleetThrottleConfig({ PAPERCLIP_FLEET_MAX_RUNNING: "0", PAPERCLIP_FLEET_STARTS_PER_10MIN: "0" });
    expect(evaluateFleetClaim(off, { running: 50, startsInWindow: 50 }).ok).toBe(true);
  });

  it("orders timer candidates oldest-finished first, never-finished before all", () => {
    const ordered = orderTimerCandidatesFairly(
      [
        { id: "recent", at: new Date("2026-10-05T10:00:00Z") },
        { id: "never", at: null },
        { id: "old", at: new Date("2026-10-04T10:00:00Z") },
      ],
      (c) => c.at,
    );
    expect(ordered.map((c) => c.id)).toEqual(["never", "old", "recent"]);
  });
});

describeEmbeddedPostgres("heartbeat fleet throttle (company-wide)", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let svc!: ReturnType<typeof heartbeatService>;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-fleet-");
    db = createDb(tempDb.connectionString);
    svc = heartbeatService(db);
  }, 240_000);

  afterEach(async () => {
    const live = await db.select({ id: heartbeatRuns.id }).from(heartbeatRuns).where(eq(heartbeatRuns.status, "running"));
    for (const run of live) {
      await svc.cancelRun(run.id).catch(() => undefined);
    }
    runningProcesses.clear();
    // Executed runs create side rows (company_skills, workspaces...) — cascade wipes all.
    await db.execute(sql`truncate table companies cascade`);
    setFleetEnv({});
  }, 60_000);

  afterAll(async () => {
    setFleetEnv({});
    runningProcesses.clear();
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Fleet",
      issuePrefix: `F${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    return companyId;
  }

  async function seedAgent(companyId: string, name: string, heartbeat: Record<string, unknown> = {}) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name,
      role: "engineer",
      status: "idle",
      adapterType: "process",
      // Long sleeper so claimed runs stay `running` for the duration of the assertion.
      adapterConfig: { command: process.execPath, args: ["-e", "setTimeout(() => {}, 60000)"] },
      runtimeConfig: { heartbeat: { enabled: true, catchUpGraceSec: 0, ...heartbeat } },
      permissions: {},
      lastHeartbeatAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    return agentId;
  }

  async function seedQueuedRun(companyId: string, agentId: string) {
    const runId = randomUUID();
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "queued",
      contextSnapshot: {},
    });
    return runId;
  }

  async function statusCounts(companyId: string) {
    const rows = await db
      .select({ status: heartbeatRuns.status })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.companyId, companyId));
    return {
      running: rows.filter((r) => r.status === "running").length,
      queued: rows.filter((r) => r.status === "queued").length,
    };
  }

  it("rule 1: 5 agents due at once → only 2 running, the rest stay queued (even with racing claimers)", async () => {
    setFleetEnv({ PAPERCLIP_FLEET_MAX_RUNNING: "2", PAPERCLIP_FLEET_STARTS_PER_10MIN: "0" });
    const companyId = await seedCompany();
    for (let i = 0; i < 5; i++) {
      const agentId = await seedAgent(companyId, `Agent ${i}`);
      await seedQueuedRun(companyId, agentId);
    }

    await Promise.all([svc.resumeQueuedRuns(), svc.resumeQueuedRuns(), svc.resumeQueuedRuns()]);

    expect(await statusCounts(companyId)).toEqual({ running: 2, queued: 3 });
  }, 60_000);

  it("rule 2: third start inside the same 10-minute window is deferred", async () => {
    setFleetEnv({ PAPERCLIP_FLEET_MAX_RUNNING: "0", PAPERCLIP_FLEET_STARTS_PER_10MIN: "2" });
    const companyId = await seedCompany();
    const agentIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const agentId = await seedAgent(companyId, `Starter ${i}`);
      agentIds.push(agentId);
      await seedQueuedRun(companyId, agentId);
    }

    await svc.resumeQueuedRuns();
    expect(await statusCounts(companyId)).toEqual({ running: 2, queued: 1 });

    // Simulate the window rolling over: the two earlier starts move to the previous window.
    const previousWindow = new Date(fleetWindowStart(new Date(), 10 * 60 * 1000).getTime() - 60_000);
    await db
      .update(heartbeatRuns)
      .set({ startedAt: previousWindow })
      .where(eq(heartbeatRuns.status, "running"));
    await svc.resumeQueuedRuns();
    expect(await statusCounts(companyId)).toEqual({ running: 3, queued: 0 });
  }, 60_000);

  it("rule 3: 4 timer wakes due in one hour → 4th is skipped (not queued) and oldest-finished agents win", async () => {
    setFleetEnv({
      PAPERCLIP_FLEET_MAX_RUNNING: "0",
      PAPERCLIP_FLEET_STARTS_PER_10MIN: "0",
      PAPERCLIP_FLEET_TIMER_WAKES_PER_HOUR: "3",
    });
    const companyId = await seedCompany();
    const finishedAt = [
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-02T00:00:00Z"),
      new Date("2026-10-03T00:00:00Z"),
      new Date("2026-10-04T00:00:00Z"), // most recently finished → loses the fair pick
    ];
    const agentIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const agentId = await seedAgent(companyId, `Timer ${i}`, { cronExpression: "* * * * *" });
      agentIds.push(agentId);
      await db.insert(heartbeatRuns).values({
        companyId,
        agentId,
        invocationSource: "assignment",
        triggerDetail: "system",
        status: "succeeded",
        contextSnapshot: {},
        startedAt: finishedAt[i],
        finishedAt: finishedAt[i],
      });
    }

    const first = await svc.tickTimers(new Date());
    expect(first.enqueued).toBe(3);
    expect(first.deferredByFleet).toBe(1);

    const timerRuns = await db
      .select({ agentId: heartbeatRuns.agentId })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.invocationSource, "timer"));
    expect(timerRuns.map((r) => r.agentId).sort()).toEqual(agentIds.slice(0, 3).sort());

    // Skipped agent keeps its old baseline (re-evaluated later), and a second tick in the
    // same hour still does not let it through — nothing is stacked in the queue.
    const [skipped] = await db.select().from(agents).where(eq(agents.id, agentIds[3]!));
    expect(skipped?.lastHeartbeatAt?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    const second = await svc.tickTimers(new Date());
    expect(second.enqueued).toBe(0);
    const timerRunsAfter = await db
      .select({ id: heartbeatRuns.id })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.invocationSource, "timer"));
    expect(timerRunsAfter).toHaveLength(3);
  }, 60_000);

  it("rule 3: exempt agents bypass the hourly timer cap", async () => {
    const companyId = await seedCompany();
    setFleetEnv({
      PAPERCLIP_FLEET_MAX_RUNNING: "0",
      PAPERCLIP_FLEET_STARTS_PER_10MIN: "0",
      PAPERCLIP_FLEET_TIMER_WAKES_PER_HOUR: "1",
      PAPERCLIP_FLEET_TIMER_EXEMPT_AGENTS: "VIP Bot",
    });
    await seedAgent(companyId, "Plain A", { cronExpression: "* * * * *" });
    await seedAgent(companyId, "Plain B", { cronExpression: "* * * * *" });
    await seedAgent(companyId, "VIP Bot", { cronExpression: "* * * * *" });

    const result = await svc.tickTimers(new Date());
    expect(result.enqueued).toBe(2);
    expect(result.deferredByFleet).toBe(1);
  }, 60_000);
});
