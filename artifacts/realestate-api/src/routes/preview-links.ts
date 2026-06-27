import { Router, type Request, type Response, type NextFunction } from "express";
import { db, userSessionsTable } from "@workspace/db";
import { sql, eq, and, gt } from "drizzle-orm";

const router = Router();

// ── Auth middleware (same as cms.ts) ──────────────────────────────────────────
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  if (!sessionId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const [row] = await db
      .select()
      .from(userSessionsTable)
      .where(and(eq(userSessionsTable.sessionId, sessionId), gt(userSessionsTable.expiresAt, new Date())));
    if (!row) { res.status(401).json({ error: "Session expired" }); return; }
    const userData = row.userData as Record<string, unknown>;
    const adminRoles = ["owner", "admin_manager", "administrator", "super_admin", "manager"];
    if (!userData || !adminRoles.includes(String(userData.role ?? ""))) {
      res.status(403).json({ error: "Admin access required" }); return;
    }
    (req as any).sessionUser = userData;
    next();
  } catch {
    res.status(500).json({ error: "Auth check failed" });
  }
}

// ── POST /cms/preview-links — create a new preview link ───────────────────────
router.post("/cms/preview-links", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { portal, label, hours } = req.body as {
      portal: string;
      label?: string;
      hours: number;
    };
    const VALID_PORTALS = ["rkz", "grand-pms", "rkz-app"];
    if (!VALID_PORTALS.includes(portal)) {
      res.status(400).json({ error: "Invalid portal" });
      return;
    }
    const sessionUser = (req as any).sessionUser as Record<string, unknown>;
    const createdBy = String(sessionUser?.displayName ?? sessionUser?.username ?? "admin");

    const durationHours = typeof hours === "number" && hours >= 1 && hours <= 168 ? hours : 24;
    const rows = await db.execute(sql`
      INSERT INTO preview_links (portal, label, created_by, expires_at)
      VALUES (
        ${portal},
        ${label ?? ""},
        ${createdBy},
        NOW() + (${durationHours} || ' hours')::interval
      )
      RETURNING id, token, portal, label, created_by, expires_at, created_at
    `);
    const link = (rows as any).rows?.[0] ?? (rows as unknown as any[])[0];
    res.json({ link });
  } catch (err) {
    req.log?.error(err, "POST /cms/preview-links");
    res.status(500).json({ error: "Failed to create preview link" });
  }
});

// ── POST /cms/preview-links/batch — generate all 3 portals at once ────────────
router.post("/cms/preview-links/batch", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { label, hours } = req.body as { label?: string; hours?: number };
    const sessionUser = (req as any).sessionUser as Record<string, unknown>;
    const createdBy = String(sessionUser?.displayName ?? sessionUser?.username ?? "admin");
    const durationHours = typeof hours === "number" && hours >= 1 && hours <= 168 ? hours : 24;

    const portals = ["rkz", "grand-pms", "rkz-app"];
    const links: Record<string, unknown>[] = [];
    for (const portal of portals) {
      const rows = await db.execute(sql`
        INSERT INTO preview_links (portal, label, created_by, expires_at)
        VALUES (
          ${portal},
          ${label ?? ""},
          ${createdBy},
          NOW() + (${durationHours} || ' hours')::interval
        )
        RETURNING id, token, portal, label, created_by, expires_at, created_at
      `);
      const link = (rows as any).rows?.[0] ?? (rows as unknown as any[])[0];
      links.push(link);
    }
    res.json({ links });
  } catch (err) {
    req.log?.error(err, "POST /cms/preview-links/batch");
    res.status(500).json({ error: "Failed to create preview links" });
  }
});

// ── GET /cms/preview-links — list all active (non-expired, non-revoked) links ─
router.get("/cms/preview-links", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, token, portal, label, created_by, expires_at, revoked_at, created_at
      FROM preview_links
      ORDER BY created_at DESC
      LIMIT 50
    `);
    const links = (rows as any).rows ?? rows;
    res.json({ links });
  } catch (err) {
    req.log?.error(err, "GET /cms/preview-links");
    res.status(500).json({ error: "Failed to fetch preview links" });
  }
});

// ── DELETE /cms/preview-links/:id — manually revoke a link ───────────────────
router.delete("/cms/preview-links/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.execute(sql`
      UPDATE preview_links SET revoked_at = NOW()
      WHERE id = ${id} AND revoked_at IS NULL
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "DELETE /cms/preview-links/:id");
    res.status(500).json({ error: "Failed to revoke preview link" });
  }
});

// ── POST /preview/generate — public link generation (no admin auth, for mobile) ─
router.post("/preview/generate", async (req: Request, res: Response) => {
  try {
    const { label, portal } = req.body as { label?: string; portal?: string };
    const ALLOWED_PUBLIC = ["rkz", "grand-pms", "rkz-app"];
    const targetPortal = portal && ALLOWED_PUBLIC.includes(portal) ? portal : "rkz";
    const rows = await db.execute(sql`
      INSERT INTO preview_links (portal, label, created_by, expires_at)
      VALUES (
        ${targetPortal},
        ${label ?? ""},
        'mobile',
        NOW() + INTERVAL '1 hour'
      )
      RETURNING id, token, portal, label, expires_at, created_at
    `);
    const link = (rows as any).rows?.[0] ?? (rows as unknown as any[])[0];
    res.json({ link });
  } catch (err) {
    req.log?.error(err, "POST /preview/generate");
    res.status(500).json({ error: "Failed to generate preview link" });
  }
});

// ── POST /preview/:token/consume — one-time use: mark token as used (no auth) ─
router.post("/preview/:token/consume", async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) {
      res.status(400).json({ error: "Invalid token format" });
      return;
    }
    await db.execute(sql`
      UPDATE preview_links
      SET revoked_at = NOW()
      WHERE token = ${token}::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "POST /preview/:token/consume");
    res.status(500).json({ error: "Failed to consume token" });
  }
});

// ── GET /preview/:token — public token validation (no auth) ───────────────────
router.get("/preview/:token", async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    // Basic UUID format check
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) {
      res.status(400).json({ error: "Invalid token format" });
      return;
    }
    const rows = await db.execute(sql`
      SELECT id, token, portal, label, expires_at, revoked_at
      FROM preview_links
      WHERE token = ${token}::uuid
      LIMIT 1
    `);
    const link = ((rows as any).rows ?? rows)[0];
    if (!link) {
      res.status(404).json({ error: "Preview link not found" });
      return;
    }
    if (link.revoked_at) {
      res.status(410).json({ error: "This preview link has been revoked" });
      return;
    }
    if (new Date(link.expires_at) < new Date()) {
      res.status(410).json({ error: "This preview link has expired" });
      return;
    }
    res.json({
      valid: true,
      portal: link.portal,
      label: link.label,
      expiresAt: link.expires_at,
    });
  } catch (err) {
    req.log?.error(err, "GET /preview/:token");
    res.status(500).json({ error: "Failed to validate preview link" });
  }
});

export default router;
