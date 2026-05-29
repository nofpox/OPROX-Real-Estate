import { Router } from "express";
  import { db, activityLogsTable } from "@workspace/db";
  import { sql } from "drizzle-orm";

  const router = Router();

  router.get("/activity-logs", async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 500);
    const rows = await db.select().from(activityLogsTable)
      .orderBy(sql`${activityLogsTable.createdAt} desc`).limit(limit);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  });

  export async function logActivity(params: {
    username?: string; action: string; entityType: string;
    entityId?: number; details?: string; ipAddress?: string;
  }) {
    try {
      await db.insert(activityLogsTable).values({
        username: params.username ?? null, action: params.action,
        entityType: params.entityType, entityId: params.entityId ?? null,
        details: params.details ?? null, ipAddress: params.ipAddress ?? null,
      });
    } catch { /* non-critical */ }
  }

  export default router;
  