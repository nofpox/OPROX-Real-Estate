import React, { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { 
  useGetBooking, 
  getGetBookingQueryKey,
  useUpdateBooking,
  useCancelBooking,
  getListBookingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Loader2, 
  CalendarDays, 
  User, 
  Phone, 
  Mail, 
  DoorOpen, 
  CreditCard,
  Ban,
  CheckCircle2,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookingStatusBadge } from "./bookings";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useGetBooking(id, { 
    query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) } 
  });
  
  const updateBooking = useUpdateBooking();
  const cancelBooking = useCancelBooking();

  const handleStatusChange = (newStatus: string) => {
    updateBooking.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: `Booking marked as ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBooking.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Booking cancelled" });
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to cancel booking", variant: "destructive" });
        }
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
        <h2 className="text-2xl font-semibold">Booking not found</h2>
        <Button onClick={() => setLocation("/bookings")} className="mt-4">Back to bookings</Button>
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
            <h1 className="text-2xl font-serif font-bold tracking-tight">Booking #{booking.id}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>Created on {new Date(booking.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Stay Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><DoorOpen className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">Room</p>
                      <p className="text-base">{booking.roomName} <span className="text-muted-foreground text-sm">({booking.roomType})</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-0.5"><CalendarDays className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">Dates</p>
                      <p className="text-base">{new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><CreditCard className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">Total Amount</p>
                      <p className="text-base font-semibold text-foreground">{formatCurrency(booking.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <p className="text-sm font-medium mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <div className="mt-0.5"><User className="h-5 w-5 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-base">{booking.guestName}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-base">{booking.guestEmail}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5"><Phone className="h-5 w-5 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-base">{booking.guestPhone || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {booking.status === 'confirmed' && (
                <Button 
                  className="w-full justify-start" 
                  onClick={() => handleStatusChange('checked-in')}
                  disabled={updateBooking.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Check In
                </Button>
              )}
              {booking.status === 'checked-in' && (
                <Button 
                  className="w-full justify-start" 
                  onClick={() => handleStatusChange('checked-out')}
                  disabled={updateBooking.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Check Out
                </Button>
              )}
              {booking.status !== 'cancelled' && booking.status !== 'checked-out' && (
                <Button 
                  variant="destructive" 
                  className="w-full justify-start" 
                  onClick={handleCancel}
                  disabled={cancelBooking.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" /> Cancel Booking
                </Button>
              )}
              
              {booking.status === 'cancelled' && (
                <div className="text-sm text-center text-muted-foreground py-2 border rounded-md border-dashed">
                  This booking has been cancelled.
                </div>
              )}
              {booking.status === 'checked-out' && (
                <div className="text-sm text-center text-muted-foreground py-2 border rounded-md border-dashed">
                  Guest has checked out.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}