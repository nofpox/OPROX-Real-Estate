import React, { useState } from "react";
import { useListActivityLogs, useListProperties } from "@workspace/api-client-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Search, RefreshCw, Building, User,
  CheckCircle2, Wrench, BookOpen, Users, ShieldCheck,
  Sparkles, HardHat, ArrowRightLeft, Plus, Trash2, UserMinus, UserCheck,
} from "lucide-react";

// ─── Action metadata ──────────────────────────────────────────────────────────

interface ActionMeta {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
}

const ACTION_MAP: Record<string, ActionMeta> = {
  "task.created":               { label: "Task created",          icon: Plus,           badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "task.status_changed":        { label: "Task status changed",   icon: ArrowRightLeft, badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "task.assigned":              { label: "Task assigned",         icon: User,           badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"                 },
  "task.deleted":               { label: "Task deleted",          icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "work_order.created":         { label: "Work order created",    icon: Plus,           badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"         },
  "work_order.status_changed":  { label: "Work order updated",    icon: Wrench,         badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"         },
  "work_order.deleted":         { label: "Work order deleted",    icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "booking.created":            { label: "Booking created",       icon: Plus,           badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"     },
  "booking.checked_in":         { label: "Checked in",            icon: CheckCircle2,   badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "booking.checked_out":        { label: "Checked out",           icon: CheckCircle2,   badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"            },
  "booking.cancelled":          { label: "Booking cancelled",     icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
  "booking.confirmed":          { label: "Booking confirmed",     icon: CheckCircle2,   badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "booking.status_changed":     { label: "Booking updated",       icon: ArrowRightLeft, badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "field_user.created":         { label: "Team member added",     icon: User,           badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"     },
  "field_user.updated":         { label: "Team member updated",   icon: User,           badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"             },
  "field_user.deactivated":     { label: "Team member deactivated",icon: UserMinus,     badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"     },
  "field_user.reactivated":     { label: "Team member reactivated",icon: UserCheck,     badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "field_user.deleted":         { label: "Team member removed",   icon: Trash2,         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"                 },
};

function getActionMeta(action: string): ActionMeta {
  return ACTION_MAP[action] ?? {
    label: action.replace(/_/g, " ").replace(/\./g, " → "),
    icon: ClipboardList,
    badgeClass: "bg-muted text-muted-foreground",
  };
}

// ─── Entity type labels ───────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  work_order: "Work Order",
  booking: "Booking",
  field_user: "Team Member",
};

// ─── Role labels for actors ───────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  "property-manager": "Property Manager",
  "site-supervisor":  "Site Supervisor",
  "maintenance-tech": "Maintenance Tech",
  "cleaning-staff":   "Cleaning Staff",
  "security-officer": "Security Officer",
  "manager":          "Manager",
  "front-desk":       "Front Desk",
  "housekeeping":     "Housekeeping",
  "maintenance":      "Maintenance",
  "security":         "Security",
};

function roleBadgeClass(role: string | null | undefined): string {
  const map: Record<string, string> = {
    "property-manager": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "site-supervisor":  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "maintenance-tech": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "cleaning-staff":   "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    "security-officer": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    "manager":          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return map[role ?? ""] ?? "bg-muted text-muted-foreground";
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-SA", { day: "numeric", month: "short", year: "numeric" });
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString("en-SA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

interface KpiDef {
  label: string;
  entityType?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const KPI_DEFS: KpiDef[] = [
  { label: "Total Events",   icon: ClipboardList,  color: "text-primary",        bg: "bg-primary/10"      },
  { label: "Tasks",          entityType: "task",        icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Work Orders",    entityType: "work_order",  icon: Wrench,       color: "text-amber-500",   bg: "bg-amber-500/10"  },
  { label: "Team Changes",   entityType: "field_user",  icon: Users,        color: "text-violet-500",  bg: "bg-violet-500/10" },
];

// ─── Entry row ────────────────────────────────────────────────────────────────

function LogEntryRow({ log }: { log: ActivityLog }) {
  const meta = getActionMeta(log.action);
  const Icon = meta.icon;

  return (
    <div className="flex gap-3 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 px-4 -mx-4 rounded transition-colors">
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
            {meta.label}
          </span>
          {log.actorRole && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadgeClass(log.actorRole)}`}>
              {ROLE_LABELS[log.actorRole] ?? log.actorRole}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-foreground leading-tight">
          {log.entityLabel ?? `${ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType} #${log.entityId}`}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          {/* Who */}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {log.actorName ?? "System"}
          </span>
          {/* Where */}
          {log.propertyName && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Building className="h-3 w-3" />
              {log.propertyName}
            </span>
          )}
          {/* Details */}
          {log.details && (
            <span className="text-xs text-muted-foreground/80 truncate max-w-xs">{log.details}</span>
          )}
        </div>
      </div>

      {/* When */}
      <div className="shrink-0 text-right">
        <span
          className="text-xs text-muted-foreground cursor-default"
          title={fullTime(log.createdAt)}
        >
          {relativeTime(log.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  { value: "task",       label: "Tasks"       },
  { value: "work_order", label: "Work Orders" },
  { value: "booking",    label: "Bookings"    },
  { value: "field_user", label: "Team Members"},
];

const ACTOR_ROLES = [
  { value: "property-manager", label: "Property Manager" },
  { value: "site-supervisor",  label: "Site Supervisor"  },
  { value: "maintenance-tech", label: "Maintenance Tech" },
  { value: "cleaning-staff",   label: "Cleaning Staff"   },
  { value: "security-officer", label: "Security Officer" },
  { value: "manager",          label: "Manager"          },
  { value: "front-desk",       label: "Front Desk"       },
];

export default function ActivityLogPage() {
  const [search,         setSearch]         = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actorRoleFilter,  setActorRoleFilter]  = useState("all");
  const [propertyFilter,   setPropertyFilter]   = useState("all");

  const { data: properties } = useListProperties();
  const { data: logs, isLoading, refetch, isFetching } = useListActivityLogs({
    limit: 200,
    entityType:  entityTypeFilter !== "all" ? entityTypeFilter  : undefined,
    actorRole:   actorRoleFilter  !== "all" ? actorRoleFilter   : undefined,
    propertyId:  propertyFilter   !== "all" ? parseInt(propertyFilter) : undefined,
  });

  // Client-side search filter on top of server-side entity/role/property filters
  const filtered = (logs ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.actorName  ?? "").toLowerCase().includes(q) ||
      (log.entityLabel ?? "").toLowerCase().includes(q) ||
      (log.details    ?? "").toLowerCase().includes(q) ||
      (log.propertyName ?? "").toLowerCase().includes(q)
    );
  });

  // KPI counts
  const allLogs = logs ?? [];
  const kpiValues = KPI_DEFS.map((k) =>
    k.entityType
      ? allLogs.filter((l) => l.entityType === k.entityType).length
      : allLogs.length
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            Activity Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete audit trail — every status change, assignment, and team action is recorded automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_DEFS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="shadow-sm border-border/50">
              <CardContent className="flex items-center gap-3 pt-5 pb-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {isLoading
                    ? <Skeleton className="h-6 w-8 mb-1" />
                    : <p className="text-2xl font-bold">{kpiValues[i]}</p>
                  }
                  <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by actor, entity, property, or detail…"
                className="ps-8 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actorRoleFilter} onValueChange={setActorRoleFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ACTOR_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="h-8 w-auto text-xs bg-background">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(entityTypeFilter !== "all" || actorRoleFilter !== "all" || propertyFilter !== "all" || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setEntityTypeFilter("all");
                    setActorRoleFilter("all");
                    setPropertyFilter("all");
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              )}

              <span className="ms-auto text-xs text-muted-foreground">
                {isLoading ? "Loading…" : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
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
                {(logs ?? []).length === 0
                  ? "No activity recorded yet. Actions you take will appear here automatically."
                  : "No events match your filters."
                }
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((log) => (
                <LogEntryRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="shadow-sm border-border/50 bg-muted/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What gets logged automatically</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: CheckCircle2, label: "Task events",       desc: "Create, status changes, assignments, deletes"    },
              { icon: Wrench,       label: "Work order events",  desc: "Create, status changes (open → in progress → done)" },
              { icon: BookOpen,     label: "Booking events",     desc: "Check-in, check-out, cancellations, new bookings" },
              { icon: Users,        label: "Team member events", desc: "Add, deactivate, reactivate, remove"             },
            ].map(({ icon: Icon, label, desc }) => (
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
