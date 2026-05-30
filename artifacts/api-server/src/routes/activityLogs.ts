import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/activity-logs", async (req, res) => {
  const {
    limit: limitStr,
    offset: offsetStr,
    entityType,
    actorRole,
    propertyId,
  } = req.query as {
    limit?: string;
    offset?: string;
    entityType?: string;
    actorRole?: string;
    propertyId?: string;
  };

  const limit  = Math.min(parseInt(limitStr  ?? "100"), 500);
  const offset = parseInt(offsetStr ?? "0") || 0;

  const conditions = [];
  if (entityType) conditions.push(eq(activityLogsTable.entityType, entityType));
  if (actorRole)  conditions.push(eq(activityLogsTable.actorRole,  actorRole));
  if (propertyId) conditions.push(eq(activityLogsTable.propertyId, parseInt(propertyId)));

  const rows = await db
    .select()
    .from(activityLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${activityLogsTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;

// ─── Shared utility — fire-and-forget ─────────────────────────────────────────
export async function logActivity(params: {
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  entityLabel?: string;
  propertyId?: number;
  propertyName?: string;
  details?: string;
}) {
  try {
    await db.insert(activityLogsTable).values({
      actorName:   params.actorName   ?? null,
      actorRole:   params.actorRole   ?? null,
      action:      params.action,
      entityType:  params.entityType,
      entityId:    params.entityId    ?? null,
      entityLabel: params.entityLabel ?? null,
      propertyId:  params.propertyId  ?? null,
      propertyName:params.propertyName ?? null,
      details:     params.details     ?? null,
    });
  } catch { /* non-critical — never block the main response */ }
}

/** Extract actor identity from request headers set by the frontend RBAC context. */
export function actorFromRequest(req: import("express").Request) {
  return {
    actorName: (req.headers["x-actor-name"] as string | undefined) ?? "System",
    actorRole: (req.headers["x-actor-role"] as string | undefined) ?? undefined,
  };
}
