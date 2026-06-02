import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useListRooms,
  useListProperties,
  type Room,
  type Property,
} from "@workspace/api-client-react";
import { Card, CardContent }   from "@/components/ui/card";
import { Badge }               from "@/components/ui/badge";
import { Button }              from "@/components/ui/button";
import { Input }               from "@/components/ui/input";
import { Skeleton }            from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Users, DoorOpen, Wrench, Sparkles,
  Search, BedDouble, DollarSign, MapPin,
} from "lucide-react";

// ── Status configuration ──────────────────────────────────────────────────────

type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";

const STATUS_CONFIG: Record<RoomStatus, {
  dotClass:   string;
  cardClass:  string;
  badgeClass: string;
  Icon:       React.ElementType;
}> = {
  available:   { dotClass: "bg-green-500", cardClass: "bg-green-50  border-green-200  hover:border-green-400",  badgeClass: "bg-green-100  text-green-700",  Icon: DoorOpen  },
  occupied:    { dotClass: "bg-amber-500", cardClass: "bg-amber-50  border-amber-200  hover:border-amber-400",  badgeClass: "bg-amber-100  text-amber-700",  Icon: BedDouble },
  maintenance: { dotClass: "bg-red-500",   cardClass: "bg-red-50    border-red-200    hover:border-red-400",    badgeClass: "bg-red-100    text-red-700",    Icon: Wrench    },
  cleaning:    { dotClass: "bg-blue-500",  cardClass: "bg-blue-50   border-blue-200   hover:border-blue-400",   badgeClass: "bg-blue-100   text-blue-700",   Icon: Sparkles  },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status as RoomStatus] ?? STATUS_CONFIG.available;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UnitMap() {
  const { t } = useTranslation();

  const [propFilter,   setPropFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [activeRoom,   setActiveRoom]   = useState<Room | null>(null);

  const { data: roomsRaw,  isLoading: roomsLoading }  = useListRooms({});
  const { data: propsRaw,  isLoading: propsLoading }  = useListProperties({});

  const rooms:      Room[]     = useMemo(() => (roomsRaw as any)?.data ?? roomsRaw ?? [],  [roomsRaw]);
  const properties: Property[] = useMemo(() => (propsRaw as any)?.data ?? propsRaw ?? [], [propsRaw]);

  const isLoading = roomsLoading || propsLoading;

  // ── KPI counts ──────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:       rooms.length,
    available:   rooms.filter(r => r.status === "available").length,
    occupied:    rooms.filter(r => r.status === "occupied").length,
    maintenance: rooms.filter(r => r.status === "maintenance" || r.status === "cleaning").length,
  }), [rooms]);

  // ── Filtered + grouped rooms ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const filtered = rooms.filter(r => {
      if (propFilter   !== "all" && String(r.propertyId) !== propFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter)           return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const map = new Map<number | null, Room[]>();
    filtered.forEach(r => {
      const key = r.propertyId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [rooms, propFilter, statusFilter, search]);

  const propById = (id: number | null) => properties.find(p => p.id === id);

  // ── KPI card config ─────────────────────────────────────────────────────────
  const KPI = [
    { key: "total",       Icon: Building2, color: "text-foreground",  bg: "bg-muted/40",  value: counts.total       },
    { key: "available",   Icon: DoorOpen,  color: "text-green-600",   bg: "bg-green-50",  value: counts.available   },
    { key: "occupied",    Icon: BedDouble, color: "text-amber-600",   bg: "bg-amber-50",  value: counts.occupied    },
    { key: "maintenance", Icon: Wrench,    color: "text-red-600",     bg: "bg-red-50",    value: counts.maintenance },
  ] as const;

  // ── Active room's property ───────────────────────────────────────────────────
  const activeProp = activeRoom ? propById(activeRoom.propertyId ?? null) : undefined;

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">{t("unitMap.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("unitMap.subtitle")}</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPI.map(({ key, Icon, color, bg, value }) => (
          <Card key={key} className={`${bg} border`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{t(`unitMap.${key}`)}</span>
              </div>
              {isLoading
                ? <Skeleton className="h-8 w-12" />
                : <p className={`text-3xl font-bold ${color}`}>{value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-9"
            placeholder={t("unitMap.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={propFilter} onValueChange={setPropFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t("unitMap.allProperties")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("unitMap.allProperties")}</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("unitMap.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("unitMap.allStatuses")}</SelectItem>
            {(["available", "occupied", "maintenance", "cleaning"] as RoomStatus[]).map(s => (
              <SelectItem key={s} value={s}>{t(`unitMap.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="font-medium text-muted-foreground">{t("unitMap.legend")}:</span>
        {(["available", "occupied", "maintenance", "cleaning"] as RoomStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[s].dotClass}`} />
            {t(`unitMap.${s}`)}
          </span>
        ))}
      </div>

      {/* ── Map content ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-8">
          {[0, 1].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-52" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-28 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : grouped.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">{t("unitMap.noUnits")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([propId, propRooms]) => {
            const property = propById(propId);
            return (
              <div key={propId ?? "unassigned"}>
                {/* Property header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <h2 className="font-semibold text-lg">
                    {property?.name ?? t("unitMap.unassigned")}
                  </h2>
                  {property?.city && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.city}
                    </span>
                  )}
                  <Badge variant="outline" className="ms-auto text-xs font-medium">
                    {propRooms.length}&nbsp;{propRooms.length === 1 ? "unit" : "units"}
                  </Badge>
                </div>

                {/* Room grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {propRooms.map(room => {
                    const cfg  = getStatusCfg(room.status);
                    const Icon = cfg.Icon;
                    return (
                      <button
                        key={room.id}
                        onClick={() => setActiveRoom(room)}
                        className={`relative rounded-xl border-2 p-3 text-start transition-all duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${cfg.cardClass}`}
                      >
                        {/* Status dot */}
                        <span className={`absolute top-2.5 end-2.5 h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />

                        {/* Icon + name */}
                        <Icon className="h-5 w-5 mb-2 opacity-50" />
                        <p className="font-semibold text-sm leading-tight truncate pe-4">{room.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 capitalize">{room.type}</p>

                        {/* Capacity + price */}
                        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                          <Users className="h-3 w-3 shrink-0" />
                          <span>{room.capacity ?? 1}</span>
                          <span className="ms-auto font-semibold text-foreground">
                            ${Number(room.pricePerNight).toFixed(0)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 border-b border-border/40" />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Room detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!activeRoom} onOpenChange={open => { if (!open) setActiveRoom(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          {activeRoom && (() => {
            const cfg  = getStatusCfg(activeRoom.status);
            const Icon = cfg.Icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {activeRoom.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                  {/* Status */}
                  <Row label={t("unitMap.details.status")}>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badgeClass}`}>
                      <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
                      {t(`unitMap.${activeRoom.status as RoomStatus}`)}
                    </span>
                  </Row>

                  {/* Property */}
                  {activeProp && (
                    <Row label={t("unitMap.details.property")}>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {activeProp.name}
                      </span>
                    </Row>
                  )}

                  {/* Type */}
                  <Row label={t("unitMap.details.type")}>
                    <Badge variant="secondary" className="capitalize">{activeRoom.type}</Badge>
                  </Row>

                  {/* Capacity */}
                  <Row label={t("unitMap.details.capacity")}>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {activeRoom.capacity ?? 1}
                    </span>
                  </Row>

                  {/* Price */}
                  <Row label={t("unitMap.details.price")}>
                    <span className="text-sm font-semibold flex items-center gap-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      {Number(activeRoom.pricePerNight).toFixed(2)}&nbsp;<span className="font-normal text-muted-foreground">{t("unitMap.priceNight")}</span>
                    </span>
                  </Row>

                  {/* Description */}
                  {activeRoom.description && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t("unitMap.details.description")}</p>
                      <p className="text-sm leading-relaxed">{activeRoom.description}</p>
                    </div>
                  )}

                  {/* Amenities */}
                  {activeRoom.amenities && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("unitMap.details.amenities")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeRoom.amenities.split(",").map(a => (
                          <Badge key={a} variant="outline" className="text-xs">{a.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full mt-1" onClick={() => setActiveRoom(null)}>
                    {t("unitMap.details.close")}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper: label-value row ───────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex justify-end">{children}</div>
    </div>
  );
}
