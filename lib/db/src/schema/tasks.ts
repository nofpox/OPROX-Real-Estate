import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  propertyId: integer("property_id"),
  unitId: integer("unit_id"),
  assignedToId: integer("assigned_to_id"),
  assignedByUserId: integer("assigned_by_user_id"),
  completedByUserId: integer("completed_by_user_id"),
  proofPhotoUrl: text("proof_photo_url"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export const updateTaskSchema = insertTaskSchema.partial();
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
