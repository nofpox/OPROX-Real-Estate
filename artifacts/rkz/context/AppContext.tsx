import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Localization from "expo-localization";

import { clearAuthToken } from "@/constants/api";
import { ar, en } from "@/constants/i18n";

// Resolve the device-locale lease translation set (mirrors useLocale, but
// usable outside React components for system-generated tenant messages).
function leaseStrings() {
  const lang = Localization.getLocales()[0]?.languageCode ?? "ar";
  return (lang === "ar" ? ar : en).lease;
}

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

// ── Lease & Tenant Management (self-contained landlord tool) ───────────────
export type BillingCycle = "monthly" | "quarterly" | "annual";

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface RentPayment {
  id: string;
  dueDate: string; // yyyy-mm-dd the installment was due
  paidAt: string; // ISO timestamp recorded
  amount: number;
}

export interface Lease {
  id: string;
  tenantId: string;
  propertyId?: string; // optional link to an existing Property
  unitLabel?: string; // free-text unit / property descriptor
  rentAmount: number;
  cycle: BillingCycle;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  nextDueDate: string; // yyyy-mm-dd
  contractImageUri?: string;
  status: "active" | "ended";
  payments: RentPayment[];
  createdAt: string;
}

export interface TenantNotification {
  id: string;
  leaseId: string;
  tenantId: string;
  type: "rent_due" | "lease_expiry" | "payment_confirmed";
  message: string;
  refDate: string; // milestone date this notification refers to (dedup key)
  createdAt: string;
}

export interface LeaseAlerts {
  dueSoon: Lease[]; // rent due within DUE_WINDOW_DAYS
  expiringSoon: Lease[]; // lease ends within EXPIRY_WINDOW_DAYS
}

export const DUE_WINDOW_DAYS = 5;
export const EXPIRY_WINDOW_DAYS = 90; // 3 months

// Format a Date into a local YYYY-MM-DD string (no UTC conversion, so
// date-only values never shift a day in UTC+ locales like KSA).
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addCycle(dateStr: string, cycle: BillingCycle): string {
  const d = new Date(dateStr + "T00:00:00");
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return toLocalYmd(d);
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00").getTime();
  const today = new Date(toLocalYmd(new Date()) + "T00:00:00").getTime();
  return Math.round((target - today) / 86_400_000);
}

export type AppMode = "tourist" | "registered" | null;

interface AppState {
  user: User | null;
  properties: Property[];
  isLoading: boolean;
  appMode: AppMode;
  selectedRole: "buyer" | "seller" | "owner" | null;
  setUser: (user: User | null) => void;
  setAppMode: (mode: "tourist" | "registered") => void;
  clearAppMode: () => void;
  setSelectedRole: (r: "buyer" | "seller" | "owner") => void;
  addProperty: (property: Omit<Property, "id" | "createdAt" | "leads" | "platforms">) => Promise<Property>;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  markLeadRead: (propertyId: string, leadId: string) => void;
  unreadLeadsCount: number;
  refreshFromApi: () => Promise<void>;

  // Terms & Privacy consent
  consentGiven: boolean | null;
  acceptConsent: (userId: string | null) => void;

  // Language override
  appLang: "ar" | "en";
  setAppLang: (lang: "ar" | "en") => void;
  langChosen: boolean | null;

  // Progressive registration modal
  registerModalVisible: boolean;
  showRegister: (onSuccess?: () => void) => void;
  hideRegister: () => void;

  // Lease & Tenant Management
  tenants: Tenant[];
  leases: Lease[];
  notifications: TenantNotification[];
  addLease: (input: {
    tenant: Omit<Tenant, "id" | "createdAt">;
    propertyId?: string;
    unitLabel?: string;
    rentAmount: number;
    cycle: BillingCycle;
    startDate: string;
    endDate: string;
    contractImageUri?: string;
  }) => Lease;
  updateLease: (id: string, updates: Partial<Lease>) => void;
  deleteLease: (id: string) => void;
  markRentPaid: (leaseId: string) => void;
  leaseAlerts: LeaseAlerts;
}

