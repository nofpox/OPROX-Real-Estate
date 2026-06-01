import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, LogOut, Layers, Users, Wrench, CheckCircle2, RefreshCw } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import WorkerBottomNav from "@/components/worker-bottom-nav";

type Room = { id: number; name: string; type: string; status: string; capacity: number };
type Property = { id: number; name: string; type: string };
type Request = { id: number; roomId: number; status: string };

const STATUS_BG: Record<string, string> = {
  available:   "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30",
  occupied:    "bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30",
  maintenance: "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30",
  cleaning:    "bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30",
};

const STATUS_DOT: Record<string, string> = {
  available:   "bg-emerald-400",
  occupied:    "bg-blue-400",
  maintenance: "bg-amber-400",
  cleaning:    "bg-purple-400",
};

export default function WorkerDashboard({ onLogout }: { onLogout: () => void }) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);

  const { data: authUser } = useQuery<{ id: number; username: string; displayName: string }>({
    queryKey: ["auth-me"],
    queryFn: () => fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    staleTime: Infinity,
  });

  const { data: rooms, isLoading: roomsLoading, refetch } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => fetch("/api/rooms").then(r => r.json()),
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties").then(r => r.json()),
  });

  const { data: requests } = useQuery<Request[]>({
    queryKey: ["guest-requests"],
    queryFn: () => fetch("/api/guest/requests", { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });

  const filtered = rooms?.filter(r => propertyFilter === null || true) ?? [];
  const pendingByRoom = (roomId: number) =>
    requests?.filter(r => r.roomId === roomId && r.status === "new").length || 0;

  const statusCounts = {
    available:   rooms?.filter(r => r.status === "available").length   || 0,
    occupied:    rooms?.filter(r => r.status === "occupied").length    || 0,
    maintenance: rooms?.filter(r => r.status === "maintenance").length || 0,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-black" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-foreground leading-tight">Rakez</h1>
            <p className="text-xs text-muted-foreground">{t("worker.dashboard.appSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {authUser?.displayName || authUser?.username}
          </span>
          <LanguageSwitcher />
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw size={15} />
          </Button>
          <Button
            size="sm" variant="ghost" onClick={onLogout}
            className="h-8 text-muted-foreground hover:text-destructive gap-1.5"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">{t("worker.dashboard.logout")}</span>
          </Button>
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t("worker.dashboard.totalUnits"), value: rooms?.length || 0, icon: Layers,       color: "text-slate-400"   },
            { label: t("status.available"),            value: statusCounts.available,   icon: CheckCircle2, color: "text-emerald-400" },
            { label: t("status.occupied"),             value: statusCounts.occupied,    icon: Users,        color: "text-blue-400"   },
            { label: t("status.maintenance"),          value: statusCounts.maintenance, icon: Wrench,       color: "text-amber-400"  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-xl p-3 border border-border/50 text-center">
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Property filter */}
        {properties && properties.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setPropertyFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                propertyFilter === null
                  ? "bg-amber-500 text-black"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("worker.dashboard.allProperties")}
            </button>
            {properties.map(p => (
              <button
                key={p.id}
                onClick={() => setPropertyFilter(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  propertyFilter === p.id
                    ? "bg-amber-500 text-black"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_DOT).map(([status, dot]) => (
            <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              {t(`status.${status}`)}
            </span>
          ))}
        </div>

        {/* Unit grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {roomsLoading
            ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : filtered.map(room => {
                const pending = pendingByRoom(room.id);
                return (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/worker/unit/${room.id}`)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                      STATUS_BG[room.status] || "bg-card border-border hover:bg-muted"
                    }`}
                  >
                    {pending > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 min-w-[18px] h-[18px]">
                        {pending}
                      </span>
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full mb-3 ${STATUS_DOT[room.status] || "bg-slate-400"}`} />
                    <p className="font-bold text-foreground text-sm leading-tight">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{room.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`status.${room.status}`)}</p>
                  </button>
                );
              })}
        </div>
      </div>

      <WorkerBottomNav active="units" />
    </div>
  );
}
