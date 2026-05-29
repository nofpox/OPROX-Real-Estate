import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fieldUsersTable = pgTable("field_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
  propertyId: integer("property_id"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFieldUserSchema = createInsertSchema(fieldUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateFieldUserSchema = insertFieldUserSchema.partial();
export type InsertFieldUser = z.infer<typeof insertFieldUserSchema>;
export type UpdateFieldUser = z.infer<typeof updateFieldUserSchema>;
export type FieldUser = typeof fieldUsersTable.$inferSelect;
