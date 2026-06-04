import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Router } from "express";

const CONFIG_FILE = join(process.cwd(), "rkz-app-config.json");

export interface PropertyTypeConfig {
  id: string;
  labelAr: string;
  labelEn: string;
}

export interface FeatureItem {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface RkzConfig {
  branding: {
    appName: string;
    logoUrl: string | null;
    primaryColor: string;
    navyColor: string;
    backgroundColor: string;
  };
  content: {
    welcomeTaglineAr: string;
    welcomeTaglineEn: string;
    welcomeHeadlineAr: string;
    welcomeHeadlineEn: string;
    welcomeCtaAr: string;
    welcomeCtaEn: string;
    features: FeatureItem[];
  };
  platforms: {
    aqar: boolean;
    bayut: boolean;
    wasalt: boolean;
    property_finder: boolean;
  };
  propertyTypes: PropertyTypeConfig[];
  admin: {
    pin: string;
  };
}

const DEFAULT_CONFIG: RkzConfig = {
  branding: {
    appName: "RKZ",
    logoUrl: null,
    primaryColor: "#D4A843",
    navyColor: "#0A1628",
    backgroundColor: "#F5F7FA",
  },
  content: {
    welcomeTaglineAr: "محرك النشر العقاري الفوري",
    welcomeTaglineEn: "Instant Real Estate Publishing Engine",
    welcomeHeadlineAr: 'أهلاً بك في "ركز".. نحن وكيلك الحصري!',
    welcomeHeadlineEn: 'Welcome to "Rkz" — Your Exclusive Digital Agent!',
    welcomeCtaAr: "لنبدأ الآن",
    welcomeCtaEn: "Let's Get Started",
    features: [
      { titleAr: "النشر التلقائي", titleEn: "Auto-Publishing", bodyAr: "نضمن ظهور عقارك في كافة المنصات العقارية الكبرى.", bodyEn: "We guarantee your property appears on all major real estate platforms." },
      { titleAr: "التفاوض والاتفاق", titleEn: "Negotiation & Closing", bodyAr: "فريقنا يتولى ذلك بمهارة عالية؛ نحن نرد على الجميع ونفاوض نيابة عنك لنحقق لك أفضل صفقة.", bodyEn: "Our expert team handles it all — we respond and negotiate on your behalf to get you the best deal." },
      { titleAr: "راحة بال تامة", titleEn: "Complete Peace of Mind", bodyAr: "لن يصلك أي اتصال من طرف ثالث، ولن يزعجك أحد؛ نحن الدرع الذي يحمي خصوصيتك.", bodyEn: "No third-party calls, no interruptions — we're the shield that protects your privacy." },
      { titleAr: "الإدارة الذكية", titleEn: "Smart Management", bodyAr: "تابع كافة الاستفسارات وتحديث حالة عقارك في مكان واحد وبكل سهولة.", bodyEn: "Track all inquiries and your property status in one place, effortlessly." },
    ],
  },
  platforms: {
    aqar: true,
    bayut: true,
    wasalt: true,
    property_finder: true,
  },
  propertyTypes: [
    { id: "villa",      labelAr: "فيلا",          labelEn: "Villa" },
    { id: "apartment",  labelAr: "شقة",            labelEn: "Apartment" },
    { id: "land",       labelAr: "أرض",            labelEn: "Land" },
    { id: "commercial", labelAr: "عقار تجاري",     labelEn: "Commercial" },
    { id: "compound",   labelAr: "مجمع سكني",      labelEn: "Compound" },
    { id: "floor",      labelAr: "دور",            labelEn: "Floor" },
    { id: "warehouse",  labelAr: "مستودع",         labelEn: "Warehouse" },
    { id: "farm",       labelAr: "مزرعة",          labelEn: "Farm" },
    { id: "rest_house", labelAr: "استراحة",        labelEn: "Rest House" },
    { id: "palace",     labelAr: "قصر",            labelEn: "Palace" },
  ],
  admin: {
    pin: "1234",
  },
};

function deepMerge(base: RkzConfig, patch: Partial<RkzConfig>): RkzConfig {
  return {
    branding: { ...base.branding, ...(patch.branding ?? {}) },
    content: { ...base.content, ...(patch.content ?? {}) },
    platforms: { ...base.platforms, ...(patch.platforms ?? {}) },
    propertyTypes: patch.propertyTypes ?? base.propertyTypes,
    admin: { ...base.admin, ...(patch.admin ?? {}) },
  };
}

function loadConfig(): RkzConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      return deepMerge(DEFAULT_CONFIG, JSON.parse(raw) as Partial<RkzConfig>);
    }
  } catch {
    // Fall through to default
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: RkzConfig): void {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    throw new Error(`Failed to persist config: ${String(err)}`);
  }
}

// In-memory cache — loaded once at startup
let currentConfig: RkzConfig = loadConfig();

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /rkz/config  — public, returns safe config (no admin.pin)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rkz/config", (_req, res) => {
  const { admin: _admin, ...safe } = currentConfig;
  res.json(safe);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/admin/verify-pin  — verify admin PIN without making changes
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/admin/verify-pin", (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin || pin !== currentConfig.admin.pin) {
    res.json({ valid: false });
    return;
  }
  res.json({ valid: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /rkz/admin/config  — PIN-protected update
// Body: { pin: string; updates: Partial<RkzConfig> }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/rkz/admin/config", (req, res) => {
  const { pin, updates } = req.body as { pin?: string; updates?: Partial<RkzConfig> };

  if (!pin || pin !== currentConfig.admin.pin) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  if (!updates || typeof updates !== "object") {
    res.status(400).json({ error: "updates object is required" });
    return;
  }

  try {
    currentConfig = deepMerge(currentConfig, updates);
    saveConfig(currentConfig);
  } catch (err) {
    req.log.error({ err }, "rkz-config: save failed");
    res.status(500).json({ error: "Config save failed" });
    return;
  }

  const { admin: _admin, ...safe } = currentConfig;
  res.json(safe);
});

export { currentConfig as rkzCurrentConfig };
export default router;
