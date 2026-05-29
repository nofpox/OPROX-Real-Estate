import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../i18n";

type Lang = "en" | "ar";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  isRTL: false,
});

function applyLang(l: Lang) {
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = l;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("grand-pms-lang");
    return (stored === "ar" || stored === "en" ? stored : "en") as Lang;
  });

  useEffect(() => {
    applyLang(lang);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("grand-pms-lang", l);
    i18n.changeLanguage(l);
    applyLang(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRTL: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
