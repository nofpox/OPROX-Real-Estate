import { pgTable, serial, text, integer, date, timestamp, index } from "drizzle-orm/pg-core";
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
  // Report escalation flow: none → submitted → rejected | escalated → approved
  reportStatus:       text("report_status").notNull().default("none"),
  submittedAt:        timestamp("submitted_at"),
  submittedByUserId:  integer("submitted_by_user_id"),
  rejectedAt:         timestamp("rejected_at"),
  rejectedByUserId:   integer("rejected_by_user_id"),
  rejectionNotes:     text("rejection_notes"),
  escalatedAt:        timestamp("escalated_at"),
  escalatedByUserId:  integer("escalated_by_user_id"),
  approvedAt:         timestamp("approved_at"),
  approvedByUserId:   integer("approved_by_user_id"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  // ── Performance indexes for multi-tenant queries at scale ──────────────────
  // Primary filter: every query scopes to tenant + status
  index("tasks_tenant_status_idx").on(t.tenantId, t.status),
  // Worker inbox: worker fetches their own tasks
  index("tasks_tenant_assignee_idx").on(t.tenantId, t.assignedToId),
  // Supervisor view: supervisor fetches their team's tasks
  index("tasks_tenant_supervisor_idx").on(t.tenantId, t.supervisorId),
  // Property filter: dashboard filters tasks by property
  index("tasks_tenant_property_idx").on(t.tenantId, t.propertyId),
  // Report review queue: supervisors/managers fetch submitted reports
  index("tasks_tenant_report_status_idx").on(t.tenantId, t.reportStatus),
  // Due-date ordering: the ORDER BY clause uses this
  index("tasks_due_date_idx").on(t.dueDate),
]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export const updateTaskSchema = insertTaskSchema.partial();
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
