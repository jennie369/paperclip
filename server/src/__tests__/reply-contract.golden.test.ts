// Golden-set eval — Reply Gateway Contract (TẦNG GATE, P0 baseline).
//
// Each case = one historical reply-domain bug (evolution-log 01-paperclip). The
// grader is 100% code-based (regex/equality), offline, deterministic, <5s. This
// PINS current scrub/marker behavior BEFORE the gateway refactor moves the
// functions into reply-contract.ts (P1) — so a cut-paste regression turns the
// suite red instead of reaching a customer.
//
// Plan: docs/plans_reports/2026-07-10-REPLY-GATEWAY-CONTRACT_ARCHITECTURE_PLAN.md §7.2
// P0 imports from ../channels/router.js (temp exports). P1 will re-point to
// ../channels/reply-contract.js (router re-exports keep this import valid either way).
import { describe, expect, it } from "vitest";
import {
  scrubBannedPhrases,
  stripInternalMarkers,
  parseEscalationMarker,
  postProcessReply,
  runAgentWithConfig,
  AgentAbortedError,
} from "../channels/router.js";
import {
  buildBatchId,
  buildReplyDedupeKey,
  detectPriceLeak,
  isUniqueViolation,
  assertSent,
} from "../channels/reply-contract.js";

// Minimal config stub — postProcessReply only reads slug/provider and writes
// side-channels (_escalation/_outboundMedia) onto the object we pass in.
const cfg = () => ({ slug: "sales-closer", provider: "claude" }) as any;

