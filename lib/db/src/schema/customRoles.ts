import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customRolesTable = pgTable("custom_roles", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id"),
  name:        text("name").notNull(),
  description: text("description").notNull().default(""),
  color:       text("color").notNull().default("#6366f1"),
  permissions: text("permissions").notNull().default("[]"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomRoleSchema = createInsertSchema(customRolesTable).omit({ id: true, createdAt: true });
export const updateCustomRoleSchema = insertCustomRoleSchema.partial();
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;
export type UpdateCustomRole = z.infer<typeof updateCustomRoleSchema>;
export type CustomRole = typeof customRolesTable.$inferSelect;
