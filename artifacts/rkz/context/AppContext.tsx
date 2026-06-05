import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearAuthToken } from "@/constants/api";

export type PropertyType = string;
export type Platform = string;

export type ListingStatus =
  | "draft"
  | "publishing"
  | "published"
  | "failed"
  | "expired";

export interface PlatformStatus {
  platform: Platform;
  status: ListingStatus;
  url?: string;
  listingId?: string;
  publishedAt?: string;
  views?: number;
  leads?: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  platform: Platform;
  message?: string;
  createdAt: string;
  read: boolean;
}

export interface Property {
  id: string;
  type: PropertyType;
  price: number;
  currency: "SAR";
  location: {
    address: string;
    city: string;
    district?: string;
    lat?: number;
    lng?: number;
  };
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  photos: string[];
  platforms: PlatformStatus[];
  leads: Lead[];
  publishedAt?: string;
  createdAt: string;
  title?: string;
}

export interface User {
  phone: string;
  name?: string;
  email?: string;
  authorized: boolean;
}

interface AppState {
  user: User | null;
  properties: Property[];
  isLoading: boolean;
  setUser: (user: User | null) => void;
  addProperty: (property: Omit<Property, "id" | "createdAt" | "leads" | "platforms">) => Promise<Property>;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  markLeadRead: (propertyId: string, leadId: string) => void;
  unreadLeadsCount: number;
  refreshFromApi: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = "rkz_state";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const DEMO_PLATFORMS: Platform[] = ["aqar", "bayut", "wasalt", "property_finder"];

function buildPlatformStatuses(status: ListingStatus = "published"): PlatformStatus[] {
  return DEMO_PLATFORMS.map((p) => ({
    platform: p,
    status,
    listingId: generateId(),
    publishedAt: status === "published" ? new Date().toISOString() : undefined,
    views: status === "published" ? Math.floor(Math.random() * 400 + 50) : 0,
    leads: status === "published" ? Math.floor(Math.random() * 12) : 0,
  }));
}

const SEED_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    type: "villa",
    title: "فيلا فاخرة - النرجس",
    price: 2_850_000,
    currency: "SAR",
    location: { address: "حي النرجس", city: "الرياض", district: "النرجس" },
    area: 450,
    bedrooms: 6,
    bathrooms: 7,
    photos: [],
    platforms: buildPlatformStatuses("published"),
    leads: [
      { id: "l1", name: "أحمد محمد", phone: "+966501234567", platform: "aqar", createdAt: new Date(Date.now() - 3600_000).toISOString(), read: false },
      { id: "l2", name: "خالد العتيبي", phone: "+966509876543", platform: "bayut", createdAt: new Date(Date.now() - 7200_000).toISOString(), read: true },
    ],
    publishedAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
  },
  {
    id: "prop-2",
    type: "apartment",
    title: "شقة - حي الملقا",
    price: 680_000,
    currency: "SAR",
    location: { address: "حي الملقا", city: "الرياض", district: "الملقا" },
    area: 180,
    bedrooms: 3,
    bathrooms: 3,
    photos: [],
    platforms: buildPlatformStatuses("published"),
    leads: [
      { id: "l3", name: "سعد الغامدي", phone: "+966551122334", platform: "wasalt", createdAt: new Date(Date.now() - 1800_000).toISOString(), read: false },
    ],
    publishedAt: new Date(Date.now() - 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: "prop-3",
    type: "land",
    title: "أرض تجارية - طريق الملك فهد",
    price: 4_200_000,
    currency: "SAR",
    location: { address: "طريق الملك فهد", city: "الرياض", district: "العليا" },
    area: 800,
    photos: [],
    platforms: buildPlatformStatuses("publishing"),
    leads: [],
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const save = useCallback(async (u: User | null, props: Property[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, properties: props }));
    } catch {}
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.user) setUserState(parsed.user);
          if (parsed.properties?.length) {
            setProperties(parsed.properties);
          } else {
            setProperties(SEED_PROPERTIES);
          }
        } else {
          setProperties(SEED_PROPERTIES);
        }
      } catch {
        setProperties(SEED_PROPERTIES);
      }
      setIsLoading(false);
    }
    void boot();
  }, []);

  const setUser = useCallback(
    (u: User | null) => {
      if (!u) {
        void clearAuthToken();
        setUserState(null);
        setProperties(SEED_PROPERTIES);
        save(null, SEED_PROPERTIES);
        return;
      }
      setUserState(u);
      setProperties((p) => { save(u, p); return p; });
    },
    [save]
  );

  const refreshFromApi = useCallback(async () => {
    // Standalone mode — no remote refresh
  }, []);

  const addProperty = useCallback(
    async (data: Omit<Property, "id" | "createdAt" | "leads" | "platforms">) => {
      const localId = generateId();
      const newProp: Property = {
        ...data,
        id: localId,
        createdAt: new Date().toISOString(),
        leads: [],
        platforms: buildPlatformStatuses("publishing"),
      };

      setProperties((prev) => { const next = [newProp, ...prev]; save(user, next); return next; });

      setTimeout(() => {
        setProperties((prev) => {
          const next = prev.map((p) =>
            p.id === localId
              ? { ...p, publishedAt: new Date().toISOString(), platforms: buildPlatformStatuses("published") }
              : p
          );
          save(user, next);
          return next;
        });
      }, 3000);

      return newProp;
    },
    [user, save]
  );

  const updateProperty = useCallback(
    (id: string, updates: Partial<Property>) => {
      setProperties((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        save(user, next);
        return next;
      });
    },
    [user, save]
  );

  const deleteProperty = useCallback(
    (id: string) => {
      setProperties((prev) => {
        const next = prev.filter((p) => p.id !== id);
        save(user, next);
        return next;
      });
    },
    [user, save]
  );

  const markLeadRead = useCallback(
    (propertyId: string, leadId: string) => {
      setProperties((prev) => {
        const next = prev.map((p) =>
          p.id === propertyId
            ? { ...p, leads: p.leads.map((l) => (l.id === leadId ? { ...l, read: true } : l)) }
            : p
        );
        save(user, next);
        return next;
      });
    },
    [user, save]
  );

  const unreadLeadsCount = properties.reduce(
    (acc, p) => acc + p.leads.filter((l) => !l.read).length,
    0
  );

  return (
    <AppContext.Provider
      value={{
        user,
        properties,
        isLoading,
        setUser,
        addProperty,
        updateProperty,
        deleteProperty,
        markLeadRead,
        unreadLeadsCount,
        refreshFromApi,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  aqar: "عقار",
  bayut: "بيوت",
  wasalt: "وصلت",
  property_finder: "Property Finder",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  aqar: "#2563EB",
  bayut: "#7C3AED",
  wasalt: "#059669",
  property_finder: "#D97706",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  villa: "فيلا",
  apartment: "شقة",
  land: "أرض",
  commercial: "تجاري",
  compound: "مجمع",
  floor: "دور",
  warehouse: "مستودع",
  farm: "مزرعة",
  rest_house: "استراحة",
  palace: "قصر",
};

export const PROPERTY_TYPE_ICONS: Record<string, string> = {
  villa: "home",
  apartment: "business",
  land: "map",
  commercial: "storefront",
  compound: "location-city",
  floor: "layers",
  warehouse: "warehouse",
  farm: "grass",
  rest_house: "weekend",
  palace: "castle",
};
