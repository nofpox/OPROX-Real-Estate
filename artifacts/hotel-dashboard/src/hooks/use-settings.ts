import { useGetSettings } from "@workspace/api-client-react";
import branding from "@/config/branding";

export type BusinessMode = "hotel" | "compound" | "serviced-apartments";

export const MODE_DEFAULTS: Record<BusinessMode, string[]> = {
  hotel: [
    "properties", "rooms", "guests", "bookings",
    "finance", "maintenance", "staff", "tasks",
    "guestRequests", "activityLog", "userManagement",
  ],
  compound: [
    "properties", "rooms", "unitMap",
    "maintenance", "staff", "tasks",
    "activityLog", "userManagement",
  ],
  "serviced-apartments": [
    "properties", "rooms", "guests", "bookings",
    "tasks", "guestRequests", "staff",
    "activityLog", "userManagement",
  ],
};

export type AppSettings = {
  propertyName: string;
  propertyType: string;
  logoText: string;
  logoSub: string;
  businessMode: BusinessMode;
  enabledFeatures: string[];
};

const FALLBACK: AppSettings = {
  propertyName: branding.propertyName,
  propertyType: branding.propertyType,
  logoText: branding.logoText,
  logoSub: branding.logoSub,
  businessMode: "hotel",
  enabledFeatures: MODE_DEFAULTS.hotel,
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
    enabledFeatures: data.enabledFeatures?.length
      ? data.enabledFeatures
      : (MODE_DEFAULTS[mode] ?? MODE_DEFAULTS.hotel),
  };
}
