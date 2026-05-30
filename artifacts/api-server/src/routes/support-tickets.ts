import { Router } from "express";
import { db, supportTicketsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { insertSupportTicketSchema, updateSupportTicketSchema } from "@workspace/db";
import { actorFromRequest, getRoleTier } from "./activityLogs";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function isAdmin(role: string | undefined): boolean {
  return getRoleTier(role ?? "staff") === "admin";
}

/** POST /support-tickets — any authenticated user */
router.post("/support-tickets", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const actor = actorFromRequest(req);

  const parsed = insertSupportTicketSchema.safeParse({
    ...req.body,
    tenantId,
    submittedByUserId: actor.actorId ?? null,
    submittedByName:   actor.actorName ?? "Unknown",
    submittedByRole:   actor.actorRole ?? "staff",
    status: "open",
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message }); return;
  }

  const [ticket] = await db.insert(supportTicketsTable).values(parsed.data).returning();
  res.status(201).json(formatTicket(ticket));
});

/** GET /support-tickets — admin/owner/super_admin only */
router.get("/support-tickets", async (req, res) => {
  const actor = actorFromRequest(req);
  if (!isAdmin(actor.actorRole)) {
    res.status(403).json({ error: "Only admins can view support tickets." }); return;
  }

  const tenantId = tid(req);
  const { status } = req.query as { status?: string };

  const conds = [];
  if (tenantId !== null) conds.push(eq(supportTicketsTable.tenantId, tenantId));
  if (status) conds.push(eq(supportTicketsTable.status, status));

  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(rows.map(formatTicket));
});

/** PATCH /support-tickets/:id — admin/owner/super_admin only */
router.patch("/support-tickets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const actor = actorFromRequest(req);
  if (!isAdmin(actor.actorRole)) {
    res.status(403).json({ error: "Only admins can update support tickets." }); return;
  }

  const tenantId = tid(req);
  const parsed = updateSupportTicketSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const conds = [eq(supportTicketsTable.id, id)];
  if (tenantId !== null) conds.push(eq(supportTicketsTable.tenantId, tenantId));

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };

  if (parsed.data.status === "resolved" || parsed.data.status === "closed") {
    updateData.resolvedAt = new Date();
    updateData.resolvedByUserId = actor.actorId ?? null;
  }

  const [ticket] = await db.update(supportTicketsTable).set(updateData).where(and(...conds)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  res.json(formatTicket(ticket));
});

function formatTicket(t: typeof supportTicketsTable.$inferSelect) {
  return {
    ...t,
    createdAt:  t.createdAt.toISOString(),
    updatedAt:  t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
  };
}

export default router;
