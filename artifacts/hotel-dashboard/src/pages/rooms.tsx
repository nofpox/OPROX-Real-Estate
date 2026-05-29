import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListRooms, getListRoomsQueryKey, useCreateRoom, useUpdateRoom, useDeleteRoom,
  useListWorkOrders,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, CalendarCheck, DoorOpen, Wrench, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { type Room } from "@workspace/api-client-react";

// ─── Status sort order ────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  maintenance: 0, cleaning: 1, occupied: 2, available: 3,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(dateStr: string): number {
  const today = new Date();
  const d = new Date(dateStr);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const unitSchema = z.object({
  name:     z.string().min(1),
  type:     z.string().min(1),
  status:   z.string().min(1),
  capacity: z.coerce.number().min(1),
});

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const key = `unitStatus.status.${status.toLowerCase()}`;
  const label = t(key, { defaultValue: status });
  switch (status.toLowerCase()) {
    case "available":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 dark:bg-emerald-900/30 dark:text-emerald-400">{label}</Badge>;
    case "occupied":
      return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">{label}</Badge>;
    case "maintenance":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">{label}</Badge>;
    case "cleaning":
      return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-0 dark:bg-sky-900/30 dark:text-sky-400">{label}</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{label}</Badge>;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UnitStatus() {
  const { t } = useTranslation();
  const [searchQuery,   setSearchQuery]   = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [isDialogOpen,  setIsDialogOpen]  = useState(false);
  const [editingRoom,   setEditingRoom]   = useState<Room | null>(null);

  const { data: rooms,           isLoading: roomsLoading } = useListRooms();
  const { data: completedOrders }                          = useListWorkOrders({ status: "completed" } as any);
  const createRoom  = useCreateRoom();
  const updateRoom  = useUpdateRoom();
  const deleteRoom  = useDeleteRoom();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  // Map unitId → latest completedAt across completed work orders
  const lastServiceMap = React.useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const wo of completedOrders ?? []) {
      const uid = (wo as any).unitId as number | null;
      if (!uid || !wo.completedAt) continue;
      if (!map[uid] || wo.completedAt > map[uid]) map[uid] = wo.completedAt;
    }
    return map;
  }, [completedOrders]);

  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: "", type: "Studio", status: "available", capacity: 1 },
  });

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.reset({ name: room.name, type: room.type, status: room.status, capacity: room.capacity || 1 });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t("unitStatus.removeConfirm"))) {
      deleteRoom.mutate({ id }, {
        onSuccess: () => { toast({ title: t("unitStatus.removed") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); },
        onError:   () => { toast({ title: t("unitStatus.removeFailed"), variant: "destructive" }); },
      });
    }
  };

  const onSubmit = (data: z.infer<typeof unitSchema>) => {
    const payload = { ...data, pricePerNight: editingRoom?.pricePerNight ?? 0 };
    if (editingRoom) {
      updateRoom.mutate({ id: editingRoom.id, data: payload }, {
        onSuccess: () => { toast({ title: t("unitStatus.updated") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); setIsDialogOpen(false); },
        onError:   () => { toast({ title: t("unitStatus.updateFailed"), variant: "destructive" }); },
      });
    } else {
      createRoom.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: t("unitStatus.added") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); setIsDialogOpen(false); },
        onError:   () => { toast({ title: t("unitStatus.addFailed"), variant: "destructive" }); },
      });
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingRoom(null); form.reset({ name: "", type: "Studio", status: "available", capacity: 1 }); }
  };

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = [...(rooms ?? [])]
    .filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch  = r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
      const matchesStatus  = statusFilter === "all" || r.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3));

  // ── KPI counts ─────────────────────────────────────────────────────────────
  const all = rooms ?? [];
  const counts = {
    maintenance: all.filter((r) => r.status === "maintenance").length,
    cleaning:    all.filter((r) => r.status === "cleaning").length,
    available:   all.filter((r) => r.status === "available").length,
    occupied:    all.filter((r) => r.status === "occupied").length,
  };

  const kpis = [
    { key: "maintenance", count: counts.maintenance, icon: Wrench,       color: "text-amber-500",   bg: "bg-amber-500/10"   },
    { key: "cleaning",    count: counts.cleaning,    icon: Sparkles,     color: "text-sky-500",     bg: "bg-sky-500/10"     },
    { key: "occupied",    count: counts.occupied,    icon: DoorOpen,     color: "text-slate-500",   bg: "bg-slate-500/10"   },
    { key: "available",   count: counts.available,   icon: CalendarCheck,color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const UNIT_TYPES = ["Studio", "1BR", "2BR", "3BR", "Penthouse", "Standard", "Deluxe", "Suite"] as const;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {t("unitStatus.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("unitStatus.subtitle")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="me-2 h-4 w-4" />
              {t("unitStatus.addUnit")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingRoom ? t("unitStatus.editUnit") : t("unitStatus.addNewUnit")}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("unitStatus.unitNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("unitStatus.unitNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("unitStatus.columns.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={t("unitStatus.selectType")} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNIT_TYPES.map((tp) => (
                            <SelectItem key={tp} value={tp}>
                              {t(`unitStatus.types.${tp}`, { defaultValue: tp })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("unitStatus.columns.capacity")}</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("unitStatus.columns.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("unitStatus.selectStatus")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["available", "occupied", "maintenance", "cleaning"] as const).map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`unitStatus.status.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                    {editingRoom ? t("unitStatus.saveChanges") : t("unitStatus.addUnit")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Status summary KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.key}
              className={`shadow-sm border-border/50 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === kpi.key ? "ring-2 ring-primary/40" : ""
              }`}
              onClick={() => setStatusFilter(statusFilter === kpi.key ? "all" : kpi.key)}
            >
              <CardContent className="flex items-center gap-3 pt-5 pb-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {roomsLoading
                    ? <Skeleton className="h-6 w-8 mb-1" />
                    : <p className="text-2xl font-bold">{kpi.count}</p>
                  }
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t(`unitStatus.kpi.${kpi.key}`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Unit table ───────────────────────────────────────────────────────── */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="sr-only">{t("unitStatus.title")}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("unitStatus.searchPlaceholder")}
                  className="ps-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-background">
                  <SelectValue placeholder={t("unitStatus.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("unitStatus.allStatuses")}</SelectItem>
                  {(["maintenance", "cleaning", "occupied", "available"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{t(`unitStatus.status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-6">{t("unitStatus.columns.unit")}</TableHead>
                <TableHead>{t("unitStatus.columns.type")}</TableHead>
                <TableHead>{t("unitStatus.columns.capacity")}</TableHead>
                <TableHead>{t("unitStatus.columns.status")}</TableHead>
                <TableHead>{t("unitStatus.columns.lastService")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[100, 80, 40, 120, 100].map((w, j) => (
                      <TableCell key={j}><Skeleton className={`h-4 w-[${w}px]`} /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? t("unitStatus.noMatch")
                      : t("unitStatus.noUnits")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((room) => {
                  const lastService = lastServiceMap[room.id];
                  const ageLabel = lastService
                    ? (() => {
                        const d = daysSince(lastService);
                        if (d === 0) return t("common.date") === "Date" ? "Today" : "اليوم";
                        if (d === 1) return t("common.date") === "Date" ? "Yesterday" : "أمس";
                        return `${d}d`;
                      })()
                    : null;
                  const isStale = lastService ? daysSince(lastService) > 30 : false;

                  return (
                    <TableRow
                      key={room.id}
                      className={room.status === "maintenance" ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
                    >
                      <TableCell className="ps-6 font-semibold">{room.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`unitStatus.types.${room.type}`, { defaultValue: room.type })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{room.capacity ?? 1}</TableCell>
                      <TableCell><StatusBadge status={room.status} t={t} /></TableCell>
                      <TableCell>
                        {lastService ? (
                          <div className="flex flex-col">
                            <span className="text-sm">{formatDate(lastService)}</span>
                            <span className={`text-xs ${isStale ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                              {ageLabel}{isStale ? ` — ${t("unitStatus.overdueLabel")}` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t("unitStatus.noRecord")}</span>
                        )}
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
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(room)}>
                              <Pencil className="me-2 h-4 w-4" /> {t("unitStatus.editUnit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => handleDelete(room.id)}
                            >
                              <Trash2 className="me-2 h-4 w-4" /> {t("unitStatus.removeUnit")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
