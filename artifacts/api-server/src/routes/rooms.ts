import { Router } from "express";
import { db, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { insertRoomSchema, updateRoomSchema } from "@workspace/db";

const router = Router();

router.get("/rooms", async (req, res) => {
  const rooms = await db.select().from(roomsTable).orderBy(roomsTable.name);
  const result = rooms.map((r) => ({
    ...r,
    pricePerNight: Number(r.pricePerNight),
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/rooms", async (req, res) => {
  const parsed = insertRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [room] = await db.insert(roomsTable).values(parsed.data).returning();
  res.status(201).json({
    ...room,
    pricePerNight: Number(room.pricePerNight),
    createdAt: room.createdAt.toISOString(),
  });
});

router.get("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json({
    ...room,
    pricePerNight: Number(room.pricePerNight),
    createdAt: room.createdAt.toISOString(),
  });
});

router.patch("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [room] = await db
    .update(roomsTable)
    .set(parsed.data)
    .where(eq(roomsTable.id, id))
    .returning();
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json({
    ...room,
    pricePerNight: Number(room.pricePerNight),
    createdAt: room.createdAt.toISOString(),
  });
});

router.delete("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(roomsTable).where(eq(roomsTable.id, id));
  res.status(204).end();
});

export default router;
