import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull().default(1),
  /** Target user — null means the notification is broadcast to all users in the tenant. */
  userId:      integer("user_id"),
  type:        text("type").notNull(),
  title:       text("title").notNull(),
  message:     text("message").notNull(),
  isRead:       boolean("is_read").notNull().default(false),
  relatedId:    integer("related_id"),
  relatedType:  text("related_type"),
  /** i18n key base, e.g. "checkin". Frontend translates via t(`notif.${notifKey}.title/message`). */
  notifKey:     text("notif_key"),
  /** JSON-encoded interpolation params for notifKey, e.g. {"guestName":"John","roomName":"101"} */
  messageParams: text("message_params"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  // Tenant-wide unread fetch (broadcast rows where user_id IS NULL):
  // WHERE tenant_id = ? AND is_read = false ORDER BY created_at
  index("notifications_tenant_unread_idx").on(t.tenantId, t.isRead, t.createdAt),
  // Per-user bell query: WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?) AND is_read = false
  index("notifications_tenant_user_unread_idx").on(t.tenantId, t.userId, t.isRead, t.createdAt),
  // Tenant-wide broadcast fetch
  index("notifications_tenant_idx").on(t.tenantId),
]);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
