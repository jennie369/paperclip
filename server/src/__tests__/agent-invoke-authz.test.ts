import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";

// Plan: crypto-pattern-scanner/docs/plans_reports/2026-08-16-CEO-SELF-HEAL-HEARTBEAT-INVOKE-AUTHZ_ARCHITECTURE_PLAN.md §5.3
// Boundary under test: `/agents/:id/heartbeat/invoke` + `/agents/:id/wakeup` allow
//   self · board · ancestor in chain of command — and NOTHING else
//   (no `role === "ceo"` shortcut, no `canCreateAgents` / `agents:create` grant).

const companyId = "22222222-2222-4222-8222-222222222222";
const otherCompanyId = "33333333-3333-4333-8333-333333333333";
const targetId = "11111111-1111-4111-8111-111111111111";
const managerId = "44444444-4444-4444-8444-444444444444";
const grandManagerId = "55555555-5555-4555-8555-555555555555";
const siblingId = "66666666-6666-4666-8666-666666666666";
const creatorId = "77777777-7777-4777-8777-777777777777";
const ceoLabelId = "88888888-8888-4888-8888-888888888888";
const foreignId = "99999999-9999-4999-8999-999999999999";

function makeAgent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    companyId,
    name: `Agent ${id.slice(0, 4)}`,
    urlKey: `agent-${id.slice(0, 4)}`,
    role: "engineer",
    title: null,
    icon: null,
    status: "idle",
    reportsTo: null,
    capabilities: null,
    adapterType: "process",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-08-16T00:00:00.000Z"),
    updatedAt: new Date("2026-08-16T00:00:00.000Z"),
    ...overrides,
  };
}

const AGENTS: Record<string, ReturnType<typeof makeAgent>> = {
  [targetId]: makeAgent(targetId, { reportsTo: managerId }),
  [managerId]: makeAgent(managerId, { reportsTo: grandManagerId, role: "manager" }),
  [grandManagerId]: makeAgent(grandManagerId, { role: "ceo" }),
  [siblingId]: makeAgent(siblingId, { reportsTo: managerId }),
  // creator: has BOTH permission flag and (mocked) explicit grant, but is NOT in target chain
  [creatorId]: makeAgent(creatorId, { permissions: { canCreateAgents: true } }),
  // "ceo" label but not an ancestor of target
  [ceoLabelId]: makeAgent(ceoLabelId, { role: "ceo" }),
  [foreignId]: makeAgent(foreignId, { companyId: otherCompanyId }),
};

// chain of command of TARGET = [manager, grandManager]
const TARGET_CHAIN = [
  { id: managerId, name: "M", role: "manager", title: null },
  { id: grandManagerId, name: "G", role: "ceo", title: null },
];

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  getChainOfCommand: vi.fn(),
  resolveByReference: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
  getMembership: vi.fn(),
  ensureMembership: vi.fn(),
  listPrincipalGrants: vi.fn(),
  setPrincipalPermission: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  invoke: vi.fn(),
  wakeup: vi.fn(),
  listTaskSessions: vi.fn(),
  resetRuntimeSession: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  agentInstructionsService: () => ({ materializeManagedBundle: vi.fn() }),
  accessService: () => mockAccessService,
  approvalService: () => ({ create: vi.fn(), getById: vi.fn() }),
  companySkillService: () => ({ listRuntimeSkillEntries: vi.fn(), resolveRequestedSkillKeys: vi.fn() }),
  budgetService: () => ({ upsertPolicy: vi.fn() }),
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => ({ linkManyForApproval: vi.fn() }),
  issueService: () => ({ list: vi.fn() }),
  logActivity: mockLogActivity,
  secretService: () => ({
    normalizeAdapterConfigForPersistence: vi.fn(),
    resolveAdapterConfigForRuntime: vi.fn(),
  }),
  syncInstructionsBundleConfigFromFilePath: vi.fn((_agent, config) => config),
  workspaceOperationService: () => ({}),
}));

function createDbStub() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue([{ id: companyId, name: "Paperclip" }]),
        }),
      }),
    }),
  };
}

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", agentRoutes(createDbStub() as any));
  app.use(errorHandler);
  return app;
}

function agentActor(agentId: string, cid = companyId) {
  return { type: "agent", agentId, companyId: cid, companyIds: [cid] };
}

const ROUTES = [
  { name: "heartbeat/invoke", path: `/api/agents/${targetId}/heartbeat/invoke`, svc: "invoke" as const },
  { name: "wakeup", path: `/api/agents/${targetId}/wakeup`, svc: "wakeup" as const },
];

describe("agent heartbeat invoke/wakeup authz — chain of command only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.getById.mockImplementation(async (id: string) => AGENTS[id] ?? null);
    mockAgentService.getChainOfCommand.mockImplementation(async (id: string) =>
      id === targetId ? TARGET_CHAIN : [],
    );
    // creator ALSO has explicit grant — must still be denied (Codex R2 negative test)
    mockAccessService.hasPermission.mockImplementation(
      async (_cid: string, _ptype: string, pid: string, key: string) => pid === creatorId && key === "agents:create",
    );
    mockHeartbeatService.invoke.mockResolvedValue({ id: "run-1", status: "queued" });
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "run-2", status: "queued" });
    mockLogActivity.mockResolvedValue(undefined);
  });

  for (const route of ROUTES) {
    describe(route.name, () => {
      it("self → 202", async () => {
        const res = await request(createApp(agentActor(targetId))).post(route.path).send({});
        expect(res.status).toBe(202);
        expect(mockHeartbeatService[route.svc]).toHaveBeenCalledTimes(1);
      });

      it("direct manager (in chain) → 202", async () => {
        const res = await request(createApp(agentActor(managerId))).post(route.path).send({});
        expect(res.status).toBe(202);
        expect(mockHeartbeatService[route.svc]).toHaveBeenCalledTimes(1);
      });

      it("indirect manager (grand-manager in chain) → 202", async () => {
        const res = await request(createApp(agentActor(grandManagerId))).post(route.path).send({});
        expect(res.status).toBe(202);
      });

      it("creator with canCreateAgents + agents:create grant but NOT in chain → 403", async () => {
        const res = await request(createApp(agentActor(creatorId))).post(route.path).send({});
        expect(res.status).toBe(403);
        expect(mockHeartbeatService[route.svc]).not.toHaveBeenCalled();
      });

      it("agent labelled role=ceo but NOT in chain → 403 (no role shortcut)", async () => {
        const res = await request(createApp(agentActor(ceoLabelId))).post(route.path).send({});
        expect(res.status).toBe(403);
        expect(mockHeartbeatService[route.svc]).not.toHaveBeenCalled();
      });

      it("sibling (same manager) → 403", async () => {
        const res = await request(createApp(agentActor(siblingId))).post(route.path).send({});
        expect(res.status).toBe(403);
        expect(mockHeartbeatService[route.svc]).not.toHaveBeenCalled();
      });

      it("agent from another company → 403", async () => {
        const res = await request(createApp(agentActor(foreignId, otherCompanyId))).post(route.path).send({});
        expect(res.status).toBe(403);
        expect(mockHeartbeatService[route.svc]).not.toHaveBeenCalled();
      });

      it("board local_implicit → 202 (unchanged behaviour)", async () => {
        const res = await request(
          createApp({ type: "board", userId: "board-user", source: "local_implicit", isInstanceAdmin: true, companyIds: [companyId] }),
        )
          .post(route.path)
          .send({});
        expect(res.status).toBe(202);
      });
    });
  }
});
