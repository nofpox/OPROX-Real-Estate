import React from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetProperty,
  getGetPropertyQueryKey,
  useGetPropertyStats,
  getGetPropertyStatsQueryKey,
  useListRooms,
  useListWorkOrders
} from "@workspace/api-client-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, MapPin, Building2, Wrench, Calendar as CalendarIcon, DollarSign, AlertCircle } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export default function PropertyDetail() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const { data: property, isLoading: isPropertyLoading } = useGetProperty(propertyId, { 
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) } 
  });
  
  const { data: stats, isLoading: isStatsLoading } = useGetPropertyStats(propertyId, { 
    query: { enabled: !!propertyId, queryKey: getGetPropertyStatsQueryKey(propertyId) } 
  });

  const { data: allRooms, isLoading: isRoomsLoading } = useListRooms();
  const rooms = allRooms?.filter(r => r.propertyId === propertyId) || [];

  const { data: workOrders, isLoading: isWorkOrdersLoading } = useListWorkOrders({ propertyId });

  if (isPropertyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <div>
          <Skeleton className="h-10 w-1/3 mb-2" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Property not found</h2>
        <Link href="/properties">
          <Button variant="outline">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/properties">
        <Button variant="ghost" className="px-0 hover:bg-transparent -ml-2 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{property.name}</h1>
          <Badge className={
            property.type.toLowerCase() === 'hotel' ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
            property.type.toLowerCase() === 'apartment' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
            "bg-green-100 text-green-800 hover:bg-green-100"
          }>{property.type}</Badge>
          {property.status === 'inactive' && (
            <Badge variant="outline" className="text-gray-500">Inactive</Badge>
          )}
        </div>
        <div className="flex items-center text-muted-foreground">
          <MapPin className="mr-1.5 h-4 w-4" />
          <span>{property.address}, {property.city}, {property.country}</span>
        </div>
        {property.description && (
          <p className="text-muted-foreground mt-2 max-w-3xl">{property.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Building2 className="h-4 w-4" />
              <p className="text-sm font-medium">Total Units</p>
            </div>
            <h2 className="text-3xl font-bold">{isStatsLoading ? <Skeleton className="h-9 w-16" /> : (stats?.unitCount || 0)}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CalendarIcon className="h-4 w-4" />
              <p className="text-sm font-medium">Active Bookings</p>
            </div>
            <h2 className="text-3xl font-bold">{isStatsLoading ? <Skeleton className="h-9 w-16" /> : (stats?.activeBookings || 0)}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <p className="text-sm font-medium">Net Income</p>
            </div>
            <h2 className={`text-3xl font-bold ${!isStatsLoading && (stats?.netIncome || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {isStatsLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(stats?.netIncome || 0)}
            </h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Open Work Orders</p>
            </div>
            <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-500">
              {isStatsLoading ? <Skeleton className="h-9 w-16" /> : (stats?.openWorkOrders || 0)}
            </h2>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold">Units</h2>
            <Link href="/rooms">
              <Button variant="outline" size="sm">Manage Units</Button>
            </Link>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead>Unit / Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRoomsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                      </TableRow>
                    ))
                  ) : rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No units found for this property.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium text-primary">
                          <Link href={`/bookings?room=${room.id}`}>{room.name}</Link>
                        </TableCell>
                        <TableCell>{room.type}</TableCell>
                        <TableCell>{formatCurrency(room.pricePerNight)}<span className="text-xs text-muted-foreground">/nt</span></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            room.status === 'available' ? 'bg-green-50 text-green-700 border-green-200' :
                            room.status === 'occupied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-orange-50 text-orange-700 border-orange-200'
                          }>
                            {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{room.capacity} Guests</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold">Recent Work Orders</h2>
            <Link href={`/maintenance?propertyId=${propertyId}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
            </Link>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-0 divide-y">
              {isWorkOrdersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : !workOrders || workOrders.filter(w => w.status !== 'completed').length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Wrench className="h-8 w-8 mb-2 opacity-20" />
                  <p>No open work orders.</p>
                </div>
              ) : (
                workOrders.filter(w => w.status !== 'completed').slice(0, 5).map(wo => (
                  <div key={wo.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm line-clamp-1" title={wo.title}>{wo.title}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${
                        wo.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        wo.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {wo.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{wo.unitName ? `Unit: ${wo.unitName}` : 'Property level'}</span>
                      {wo.dueDate && (
                        <span className={new Date(wo.dueDate) < new Date() ? "text-red-500 font-medium" : ""}>
                          Due: {new Date(wo.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}