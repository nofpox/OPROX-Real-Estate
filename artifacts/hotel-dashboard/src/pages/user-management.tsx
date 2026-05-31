import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRole } from "@/contexts/role-context";
import {
  useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useKillSwitchUser,
  getListUsersQueryKey, type PmsUser,
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
  ShieldOff, ShieldAlert,
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

// ─── System roles ─────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { id: "admin",      label: "مدير النظام", labelEn: "System Admin",  dot: "bg-purple-500", badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", level: 4 },
  { id: "manager",    label: "مدير",         labelEn: "Manager",        dot: "bg-blue-500",   badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",   level: 3 },
  { id: "supervisor", label: "مشرف",         labelEn: "Supervisor",     dot: "bg-amber-500",  badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", level: 2 },
  { id: "staff",      label: "موظف",         labelEn: "Staff",          dot: "bg-slate-500",  badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",   level: 1 },
];

function getCallerLevelNum(dbRole: string): number {
  if (dbRole === "owner" || dbRole === "admin" || dbRole === "super_admin") return 4;
  if (dbRole === "manager") return 3;
  if (dbRole === "supervisor" || dbRole === "site-supervisor" || dbRole === "property-manager" || dbRole === "front-desk") return 2;
  return 1;
}

function SystemRoleBadge({ role }: { role: string }) {
  const def = SYSTEM_ROLES.find(r => r.id === role);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${def?.badgeClass ?? "bg-muted text-muted-foreground"}`}>
      {def?.label ?? role}
    </span>
  );
}

const EMPTY_USER_FORM = {
  username: "", displayName: "", email: "", password: "", confirmPassword: "",
  role: "staff", isActive: true,
};

function SystemAccounts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { actualDbRole } = useRole();
  const callerLevel = getCallerLevelNum(actualDbRole);
  // Roles the caller is allowed to create (strictly below their own level)
  const creatableRoles = SYSTEM_ROLES.filter(r => r.level < callerLevel);

  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const killSwitch = useKillSwitchUser();

  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editing,      setEditing]      = useState<PmsUser | null>(null);
  const [form,         setForm]         = useState({ ...EMPTY_USER_FORM });
  const [showPwd,      setShowPwd]      = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const allUsers = users ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(u => {
      if (q && !u.username.toLowerCase().includes(q) && !u.displayName.toLowerCase().includes(q) && !(u.email ?? "").toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active"   && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive)  return false;
      return true;
    });
  }, [allUsers, search, roleFilter, statusFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_USER_FORM });
    setShowPwd(false);
    setDialogOpen(true);
  }

  function openEdit(user: PmsUser) {
    setEditing(user);
    setForm({ username: user.username, displayName: user.displayName, email: user.email ?? "", password: "", confirmPassword: "", role: user.role, isActive: user.isActive });
    setShowPwd(false);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.displayName.trim()) return;
    if (!editing && !form.password) return;
    if (form.password && form.password !== form.confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" }); return;
    }
    const payload: Record<string, unknown> = {
      username: form.username.trim(), displayName: form.displayName.trim(),
      email: form.email.trim() || undefined, role: form.role, isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;

    if (editing) {
      updateUser.mutate({ id: editing.id, data: payload as never }, {
        onSuccess: () => { toast({ title: "تم تحديث الحساب" }); invalidate(); setDialogOpen(false); },
        onError:   () => { toast({ title: "فشل في تحديث الحساب", variant: "destructive" }); },
      });
    } else {
      createUser.mutate({ data: payload as never }, {
        onSuccess: () => { toast({ title: "تم إضافة الحساب بنجاح" }); invalidate(); setDialogOpen(false); },
        onError:   () => { toast({ title: "فشل في إضافة الحساب", variant: "destructive" }); },
      });
    }
  }

  function handleToggleActive(user: PmsUser) {
    if (!user.isActive) {
      updateUser.mutate({ id: user.id, data: { username: user.username, displayName: user.displayName, role: user.role, isActive: true } as never }, {
        onSuccess: () => { toast({ title: "تم تفعيل الحساب" }); invalidate(); },
        onError:   () => { toast({ title: "فشل في تفعيل الحساب", variant: "destructive" }); },
      });
    } else {
      killSwitch.mutate({ id: user.id }, {
        onSuccess: () => { toast({ title: "تم تعطيل الحساب وإنهاء جميع الجلسات" }); invalidate(); },
        onError:   () => { toast({ title: "فشل في تعطيل الحساب", variant: "destructive" }); },
      });
    }
  }

  function handleDelete(user: PmsUser) {
    if (!confirm(`هل أنت متأكد من حذف حساب "${user.displayName}"؟`)) return;
    deleteUser.mutate({ id: user.id }, {
      onSuccess: () => { toast({ title: "تم حذف الحساب" }); invalidate(); },
      onError:   () => { toast({ title: "فشل في حذف الحساب", variant: "destructive" }); },
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="بحث في الحسابات..." className="ps-8 w-52 bg-background h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-auto text-xs bg-background"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأدوار</SelectItem>
              {SYSTEM_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-auto text-xs bg-background"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">معطّل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {callerLevel >= 2 && (
          <Button onClick={openAdd} size="sm" className="shrink-0 font-semibold shadow-sm">
            <Plus className="me-2 h-4 w-4" />إضافة حساب جديد
          </Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي الحسابات", value: allUsers.length,                              icon: Users,        color: "text-primary",     bg: "bg-primary/10"     },
          { label: "حسابات نشطة",     value: allUsers.filter(u => u.isActive).length,       icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "حسابات معطّلة",   value: allUsers.filter(u => !u.isActive).length,      icon: EyeOff,       color: "text-muted-foreground", bg: "bg-muted/50"  },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="shadow-sm border-border/50">
              <CardContent className="flex items-center gap-3 pt-5 pb-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-8 mb-1" /> : <p className="text-2xl font-bold">{kpi.value}</p>}
                  <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-6">الحساب</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="ps-6"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserCog className="h-8 w-8 opacity-30" />
                      <span className="text-sm">{allUsers.length === 0 ? "لا توجد حسابات بعد" : "لا توجد نتائج مطابقة"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(user => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <TableCell className="ps-6">
                    <div>
                      <p className="font-medium text-sm">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                    </div>
                  </TableCell>
                  <TableCell><SystemRoleBadge role={user.role} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email ?? <span className="italic opacity-50">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                  </TableCell>
                  <TableCell><StatusBadge status={user.isActive ? "active" : "inactive"} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {/* Prominent inline Block / Unblock button */}
                      {user.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => handleToggleActive(user)}
                          disabled={killSwitch.isPending}
                          title="Block this user and terminate all active sessions immediately"
                        >
                          <ShieldOff className="h-3 w-3" />
                          حظر
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                          onClick={() => handleToggleActive(user)}
                          title="Restore access for this user"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          رفع الحظر
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="me-2 h-4 w-4" />تعديل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(user)}>
                            <Trash2 className="me-2 h-4 w-4" />حذف الحساب
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? "تعديل الحساب" : "إضافة حساب جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="su-username">اسم المستخدم *</Label>
                <Input
                  id="su-username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  disabled={!!editing}
                  required
                  placeholder="username"
                  dir="ltr"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-displayName">الاسم الظاهر *</Label>
                <Input id="su-displayName" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required placeholder="الاسم الكامل" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-email">البريد الإلكتروني</Label>
              <Input id="su-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-role">الدور *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger id="su-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(editing ? SYSTEM_ROLES : creatableRoles).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${r.dot}`} />
                        <span>{r.label}</span>
                        <span className="text-muted-foreground text-xs">· {r.labelEn}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-password">
                {editing ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور *"}
              </Label>
              <div className="relative">
                <Input
                  id="su-password"
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  placeholder={editing ? "••••••••" : "كلمة مرور قوية"}
                  dir="ltr"
                  className="pe-10"
                />
                <button type="button" className="absolute end-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {form.password && (
              <div className="space-y-1.5">
                <Label htmlFor="su-confirm">تأكيد كلمة المرور</Label>
                <Input
                  id="su-confirm"
                  type={showPwd ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="أعد كتابة كلمة المرور"
                  dir="ltr"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <Label className="cursor-pointer select-none" onClick={() => setForm({ ...form, isActive: !form.isActive })}>
                {form.isActive ? "الحساب نشط" : "الحساب معطّل"}
              </Label>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {editing ? "حفظ التغييرات" : "إضافة الحساب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { t } = useTranslation();
  const [pageTab, setPageTab] = useState<"field" | "system">("system");

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
      </div>

      {/* Page-level tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-full max-w-xs">
        <button
          onClick={() => setPageTab("field")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${pageTab === "field" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          موظفو الميدان
        </button>
        <button
          onClick={() => setPageTab("system")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${pageTab === "system" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          حسابات النظام
        </button>
      </div>

      {pageTab === "system" && <SystemAccounts />}

      {pageTab === "field" && (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Users className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="max-w-sm">
              <p className="font-semibold text-lg">تم نقل موظفو الميدان</p>
              <p className="text-muted-foreground text-sm mt-1">
                تم دمج جميع بيانات موظفي الميدان في قسم <strong>الموظفين</strong> الموحّد.
                يرجى الانتقال إلى صفحة الموظفين لإدارة أعضاء الفريق وتخصيص الأدوار.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.assign(window.location.origin + (import.meta.env.BASE_URL ?? "/") + "#/staff")}
            >
              الانتقال إلى صفحة الموظفين
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
