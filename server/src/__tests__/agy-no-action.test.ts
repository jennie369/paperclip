import { describe, expect, it } from "vitest";
import { countAntigravityActionCalls } from "@paperclipai/adapter-antigravity-local/server";
import { planQuotaRetry } from "../services/quota-retry.js";

// GEM-1307 — run d5ca8b44 (Yinyang 16:15, 07/10): agy read its prompt twice, printed
// the SPEC-LOCK table, ended the turn. Status was "succeeded", slot stayed empty.
const d5ca8b44 = [
  { agyKind: "user" as const, text: "<USER_REQUEST> Dùng công cụ đọc file (view_file)…" },
  { agyKind: "tool_call" as const, name: "view_file", input: { AbsolutePath: "agy_prompt_d5ca8b44.md" } },
  { agyKind: "tool_call" as const, name: "view_file", input: { AbsolutePath: "agy_prompt_d5ca8b44.md" } },
  { agyKind: "assistant" as const, text: "### ⚓ Khối Định Danh Neo 4 Điểm … 📋 BẢNG GIAO KÈO SỐ" },
];

describe("countAntigravityActionCalls", () => {
  it("run chỉ đọc file (d5ca8b44) = 0 hành động → no_action", () => {
    expect(countAntigravityActionCalls(d5ca8b44)).toBe(0);
  });
  it("run có run_command / write_to_file = có hành động", () => {
    const acted = [...d5ca8b44, { agyKind: "tool_call" as const, name: "run_command", input: {} }];
    expect(countAntigravityActionCalls(acted)).toBe(1);
    expect(countAntigravityActionCalls([{ agyKind: "tool_call", name: "write_to_file" }])).toBe(1);
  });
  it("tên tool lạ (MCP mới) tính là hành động — không bắt oan việc thật", () => {
    expect(countAntigravityActionCalls([{ agyKind: "tool_call", name: "mcp_supabase_execute_sql" }])).toBe(1);
  });
  it("chỉ grep/list/search = vẫn 0", () => {
    const ro = ["grep_search", "list_dir", "find_by_name", "search_web", "VIEW_FILE"].map((name) => ({
      agyKind: "tool_call" as const,
      name,
    }));
    expect(countAntigravityActionCalls(ro)).toBe(0);
  });
});

describe("antigravity_no_action → retry ngắn trong khung slot", () => {
  const base = { runId: "d5ca8b44", issueId: null, fromTimer: true, now: new Date("2026-10-07T09:15:00Z"), random: () => 0 };
  it("lần 1 retry +10 phút, hết 2 lần thì dừng", () => {
    const plan = planQuotaRetry({ ...base, errorCode: "antigravity_no_action", priorAttempts: 0 });
    expect(plan).not.toBeNull();
    expect(new Date(plan!.retryAt).getTime() - base.now.getTime()).toBe(10 * 60_000);
    expect(planQuotaRetry({ ...base, errorCode: "antigravity_no_action", priorAttempts: 2 })).toBeNull();
  });
});
