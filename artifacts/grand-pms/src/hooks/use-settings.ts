import { useGetSettings } from "@/lib/local-hooks";
import branding from "@/config/branding";
import { type BusinessMode } from "@/config/modules";
export type { BusinessMode };
export type { NavConfigItem, PermissionMatrix } from "@/lib/local-hooks";

export type AppSettings = {
  propertyName: string; logoText: string; logoSub: string; logoUrl: string;
  businessMode: BusinessMode; enabledModules: string[]; navConfig: any[];
  permissionMatrix: any; primaryColor: string; secondaryColor: string; companyName: string;
};

const DEFAULT_MODULES = ["bookings","maintenance","housekeeping","serviceRequests"];
const FALLBACK: AppSettings = {
  propertyName: branding.propertyName, logoText: branding.logoText,
  logoSub: branding.logoSub, logoUrl: "", businessMode: "hotel",
  enabledModules: DEFAULT_MODULES, navConfig: [], permissionMatrix: {},
  primaryColor: "", secondaryColor: "", companyName: "",
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
    navConfig: data.navConfig?.length ? data.navConfig : [],
    permissionMatrix: data.permissionMatrix ?? {},
    primaryColor: data.primaryColor ?? "",
    secondaryColor: data.secondaryColor ?? "",
    companyName: data.companyName ?? "",
  };
}
