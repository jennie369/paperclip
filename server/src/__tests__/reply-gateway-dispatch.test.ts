// Reply Gateway Contract — deliverReplyOnce dispatch (P2, offline).
//
// Mocks the supabase client so the claim-before-send state machine is verified
// without a live DB: insert→send→sent, 23505→skip (no send), send-throw→failed,
// no-key→send-once. The real 23505 round-trip against the live UNIQUE index is a
// P2 verify step done with the owner (deploy-time).
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock the supabase client deliver-once.ts imports ──
// A tiny chainable stub. `insertResult` is set per-test; update calls are recorded.
const state: {
  insertResult: { data: any; error: any };
  updates: Array<Record<string, any>>;
} = { insertResult: { data: { id: "row-1" }, error: null }, updates: [] };

vi.mock("../channels/zalo-personal/supabase.js", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => state.insertResult,
        }),
      }),
      update: (payload: Record<string, any>) => {
        state.updates.push(payload);
        return { eq: async () => ({ data: null, error: null }) };
      },
    }),
  },
}));

import { deliverReplyOnce } from "../channels/deliver-once.js";

const logRow = {
  channel_name: "cskh-internal",
  thread_id: "u1",
  body: "Dạ em chào chị ạ.",
  sent_by: "agent:sales-closer",
};

describe("deliverReplyOnce (P2 claim-before-send)", () => {
  beforeEach(() => {
    state.insertResult = { data: { id: "row-1" }, error: null };
    state.updates = [];
  });

  it("insert ok → runs deliverFn → marks sent + stamps platform id", async () => {
    const deliverFn = vi.fn(async () => ({ platformMessageId: "pmid-42" }));
    const outcome = await deliverReplyOnce("reply:cskh-internal:u1:b1", logRow, deliverFn);
    expect(outcome).toBe("sent");
    expect(deliverFn).toHaveBeenCalledTimes(1);
    expect(state.updates).toEqual([{ status: "sent", platform_message_id: "pmid-42" }]);
  });

  it("23505 unique violation → SKIP, deliverFn NOT called (double blocked)", async () => {
    state.insertResult = { data: null, error: { code: "23505", message: "duplicate key" } };
    const deliverFn = vi.fn(async () => ({ platformMessageId: "x" }));
    const outcome = await deliverReplyOnce("reply:cskh-internal:u1:b1", logRow, deliverFn);
    expect(outcome).toBe("duplicate_skipped");
    expect(deliverFn).not.toHaveBeenCalled();
    expect(state.updates).toEqual([]); // no update — we never claimed the row
  });

  it("deliverFn throws → marks failed, no retry", async () => {
    const deliverFn = vi.fn(async () => {
      throw new Error("zalo protocol timeout");
    });
    const outcome = await deliverReplyOnce("reply:cskh-internal:u1:b1", logRow, deliverFn);
    expect(outcome).toBe("failed");
    expect(deliverFn).toHaveBeenCalledTimes(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].status).toBe("failed");
    expect(state.updates[0].error_message).toContain("zalo protocol timeout");
  });

  it("non-dup insert error → throws (never swallow a real DB error)", async () => {
    state.insertResult = { data: null, error: { code: "23503", message: "fk violation" } };
    const deliverFn = vi.fn(async () => ({ platformMessageId: "x" }));
    await expect(
      deliverReplyOnce("reply:cskh-internal:u1:b1", logRow, deliverFn),
    ).rejects.toMatchObject({ code: "23503" });
    expect(deliverFn).not.toHaveBeenCalled();
  });

  it("no dedupeKey (manual/human path) → deliver once, no claim", async () => {
    const deliverFn = vi.fn(async () => ({ platformMessageId: "x" }));
    const outcome = await deliverReplyOnce("", logRow, deliverFn);
    expect(outcome).toBe("sent");
    expect(deliverFn).toHaveBeenCalledTimes(1);
    expect(state.updates).toEqual([]); // no DB claim for manual path
  });
});
