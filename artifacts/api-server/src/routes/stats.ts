import { Router } from "express";
import { db, bookingsTable, roomsTable, propertiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

router.get("/stats/overview", async (req, res) => {
  const tenantId = tid(req);
  const bookingCond = tenantId !== null ? eq(bookingsTable.tenantId, tenantId) : undefined;
  const roomCond    = tenantId !== null ? eq(roomsTable.tenantId, tenantId) : undefined;

  const [bookingStats] = await db
    .select({
      totalBookings:    sql<number>`count(*)::int`,
      activeBookings:   sql<number>`count(*) filter (where ${bookingsTable.status} in ('confirmed', 'checked-in'))::int`,
      totalRevenue:     sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
      monthlyRevenue:   sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (
        where ${bookingsTable.status} != 'cancelled'
        and date_trunc('month', ${bookingsTable.createdAt}) = date_trunc('month', now())
      ), 0)`,
      pendingCheckIns:  sql<number>`count(*) filter (where ${bookingsTable.status} = 'confirmed' and ${bookingsTable.checkIn} = current_date)::int`,
      pendingCheckOuts: sql<number>`count(*) filter (where ${bookingsTable.status} = 'checked-in' and ${bookingsTable.checkOut} = current_date)::int`,
    })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(bookingCond);

  const [roomStats] = await db
    .select({
      totalRooms:     sql<number>`count(*)::int`,
      availableRooms: sql<number>`count(*) filter (where ${roomsTable.status} = 'available')::int`,
      occupiedRooms:  sql<number>`count(*) filter (where ${roomsTable.status} = 'occupied')::int`,
    })
    .from(roomsTable)
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(roomCond);

  const occupancyRate = roomStats.totalRooms > 0
    ? Math.round((roomStats.occupiedRooms / roomStats.totalRooms) * 100)
    : 0;

  res.json({
    totalBookings: bookingStats.totalBookings,
    activeBookings: bookingStats.activeBookings,
    totalRooms: roomStats.totalRooms,
    availableRooms: roomStats.availableRooms,
    totalRevenue: Number(bookingStats.totalRevenue),
    monthlyRevenue: Number(bookingStats.monthlyRevenue),
    occupancyRate,
    pendingCheckIns: bookingStats.pendingCheckIns,
    pendingCheckOuts: bookingStats.pendingCheckOuts,
  });
});

router.get("/stats/income", async (req, res) => {
  const tenantId = tid(req);
  const rows = await db
    .select({
      month:    sql<string>`to_char(date_trunc('month', ${bookingsTable.createdAt}), 'Mon YYYY')`,
      revenue:  sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
      bookings: sql<number>`count(*) filter (where ${bookingsTable.status} != 'cancelled')::int`,
    })
    .from(bookingsTable)
    .where(tenantId !== null ? eq(bookingsTable.tenantId, tenantId) : undefined)
    .groupBy(sql`date_trunc('month', ${bookingsTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${bookingsTable.createdAt})`);

  res.json(rows.map((r) => ({ month: r.month, revenue: Number(r.revenue), bookings: r.bookings })));
});

router.get("/stats/occupancy-heatmap", async (req, res) => {
  const daysParam = parseInt((req.query.days as string) || "42");
  const days = Math.max(7, Math.min(daysParam, 90));
  const tenantId = tid(req);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (days - 7));

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const roomConds = tenantId !== null ? [eq(roomsTable.tenantId, tenantId)] : [];
  const roomCounts = await db
    .select({
      propertyId:   roomsTable.propertyId,
      propertyName: propertiesTable.name,
      totalRooms:   sql<number>`count(*)::int`,
    })
    .from(roomsTable)
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(roomConds.length > 0 ? and(...roomConds) : undefined)
    .groupBy(roomsTable.propertyId, propertiesTable.name);

  const bookingConds = [];
  if (tenantId !== null) bookingConds.push(eq(bookingsTable.tenantId, tenantId));

  const bookings = await db
    .select({ checkIn: bookingsTable.checkIn, checkOut: bookingsTable.checkOut, propertyId: roomsTable.propertyId })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(
      and(
        ...(bookingConds.length > 0 ? bookingConds : [sql`true`]),
        sql`${bookingsTable.status} in ('confirmed', 'checked-in', 'checked-out')
          and ${bookingsTable.checkOut} >= ${startStr}
          and ${bookingsTable.checkIn} <= ${endStr}`
      )
    );

  const result: { propertyId: number; propertyName: string; date: string; occupiedRooms: number; totalRooms: number; occupancyPct: number }[] = [];

  for (const { propertyId, propertyName, totalRooms } of roomCounts) {
    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = d.toISOString().split("T")[0];
      const occupied = bookings.filter((b) => {
        if (b.propertyId !== propertyId) return false;
        return b.checkIn <= dateStr && b.checkOut > dateStr;
      }).length;
      result.push({
        propertyId: propertyId!,
        propertyName: propertyName ?? "Unknown",
        date: dateStr,
        occupiedRooms: occupied,
        totalRooms,
        occupancyPct: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
      });
      d.setDate(d.getDate() + 1);
    }
  }

  res.json(result);
});

router.get("/stats/occupancy", async (req, res) => {
  const tenantId = tid(req);
  const roomTypes = await db
    .select({
      type:     roomsTable.type,
      total:    sql<number>`count(*)::int`,
      occupied: sql<number>`count(*) filter (where ${roomsTable.status} = 'occupied')::int`,
    })
    .from(roomsTable)
    .where(tenantId !== null ? eq(roomsTable.tenantId, tenantId) : undefined)
    .groupBy(roomsTable.type);

  res.json(roomTypes.map((r) => ({
    type: r.type, total: r.total, occupied: r.occupied,
    occupancyRate: r.total > 0 ? Math.round((r.occupied / r.total) * 100) : 0,
  })));
});

router.get("/stats/recent-bookings", async (req, res) => {
  const tenantId = tid(req);
  const rows = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(tenantId !== null ? eq(bookingsTable.tenantId, tenantId) : undefined)
    .orderBy(sql`${bookingsTable.createdAt} desc`)
    .limit(10);

  res.json(rows.map(({ booking, room }) => ({
    ...booking,
    totalAmount: Number(booking.totalAmount),
    createdAt: booking.createdAt.toISOString(),
    roomName: room?.name ?? null,
    roomType: room?.type ?? null,
  })));
});

/** Operational analytics: response times, task counts per worker and per unit (no financial data) */
router.get("/stats/operational", async (req, res) => {
  const tenantId = tid(req);
  const taskTenantCond = tenantId !== null
    ? sql`tenant_id = ${tenantId}`
    : sql`1=1`;
  const woCond = tenantId !== null
    ? sql`tenant_id = ${tenantId}`
    : sql`1=1`;

  // 1. Overall task response time (minutes) — completed/verified tasks with completedAt
  const rtResult = await db.execute(sql`
    SELECT
      ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60)::numeric, 1) AS avg_minutes,
      COUNT(*) FILTER (WHERE status IN ('completed','verified')) AS total_completed,
      COUNT(*) FILTER (WHERE status = 'pending') AS total_pending,
      COUNT(*) FILTER (WHERE status = 'in-progress') AS total_in_progress,
      COUNT(*) AS total_all
    FROM tasks
    WHERE ${taskTenantCond}
      AND completed_at IS NOT NULL
  `);
  const responseTimeRow = rtResult.rows[0] as Record<string, unknown> | undefined;

  // 2. Tasks per worker (top 15)
  const workerResult = await db.execute(sql`
    SELECT
      u.display_name AS name,
      u.role,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE t.status IN ('completed','verified')) AS completed,
      COUNT(*) FILTER (WHERE t.status = 'in-progress') AS in_progress,
      COUNT(*) FILTER (WHERE t.status = 'pending') AS pending,
      ROUND(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 60) FILTER (WHERE t.completed_at IS NOT NULL)::numeric, 1) AS avg_minutes
    FROM tasks t
    JOIN users u ON t.assigned_to_id = u.id
    WHERE ${taskTenantCond}
    GROUP BY u.id, u.display_name, u.role
    ORDER BY total DESC
    LIMIT 15
  `);
  const workerRows = workerResult.rows as Record<string, unknown>[];

  // 3. Work orders per unit (top 15)
  const unitResult = await db.execute(sql`
    SELECT
      r.name AS unit_name,
      p.name AS property_name,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE wo.status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE wo.status = 'in-progress') AS in_progress,
      COUNT(*) FILTER (WHERE wo.status = 'pending') AS pending
    FROM work_orders wo
    JOIN rooms r ON wo.unit_id = r.id
    LEFT JOIN properties p ON wo.property_id = p.id
    WHERE ${woCond}
    GROUP BY r.id, r.name, p.name
    ORDER BY total DESC
    LIMIT 15
  `);
  const unitRows = unitResult.rows as Record<string, unknown>[];

  // 4. Overall work order counts
  const woResult = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending
    FROM work_orders
    WHERE ${woCond}
  `);
  const woSummary = woResult.rows[0] as Record<string, unknown> | undefined;

  res.json({
    tasks: {
      avgResponseMinutes: Number(responseTimeRow?.avg_minutes ?? 0),
      totalCompleted:     Number(responseTimeRow?.total_completed ?? 0),
      totalPending:       Number(responseTimeRow?.total_pending ?? 0),
      totalInProgress:    Number(responseTimeRow?.total_in_progress ?? 0),
      totalAll:           Number(responseTimeRow?.total_all ?? 0),
    },
    workOrders: {
      total:      Number(woSummary?.total ?? 0),
      completed:  Number(woSummary?.completed ?? 0),
      inProgress: Number(woSummary?.in_progress ?? 0),
      pending:    Number(woSummary?.pending ?? 0),
    },
    workerRows: workerRows.map(r => ({
      name:       String(r.name ?? "—"),
      role:       String(r.role ?? ""),
      total:      Number(r.total),
      completed:  Number(r.completed),
      inProgress: Number(r.in_progress),
      pending:    Number(r.pending),
      avgMinutes: Number(r.avg_minutes ?? 0),
    })),
    unitRows: unitRows.map(r => ({
      unitName:     String(r.unit_name ?? "—"),
      propertyName: String(r.property_name ?? ""),
      total:        Number(r.total),
      completed:    Number(r.completed),
      inProgress:   Number(r.in_progress),
      pending:      Number(r.pending),
    })),
  });
});

export default router;
