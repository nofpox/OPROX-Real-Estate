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
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as LangCode;
  } catch {}
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(resolveStoredLang);

  // Apply dir/lang to the document after React commits.
  useEffect(() => {
    const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  // Sync i18n on mount to cover cold-start where localStorage lang differs
  // from i18n's initial language (set during module evaluation).
  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = (l: LangCode) => {
    // Persist immediately so refresh retains the choice.
    localStorage.setItem("grand-pms-lang", l);
    // Change i18n first — react-i18next subscribers fire synchronously here,
    // so by the time setLangState triggers a React re-render, t() already
    // returns strings in the new language.
    i18n.changeLanguage(l);
    // Plain synchronous state update — no startTransition, no deferral.
    // Deferring on mobile causes the touch event to cancel the pending
    // transition before React commits it, silently dropping the switch.
    setLangState(l);
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
