import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/** Default enabled modules when no configuration has been saved yet. */
const DEFAULT_MODULES = ["bookings", "maintenance", "housekeeping", "serviceRequests"];

const DEFAULTS: Record<string, string> = {
  propertyName: "My Property",
  propertyType: "all",
  logoText: "My",
  logoSub: "Property",
  businessMode: "hotel",
  enabledModules: JSON.stringify(DEFAULT_MODULES),
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
  let enabledModules: string[];
  try {
    const parsed = JSON.parse(s.enabledModules);
    enabledModules = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MODULES;
  } catch {
    enabledModules = DEFAULT_MODULES;
  }
  return {
    propertyName: s.propertyName,
    propertyType: s.propertyType,
    logoText: s.logoText,
    logoSub: s.logoSub,
    businessMode: s.businessMode,
    enabledModules,
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

  if (Array.isArray(body.enabledModules)) {
    const val = JSON.stringify(body.enabledModules as string[]);
    await db
      .insert(settingsTable)
      .values({ key: "enabledModules", value: val })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: val, updatedAt: new Date() } });
  }

  const s = await getAllSettings();
  res.json(buildResponse(s));
});

export default router;
