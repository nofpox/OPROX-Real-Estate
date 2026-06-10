import { useContext } from "react";
import * as Localization from "expo-localization";

import { ar, en } from "@/constants/i18n";
import { AppContext } from "@/context/AppContext";

export function useLocale() {
  const ctx = useContext(AppContext);
  let lang: string;
  if (ctx?.appLang) {
    lang = ctx.appLang;
  } else {
    lang = Localization.getLocales()[0]?.languageCode ?? "ar";
  }
  const isAr = lang === "ar";
  return { t: isAr ? ar : en, isAr, appLang: lang as "ar" | "en" };
}
