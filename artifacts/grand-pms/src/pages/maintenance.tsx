import React, { useState } from "react";
import {
  useListWorkOrders, getListWorkOrdersQueryKey, useCreateWorkOrder, useUpdateWorkOrder,
  useDeleteWorkOrder, useListProperties, useListRooms,
} from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Trash2, Plus, Clock, CheckCircle2, Wrench, AlertCircle,
  User, CalendarDays, Building2, ChevronRight, PauseCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const workOrderSchema = z.object({
  propertyId: z.coerce.number().min(1),
  unitId: z.coerce.number().optional().or(z.literal("")),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in-progress", "on-hold", "completed"]).default("pending"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
});

const PHOTO_MARKER = "\n\n[PHOTO]:";

function parseDescription(desc: string | null | undefined): { text: string; photo: string | null } {
  if (!desc) return { text: "", photo: null };
  const idx = desc.indexOf(PHOTO_MARKER);
  if (idx === -1) return { text: desc, photo: null };
  return { text: desc.slice(0, idx).trim(), photo: desc.slice(idx + PHOTO_MARKER.length).trim() };
}

const PRIORITY_CONFIG: Record<string, { label: string; bar: string; badge: string }> = {
  urgent: { label: "priority.urgent", bar: "bg-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  high:   { label: "priority.high",   bar: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  medium: { label: "priority.medium", bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  low:    { label: "priority.low",    bar: "bg-slate-300",  badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

const COLUMN_CONFIG = [
  { status: "pending",     icon: AlertCircle,   label: "maintenance.kpi.pending",    header: "bg-blue-50 dark:bg-blue-950/30",    accent: "border-blue-400",  count: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { status: "in-progress", icon: Clock,         label: "maintenance.kpi.inProgress", header: "bg-amber-50 dark:bg-amber-950/30",  accent: "border-amber-400", count: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { status: "on-hold",     icon: PauseCircle,   label: "maintenance.kpi.onHold",     header: "bg-slate-50 dark:bg-slate-900/40",  accent: "border-slate-400", count: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  { status: "completed",   icon: CheckCircle2,  label: "maintenance.kpi.completed",  header: "bg-green-50 dark:bg-green-950/30",  accent: "border-green-400", count: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
];

const STATUS_NEXT: Record<string, string> = {
  pending: "in-progress",
  "in-progress": "completed",
  "on-hold": "in-progress",
  completed: "pending",
};

type WorkOrder = {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  propertyName?: string | null;
  unitName?: string | null;
};

function WorkOrderCard({
  wo, onStatusChange, onDelete, onPhotoClick, isUpdating,
}: {
  wo: WorkOrder;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onPhotoClick: (url: string) => void;
  isUpdating: boolean;
}) {
  const { t } = useTranslation();
  const pCfg = PRIORITY_CONFIG[wo.priority] ?? PRIORITY_CONFIG.low;
  const parsed = parseDescription(wo.description);
  const isOverdue =
    wo.dueDate &&
    wo.dueDate < new Date().toISOString().split("T")[0] &&
    wo.status !== "completed";
  const nextStatus = STATUS_NEXT[wo.status];

  return (
    <div className="group bg-background rounded-xl border border-border/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${pCfg.bar}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm leading-snug flex-1">{wo.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${pCfg.badge}`}>
            {t(pCfg.label)}
          </span>
        </div>

        {parsed.text && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{parsed.text}</p>
        )}

        {parsed.photo && (
          <button type="button" onClick={() => onPhotoClick(parsed.photo!)} className="w-full">
            <img
              src={parsed.photo}
              alt="Attached"
              className="w-full h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
            />
          </button>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{wo.propertyName}{wo.unitName ? ` • ${wo.unitName}` : ""}</span>
          </div>
          {wo.assignedTo && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{wo.assignedTo}</span>
            </div>
          )}
          {wo.dueDate && (
            <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span>{new Date(wo.dueDate + "T00:00:00").toLocaleDateString()}</span>
              {isOverdue && <span className="text-red-500 font-semibold">{t("maintenance.overdue")}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {wo.status !== "completed" ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(wo.id, nextStatus)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline disabled:opacity-50"
            >
              {nextStatus === "in-progress" ? t("status.in-progress") : t("status.completed")}
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(wo.id, "pending")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {t("status.pending")}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}

          <Select value={wo.status} onValueChange={(val) => onStatusChange(wo.id, val)}>
            <SelectTrigger className="h-6 w-[110px] text-[11px] border-dashed bg-muted/30 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="in-progress">{t("status.in-progress")}</SelectItem>
              <SelectItem value="on-hold">{t("status.on-hold")}</SelectItem>
              <SelectItem value="completed">{t("status.completed")}</SelectItem>
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => onDelete(wo.id)}
            className="text-destructive/50 hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Maintenance() {
  const { t } = useTranslation();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoDialog, setPhotoDialog] = useState<string | null>(null);

  const searchParams: Record<string, any> = {};
  if (selectedProperty !== "all") searchParams.propertyId = parseInt(selectedProperty);

  const { data: workOrders, isLoading } = useListWorkOrders(searchParams);
  const { data: properties } = useListProperties();
  const { data: rooms } = useListRooms();

  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof workOrderSchema>>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      propertyId: selectedProperty !== "all" ? parseInt(selectedProperty) : undefined,
      unitId: "", title: "", description: "", priority: "medium", status: "pending", assignedTo: "", dueDate: "",
    },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms = rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === selectedFormPropertyId) || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(searchParams) });
    queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey({}) });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    updateWorkOrder.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => { toast({ title: t("maintenance.updateSuccess") }); invalidateAll(); },
      onError: () => { toast({ title: t("maintenance.updateFailed"), variant: "destructive" }); },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm(t("maintenance.deleteConfirm"))) {
      deleteWorkOrder.mutate({ id }, {
        onSuccess: () => { toast({ title: t("maintenance.deleteSuccess") }); invalidateAll(); },
        onError: () => { toast({ title: t("maintenance.deleteFailed"), variant: "destructive" }); },
      });
    }
  };

  const onSubmit = (data: z.infer<typeof workOrderSchema>) => {
    const payload = { ...data, unitId: data.unitId ? Number(data.unitId) : undefined, dueDate: data.dueDate || undefined };
    createWorkOrder.mutate({ data: payload as any }, {
      onSuccess: () => { toast({ title: t("maintenance.createSuccess") }); invalidateAll(); setIsDialogOpen(false); form.reset(); },
      onError: () => { toast({ title: t("maintenance.createFailed"), variant: "destructive" }); },
    });
  };

  const filtered = (workOrders ?? []).filter(
    (wo) => priorityFilter === "all" || wo.priority === priorityFilter
  );

  const byStatus = (status: string) => filtered.filter((wo) => wo.status === status);

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("maintenance.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("maintenance.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open && selectedProperty !== "all") form.setValue("propertyId", parseInt(selectedProperty));
        }}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="me-2 h-4 w-4" />
              {t("maintenance.newWorkOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader><DialogTitle>{t("maintenance.createWorkOrder")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.title")}</FormLabel>
                    <FormControl><Input placeholder={t("maintenance.fields.titlePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="propertyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.property")}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("maintenance.fields.selectProperty")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unitId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.unit")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""} disabled={!selectedFormPropertyId || availableRooms.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("maintenance.fields.selectUnit")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("maintenance.fields.propertyWide")}</SelectItem>
                          {availableRooms.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.priority")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">{t("priority.low")}</SelectItem>
                          <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                          <SelectItem value="high">{t("priority.high")}</SelectItem>
                          <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t("status.pending")}</SelectItem>
                          <SelectItem value="in-progress">{t("status.in-progress")}</SelectItem>
                          <SelectItem value="on-hold">{t("status.on-hold")}</SelectItem>
                          <SelectItem value="completed">{t("status.completed")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="assignedTo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.assignedTo")}</FormLabel>
                      <FormControl><Input placeholder={t("maintenance.fields.assignedToPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("maintenance.fields.dueDate")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.description")}</FormLabel>
                    <FormControl><Textarea placeholder={t("maintenance.fields.descriptionPlaceholder")} className="resize-none h-24" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createWorkOrder.isPending}>{t("maintenance.saveWorkOrder")}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[200px] bg-background shadow-sm">
            <SelectValue placeholder={t("common.allProperties")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allProperties")}</SelectItem>
            {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px] bg-background shadow-sm">
            <SelectValue placeholder={t("maintenance.allPriorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("maintenance.allPriorities")}</SelectItem>
            <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
            <SelectItem value="high">{t("priority.high")}</SelectItem>
            <SelectItem value="medium">{t("priority.medium")}</SelectItem>
            <SelectItem value="low">{t("priority.low")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMN_CONFIG.map(({ status, icon: Icon, label, header, accent, count }) => {
          const cards = byStatus(status);
          return (
            <div key={status} className={`rounded-xl border-t-4 ${accent} bg-card shadow-sm overflow-hidden`}>
              {/* Column header */}
              <div className={`${header} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{t(label)}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${count}`}>
                  {isLoading ? "—" : cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 min-h-[200px]">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-background rounded-xl border border-border/60 p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))
                ) : cards.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground/60 italic">
                    {t("maintenance.noWorkOrders")}
                  </div>
                ) : (
                  cards.map((wo) => (
                    <WorkOrderCard
                      key={wo.id}
                      wo={wo}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onPhotoClick={setPhotoDialog}
                      isUpdating={updateWorkOrder.isPending}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo lightbox */}
      <Dialog open={!!photoDialog} onOpenChange={(open) => !open && setPhotoDialog(null)}>
        <DialogContent className="sm:max-w-lg p-2">
          <DialogHeader className="p-2">
            <DialogTitle className="text-sm">{t("maintenance.attachedPhoto")}</DialogTitle>
          </DialogHeader>
          {photoDialog && (
            <img src={photoDialog} alt="Attached photo" className="w-full rounded-lg object-contain max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
