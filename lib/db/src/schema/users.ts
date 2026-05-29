import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod/v4";

  export const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("staff"),
    permissions: text("permissions").notNull().default("[]"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
  export const updateUserSchema = insertUserSchema.partial();
  export type InsertUser = z.infer<typeof insertUserSchema>;
  export type UpdateUser = z.infer<typeof updateUserSchema>;
  export type User = typeof usersTable.$inferSelect;
  