import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { boundedPoll, SCHEDULER_POLL_TIMEOUT_MS } from "../services/bounded-poll.js";

// F2 (plan 2026-08-18 pooler-stall). Verify-by-effect:
// (1) SET LOCAL statement_timeout được execute TRƯỚC thao tác chính, trong CÙNG transaction.
// (2) query đang chạy quá hạn bị server HỦY nhanh (nhả slot pool) thay vì treo tới global 2min —
//     đây là kịch bản Codex R2 đòi: "active blocked query releases capacity within SLA".

describe("boundedPoll — SET LOCAL ordering (unit, mock tx)", () => {
  it("gửi SET LOCAL statement_timeout TRƯỚC callback, trong cùng transaction", async () => {
    const executed: string[] = [];
    const tx = {
      execute: vi.fn(async (q: unknown) => {
        // drizzle sql.raw → { queryChunks: [...] }; ghi lại dạng chuỗi để assert thứ tự
        executed.push(JSON.stringify(q));
        return undefined;
      }),
    };
    const fakeDb = {
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    } as never;

    const marker = await boundedPoll(fakeDb, async (t) => {
      await t.execute(sql`SELECT 1`);
      return "done";
    }, 15_000);

    expect(marker).toBe("done");
    expect(tx.execute).toHaveBeenCalledTimes(2);
    // Lần execute đầu tiên PHẢI là SET LOCAL statement_timeout (bound trước khi chạy op chính)
    expect(executed[0]).toContain("SET LOCAL statement_timeout");
    expect(executed[0]).toContain("15000");
    // Op chính (SELECT 1) chạy SAU
    expect(executed[1]).toContain("SELECT 1");
  });

  it("default timeout = SCHEDULER_POLL_TIMEOUT_MS (15s)", async () => {
    const executed: string[] = [];
    const tx = { execute: vi.fn(async (q: unknown) => { executed.push(JSON.stringify(q)); }) };
    const fakeDb = { transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx) } as never;
    await boundedPoll(fakeDb, async () => undefined);
    expect(executed[0]).toContain(String(SCHEDULER_POLL_TIMEOUT_MS));
  });
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;
if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping boundedPoll integration test on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("boundedPoll — active query cut by SET LOCAL (integration)", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-bounded-poll-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("query đang chạy (pg_sleep 10s) bị HỦY trong ≤3s khi statement_timeout=2s — slot được nhả", async () => {
    const started = Date.now();
    let errCode: string | undefined;
    let threw = false;
    try {
      await boundedPoll(db, (tx) => tx.execute(sql`SELECT pg_sleep(10)`), 2000);
    } catch (e) {
      threw = true;
      errCode = (e as { code?: string })?.code;
    }
    const elapsed = Date.now() - started;
    expect(threw).toBe(true);
    // 57014 = canceling statement due to statement timeout
    expect(errCode).toBe("57014");
    // Bị cắt nhanh (≤3s), TUYỆT ĐỐI KHÔNG chờ statement_timeout global (thường phút)
    expect(elapsed).toBeLessThan(3000);
  }, 15_000);

  it("query bình thường (dưới ngưỡng) chạy xong không bị cắt", async () => {
    const rows = await boundedPoll(db, (tx) => tx.execute(sql`SELECT 42 AS v`), 5000);
    expect(rows).toBeTruthy();
  }, 10_000);
});
