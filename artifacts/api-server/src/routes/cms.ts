import { Router } from "express";
import {
  db,
  propertyCategoriesTable,
  settingsTable,
  listingsTable,
  propertiesTable,
  guestsTable,
  bookingsTable,
  roomsTable,
} from "@workspace/db";
import { eq, and, asc, desc, count } from "drizzle-orm";

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

const SITE_SECTIONS = [
  "hero", "contact", "announcements", "about",
  "branding", "stats", "services", "nav", "footer", "cta", "listingsPage",
] as const;
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
  hero: {
    titleEn: "Premium Property Management in Saudi Arabia",
    titleAr: "إدارة عقارات متميزة في المملكة العربية السعودية",
    subtitleEn: "Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.",
    subtitleAr: "اكتشف فنادق ومجمعات سكنية ومرافق مؤسسية حصرية تُدار باحترافية ودقة.",
    ctaButtonEn: "Explore Opportunities",
    ctaButtonAr: "استكشف الفرص",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  },
  contact: {
    email: "info@rakez-solutions.com",
    salesEmail: "sales@rakez-solutions.com",
    supportEmail: "support@rakez-solutions.com",
    phone: "+966 11 234 5678",
    fax: "+966 11 234 5679",
    supportPhone: "9200 12345",
    whatsapp: "",
    addressEn: "King Fahd Road, Olaya District\nP.O. Box 12345\nRiyadh 11471, Saudi Arabia",
    addressAr: "طريق الملك فهد، حي العليا\nص.ب. 12345\nالرياض 11471، المملكة العربية السعودية",
  },
  announcements: [],
  about: {
    titleEn: "About Rakez Smart Solutions",
    titleAr: "عن ركز للحلول الذكية",
    body: "Rakez Smart Solutions is a leading property management company in Saudi Arabia, specializing in hotels, residential compounds, and corporate facilities.",
    imageUrl: "",
  },
  branding: {
    companyNameEn: "Rakez Smart Solutions",
    companyNameAr: "ركز للحلول الذكية",
    taglineEn: "Premium Property Management",
    taglineAr: "إدارة عقارات متميزة",
    logoUrl: "",
  },
  stats: [
    { value: "0",      labelEn: "Properties Managed",      labelAr: "عقار مُدار",           liveKey: "properties_count" },
    { value: "0",      labelEn: "Satisfied Tenants",        labelAr: "مستأجر راضٍ",          liveKey: "guests_count"     },
    { value: "₂B SAR", labelEn: "Assets Under Management",  labelAr: "أصول تحت الإدارة",     liveKey: null               },
    { value: "10+",    labelEn: "Years of Excellence",       labelAr: "سنوات من التميز",      liveKey: null               },
  ],
  services: [
    {
      titleEn: "Hotel Operations",
      titleAr: "إدارة الفنادق",
      descEn: "Comprehensive hospitality management delivering premium guest experiences and maximised yields.",
      descAr: "إدارة شاملة للأصول الفندقية مع التركيز على رضا الضيوف وتحسين الإيرادات والكفاءة التشغيلية.",
      itemsEn: [
        "Front desk & concierge management",
        "Housekeeping & maintenance services",
        "Revenue management & pricing strategy",
        "Guest experience optimization",
        "F&B operations management",
      ],
      itemsAr: [
        "إدارة الاستقبال والكونسيرج",
        "خدمات التدبير المنزلي والصيانة",
        "إدارة الإيرادات وإستراتيجية التسعير",
        "تحسين تجربة الضيوف",
        "إدارة عمليات الأغذية والمشروبات",
      ],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Compound Management",
      titleAr: "إدارة المجمعات السكنية",
      descEn: "Creating thriving residential communities through comprehensive compound management ensuring secure, well-maintained environments.",
      descAr: "بناء مجتمعات سكنية متكاملة من خلال إدارة شاملة للمجمع. نضمن بيئات معيشية آمنة ومصونة وحيوية.",
      itemsEn: [
        "24/7 Security & access control",
        "Preventive maintenance programs",
        "Community events & lifestyle services",
        "Recreational facility management",
        "Tenant relations & leasing",
      ],
      itemsAr: [
        "الأمن على مدار الساعة وضبط الدخول",
        "برامج الصيانة الوقائية",
        "الفعاليات المجتمعية وخدمات أسلوب الحياة",
        "إدارة المرافق الترفيهية",
        "علاقات المستأجرين والتأجير",
      ],
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Corporate Facilities",
      titleAr: "المرافق المؤسسية",
      descEn: "Professional facility management for corporate environments maintaining optimal working conditions that enhance productivity.",
      descAr: "تقديم خدمات إدارة المرافق الاحترافية للبيئات المؤسسية. نحافظ على ظروف عمل مثلى تعزز الإنتاجية.",
      itemsEn: [
        "Integrated facilities management",
        "Health, safety & environment compliance",
        "Energy management & sustainability",
        "Workspace planning & optimization",
        "Vendor & contract management",
      ],
      itemsAr: [
        "الإدارة المتكاملة للمرافق",
        "الامتثال للصحة والسلامة والبيئة",
        "إدارة الطاقة والاستدامة",
        "تخطيط مساحة العمل وتحسينها",
        "إدارة الموردين والعقود",
      ],
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
    },
  ],
  listingsPage: {
    pageTitleEn: "Property Listings",
    pageTitleAr: "العقارات",
    subtitleEn: "Discover our curated selection of properties across Saudi Arabia.",
    subtitleAr: "اكتشف مجموعة عقاراتنا المختارة في المملكة العربية السعودية.",
    metaDescription: "Browse properties for sale, rent, and under professional management by Rakez Smart Solutions.",
  },
  nav: [
    { href: "/",         labelEn: "Home",          labelAr: "الرئيسية"    },
    { href: "/listings", labelEn: "Properties",    labelAr: "العقارات"    },
    { href: "/services", labelEn: "Services",      labelAr: "الخدمات"     },
    { href: "/contact",  labelEn: "Contact",       labelAr: "اتصل بنا"    },
    { href: "/portal",   labelEn: "Investor Portal", labelAr: "بوابة المستثمر" },
  ],
  footer: {
    descriptionEn: "Your trusted partner for premium property management across Saudi Arabia — hotels, compounds, and corporate facilities.",
    descriptionAr: "شريكك الموثوق لإدارة العقارات المتميزة في المملكة العربية السعودية — فنادق ومجمعات سكنية ومرافق مؤسسية.",
  },
  cta: {
    headlineEn: "Ready to Maximise Your Property's Potential?",
    headlineAr: "هل أنت مستعد لتعظيم قيمة عقارك؟",
    subtitleEn: "Get in touch with our team today and discover how Rakez can transform your property assets into a performing investment.",
    subtitleAr: "تواصل مع فريقنا اليوم واكتشف كيف يمكن لركز أن يحول أصولك العقارية إلى استثمار مثمر.",
    buttonEn: "Contact Us",
    buttonAr: "تواصل معنا",
  },
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

// ── Live Stats (auto-calculated from DB) ──────────────────────────────────────

router.get("/cms/live-stats", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  try {
    const [props, guests, bookings, rooms] = await Promise.all([
      db.select({ count: count() }).from(propertiesTable).where(eq(propertiesTable.tenantId, tenantId)),
      db.select({ count: count() }).from(guestsTable).where(eq(guestsTable.tenantId, tenantId)),
      db.select({ count: count() }).from(bookingsTable).where(eq(bookingsTable.tenantId, tenantId)),
      db.select({ count: count() }).from(roomsTable).where(eq(roomsTable.tenantId, tenantId)),
    ]);
    res.json({
      properties_count: props[0]?.count   ?? 0,
      guests_count:     guests[0]?.count   ?? 0,
      bookings_count:   bookings[0]?.count ?? 0,
      rooms_count:      rooms[0]?.count    ?? 0,
    });
  } catch (err) {
    req.log.error(err, "GET /cms/live-stats");
    res.status(500).json({ error: "Failed to fetch live stats" });
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
