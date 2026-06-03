import * as Localization from "expo-localization";

import { ar, en } from "@/constants/i18n";

export function useLocale() {
  const locales = Localization.getLocales();
  const lang = locales[0]?.languageCode ?? "ar";
  const isAr = lang === "ar";
  return { t: isAr ? ar : en, isAr };
}
