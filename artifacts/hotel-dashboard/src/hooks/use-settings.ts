import { useGetSettings } from "@workspace/api-client-react";
import branding from "@/config/branding";
import { type BusinessMode, MODE_MODULE_DEFAULTS } from "@/config/modules";

export type { BusinessMode };
export { MODE_MODULE_DEFAULTS };

export type AppSettings = {
  propertyName: string;
  propertyType: string;
  logoText: string;
  logoSub: string;
  businessMode: BusinessMode;
  enabledModules: string[];
};

const FALLBACK: AppSettings = {
  propertyName: branding.propertyName,
  propertyType: branding.propertyType,
  logoText: branding.logoText,
  logoSub: branding.logoSub,
  businessMode: "hotel",
  enabledModules: MODE_MODULE_DEFAULTS.hotel,
};

export function useSettings(): AppSettings {
  const { data } = useGetSettings();
  if (!data) return FALLBACK;
  const mode = (data.businessMode as BusinessMode) || "hotel";
  return {
    propertyName: data.propertyName || FALLBACK.propertyName,
    propertyType: data.propertyType || FALLBACK.propertyType,
    logoText: data.logoText || FALLBACK.logoText,
    logoSub: data.logoSub || FALLBACK.logoSub,
    businessMode: mode,
    enabledModules: data.enabledModules?.length
      ? data.enabledModules
      : (MODE_MODULE_DEFAULTS[mode] ?? MODE_MODULE_DEFAULTS.hotel),
  };
}
