import { Router } from "express";
import { db, workOrdersTable, propertiesTable, roomsTable, staffTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertWorkOrderSchema, updateWorkOrderSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";
import { notifyNewWorkOrder, notifyWorkOrderCompleted } from "../utils/notifications.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatWorkOrder(
  w: typeof workOrdersTable.$inferSelect,
  propertyName?: string | null,
  unitName?: string | null,
  assignedStaffName?: string | null,
) {
  return {
    ...w, createdAt: w.createdAt.toISOString(),
    completedAt: w.completedAt ? w.completedAt.toISOString() : null,
    propertyName: propertyName ?? null,
    unitName: unitName ?? null,
    assignedStaffName: assignedStaffName ?? null,
  };
}

router.get("/work-orders/mine", async (req, res) => {
  const session = (req as any).sessionUser as import("../types.js").SessionUser | undefined;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const tenantId = session.tenantId;
  const { status } = req.query as { status?: string };

  if (!session.email) { res.json([]); return; }

  const conditions: ReturnType<typeof eq>[] = [eq(staffTable.email, session.email)];
  if (tenantId !== null) conditions.push(eq(staffTable.tenantId, tenantId));

  const [staffRow] = await db.select({ id: staffTable.id })
    .from(staffTable)
    .where(and(...conditions));

  if (!staffRow) { res.json([]); return; }

  const woConds: ReturnType<typeof eq>[] = [eq(workOrdersTable.assignedToId, staffRow.id)];
  if (tenantId !== null) woConds.push(eq(workOrdersTable.tenantId, tenantId));
  if (status) woConds.push(eq(workOrdersTable.status, status));

  const rows = await db
    .select({ workOrder: workOrdersTable, property: propertiesTable, room: roomsTable, staff: staffTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable,      eq(workOrdersTable.unitId, roomsTable.id))
    .leftJoin(staffTable,      eq(workOrdersTable.assignedToId, staffTable.id))
    .where(and(...woConds))
    .orderBy(sql`${workOrdersTable.createdAt} desc`);

  res.json(rows.map(({ workOrder, property, room, staff }) =>
    formatWorkOrder(workOrder, property?.name, room?.name, staff?.name ?? null)));
});

router.get("/work-orders", async (req, res) => {
  const { propertyId, status, priority, assignedToId } = req.query as {
    propertyId?: string; status?: string; priority?: string; assignedToId?: string;
  };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null)  conditions.push(eq(workOrdersTable.tenantId, tenantId));
  if (propertyId)         conditions.push(eq(workOrdersTable.propertyId, parseInt(propertyId)));
  if (status)             conditions.push(eq(workOrdersTable.status, status));
  if (priority)           conditions.push(eq(workOrdersTable.priority, priority));
  if (assignedToId)       conditions.push(eq(workOrdersTable.assignedToId, parseInt(assignedToId)));

  const rows = await db
    .select({ workOrder: workOrdersTable, property: propertiesTable, room: roomsTable, staff: staffTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable,      eq(workOrdersTable.unitId, roomsTable.id))
    .leftJoin(staffTable,      eq(workOrdersTable.assignedToId, staffTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${workOrdersTable.createdAt} desc`);
  res.json(rows.map(({ workOrder, property, room, staff }) =>
    formatWorkOrder(workOrder, property?.name, room?.name, staff?.name ?? null)));
});

router.post("/work-orders", async (req, res) => {
  const tenantId = tid(req) ?? 1;

  // Validate assignedToId if provided: staff must belong to same tenant
  if (req.body?.assignedToId) {
    const staffId = parseInt(String(req.body.assignedToId));
    if (isNaN(staffId)) {
      res.status(400).json({ error: "assignedToId must be a valid integer" }); return;
    }
    const [staffRow] = await db.select({ id: staffTable.id, name: staffTable.name })
      .from(staffTable)
      .where(and(eq(staffTable.id, staffId), eq(staffTable.tenantId, tenantId)));
    if (!staffRow) {
      res.status(422).json({ error: "assignedToId references a staff member that does not exist in this tenant" }); return;
    }
    // Mirror name into legacy text field for display
    req.body.assignedTo = staffRow.name;
  }

  const parsed = insertWorkOrderSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [workOrder] = await db.insert(workOrdersTable).values(parsed.data).returning();
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, workOrder.propertyId));
  let assignedStaffName: string | null = null;
  if (workOrder.assignedToId) {
    const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, workOrder.assignedToId));
    assignedStaffName = s?.name ?? null;
  }
  const actor = actorFromRequest(req);
  logActivity({
    ...actor, tenantId,
    action: "work_order.created", entityType: "work_order", entityId: workOrder.id, entityLabel: workOrder.title,
    propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
    details: `Priority: ${workOrder.priority ?? "—"}${assignedStaffName ? ` | Assigned to: ${assignedStaffName}` : ""}`,
  });
  notifyNewWorkOrder({
    tenantId,
    workOrderId:  workOrder.id,
    title:        workOrder.title,
    propertyName: property?.name ?? "Unknown Property",
    priority:     workOrder.priority ?? "normal",
  });
  res.status(201).json(formatWorkOrder(workOrder, property?.name, null, assignedStaffName));
});

router.get("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(workOrdersTable.id, id)];
  if (tenantId !== null) conds.push(eq(workOrdersTable.tenantId, tenantId));
  const [row] = await db
    .select({ workOrder: workOrdersTable, property: propertiesTable, room: roomsTable, staff: staffTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable,      eq(workOrdersTable.unitId, roomsTable.id))
    .leftJoin(staffTable,      eq(workOrdersTable.assignedToId, staffTable.id))
    .where(and(...conds));
  if (!row) { res.status(404).json({ error: "Work order not found" }); return; }
  res.json(formatWorkOrder(row.workOrder, row.property?.name, row.room?.name, row.staff?.name ?? null));
});

router.patch("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);

  // Validate assignedToId if being updated
  if (req.body?.assignedToId !== undefined) {
    const staffId = req.body.assignedToId === null ? null : parseInt(String(req.body.assignedToId));
    if (staffId !== null && isNaN(staffId)) {
      res.status(400).json({ error: "assignedToId must be a valid integer or null" }); return;
    }
    if (staffId !== null) {
      const effectiveTenantId = tenantId ?? 1;
      const [staffRow] = await db.select({ id: staffTable.id, name: staffTable.name })
        .from(staffTable)
        .where(and(eq(staffTable.id, staffId), eq(staffTable.tenantId, effectiveTenantId)));
      if (!staffRow) {
        res.status(422).json({ error: "assignedToId references a staff member that does not exist in this tenant" }); return;
      }
      req.body.assignedTo = staffRow.name;
    } else {
      req.body.assignedTo = null;
    }
  }

  const parsed = updateWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(workOrdersTable.id, id)];
  if (tenantId !== null) conds.push(eq(workOrdersTable.tenantId, tenantId));
  const [before] = await db.select().from(workOrdersTable).where(and(...conds));
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" && !parsed.data.completedAt) data.completedAt = new Date();
  const [workOrder] = await db.update(workOrdersTable).set(data).where(and(...conds)).returning();
  if (!workOrder) { res.status(404).json({ error: "Work order not found" }); return; }
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, workOrder.propertyId));
  let assignedStaffName: string | null = null;
  if (workOrder.assignedToId) {
    const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, workOrder.assignedToId));
    assignedStaffName = s?.name ?? null;
  }
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "work_order.status_changed", entityType: "work_order", entityId: workOrder.id, entityLabel: workOrder.title,
      propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
      details: `${before.status} → ${parsed.data.status}`,
    });
    if (parsed.data.status === "completed") {
      notifyWorkOrderCompleted({
        tenantId:     tenantId ?? 1,
        workOrderId:  workOrder.id,
        title:        workOrder.title,
        propertyName: property?.name ?? "Unknown Property",
      });
    }
  }
  res.json(formatWorkOrder(workOrder, property?.name, null, assignedStaffName));
});

router.delete("/work-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(workOrdersTable.id, id)];
  if (tenantId !== null) conds.push(eq(workOrdersTable.tenantId, tenantId));
  const [wo] = await db.select().from(workOrdersTable).where(and(...conds));
  await db.delete(workOrdersTable).where(and(...conds));
  if (wo) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "work_order.deleted", entityType: "work_order", entityId: id, entityLabel: wo.title,
    });
  }
  res.status(204).end();
});

export default router;
