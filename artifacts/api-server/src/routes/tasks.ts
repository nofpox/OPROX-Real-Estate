import { Router } from "express";
import { db, tasksTable, staffTable, propertiesTable, roomsTable, taskCommentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertTaskSchema, updateTaskSchema, insertTaskCommentSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";

const router = Router();

function formatTask(
  t: typeof tasksTable.$inferSelect,
  extras: { assigneeName?: string | null; propertyName?: string | null; unitName?: string | null }
) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    assigneeName: extras.assigneeName ?? null,
    propertyName: extras.propertyName ?? null,
    unitName: extras.unitName ?? null,
  };
}

router.get("/tasks", async (req, res) => {
  const { propertyId, assignedToId, status, date } = req.query as {
    propertyId?: string;
    assignedToId?: string;
    status?: string;
    date?: string;
  };

  const conditions = [];
  if (propertyId)   conditions.push(eq(tasksTable.propertyId, parseInt(propertyId)));
  if (assignedToId) conditions.push(eq(tasksTable.assignedToId, parseInt(assignedToId)));
  if (status)       conditions.push(eq(tasksTable.status, status));
  if (date)         conditions.push(eq(tasksTable.dueDate, date));

  const rows = await db
    .select({ task: tasksTable, staff: staffTable, property: propertiesTable, room: roomsTable })
    .from(tasksTable)
    .leftJoin(staffTable,      eq(tasksTable.assignedToId, staffTable.id))
    .leftJoin(propertiesTable, eq(tasksTable.propertyId,   propertiesTable.id))
    .leftJoin(roomsTable,      eq(tasksTable.unitId,        roomsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${tasksTable.dueDate} asc nulls last, ${tasksTable.createdAt} desc`);

  res.json(
    rows.map(({ task, staff, property, room }) =>
      formatTask(task, { assigneeName: staff?.name, propertyName: property?.name, unitName: room?.name })
    )
  );
});

router.post("/tasks", async (req, res) => {
  const parsed = insertTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [task] = await db.insert(tasksTable).values(parsed.data).returning();

  const [property] = task.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId))
    : [null];

  const actor = actorFromRequest(req);
  logActivity({
    ...actor,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    entityLabel: task.title,
    propertyId:   property?.id   ?? undefined,
    propertyName: property?.name ?? undefined,
    details: `Category: ${task.category ?? "—"}, Priority: ${task.priority ?? "—"}`,
  });

  res.status(201).json(formatTask(task, { propertyName: property?.name }));
});

router.patch("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Fetch old record to detect what changed
  const [before] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" && !parsed.data.completedAt) {
    data.completedAt = new Date();
  }

  const [task] = await db.update(tasksTable).set(data).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const [staff] = task.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, task.assignedToId))
    : [null];
  const [property] = task.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId))
    : [null];

  const actor = actorFromRequest(req);

  if (before && parsed.data.status && parsed.data.status !== before.status) {
    logActivity({
      ...actor,
      action: "task.status_changed",
      entityType: "task",
      entityId: task.id,
      entityLabel: task.title,
      propertyId:   property?.id   ?? undefined,
      propertyName: property?.name ?? undefined,
      details: `${before.status} → ${parsed.data.status}`,
    });
  }

  if (before && parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== before.assignedToId) {
    logActivity({
      ...actor,
      action: "task.assigned",
      entityType: "task",
      entityId: task.id,
      entityLabel: task.title,
      propertyId:   property?.id   ?? undefined,
      propertyName: property?.name ?? undefined,
      details: staff ? `Assigned to ${staff.name}` : "Unassigned",
    });
  }

  res.json(formatTask(task, { assigneeName: staff?.name, propertyName: property?.name }));
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  await db.delete(tasksTable).where(eq(tasksTable.id, id));

  if (task) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor,
      action: "task.deleted",
      entityType: "task",
      entityId: id,
      entityLabel: task.title,
    });
  }

  res.status(204).end();
});

// ── Comments ──────────────────────────────────────────────────────────────────

router.get("/tasks/:id/comments", async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(taskCommentsTable)
    .where(eq(taskCommentsTable.taskId, taskId))
    .orderBy(taskCommentsTable.createdAt);

  res.json(rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/tasks/:id/comments", async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = insertTaskCommentSchema.safeParse({ ...req.body, taskId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [comment] = await db.insert(taskCommentsTable).values(parsed.data).returning();
  res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString() });
});

export default router;
