import React from "react";
  import { Link } from "wouter";
  import { useGetStatsOverview, useListRooms, useListWorkOrders } from "@workspace/api-client-react";
  import { OccupancyHeatmap } from "@/components/occupancy-heatmap";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import {
    DoorOpen, DollarSign, Percent, Wrench, ArrowUpRight,
    LineChart, MapPin, CheckCircle2, Settings,
  } from "lucide-react";
  import { useTranslation } from "react-i18next";
  import branding from "@/config/branding";

  const TYPE_BADGE: Record<string, string> = {
    Hotel: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Compound: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "Furnished Apartments": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  };

  const STATUS_COLORS: Record<string, string> = {
    occupied: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
    available: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
    maintenance: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
    cleaning: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
  };

  const UNIT_DOT: Record<string, string> = {
    occupied: "bg-red-500",
    available: "bg-emerald-500",
    maintenance: "bg-amber-500",
    cleaning: "bg-blue-500",
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  export default function Dashboard() {
    const { t } = useTranslation();

    const typeParam = branding.propertyType === "all" ? undefined : branding.propertyType;
    const { data: stats, isLoading: statsLoading } = useGetStatsOverview(typeParam ? { propertyType: typeParam } : undefined);
    const { data: rooms, isLoading: roomsLoading } = useListRooms();
    const { data: workOrders } = useListWorkOrders({ status: "open" });

    // Compute operational counts from rooms
    const allRooms = rooms ?? [];
    const filteredRooms = allRooms;
    const occupiedCount = filteredRooms.filter((r) => r.status === "occupied").length;
    const availableCount = filteredRooms.filter((r) => r.status === "available").length;
    const maintenanceCount = filteredRooms.filter((r) => r.status === "maintenance").length;
    const cleaningCount = filteredRooms.filter((r) => r.status === "cleaning").length;
    const totalCount = filteredRooms.length;
    const readyPct = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

    // Open work orders count (maintenance requests)
    const openWorkOrders = workOrders?.length ?? 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{branding.propertyName}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
          </div>
          {typeParam && (
            <Badge className={`${TYPE_BADGE[typeParam] ?? ""} border-0 text-xs font-medium self-start sm:self-auto`}>
              {t(`propertyType.${typeParam}`)}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.totalRevenue")}</CardTitle>
              <div className="p-2 bg-primary/10 rounded-md"><DollarSign className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.monthlyRevenue || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-medium">12.5%</span> {t("dashboard.fromLastMonth")}
              </p>
            </CardContent>
          </Card>

          {/* Available Units */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.availableUnits")}</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-md"><DoorOpen className="h-4 w-4 text-emerald-500" /></div>
            </CardHeader>
            <CardContent>
              {roomsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">
                  {availableCount} <span className="text-sm font-normal text-muted-foreground">/ {totalCount}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{t("dashboard.readyForOccupancy")}</p>
            </CardContent>
          </Card>

          {/* Occupancy Rate */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.occupancyRate")}</CardTitle>
              <div className="p-2 bg-indigo-500/10 rounded-md"><Percent className="h-4 w-4 text-indigo-500" /></div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{stats?.occupancyRate || 0}%</div>
              )}
              <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${stats?.occupancyRate || 0}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.maintenanceAlert")}</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-md"><Wrench className="h-4 w-4 text-amber-500" /></div>
            </CardHeader>
            <CardContent>
              {roomsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{maintenanceCount + openWorkOrders}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {maintenanceCount} {t("dashboard.unitsInMaintenance")} · {openWorkOrders} {t("dashboard.openOrders")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unit Readiness Bar */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium font-serif">{t("dashboard.unitReadiness")}</CardTitle>
              <span className="text-xs text-muted-foreground">{readyPct}% {t("dashboard.ready")}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden">
              {occupiedCount > 0 && (
                <div className="bg-red-500 transition-all" style={{ width: `${(occupiedCount / Math.max(totalCount, 1)) * 100}%` }} title={`${occupiedCount} Occupied`} />
              )}
              {maintenanceCount > 0 && (
                <div className="bg-amber-500 transition-all" style={{ width: `${(maintenanceCount / Math.max(totalCount, 1)) * 100}%` }} title={`${maintenanceCount} Maintenance`} />
              )}
              {cleaningCount > 0 && (
                <div className="bg-blue-500 transition-all" style={{ width: `${(cleaningCount / Math.max(totalCount, 1)) * 100}%` }} title={`${cleaningCount} Cleaning`} />
              )}
              {availableCount > 0 && (
                <div className="bg-emerald-500 transition-all" style={{ width: `${(availableCount / Math.max(totalCount, 1)) * 100}%` }} title={`${availableCount} Available`} />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {[
                { label: t("status.occupied"), color: "bg-red-500", count: occupiedCount },
                { label: t("dashboard.maintenance"), color: "bg-amber-500", count: maintenanceCount },
                { label: t("dashboard.cleaning"), color: "bg-blue-500", count: cleaningCount },
                { label: t("status.available"), color: "bg-emerald-500", count: availableCount },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {count} {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <OccupancyHeatmap propertyType={typeParam} />

        <div className="grid gap-6 md:grid-cols-7">
          {/* Unit Status Grid */}
          <Card className="md:col-span-5 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="font-serif">{t("dashboard.unitStatusOverview")}</CardTitle>
              <CardDescription>{t("dashboard.unitStatusDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DoorOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t("common.noData")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filteredRooms.map((room) => {
                    const status = (room.status ?? "available").toLowerCase();
                    const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS["available"];
                    const dotClass = UNIT_DOT[status] ?? UNIT_DOT["available"];
                    return (
                      <Link key={room.id} href="/rooms">
                        <div className={`group relative rounded-lg border p-2.5 cursor-pointer hover:shadow-md transition-all ${colorClass}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
                          </div>
                          <p className="text-xs font-semibold leading-tight truncate">{room.name}</p>
                          <p className="text-[10px] opacity-70 capitalize mt-0.5">{t(`status.${status}`, status)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operational Quick Actions */}
          <Card className="md:col-span-2 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="font-serif">{t("dashboard.quickActions")}</CardTitle>
              <CardDescription>{t("dashboard.quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link href="/rooms" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <DoorOpen className="me-2 h-4 w-4 text-emerald-500" />
                  {t("dashboard.manageUnits")}
                </Button>
              </Link>
              <Link href="/unit-map" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <MapPin className="me-2 h-4 w-4 text-indigo-500" />
                  {t("dashboard.viewUnitMap")}
                </Button>
              </Link>
              <Link href="/maintenance" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Wrench className="me-2 h-4 w-4 text-amber-500" />
                  {t("dashboard.maintenance")}
                </Button>
              </Link>
              <Link href="/finance" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <LineChart className="me-2 h-4 w-4 text-primary" />
                  {t("dashboard.viewReports")}
                </Button>
              </Link>
              <Link href="/guest-requests" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <CheckCircle2 className="me-2 h-4 w-4 text-blue-500" />
                  {t("dashboard.guestRequests")}
                </Button>
              </Link>
              <Link href="/user-management" className="w-full">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Settings className="me-2 h-4 w-4 text-slate-500" />
                  {t("dashboard.userManagement")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  