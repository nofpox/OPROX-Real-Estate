import { Router } from "express";
import { db, expensesTable, propertiesTable, roomsTable, bookingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { insertExpenseSchema, updateExpenseSchema } from "@workspace/db";

const router = Router();

function formatExpense(
  e: typeof expensesTable.$inferSelect,
  propertyName?: string | null,
  unitName?: string | null
) {
  return {
    ...e,
    amount: Number(e.amount),
    createdAt: e.createdAt.toISOString(),
    propertyName: propertyName ?? null,
    unitName: unitName ?? null,
  };
}

router.get("/expenses", async (req, res) => {
  const { propertyId, unitId, category } = req.query as {
    propertyId?: string;
    unitId?: string;
    category?: string;
  };

  const conditions = [];
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
  const parsed = insertExpenseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.insert(expensesTable).values(parsed.data).returning();
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, expense.propertyId));
  res.status(201).json(formatExpense(expense, property?.name));
});

router.patch("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.update(expensesTable).set(parsed.data).where(eq(expensesTable.id, id)).returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(formatExpense(expense));
});

router.delete("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).end();
});

router.get("/finance/summary", async (req, res) => {
  const props = await db.select().from(propertiesTable).orderBy(propertiesTable.name);

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
      const totalExpenses = Number(e?.total ?? 0);
      const expenseCount = e?.count ?? 0;

      return {
        propertyId: prop.id,
        propertyName: prop.name,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        bookingCount,
        expenseCount,
      };
    })
  );

  res.json(results);
});

router.get("/finance/monthly", async (req, res) => {
  const { propertyId } = req.query as { propertyId?: string };

  // Revenue from bookings
  const revenueRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${bookingsTable.createdAt}), 'Mon YYYY')`,
      sortKey: sql<string>`date_trunc('month', ${bookingsTable.createdAt})::text`,
      revenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
    })
    .from(bookingsTable)
    .groupBy(sql`date_trunc('month', ${bookingsTable.createdAt})`);

  // Expenses
  const expenseRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${expensesTable.expenseDate}::timestamp), 'Mon YYYY')`,
      sortKey: sql<string>`date_trunc('month', ${expensesTable.expenseDate}::timestamp)::text`,
      expenses: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
    })
    .from(expensesTable)
    .where(propertyId ? eq(expensesTable.propertyId, parseInt(propertyId)) : sql`true`)
    .groupBy(sql`date_trunc('month', ${expensesTable.expenseDate}::timestamp)`);

  const byMonth = new Map<string, { month: string; revenue: number; expenses: number }>();
  for (const r of revenueRows) {
    byMonth.set(r.sortKey, { month: r.month, revenue: Number(r.revenue), expenses: 0 });
  }
  for (const e of expenseRows) {
    const existing = byMonth.get(e.sortKey);
    if (existing) {
      existing.expenses = Number(e.expenses);
    } else {
      byMonth.set(e.sortKey, { month: e.month, revenue: 0, expenses: Number(e.expenses) });
    }
  }

  const result = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, netIncome: v.revenue - v.expenses }));

  res.json(result);
});

export default router;
