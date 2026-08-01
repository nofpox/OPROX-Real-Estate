// ─────────────────────────────────────────────────────────────────────────────
// Admin configuration — loaded from environment variables.
//
// Set the following in your Replit Secrets / deployment environment:
//   EXPO_PUBLIC_ADMIN_PHONES  — comma-separated admin phone numbers
//   EXPO_PUBLIC_ADMIN_PIN     — master override PIN
//
// IMPORTANT: Client-side admin gating is a UX convenience layer only.
// All privileged operations must be enforced server-side independently.
// ─────────────────────────────────────────────────────────────────────────────
export const ADMIN_PHONES: string[] = (
  process.env.EXPO_PUBLIC_ADMIN_PHONES ?? ""
)
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

export const ADMIN_MASTER_PIN: string =
  process.env.EXPO_PUBLIC_ADMIN_PIN ?? "";
