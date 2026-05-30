import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable("activity_logs", {
  id:              serial("id").primaryKey(),
  tenantId:        integer("tenant_id").notNull().default(1),
  actorId:         integer("actor_id"),
  actorName:       text("actor_name"),
  actorRole:       text("actor_role"),
  action:          text("action").notNull(),
  entityType:      text("entity_type").notNull(),
  entityId:        integer("entity_id"),
  entityLabel:     text("entity_label"),
  propertyId:      integer("property_id"),
  propertyName:    text("property_name"),
  details:         text("details"),
  assignedByName:  text("assigned_by_name"),
  completedByName: text("completed_by_name"),
  proofPhotoUrl:   text("proof_photo_url"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLogRow = typeof activityLogsTable.$inferSelect;
