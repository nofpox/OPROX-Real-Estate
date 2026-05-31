import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestsTable = pgTable("guests", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  phone:     text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("guests_tenant_email_uniq").on(t.tenantId, t.email),
]);

export const insertGuestSchema = createInsertSchema(guestsTable).omit({ id: true, createdAt: true });
export const updateGuestSchema = insertGuestSchema.partial();
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type UpdateGuest = z.infer<typeof updateGuestSchema>;
export type Guest = typeof guestsTable.$inferSelect;
