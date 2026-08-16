import { Router } from "express";

// Admin dev-tools proxy → gemral Supabase edge functions.
//
// send-test-email: ConfigHub "Gửi test" nút — preview template. send-email siết auth
// (2026-07-24 lockdown) chỉ chấp backend-secret | admin-JWT; browser KHÔNG cầm secret.
// Route này (sau remoteApiKeyGuard — local trusted / remote cần PAPERCLIP_REMOTE_API_KEY)
// giữ SB_SECRET_BACKEND server-side, forward tới send-email. Browser chỉ gửi {to, template}.
export function toolsRoutes() {
  const router = Router();
  const SUPABASE_URL = process.env.GEMRAL_SUPABASE_URL || "https://pgfkbcnzqozzkohwbgbk.supabase.co";

  router.post("/send-test-email", async (req, res) => {
    const secret = process.env.SB_SECRET_BACKEND;
    if (!secret) {
      res.status(500).json({ success: false, error: "SB_SECRET_BACKEND not configured on server" });
      return;
    }
    const { to, template, data, subject } = req.body ?? {};
    if (!to || !template) {
      res.status(400).json({ success: false, error: "Missing required fields: to, template" });
      return;
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ to, template, data, subject }),
      });
      const result = await r.json().catch(() => ({}));
      res.status(r.status).json(result);
    } catch (e) {
      res.status(502).json({ success: false, error: e instanceof Error ? e.message : "send failed" });
    }
  });

  return router;
}
