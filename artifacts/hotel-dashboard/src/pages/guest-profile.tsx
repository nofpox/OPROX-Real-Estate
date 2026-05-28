import React from "react";
import { Link, useParams } from "wouter";
import { 
  useGetGuest,
  getGetGuestQueryKey
} from "@workspace/api-client-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Mail, Phone, Calendar, CreditCard } from "lucide-react";
import { BookingStatusBadge } from "@/pages/bookings";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getDeterministicColor(name: string) {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-orange-100 text-orange-700",
    "bg-amber-100 text-amber-700",
    "bg-green-100 text-green-700",
    "bg-emerald-100 text-emerald-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-purple-100 text-purple-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-pink-100 text-pink-700",
    "bg-rose-100 text-rose-700"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function GuestProfile() {
  const params = useParams();
  const email = params.email ? decodeURIComponent(params.email) : "";

  const { data: guest, isLoading, isError } = useGetGuest(email, {
    query: {
      enabled: !!email,
      queryKey: getGetGuestQueryKey(email)
    }
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-semibold mb-2">Guest not found</h2>
        <p className="text-muted-foreground mb-4">We couldn't find a guest with that email address.</p>
        <Link href="/guests">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Guests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/guests">
          <Button variant="ghost" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Guests
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <div className="h-24 bg-muted/40 border-b border-border/50" />
        <CardContent className="pt-0 relative px-6 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-6">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
            ) : (
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm bg-background">
                <AvatarFallback className={`text-2xl font-semibold ${guest ? getDeterministicColor(guest.guestName) : ""}`}>
                  {guest ? getInitials(guest.guestName) : ""}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1 space-y-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-serif font-bold">{guest?.guestName}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {guest?.guestEmail}
                    </div>
                    {guest?.guestPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {guest.guestPhone}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/50 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-full">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Stays</p>
                <div className="text-xl font-semibold">{isLoading ? <Skeleton className="h-7 w-12" /> : guest?.totalBookings}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-full">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Spent</p>
                <div className="text-xl font-semibold">{isLoading ? <Skeleton className="h-7 w-24" /> : guest && formatCurrency(guest.totalSpent)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-full">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Member Since</p>
                <div className="text-base font-semibold pt-0.5">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : (guest?.firstStay ? new Date(guest.firstStay + 'T00:00:00').toLocaleDateString() : "-")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg">Booking History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : guest?.bookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No bookings found for this guest.
                  </TableCell>
                </TableRow>
              ) : (
                guest?.bookings?.map((booking) => {
                  const checkIn = new Date(booking.checkIn);
                  const checkOut = new Date(booking.checkOut);
                  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{booking.roomName}</span>
                          <span className="text-xs text-muted-foreground">{booking.roomType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(booking.checkIn + 'T00:00:00').toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(booking.checkOut + 'T00:00:00').toLocaleDateString()}</TableCell>
                      <TableCell>{nights}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(booking.totalAmount)}</TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs px-2">
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
