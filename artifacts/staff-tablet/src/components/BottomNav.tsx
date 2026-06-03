import { useLocation } from "wouter";
import { Building2, CheckSquare, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

export type NavTab = "units" | "work-orders" | "tasks";

export default function BottomNav({ active }: { active: NavTab }) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const tabs: { key: NavTab; label: string; icon: typeof Building2; path: string }[] = [
    { key: "units",       label: t("nav.units"),      icon: Building2,   path: "/"            },
    { key: "work-orders", label: t("nav.workOrders"), icon: Wrench,      path: "/work-orders" },
    { key: "tasks",       label: t("nav.tasks"),      icon: CheckSquare, path: "/tasks"       },
  ];

  return (
    <nav className={[
      "fixed z-40 bg-card border-border/60",
      /* Mobile / tablet — horizontal bottom bar */
      "bottom-0 left-0 right-0 border-t flex",
      /* Desktop lg — narrow icon sidebar */
      "lg:top-0 lg:bottom-0 lg:right-auto lg:w-[60px] lg:flex-col lg:border-t-0 lg:border-r",
      /* Desktop xl — wide sidebar with labels */
      "xl:w-[220px]",
      /* RTL desktop — flip to right side */
      "rtl:lg:left-auto rtl:lg:right-0 rtl:lg:border-r-0 rtl:lg:border-l",
    ].join(" ")}>

      {/* Brand header — desktop only */}
      <div className="hidden lg:flex items-center justify-center h-14 border-b border-border/60 shrink-0 xl:justify-start xl:px-5">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-black" />
        </div>
        <span className="hidden xl:block ms-2.5 font-bold text-sm text-foreground">Rakez</span>
      </div>

      {/* Nav items */}
      <div className="flex flex-1 lg:flex-col lg:py-2">
        {tabs.map(({ key, label, icon: Icon, path }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={[
                "transition-colors",
                /* Mobile: stacked icon+label */
                "flex-1 flex flex-col items-center justify-center py-3 gap-1",
                /* Desktop lg: centered icon only */
                "lg:flex-none lg:h-14 lg:flex-row lg:justify-center lg:gap-0",
                /* Desktop xl: icon + label left-aligned */
                "xl:justify-start xl:px-5 xl:gap-3 xl:h-12 xl:rounded-lg xl:mx-2",
                isActive
                  ? "text-amber-400 lg:bg-amber-500/10"
                  : "text-muted-foreground hover:text-foreground lg:hover:bg-muted/40",
              ].join(" ")}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {/* Label: visible on mobile bottom bar AND xl sidebar */}
              <span className="text-[11px] font-semibold leading-tight lg:hidden xl:block xl:text-sm xl:font-medium">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
