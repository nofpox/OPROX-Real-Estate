import { Router } from "express";
  import { db, unitFinancialsTable, roomsTable, propertiesTable } from "@workspace/db";
  import { eq, sql } from "drizzle-orm";

  const router = Router();

  function fmtRow(fin: typeof unitFinancialsTable.$inferSelect, room?: typeof roomsTable.$inferSelect | null, property?: typeof propertiesTable.$inferSelect | null) {
    return {
      roomId: fin.roomId, unitName: room?.name ?? null, propertyName: property?.name ?? null,
      propertyType: property?.type ?? null, status: fin.status, dueDate: fin.dueDate,
      amountDue: fin.amountDue ? parseFloat(String(fin.amountDue)) : null,
      checkIn: fin.checkIn, checkOut: fin.checkOut,
      updatedAt: fin.updatedAt.toISOString(), createdAt: fin.createdAt.toISOString(),
    };
  }

  router.get("/unit-financials", async (_req, res) => {
    const rows = await db
      .select({ fin: unitFinancialsTable, room: roomsTable, property: propertiesTable })
      .from(unitFinancialsTable)
      .leftJoin(roomsTable, eq(unitFinancialsTable.roomId, roomsTable.id))
      .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
      .orderBy(unitFinancialsTable.roomId);
    res.json(rows.map(({ fin, room, property }) => fmtRow(fin, room, property)));
  });

  router.get("/unit-financials/:roomId", async (req, res) => {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) { res.status(400).json({ error: "Invalid roomId" }); return; }
      const [row] = await db
        .select({ fin: unitFinancialsTable, room: roomsTable, property: propertiesTable })
        .from(unitFinancialsTable)
        .leftJoin(roomsTable, eq(unitFinancialsTable.roomId, roomsTable.id))
        .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
        .where(eq(unitFinancialsTable.roomId, roomId));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      res.json(fmtRow(row.fin, row.room, row.property));
    });

    router.patch("/unit-financials/:roomId", async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) { res.status(400).json({ error: "Invalid roomId" }); return; }
    const { status, dueDate, amountDue, checkIn, checkOut } = req.body ?? {};
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) update.status = String(status);
    if (dueDate !== undefined) update.dueDate = dueDate ? String(dueDate) : null;
    if (amountDue !== undefined) update.amountDue = amountDue !== null ? String(amountDue) : null;
    if (checkIn !== undefined) update.checkIn = checkIn ? String(checkIn) : null;
    if (checkOut !== undefined) update.checkOut = checkOut ? String(checkOut) : null;
    const existing = await db.select({ id: unitFinancialsTable.id }).from(unitFinancialsTable).where(eq(unitFinancialsTable.roomId, roomId));
    if (existing.length > 0) {
      await db.update(unitFinancialsTable).set(update).where(eq(unitFinancialsTable.roomId, roomId));
    } else {
      await db.insert(unitFinancialsTable).values({ roomId, ...update } as any);
    }
    const [row] = await db
      .select({ fin: unitFinancialsTable, room: roomsTable, property: propertiesTable })
      .from(unitFinancialsTable)
      .leftJoin(roomsTable, eq(unitFinancialsTable.roomId, roomsTable.id))
      .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
      .where(eq(unitFinancialsTable.roomId, roomId));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmtRow(row.fin, row.room, row.property));
  });

  export default router;
  