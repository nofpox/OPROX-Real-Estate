import { Router } from "express";
import { db, fieldUsersTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertFieldUserSchema, updateFieldUserSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";

const router = Router();

function formatFieldUser(
  u: typeof fieldUsersTable.$inferSelect,
  propertyName?: string | null,
) {
  return {
    ...u,
    propertyName: propertyName ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

router.get("/field-users", async (req, res) => {
  const { propertyId, role, status } = req.query as {
    propertyId?: string;
    role?: string;
    status?: string;
  };

  const conditions = [];
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
  const parsed = insertFieldUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.insert(fieldUsersTable).values(parsed.data).returning();

  let propertyName: string | null = null;
  if (user.propertyId) {
    const [prop] = await db.select({ name: propertiesTable.name }).from(propertiesTable).where(eq(propertiesTable.id, user.propertyId));
    propertyName = prop?.name ?? null;
  }

  const actor = actorFromRequest(req);
  logActivity({
    ...actor,
    action: "field_user.created",
    entityType: "field_user",
    entityId: user.id,
    entityLabel: user.name,
    propertyName: propertyName ?? undefined,
    details: `Role: ${user.role}`,
  });

  res.status(201).json(formatFieldUser(user, propertyName));
});

router.patch("/field-users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = updateFieldUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(fieldUsersTable).where(eq(fieldUsersTable.id, id));

  const [user] = await db
    .update(fieldUsersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(fieldUsersTable.id, id))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let propertyName: string | null = null;
  if (user.propertyId) {
    const [prop] = await db.select({ name: propertiesTable.name }).from(propertiesTable).where(eq(propertiesTable.id, user.propertyId));
    propertyName = prop?.name ?? null;
  }

  const actor = actorFromRequest(req);

  if (before && parsed.data.status && parsed.data.status !== before.status) {
    logActivity({
      ...actor,
      action: parsed.data.status === "inactive" ? "field_user.deactivated" : "field_user.reactivated",
      entityType: "field_user",
      entityId: user.id,
      entityLabel: user.name,
      propertyName: propertyName ?? undefined,
      details: `Role: ${user.role}`,
    });
  } else {
    logActivity({
      ...actor,
      action: "field_user.updated",
      entityType: "field_user",
      entityId: user.id,
      entityLabel: user.name,
      propertyName: propertyName ?? undefined,
      details: `Role: ${user.role}`,
    });
  }

  res.json(formatFieldUser(user, propertyName));
});

router.delete("/field-users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(fieldUsersTable).where(eq(fieldUsersTable.id, id));
  await db.delete(fieldUsersTable).where(eq(fieldUsersTable.id, id));

  if (user) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor,
      action: "field_user.deleted",
      entityType: "field_user",
      entityId: id,
      entityLabel: user.name,
      details: `Role: ${user.role}`,
    });
  }

  res.status(204).end();
});

export default router;
