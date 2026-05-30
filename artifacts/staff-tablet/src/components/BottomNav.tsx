import { useLocation } from "wouter";
import { Building2, CheckSquare } from "lucide-react";

type Tab = "rooms" | "tasks";

export default function BottomNav({ active }: { active: Tab }) {
  const [, navigate] = useLocation();

  const tabs: { key: Tab; labelAr: string; labelEn: string; icon: typeof Building2; path: string }[] = [
    { key: "rooms", labelAr: "الغرف",  labelEn: "Rooms", icon: Building2,   path: "/"      },
    { key: "tasks", labelAr: "مهامي",  labelEn: "Tasks", icon: CheckSquare, path: "/tasks" },
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
