import React from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetBooking, getGetBookingQueryKey, useUpdateBooking, useCancelBooking, getListBookingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, CalendarDays, User, Phone, Mail, DoorOpen, CreditCard, Ban, CheckCircle2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookingStatusBadge } from "./bookings";
import { useTranslation } from "react-i18next";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function BookingDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/bookings/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useGetBooking(id, {
    query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) },
  });

  const updateBooking = useUpdateBooking();
  const cancelBooking = useCancelBooking();

  const handleStatusChange = (newStatus: string) => {
    updateBooking.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: t("bookings.markedAs", { status: newStatus }) });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      },
      onError: () => { toast({ title: t("bookings.updateFailed"), variant: "destructive" }); },
    });
  };

  const handleCancel = () => {
    if (confirm(t("bookings.cancelConfirm"))) {
      cancelBooking.mutate({ id }, {
        onSuccess: () => {
          toast({ title: t("bookings.cancelledSuccess") });
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        },
        onError: () => { toast({ title: t("bookings.cancelFailed"), variant: "destructive" }); },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">{t("bookings.notFound")}</h2>
        <Button onClick={() => setLocation("/bookings")} className="mt-4">{t("bookings.backToBookings")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/bookings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">{t("bookings.bookingNumber", { id: booking.id })}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{t("bookings.createdOn", { date: new Date(booking.createdAt).toLocaleDateString() })}</span>
            </div>
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader><CardTitle>{t("bookings.stayDetails")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <DoorOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t("rooms.columns.room")}</p>
                      <p className="text-base">{booking.roomName} <span className="text-muted-foreground text-sm">({booking.roomType})</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t("bookings.columns.dates")}</p>
                      <p className="text-base">{new Date(booking.checkIn + "T00:00:00").toLocaleDateString()} — {new Date(booking.checkOut + "T00:00:00").toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t("bookings.columns.amount")}</p>
                      <p className="text-base font-semibold">{formatCurrency(booking.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
              {booking.notes && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <p className="text-sm font-medium mb-2">{t("common.notes")}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader><CardTitle>{t("bookings.guestInformation")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t("common.name")}</p>
                    <p className="text-base">{booking.guestName}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t("common.email")}</p>
                    <p className="text-base">{booking.guestEmail}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t("common.phone")}</p>
                    <p className="text-base">{booking.guestPhone || t("common.notProvided")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader><CardTitle>{t("bookings.actions")}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {booking.status === "confirmed" && (
                <Button className="w-full justify-start" onClick={() => handleStatusChange("checked-in")} disabled={updateBooking.isPending}>
                  <CheckCircle2 className="me-2 h-4 w-4" /> {t("bookings.checkIn")}
                </Button>
              )}
              {booking.status === "checked-in" && (
                <Button className="w-full justify-start" onClick={() => handleStatusChange("checked-out")} disabled={updateBooking.isPending}>
                  <LogOut className="me-2 h-4 w-4" /> {t("bookings.checkOut")}
                </Button>
              )}
              {booking.status !== "cancelled" && booking.status !== "checked-out" && (
                <Button variant="destructive" className="w-full justify-start" onClick={handleCancel} disabled={cancelBooking.isPending}>
                  <Ban className="me-2 h-4 w-4" /> {t("bookings.cancelBooking")}
                </Button>
              )}
              {booking.status === "cancelled" && (
                <div className="text-sm text-center text-muted-foreground py-2 border rounded-md border-dashed">
                  {t("bookings.bookingCancelled")}
                </div>
              )}
              {booking.status === "checked-out" && (
                <div className="text-sm text-center text-muted-foreground py-2 border rounded-md border-dashed">
                  {t("bookings.guestCheckedOut")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
