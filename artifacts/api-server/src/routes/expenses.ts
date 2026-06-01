import { Router } from "express";
import { db, expensesTable, propertiesTable, roomsTable, bookingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertExpenseSchema, updateExpenseSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatExpense(e: typeof expensesTable.$inferSelect, propertyName?: string | null, unitName?: string | null) {
  return { ...e, amount: Number(e.amount), createdAt: e.createdAt.toISOString(), propertyName: propertyName ?? null, unitName: unitName ?? null };
}

router.get("/expenses", async (req, res) => {
  const { propertyId, unitId, category } = req.query as { propertyId?: string; unitId?: string; category?: string };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(expensesTable.tenantId, tenantId));
  if (propertyId) conditions.push(eq(expensesTable.propertyId, parseInt(propertyId)));
  if (unitId) conditions.push(eq(expensesTable.unitId, parseInt(unitId)));
  if (category) conditions.push(eq(expensesTable.category, category));

  const rows = await db
    .select({ expense: expensesTable, property: propertiesTable, room: roomsTable })
    .from(expensesTable)
    .leftJoin(propertiesTable, eq(expensesTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable, eq(expensesTable.unitId, roomsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${expensesTable.expenseDate} desc`);
  res.json(rows.map(({ expense, property, room }) => formatExpense(expense, property?.name, room?.name)));
});

router.post("/expenses", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertExpenseSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.insert(expensesTable).values(parsed.data).returning();
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, expense.propertyId));
  const actor = actorFromRequest(req);
  logActivity({
    ...actor, tenantId,
    action: "expense.created", entityType: "expense", entityId: expense.id,
    entityLabel: expense.title ?? `Expense #${expense.id}`,
    propertyId: property?.id ?? undefined, propertyName: property?.name ?? undefined,
    details: `Category: ${expense.category ?? "—"} | Amount: ${Number(expense.amount).toFixed(2)}`,
  });
  res.status(201).json(formatExpense(expense, property?.name));
});

router.patch("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(expensesTable.id, id)];
  if (tenantId !== null) conds.push(eq(expensesTable.tenantId, tenantId));
  const [expense] = await db.update(expensesTable).set(parsed.data).where(and(...conds)).returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  const [property] = expense.propertyId
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.id, expense.propertyId))
    : [null];
  const [unit] = expense.unitId
    ? await db.select().from(roomsTable).where(eq(roomsTable.id, expense.unitId))
    : [null];
  res.json(formatExpense(expense, property?.name, unit?.name));
});

router.delete("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(expensesTable.id, id)];
  if (tenantId !== null) conds.push(eq(expensesTable.tenantId, tenantId));
  const [expense] = await db.select({ e: expensesTable, p: propertiesTable })
    .from(expensesTable)
    .leftJoin(propertiesTable, eq(expensesTable.propertyId, propertiesTable.id))
    .where(and(...conds));
  await db.delete(expensesTable).where(and(...conds));
  if (expense) {
    const actor = actorFromRequest(req);
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: "expense.deleted", entityType: "expense", entityId: id,
      entityLabel: expense.e.title ?? `Expense #${id}`,
      propertyId: expense.p?.id ?? undefined, propertyName: expense.p?.name ?? undefined,
      details: `Category: ${expense.e.category ?? "—"} | Amount: ${Number(expense.e.amount).toFixed(2)}`,
    });
  }
  res.status(204).end();
});

router.get("/finance/summary", async (req, res) => {
  const tenantId = tid(req);
  const props = await db
    .select()
    .from(propertiesTable)
    .where(tenantId !== null ? eq(propertiesTable.tenantId, tenantId) : undefined)
    .orderBy(propertiesTable.name);

  const results = await Promise.all(
    props.map(async (prop) => {
      const unitIds = await db
        .select({ id: roomsTable.id })
        .from(roomsTable)
        .where(eq(roomsTable.propertyId, prop.id));
      const roomIdList = unitIds.map((u) => u.id);

      let totalRevenue = 0;
      let bookingCount = 0;
      if (roomIdList.length > 0) {
        const [r] = await db
          .select({
            revenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
            count: sql<number>`count(*) filter (where ${bookingsTable.status} != 'cancelled')::int`,
          })
          .from(bookingsTable)
          .where(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIdList.join(",") || "NULL")}])`);
        totalRevenue = Number(r?.revenue ?? 0);
        bookingCount = r?.count ?? 0;
      }

      const [e] = await db
        .select({
          total: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(expensesTable)
        .where(eq(expensesTable.propertyId, prop.id));
      return {
        propertyId: prop.id, propertyName: prop.name,
        totalRevenue, totalExpenses: Number(e?.total ?? 0),
        netIncome: totalRevenue - Number(e?.total ?? 0),
        bookingCount, expenseCount: e?.count ?? 0,
      };
    })
  );
  res.json(results);
});

router.get("/finance/monthly", async (req, res) => {
  const { propertyId } = req.query as { propertyId?: string };
  const tenantId = tid(req);

  const revConds = tenantId !== null ? [eq(bookingsTable.tenantId, tenantId)] : [];
  if (propertyId) {
    const propertyRooms = await db.select({ id: roomsTable.id }).from(roomsTable).where(eq(roomsTable.propertyId, parseInt(propertyId)));
    const roomIds = propertyRooms.map((r) => r.id);
    if (roomIds.length > 0) {
      revConds.push(sql`${bookingsTable.roomId} = ANY(ARRAY[${sql.raw(roomIds.join(","))}])`);
    } else {
      revConds.push(sql`1=0`);
    }
  }

  const revenueRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${bookingsTable.createdAt}), 'Mon YYYY')`,
      sortKey: sql<string>`date_trunc('month', ${bookingsTable.createdAt})::text`,
      revenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
    })
    .from(bookingsTable)
    .where(revConds.length > 0 ? and(...revConds) : undefined)
    .groupBy(sql`date_trunc('month', ${bookingsTable.createdAt})`);

  const expConds = [];
  if (tenantId !== null) expConds.push(eq(expensesTable.tenantId, tenantId));
  if (propertyId) expConds.push(eq(expensesTable.propertyId, parseInt(propertyId)));

  const expenseRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${expensesTable.expenseDate}::timestamp), 'Mon YYYY')`,
      sortKey: sql<string>`date_trunc('month', ${expensesTable.expenseDate}::timestamp)::text`,
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    })
    .from(expensesTable)
    .where(expConds.length > 0 ? and(...expConds) : undefined)
    .groupBy(sql`date_trunc('month', ${expensesTable.expenseDate}::timestamp)`);

  const byMonth = new Map<string, { month: string; revenue: number; expenses: number }>();
  for (const r of revenueRows) {
    byMonth.set(r.sortKey, { month: r.month, revenue: Number(r.revenue), expenses: 0 });
  }
  for (const e of expenseRows) {
    const existing = byMonth.get(e.sortKey);
    if (existing) { existing.expenses = Number(e.expenses); }
    else { byMonth.set(e.sortKey, { month: e.month, revenue: 0, expenses: Number(e.expenses) }); }
  }

  res.json(
    Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, netIncome: v.revenue - v.expenses }))
  );
});

export default router;
