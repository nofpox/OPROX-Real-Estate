import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListBookings,
  getListBookingsQueryKey,
  useCancelBooking
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, MoreHorizontal, Eye, Ban } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export const BookingStatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  switch (status.toLowerCase()) {
    case "confirmed":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">{t("status.confirmed")}</Badge>;
    case "checked-in":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">{t("status.checked-in")}</Badge>;
    case "checked-out":
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">{t("status.checked-out")}</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400">{t("status.cancelled")}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Bookings() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = statusFilter !== "all" ? { status: statusFilter } : {};
  const { data: bookings, isLoading } = useListBookings(queryParams);
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCancel = (id: number) => {
    if (confirm(t("bookings.cancelConfirm"))) {
      cancelBooking.mutate({ id }, {
        onSuccess: () => {
          toast({ title: t("bookings.cancelSuccess") });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        },
        onError: () => {
          toast({ title: t("bookings.cancelFailed"), variant: "destructive" });
        },
      });
    }
  };

  const filteredBookings = bookings?.filter(
    (b) =>
      b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roomName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("bookings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("bookings.subtitle")}</p>
        </div>
        <Link href="/bookings/new">
          <Button className="font-semibold shadow-sm">
            <Plus className="me-2 h-4 w-4" />
            {t("bookings.new")}
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border/50">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("bookings.searchPlaceholder")}
                className="w-full ps-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder={t("bookings.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bookings.allStatuses")}</SelectItem>
                <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
                <SelectItem value="checked-in">{t("status.checked-in")}</SelectItem>
                <SelectItem value="checked-out">{t("status.checked-out")}</SelectItem>
                <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("bookings.columns.guest")}</TableHead>
                <TableHead>{t("bookings.columns.room")}</TableHead>
                <TableHead>{t("bookings.columns.dates")}</TableHead>
                <TableHead>{t("bookings.columns.amount")}</TableHead>
                <TableHead>{t("bookings.columns.status")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[150, 100, 180, 80, 80].map((w, j) => (
                      <TableCell key={j}><Skeleton className={`h-4 w-[${w}px]`} /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t("bookings.noBookings")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings?.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.guestName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{booking.roomName}</span>
                        <span className="text-xs text-muted-foreground">{booking.roomType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{new Date(booking.checkIn + "T00:00:00").toLocaleDateString()}</span>
                        <span className="text-muted-foreground text-xs">→ {new Date(booking.checkOut + "T00:00:00").toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell><BookingStatusBadge status={booking.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t("common.actions")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/bookings/${booking.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="me-2 h-4 w-4" /> {t("bookings.actions.viewDetails")}
                            </DropdownMenuItem>
                          </Link>
                          {booking.status !== "cancelled" && booking.status !== "checked-out" && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => handleCancel(booking.id)}
                            >
                              <Ban className="me-2 h-4 w-4" /> {t("bookings.actions.cancel")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
