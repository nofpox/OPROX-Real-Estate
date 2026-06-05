import React, { useState, useRef } from "react";
import {
  useListStaff, getListStaffQueryKey, useCreateStaff, useUpdateStaff, useDeleteStaff, useListProperties,
  useResendStaffInvite, useBulkCreateStaff,
} from "@/lib/local-hooks";
import { useRole } from "@/contexts/role-context";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus, Users, MoreVertical, Phone, Mail, Building2, UserCheck, UserX,
  CalendarDays, Send, Clock, CheckCircle2, Upload, Download, FileText,
  AlertCircle, ShieldCheck, X, Copy, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffShifts from "./staff-shifts";
import { useTranslation } from "react-i18next";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { value: "owner",         colorClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "admin_manager", colorClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "manager",       colorClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "administrator", colorClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "supervisor",    colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "maintenance",   colorClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "cleaning",      colorClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "security",      colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
];

const VALID_SYSTEM_ROLES = SYSTEM_ROLES.map((r) => r.value) as [string, ...string[]];

const CSV_HEADERS = ["name", "jobTitle", "systemRole", "email", "phone", "propertyId", "status"];
const CSV_EXAMPLE_ROWS = [
  ["Ahmed Al-Rashidi", "Civil Engineer", "supervisor", "ahmed@company.com", "+966501234567", "", "active"],
  ["Sara Al-Qahtani", "HVAC Technician", "maintenance", "sara@company.com", "+966509876543", "", "active"],
  ["Khalid Al-Dosari", "Site Inspector", "security", "khalid@company.com", "+966512345678", "", "active"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCallerLevel(dbRole: string): number {
  if (dbRole === "super_admin") return 6;
  if (dbRole === "owner") return 5;
  if (dbRole === "admin_manager" || dbRole === "admin" ) return 4;
  if (dbRole === "manager") return 3;
  if (dbRole === "administrator") return 2;
  if (dbRole === "supervisor" || dbRole === "site-supervisor" || dbRole === "property-manager" || dbRole === "front-desk") return 1;
  return 0;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = ["bg-blue-500","bg-green-500","bg-purple-500","bg-amber-500","bg-red-500","bg-indigo-500","bg-teal-500","bg-rose-500"];
  return colors[name.charCodeAt(0) % colors.length];
}

function getSystemRoleColor(systemRole: string): string {
  return SYSTEM_ROLES.find((r) => r.value === systemRole)?.colorClass
    ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
}

function downloadCSVTemplate() {
  const header = CSV_HEADERS.join(",");
  const rows = CSV_EXAMPLE_ROWS.map((r) => r.join(",")).join("\n");
  const blob = new Blob([header + "\n" + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "staff_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Simple CSV parser — handles quoted fields with embedded commas. */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());
    return Object.fromEntries(rawHeaders.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const staffSchema = z.object({
  name:       z.string().min(1),
  role:       z.string().min(1),
  systemRole: z.enum(["owner", "admin_manager", "manager", "administrator", "supervisor", "maintenance", "cleaning", "security"]),
  email:      z.string().email(),
  phone:      z.string().optional().or(z.literal("")),
  propertyId: z.coerce.number().optional().or(z.literal("")),
  status:     z.enum(["active", "inactive"]).default("active"),
});

// ─── Bulk Import Modal ────────────────────────────────────────────────────────

type BulkStep = "upload" | "preview" | "done";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateStaff();

  const [step, setStep] = useState<BulkStep>("upload");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; errors: Array<{ row: number; name?: string; error: string }> } | null>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast({ title: "Invalid file type", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: t("staff.bulkImportDialog.noRows"), variant: "destructive" });
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function rowToStaffInput(row: Record<string, string>) {
    return {
      name:       row.name ?? "",
      role:       row.jobtitle ?? row.role ?? "",
      systemRole: row.systemrole ?? row.systemRole ?? "supervisor",
      email:      row.email ?? "",
      phone:      row.phone || undefined,
      propertyId: row.propertyid ? parseInt(row.propertyid) : undefined,
      status:     (row.status as "active" | "inactive") || "active",
    };
  }

  async function handleImport() {
    const members = rows.map(rowToStaffInput);
    bulkCreate.mutate({ data: { members: members as any } }, {
      onSuccess: (res: any) => {
        setResult({ created: res.created, errors: res.errors ?? [] });
        setStep("done");
        if (res.created > 0) onSuccess();
      },
      onError: () => {
        toast({ title: "Import failed", variant: "destructive" });
      },
    });
  }

  const previewRows = rows.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t("staff.bulkImportDialog.title")}
          </DialogTitle>
          <DialogDescription>{t("staff.bulkImportDialog.subtitle")}</DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={downloadCSVTemplate}
              className="w-full flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Download className="h-4 w-4" />
                {t("staff.bulkImportDialog.downloadTemplate")}
              </span>
              <span className="text-xs text-muted-foreground">staff_import_template.csv</span>
            </button>

            <div
              className="rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">{t("staff.bulkImportDialog.dragDrop")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("staff.bulkImportDialog.csvHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">Valid systemRole values:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SYSTEM_ROLES.map((r) => (
                  <span key={r.value} className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.colorClass}`}>{r.value}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {t("staff.bulkImportDialog.preview", { count: rows.length })}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border text-xs">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    {["name", "jobTitle", "systemRole", "email"].map((h) => (
                      <th key={h} className="text-left font-medium py-2 px-3 text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 px-3 font-medium">{row.name || row.name}</td>
                      <td className="py-2 px-3">{row.jobtitle || row.role || "—"}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSystemRoleColor(row.systemrole || row.systemRole || "")}`}>
                          {row.systemrole || row.systemRole || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2 bg-muted/20">
                  +{rows.length - 10} more rows not shown
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={reset}>
                <X className="me-1.5 h-3.5 w-3.5" />
                Change File
              </Button>
              <Button onClick={handleImport} disabled={bulkCreate.isPending}>
                {bulkCreate.isPending
                  ? t("staff.bulkImportDialog.importing")
                  : t("staff.bulkImportDialog.importButton", { count: rows.length })}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === "done" && result && (
          <div className="space-y-4">
            {result.created > 0 && result.errors.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t("staff.bulkImportDialog.success", { created: result.created })}
                </p>
              </div>
            )}
            {result.created > 0 && result.errors.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t("staff.bulkImportDialog.partialSuccess", { created: result.created, errors: result.errors.length })}
                </p>
              </div>
            )}
            {result.created === 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t("staff.bulkImportDialog.allFailed", { errors: result.errors.length })}
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("staff.bulkImportDialog.failedRows")}
                </p>
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto text-xs">
                  {result.errors.map((e) => (
                    <div key={e.row} className="flex items-start gap-2 px-3 py-2">
                      <span className="shrink-0 font-mono text-muted-foreground w-10">#{e.row}</span>
                      <span className="font-medium shrink-0">{e.name || "—"}</span>
                      <span className="text-red-600 dark:text-red-400 truncate">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>{t("staff.bulkImportDialog.close")}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "directory" | "schedule";

export default function Staff() {
  const { t } = useTranslation();
  const { actualDbRole } = useRole();
  const callerLevel = getCallerLevel(actualDbRole);

  const [activeTab, setActiveTab] = useState<Tab>("directory");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [systemRoleFilter, setSystemRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [inviteCodeData, setInviteCodeData] = useState<{ code: string; username: string; email: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const params: any = {};
  if (selectedProperty !== "all") params.propertyId = parseInt(selectedProperty);

  const { data: staff, isLoading } = useListStaff(params);
  const { data: properties } = useListProperties();
  const createStaff    = useCreateStaff();
  const updateStaff    = useUpdateStaff();
  const deleteStaff    = useDeleteStaff();
  const resendInvite   = useResendStaffInvite();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", role: "", systemRole: "supervisor", email: "", phone: "", propertyId: "", status: "active" },
  });

  const filteredStaff = staff?.filter((s) => {
    if (systemRoleFilter === "all") return true;
    return (s as any).systemRole === systemRoleFilter;
  }) || [];

  const activeCount   = staff?.filter((s) => s.status === "active").length || 0;
  const inactiveCount = staff?.filter((s) => s.status === "inactive").length || 0;

  const openCreate = () => {
    setEditingStaff(null);
    form.reset({ name: "", role: "", systemRole: "supervisor", email: "", phone: "", propertyId: "", status: "active" });
    setIsDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingStaff(s);
    form.reset({
      name: s.name, role: s.role, systemRole: s.systemRole ?? "supervisor",
      email: s.email, phone: s.phone || "", propertyId: s.propertyId || "", status: s.status,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof staffSchema>) => {
    const payload = { ...data, phone: data.phone || undefined, propertyId: data.propertyId ? Number(data.propertyId) : undefined };
    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: payload }, {
        onSuccess: () => { toast({ title: t("staff.toast.updated") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); setIsDialogOpen(false); },
        onError: (err: any) => {
          const msg = err?.data?.error ?? t("staff.toast.updateFailed");
          toast({ title: msg, variant: "destructive" });
        },
      });
    } else {
      createStaff.mutate({ data: payload as any }, {
        onSuccess: (created) => {
          const emailSent    = (created as any).welcomeEmailSent as boolean;
          const inviteCode   = (created as any).inviteCode as string | null;
          const inviteUser   = (created as any).inviteUsername as string | null;
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) });
          setIsDialogOpen(false);
          if (emailSent) {
            toast({
              title: `Invitation sent to ${data.email}`,
              description: "They'll receive an email with a one-time access code.",
            });
          } else if (inviteCode && inviteUser) {
            setCodeCopied(false);
            setInviteCodeData({ code: inviteCode, username: inviteUser, email: data.email });
          } else {
            toast({ title: t("staff.toast.added") });
          }
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? t("staff.toast.addFailed");
          toast({ title: msg, variant: "destructive" });
        },
      });
    }
  };

  const handleToggleStatus = (s: any) => {
    updateStaff.mutate({ id: s.id, data: { status: s.status === "active" ? "inactive" : "active" } }, {
      onSuccess: () => { toast({ title: t("staff.toast.statusUpdated") }); queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) }); },
      onError: () => toast({ title: t("staff.toast.updateFailed"), variant: "destructive" }),
    });
  };

  const handleResendInvite = (s: any) => {
    resendInvite.mutate({ id: s.id }, {
      onSuccess: (res: any) => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) });
        if (res.sent) {
          toast({ title: "Invitation sent", description: res.message ?? `New access code emailed to ${s.email}` });
        } else if (res.inviteCode && res.inviteUsername) {
          setCodeCopied(false);
          setInviteCodeData({ code: res.inviteCode, username: res.inviteUsername, email: s.email });
        } else {
          toast({ title: res.message ?? "Invitation updated" });
        }
      },
      onError: () => toast({ title: "Failed to send invitation", variant: "destructive" }),
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="font-semibold">
              <Upload className="me-2 h-4 w-4" />
              {t("staff.bulkImport")}
            </Button>
            <Button onClick={openCreate} className="font-semibold shadow-sm">
              <Plus className="me-2 h-4 w-4" />
              {t("staff.addMember")}
            </Button>
          </div>
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
            <Select value={systemRoleFilter} onValueChange={setSystemRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background"><SelectValue placeholder={t("staff.allRoles")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("staff.allRoles")}</SelectItem>
                {SYSTEM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{t(`roles.${r.value}` as any)}</SelectItem>
                ))}
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
                              <DropdownMenuItem onClick={() => handleResendInvite(s)} disabled={resendInvite.isPending} className="flex items-center gap-2">
                                <Send className="h-3.5 w-3.5" />
                                {s.invitePending ? "Resend Invite" : s.hasAccount ? "Resend Invite" : "Send Invite"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(s)}>{t("staff.remove")}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Job title */}
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.role}</p>
                        {/* System role badge */}
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSystemRoleColor((s as any).systemRole ?? "")}`}>
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {t(`roles.${(s as any).systemRole ?? ""}` as any, { defaultValue: (s as any).systemRole ?? "" })}
                          </span>
                        </div>
                        <div className="mt-2.5 space-y-1.5">
                          {s.propertyName && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{s.propertyName}</span></div>}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span></div>
                          {s.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span>{s.phone}</span></div>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs font-medium border-0 ${s.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {s.status === "active" ? t("status.active") : t("status.inactive")}
                      </Badge>
                      {s.invitePending && (
                        <Badge className="text-xs font-medium border-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />Setup pending
                        </Badge>
                      )}
                      {s.hasAccount && !s.invitePending && (
                        <Badge className="text-xs font-medium border-0 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />Account active
                        </Badge>
                      )}
                      {!s.hasAccount && (
                        <Badge className="text-xs font-medium border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />No account
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Staff Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader><DialogTitle>{editingStaff ? t("staff.dialog.editTitle") : t("staff.dialog.addTitle")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Full name */}
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("staff.fields.name")}</FormLabel><FormControl><Input placeholder={t("staff.fields.namePlaceholder")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* Job title — free-form text */}
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("staff.fields.jobTitle")}</FormLabel><FormControl><Input placeholder={t("staff.fields.jobTitlePlaceholder")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* System role — dropdown */}
                <FormField control={form.control} name="systemRole" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("staff.fields.systemRole")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("staff.fields.selectSystemRole")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SYSTEM_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full inline-block ${r.colorClass.split(" ")[0]}`} />
                              {t(`roles.${r.value}` as any)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Status */}
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="active">{t("status.active")}</SelectItem><SelectItem value="inactive">{t("status.inactive")}</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />

                {/* Email */}
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.email")}</FormLabel><FormControl><Input type="email" placeholder="email@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* Phone */}
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("staff.fields.phone")}</FormLabel><FormControl><Input placeholder="+966 5X XXX XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* Property */}
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

      {/* ── Bulk Import Modal ── */}
      <BulkImportModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(params) })}
      />

      {/* ── Invite Code Dialog (shown when email delivery fails) ── */}
      <Dialog open={!!inviteCodeData} onOpenChange={(open) => { if (!open) setInviteCodeData(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Send className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Share Access Code Manually
            </DialogTitle>
            <DialogDescription>
              Email delivery was unavailable. Share these credentials with{" "}
              <strong>{inviteCodeData?.email}</strong> via any channel — the employee must change their password on first login.
            </DialogDescription>
          </DialogHeader>

          {inviteCodeData && (
            <div className="space-y-3 py-1">
              {/* Username */}
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Username</p>
                <p className="font-mono text-base font-semibold tracking-wide">{inviteCodeData.username}</p>
              </div>

              {/* One-time code */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-center space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">One-Time Access Code</p>
                <p className="font-mono text-3xl font-black tracking-[0.25em] text-amber-900 dark:text-amber-200">{inviteCodeData.code}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Expires on first login — employee sets their own password immediately after.</p>
              </div>

              {/* Copy button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const text = `Username: ${inviteCodeData.username}\nOne-Time Code: ${inviteCodeData.code}`;
                  navigator.clipboard.writeText(text).then(() => {
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2500);
                  });
                }}
              >
                {codeCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {codeCopied ? "Copied!" : "Copy Username & Code"}
              </Button>

              {/* Tip */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Once the employee logs in and changes their password, the <span className="font-medium">Setup pending</span> badge on their card will clear automatically.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setInviteCodeData(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
