import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestFeedbackTable = pgTable("guest_feedback", {
  id:        serial("id").primaryKey(),
  tenantId:  integer("tenant_id").notNull().default(1),
  roomId:    integer("room_id").notNull(),
  rating:    text("rating").notNull(),
  comment:   text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuestFeedbackSchema = createInsertSchema(guestFeedbackTable).omit({ id: true, createdAt: true });
export type InsertGuestFeedback = z.infer<typeof insertGuestFeedbackSchema>;
export type GuestFeedbackRow = typeof guestFeedbackTable.$inferSelect;
