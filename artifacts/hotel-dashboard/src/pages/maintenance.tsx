import React, { useState } from "react";
import {
  useListWorkOrders,
  getListWorkOrdersQueryKey,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
  useListProperties,
  useListRooms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Trash2, Plus, Clock, CheckCircle2, Wrench, AlertCircle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const workOrderSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property is required"),
  unitId: z.coerce.number().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in-progress", "on-hold", "completed"]).default("pending"),
  assignedTo: z.string().optional(),
  cost: z.coerce.number().min(0).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

const PriorityBadge = ({ priority }: { priority: string }) => {
  switch (priority) {
    case "urgent": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0 dark:bg-red-900/30 dark:text-red-400">Urgent</Badge>;
    case "high": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 dark:bg-orange-900/30 dark:text-orange-400">High</Badge>;
    case "medium": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">Medium</Badge>;
    case "low": return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">Low</Badge>;
    default: return <Badge variant="outline">{priority}</Badge>;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">Pending</Badge>;
    case "in-progress": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-900/30 dark:text-amber-400">In Progress</Badge>;
    case "on-hold": return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-0 dark:bg-slate-800 dark:text-slate-400">On Hold</Badge>;
    case "completed": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Maintenance() {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const searchParams: any = {};
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
      unitId: "",
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      cost: "",
      dueDate: "",
    },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms = rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === selectedFormPropertyId) || [];

  const handleStatusChange = (id: number, newStatus: string) => {
    updateWorkOrder.mutate(
      { id, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          toast({ title: "Status updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(searchParams) });
          queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(selectedProperty !== "all" ? { propertyId: parseInt(selectedProperty) } : {}) });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteWorkOrder.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Work order deleted" });
            queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(searchParams) });
            queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(selectedProperty !== "all" ? { propertyId: parseInt(selectedProperty) } : {}) });
          },
          onError: () => {
            toast({ title: "Failed to delete", variant: "destructive" });
          },
        }
      );
    }
  };

  const onSubmit = (data: z.infer<typeof workOrderSchema>) => {
    const payload = {
      ...data,
      unitId: data.unitId ? Number(data.unitId) : undefined,
      cost: data.cost !== "" && data.cost !== undefined ? Number(data.cost) : undefined,
      dueDate: data.dueDate || undefined,
    };

    createWorkOrder.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          toast({ title: "Work order created successfully" });
          queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(searchParams) });
          queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey(selectedProperty !== "all" ? { propertyId: parseInt(selectedProperty) } : {}) });
          setIsDialogOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to create work order", variant: "destructive" });
        },
      }
    );
  };

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open && selectedProperty !== "all") {
      form.setValue("propertyId", parseInt(selectedProperty));
    }
  };

  const stats = {
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
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Maintenance</h1>
          <p className="text-muted-foreground mt-1">Work orders, repairs, and maintenance tracking.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AC not cooling, Leaky faucet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property *</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString() || ""}
                          disabled={!selectedFormPropertyId || availableRooms.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Property Wide</SelectItem>
                            {availableRooms.map((r) => (
                              <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mike Torres" {...field} />
                        </FormControl>
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
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated / Actual Cost ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed description of the issue..." className="resize-none h-24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createWorkOrder.isPending}>
                    Save Work Order
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Pending</p>
            </div>
            <h2 className="text-3xl font-bold">{stats.pending}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <p className="text-sm font-medium">In Progress</p>
            </div>
            <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-500">{stats.inProgress}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wrench className="h-4 w-4" />
              <p className="text-sm font-medium">On Hold</p>
            </div>
            <h2 className="text-3xl font-bold">{stats.onHold}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">Completed</p>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-500">{stats.completed}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <p className="text-sm font-medium">Total Cost</p>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              ${stats.totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h2>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Priority</TableHead>
                <TableHead className="w-[28%]">Issue</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWorkOrdersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : workOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No work orders found matching the filters.
                  </TableCell>
                </TableRow>
              ) : (
                workOrders?.map((wo) => {
                  const isOverdue = wo.dueDate && wo.dueDate < new Date().toISOString().split("T")[0] && wo.status !== "completed";
                  return (
                    <TableRow key={wo.id}>
                      <TableCell>
                        <PriorityBadge priority={wo.priority} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{wo.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {wo.propertyName}{wo.unitName ? ` • ${wo.unitName}` : " • Property-wide"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.assignedTo || <span className="text-muted-foreground italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.dueDate ? (
                          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                            {new Date(wo.dueDate + "T00:00:00").toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.cost ? (
                          <span className="font-medium">${Number(wo.cost).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wo.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select value={wo.status} onValueChange={(val) => handleStatusChange(wo.id, val)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs border-dashed bg-muted/30">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(wo.id)}
                          >
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
