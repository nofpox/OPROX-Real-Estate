import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListActivityLogs, useListProperties } from "@workspace/api-client-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Search, RefreshCw, Building, User,
  CheckCircle2, Wrench, BookOpen, Users,
  Plus, Trash2, UserMinus, UserCheck, ArrowRightLeft,
} from "lucide-react";

// ─── Action icon/badge map (keys only — labels come from t()) ─────────────────

const ACTION_ICONS: Record<string, { icon: React.ElementType; badgeClass: string }> = {
  "task.created":               { icon: Plus,           badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "task.status_changed":        { icon: ArrowRightLeft, badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "task.assigned":              { icon: User,           badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"                 },
  "task.deleted":               { icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "work_order.created":         { icon: Plus,           badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"         },
  "work_order.status_changed":  { icon: Wrench,         badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"         },
  "work_order.deleted":         { icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "booking.created":            { icon: Plus,           badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"     },
  "booking.checked_in":         { icon: CheckCircle2,   badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "booking.checked_out":        { icon: CheckCircle2,   badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"            },
  "booking.cancelled":          { icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "booking.confirmed":          { icon: CheckCircle2,   badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "booking.status_changed":     { icon: ArrowRightLeft, badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "field_user.created":         { icon: User,           badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"     },
  "field_user.updated":         { icon: User,           badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "field_user.deactivated":     { icon: UserMinus,      badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"     },
  "field_user.reactivated":     { icon: UserCheck,      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "field_user.deleted":         { icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
};

const ROLE_BADGE: Record<string, string> = {
  "property-manager": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "site-supervisor":  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "maintenance-tech": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "cleaning-staff":   "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "security-officer": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  manager:            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const ENTITY_FILTER_KEYS = ["task", "work_order", "booking", "field_user"] as const;
const ACTOR_ROLE_KEYS = [
  "property-manager", "site-supervisor", "maintenance-tech",
  "cleaning-staff", "security-officer", "manager", "front-desk",
] as const;

// ─── Relative time (locale-neutral numbers, locale-specific labels) ───────────

function relativeTime(iso: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return t("activityLog.justNow", { defaultValue: "just now" });
  if (mins  < 60)  return `${mins}m`;
  if (hours < 24)  return `${hours}h`;
  if (days  < 7)   return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function LogEntryRow({ log }: { log: ActivityLog }) {
  const { t } = useTranslation();
  const meta = ACTION_ICONS[log.action] ?? { icon: ClipboardList, badgeClass: "bg-muted text-muted-foreground" };
  const Icon = meta.icon;
  const actionLabel = t(`activityLog.action.${log.action}`, {
    defaultValue: log.action.replace(/_/g, " ").replace(/\./g, " → "),
  });
  const roleLabel = log.actorRole
    ? t(`activityLog.role.${log.actorRole}`, { defaultValue: log.actorRole })
    : null;
  const entityTypeLabel = t(`activityLog.entityType.${log.entityType}`, { defaultValue: log.entityType });

  return (
    <div className="flex gap-3 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 px-4 -mx-4 rounded transition-colors">
      <div className="mt-0.5 shrink-0">
        <div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
            {actionLabel}
          </span>
          {roleLabel && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[log.actorRole ?? ""] ?? "bg-muted text-muted-foreground"}`}>
              {roleLabel}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-foreground leading-tight">
          {log.entityLabel ?? `${entityTypeLabel} #${log.entityId}`}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {log.actorName ?? t("activityLog.systemActor")}
          </span>
          {log.propertyName && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Building className="h-3 w-3" />
              {log.propertyName}
            </span>
          )}
          {log.details && (
            <span className="text-xs text-muted-foreground/80 truncate max-w-xs">{log.details}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="text-xs text-muted-foreground cursor-default" title={fullTime(log.createdAt)}>
          {relativeTime(log.createdAt, t)}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { t } = useTranslation();
  const [search,           setSearch]           = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actorRoleFilter,  setActorRoleFilter]  = useState("all");
  const [propertyFilter,   setPropertyFilter]   = useState("all");

  const { data: properties } = useListProperties();
  const { data: logs, isLoading, refetch, isFetching } = useListActivityLogs({
    limit: 200,
    entityType: entityTypeFilter !== "all" ? entityTypeFilter  : undefined,
    actorRole:  actorRoleFilter  !== "all" ? actorRoleFilter   : undefined,
    propertyId: propertyFilter   !== "all" ? parseInt(propertyFilter) : undefined,
  });

  const allLogs = useMemo(() => logs ?? [], [logs]);

  const filtered = useMemo(() => {
    if (!search) return allLogs;
    const q = search.toLowerCase();
    return allLogs.filter((log) =>
      (log.actorName   ?? "").toLowerCase().includes(q) ||
      (log.entityLabel ?? "").toLowerCase().includes(q) ||
      (log.details     ?? "").toLowerCase().includes(q) ||
      (log.propertyName ?? "").toLowerCase().includes(q)
    );
  }, [allLogs, search]);

  // Static structure (no translation); values depend only on allLogs.
  const kpiDefs = useMemo(() => [
    { key: "total",       labelKey: "kpi.total",       icon: ClipboardList, color: "text-primary",        bg: "bg-primary/10",      entityType: undefined        },
    { key: "tasks",       labelKey: "kpi.tasks",       icon: CheckCircle2,  color: "text-emerald-500",    bg: "bg-emerald-500/10",  entityType: "task"           },
    { key: "workOrders",  labelKey: "kpi.workOrders",  icon: Wrench,        color: "text-amber-500",      bg: "bg-amber-500/10",    entityType: "work_order"     },
    { key: "teamChanges", labelKey: "kpi.teamChanges", icon: Users,         color: "text-violet-500",     bg: "bg-violet-500/10",   entityType: "field_user"     },
  ], []);

  const kpiValues = useMemo(
    () => kpiDefs.map((k) =>
      k.entityType ? allLogs.filter((l) => l.entityType === k.entityType).length : allLogs.length
    ),
    [kpiDefs, allLogs]
  );

  const hasFilters = entityTypeFilter !== "all" || actorRoleFilter !== "all" || propertyFilter !== "all" || search;

  // Legend labels depend on `t` — memoized so they don't rebuild on every render,
  // only when the language changes (t reference changes with i18next language switch).
  const LEGEND_ITEMS = useMemo(() => [
    { icon: CheckCircle2, label: t("activityLog.legend.tasks.label"),      desc: t("activityLog.legend.tasks.desc")       },
    { icon: Wrench,       label: t("activityLog.legend.workOrders.label"), desc: t("activityLog.legend.workOrders.desc")  },
    { icon: BookOpen,     label: t("activityLog.legend.bookings.label"),   desc: t("activityLog.legend.bookings.desc")    },
    { icon: Users,        label: t("activityLog.legend.team.label"),       desc: t("activityLog.legend.team.desc")        },
  ], [t]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {t("activityLog.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("activityLog.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("activityLog.refresh")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiDefs.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="shadow-sm border-border/50">
              <CardContent className="flex items-center gap-3 pt-5 pb-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {isLoading
                    ? <Skeleton className="h-6 w-8 mb-1" />
                    : <p className="text-2xl font-bold">{kpiValues[i]}</p>
                  }
                  <p className="text-xs text-muted-foreground leading-tight">{t(`activityLog.${kpi.labelKey}`)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Log */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("activityLog.searchPlaceholder")}
                className="ps-8 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder={t("activityLog.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("activityLog.allTypes")}</SelectItem>
                  {ENTITY_FILTER_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{t(`activityLog.filterType.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actorRoleFilter} onValueChange={setActorRoleFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder={t("activityLog.allRoles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("activityLog.allRoles")}</SelectItem>
                  {ACTOR_ROLE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{t(`activityLog.role.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder={t("common.allProperties")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allProperties")}</SelectItem>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                  onClick={() => { setEntityTypeFilter("all"); setActorRoleFilter("all"); setPropertyFilter("all"); setSearch(""); }}
                >
                  {t("activityLog.clearFilters")}
                </Button>
              )}

              <span className="ms-auto text-xs text-muted-foreground">
                {isLoading
                  ? t("activityLog.loading")
                  : t("activityLog.eventsCount", { count: filtered.length })
                }
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-3 w-16 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-25" />
              <p className="text-sm">
                {allLogs.length === 0 ? t("activityLog.noActivity") : t("activityLog.noResults")}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((log) => <LogEntryRow key={log.id} log={log} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="shadow-sm border-border/50 bg-muted/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("activityLog.legend.title")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LEGEND_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
