import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Localization from "expo-localization";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppContextValue {
  appLang: "ar" | "en";
  setAppLang: (lang: "ar" | "en") => void;
  langChosen: boolean;
  setLangChosen: (v: boolean) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isLoading: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const AppContext = createContext<AppContextValue | null>(null);

const LANG_KEY      = "rozoz_lang";
const LANG_CHOSEN_KEY = "rozoz_lang_chosen";
const FAVS_KEY      = "rozoz_favorites";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const deviceLang = Localization.getLocales()[0]?.languageCode === "ar" ? "ar" : "en";

  const [appLang, setAppLangState]   = useState<"ar" | "en">(deviceLang);
  const [langChosen, setLangChosenState] = useState<boolean>(false);
  const [favorites, setFavorites]    = useState<string[]>([]);
  const [isLoading, setIsLoading]    = useState(true);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedLang, storedChosen, storedFavs] = await AsyncStorage.multiGet([
          LANG_KEY,
          LANG_CHOSEN_KEY,
          FAVS_KEY,
        ]);
        if (storedLang[1])   setAppLangState(storedLang[1] as "ar" | "en");
        if (storedChosen[1]) setLangChosenState(storedChosen[1] === "true");
        if (storedFavs[1])   setFavorites(JSON.parse(storedFavs[1]));
      } catch {
        // ignore storage errors
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setAppLang = async (lang: "ar" | "en") => {
    setAppLangState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const setLangChosen = async (v: boolean) => {
    setLangChosenState(v);
    await AsyncStorage.setItem(LANG_CHOSEN_KEY, String(v));
  };

  const toggleFavorite = async (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      AsyncStorage.setItem(FAVS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const value = useMemo<AppContextValue>(
    () => ({
      appLang,
      setAppLang,
      langChosen,
      setLangChosen,
      favorites,
      toggleFavorite,
      isFavorite,
      isLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appLang, langChosen, favorites, isLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
