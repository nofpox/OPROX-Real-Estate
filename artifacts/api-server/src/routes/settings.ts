import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULTS: Record<string, string> = {
  propertyName: "My Property",
  propertyType: "all",
  logoText: "My",
  logoSub: "Property",
};

async function ensureDefaults() {
  try {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const existing = await db.select({ id: settingsTable.id }).from(settingsTable).where(eq(settingsTable.key, key));
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
  const rows = await db.select({ key: settingsTable.key, value: settingsTable.value }).from(settingsTable);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

router.get("/settings", async (_req, res) => {
  const s = await getAllSettings();
  res.json({
    propertyName: s.propertyName,
    propertyType: s.propertyType,
    logoText: s.logoText,
    logoSub: s.logoSub,
  });
});

router.patch("/settings", async (req, res) => {
  const body = req.body ?? {};
  const allowed = ["propertyName", "propertyType", "logoText", "logoSub"];
  for (const key of allowed) {
    if (typeof body[key] === "string" && body[key].trim().length > 0) {
      await db
        .insert(settingsTable)
        .values({ key, value: body[key].trim() })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: body[key].trim(), updatedAt: new Date() } });
    }
  }
  const s = await getAllSettings();
  res.json({
    propertyName: s.propertyName,
    propertyType: s.propertyType,
    logoText: s.logoText,
    logoSub: s.logoSub,
  });
});

export default router;
