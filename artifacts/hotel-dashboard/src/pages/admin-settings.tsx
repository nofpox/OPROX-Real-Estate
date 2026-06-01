import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  useListCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  getListCustomFieldsQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import type { CustomField, CreateCustomFieldInput, UpdateCustomFieldInput } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, SlidersHorizontal, Tag, ToggleLeft,
  Building2, ListChecks, CheckSquare, ShieldCheck, Shield, Lock,
  Palette, Upload,
} from "lucide-react";
import type { PermissionMatrix } from "@workspace/api-client-react";
import { applyPrimaryColor, applySidebarColor, HEX_RE } from "@/hooks/use-theme";
import { useLanguage } from "@/contexts/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = "systemInfo" | "taskTypes" | "taskRequirements" | "customFields" | "permissions" | "appearance";
type EntityTab = "asset" | "task";
type FieldType = "text" | "number" | "select" | "date" | "boolean";

const FIELD_TYPES: FieldType[] = ["text", "number", "select", "date", "boolean"];

const COLOR_OPTIONS = ["blue", "green", "orange", "red", "purple", "yellow", "pink", "gray"] as const;
type TaskColor = typeof COLOR_OPTIONS[number];

interface TaskType {
  id:    string;
  name:  string;
  color: TaskColor;
}

interface TaskRequirements {
  dueDate:    boolean;
  photoProof: boolean;
  notes:      boolean;
  priority:   boolean;
  assignedTo: boolean;
}

// ─── Color badge helper ───────────────────────────────────────────────────────

