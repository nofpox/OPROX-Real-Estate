import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const aiActionQueueTable = pgTable("ai_action_queue", {
  id:            serial("id").primaryKey(),
  tenantId:      integer("tenant_id").notNull().default(1),
  actionType:    text("action_type").notNull(),
  targetEntity:  text("target_entity").notNull(),
  targetId:      integer("target_id"),
  description:   text("description").notNull(),
  payload:       jsonb("payload"),
  proposedBy:    text("proposed_by").notNull().default("ai-engine"),
  status:        text("status").notNull().default("pending"),
  reviewedById:  integer("reviewed_by_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewNote:    text("review_note"),
  reviewedAt:    timestamp("reviewed_at"),
  executedAt:    timestamp("executed_at"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const insertAiActionQueueSchema = createInsertSchema(aiActionQueueTable);
export type AiActionQueueRow = typeof aiActionQueueTable.$inferSelect;
