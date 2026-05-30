import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  getListCustomFieldsQueryKey,
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
import { Plus, Pencil, Trash2, SlidersHorizontal, Tag, ToggleLeft } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type EntityTab = "asset" | "task";
type FieldType = "text" | "number" | "select" | "date" | "boolean";

const FIELD_TYPES: FieldType[] = ["text", "number", "select", "date", "boolean"];

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = () => ({
  fieldLabel:  "",
  fieldKey:    "",
  fieldType:   "text" as FieldType,
  options:     "",
  required:    false,
  active:      true,
});

// ─── Derive a field key from a label (auto-slugify) ──────────────────────────

function toKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ─── Field row ────────────────────────────────────────────────────────────────

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
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(field)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

function FieldDialog({
  open,
  editing,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  editing: CustomField | null;
  onClose: () => void;
  onSave: (form: ReturnType<typeof emptyForm>) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm());
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
    setForm((prev) => ({
      ...prev,
      fieldLabel: v,
      fieldKey: keyTouched ? prev.fieldKey : toKey(v),
    }));
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
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">{t("adminSettings.form.labelField")}</Label>
            <Input
              id="cf-label"
              placeholder={t("adminSettings.form.labelPlaceholder")}
              value={form.fieldLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          {/* Key */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-key">{t("adminSettings.form.keyField")}</Label>
            <Input
              id="cf-key"
              placeholder={t("adminSettings.form.keyPlaceholder")}
              value={form.fieldKey}
              disabled={!!editing}
              onChange={(e) => {
                setKeyTouched(true);
                setForm((prev) => ({ ...prev, fieldKey: toKey(e.target.value) }));
              }}
            />
            <p className="text-[11px] text-muted-foreground">{t("adminSettings.form.keyHelp")}</p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>{t("adminSettings.form.typeField")}</Label>
            <Select
              value={form.fieldType}
              onValueChange={(v) => setForm((prev) => ({ ...prev, fieldType: v as FieldType }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>
                    {t(`adminSettings.fieldTypes.${ft}`, { defaultValue: ft })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options (select only) */}
          {isSelectType && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-options">{t("adminSettings.form.optionsField")}</Label>
              <Input
                id="cf-options"
                placeholder={t("adminSettings.form.optionsPlaceholder")}
                value={form.options}
                onChange={(e) => setForm((prev) => ({ ...prev, options: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">{t("adminSettings.form.optionsHelp")}</p>
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="cf-required"
              checked={form.required}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, required: v }))}
            />
            <Label htmlFor="cf-required" className="cursor-pointer">{t("adminSettings.form.requiredField")}</Label>
          </div>

          {/* Active toggle (edit only) */}
          {editing && (
            <div className="flex items-center gap-3">
              <Switch
                id="cf-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, active: v }))}
              />
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

// ─── Inner page ───────────────────────────────────────────────────────────────

function AdminSettingsInner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab,   setActiveTab]   = useState<EntityTab>("asset");
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editing,     setEditing]     = useState<CustomField | null>(null);
  const [deleting,    setDeleting]    = useState<CustomField | null>(null);

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
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            {t("adminSettings.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("adminSettings.subtitle")}</p>
        </div>
        <Button className="shrink-0 gap-2 self-start" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {t("adminSettings.addField")}
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["asset", "task"] as EntityTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              activeTab === tab
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {tab === "asset" ? <SlidersHorizontal className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            {t(`adminSettings.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Fields card */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {t(`adminSettings.tabs.${activeTab}`)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "…" : t("adminSettings.fieldCount", { count: sortedFields.length })}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-6">
          {/* Column headers */}
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

      {/* Add / Edit dialog */}
      <FieldDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete confirmation */}
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

    </div>
  );
}

// ─── Public export — keyed on language for stable RTL/LTR transitions ─────────

export default function AdminSettingsPage() {
  const { lang } = useLanguage();
  return <AdminSettingsInner key={lang} />;
}
