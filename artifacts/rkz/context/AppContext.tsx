import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  API_BASE,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  clearAuthToken,
  getAuthToken,
} from "@/constants/api";

export type PropertyType = string;

export type Platform = "aqar" | "bayut" | "wasalt" | "property_finder";

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
  id: string;          // local string; numeric string = API-backed (e.g. "12")
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

interface ApiListing {
  id: number;
  type: string;
  price: number;
  currency: string;
  city: string;
  district?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  title?: string | null;
  photos: string[];
  platforms: PlatformStatus[];
  status: string;
  publishedAt?: string | null;
  createdAt: string;
  leads?: Lead[];
}

function mapApiToProperty(row: ApiListing): Property {
  return {
    id: String(row.id),
    type: row.type as PropertyType,
    price: Number(row.price),
    currency: "SAR",
    location: {
      address: row.address ?? "",
      city: row.city,
      district: row.district ?? undefined,
      lat: row.lat != null ? Number(row.lat) : undefined,
      lng: row.lng != null ? Number(row.lng) : undefined,
    },
    area: row.area != null ? Number(row.area) : undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    photos: Array.isArray(row.photos) ? row.photos : [],
    platforms: Array.isArray(row.platforms) ? row.platforms : buildPlatformStatuses(row.status as ListingStatus),
    leads: row.leads ?? [],
    publishedAt: row.publishedAt ?? undefined,
    createdAt: row.createdAt,
    title: row.title ?? undefined,
  };
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
  const apiEnabledRef = useRef(false);

  // ── Persist to AsyncStorage ──────────────────────────────────────────────
  const save = useCallback(async (u: User | null, props: Property[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, properties: props }));
    } catch {}
  }, []);

  // ── Fetch from API and update state ─────────────────────────────────────
  const refreshFromApi = useCallback(async () => {
    try {
      const rows = await apiGet<ApiListing[]>("/rkz/listings");
      const apiProps = rows.map(mapApiToProperty);
      setProperties(apiProps);
      setUserState((u) => {
        save(u, apiProps);
        return u;
      });
    } catch {
      // API unavailable — keep local state
    }
  }, [save]);

  // ── Boot: load from AsyncStorage then refresh from API if authed ─────────
  useEffect(() => {
    async function boot() {
      try {
        const [raw, token] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          getAuthToken(),
        ]);

        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.user) setUserState(parsed.user);
          if (parsed.properties?.length) {
            setProperties(parsed.properties);
          } else {
            setProperties(token ? [] : SEED_PROPERTIES);
          }
        } else {
          setProperties(token ? [] : SEED_PROPERTIES);
        }

        if (token) {
          apiEnabledRef.current = true;
          // Validate token and refresh listings in background
          try {
            const [meRes, listingsRes] = await Promise.all([
              fetch(`${API_BASE}/rkz/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
              fetch(`${API_BASE}/rkz/listings`,  { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (meRes.ok) {
              const me = await meRes.json() as { phone: string; name?: string; email?: string; authorized: boolean };
              setUserState({ phone: me.phone, name: me.name, email: me.email, authorized: me.authorized });
            }
            if (listingsRes.ok) {
              const rows = await listingsRes.json() as ApiListing[];
              const apiProps = rows.map(mapApiToProperty);
              setProperties(apiProps);
              setUserState((u) => { save(u, apiProps); return u; });
            }
          } catch {}
        }
      } catch {}
      setIsLoading(false);
    }
    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── setUser — also handles logout (null) ────────────────────────────────
  const setUser = useCallback(
    (u: User | null) => {
      if (!u) {
        apiEnabledRef.current = false;
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

  // ── addProperty ─────────────────────────────────────────────────────────
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

      // Optimistic local update
      setProperties((prev) => { const next = [newProp, ...prev]; save(user, next); return next; });

      if (apiEnabledRef.current) {
        try {
          const created = await apiPost<ApiListing>("/rkz/listings", {
            type:        data.type,
            price:       data.price,
            currency:    data.currency,
            city:        data.location.city,
            district:    data.location.district,
            address:     data.location.address,
            lat:         data.location.lat,
            lng:         data.location.lng,
            area:        data.area,
            bedrooms:    data.bedrooms,
            bathrooms:   data.bathrooms,
            title:       data.title,
            photos:      data.photos,
          });
          const apiProp = mapApiToProperty(created);
          // Replace the local-ID placeholder with the API-backed record
          setProperties((prev) => {
            const next = prev.map((p) => (p.id === localId ? apiProp : p));
            save(user, next);
            return next;
          });
          // Simulate publish completion
          setTimeout(() => {
            setProperties((prev) => {
              const next = prev.map((p) =>
                p.id === apiProp.id
                  ? { ...p, publishedAt: new Date().toISOString(), platforms: buildPlatformStatuses("published") }
                  : p
              );
              save(user, next);
              return next;
            });
          }, 3500);
          return apiProp;
        } catch {
          // API failed — keep local version, still do local publish simulation
        }
      }

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

  // ── updateProperty ───────────────────────────────────────────────────────
  const updateProperty = useCallback(
    (id: string, updates: Partial<Property>) => {
      setProperties((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        save(user, next);
        return next;
      });
      if (apiEnabledRef.current && /^\d+$/.test(id)) {
        const apiPayload: Record<string, unknown> = {};
        if (updates.type !== undefined)        apiPayload.type        = updates.type;
        if (updates.price !== undefined)       apiPayload.price       = updates.price;
        if (updates.area !== undefined)        apiPayload.area        = updates.area;
        if (updates.bedrooms !== undefined)    apiPayload.bedrooms    = updates.bedrooms;
        if (updates.bathrooms !== undefined)   apiPayload.bathrooms   = updates.bathrooms;
        if (updates.title !== undefined)       apiPayload.title       = updates.title;
        if (updates.photos !== undefined)      apiPayload.photos      = updates.photos;
        if (updates.platforms !== undefined)   apiPayload.platforms   = updates.platforms;
        if (updates.location) {
          if (updates.location.city)     apiPayload.city     = updates.location.city;
          if (updates.location.district) apiPayload.district = updates.location.district;
          if (updates.location.address)  apiPayload.address  = updates.location.address;
          if (updates.location.lat)      apiPayload.lat      = updates.location.lat;
          if (updates.location.lng)      apiPayload.lng      = updates.location.lng;
        }
        apiPatch(`/rkz/listings/${id}`, apiPayload).catch(() => {});
      }
    },
    [user, save]
  );

  // ── deleteProperty ───────────────────────────────────────────────────────
  const deleteProperty = useCallback(
    (id: string) => {
      setProperties((prev) => {
        const next = prev.filter((p) => p.id !== id);
        save(user, next);
        return next;
      });
      if (apiEnabledRef.current && /^\d+$/.test(id)) {
        apiDelete(`/rkz/listings/${id}`).catch(() => {});
      }
    },
    [user, save]
  );

  // ── markLeadRead ─────────────────────────────────────────────────────────
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
