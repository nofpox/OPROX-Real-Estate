import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod/v4";

  export const guestRequestsTable = pgTable("guest_requests", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    facilityName: text("facility_name"),
    scheduledAt: text("scheduled_at"),
    visitorName: text("visitor_name"),
    visitorPhone: text("visitor_phone"),
    status: text("status").notNull().default("new"),
    refCode: text("ref_code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertGuestRequestSchema = createInsertSchema(guestRequestsTable).omit({ id: true, createdAt: true });
  export const updateGuestRequestSchema = insertGuestRequestSchema.partial();
  export type InsertGuestRequest = z.infer<typeof insertGuestRequestSchema>;
  export type UpdateGuestRequest = z.infer<typeof updateGuestRequestSchema>;
  export type GuestRequestRow = typeof guestRequestsTable.$inferSelect;
  