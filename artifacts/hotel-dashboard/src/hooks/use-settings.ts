import { useGetSettings } from "@workspace/api-client-react";
import branding from "@/config/branding";

export type AppSettings = {
  propertyName: string;
  propertyType: string;
  logoText: string;
  logoSub: string;
};

const FALLBACK: AppSettings = {
  propertyName: branding.propertyName,
  propertyType: branding.propertyType,
  logoText: branding.logoText,
  logoSub: branding.logoSub,
};

export function useSettings(): AppSettings {
  const { data } = useGetSettings();
  if (!data) return FALLBACK;
  return {
    propertyName: data.propertyName || FALLBACK.propertyName,
    propertyType: data.propertyType || FALLBACK.propertyType,
    logoText: data.logoText || FALLBACK.logoText,
    logoSub: data.logoSub || FALLBACK.logoSub,
  };
}
