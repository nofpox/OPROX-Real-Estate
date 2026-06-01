import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGES } from "./languages";

import en from "./locales/en";
import ar from "./locales/ar";
import ur from "./locales/ur";
import hi from "./locales/hi";
import bn from "./locales/bn";
import tl from "./locales/tl";
import id from "./locales/id";
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
  bn: { translation: bn },
  tl: { translation: tl },
  id: { translation: id },
  ml: { translation: ml },
  ne: { translation: ne },
  th: { translation: th },
  zh: { translation: zh },
  fr: { translation: fr },
  pt: { translation: pt },
};

const savedLang =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("rakz-lang") || "en"
    : "en";

const validLang = LANGUAGES.some((l) => l.code === savedLang) ? savedLang : "en";

i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: validLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
