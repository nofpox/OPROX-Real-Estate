import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  key:       text("key").notNull(),
  value:     text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("settings_tenant_key_uniq").on(t.tenantId, t.key),
]);

export type Setting = typeof settingsTable.$inferSelect;
