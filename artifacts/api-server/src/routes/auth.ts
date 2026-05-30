import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulLogin,
  readSecurityLog,
} from "../lib/security.js";

export type SessionUser = {
  id: number; username: string; displayName: string; email: string | null;
  role: string; permissions: string[]; isActive: boolean; createdAt: string;
  mustChangePassword: boolean;
};

export const sessions = new Map<string, SessionUser>();

export function getRoleTier(role: string): "admin" | "supervisor" | "worker" {
  if (role === "owner" || role === "admin") return "admin";
  if (role === "manager" || role === "property-manager" || role === "site-supervisor") return "supervisor";
  return "worker";
}

export function hashPwd(password: string): string {
  return crypto.createHash("sha256").update(`grand-pms::${password}`).digest("hex");
}

export async function ensureAdmin() {
  try {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, "admin"));
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        username: "admin", displayName: "Administrator",
        passwordHash: hashPwd("admin123"), role: "owner",
        permissions: JSON.stringify(["all"]), isActive: true,
      });
    }
  } catch {
    // table may not exist yet — will be called again after migrations
  }
}

const router = Router();

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  const ip = (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );

  // Rate-limit check
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

  // Credential check
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, String(username)));

  if (!user || !user.isActive || user.passwordHash !== hashPwd(String(password))) {
    const result = recordFailedAttempt(ip, String(username));
    if (!result.allowed) {
      res.status(429).json({
        error: "Too many failed attempts. Account locked for 15 minutes.",
        lockedUntilMs: result.lockedUntilMs,
      });
    } else {
      res.status(401).json({
        error: "Invalid credentials",
        attemptsLeft: result.attemptsLeft,
      });
    }
    return;
  }

  // Success
  recordSuccessfulLogin(ip, String(username));

  const sessionId = crypto.randomUUID();
  const sessionUser: SessionUser = {
    id: user.id, username: user.username, displayName: user.displayName, email: user.email,
    role: user.role,
    permissions: (() => { try { return JSON.parse(user.permissions); } catch { return []; } })(),
    isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    mustChangePassword: (user as any).mustChangePassword ?? false,
  };
  sessions.set(sessionId, sessionUser);
  res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  res.json(sessionUser);
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post("/auth/logout", (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  if (sessionId) sessions.delete(sessionId);
  res.setHeader("Set-Cookie", "pms_session=; Path=/; HttpOnly; Max-Age=0");
  res.json({ ok: true });
});

// ── Session check ─────────────────────────────────────────────────────────────

router.get("/auth/me", (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json(session);
});

// ── Change password ───────────────────────────────────────────────────────────

router.post("/auth/change-password", async (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session   = sessionId ? sessions.get(sessionId) : undefined;
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

  // Patch the live session so the frontend sees the flag cleared immediately
  session.mustChangePassword = false;
  sessions.set(sessionId!, session);

  res.json({ ok: true });
});

// ── Active sessions (admin/supervisor) ───────────────────────────────────────

router.get("/auth/sessions", (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const caller = sessionId ? sessions.get(sessionId) : undefined;
  if (!caller) { res.status(401).json({ error: "Not authenticated" }); return; }

  const callerTier = getRoleTier(caller.role);
  if (callerTier === "worker") { res.status(403).json({ error: "Forbidden" }); return; }

  const result: { sessionKey: string; userId: number; displayName: string; username: string; role: string }[] = [];
  for (const [key, s] of sessions.entries()) {
    if (callerTier === "supervisor" && getRoleTier(s.role) !== "worker") continue;
    result.push({ sessionKey: key, userId: s.id, displayName: s.displayName, username: s.username, role: s.role });
  }
  res.json({ sessions: result });
});

// ── Security log (admin only) ─────────────────────────────────────────────────

router.get("/auth/security-log", (req, res) => {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session || session.role !== "owner") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const lines = readSecurityLog(200);
  res.json({ entries: lines.map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } }) });
});

export default router;
