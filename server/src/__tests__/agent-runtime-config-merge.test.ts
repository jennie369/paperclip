import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INBOX_MINE_ISSUE_STATUS_FILTER } from "@paperclipai/shared";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";

const agentId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";

const baseAgent = {
  id: agentId,
  companyId,
  name: "Builder",
  urlKey: "builder",
  role: "engineer",
  title: "Builder",
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
  createdAt: new Date("2026-03-19T00:00:00.000Z"),
  updatedAt: new Date("2026-03-19T00:00:00.000Z"),
};

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  updatePermissions: vi.fn(),
  getChainOfCommand: vi.fn(),
  resolveByReference: vi.fn(),
  update: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
  getMembership: vi.fn(),
  ensureMembership: vi.fn(),
  listPrincipalGrants: vi.fn(),
  setPrincipalPermission: vi.fn(),
}));

const mockApprovalService = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
}));

const mockBudgetService = vi.hoisted(() => ({
  upsertPolicy: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  listTaskSessions: vi.fn(),
  resetRuntimeSession: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  linkManyForApproval: vi.fn(),
}));

const mockIssueService = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockSecretService = vi.hoisted(() => ({
  normalizeAdapterConfigForPersistence: vi.fn(),
  resolveAdapterConfigForRuntime: vi.fn(),
}));

const mockAgentInstructionsService = vi.hoisted(() => ({
  materializeManagedBundle: vi.fn(),
}));
const mockCompanySkillService = vi.hoisted(() => ({
  listRuntimeSkillEntries: vi.fn(),
  resolveRequestedSkillKeys: vi.fn(),
}));
const mockWorkspaceOperationService = vi.hoisted(() => ({}));
const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  agentInstructionsService: () => mockAgentInstructionsService,
  accessService: () => mockAccessService,
  approvalService: () => mockApprovalService,
  companySkillService: () => mockCompanySkillService,
  budgetService: () => mockBudgetService,
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => mockIssueApprovalService,
  issueService: () => mockIssueService,
  logActivity: mockLogActivity,
  secretService: () => mockSecretService,
  syncInstructionsBundleConfigFromFilePath: vi.fn((_agent, config) => config),
  workspaceOperationService: () => mockWorkspaceOperationService,
}));

function createDbStub() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue([{
            id: companyId,
            name: "Paperclip",
            requireBoardApprovalForNewAgents: false,
          }]),
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

// GEM-1048: PATCH runtimeConfig used to REPLACE the whole object, so a partial
// `{heartbeat:{cronExpression}}` dropped `enabled` and the agent stopped waking.
describe("PATCH /agents/:id runtimeConfig merge", () => {
  const board = {
    type: "board",
    userId: "board-user",
    source: "local_implicit",
    isInstanceAdmin: true,
    companyIds: [companyId],
  };
  const existingRuntimeConfig = {
    heartbeat: {
      enabled: true,
      cooldownSec: 10,
      intervalSec: 0,
      wakeOnDemand: true,
      cronExpression: "40 9,16,20 * * *",
      maxConcurrentRuns: 1,
    },
    sessionCompaction: { enabled: false },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.getById.mockResolvedValue({ ...baseAgent, runtimeConfig: existingRuntimeConfig });
    mockAgentService.getChainOfCommand.mockResolvedValue([]);
    mockAgentService.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
      ...baseAgent,
      ...patch,
    }));
  });

  it("keeps sibling heartbeat keys and other runtimeConfig keys on a partial heartbeat patch", async () => {
    const res = await request(createApp(board))
      .patch(`/api/agents/${agentId}`)
      .send({ runtimeConfig: { heartbeat: { cronExpression: "15 9,16,20 * * *" } } });

    expect(res.status).toBe(200);
    const patch = mockAgentService.update.mock.calls[0]![1] as Record<string, any>;
    expect(patch.runtimeConfig).toEqual({
      heartbeat: { ...existingRuntimeConfig.heartbeat, cronExpression: "15 9,16,20 * * *" },
      sessionCompaction: { enabled: false },
    });
    expect(patch.lastHeartbeatAt).toBeInstanceOf(Date);
  });

  it("keeps heartbeat untouched when only another runtimeConfig key is patched", async () => {
    const res = await request(createApp(board))
      .patch(`/api/agents/${agentId}`)
      .send({ runtimeConfig: { sessionCompaction: { enabled: true } } });

    expect(res.status).toBe(200);
    const patch = mockAgentService.update.mock.calls[0]![1] as Record<string, any>;
    expect(patch.runtimeConfig.heartbeat).toEqual(existingRuntimeConfig.heartbeat);
    expect(patch.runtimeConfig.sessionCompaction).toEqual({ enabled: true });
  });
});
