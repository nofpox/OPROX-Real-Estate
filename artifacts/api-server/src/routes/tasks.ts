import { Router } from "express";
import { db, tasksTable, staffTable, propertiesTable, roomsTable, taskCommentsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertTaskSchema, updateTaskSchema, insertTaskCommentSchema } from "@workspace/db";
import { logActivity, actorFromRequest, getRoleTier } from "./activityLogs";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

/** Roles that can verify a completed task */
function canVerify(role: string | undefined): boolean {
  return role === "owner" || role === "manager" || role === "super_admin";
}

/** Roles that bypass photo requirements */
function isAdmin(role: string | undefined): boolean {
  return getRoleTier(role ?? "staff") === "admin";
}

/** Supervisor or higher can reject/escalate submitted reports */
function canReviewReport(role: string | undefined): boolean {
  return role === "supervisor" || role === "manager" || role === "owner" || role === "super_admin";
}

/** Manager or higher can approve escalated reports */
function canApproveReport(role: string | undefined): boolean {
  return role === "manager" || role === "owner" || role === "super_admin";
}

function formatTask(
  t: typeof tasksTable.$inferSelect,
  extras: {
    assigneeName?: string | null;
    propertyName?: string | null;
    unitName?: string | null;
  }
) {
  return {
    ...t,
    createdAt:   t.createdAt.toISOString(),
    startedAt:   t.startedAt    ? t.startedAt.toISOString()    : null,
    completedAt: t.completedAt  ? t.completedAt.toISOString()  : null,
    verifiedAt:  t.verifiedAt   ? t.verifiedAt.toISOString()   : null,
    submittedAt: t.submittedAt  ? t.submittedAt.toISOString()  : null,
    rejectedAt:  t.rejectedAt   ? t.rejectedAt.toISOString()   : null,
    escalatedAt: t.escalatedAt  ? t.escalatedAt.toISOString()  : null,
    approvedAt:  t.approvedAt   ? t.approvedAt.toISOString()   : null,
    assigneeName:  extras.assigneeName  ?? null,
    propertyName:  extras.propertyName  ?? null,
    unitName:      extras.unitName      ?? null,
  };
}

router.get("/tasks", async (req, res) => {
  const { propertyId, assignedToId, supervisorId, status, date } = req.query as {
    propertyId?: string; assignedToId?: string; supervisorId?: string; status?: string; date?: string;
  };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(tasksTable.tenantId, tenantId));
  if (propertyId)   conditions.push(eq(tasksTable.propertyId,   parseInt(propertyId)));
  if (assignedToId) conditions.push(eq(tasksTable.assignedToId, parseInt(assignedToId)));
  if (supervisorId) conditions.push(eq(tasksTable.supervisorId, parseInt(supervisorId)));
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

  res.json(rows.map(({ task, staff, property, room }) =>
    formatTask(task, { assigneeName: staff?.name, propertyName: property?.name, unitName: room?.name })
  ));
});

router.post("/tasks", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const actor = actorFromRequest(req);
  const parsed = insertTaskSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = { ...parsed.data, assignedByUserId: actor.actorId ?? null };
  const [task] = await db.insert(tasksTable).values(data).returning();

  const [property] = task.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId))
    : [null];
  const [assignedStaff] = task.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, task.assignedToId))
    : [null];

  logActivity({
    ...actor, tenantId,
    action: "task.created", entityType: "task", entityId: task.id, entityLabel: task.title,
    propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
    details: `Category: ${task.category ?? "—"}, Priority: ${task.priority ?? "—"}`,
    assignedByName: actor.actorName,
  });

  res.status(201).json(formatTask(task, { assigneeName: assignedStaff?.name, propertyName: property?.name }));
});

