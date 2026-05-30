import { Router } from "express";
import { db, customFieldsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatField(f: typeof customFieldsTable.$inferSelect) {
  let options: string[] | null = null;
  if (f.options) { try { options = JSON.parse(f.options); } catch { options = null; } }
  return {
    id: f.id, entityType: f.entityType, fieldKey: f.fieldKey, fieldLabel: f.fieldLabel,
    fieldType: f.fieldType, options, required: f.required, sortOrder: f.sortOrder,
    active: f.active, createdAt: f.createdAt.toISOString(),
  };
}

router.get("/admin/custom-fields", async (req, res) => {
  const { entityType } = req.query as { entityType?: string };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(customFieldsTable.tenantId, tenantId));
  if (entityType) conditions.push(eq(customFieldsTable.entityType, entityType));

  const rows = await db
    .select()
    .from(customFieldsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(customFieldsTable.sortOrder, customFieldsTable.createdAt);
  res.json(rows.map(formatField));
});

router.post("/admin/custom-fields", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const { entityType, fieldKey, fieldLabel, fieldType, options, required, sortOrder, active } = req.body ?? {};
  if (!entityType || !fieldKey || !fieldLabel || !fieldType) {
    res.status(400).json({ error: "entityType, fieldKey, fieldLabel and fieldType are required" }); return;
  }
  const [row] = await db.insert(customFieldsTable).values({
    tenantId,
    entityType, fieldKey: fieldKey.trim().toLowerCase().replace(/\s+/g, "_"),
    fieldLabel: fieldLabel.trim(), fieldType,
    options: Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null,
    required: required ?? false, sortOrder: sortOrder ?? 0, active: active ?? true,
  }).returning();
  res.status(201).json(formatField(row));
});

router.patch("/admin/custom-fields/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(customFieldsTable.id, id)];
  if (tenantId !== null) conds.push(eq(customFieldsTable.tenantId, tenantId));
  const { fieldLabel, fieldType, options, required, sortOrder, active } = req.body ?? {};
  const updates: Partial<typeof customFieldsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof fieldLabel  === "string")  updates.fieldLabel  = fieldLabel.trim();
  if (typeof fieldType   === "string")  updates.fieldType   = fieldType;
  if (typeof required    === "boolean") updates.required    = required;
  if (typeof sortOrder   === "number")  updates.sortOrder   = sortOrder;
  if (typeof active      === "boolean") updates.active      = active;
  if (options !== undefined) {
    updates.options = Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null;
  }
  const [row] = await db.update(customFieldsTable).set(updates).where(and(...conds)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatField(row));
});

router.delete("/admin/custom-fields/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(customFieldsTable.id, id)];
  if (tenantId !== null) conds.push(eq(customFieldsTable.tenantId, tenantId));
  await db.delete(customFieldsTable).where(and(...conds));
  res.status(204).end();
});

export default router;
