import React from "react";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();

  const toggle = () => setLang(lang === "en" ? "ar" : "en");

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="h-8 gap-1.5 px-2.5 font-medium text-xs border-border/60"
      title={lang === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="font-semibold tracking-wide">{t("lang.switchTo")}</span>
    </Button>
  );
}
