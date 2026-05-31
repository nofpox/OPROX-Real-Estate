import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffTable = pgTable("staff", {
  id:           serial("id").primaryKey(),
  tenantId:     integer("tenant_id").notNull().default(1),
  name:         text("name").notNull(),
  role:         text("role").notNull(),
  systemRole:   text("system_role").notNull().default("supervisor"),
  email:        text("email").notNull(),
  phone:        text("phone"),
  propertyId:   integer("property_id"),
  status:       text("status").notNull().default("active"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ id: true, createdAt: true });
export const updateStaffSchema = insertStaffSchema.partial();
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type UpdateStaff = z.infer<typeof updateStaffSchema>;
export type Staff = typeof staffTable.$inferSelect;
