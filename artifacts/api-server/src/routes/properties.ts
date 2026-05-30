import { Router } from "express";
import { db, propertiesTable, roomsTable, bookingsTable, expensesTable, workOrdersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertPropertySchema, updatePropertySchema } from "@workspace/db";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatProperty(p: typeof propertiesTable.$inferSelect, unitCount?: number) {
  return { ...p, createdAt: p.createdAt.toISOString(), unitCount: unitCount ?? 0 };
}

router.get("/properties", async (req, res) => {
  const tenantId = tid(req);
  const props = await db
    .select()
    .from(propertiesTable)
    .where(tenantId !== null ? eq(propertiesTable.tenantId, tenantId) : undefined)
    .orderBy(propertiesTable.name);

  const units = await db
    .select({ propertyId: roomsTable.propertyId, count: sql<number>`count(*)::int` })
    .from(roomsTable)
    .where(tenantId !== null ? eq(roomsTable.tenantId, tenantId) : undefined)
    .groupBy(roomsTable.propertyId);
  const unitMap = new Map(units.map((u) => [u.propertyId, u.count]));
  res.json(props.map((p) => formatProperty(p, unitMap.get(p.id) ?? 0)));
});

router.post("/properties", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertPropertySchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [prop] = await db.insert(propertiesTable).values(parsed.data).returning();
  res.status(201).json(formatProperty(prop, 0));
});

router.get("/properties/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(propertiesTable.id, id)];
  if (tenantId !== null) conds.push(eq(propertiesTable.tenantId, tenantId));
  const [prop] = await db.select().from(propertiesTable).where(and(...conds));
  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
  const [unitRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomsTable)
    .where(eq(roomsTable.propertyId, id));
  res.json(formatProperty(prop, unitRow?.count ?? 0));
});

router.patch("/properties/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updatePropertySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(propertiesTable.id, id)];
  if (tenantId !== null) conds.push(eq(propertiesTable.tenantId, tenantId));
  const [prop] = await db.update(propertiesTable).set(parsed.data).where(and(...conds)).returning();
  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
  res.json(formatProperty(prop));
});

router.delete("/properties/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(propertiesTable.id, id)];
  if (tenantId !== null) conds.push(eq(propertiesTable.tenantId, tenantId));
  await db.delete(propertiesTable).where(and(...conds));
  res.status(204).end();
});

router.get("/properties/:id/stats", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [unitRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomsTable)
    .where(eq(roomsTable.propertyId, id));

  const unitIds = await db
    .select({ id: roomsTable.id })
    .from(roomsTable)
    .where(eq(roomsTable.propertyId, id));

  const roomIdList = unitIds.map((u) => u.id);

  let activeBookings = 0;
  let totalRevenue = 0;
  if (roomIdList.length > 0) {
    const [bookingRow] = await db
      .select({
        active: sql<number>`count(*) filter (where ${bookingsTable.status} in ('confirmed','checked-in'))::int`,
        revenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
      })
      .from(bookingsTable)
      .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIdList.join(",") || "NULL")}])`);
    activeBookings = bookingRow?.active ?? 0;
    totalRevenue = Number(bookingRow?.revenue ?? 0);
  }

  const [expRow] = await db
    .select({ total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)` })
    .from(expensesTable)
    .where(eq(expensesTable.propertyId, id));
  const totalExpenses = Number(expRow?.total ?? 0);

  const [woRow] = await db
    .select({ open: sql<number>`count(*) filter (where ${workOrdersTable.status} != 'completed')::int` })
    .from(workOrdersTable)
    .where(eq(workOrdersTable.propertyId, id));

  res.json({
    propertyId: id,
    unitCount: unitRow?.count ?? 0,
    activeBookings,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    openWorkOrders: woRow?.open ?? 0,
  });
});

export default router;
