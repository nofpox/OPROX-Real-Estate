// ─────────────────────────────────────────────────────────────────────────────
// WHITE-LABEL CONFIGURATION
// Change the values below whenever you deploy this app for a new client.
// ─────────────────────────────────────────────────────────────────────────────

const branding = {
  // The full name displayed as the dashboard hero heading and in the sidebar.
  propertyName: "Grand Hotel Downtown",

  // Lock the entire dashboard to one property type.
  // Valid values: "Hotel" | "Compound" | "Furnished Apartments" | "all"
  // Set to "all" to show data for every property in the database (no filter).
  propertyType: "Hotel" as "Hotel" | "Compound" | "Furnished Apartments" | "all",

  // Sidebar logo — two-part text: large serif word + smaller sans word.
  logoText: "Grand",
  logoSub: "PMS",
} as const;

export default branding;
