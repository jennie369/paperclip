// Unit test cho cleanupClaimedRow (plan 2026-08-19 §5.2, Codex R6 P2-g2).
// 3 nhánh dọn row đã claim khi Graph từ chối — không chạm mạng, dùng fake supabase client.
import { describe, expect, it } from "vitest";
import { cleanupClaimedRow } from "../channels/facebook/webhook.js";

/**
 * Fake `db` khớp bề mặt cleanupClaimedRow dùng:
 *   db.from(table).delete().eq(col, val)  → Promise<{ error }>
 *   db.from(table).update(obj).eq(col, val) → Promise<{ error }>
 */
function fakeDb(opts: { deleteError?: { message: string } | null; updateError?: { message: string } | null }) {
  const calls = { deleted: false, updated: false };
  const from = () => ({
    delete: () => ({
      eq: async () => {
        calls.deleted = true;
        return { error: opts.deleteError ?? null };
      },
    }),
    update: () => ({
      eq: async () => {
        calls.updated = true;
        return { error: opts.updateError ?? null };
      },
    }),
  });
  return { db: { from } as any, calls };
}

describe("cleanupClaimedRow", () => {
  it("delete OK → 400, chỉ error message, không cờ, không update", async () => {
    const { db, calls } = fakeDb({ deleteError: null });
    const r = await cleanupClaimedRow(db, "row-1", "Graph nói không");
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("Graph nói không");
    expect(r.body.cleanup_degraded).toBeUndefined();
    expect(r.body.cleanup_failed).toBeUndefined();
    expect(calls.deleted).toBe(true);
    expect(calls.updated).toBe(false); // delete OK ⇒ không cần fallback update
  });

  it("delete lỗi, update OK → cleanup_degraded + câu 'còn hiện trong lịch sử'", async () => {
    const { db, calls } = fakeDb({ deleteError: { message: "del boom" }, updateError: null });
    const r = await cleanupClaimedRow(db, "row-2", "Graph nói không");
    expect(r.status).toBe(400);
    expect(r.body.cleanup_degraded).toBe(true);
    expect(r.body.cleanup_failed).toBeUndefined();
    expect(String(r.body.error)).toContain("còn hiện trong lịch sử");
    expect(calls.updated).toBe(true);
  });

  it("delete lỗi, update lỗi → cleanup_failed + câu 'dọn sổ thất bại'", async () => {
    const { db } = fakeDb({ deleteError: { message: "del boom" }, updateError: { message: "upd boom" } });
    const r = await cleanupClaimedRow(db, "row-3", "Graph nói không");
    expect(r.status).toBe(400);
    expect(r.body.cleanup_failed).toBe(true);
    expect(r.body.cleanup_degraded).toBeUndefined();
    expect(String(r.body.error)).toContain("dọn sổ thất bại");
  });
});
