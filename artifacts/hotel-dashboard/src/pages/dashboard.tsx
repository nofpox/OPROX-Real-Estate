import React from "react";
import { Link } from "wouter";
import { useGetStatsOverview, useGetRecentBookings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  DoorOpen, 
  DollarSign, 
  Percent, 
  ArrowUpRight, 
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  LineChart
} from "lucide-react";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'checked-in': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'checked-out': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  }
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: recentBookings, isLoading: bookingsLoading } = useGetRecentBookings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your property's performance today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bookings/new">
            <Button className="font-semibold shadow-sm">
              <CalendarDays className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

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
                {stats?.availableRooms || 0} <span className="text-sm font-normal text-muted-foreground">/ {stats?.totalRooms || 0}</span>
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
              <div className="text-2xl font-bold text-foreground">
                {stats?.occupancyRate || 0}%
              </div>
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
              <div className="text-2xl font-bold text-foreground">
                {stats?.activeBookings || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex gap-2">
              <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {stats?.pendingCheckIns || 0} IN</span>
              <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {stats?.pendingCheckOuts || 0} OUT</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
            <CardDescription>Latest bookings and updates across the property.</CardDescription>
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
                          {booking.guestName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none text-foreground">{booking.guestName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.roomName} • {new Date(booking.checkIn).toLocaleDateString()} to {new Date(booking.checkOut).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{formatCurrency(booking.totalAmount)}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 border-0 ${getStatusColor(booking.status)}`}>
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
                <p className="text-xs text-muted-foreground mt-1">New bookings will appear here.</p>
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
            <Link href="/income" className="w-full">
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