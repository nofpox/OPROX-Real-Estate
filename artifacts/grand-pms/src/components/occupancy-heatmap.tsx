import React, { useState, useMemo } from "react";
import { useGetOccupancyHeatmap } from "@/lib/local-hooks";
import type { OccupancyHeatmapEntry } from "@/lib/local-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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

type TooltipData = { x:number; y:number; propertyName:string; date:string; occupiedRooms:number; totalRooms:number; occupancyPct:number };

export function OccupancyHeatmap() {
  const { t } = useTranslation();
  const { data: rawData, isLoading } = useGetOccupancyHeatmap({ days: 42 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const grouped = useMemo(() => {
    if (!rawData) return [];
    const map = new Map<string, OccupancyHeatmapEntry[]>();
    for (const e of rawData) {
      if (!map.has(e.propertyName)) map.set(e.propertyName, []);
      map.get(e.propertyName)!.push(e);
    }
    return Array.from(map.entries()).map(([name, entries]) => ({
      name, entries: entries.sort((a,b) => a.date.localeCompare(b.date)),
    }));
  }, [rawData]);

  const allDates = useMemo(() => {
    if (!rawData) return [];
    const dates = [...new Set(rawData.map(e => e.date))].sort();
    return dates;
  }, [rawData]);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div><CardTitle className="text-base font-semibold">{t("dashboard.heatmap.title","Occupancy Heatmap")}</CardTitle><CardDescription className="text-xs mt-0.5">{t("dashboard.heatmap.subtitle","42-day rolling view")}</CardDescription></div>
          <div className="flex gap-1.5 text-[10px] items-center flex-wrap">
            {[[0,"0%","bg-muted/40"],[20,"1-20%","bg-emerald-200"],[40,"21-40%","bg-amber-200"],[60,"41-60%","bg-orange-300"],[100,"60%+","bg-red-400"]].map(([,l,c])=>(
              <span key={l as string} className="flex items-center gap-1"><span className={`h-3 w-3 rounded-sm ${c}`}/>{l}</span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          {grouped.map(({ name, entries }) => (
            <div key={name} className="mb-4 last:mb-0">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate max-w-xs">{name}</p>
              <div className="flex gap-0.5 flex-wrap">
                {entries.map(e => {
                  const eDate = new Date(e.date + "T00:00:00");
                  const isToday = eDate.getTime() === today.getTime();
                  return (
                    <div
                      key={e.date}
                      className={`relative h-7 w-7 rounded-sm flex items-center justify-center text-[9px] font-medium cursor-pointer transition-opacity hover:opacity-80 ${getOccupancyBg(e.occupancyPct)} ${getOccupancyText(e.occupancyPct)} ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                      title={`${e.date}: ${e.occupancyPct}% (${e.occupiedRooms}/${e.totalRooms})`}
                      onMouseEnter={ev => setTooltip({ x: ev.clientX, y: ev.clientY, propertyName: e.propertyName, date: e.date, occupiedRooms: e.occupiedRooms, totalRooms: e.totalRooms, occupancyPct: e.occupancyPct })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {e.occupancyPct > 0 ? `${e.occupancyPct}` : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {tooltip && (
          <div className="fixed z-50 bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2 text-xs pointer-events-none" style={{ left: tooltip.x+12, top: tooltip.y-40 }}>
            <p className="font-semibold">{tooltip.propertyName}</p>
            <p className="text-muted-foreground">{tooltip.date}</p>
            <p>{tooltip.occupancyPct}% — {tooltip.occupiedRooms}/{tooltip.totalRooms} rooms</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
