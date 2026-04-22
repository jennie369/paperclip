import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { TIMETABLE_SOURCE_TABLES, type TimetableSourceTable } from "@paperclipai/db";
import {
  issueService,
  logActivity,
  timetableService,
  type TimetableFilters,
} from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { badRequest } from "../errors.js";

export function timetableRoutes(db: Db) {
  const router = Router();
  const svc = timetableService(db);
  const issues = issueService(db);

  /**
   * GET /api/companies/:companyId/timetable?date=YYYY-MM-DD&q=&sort=&group=&types=&status=&agentId=
   * Returns unified timetable rows + KPIs for a given local HCM day.
   */
  router.get("/companies/:companyId/timetable", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const date =
      typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

    const filters: TimetableFilters = {
      companyId,
      date,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      agentId: typeof req.query.agentId === "string" ? req.query.agentId : undefined,
      types:
        typeof req.query.types === "string"
          ? req.query.types.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      status:
        typeof req.query.status === "string"
          ? (req.query.status.split(",").map((s) => s.trim()).filter(Boolean) as TimetableFilters["status"])
          : undefined,
      sort: parseSort(req.query.sort),
      group: parseGroup(req.query.group),
    };

    const result = await svc.list(filters);
    res.json(result);
  });

  /**
   * POST /api/companies/:companyId/timetable/manual
   * Body: { startsAt, endsAt?, agentId?, kind, title, description?, note?, createAsIssue? }
   * If createAsIssue=true and agentId set: also creates an issue (origin_kind='manual_timetable')
   * and links it back to the manual row.
   */
  router.post("/companies/:companyId/timetable/manual", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);

    const body = req.body as {
      startsAt?: string;
      endsAt?: string | null;
      agentId?: string | null;
      kind?: string;
      title?: string;
      description?: string | null;
      note?: string | null;
      createAsIssue?: boolean;
    };

    if (!body.title || typeof body.title !== "string") throw badRequest("title is required");
    if (!body.startsAt || typeof body.startsAt !== "string") throw badRequest("startsAt is required");
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw badRequest("startsAt must be a valid ISO timestamp");
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (endsAt && Number.isNaN(endsAt.getTime())) throw badRequest("endsAt must be a valid ISO timestamp");
    const kind = body.kind && typeof body.kind === "string" ? body.kind : "manual_task";

    let issueId: string | null = null;
    if (body.createAsIssue && body.agentId) {
      const issue = await issues.create(companyId, {
        title: body.title,
        description: body.description ?? null,
        priority: "medium",
        status: "todo",
        assigneeAgentId: body.agentId,
        originKind: "manual_timetable",
        createdByAgentId: actor.agentId,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      });
      issueId = issue.id;
    }

    const row = await svc.createManual({
      companyId,
      startsAt,
      endsAt,
      agentId: body.agentId ?? null,
      kind,
      title: body.title,
      description: body.description ?? null,
      note: body.note ?? null,
      issueId,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      createdByAgentId: actor.agentId,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "timetable.manual_row_created",
      entityType: "timetable_manual_row",
      entityId: row.id,
      details: {
        title: row.title,
        kind: row.kind,
        agentId: row.agentId,
        issueId: row.issueId,
        createdAsIssue: Boolean(body.createAsIssue),
      },
    });

    res.status(201).json({ row, issueId });
  });

  /**
   * POST /api/companies/:companyId/timetable/notes
   * Body: { sourceTable, sourceId, resultOverride?, note? }
   * Upserts timetable_row_notes + writes activity_log.
   */
  router.post("/companies/:companyId/timetable/notes", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);

    const body = req.body as {
      sourceTable?: string;
      sourceId?: string;
      resultOverride?: string | null;
      note?: string | null;
    };

    if (!body.sourceTable || !body.sourceId) {
      throw badRequest("sourceTable and sourceId are required");
    }
    if (!TIMETABLE_SOURCE_TABLES.includes(body.sourceTable as TimetableSourceTable)) {
      throw badRequest(
        `Invalid sourceTable. Allowed: ${TIMETABLE_SOURCE_TABLES.join(", ")}`,
      );
    }

    const saved = await svc.upsertNote({
      companyId,
      sourceTable: body.sourceTable as TimetableSourceTable,
      sourceId: body.sourceId,
      resultOverride: body.resultOverride ?? null,
      note: body.note ?? null,
      updatedByUserId: actor.actorType === "user" ? actor.actorId : null,
      updatedByAgentId: actor.agentId,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "timetable.note_edited",
      entityType: "timetable_note",
      entityId: `${saved.sourceTable}:${saved.sourceId}`,
      details: {
        sourceTable: saved.sourceTable,
        sourceId: saved.sourceId,
        hasResultOverride: Boolean(saved.resultOverride),
        hasNote: Boolean(saved.note),
      },
    });

    res.json(saved);
  });

  return router;
}

function parseSort(raw: unknown): TimetableFilters["sort"] | undefined {
  if (typeof raw !== "string") return undefined;
  const [field, dir] = raw.split(":");
  if (!["time", "agent", "kind", "status", "result"].includes(field!)) return undefined;
  return {
    field: field as NonNullable<TimetableFilters["sort"]>["field"],
    dir: dir === "desc" ? "desc" : "asc",
  };
}

function parseGroup(raw: unknown): TimetableFilters["group"] | undefined {
  if (typeof raw !== "string") return undefined;
  if (["none", "time_of_day", "agent", "kind", "status", "has_note"].includes(raw)) {
    return raw as TimetableFilters["group"];
  }
  return undefined;
}
