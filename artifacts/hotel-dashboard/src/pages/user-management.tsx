import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useListFieldUsers, useCreateFieldUser, useUpdateFieldUser, useDeleteFieldUser,
  getListFieldUsersQueryKey, useListProperties, type FieldUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Plus, Search, MoreHorizontal, Pencil, Trash2,
  ShieldCheck, Wrench, Sparkles, Building, HardHat,
  Eye, EyeOff, CheckCircle2, XCircle, ChevronDown, UserCog,
} from "lucide-react";

// ─── Role definitions ─────────────────────────────────────────────────────────

interface RoleStaticDef {
  id: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
  badgeClass: string;
  canAccess: string[];
  cannotAccess: string[];
}

const FIELD_ROLES: RoleStaticDef[] = [
  {
    id: "property-manager",
    icon: Building, color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    canAccess: ["Dashboard", "Unit Status", "Maintenance & Work Orders", "Tasks (all categories)", "Service Requests", "Staff Directory"],
    cannotAccess: ["Booking / Reservation data", "Guest profiles", "Financial reports"],
  },
  {
    id: "site-supervisor",
    icon: HardHat, color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    canAccess: ["Dashboard (property view)", "Unit Status", "Maintenance & Work Orders", "Tasks (maintenance, general)"],
    cannotAccess: ["Booking / Reservation data", "Guest profiles", "Financial reports", "Service Request intake"],
  },
  {
    id: "maintenance-tech",
    icon: Wrench, color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    canAccess: ["Work Orders (assigned to them)", "Tasks (maintenance only)"],
    cannotAccess: ["Dashboard", "Unit Status", "Booking / Reservation data", "Guest profiles", "Financial reports"],
  },
  {
    id: "cleaning-staff",
    icon: Sparkles, color: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    canAccess: ["Tasks (housekeeping only)"],
    cannotAccess: ["Dashboard", "Unit Status", "Maintenance work orders", "Booking data", "Guest profiles", "Financial reports"],
  },
  {
    id: "security-officer",
    icon: ShieldCheck, color: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
    canAccess: ["Tasks (security only)"],
    cannotAccess: ["Dashboard", "Unit Status", "Maintenance work orders", "Booking data", "Guest profiles", "Financial reports"],
  },
];

