import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const taskCommentsTable = pgTable("task_comments", {
  id:         serial("id").primaryKey(),
  taskId:     integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  body:       text("body").notNull(),
  imageUrl:   text("image_url"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskCommentSchema = createInsertSchema(taskCommentsTable).omit({ id: true, createdAt: true });
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskCommentsTable.$inferSelect;
