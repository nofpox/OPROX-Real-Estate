import { Router } from "express";
import { db, usersTable, tenantsTable, customRolesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { logActivity } from "./activityLogs.js";
import { logger } from "../lib/logger.js";
import {
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulLogin,
  readSecurityLog,
} from "../lib/security.js";
// Sessions are stored in PostgreSQL — shared across cluster workers, survive restarts.
import { sessions } from "../lib/session-store.js";
import type { SessionUser } from "../types.js";

export { sessions };
export type { SessionUser };

// token → { userId, tenantId, expiresAt }
const resetTokens = new Map<string, { userId: number; tenantId: number | null; expiresAt: number }>();

// Lazy-init Resend client (only if key is present)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Sender address: set SENDER_EMAIL env var to your verified Resend domain address
// e.g. SENDER_EMAIL="Rozoz PMS <noreply@yourdomain.com>"
// Falls back to Resend test address (only delivers to the account owner's email in test mode)
const SENDER_FROM = process.env.SENDER_EMAIL ?? "روزوز للحلول الذكية <onboarding@resend.dev>";
// When no custom domain is configured, Resend's test sender only delivers to the
// account owner's verified email. Invite codes are always surfaced to the UI so
// admins can share credentials manually in test/demo environments.
export const USING_TEST_SENDER = !process.env.SENDER_EMAIL;

/** Log the active sender on startup so FROM address mismatches are immediately visible. */
logger.info(
  { sender: SENDER_FROM, usingTestSender: USING_TEST_SENDER },
  USING_TEST_SENDER
    ? "Resend: SENDER_EMAIL not set — using onboarding@resend.dev (test mode: delivers only to Resend account owner)"
    : "Resend: using custom SENDER_EMAIL domain"
);

/**
 * Thin wrapper around resend.emails.send() that inspects the SDK return value.
 * The Resend SDK NEVER throws — it returns { data, error }. Calling code that does
 * `await resend.emails.send()` without checking the return silently swallows all errors.
 * This wrapper checks, logs with full detail, and re-throws so callers can react.
 */
async function resendSend(
  payload: { from: string; to: string[]; subject: string; html: string; bcc?: string[] },
  label: string
): Promise<void> {
  if (!resend) return;
  // ── PAYLOAD LOG (temporary debug) ────────────────────────────────────────
  logger.info(
    {
      label,
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      htmlPreview: payload.html.slice(0, 300).replace(/\s+/g, " ").trim(),
    },
    `RESEND PRE-SEND [${label}]`
  );
  // ─────────────────────────────────────────────────────────────────────────
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    logger.error(
      { label, to: payload.to, from: payload.from, resendStatus: (error as any).statusCode, resendError: error.message },
      `RESEND ERROR [${label}]: ${error.message}`
    );
    throw new Error(`Resend delivery failed (${label}): ${error.message}`);
  }
  logger.info({ label, to: payload.to, emailId: (data as any)?.id }, `email dispatched: ${label}`);
}

/**
 * Send a 4-digit OTP password-reset email via Resend (bilingual EN + AR).
 * Falls back silently when RESEND_API_KEY is not set (demo mode).
 */
