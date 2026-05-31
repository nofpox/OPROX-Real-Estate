import { Router } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import crypto from "node:crypto";
import { Resend } from "resend";
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

/**
 * Send a password-reset OTP email via Resend.
 * Falls back silently when RESEND_API_KEY is not set (demo mode).
 */
async function sendResetEmail(to: string, token: string): Promise<void> {
  if (!resend) return;
  await resend.emails.send({
    from:    "Rakz PMS <onboarding@resend.dev>",
    to:      [to],
    subject: "Your password reset code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">Password Reset</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px">
          Use the one-time code below to reset your password. It expires in <strong>3 minutes</strong>.
        </p>
        <div style="background:#f4f4f5;border-radius:8px;padding:20px 24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#111">
          ${token}
        </div>
        <p style="margin:24px 0 0;color:#888;font-size:12px">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export function getRoleTier(role: string): "admin" | "supervisor" | "worker" {
  if (role === "owner" || role === "admin" || role === "super_admin") return "admin";
  if (role === "manager" || role === "property-manager" || role === "site-supervisor") return "supervisor";
  return "worker";
}

/**
 * 4-level hierarchy:  owner=4 → manager=3 → supervisor=2 → worker=1
 * Used for RBAC checks: callers can only create/manage users at strictly lower levels.
 */
export function getHierarchyLevel(role: string): number {
  if (role === "owner" || role === "admin" || role === "super_admin") return 4;
  if (role === "manager") return 3;
  if (role === "supervisor" || role === "site-supervisor" || role === "property-manager" || role === "front-desk") return 2;
  return 1;
}

export function hashPwd(password: string): string {
  return crypto.createHash("sha256").update(`grand-pms::${password}`).digest("hex");
}

/**
 * Send a welcome email to a newly created employee with their login credentials.
 */
export async function sendWelcomeEmail(to: string, username: string, tempPassword: string): Promise<void> {
  if (!resend) return;
  await resend.emails.send({
    from:    "Rakz PMS <onboarding@resend.dev>",
    to:      [to],
    subject: "Welcome to Rakz PMS — Your account is ready",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">Welcome to Rakz PMS</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px">
          Your account has been created by your manager. Use the credentials below to sign in for the first time.
          You will be asked to set a new password immediately after logging in.
        </p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin:0 0 12px">
          <p style="margin:0 0 4px;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Username</p>
          <p style="margin:0;font-size:22px;font-weight:700;color:#111;letter-spacing:1px">${username}</p>
        </div>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin:0 0 24px">
          <p style="margin:0 0 4px;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Temporary Password</p>
          <p style="margin:0;font-size:22px;font-weight:700;color:#111;letter-spacing:4px;font-family:monospace">${tempPassword}</p>
        </div>
        <p style="margin:0 0 8px;color:#555;font-size:13px">
          This is a one-time password. You will be prompted to change it on first login.
        </p>
        <p style="margin:0;color:#aaa;font-size:12px">
          If you did not expect this account, please contact your administrator.
        </p>
      </div>
    `,
  });
}

export async function ensureAdmin() {
  try {
    // Ensure default tenant exists
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, status, logo_text, logo_sub)
      VALUES (1, 'Rakz', 'rakz', 'enterprise', 'active', 'Rakz', 'OMS')
      ON CONFLICT (id) DO UPDATE SET name='Rakz', slug='rakz', logo_text='Rakz', logo_sub='OMS'
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
        email: "admin@grandpms.io",
        phoneNumber: "+1-555-000-0001",
        passwordHash: hashPwd("admin123"),
        role: "owner",
        permissions: JSON.stringify(["all"]),
        isActive: true,
        tenantId: 1,
      });
    } else {
      // Backfill tenantId for existing admin if null
      await db.execute(sql`
        UPDATE users SET tenant_id = 1 WHERE role != 'super_admin' AND tenant_id IS NULL
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
        email: "super@grandpms.io",
        phoneNumber: "+1-555-000-0000",
        passwordHash: hashPwd("superadmin123"),
        role: "super_admin",
        permissions: JSON.stringify(["all"]),
        isActive: true,
        tenantId: null,
      });
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

  if (!user || !user.isActive || user.passwordHash !== hashPwd(String(password))) {
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

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    role: user.role,
    permissions: (() => { try { return JSON.parse(user.permissions); } catch { return []; } })(),
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    mustChangePassword: user.mustChangePassword ?? false,
    tenantId: resolvedTenantId,
    isSuperAdmin,
  };
  await sessions.set(sessionId, sessionUser);
  res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json(sessionUser);
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post("/auth/logout", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  if (sessionId) await sessions.delete(sessionId);
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
  if (!user || user.passwordHash !== hashPwd(String(currentPassword))) {
    res.status(401).json({ error: "Current password is incorrect" }); return;
  }

  await db.execute(
    sql`UPDATE users SET password_hash = ${hashPwd(String(newPassword))}, must_change_password = false WHERE id = ${session.id}`
  );

  session.mustChangePassword = false;
  await sessions.set(sessionId!, session);
  res.json({ ok: true });
});

// ── Forgot password ───────────────────────────────────────────────────────────
// Two-mode endpoint controlled by the presence of `deliveryMethod`:
//
//  Mode A — verify only (no deliveryMethod):
//    Checks email + phoneNumber + tenantSlug; if found returns masked contact
//    info so the client can show the delivery-choice screen.  No token issued.
//
//  Mode B — send (deliveryMethod = "sms" | "email"):
//    Same verification, then generates a 6-char reset token (3-min expiry).
//    In production the token is delivered via the chosen channel; in demo mode
//    it is returned in the response body for testing purposes.

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.charAt(0)}${"*".repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4  = digits.slice(-4);
  return `+${"*".repeat(Math.max(digits.length - 4, 3))}-${last4}`;
}

router.post("/auth/forgot-password", async (req, res) => {
  const { email, phoneNumber, tenantSlug, deliveryMethod } = req.body ?? {};
  if (!email || !phoneNumber) {
    res.status(400).json({ error: "email and phoneNumber are required" });
    return;
  }

  // Resolve tenant — optional; when omitted, search across all tenants
  let resolvedFpTenantId: number | null = null;
  if (tenantSlug) {
    const [tenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, String(tenantSlug)));
    if (!tenant) {
      res.json({ ok: true, userFound: false });
      return;
    }
    resolvedFpTenantId = tenant.id;
  }

  // Find user with matching email AND phone (optionally scoped to tenant)
  const fpConditions: Parameters<typeof and>[0][] = [
    eq(usersTable.email, String(email)),
    eq(usersTable.phoneNumber, String(phoneNumber)),
    eq(usersTable.isActive, true),
  ];
  if (resolvedFpTenantId !== null) fpConditions.push(eq(usersTable.tenantId, resolvedFpTenantId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(...fpConditions));

  if (!user) {
    // Silent — avoid user enumeration
    res.json({ ok: true, userFound: false });
    return;
  }

  // ── Mode A: verify-only ──────────────────────────────────────────────────
  if (!deliveryMethod) {
    res.json({
      ok: true,
      userFound: true,
      maskedEmail:  maskEmail(user.email  ?? email),
      maskedPhone:  maskPhone(user.phoneNumber ?? phoneNumber),
    });
    return;
  }

  // ── Mode B: generate + deliver token ────────────────────────────────────
  if (deliveryMethod !== "sms" && deliveryMethod !== "email") {
    res.status(400).json({ error: "deliveryMethod must be 'sms' or 'email'" });
    return;
  }

  // Invalidate any previous pending tokens for this user
  for (const [tok, data] of resetTokens.entries()) {
    if (data.userId === user.id) resetTokens.delete(tok);
  }

  // 6-char uppercase hex token, 3-minute expiry
  const resetToken = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  resetTokens.set(resetToken, {
    userId:    user.id,
    tenantId:  user.tenantId ?? null,
    expiresAt: Date.now() + 3 * 60 * 1000,
  });

  req.log.info({ userId: user.id, deliveryMethod }, "Password reset token issued");

  if (deliveryMethod === "email") {
    try {
      await sendResetEmail(user.email ?? String(email), resetToken);
      req.log.info({ userId: user.id }, "Reset email dispatched via Resend");
    } catch (err) {
      req.log.error({ err }, "Failed to send reset email — returning token in body as fallback");
      // Still return the token so the UI doesn't leave the user stuck
      return res.json({ ok: true, resetToken, deliveryMethod, emailError: true });
    }
    // Email sent — do NOT expose the token in the response
    return res.json({ ok: true, deliveryMethod });
  }

  // SMS path (not yet wired) + demo fallback: return token in body
  return res.json({ ok: true, resetToken, deliveryMethod });
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

  const data = resetTokens.get(String(resetToken).toUpperCase());
  if (!data || data.expiresAt < Date.now()) {
    resetTokens.delete(String(resetToken).toUpperCase());
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  await db.execute(
    sql`UPDATE users SET password_hash = ${hashPwd(String(newPassword))}, must_change_password = false WHERE id = ${data.userId}`
  );
  resetTokens.delete(String(resetToken).toUpperCase());

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
