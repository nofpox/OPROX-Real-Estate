import { Router } from "express";
import {
  db,
  propertyCategoriesTable,
  settingsTable,
  listingsTable,
} from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function requireAdmin(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
): void {
  const user = (req as any).sessionUser as any;
  const adminRoles = ["owner", "admin_manager", "administrator", "super_admin"];
  if (!user || !adminRoles.includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

const DEFAULT_CATEGORIES = [
  { slug: "hotel",      labelEn: "Hotel",       labelAr: "فندق",    icon: "building-2",  color: "blue",   sortOrder: 1 },
  { slug: "apartment",  labelEn: "Apartment",   labelAr: "شقة",     icon: "home",         color: "green",  sortOrder: 2 },
  { slug: "compound",   labelEn: "Compound",    labelAr: "مجمع",    icon: "building",     color: "orange", sortOrder: 3 },
  { slug: "villa",      labelEn: "Villa",        labelAr: "فيلا",    icon: "landmark",     color: "purple", sortOrder: 4 },
  { slug: "commercial", labelEn: "Commercial",  labelAr: "تجاري",   icon: "store",        color: "red",    sortOrder: 5 },
  { slug: "office",     labelEn: "Office",       labelAr: "مكتب",    icon: "briefcase",    color: "slate",  sortOrder: 6 },
  { slug: "warehouse",  labelEn: "Warehouse",   labelAr: "مستودع",  icon: "warehouse",    color: "amber",  sortOrder: 7 },
];

// ── Property Types ────────────────────────────────────────────────────────────

router.get("/cms/property-types", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  try {
    let rows = await db
      .select()
      .from(propertyCategoriesTable)
      .where(eq(propertyCategoriesTable.tenantId, tenantId))
      .orderBy(asc(propertyCategoriesTable.sortOrder));

    // Auto-seed defaults on first access
    if (rows.length === 0) {
      const inserts = DEFAULT_CATEGORIES.map(d => ({ ...d, tenantId }));
      rows = await db.insert(propertyCategoriesTable).values(inserts).returning();
      rows.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    res.json({ categories: rows });
  } catch (err) {
    req.log.error(err, "GET /cms/property-types");
    res.status(500).json({ error: "Failed to fetch property types" });
  }
});

router.post("/cms/property-types", requireAdmin, async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const { slug, labelEn, labelAr, icon = "building-2", color = "blue", sortOrder = 99 } =
    (req.body ?? {}) as Record<string, string | number>;
  if (!slug || !labelEn) { res.status(400).json({ error: "slug and labelEn are required" }); return; }
  try {
    const [row] = await db
      .insert(propertyCategoriesTable)
      .values({ tenantId, slug: String(slug), labelEn: String(labelEn), labelAr: labelAr ? String(labelAr) : null, icon: String(icon), color: String(color), sortOrder: Number(sortOrder) })
      .returning();
    res.json({ category: row });
  } catch (err) {
    req.log.error(err, "POST /cms/property-types");
    res.status(500).json({ error: "Failed to create property type" });
  }
});

router.put("/cms/property-types/:id", requireAdmin, async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { slug, labelEn, labelAr, icon, color, isActive, sortOrder } =
    (req.body ?? {}) as Record<string, unknown>;
  try {
    const [row] = await db
      .update(propertyCategoriesTable)
      .set({
        ...(slug     !== undefined && { slug: String(slug) }),
        ...(labelEn  !== undefined && { labelEn: String(labelEn) }),
        ...(labelAr  !== undefined && { labelAr: labelAr ? String(labelAr) : null }),
        ...(icon     !== undefined && { icon: String(icon) }),
        ...(color    !== undefined && { color: String(color) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      })
      .where(and(eq(propertyCategoriesTable.id, id), eq(propertyCategoriesTable.tenantId, tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ category: row });
  } catch (err) {
    req.log.error(err, "PUT /cms/property-types/:id");
    res.status(500).json({ error: "Failed to update property type" });
  }
});

router.delete("/cms/property-types/:id", requireAdmin, async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db
      .delete(propertyCategoriesTable)
      .where(and(eq(propertyCategoriesTable.id, id), eq(propertyCategoriesTable.tenantId, tenantId)));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error(err, "DELETE /cms/property-types/:id");
    res.status(500).json({ error: "Failed to delete" });
  }
});

// ── Site Content ──────────────────────────────────────────────────────────────

const SITE_SECTIONS = ["hero", "contact", "announcements", "about"] as const;
type SiteSection = (typeof SITE_SECTIONS)[number];

async function getSectionValue(tenantId: number, section: SiteSection): Promise<unknown> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, `cms_${section}`)));
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

async function upsertSectionValue(tenantId: number, section: SiteSection, value: unknown): Promise<void> {
  const stringVal = JSON.stringify(value);
  await db
    .insert(settingsTable)
    .values({ tenantId, key: `cms_${section}`, value: stringVal })
    .onConflictDoUpdate({
      target: [settingsTable.tenantId, settingsTable.key],
      set: { value: stringVal },
    });
}

const DEFAULT_SITE_CONTENT: Record<SiteSection, unknown> = {
  hero: { titleEn: "Welcome", titleAr: "أهلاً وسهلاً", subtitleEn: "Find your perfect property", subtitleAr: "ابحث عن عقارك المثالي", imageUrl: "" },
  contact: { email: "", phone: "", whatsapp: "", address: "" },
  announcements: [],
  about: { titleEn: "About Us", titleAr: "من نحن", body: "", imageUrl: "" },
};

router.get("/cms/site-content", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  try {
    const content: Record<string, unknown> = {};
    for (const section of SITE_SECTIONS) {
      const val = await getSectionValue(tenantId, section);
      content[section] = val ?? DEFAULT_SITE_CONTENT[section];
    }
    res.json({ content });
  } catch (err) {
    req.log.error(err, "GET /cms/site-content");
    res.status(500).json({ error: "Failed to fetch site content" });
  }
});

router.put("/cms/site-content/:section", requireAdmin, async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const section = req.params.section as SiteSection;
  if (!SITE_SECTIONS.includes(section)) { res.status(400).json({ error: "Invalid section" }); return; }
  try {
    await upsertSectionValue(tenantId, section, req.body ?? {});
    res.json({ success: true, section });
  } catch (err) {
    req.log.error(err, "PUT /cms/site-content/:section");
    res.status(500).json({ error: "Failed to update site content" });
  }
});

// ── Listings admin (all statuses) ─────────────────────────────────────────────

router.get("/cms/listings-admin", requireAdmin, async (req, res) => {
  const tenantId = tid(req) ?? 1;
  try {
    const rows = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.tenantId, tenantId))
      .orderBy(desc(listingsTable.updatedAt));

    const formatted = rows.map(l => ({
      ...l,
      price: l.price ? Number(l.price) : null,
      areaSqm: l.areaSqm ? Number(l.areaSqm) : null,
      amenities: (() => { try { return JSON.parse(l.amenities ?? "[]"); } catch { return []; } })(),
      media:     (() => { try { return JSON.parse(l.media     ?? "[]"); } catch { return []; } })(),
    }));

    res.json({ listings: formatted, total: formatted.length });
  } catch (err) {
    req.log.error(err, "GET /cms/listings-admin");
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

export default router;
