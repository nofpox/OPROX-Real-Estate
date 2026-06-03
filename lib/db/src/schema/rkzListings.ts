import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rkzListingsTable = pgTable("rkz_listings", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),       // FK → rkz_users.id
  type:        text("type").notNull(),              // villa | apartment | land | …
  price:       numeric("price", { precision: 14, scale: 2 }).notNull(),
  currency:    text("currency").notNull().default("SAR"),
  city:        text("city").notNull(),
  district:    text("district"),
  address:     text("address"),
  lat:         numeric("lat",  { precision: 10, scale: 7 }),
  lng:         numeric("lng",  { precision: 10, scale: 7 }),
  area:        numeric("area", { precision: 10, scale: 2 }),
  bedrooms:    integer("bedrooms"),
  bathrooms:   integer("bathrooms"),
  title:       text("title"),
  description: text("description"),
  photos:      text("photos").notNull().default("[]"),     // JSON string[]
  platforms:   text("platforms").notNull().default("[]"),  // JSON PlatformStatus[]
  status:      text("status").notNull().default("publishing"), // publishing | published | expired
  featured:    boolean("featured").notNull().default(false),
  viewCount:   integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const insertRkzListingSchema = createInsertSchema(rkzListingsTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export const updateRkzListingSchema = insertRkzListingSchema.partial();
export type InsertRkzListing = z.infer<typeof insertRkzListingSchema>;
export type RkzListing       = typeof rkzListingsTable.$inferSelect;
