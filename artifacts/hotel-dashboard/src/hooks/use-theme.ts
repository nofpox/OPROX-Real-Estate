import { useEffect } from "react";
import { useGetSettings } from "@workspace/api-client-react";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const ROOT = document.documentElement;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function applyPrimaryColor(hex: string) {
  const hsl = hexToHsl(hex);
  const fg = isDark(hex) ? "0 0% 100%" : "0 0% 10%";
  ROOT.style.setProperty("--primary", hsl);
  ROOT.style.setProperty("--primary-foreground", fg);
  ROOT.style.setProperty("--sidebar-primary", hsl);
  ROOT.style.setProperty("--sidebar-primary-foreground", fg);
  ROOT.style.setProperty("--ring", hsl);
}

function applySidebarColor(hex: string) {
  const hsl = hexToHsl(hex);
  const dark = isDark(hex);
  const fg       = dark ? "210 40% 95%"  : "222 47% 11%";
  const fgMuted  = dark ? "215 20% 65%"  : "222 30% 40%";
  const accent   = dark ? "217 33% 28%"  : "210 40% 90%";
  const border   = dark ? "217 33% 25%"  : "214 32% 85%";
  ROOT.style.setProperty("--sidebar",                    hsl);
  ROOT.style.setProperty("--sidebar-foreground",         fg);
  ROOT.style.setProperty("--sidebar-border",             border);
  ROOT.style.setProperty("--sidebar-accent",             accent);
  ROOT.style.setProperty("--sidebar-accent-foreground",  fg);
  ROOT.style.setProperty("--sidebar-muted-foreground",   fgMuted);
}

export function useTheme() {
  const { data } = useGetSettings();

  useEffect(() => {
    if (!data) return;
    if (data.primaryColor  && HEX_RE.test(data.primaryColor))  applyPrimaryColor(data.primaryColor);
    if (data.secondaryColor && HEX_RE.test(data.secondaryColor)) applySidebarColor(data.secondaryColor);
  }, [data?.primaryColor, data?.secondaryColor]);
}

export { applyPrimaryColor, applySidebarColor, HEX_RE };
