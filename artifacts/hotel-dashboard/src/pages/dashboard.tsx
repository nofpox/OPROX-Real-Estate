import React, { useState } from "react";
import { Link } from "wouter";
import { useGetStatsOverview, useGetRecentBookings } from "@workspace/api-client-react";
import { OccupancyHeatmap } from "@/components/occupancy-heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  DoorOpen,
  DollarSign,
  Percent,
  ArrowUpRight,
  CalendarDays,
  Clock,
  LineChart,
  LayoutGrid,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";

const PROPERTY_TYPES = [
  { value: "all", label: "All Properties" },
  { value: "Hotel", label: "Hotel" },
  { value: "Compound", label: "Compound" },
  { value: "Furnished Apartments", label: "Furnished Apartments" },
  { value: "Apartment", label: "Apartment" },
];

const TYPE_BADGE: Record<string, string> = {
  Hotel: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Compound: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Furnished Apartments": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  Apartment: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "checked-in": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "checked-out": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
  }
};

export default function Dashboard() {
  const [selectedType, setSelectedType] = useState("all");

  const typeParam = selectedType === "all" ? undefined : selectedType;

  const { data: stats, isLoading: statsLoading } = useGetStatsOverview(
    typeParam ? { propertyType: typeParam } : undefined
  );
  const { data: recentBookings, isLoading: bookingsLoading } = useGetRecentBookings(
    typeParam ? { propertyType: typeParam } : undefined
  );

  const selectedLabel = PROPERTY_TYPES.find((t) => t.value === selectedType)?.label ?? "All Properties";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {selectedType === "all"
              ? "Overview of your full portfolio's performance today."
              : `Showing data for ${selectedLabel} properties only.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Property Type Switcher */}
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Property Type:</span>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-7 border-0 bg-transparent shadow-none focus:ring-0 px-1 text-sm font-semibold min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      {t.value !== "all" && (
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          t.value === "Hotel" ? "bg-blue-500"
                          : t.value === "Compound" ? "bg-green-500"
                          : t.value === "Furnished Apartments" ? "bg-indigo-500"
                          : "bg-amber-500"
                        }`} />
                      )}
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType !== "all" && (
            <Badge className={`${TYPE_BADGE[selectedType] ?? ""} border-0 text-xs font-medium`}>
              {selectedLabel}
            </Badge>
          )}

          <Link href="/bookings/new">
            <Button className="font-semibold shadow-sm">
              <CalendarDays className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (Monthly)</CardTitle>
            <div className="p-2 bg-primary/10 rounded-md">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Rooms</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-md">
              <DoorOpen className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {stats?.availableRooms || 0}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ {stats?.totalRooms || 0}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ready for check-in today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-md">
              <Percent className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{stats?.occupancyRate || 0}%</div>
            )}
            <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${stats?.occupancyRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Bookings</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-md">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{stats?.activeBookings || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex gap-2">
              <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {stats?.pendingCheckIns || 0} IN</span>
              <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {stats?.pendingCheckOuts || 0} OUT</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy heatmap — filters by type client-side */}
      <OccupancyHeatmap propertyType={typeParam} />

      {/* Recent activity + quick actions */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
            <CardDescription>
              {selectedType === "all"
                ? "Latest bookings and updates across the portfolio."
                : `Latest bookings for ${selectedLabel} properties.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-6">
                {recentBookings.slice(0, 6).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/5 text-primary font-medium">
                          {booking.guestName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none text-foreground">{booking.guestName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.roomName} •{" "}
                          {new Date(booking.checkIn).toLocaleDateString()} to{" "}
                          {new Date(booking.checkOut).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{formatCurrency(booking.totalAmount)}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 h-5 border-0 ${getStatusColor(booking.status)}`}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No recent bookings</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedType === "all"
                    ? "New bookings will appear here."
                    : `No bookings found for ${selectedLabel} properties.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/bookings/new" className="w-full">
              <Button variant="outline" className="w-full justify-start h-12">
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                Create Booking
              </Button>
            </Link>
            <Link href="/rooms" className="w-full">
              <Button variant="outline" className="w-full justify-start h-12">
                <DoorOpen className="mr-2 h-4 w-4 text-blue-500" />
                Manage Rooms
              </Button>
            </Link>
            <Link href="/finance" className="w-full">
              <Button variant="outline" className="w-full justify-start h-12">
                <LineChart className="mr-2 h-4 w-4 text-emerald-500" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
