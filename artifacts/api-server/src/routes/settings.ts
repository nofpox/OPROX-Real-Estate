import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logActivity, actorFromRequest } from "./activityLogs.js";

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

const DEFAULT_NAV_CONFIG = JSON.stringify([
  { id: "dashboard",          order: 0,  visible: true },
  { id: "properties",         order: 1,  visible: true },
  { id: "rooms",              order: 2,  visible: true },
  { id: "unit-map",           order: 3,  visible: true },
  { id: "maintenance",        order: 4,  visible: true },
  { id: "facilities",         order: 5,  visible: true },
  { id: "staff",              order: 6,  visible: true },
  { id: "tasks",              order: 7,  visible: true },
  { id: "guest-requests",     order: 8,  visible: true },
  { id: "activity-log",       order: 9,  visible: true },
  { id: "user-management",    order: 10, visible: true },
  { id: "admin-settings",     order: 11, visible: true },
  { id: "security-dashboard", order: 12, visible: true },
  { id: "analytics",          order: 13, visible: true },
  { id: "support-tickets",    order: 14, visible: true },
]);

const DEFAULT_PERMISSION_MATRIX = JSON.stringify({
  manager:     ["/", "/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
  supervisor:  ["/", "/tasks"],
  maintenance: ["/", "/tasks"],
  cleaning:    ["/", "/tasks"],
  security:    ["/", "/tasks"],
});

const DEFAULTS: Record<string, string> = {
  propertyName: "My Property", logoText: "My", logoSub: "Property", logoUrl: "",
  businessMode: "hotel",
  enabledModules: JSON.stringify(["bookings", "maintenance", "housekeeping", "serviceRequests"]),
  companyName: "", contactEmail: "", contactPhone: "", contactAddress: "",
  taskTypes: DEFAULT_TASK_TYPES, taskRequirements: DEFAULT_TASK_REQUIREMENTS,
  navConfig: DEFAULT_NAV_CONFIG,
  permissionMatrix: DEFAULT_PERMISSION_MATRIX,
  primaryColor: "", secondaryColor: "",
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

type NavConfigItem = { id: string; order: number; visible: boolean };
type PermissionMatrix = Record<string, string[]>;

function buildResponse(s: Record<string, string>) {
  const defaultModules = ["bookings", "maintenance", "housekeeping", "serviceRequests"];
  const enabledModules = parseJsonSafe<string[]>(s.enabledModules, defaultModules);
  const defaultTaskTypes = parseJsonSafe<object[]>(DEFAULT_TASK_TYPES, []);
  const taskTypes = parseJsonSafe<object[]>(s.taskTypes ?? DEFAULT_TASK_TYPES, defaultTaskTypes);
  const defaultReqs = parseJsonSafe<object>(DEFAULT_TASK_REQUIREMENTS, {});
  const taskRequirements = parseJsonSafe<object>(s.taskRequirements ?? DEFAULT_TASK_REQUIREMENTS, defaultReqs);
  const defaultNavCfg = parseJsonSafe<NavConfigItem[]>(DEFAULT_NAV_CONFIG, []);
  const navConfig = parseJsonSafe<NavConfigItem[]>(s.navConfig ?? DEFAULT_NAV_CONFIG, defaultNavCfg);
  const defaultMatrix = parseJsonSafe<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX, {});
  const permissionMatrix = parseJsonSafe<PermissionMatrix>(s.permissionMatrix ?? DEFAULT_PERMISSION_MATRIX, defaultMatrix);

  return {
    propertyName: s.propertyName, logoText: s.logoText, logoSub: s.logoSub,
    logoUrl: s.logoUrl ?? "",
    businessMode: s.businessMode,
    enabledModules: Array.isArray(enabledModules) && enabledModules.length > 0 ? enabledModules : defaultModules,
    companyName: s.companyName ?? "", contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "", contactAddress: s.contactAddress ?? "",
    taskTypes, taskRequirements,
    navConfig: navConfig.length > 0 ? navConfig : defaultNavCfg,
    permissionMatrix,
    primaryColor: s.primaryColor ?? "", secondaryColor: s.secondaryColor ?? "",
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
    "propertyName", "logoText", "logoSub", "logoUrl", "businessMode",
    "companyName", "contactEmail", "contactPhone", "contactAddress",
    "primaryColor", "secondaryColor",
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
  if (Array.isArray(body.navConfig)) {
    await upsert("navConfig", JSON.stringify(body.navConfig));
  }
  if (body.permissionMatrix && typeof body.permissionMatrix === "object" && !Array.isArray(body.permissionMatrix)) {
    await upsert("permissionMatrix", JSON.stringify(body.permissionMatrix));
  }

  const s = await getAllSettings(tenantId);
  const actor = actorFromRequest(req);
  const changedKeys = Object.keys(body).filter(k =>
    ["propertyName","logoText","logoSub","logoUrl","businessMode","companyName","contactEmail","contactPhone","contactAddress","primaryColor","secondaryColor","enabledModules","taskTypes","taskRequirements","navConfig","permissionMatrix"].includes(k)
  );
  if (changedKeys.length > 0) {
    logActivity({ ...actor, tenantId, action: "settings.updated", entityType: "settings", entityLabel: "System Settings", details: `keys=${changedKeys.join(",")}` });
  }
  res.json(buildResponse(s));
});

export default router;
