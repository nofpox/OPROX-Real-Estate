import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rkzUsersTable = pgTable("rkz_users", {
  id:         serial("id").primaryKey(),
  phone:      text("phone").notNull().unique(),
  name:       text("name"),
  email:      text("email"),
  authorized: boolean("authorized").notNull().default(false),
  authToken:  text("auth_token"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export const insertRkzUserSchema = createInsertSchema(rkzUsersTable).omit({ id: true, createdAt: true });
export const updateRkzUserSchema = insertRkzUserSchema.partial();
export type InsertRkzUser = z.infer<typeof insertRkzUserSchema>;
export type RkzUser       = typeof rkzUsersTable.$inferSelect;
