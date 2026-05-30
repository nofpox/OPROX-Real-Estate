import { Router } from "express";
import { db, workOrdersTable, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity } from "./activityLogs.js";

const PRIORITY: Record<string, string> = {
  electrical: "urgent", plumbing: "urgent", ac: "high", emergency: "urgent", general: "medium",
};

const router = Router();

router.post("/maintenance-requests", async (req, res) => {
  const tenantId: number = ((req as any).sessionUser as any)?.tenantId ?? 1;
  const { roomId, propertyId: propId, category, description, source } = req.body ?? {};
  if (!description) { res.status(400).json({ error: "description is required" }); return; }

  let resolvedPropertyId = propId ? parseInt(String(propId)) : null;
  const resolvedRoomId = roomId ? parseInt(String(roomId)) : null;

  if (resolvedRoomId && !resolvedPropertyId) {
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, resolvedRoomId));
    if (room) resolvedPropertyId = room.propertyId;
  }
  if (!resolvedPropertyId) { res.status(400).json({ error: "Cannot determine property" }); return; }

  const cat = String(category ?? "general").toLowerCase();
  const src = String(source ?? "unknown");
  const sourceLabel = src === "guest_portal" ? "[Guest]" : src === "staff_report" ? "[Staff]" : "[Request]";
  const priority = PRIORITY[cat] ?? "medium";
  const title = `${sourceLabel} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Maintenance`;

  const [workOrder] = await db.insert(workOrdersTable).values({
    tenantId,
    propertyId: resolvedPropertyId,
    unitId: resolvedRoomId ?? undefined,
    title,
    description: `${sourceLabel} ${String(description)}`,
    status: "open",
    priority,
  } as any).returning();

  await logActivity({
    tenantId,
    action: "work_order.created", entityType: "work_order",
    entityId: workOrder.id, entityLabel: workOrder.title,
    details: `${sourceLabel} ${cat}: ${String(description).slice(0, 100)}`,
  });

  res.status(201).json({ ...workOrder, createdAt: workOrder.createdAt.toISOString(), completedAt: null });
});

export default router;
