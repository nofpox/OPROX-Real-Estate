import { pgTable, serial, text, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull().default(1),
  guestName:   text("guest_name").notNull(),
  guestEmail:  text("guest_email").notNull(),
  guestPhone:  text("guest_phone"),
  roomId:      integer("room_id").notNull(),
  checkIn:     date("check_in").notNull(),
  checkOut:    date("check_out").notNull(),
  status:      text("status").notNull().default("confirmed"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes:       text("notes"),
  guestId:     integer("guest_id"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export const updateBookingSchema = insertBookingSchema.partial();
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type UpdateBooking = z.infer<typeof updateBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
