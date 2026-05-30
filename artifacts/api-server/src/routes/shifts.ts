import { Router } from "express";
import { db, shiftsTable, staffTable, propertiesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { insertShiftSchema, updateShiftSchema } from "@workspace/db";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatShift(
  s: typeof shiftsTable.$inferSelect,
  extras: { staffName?: string | null; staffRole?: string | null; propertyName?: string | null }
) {
  return {
    ...s, createdAt: s.createdAt.toISOString(),
    staffName: extras.staffName ?? null, staffRole: extras.staffRole ?? null,
    propertyName: extras.propertyName ?? null,
  };
}

router.get("/shifts", async (req, res) => {
  const { propertyId, staffId, startDate, endDate } = req.query as {
    propertyId?: string; staffId?: string; startDate?: string; endDate?: string;
  };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(shiftsTable.tenantId, tenantId));
  if (propertyId) conditions.push(eq(shiftsTable.propertyId, parseInt(propertyId)));
  if (staffId) conditions.push(eq(shiftsTable.staffId, parseInt(staffId)));
  if (startDate) conditions.push(gte(shiftsTable.date, startDate));
  if (endDate) conditions.push(lte(shiftsTable.date, endDate));

  const rows = await db
    .select({ shift: shiftsTable, staff: staffTable, property: propertiesTable })
    .from(shiftsTable)
    .leftJoin(staffTable, eq(shiftsTable.staffId, staffTable.id))
    .leftJoin(propertiesTable, eq(shiftsTable.propertyId, propertiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${shiftsTable.date} asc, ${shiftsTable.startTime} asc`);

  res.json(rows.map(({ shift, staff, property }) =>
    formatShift(shift, { staffName: staff?.name, staffRole: staff?.role, propertyName: property?.name })
  ));
});

router.post("/shifts", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertShiftSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [shift] = await db.insert(shiftsTable).values(parsed.data).returning();
  res.status(201).json(formatShift(shift, {}));
});

router.patch("/shifts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateShiftSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(shiftsTable.id, id)];
  if (tenantId !== null) conds.push(eq(shiftsTable.tenantId, tenantId));
  const [shift] = await db.update(shiftsTable).set(parsed.data).where(and(...conds)).returning();
  if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
  res.json(formatShift(shift, {}));
});

router.delete("/shifts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(shiftsTable.id, id)];
  if (tenantId !== null) conds.push(eq(shiftsTable.tenantId, tenantId));
  await db.delete(shiftsTable).where(and(...conds));
  res.status(204).end();
});

export default router;