function getRoleDef(id: string): RoleStaticDef {
  return FIELD_ROLES.find((r) => r.id === id) ?? FIELD_ROLES[0];
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const def = getRoleDef(role);
  const Icon = def.icon;
  const label = t(`userManagement.roles.${role}.label`, { defaultValue: role });
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${def.badgeClass}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return status === "active" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
      {t("userManagement.statusLabel.active")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 inline-block" />
      {t("userManagement.statusLabel.inactive")}
    </span>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", role: "maintenance-tech", propertyId: "" as string | number,
  email: "", phone: "", notes: "", status: "active",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListFieldUsers();
  const { data: properties }       = useListProperties();
  const createUser = useCreateFieldUser();
  const updateUser = useUpdateFieldUser();
  const deleteUser = useDeleteFieldUser();

  const [search,         setSearch]         = useState("");
  const [roleFilter,     setRoleFilter]     = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editing,        setEditing]        = useState<FieldUser | null>(null);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const [expandedRole,   setExpandedRole]   = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(user: FieldUser) {
    setEditing(user);
    setForm({
      name: user.name, role: user.role, propertyId: user.propertyId ?? "",
      email: user.email ?? "", phone: user.phone ?? "",
      notes: user.notes ?? "", status: user.status,
    });
    setDialogOpen(true);
  }

  function buildPayload() {
    return {
      name:       form.name.trim(),
      role:       form.role,
      propertyId: form.propertyId !== "" ? Number(form.propertyId) : undefined,
      email:      form.email.trim() || undefined,
      phone:      form.phone.trim() || undefined,
      notes:      form.notes.trim() || undefined,
      status:     form.status,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role) return;
    const payload = buildPayload();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListFieldUsersQueryKey() });
    if (editing) {
      updateUser.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: t("userManagement.toast.updated") }); invalidate(); setDialogOpen(false); },
        onError:   () => { toast({ title: t("userManagement.toast.updateFailed"), variant: "destructive" }); },
      });
    } else {
      createUser.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: t("userManagement.toast.added") }); invalidate(); setDialogOpen(false); },
        onError:   () => { toast({ title: t("userManagement.toast.addFailed"), variant: "destructive" }); },
      });
    }
  }

  function handleDeactivate(user: FieldUser) {
    const next = user.status === "active" ? "inactive" : "active";
    updateUser.mutate({ id: user.id, data: { name: user.name, role: user.role, status: next } }, {
      onSuccess: () => {
        toast({ title: next === "active" ? t("userManagement.toast.reactivated") : t("userManagement.toast.deactivated") });
        queryClient.invalidateQueries({ queryKey: getListFieldUsersQueryKey() });
      },
      onError: () => toast({ title: t("userManagement.toast.statusFailed"), variant: "destructive" }),
    });
  }

  function handleDelete(user: FieldUser) {
    if (!confirm(t("userManagement.deleteConfirm", { name: user.name }))) return;
    deleteUser.mutate({ id: user.id }, {
      onSuccess: () => {
        toast({ title: t("userManagement.toast.removed") });
        queryClient.invalidateQueries({ queryKey: getListFieldUsersQueryKey() });
      },
      onError: () => toast({ title: t("userManagement.toast.removeFailed"), variant: "destructive" }),
    });
  }

  const allUsers = useMemo(() => users ?? [], [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !(u.email ?? "").toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (propertyFilter !== "all" && String(u.propertyId ?? "none") !== propertyFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [allUsers, search, roleFilter, propertyFilter, statusFilter]);

  const kpis = useMemo(() => {
    const activeCount   = allUsers.filter((u) => u.status === "active").length;
    const inactiveCount = allUsers.filter((u) => u.status === "inactive").length;
    const propertyCover = new Set(allUsers.map((u) => u.propertyId).filter(Boolean)).size;
    return [
      { labelKey: "kpi.total",             value: allUsers.length, icon: Users,        color: "text-primary",         bg: "bg-primary/10"      },
      { labelKey: "kpi.active",            value: activeCount,     icon: CheckCircle2, color: "text-emerald-500",     bg: "bg-emerald-500/10"  },
      { labelKey: "kpi.inactive",          value: inactiveCount,   icon: EyeOff,       color: "text-muted-foreground",bg: "bg-muted/50"        },
      { labelKey: "kpi.propertiesCovered", value: propertyCover,   icon: Building,     color: "text-blue-500",        bg: "bg-blue-500/10"     },
    ];
  }, [allUsers]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {t("userManagement.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("userManagement.subtitle")}</p>
        </div>
        <Button className="shrink-0 font-semibold shadow-sm" onClick={openAdd}>
          <Plus className="me-2 h-4 w-4" />
          {t("userManagement.addMember")}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.labelKey} className="shadow-sm border-border/50">
              <CardContent className="flex items-center gap-3 pt-5 pb-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-8 mb-1" /> : <p className="text-2xl font-bold">{kpi.value}</p>}
                  <p className="text-xs text-muted-foreground leading-tight">{t(`userManagement.${kpi.labelKey}`)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Users table (3/5) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-0">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("userManagement.search")}
                    className="ps-8 bg-background"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-8 w-auto text-xs bg-background">
                      <SelectValue placeholder={t("userManagement.allRoles")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("userManagement.allRoles")}</SelectItem>
                      {FIELD_ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {t(`userManagement.roles.${r.id}.label`, { defaultValue: r.id })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                    <SelectTrigger className="h-8 w-auto text-xs bg-background">
                      <SelectValue placeholder={t("common.allProperties")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allProperties")}</SelectItem>
                      {(properties ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-auto text-xs bg-background">
                      <SelectValue placeholder={t("userManagement.allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("userManagement.allStatuses")}</SelectItem>
                      <SelectItem value="active">{t("userManagement.statusLabel.active")}</SelectItem>
                      <SelectItem value="inactive">{t("userManagement.statusLabel.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-6">{t("userManagement.tableHeaders.name")}</TableHead>
                    <TableHead>{t("userManagement.tableHeaders.role")}</TableHead>
                    <TableHead>{t("userManagement.tableHeaders.property")}</TableHead>
                    <TableHead>{t("userManagement.tableHeaders.status")}</TableHead>
                    <TableHead className="w-[48px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="ps-6"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <UserCog className="h-8 w-8 opacity-30" />
                          <span className="text-sm">
                            {allUsers.length === 0
                              ? t("userManagement.noUsersYet")
                              : t("userManagement.noUsersMatch")
                            }
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((user) => (
                      <TableRow key={user.id} className={user.status === "inactive" ? "opacity-50" : ""}>
                        <TableCell className="ps-6">
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                          </div>
                        </TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.propertyName ?? <span className="italic opacity-60">{t("userManagement.allPropertiesLabel")}</span>}
                        </TableCell>
                        <TableCell><StatusBadge status={user.status} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t("userManagement.actions.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeactivate(user)}>
                                {user.status === "active"
                                  ? <><EyeOff className="me-2 h-4 w-4" />{t("userManagement.actions.deactivate")}</>
                                  : <><Eye    className="me-2 h-4 w-4" />{t("userManagement.actions.reactivate")}</>
                                }
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(user)}
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t("userManagement.actions.remove")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Role Reference (2/5) */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border/50 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t("userManagement.rolePanel.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("userManagement.rolePanel.subtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {FIELD_ROLES.map((role) => {
                const Icon = role.icon;
                const isExpanded = expandedRole === role.id;
                const roleLabel = t(`userManagement.roles.${role.id}.label`, { defaultValue: role.id });
                const roleDesc  = t(`userManagement.roles.${role.id}.desc`,  { defaultValue: "" });
                return (
                  <div
                    key={role.id}
                    className={`rounded-lg border transition-all ${isExpanded ? "border-border bg-card shadow-sm" : "border-border/50 bg-muted/20"}`}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-md shrink-0 ${role.iconBg}`}>
                          <Icon className={`h-3.5 w-3.5 ${role.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate">{roleLabel}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{roleDesc}</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2.5">
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">
                            {t("userManagement.rolePanel.canAccess")}
                          </p>
                          <ul className="space-y-1">
                            {role.canAccess.map((item) => (
                              <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wide">
                            {t("userManagement.rolePanel.noAccess")}
                          </p>
                          <ul className="space-y-1">
                            {role.cannotAccess.map((item) => (
                              <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? t("userManagement.dialog.editTitle") : t("userManagement.dialog.addTitle")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="um-name">{t("userManagement.dialog.fullName")} *</Label>
              <Input
                id="um-name"
                placeholder={t("userManagement.dialog.fullNamePlaceholder")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="um-role">{t("userManagement.dialog.opsRole")} *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="um-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${r.color}`} />
                          <div>
                            <p className="font-medium text-sm">{t(`userManagement.roles.${r.id}.label`, { defaultValue: r.id })}</p>
                            <p className="text-xs text-muted-foreground">{t(`userManagement.roles.${r.id}.desc`, { defaultValue: "" })}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {form.role && (
                <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 mt-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {t("userManagement.rolePanel.scope")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {getRoleDef(form.role).canAccess.map((item) => (
                      <span key={item} className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="um-property">{t("userManagement.dialog.propertyAssignment")}</Label>
              <p className="text-xs text-muted-foreground">{t("userManagement.dialog.propertyDesc")}</p>
              <Select
                value={form.propertyId === "" ? "none" : String(form.propertyId)}
                onValueChange={(v) => setForm({ ...form, propertyId: v === "none" ? "" : Number(v) })}
              >
                <SelectTrigger id="um-property">
                  <SelectValue placeholder={t("userManagement.dialog.allPropertiesOption")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("userManagement.dialog.allPropertiesOption")}</SelectItem>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="um-email">{t("userManagement.dialog.email")}</Label>
                <Input id="um-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="um-phone">{t("userManagement.dialog.phone")}</Label>
                <Input id="um-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="um-status">{t("userManagement.dialog.statusLabel")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="um-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("userManagement.statusLabel.active")}</SelectItem>
                  <SelectItem value="inactive">{t("userManagement.statusLabel.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="um-notes">{t("userManagement.dialog.notes")}</Label>
              <Textarea
                id="um-notes"
                placeholder={t("userManagement.dialog.notesPlaceholder")}
                className="resize-none h-16"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {editing ? t("userManagement.dialog.saveChanges") : t("userManagement.dialog.addButton")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
