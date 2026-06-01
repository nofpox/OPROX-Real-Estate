import { Router } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { logActivity } from "./activityLogs.js";
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
    from:    "ركز للحلول الذكية <onboarding@resend.dev>",
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
  if (
    role === "manager" || role === "property-manager" || role === "site-supervisor" ||
    role === "admin-manager" || role === "front-desk" || role === "supervisor"
  ) return "supervisor";
  return "worker";
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

  await resend.emails.send({
    from:    "ركز للحلول الذكية <onboarding@resend.dev>",
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
  });
  return true;
}

export async function ensureAdmin() {
  try {
    // Ensure default tenant exists
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, status, logo_text, logo_sub)
      VALUES (1, 'ركز للحلول الذكية', 'rakez', 'enterprise', 'active', 'ركز', 'للحلول الذكية')
      ON CONFLICT (id) DO UPDATE SET name='ركز للحلول الذكية', slug='rakez', logo_text='ركز', logo_sub='للحلول الذكية'
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
