/**
 * trackEvent — client-side equivalent of the Supabase snippet.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/track-event";
 *   void trackEvent("property_view");
 *
 * Session context (admin_id / building_id) is resolved server-side
 * from the HTTP-only session cookie — no token handling needed here.
 */
export async function trackEvent(eventName: string): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ event_name: eventName }),
    });
  } catch {
    // analytics failures must never surface to the user
  }
}
