import React, { useState } from "react";
import {
  useListWorkOrders, getListWorkOrdersQueryKey, useCreateWorkOrder, useUpdateWorkOrder,
  useDeleteWorkOrder, useListProperties, useListRooms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Plus, Clock, CheckCircle2, Wrench, AlertCircle, DollarSign } from "lucide-react";
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
  cost: z.coerce.number().min(0).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

const PriorityBadge = ({ priority }: { priority: string }) => {
  const { t } = useTranslation();
  switch (priority) {
    case "urgent": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400">{t("priority.urgent")}</Badge>;
    case "high": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 dark:bg-orange-900/30 dark:text-orange-400">{t("priority.high")}</Badge>;
    case "medium": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">{t("priority.medium")}</Badge>;
    case "low": return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">{t("priority.low")}</Badge>;
    default: return <Badge variant="outline">{priority}</Badge>;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  switch (status) {
    case "pending": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">{t("status.pending")}</Badge>;
    case "in-progress": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">{t("status.in-progress")}</Badge>;
    case "on-hold": return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">{t("status.on-hold")}</Badge>;
    case "completed": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">{t("status.completed")}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Maintenance() {
  const { t } = useTranslation();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const searchParams: Record<string, any> = {};
  if (selectedProperty !== "all") searchParams.propertyId = parseInt(selectedProperty);
  if (statusFilter !== "all") searchParams.status = statusFilter;
  if (priorityFilter !== "all") searchParams.priority = priorityFilter;

  const { data: workOrders, isLoading: isWorkOrdersLoading } = useListWorkOrders(searchParams);
  const { data: allWorkOrders } = useListWorkOrders(selectedProperty !== "all" ? { propertyId: parseInt(selectedProperty) } : {});
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
      unitId: "", title: "", description: "", priority: "medium", status: "pending", assignedTo: "", cost: "", dueDate: "",
    },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms = rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === selectedFormPropertyId) || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(searchParams) });
    queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(selectedProperty !== "all" ? { propertyId: parseInt(selectedProperty) } : {}) });
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
    const payload = { ...data, unitId: data.unitId ? Number(data.unitId) : undefined, cost: data.cost !== "" && data.cost !== undefined ? Number(data.cost) : undefined, dueDate: data.dueDate || undefined };
    createWorkOrder.mutate({ data: payload as any }, {
      onSuccess: () => { toast({ title: t("maintenance.createSuccess") }); invalidateAll(); setIsDialogOpen(false); form.reset(); },
      onError: () => { toast({ title: t("maintenance.createFailed"), variant: "destructive" }); },
    });
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open && selectedProperty !== "all") form.setValue("propertyId", parseInt(selectedProperty));
  };

  const statsData = {
    pending: allWorkOrders?.filter((w) => w.status === "pending").length || 0,
    inProgress: allWorkOrders?.filter((w) => w.status === "in-progress").length || 0,
    onHold: allWorkOrders?.filter((w) => w.status === "on-hold").length || 0,
    completed: allWorkOrders?.filter((w) => w.status === "completed").length || 0,
    totalCost: allWorkOrders?.reduce((sum, w) => sum + (w.cost ? Number(w.cost) : 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("maintenance.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("maintenance.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
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
                <FormField control={form.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.cost")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="number" min="0" step="0.01" placeholder="0.00" className="ps-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { icon: AlertCircle, label: t("maintenance.kpi.pending"), value: statsData.pending, color: "" },
          { icon: Clock, label: t("maintenance.kpi.inProgress"), value: statsData.inProgress, color: "text-amber-600 dark:text-amber-500" },
          { icon: Wrench, label: t("maintenance.kpi.onHold"), value: statsData.onHold, color: "" },
          { icon: CheckCircle2, label: t("maintenance.kpi.completed"), value: statsData.completed, color: "text-green-600 dark:text-green-500" },
          { icon: DollarSign, label: t("maintenance.kpi.totalCost"), value: `$${statsData.totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: "" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm font-medium">{label}</p>
              </div>
              <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background">
                <SelectValue placeholder={t("common.allProperties")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allProperties")}</SelectItem>
                {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <SelectValue placeholder={t("maintenance.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("maintenance.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("status.pending")}</SelectItem>
                <SelectItem value="in-progress">{t("status.in-progress")}</SelectItem>
                <SelectItem value="on-hold">{t("status.on-hold")}</SelectItem>
                <SelectItem value="completed">{t("status.completed")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
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
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("maintenance.columns.priority")}</TableHead>
                <TableHead className="w-[28%]">{t("maintenance.columns.issue")}</TableHead>
                <TableHead>{t("maintenance.columns.assignedTo")}</TableHead>
                <TableHead>{t("maintenance.columns.dueDate")}</TableHead>
                <TableHead>{t("maintenance.columns.cost")}</TableHead>
                <TableHead>{t("maintenance.columns.status")}</TableHead>
                <TableHead className="text-end">{t("maintenance.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWorkOrdersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></TableCell>
                    {[24, 24, 16, 20].map((w, j) => <TableCell key={j}><Skeleton className={`h-4 w-${w}`} /></TableCell>)}
                    <TableCell><Skeleton className="h-8 w-8 ms-auto" /></TableCell>
                  </TableRow>
                ))
              ) : workOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t("maintenance.noWorkOrders")}</TableCell>
                </TableRow>
              ) : (
                workOrders?.map((wo) => {
                  const isOverdue = wo.dueDate && wo.dueDate < new Date().toISOString().split("T")[0] && wo.status !== "completed";
                  return (
                    <TableRow key={wo.id}>
                      <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{wo.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {wo.propertyName}{wo.unitName ? ` • ${wo.unitName}` : ` • ${t("maintenance.fields.propertyWide")}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.assignedTo || <span className="text-muted-foreground italic">{t("tasks.unassigned")}</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.dueDate ? (
                          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                            {new Date(wo.dueDate + "T00:00:00").toLocaleDateString()}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.cost ? <span className="font-medium">${Number(wo.cost).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={wo.status} /></TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Select value={wo.status} onValueChange={(val) => handleStatusChange(wo.id, val)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs border-dashed bg-muted/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t("status.pending")}</SelectItem>
                              <SelectItem value="in-progress">{t("status.in-progress")}</SelectItem>
                              <SelectItem value="on-hold">{t("status.on-hold")}</SelectItem>
                              <SelectItem value="completed">{t("status.completed")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(wo.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
