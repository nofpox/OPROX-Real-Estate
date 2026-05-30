import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/language-context";
import { useListActivityLogs, useListProperties } from "@workspace/api-client-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Search, RefreshCw, Building, User,
  CheckCircle2, Wrench, BookOpen, Users,
  Plus, Trash2, UserMinus, UserCheck, ArrowRightLeft,
  ShieldCheck, Camera, ArrowRight,
} from "lucide-react";

// ─── Static action metadata — labels are plain English strings, never i18n keys ─
// This means the action-type pill text is always stable regardless of language or
// translation file state. The pill is an internal system code, not UI copy.

const ACTION_META: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  "task.created":              { icon: Plus,           label: "Task Created",        cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "task.status_changed":       { icon: ArrowRightLeft, label: "Status Changed",      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"            },
  "task.assigned":             { icon: User,           label: "Task Assigned",       cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"                },
  "task.deleted":              { icon: Trash2,         label: "Task Deleted",        cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                },
  "work_order.created":        { icon: Plus,           label: "Work Order Created",  cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"        },
  "work_order.status_changed": { icon: Wrench,         label: "Work Order Updated",  cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"        },
  "work_order.deleted":        { icon: Trash2,         label: "Work Order Deleted",  cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                },
  "booking.created":           { icon: Plus,           label: "Booking Created",     cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"    },
  "booking.checked_in":        { icon: CheckCircle2,   label: "Checked In",          cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"},
  "booking.checked_out":       { icon: CheckCircle2,   label: "Checked Out",         cls: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"           },
  "booking.cancelled":         { icon: Trash2,         label: "Booking Cancelled",   cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                },
  "booking.confirmed":         { icon: CheckCircle2,   label: "Booking Confirmed",   cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"            },
  "booking.status_changed":    { icon: ArrowRightLeft, label: "Booking Updated",     cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"            },
  "field_user.created":        { icon: User,           label: "Team Member Added",   cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"    },
  "field_user.updated":        { icon: User,           label: "Team Member Updated", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"            },
  "field_user.deactivated":    { icon: UserMinus,      label: "Member Deactivated",  cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"    },
  "field_user.reactivated":    { icon: UserCheck,      label: "Member Reactivated",  cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"},
  "field_user.deleted":        { icon: Trash2,         label: "Team Member Removed", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                },
};

const ROLE_CLS: Record<string, string> = {
  "property-manager": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "site-supervisor":  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "maintenance-tech": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "cleaning-staff":   "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "security-officer": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  manager:            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const ENTITY_KEYS = ["task", "work_order", "booking", "field_user"] as const;
const ROLE_KEYS   = [
  "property-manager", "site-supervisor", "maintenance-tech",
  "cleaning-staff", "security-officer", "manager", "front-desk",
] as const;

// ─── Time helpers ──────────────────────────────────────────────────────────────

function relativeTime(iso: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return t("activityLog.justNow");
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Pill badge ────────────────────────────────────────────────────────────────

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
//
// Rendered as a native <tr> inside a <table dir="ltr">.
// The browser's table layout engine owns column ordering — it is physically
// fixed at the HTML level and cannot be affected by document direction,
// CSS transforms, Tailwind utilities, or JavaScript re-renders.
//
// Column widths are declared once in <colgroup> in ActivityLogTable:
//   col 1 — 2.5 rem  — icon bubble
//   col 2 — auto     — content (fills remaining width)
//   col 3 — 5 rem    — timestamp (shrinks to content)

function LogRow({ log }: { log: ActivityLog }) {
  const { t } = useTranslation();
  const meta  = ACTION_META[log.action] ?? {
    icon: ClipboardList,
    cls:  "bg-muted text-muted-foreground",
    label: log.action.replace(/[_.]/g, " "),
  };
  const Icon  = meta.icon;

  const actionLabel     = meta.label;
  const roleLabel       = log.actorRole
    ? t(`activityLog.role.${log.actorRole}`, { defaultValue: log.actorRole })
    : null;
  const entityTypeLabel = t(`activityLog.entityType.${log.entityType}`, { defaultValue: log.entityType });

  const isCompletion  = log.action === "task.status_changed" && log.details?.includes("→ completed");
  const isAssignment  = log.action === "task.assigned" || log.action === "task.created";
  const proofPhotoSrc = log.proofPhotoUrl ? `/api/storage${log.proofPhotoUrl}` : null;

  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">

      {/* Cell 1 — icon bubble, fixed width, top-aligned */}
      <td style={{ width: "2.5rem", verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        <div className="flex justify-center">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isCompletion ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted/50"}`}>
            {isCompletion
              ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              : <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </div>
        </div>
      </td>

      {/* Cell 2 — main content, overflows hidden so long text cannot break the layout */}
      <td style={{ verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem", paddingLeft: "0.75rem", paddingRight: "0.75rem", overflow: "hidden", maxWidth: 0 }}>

        {/* Action type + role pills */}
        <div className="flex flex-wrap gap-1 mb-1">
          <Pill label={actionLabel} cls={meta.cls} />
          {roleLabel && (
            <Pill label={roleLabel} cls={ROLE_CLS[log.actorRole ?? ""] ?? "bg-muted text-muted-foreground"} />
          )}
        </div>

        {/* Entity label */}
        <p className="text-sm font-medium text-foreground leading-tight truncate">
          {log.entityLabel ?? `${entityTypeLabel} #${log.entityId}`}
        </p>

        {/* Actor / property / details */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[12rem]">{log.actorName ?? t("activityLog.systemActor")}</span>
          </span>
          {log.propertyName && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <Building className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[12rem]">{log.propertyName}</span>
            </span>
          )}
          {log.details && (
            <span className="text-xs text-muted-foreground/80 truncate max-w-[16rem]">{log.details}</span>
          )}
        </div>

        {/* Accountability chain — who assigned / who completed */}
        {(isAssignment && log.assignedByName) && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0 text-sky-500" />
            <span className="font-medium text-sky-600 dark:text-sky-400">{log.assignedByName}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span>assigned task</span>
          </div>
        )}
        {(isCompletion && log.completedByName) && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{log.completedByName}</span>
            <span>completed this task</span>
          </div>
        )}

        {/* Proof-of-work photo thumbnail */}
        {proofPhotoSrc && (
          <div className="mt-2">
            <a
              href={proofPhotoSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 group"
            >
              <img
                src={proofPhotoSrc}
                alt="Proof of work"
                className="h-14 w-20 object-cover rounded-md border border-emerald-200 dark:border-emerald-800 group-hover:opacity-80 transition-opacity"
              />
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Camera className="h-3 w-3" />
                  Proof photo
                </span>
                <span className="text-[10px] text-muted-foreground">Click to view</span>
              </div>
            </a>
          </div>
        )}
      </td>

      {/* Cell 3 — timestamp, fixed width, right-aligned, always numeric LTR */}
      <td style={{ width: "5rem", verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem", textAlign: "right", whiteSpace: "nowrap" }}>
        <span
          className="text-xs text-muted-foreground cursor-default"
          title={fullTime(log.createdAt)}
        >
          {relativeTime(log.createdAt, t)}
        </span>
      </td>
    </tr>
  );
}

// ─── Skeleton row — same 3-cell structure as LogRow ───────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/40">
      <td style={{ width: "2.5rem", verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        <div className="flex justify-center">
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </td>
      <td style={{ verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem", paddingLeft: "0.75rem", paddingRight: "0.75rem" }}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
      </td>
      <td style={{ width: "5rem", verticalAlign: "top", paddingTop: "0.75rem", paddingBottom: "0.75rem", textAlign: "right" }}>
        <Skeleton className="h-3 w-10 ml-auto" />
      </td>
    </tr>
  );
}

// ─── Native table wrapper ─────────────────────────────────────────────────────
//
// dir="ltr" is set on the <table> element. This is not a CSS trick — it is a
// standard HTML attribute that instructs the browser's table layout engine to
// place columns left-to-right. The browser guarantees this regardless of:
//   • document.documentElement.dir (global RTL mode)
//   • any CSS property on any ancestor element
//   • JavaScript re-renders or React reconciliation
//
// Text content inside each <td> still inherits the document's dir, so Arabic,
// Urdu, Hebrew, etc. glyphs render correctly inside their cells.

function ActivityLogTable({ rows, loading }: { rows: ActivityLog[]; loading: boolean }) {
  return (
    <table
      dir="ltr"
      style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
    >
      <colgroup>
        <col style={{ width: "2.5rem" }} />
        <col />
        <col style={{ width: "5rem" }} />
      </colgroup>
      <tbody>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          : rows.map((log) => <LogRow key={log.id} log={log} />)
        }
      </tbody>
    </table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ActivityLogPage wraps the inner component with key={lang} so the browser
// performs a full layout recalculation on every language switch.
// The table and all its cells are freshly mounted, guaranteeing that the
// browser's table layout engine starts from a clean state in the new direction.
function ActivityLogInner() {
  const { t } = useTranslation();
  const [search,       setSearch]       = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [propFilter,   setPropFilter]   = useState("all");

  const { data: properties } = useListProperties();
  const { data: logs, isLoading, refetch, isFetching } = useListActivityLogs({
    limit: 200,
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    actorRole:  roleFilter   !== "all" ? roleFilter   : undefined,
    propertyId: propFilter   !== "all" ? parseInt(propFilter) : undefined,
  });

  const allLogs = useMemo(() => logs ?? [], [logs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allLogs;
    const q = search.toLowerCase();
    return allLogs.filter((l) =>
      (l.actorName    ?? "").toLowerCase().includes(q) ||
      (l.entityLabel  ?? "").toLowerCase().includes(q) ||
      (l.details      ?? "").toLowerCase().includes(q) ||
      (l.propertyName ?? "").toLowerCase().includes(q)
    );
  }, [allLogs, search]);

  const kpiDefs = [
    { key: "total",       labelKey: "kpi.total",       icon: ClipboardList, color: "text-primary",     bg: "bg-primary/10",     entityType: undefined    },
    { key: "tasks",       labelKey: "kpi.tasks",       icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/10", entityType: "task"       },
    { key: "workOrders",  labelKey: "kpi.workOrders",  icon: Wrench,        color: "text-amber-500",   bg: "bg-amber-500/10",   entityType: "work_order" },
    { key: "teamChanges", labelKey: "kpi.teamChanges", icon: Users,         color: "text-violet-500",  bg: "bg-violet-500/10",  entityType: "field_user" },
  ] as const;

  const kpiValues = kpiDefs.map((k) =>
    k.entityType ? allLogs.filter((l) => l.entityType === k.entityType).length : allLogs.length
  );

  const hasFilters = entityFilter !== "all" || roleFilter !== "all" || propFilter !== "all" || search.trim();

  const legendItems = [
    { icon: CheckCircle2, labelKey: "activityLog.legend.tasks.label",      descKey: "activityLog.legend.tasks.desc"      },
    { icon: Wrench,       labelKey: "activityLog.legend.workOrders.label", descKey: "activityLog.legend.workOrders.desc" },
    { icon: BookOpen,     labelKey: "activityLog.legend.bookings.label",   descKey: "activityLog.legend.bookings.desc"   },
    { icon: Users,        labelKey: "activityLog.legend.team.label",       descKey: "activityLog.legend.team.desc"       },
  ] as const;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {t("activityLog.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("activityLog.subtitle")}</p>
        </div>
        <Button
          variant="outline" size="sm"
          className="shrink-0 gap-2 self-start"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("activityLog.refresh")}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiDefs.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="shadow-sm border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className="min-w-0">
                    {isLoading
                      ? <Skeleton className="h-6 w-8 mb-1" />
                      : <p className="text-2xl font-bold leading-none">{kpiValues[i]}</p>
                    }
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {t(`activityLog.${kpi.labelKey}`)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + log table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">

          {/* Search */}
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={t("activityLog.searchPlaceholder")}
              className="ps-8 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs bg-background">
                <SelectValue placeholder={t("activityLog.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("activityLog.allTypes")}</SelectItem>
                {ENTITY_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>{t(`activityLog.filterType.${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs bg-background">
                <SelectValue placeholder={t("activityLog.allRoles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("activityLog.allRoles")}</SelectItem>
                {ROLE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>{t(`activityLog.role.${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={propFilter} onValueChange={setPropFilter}>
              <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs bg-background">
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
                onClick={() => { setEntityFilter("all"); setRoleFilter("all"); setPropFilter("all"); setSearch(""); }}
              >
                {t("activityLog.clearFilters")}
              </Button>
            )}

            <span className="ms-auto text-xs text-muted-foreground whitespace-nowrap">
              {isLoading
                ? t("activityLog.loading")
                : t("activityLog.eventsCount", { count: filtered.length })
              }
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-6">
          {!isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-25" />
              <p className="text-sm">
                {allLogs.length === 0 ? t("activityLog.noActivity") : t("activityLog.noResults")}
              </p>
            </div>
          ) : (
            <ActivityLogTable rows={filtered} loading={isLoading} />
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
            {legendItems.map(({ icon: Icon, labelKey, descKey }) => (
              <div key={labelKey} className="flex items-start gap-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{t(labelKey)}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function ActivityLogPage() {
  const { lang } = useLanguage();
  return <ActivityLogInner key={lang} />;
}
