import { Router, type IRouter } from "express";
import { eq, and, lte } from "drizzle-orm";
import { db, invoicesTable } from "@workspace/db";
import {
  ListInvoicesResponse, GetInvoiceResponse, CreateInvoiceBody,
  UpdateInvoiceBody, GetInvoiceParams, UpdateInvoiceParams, DeleteInvoiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/invoices", async (req, res): Promise<void> => {
  const tenantId = (req as any).tenantId ?? 1;
  const { propertyId, contractId, status } = req.query as Record<string, string>;

  const conditions = [eq(invoicesTable.tenantId, tenantId)];
  if (propertyId) conditions.push(eq(invoicesTable.propertyId, parseInt(propertyId)));
  if (contractId) conditions.push(eq(invoicesTable.contractId, parseInt(contractId)));
  if (status) conditions.push(eq(invoicesTable.status, status));

  const rows = await db.select().from(invoicesTable).where(and(...conditions)).orderBy(invoicesTable.createdAt);
  res.json(ListInvoicesResponse.parse(rows));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.insert(invoicesTable).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json(GetInvoiceResponse.parse(row));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.tenantId, tenantId)));
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(row));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.update(invoicesTable).set(parsed.data).where(and(eq(invoicesTable.id, id), eq(invoicesTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(row));
});

router.patch("/invoices/:id/pay", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.update(invoicesTable)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.tenantId, tenantId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(row));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const tenantId = (req as any).tenantId ?? 1;
  const [row] = await db.delete(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.tenantId, tenantId))).returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.sendStatus(204);
});

export default router;
