import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListBookings, 
  getListBookingsQueryKey,
  useCancelBooking
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Ban
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export const BookingStatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'confirmed': 
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">Confirmed</Badge>;
    case 'checked-in': 
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">Checked In</Badge>;
    case 'checked-out': 
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">Checked Out</Badge>;
    case 'cancelled': 
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>;
    default: 
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const queryParams = statusFilter !== "all" ? { status: statusFilter } : {};
  const { data: bookings, isLoading } = useListBookings(queryParams);
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCancel = (id: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBooking.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Booking cancelled successfully" });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        },
        onError: () => {
          toast({ title: "Failed to cancel booking", variant: "destructive" });
        }
      });
    }
  };

  const filteredBookings = bookings?.filter(b => 
    b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.roomName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage all reservations and stays.</p>
        </div>
        <Link href="/bookings/new">
          <Button className="font-semibold shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search guests or rooms..."
                className="w-full pl-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="checked-out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No bookings found.
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
                        <span>{new Date(booking.checkIn).toLocaleDateString()}</span>
                        <span className="text-muted-foreground text-xs">to {new Date(booking.checkOut).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/bookings/${booking.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                          </Link>
                          {booking.status !== 'cancelled' && booking.status !== 'checked-out' && (
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => handleCancel(booking.id)}
                            >
                              <Ban className="mr-2 h-4 w-4" /> Cancel booking
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