import { Router } from "express";
import { db, usersTable, customRolesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPwd, getRoleTier, getHierarchyLevel, sendWelcomeEmail, USING_TEST_SENDER } from "./auth.js";
import { sessions } from "../lib/session-store.js";
import { logActivity, actorFromRequest } from "./activityLogs.js";
import crypto from "node:crypto";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function fmt(u: typeof usersTable.$inferSelect, extra?: { invitePending?: boolean }) {
  return {
    id: u.id, username: u.username, displayName: u.displayName,
    email: u.email ?? null, phoneNumber: u.phoneNumber ?? null,
    role: u.role, tenantId: u.tenantId,
    customRoleId: u.customRoleId ?? null,
    permissions: (() => { try { return JSON.parse(u.permissions); } catch { return []; } })(),
    isActive: u.isActive, createdAt: u.createdAt.toISOString(),
    ...(extra ?? {}),
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
  res.json(users.map(u => fmt(u)));
});

router.post("/users", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const { username, displayName, email, phoneNumber, password, role, customRoleId, permissions, isActive } = req.body ?? {};
  if (!username || !displayName) {
    res.status(400).json({ error: "username and displayName are required" }); return;
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

  // Generate temp password if none provided — user will be prompted to change it
  const tempPassword = password ? String(password) : crypto.randomBytes(4).toString("hex").toUpperCase();
  const isInvite = !password;

  // If a custom role is assigned, load its permissions
  let resolvedPerms: string[] = Array.isArray(permissions) ? permissions : [];
  const cRoleId = customRoleId ? Number(customRoleId) : null;
  if (cRoleId) {
    const [cRole] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, cRoleId));
    if (cRole) {
      try { resolvedPerms = JSON.parse(cRole.permissions); } catch { resolvedPerms = []; }
    }
  }

  const [user] = await db.insert(usersTable).values({
    tenantId,
    username:           String(username),
    displayName:        String(displayName),
    email:              email       ? String(email)       : null,
    phoneNumber:        phoneNumber ? String(phoneNumber) : null,
    passwordHash:       hashPwd(tempPassword),
    role:               role ? String(role) : "staff",
    customRoleId:       cRoleId,
    permissions:        JSON.stringify(resolvedPerms),
    isActive:           isActive !== false,
    mustChangePassword: isInvite,
  }).returning();

  // Send invite email when no password was supplied by admin
  let invitePending = false;
  if (isInvite && email) {
    const sent = await sendWelcomeEmail(String(email), user.username, tempPassword);
    invitePending = sent || USING_TEST_SENDER;
  }

  const actor = actorFromRequest(req);
  logActivity({ ...actor, tenantId, action: "user.created", entityType: "user", entityId: user.id, entityLabel: user.displayName, details: `role=${user.role}` });
  res.status(201).json(fmt(user, { invitePending }));
});

router.patch("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const { username, displayName, email, phoneNumber, password, role, customRoleId, permissions, isActive } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (username     !== undefined) update.username     = String(username);
  if (displayName  !== undefined) update.displayName  = String(displayName);
  if (email        !== undefined) update.email        = email ? String(email) : null;
  if (phoneNumber  !== undefined) update.phoneNumber  = phoneNumber ? String(phoneNumber) : null;
  if (password     !== undefined) update.passwordHash = hashPwd(String(password));
  if (role         !== undefined) update.role         = String(role);
  if (isActive     !== undefined) update.isActive     = Boolean(isActive);

  // When customRoleId changes, reload permissions from the new role
  if (customRoleId !== undefined) {
    const cRoleId = customRoleId ? Number(customRoleId) : null;
    update.customRoleId = cRoleId;
    if (cRoleId) {
      const [cRole] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, cRoleId));
      if (cRole) update.permissions = cRole.permissions;
    } else if (permissions === undefined) {
      update.permissions = "[]";
    }
  }
  if (permissions  !== undefined) update.permissions  = JSON.stringify(Array.isArray(permissions) ? permissions : []);

  const conds = [eq(usersTable.id, id)];
  if (tenantId !== null) conds.push(eq(usersTable.tenantId, tenantId));

  const [user] = await db.update(usersTable).set(update).where(and(...conds)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const actor = actorFromRequest(req);
  if (update.isActive === false) {
    const cleared = await clearUserSessions(id);
    req.log.info({ userId: id, sessionsCleared: cleared }, "User deactivated — sessions cleared");
    logActivity({ ...actor, tenantId: tenantId ?? 1, action: "user.deactivated", entityType: "user", entityId: user.id, entityLabel: user.displayName });
  } else {
    logActivity({ ...actor, tenantId: tenantId ?? 1, action: "user.updated", entityType: "user", entityId: user.id, entityLabel: user.displayName });
  }
  res.json(fmt(user));
});

router.delete("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(usersTable.id, id)];
  if (tenantId !== null) conds.push(eq(usersTable.tenantId, tenantId));
  const [existing] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(and(...conds));
  await clearUserSessions(id);
  await db.delete(usersTable).where(and(...conds));
  const actor = actorFromRequest(req);
  logActivity({ ...actor, tenantId: tenantId ?? 1, action: "user.deleted", entityType: "user", entityId: id, entityLabel: existing?.displayName });
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
  logActivity({ actorId: caller.id, actorName: caller.displayName, actorRole: caller.role, tenantId: tenantId ?? 1, action: "user.kill_switch", entityType: "user", entityId: user.id, entityLabel: user.displayName, details: `triggered_by=${caller.username}` });
  res.json(fmt(user));
});

export default router;
