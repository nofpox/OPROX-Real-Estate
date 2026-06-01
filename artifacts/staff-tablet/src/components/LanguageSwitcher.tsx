import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES, RTL_LANGS } from "@/i18n/languages";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("rakz-lang", code);
    document.documentElement.dir = RTL_LANGS.has(code) ? "rtl" : "ltr";
    document.documentElement.lang = code;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
          <Globe size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              i18n.language === lang.code ? "bg-amber-500/10 text-amber-400" : ""
            }`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none mb-0.5">{lang.nativeName}</p>
              <p className="text-xs text-muted-foreground">{lang.name}</p>
            </div>
            {i18n.language === lang.code && (
              <span className="text-amber-400 text-xs shrink-0">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
