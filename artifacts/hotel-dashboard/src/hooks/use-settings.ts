import { useGetSettings } from "@workspace/api-client-react";
import type { NavConfigItem, PermissionMatrix } from "@workspace/api-client-react";
import branding from "@/config/branding";
import { type BusinessMode } from "@/config/modules";

export type { BusinessMode };
export type { NavConfigItem, PermissionMatrix };

export type AppSettings = {
  propertyName: string;
  logoText: string;
  logoSub: string;
  logoUrl: string;
  businessMode: BusinessMode;
  enabledModules: string[];
  navConfig: NavConfigItem[];
  permissionMatrix: PermissionMatrix;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
};

const DEFAULT_MODULES = ["bookings", "maintenance", "housekeeping", "serviceRequests"];

export const DEFAULT_NAV_CONFIG: NavConfigItem[] = [
  { id: "dashboard",          order: 0,  visible: true },
  { id: "properties",         order: 1,  visible: true },
  { id: "rooms",              order: 2,  visible: true },
  { id: "unit-map",           order: 3,  visible: true },
  { id: "maintenance",        order: 4,  visible: true },
  { id: "facilities",         order: 5,  visible: true },
  { id: "staff",              order: 6,  visible: true },
  { id: "tasks",              order: 7,  visible: true },
  { id: "guest-requests",     order: 8,  visible: true },
  { id: "activity-log",       order: 9,  visible: true },
  { id: "user-management",    order: 10, visible: true },
  { id: "admin-settings",     order: 11, visible: true },
  { id: "security-dashboard", order: 12, visible: true },
  { id: "analytics",          order: 13, visible: true },
  { id: "support-tickets",    order: 14, visible: true },
];

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  manager:     ["/", "/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
  supervisor:  ["/", "/tasks"],
  maintenance: ["/", "/tasks"],
  cleaning:    ["/", "/tasks"],
  security:    ["/", "/tasks"],
};

const FALLBACK: AppSettings = {
  propertyName: branding.propertyName,
  logoText: branding.logoText,
  logoSub: branding.logoSub,
  logoUrl: "",
  businessMode: "hotel",
  enabledModules: DEFAULT_MODULES,
  navConfig: DEFAULT_NAV_CONFIG,
  permissionMatrix: DEFAULT_PERMISSION_MATRIX,
  primaryColor: "",
  secondaryColor: "",
  companyName: "",
};

export function useSettings(): AppSettings {
  const { data } = useGetSettings();
  if (!data) return FALLBACK;
  return {
    propertyName: data.propertyName || FALLBACK.propertyName,
    logoText: data.logoText || FALLBACK.logoText,
    logoSub: data.logoSub || FALLBACK.logoSub,
    logoUrl: data.logoUrl ?? "",
    businessMode: ((data.businessMode as BusinessMode) || "hotel"),
    enabledModules: data.enabledModules?.length ? data.enabledModules : DEFAULT_MODULES,
    navConfig: data.navConfig?.length ? data.navConfig : DEFAULT_NAV_CONFIG,
    permissionMatrix: data.permissionMatrix ?? DEFAULT_PERMISSION_MATRIX,
    primaryColor: data.primaryColor ?? "",
    secondaryColor: data.secondaryColor ?? "",
    companyName: data.companyName ?? "",
  };
}
