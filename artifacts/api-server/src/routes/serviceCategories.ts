import { Router } from "express";
import { db, serviceCategoriesTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { sessions } from "./auth.js";

const router = Router();

async function getSession(cookieHeader: string | undefined) {
  const sessionId = cookieHeader?.match(/pms_session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  return sessions.get(sessionId);
}

function isAdmin(role: string): boolean {
  return ["owner", "admin", "super_admin"].includes(role);
}

router.get("/service-categories", async (req, res) => {
  const { propertyType, all } = req.query as Record<string, string>;

  let tid = 1;
  let includeInactive = false;

  const session = await getSession(req.headers.cookie);
  if (session) tid = session.tenantId ?? 1;

  if (all === "true") {
    if (!session || !isAdmin(session.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    includeInactive = true;
  }

  const conditions = [
    eq(serviceCategoriesTable.tenantId, tid),
    ...(includeInactive ? [] : [eq(serviceCategoriesTable.isActive, true)]),
  ] as const;

  let rows = await db
    .select()
    .from(serviceCategoriesTable)
    .where(and(...conditions))
    .orderBy(asc(serviceCategoriesTable.sortOrder), asc(serviceCategoriesTable.id));

  if (propertyType) {
    rows = rows.filter(r => {
      const types = r.propertyTypes.split(",").map(t => t.trim());
      return types.includes("all") || types.includes(propertyType);
    });
  }

  res.json(rows);
});

router.post("/service-categories", async (req, res) => {
  const session = await getSession(req.headers.cookie);
  if (!session || !isAdmin(session.role)) {
    res.status(401).json({ error: "Not authenticated" }); return;
  }

  const { name, icon, color, propertyTypes, isActive, sortOrder, priority, requiresTimeSlot } = req.body ?? {};
  if (!name?.trim() || !icon?.trim()) {
    res.status(400).json({ error: "name and icon are required" }); return;
  }

  const [row] = await db.insert(serviceCategoriesTable).values({
    tenantId:        session.tenantId ?? 1,
    name:            String(name).trim(),
    icon:            String(icon).trim(),
    color:           color   ? String(color)         : "amber",
    propertyTypes:   propertyTypes ? String(propertyTypes) : "all",
    isActive:        isActive !== false,
    sortOrder:       Number(sortOrder) || 0,
    priority:        priority ? String(priority)     : "medium",
    requiresTimeSlot: requiresTimeSlot === true,
  }).returning();

  res.status(201).json(row);
});

router.patch("/service-categories/:id", async (req, res) => {
  const session = await getSession(req.headers.cookie);
  if (!session || !isAdmin(session.role)) {
    res.status(401).json({ error: "Not authenticated" }); return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, icon, color, propertyTypes, isActive, sortOrder, priority, requiresTimeSlot } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name              !== undefined) patch.name             = String(name).trim();
  if (icon              !== undefined) patch.icon             = String(icon).trim();
  if (color             !== undefined) patch.color            = String(color);
  if (propertyTypes     !== undefined) patch.propertyTypes    = String(propertyTypes);
  if (isActive          !== undefined) patch.isActive         = Boolean(isActive);
  if (sortOrder         !== undefined) patch.sortOrder        = Number(sortOrder);
  if (priority          !== undefined) patch.priority         = String(priority);
  if (requiresTimeSlot  !== undefined) patch.requiresTimeSlot = Boolean(requiresTimeSlot);

  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "No fields to update" }); return;
  }

  const [row] = await db
    .update(serviceCategoriesTable)
    .set(patch)
    .where(and(
      eq(serviceCategoriesTable.id, id),
      eq(serviceCategoriesTable.tenantId, session.tenantId ?? 1),
    ))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/service-categories/:id", async (req, res) => {
  const session = await getSession(req.headers.cookie);
  if (!session || !isAdmin(session.role)) {
    res.status(401).json({ error: "Not authenticated" }); return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(serviceCategoriesTable)
    .where(and(
      eq(serviceCategoriesTable.id, id),
      eq(serviceCategoriesTable.tenantId, session.tenantId ?? 1),
    ));

  res.status(204).send();
});

export default router;
