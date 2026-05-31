import { useLocation } from "wouter";
import { Building2, CheckSquare, Wrench } from "lucide-react";

export type NavTab = "units" | "work-orders" | "tasks";

export default function BottomNav({ active }: { active: NavTab }) {
  const [, navigate] = useLocation();

  const tabs: { key: NavTab; labelAr: string; labelEn: string; icon: typeof Building2; path: string }[] = [
    { key: "units",       labelAr: "الوحدات",     labelEn: "Units",       icon: Building2,   path: "/"            },
    { key: "work-orders", labelAr: "أوامر العمل", labelEn: "Work Orders", icon: Wrench,      path: "/work-orders" },
    { key: "tasks",       labelAr: "مهامي",       labelEn: "Tasks",       icon: CheckSquare, path: "/tasks"       },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 flex">
      {tabs.map(({ key, labelAr, labelEn, icon: Icon, path }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive
                ? "text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold leading-tight">{labelAr}</span>
            <span className="text-[9px] text-muted-foreground leading-none">{labelEn}</span>
          </button>
        );
      })}
    </nav>
  );
}
