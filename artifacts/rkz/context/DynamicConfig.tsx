import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { API_BASE } from "@/constants/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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

export interface AppConfig {
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
}

export const DEFAULT_CONFIG: AppConfig = {
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
};

interface ConfigContextValue {
  config: AppConfig;
  isLoaded: boolean;
  /** Apply changes locally for live preview (not persisted) */
  applyLocally: (updates: Partial<AppConfig>) => void;
  /** Save snapshot so rollbackAdmin() can restore it */
  beginAdminSession: () => void;
  /** Restore the snapshot taken by beginAdminSession() */
  rollbackAdmin: () => void;
  /** Check PIN against server */
  verifyPin: (pin: string) => Promise<boolean>;
  /** Persist changes to server (requires PIN) */
  updateConfig: (pin: string, updates: Partial<AppConfig>) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context — default value used before provider mounts
// ─────────────────────────────────────────────────────────────────────────────
const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  isLoaded: false,
  applyLocally: () => {},
  beginAdminSession: () => {},
  rollbackAdmin: () => {},
  verifyPin: async () => false,
  updateConfig: async () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_KEY = "rkz_app_config_v2";

function deepMerge(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    branding: { ...base.branding, ...(patch.branding ?? {}) },
    content: { ...base.content, ...(patch.content ?? {}) },
    platforms: { ...base.platforms, ...(patch.platforms ?? {}) },
    propertyTypes: patch.propertyTypes ?? base.propertyTypes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const snapshotRef = useRef<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    // 1. Try cache first — instantaneous, works offline
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<AppConfig>;
        setConfig((prev) => deepMerge(prev, parsed));
      }
    } catch {}

    // 2. Authoritative fetch from server
    try {
      const res = await fetch(`${API_BASE}/rkz/config`);
      if (res.ok) {
        const remote = await res.json() as Partial<AppConfig>;
        setConfig((prev) => deepMerge(prev, remote));
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      }
    } catch {}

    setIsLoaded(true);
  }

  const applyLocally = useCallback((updates: Partial<AppConfig>) => {
    setConfig((prev) => deepMerge(prev, updates));
  }, []);

  const beginAdminSession = useCallback(() => {
    setConfig((current) => {
      snapshotRef.current = deepMerge(DEFAULT_CONFIG, current);
      return current;
    });
  }, []);

  const rollbackAdmin = useCallback(() => {
    setConfig(snapshotRef.current);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/rkz/admin/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json() as { valid: boolean };
      return data.valid === true;
    } catch {
      return false;
    }
  }, []);

  const updateConfig = useCallback(
    async (pin: string, updates: Partial<AppConfig>): Promise<void> => {
      const res = await fetch(`${API_BASE}/rkz/admin/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, updates }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? "Save failed");
      }
      const updated = await res.json() as Partial<AppConfig>;
      setConfig((prev) => deepMerge(prev, updated));
      // Update AsyncStorage cache
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {}
    },
    []
  );

  return (
    <ConfigContext.Provider
      value={{
        config,
        isLoaded,
        applyLocally,
        beginAdminSession,
        rollbackAdmin,
        verifyPin,
        updateConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
