import { Router } from "express";
import { randomUUID } from "crypto";
import { db, rkzUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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
// Creates user if not exists, issues a session token
// Body: { phone, name? }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/auth/login", async (req, res) => {
  const { phone, name } = req.body as { phone?: string; name?: string };
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "phone is required" });
    return;
  }
  const normalised = phone.trim().replace(/\s+/g, "");

  const token = randomUUID();

  const existing = await db.select().from(rkzUsersTable).where(eq(rkzUsersTable.phone, normalised)).limit(1);

  let user;
  if (existing.length) {
    [user] = await db
      .update(rkzUsersTable)
      .set({ authToken: token, ...(name ? { name: name.trim() } : {}) })
      .where(eq(rkzUsersTable.phone, normalised))
      .returning();
  } else {
    [user] = await db
      .insert(rkzUsersTable)
      .values({ phone: normalised, name: name?.trim() ?? null, authToken: token })
      .returning();
  }

  req.log.info({ userId: user.id, phone: normalised }, "rkz: user login");
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
