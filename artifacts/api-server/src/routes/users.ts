import { Router } from "express";
  import { db, usersTable } from "@workspace/db";
  import { eq } from "drizzle-orm";
  import { hashPwd } from "./auth.js";

  const router = Router();

  function fmt(u: typeof usersTable.$inferSelect) {
    return {
      id: u.id, username: u.username, displayName: u.displayName, email: u.email,
      role: u.role,
      permissions: (() => { try { return JSON.parse(u.permissions); } catch { return []; } })(),
      isActive: u.isActive, createdAt: u.createdAt.toISOString(),
    };
  }

  router.get("/users", async (_req, res) => {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json(users.map(fmt));
  });

  router.post("/users", async (req, res) => {
    const { username, displayName, email, password, role, permissions, isActive } = req.body ?? {};
    if (!username || !displayName || !password) {
      res.status(400).json({ error: "username, displayName, and password required" }); return;
    }
    const [user] = await db.insert(usersTable).values({
      username: String(username), displayName: String(displayName),
      email: email ? String(email) : null, passwordHash: hashPwd(String(password)),
      role: role ? String(role) : "staff",
      permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
      isActive: isActive !== false,
    }).returning();
    res.status(201).json(fmt(user));
  });

  router.patch("/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { username, displayName, email, password, role, permissions, isActive } = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (username !== undefined) update.username = String(username);
    if (displayName !== undefined) update.displayName = String(displayName);
    if (email !== undefined) update.email = email ? String(email) : null;
    if (password !== undefined) update.passwordHash = hashPwd(String(password));
    if (role !== undefined) update.role = String(role);
    if (permissions !== undefined) update.permissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const [user] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(fmt(user));
  });

  router.delete("/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).end();
  });

  export default router;
  