async function sendResetEmail(to: string, username: string, otp: string): Promise<void> {
  if (!resend) return;
  await resendSend({
    from:    SENDER_FROM,
    to:      [to],
    subject: "مساعدة في الوصول | Access Help – روزوز | Rozoz",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#f8f8f8">

        <!-- Header bar -->
        <div style="background:#1a2744;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:0.3px">روزوز | Rozoz</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55)">Investor Portal — Access Help</p>
        </div>

        <!-- Body -->
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">

          <!-- EN section -->
          <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#111">We're here to help you get back in</h2>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6">
            We received a request to help you access your Rozoz Investor Portal account.
            Here is everything you need — your username and a one-time access code — in one place.
          </p>

          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px">Your Username</p>
          <div style="background:#f4f4f5;border-radius:10px;padding:14px 20px;font-size:20px;font-weight:700;color:#111;font-family:monospace;margin:0 0 24px;word-break:break-all">
            ${username}
          </div>

          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px">One-Time Access Code</p>
          <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.5">
            Enter this code on the portal to set a new password. It expires in <strong>3 minutes</strong>.
          </p>
          <div style="background:#1a2744;border-radius:12px;padding:22px;text-align:center;letter-spacing:14px;font-size:42px;font-weight:900;color:#fff;font-family:monospace;margin:0 0 28px">
            ${otp}
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px"/>

          <!-- AR section -->
          <h2 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111;direction:rtl;text-align:right">نحن هنا لمساعدتك في استعادة الوصول</h2>
          <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.7;direction:rtl;text-align:right">
            تلقّينا طلباً لمساعدتك في الوصول إلى حساب بوابة Rozoz للعملاء.
            إليك كل ما تحتاجه — اسم المستخدم ورمز وصول آمن — في رسالة واحدة.
          </p>

          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;direction:rtl;text-align:right">اسم المستخدم</p>
          <div style="background:#f4f4f5;border-radius:10px;padding:14px 20px;font-size:20px;font-weight:700;color:#111;font-family:monospace;margin:0 0 20px;direction:ltr;text-align:center;word-break:break-all">
            ${username}
          </div>

          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;direction:rtl;text-align:right">رمز الوصول الآني</p>
          <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.6;direction:rtl;text-align:right">
            أدخل هذا الرمز في البوابة لتعيين كلمة مرور جديدة. صالح لمدة <strong>3 دقائق</strong>.
          </p>
          <div style="background:#1a2744;border-radius:12px;padding:20px;text-align:center;letter-spacing:14px;font-size:40px;font-weight:900;color:#fff;font-family:monospace;margin:0 0 28px">
            ${otp}
          </div>

          <p style="margin:0;color:#aaa;font-size:11px;text-align:center;line-height:1.6">
            If you did not request this, no action is needed — your account remains secure.<br/>
            إذا لم تطلب ذلك، لا داعي لأي إجراء — حسابك لا يزال آمناً.
          </p>
        </div>

      </div>
    `,
  }, "sendResetEmail");
}

export function getRoleTier(role: string): "admin" | "supervisor" | "worker" {
  if (role === "preview_guest") return "supervisor";
  if (role === "owner" || role === "admin" || role === "super_admin") return "admin";
  if (
    role === "manager" || role === "property-manager" || role === "site-supervisor" ||
    role === "admin-manager" || role === "front-desk" || role === "supervisor"
  ) return "supervisor";
  return "worker";
}

/**
 * Numeric tier for the 10-level delegation chain (lower number = higher authority).
 * Chain: Owner(1) → Company(2) → Manager(3) → Secretariat(4) → DeptManager(5)
 *        → AdminGeneral(6) → Supervisor(7) → Maintenance(8) → Worker(9) → Security(10)
 */
export function getPortalRoleTier(role: string): number {
  const tierMap: Record<string, number> = {
    super_admin:         0,
    owner:               1,
    company:             2,
    admin_manager:       3,
    "admin-manager":     3,
    admin:               3,
    manager:             3,
    secretariat:         4,
    dept_manager:        5,
    "property-manager":  5,
    admin_general:       6,
    administrator:       6,
    supervisor:          7,
    "site-supervisor":   7,
    "front-desk":        7,
    maintenance:         8,
    worker:              9,
    staff:               9,
    security:            10,
    partner:             10,
  };
  return tierMap[role] ?? 9;
}

/**
 * 6-level hierarchy: super_admin=6 → owner=5 → admin_manager=4 → manager=3 → administrator=2 → supervisor/workers=1
 * Used for RBAC checks: callers can only create/manage users at strictly lower levels.
 */
export function getHierarchyLevel(role: string): number {
  if (role === "super_admin") return 6;
  if (role === "owner") return 5;
  if (role === "admin_manager" || role === "admin-manager" || role === "admin") return 4;
  if (role === "manager" || role === "property-manager" || role === "site-supervisor") return 3;
  if (role === "administrator") return 2;
  if (role === "supervisor" || role === "front-desk") return 1;
  return 0;
}

const BCRYPT_ROUNDS = 12;

/** Hash a password with bcrypt (used for new passwords and rehashing). */
export function hashPwd(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash.
 * Supports bcrypt (new hashes starting with $2b$) and legacy SHA-256
 * (64-char hex) so existing accounts continue to work after the upgrade.
 * Returns { valid, needsRehash } — callers should transparently rehash when
 * needsRehash is true so accounts silently migrate to bcrypt on next login.
 */
export function verifyPwd(stored: string, candidate: string): { valid: boolean; needsRehash: boolean } {
  if (stored.startsWith("$2")) {
    return { valid: bcrypt.compareSync(candidate, stored), needsRehash: false };
  }
  // Legacy SHA-256 path
  const legacyHash = crypto.createHash("sha256").update(`grand-pms::${candidate}`).digest("hex");
  const valid = stored === legacyHash;
  return { valid, needsRehash: valid };
}

/**
 * Send a welcome / invitation email to a newly created employee with their login credentials.
 * Falls back silently when RESEND_API_KEY is not set (demo mode).
 */
export async function sendWelcomeEmail(to: string, username: string, tempPassword: string): Promise<boolean> {
  if (!resend) return false;
  // Best-effort derive app URL from Replit env or fall back to generic instructions
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const appUrl  = domains.split(",")[0]?.trim()
    ? `https://${domains.split(",")[0].trim()}`
    : null;
  const loginLine = appUrl
    ? `<a href="${appUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f59e0b;color:#fff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;">Open Rakz PMS →</a>`
    : `<p style="margin:16px 0 0;color:#555;font-size:14px">Open the Rakz PMS app and sign in with the credentials below.</p>`;

  await resendSend({
    from:    SENDER_FROM,
    to:      [to],
    subject: "You're invited — Your Rakz PMS account is ready",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

        <!-- Header -->
        <div style="background:#1e293b;padding:28px 32px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px;font-family:Georgia,serif">Rakz</span>
          <span style="font-size:14px;color:#94a3b8;font-weight:500">Property Management System</span>
        </div>

        <!-- Body -->
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">Welcome aboard! 🎉</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
            Your manager has created a Rakz PMS account for you. Use the access code below to sign in for
            the <strong>first time</strong> — you'll be prompted to set your own password immediately.
          </p>

          <!-- Username block -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 12px">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Username</p>
            <p style="margin:0;font-size:20px;font-weight:700;color:#111;letter-spacing:0.5px;font-family:monospace">${username}</p>
          </div>

          <!-- OTP / Temp-password block -->
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px 24px;margin:0 0 24px;text-align:center">
            <p style="margin:0 0 8px;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">One-Time Access Code</p>
            <p style="margin:0;font-size:36px;font-weight:900;color:#92400e;letter-spacing:8px;font-family:monospace">${tempPassword}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#b45309">This code expires when you first log in and set your password.</p>
          </div>

          <!-- CTA -->
          ${loginLine}

          <!-- Steps -->
          <div style="margin:24px 0 0;background:#f8fafc;border-radius:8px;padding:16px 20px">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">Steps to get started</p>
            <ol style="margin:0;padding-left:18px;color:#555;font-size:13px;line-height:1.8">
              <li>Click the button above (or navigate to the Rakz PMS app)</li>
              <li>Enter your <strong>Username</strong> and the <strong>One-Time Access Code</strong></li>
              <li>Set your personal password when prompted</li>
              <li>You're in — explore your dashboard!</li>
            </ol>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#94a3b8;font-size:12px">
            If you were not expecting this invitation, you can safely ignore this email.
            No action will be taken unless you sign in.
          </p>
        </div>
      </div>
    `,
  }, "sendWelcomeEmail");
  return true;
}

/**
 * Send a bilingual welcome email to a newly self-registered portal client.
 * Falls back silently when RESEND_API_KEY is not set.
 */
export async function sendPortalWelcomeEmail(to: string, displayName: string, username: string): Promise<void> {
  if (!resend) return;
  const domains  = process.env.REPLIT_DOMAINS ?? "";
  const baseUrl  = domains.split(",")[0]?.trim() ? `https://${domains.split(",")[0].trim()}` : null;
  const portalUrl = baseUrl ? `${baseUrl}/portal` : null;
  const ctaBtn   = portalUrl
    ? `<a href="${portalUrl}" style="display:inline-block;margin:20px 0;padding:13px 32px;background:#1a2744;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;letter-spacing:0.3px">Sign in to Investor Portal →</a>`
    : `<p style="margin:14px 0;color:#555;font-size:14px">Open the platform and sign in to your account.</p>`;

  await resendSend({
    from:    SENDER_FROM,
    to:      [to],
    subject: "Welcome to Rozoz — Your account is ready | مرحباً بك في Rozoz",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <!-- Header -->
        <div style="background:#1a2744;padding:26px 32px">
          <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:0.3px">روزوز | Rozoz</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">Investor Portal — Account Confirmation</p>
        </div>
        <!-- Body EN -->
        <div style="padding:32px">
          <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111">Welcome, ${displayName}! 🎉</h2>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7">
            Your Rozoz Investor Portal account has been created successfully.
            You can now sign in to access your managed properties, financial reports, and more.
          </p>
          <!-- Username -->
          <div style="background:#f4f6fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 20px;margin:0 0 20px">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Your Username</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#111;font-family:monospace">${username}</p>
          </div>
          ${ctaBtn}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <!-- AR section -->
          <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#111;direction:rtl;text-align:right">مرحباً، ${displayName}! 🎉</h2>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;direction:rtl;text-align:right">
            تم إنشاء حسابك في بوابة Rozoz للمستثمرين بنجاح.
            يمكنك الآن تسجيل الدخول للوصول إلى عقاراتك المدارة والتقارير المالية والمزيد.
          </p>
          <div style="background:#f4f6fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 20px;margin:0 0 20px;direction:rtl">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">اسم المستخدم</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#111;font-family:monospace;direction:ltr;text-align:left">${username}</p>
          </div>
          <p style="margin:0;color:#aaa;font-size:11px;text-align:center;line-height:1.6">
            If you did not create this account, please contact us immediately.<br/>
            إذا لم تُنشئ هذا الحساب، يرجى التواصل معنا فوراً.
          </p>
        </div>
      </div>
    `,
  }, "sendPortalWelcomeEmail");
}

/**
 * Send a bilingual welcome email to a portal team member created by an admin,
 * including their temporary password. Falls back silently without RESEND_API_KEY.
 */
export async function sendPortalTeamWelcomeEmail(to: string, displayName: string, username: string, tempPassword: string): Promise<void> {
  if (!resend) return;
  const domains  = process.env.REPLIT_DOMAINS ?? "";
  const baseUrl  = domains.split(",")[0]?.trim() ? `https://${domains.split(",")[0].trim()}` : null;
  const portalUrl = baseUrl ? `${baseUrl}/portal` : null;
  const ctaBtn   = portalUrl
    ? `<a href="${portalUrl}" style="display:inline-block;margin:20px 0;padding:13px 32px;background:#1a2744;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;letter-spacing:0.3px">Sign in to Portal →</a>`
    : `<p style="margin:14px 0;color:#555;font-size:14px">Open the Investor Portal and sign in with the credentials below.</p>`;

  await resendSend({
    from:    SENDER_FROM,
    to:      [to],
    subject: "You've been added to Rozoz Portal — Your credentials inside | تمت إضافتك إلى بوابة Rozoz",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <!-- Header -->
        <div style="background:#1a2744;padding:26px 32px">
          <p style="margin:0;font-size:20px;font-weight:800;color:#fff">روزوز | Rozoz</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">Investor Portal — Team Invitation</p>
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111">Welcome to the team, ${displayName}! 🎉</h2>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7">
            An administrator has created a Rozoz Investor Portal account for you.
            Use the credentials below to sign in — you'll be prompted to set your own password on first login.
          </p>
          <div style="background:#f4f6fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 20px;margin:0 0 12px">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Username</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#111;font-family:monospace">${username}</p>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:18px 24px;margin:0 0 20px;text-align:center">
            <p style="margin:0 0 6px;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Temporary Password</p>
            <p style="margin:0;font-size:32px;font-weight:900;color:#92400e;letter-spacing:6px;font-family:monospace">${tempPassword}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#b45309">Change this on your first login.</p>
          </div>
          ${ctaBtn}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#111;direction:rtl;text-align:right">مرحباً بك في الفريق، ${displayName}! 🎉</h2>
          <p style="margin:0 0 14px;color:#555;font-size:13px;line-height:1.7;direction:rtl;text-align:right">
            قام المسؤول بإنشاء حسابك في بوابة Rozoz. استخدم بيانات الاعتماد أدناه لتسجيل الدخول
            — ستُطلب منك تغيير كلمة المرور في أول دخول.
          </p>
          <p style="margin:0;color:#aaa;font-size:11px;text-align:center;line-height:1.6">
            If you were not expecting this, contact your administrator.<br/>
            إذا لم تكن تتوقع ذلك، تواصل مع المسؤول.
          </p>
        </div>
      </div>
    `,
  }, "sendPortalTeamWelcomeEmail");
}

export async function ensureAdmin() {
  try {
    // Ensure default tenant exists
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, status, logo_text, logo_sub)
      VALUES (1, 'روزوز للحلول الذكية', 'rkz', 'enterprise', 'active', 'روزوز', 'للحلول الذكية')
      ON CONFLICT (id) DO UPDATE SET name='روزوز للحلول الذكية', slug='rkz', logo_text='روزوز', logo_sub='للحلول الذكية'
    `);

    // Ensure admin user exists (scoped to tenant 1)
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, "admin"));
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        username: "admin",
        displayName: "Administrator",
        email: "admin@rkz.info",
        phoneNumber: "+1-555-000-0001",
        passwordHash: hashPwd("yousef"),
        role: "owner",
        permissions: JSON.stringify(["all"]),
        isActive: true,
        tenantId: 1,
      });
    } else {
      // Always keep admin password and role in sync
      await db.execute(sql`
        UPDATE users SET password_hash = ${hashPwd("yousef")}, role = 'owner',
          is_active = true, tenant_id = 1
        WHERE username = 'admin'
      `);
    }

    // Ensure superadmin exists (tenantId = null)
    const sa = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, "superadmin"));
    if (sa.length === 0) {
      await db.insert(usersTable).values({
        username: "superadmin",
        displayName: "Super Administrator",
        email: "super@rkz.info",
        phoneNumber: "+1-555-000-0000",
        passwordHash: hashPwd("yousef"),
        role: "super_admin",
        permissions: JSON.stringify(["all"]),
        isActive: true,
        tenantId: null,
      });
    }

    // Ensure yousef owner account exists
    const yu = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, "yousef"));
    if (yu.length === 0) {
      await db.insert(usersTable).values({
        username: "yousef",
        displayName: "يوسف",
        email: "yousef@rkz.info",
        passwordHash: hashPwd("yousef"),
        role: "super_admin",
        permissions: JSON.stringify(["all"]),
        isActive: true,
        tenantId: null,
        mustChangePassword: false,
      });
    } else {
      // Always keep password and role in sync
      await db.execute(sql`
        UPDATE users SET password_hash = ${hashPwd("yousef")}, role = 'super_admin',
          is_active = true, must_change_password = false
        WHERE username = 'yousef'
      `);
    }
  } catch {
    // table may not exist yet — will be called again after migrations
  }
}

