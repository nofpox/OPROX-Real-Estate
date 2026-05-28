import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("available"),
  description: text("description"),
  capacity: integer("capacity").default(2),
  amenities: text("amenities"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true });
export const updateRoomSchema = insertRoomSchema.partial();
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type UpdateRoom = z.infer<typeof updateRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
