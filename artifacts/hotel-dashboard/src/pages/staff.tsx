import React, { useState } from "react";
import {
  useListStaff,
  getListStaffQueryKey,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useListProperties,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Users, MoreVertical, Phone, Mail, Building2, UserCheck, UserX, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffShifts from "./staff-shifts";

const ROLES = [
  "Front Desk Manager", "Concierge", "Housekeeping Supervisor", "Housekeeping Staff",
  "Maintenance Lead", "Maintenance Technician", "Security Supervisor", "Security Officer",
  "Property Manager", "Compound Manager", "Groundskeeper", "General Staff",
];

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().or(z.literal("")),
  propertyId: z.coerce.number().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleColor(role: string) {
  if (role.includes("Manager") || role.includes("Supervisor")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  if (role.includes("Maintenance")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  if (role.includes("Security")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (role.includes("Housekeeping")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (role.includes("Desk") || role.includes("Concierge")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
}

function getAvatarColor(name: string) {
  const colors = ["bg-blue-500","bg-green-500","bg-purple-500","bg-amber-500","bg-red-500","bg-indigo-500","bg-teal-500","bg-rose-500"];
  return colors[name.charCodeAt(0) % colors.length];
}

type Tab = "directory" | "schedule";

export default function Staff() {
  const [activeTab, setActiveTab] = useState<Tab>("directory");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const params: any = {};
  if (selectedProperty !== "all") params.propertyId = parseInt(selectedProperty);

  const { data: staff, isLoading } = useListStaff(params);
  const { data: properties } = useListProperties();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", role: "", email: "", phone: "", propertyId: "", status: "active" },
  });

  const ROLE_CATEGORIES = ["Management", "Housekeeping", "Maintenance", "Security", "Reception"];

  const filteredStaff = staff?.filter((s) => {
    if (roleFilter === "all") return true;
    return s.role.toLowerCase().includes(roleFilter.toLowerCase());
  }) || [];

  const activeCount = staff?.filter((s) => s.status === "active").length || 0;
  const inactiveCount = staff?.filter((s) => s.status === "inactive").length || 0;

  const openCreate = () => {
    setEditingStaff(null);
    form.reset({ name: "", role: "", email: "", phone: "", propertyId: "", status: "active" });
    setIsDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingStaff(s);
    form.reset({ name: s.name, role: s.role, email: s.email, phone: s.phone || "", propertyId: s.propertyId || "", status: s.status });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof staffSchema>) => {
    const payload = { ...data, phone: data.phone || undefined, propertyId: data.propertyId ? Number(data.propertyId) : undefined };
    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: payload }, {
        onSuccess: () => { toast({ title: "Staff member updated" }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); setIsDialogOpen(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createStaff.mutate({ data: payload as any }, {
        onSuccess: () => { toast({ title: "Staff member added" }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); setIsDialogOpen(false); },
        onError: () => toast({ title: "Failed to add", variant: "destructive" }),
      });
    }
  };

  const handleToggleStatus = (s: any) => {
    updateStaff.mutate({ id: s.id, data: { status: s.status === "active" ? "inactive" : "active" } }, {
      onSuccess: () => { toast({ title: "Status updated" }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  const handleDelete = (s: any) => {
    if (confirm(`Remove ${s.name}?`)) {
      deleteStaff.mutate({ id: s.id }, {
        onSuccess: () => { toast({ title: "Staff removed" }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); },
        onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage your team and shift schedules.</p>
        </div>
        {activeTab === "directory" && (
          <Button onClick={openCreate} className="font-semibold shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {([
          { id: "directory" as Tab, label: "Directory", icon: Users },
          { id: "schedule" as Tab, label: "Shift Schedule", icon: CalendarDays },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "schedule" ? (
        <StaffShifts />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Users className="h-4 w-4" /><p className="text-sm font-medium">Total</p></div><h2 className="text-3xl font-bold">{staff?.length || 0}</h2></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><UserCheck className="h-4 w-4" /><p className="text-sm font-medium">Active</p></div><h2 className="text-3xl font-bold text-green-600 dark:text-green-500">{activeCount}</h2></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><UserX className="h-4 w-4" /><p className="text-sm font-medium">Inactive</p></div><h2 className="text-3xl font-bold text-muted-foreground">{inactiveCount}</h2></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background"><SelectValue placeholder="All Properties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLE_CATEGORIES.map((c) => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="shadow-sm"><CardContent className="p-6"><div className="flex items-start gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div></CardContent></Card>
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Users className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">No staff members found.</p><Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add First Staff Member</Button></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((s) => (
                <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className={`h-12 w-12 border-2 border-background shadow-sm`}>
                        <AvatarFallback className={`text-white font-semibold text-sm ${getAvatarColor(s.name)}`}>{getInitials(s.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(s)}>{s.status === "active" ? "Mark Inactive" : "Mark Active"}</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(s)}>Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleColor(s.role)}`}>{s.role}</span>
                        <div className="mt-3 space-y-1.5">
                          {s.propertyName && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{s.propertyName}</span></div>}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span></div>
                          {s.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span>{s.phone}</span></div>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Badge className={`text-xs font-medium border-0 ${s.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {s.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="e.g. Sarah Collins" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="email@property.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 555-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="propertyId" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Assigned Property</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="No specific property" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific property</SelectItem>
                        {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>{editingStaff ? "Save Changes" : "Add Staff Member"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
