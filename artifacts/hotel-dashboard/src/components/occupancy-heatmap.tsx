import React, { useState, useMemo } from "react";
import { useGetOccupancyHeatmap, type OccupancyHeatmapEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getOccupancyColor(pct: number, isToday: boolean): string {
  if (isToday) return "ring-2 ring-primary ring-offset-1";
  return "";
}

function getOccupancyBg(pct: number): string {
  if (pct === 0) return "bg-muted/40";
  if (pct <= 20) return "bg-emerald-100 dark:bg-emerald-950/50";
  if (pct <= 40) return "bg-emerald-200 dark:bg-emerald-900/60";
  if (pct <= 60) return "bg-amber-200 dark:bg-amber-900/60";
  if (pct <= 80) return "bg-orange-300 dark:bg-orange-900/70";
  return "bg-red-400 dark:bg-red-900/80";
}

function getOccupancyText(pct: number): string {
  if (pct === 0) return "text-muted-foreground/50";
  if (pct <= 40) return "text-emerald-800 dark:text-emerald-300";
  if (pct <= 60) return "text-amber-800 dark:text-amber-300";
  if (pct <= 80) return "text-orange-800 dark:text-orange-300";
  return "text-red-800 dark:text-red-200";
}

type TooltipData = {
  x: number;
  y: number;
  propertyName: string;
  date: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPct: number;
};

export function OccupancyHeatmap() {
  const { data: rawData, isLoading } = useGetOccupancyHeatmap({ days: 42 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  }, []);

  // Build structured data: { propertyId, propertyName, days: Map<dateStr, entry> }
  const properties = useMemo(() => {
    if (!rawData) return [];
    const map = new Map<number, { id: number; name: string; cells: Map<string, typeof rawData[0]> }>();
    for (const entry of rawData) {
      if (!map.has(entry.propertyId)) {
        map.set(entry.propertyId, { id: entry.propertyId, name: entry.propertyName, cells: new Map() });
      }
      map.get(entry.propertyId)!.cells.set(entry.date, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [rawData]);

  // Build the sorted list of all dates
  const dates = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const e of rawData) {
      if (!seen.has(e.date)) { seen.add(e.date); result.push(e.date); }
    }
    return result.sort();
  }, [rawData]);

  // Group dates by week for column headers
  const weeks = useMemo(() => {
    const groups: { label: string; dates: string[] }[] = [];
    let currentGroup: string[] = [];
    let currentMonth = "";
    for (const d of dates) {
      const dateObj = new Date(d + "T00:00:00");
      const month = MONTH_SHORT[dateObj.getMonth()];
      if (currentMonth !== month && currentGroup.length > 0) {
        groups.push({ label: currentMonth, dates: currentGroup });
        currentGroup = [];
      }
      currentMonth = month;
      currentGroup.push(d);
    }
    if (currentGroup.length > 0) groups.push({ label: currentMonth, dates: currentGroup });
    return groups;
  }, [dates]);

  // Average occupancy for legend context
  const avgOccupancy = useMemo(() => {
    if (!rawData || rawData.length === 0) return 0;
    const todayEntries = rawData.filter((e) => e.date === today);
    if (todayEntries.length === 0) return 0;
    return Math.round(todayEntries.reduce((s, e) => s + e.occupancyPct, 0) / todayEntries.length);
  }, [rawData, today]);

  const handleMouseEnter = (e: React.MouseEvent, entry: OccupancyHeatmapEntry, propertyName: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      propertyName,
      date: entry.date,
      occupiedRooms: entry.occupiedRooms,
      totalRooms: entry.totalRooms,
      occupancyPct: entry.occupancyPct,
    });
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-serif text-base">Occupancy Heatmap</CardTitle>
            <CardDescription className="text-xs mt-0.5">Rolling 42-day view — past 7 days to next 35 days</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              Today: <span className="font-semibold ml-1">{avgOccupancy}% avg</span>
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Occupancy:</span>
          {[
            { label: "Empty", bg: "bg-muted/40" },
            { label: "≤20%", bg: "bg-emerald-100 dark:bg-emerald-950/50" },
            { label: "≤40%", bg: "bg-emerald-200 dark:bg-emerald-900/60" },
            { label: "≤60%", bg: "bg-amber-200 dark:bg-amber-900/60" },
            { label: "≤80%", bg: "bg-orange-300 dark:bg-orange-900/70" },
            { label: "Full", bg: "bg-red-400 dark:bg-red-900/80" },
          ].map(({ label, bg }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`h-3.5 w-5 rounded-sm border border-border/30 ${bg}`} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton className="h-7 w-full" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            No booking data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Month labels row */}
              <div className="flex gap-[2px] mb-1 pl-[136px]">
                {weeks.map((week) => (
                  <div
                    key={week.label + week.dates[0]}
                    className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider"
                    style={{ width: `${week.dates.length * 22}px` }}
                  >
                    {week.label}
                  </div>
                ))}
              </div>

              {/* Day-of-week header */}
              <div className="flex gap-[2px] mb-2 pl-[136px]">
                {dates.map((d) => {
                  const dateObj = new Date(d + "T00:00:00");
                  const dow = DAY_SHORT[dateObj.getDay()];
                  const isToday = d === today;
                  return (
                    <div
                      key={d}
                      className={`w-5 h-4 text-[9px] font-medium text-center leading-4 shrink-0 ${
                        isToday ? "text-primary font-bold" : "text-muted-foreground/50"
                      }`}
                    >
                      {dateObj.getDate() === 1 || isToday ? dateObj.getDate() : dow}
                    </div>
                  );
                })}
              </div>

              {/* Property rows */}
              {properties.map((property) => (
                <div key={property.id} className="flex items-center gap-[2px] mb-1.5">
                  {/* Property name */}
                  <div className="w-[130px] shrink-0 pr-2 text-right">
                    <span className="text-[11px] font-medium text-foreground/80 leading-none truncate block">
                      {property.name}
                    </span>
                  </div>

                  {/* Cells */}
                  {dates.map((d) => {
                    const entry = property.cells.get(d);
                    const pct = entry?.occupancyPct ?? 0;
                    const isToday = d === today;
                    return (
                      <div
                        key={d}
                        className={`w-5 h-7 rounded-sm cursor-default shrink-0 transition-transform hover:scale-110 hover:z-10 relative ${getOccupancyBg(pct)} ${isToday ? "ring-2 ring-primary ring-offset-0 z-10" : ""}`}
                        onMouseEnter={(e) => entry && handleMouseEnter(e, entry, property.name)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {pct > 0 && (
                          <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold ${getOccupancyText(pct)}`}>
                            {pct >= 10 ? pct : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Today indicator */}
              <div className="flex gap-[2px] mt-1 pl-[136px]">
                {dates.map((d) => (
                  <div
                    key={d}
                    className={`w-5 h-1 rounded-full shrink-0 ${d === today ? "bg-primary" : "bg-transparent"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl px-3 py-2.5 text-xs min-w-[160px]">
            <p className="font-semibold text-sm mb-1">{tooltip.propertyName}</p>
            <p className="text-muted-foreground">
              {new Date(tooltip.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Occupied</span>
                <span className="font-semibold">{tooltip.occupiedRooms} / {tooltip.totalRooms}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Occupancy</span>
                <span className={`font-bold ${
                  tooltip.occupancyPct >= 80 ? "text-red-600 dark:text-red-400"
                  : tooltip.occupancyPct >= 60 ? "text-orange-600 dark:text-orange-400"
                  : tooltip.occupancyPct >= 40 ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {tooltip.occupancyPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
