// Regression guard (plan 2026-08-19 §5.5, Codex code-R1-F1): đường gửi Graph API /channels/facebook/send
// KHÔNG được nằm trong exempt của remoteApiKeyGuard (kẻo tunnel công khai gửi Messenger không cần API key).
// CHỈ /webhook (Meta gọi vào) + /oauth (redirect trình duyệt) được exempt.
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { remoteApiKeyGuard } from "../middleware/remote-api-key-guard.js";

function app() {
  const a = express();
  a.use(express.json());
  a.use(remoteApiKeyGuard("secret-key"));
  a.all("/channels/facebook/send", (_req, res) => res.json({ reached: true }));
  a.all("/channels/facebook/webhook", (_req, res) => res.json({ reached: true }));
  a.all("/channels/facebook/oauth/callback", (_req, res) => res.json({ reached: true }));
  return a;
}

const REMOTE = { "cf-ray": "test" }; // Cloudflare-tunnel marker → isRemoteRequest=true

describe("remoteApiKeyGuard — facebook exempt boundary", () => {
  it("remote POST /channels/facebook/send WITHOUT key → 401 (không exempt)", async () => {
    const res = await request(app()).post("/channels/facebook/send").set(REMOTE).send({});
    expect(res.status).toBe(401);
  });

  it("remote POST /channels/facebook/send WITH valid key → qua", async () => {
    const res = await request(app()).post("/channels/facebook/send")
      .set({ ...REMOTE, authorization: "Bearer secret-key" }).send({});
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
  });

  it("remote GET /channels/facebook/webhook → exempt (Meta verify không mang key)", async () => {
    const res = await request(app()).get("/channels/facebook/webhook").set(REMOTE);
    expect(res.status).toBe(200);
  });

  it("remote GET /channels/facebook/oauth/callback → exempt (redirect trình duyệt)", async () => {
    const res = await request(app()).get("/channels/facebook/oauth/callback").set(REMOTE);
    expect(res.status).toBe(200);
  });

  it("LOCAL POST /channels/facebook/send (không cf-ray) → qua (trusted loopback)", async () => {
    const res = await request(app()).post("/channels/facebook/send").send({});
    expect(res.status).toBe(200);
  });
});
