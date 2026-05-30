import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

function tid(req: import("express").Request): number {
  return ((req as any).sessionUser as any)?.tenantId ?? 1;
}

const DEFAULT_TASK_TYPES = JSON.stringify([
  { id: "reception",    name: "Reception",    color: "blue"   },
  { id: "housekeeping", name: "Housekeeping", color: "green"  },
  { id: "maintenance",  name: "Maintenance",  color: "orange" },
  { id: "security",     name: "Security",     color: "red"    },
  { id: "general",      name: "General",      color: "gray"   },
]);

const DEFAULT_TASK_REQUIREMENTS = JSON.stringify({
  dueDate: false, photoProof: false, notes: false, priority: false, assignedTo: false,
});

const DEFAULTS: Record<string, string> = {
  propertyName: "My Property", logoText: "My", logoSub: "Property", businessMode: "hotel",
  enabledModules: JSON.stringify(["bookings", "maintenance", "housekeeping", "serviceRequests"]),
  companyName: "", contactEmail: "", contactPhone: "", contactAddress: "",
  taskTypes: DEFAULT_TASK_TYPES, taskRequirements: DEFAULT_TASK_REQUIREMENTS,
};

async function ensureDefaults(tenantId: number) {
  try {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const existing = await db
        .select({ id: settingsTable.id })
        .from(settingsTable)
        .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, key)));
      if (existing.length === 0) {
        await db.insert(settingsTable).values({ tenantId, key, value });
      }
    }
  } catch {
    // table may not exist yet on first boot
  }
}

async function getAllSettings(tenantId: number): Promise<Record<string, string>> {
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.tenantId, tenantId));
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function buildResponse(s: Record<string, string>) {
  const defaultModules = ["bookings", "maintenance", "housekeeping", "serviceRequests"];
  const enabledModules = parseJsonSafe<string[]>(s.enabledModules, defaultModules);
  const defaultTaskTypes = parseJsonSafe<object[]>(DEFAULT_TASK_TYPES, []);
  const taskTypes = parseJsonSafe<object[]>(s.taskTypes ?? DEFAULT_TASK_TYPES, defaultTaskTypes);
  const defaultReqs = parseJsonSafe<object>(DEFAULT_TASK_REQUIREMENTS, {});
  const taskRequirements = parseJsonSafe<object>(s.taskRequirements ?? DEFAULT_TASK_REQUIREMENTS, defaultReqs);

  return {
    propertyName: s.propertyName, logoText: s.logoText, logoSub: s.logoSub,
    businessMode: s.businessMode,
    enabledModules: Array.isArray(enabledModules) && enabledModules.length > 0 ? enabledModules : defaultModules,
    companyName: s.companyName ?? "", contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "", contactAddress: s.contactAddress ?? "",
    taskTypes, taskRequirements,
  };
}

router.get("/settings", async (req, res) => {
  const tenantId = tid(req);
  await ensureDefaults(tenantId);
  const s = await getAllSettings(tenantId);
  res.json(buildResponse(s));
});

router.patch("/settings", async (req, res) => {
  const tenantId = tid(req);
  const body = req.body ?? {};

  async function upsert(key: string, val: string) {
    await db
      .insert(settingsTable)
      .values({ tenantId, key, value: val })
      .onConflictDoUpdate({
        target: [settingsTable.tenantId, settingsTable.key],
        set: { value: val, updatedAt: new Date() },
      });
  }

  const stringFields = [
    "propertyName", "logoText", "logoSub", "businessMode",
    "companyName", "contactEmail", "contactPhone", "contactAddress",
  ];
  for (const key of stringFields) {
    if (typeof body[key] === "string") await upsert(key, body[key].trim());
  }

  if (Array.isArray(body.enabledModules)) {
    await upsert("enabledModules", JSON.stringify(body.enabledModules as string[]));
  }
  if (Array.isArray(body.taskTypes)) {
    await upsert("taskTypes", JSON.stringify(body.taskTypes));
  }
  if (body.taskRequirements && typeof body.taskRequirements === "object" && !Array.isArray(body.taskRequirements)) {
    await upsert("taskRequirements", JSON.stringify(body.taskRequirements));
  }

  const s = await getAllSettings(tenantId);
  res.json(buildResponse(s));
});

export default router;
