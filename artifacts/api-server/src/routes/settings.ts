import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

export const MODE_DEFAULTS: Record<string, string[]> = {
  hotel: [
    "properties", "rooms", "guests", "bookings",
    "finance", "maintenance", "staff", "tasks",
    "guestRequests", "activityLog", "userManagement",
  ],
  compound: [
    "properties", "rooms", "unitMap",
    "maintenance", "staff", "tasks",
    "activityLog", "userManagement",
  ],
  "serviced-apartments": [
    "properties", "rooms", "guests", "bookings",
    "tasks", "guestRequests", "staff",
    "activityLog", "userManagement",
  ],
};

const DEFAULTS: Record<string, string> = {
  propertyName: "My Property",
  propertyType: "all",
  logoText: "My",
  logoSub: "Property",
  businessMode: "hotel",
  enabledFeatures: JSON.stringify(MODE_DEFAULTS.hotel),
};

async function ensureDefaults() {
  try {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const existing = await db
        .select({ id: settingsTable.id })
        .from(settingsTable)
        .where(eq(settingsTable.key, key));
      if (existing.length === 0) {
        await db.insert(settingsTable).values({ key, value });
      }
    }
  } catch {
    // table may not exist yet on first boot
  }
}

ensureDefaults();

async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

function buildResponse(s: Record<string, string>) {
  let enabledFeatures: string[];
  try {
    enabledFeatures = JSON.parse(s.enabledFeatures);
  } catch {
    enabledFeatures = MODE_DEFAULTS[s.businessMode] ?? MODE_DEFAULTS.hotel;
  }
  return {
    propertyName: s.propertyName,
    propertyType: s.propertyType,
    logoText: s.logoText,
    logoSub: s.logoSub,
    businessMode: s.businessMode,
    enabledFeatures,
  };
}

router.get("/settings", async (_req, res) => {
  const s = await getAllSettings();
  res.json(buildResponse(s));
});

router.patch("/settings", async (req, res) => {
  const body = req.body ?? {};
  const stringFields = ["propertyName", "propertyType", "logoText", "logoSub", "businessMode"];

  for (const key of stringFields) {
    if (typeof body[key] === "string" && body[key].trim().length > 0) {
      const val = body[key].trim();
      await db
        .insert(settingsTable)
        .values({ key, value: val })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: val, updatedAt: new Date() } });
    }
  }

  if (Array.isArray(body.enabledFeatures)) {
    const val = JSON.stringify(body.enabledFeatures as string[]);
    await db
      .insert(settingsTable)
      .values({ key: "enabledFeatures", value: val })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: val, updatedAt: new Date() } });
  }

  const s = await getAllSettings();
  res.json(buildResponse(s));
});

export default router;
