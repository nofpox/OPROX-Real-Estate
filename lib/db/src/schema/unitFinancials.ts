import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitFinancialsTable = pgTable("unit_financials", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  roomId:    integer("room_id").notNull().unique(),
  status:    text("status").notNull().default("available"),
  dueDate:   text("due_date"),
  amountDue: numeric("amount_due", { precision: 10, scale: 2 }),
  checkIn:   text("check_in"),
  checkOut:  text("check_out"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitFinancialSchema = createInsertSchema(unitFinancialsTable).omit({ id: true, createdAt: true });
export const updateUnitFinancialSchema = insertUnitFinancialSchema.partial();
export type InsertUnitFinancial = z.infer<typeof insertUnitFinancialSchema>;
export type UpdateUnitFinancial = z.infer<typeof updateUnitFinancialSchema>;
export type UnitFinancialRow = typeof unitFinancialsTable.$inferSelect;
