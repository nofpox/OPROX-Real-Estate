import { Router } from "express";
import { db, tenantsTable, usersTable, propertiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hashPwd } from "./auth.js";

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
    logoSub: logoSub ? String(logoSub) : "PMS",
    isActive: true,
  }).returning();

  // Seed default settings for new tenant
  const DEFAULTS: Record<string, string> = {
    propertyName: String(name),
    logoText: tenant.logoText ?? String(name).slice(0, 2).toUpperCase(),
    logoSub: tenant.logoSub ?? "PMS",
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
  res.json(fmt(tenant));
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
