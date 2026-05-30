import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGES } from "./languages";

// ─── Locale imports ───────────────────────────────────────────────────────────
// To add a new language:
//   1. Add it to languages.ts
//   2. Run: pnpm --filter @workspace/scripts run generate-locale <code>
//   3. Import it below and add to RESOURCES

import en from "./locales/en";
import ar from "./locales/ar";
import ur from "./locales/ur";
import hi from "./locales/hi";
import tl from "./locales/tl";
import id from "./locales/id";
import bn from "./locales/bn";
import ml from "./locales/ml";
import ne from "./locales/ne";
import th from "./locales/th";
import zh from "./locales/zh";
import fr from "./locales/fr";
import pt from "./locales/pt";

const RESOURCES: Record<string, { translation: typeof en }> = {
  en: { translation: en },
  ar: { translation: ar },
  ur: { translation: ur },
  hi: { translation: hi },
  tl: { translation: tl },
  id: { translation: id },
  bn: { translation: bn },
  ml: { translation: ml },
  ne: { translation: ne },
  th: { translation: th },
  zh: { translation: zh },
  fr: { translation: fr },
  pt: { translation: pt },
};

// Validate all registered languages have resources (catches missing imports)
for (const lang of LANGUAGES) {
  if (!RESOURCES[lang.code]) {
    console.warn(`[i18n] No resource found for language "${lang.code}" — falling back to "en"`);
  }
}

const savedLang =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("grand-pms-lang") || "en"
    : "en";

const validLang = LANGUAGES.some((l) => l.code === savedLang) ? savedLang : "en";

i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: validLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