const COLOR_CLASSES: Record<TaskColor, string> = {
  blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  green:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  red:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  pink:   "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  gray:   "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function toKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function genId(name: string): string {
  return toKey(name) + "_" + Math.random().toString(36).slice(2, 6);
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TAB_META: Array<{ key: MainTab; icon: React.ReactNode; label?: string }> = [
  { key: "systemInfo",       icon: <Building2 className="h-4 w-4" /> },
  { key: "taskTypes",        icon: <Tag className="h-4 w-4" /> },
  { key: "taskRequirements", icon: <CheckSquare className="h-4 w-4" /> },
  { key: "customFields",     icon: <SlidersHorizontal className="h-4 w-4" /> },
  { key: "permissions",      icon: <ShieldCheck className="h-4 w-4" />, label: "Role Permissions" },
  { key: "appearance",       icon: <Palette className="h-4 w-4" />,     label: "Appearance" },
];

// ─── Permission rows (for owner-level role permission editing) ────────────────

const OWNER_PERMISSION_ROUTES = [
  { href: "/",                   label: "Dashboard" },
  { href: "/properties",         label: "Properties" },
  { href: "/rooms",              label: "Rooms / Units" },
  { href: "/unit-map",           label: "Unit Map" },
  { href: "/maintenance",        label: "Maintenance" },
  { href: "/facilities",         label: "Facilities" },
  { href: "/staff",              label: "Staff" },
  { href: "/tasks",              label: "Tasks" },
  { href: "/guest-requests",     label: "Guest Requests" },
  { href: "/activity-log",       label: "Activity Log" },
  { href: "/user-management",    label: "User Management" },
  { href: "/admin-settings",     label: "Admin Settings" },
  { href: "/security-dashboard", label: "Security Dashboard" },
  { href: "/analytics",          label: "Analytics" },
  { href: "/support-tickets",    label: "Support Tickets" },
];

const OWNER_CONFIGURABLE_ROLES = [
  { id: "manager",     label: "Manager",     color: "bg-purple-100 text-purple-700" },
  { id: "supervisor",  label: "Supervisor",  color: "bg-amber-100 text-amber-700" },
  { id: "maintenance", label: "Maintenance", color: "bg-orange-100 text-orange-700" },
  { id: "cleaning",    label: "Cleaning",    color: "bg-green-100 text-green-700" },
  { id: "security",    label: "Security",    color: "bg-blue-100 text-blue-700" },
];

const DEFAULT_PERM: PermissionMatrix = {
  manager:     ["/", "/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
  supervisor:  ["/", "/tasks"],
  maintenance: ["/", "/tasks"],
  cleaning:    ["/", "/tasks"],
  security:    ["/", "/tasks"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — System Information
// ═══════════════════════════════════════════════════════════════════════════════

function SystemInfoTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: t("adminSettings.systemInfo.saved") });
      },
      onError: () => toast({ title: t("adminSettings.systemInfo.error"), variant: "destructive" }),
    },
  });

  const [form, setForm] = useState({
    companyName:    "",
    contactEmail:   "",
    contactPhone:   "",
    contactAddress: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName:    settings.companyName    ?? "",
        contactEmail:   settings.contactEmail   ?? "",
        contactPhone:   settings.contactPhone   ?? "",
        contactAddress: settings.contactAddress ?? "",
      });
    }
  }, [settings]);

  function handleSave() {
    updateMut.mutate({ data: form });
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-1">
        <p className="text-sm font-semibold">{t("adminSettings.systemInfo.title")}</p>
        <p className="text-xs text-muted-foreground">{t("adminSettings.systemInfo.subtitle")}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Company Name */}
        <div className="space-y-1.5">
          <Label htmlFor="si-company">{t("adminSettings.systemInfo.companyName")}</Label>
          <Input
            id="si-company"
            placeholder={t("adminSettings.systemInfo.companyNamePlaceholder")}
            value={form.companyName}
            onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
          />
        </div>

        {/* Contact Email */}
        <div className="space-y-1.5">
          <Label htmlFor="si-email">{t("adminSettings.systemInfo.contactEmail")}</Label>
          <Input
            id="si-email"
            type="email"
            placeholder={t("adminSettings.systemInfo.contactEmailPlaceholder")}
            value={form.contactEmail}
            onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
          />
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="si-phone">{t("adminSettings.systemInfo.contactPhone")}</Label>
          <Input
            id="si-phone"
            placeholder={t("adminSettings.systemInfo.contactPhonePlaceholder")}
            value={form.contactPhone}
            onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="si-address">{t("adminSettings.systemInfo.contactAddress")}</Label>
          <Input
            id="si-address"
            placeholder={t("adminSettings.systemInfo.contactAddressPlaceholder")}
            value={form.contactAddress}
            onChange={(e) => setForm((p) => ({ ...p, contactAddress: e.target.value }))}
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
            {updateMut.isPending ? "…" : t("adminSettings.systemInfo.saveBtn")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Task Categories
// ═══════════════════════════════════════════════════════════════════════════════

function TaskTypesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
    },
  });

  const [types, setTypes]           = useState<TaskType[]>([]);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [addingNew, setAddingNew]   = useState(false);
  const [draft, setDraft]           = useState<{ name: string; color: TaskColor }>({ name: "", color: "blue" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.taskTypes) {
      setTypes(settings.taskTypes as TaskType[]);
    }
  }, [settings]);

  function persistTypes(next: TaskType[]) {
    setTypes(next);
    updateMut.mutate(
      { data: { taskTypes: next } },
      {
        onSuccess: () => toast({ title: t("adminSettings.taskTypes.saved") }),
        onError: () => toast({ title: t("adminSettings.systemInfo.error"), variant: "destructive" }),
      },
    );
  }

  function startEdit(tt: TaskType) {
    setDraft({ name: tt.name, color: tt.color });
    setEditingId(tt.id);
    setAddingNew(false);
  }

  function startAdd() {
    setDraft({ name: "", color: "blue" });
    setAddingNew(true);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setDraft({ name: "", color: "blue" });
  }

  function saveEdit() {
    if (!draft.name.trim()) return;
    if (addingNew) {
      persistTypes([...types, { id: genId(draft.name), name: draft.name.trim(), color: draft.color }]);
    } else if (editingId) {
      persistTypes(types.map((tt) => tt.id === editingId ? { ...tt, name: draft.name.trim(), color: draft.color } : tt));
    }
    cancelEdit();
  }

  function deleteType() {
    if (!deletingId) return;
    persistTypes(types.filter((tt) => tt.id !== deletingId));
    setDeletingId(null);
    toast({ title: t("adminSettings.taskTypes.deleted") });
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const isEditing = editingId !== null || addingNew;

  return (
    <>
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-1 flex flex-row items-start justify-between">
          <div>
            <p className="text-sm font-semibold">{t("adminSettings.taskTypes.title")}</p>
            <p className="text-xs text-muted-foreground">{t("adminSettings.taskTypes.subtitle")}</p>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={startAdd}>
              <Plus className="h-3.5 w-3.5" />
              {t("adminSettings.taskTypes.addCategory")}
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          {types.length === 0 && !addingNew && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("adminSettings.taskTypes.noCategories")}
            </p>
          )}

          <div className="space-y-1">
            {types.map((tt) => (
              <div key={tt.id}>
                {editingId === tt.id ? (
                  <InlineTypeEditor
                    draft={draft}
                    onChange={setDraft}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <div className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded hover:bg-muted/20">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      COLOR_CLASSES[tt.color]?.includes("bg-") ? "" : ""
                    }`}
                      style={{ background: colorDotStyle(tt.color) }}
                    />
                    <span className="text-sm flex-1">{tt.name}</span>
                    <Badge className={`text-[11px] font-normal ${COLOR_CLASSES[tt.color] ?? ""}`}>
                      {tt.color}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(tt)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(tt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addingNew && (
              <InlineTypeEditor
                draft={draft}
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            )}
          </div>

          {!isEditing && (
            <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-muted-foreground" onClick={startAdd}>
              <Plus className="h-3.5 w-3.5" />
              {t("adminSettings.taskTypes.addCategory")}
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminSettings.taskTypes.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminSettings.taskTypes.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteType}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function colorDotStyle(color: TaskColor): string {
  const map: Record<TaskColor, string> = {
    blue: "#3b82f6", green: "#10b981", orange: "#f97316", red: "#ef4444",
    purple: "#a855f7", yellow: "#eab308", pink: "#ec4899", gray: "#6b7280",
  };
  return map[color] ?? "#6b7280";
}

function InlineTypeEditor({
  draft, onChange, onSave, onCancel,
}: {
  draft: { name: string; color: TaskColor };
  onChange: (v: { name: string; color: TaskColor }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 py-2 px-3 -mx-3 rounded bg-muted/30 border border-border/40">
      <Input
        autoFocus
        className="h-8 text-sm flex-1"
        placeholder={t("adminSettings.taskTypes.namePlaceholder")}
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
      />
      <Select value={draft.color} onValueChange={(v) => onChange({ ...draft, color: v as TaskColor })}>
        <SelectTrigger className="h-8 w-28 text-xs bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COLOR_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colorDotStyle(c) }} />
                {t(`adminSettings.taskTypes.colors.${c}`, { defaultValue: c })}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 px-3" onClick={onSave} disabled={!draft.name.trim()}>
        {t("adminSettings.taskTypes.saveCategory")}
      </Button>
      <Button variant="ghost" size="sm" className="h-8 px-3" onClick={onCancel}>
        {t("adminSettings.taskTypes.cancelEdit")}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Task Requirements
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIREMENT_KEYS: (keyof TaskRequirements)[] = [
  "dueDate", "photoProof", "notes", "priority", "assignedTo",
];

function TaskRequirementsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: t("adminSettings.taskRequirements.saved") });
      },
      onError: () => toast({ title: t("adminSettings.taskRequirements.error"), variant: "destructive" }),
    },
  });

  const [reqs, setReqs] = useState<TaskRequirements>({
    dueDate: false, photoProof: false, notes: false, priority: false, assignedTo: false,
  });

  useEffect(() => {
    if (settings?.taskRequirements) {
      setReqs(settings.taskRequirements as TaskRequirements);
    }
  }, [settings]);

  function toggle(key: keyof TaskRequirements) {
    const next = { ...reqs, [key]: !reqs[key] };
    setReqs(next);
    updateMut.mutate({ data: { taskRequirements: next } });
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6 space-y-4">
          {REQUIREMENT_KEYS.map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-1">
        <p className="text-sm font-semibold">{t("adminSettings.taskRequirements.title")}</p>
        <p className="text-xs text-muted-foreground">{t("adminSettings.taskRequirements.subtitle")}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-0">
        {REQUIREMENT_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
          >
            <Label htmlFor={`req-${key}`} className="cursor-pointer text-sm font-normal">
              {t(`adminSettings.taskRequirements.${key}`)}
            </Label>
            <Switch
              id={`req-${key}`}
              checked={reqs[key]}
              onCheckedChange={() => toggle(key)}
              disabled={updateMut.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Custom Fields (preserved from original)
// ═══════════════════════════════════════════════════════════════════════════════

const emptyForm = () => ({
  fieldLabel: "",
  fieldKey:   "",
  fieldType:  "text" as FieldType,
  options:    "",
  required:   false,
  active:     true,
});

function FieldRow({
  field, onEdit, onDelete,
}: {
  field: CustomField;
  onEdit: (f: CustomField) => void;
  onDelete: (f: CustomField) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="grid items-center gap-x-3 py-3 border-b border-border/40 last:border-0 px-3 -mx-3 hover:bg-muted/20 rounded"
      style={{ gridTemplateColumns: "1fr 7rem 5rem 4rem auto" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{field.fieldLabel}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{field.fieldKey}</p>
      </div>
      <div>
        <Badge variant="outline" className="text-[11px] font-normal">
          {t(`adminSettings.fieldTypes.${field.fieldType}`, { defaultValue: field.fieldType })}
        </Badge>
      </div>
      <div>
        {field.required
          ? <span className="text-xs text-orange-600 font-medium">{t("common.yes")}</span>
          : <span className="text-xs text-muted-foreground">{t("common.no")}</span>
        }
      </div>
      <div>
        {field.active
          ? <Badge className="text-[11px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">{t("adminSettings.active")}</Badge>
          : <Badge variant="outline" className="text-[11px] text-muted-foreground">{t("adminSettings.inactive")}</Badge>
        }
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(field)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(field)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function FieldDialog({
  open, editing, onClose, onSave, isSaving,
}: {
  open: boolean;
  editing: CustomField | null;
  onClose: () => void;
  onSave: (form: ReturnType<typeof emptyForm>) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm]       = useState(emptyForm());
  const [keyTouched, setKeyTouched] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        fieldLabel: editing.fieldLabel,
        fieldKey:   editing.fieldKey,
        fieldType:  editing.fieldType as FieldType,
        options:    (editing.options ?? []).join(", "),
        required:   editing.required,
        active:     editing.active,
      });
      setKeyTouched(true);
    } else {
      setForm(emptyForm());
      setKeyTouched(false);
    }
  }, [editing, open]);

  function handleLabelChange(v: string) {
    setForm((prev) => ({ ...prev, fieldLabel: v, fieldKey: keyTouched ? prev.fieldKey : toKey(v) }));
  }

  const isSelectType = form.fieldType === "select";
  const canSave = form.fieldLabel.trim().length > 0 && form.fieldKey.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("adminSettings.editField") : t("adminSettings.addField")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">{t("adminSettings.form.labelField")}</Label>
            <Input id="cf-label" placeholder={t("adminSettings.form.labelPlaceholder")}
              value={form.fieldLabel} onChange={(e) => handleLabelChange(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-key">{t("adminSettings.form.keyField")}</Label>
            <Input id="cf-key" placeholder={t("adminSettings.form.keyPlaceholder")}
              value={form.fieldKey} disabled={!!editing}
              onChange={(e) => { setKeyTouched(true); setForm((p) => ({ ...p, fieldKey: toKey(e.target.value) })); }} />
            <p className="text-[11px] text-muted-foreground">{t("adminSettings.form.keyHelp")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("adminSettings.form.typeField")}</Label>
            <Select value={form.fieldType} onValueChange={(v) => setForm((p) => ({ ...p, fieldType: v as FieldType }))}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>{t(`adminSettings.fieldTypes.${ft}`, { defaultValue: ft })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSelectType && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-options">{t("adminSettings.form.optionsField")}</Label>
              <Input id="cf-options" placeholder={t("adminSettings.form.optionsPlaceholder")}
                value={form.options} onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">{t("adminSettings.form.optionsHelp")}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch id="cf-required" checked={form.required}
              onCheckedChange={(v) => setForm((p) => ({ ...p, required: v }))} />
            <Label htmlFor="cf-required" className="cursor-pointer">{t("adminSettings.form.requiredField")}</Label>
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <Switch id="cf-active" checked={form.active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
              <Label htmlFor="cf-active" className="cursor-pointer">{t("adminSettings.form.activeField")}</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave || isSaving}>
            {isSaving ? "…" : t("adminSettings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomFieldsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab,  setActiveTab]  = useState<EntityTab>("asset");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState<CustomField | null>(null);
  const [deleting,   setDeleting]   = useState<CustomField | null>(null);

  const { data: fields, isLoading } = useListCustomFields({ entityType: activeTab });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCustomFieldsQueryKey({ entityType: activeTab }) });

  const createMut = useCreateCustomField({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: t("adminSettings.saved") }); },
    },
  });
  const updateMut = useUpdateCustomField({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: t("adminSettings.saved") }); },
    },
  });
  const deleteMut = useDeleteCustomField({
    mutation: {
      onSuccess: () => { invalidate(); setDeleting(null); toast({ title: t("adminSettings.deleted") }); },
    },
  });

  function openAdd() { setEditing(null); setDialogOpen(true); }
  function openEdit(f: CustomField) { setEditing(f); setDialogOpen(true); }

  function handleSave(form: ReturnType<typeof emptyForm>) {
    const optionsArr = form.options.trim()
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    if (editing) {
      const data: UpdateCustomFieldInput = {
        fieldLabel: form.fieldLabel,
        fieldType:  form.fieldType,
        options:    optionsArr ?? undefined,
        required:   form.required,
        active:     form.active,
      };
      updateMut.mutate({ id: editing.id, data });
    } else {
      const data: CreateCustomFieldInput = {
        entityType: activeTab,
        fieldKey:   form.fieldKey,
        fieldLabel: form.fieldLabel,
        fieldType:  form.fieldType,
        options:    optionsArr ?? undefined,
        required:   form.required,
        active:     true,
      };
      createMut.mutate({ data });
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;
  const sortedFields = (fields ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  return (
    <>
      {/* Entity sub-tab */}
      <div className="flex gap-2 mb-4">
        {(["asset", "task"] as EntityTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {tab === "asset" ? <SlidersHorizontal className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
            {t(`adminSettings.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{t(`adminSettings.tabs.${activeTab}`)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "…" : t("adminSettings.fieldCount", { count: sortedFields.length })}
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            {t("adminSettings.addField")}
          </Button>
        </CardHeader>

        <CardContent className="pt-0 px-6">
          {!isLoading && sortedFields.length > 0 && (
            <div
              className="grid text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-2 border-b border-border/30 px-3 -mx-3"
              style={{ gridTemplateColumns: "1fr 7rem 5rem 4rem auto" }}
            >
              <span>{t("adminSettings.table.label")}</span>
              <span>{t("adminSettings.table.type")}</span>
              <span>{t("adminSettings.table.required")}</span>
              <span>{t("adminSettings.table.status")}</span>
              <span />
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center py-2">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <div className="flex gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedFields.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
              <ToggleLeft className="h-10 w-10 opacity-25" />
              <p className="text-sm">{t("adminSettings.noFields")}</p>
              <Button variant="outline" size="sm" className="mt-1 gap-2" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5" />
                {t("adminSettings.addField")}
              </Button>
            </div>
          ) : (
            <div>
              {sortedFields.map((f) => (
                <FieldRow key={f.id} field={f} onEdit={openEdit} onDelete={setDeleting} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FieldDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminSettings.deleteField")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminSettings.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate({ id: deleting.id })}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Appearance / Branding Engine
// ═══════════════════════════════════════════════════════════════════════════════

const PRIMARY_SWATCHES  = ["#f59e0b","#3b82f6","#10b981","#ef4444","#8b5cf6","#f97316","#06b6d4","#ec4899"];
const SIDEBAR_SWATCHES  = ["#1e293b","#0f172a","#1e3a5f","#14532d","#3b0764","#1c1917","#f1f5f9","#ffffff"];

function AppearanceTab() {
  const { toast }                          = useToast();
  const { data }                           = useGetSettings();
  const { mutateAsync: saveSettings,
          isPending: saving }              = useUpdateSettings();
  const queryClient                        = useQueryClient();
  const fileRef                            = useRef<HTMLInputElement>(null);

  const [logoUrl,        setLogoUrl]        = useState("");
  const [primaryColor,   setPrimaryColor]   = useState("#f59e0b");
  const [secondaryColor, setSecondaryColor] = useState("#1e293b");
  const [companyName,    setCompanyName]    = useState("");
  const [logoText,       setLogoText]       = useState("");
  const [logoSub,        setLogoSub]        = useState("");
  const [dirty,          setDirty]          = useState(false);
  const [uploading,      setUploading]      = useState(false);

  React.useEffect(() => {
    if (!data) return;
    setLogoUrl(data.logoUrl ?? "");
    setPrimaryColor(data.primaryColor || "#f59e0b");
    setSecondaryColor(data.secondaryColor || "#1e293b");
    setCompanyName(data.companyName ?? "");
    setLogoText(data.logoText ?? "");
    setLogoSub(data.logoSub ?? "");
    setDirty(false);
  }, [data]);

  function changePrimary(hex: string) {
    setPrimaryColor(hex); setDirty(true);
    if (HEX_RE.test(hex)) applyPrimaryColor(hex);
  }

  function changeSidebar(hex: string) {
    setSecondaryColor(hex); setDirty(true);
    if (HEX_RE.test(hex)) applySidebarColor(hex);
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json() as { uploadURL: string; objectPath: string };
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setLogoUrl(`/api/storage/${objectPath}`);
      setDirty(true);
      toast({ title: "Logo uploaded", description: "Click Save to apply globally." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload logo image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    try {
      await saveSettings({
        data: {
          logoUrl:       logoUrl.trim(),
          primaryColor:  primaryColor.trim(),
          secondaryColor: secondaryColor.trim(),
          companyName:   companyName.trim(),
          logoText:      logoText.trim(),
          logoSub:       logoSub.trim(),
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      setDirty(false);
      toast({ title: "Appearance saved", description: "Branding applied to all pages." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  const previewPrimary = HEX_RE.test(primaryColor)  ? primaryColor  : "#f59e0b";
  const previewSidebar = HEX_RE.test(secondaryColor) ? secondaryColor : "#1e293b";

  return (
    <div className="space-y-8">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Company Logo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Replaces the text in the sidebar, header, and login page.
            Recommended: PNG or SVG with transparent background, min 200 × 60 px.
          </p>
        </div>

        <div className="flex items-start gap-6 flex-wrap">
          {/* Preview box */}
          <div
            className="w-52 h-20 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0"
            style={{ backgroundColor: previewSidebar + "22" }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-14 max-w-44 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className="text-muted-foreground text-xs">No logo uploaded</span>
            )}
          </div>

          {/* Upload / remove */}
          <div className="flex flex-col gap-2 pt-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-36">
              <Upload className="h-3.5 w-3.5 mr-2" />
              {uploading ? "Uploading…" : "Upload Logo"}
            </Button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => { setLogoUrl(""); setDirty(true); }}
                className="text-xs text-destructive hover:underline text-left"
              >
                Remove logo
              </button>
            )}
          </div>

          {/* Or paste URL */}
          <div className="flex-1 min-w-52 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Or paste an image URL</Label>
            <Input
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setDirty(true); }}
              placeholder="https://example.com/logo.png"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </section>

      {/* ── Colors ────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Color Scheme</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Changes apply instantly as you pick a color. Click <strong>Save</strong> to persist across all sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Primary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border shadow-sm"
                style={{ backgroundColor: previewPrimary }}
              />
              <span className="text-sm font-medium">Primary / Accent</span>
            </div>
            <p className="text-xs text-muted-foreground">Buttons, active nav items, ring focus, highlights.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => changePrimary(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border p-0.5 bg-background"
              />
              <Input
                value={primaryColor}
                onChange={(e) => changePrimary(e.target.value)}
                placeholder="#f59e0b"
                className="font-mono text-sm w-28"
                maxLength={7}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRIMARY_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => changePrimary(c)}
                  title={c}
                  className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: primaryColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                    borderColor: primaryColor === c ? "transparent" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Sidebar / secondary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border shadow-sm"
                style={{ backgroundColor: previewSidebar }}
              />
              <span className="text-sm font-medium">Sidebar Background</span>
            </div>
            <p className="text-xs text-muted-foreground">Background color of the navigation sidebar panel.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => changeSidebar(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border p-0.5 bg-background"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => changeSidebar(e.target.value)}
                placeholder="#1e293b"
                className="font-mono text-sm w-28"
                maxLength={7}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SIDEBAR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => changeSidebar(c)}
                  title={c}
                  className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: secondaryColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                    borderColor: secondaryColor === c ? "transparent" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live mini-preview */}
        <div className="rounded-lg border overflow-hidden" style={{ maxWidth: 340 }}>
          <p className="text-xs text-muted-foreground px-3 pt-2 pb-1 font-medium">Live Preview</p>
          <div className="flex h-24 overflow-hidden rounded-b-lg">
            {/* Sidebar strip */}
            <div
              className="w-28 flex flex-col px-2 py-2 gap-1"
              style={{ backgroundColor: previewSidebar }}
            >
              <div
                className="rounded px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: previewPrimary, color: "#fff" }}
              >
                {logoText || companyName || "Company"}
              </div>
              {["Dashboard","Bookings","Rooms"].map((l) => (
                <div key={l} className="text-xs px-2 py-0.5 rounded opacity-70" style={{ color: "#e2e8f0" }}>{l}</div>
              ))}
            </div>
            {/* Content area */}
            <div className="flex-1 bg-background p-2 flex flex-col gap-1.5">
              <div className="h-4 rounded bg-muted w-3/4" />
              <div className="h-6 rounded w-20" style={{ backgroundColor: previewPrimary }} />
              <div className="h-3 rounded bg-muted w-1/2 mt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Company identity ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Company Identity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown in the sidebar, PDF report headers, and the login page.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ap-company">Company Name</Label>
            <Input
              id="ap-company"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setDirty(true); }}
              placeholder="ركز للحلول الذكية"
            />
            <p className="text-xs text-muted-foreground">Used in PDF report headers and the login screen.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-logotext">Logo Text (short serif name)</Label>
            <Input
              id="ap-logotext"
              value={logoText}
              onChange={(e) => { setLogoText(e.target.value); setDirty(true); }}
              placeholder="Grand"
              className="font-serif"
            />
            <p className="text-xs text-muted-foreground">Displayed in sidebar when no image logo is set.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-logosub">Logo Subtitle</Label>
            <Input
              id="ap-logosub"
              value={logoSub}
              onChange={(e) => { setLogoSub(e.target.value); setDirty(true); }}
              placeholder="PMS"
            />
            <p className="text-xs text-muted-foreground">Smaller text next to the logo text in the sidebar.</p>
          </div>
        </div>
      </section>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t pt-4 pb-2">
        <p className="text-sm text-muted-foreground">{dirty ? "You have unsaved changes" : "All changes saved"}</p>
        <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-40">
          {saving ? "Saving…" : "Save Appearance"}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Role Permissions (Owner-level matrix)
// ═══════════════════════════════════════════════════════════════════════════════

function PermissionsTab() {
  const { toast } = useToast();
  const { data } = useGetSettings();
  const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();

  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_PERM);
  const [dirty, setDirty] = useState(false);

  React.useEffect(() => {
    if (!data) return;
    setMatrix((data.permissionMatrix as PermissionMatrix | undefined) ?? DEFAULT_PERM);
    setDirty(false);
  }, [data]);

  function toggle(roleId: string, href: string) {
    setMatrix((prev) => {
      const cur = prev[roleId] ?? [];
      const next = cur.includes(href) ? cur.filter((h) => h !== href) : [...cur, href];
      return { ...prev, [roleId]: next };
    });
    setDirty(true);
  }

  function toggleAll(roleId: string) {
    const all = OWNER_PERMISSION_ROUTES.map((r) => r.href);
    const cur = matrix[roleId] ?? [];
    setMatrix((prev) => ({ ...prev, [roleId]: cur.length === all.length ? ["/"] : all }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await saveSettings({ data: { permissionMatrix: matrix } });
      setDirty(false);
      toast({ title: "Permissions saved", description: "Role access matrix updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Company-Level Access Control</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define which pages each staff role can access. <strong>Manager</strong> and above: full access by default.
              Click a role header to toggle all pages at once. Changes take effect immediately after saving.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left font-medium py-3 px-4 min-w-36 text-muted-foreground">Page</th>
              {/* Company column — always full access, locked */}
              <th className="text-center py-3 px-2 min-w-24">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 cursor-default" title="Always full access — cannot be restricted">
                  <Lock className="h-2.5 w-2.5" />Company
                </span>
              </th>
              {OWNER_CONFIGURABLE_ROLES.map((r) => {
                const cur = matrix[r.id] ?? [];
                const all = cur.length === OWNER_PERMISSION_ROUTES.length;
                return (
                  <th key={r.id} className="text-center py-3 px-2 min-w-24">
                    <button
                      type="button"
                      onClick={() => toggleAll(r.id)}
                      title={all ? "Revoke all" : "Grant all"}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-70 ${r.color}`}
                    >
                      {r.label}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {OWNER_PERMISSION_ROUTES.map((page) => (
              <tr key={page.href} className="border-t hover:bg-muted/20">
                <td className="py-2.5 px-4 font-medium text-sm">{page.label}</td>
                {/* Company always has access — locked checkbox */}
                <td className="text-center py-2.5 px-2">
                  <input type="checkbox" checked readOnly disabled className="h-4 w-4 opacity-50 cursor-not-allowed" title="Company always has full access" />
                </td>
                {OWNER_CONFIGURABLE_ROLES.map((r) => {
                  const allowed = (matrix[r.id] ?? []).includes(page.href);
                  return (
                    <td key={r.id} className="text-center py-2.5 px-2">
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => toggle(r.id, page.href)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => { setMatrix(DEFAULT_PERM); setDirty(true); }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Reset to defaults
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{dirty ? "Unsaved changes" : "Saved"}</p>
          <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-36">
            {saving ? "Saving…" : "Save Permissions"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════

function AdminSettingsInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MainTab>("systemInfo");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
          {t("adminSettings.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("adminSettings.subtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TAB_META.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {icon}
            {label ?? t(`adminSettings.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Active section */}
      {activeTab === "systemInfo"       && <SystemInfoTab />}
      {activeTab === "taskTypes"        && <TaskTypesTab />}
      {activeTab === "taskRequirements" && <TaskRequirementsTab />}
      {activeTab === "customFields"     && <CustomFieldsTab />}
      {activeTab === "permissions"      && <PermissionsTab />}
      {activeTab === "appearance"       && <AppearanceTab />}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { lang } = useLanguage();
  return <AdminSettingsInner key={lang} />;
}
