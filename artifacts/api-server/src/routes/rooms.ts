import { Router } from "express";
import { db, roomsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertRoomSchema, updateRoomSchema } from "@workspace/db";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function fmt(r: typeof roomsTable.$inferSelect) {
  return { ...r, pricePerNight: Number(r.pricePerNight), createdAt: r.createdAt.toISOString() };
}

router.get("/rooms", async (req, res) => {
  const tenantId = tid(req);
  const rooms = await db
    .select()
    .from(roomsTable)
    .where(tenantId !== null ? eq(roomsTable.tenantId, tenantId) : undefined)
    .orderBy(roomsTable.name);
  res.json(rooms.map(fmt));
});

router.post("/rooms", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const parsed = insertRoomSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [room] = await db.insert(roomsTable).values(parsed.data).returning();
  res.status(201).json(fmt(room));
});

router.get("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(roomsTable.id, id)];
  if (tenantId !== null) conds.push(eq(roomsTable.tenantId, tenantId));
  const [room] = await db.select().from(roomsTable).where(and(...conds));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json(fmt(room));
});

router.patch("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(roomsTable.id, id)];
  if (tenantId !== null) conds.push(eq(roomsTable.tenantId, tenantId));
  const [room] = await db.update(roomsTable).set(parsed.data).where(and(...conds)).returning();
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json(fmt(room));
});

router.delete("/rooms/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(roomsTable.id, id)];
  if (tenantId !== null) conds.push(eq(roomsTable.tenantId, tenantId));
  await db.delete(roomsTable).where(and(...conds));
  res.status(204).end();
});

export default router;
