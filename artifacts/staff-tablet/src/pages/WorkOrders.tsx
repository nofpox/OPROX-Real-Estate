import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wrench, RefreshCw, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";

type WorkOrder = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  propertyName: string | null;
  unitName: string | null;
  assignedStaffName: string | null;
  createdAt: string;
  dueDate: string | null;
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low:    "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending:       "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "in-progress": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed:     "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled:     "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function WorkOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [tab, setTab]         = useState<"pending" | "in-progress" | "completed" | "all">("pending");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: workOrders, isLoading, isError, refetch } = useQuery<WorkOrder[]>({
    queryKey: ["my-work-orders"],
    queryFn: async () => {
      const r = await fetch("/api/work-orders/mine", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const pendingCount    = workOrders?.filter(w => w.status === "pending").length ?? 0;
  const inProgressCount = workOrders?.filter(w => w.status === "in-progress").length ?? 0;
  const completedCount  = workOrders?.filter(w => w.status === "completed").length ?? 0;

  const TABS = [
    { key: "pending"     as const, label: t("workOrders.pending"),    count: pendingCount    },
    { key: "in-progress" as const, label: t("workOrders.inProgress"), count: inProgressCount },
    { key: "completed"   as const, label: t("workOrders.done"),       count: completedCount  },
    { key: "all"         as const, label: t("workOrders.all"),        count: workOrders?.length ?? 0 },
  ];

  const filtered = (workOrders ?? []).filter(wo => tab === "all" || wo.status === tab);

  async function advanceStatus(wo: WorkOrder) {
    const next =
      wo.status === "pending"      ? "in-progress" :
      wo.status === "in-progress"  ? "completed"   : null;
    if (!next) return;
    setUpdatingId(wo.id);
    try {
      const res = await fetch(`/api/work-orders/${wo.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: next === "in-progress" ? t("workOrders.toastStarted") : t("workOrders.toastCompleted") });
      await qc.invalidateQueries({ queryKey: ["my-work-orders"] });
      if (next === "in-progress") setTab("in-progress");
      if (next === "completed")   setTab("completed");
    } catch {
      toast({ title: t("workOrders.toastFailed"), variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24 lg:pb-6 lg:ps-[60px] xl:ps-[220px]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-4 sm:px-5 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="font-serif font-bold text-foreground text-xl leading-tight">
                  {t("workOrders.title")}
                </h1>
                <p className="text-xs text-muted-foreground">{t("workOrders.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Button size="sm" variant="ghost" onClick={() => refetch()} className="w-9 h-9 p-0">
                  <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {/* Status tabs */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {TABS.map(t2 => (
                <button
                  key={t2.key}
                  onClick={() => setTab(t2.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    tab === t2.key
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-muted/30 border-transparent text-muted-foreground"
                  }`}
                >
                  {t2.label}{t2.count > 0 ? ` (${t2.count})` : ""}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-5 py-4 max-w-5xl mx-auto">
          {/* Loading — 2-column on md+ */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">{t("workOrders.failedLoad")}</p>
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => refetch()}>
                {t("workOrders.retry")}
              </Button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center py-16">
              <Wrench size={40} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">{t("workOrders.empty")}</p>
              <p className="text-muted-foreground/50 text-xs mt-1">{t("workOrders.emptyDesc")}</p>
            </div>
          )}

          {/* Work order cards — single column on mobile, 2 cols on md+ */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(wo => (
                <div key={wo.id} className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          PRIORITY_BADGE[wo.priority] || PRIORITY_BADGE.medium
                        }`}>
                          {t(`priority.${wo.priority}`, wo.priority)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          STATUS_COLORS[wo.status] || STATUS_COLORS.pending
                        }`}>
                          {wo.status === "in-progress" ? t("status.inProgress") : t(`status.${wo.status}`, wo.status)}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-base leading-snug">{wo.title}</h3>
                      {wo.description && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{wo.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {wo.propertyName && (
                      <span className="flex items-center gap-1">
                        <Building2 size={10} />
                        {wo.propertyName}{wo.unitName ? ` · ${wo.unitName}` : ""}
                      </span>
                    )}
                    {wo.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(wo.dueDate + "T00:00:00").toLocaleDateString(i18n.language)}
                      </span>
                    )}
                    <span className="text-muted-foreground/40">#{wo.id}</span>
                  </div>

                  {/* Action */}
                  {wo.status === "pending" && (
                    <Button
                      onClick={() => advanceStatus(wo)}
                      disabled={updatingId === wo.id}
                      className="w-full h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black gap-2"
                    >
                      {updatingId === wo.id
                        ? <RefreshCw size={15} className="animate-spin" />
                        : "▶"
                      }
                      {t("workOrders.startWork")}
                    </Button>
                  )}
                  {wo.status === "in-progress" && (
                    <Button
                      onClick={() => advanceStatus(wo)}
                      disabled={updatingId === wo.id}
                      className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {updatingId === wo.id
                        ? <RefreshCw size={15} className="animate-spin" />
                        : "✓"
                      }
                      {t("workOrders.complete")}
                    </Button>
                  )}
                  {wo.status === "completed" && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="text-sm text-emerald-400 font-semibold">✓ {t("workOrders.completedDone")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="work-orders" />
    </>
  );
}
