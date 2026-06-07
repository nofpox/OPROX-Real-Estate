/**
 * Debug routes — only active in development (NODE_ENV !== "production").
 * POST /debug/test-email?to=you@gmail.com
 *
 * Sends a minimal plain-text test email directly via the Resend SDK so you
 * can confirm end-to-end connectivity without going through any auth flow.
 * Returns the full Resend response (data + error) in the JSON reply.
 */
import { Router } from "express";
import { Resend } from "resend";
import { logger } from "../lib/logger.js";

const router = Router();

const isDev = process.env.NODE_ENV !== "production";

router.post("/debug/test-email", async (req, res) => {
  if (!isDev) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const to = (req.query.to as string | undefined) ?? (req.body?.to as string | undefined);
  if (!to || !to.includes("@")) {
    res.status(400).json({ error: "Provide recipient via ?to=email@example.com or body { to }" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "RESEND_API_KEY is not set — email is disabled" });
    return;
  }

  const from   = process.env.SENDER_EMAIL ?? "روزوز للحلول الذكية <onboarding@resend.dev>";
  const subject = "[Rozoz Debug] Test email from API server";
  const html    = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111">✅ Test email — server is talking to Resend</h2>
      <p style="margin:0 0 8px;color:#555;font-size:14px">This was sent from <strong>POST /debug/test-email</strong> on the API server.</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;margin:16px 0">
        <tr><td style="color:#888;padding:4px 8px 4px 0">From</td><td style="color:#111">${from}</td></tr>
        <tr><td style="color:#888;padding:4px 8px 4px 0">To</td><td style="color:#111">${to}</td></tr>
        <tr><td style="color:#888;padding:4px 8px 4px 0">SENDER_EMAIL set?</td><td style="color:#111">${process.env.SENDER_EMAIL ? "YES ✅" : "NO ❌ — test sender (hotmail only)"}</td></tr>
        <tr><td style="color:#888;padding:4px 8px 4px 0">NODE_ENV</td><td style="color:#111">${process.env.NODE_ENV ?? "undefined"}</td></tr>
        <tr><td style="color:#888;padding:4px 8px 4px 0">Sent at</td><td style="color:#111">${new Date().toISOString()}</td></tr>
      </table>
      <p style="margin:0;color:#aaa;font-size:11px">If you see this email, Resend delivery is working. If not, check your spam folder first.</p>
    </div>
  `;

  logger.info({ to, from, subject }, "DEBUG test-email: sending");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from, to: [to], subject, html });

  if (error) {
    logger.error(
      { to, from, resendStatus: (error as any).statusCode, resendError: error.message },
      `DEBUG test-email: RESEND ERROR — ${error.message}`
    );
    res.status(502).json({
      ok: false,
      error: error.message,
      statusCode: (error as any).statusCode,
      hint: !process.env.SENDER_EMAIL
        ? "SENDER_EMAIL is not set. Resend test sender only delivers to the verified account owner email (nofabark@hotmail.com). Set SENDER_EMAIL to a verified domain address to send to any recipient."
        : "Domain may not be verified yet in Resend dashboard.",
    });
    return;
  }

  logger.info({ to, emailId: (data as any)?.id }, "DEBUG test-email: delivered");
  res.json({
    ok: true,
    emailId: (data as any)?.id,
    from,
    to,
    senderEmailSet: !!process.env.SENDER_EMAIL,
    hint: !process.env.SENDER_EMAIL
      ? "⚠️  SENDER_EMAIL not set — if recipient is not nofabark@hotmail.com, this email will NOT arrive despite Resend saying 'Delivered'."
      : "✅ Custom SENDER_EMAIL is set.",
  });
});

export default router;
