import { Router } from "express";
import { db, guestsTable, bookingsTable, roomsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

router.get("/guests", async (req, res) => {
  const { search } = req.query as { search?: string };
  const tenantId = tid(req);

  const guestConds = tenantId !== null ? [eq(guestsTable.tenantId, tenantId)] : [];
  const guests = await db
    .select()
    .from(guestsTable)
    .where(guestConds.length > 0 ? and(...guestConds) : undefined)
    .orderBy(guestsTable.name);

  const bookingConds = tenantId !== null ? [eq(bookingsTable.tenantId, tenantId)] : [];
  const bookings = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(bookingConds.length > 0 ? and(...bookingConds) : undefined)
    .orderBy(bookingsTable.guestEmail, bookingsTable.checkIn);

  const bookingsByEmail = new Map<string, typeof bookings>();
  for (const row of bookings) {
    const email = row.booking.guestEmail;
    if (!bookingsByEmail.has(email)) bookingsByEmail.set(email, []);
    bookingsByEmail.get(email)!.push(row);
  }

  let result = guests.map((g) => {
    const guestBookings = bookingsByEmail.get(g.email) ?? [];
    const totalSpent = guestBookings
      .filter((r) => r.booking.status !== "cancelled")
      .reduce((sum, r) => sum + Number(r.booking.totalAmount), 0);
    const sorted = [...guestBookings].sort(
      (a, b) => new Date(b.booking.checkIn).getTime() - new Date(a.booking.checkIn).getTime()
    );
    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    return {
      id: g.id,
      guestName: g.name,
      guestEmail: g.email,
      guestPhone: g.phone ?? null,
      totalBookings: guestBookings.length,
      totalSpent,
      lastStay: latest?.booking.checkIn ?? null,
      firstStay: oldest?.booking.checkIn ?? null,
      lastRoomType: latest?.room?.type ?? null,
      lastStatus: latest?.booking.status ?? null,
    };
  });

  if (search) {
    const lower = search.toLowerCase();
    result = result.filter(
      (g) => g.guestName.toLowerCase().includes(lower) ||
             g.guestEmail.toLowerCase().includes(lower) ||
             (g.guestPhone ?? "").toLowerCase().includes(lower)
    );
  }

  result.sort((a, b) => {
    if (!a.lastStay) return 1;
    if (!b.lastStay) return -1;
    return new Date(b.lastStay).getTime() - new Date(a.lastStay).getTime();
  });

  res.json(result);
});

router.get("/guests/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const tenantId = tid(req);

  const guestConds = [eq(guestsTable.email, email)];
  if (tenantId !== null) guestConds.push(eq(guestsTable.tenantId, tenantId));
  const [guest] = await db.select().from(guestsTable).where(and(...guestConds));
  if (!guest) { res.status(404).json({ error: "Guest not found" }); return; }

  const bookingConds = [eq(bookingsTable.guestEmail, email)];
  if (tenantId !== null) bookingConds.push(eq(bookingsTable.tenantId, tenantId));
  const rows = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(and(...bookingConds))
    .orderBy(sql`${bookingsTable.checkIn} desc`);

  const totalSpent = rows
    .filter((r) => r.booking.status !== "cancelled")
    .reduce((sum, r) => sum + Number(r.booking.totalAmount), 0);
  const sorted = [...rows].sort(
    (a, b) => new Date(b.booking.checkIn).getTime() - new Date(a.booking.checkIn).getTime()
  );
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];

  const profile = {
    id: guest.id,
    guestName: guest.name,
    guestEmail: guest.email,
    guestPhone: guest.phone ?? null,
    totalBookings: rows.length,
    totalSpent,
    lastStay: latest?.booking.checkIn ?? null,
    firstStay: oldest?.booking.checkIn ?? null,
    lastRoomType: latest?.room?.type ?? null,
    lastStatus: latest?.booking.status ?? null,
  };

  const bookingList = rows.map(({ booking, room }) => ({
    ...booking,
    totalAmount: Number(booking.totalAmount),
    createdAt: booking.createdAt.toISOString(),
    roomName: room?.name ?? null,
    roomType: room?.type ?? null,
  }));

  res.json({ ...profile, bookings: bookingList });
});

export default router;
