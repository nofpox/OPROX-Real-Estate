import { pgTable, bigint, text, doublePrecision, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const poiPlacesTable = pgTable("poi_places", {
  osmId:     bigint("osm_id", { mode: "number" }).primaryKey(),
  type:      text("type").notNull(),
  nameAr:    text("name_ar"),
  nameEn:    text("name_en"),
  lat:       doublePrecision("lat").notNull(),
  lng:       doublePrecision("lng").notNull(),
  tags:      jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("poi_type_idx").on(t.type),
  index("poi_lat_lng_idx").on(t.lat, t.lng),
]);

export type PoiPlaceRow = typeof poiPlacesTable.$inferSelect;
