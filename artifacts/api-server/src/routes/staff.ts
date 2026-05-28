import { Router } from "express";
import { db, staffTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertStaffSchema, updateStaffSchema } from "@workspace/db";

const router = Router();

function formatStaff(s: typeof staffTable.$inferSelect, propertyName?: string | null) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    propertyName: propertyName ?? null,
  };
}

router.get("/staff", async (req, res) => {
  const { propertyId, role } = req.query as { propertyId?: string; role?: string };

  const conditions = [];
  if (propertyId) conditions.push(eq(staffTable.propertyId, parseInt(propertyId)));
  if (role) conditions.push(eq(staffTable.role, role));

  const rows = await db
    .select({ staff: staffTable, property: propertiesTable })
    .from(staffTable)
    .leftJoin(propertiesTable, eq(staffTable.propertyId, propertiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(staffTable.name);

  res.json(rows.map(({ staff, property }) => formatStaff(staff, property?.name)));
});

router.post("/staff", async (req, res) => {
  const parsed = insertStaffSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [staff] = await db.insert(staffTable).values(parsed.data).returning();
  res.status(201).json(formatStaff(staff));
});

router.patch("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [staff] = await db.update(staffTable).set(parsed.data).where(eq(staffTable.id, id)).returning();
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(formatStaff(staff));
});

router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(staffTable).where(eq(staffTable.id, id));
  res.status(204).end();
});

export default router;
