import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("bookings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("bookings.subtitle")}</p>
      </div>
    </div>
  );
}
