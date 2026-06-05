import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  platforms: PlatformConfig[];
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
  platforms: [
    { id: "aqar",            labelAr: "عقار",             labelEn: "Aqar",            enabled: true,  color: "#2563EB" },
    { id: "bayut",           labelAr: "بيوت",             labelEn: "Bayut",           enabled: true,  color: "#7C3AED" },
    { id: "wasalt",          labelAr: "وصلت",             labelEn: "Wasalt",          enabled: true,  color: "#059669" },
    { id: "property_finder", labelAr: "بروبرتي فايندر",  labelEn: "Property Finder", enabled: true,  color: "#D97706" },
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
};

export interface PinResult {
  valid: boolean;
  locked?: boolean;
  minutesLeft?: number;
  attemptsLeft?: number;
}

interface ConfigContextValue {
  config: AppConfig;
  isLoaded: boolean;
  applyLocally: (updates: Partial<AppConfig>) => void;
  beginAdminSession: () => void;
  rollbackAdmin: () => void;
  verifyPin: (pin: string) => Promise<PinResult>;
  updateConfig: (pin: string, updates: Partial<AppConfig>) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  isLoaded: false,
  applyLocally: () => {},
  beginAdminSession: () => {},
  rollbackAdmin: () => {},
  verifyPin: async () => ({ valid: false }),
  updateConfig: async () => {},
});

const CACHE_KEY = "rkz_app_config_v3";
const PIN_KEY = "rkz_admin_pin";
const DEFAULT_PIN = "1234";

function deepMerge(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    branding: { ...base.branding, ...(patch.branding ?? {}) },
    content: { ...base.content, ...(patch.content ?? {}) },
    platforms: patch.platforms ?? base.platforms,
    propertyTypes: patch.propertyTypes ?? base.propertyTypes,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const snapshotRef = useRef<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<AppConfig>;
        setConfig((prev) => deepMerge(prev, parsed));
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

  const verifyPin = useCallback(async (pin: string): Promise<PinResult> => {
    try {
      const storedPin = await AsyncStorage.getItem(PIN_KEY) ?? DEFAULT_PIN;
      if (pin === storedPin) {
        return { valid: true };
      }
      return { valid: false, attemptsLeft: 3 };
    } catch {
      return { valid: false };
    }
  }, []);

  const updateConfig = useCallback(
    async (pin: string, updates: Partial<AppConfig>): Promise<void> => {
      const storedPin = await AsyncStorage.getItem(PIN_KEY) ?? DEFAULT_PIN;
      if (pin !== storedPin) {
        throw new Error("Invalid PIN");
      }
      setConfig((prev) => {
        const merged = deepMerge(prev, updates);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updates)).catch(() => {});
        return merged;
      });
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
