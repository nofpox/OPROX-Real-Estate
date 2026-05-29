import React, { useState } from "react";
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
import { useTranslation } from "react-i18next";

// ─── Facility definitions (static config — would move to DB in production) ──

interface FacilityDef {
  id: string;
  name: string;
  icon: React.ElementType;
  capacity: number;
  slots: string[];
  color: string;
  bg: string;
}

const FACILITY_DEFS: FacilityDef[] = [
  {
    id: "gym",
    name: "Fitness Center",
    icon: Dumbbell,
    capacity: 12,
    slots: ["06:00 – 08:00", "08:00 – 10:00", "10:00 – 12:00", "16:00 – 18:00", "18:00 – 20:00"],
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    id: "pool",
    name: "Swimming Pool",
    icon: Waves,
    capacity: 20,
    slots: ["07:00 – 09:00", "09:00 – 11:00", "14:00 – 16:00", "16:00 – 18:00"],
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "meeting-a",
    name: "Meeting Room A",
    icon: Users,
    capacity: 8,
    slots: ["09:00 – 11:00", "11:00 – 13:00", "14:00 – 16:00", "16:00 – 18:00"],
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
  {
    id: "lounge",
    name: "Sky Lounge",
    icon: Tv2,
    capacity: 30,
    slots: ["10:00 – 13:00", "14:00 – 17:00", "18:00 – 21:00"],
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
  },
  {
    id: "parking",
    name: "Visitor Parking",
    icon: Car,
    capacity: 6,
    slots: ["Anytime (4-hour max)"],
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
  },
  {
    id: "rooftop",
    name: "Rooftop Garden",
    icon: Wind,
    capacity: 40,
    slots: ["08:00 – 12:00", "12:00 – 16:00", "16:00 – 20:00"],
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
];

// Simulated slot availability (would be fetched from API in production)
function mockAvailability(facilityId: string, slot: string): "available" | "busy" | "full" {
  const hash = (facilityId + slot).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = hash % 3;
  return r === 0 ? "busy" : r === 1 ? "available" : "available";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Facilities() {
  const { t } = useTranslation();
  const { data: properties } = useListProperties();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedFacility, setSelectedFacility] = useState<FacilityDef>(FACILITY_DEFS[0]);

  const today = new Date();
  const dayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Facility Booking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage common area reservations across all properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Facility list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Common Areas
          </p>
          {FACILITY_DEFS.map((fac) => {
            const Icon = fac.icon;
            const isSelected = selectedFacility.id === fac.id;
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
                    {fac.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Capacity: {fac.capacity} people</p>
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
                    {React.createElement(selectedFacility.icon, {
                      className: `h-4 w-4 ${selectedFacility.color}`,
                    })}
                    {selectedFacility.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dayLabel}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {selectedFacility.capacity} max
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="space-y-2">
                {selectedFacility.slots.map((slot) => {
                  const status = mockAvailability(selectedFacility.id, slot);
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{slot}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === "available" ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Available
                            </span>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs" disabled>
                              Reserve
                            </Button>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Reserved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coming soon notice */}
              <div className="mt-5 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Full booking management — resident lookup, confirmation emails, and conflict detection —
                  is coming in the next release.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
