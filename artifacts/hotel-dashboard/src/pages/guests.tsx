import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ArrowLeft, Users, UserCheck, DollarSign } from "lucide-react";
import { BookingStatusBadge } from "./bookings";

interface Guest {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  totalBookings: number;
  totalSpent: number;
  lastStay: string | null;
  firstStay: string | null;
  lastRoomType: string | null;
  lastStatus: string | null;
}

interface GuestBooking {
  id: number;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  roomName: string | null;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function GuestProfile({ email, onBack }: { email: string; onBack: () => void }) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<Guest & { bookings: GuestBooking[] }>({
    queryKey: ["guest-profile", email],
    queryFn: () =>
      fetch(`/api/guests/${encodeURIComponent(email)}`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if ((data as unknown as { error: string }).error) {
    return (
      <div className="text-center py-16 text-muted-foreground">{t("guests.profile.notFound")}</div>
    );
  }

  const { bookings, ...g } = data;

  const stats = [
    { label: t("guests.profile.totalStays"),  value: String(g.totalBookings) },
    { label: t("guests.profile.totalSpent"),  value: fmtMoney(g.totalSpent) },
    { label: t("guests.profile.firstStay"),   value: g.firstStay ? new Date(g.firstStay + "T00:00:00").toLocaleDateString() : "—" },
    { label: t("guests.profile.lastStay"),    value: g.lastStay  ? new Date(g.lastStay  + "T00:00:00").toLocaleDateString() : "—" },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 me-1" />
        {t("guests.profile.backToGuests")}
      </Button>

      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{g.guestName.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold">{g.guestName}</h1>
          <p className="text-muted-foreground">{g.guestEmail}</p>
          {g.guestPhone && <p className="text-sm text-muted-foreground">{g.guestPhone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("guests.profile.bookingHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">{t("guests.profile.noBookings")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>{b.roomName ?? "—"}</TableCell>
                    <TableCell>{new Date(b.checkIn + "T00:00:00").toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(b.checkOut + "T00:00:00").toLocaleDateString()}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(b.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Guests() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const { data: guests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ["guests", search],
    queryFn: () => {
      const url = `/api/guests${search ? `?search=${encodeURIComponent(search)}` : ""}`;
      return fetch(url, { credentials: "include" }).then(r => r.json());
    },
  });

  if (selectedEmail) {
    return <GuestProfile email={selectedEmail} onBack={() => setSelectedEmail(null)} />;
  }

  const returning = guests.filter(g => g.totalBookings > 1).length;
  const totalRevenue = guests.reduce((s, g) => s + g.totalSpent, 0);

  const kpis = [
    { label: t("guests.kpi.totalGuests"),    value: String(guests.length), icon: Users      },
    { label: t("guests.kpi.returningGuests"), value: String(returning),   icon: UserCheck   },
    { label: t("guests.kpi.totalRevenue"),   value: fmtMoney(totalRevenue), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("guests.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("guests.subtitle")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold mt-0.5">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("guests.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("guests.columns.guest")}</TableHead>
                <TableHead>{t("guests.columns.phone")}</TableHead>
                <TableHead className="text-right">{t("guests.columns.stays")}</TableHead>
                <TableHead className="text-right">{t("guests.columns.totalSpent")}</TableHead>
                <TableHead>{t("guests.columns.lastStay")}</TableHead>
                <TableHead>{t("guests.columns.lastStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </TableCell>
                </TableRow>
              ) : guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("guests.noGuests")}
                  </TableCell>
                </TableRow>
              ) : guests.map(g => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedEmail(g.guestEmail)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{g.guestName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{g.guestName}</p>
                        <p className="text-xs text-muted-foreground">{g.guestEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{g.guestPhone ?? "—"}</TableCell>
                  <TableCell className="text-right">{g.totalBookings}</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(g.totalSpent)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.lastStay ? new Date(g.lastStay + "T00:00:00").toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    {g.lastStatus ? <BookingStatusBadge status={g.lastStatus} /> : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">{t("guests.viewProfile")}</Button>
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
