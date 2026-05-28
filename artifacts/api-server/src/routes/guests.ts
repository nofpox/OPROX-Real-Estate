import { Router } from "express";
import { db, bookingsTable, roomsTable } from "@workspace/db";
import { eq, sql, ilike, or } from "drizzle-orm";

const router = Router();

function buildGuest(rows: Array<{ booking: typeof bookingsTable.$inferSelect; room: typeof roomsTable.$inferSelect | null }>) {
  const first = rows[0];
  const totalSpent = rows
    .filter((r) => r.booking.status !== "cancelled")
    .reduce((sum, r) => sum + Number(r.booking.totalAmount), 0);
  const sortedByDate = [...rows].sort(
    (a, b) => new Date(b.booking.checkIn).getTime() - new Date(a.booking.checkIn).getTime()
  );
  const latest = sortedByDate[0];
  const oldest = sortedByDate[sortedByDate.length - 1];

  return {
    guestName: first.booking.guestName,
    guestEmail: first.booking.guestEmail,
    guestPhone: first.booking.guestPhone ?? null,
    totalBookings: rows.length,
    totalSpent,
    lastStay: latest?.booking.checkIn ?? null,
    firstStay: oldest?.booking.checkIn ?? null,
    lastRoomType: latest?.room?.type ?? null,
    lastStatus: latest?.booking.status ?? null,
  };
}

router.get("/guests", async (req, res) => {
  const { search } = req.query as { search?: string };

  const rows = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .orderBy(bookingsTable.guestEmail, bookingsTable.checkIn);

  // Group by email
  const byEmail = new Map<string, typeof rows>();
  for (const row of rows) {
    const email = row.booking.guestEmail;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email)!.push(row);
  }

  let guests = Array.from(byEmail.values()).map(buildGuest);

  // Filter by search term if provided
  if (search) {
    const lower = search.toLowerCase();
    guests = guests.filter(
      (g) =>
        g.guestName.toLowerCase().includes(lower) ||
        g.guestEmail.toLowerCase().includes(lower) ||
        (g.guestPhone ?? "").toLowerCase().includes(lower)
    );
  }

  // Sort by last stay descending
  guests.sort((a, b) => {
    if (!a.lastStay) return 1;
    if (!b.lastStay) return -1;
    return new Date(b.lastStay).getTime() - new Date(a.lastStay).getTime();
  });

  res.json(guests);
});

router.get("/guests/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  const rows = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(eq(bookingsTable.guestEmail, email))
    .orderBy(sql`${bookingsTable.checkIn} desc`);

  if (rows.length === 0) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  const profile = buildGuest(rows);
  const bookings = rows.map(({ booking, room }) => ({
    ...booking,
    totalAmount: Number(booking.totalAmount),
    createdAt: booking.createdAt.toISOString(),
    roomName: room?.name ?? null,
    roomType: room?.type ?? null,
  }));

  res.json({ ...profile, bookings });
});

export default router;
