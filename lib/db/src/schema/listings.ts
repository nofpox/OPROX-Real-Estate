import { pgTable, serial, text, integer, boolean, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id:           serial("id").primaryKey(),
  tenantId:     integer("tenant_id").notNull().default(1),
  propertyId:   integer("property_id"),
  title:        text("title").notNull(),
  description:  text("description"),
  listingType:  text("listing_type").notNull().default("sale"),   // sale | rent | operational
  propertyType: text("property_type").notNull().default("apartment"), // hotel | compound | apartment | commercial | villa | office
  price:        numeric("price", { precision: 12, scale: 2 }),
  currency:     text("currency").notNull().default("SAR"),
  areaSqm:      numeric("area_sqm", { precision: 10, scale: 2 }),
  bedrooms:     integer("bedrooms"),
  bathrooms:    integer("bathrooms"),
  floor:        integer("floor"),
  amenities:    text("amenities").default("[]"),    // JSON string array
  media:        text("media").default("[]"),        // JSON string array of { url, caption }
  address:      text("address"),
  city:         text("city"),
  district:     text("district"),
  lat:          numeric("lat", { precision: 10, scale: 7 }),
  lng:          numeric("lng", { precision: 10, scale: 7 }),
  status:       text("status").notNull().default("active"), // active | draft | sold | rented | suspended
  featured:     boolean("featured").notNull().default(false),
  viewCount:    integer("view_count").notNull().default(0),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const listingInquiriesTable = pgTable("listing_inquiries", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  listingId: integer("listing_id"),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  phone:     text("phone"),
  message:   text("message"),
  source:    text("source").notNull().default("web"),  // web | app
  status:    text("status").notNull().default("new"),  // new | contacted | closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListingSchema   = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export const updateListingSchema   = insertListingSchema.partial();
export const insertInquirySchema   = createInsertSchema(listingInquiriesTable).omit({ id: true, createdAt: true });
export type InsertListing          = z.infer<typeof insertListingSchema>;
export type Listing                = typeof listingsTable.$inferSelect;
export type ListingInquiry         = typeof listingInquiriesTable.$inferSelect;
