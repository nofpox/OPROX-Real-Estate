import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

  export const activityLogsTable = pgTable("activity_logs", {
    id: serial("id").primaryKey(),
    username: text("username"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export type ActivityLogRow = typeof activityLogsTable.$inferSelect;
  