import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Furnished apartments shown as pins on the RKZ explore map.
 * 'lng' is used instead of 'long' (SQL reserved word).
 */
export const apartmentsTable = pgTable("apartments", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  lat:          numeric("lat",  { precision: 10, scale: 7 }).notNull(),
  lng:          numeric("lng",  { precision: 10, scale: 7 }).notNull(),
  pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }),
  phone:        text("phone"),
  imageUrl:     text("image_url"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertApartmentSchema = createInsertSchema(apartmentsTable).omit({ id: true, createdAt: true });
export type InsertApartment = z.infer<typeof insertApartmentSchema>;
export type Apartment       = typeof apartmentsTable.$inferSelect;
