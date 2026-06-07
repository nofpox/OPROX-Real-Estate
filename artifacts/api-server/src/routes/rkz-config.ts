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

export interface PlatformConfig {
  id: string;
  labelAr: string;
  labelEn: string;
  enabled: boolean;
  color: string;
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
  platforms: PlatformConfig[];
  propertyTypes: PropertyTypeConfig[];
  admin: {
    pin: string;
  };
}

const DEFAULT_CONFIG: RkzConfig = {
  branding: {
    appName: "Rozoz",
    logoUrl: null,
    primaryColor: "#D4A843",
    navyColor: "#0A1628",
    backgroundColor: "#F5F7FA",
  },
  content: {
    welcomeTaglineAr: "محرك النشر العقاري الفوري",
    welcomeTaglineEn: "Instant Real Estate Publishing Engine",
    welcomeHeadlineAr: 'أهلاً بك في "روزوز".. نحن وكيلك الحصري!',
    welcomeHeadlineEn: 'Welcome to "Rozoz" — Your Exclusive Digital Agent!',
    welcomeCtaAr: "لنبدأ الآن",
    welcomeCtaEn: "Let's Get Started",
    features: [
      { titleAr: "النشر التلقائي", titleEn: "Auto-Publishing", bodyAr: "نضمن ظهور عقارك في كافة المنصات العقارية الكبرى.", bodyEn: "We guarantee your property appears on all major real estate platforms." },
      { titleAr: "التفاوض والاتفاق", titleEn: "Negotiation & Closing", bodyAr: "فريقنا يتولى ذلك بمهارة عالية؛ نحن نرد على الجميع ونفاوض نيابة عنك لنحقق لك أفضل صفقة.", bodyEn: "Our expert team handles it all — we respond and negotiate on your behalf to get you the best deal." },
      { titleAr: "راحة بال تامة", titleEn: "Complete Peace of Mind", bodyAr: "لن يصلك أي اتصال من طرف ثالث، ولن يزعجك أحد؛ نحن الدرع الذي يحمي خصوصيتك.", bodyEn: "No third-party calls, no interruptions — we're the shield that protects your privacy." },
      { titleAr: "الإدارة الذكية", titleEn: "Smart Management", bodyAr: "تابع كافة الاستفسارات وتحديث حالة عقارك في مكان واحد وبكل سهولة.", bodyEn: "Track all inquiries and your property status in one place, effortlessly." },
    ],
  },
  platforms: [
    { id: "aqar",            labelAr: "عقار",            labelEn: "Aqar",            enabled: true, color: "#2563EB" },
    { id: "bayut",           labelAr: "بيوت",            labelEn: "Bayut",           enabled: true, color: "#7C3AED" },
    { id: "wasalt",          labelAr: "وصلت",            labelEn: "Wasalt",          enabled: true, color: "#059669" },
    { id: "property_finder", labelAr: "بروبرتي فايندر", labelEn: "Property Finder", enabled: true, color: "#D97706" },
  ],
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
    pin: "12345678",
  },
};

function deepMerge(base: RkzConfig, patch: Partial<RkzConfig>): RkzConfig {
  return {
    branding: { ...base.branding, ...(patch.branding ?? {}) },
    content: { ...base.content, ...(patch.content ?? {}) },
    platforms: patch.platforms ?? base.platforms,
    propertyTypes: patch.propertyTypes ?? base.propertyTypes,
    admin: { ...base.admin, ...(patch.admin ?? {}) },
  };
}

function loadConfig(): RkzConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<RkzConfig>;
      // Migrate old platforms object format to array
      if (parsed.platforms && !Array.isArray(parsed.platforms)) {
        const old = parsed.platforms as unknown as Record<string, boolean>;
        parsed.platforms = DEFAULT_CONFIG.platforms.map((p) => ({
          ...p,
          enabled: old[p.id] ?? p.enabled,
        }));
      }
      return deepMerge(DEFAULT_CONFIG, parsed);
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

// In-memory rate-limit for PIN attempts  { ip -> { count, lockedUntil } }
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

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
  const ip = req.ip ?? "unknown";
  const { pin } = req.body as { pin?: string };

  const record = pinAttempts.get(ip);
  const now = Date.now();

  if (record && record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    res.status(429).json({ valid: false, locked: true, minutesLeft });
    return;
  }

  if (!pin || pin !== currentConfig.admin.pin) {
    const current = record ?? { count: 0, lockedUntil: 0 };
    const newCount = current.count + 1;
    const lockedUntil = newCount >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    pinAttempts.set(ip, { count: newCount, lockedUntil });
    if (lockedUntil > 0) {
      res.status(429).json({ valid: false, locked: true, minutesLeft: 30 });
    } else {
      res.json({ valid: false, locked: false, attemptsLeft: MAX_ATTEMPTS - newCount });
    }
    return;
  }

  // Success — clear attempt record
  pinAttempts.delete(ip);
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
