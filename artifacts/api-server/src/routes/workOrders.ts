import { Router } from "express";
import { db, workOrdersTable, propertiesTable, roomsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertWorkOrderSchema, updateWorkOrderSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";

const router = Router();

function formatWorkOrder(
  w: typeof workOrdersTable.$inferSelect,
  propertyName?: string | null,
  unitName?: string | null
) {
  return {
    ...w,
    createdAt: w.createdAt.toISOString(),
    completedAt: w.completedAt ? w.completedAt.toISOString() : null,
    propertyName: propertyName ?? null,
    unitName: unitName ?? null,
  };
}

router.get("/work-orders", async (req, res) => {
  const { propertyId, status, priority } = req.query as {
    propertyId?: string;
    status?: string;
    priority?: string;
  };

  const conditions = [];
  if (propertyId) conditions.push(eq(workOrdersTable.propertyId, parseInt(propertyId)));
  if (status)     conditions.push(eq(workOrdersTable.status, status));
  if (priority)   conditions.push(eq(workOrdersTable.priority, priority));

  const rows = await db
    .select({ workOrder: workOrdersTable, property: propertiesTable, room: roomsTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable,      eq(workOrdersTable.unitId, roomsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${workOrdersTable.createdAt} desc`);

  res.json(rows.map(({ workOrder, property, room }) =>
    formatWorkOrder(workOrder, property?.name, room?.name)
  ));
});

router.post("/work-orders", async (req, res) => {
  const parsed = insertWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [workOrder] = await db.insert(workOrdersTable).values(parsed.data).returning();
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, workOrder.propertyId));

  const actor = actorFromRequest(req);
  logActivity({
    ...actor,
    action: "work_order.created",
    entityType: "work_order",
    entityId: workOrder.id,
    entityLabel: workOrder.title,
    propertyId:   property?.id   ?? undefined,
    propertyName: property?.name ?? undefined,
    details: `Priority: ${workOrder.priority ?? "—"}`,
  });

  res.status(201).json(formatWorkOrder(workOrder, property?.name));
});

router.get("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ workOrder: workOrdersTable, property: propertiesTable, room: roomsTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable,      eq(workOrdersTable.unitId, roomsTable.id))
    .where(eq(workOrdersTable.id, id));

  if (!row) { res.status(404).json({ error: "Work order not found" }); return; }
  res.json(formatWorkOrder(row.workOrder, row.property?.name, row.room?.name));
});

router.patch("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(workOrdersTable).where(eq(workOrdersTable.id, id));

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" && !parsed.data.completedAt) {
    data.completedAt = new Date();
  }

  const [workOrder] = await db.update(workOrdersTable).set(data).where(eq(workOrdersTable.id, id)).returning();
  if (!workOrder) { res.status(404).json({ error: "Work order not found" }); return; }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, workOrder.propertyId));

  if (before && parsed.data.status && parsed.data.status !== before.status) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor,
      action: "work_order.status_changed",
      entityType: "work_order",
      entityId: workOrder.id,
      entityLabel: workOrder.title,
      propertyId:   property?.id   ?? undefined,
      propertyName: property?.name ?? undefined,
      details: `${before.status} → ${parsed.data.status}`,
    });
  }

  res.json(formatWorkOrder(workOrder, property?.name));
});

router.delete("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [wo] = await db.select().from(workOrdersTable).where(eq(workOrdersTable.id, id));
  await db.delete(workOrdersTable).where(eq(workOrdersTable.id, id));

  if (wo) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor,
      action: "work_order.deleted",
      entityType: "work_order",
      entityId: id,
      entityLabel: wo.title,
    });
  }

  res.status(204).end();
});

export default router;
