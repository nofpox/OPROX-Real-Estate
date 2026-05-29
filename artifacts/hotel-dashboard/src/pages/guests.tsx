import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListGuests } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MoreHorizontal, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookingStatusBadge } from "@/pages/bookings";
import { useTranslation } from "react-i18next";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getDeterministicColor(name: string) {
  const colors = [
    "bg-red-100 text-red-700", "bg-orange-100 text-orange-700", "bg-amber-100 text-amber-700",
    "bg-green-100 text-green-700", "bg-emerald-100 text-emerald-700", "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700", "bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700", "bg-purple-100 text-purple-700", "bg-fuchsia-100 text-fuchsia-700",
    "bg-pink-100 text-pink-700", "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Guests() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryParams = debouncedQuery ? { search: debouncedQuery } : {};
  const { data: guests, isLoading } = useListGuests(queryParams);

  const totalGuests = guests?.length || 0;
  const returningGuests = guests?.filter((g) => g.totalBookings > 1).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("guests.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("guests.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: t("guests.kpi.totalGuests"), value: isLoading ? null : totalGuests },
          { label: t("guests.kpi.returningGuests"), value: isLoading ? null : returningGuests },
        ].map(({ label, value }) => (
          <Card key={label} className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {value === null ? <Skeleton className="h-8 w-20" /> : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-border/50">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("guests.searchPlaceholder")}
              className="w-full ps-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("guests.columns.guest")}</TableHead>
                <TableHead>{t("guests.columns.phone")}</TableHead>
                <TableHead>{t("guests.columns.stays")}</TableHead>
                <TableHead>{t("guests.columns.lastStay")}</TableHead>
                <TableHead>{t("guests.columns.lastStatus")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                    {[100, 40, 80, 100, 80].map((w, j) => (
                      <TableCell key={j}><Skeleton className={`h-4 w-[${w}px]`} /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : guests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t("guests.noGuests")}
                  </TableCell>
                </TableRow>
              ) : (
                guests?.map((guest) => (
                  <TableRow key={guest.guestEmail} className="group">
                    <TableCell>
                      <Link href={`/guests/${encodeURIComponent(guest.guestEmail)}`} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className={`font-semibold ${getDeterministicColor(guest.guestName)}`}>
                            {getInitials(guest.guestName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{guest.guestName}</span>
                          <span className="text-xs text-muted-foreground">{guest.guestEmail}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{guest.guestPhone || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{guest.totalBookings}</TableCell>
                    <TableCell>
                      {guest.lastStay
                        ? new Date(guest.lastStay + "T00:00:00").toLocaleDateString()
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {guest.lastStatus
                        ? <BookingStatusBadge status={guest.lastStatus} />
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t("common.actions")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/guests/${encodeURIComponent(guest.guestEmail)}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="me-2 h-4 w-4" /> {t("guests.viewProfile")}
                            </DropdownMenuItem>
                          </Link>
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
