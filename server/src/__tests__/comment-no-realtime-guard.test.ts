// Comment guard — bình luận bài viết KHÔNG được agent kênh trả real-time (2026-08-05).
//
// Bối cảnh: `sales-closer` (agent mặc định kênh fb-*) đã trả 57 bình luận công khai,
// gồm cả câu lỗi "Xin lỗi, em không thể xử lý yêu cầu này." Gốc: `resolveAgent` không
// phân biệt comment với tin nhắn → comment rơi Tier-3 channel default.
// Chốt chặn: Tier 0 trong `resolveAgent` trả '' khi peerKind==='comment'; bình luận
// thuộc agent hẹn-giờ `comment-responder` (wake 08:00/20:00) trả BATCH qua Graph API.
//
// Probe DOGFOOD 2 CHIỀU (bản HEAD trước fix phải FAIL ở chiều dương):
//   (+) comment  → trả '', _skipReason='comment_no_realtime', KHÔNG chạm DB
//   (−) direct/group → guard KHÔNG bắt (vẫn vào Tier 1-3, có chạm DB)
// Chiều (−) là negative-control chống guard bắt quá tay làm câm hộp thư thật.
//
// ⚠️ ĐO THẬT khi dogfood ngược (tắt guard, 2026-08-05): test "trả ''" VẪN XANH vì
// supabase giả trả rỗng → channel_instances không có agent_slug → cũng ra ''. Một
// mình nó là XANH GIẢ. Răng thật nằm ở 2 test kia: `_skipReason` (chứng minh đi qua
// ĐÚNG nhánh guard, không phải rơi rỗng ngẫu nhiên) + `fromCalls===[]` (chứng minh
// short-circuit TRƯỚC DB). Đừng xoá 2 test đó khi refactor — xoá là mất cảm biến.
import { describe, expect, it, vi, beforeEach } from "vitest";

// Đếm số lần chạm DB. Guard Tier 0 phải short-circuit TRƯỚC mọi truy vấn —
// nếu nó chạy sau Tier 1 thì `fromCalls` vẫn tăng và test này bắt được.
const state: { fromCalls: string[] } = { fromCalls: [] };

vi.mock("../channels/zalo-personal/supabase.js", () => ({
  supabase: {
    from: (table: string) => {
      state.fromCalls.push(table);
      const thenable = {
        select: () => thenable,
        or: () => thenable,
        eq: () => thenable,
        order: () => thenable,
        limit: async () => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return thenable;
    },
  },
}));

import { resolveAgent } from "../channels/router.js";

function msg(peerKind: "direct" | "group" | "comment") {
  return {
    id: "m1",
    channel: "fb-jennie",
    channelType: "facebook",
    chatId: "1234_5678",
    senderId: "9999",
    senderName: "Khách Test",
    content: "Sản phẩm này bao nhiêu tiền vậy shop?",
    peerKind,
    timestamp: new Date().toISOString(),
  } as any;
}

describe("resolveAgent — comment không reply real-time (Tier 0)", () => {
  beforeEach(() => {
    state.fromCalls = [];
  });

  it("(+) peerKind='comment' → trả '' (no agent), KHÔNG agent nào được gọi", async () => {
    const m = msg("comment");
    const slug = await resolveAgent(m);
    expect(slug).toBe("");
  });

  it("(+) peerKind='comment' → gắn _skipReason='comment_no_realtime' cho consumer log", async () => {
    const m = msg("comment");
    await resolveAgent(m);
    expect((m as any)._skipReason).toBe("comment_no_realtime");
  });

  it("(+) peerKind='comment' → short-circuit TRƯỚC mọi truy vấn DB (0 lần chạm bảng)", async () => {
    await resolveAgent(msg("comment"));
    expect(state.fromCalls).toEqual([]);
  });

  it("(−) negative-control: 'direct' KHÔNG bị guard bắt — vẫn đi tiếp Tier 1-3 (có chạm DB)", async () => {
    const m = msg("direct");
    await resolveAgent(m);
    expect((m as any)._skipReason).not.toBe("comment_no_realtime");
    expect(state.fromCalls.length).toBeGreaterThan(0);
    expect(state.fromCalls).toContain("chat_ignored");
  });

  it("(−) negative-control: 'group' KHÔNG bị guard bắt — hộp thư nhóm giữ nguyên", async () => {
    const m = msg("group");
    await resolveAgent(m);
    expect((m as any)._skipReason).not.toBe("comment_no_realtime");
    expect(state.fromCalls.length).toBeGreaterThan(0);
  });
});
