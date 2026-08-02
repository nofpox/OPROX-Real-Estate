import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id:                 serial("id").primaryKey(),
  tenantId:           integer("tenant_id").notNull().default(1),
  propertyId:         integer("property_id"),
  title:              text("title").notNull(),
  description:        text("description"),
  listingType:        text("listing_type").notNull().default("sale"),   // sale | rent
  propertyType:       text("property_type").notNull().default("apartment"), // apartment | villa | land | building | commercial | office | warehouse | farm | chalet | residential_compound | commercial_building
  price:              numeric("price", { precision: 12, scale: 2 }),
  pricePeriod:        text("price_period"),                              // monthly | yearly | daily | one_time
  currency:           text("currency").notNull().default("SAR"),
  areaSqm:            numeric("area_sqm", { precision: 10, scale: 2 }),
  bedrooms:           integer("bedrooms"),
  bathrooms:          integer("bathrooms"),
  livingRooms:        integer("living_rooms"),
  floor:              integer("floor"),
  propertyAge:        integer("property_age"),
  streetWidth:        integer("street_width"),
  facade:             text("facade"),                                     // north | south | east | west | north_east | north_west | south_east | south_west
  furnished:          text("furnished").default("none"),                 // none | semi | full
  amenities:          text("amenities").default("[]"),                    // JSON string array
  media:              text("media").default("[]"),                        // JSON string array of { url, type: "photo"|"video"|"floorplan"|"3d"|"360"|"vr", caption }
  address:            text("address"),
  city:               text("city"),
  district:           text("district"),
  lat:                numeric("lat", { precision: 10, scale: 7 }),
  lng:                numeric("lng", { precision: 10, scale: 7 }),
  status:             text("status").notNull().default("published"),      // draft | pending_review | published | paused | sold | rented | expired | rejected
  availability:       text("availability").notNull().default("available"),// available | reserved | sold | rented
  verificationStatus: text("verification_status").notNull().default("unverified"), // unverified | pending | verified
  featured:           boolean("featured").notNull().default(false),
  viewCount:          integer("view_count").notNull().default(0),
  sellerType:         text("seller_type").notNull().default("owner"),    // owner | agent | company
  sellerId:           integer("seller_id"),
  contactName:        text("contact_name"),
  contactEmail:       text("contact_email"),
  contactPhone:       text("contact_phone"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull(),
});

export const viewingRequestsTable = pgTable("viewing_requests", {
  id:            serial("id").primaryKey(),
  tenantId:      integer("tenant_id").notNull().default(1),
  listingId:     integer("listing_id").notNull(),
  userId:        integer("user_id"),
  name:          text("name").notNull(),
  email:         text("email").notNull(),
  phone:         text("phone").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  notes:         text("notes"),
  status:        text("status").notNull().default("pending"), // pending | confirmed | cancelled | completed
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const leadsTable = pgTable("leads", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  listingId: integer("listing_id").notNull(),
  userId:    integer("user_id"),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  phone:     text("phone"),
  message:   text("message"),
  source:    text("source").notNull().default("web"),  // web | app
  status:    text("status").notNull().default("new"),  // new | contacted | qualified | closed | lost
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const favoritesTable = pgTable("favorites", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  userId:    integer("user_id").notNull(),
  listingId: integer("listing_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedSearchesTable = pgTable("saved_searches", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull().default(1),
  userId:      integer("user_id").notNull(),
  name:        text("name").notNull(),
  criteria:    text("criteria").notNull().default("{}"), // JSON: {propertyType?,listingType?,city?,minPrice?,maxPrice?,bedrooms?}
  notifyEmail: boolean("notify_email").notNull().default(true),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const sellerProfilesTable = pgTable("seller_profiles", {
  id:                 serial("id").primaryKey(),
  tenantId:           integer("tenant_id").notNull().default(1),
  userId:             integer("user_id").notNull(),
  type:               text("type").notNull().default("owner"), // owner | agent | company
  displayName:        text("display_name").notNull(),
  companyName:        text("company_name"),
  licenseNumber:      text("license_number"),
  phone:              text("phone"),
  email:              text("email"),
  avatarUrl:          text("avatar_url"),
  bio:                text("bio"),
  verificationStatus: text("verification_status").notNull().default("unverified"), // unverified | pending | verified
  createdAt:          timestamp("created_at").defaultNow().notNull(),
});

export const listingReportsTable = pgTable("listing_reports", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  listingId: integer("listing_id").notNull(),
  userId:    integer("user_id"),
  reason:    text("reason").notNull(),
  details:   text("details"),
  status:    text("status").notNull().default("pending"), // pending | reviewed | dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListingSchema        = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export const updateListingSchema        = insertListingSchema.partial();
export const insertViewingRequestSchema  = createInsertSchema(viewingRequestsTable).omit({ id: true, createdAt: true });
export const insertLeadSchema            = createInsertSchema(leadsTable).omit({ id: true, createdAt: true });
export const insertInquirySchema        = createInsertSchema(listingInquiriesTable).omit({ id: true, createdAt: true });
export const insertFavoriteSchema       = createInsertSchema(favoritesTable).omit({ id: true, createdAt: true });
export const insertSavedSearchSchema    = createInsertSchema(savedSearchesTable).omit({ id: true, createdAt: true });
export const insertSellerProfileSchema  = createInsertSchema(sellerProfilesTable).omit({ id: true, createdAt: true });
export const insertListingReportSchema  = createInsertSchema(listingReportsTable).omit({ id: true, createdAt: true });

export type InsertListing               = z.infer<typeof insertListingSchema>;
export type Listing                     = typeof listingsTable.$inferSelect;
export type ViewingRequest              = typeof viewingRequestsTable.$inferSelect;
export type Lead                        = typeof leadsTable.$inferSelect;
export type ListingInquiry              = typeof listingInquiriesTable.$inferSelect;
export type Favorite                    = typeof favoritesTable.$inferSelect;
export type SavedSearch                 = typeof savedSearchesTable.$inferSelect;
export type SellerProfile               = typeof sellerProfilesTable.$inferSelect;
export type ListingReport               = typeof listingReportsTable.$inferSelect;