const router = Router();

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { username, password, tenantSlug } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  const ip = (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );

  const check = checkLoginAllowed(ip, String(username));
  if (!check.allowed) {
    const minutesLeft = check.lockedUntilMs
      ? Math.ceil((check.lockedUntilMs - Date.now()) / 60000)
      : 15;
    res.status(429).json({
      error: `Too many failed attempts. Account locked for ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.`,
      lockedUntilMs: check.lockedUntilMs,
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, String(username)));

  const pwdCheck = user && user.isActive ? verifyPwd(user.passwordHash, String(password)) : { valid: false, needsRehash: false };
  if (!pwdCheck.valid) {
    const result = recordFailedAttempt(ip, String(username));
    if (!result.allowed) {
      res.status(429).json({
        error: "Too many failed attempts. Account locked for 15 minutes.",
        lockedUntilMs: result.lockedUntilMs,
      });
    } else {
      res.status(401).json({ error: "Invalid credentials", attemptsLeft: result.attemptsLeft });
    }
    return;
  }
  // Transparent bcrypt migration: silently upgrade legacy SHA-256 hashes on login
  if (pwdCheck.needsRehash) {
    await db.execute(sql`UPDATE users SET password_hash = ${hashPwd(String(password))} WHERE id = ${user!.id}`);
  }

  const isSuperAdmin = user.role === "super_admin";

  // Resolve tenant
  let resolvedTenantId: number | null = null;
  if (!isSuperAdmin) {
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, String(tenantSlug)));
      if (!tenant) {
        res.status(401).json({ error: "Unknown tenant" });
        return;
      }
      if (user.tenantId !== null && user.tenantId !== tenant.id) {
        res.status(403).json({ error: "User does not belong to this tenant" });
        return;
      }
      resolvedTenantId = tenant.id;
    } else {
      // Fall back to user's stored tenantId (for backward compat / single-tenant deploys)
      resolvedTenantId = user.tenantId ?? 1;
    }
  }

  recordSuccessfulLogin(ip, String(username));

  const sessionId = crypto.randomUUID();
  // Block login if tenant is suspended
  if (resolvedTenantId !== null) {
    const [tenantRow] = await db
      .select({ status: tenantsTable.status, isActive: tenantsTable.isActive })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, resolvedTenantId));
    if (tenantRow?.status === "suspended" || tenantRow?.isActive === false) {
      res.status(403).json({
        error: "TENANT_SUSPENDED",
        message: "This company account has been suspended. Please contact support.",
      });
      return;
    }
  }

  // If user has a custom role, load its current permissions into the session
  // (admins/owners with permissions=["all"] bypass this)
  let effectivePermissions: string[] = (() => { try { return JSON.parse(user.permissions); } catch { return []; } })();
  if (user.customRoleId) {
    const [cRole] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, user.customRoleId));
    if (cRole) {
      try { effectivePermissions = JSON.parse(cRole.permissions); } catch { /* keep existing */ }
    }
  }

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    role: user.role,
    permissions: effectivePermissions,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    mustChangePassword: user.mustChangePassword ?? false,
    tenantId: resolvedTenantId,
    isSuperAdmin,
  };
  await sessions.set(sessionId, sessionUser);
  logActivity({ actorId: user.id, actorName: user.displayName, actorRole: user.role, tenantId: resolvedTenantId ?? undefined, action: "auth.login", entityType: "user", entityId: user.id, entityLabel: user.username });
  res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json(sessionUser);
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post("/auth/logout", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? await sessions.get(sessionId) : undefined;
  if (sessionId) await sessions.delete(sessionId);
  if (session) {
    logActivity({ actorId: session.id, actorName: session.displayName, actorRole: session.role, tenantId: session.tenantId ?? undefined, action: "auth.logout", entityType: "user", entityId: session.id, entityLabel: session.username });
  }
  res.setHeader("Set-Cookie", "pms_session=; Path=/; HttpOnly; Max-Age=0");
  res.json({ ok: true });
});

