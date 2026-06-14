import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const analyticsTable = pgTable("analytics", {
  id:         uuid("id").defaultRandom().primaryKey(),
  eventName:  text("event_name").notNull(),
  adminId:    uuid("admin_id"),
  buildingId: uuid("building_id"),
  createdAt:  timestamp("created_at").defaultNow(),
});

export type AnalyticsRow = typeof analyticsTable.$inferSelect;