router.patch("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const conds = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));
  const [before] = await db.select().from(tasksTable).where(and(...conds));
  if (!before) { res.status(404).json({ error: "Task not found" }); return; }

  const actor   = actorFromRequest(req);
  const newStatus = parsed.data.status;

  // ── Status transition enforcement ─────────────────────────────────────────

  if (newStatus && newStatus !== before.status) {
    // pending → in-progress: require before photo
    if (newStatus === "in-progress" && before.status === "pending") {
      const photo = parsed.data.beforePhotoUrl ?? before.beforePhotoUrl;
      if (!photo && !isAdmin(actor.actorRole)) {
        res.status(422).json({
          error: "before_photo_required",
          message: "A Before photo is required to start this task.",
        });
        return;
      }
    }

    // in-progress → completed: require after photo
    if (newStatus === "completed" && before.status === "in-progress") {
      const photo = parsed.data.afterPhotoUrl ?? parsed.data.proofPhotoUrl ?? before.afterPhotoUrl ?? before.proofPhotoUrl;
      if (!photo && !isAdmin(actor.actorRole)) {
        res.status(422).json({
          error: "after_photo_required",
          message: "An After photo is required to mark this task as completed.",
        });
        return;
      }
    }

    // completed → verified: manager/owner/super_admin only
    if (newStatus === "verified" && before.status === "completed") {
      if (!canVerify(actor.actorRole)) {
        res.status(403).json({
          error: "forbidden",
          message: "Only managers and owners can verify completed tasks.",
        });
        return;
      }
    }

    // Prevent illegal transitions (skip → completed without going through in-progress, etc.)
    const VALID_TRANSITIONS: Record<string, string[]> = {
      "pending":     ["in-progress"],
      "in-progress": ["completed", "pending"],
      "completed":   ["verified", "in-progress"],
      "verified":    [],
    };
    const allowed = VALID_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(newStatus) && !isAdmin(actor.actorRole)) {
      res.status(422).json({
        error: "invalid_transition",
        message: `Cannot move task from "${before.status}" to "${newStatus}".`,
      });
      return;
    }
  }

  // ── Build update payload ──────────────────────────────────────────────────

  const data: Record<string, unknown> = { ...parsed.data };

  if (newStatus === "in-progress" && before.status === "pending") {
    if (!before.startedAt) data.startedAt = new Date();
  }

  if (newStatus === "completed" && before.status !== "completed") {
    data.completedAt = new Date();
    if (actor.actorId) data.completedByUserId = actor.actorId;
  }

  if (newStatus === "verified" && before.status === "completed") {
    data.verifiedAt = new Date();
    if (actor.actorId) data.verifiedByUserId = actor.actorId;
  }

  if (parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== before.assignedToId && actor.actorId) {
    data.assignedByUserId = actor.actorId;
  }

  const [task] = await db.update(tasksTable).set(data).where(and(...conds)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const [staff] = task.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, task.assignedToId))
    : [null];
  const [property] = task.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, task.propertyId))
    : [null];
  const [assignedByUser] = task.assignedByUserId
    ? await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, task.assignedByUserId))
    : [null];

  if (newStatus && newStatus !== before.status) {
    const isVerifying   = newStatus === "verified";
    const isCompleting  = newStatus === "completed";
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "task.status_changed", entityType: "task", entityId: task.id, entityLabel: task.title,
      propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
      details: `${before.status} → ${newStatus}`,
      completedByName: isCompleting  ? actor.actorName : undefined,
      assignedByName:  assignedByUser?.displayName ?? undefined,
      proofPhotoUrl:   isCompleting  ? (task.afterPhotoUrl ?? task.proofPhotoUrl ?? undefined) : undefined,
      ...(isVerifying ? { details: `Verified by ${actor.actorName ?? "manager"}` } : {}),
    });
  }

  if (parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== before.assignedToId) {
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "task.assigned", entityType: "task", entityId: task.id, entityLabel: task.title,
      propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
      details: staff ? `Assigned to ${staff.name}` : "Unassigned",
      assignedByName: actor.actorName,
    });
  }

  res.json(formatTask(task, { assigneeName: staff?.name, propertyName: property?.name }));
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));
  const [task] = await db.select().from(tasksTable).where(and(...conds));
  await db.delete(tasksTable).where(and(...conds));
  if (task) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "task.deleted", entityType: "task", entityId: id, entityLabel: task.title,
    });
  }
  res.status(204).end();
});

// ── Report Escalation Actions ─────────────────────────────────────────────────

/** POST /tasks/:id/submit — worker submits completed task for review */
router.post("/tasks/:id/submit", async (req, res) => {
  const id       = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const actor    = actorFromRequest(req);
  const conds    = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));

  const [task] = await db.select().from(tasksTable).where(and(...conds));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.status !== "completed" && task.status !== "verified") {
    res.status(422).json({ error: "Task must be completed or verified before submitting a report." });
    return;
  }
  if (task.reportStatus !== "none" && task.reportStatus !== "rejected") {
    res.status(422).json({ error: `Cannot submit from reportStatus="${task.reportStatus}".` });
    return;
  }

  const [updated] = await db.update(tasksTable)
    .set({ reportStatus: "submitted", submittedAt: new Date(), submittedByUserId: actor.actorId ?? null })
    .where(and(...conds)).returning();

  const [staff] = updated.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, updated.assignedToId)) : [null];
  const [property] = updated.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, updated.propertyId)) : [null];

  logActivity({
    ...actor, tenantId: tenantId ?? 1,
    action: "task.report_submitted", entityType: "task", entityId: task.id, entityLabel: task.title,
    propertyId: property?.id, propertyName: property?.name,
    details: `Report submitted by ${actor.actorName ?? "worker"}`,
  });

  res.json(formatTask(updated, { assigneeName: staff?.name, propertyName: property?.name }));
});