// ── Session check ─────────────────────────────────────────────────────────────

router.get("/auth/me", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? await sessions.get(sessionId) : undefined;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json(session);
});

// ── Change password ───────────────────────────────────────────────────────────

router.post("/auth/change-password", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session   = sessionId ? await sessions.get(sessionId) : undefined;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" }); return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.id));
  const pwdCheck = user ? verifyPwd(user.passwordHash, String(currentPassword)) : { valid: false };
  if (!pwdCheck.valid) {
    res.status(401).json({ error: "Current password is incorrect" }); return;
  }

  await db.execute(
    sql`UPDATE users SET password_hash = ${hashPwd(String(newPassword))}, must_change_password = false WHERE id = ${session.id}`
  );

  session.mustChangePassword = false;
  await sessions.set(sessionId!, session);
  res.json({ ok: true });
});

// ── Forgot password — email-only 6-digit OTP ──────────────────────────────────
// Single-step: accepts email, always delivers via email.
// Demo mode: when RESEND_API_KEY is absent the OTP is returned in the response.

router.post("/auth/forgot-password", async (req, res) => {
  const { email, tenantSlug } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  // Resolve tenant (optional — allows scoping to a specific tenant)
  let resolvedFpTenantId: number | null = null;
  if (tenantSlug) {
    const [tenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, String(tenantSlug)));
    if (!tenant) {
      // Silent — avoid tenant enumeration
      return res.json({ ok: true });
    }
    resolvedFpTenantId = tenant.id;
  }

  // Find user by email only (optionally scoped to tenant)
  const fpConditions: Parameters<typeof and>[0][] = [
    eq(usersTable.email, String(email)),
    eq(usersTable.isActive, true),
  ];
  if (resolvedFpTenantId !== null) fpConditions.push(eq(usersTable.tenantId, resolvedFpTenantId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(...fpConditions));

  if (!user) {
    // Silent — avoid user enumeration
    return res.json({ ok: true });
  }

  // Invalidate any previous pending OTPs for this user
  for (const [tok, data] of resetTokens.entries()) {
    if (data.userId === user.id) resetTokens.delete(tok);
  }

  // 4-digit numeric OTP, 3-minute expiry
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  resetTokens.set(otp, {
    userId:    user.id,
    tenantId:  user.tenantId ?? null,
    expiresAt: Date.now() + 3 * 60 * 1000,
  });

  req.log.info({ userId: user.id }, "Password reset OTP issued");

  try {
    await sendResetEmail(user.email ?? String(email), user.username, otp);
    req.log.info({ userId: user.id }, "Reset OTP email dispatched via Resend");
  } catch (err) {
    req.log.error({ err }, "Failed to send reset email — returning OTP in body as fallback");
    return res.json({ ok: true, otp, emailError: true });
  }

  // No Resend key → demo mode: return OTP so UI can show it
  if (!resend) {
    return res.json({ ok: true, otp });
  }

  // Production: OTP sent via email, never expose in response
  return res.json({ ok: true });
});

