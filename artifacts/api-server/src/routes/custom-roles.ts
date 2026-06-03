import { Router } from "express";
import { db, customRolesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function tenantId(req: Express.Request): number | null {
  return (req as any).tenantId ?? null;
}

router.get("/custom-roles", async (req, res) => {
  const tid = tenantId(req);
  const rows = await db
    .select()
    .from(customRolesTable)
    .where(tid !== null ? eq(customRolesTable.tenantId, tid) : undefined as any);
  res.json(rows.map(r => ({
    ...r,
    permissions: (() => { try { return JSON.parse(r.permissions); } catch { return []; } })(),
  })));
});

router.post("/custom-roles", async (req, res) => {
  const tid = tenantId(req);
  const { name, description = "", color = "#6366f1", permissions = [] } = req.body ?? {};
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(customRolesTable).values({
    tenantId: tid,
    name: String(name).trim(),
    description: String(description),
    color: String(color),
    permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
  }).returning();
  res.status(201).json({ ...row, permissions: (() => { try { return JSON.parse(row.permissions); } catch { return []; } })() });
});

router.put("/custom-roles/:id", async (req, res) => {
  const tid = tenantId(req);
  const id = Number(req.params.id);
  const { name, description, color, permissions } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name       !== undefined) patch.name        = String(name).trim();
  if (description !== undefined) patch.description = String(description);
  if (color      !== undefined) patch.color       = String(color);
  if (permissions !== undefined) patch.permissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [row] = await db.update(customRolesTable)
    .set(patch as any)
    .where(and(eq(customRolesTable.id, id), tid !== null ? eq(customRolesTable.tenantId, tid) : undefined as any))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, permissions: (() => { try { return JSON.parse(row.permissions); } catch { return []; } })() });
});

router.delete("/custom-roles/:id", async (req, res) => {
  const tid = tenantId(req);
  const id = Number(req.params.id);
  await db.delete(customRolesTable)
    .where(and(eq(customRolesTable.id, id), tid !== null ? eq(customRolesTable.tenantId, tid) : undefined as any));
  res.status(204).end();
});

export default router;
