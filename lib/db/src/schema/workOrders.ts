import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workOrdersTable = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  unitId: integer("unit_id"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({ id: true, createdAt: true });
export const updateWorkOrderSchema = insertWorkOrderSchema.partial();
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type UpdateWorkOrder = z.infer<typeof updateWorkOrderSchema>;
export type WorkOrder = typeof workOrdersTable.$inferSelect;
