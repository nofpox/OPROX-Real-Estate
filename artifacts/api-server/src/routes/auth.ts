import { Router } from "express";
  import { db, usersTable } from "@workspace/db";
  import { eq } from "drizzle-orm";
  import crypto from "node:crypto";

  export type SessionUser = {
    id: number; username: string; displayName: string; email: string | null;
    role: string; permissions: string[]; isActive: boolean; createdAt: string;
  };

  export const sessions = new Map<string, SessionUser>();

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
    } catch (err: any) {
      // table may not exist yet — will be called again after migrations
    }
  }

  const router = Router();

  router.post("/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) { res.status(400).json({ error: "Missing credentials" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, String(username)));
    if (!user || !user.isActive || user.passwordHash !== hashPwd(String(password))) {
      res.status(401).json({ error: "Invalid credentials" }); return;
    }
    const sessionId = crypto.randomUUID();
    const sessionUser: SessionUser = {
      id: user.id, username: user.username, displayName: user.displayName, email: user.email,
      role: user.role,
      permissions: (() => { try { return JSON.parse(user.permissions); } catch { return []; } })(),
      isActive: user.isActive, createdAt: user.createdAt.toISOString(),
    };
    sessions.set(sessionId, sessionUser);
    res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json(sessionUser);
  });

  router.post("/auth/logout", (req, res) => {
    const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
    if (sessionId) sessions.delete(sessionId);
    res.setHeader("Set-Cookie", "pms_session=; Path=/; HttpOnly; Max-Age=0");
    res.json({ ok: true });
  });

  router.get("/auth/me", (req, res) => {
    const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(session);
  });

  export default router;
  