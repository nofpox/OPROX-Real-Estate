import { Router } from "express";
import { randomUUID } from "crypto";
import { db, rkzUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { logger } from "../lib/logger.js";

const router = Router();

const rkzResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SENDER    = process.env.SENDER_EMAIL ?? "RKZ <onboarding@resend.dev>";

logger.info(
  { sender: SENDER, usingTestSender: !process.env.SENDER_EMAIL },
  !process.env.SENDER_EMAIL
    ? "RKZ Resend: SENDER_EMAIL not set — using onboarding@resend.dev (test mode: delivers only to Resend account owner)"
    : "RKZ Resend: using custom SENDER_EMAIL domain"
);

/**
 * Thin wrapper around rkzResend.emails.send() that inspects the SDK return value.
 * The Resend SDK NEVER throws — it returns { data, error }; unchecked calls silently swallow errors.
 */
async function rkzResendSend(
  payload: { from: string; to: string[]; subject: string; html: string },
  label: string
): Promise<void> {
  if (!rkzResend) return;
  const { data, error } = await rkzResend.emails.send(payload);
  if (error) {
    logger.error(
      { label, to: payload.to, from: payload.from, resendStatus: (error as any).statusCode, resendError: error.message },
      `RKZ RESEND ERROR [${label}]: ${error.message}`
    );
    throw new Error(`Resend delivery failed (${label}): ${error.message}`);
  }
  logger.info({ label, to: payload.to, emailId: (data as any)?.id }, `rkz email dispatched: ${label}`);
}

/** Send a bilingual welcome email to a brand-new RKZ user on first registration. */
async function sendRkzWelcomeEmail(to: string, name: string | null): Promise<void> {
  if (!rkzResend) return;
  const greeting = name ? name : to.split("@")[0];
  await rkzResendSend({
    from:    SENDER,
    to:      [to],
    subject: "Welcome to RKZ — رمز التحقق | مرحباً بك في RKZ",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <!-- Header -->
        <div style="background:#0A1628;padding:22px 28px;display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;background:#D4A843;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏠</div>
          <div>
            <p style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:2px">RKZ</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5)">محرك النشر العقاري الفوري</p>
          </div>
        </div>
        <!-- Body EN -->
        <div style="padding:28px">
          <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#111">Welcome to RKZ, ${greeting}! 🎉</h2>
          <p style="margin:0 0 18px;color:#555;font-size:14px;line-height:1.7">
            Your RKZ account has been activated. You now have access to Saudi Arabia's instant
            property publishing engine — browse listings, submit inquiries, and manage your property search all in one place.
          </p>
          <div style="background:#f9f6ee;border:1px solid #D4A843;border-radius:8px;padding:14px 20px;margin:0 0 18px">
            <p style="margin:0 0 4px;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Registered Email</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111;font-family:monospace">${to}</p>
          </div>
          <p style="margin:0 0 24px;color:#555;font-size:13px;line-height:1.6">
            To sign in next time, simply open the RKZ app and enter your phone number and email — we'll send you a fresh verification code instantly.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px"/>
          <!-- AR section -->
          <h2 style="margin:0 0 10px;font-size:17px;font-weight:700;color:#111;direction:rtl;text-align:right">مرحباً بك في RKZ، ${greeting}! 🎉</h2>
          <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.7;direction:rtl;text-align:right">
            تم تفعيل حسابك في RKZ. يمكنك الآن تصفح العقارات وتقديم الاستفسارات وإدارة بحثك العقاري بكل سهولة.
          </p>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.6;direction:rtl;text-align:right;color:#555">
            لتسجيل الدخول في المرة القادمة، افتح تطبيق RKZ وأدخل رقم هاتفك وبريدك الإلكتروني — سنرسل لك رمز تحقق جديداً فوراً.
          </p>
          <p style="margin:24px 0 0;color:#aaa;font-size:11px;text-align:center;line-height:1.6">
            If you did not create this account, please ignore this email.<br/>
            إذا لم تُنشئ هذا الحساب، يرجى تجاهل هذه الرسالة.
          </p>
        </div>
      </div>
    `,
  }, "sendRkzWelcomeEmail");
}

// In-memory OTP store: pendingKey → { phone, email, otp, expiresAt }
const pendingOtps = new Map<string, { phone: string; email: string; otp: string; expiresAt: number }>();

// ── Token extraction helper ──────────────────────────────────────────────────
export function extractRkzToken(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== "string") return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ── Auth middleware — attaches rkzUser to request ────────────────────────────
export async function requireRkzAuth(req: any, res: any, next: any) {
  const token = extractRkzToken(req);
  if (!token) { res.status(401).json({ error: "RKZ auth token required" }); return; }
  const [user] = await db.select().from(rkzUsersTable).where(eq(rkzUsersTable.authToken, token)).limit(1);
  if (!user) { res.status(401).json({ error: "Invalid or expired token" }); return; }
  req.rkzUser = user;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/auth/login
// Step 1: accept phone + email, generate OTP, send to email
// Body: { phone, email, name? }
// Returns: { pendingKey } — plus demoOtp when RESEND_API_KEY is not set
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/auth/login", async (req, res) => {
  const { phone, email, name } = req.body as { phone?: string; email?: string; name?: string };

  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "phone is required" }); return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "valid email is required" }); return;
  }

  const normalised = phone.trim().replace(/\s+/g, "");
  const emailNorm  = email.trim().toLowerCase();

  const otp        = String(Math.floor(100000 + Math.random() * 900000));
  const pendingKey = randomUUID();
  pendingOtps.set(pendingKey, { phone: normalised, email: emailNorm, otp, expiresAt: Date.now() + 5 * 60_000 });

  if (rkzResend) {
    try {
      await rkzResendSend({
        from: SENDER,
        to:   [emailNorm],
        subject: "رمز التحقق | Verification Code – RKZ",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:#0A1628;padding:20px 28px;display:flex;align-items:center;gap:12px">
              <div style="width:40px;height:40px;background:#D4A843;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">🏠</div>
              <div>
                <p style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:2px">RKZ</p>
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5)">محرك النشر العقاري الفوري</p>
              </div>
            </div>
            <div style="padding:28px">
              <h2 style="margin:0 0 8px;font-size:18px;color:#111">Verification Code / رمز التحقق</h2>
              <p style="margin:0 0 20px;color:#555;font-size:14px">Use this 6-digit code to complete your sign-in. It expires in <strong>5 minutes</strong>.<br/><span style="direction:rtl;display:block;margin-top:4px">أدخل الرمز أدناه لإتمام تسجيل دخولك. ينتهي خلال <strong>5 دقائق</strong>.</span></p>
              <div style="background:#0A1628;border-radius:12px;padding:20px;text-align:center;letter-spacing:14px;font-size:40px;font-weight:900;color:#D4A843;font-family:monospace;margin:0 0 20px">${otp}</div>
              <p style="margin:0;color:#aaa;font-size:11px;text-align:center">If you did not request this, please ignore this email.<br/>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
            </div>
          </div>
        `,
      }, "sendOtpEmail");
    } catch (emailErr) {
      req.log.error({ emailErr }, "rkz: Failed to send OTP email — check SENDER_EMAIL and Resend domain verification");
    }
  }

  req.log.info({ phone: normalised }, "rkz: otp requested");
  res.json({ pendingKey, ...(rkzResend ? {} : { demoOtp: otp }) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/auth/verify-otp
// Step 2: verify OTP and issue auth token
// Body: { pendingKey, otp, name? }
// Returns: { token, user }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/auth/verify-otp", async (req, res) => {
  const { pendingKey, otp, name } = req.body as { pendingKey?: string; otp?: string; name?: string };

  if (!pendingKey || !otp) {
    res.status(400).json({ error: "pendingKey and otp are required" }); return;
  }

  const pending = pendingOtps.get(String(pendingKey));
  if (!pending) {
    res.status(400).json({ error: "Invalid or expired verification session" }); return;
  }
  if (pending.expiresAt < Date.now()) {
    pendingOtps.delete(String(pendingKey));
    res.status(400).json({ error: "Verification code has expired. Please request a new one." }); return;
  }
  if (pending.otp !== String(otp).trim()) {
    res.status(400).json({ error: "Invalid verification code" }); return;
  }
  pendingOtps.delete(String(pendingKey));

  const { phone, email } = pending;
  const token = randomUUID();

  const existing = await db.select().from(rkzUsersTable).where(eq(rkzUsersTable.phone, phone)).limit(1);
  let user;
  if (existing.length) {
    [user] = await db
      .update(rkzUsersTable)
      .set({ authToken: token, email, ...(name ? { name: name.trim() } : {}) })
      .where(eq(rkzUsersTable.phone, phone))
      .returning();
  } else {
    [user] = await db
      .insert(rkzUsersTable)
      .values({ phone, email, name: name?.trim() ?? null, authToken: token })
      .returning();

    // Fire-and-forget: welcome email for brand-new registrations only
    sendRkzWelcomeEmail(email, name?.trim() ?? null).catch((err) => {
      req.log.warn({ err }, "rkz: welcome email failed (non-fatal)");
    });
  }

  req.log.info({ userId: user.id, phone }, "rkz: user verified and logged in");
  res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, email: user.email, authorized: user.authorized } });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /rkz/auth/me  — returns the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rkz/auth/me", requireRkzAuth, (req: any, res) => {
  const u = req.rkzUser;
  res.json({ id: u.id, phone: u.phone, name: u.name, email: u.email, authorized: u.authorized });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/auth/logout  — invalidates the current token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/auth/logout", requireRkzAuth, async (req: any, res) => {
  await db.update(rkzUsersTable).set({ authToken: null }).where(eq(rkzUsersTable.id, req.rkzUser.id));
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /rkz/auth/me  — update profile (name / email / authorized)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/rkz/auth/me", requireRkzAuth, async (req: any, res) => {
  const { name, email, authorized } = req.body as { name?: string; email?: string; authorized?: boolean };
  const updates: Record<string, unknown> = {};
  if (name !== undefined)       updates.name       = name;
  if (email !== undefined)      updates.email      = email;
  if (authorized !== undefined) updates.authorized = authorized;
  const [updated] = await db.update(rkzUsersTable).set(updates).where(eq(rkzUsersTable.id, req.rkzUser.id)).returning();
  res.json({ id: updated.id, phone: updated.phone, name: updated.name, email: updated.email, authorized: updated.authorized });
});

export default router;
