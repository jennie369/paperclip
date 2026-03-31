import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { dashboardService } from "../services/dashboard.js";
import { assertCompanyAccess } from "./authz.js";

export function dashboardRoutes(db: Db) {
  const router = Router();
  const svc = dashboardService(db);

  router.get("/companies/:companyId/dashboard", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    try {
      const summary = await svc.summary(companyId);
      res.json(summary);
    } catch (err: any) {
      console.error("[dashboard] Error:", err?.message || err);
      res.status(500).json({ error: err?.message || "Dashboard query failed" });
    }
  });

  return router;
}
