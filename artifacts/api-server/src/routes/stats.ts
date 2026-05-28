import { Router } from "express";
import { db, bookingsTable, roomsTable } from "@workspace/db";
import { eq, sql, and, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", async (req, res) => {
  const [bookingStats] = await db
    .select({
      totalBookings: sql<number>`count(*)::int`,
      activeBookings: sql<number>`count(*) filter (where ${bookingsTable.status} in ('confirmed', 'checked-in'))::int`,
      totalRevenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
      monthlyRevenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (
        where ${bookingsTable.status} != 'cancelled'
        and date_trunc('month', ${bookingsTable.createdAt}) = date_trunc('month', now())
      ), 0)`,
      pendingCheckIns: sql<number>`count(*) filter (where ${bookingsTable.status} = 'confirmed' and ${bookingsTable.checkIn} = current_date)::int`,
      pendingCheckOuts: sql<number>`count(*) filter (where ${bookingsTable.status} = 'checked-in' and ${bookingsTable.checkOut} = current_date)::int`,
    })
    .from(bookingsTable);

  const [roomStats] = await db
    .select({
      totalRooms: sql<number>`count(*)::int`,
      availableRooms: sql<number>`count(*) filter (where ${roomsTable.status} = 'available')::int`,
      occupiedRooms: sql<number>`count(*) filter (where ${roomsTable.status} = 'occupied')::int`,
    })
    .from(roomsTable);

  const occupancyRate =
    roomStats.totalRooms > 0
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
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${bookingsTable.createdAt}), 'Mon YYYY')`,
      revenue: sql<number>`coalesce(sum(${bookingsTable.totalAmount}::numeric) filter (where ${bookingsTable.status} != 'cancelled'), 0)`,
      bookings: sql<number>`count(*) filter (where ${bookingsTable.status} != 'cancelled')::int`,
    })
    .from(bookingsTable)
    .groupBy(sql`date_trunc('month', ${bookingsTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${bookingsTable.createdAt})`);

  res.json(
    rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      bookings: r.bookings,
    }))
  );
});

router.get("/stats/occupancy", async (req, res) => {
  const roomTypes = await db
    .select({
      type: roomsTable.type,
      total: sql<number>`count(*)::int`,
      occupied: sql<number>`count(*) filter (where ${roomsTable.status} = 'occupied')::int`,
    })
    .from(roomsTable)
    .groupBy(roomsTable.type);

  res.json(
    roomTypes.map((r) => ({
      type: r.type,
      total: r.total,
      occupied: r.occupied,
      occupancyRate: r.total > 0 ? Math.round((r.occupied / r.total) * 100) : 0,
    }))
  );
});

router.get("/stats/recent-bookings", async (req, res) => {
  const rows = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .orderBy(sql`${bookingsTable.createdAt} desc`)
    .limit(10);

  res.json(
    rows.map(({ booking, room }) => ({
      ...booking,
      totalAmount: Number(booking.totalAmount),
      createdAt: booking.createdAt.toISOString(),
      roomName: room?.name ?? null,
      roomType: room?.type ?? null,
    }))
  );
});

export default router;
