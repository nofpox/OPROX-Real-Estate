import React, { useState } from "react";
import {
  useListStaff, getListStaffQueryKey, useCreateStaff, useUpdateStaff, useDeleteStaff, useListProperties,
} from "@workspace/api-client-react";
import { useRole } from "@/contexts/role-context";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Users, MoreVertical, Phone, Mail, Building2, UserCheck, UserX, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffShifts from "./staff-shifts";
import { useTranslation } from "react-i18next";

const ALL_ROLES = [
  "Front Desk Manager", "Concierge", "Housekeeping Supervisor", "Housekeeping Staff",
  "Maintenance Lead", "Maintenance Technician", "Security Supervisor", "Security Officer",
  "Property Manager", "Estate Manager", "Groundskeeper", "General Staff",
];

// Maps each display role to the hierarchy level required to BE that role.
// Callers can only create roles strictly below their own level.
const ROLE_LEVEL_MAP: Record<string, number> = {
  "Property Manager": 3, "Estate Manager": 3,
  "Front Desk Manager": 2, "Housekeeping Supervisor": 2,
  "Maintenance Lead": 2, "Security Supervisor": 2,
  "Concierge": 1, "Housekeeping Staff": 1,
  "Maintenance Technician": 1, "Security Officer": 1,
  "Groundskeeper": 1, "General Staff": 1,
};

function getCallerLevel(dbRole: string): number {
  if (dbRole === "owner" || dbRole === "admin" || dbRole === "super_admin") return 4;
  if (dbRole === "manager") return 3;
  if (dbRole === "supervisor" || dbRole === "site-supervisor" || dbRole === "property-manager" || dbRole === "front-desk") return 2;
  return 1;
}

const staffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email(),
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
  const { t } = useTranslation();
  const { actualDbRole } = useRole();
  const callerLevel = getCallerLevel(actualDbRole);
  // Only show roles the caller is allowed to assign (strictly below their own level)
  const assignableRoles = ALL_ROLES.filter((r) => (ROLE_LEVEL_MAP[r] ?? 1) < callerLevel);
  const [activeTab, setActiveTab] = useState<Tab>("directory");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const ROLE_CATEGORIES = [
    { value: "management", label: t("staff.roleCategories.management") },
    { value: "housekeeping", label: t("staff.roleCategories.housekeeping") },
    { value: "maintenance", label: t("staff.roleCategories.maintenance") },
    { value: "security", label: t("staff.roleCategories.security") },
    { value: "reception", label: t("staff.roleCategories.reception") },
  ];

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
        onSuccess: () => { toast({ title: t("staff.toast.updated") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); setIsDialogOpen(false); },
        onError: () => toast({ title: t("staff.toast.updateFailed"), variant: "destructive" }),
      });
    } else {
      createStaff.mutate({ data: payload as any }, {
        onSuccess: () => { toast({ title: t("staff.toast.added") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); setIsDialogOpen(false); },
        onError: () => toast({ title: t("staff.toast.addFailed"), variant: "destructive" }),
      });
    }
  };

  const handleToggleStatus = (s: any) => {
    updateStaff.mutate({ id: s.id, data: { status: s.status === "active" ? "inactive" : "active" } }, {
      onSuccess: () => { toast({ title: t("staff.toast.statusUpdated") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); },
      onError: () => toast({ title: t("staff.toast.updateFailed"), variant: "destructive" }),
    });
  };

  const handleDelete = (s: any) => {
    if (confirm(t("staff.removeConfirm", { name: s.name }))) {
      deleteStaff.mutate({ id: s.id }, {
        onSuccess: () => { toast({ title: t("staff.toast.removed") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); },
        onError: () => toast({ title: t("staff.toast.removeFailed"), variant: "destructive" }),
      });
    }
  };

  const TABS = [
    { id: "directory" as Tab, label: t("staff.tabs.directory"), icon: Users },
    { id: "schedule" as Tab, label: t("staff.tabs.schedule"), icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("staff.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("staff.subtitle")}</p>
        </div>
        {activeTab === "directory" && callerLevel >= 2 && (
          <Button onClick={openCreate} className="font-semibold shadow-sm">
            <Plus className="me-2 h-4 w-4" />
            {t("staff.addMember")}
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Users className="h-4 w-4" /><p className="text-sm font-medium">{t("staff.kpi.total")}</p></div><h2 className="text-3xl font-bold">{staff?.length || 0}</h2></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><UserCheck className="h-4 w-4" /><p className="text-sm font-medium">{t("staff.kpi.active")}</p></div><h2 className="text-3xl font-bold text-green-600 dark:text-green-500">{activeCount}</h2></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-2 text-muted-foreground mb-2"><UserX className="h-4 w-4" /><p className="text-sm font-medium">{t("staff.kpi.inactive")}</p></div><h2 className="text-3xl font-bold text-muted-foreground">{inactiveCount}</h2></CardContent></Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background"><SelectValue placeholder={t("common.allProperties")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allProperties")}</SelectItem>
                {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background"><SelectValue placeholder={t("staff.allRoles")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("staff.allRoles")}</SelectItem>
                {ROLE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="shadow-sm"><CardContent className="p-6"><div className="flex items-start gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div></CardContent></Card>
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Users className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{t("staff.noStaff")}</p><Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="me-2 h-4 w-4" />{t("staff.addFirst")}</Button></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((s) => (
                <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
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
                              <DropdownMenuItem onClick={() => openEdit(s)}>{t("common.edit")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(s)}>{s.status === "active" ? t("staff.markInactive") : t("staff.markActive")}</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(s)}>{t("staff.remove")}</DropdownMenuItem>
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
                        {s.status === "active" ? t("status.active") : t("status.inactive")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingStaff ? t("staff.dialog.editTitle") : t("staff.dialog.addTitle")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("staff.fields.name")}</FormLabel><FormControl><Input placeholder={t("staff.fields.namePlaceholder")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.role")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("staff.fields.selectRole")} /></SelectTrigger></FormControl>
                      <SelectContent>{(editingStaff ? ALL_ROLES : assignableRoles).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="active">{t("status.active")}</SelectItem><SelectItem value="inactive">{t("status.inactive")}</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.email")}</FormLabel><FormControl><Input type="email" placeholder="email@property.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.phone")}</FormLabel><FormControl><Input placeholder="+1 555-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="propertyId" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("staff.fields.property")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("staff.fields.noProperty")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("staff.fields.noProperty")}</SelectItem>
                        {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>
                  {editingStaff ? t("staff.dialog.saveChanges") : t("staff.addMember")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
