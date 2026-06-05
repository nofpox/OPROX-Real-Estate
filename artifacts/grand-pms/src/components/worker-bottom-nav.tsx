import { useLocation } from "wouter";
import { Building2, CheckSquare, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

export type WorkerNavTab = "units" | "work-orders" | "tasks";

export default function WorkerBottomNav({ active }: { active: WorkerNavTab }) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const tabs: { key: WorkerNavTab; label: string; icon: typeof Building2; path: string }[] = [
    { key: "units",       label: t("worker.nav.units"),      icon: Building2,   path: "/worker"             },
    { key: "work-orders", label: t("worker.nav.workOrders"), icon: Wrench,      path: "/worker/work-orders" },
    { key: "tasks",       label: t("worker.nav.tasks"),      icon: CheckSquare, path: "/worker/tasks"       },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 flex">
      {tabs.map(({ key, label, icon: Icon, path }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? "text-amber-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
