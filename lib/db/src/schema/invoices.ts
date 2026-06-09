import { pgTable, serial, text, numeric, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id:            serial("id").primaryKey(),
  tenantId:      integer("tenant_id").notNull().default(1),
  contractId:    integer("contract_id"),
  propertyId:    integer("property_id").notNull(),
  roomId:        integer("room_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  tenantName:    text("tenant_name").notNull(),
  amount:        numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate:       date("due_date", { mode: "string" }).notNull(),
  issuedDate:    date("issued_date", { mode: "string" }).notNull(),
  status:        text("status").notNull().default("pending"),
  notes:         text("notes"),
  paidAt:        timestamp("paid_at"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export const updateInvoiceSchema = insertInvoiceSchema.partial();
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
