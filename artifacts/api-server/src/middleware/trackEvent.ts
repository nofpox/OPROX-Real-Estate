import type { Request } from "express";
import { db, analyticsTable } from "@workspace/db";

/**
 * trackEvent — equivalent of the Supabase-based trackEvent,
 * rewritten for the project's Drizzle + PostgreSQL stack.
 *
 * Usage inside any route handler:
 *   void trackEvent(req, "property_view");
 */
export async function trackEvent(req: Request, eventName: string): Promise<void> {
  const session = (req as unknown as Record<string, unknown>).sessionUser as
    | { id?: string; buildingId?: string }
    | undefined;

  await db.insert(analyticsTable).values({
    eventName,
    adminId:    session?.id         ?? null,
    buildingId: session?.buildingId ?? null,
  }).catch(() => { /* analytics failures must never crash the request */ });
}
