import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell, Waves, Users, Tv2, Car, Wind, Clock, CheckCircle2, XCircle,
  Plus, CalendarDays,
} from "lucide-react";
import { useListProperties } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Facility definitions ─────────────────────────────────────────────────────

interface FacilityDef {
  id: string;
  icon: React.ElementType;
  capacity: number;
  slots: string[];
  color: string;
  bg: string;
}

const FACILITY_DEFS: FacilityDef[] = [
  { id: "gym",       icon: Dumbbell, capacity: 12, slots: ["06:00 – 08:00","08:00 – 10:00","10:00 – 12:00","16:00 – 18:00","18:00 – 20:00"], color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { id: "pool",      icon: Waves,    capacity: 20, slots: ["07:00 – 09:00","09:00 – 11:00","14:00 – 16:00","16:00 – 18:00"],                  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20"   },
  { id: "meeting-a", icon: Users,    capacity: 8,  slots: ["09:00 – 11:00","11:00 – 13:00","14:00 – 16:00","16:00 – 18:00"],                  color: "text-violet-600 dark:text-violet-400",bg: "bg-violet-50 dark:bg-violet-900/20"},
  { id: "lounge",    icon: Tv2,      capacity: 30, slots: ["10:00 – 13:00","14:00 – 17:00","18:00 – 21:00"],                                  color: "text-rose-600 dark:text-rose-400",   bg: "bg-rose-50 dark:bg-rose-900/20"   },
  { id: "parking",   icon: Car,      capacity: 6,  slots: ["Anytime (4-hour max)"],                                                            color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/20" },
  { id: "rooftop",   icon: Wind,     capacity: 40, slots: ["08:00 – 12:00","12:00 – 16:00","16:00 – 20:00"],                                  color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-900/20"},
];

function mockAvailability(facilityId: string, slot: string): "available" | "busy" {
  const hash = (facilityId + slot).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 3 === 0 ? "busy" : "available";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Facilities() {
  const { t } = useTranslation();
  const { data: properties } = useListProperties();
  const [selectedProperty,  setSelectedProperty]  = useState<string>("all");
  const [selectedFacility,  setSelectedFacility]  = useState<FacilityDef>(FACILITY_DEFS[0]);

  const today = new Date();
  const dayLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{t("facilities.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("facilities.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue placeholder={t("facilities.allProperties")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("facilities.allProperties")}</SelectItem>
              {properties?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            {t("facilities.newBooking")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Facility list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            {t("facilities.commonAreas")}
          </p>
          {FACILITY_DEFS.map((fac) => {
            const Icon = fac.icon;
            const isSelected = selectedFacility.id === fac.id;
            const facName = t(`facilities.names.${fac.id}`, { defaultValue: fac.id });
            return (
              <button
                key={fac.id}
                onClick={() => setSelectedFacility(fac)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-all flex items-center gap-3 ${
                  isSelected
                    ? `${fac.bg} border-current ${fac.color} ring-1 ring-current/30`
                    : "bg-card border-border hover:bg-muted/40"
                }`}
              >
                <div className={`rounded-md p-1.5 ${fac.bg}`}>
                  <Icon className={`h-4 w-4 ${fac.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-tight ${isSelected ? fac.color : "text-foreground"}`}>
                    {facName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("facilities.capacity", { count: fac.capacity })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Availability panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {React.createElement(selectedFacility.icon, { className: `h-4 w-4 ${selectedFacility.color}` })}
                    {t(`facilities.names.${selectedFacility.id}`, { defaultValue: selectedFacility.id })}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dayLabel}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {t("facilities.max", { count: selectedFacility.capacity })}
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="space-y-2">
                {selectedFacility.slots.map((slot) => {
                  const status = mockAvailability(selectedFacility.id, slot);
                  return (
                    <div key={slot} className="flex items-center justify-between rounded-md border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{slot}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === "available" ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("facilities.available")}
                            </span>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs" disabled>
                              {t("facilities.reserve")}
                            </Button>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" />
                            {t("facilities.reserved")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-4 text-center">
                <p className="text-xs text-muted-foreground">{t("facilities.comingSoon")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
