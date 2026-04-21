// Delegation routes — thin integration tests.
//
// Strategy: mock `../services/index.js` + `../services/agent-delegation.js` +
// `../config.js`. Build the Express app per-test so each test can flip the
// delegation flag. No embedded Postgres needed here — service-layer
// correctness is covered by agent-delegation.test.ts.
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { errorHandler } from "../middleware/index.js";
import type { Request, RequestHandler } from "express";

const baseConfig = {
  delegationEnabled: false,
  delegationDefaultTimeoutMs: 300_000,
  delegationMaxTimeoutMs: 1_800_000,
  delegationMaxConcurrentPerCaller: 10,
  delegationMaxDepth: 3,
};

const mockConfig = vi.hoisted(() => ({ ...{
  delegationEnabled: false,
  delegationDefaultTimeoutMs: 300_000,
  delegationMaxTimeoutMs: 1_800_000,
  delegationMaxConcurrentPerCaller: 10,
  delegationMaxDepth: 3,
} }));

const mockSvc = vi.hoisted(() => ({
  create: vi.fn(),
  await: vi.fn(),
  cancel: vi.fn(),
  get: vi.fn(),
  findByTraceId: vi.fn(),
  listActiveByCaller: vi.fn(),
  listByCompany: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(async () => undefined),
}));

const mockIssueService = vi.hoisted(() => ({}));

vi.mock("../config.js", () => ({
  loadConfig: () => mockConfig,
}));

vi.mock("../services/agent-delegation.js", () => ({
  agentDelegationService: () => mockSvc,
}));

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  heartbeatService: () => mockHeartbeatService,
  issueService: () => mockIssueService,
}));

// Import AFTER mocks so the factory sees the mocked config.
const { delegationRoutes } = await import("../routes/delegations.js");

type ActorShape = {
  type: "agent" | "board" | "none";
  agentId?: string;
  companyId?: string;
  runId?: string;
  source?: string;
  userId?: string;
  companyIds?: string[];
  isInstanceAdmin?: boolean;
};

function createApp(actor: ActorShape | null) {
  const app = express();
  app.use(express.json());
  const injectActor: RequestHandler = (req, _res, next) => {
    (req as unknown as { actor: ActorShape }).actor = actor ?? {
      type: "none",
      source: "none",
    };
    next();
  };
  app.use(injectActor);
  app.use("/api", delegationRoutes({} as any));
  app.use(errorHandler);
  return app;
}

const AGENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RUN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COMPANY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TARGET_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const TRACE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const agentActor: ActorShape = {
  type: "agent",
  agentId: AGENT_ID,
  companyId: COMPANY_ID,
  runId: RUN_ID,
  source: "local_run_id",
};

const boardActor: ActorShape = {
  type: "board",
  userId: "local-board",
  companyIds: [COMPANY_ID],
  source: "local_implicit",
  isInstanceAdmin: true,
};

function setFlag(on: boolean) {
  mockConfig.delegationEnabled = on;
  mockConfig.delegationDefaultTimeoutMs = baseConfig.delegationDefaultTimeoutMs;
  mockConfig.delegationMaxTimeoutMs = baseConfig.delegationMaxTimeoutMs;
  mockConfig.delegationMaxConcurrentPerCaller = baseConfig.delegationMaxConcurrentPerCaller;
  mockConfig.delegationMaxDepth = baseConfig.delegationMaxDepth;
}

beforeEach(() => {
  vi.clearAllMocks();
  setFlag(false);
  mockAgentService.getById.mockImplementation(async (id: string) =>
    id === AGENT_ID ? { id: AGENT_ID, companyId: COMPANY_ID, name: "CEO" } : null,
  );
});

