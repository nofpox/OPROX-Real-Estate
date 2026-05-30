import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useListRooms, useListWorkOrders, useListTasks, useListGuestRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DoorOpen, Wrench, Sparkles, InboxIcon, Building, Building2, MapPin,
  ClipboardList, Dumbbell, Calendar, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import type { BusinessMode } from "@/config/modules";

// ─── Mode badge colours (non-translated) ────────────────────────────────────

const MODE_BADGE: Record<BusinessMode, string> = {
  hotel:                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  compound:             "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  tower:                "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "serviced-apartments":"bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
};

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-slate-100  text-slate-700  border-slate-200  dark:bg-slate-800   dark:text-slate-400",
  available:   "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
  maintenance: "bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400",
  cleaning:    "bg-sky-100    text-sky-700    border-sky-200    dark:bg-sky-900/20    dark:text-sky-400",
};
const STATUS_DOT: Record<string, string> = {
  occupied: "bg-slate-400", available: "bg-emerald-500", maintenance: "bg-amber-500", cleaning: "bg-sky-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation();
  const settings = useSettings();
  const mode = settings.businessMode;

  const { data: rooms,     isLoading: roomsLoading } = useListRooms();
  const { data: openOrders                          } = useListWorkOrders({ status: "open" });
  const { data: allTasks                            } = useListTasks();
  const { data: guestRequests                       } = useListGuestRequests();

  // ── Derived counts ──────────────────────────────────────────────────────
  const allRooms         = rooms ?? [];
  const totalCount       = allRooms.length;
  const availableCount   = allRooms.filter((r) => r.status === "available").length;
  const maintenanceRooms = allRooms.filter((r) => r.status === "maintenance").length;
  const cleaningRooms    = allRooms.filter((r) => r.status === "cleaning").length;
  const occupiedCount    = allRooms.filter((r) => r.status === "occupied").length;
  const operationalCount = totalCount - maintenanceRooms;

  const openMaintenance = openOrders?.length ?? 0;
  const overdueOrders   = openOrders?.filter((w) => w.dueDate && daysUntil(w.dueDate) < 0) ?? [];
  const cleaningTasks   = (allTasks as any[] | undefined)?.filter((t: any) => t.category === "housekeeping" && t.status !== "completed") ?? [];
  const activeTasks     = (allTasks as any[] | undefined)?.filter((t: any) => t.status === "pending" || t.status === "in-progress") ?? [];
  const serviceRequests = guestRequests?.filter((r) => r.status !== "completed" && r.status !== "resolved").length ?? 0;

  // ── Next upcoming maintenance ─────────────────────────────────────────────
  const upcoming = openOrders
    ?.filter((w) => w.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .find((w) => daysUntil(w.dueDate!) >= -7) ?? null;

  const upcomingDays = upcoming?.dueDate ? daysUntil(upcoming.dueDate) : null;

  function upcomingLabel(): string {
    if (!upcoming || upcomingDays === null) return t("dashboard.assetHealth.noUpcoming");
    const title = upcoming.title;
    const d = upcomingDays;
    if (d < 0)  return t("dashboard.assetHealth.daysOverdue",  { title, count: Math.abs(d) });
    if (d === 0) return t("dashboard.assetHealth.dueToday",    { title });
    if (d === 1) return t("dashboard.assetHealth.dueTomorrow", { title });
    return t("dashboard.assetHealth.inDays", { title, count: d });
  }
  const upcomingUrgent = upcomingDays !== null && upcomingDays <= 2;

  // ── Unit label from translations ─────────────────────────────────────────
  const unitLabel = t(`dashboard.unitLabels.${mode}`, { defaultValue: t("dashboard.unitLabels.hotel") });

  // ── Operational KPIs ─────────────────────────────────────────────────────
  const kpis = [
    {
      label:     t("dashboard.kpi.openMaintenance"),
      value:     openMaintenance,
      sub:       overdueOrders.length > 0
                   ? t("dashboard.kpi.overdueCount", { count: overdueOrders.length })
                   : t("dashboard.kpi.workOrders"),
      icon:      Wrench,
      iconColor: openMaintenance > 0 ? "text-amber-500" : "text-muted-foreground",
      iconBg:    openMaintenance > 0 ? "bg-amber-500/10" : "bg-muted/50",
      urgent:    overdueOrders.length > 0,
    },
    {
      label:     t("dashboard.kpi.cleaningTasks"),
      value:     cleaningTasks.length,
      sub:       cleaningRooms > 0
                   ? t("dashboard.kpi.unitsInCleaning", { count: cleaningRooms })
                   : t("dashboard.kpi.pendingTasks"),
      icon:      Sparkles,
      iconColor: cleaningTasks.length > 0 ? "text-sky-500" : "text-muted-foreground",
      iconBg:    cleaningTasks.length > 0 ? "bg-sky-500/10" : "bg-muted/50",
      urgent:    false,
    },
    {
      label:     t("dashboard.kpi.serviceRequests"),
      value:     serviceRequests,
      sub:       t("dashboard.kpi.pendingResolution"),
      icon:      InboxIcon,
      iconColor: serviceRequests > 0 ? "text-violet-500" : "text-muted-foreground",
      iconBg:    serviceRequests > 0 ? "bg-violet-500/10" : "bg-muted/50",
      urgent:    false,
    },
    {
      label:     t("dashboard.kpi.activeTasks"),
      value:     activeTasks.length,
      sub:       t("dashboard.kpi.inProgress", { count: activeTasks.filter((t: any) => t.status === "in-progress").length }),
      icon:      ClipboardList,
      iconColor: activeTasks.length > 0 ? "text-indigo-500" : "text-muted-foreground",
      iconBg:    activeTasks.length > 0 ? "bg-indigo-500/10" : "bg-muted/50",
      urgent:    false,
    },
  ];

  // ── Quick actions (mode-specific, labels from t()) ───────────────────────
  const has = (id: string) => settings.enabledModules.includes(id);

  interface ActionDef { label: string; href: string; icon: React.ElementType; color: string; }
  function getQuickActions(): ActionDef[] {
    switch (mode) {
      case "hotel":
        return [
          { label: t("dashboard.quickActions.manageRooms"),    href: "/rooms",            icon: DoorOpen,  color: "text-emerald-500" },
          ...(has("bookings")        ? [{ label: t("dashboard.quickActions.newBooking"),      href: "/bookings/new", icon: Calendar,  color: "text-blue-500"   }] : []),
          ...(has("maintenance")     ? [{ label: t("dashboard.quickActions.maintenance"),     href: "/maintenance",  icon: Wrench,    color: "text-amber-500"  }] : []),
          ...(has("housekeeping")    ? [{ label: t("dashboard.quickActions.cleaningTasks"),   href: "/tasks",        icon: Sparkles,  color: "text-sky-500"    }] : []),
          ...(has("serviceRequests") ? [{ label: t("dashboard.quickActions.requests"),        href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
        ];
      case "tower":
        return [
          { label: t("dashboard.quickActions.residentialUnits"), href: "/rooms",          icon: Building,  color: "text-teal-500"   },
          ...(has("facility")        ? [{ label: t("dashboard.quickActions.facilityBooking"), href: "/facilities", icon: Dumbbell,  color: "text-orange-500" }] : []),
          ...(has("maintenance")     ? [{ label: t("dashboard.quickActions.maintenance"),     href: "/maintenance",  icon: Wrench,    color: "text-amber-500"  }] : []),
          ...(has("housekeeping")    ? [{ label: t("dashboard.quickActions.cleaningTasks"),   href: "/tasks",        icon: Sparkles,  color: "text-sky-500"    }] : []),
          ...(has("serviceRequests") ? [{ label: t("dashboard.quickActions.requests"),        href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
        ];
      case "compound":
        return [
          ...(has("unitMap")         ? [{ label: t("dashboard.quickActions.facilityBooking"), href: "/unit-map",    icon: MapPin,    color: "text-indigo-500" }] : []),
          { label: t("dashboard.quickActions.manageUnits"),      href: "/rooms",            icon: Building2, color: "text-emerald-500" },
          ...(has("maintenance")     ? [{ label: t("dashboard.quickActions.maintenance"),     href: "/maintenance",  icon: Wrench,    color: "text-amber-500"  }] : []),
          ...(has("housekeeping")    ? [{ label: t("dashboard.quickActions.cleaningTasks"),   href: "/tasks",        icon: Sparkles,  color: "text-sky-500"    }] : []),
          ...(has("serviceRequests") ? [{ label: t("dashboard.quickActions.requests"),        href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
        ];
      default:
        return [
          { label: t("dashboard.quickActions.manageApartments"), href: "/rooms",           icon: DoorOpen,  color: "text-emerald-500" },
          ...(has("housekeeping")    ? [{ label: t("dashboard.quickActions.cleaningTasks"),   href: "/tasks",        icon: Sparkles,  color: "text-sky-500"    }] : []),
          ...(has("maintenance")     ? [{ label: t("dashboard.quickActions.maintenance"),     href: "/maintenance",  icon: Wrench,    color: "text-amber-500"  }] : []),
          ...(has("serviceRequests") ? [{ label: t("dashboard.quickActions.requests"),        href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
        ];
    }
  }
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {settings.propertyName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {/* ── Operational KPI Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`shadow-sm border-border/50 ${kpi.urgent ? "ring-1 ring-amber-400/60 dark:ring-amber-500/40" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground leading-tight">
                  {kpi.label}
                </CardTitle>
                <div className={`p-2 rounded-md shrink-0 ${kpi.iconBg}`}>
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                {roomsLoading
                  ? <Skeleton className="h-8 w-16" />
                  : <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                }
                <p className={`text-xs mt-1 ${kpi.urgent ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                  {kpi.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Asset Health ─────────────────────────────────────────────────────── */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base">{t("dashboard.assetHealth.title")}</CardTitle>
            <Link href="/maintenance">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
                {t("dashboard.assetHealth.viewAll")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Systems online */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${maintenanceRooms === 0 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                {maintenanceRooms === 0
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <ShieldAlert  className="h-4 w-4 text-amber-500" />
                }
              </div>
              <div>
                <p className="text-sm font-medium">
                  {roomsLoading
                    ? <Skeleton className="h-4 w-32 inline-block" />
                    : t("dashboard.assetHealth.systemsOnline", { operational: operationalCount, total: totalCount })
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {maintenanceRooms === 0
                    ? t("dashboard.assetHealth.allClear")
                    : t(`dashboard.assetHealth.unitsUnderMaintenance_${maintenanceRooms === 1 ? "one" : "other"}`, { count: maintenanceRooms })
                  }
                </p>
              </div>
            </div>
            <span className={`text-sm font-bold ${maintenanceRooms === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {totalCount > 0 ? `${Math.round((operationalCount / totalCount) * 100)}%` : "—"}
            </span>
          </div>

          <div className="h-px bg-border/50" />

          {/* Next scheduled maintenance */}
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-md mt-0.5 shrink-0 ${upcomingUrgent ? "bg-red-500/10" : "bg-muted/50"}`}>
              <Wrench className={`h-4 w-4 ${upcomingUrgent ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("dashboard.assetHealth.nextMaintenance")}</p>
              <p className={`text-xs mt-0.5 truncate ${upcomingUrgent ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                {upcomingLabel()}
              </p>
            </div>
            {upcoming && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                upcomingDays !== null && upcomingDays < 0 ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400" :
                upcomingUrgent ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400" :
                "bg-muted text-muted-foreground"
              }`}>
                {upcomingDays !== null && upcomingDays < 0
                  ? t("dashboard.assetHealth.badgeOverdue")
                  : upcomingDays === 0
                  ? t("dashboard.assetHealth.badgeToday")
                  : t("dashboard.assetHealth.badgeDays", { count: upcomingDays })}
              </Badge>
            )}
          </div>

          {/* Overdue list */}
          {overdueOrders.length > 0 && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3 py-2">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                {t(`dashboard.assetHealth.overdueOrders_${overdueOrders.length === 1 ? "one" : "other"}`, { count: overdueOrders.length })}
              </p>
              <ul className="space-y-1">
                {overdueOrders.slice(0, 3).map((w) => (
                  <li key={w.id} className="text-xs text-red-600 dark:text-red-400 flex justify-between">
                    <span className="truncate me-2">{w.title}</span>
                    <span className="shrink-0 font-medium">
                      {t("dashboard.assetHealth.entryDaysOverdue", { count: Math.abs(daysUntil(w.dueDate!)) })}
                    </span>
                  </li>
                ))}
                {overdueOrders.length > 3 && (
                  <li className="text-xs text-red-500">
                    {t("dashboard.assetHealth.moreOverdue", { count: overdueOrders.length - 3 })}
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Operational Status bar ──────────────────────────────────────────── */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium font-serif">
              {t("dashboard.operationalStatus.title")}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {t("dashboard.operationalStatus.readySummary", { available: availableCount, total: totalCount, label: unitLabel.toLowerCase() })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden bg-muted/30">
            {maintenanceRooms > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(maintenanceRooms / Math.max(totalCount, 1)) * 100}%` }} />}
            {cleaningRooms    > 0 && <div className="bg-sky-500   transition-all" style={{ width: `${(cleaningRooms    / Math.max(totalCount, 1)) * 100}%` }} />}
            {occupiedCount    > 0 && <div className="bg-slate-400 transition-all" style={{ width: `${(occupiedCount    / Math.max(totalCount, 1)) * 100}%` }} />}
            {availableCount   > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(availableCount  / Math.max(totalCount, 1)) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {[
              { key: "underMaintenance", color: "bg-amber-500",   count: maintenanceRooms },
              { key: "cleaning",         color: "bg-sky-500",     count: cleaningRooms    },
              { key: "occupied",         color: "bg-slate-400",   count: occupiedCount    },
              { key: "available",        color: "bg-emerald-500", count: availableCount   },
            ].map(({ key, color, count }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                {count} {t(`dashboard.operationalStatus.${key}`)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Unit grid + Quick actions ────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-7">

        {/* Unit status grid */}
        <Card className="md:col-span-5 shadow-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">
                  {t("dashboard.unitGrid.title", { label: unitLabel })}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("dashboard.unitGrid.desc")}
                </p>
              </div>
              <Link href="/rooms">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  {t("dashboard.unitGrid.manage")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : allRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DoorOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">{t("dashboard.unitGrid.noUnits")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {[...allRooms]
                  .sort((a, b) => {
                    const order: Record<string, number> = { maintenance: 0, cleaning: 1, occupied: 2, available: 3 };
                    return (order[a.status ?? "available"] ?? 3) - (order[b.status ?? "available"] ?? 3);
                  })
                  .map((room) => {
                    const status     = (room.status ?? "available").toLowerCase();
                    const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS["available"];
                    const dotClass   = STATUS_DOT[status]   ?? STATUS_DOT["available"];
                    const isAlert    = status === "maintenance" || status === "cleaning";
                    return (
                      <Link key={room.id} href="/rooms">
                        <div className={`group relative rounded-lg border p-2.5 cursor-pointer transition-all hover:shadow-md ${colorClass} ${isAlert ? "ring-1 ring-current/30" : ""}`}>
                          <span className={`h-2 w-2 rounded-full block mb-1 ${dotClass}`} />
                          <p className="text-xs font-semibold leading-tight truncate">{room.name}</p>
                          <p className="text-[10px] opacity-70 capitalize mt-0.5">
                            {t(`unitStatus.status.${status}`, { defaultValue: status })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">{t("dashboard.quickActions.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("dashboard.quickActions.desc")}</p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href + action.label} href={action.href} className="w-full">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Icon className={`me-2 h-4 w-4 ${action.color}`} />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
