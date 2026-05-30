import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import i18n from "../i18n";
import { LANGUAGES, RTL_LANGS, type LangCode } from "../i18n/languages";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  isRTL: boolean;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  isRTL: false,
  isPending: false,
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
  // useTransition defers the render triggered by setLangState, preventing
  // mid-render tearing between useTranslation() and useLanguage() consumers.
  const [isPending, startTransition] = useTransition();

  // Apply dir/lang to the document ONLY after React has committed the render.
  // Calling applyLang inside the event handler (synchronously) causes the browser
  // to re-layout the page before React finishes painting, producing visual corruption.
  useEffect(() => {
    const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  // Sync i18n on mount to cover SSR / cold-start scenarios.
  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = (l: LangCode) => {
    localStorage.setItem("grand-pms-lang", l);
    // Change i18n synchronously first so that when React re-renders (inside the
    // transition below), all useTranslation() hooks already return the new strings.
    // This eliminates the one-frame desync where t() is new but lang state is old.
    i18n.changeLanguage(l);
    // Wrap the React state update in startTransition so React can batch it with
    // the react-i18next internal subscriber updates and commit them together.
    startTransition(() => {
      setLangState(l);
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRTL: RTL_LANGS.has(lang), isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
