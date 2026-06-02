import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyCategoriesTable = pgTable("property_categories", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  slug:      text("slug").notNull(),
  labelEn:   text("label_en").notNull(),
  labelAr:   text("label_ar"),
  icon:      text("icon").notNull().default("building-2"),
  color:     text("color").notNull().default("blue"),
  isActive:  boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertyCategorySchema = createInsertSchema(propertyCategoriesTable).omit({ id: true, createdAt: true });
export type PropertyCategory = typeof propertyCategoriesTable.$inferSelect;
export type InsertPropertyCategory = z.infer<typeof insertPropertyCategorySchema>;
