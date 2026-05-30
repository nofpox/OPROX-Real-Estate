import { Router } from "express";
import { db, fieldUsersTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertFieldUserSchema, updateFieldUserSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatFieldUser(u: typeof fieldUsersTable.$inferSelect, propertyName?: string | null) {
  return {
    ...u, propertyName: propertyName ?? null,
    createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString(),
  };
}

router.get("/field-users", async (req, res) => {
  const { propertyId, role, status } = req.query as { propertyId?: string; role?: string; status?: string };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(fieldUsersTable.tenantId, tenantId));
  if (propertyId) conditions.push(eq(fieldUsersTable.propertyId, parseInt(propertyId)));
  if (role)       conditions.push(eq(fieldUsersTable.role, role));
  if (status)     conditions.push(eq(fieldUsersTable.status, status));

  const rows = await db
    .select({ user: fieldUsersTable, property: propertiesTable })
    .from(fieldUsersTable)
    .leftJoin(propertiesTable, eq(fieldUsersTable.propertyId, propertiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(fieldUsersTable.name);
  res.json(rows.map(({ user, property }) => formatFieldUser(user, property?.name)));
});

router.post("/field-users", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertFieldUserSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.insert(fieldUsersTable).values(parsed.data).returning();

  let propertyName: string | null = null;
  if (user.propertyId) {
    const [prop] = await db.select({ name: propertiesTable.name }).from(propertiesTable).where(eq(propertiesTable.id, user.propertyId));
    propertyName = prop?.name ?? null;
  }
  const actor = actorFromRequest(req);
  logActivity({
    ...actor, tenantId,
    action: "field_user.created", entityType: "field_user", entityId: user.id, entityLabel: user.name,
    propertyName: propertyName ?? undefined, details: `Role: ${user.role}`,
  });
  res.status(201).json(formatFieldUser(user, propertyName));
});

router.patch("/field-users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateFieldUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(fieldUsersTable.id, id)];
  if (tenantId !== null) conds.push(eq(fieldUsersTable.tenantId, tenantId));
  const [before] = await db.select().from(fieldUsersTable).where(and(...conds));
  const [user] = await db.update(fieldUsersTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(...conds)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let propertyName: string | null = null;
  if (user.propertyId) {
    const [prop] = await db.select({ name: propertiesTable.name }).from(propertiesTable).where(eq(propertiesTable.id, user.propertyId));
    propertyName = prop?.name ?? null;
  }
  const actor = actorFromRequest(req);
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: parsed.data.status === "inactive" ? "field_user.deactivated" : "field_user.reactivated",
      entityType: "field_user", entityId: user.id, entityLabel: user.name,
      propertyName: propertyName ?? undefined, details: `Role: ${user.role}`,
    });
  } else {
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "field_user.updated", entityType: "field_user", entityId: user.id, entityLabel: user.name,
      propertyName: propertyName ?? undefined, details: `Role: ${user.role}`,
    });
  }
  res.json(formatFieldUser(user, propertyName));
});

router.delete("/field-users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(fieldUsersTable.id, id)];
  if (tenantId !== null) conds.push(eq(fieldUsersTable.tenantId, tenantId));
  const [user] = await db.select().from(fieldUsersTable).where(and(...conds));
  await db.delete(fieldUsersTable).where(and(...conds));
  if (user) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "field_user.deleted", entityType: "field_user", entityId: id,
      entityLabel: user.name, details: `Role: ${user.role}`,
    });
  }
  res.status(204).end();
});

export default router;
