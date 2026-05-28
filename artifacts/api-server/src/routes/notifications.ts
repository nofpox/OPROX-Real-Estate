import { Router } from "express";
import {
  db,
  notificationsTable,
  bookingsTable,
  workOrdersTable,
  propertiesTable,
  roomsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return { ...n, createdAt: n.createdAt.toISOString() };
}

router.get("/notifications", async (req, res) => {
  const { unreadOnly } = req.query as { unreadOnly?: string };
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(unreadOnly === "true" ? eq(notificationsTable.isRead, false) : undefined)
    .orderBy(sql`${notificationsTable.createdAt} desc`)
    .limit(50);
  res.json(rows.map(formatNotification));
});

router.post("/notifications/generate", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  let generated = 0;

  // Check-ins today
  const checkIns = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(sql`${bookingsTable.checkIn} = ${today} AND ${bookingsTable.status} = 'confirmed'`);

  for (const { booking, room } of checkIns) {
    // Avoid duplicate notifications for same booking today
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        sql`${notificationsTable.relatedId} = ${booking.id}
          AND ${notificationsTable.relatedType} = 'booking-checkin'
          AND date_trunc('day', ${notificationsTable.createdAt}) = date_trunc('day', now())`
      );
    if (!existing) {
      await db.insert(notificationsTable).values({
        type: "check-in",
        title: "Check-in Today",
        message: `${booking.guestName} is checking into ${room?.name ?? `room ${booking.roomId}`} today.`,
        isRead: false,
        relatedId: booking.id,
        relatedType: "booking-checkin",
      });
      generated++;
    }
  }

  // Check-outs today
  const checkOuts = await db
    .select({ booking: bookingsTable, room: roomsTable })
    .from(bookingsTable)
    .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
    .where(sql`${bookingsTable.checkOut} = ${today} AND ${bookingsTable.status} = 'checked-in'`);

  for (const { booking, room } of checkOuts) {
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        sql`${notificationsTable.relatedId} = ${booking.id}
          AND ${notificationsTable.relatedType} = 'booking-checkout'
          AND date_trunc('day', ${notificationsTable.createdAt}) = date_trunc('day', now())`
      );
    if (!existing) {
      await db.insert(notificationsTable).values({
        type: "check-out",
        title: "Check-out Today",
        message: `${booking.guestName} is checking out of ${room?.name ?? `room ${booking.roomId}`} today.`,
        isRead: false,
        relatedId: booking.id,
        relatedType: "booking-checkout",
      });
      generated++;
    }
  }

  // Urgent and overdue maintenance
  const urgentOrders = await db
    .select({ wo: workOrdersTable, property: propertiesTable, room: roomsTable })
    .from(workOrdersTable)
    .leftJoin(propertiesTable, eq(workOrdersTable.propertyId, propertiesTable.id))
    .leftJoin(roomsTable, eq(workOrdersTable.unitId, roomsTable.id))
    .where(
      sql`(${workOrdersTable.priority} = 'urgent' OR (${workOrdersTable.dueDate} < ${today} AND ${workOrdersTable.dueDate} IS NOT NULL))
        AND ${workOrdersTable.status} NOT IN ('completed')`
    );

  for (const { wo, property, room } of urgentOrders) {
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        sql`${notificationsTable.relatedId} = ${wo.id}
          AND ${notificationsTable.relatedType} = 'work-order-alert'
          AND date_trunc('day', ${notificationsTable.createdAt}) = date_trunc('day', now())`
      );
    if (!existing) {
      const isOverdue = wo.dueDate && wo.dueDate < today;
      await db.insert(notificationsTable).values({
        type: "maintenance-alert",
        title: isOverdue ? "Overdue Work Order" : "Urgent Maintenance",
        message: `${wo.title}${property ? ` — ${property.name}` : ""}${room ? ` (${room.name})` : ""}${isOverdue ? " is overdue." : " requires immediate attention."}`,
        isRead: false,
        relatedId: wo.id,
        relatedType: "work-order-alert",
      });
      generated++;
    }
  }

  res.json({ generated, message: `${generated} notification(s) generated` });
});

router.patch("/notifications/:id/read", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [n] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, id))
    .returning();
  if (!n) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(formatNotification(n));
});

router.patch("/notifications/read-all", async (req, res) => {
  await db.update(notificationsTable).set({ isRead: true });
  res.json({ ok: true });
});

export default router;
