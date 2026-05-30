import { pgTable, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Persistent session store — replaces the in-memory Map so sessions survive
 * restarts and are shared across all Node.js cluster workers / instances.
 *
 * Rows are expired by `expires_at`. A periodic cleanup job (scheduled in the
 * API server startup) deletes stale rows to prevent unbounded table growth.
 */
export const userSessionsTable = pgTable("user_sessions", {
  sessionId: text("session_id").primaryKey(),
  userId:    integer("user_id").notNull(),
  tenantId:  integer("tenant_id"),
  userData:  jsonb("user_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (t) => [
  index("user_sessions_user_idx").on(t.userId),
  index("user_sessions_expires_idx").on(t.expiresAt),
  index("user_sessions_tenant_idx").on(t.tenantId),
]);