export const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY   = "rozoz_state";
const ROLE_KEY      = "rozoz_user_role";
const LEASE_KEY     = "rozoz_lease_state";
const APP_MODE_KEY  = "rozoz_app_mode";
const LANG_KEY      = "rozoz_lang";
const CONSENT_KEY   = "rozoz_consent";

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
  const [appMode, setAppModeState] = useState<AppMode>(null);
  const [selectedRole, setSelectedRoleState] = useState<"buyer" | "seller" | "owner" | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [registerPendingCb, setRegisterPendingCb] = useState<(() => void) | null>(null);
  const [appLang, setAppLangState] = useState<"ar" | "en">(() => {
    const sys = Localization.getLocales()[0]?.languageCode ?? "ar";
    return sys === "ar" ? "ar" : "en";
  });
  const [langChosen, setLangChosen] = useState<boolean | null>(null);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

  const save = useCallback(async (u: User | null, props: Property[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, properties: props }));
    } catch {}
  }, []);

  const saveLease = useCallback(
    async (tn: Tenant[], ls: Lease[], nf: TenantNotification[]) => {
      try {
        await AsyncStorage.setItem(
          LEASE_KEY,
          JSON.stringify({ tenants: tn, leases: ls, notifications: nf }),
        );
      } catch {}
    },
    [],
  );

  useEffect(() => {
    async function boot() {
      // Read all 6 keys in parallel
      const [raw, savedMode, savedRole, leaseRaw, savedLang, savedConsent] = await Promise.allSettled([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(APP_MODE_KEY),
        AsyncStorage.getItem(ROLE_KEY),
        AsyncStorage.getItem(LEASE_KEY),
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(CONSENT_KEY),
      ]);

      if (raw.status === "fulfilled" && raw.value) {
        try {
          const parsed = JSON.parse(raw.value);
          if (parsed.user) setUserState(parsed.user);
          setProperties(parsed.properties?.length ? parsed.properties : SEED_PROPERTIES);
        } catch { setProperties(SEED_PROPERTIES); }
      } else {
        setProperties(SEED_PROPERTIES);
      }

      // appMode is intentionally session-only — not restored from storage.
      // Every fresh app launch starts with null → mode-select is shown.

      if (savedRole.status === "fulfilled") {
        const r = savedRole.value;
        if (r === "buyer" || r === "seller" || r === "owner") setSelectedRoleState(r);
      }

      if (savedLang.status === "fulfilled") {
        const l = savedLang.value;
        if (l === "ar" || l === "en") {
          setAppLangState(l);
          setLangChosen(true);
        } else {
          setLangChosen(false);
        }
      } else {
        setLangChosen(false);
      }

      if (savedConsent.status === "fulfilled" && savedConsent.value) {
        try {
          const c = JSON.parse(savedConsent.value) as Record<string, unknown>;
          if (c.eula_version === "v1.0" && c.eula_accepted_at) {
            setConsentGiven(true);
          } else {
            setConsentGiven(false);
          }
        } catch {
          setConsentGiven(false);
        }
      } else {
        setConsentGiven(false);
      }

      if (leaseRaw.status === "fulfilled" && leaseRaw.value) {
        try {
          const parsed = JSON.parse(leaseRaw.value);
          if (Array.isArray(parsed.tenants))       setTenants(parsed.tenants);
          if (Array.isArray(parsed.leases))        setLeases(parsed.leases);
          if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications);
        } catch {}
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

  const setAppMode = useCallback((mode: "tourist" | "registered") => {
    setAppModeState(mode);
  }, []);

  const clearAppMode = useCallback(() => {
    setAppModeState(null);
  }, []);

  const setSelectedRole = useCallback((r: "buyer" | "seller" | "owner") => {
    setSelectedRoleState(r);
    void AsyncStorage.setItem(ROLE_KEY, r);
  }, []);

  const setAppLang = useCallback((lang: "ar" | "en") => {
    setAppLangState(lang);
    setLangChosen(true);
    void AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const acceptConsent = useCallback((userId: string | null) => {
    setConsentGiven(true);
    void AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
      user_id:          userId,
      eula_accepted_at: new Date().toISOString(),
      eula_version:     "v1.0",
    }));
  }, []);

  const refreshFromApi = useCallback(async () => {
    // Standalone mode — no remote refresh
  }, []);

  const showRegister = useCallback((onSuccess?: () => void) => {
    setRegisterPendingCb(onSuccess ? () => onSuccess : null);
    setRegisterModalVisible(true);
  }, []);

  const hideRegister = useCallback(() => {
    setRegisterModalVisible(false);
    setRegisterPendingCb(null);
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

  const addLease = useCallback<AppState["addLease"]>(
    (input) => {
      const now = new Date().toISOString();
      const tenant: Tenant = {
        ...input.tenant,
        id: generateId(),
        createdAt: now,
      };
      const lease: Lease = {
        id: generateId(),
        tenantId: tenant.id,
        propertyId: input.propertyId,
        unitLabel: input.unitLabel,
        rentAmount: input.rentAmount,
        cycle: input.cycle,
        startDate: input.startDate,
        endDate: input.endDate,
        nextDueDate: addCycle(input.startDate, input.cycle),
        contractImageUri: input.contractImageUri,
        status: "active",
        payments: [],
        createdAt: now,
      };
      setTenants((prevT) => {
        const nextT = [tenant, ...prevT];
        setLeases((prevL) => {
          const nextL = [lease, ...prevL];
          saveLease(nextT, nextL, notifications);
          return nextL;
        });
        return nextT;
      });
      return lease;
    },
    [notifications, saveLease],
  );

  const updateLease = useCallback(
    (id: string, updates: Partial<Lease>) => {
      setLeases((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
        saveLease(tenants, next, notifications);
        return next;
      });
    },
    [tenants, notifications, saveLease],
  );

  const deleteLease = useCallback(
    (id: string) => {
      setLeases((prevL) => {
        const target = prevL.find((l) => l.id === id);
        const nextL = prevL.filter((l) => l.id !== id);
        const nextN = notifications.filter((n) => n.leaseId !== id);
        setNotifications(nextN);
        if (target) {
          setTenants((prevT) => {
            const nextT = prevT.filter((tn) => tn.id !== target.tenantId);
            saveLease(nextT, nextL, nextN);
            return nextT;
          });
        } else {
          saveLease(tenants, nextL, nextN);
        }
        return nextL;
      });
    },
    [tenants, notifications, saveLease],
  );

  const markRentPaid = useCallback(
    (leaseId: string) => {
      setLeases((prevL) => {
        let confirmation: TenantNotification | null = null;
        const nextL = prevL.map((l) => {
          if (l.id !== leaseId) return l;
          const payment: RentPayment = {
            id: generateId(),
            dueDate: l.nextDueDate,
            paidAt: new Date().toISOString(),
            amount: l.rentAmount,
          };
          confirmation = {
            id: generateId(),
            leaseId: l.id,
            tenantId: l.tenantId,
            type: "payment_confirmed",
            message: leaseStrings().notifyPaidMsg(l.rentAmount.toLocaleString("en-US"), l.nextDueDate),
            refDate: l.nextDueDate,
            createdAt: new Date().toISOString(),
          };
          return {
            ...l,
            payments: [payment, ...l.payments],
            nextDueDate: addCycle(l.nextDueDate, l.cycle),
          };
        });
        const nextN = confirmation ? [confirmation, ...notifications] : notifications;
        if (confirmation) setNotifications(nextN);
        saveLease(tenants, nextL, nextN);
        return nextL;
      });
    },
    [tenants, notifications, saveLease],
  );

  // Auto-generate tenant notifications for upcoming rent-due and lease-expiry
  // milestones. Runs whenever leases change. Deduped by leaseId+type+refDate.
  useEffect(() => {
    if (isLoading) return;
    const active = leases.filter((l) => l.status === "active");
    const generated: TenantNotification[] = [];
    const has = (leaseId: string, type: TenantNotification["type"], refDate: string) =>
      notifications.some(
        (n) => n.leaseId === leaseId && n.type === type && n.refDate === refDate,
      ) || generated.some((n) => n.leaseId === leaseId && n.type === type && n.refDate === refDate);

    for (const l of active) {
      const tenant = tenants.find((tn) => tn.id === l.tenantId);
      const dueIn = daysUntil(l.nextDueDate);
      if (dueIn >= 0 && dueIn <= DUE_WINDOW_DAYS && !has(l.id, "rent_due", l.nextDueDate)) {
        generated.push({
          id: generateId(),
          leaseId: l.id,
          tenantId: l.tenantId,
          type: "rent_due",
          message: leaseStrings().notifyDueMsg(
            tenant?.name ?? leaseStrings().tenantFallback,
            l.rentAmount.toLocaleString("en-US"),
            dueIn,
            l.nextDueDate,
          ),
          refDate: l.nextDueDate,
          createdAt: new Date().toISOString(),
        });
      }
      const expiresIn = daysUntil(l.endDate);
      if (expiresIn >= 0 && expiresIn <= EXPIRY_WINDOW_DAYS && !has(l.id, "lease_expiry", l.endDate)) {
        generated.push({
          id: generateId(),
          leaseId: l.id,
          tenantId: l.tenantId,
          type: "lease_expiry",
          message: leaseStrings().notifyExpiryMsg(
            tenant?.name ?? leaseStrings().tenantFallback,
            expiresIn,
            l.endDate,
          ),
          refDate: l.endDate,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (generated.length > 0) {
      setNotifications((prev) => {
        const next = [...generated, ...prev];
        saveLease(tenants, leases, next);
        return next;
      });
    }
  }, [leases, tenants, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const leaseAlerts = useMemo<LeaseAlerts>(() => ({
    dueSoon: leases.filter((l) => {
      if (l.status !== "active") return false;
      const d = daysUntil(l.nextDueDate);
      return d >= 0 && d <= DUE_WINDOW_DAYS;
    }),
    expiringSoon: leases.filter((l) => {
      if (l.status !== "active") return false;
      const d = daysUntil(l.endDate);
      return d >= 0 && d <= EXPIRY_WINDOW_DAYS;
    }),
  }), [leases]);

  const unreadLeadsCount = useMemo(
    () => properties.reduce((acc, p) => acc + p.leads.filter((l) => !l.read).length, 0),
    [properties],
  );

  const ctxValue = useMemo<AppState>(() => ({
    user,
    properties,
    isLoading,
    appMode,
    selectedRole,
    setUser,
    setAppMode,
    clearAppMode,
    setSelectedRole,
    addProperty,
    updateProperty,
    deleteProperty,
    markLeadRead,
    unreadLeadsCount,
    refreshFromApi,
    appLang,
    setAppLang,
    langChosen,
    consentGiven,
    acceptConsent,
    registerModalVisible,
    showRegister,
    hideRegister,
    tenants,
    leases,
    notifications,
    addLease,
    updateLease,
    deleteLease,
    markRentPaid,
    leaseAlerts,
    _registerPendingCb: registerPendingCb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any, [ // eslint-disable-line react-hooks/exhaustive-deps
    user, properties, isLoading, appMode, selectedRole,
    setUser, setAppMode, clearAppMode, setSelectedRole,
    addProperty, updateProperty, deleteProperty, markLeadRead,
    unreadLeadsCount, refreshFromApi,
    appLang, setAppLang, langChosen, consentGiven, acceptConsent,
    registerModalVisible, showRegister, hideRegister, registerPendingCb,
    tenants, leases, notifications,
    addLease, updateLease, deleteLease, markRentPaid,
    leaseAlerts,
  ]);

  return (
    <AppContext.Provider value={ctxValue}>
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