/** POST /tasks/:id/reject — supervisor rejects a submitted report */
router.post("/tasks/:id/reject", async (req, res) => {
  const id       = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const actor    = actorFromRequest(req);

  if (!canReviewReport(actor.actorRole)) {
    res.status(403).json({ error: "Only supervisors and managers can reject reports." });
    return;
  }

  const notes = (req.body?.notes ?? "").trim();
  if (!notes) { res.status(400).json({ error: "Rejection notes are required." }); return; }

  const conds = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));
  const [task] = await db.select().from(tasksTable).where(and(...conds));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.reportStatus !== "submitted") {
    res.status(422).json({ error: "Report must be in 'submitted' state to reject." });
    return;
  }

  const [updated] = await db.update(tasksTable)
    .set({
      reportStatus:     "rejected",
      rejectedAt:       new Date(),
      rejectedByUserId: actor.actorId ?? null,
      rejectionNotes:   notes,
      // Push task back to in-progress so worker can correct it
      status:           "in-progress",
    })
    .where(and(...conds)).returning();

  const [staff] = updated.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, updated.assignedToId)) : [null];
  const [property] = updated.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, updated.propertyId)) : [null];

  logActivity({
    ...actor, tenantId: tenantId ?? 1,
    action: "task.report_rejected", entityType: "task", entityId: task.id, entityLabel: task.title,
    propertyId: property?.id, propertyName: property?.name,
    details: `Rejected by ${actor.actorName ?? "supervisor"}: ${notes}`,
  });

  res.json(formatTask(updated, { assigneeName: staff?.name, propertyName: property?.name }));
});

/** POST /tasks/:id/escalate — supervisor escalates to manager */
router.post("/tasks/:id/escalate", async (req, res) => {
  const id       = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const actor    = actorFromRequest(req);

  if (!canReviewReport(actor.actorRole)) {
    res.status(403).json({ error: "Only supervisors and managers can escalate reports." });
    return;
  }

  const conds = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));
  const [task] = await db.select().from(tasksTable).where(and(...conds));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.reportStatus !== "submitted") {
    res.status(422).json({ error: "Report must be in 'submitted' state to escalate." });
    return;
  }

  const [updated] = await db.update(tasksTable)
    .set({
      reportStatus:      "escalated",
      escalatedAt:       new Date(),
      escalatedByUserId: actor.actorId ?? null,
    })
    .where(and(...conds)).returning();

  const [staff] = updated.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, updated.assignedToId)) : [null];
  const [property] = updated.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, updated.propertyId)) : [null];

  logActivity({
    ...actor, tenantId: tenantId ?? 1,
    action: "task.report_escalated", entityType: "task", entityId: task.id, entityLabel: task.title,
    propertyId: property?.id, propertyName: property?.name,
    details: `Escalated to manager by ${actor.actorName ?? "supervisor"}`,
  });

  res.json(formatTask(updated, { assigneeName: staff?.name, propertyName: property?.name }));
});

/** POST /tasks/:id/approve — manager approves an escalated report */
router.post("/tasks/:id/approve", async (req, res) => {
  const id       = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const actor    = actorFromRequest(req);

  if (!canApproveReport(actor.actorRole)) {
    res.status(403).json({ error: "Only managers and owners can approve reports." });
    return;
  }

  const conds = [eq(tasksTable.id, id)];
  if (tenantId !== null) conds.push(eq(tasksTable.tenantId, tenantId));
  const [task] = await db.select().from(tasksTable).where(and(...conds));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.reportStatus !== "escalated") {
    res.status(422).json({ error: "Report must be 'escalated' before it can be approved." });
    return;
  }

  const [updated] = await db.update(tasksTable)
    .set({
      reportStatus:      "approved",
      approvedAt:        new Date(),
      approvedByUserId:  actor.actorId ?? null,
    })
    .where(and(...conds)).returning();

  const [staff] = updated.assignedToId
    ? await db.select().from(staffTable).where(eq(staffTable.id, updated.assignedToId)) : [null];
  const [property] = updated.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, updated.propertyId)) : [null];

  logActivity({
    ...actor, tenantId: tenantId ?? 1,
    action: "task.report_approved", entityType: "task", entityId: task.id, entityLabel: task.title,
    propertyId: property?.id, propertyName: property?.name,
    details: `Approved by ${actor.actorName ?? "manager"}`,
  });

  res.json(formatTask(updated, { assigneeName: staff?.name, propertyName: property?.name }));
});

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
  const tenantId = tid(req) ?? 1;
  const parsed = insertTaskCommentSchema.safeParse({ ...req.body, taskId, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [comment] = await db.insert(taskCommentsTable).values(parsed.data).returning();
  res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString() });
});

export default router;
