import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceCategoriesTable = pgTable("service_categories", {
  id:               serial("id").primaryKey(),
  tenantId:         integer("tenant_id").notNull().default(1),
  name:             text("name").notNull(),
  icon:             text("icon").notNull().default("wrench"),
  color:            text("color").notNull().default("amber"),
  propertyTypes:    text("property_types").notNull().default("all"),
  isActive:         boolean("is_active").notNull().default(true),
  sortOrder:        integer("sort_order").notNull().default(0),
  priority:         text("priority").notNull().default("medium"),
  requiresTimeSlot: boolean("requires_time_slot").notNull().default(false),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategoriesTable).omit({ id: true, createdAt: true });
export const updateServiceCategorySchema = insertServiceCategorySchema.partial();
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type UpdateServiceCategory = z.infer<typeof updateServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategoriesTable.$inferSelect;
