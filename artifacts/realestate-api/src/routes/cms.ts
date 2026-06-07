import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db, propertyCategoriesTable, settingsTable, listingsTable,
  propertiesTable, guestsTable, bookingsTable, roomsTable, userSessionsTable,
} from "@workspace/db";
import { eq, and, asc, desc, count, gt } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  if (!sessionId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const [row] = await db
      .select()
      .from(userSessionsTable)
      .where(and(eq(userSessionsTable.sessionId, sessionId), gt(userSessionsTable.expiresAt, new Date())));
    if (!row) { res.status(401).json({ error: "Session expired" }); return; }
    const userData = row.userData as Record<string, unknown>;
    const adminRoles = ["owner", "admin_manager", "administrator", "super_admin", "manager"];
    if (!userData || !adminRoles.includes(String(userData.role ?? ""))) {
      res.status(403).json({ error: "Admin access required" }); return;
    }
    (req as any).sessionUser = userData;
    next();
  } catch {
    res.status(500).json({ error: "Auth check failed" });
  }
}

const SITE_SECTIONS = [
  "hero", "contact", "announcements", "about",
  "branding", "stats", "services", "nav", "footer", "cta", "listingsPage",
  "leadEmail",
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
    phone: "+966 11 234 5678",
    whatsapp: "",
    addressEn: "King Fahd Road, Olaya District\nRiyadh, Saudi Arabia",
    addressAr: "طريق الملك فهد، حي العليا\nالرياض، المملكة العربية السعودية",
  },
  announcements: [],
  about: {
    titleEn: "About RKZ Smart Solutions",
    titleAr: "عن ركز للحلول الذكية",
    body: "RKZ Smart Solutions is a leading property management company in Saudi Arabia.",
    imageUrl: "",
  },
  branding: {
    companyNameEn: "RKZ Smart Solutions",
    companyNameAr: "ركز للحلول الذكية",
    taglineEn: "Premium Property Management",
    taglineAr: "إدارة عقارات متميزة",
    logoUrl: "",
  },
  stats: [
    { value: "0",      labelEn: "Properties Managed",     labelAr: "عقار مُدار",       liveKey: "properties_count" },
    { value: "0",      labelEn: "Satisfied Tenants",       labelAr: "مستأجر راضٍ",      liveKey: "guests_count" },
    { value: "₂B SAR", labelEn: "Assets Under Management", labelAr: "أصول تحت الإدارة", liveKey: null },
    { value: "10+",    labelEn: "Years of Excellence",      labelAr: "سنوات من التميز",  liveKey: null },
  ],
  services: [
    {
      titleEn: "Hotel Operations", titleAr: "إدارة الفنادق",
      descEn: "Comprehensive hospitality management delivering premium guest experiences.",
      descAr: "إدارة شاملة للأصول الفندقية مع التركيز على رضا الضيوف.",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Compound Management", titleAr: "إدارة المجمعات السكنية",
      descEn: "Creating thriving residential communities through comprehensive management.",
      descAr: "بناء مجتمعات سكنية متكاملة من خلال إدارة شاملة.",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Corporate Facilities", titleAr: "المرافق المؤسسية",
      descEn: "Professional facility management for corporate environments.",
      descAr: "خدمات إدارة المرافق الاحترافية للبيئات المؤسسية.",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
    },
  ],
  listingsPage: {
    pageTitleEn: "Property Listings",
    pageTitleAr: "العقارات",
    subtitleEn: "Discover our curated selection of properties across Saudi Arabia.",
    subtitleAr: "اكتشف مجموعة عقاراتنا المختارة في المملكة العربية السعودية.",
    metaDescription: "Browse properties managed by RKZ Smart Solutions.",
  },
  nav: [
    { href: "/",         labelEn: "Home",             labelAr: "الرئيسية" },
    { href: "/listings", labelEn: "Properties",       labelAr: "العقارات" },
    { href: "/services", labelEn: "Services",         labelAr: "الخدمات" },
    { href: "/contact",  labelEn: "Contact",          labelAr: "اتصل بنا" },
    { href: "/portal",   labelEn: "Investor Portal",  labelAr: "بوابة المستثمر" },
  ],
  footer: {
    descriptionEn: "Your trusted partner for premium property management across Saudi Arabia.",
    descriptionAr: "شريكك الموثوق لإدارة العقارات المتميزة في المملكة العربية السعودية.",
  },
  cta: {
    headlineEn: "Ready to Maximise Your Property's Potential?",
    headlineAr: "هل أنت مستعد لتعظيم قيمة عقارك؟",
    subtitleEn: "Get in touch with our team today.",
    subtitleAr: "تواصل مع فريقنا اليوم.",
    buttonEn: "Contact Us",
    buttonAr: "تواصل معنا",
  },
  leadEmail: {
    subject: "Welcome to Rkaz – Your Visit Confirmation",
    intro: "Thank you for your interest in Rkaz. We are pleased to confirm that we have received your request.\n\nOur team is currently reviewing your inquiry and will contact you shortly.",
    mapsUrl: "https://www.google.com/maps/search/Rkaz+Riyadh+Saudi+Arabia",
    bccEmail: "",
  },
};

