import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id:                 serial("id").primaryKey(),
  tenantId:           integer("tenant_id").notNull().default(1),
  title:              text("title").notNull(),
  description:        text("description"),
  category:           text("category").notNull().default("general"),
  propertyId:         integer("property_id"),
  unitId:             integer("unit_id"),
  // Assignment chain: manager creates → assigns supervisor → supervisor assigns worker (assignedToId)
  supervisorId:       integer("supervisor_id"),
  assignedToId:       integer("assigned_to_id"),
  assignedByUserId:   integer("assigned_by_user_id"),
  completedByUserId:  integer("completed_by_user_id"),
  verifiedByUserId:   integer("verified_by_user_id"),
  // Photo evidence: before starting and after completing
  beforePhotoUrl:     text("before_photo_url"),
  afterPhotoUrl:      text("after_photo_url"),
  proofPhotoUrl:      text("proof_photo_url"),   // kept for backwards compat
  priority:           text("priority").notNull().default("medium"),
  // Status flow: pending → in-progress → completed → verified
  status:             text("status").notNull().default("pending"),
  dueDate:            date("due_date"),
  startedAt:          timestamp("started_at"),
  completedAt:        timestamp("completed_at"),
  verifiedAt:         timestamp("verified_at"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export const updateTaskSchema = insertTaskSchema.partial();
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
