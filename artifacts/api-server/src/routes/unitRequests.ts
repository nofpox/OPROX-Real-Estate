import { Router } from "express";
import { db, workOrdersTable, roomsTable, propertiesTable, serviceCategoriesTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const FALLBACK_PRIORITY: Record<string, string> = {
  electrical:  "high",
  plumbing:    "high",
  maintenance: "high",
  ac:          "medium",
  noise:       "medium",
  cleaning:    "low",
  other:       "low",
};

router.get("/unit-info/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ room: roomsTable, property: propertiesTable })
    .from(roomsTable)
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(eq(roomsTable.id, id));

  if (!row) { res.status(404).json({ error: "Unit not found" }); return; }

  res.json({
    id:           row.room.id,
    name:         row.room.name,
    propertyName: row.property?.name ?? null,
    propertyType: row.property?.type ?? null,
  });
});

router.post("/unit-requests", async (req, res) => {
  const { unitId, type, description, preferredTimeSlot } = req.body ?? {};

  if (!unitId || !type || !String(description ?? "").trim()) {
    res.status(400).json({ error: "unitId, type, and description are required" });
    return;
  }

  const roomId = parseInt(String(unitId));
  if (isNaN(roomId)) {
    res.status(400).json({ error: "unitId must be a valid integer" });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) { res.status(404).json({ error: "Unit not found" }); return; }
  if (!room.propertyId) { res.status(422).json({ error: "Unit has no property assigned" }); return; }

  // Resolve priority from dynamic service category (falls back to hardcoded map)
  let priority = FALLBACK_PRIORITY[String(type).toLowerCase()] ?? "medium";
  const [cat] = await db
    .select()
    .from(serviceCategoriesTable)
    .where(and(
      eq(serviceCategoriesTable.tenantId, room.tenantId),
      eq(serviceCategoriesTable.name, String(type)),
    ));
  if (cat) priority = cat.priority;

  const title = `${String(type)} — ${room.name}`;

  let fullDescription = String(description).trim();
  if (preferredTimeSlot) {
    fullDescription += `\nPreferred Time Slot: ${String(preferredTimeSlot)}`;
  }

  const [workOrder] = await db.insert(workOrdersTable).values({
    tenantId:   room.tenantId,
    propertyId: room.propertyId,
    unitId:     roomId,
    title,
    description: fullDescription,
    priority,
    status: "pending",
  }).returning();

  const refCode = `URQ-${workOrder.id}`;

  // Broadcast notification to all dashboard users on this tenant
  db.insert(notificationsTable).values({
    tenantId:    room.tenantId,
    userId:      null,
    type:        "service_request",
    title:       `New Service Request — ${room.name}`,
    message:     `${String(type)} · ${String(description).trim().slice(0, 80)}`,
    isRead:      false,
    relatedId:   workOrder.id,
    relatedType: "work-order",
    notifKey:    "notif.newServiceRequest",
    messageParams: JSON.stringify({ unit: room.name, type: String(type), ref: refCode }),
  }).catch(() => { /* non-critical */ });

  res.status(201).json({
    refCode,
    workOrderId: workOrder.id,
    message: "طلبك تم استلامه · Your request has been received",
  });
});

/** Public: look up a work order by its URQ-{id} ref code — used by guest portal for status check */
router.get("/unit-requests/by-ref/:refCode", async (req, res) => {
  const { refCode } = req.params;
  const idPart = String(refCode).replace(/^URQ-/i, "");
  const id = parseInt(idPart);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ref code" }); return; }

  const [row] = await db
    .select({
      id:        workOrdersTable.id,
      status:    workOrdersTable.status,
      title:     workOrdersTable.title,
      unitId:    workOrdersTable.unitId,
      createdAt: workOrdersTable.createdAt,
    })
    .from(workOrdersTable)
    .where(eq(workOrdersTable.id, id));

  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  res.json({ ...row, refCode, createdAt: row.createdAt.toISOString() });
});

export default router;
