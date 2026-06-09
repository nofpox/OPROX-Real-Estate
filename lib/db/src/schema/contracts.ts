import { pgTable, serial, text, numeric, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id:             serial("id").primaryKey(),
  tenantId:       integer("tenant_id").notNull().default(1),
  propertyId:     integer("property_id").notNull(),
  roomId:         integer("room_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  tenantName:     text("tenant_name").notNull(),
  tenantPhone:    text("tenant_phone"),
  tenantEmail:    text("tenant_email"),
  startDate:      date("start_date", { mode: "string" }).notNull(),
  endDate:        date("end_date", { mode: "string" }).notNull(),
  monthlyRent:    numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  depositAmount:  numeric("deposit_amount", { precision: 10, scale: 2 }),
  status:         text("status").notNull().default("active"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true });
export const updateContractSchema = insertContractSchema.partial();
export type InsertContract = z.infer<typeof insertContractSchema>;
export type UpdateContract = z.infer<typeof updateContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