describe("delegation routes — flag OFF gate", () => {
  it("returns 503 on POST /delegations before zod validation", async () => {
    const res = await request(createApp(agentActor))
      .post("/api/delegations")
      .send({}); // intentionally empty — 503 must fire before zod 400
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/disabled/i);
  });

  it("returns 503 on POST /delegations/await", async () => {
    const res = await request(createApp(agentActor))
      .post("/api/delegations/await")
      .send({ traceIds: [TRACE_ID] });
    expect(res.status).toBe(503);
  });

  it("returns 503 on GET /delegations/:traceId", async () => {
    const res = await request(createApp(agentActor)).get(
      `/api/delegations/${TRACE_ID}`,
    );
    expect(res.status).toBe(503);
  });

  it("returns 503 on POST /delegations/:traceId/cancel", async () => {
    const res = await request(createApp(agentActor))
      .post(`/api/delegations/${TRACE_ID}/cancel`)
      .send({});
    expect(res.status).toBe(503);
  });
});

describe("delegation routes — auth", () => {
  beforeEach(() => setFlag(true));

  it("returns 401 when actor is not an agent (board user)", async () => {
    const res = await request(createApp(boardActor))
      .post("/api/delegations")
      .send({
        targetAgentId: TARGET_ID,
        task: "do the thing",
      });
    expect(res.status).toBe(401);
  });

  it("returns 401 when actor type is none", async () => {
    const res = await request(createApp({ type: "none", source: "none" }))
      .post("/api/delegations")
      .send({
        targetAgentId: TARGET_ID,
        task: "do the thing",
      });
    expect(res.status).toBe(401);
  });

  it("returns 401 when caller agent not found in DB", async () => {
    mockAgentService.getById.mockResolvedValueOnce(null);
    const res = await request(createApp(agentActor))
      .post("/api/delegations")
      .send({
        targetAgentId: TARGET_ID,
        task: "do the thing",
      });
    expect(res.status).toBe(401);
  });
});

