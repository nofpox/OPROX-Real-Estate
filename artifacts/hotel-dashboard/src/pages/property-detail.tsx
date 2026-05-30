import React from "react";
import { useRoute, Link } from "wouter";
import {
  useGetProperty, getGetPropertyQueryKey,
  useGetPropertyStats, getGetPropertyStatsQueryKey,
  useListRooms, useListWorkOrders,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Building2, Wrench, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PropertyDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const { data: property, isLoading: isPropertyLoading } = useGetProperty(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) },
  });
  const { data: stats, isLoading: isStatsLoading } = useGetPropertyStats(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyStatsQueryKey(propertyId) },
  });
  const { data: allRooms, isLoading: isRoomsLoading } = useListRooms();
  const rooms = allRooms?.filter((r) => r.propertyId === propertyId) || [];
  const { data: workOrders, isLoading: isWorkOrdersLoading } = useListWorkOrders({ propertyId });

  if (isPropertyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <div><Skeleton className="h-10 w-1/3 mb-2" /><Skeleton className="h-5 w-1/4" /></div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">{t("properties.detail.notFound", "Property not found")}</h2>
        <Link href="/properties"><Button variant="outline">{t("properties.detail.backToProperties")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/properties">
        <Button variant="ghost" className="px-0 hover:bg-transparent -ms-2 text-muted-foreground">
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("properties.detail.backToProperties")}
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{property.name}</h1>
          {property.status === "inactive" && (
            <Badge variant="outline" className="text-gray-500">{t("status.inactive")}</Badge>
          )}
        </div>
        <div className="flex items-center text-muted-foreground">
          <MapPin className="me-1.5 h-4 w-4" />
          <span>{property.address}, {property.city}, {property.country}</span>
        </div>
        {property.description && <p className="text-muted-foreground mt-2 max-w-3xl">{property.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { icon: Building2, label: t("properties.detail.totalRooms"), value: stats?.unitCount || 0, color: "" },
          { icon: AlertCircle, label: t("properties.detail.openWorkOrders", "Open Work Orders"), value: stats?.openWorkOrders || 0, color: "text-amber-600 dark:text-amber-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm font-medium">{label}</p>
              </div>
              {isStatsLoading ? <Skeleton className="h-9 w-16" /> : (
                <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold">{t("properties.units")}</h2>
            <Link href="/rooms"><Button variant="outline" size="sm">{t("rooms.title")}</Button></Link>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead>{t("rooms.columns.room")}</TableHead>
                    <TableHead>{t("rooms.columns.type")}</TableHead>
                    <TableHead>{t("rooms.columns.status")}</TableHead>
                    <TableHead>{t("rooms.columns.capacity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRoomsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {[100, 80, 60, 80, 40].map((w, j) => <TableCell key={j}><Skeleton className={`h-4 w-[${w}px]`} /></TableCell>)}
                      </TableRow>
                    ))
                  ) : rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("properties.detail.noRooms")}</TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>{t(`rooms.types.${room.type}`, room.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            room.status === "available" ? "bg-green-50 text-green-700 border-green-200" :
                            room.status === "occupied" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-orange-50 text-orange-700 border-orange-200"
                          }>
                            {t(`status.${room.status}`, room.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{room.capacity} {t("rooms.guests")}</TableCell>
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
            <h2 className="text-xl font-serif font-semibold">{t("properties.detail.workOrders")}</h2>
            <Link href={`/maintenance?propertyId=${propertyId}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">{t("common.viewDetails")}</Button>
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
              ) : !workOrders || workOrders.filter((w) => w.status !== "completed").length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Wrench className="h-8 w-8 mb-2 opacity-20" />
                  <p>{t("properties.detail.noWorkOrders")}</p>
                </div>
              ) : (
                workOrders.filter((w) => w.status !== "completed").slice(0, 5).map((wo) => (
                  <div key={wo.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm line-clamp-1" title={wo.title}>{wo.title}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${
                        wo.priority === "urgent" ? "bg-red-100 text-red-800" :
                        wo.priority === "high" ? "bg-orange-100 text-orange-800" :
                        wo.priority === "medium" ? "bg-amber-100 text-amber-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {t(`priority.${wo.priority}`).toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{wo.unitName ? `${t("common.unit")}: ${wo.unitName}` : t("maintenance.fields.propertyWide")}</span>
                      {wo.dueDate && (
                        <span className={new Date(wo.dueDate) < new Date() ? "text-red-500 font-medium" : ""}>
                          {new Date(wo.dueDate + "T00:00:00").toLocaleDateString()}
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
