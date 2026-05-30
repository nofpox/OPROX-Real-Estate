import { useGetSettings } from "@workspace/api-client-react";
import branding from "@/config/branding";
import { type BusinessMode } from "@/config/modules";

export type { BusinessMode };

export type AppSettings = {
  propertyName: string;
  logoText: string;
  logoSub: string;
  businessMode: BusinessMode;
  enabledModules: string[];
};

/** Sensible default when settings have not yet been configured. */
const DEFAULT_MODULES = ["bookings", "maintenance", "housekeeping", "serviceRequests"];

const FALLBACK: AppSettings = {
  propertyName: branding.propertyName,
  logoText: branding.logoText,
  logoSub: branding.logoSub,
  businessMode: "hotel",
  enabledModules: DEFAULT_MODULES,
};

export function useSettings(): AppSettings {
  const { data } = useGetSettings();
  if (!data) return FALLBACK;
  return {
    propertyName: data.propertyName || FALLBACK.propertyName,
    logoText: data.logoText || FALLBACK.logoText,
    logoSub: data.logoSub || FALLBACK.logoSub,
    businessMode: ((data.businessMode as BusinessMode) || "hotel"),
    enabledModules: data.enabledModules?.length ? data.enabledModules : DEFAULT_MODULES,
  };
}
