import React, { useState } from "react";
import {
  useListTasks, getListTasksQueryKey, useCreateTask, useUpdateTask, useDeleteTask,
  useListStaff, useListProperties, useListRooms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, ClipboardList, CheckCircle2, Clock, AlertCircle, Trash2, CheckCheck, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/role-context";
import { useTranslation } from "react-i18next";

const CATEGORIES = ["housekeeping", "reception", "maintenance", "security", "general"];

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  category: z.enum(["housekeeping", "reception", "maintenance", "security", "general"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
  propertyId: z.coerce.number().optional().or(z.literal("")),
  unitId: z.coerce.number().optional().or(z.literal("")),
  assignedToId: z.coerce.number().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

const PriorityBadge = ({ priority }: { priority: string }) => {
  const { t } = useTranslation();
  switch (priority) {
    case "urgent": return <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/30 dark:text-red-400 text-xs">{t("priority.urgent")}</Badge>;
    case "high": return <Badge className="bg-orange-100 text-orange-800 border-0 dark:bg-orange-900/30 dark:text-orange-400 text-xs">{t("priority.high")}</Badge>;
    case "medium": return <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{t("priority.medium")}</Badge>;
    default: return <Badge className="bg-slate-100 text-slate-700 border-0 dark:bg-slate-800 dark:text-slate-400 text-xs">{t("priority.low")}</Badge>;
  }
};

const CategoryBadge = ({ category }: { category: string }) => {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    housekeeping: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    reception: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    security: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <Badge className={`border-0 text-xs ${styles[category] || styles.general}`}>
      {t(`tasks.category.${category}`)}
    </Badge>
  );
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Tasks() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const params: any = {};
  if (statusFilter !== "all") params.status = statusFilter;
  if (selectedProperty !== "all") params.propertyId = parseInt(selectedProperty);

  const { data: tasks, isLoading } = useListTasks(params);
  const { data: staff } = useListStaff({});
  const { data: properties } = useListProperties();
  const { data: rooms } = useListRooms();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role, allowedTaskCategories } = useRole();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", category: "general", priority: "medium", status: "pending", propertyId: "", unitId: "", assignedToId: "", dueDate: "" },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms = rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === Number(selectedFormPropertyId)) || [];
  const availableStaff = staff?.filter((s) => {
    if (!selectedFormPropertyId) return s.status === "active";
    return s.status === "active" && (!s.propertyId || s.propertyId === Number(selectedFormPropertyId));
  }) || [];

  const filteredTasks = tasks?.filter((task) => {
    if (allowedTaskCategories !== null && !allowedTaskCategories.includes(task.category)) return false;
    if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
    return true;
  }) || [];

  const pending = filteredTasks.filter((task) => task.status === "pending");
  const inProgress = filteredTasks.filter((task) => task.status === "in-progress");
  const completed = filteredTasks.filter((task) => task.status === "completed");

  const handleStatusChange = (id: number, newStatus: string) => {
    updateTask.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) }); toast({ title: t("tasks.toast.statusUpdated") }); },
      onError: () => toast({ title: t("tasks.toast.updateFailed"), variant: "destructive" }),
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(t("tasks.deleteConfirm", { title }))) {
      deleteTask.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) }); toast({ title: t("tasks.toast.deleted") }); },
        onError: () => toast({ title: t("tasks.toast.deleteFailed"), variant: "destructive" }),
      });
    }
  };

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    const payload = { ...data, description: data.description || undefined, propertyId: data.propertyId ? Number(data.propertyId) : undefined, unitId: data.unitId ? Number(data.unitId) : undefined, assignedToId: data.assignedToId ? Number(data.assignedToId) : undefined, dueDate: data.dueDate || undefined };
    createTask.mutate({ data: payload as any }, {
      onSuccess: () => { toast({ title: t("tasks.toast.created") }); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) }); setIsDialogOpen(false); form.reset(); },
      onError: () => toast({ title: t("tasks.toast.createFailed"), variant: "destructive" }),
    });
  };

  const TaskCard = ({ task }: { task: (typeof filteredTasks)[0] }) => {
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split("T")[0] && task.status !== "completed";
    return (
      <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug flex-1">{task.title}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(task.id, task.title)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge priority={task.priority} />
          <CategoryBadge category={task.category} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {task.assigneeName ? (
              <>
                <Avatar className="h-5 w-5 bg-primary">
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-semibold">{getInitials(task.assigneeName)}</AvatarFallback>
                </Avatar>
                <span>{task.assigneeName.split(" ")[0]}</span>
              </>
            ) : (
              <span className="italic">{t("tasks.unassigned")}</span>
            )}
          </div>
          {task.dueDate && (
            <span className={isOverdue ? "text-red-500 font-medium" : ""}>
              {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        {task.propertyName && (
          <p className="text-xs text-muted-foreground/70 truncate">{task.propertyName}{task.unitName ? ` · ${task.unitName}` : ""}</p>
        )}
        <div className="flex gap-1.5 pt-1">
          {task.status !== "in-progress" && (
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1 border-dashed" onClick={() => handleStatusChange(task.id, "in-progress")}>
              <Clock className="me-1 h-3 w-3" />{t("tasks.actions.start")}
            </Button>
          )}
          {task.status !== "completed" && (
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1 border-dashed text-green-700 hover:text-green-700 dark:text-green-400" onClick={() => handleStatusChange(task.id, "completed")}>
              <CheckCheck className="me-1 h-3 w-3" />{t("tasks.actions.done")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const SkeletonCard = () => (
    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
    </div>
  );

  const columns = [
    { key: "pending", label: t("status.pending"), color: "bg-slate-400", tasks: pending, skeletonCount: 3 },
    { key: "in-progress", label: t("status.in-progress"), color: "bg-amber-500", tasks: inProgress, skeletonCount: 2 },
    { key: "completed", label: t("status.completed"), color: "bg-green-500", tasks: completed, skeletonCount: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("tasks.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("tasks.subtitle")}</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="me-2 h-4 w-4" />{t("tasks.newTask")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: AlertCircle, label: t("status.pending"), value: tasks?.filter((task) => task.status === "pending").length || 0, color: "" },
          { icon: Clock, label: t("status.in-progress"), value: tasks?.filter((task) => task.status === "in-progress").length || 0, color: "text-amber-600 dark:text-amber-500" },
          { icon: CheckCircle2, label: t("tasks.completedToday"), value: tasks?.filter((task) => task.status === "completed").length || 0, color: "text-green-600 dark:text-green-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2"><Icon className="h-4 w-4" /><p className="text-sm font-medium">{label}</p></div>
              <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-full sm:w-[220px] bg-background"><SelectValue placeholder={t("common.allProperties")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allProperties")}</SelectItem>
            {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background"><SelectValue placeholder={t("tasks.allCategories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tasks.allCategories")}</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`tasks.category.${c}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {columns.map(({ key, label, color, tasks: colTasks, skeletonCount }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <h3 className="font-semibold text-sm text-foreground">{label}</h3>
              <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{colTasks.length}</span>
            </div>
            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)
                : colTasks.map((task) => <TaskCard key={task.id} task={task} />)}
              {!isLoading && colTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                  <p className="text-xs text-muted-foreground">{t(`tasks.empty.${key}`)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader><DialogTitle>{t("tasks.createTask")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>{t("tasks.fields.title")}</FormLabel><FormControl><Input placeholder={t("tasks.fields.titlePlaceholder")} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`tasks.category.${c}`)}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.priority")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("priority.low")}</SelectItem>
                        <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                        <SelectItem value="high">{t("priority.high")}</SelectItem>
                        <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="propertyId" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.property")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.fields.anyProperty")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("tasks.fields.anyProperty")}</SelectItem>
                        {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unitId" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.unit")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""} disabled={availableRooms.length === 0}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.fields.noUnit")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("tasks.fields.noUnit")}</SelectItem>
                        {availableRooms.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="assignedToId" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.assignTo")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.unassigned")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("tasks.unassigned")}</SelectItem>
                        {availableStaff.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>{t("tasks.fields.dueDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t("tasks.fields.description")}</FormLabel><FormControl><Textarea placeholder={t("tasks.fields.descriptionPlaceholder")} className="resize-none h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={createTask.isPending}>{t("tasks.createTask")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
