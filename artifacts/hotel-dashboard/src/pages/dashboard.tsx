import React from "react";
import { Link } from "wouter";
import { useListRooms, useListWorkOrders, useListTasks, useListGuestRequests } from "@workspace/api-client-react";
import { OccupancyHeatmap } from "@/components/occupancy-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DoorOpen, Percent, Wrench, MapPin, Building2, Building,
  Sparkles, InboxIcon, Users, Dumbbell, Calendar,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import type { BusinessMode } from "@/config/modules";

// ─── Mode identity config ─────────────────────────────────────────────────────

const MODE_CONFIG: Record<BusinessMode, {
  modeLabel: string;
  badgeColor: string;
  subtitle: string;
  unitLabel: string;
}> = {
  hotel: {
    modeLabel: "Hotel",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    subtitle: "Room availability, maintenance, and guest services",
    unitLabel: "Rooms",
  },
  compound: {
    modeLabel: "Compound",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    subtitle: "Unit status, maintenance, and resident services",
    unitLabel: "Units",
  },
  tower: {
    modeLabel: "Residential Tower",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    subtitle: "Building systems, facility management, and resident services",
    unitLabel: "Residential Units",
  },
  "serviced-apartments": {
    modeLabel: "Serviced Apartments",
    badgeColor: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    subtitle: "Unit readiness, cleaning workflows, and resident support",
    unitLabel: "Apartments",
  },
};

// ─── Mode-specific KPI definitions ───────────────────────────────────────────

