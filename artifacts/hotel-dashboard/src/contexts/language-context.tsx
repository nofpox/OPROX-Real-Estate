import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../i18n";
import { LANGUAGES, RTL_LANGS, type LangCode } from "../i18n/languages";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  isRTL: false,
});

function resolveStoredLang(): LangCode {
  try {
    const stored = localStorage.getItem("grand-pms-lang");
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      return stored as LangCode;
    }
  } catch {}
  return "en";
}

function applyLang(code: LangCode) {
  const dir = RTL_LANGS.has(code) ? "rtl" : "ltr";
  document.documentElement.dir  = dir;
  document.documentElement.lang = code;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(resolveStoredLang);

  useEffect(() => {
    applyLang(lang);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("grand-pms-lang", l);
    i18n.changeLanguage(l);
    applyLang(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRTL: RTL_LANGS.has(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
