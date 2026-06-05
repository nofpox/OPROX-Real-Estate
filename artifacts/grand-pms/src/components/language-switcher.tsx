import React from "react";
import { useLanguage } from "@/contexts/language-context";
import { LANGUAGES, type LangCode } from "@/i18n/languages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages, Check } from "lucide-react";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 font-medium text-xs border-border/60 max-w-[120px]"
          title={`Language: ${current.name}`}
        >
          <Languages className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{current.flag} {current.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 max-h-80 overflow-y-auto"
      >
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as LangCode)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-base leading-none w-5 text-center shrink-0">
              {l.flag}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium leading-tight">
                {l.nativeName}
              </span>
              <span className="block text-xs text-muted-foreground leading-tight mt-0.5">
                {l.name}
              </span>
            </span>
            {l.code === lang && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
