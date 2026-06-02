import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const archivingLogsTable = pgTable("archiving_logs", {
  id:              serial("id").primaryKey(),
  tenantId:        integer("tenant_id").notNull().default(1),
  runAt:           timestamp("run_at").defaultNow().notNull(),
  triggeredBy:     text("triggered_by").notNull().default("system"),
  status:          text("status").notNull().default("completed"),
  datasets:        text("datasets").array(),
  recordsArchived: integer("records_archived").notNull().default(0),
  archiveKeys:     text("archive_keys").array(),
  notes:           text("notes"),
  snoozedUntil:    timestamp("snoozed_until"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export const insertArchivingLogSchema = createInsertSchema(archivingLogsTable).omit({ id: true, createdAt: true });
export type InsertArchivingLog = z.infer<typeof insertArchivingLogSchema>;
export type ArchivingLogRow = typeof archivingLogsTable.$inferSelect;
