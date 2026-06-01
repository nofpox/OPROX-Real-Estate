/**
 * autoNotify — fire-and-forget helper that creates a notification record
 * immediately when a critical mutation occurs (booking, work order, etc.).
 *
 * Unlike the daily-scan at POST /notifications/generate, these are triggered
 * inline on the mutation so staff see the bell badge in real time.
 *
 * Design rules:
 *  - Never throws — wrapped in try/catch so a notification failure can't
 *    break the parent request.
 *  - userId = null → broadcast to all users in the tenant.
 *  - Callers pass a notifKey so the dashboard can render i18n titles.
 */

import { db, notificationsTable } from "@workspace/db";

export interface AutoNotifyParams {
  tenantId:      number;
  type:          string;
  title:         string;
  message:       string;
  notifKey?:     string;
  messageParams?: Record<string, string | number>;
  relatedId?:    number;
  relatedType?:  string;
  /** Target a specific user; omit (or pass null) to broadcast to all tenant users. */
  userId?:       number | null;
}

/**
 * Insert a notification row asynchronously. Never blocks the caller.
 * Returns void — callers should not await this unless they need the result.
 */
export function autoNotify(params: AutoNotifyParams): void {
  db.insert(notificationsTable).values({
    tenantId:     params.tenantId,
    userId:       params.userId ?? null,
    type:         params.type,
    title:        params.title,
    message:      params.message,
    isRead:       false,
    relatedId:    params.relatedId    ?? null,
    relatedType:  params.relatedType  ?? null,
    notifKey:     params.notifKey     ?? null,
    messageParams: params.messageParams
      ? JSON.stringify(params.messageParams)
      : null,
  }).catch(() => { /* non-critical */ });
}

// ── Pre-built factories for the four critical system events ───────────────────

/** Booking confirmed / created */
export function notifyNewBooking(opts: {
  tenantId: number;
  bookingId: number;
  guestName: string;
  roomName:  string;
  checkIn:   string;
  checkOut:  string;
}): void {
  autoNotify({
    tenantId:    opts.tenantId,
    type:        "new_booking",
    title:       "New Booking Received",
    message:     `${opts.guestName} booked ${opts.roomName} (${opts.checkIn} → ${opts.checkOut}).`,
    notifKey:    "newBooking",
    messageParams: {
      guestName: opts.guestName,
      roomName:  opts.roomName,
      checkIn:   opts.checkIn,
      checkOut:  opts.checkOut,
    },
    relatedId:   opts.bookingId,
    relatedType: "booking",
  });
}

/** Booking cancelled */
export function notifyBookingCancelled(opts: {
  tenantId:  number;
  bookingId: number;
  guestName: string;
  roomName:  string;
}): void {
  autoNotify({
    tenantId:    opts.tenantId,
    type:        "booking_cancelled",
    title:       "Booking Cancelled",
    message:     `Booking for ${opts.guestName} (${opts.roomName}) has been cancelled.`,
    notifKey:    "bookingCancelled",
    messageParams: {
      guestName: opts.guestName,
      roomName:  opts.roomName,
    },
    relatedId:   opts.bookingId,
    relatedType: "booking",
  });
}

/** New work order / maintenance request */
export function notifyNewWorkOrder(opts: {
  tenantId:     number;
  workOrderId:  number;
  title:        string;
  propertyName: string;
  priority:     string;
}): void {
  autoNotify({
    tenantId:    opts.tenantId,
    type:        "new_maintenance",
    title:       "New Maintenance Request",
    message:     `[${opts.priority.toUpperCase()}] ${opts.title} at ${opts.propertyName}.`,
    notifKey:    "newWorkOrder",
    messageParams: {
      woTitle:      opts.title,
      propertyName: opts.propertyName,
      priority:     opts.priority,
    },
    relatedId:   opts.workOrderId,
    relatedType: "work_order",
  });
}

/** Work order completed */
export function notifyWorkOrderCompleted(opts: {
  tenantId:     number;
  workOrderId:  number;
  title:        string;
  propertyName: string;
}): void {
  autoNotify({
    tenantId:    opts.tenantId,
    type:        "maintenance_completed",
    title:       "Maintenance Completed",
    message:     `Work order "${opts.title}" at ${opts.propertyName} has been completed.`,
    notifKey:    "workOrderCompleted",
    messageParams: {
      woTitle:      opts.title,
      propertyName: opts.propertyName,
    },
    relatedId:   opts.workOrderId,
    relatedType: "work_order",
  });
}
