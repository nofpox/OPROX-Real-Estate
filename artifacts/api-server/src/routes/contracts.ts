import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contractsTable } from "@workspace/db";
import {
  ListContractsResponse, GetContractResponse, CreateContractBody,
  UpdateContractBody, DeleteContractParams, GetContractParams, UpdateContractParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contracts", async (req, res): Promise<void> => {
  const tenantId = (req as any).tenantId ?? 1;
  const { propertyId, status } = req.query as Record<string, string>;

  const conditions = [eq(contractsTable.tenantId, tenantId)];
  if (propertyId) conditions.push(eq(contractsTable.propertyId, parseInt(propertyId)));
  if (status) conditions.push(eq(contractsTable.status, status));

  const rows = await db.select().from(contractsTable).where(and(...conditions)).orderBy(contractsTable.createdAt);
  res.json(ListContractsResponse.parse(rows));
});

router.post("/contracts", async (req, res): Promise<void> => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.insert(contractsTable).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(GetContractResponse.parse(row));
});

router.get("/contracts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.tenantId, tenantId)));
  if (!row) { res.status(404).json({ error: "Contract not found" }); return; }
  res.json(GetContractResponse.parse(row));
});

router.patch("/contracts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.update(contractsTable).set(parsed.data).where(and(eq(contractsTable.id, id), eq(contractsTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Contract not found" }); return; }
  res.json(GetContractResponse.parse(row));
});

router.delete("/contracts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.delete(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Contract not found" }); return; }
  res.sendStatus(204);
});

export default router;
