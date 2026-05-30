import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  slug:        text("slug").notNull().unique(),
  plan:        text("plan").notNull().default("starter"),
  status:      text("status").notNull().default("active"),
  contactName: text("contact_name"),
  contactEmail:text("contact_email"),
  contactPhone:text("contact_phone"),
  logoText:    text("logo_text"),
  logoSub:     text("logo_sub"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
  isActive:    boolean("is_active").notNull().default(true),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateTenantSchema = insertTenantSchema.partial();
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
