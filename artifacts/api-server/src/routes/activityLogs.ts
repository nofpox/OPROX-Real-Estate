import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sessions } from "./auth";

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
  actorId?: number;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  entityLabel?: string;
  propertyId?: number;
  propertyName?: string;
  details?: string;
  assignedByName?: string;
  completedByName?: string;
  proofPhotoUrl?: string;
}) {
  try {
    await db.insert(activityLogsTable).values({
      actorId:         params.actorId        ?? null,
      actorName:       params.actorName      ?? null,
      actorRole:       params.actorRole      ?? null,
      action:          params.action,
      entityType:      params.entityType,
      entityId:        params.entityId       ?? null,
      entityLabel:     params.entityLabel    ?? null,
      propertyId:      params.propertyId     ?? null,
      propertyName:    params.propertyName   ?? null,
      details:         params.details        ?? null,
      assignedByName:  params.assignedByName ?? null,
      completedByName: params.completedByName ?? null,
      proofPhotoUrl:   params.proofPhotoUrl  ?? null,
    });
  } catch { /* non-critical — never block the main response */ }
}

/** Extract actor identity. Prefers real session; falls back to x-actor-* headers (demo mode). */
export function actorFromRequest(req: import("express").Request) {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session   = sessionId ? sessions.get(sessionId) : undefined;

  if (session) {
    return {
      actorId:   session.id,
      actorName: session.displayName,
      actorRole: session.role,
    };
  }

  return {
    actorId:   undefined as number | undefined,
    actorName: (req.headers["x-actor-name"] as string | undefined) ?? "System",
    actorRole: (req.headers["x-actor-role"] as string | undefined) ?? undefined,
  };
}

/** Role tier: "admin" > "supervisor" > "worker" */
export function getRoleTier(role: string): "admin" | "supervisor" | "worker" {
  if (role === "owner" || role === "admin") return "admin";
  if (role === "manager") return "supervisor";
  return "worker";
}
