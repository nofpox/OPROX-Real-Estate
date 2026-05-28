import { Router } from "express";
import { db, bookingsTable, roomsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertBookingSchema, updateBookingSchema } from "@workspace/db";

const router = Router();

function formatBooking(b: typeof bookingsTable.$inferSelect, room?: typeof roomsTable.$inferSelect | null) {
  return {
    ...b,
    totalAmount: Number(b.totalAmount),
    createdAt: b.createdAt.toISOString(),
    roomName: room?.name ?? null,
    roomType: room?.type ?? null,
  };
}

router.get("/bookings", async (req, res) => {
  const { status, roomId } = req.query as { status?: string; roomId?: string };

  const conditions = [];
  if (status) conditions.push(eq(bookingsTable.status, status));
  if (roomId) conditions.push(eq(bookingsTable.roomId, parseInt(roomId)));

  const bookings = await db
    .select({
      booking: bookingsTable,
      room: roomsTable,
    })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(bookingsTable.createdAt);

  const result = bookings.map(({ booking, room }) => formatBooking(booking, room));
  res.json(result);
});

router.post("/bookings", async (req, res) => {
  const parsed = insertBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));

  // Mark room as occupied on check-in confirmed
  if (parsed.data.status === "checked-in") {
    await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, booking.roomId));
  }

  res.status(201).json(formatBooking(booking, room));
});

router.get("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(eq(bookingsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(formatBooking(row.booking, row.room));
});

router.patch("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = updateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set(parsed.data)
    .where(eq(bookingsTable.id, id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Update room status based on booking status
  if (parsed.data.status === "checked-in") {
    await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, booking.roomId));
  } else if (parsed.data.status === "checked-out" || parsed.data.status === "cancelled") {
    await db.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, booking.roomId));
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  res.json(formatBooking(booking, room));
});

router.delete("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
  res.status(204).end();
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(eq(bookingsTable.id, id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Free the room
  await db.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, booking.roomId));

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  res.json(formatBooking(booking, room));
});

export default router;
