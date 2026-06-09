import { Router } from "express";
import { db, tenantsTable, usersTable, propertiesTable, settingsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { hashPwd } from "./auth.js";
import { suspendedTenants } from "../tenant-status.js";
import { sessions } from "../lib/session-store.js";

const router = Router();

function fmt(t: typeof tenantsTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// ── List tenants ───────────────────────────────────────────────────────────────

router.get("/super-admin/tenants", async (_req, res) => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);

  const stats = await Promise.all(
    tenants.map(async (t) => {
      const [propRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(propertiesTable)
        .where(eq(propertiesTable.tenantId, t.id));
      const [userRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.tenantId, t.id));
      return { tenantId: t.id, propertyCount: propRow?.count ?? 0, userCount: userRow?.count ?? 0 };
    })
  );

  const statsMap = new Map(stats.map((s) => [s.tenantId, s]));

  res.json(
    tenants.map((t) => ({
      ...fmt(t),
      propertyCount: statsMap.get(t.id)?.propertyCount ?? 0,
      userCount: statsMap.get(t.id)?.userCount ?? 0,
    }))
  );
});

// ── Get tenant ─────────────────────────────────────────────────────────────────

router.get("/super-admin/tenants/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  const [propRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(propertiesTable)
    .where(eq(propertiesTable.tenantId, id));
  const [userRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.tenantId, id));

  res.json({
    ...fmt(tenant),
    propertyCount: propRow?.count ?? 0,
    userCount: userRow?.count ?? 0,
  });
});

// ── Create tenant ──────────────────────────────────────────────────────────────

router.post("/super-admin/tenants", async (req, res) => {
  const { name, slug, plan, contactName, contactEmail, contactPhone, logoText, logoSub,
          adminUsername, adminPassword, adminDisplayName } = req.body ?? {};

  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" }); return;
  }

  // Check slug uniqueness
  const [existing] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, String(slug)));
  if (existing) {
    res.status(409).json({ error: "Slug already taken" }); return;
  }

  const [tenant] = await db.insert(tenantsTable).values({
    name: String(name),
    slug: String(slug).toLowerCase().replace(/\s+/g, "-"),
    plan: plan ? String(plan) : "starter",
    status: "active",
    contactName: contactName ? String(contactName) : null,
    contactEmail: contactEmail ? String(contactEmail) : null,
    contactPhone: contactPhone ? String(contactPhone) : null,
    logoText: logoText ? String(logoText) : String(name).slice(0, 2).toUpperCase(),
    logoSub: logoSub ? String(logoSub) : "Rozoz",
    isActive: true,
  }).returning();

  // Seed default settings for new tenant
  const DEFAULTS: Record<string, string> = {
    propertyName: String(name),
    logoText: tenant.logoText ?? String(name).slice(0, 2).toUpperCase(),
    logoSub: tenant.logoSub ?? "Rozoz",
    businessMode: "hotel",
    enabledModules: JSON.stringify(["bookings", "maintenance", "housekeeping", "serviceRequests"]),
    companyName: String(name),
    contactEmail: contactEmail ? String(contactEmail) : "",
    contactPhone: contactPhone ? String(contactPhone) : "",
    contactAddress: "",
    taskTypes: JSON.stringify([
      { id: "reception",    name: "Reception",    color: "blue"   },
      { id: "housekeeping", name: "Housekeeping", color: "green"  },
      { id: "maintenance",  name: "Maintenance",  color: "orange" },
      { id: "security",     name: "Security",     color: "red"    },
      { id: "general",      name: "General",      color: "gray"   },
    ]),
    taskRequirements: JSON.stringify({
      dueDate: false, photoProof: false, notes: false, priority: false, assignedTo: false,
    }),
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db.execute(sql`
      INSERT INTO settings (tenant_id, key, value)
      VALUES (${tenant.id}, ${key}, ${value})
      ON CONFLICT (tenant_id, key) DO NOTHING
    `);
  }

  // Optionally create initial admin user for the tenant
  let adminUser = null;
  if (adminUsername && adminPassword) {
    const uname = String(adminUsername);
    const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, uname));
    if (!existingUser) {
      [adminUser] = await db.insert(usersTable).values({
        tenantId: tenant.id,
        username: uname,
        displayName: adminDisplayName ? String(adminDisplayName) : uname,
        passwordHash: hashPwd(String(adminPassword)),
        role: "owner",
        permissions: JSON.stringify(["all"]),
        isActive: true,
      }).returning();
    }
  }

  res.status(201).json({
    ...fmt(tenant),
    propertyCount: 0,
    userCount: adminUser ? 1 : 0,
  });
});

// ── Update tenant ──────────────────────────────────────────────────────────────

router.patch("/super-admin/tenants/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, plan, status, contactName, contactEmail, contactPhone, logoText, logoSub, isActive } = req.body ?? {};
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (name    !== undefined) update.name         = String(name);
  if (plan    !== undefined) update.plan         = String(plan);
  if (status  !== undefined) update.status       = String(status);
  if (contactName  !== undefined) update.contactName  = contactName ? String(contactName) : null;
  if (contactEmail !== undefined) update.contactEmail = contactEmail ? String(contactEmail) : null;
  if (contactPhone !== undefined) update.contactPhone = contactPhone ? String(contactPhone) : null;
  if (logoText !== undefined) update.logoText = logoText ? String(logoText) : null;
  if (logoSub  !== undefined) update.logoSub  = logoSub  ? String(logoSub)  : null;
  if (isActive !== undefined) update.isActive = Boolean(isActive);

  const [tenant] = await db.update(tenantsTable).set(update).where(eq(tenantsTable.id, id)).returning();
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  // Keep the in-memory kill-switch cache in sync immediately
  const isSuspended = tenant.status === "suspended" || tenant.isActive === false;
  if (isSuspended) {
    suspendedTenants.add(tenant.id);
    // Evict ALL active sessions for this tenant so logged-in users are
    // kicked out instantly — not just blocked at next login.
    void sessions.deleteByTenantId(tenant.id).then((n) => {
      req.log.info({ tenantId: tenant.id, sessionsCleared: n }, "Tenant suspended — all sessions evicted");
    });
  } else {
    suspendedTenants.delete(tenant.id);
  }

  res.json(fmt(tenant));
});

