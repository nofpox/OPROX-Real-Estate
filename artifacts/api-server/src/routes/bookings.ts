import { Router } from "express";
import { db, bookingsTable, roomsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertBookingSchema, updateBookingSchema } from "@workspace/db";
import { logActivity, actorFromRequest } from "./activityLogs";
import { availabilityCache, portalCache } from "../utils/cache.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function formatBooking(b: typeof bookingsTable.$inferSelect, room?: typeof roomsTable.$inferSelect | null) {
  return {
    ...b, totalAmount: Number(b.totalAmount), createdAt: b.createdAt.toISOString(),
    roomName: room?.name ?? null, roomType: room?.type ?? null,
  };
}

/**
 * Invalidate all cache entries that could be affected by a booking mutation
 * on the given property. Also clears the portal bookings list cache.
 */
function invalidateBookingCaches(propertyId?: number | null): void {
  if (propertyId != null) {
    availabilityCache.invalidatePrefix(`avail:${propertyId}:`);
  } else {
    availabilityCache.invalidatePrefix("avail:");
  }
  portalCache.invalidatePrefix("bkgs:");
  portalCache.invalidatePrefix("props:");
}

router.get("/bookings", async (req, res) => {
  const { status, roomId } = req.query as { status?: string; roomId?: string };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(bookingsTable.tenantId, tenantId));
  if (status) conditions.push(eq(bookingsTable.status, status));
  if (roomId) conditions.push(eq(bookingsTable.roomId, parseInt(roomId)));

  const bookings = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(bookingsTable.createdAt);
  res.json(bookings.map(({ booking, room }) => formatBooking(booking, room)));
});

router.post("/bookings", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertBookingSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  if (parsed.data.status === "checked-in") {
    await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, booking.roomId));
  }
  const actor = actorFromRequest(req);
  logActivity({
    ...actor, tenantId,
    action: "booking.created", entityType: "booking", entityId: booking.id,
    entityLabel: `Booking #${booking.id}${room ? ` — ${room.name}` : ""}`,
    details: `Status: ${booking.status}, Guest: ${booking.guestName ?? "—"}`,
  });
  invalidateBookingCaches(room?.propertyId);
  res.status(201).json(formatBooking(booking, room));
});

router.get("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(bookingsTable.id, id)];
  if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
  const [row] = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(and(...conds));
  if (!row) { res.status(404).json({ error: "Booking not found" }); return; }
  res.json(formatBooking(row.booking, row.room));
});

router.patch("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateBookingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(bookingsTable.id, id)];
  if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
  const [before] = await db.select({ b: bookingsTable }).from(bookingsTable).where(and(...conds));
  const [booking] = await db.update(bookingsTable).set(parsed.data).where(and(...conds)).returning();
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (parsed.data.status === "checked-in") {
    await db.update(roomsTable).set({ status: "occupied" }).where(eq(roomsTable.id, booking.roomId));
  } else if (parsed.data.status === "checked-out" || parsed.data.status === "cancelled") {
    await db.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, booking.roomId));
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));

  if (before && parsed.data.status && parsed.data.status !== before.b.status) {
    const actor = actorFromRequest(req);
    const actionMap: Record<string, string> = {
      "checked-in": "booking.checked_in", "checked-out": "booking.checked_out",
      "cancelled": "booking.cancelled", "confirmed": "booking.confirmed",
    };
    logActivity({
      ...actor, tenantId: tenantId ?? 1,
      action: actionMap[parsed.data.status] ?? "booking.status_changed",
      entityType: "booking", entityId: booking.id,
      entityLabel: `Booking #${booking.id}${room ? ` — ${room.name}` : ""}`,
      details: `${before.b.status} → ${parsed.data.status}`,
    });
  }
  invalidateBookingCaches(room?.propertyId);
  res.json(formatBooking(booking, room));
});

router.delete("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(bookingsTable.id, id)];
  if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
  const [booking] = await db.select().from(bookingsTable).where(and(...conds));
  await db.delete(bookingsTable).where(and(...conds));
  if (booking?.status === "checked-in" && booking.roomId) {
    await db.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, booking.roomId));
  }
  invalidateBookingCaches(
    booking?.roomId
      ? (await db.select({ pId: roomsTable.propertyId })
          .from(roomsTable)
          .where(eq(roomsTable.id, booking.roomId))
          .then(([r]) => r?.pId ?? null)
          .catch(() => null))
      : null,
  );
  res.status(204).end();
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(bookingsTable.id, id)];
  if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
  const [booking] = await db.update(bookingsTable).set({ status: "cancelled" }).where(and(...conds)).returning();
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  await db.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, booking.roomId));
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  const actor = actorFromRequest(req);
  logActivity({
    ...actor, tenantId: tenantId ?? 1,
    action: "booking.cancelled", entityType: "booking", entityId: booking.id,
    entityLabel: `Booking #${booking.id}${room ? ` — ${room.name}` : ""}`,
    details: `Guest: ${booking.guestName ?? "—"}`,
  });
  invalidateBookingCaches(room?.propertyId);
  res.json(formatBooking(booking, room));
});

export default router;