// ── Reset password ────────────────────────────────────────────────────────────

router.post("/auth/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body ?? {};
  if (!resetToken || !newPassword) {
    res.status(400).json({ error: "resetToken and newPassword are required" });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const data = resetTokens.get(String(resetToken));
  if (!data || data.expiresAt < Date.now()) {
    resetTokens.delete(String(resetToken));
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  await db.execute(
    sql`UPDATE users SET password_hash = ${hashPwd(String(newPassword))}, must_change_password = false WHERE id = ${data.userId}`
  );
  resetTokens.delete(String(resetToken));


  req.log.info({ userId: data.userId }, "Password reset completed");
  res.json({ ok: true });
});

// ── Active sessions (admin/supervisor) ───────────────────────────────────────

router.get("/auth/sessions", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const caller = sessionId ? await sessions.get(sessionId) : undefined;
  if (!caller) { res.status(401).json({ error: "Not authenticated" }); return; }

  const callerTier = getRoleTier(caller.role);
  if (callerTier === "worker") { res.status(403).json({ error: "Forbidden" }); return; }

  const allSessions = await sessions.entries();
  const result: { sessionKey: string; userId: number; displayName: string; username: string; role: string }[] = [];
  for (const [key, s] of allSessions) {
    if (callerTier === "supervisor" && getRoleTier(s.role) !== "worker") continue;
    result.push({ sessionKey: key, userId: s.id, displayName: s.displayName, username: s.username, role: s.role });
  }
  res.json({ sessions: result });
});

// ── Security log (admin only) ─────────────────────────────────────────────────

router.get("/auth/security-log", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? await sessions.get(sessionId) : undefined;
  if (!session || (session.role !== "owner" && !session.isSuperAdmin)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const lines = readSecurityLog(200);
  res.json({ entries: lines.map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } }) });
});

export default router;
