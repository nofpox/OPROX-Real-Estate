import React, { useState } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListStaff,
  useListProperties,
  useListRooms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["housekeeping", "reception", "maintenance", "security", "general"];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
  switch (priority) {
    case "urgent": return <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/30 dark:text-red-400 text-xs">Urgent</Badge>;
    case "high": return <Badge className="bg-orange-100 text-orange-800 border-0 dark:bg-orange-900/30 dark:text-orange-400 text-xs">High</Badge>;
    case "medium": return <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Medium</Badge>;
    default: return <Badge className="bg-slate-100 text-slate-700 border-0 dark:bg-slate-800 dark:text-slate-400 text-xs">Low</Badge>;
  }
};

const CategoryBadge = ({ category }: { category: string }) => {
  const styles: Record<string, string> = {
    housekeeping: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    reception: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    security: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <Badge className={`border-0 text-xs capitalize ${styles[category] || styles.general}`}>
      {category}
    </Badge>
  );
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

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

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "pending",
      propertyId: "",
      unitId: "",
      assignedToId: "",
      dueDate: "",
    },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms = rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === Number(selectedFormPropertyId)) || [];
  const availableStaff = staff?.filter((s) => {
    if (!selectedFormPropertyId) return s.status === "active";
    return s.status === "active" && (!s.propertyId || s.propertyId === Number(selectedFormPropertyId));
  }) || [];

  const filteredTasks = tasks?.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  }) || [];

  const pending = filteredTasks.filter((t) => t.status === "pending");
  const inProgress = filteredTasks.filter((t) => t.status === "in-progress");
  const completed = filteredTasks.filter((t) => t.status === "completed");

  const handleStatusChange = (id: number, newStatus: string) => {
    updateTask.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        toast({ title: "Task status updated" });
      },
      onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete task "${title}"?`)) {
      deleteTask.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
          toast({ title: "Task deleted" });
        },
        onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
      });
    }
  };

  const onSubmit = (data: z.infer<typeof taskSchema>) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      propertyId: data.propertyId ? Number(data.propertyId) : undefined,
      unitId: data.unitId ? Number(data.unitId) : undefined,
      assignedToId: data.assignedToId ? Number(data.assignedToId) : undefined,
      dueDate: data.dueDate || undefined,
    };
    createTask.mutate({ data: payload as any }, {
      onSuccess: () => {
        toast({ title: "Task created" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
    });
  };

  const TaskCard = ({ task }: { task: (typeof filteredTasks)[0] }) => {
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split("T")[0] && task.status !== "completed";
    return (
      <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug flex-1">{task.title}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(task.id, task.title)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge priority={task.priority} />
          <CategoryBadge category={task.category} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {task.assigneeName ? (
              <>
                <Avatar className="h-5 w-5 bg-primary">
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-semibold">
                    {getInitials(task.assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span>{task.assigneeName.split(" ")[0]}</span>
              </>
            ) : (
              <span className="italic">Unassigned</span>
            )}
          </div>
          {task.dueDate && (
            <span className={isOverdue ? "text-red-500 font-medium" : ""}>
              {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {task.propertyName && (
          <p className="text-xs text-muted-foreground/70 truncate">
            {task.propertyName}{task.unitName ? ` · ${task.unitName}` : ""}
          </p>
        )}

        {/* Quick status actions */}
        <div className="flex gap-1.5 pt-1">
          {task.status !== "in-progress" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1 border-dashed"
              onClick={() => handleStatusChange(task.id, "in-progress")}
            >
              <Clock className="mr-1 h-3 w-3" />
              Start
            </Button>
          )}
          {task.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1 border-dashed text-green-700 hover:text-green-700 dark:text-green-400"
              onClick={() => handleStatusChange(task.id, "completed")}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Done
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
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Assign and track daily operational tasks.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Pending</p>
            </div>
            <h2 className="text-3xl font-bold">{tasks?.filter((t) => t.status === "pending").length || 0}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <p className="text-sm font-medium">In Progress</p>
            </div>
            <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-500">{tasks?.filter((t) => t.status === "in-progress").length || 0}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">Completed Today</p>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-500">{tasks?.filter((t) => t.status === "completed").length || 0}</h2>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-full sm:w-[220px] bg-background">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Pending */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <h3 className="font-semibold text-sm text-foreground">Pending</h3>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pending.length}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : pending.map((t) => <TaskCard key={t.id} task={t} />)}
            {!isLoading && pending.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                <p className="text-xs text-muted-foreground">No pending tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* In Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">In Progress</h3>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {inProgress.length}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
              : inProgress.map((t) => <TaskCard key={t.id} task={t} />)}
            {!isLoading && inProgress.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                <p className="text-xs text-muted-foreground">Nothing in progress</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <h3 className="font-semibold text-sm text-foreground">Completed</h3>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {completed.length}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 1 }).map((_, i) => <SkeletonCard key={i} />)
              : completed.map((t) => <TaskCard key={t.id} task={t} />)}
            {!isLoading && completed.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                <p className="text-xs text-muted-foreground">No completed tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Clean room 201, Process guest check-in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Any property</SelectItem>
                          {properties?.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit / Room</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""} disabled={availableRooms.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No specific unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific unit</SelectItem>
                          {availableRooms.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {availableStaff.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details or instructions..." className="resize-none h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={createTask.isPending}>
                  Create Task
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
