import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalPropertiesTable = pgTable("portal_properties", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull().default(1),
  name:        text("name").notNull(),
  type:        text("type").notNull().default("apartment"),
  address:     text("address").notNull(),
  city:        text("city").notNull(),
  country:     text("country").notNull().default("SA"),
  description: text("description"),
  status:      text("status").notNull().default("active"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const insertPortalPropertySchema = createInsertSchema(portalPropertiesTable).omit({ id: true, createdAt: true });
export const updatePortalPropertySchema = insertPortalPropertySchema.partial();
export type InsertPortalProperty = z.infer<typeof insertPortalPropertySchema>;
export type UpdatePortalProperty = z.infer<typeof updatePortalPropertySchema>;
export type PortalPropertyDb = typeof portalPropertiesTable.$inferSelect;

export const portalUnitsTable = pgTable("portal_units", {
  id:               serial("id").primaryKey(),
  tenantId:         integer("tenant_id").notNull().default(1),
  portalPropertyId: integer("portal_property_id").notNull().references(() => portalPropertiesTable.id, { onDelete: "cascade" }),
  unitNumber:       text("unit_number").notNull(),
  floor:            integer("floor"),
  type:             text("type").notNull().default("apartment"),
  area:             numeric("area", { precision: 10, scale: 2 }),
  bedroomCount:     integer("bedroom_count").default(0),
  bathroomCount:    integer("bathroom_count").default(1),
  status:           text("status").notNull().default("available"),
  monthlyRent:      numeric("monthly_rent", { precision: 12, scale: 2 }),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
});

export const insertPortalUnitSchema = createInsertSchema(portalUnitsTable).omit({ id: true, createdAt: true });
export const updatePortalUnitSchema = insertPortalUnitSchema.partial();
export type InsertPortalUnit = z.infer<typeof insertPortalUnitSchema>;
export type UpdatePortalUnit = z.infer<typeof updatePortalUnitSchema>;
export type PortalUnitDb = typeof portalUnitsTable.$inferSelect;
