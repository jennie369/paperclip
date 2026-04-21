// Delegation HTTP routes — thin layer over agentDelegationService.
//
// Auth model (see middleware/auth.ts + routes/authz.ts):
//   - req.actor.type === "agent" is REQUIRED on every endpoint.
//     In local_trusted mode, actor middleware resolves agent from the
//     `x-paperclip-run-id` header. In authenticated mode, agents pass an
//     agent API key as Bearer token.
//   - Caller agentId + companyId + runId are derived from req.actor
//     (and/or looked up from the runs/agents tables). Body fields that
//     would re-assert those values are REJECTED implicitly by only
//     exposing a narrow schema.
//
// Gating:
//   - config.delegationEnabled=false → every endpoint returns 503.
//     This keeps the routes discoverable + typecheckable without
//     enabling the feature until P4.
//
// SSOT boundaries (RULE 5):
//   - This route does NOT read or resolve from `paperclip_agents` (router
//     domain). Target is identified by UUID from the heartbeat `agents`
//     table. A slug→id convenience layer belongs in the MCP tool (P4).
//
// Plan: memory/reports/2026-04-21-delegate-to-agent-plan.md §P2.
import { Router, type Request } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import {
  agentService,
  heartbeatService,
  issueService,
} from "../services/index.js";
import { agentDelegationService } from "../services/agent-delegation.js";
import { loadConfig } from "../config.js";
import { HttpError, forbidden, notFound, unauthorized } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const createDelegationSchema = z.object({
  targetAgentId: z.string().uuid(),
  task: z.string().trim().min(1).max(10_000),
  timeoutMs: z.number().int().min(30_000).max(1_800_000).optional(),
  turnMode: z.enum(["ask", "do", "delegate"]).optional(),
  callerIssueId: z.string().uuid().nullable().optional(),
});

const awaitDelegationSchema = z.object({
  traceIds: z.array(z.string().uuid()).min(1).max(50),
  timeoutMs: z.number().int().min(1_000).max(1_800_000).optional(),
});

const cancelDelegationSchema = z.object({
  reason: z.string().max(500).optional(),
});

const traceIdParamSchema = z.string().uuid();

export function delegationRoutes(db: Db) {
  const router = Router();
  const agentsSvc = agentService(db);
  const heartbeat = heartbeatService(db);
  const issues = issueService(db);
  const config = loadConfig();
  const svc = agentDelegationService(
    db,
    { heartbeat, issues },
    {
      defaultTimeoutMs: config.delegationDefaultTimeoutMs,
      maxTimeoutMs: config.delegationMaxTimeoutMs,
      maxConcurrentPerCaller: config.delegationMaxConcurrentPerCaller,
      maxDepth: config.delegationMaxDepth,
    },
  );

  // Read-only list for the UI — NOT gated by the feature flag. This lets
  // P3 ship a visible observability page even while the feature is off
  // (empty state instead of 503 error). Company isolation still applies.
  router.get("/companies/:companyId/delegations", async (req, res) => {
    const { companyId } = req.params;
    assertCompanyAccess(req, companyId);
    const limitParam = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(limitParam) ? limitParam : undefined;
    const rows = await svc.listByCompany(companyId, { limit });
    res.json(rows);
  });

  // Router-level gate for MUTATING / action endpoints below. Runs before
  // zod validate() so the smoke test `curl POST /api/delegations` (with any
  // body, including empty) returns 503 cleanly while the flag is off. When we
  // flip the flag (P4), this middleware becomes a pass-through.
  router.use((_req, _res, next) => {
    if (!config.delegationEnabled) {
      return next(
        new HttpError(
          503,
          "Delegation feature is disabled (PAPERCLIP_DELEGATION_ENABLED=false)",
        ),
      );
    }
    next();
  });

  async function assertCallerAgent(req: Request) {
    if (req.actor.type !== "agent" || !req.actor.agentId) {
      throw unauthorized(
        "Delegation endpoints require agent authentication (x-paperclip-run-id header or agent API key)",
      );
    }
    const caller = await agentsSvc.getById(req.actor.agentId);
    if (!caller) throw unauthorized("Caller agent not found");
    assertCompanyAccess(req, caller.companyId);
    return caller;
  }

  function parseTraceIdParam(raw: unknown): string {
    const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    const parsed = traceIdParamSchema.safeParse(value);
    if (!parsed.success) {
      throw new HttpError(400, "traceId must be a UUID");
    }
    return parsed.data;
  }

  router.post(
    "/delegations",
    validate(createDelegationSchema),
    async (req, res) => {
      const caller = await assertCallerAgent(req);
      const body = req.body as z.infer<typeof createDelegationSchema>;
      const actor = getActorInfo(req);

      const delegation = await svc.create({
        companyId: caller.companyId,
        callerAgentId: caller.id,
        // Trust only the run id the actor middleware derived (from the
        // header-auth path or an agent API key). Never from body.
        callerRunId: actor.runId,
        callerIssueId: body.callerIssueId ?? null,
        targetAgentId: body.targetAgentId,
        task: body.task,
        timeoutMs: body.timeoutMs,
        turnMode: body.turnMode,
      });

      res.status(201).json({
        delegationId: delegation.id,
        issueId: delegation.id,
        traceId: delegation.traceId,
        status: delegation.status,
        depth: delegation.depth,
        meta: delegation.meta,
      });
    },
  );

  router.post(
    "/delegations/await",
    validate(awaitDelegationSchema),
    async (req, res) => {
      await assertCallerAgent(req);
      const body = req.body as z.infer<typeof awaitDelegationSchema>;
      const results = await svc.await(body.traceIds, body.timeoutMs);
      res.json({ results });
    },
  );

  router.post(
    "/delegations/:traceId/cancel",
    validate(cancelDelegationSchema),
    async (req, res) => {
      const caller = await assertCallerAgent(req);
      const traceId = parseTraceIdParam(req.params.traceId);
      const { reason } = req.body as z.infer<typeof cancelDelegationSchema>;
      const row = await svc.findByTraceId(traceId);
      if (!row) throw notFound(`Delegation not found: ${traceId}`);
      assertCompanyAccess(req, row.companyId);
      if (row.createdByAgentId !== caller.id) {
        throw forbidden("Only the caller agent can cancel this delegation");
      }
      await svc.cancel(traceId, reason ?? null);
      res.json({ ok: true });
    },
  );

  router.get("/delegations/:traceId", async (req, res) => {
    await assertCallerAgent(req);
    const traceId = parseTraceIdParam(req.params.traceId);
    const row = await svc.get(traceId);
    if (!row) throw notFound(`Delegation not found: ${traceId}`);
    assertCompanyAccess(req, row.companyId);
    res.json(row);
  });

  return router;
}
