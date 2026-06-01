import React, { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

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

interface Booking {
  id: number;
  guestName: string;
  guestEmail: string;
  roomId: number;
  roomName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  propertyId?: number;
  propertyName?: string;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const STATUSES = ["confirmed", "checked-in", "checked-out", "cancelled"];

export default function Bookings() {
  const { t } = useTranslation();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      return fetch(`/api/bookings${qs ? `?${qs}` : ""}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const filtered = search
    ? bookings.filter(b =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
        b.roomName.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("bookings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("bookings.subtitle")}</p>
        </div>
        <Link href="/bookings/new">
          <Button>
            <Plus className="h-4 w-4 me-2" />
            {t("bookings.new")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("bookings.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("bookings.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("bookings.allStatuses")}</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("bookings.columns.guest")}</TableHead>
                <TableHead>{t("bookings.columns.room")}</TableHead>
                <TableHead>{t("bookings.columns.dates")}</TableHead>
                <TableHead className="text-right">{t("bookings.columns.amount")}</TableHead>
                <TableHead>{t("bookings.columns.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    {t("bookings.noBookings")}
                  </TableCell>
                </TableRow>
              ) : filtered.map(b => (
                <TableRow key={b.id} className="group">
                  <TableCell>
                    <p className="font-medium">{b.guestName}</p>
                    <p className="text-xs text-muted-foreground">{b.guestEmail}</p>
                  </TableCell>
                  <TableCell>
                    <p>{b.roomName}</p>
                    <p className="text-xs text-muted-foreground">{b.roomType}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span>{new Date(b.checkIn + "T00:00:00").toLocaleDateString()}</span>
                    <span className="mx-1">→</span>
                    <span>{new Date(b.checkOut + "T00:00:00").toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(b.totalAmount)}</TableCell>
                  <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                  <TableCell>
                    <Link href={`/bookings/${b.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100">
                        {t("common.viewDetails")}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