interface KPIDef {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface OperationalData {
  occupiedCount: number;
  availableCount: number;
  totalCount: number;
  occupancyPct: number;
  openMaintenance: number;
  cleaningPending: number;
  serviceRequests: number;
}

function getKPIs(mode: BusinessMode, d: OperationalData): KPIDef[] {
  switch (mode) {
    case "hotel":
      return [
        {
          label: "Available Rooms", value: String(d.availableCount),
          sub: `of ${d.totalCount} total rooms`,
          icon: DoorOpen, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10",
        },
        {
          label: "Occupancy Rate", value: `${d.occupancyPct}%`,
          sub: `${d.occupiedCount} rooms currently occupied`,
          icon: Percent, iconColor: "text-blue-500", iconBg: "bg-blue-500/10",
        },
        {
          label: "Maintenance Tickets", value: String(d.openMaintenance),
          sub: "open work orders",
          icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10",
        },
        {
          label: "Service Requests", value: String(d.serviceRequests),
          sub: "pending resolution",
          icon: InboxIcon, iconColor: "text-violet-500", iconBg: "bg-violet-500/10",
        },
      ];

    case "compound":
      return [
        {
          label: "Units Occupied", value: `${d.occupiedCount} / ${d.totalCount}`,
          sub: `${d.occupancyPct}% occupancy`,
          icon: Building2, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10",
        },
        {
          label: "Maintenance Tickets", value: String(d.openMaintenance),
          sub: "open work orders",
          icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10",
        },
        {
          label: "Cleaning Pending", value: String(d.cleaningPending),
          sub: "housekeeping tasks",
          icon: Sparkles, iconColor: "text-sky-500", iconBg: "bg-sky-500/10",
        },
        {
          label: "Service Requests", value: String(d.serviceRequests),
          sub: "pending resolution",
          icon: InboxIcon, iconColor: "text-violet-500", iconBg: "bg-violet-500/10",
        },
      ];

    case "tower":
      return [
        {
          label: "Resident Occupancy", value: `${d.occupancyPct}%`,
          sub: `${d.occupiedCount} of ${d.totalCount} units occupied`,
          icon: Users, iconColor: "text-teal-500", iconBg: "bg-teal-500/10",
        },
        {
          label: "Maintenance Tickets", value: String(d.openMaintenance),
          sub: "open work orders",
          icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10",
        },
        {
          label: "Cleaning Pending", value: String(d.cleaningPending),
          sub: "housekeeping tasks",
          icon: Sparkles, iconColor: "text-sky-500", iconBg: "bg-sky-500/10",
        },
        {
          label: "Service Requests", value: String(d.serviceRequests),
          sub: "pending resolution",
          icon: InboxIcon, iconColor: "text-violet-500", iconBg: "bg-violet-500/10",
        },
      ];

    case "serviced-apartments":
      return [
        {
          label: "Units Ready", value: String(d.availableCount),
          sub: `of ${d.totalCount} apartments`,
          icon: DoorOpen, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10",
        },
        {
          label: "Cleaning Tasks", value: String(d.cleaningPending),
          sub: "pending today",
          icon: Sparkles, iconColor: "text-sky-500", iconBg: "bg-sky-500/10",
        },
        {
          label: "Maintenance Tickets", value: String(d.openMaintenance),
          sub: "open work orders",
          icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10",
        },
        {
          label: "Service Requests", value: String(d.serviceRequests),
          sub: "pending resolution",
          icon: InboxIcon, iconColor: "text-violet-500", iconBg: "bg-violet-500/10",
        },
      ];
  }
}

// ─── Mode-specific quick actions ──────────────────────────────────────────────

interface ActionDef {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function getQuickActions(mode: BusinessMode, enabledModules: string[]): ActionDef[] {
  const has = (id: string) => enabledModules.includes(id);
  switch (mode) {
    case "hotel":
      return [
        { label: "Manage Rooms",    href: "/rooms",           icon: DoorOpen,  color: "text-emerald-500" },
        ...(has("bookings")        ? [{ label: "New Booking",      href: "/bookings/new",   icon: Calendar,  color: "text-blue-500"   }] : []),
        ...(has("maintenance")     ? [{ label: "Maintenance",       href: "/maintenance",    icon: Wrench,    color: "text-amber-500"  }] : []),
        ...(has("housekeeping")    ? [{ label: "Cleaning Tasks",    href: "/tasks",          icon: Sparkles,  color: "text-sky-500"    }] : []),
        ...(has("serviceRequests") ? [{ label: "Guest Requests",    href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
      ];

    case "tower":
      return [
        { label: "Residential Units", href: "/rooms",           icon: Building,  color: "text-teal-500"   },
        ...(has("facility")        ? [{ label: "Facility Booking",  href: "/facilities",     icon: Dumbbell,  color: "text-orange-500" }] : []),
        ...(has("maintenance")     ? [{ label: "Maintenance",       href: "/maintenance",    icon: Wrench,    color: "text-amber-500"  }] : []),
        ...(has("housekeeping")    ? [{ label: "Cleaning Tasks",    href: "/tasks",          icon: Sparkles,  color: "text-sky-500"    }] : []),
        ...(has("serviceRequests") ? [{ label: "Service Requests",  href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
      ];

    case "compound":
      return [
        ...(has("unitMap")         ? [{ label: "Unit Map",          href: "/unit-map",       icon: MapPin,    color: "text-indigo-500" }] : []),
        { label: "All Units",         href: "/rooms",           icon: Building2, color: "text-emerald-500" },
        ...(has("maintenance")     ? [{ label: "Maintenance",       href: "/maintenance",    icon: Wrench,    color: "text-amber-500"  }] : []),
        ...(has("housekeeping")    ? [{ label: "Cleaning Tasks",    href: "/tasks",          icon: Sparkles,  color: "text-sky-500"    }] : []),
        ...(has("serviceRequests") ? [{ label: "Service Requests",  href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
      ];

    case "serviced-apartments":
    default:
      return [
        { label: "Manage Apartments", href: "/rooms",           icon: DoorOpen,  color: "text-emerald-500" },
        ...(has("housekeeping")    ? [{ label: "Cleaning Tasks",    href: "/tasks",          icon: Sparkles,  color: "text-sky-500"    }] : []),
        ...(has("maintenance")     ? [{ label: "Maintenance",       href: "/maintenance",    icon: Wrench,    color: "text-amber-500"  }] : []),
        ...(has("serviceRequests") ? [{ label: "Service Requests",  href: "/guest-requests", icon: InboxIcon, color: "text-violet-500" }] : []),
      ];
  }
}

// ─── Room status colours ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-red-100    text-red-700    border-red-200    dark:bg-red-900/20    dark:text-red-400",
  available:   "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
  maintenance: "bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400",
  cleaning:    "bg-sky-100    text-sky-700    border-sky-200    dark:bg-sky-900/20    dark:text-sky-400",
};

const STATUS_DOT: Record<string, string> = {
  occupied: "bg-red-500", available: "bg-emerald-500", maintenance: "bg-amber-500", cleaning: "bg-sky-500",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const settings = useSettings();
  const mode = settings.businessMode;
  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.hotel;

  const { data: rooms,        isLoading: roomsLoading } = useListRooms();
  const { data: workOrders                             } = useListWorkOrders({ status: "open" });
  const { data: pendingTasks                           } = useListTasks({ status: "pending" } as any);
  const { data: guestRequests                          } = useListGuestRequests();

  const allRooms       = rooms ?? [];
  const occupiedCount  = allRooms.filter((r) => r.status === "occupied").length;
  const availableCount = allRooms.filter((r) => r.status === "available").length;
  const maintenanceRooms = allRooms.filter((r) => r.status === "maintenance").length;
  const cleaningRooms  = allRooms.filter((r) => r.status === "cleaning").length;
  const totalCount     = allRooms.length;
  const occupancyPct   = totalCount > 0 ? Math.round((occupiedCount  / totalCount) * 100) : 0;
  const readyPct       = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  const openMaintenance = workOrders?.length ?? 0;
  const cleaningPending = (pendingTasks as any[])?.filter((t: any) => t.category === "housekeeping").length ?? 0;
  const serviceRequests = guestRequests?.filter((r) => r.status !== "completed" && r.status !== "resolved").length ?? 0;

  const kpis         = getKPIs(mode, { occupiedCount, availableCount, totalCount, occupancyPct, openMaintenance, cleaningPending, serviceRequests });
  const quickActions = getQuickActions(mode, settings.enabledModules);
  const showHeatmap  = settings.enabledModules.includes("bookings");

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {settings.propertyName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{cfg.subtitle}</p>
        </div>
        <Badge className={`${cfg.badgeColor} border-0 text-xs font-semibold self-start sm:self-auto px-3 py-1`}>
          {cfg.modeLabel}
        </Badge>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="shadow-sm border-border/50">
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
                  ? <Skeleton className="h-8 w-20" />
                  : <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                }
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Unit Readiness Bar ─────────────────────────────────────────────── */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium font-serif">{cfg.unitLabel} Readiness</CardTitle>
            <span className="text-xs text-muted-foreground">{readyPct}% ready</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden bg-muted/30">
            {occupiedCount    > 0 && <div className="bg-red-500   transition-all" style={{ width: `${(occupiedCount    / Math.max(totalCount, 1)) * 100}%` }} />}
            {maintenanceRooms > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(maintenanceRooms / Math.max(totalCount, 1)) * 100}%` }} />}
            {cleaningRooms    > 0 && <div className="bg-sky-500   transition-all" style={{ width: `${(cleaningRooms    / Math.max(totalCount, 1)) * 100}%` }} />}
            {availableCount   > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(availableCount / Math.max(totalCount, 1)) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {[
              { label: "Occupied",     color: "bg-red-500",     count: occupiedCount    },
              { label: "Maintenance",  color: "bg-amber-500",   count: maintenanceRooms },
              { label: "Cleaning",     color: "bg-sky-500",     count: cleaningRooms    },
              { label: "Available",    color: "bg-emerald-500", count: availableCount   },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                {count} {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Occupancy heatmap — only when bookings module is active ─────────── */}
      {showHeatmap && <OccupancyHeatmap />}

      {/* ── Unit grid + Quick actions ─────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-7">

        {/* Unit Status Grid */}
        <Card className="md:col-span-5 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">{cfg.unitLabel}</CardTitle>
            <p className="text-sm text-muted-foreground">Live status of all {cfg.unitLabel.toLowerCase()}</p>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : allRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DoorOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No units found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {allRooms.map((room) => {
                  const status     = (room.status ?? "available").toLowerCase();
                  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS["available"];
                  const dotClass   = STATUS_DOT[status]   ?? STATUS_DOT["available"];
                  return (
                    <Link key={room.id} href="/rooms">
                      <div className={`group relative rounded-lg border p-2.5 cursor-pointer hover:shadow-md transition-all ${colorClass}`}>
                        <span className={`h-2 w-2 rounded-full block mb-1 ${dotClass}`} />
                        <p className="text-xs font-semibold leading-tight truncate">{room.name}</p>
                        <p className="text-[10px] opacity-70 capitalize mt-0.5">{status}</p>
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
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">Common operations</p>
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
