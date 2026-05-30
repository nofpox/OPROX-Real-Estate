import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supportTicketsTable = pgTable("support_tickets", {
  id:                 serial("id").primaryKey(),
  tenantId:           integer("tenant_id").notNull().default(1),
  category:           text("category").notNull().default("issue"),
  title:              text("title").notNull(),
  description:        text("description").notNull(),
  status:             text("status").notNull().default("open"),
  submittedByUserId:  integer("submitted_by_user_id"),
  submittedByName:    text("submitted_by_name"),
  submittedByRole:    text("submitted_by_role"),
  adminNotes:         text("admin_notes"),
  resolvedByUserId:   integer("resolved_by_user_id"),
  resolvedAt:         timestamp("resolved_at"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateSupportTicketSchema = insertSupportTicketSchema.partial();
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type UpdateSupportTicket = z.infer<typeof updateSupportTicketSchema>;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
