import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { healthRoutes } from "../routes/health.js";

// Resilience trước Supabase pooler stall (plan 2026-08-16). Verify-by-effect:
// (1) DB khỏe → 200 ok; (2) DB lỗi → 503 nhanh; (3) DB TREO → handler KHÔNG treo,
// trả 503 trong deadline (< 8s watcher SLA) nhờ withDeadline + SET LOCAL + single-flight.

function makeApp(db: unknown) {
  const app = express();
  app.use(
    "/health",
    healthRoutes(db as never, {
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      authReady: true,
      companyDeletionEnabled: true,
    }),
  );
  return app;
}

// Mock db chỉ cần `.transaction(cb)` cho liveness probe (local_trusted bỏ qua enrichment).
const healthyDb = {
  transaction: async (cb: (tx: { execute: (q: unknown) => Promise<void> }) => Promise<void>) =>
    cb({ execute: async () => {} }),
};

const rejectingDb = {
  transaction: async () => {
    throw Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" });
  },
};

const hangingDb = {
  // Không bao giờ resolve — mô phỏng pooler stall giữ connection.
  transaction: () => new Promise<void>(() => {}),
};

describe("GET /api/health resilience (pooler stall)", () => {
  it("trả 200 ok khi DB khỏe", async () => {
    const res = await request(makeApp(healthyDb)).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("trả 503 database_unreachable khi DB lỗi (statement timeout)", async () => {
    const res = await request(makeApp(rejectingDb)).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("database_unreachable");
  });

  it("KHÔNG treo khi DB stall — trả 503 trong deadline (không chờ tới 2min)", async () => {
    // Real timers: đo wall-clock thật. Handler phải trả 503 trong ~HEALTH_DEADLINE (5s),
    // TUYỆT ĐỐI KHÔNG treo tới statement_timeout 2min. Assert elapsed < 8s (watcher SLA).
    const started = Date.now();
    const res = await request(makeApp(hangingDb)).get("/health");
    const elapsed = Date.now() - started;
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("database_unreachable");
    expect(elapsed).toBeLessThan(8000); // < HEALTH_TIMEOUT_SEC của watcher
  }, 12000);
});