describe("delegation routes — happy path", () => {
  beforeEach(() => setFlag(true));

  it("POST /delegations creates a delegation and returns 201", async () => {
    mockSvc.create.mockResolvedValueOnce({
      id: "issue-1",
      traceId: TRACE_ID,
      companyId: COMPANY_ID,
      callerAgentId: AGENT_ID,
      targetAgentId: TARGET_ID,
      parentIssueId: null,
      status: "pending",
      requestedAt: new Date(),
      completedAt: null,
      depth: 1,
      meta: { timeoutMs: 300_000, turnMode: "do" },
      task: "Fix X",
    });

    const res = await request(createApp(agentActor))
      .post("/api/delegations")
      .send({
        targetAgentId: TARGET_ID,
        task: "Fix X",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      traceId: TRACE_ID,
      status: "pending",
      depth: 1,
    });
    // Ensure caller context was derived from actor, not body.
    const call = (mockSvc.create as Mock).mock.calls[0][0];
    expect(call.callerAgentId).toBe(AGENT_ID);
    expect(call.companyId).toBe(COMPANY_ID);
    expect(call.callerRunId).toBe(RUN_ID);
  });

  it("POST /delegations rejects body without targetAgentId (400)", async () => {
    const res = await request(createApp(agentActor))
      .post("/api/delegations")
      .send({ task: "missing target" });
    expect(res.status).toBe(400);
  });

  it("POST /delegations ignores any companyId / callerAgentId smuggled in body", async () => {
    mockSvc.create.mockResolvedValueOnce({
      id: "issue-2",
      traceId: TRACE_ID,
      companyId: COMPANY_ID,
      callerAgentId: AGENT_ID,
      targetAgentId: TARGET_ID,
      parentIssueId: null,
      status: "pending",
      requestedAt: new Date(),
      completedAt: null,
      depth: 1,
      meta: { timeoutMs: 300_000, turnMode: "do" },
      task: "Fix X",
    });

    await request(createApp(agentActor))
      .post("/api/delegations")
      .send({
        targetAgentId: TARGET_ID,
        task: "Fix X",
        companyId: "attacker-company",
        callerAgentId: "attacker-agent",
      });

    const call = (mockSvc.create as Mock).mock.calls[0][0];
    expect(call.companyId).toBe(COMPANY_ID);
    expect(call.callerAgentId).toBe(AGENT_ID);
  });

  it("POST /delegations/await returns aggregated results", async () => {
    mockSvc.await.mockResolvedValueOnce([
      { traceId: TRACE_ID, status: "done", durationMs: 1234 },
    ]);
    const res = await request(createApp(agentActor))
      .post("/api/delegations/await")
      .send({ traceIds: [TRACE_ID] });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("done");
  });

  it("GET /delegations/:traceId returns 404 when missing", async () => {
    mockSvc.get.mockResolvedValueOnce(null);
    const res = await request(createApp(agentActor)).get(
      `/api/delegations/${TRACE_ID}`,
    );
    expect(res.status).toBe(404);
  });

  it("GET /delegations/:traceId enforces company isolation", async () => {
    mockSvc.get.mockResolvedValueOnce({
      id: "issue-other",
      traceId: TRACE_ID,
      companyId: "other-company",
      callerAgentId: "someone",
      targetAgentId: TARGET_ID,
      parentIssueId: null,
      status: "pending",
      requestedAt: new Date(),
      completedAt: null,
      depth: 1,
      meta: { timeoutMs: 300_000, turnMode: "do" },
      task: "Fix X",
    });
    const res = await request(createApp(agentActor)).get(
      `/api/delegations/${TRACE_ID}`,
    );
    expect(res.status).toBe(403);
  });

  it("POST /cancel rejects when the caller is not the original caller", async () => {
    mockSvc.findByTraceId.mockResolvedValueOnce({
      id: "issue-3",
      companyId: COMPANY_ID,
      createdByAgentId: "different-caller",
      status: "todo",
      originKind: "delegation",
      originId: TRACE_ID,
    } as any);
    const res = await request(createApp(agentActor))
      .post(`/api/delegations/${TRACE_ID}/cancel`)
      .send({ reason: "nevermind" });
    expect(res.status).toBe(403);
    expect(mockSvc.cancel).not.toHaveBeenCalled();
  });

  it("GET /companies/:companyId/delegations is NOT flag-gated and returns list", async () => {
    setFlag(false); // explicitly off — list must still work
    mockSvc.listByCompany.mockResolvedValueOnce([
      {
        id: "issue-a",
        traceId: TRACE_ID,
        companyId: COMPANY_ID,
        callerAgentId: AGENT_ID,
        targetAgentId: TARGET_ID,
        parentIssueId: null,
        status: "done",
        requestedAt: new Date(),
        completedAt: new Date(),
        depth: 1,
        meta: { timeoutMs: 300_000, turnMode: "do" },
        task: "seeded",
      },
    ]);
    const res = await request(createApp(boardActor)).get(
      `/api/companies/${COMPANY_ID}/delegations`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].traceId).toBe(TRACE_ID);
    expect(mockSvc.listByCompany).toHaveBeenCalledWith(COMPANY_ID, { limit: undefined });
  });

  it("GET /companies/:companyId/delegations enforces company isolation for non-admin session users", async () => {
    const sessionUser: ActorShape = {
      type: "board",
      userId: "user-1",
      companyIds: [COMPANY_ID],
      source: "session",
      isInstanceAdmin: false,
    };
    const res = await request(createApp(sessionUser)).get(
      `/api/companies/other-company-id/delegations`,
    );
    expect(res.status).toBe(403);
  });

  it("POST /cancel succeeds when caller matches", async () => {
    mockSvc.findByTraceId.mockResolvedValueOnce({
      id: "issue-3",
      companyId: COMPANY_ID,
      createdByAgentId: AGENT_ID,
      status: "todo",
      originKind: "delegation",
      originId: TRACE_ID,
    } as any);
    mockSvc.cancel.mockResolvedValueOnce(undefined);
    const res = await request(createApp(agentActor))
      .post(`/api/delegations/${TRACE_ID}/cancel`)
      .send({ reason: "done early" });
    expect(res.status).toBe(200);
    expect(mockSvc.cancel).toHaveBeenCalledWith(TRACE_ID, "done early");
  });
});
