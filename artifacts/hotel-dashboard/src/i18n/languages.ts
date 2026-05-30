export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English",    nativeName: "English",      flag: "🇬🇧", dir: "ltr" },
  { code: "ar", name: "Arabic",     nativeName: "العربية",      flag: "🇸🇦", dir: "rtl" },
  { code: "ur", name: "Urdu",       nativeName: "اردو",         flag: "🇵🇰", dir: "rtl" },
  { code: "hi", name: "Hindi",      nativeName: "हिन्दी",        flag: "🇮🇳", dir: "ltr" },
  { code: "bn", name: "Bengali",    nativeName: "বাংলা",         flag: "🇧🇩", dir: "ltr" },
  { code: "tl", name: "Tagalog",    nativeName: "Tagalog",      flag: "🇵🇭", dir: "ltr" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
  { code: "ml", name: "Malayalam",  nativeName: "മലയാളം",       flag: "🇮🇳", dir: "ltr" },
  { code: "ne", name: "Nepali",     nativeName: "नेपाली",        flag: "🇳🇵", dir: "ltr" },
  { code: "th", name: "Thai",       nativeName: "ภาษาไทย",      flag: "🇹🇭", dir: "ltr" },
];

export const RTL_LANGS = new Set(
  LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code)
);

export type LangCode = typeof LANGUAGES[number]["code"];

export function getLang(code: string): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
