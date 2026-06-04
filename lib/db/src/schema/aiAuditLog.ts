import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const aiAuditLogTable = pgTable("ai_audit_log", {
  id:            serial("id").primaryKey(),
  tenantId:      integer("tenant_id").notNull().default(1),
  actionQueueId: integer("action_queue_id"),
  event:         text("event").notNull(),
  actorType:     text("actor_type").notNull().default("ai"),
  actorId:       integer("actor_id"),
  actorName:     text("actor_name"),
  targetEntity:  text("target_entity"),
  targetId:      integer("target_id"),
  description:   text("description").notNull(),
  beforeState:   jsonb("before_state"),
  afterState:    jsonb("after_state"),
  metadata:      jsonb("metadata"),
  ipAddress:     text("ip_address"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export type AiAuditLogRow = typeof aiAuditLogTable.$inferSelect;
