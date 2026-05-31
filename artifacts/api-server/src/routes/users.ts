import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPwd, getRoleTier, getHierarchyLevel } from "./auth.js";
import { sessions } from "../lib/session-store.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function fmt(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, username: u.username, displayName: u.displayName,
    email: u.email ?? null, phoneNumber: u.phoneNumber ?? null,
    role: u.role, tenantId: u.tenantId,
    permissions: (() => { try { return JSON.parse(u.permissions); } catch { return []; } })(),
    isActive: u.isActive, createdAt: u.createdAt.toISOString(),
  };
}

async function clearUserSessions(userId: number): Promise<number> {
  return sessions.deleteByUserId(userId);
}

function getCallerSession(req: import("express").Request) {
  // tierGate sets req.sessionUser before any route handler runs.
  return (req as any).sessionUser as import("./auth.js").SessionUser | undefined;
}

router.get("/users", async (req, res) => {
  const tenantId = tid(req);
  const users = await db
    .select()
    .from(usersTable)
    .where(tenantId !== null ? eq(usersTable.tenantId, tenantId) : undefined)
    .orderBy(usersTable.createdAt);
  res.json(users.map(fmt));
});

router.post("/users", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const { username, displayName, email, phoneNumber, password, role, permissions, isActive } = req.body ?? {};
  if (!username || !displayName || !password) {
    res.status(400).json({ error: "username, displayName, and password required" }); return;
  }

  // Hierarchy: caller can only create users at strictly lower levels than themselves
  const caller = getCallerSession(req);
  if (caller) {
    const callerLevel = getHierarchyLevel(caller.role);
    const targetLevel = getHierarchyLevel(String(role ?? "staff"));
    if (callerLevel < 4 && targetLevel >= callerLevel) {
      res.status(403).json({ error: "You can only create users with a role below your own level" }); return;
    }
  }

  const [user] = await db.insert(usersTable).values({
    tenantId,
    username:    String(username),
    displayName: String(displayName),
    email:       email       ? String(email)       : null,
    phoneNumber: phoneNumber ? String(phoneNumber) : null,
    passwordHash: hashPwd(String(password)),
    role:        role ? String(role) : "staff",
    permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
    isActive:    isActive !== false,
  }).returning();
  res.status(201).json(fmt(user));
});

router.patch("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const { username, displayName, email, phoneNumber, password, role, permissions, isActive } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (username     !== undefined) update.username     = String(username);
  if (displayName  !== undefined) update.displayName  = String(displayName);
  if (email        !== undefined) update.email        = email ? String(email) : null;
  if (phoneNumber  !== undefined) update.phoneNumber  = phoneNumber ? String(phoneNumber) : null;
  if (password     !== undefined) update.passwordHash = hashPwd(String(password));
  if (role         !== undefined) update.role         = String(role);
  if (permissions  !== undefined) update.permissions  = JSON.stringify(Array.isArray(permissions) ? permissions : []);
  if (isActive     !== undefined) update.isActive     = Boolean(isActive);

  const conds = [eq(usersTable.id, id)];
  if (tenantId !== null) conds.push(eq(usersTable.tenantId, tenantId));

  const [user] = await db.update(usersTable).set(update).where(and(...conds)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (update.isActive === false) {
    const cleared = await clearUserSessions(id);
    req.log.info({ userId: id, sessionsCleared: cleared }, "User deactivated — sessions cleared");
  }
  res.json(fmt(user));
});

router.delete("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(usersTable.id, id)];
  if (tenantId !== null) conds.push(eq(usersTable.tenantId, tenantId));
  await clearUserSessions(id);
  await db.delete(usersTable).where(and(...conds));
  res.status(204).end();
});

router.post("/users/:id/kill-switch", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const caller = getCallerSession(req);
  if (!caller) { res.status(401).json({ error: "Not authenticated" }); return; }

  const callerTier = getRoleTier(caller.role);
  if (callerTier === "worker") { res.status(403).json({ error: "Forbidden" }); return; }
  if (id === caller.id) { res.status(400).json({ error: "Cannot deactivate your own account" }); return; }

  const tenantId = tid(req);
  const conds = [eq(usersTable.id, id)];
  if (tenantId !== null) conds.push(eq(usersTable.tenantId, tenantId));

  const [target] = await db.select().from(usersTable).where(and(...conds));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const targetTier = getRoleTier(target.role);
  if (targetTier === "admin" && callerTier !== "admin") {
    res.status(403).json({ error: "Only admins can deactivate other admins" }); return;
  }
  if (callerTier === "supervisor" && targetTier !== "worker") {
    res.status(403).json({ error: "Supervisors can only deactivate workers" }); return;
  }

  const [user] = await db.update(usersTable).set({ isActive: false }).where(and(...conds)).returning();
  const cleared = await clearUserSessions(id);
  req.log.info({ targetUserId: id, sessionsCleared: cleared, triggeredBy: caller.id }, "Kill switch triggered");
  res.json(fmt(user));
});

export default router;