describe("reply-contract golden-set (P0 baseline)", () => {
  // ── G1: output-style collapse → corrupted → handoff + escalation ──
  it("G1 backtick/insight collapse → safe handoff + escalation set", async () => {
    const config = cfg();
    const input =
      "★ Insight ─────────────────────────────────────\n" +
      "Some internal reasoning about the customer.\n" +
      "─────────────────────────────────────────────────\n`";
    const out = await postProcessReply(input, config, null);
    // Original had letters, scrub nuked them → NOT the raw backtick.
    expect(out).not.toBe("`");
    expect(out.length).toBeGreaterThan(0);
    // Corrupted collapse escalates (bot_paused + ticket downstream).
    expect((config as any)._escalation).toBeTruthy();
    expect((config as any)._escalation.reason).toBe("agent_output_corrupted");
  });

  // ── G2: pure self-narration → SILENT skip (no escalation) ──
  it("G2 pure self-narration → empty string, NO escalation", async () => {
    const config = cfg();
    const input =
      "*** Em đã đọc xong bối cảnh, soạn tin nhắn phản hồi rồi log tiến độ vào today.md và tạo báo cáo trong docs/tasksdone rồi ạ.";
    const out = await postProcessReply(input, config, null);
    expect(out).toBe("");
    expect((config as any)._escalation).toBeFalsy();
  });

  // ── G3: narration TAIL after a real reply (Rule 8b) → cut tail, keep reply ──
  it("G3 narration tail after real reply → real reply kept", () => {
    const input =
      "Dạ chị ơi bên em có gói TIER 1 phù hợp ạ.\n*** Em đã tạo báo cáo trong docs/tasksdone rồi ạ.";
    const out = scrubBannedPhrases(input, "sales-closer");
    expect(out).toContain("gói TIER 1 phù hợp");
    expect(out).not.toMatch(/docs\/tasksdone/);
  });

  // ── G4: task-log PREFIX (Rule 9) → cut prefix, keep Vietnamese reply ──
  it("G4 task-log prefix → cut, keep reply", () => {
    const input =
      'Task completed: python -c "import os; os.walk(\'.\')"\nTask logs:\n.\\memory\\sops\\REF-PRODUCT-CATALOG.md\n\nDạ chị ơi em gửi thông tin sản phẩm nhé.';
    const out = scrubBannedPhrases(input, "sales-closer");
    expect(out).toContain("Dạ chị ơi em gửi thông tin sản phẩm");
    expect(out).not.toMatch(/Task completed:|Task logs:/);
  });

  // ── G5: English action-narration PREFIX (Rule 10) → cut, keep Vietnamese ──
  it("G5 EN narration prefix → cut, keep Vietnamese reply", () => {
    const input =
      "I will wait for the background search task to complete to check the SOPs.\n\nDạ em gửi chị thông tin ạ.";
    const out = scrubBannedPhrases(input, "sales-closer");
    expect(out).toContain("Dạ em gửi chị thông tin");
    expect(out).not.toMatch(/I will wait for the background/);
  });

  // ── G6: owner name leak (Rule 1) ──
  it("G6 owner name → 'team chuyên môn cấp cao'", () => {
    const out = scrubBannedPhrases("Để chị Jennie hỗ trợ mình nhé.", "sales-closer");
    expect(out).not.toMatch(/jennie/i);
    expect(out).toContain("team chuyên môn cấp cao");
  });

  // ── G7: short-time promise (Rule 2) ──
  it("G7 short-time promise → '24-48 tiếng'", () => {
    const out = scrubBannedPhrases("Em xử lý trong 5 phút nhé ạ.", "sales-closer");
    expect(out).not.toMatch(/trong\s+5\s*phút/i);
    expect(out).toContain("trong vòng 24-48 tiếng");
  });

  // ── G8: raw JSONL provider-stream leak → safe fallback ──
  it("G8 JSONL raw leak → safe fallback line", async () => {
    const input =
      '{"type":"init","role":"system"}\n{"type":"message","content":"..."}';
    const out = await postProcessReply(input, cfg(), null);
    expect(out).toBe("Xin lỗi, hệ thống đang xử lý. Vui lòng thử lại sau.");
  });

  // ── G9: [[CALL: ...key="v"]] severed marker → no fragment leaks ──
  it("G9 CALL marker with kwargs → stripped, no fragment", () => {
    const input =
      'Dạ em ghi nhận ạ [[CALL: crm_update(stage="x", lifecycle_stage="consideration")]] cảm ơn chị.';
    const out = stripInternalMarkers(input);
    expect(out).not.toMatch(/lifecycle_stage/);
    expect(out).not.toMatch(/\bCALL\b/);
    expect(out).toContain("Dạ em ghi nhận");
    expect(out).toContain("cảm ơn chị");
  });

  // ── G10: genuine customer [[...]] brackets survive ──
  it("G10 customer brackets [[3,4]] / [[bao nhiêu]] survive", () => {
    const input = "combo [[3,4]] giá [[bao nhiêu]] vậy em?";
    const out = stripInternalMarkers(input);
    expect(out).toContain("[[3,4]]");
    expect(out).toContain("[[bao nhiêu]]");
  });

  // ── G11: [[SEND_MEDIA: id]] survives stripInternalMarkers (parsed downstream) ──
  it("G11 SEND_MEDIA marker survives strip", () => {
    const input = "Dạ em gửi ảnh nhé [[SEND_MEDIA: crystal_01]]";
    const out = stripInternalMarkers(input);
    expect(out).toMatch(/\[\[\s*SEND_MEDIA/i);
  });

  // ── G12: [[MSG_BREAK]] does not leak to the customer ──
  it("G12 MSG_BREAK marker stripped from final output, text on both sides kept", async () => {
    const input = "Dạ chào chị ạ. [[MSG_BREAK]] Em tư vấn giúp chị nhé.";
    const out = await postProcessReply(input, cfg(), null);
    expect(out).not.toMatch(/MSG_BREAK/);
    expect(out).toContain("Dạ chào chị");
    expect(out).toContain("Em tư vấn giúp chị");
  });

  // ── G13: [[ESCALATE: ...]] parsed → intent + marker stripped ──
  it("G13 ESCALATE marker → intent parsed, text cleaned", () => {
    const input =
      'Dạ em rất tiếc về trải nghiệm này ạ. [[ESCALATE: reason="customer_hostile", priority="high", summary="khách bức xúc"]]';
    const { cleanedText, escalation } = parseEscalationMarker(input);
    expect(escalation).toBeTruthy();
    expect(escalation!.reason).toBe("customer_hostile");
    expect(cleanedText).not.toMatch(/ESCALATE/);
    expect(cleanedText).toContain("Dạ em rất tiếc");
  });

  // ── G14: meta-label prefix (Rule 7) ──
  it("G14 meta-label prefix 'Reply gửi chị X:' → stripped", () => {
    const out = scrubBannedPhrases("Reply gửi chị Trang: Dạ em chào chị ạ.", "sales-closer");
    expect(out).not.toMatch(/^Reply gửi/i);
    expect(out).toContain("Dạ em chào chị");
  });

  // ── G15: thinking-token leak (Rule 3a) ──
  it("G15 <thinking>...</thinking> stripped", () => {
    const out = scrubBannedPhrases("<thinking>need to check price</thinking>Dạ giá bên em ạ.", "sales-closer");
    expect(out).not.toMatch(/thinking/i);
    expect(out).toContain("Dạ giá bên em");
  });

  // ── G16: tool-marker (Rule 3b) ──
  it("G16 [CALL: ...] single-bracket tool marker stripped", () => {
    const out = scrubBannedPhrases("Dạ [DEBUG: fetching] em kiểm tra giúp chị ạ.", "sales-closer");
    expect(out).not.toMatch(/DEBUG/);
    expect(out).toContain("em kiểm tra giúp chị");
  });

  // ── G19: scrub idempotent — scrub(scrub(x)) === scrub(x) ──
  it("G19 scrub idempotent across all offending inputs", () => {
    const inputs = [
      "Để chị Jennie hỗ trợ mình nhé.",
      "Em xử lý trong 5 phút nhé ạ.",
      "<thinking>x</thinking>Dạ ạ.",
      "Reply gửi chị Trang: Dạ ạ.",
      "Dạ ạ.\n*** Em đã tạo báo cáo trong docs/tasksdone rồi ạ.",
    ];
    for (const s of inputs) {
      const once = scrubBannedPhrases(s, "sales-closer");
      const twice = scrubBannedPhrases(once, "sales-closer");
      expect(twice).toBe(once);
    }
  });

  // ── G20: clean Vietnamese reply passes through unchanged (anti over-scrub) ──
  it("G20 clean replies pass through unchanged", () => {
    const clean = [
      "Dạ chào chị, bên em có 3 gói khóa học phù hợp với nhu cầu của chị ạ.",
      "Chị cho em xin số điện thoại để tư vấn kỹ hơn nhé ạ.",
      "Dạ combo này gồm 2 khóa, chị tham khảo rồi phản hồi giúp em nha.",
    ];
    for (const s of clean) {
      expect(scrubBannedPhrases(s, "sales-closer")).toBe(s);
    }
  });

  // ── G17: emission key determinism — same row set → same key (Codex C3) ──
  it("G17 buildBatchId is order-independent; different set → different key", () => {
    const a = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const b = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const c = "33333333-cccc-4ccc-8ccc-cccccccccccc";
    // Same set, different input order → SAME batchId (= min uuid).
    expect(buildBatchId([a, b, c])).toBe(buildBatchId([c, a, b]));
    expect(buildBatchId([b, c, a])).toBe(a); // min lexicographic
    // Different set (a message left/joined) → different batchId.
    expect(buildBatchId([a, b])).not.toBe(buildBatchId([b, c]));
    // Empty set → safe sentinel.
    expect(buildBatchId([])).toBe("");
    // Full key shape.
    expect(buildReplyDedupeKey("cskh-internal:u1:u1", a)).toBe(
      `reply:cskh-internal:u1:u1:${a}`,
    );
  });

  // ── G18: price-leak detector — real prices match, phone/order/date don't ──
  it("G18 detectPriceLeak matches real VND prices, not phone/order/date", () => {
    const prices = [
      "29.999.000đ",
      "20.999.000 vnđ",
      "68 triệu",
      "68tr",
      "gói này giá 68.000.000đ nhé chị",
      "SĐT 090.123.456, giá 68.000.000đ", // price still matches after masking phone
    ];
    for (const s of prices) expect(detectPriceLeak(s)).toBe(true);

    const notPrices = [
      "SĐT của em là 090.123.456 đừng lo nha",
      "đơn hàng mã #20260710 đã lên nhé",
      "hẹn chị ngày 10.07.2026 ạ",
      "cấp cho chị 3.500 điểm thưởng",
      "Dạ chị cho em xin thông tin nhé ạ.",
    ];
    for (const s of notPrices) expect(detectPriceLeak(s)).toBe(false);
  });

  // ── isUniqueViolation — code OR message, duck-typed (Codex C10) ──
  it("isUniqueViolation detects 23505 by code and by message", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ message: "duplicate key value violates unique constraint idx_csm_dedupe" })).toBe(true);
    expect(isUniqueViolation({ code: "23503", message: "foreign key" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("boom")).toBe(false);
  });

  // ── Cancel-in-flight: a pre-aborted signal throws AgentAbortedError (NOT '') ──
  // This is the C1 core: abort must be a TYPED error so the consumer un-claims +
  // re-coalesces, instead of a '' that looks like a genuine empty reply (which
  // would mark the batch agent_silent and lose the customer's message). The entry
  // guard fires before any DB/spawn work, so this is a pure unit test.
  it("runAgentWithConfig throws AgentAbortedError on a pre-aborted signal", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      runAgentWithConfig({ slug: "sales-closer", provider: "claude" } as any, "sk", "hi", [], ctrl.signal),
    ).rejects.toBeInstanceOf(AgentAbortedError);
  });

  it("AgentAbortedError is an Error subclass named AgentAbortedError", () => {
    const e = new AgentAbortedError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("AgentAbortedError");
  });

  // ── assertSent — throw on !success, else return platform id (Codex F2) ──
  it("assertSent throws on failed send, returns platform id on success", () => {
    expect(() => assertSent({ success: false, error: "zalo timeout" })).toThrow(/zalo timeout/);
    expect(() => assertSent({ success: false })).toThrow(/success!==true/);
    expect(() => assertSent(null)).toThrow();
    expect(() => assertSent(undefined)).toThrow();
    expect(assertSent({ success: true, messageId: "m1" })).toEqual({ platformMessageId: "m1" });
    expect(assertSent({ success: true, id: "d1" })).toEqual({ platformMessageId: "d1" });
    expect(assertSent({ success: true, commentId: "c1" })).toEqual({ platformMessageId: "c1" });
    expect(assertSent({ success: true })).toEqual({ platformMessageId: null });
  });
});
