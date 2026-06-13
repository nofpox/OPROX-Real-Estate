// ─────────────────────────────────────────────────────────────────────────────
// Admin Phone Numbers
// Add the owner's Saudi phone number(s) exactly as the login API returns them.
// Example: "0501234567"
// Users whose phone matches any entry here get the full Admin Dashboard.
// ─────────────────────────────────────────────────────────────────────────────
export const ADMIN_PHONES: string[] = [
  "0555976444",
];

// DynamicConfig master override PIN — always bypasses the secondary PIN gate
// when access is already granted via phone-number identification.
export const ADMIN_MASTER_PIN = "1965";
