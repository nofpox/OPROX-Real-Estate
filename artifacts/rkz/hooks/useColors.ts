import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useConfig } from "@/context/DynamicConfig";

/**
 * Returns design tokens for the current color scheme, merged with
 * any dynamic overrides from the Admin Control Panel (DynamicConfig).
 *
 * Dynamic colors update instantly app-wide without an app restart.
 */

function hexBlend(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * alpha);
  const lg = Math.round(g + (255 - g) * alpha);
  const lb = Math.round(b + (255 - b) * alpha);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export function useColors() {
  const scheme = useColorScheme();
  const { config } = useConfig();

  const base =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;

  const {
    primaryColor,
    navyColor,
    backgroundColor,
    borderColor,
    buttonColor,
    cardBg,
    logoTint,
  } = config.branding;

  return {
    // Static tokens (rarely overridden)
    ...base,
    radius: colors.radius,
    // ── Dynamic brand overrides ──────────────────────────────────────────
    primary:             primaryColor,
    tint:                primaryColor,
    gold:                primaryColor,
    goldLight:           hexBlend(primaryColor, 0.7),
    navy:                navyColor,
    navyLight:           hexBlend(navyColor, 0.25),
    foreground:          navyColor,
    secondary:           navyColor,
    secondaryForeground: "#FFFFFF",
    accent:              hexBlend(navyColor, 0.12),
    accentForeground:    "#FFFFFF",
    background:          backgroundColor,
    // ── Granular fine-tune overrides ─────────────────────────────────────
    card:                cardBg ?? (scheme === "dark" ? "#1A2638" : "#FFFFFF"),
    cardForeground:      navyColor,
    border:              borderColor ?? navyColor,
    button:              buttonColor ?? primaryColor,
    logoTint:            logoTint ?? null,
  };
}
