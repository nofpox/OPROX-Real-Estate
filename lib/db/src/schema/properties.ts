import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id:       serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1),
  name:     text("name").notNull(),
  type:     text("type").notNull().default("hotel"),
  address:  text("address").notNull(),
  city:     text("city").notNull(),
  country:  text("country").notNull().default("USA"),
  description: text("description"),
  status:   text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true });
export const updatePropertySchema = insertPropertySchema.partial();
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type UpdateProperty = z.infer<typeof updatePropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