// ── Tenant settings helpers ────────────────────────────────────────────────────

const SA_DEFAULTS: Record<string, string> = {
  propertyName: "My Property", logoText: "My", logoSub: "Property", logoUrl: "",
  businessMode: "hotel",
  enabledModules: JSON.stringify(["bookings", "maintenance", "housekeeping", "serviceRequests"]),
  companyName: "", contactEmail: "", contactPhone: "", contactAddress: "",
  taskTypes: JSON.stringify([
    { id: "reception",    name: "Reception",    color: "blue"   },
    { id: "housekeeping", name: "Housekeeping", color: "green"  },
    { id: "maintenance",  name: "Maintenance",  color: "orange" },
    { id: "security",     name: "Security",     color: "red"    },
    { id: "general",      name: "General",      color: "gray"   },
  ]),
  taskRequirements: JSON.stringify({
    dueDate: false, photoProof: false, notes: false, priority: false, assignedTo: false,
  }),
  navConfig: JSON.stringify([
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
  ]),
  permissionMatrix: JSON.stringify({
    manager:     ["/", "/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
    supervisor:  ["/", "/tasks"],
    maintenance: ["/", "/tasks"],
    cleaning:    ["/", "/tasks"],
    security:    ["/", "/tasks"],
  }),
  primaryColor: "", secondaryColor: "",
};

function saParseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

async function getTenantSettingsObj(tenantId: number): Promise<Record<string, string>> {
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.tenantId, tenantId));
  const result: Record<string, string> = { ...SA_DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

function buildTenantSettingsResponse(s: Record<string, string>) {
  const defaultModules = ["bookings", "maintenance", "housekeeping", "serviceRequests"];
  const enabledModules = saParseJson<string[]>(s.enabledModules, defaultModules);
  const taskTypes       = saParseJson<object[]>(s.taskTypes ?? SA_DEFAULTS.taskTypes, []);
  const taskRequirements = saParseJson<object>(s.taskRequirements ?? SA_DEFAULTS.taskRequirements, {});
  const defaultNavCfg   = saParseJson<object[]>(SA_DEFAULTS.navConfig, []);
  const navConfig       = saParseJson<object[]>(s.navConfig ?? SA_DEFAULTS.navConfig, defaultNavCfg);
  const defaultMatrix   = saParseJson<Record<string, string[]>>(SA_DEFAULTS.permissionMatrix, {});
  const permissionMatrix = saParseJson<Record<string, string[]>>(s.permissionMatrix ?? SA_DEFAULTS.permissionMatrix, defaultMatrix);
  return {
    propertyName: s.propertyName, logoText: s.logoText, logoSub: s.logoSub,
    logoUrl: s.logoUrl ?? "",
    businessMode: s.businessMode,
    enabledModules: Array.isArray(enabledModules) && enabledModules.length > 0 ? enabledModules : defaultModules,
    companyName: s.companyName ?? "", contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "", contactAddress: s.contactAddress ?? "",
    taskTypes, taskRequirements,
    navConfig: (navConfig as object[]).length > 0 ? navConfig : defaultNavCfg,
    permissionMatrix,
    primaryColor: s.primaryColor ?? "", secondaryColor: s.secondaryColor ?? "",
  };
}

// ── Get tenant settings (super-admin) ─────────────────────────────────────────

router.get("/super-admin/tenants/:id/settings", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [tenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
  const s = await getTenantSettingsObj(id);
  res.json(buildTenantSettingsResponse(s));
});

// ── Update tenant settings (super-admin) ──────────────────────────────────────

router.patch("/super-admin/tenants/:id/settings", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [tenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  const body = req.body ?? {};

  async function upsert(key: string, val: string) {
    await db.insert(settingsTable)
      .values({ tenantId: id, key, value: val })
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
  if (Array.isArray(body.enabledModules)) await upsert("enabledModules", JSON.stringify(body.enabledModules));
  if (Array.isArray(body.taskTypes))      await upsert("taskTypes", JSON.stringify(body.taskTypes));
  if (body.taskRequirements && typeof body.taskRequirements === "object" && !Array.isArray(body.taskRequirements)) {
    await upsert("taskRequirements", JSON.stringify(body.taskRequirements));
  }
  if (Array.isArray(body.navConfig))      await upsert("navConfig", JSON.stringify(body.navConfig));
  if (body.permissionMatrix && typeof body.permissionMatrix === "object" && !Array.isArray(body.permissionMatrix)) {
    await upsert("permissionMatrix", JSON.stringify(body.permissionMatrix));
  }

  const s = await getTenantSettingsObj(id);
  res.json(buildTenantSettingsResponse(s));
});

// ── Delete tenant ──────────────────────────────────────────────────────────────

router.delete("/super-admin/tenants/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (id === 1) { res.status(400).json({ error: "Cannot delete the default tenant" }); return; }
  await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
  res.status(204).end();
});

export default router;
