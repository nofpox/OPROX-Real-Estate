import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull().default(1),
  name:        text("name").notNull(),
  category:    text("category").notNull().default("general"),
  quantity:    numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  minQuantity: numeric("min_quantity", { precision: 10, scale: 2 }).notNull().default("5"),
  unit:        text("unit").notNull().default("piece"),
  location:    text("location"),
  description: text("description"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateInventoryItemSchema = insertInventoryItemSchema.partial();
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type UpdateInventoryItem = z.infer<typeof updateInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
