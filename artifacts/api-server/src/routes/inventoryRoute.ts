import { Router, type IRouter } from "express";
import { eq, and, lte } from "drizzle-orm";
import { db, inventoryItemsTable } from "@workspace/db";
import {
  ListInventoryResponse, GetInventoryItemResponse,
  CreateInventoryItemBody, UpdateInventoryItemBody,
  AdjustInventoryQuantityBody,
  GetInventoryItemParams, UpdateInventoryItemParams, DeleteInventoryItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory", async (req, res): Promise<void> => {
  const tenantId = (req as any).tenantId ?? 1;
  const { category, lowStock } = req.query as Record<string, string>;

  const conditions = [eq(inventoryItemsTable.tenantId, tenantId)];
  if (category) conditions.push(eq(inventoryItemsTable.category, category));

  let rows = await db.select().from(inventoryItemsTable).where(and(...conditions)).orderBy(inventoryItemsTable.name);

  if (lowStock === "true") {
    rows = rows.filter(r => parseFloat(r.quantity) <= parseFloat(r.minQuantity));
  }

  res.json(ListInventoryResponse.parse(rows));
});

router.post("/inventory", async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.insert(inventoryItemsTable).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(GetInventoryItemResponse.parse(row));
});

router.get("/inventory/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.select().from(inventoryItemsTable).where(and(eq(inventoryItemsTable.id, id), eq(inventoryItemsTable.tenantId, tenantId)));
  if (!row) { res.status(404).json({ error: "Item not found" }); return; }
  res.json(GetInventoryItemResponse.parse(row));
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.update(inventoryItemsTable).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(inventoryItemsTable.id, id), eq(inventoryItemsTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Item not found" }); return; }
  res.json(GetInventoryItemResponse.parse(row));
});

router.patch("/inventory/:id/adjust", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = AdjustInventoryQuantityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [current] = await db.select().from(inventoryItemsTable).where(and(eq(inventoryItemsTable.id, id), eq(inventoryItemsTable.tenantId, tenantId)));
  if (!current) { res.status(404).json({ error: "Item not found" }); return; }
  const newQty = Math.max(0, parseFloat(current.quantity) + parsed.data.delta);
  const [row] = await db.update(inventoryItemsTable)
    .set({ quantity: newQty.toString(), updatedAt: new Date() })
    .where(eq(inventoryItemsTable.id, id))
    .returning();
  res.json(GetInventoryItemResponse.parse(row));
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.delete(inventoryItemsTable).where(and(eq(inventoryItemsTable.id, id), eq(inventoryItemsTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Item not found" }); return; }
  res.sendStatus(204);
});

export default router;