// ── GET /cms/site-content ─────────────────────────────────────────────────────
router.get("/cms/site-content", async (req, res) => {
  const tenantId = ((req as any).sessionUser?.tenantId as number | null) ?? 1;
  try {
    const content: Record<string, unknown> = {};
    for (const section of SITE_SECTIONS) {
      const val = await getSectionValue(tenantId, section);
      content[section] = val ?? DEFAULT_SITE_CONTENT[section];
    }
    res.json({ content });
  } catch (err) {
    req.log?.error(err, "GET /cms/site-content");
    res.status(500).json({ error: "Failed to fetch site content" });
  }
});

// ── PUT /cms/site-content/:section (admin auth) ───────────────────────────────
router.put("/cms/site-content/:section", requireAdmin, async (req, res) => {
  const tenantId = ((req as any).sessionUser?.tenantId as number | null) ?? 1;
  const section = req.params.section as SiteSection;
  if (!SITE_SECTIONS.includes(section)) { res.status(400).json({ error: "Invalid section" }); return; }
  try {
    await upsertSectionValue(tenantId, section, req.body ?? {});
    res.json({ success: true, section });
  } catch (err) {
    req.log?.error(err, "PUT /cms/site-content/:section");
    res.status(500).json({ error: "Failed to update site content" });
  }
});

// ── GET /cms/live-stats ───────────────────────────────────────────────────────
router.get("/cms/live-stats", async (req, res) => {
  const tenantId = ((req as any).sessionUser?.tenantId as number | null) ?? 1;
  try {
    const [props, guests, bks, rooms] = await Promise.all([
      db.select({ count: count() }).from(propertiesTable).where(eq(propertiesTable.tenantId, tenantId)),
      db.select({ count: count() }).from(guestsTable).where(eq(guestsTable.tenantId, tenantId)),
      db.select({ count: count() }).from(bookingsTable).where(eq(bookingsTable.tenantId, tenantId)),
      db.select({ count: count() }).from(roomsTable).where(eq(roomsTable.tenantId, tenantId)),
    ]);
    res.json({
      properties_count: props[0]?.count   ?? 0,
      guests_count:     guests[0]?.count  ?? 0,
      bookings_count:   bks[0]?.count     ?? 0,
      rooms_count:      rooms[0]?.count   ?? 0,
    });
  } catch (err) {
    req.log?.error(err, "GET /cms/live-stats");
    res.status(500).json({ error: "Failed to fetch live stats" });
  }
});

// ── GET /cms/listings-admin (admin auth) ──────────────────────────────────────
router.get("/cms/listings-admin", requireAdmin, async (req, res) => {
  const tenantId = ((req as any).sessionUser?.tenantId as number | null) ?? 1;
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
    req.log?.error(err, "GET /cms/listings-admin");
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ── Property Types ────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { slug: "hotel",      labelEn: "Hotel",      labelAr: "فندق",   icon: "building-2", color: "blue",   sortOrder: 1 },
  { slug: "apartment",  labelEn: "Apartment",  labelAr: "شقة",    icon: "home",       color: "green",  sortOrder: 2 },
  { slug: "compound",   labelEn: "Compound",   labelAr: "مجمع",   icon: "building",   color: "orange", sortOrder: 3 },
  { slug: "villa",      labelEn: "Villa",       labelAr: "فيلا",   icon: "landmark",   color: "purple", sortOrder: 4 },
  { slug: "commercial", labelEn: "Commercial", labelAr: "تجاري",  icon: "store",      color: "red",    sortOrder: 5 },
  { slug: "office",     labelEn: "Office",      labelAr: "مكتب",   icon: "briefcase",  color: "slate",  sortOrder: 6 },
];

router.get("/cms/property-types", async (req, res) => {
  const tenantId = ((req as any).sessionUser?.tenantId as number | null) ?? 1;
  try {
    let rows = await db
      .select().from(propertyCategoriesTable)
      .where(eq(propertyCategoriesTable.tenantId, tenantId))
      .orderBy(asc(propertyCategoriesTable.sortOrder));
    if (rows.length === 0) {
      rows = await db.insert(propertyCategoriesTable).values(DEFAULT_CATEGORIES.map(d => ({ ...d, tenantId }))).returning();
      rows.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    res.json({ categories: rows });
  } catch (err) {
    req.log?.error(err, "GET /cms/property-types");
    res.status(500).json({ error: "Failed to fetch property types" });
  }
});

export default router;
