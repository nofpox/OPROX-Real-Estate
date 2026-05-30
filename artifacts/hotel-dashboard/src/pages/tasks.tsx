import React, { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  useListTasks, getListTasksQueryKey, useCreateTask, useUpdateTask, useDeleteTask,
  useListStaff, useListProperties, useListRooms,
  useListTaskComments, useCreateTaskComment,
  useSubmitTaskReport, useRejectTaskReport, useEscalateTaskReport, useApproveTaskReport,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus, Trash2, CheckCheck, Clock, AlertCircle, CheckCircle2,
  Building2, Image as ImageIcon, Send, X, Zap, Droplets, Wind, Sparkles, ClipboardList,
  Camera, Upload, ExternalLink, ShieldCheck, BadgeCheck, FileText, Download, Loader2,
  FileCheck, ArrowUpCircle, XCircle, ThumbsUp, RotateCcw,
  QrCode, Copy, Printer,
} from "lucide-react";
import { generateTaskReport } from "@/lib/pdf-report";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/role-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_VALUES = [
  { value: "electrical", icon: Zap,          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "plumbing",   icon: Droplets,     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "hvac",       icon: Wind,         color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "cleaning",   icon: Sparkles,     color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "general",    icon: ClipboardList, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
] as const;

const PRIORITY_VALUES = [
  { value: "low",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { value: "medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "high",   color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "urgent", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
] as const;

const STATUS_KEYS = [
  { key: "pending",     colKey: "pending",    dot: "bg-slate-400"   },
  { key: "in-progress", colKey: "inProgress", dot: "bg-amber-500"   },
  { key: "completed",   colKey: "completed",  dot: "bg-emerald-500" },
  { key: "verified",    colKey: "verified",   dot: "bg-violet-500"  },
] as const;

// ── Schemas ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title:        z.string().min(1),
  category:     z.enum(["electrical", "plumbing", "hvac", "cleaning", "general"]),
  priority:     z.enum(["low", "medium", "high", "urgent"]),
  propertyId:   z.coerce.number().optional().or(z.literal("")),
  unitId:       z.coerce.number().optional().or(z.literal("")),
  supervisorId: z.coerce.number().optional().or(z.literal("")),
  assignedToId: z.coerce.number().optional().or(z.literal("")),
  dueDate:      z.string().optional().or(z.literal("")),
  description:  z.string().optional().or(z.literal("")),
  status:       z.enum(["pending", "in-progress", "completed", "verified"]).default("pending"),
});

const commentSchema = z.object({
  authorName: z.string().min(1),
  body:       z.string().min(1),
});

// ── Helper fns ────────────────────────────────────────────────────────────────

function getCategoryMeta(value: string) {
  return CATEGORY_VALUES.find((c) => c.value === value) ?? CATEGORY_VALUES[4];
}
function getPriorityMeta(value: string) {
  return PRIORITY_VALUES.find((p) => p.value === value) ?? PRIORITY_VALUES[1];
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(str: string | null | undefined) {
  if (!str) return null;
  return new Date(str + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(dueDate: string | null | undefined, status: string) {
  if (!dueDate || status === "completed" || status === "verified") return false;
  return dueDate < new Date().toISOString().split("T")[0];
}
function photoSrc(objectPath: string): string {
  return `/api/storage${objectPath}`;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadPhoto(file: File): Promise<string> {
  const metaRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await metaRes.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");
  return objectPath as string;
}

// ── Badges ────────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const { t } = useTranslation();
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  return (
    <Badge className={`gap-1 border-0 text-xs font-medium ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {t(`tasks.category.${category}`, { defaultValue: category })}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const meta = getPriorityMeta(priority);
  return (
    <Badge className={`border-0 text-xs ${meta.color}`}>
      {t(`priority.${priority}`, { defaultValue: priority })}
    </Badge>
  );
}

// ── Report Status ─────────────────────────────────────────────────────────────

const REPORT_STATUS_META: Record<string, { label: string; cls: string; dotCls: string }> = {
  none:      { label: "—",                    cls: "",                                                                         dotCls: ""                  },
  submitted: { label: "Submitted",            cls: "text-blue-600 dark:text-blue-400",                                         dotCls: "bg-blue-500"       },
  rejected:  { label: "Rejected",             cls: "text-red-600 dark:text-red-400",                                           dotCls: "bg-red-500"        },
  escalated: { label: "Reviewed by Supervisor", cls: "text-amber-600 dark:text-amber-400",                                     dotCls: "bg-amber-500"      },
  approved:  { label: "Approved by Manager ✓", cls: "text-emerald-600 dark:text-emerald-400 font-semibold",                   dotCls: "bg-emerald-500"    },
};

function ReportStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "none";
  if (s === "none") return null;
  const meta = REPORT_STATUS_META[s] ?? REPORT_STATUS_META.none;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dotCls}`} />
      {meta.label}
    </span>
  );
}

// ── Photo Upload Dialog ────────────────────────────────────────────────────────
// Shared between Before-photo (start) and After-photo (complete) flows.

interface PhotoUploadDialogProps {
  task: any | null;
  mode: "before" | "after";
  open: boolean;
  onClose: () => void;
  onUpload: (taskId: number, photoUrl: string) => void;
  onSkip: (taskId: number) => void;
  isSubmitting: boolean;
}

function PhotoUploadDialog({ task, mode, open, onClose, onUpload, onSkip, isSubmitting }: PhotoUploadDialogProps) {
  const { t } = useTranslation();
  const fileRef  = useRef<HTMLInputElement>(null);
  const [file,      setFile]      = useState<File | null>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const { toast } = useToast();

  const isBefore = mode === "before";
  const title     = isBefore ? "Before Photo — Start Task"    : "After Photo — Complete Task";
  const subtitle  = isBefore
    ? "Upload a photo capturing the current state before starting work."
    : "Upload a photo proving the work has been completed.";
  const actionLabel = isBefore ? "Upload & Start" : "Upload & Complete";

  function reset() {
    setFile(null); setPreview(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (f.size > 10 * 1024 * 1024)   { setError("Image must be smaller than 10 MB"); return; }
    setFile(f); setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!file || !task) return;
    setUploading(true); setError(null);
    try {
      const objectPath = await uploadPhoto(file);
      onUpload(task.id, objectPath);
      reset();
    } catch {
      setError("Upload failed. Please try again.");
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function handleClose() { reset(); onClose(); }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className={`h-5 w-5 ${isBefore ? "text-amber-500" : "text-emerald-500"}`} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-sm font-medium truncate">{task.title}</p>

          <div
            className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer
              ${preview
                ? isBefore ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
              }
              ${preview ? "min-h-48" : "min-h-36"}
            `}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <>
                <img src={preview} alt="Photo preview" className="max-h-52 rounded-lg object-contain" />
                <button
                  type="button"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Click to select a photo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, HEIC up to 10 MB</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFileChange}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground"
            onClick={() => { reset(); onSkip(task.id); }}
            disabled={uploading || isSubmitting}
          >
            Skip (Admin only)
          </Button>
          <div className="flex gap-2 flex-1 justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={uploading || isSubmitting}>
              {t("tasks.cancel")}
            </Button>
            <Button type="button" onClick={handleSubmit}
              disabled={!file || uploading || isSubmitting}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : actionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Photo thumbnail (reusable) ─────────────────────────────────────────────────

function PhotoThumb({ label, url, icon: Icon, iconClass }: { label: string; url: string; icon: any; iconClass: string }) {
  return (
    <div>
      <p className={`text-xs text-muted-foreground mb-2 flex items-center gap-1`}>
        <Icon className={`h-3 w-3 ${iconClass}`} />
        {label}
      </p>
      <a href={photoSrc(url)} target="_blank" rel="noopener noreferrer" className="block group">
        <img
          src={photoSrc(url)}
          alt={label}
          className="rounded-lg border max-h-44 object-cover group-hover:opacity-90 transition-opacity"
        />
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> View full size
        </p>
      </a>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: any;
  onSelect:        (task: any) => void;
  onDelete:        (id: number, title: string) => void;
  onStatus:        (id: number, status: string) => void;
  onVerify:        (id: number) => void;
  canVerify:       boolean;
  onSubmitReport:  (id: number) => void;
  onRejectReport:  (id: number) => void;
  onEscalateReport:(id: number) => void;
  onApproveReport: (id: number) => void;
  canReviewReport: boolean;
  canApproveReport:boolean;
  onShowQr:        (task: any) => void;
}

function TaskCard({
  task, onSelect, onDelete, onStatus, onVerify, canVerify,
  onSubmitReport, onRejectReport, onEscalateReport, onApproveReport,
  canReviewReport, canApproveReport, onShowQr,
}: TaskCardProps) {
  const { t } = useTranslation();
  const overdue  = isOverdue(task.dueDate, task.status);
  const verified = task.status === "verified";
  const rs       = task.reportStatus ?? "none";

  return (
    <div
      className={`bg-card border rounded-lg p-4 shadow-none cursor-pointer space-y-3
        ${verified ? "border-violet-200 dark:border-violet-900/40" : "border-border"}
      `}
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug flex-1">{task.title}</p>
        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            title="QR Code"
            onClick={() => onShowQr(task)}
          >
            <QrCode className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task.id, task.title)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <CategoryBadge category={task.category} />
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Photo indicators */}
      {(task.beforePhotoUrl || task.afterPhotoUrl) && (
        <div className="flex gap-2 flex-wrap">
          {task.beforePhotoUrl && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              <Camera className="h-3 w-3" /> Before ✓
            </span>
          )}
          {task.afterPhotoUrl && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3 w-3" /> After ✓
            </span>
          )}
        </div>
      )}

      {/* Verified badge */}
      {verified && (
        <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
          {t("tasks.actions.verified", { defaultValue: "Verified" })}
        </div>
      )}

      {/* Report escalation status */}
      <ReportStatusBadge status={rs} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {task.assigneeName ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-semibold">
                  {getInitials(task.assigneeName)}
                </AvatarFallback>
              </Avatar>
              <span>{task.assigneeName.split(" ")[0]}</span>
            </>
          ) : (
            <span className="italic opacity-60">{t("tasks.unassigned")}</span>
          )}
        </div>
        {task.dueDate && (
          <span className={overdue ? "text-red-500 font-medium" : ""}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.propertyName && (
        <p className="text-xs text-muted-foreground/60 truncate flex items-center gap-1">
          <Building2 className="h-3 w-3 shrink-0" />
          {task.propertyName}{task.unitName ? ` · ${task.unitName}` : ""}
        </p>
      )}

      {!verified && (
        <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {task.status === "pending" && (
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
              onClick={() => onStatus(task.id, "in-progress")}>
              <Clock className="me-1 h-3 w-3" />{t("tasks.actions.start")}
            </Button>
          )}
          {task.status === "in-progress" && (
            <Button size="sm" variant="outline"
              className="h-7 text-xs flex-1 text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
              onClick={() => onStatus(task.id, "completed")}>
              <CheckCheck className="me-1 h-3 w-3" />{t("tasks.actions.done")}
            </Button>
          )}
          {task.status === "completed" && canVerify && (
            <Button size="sm" variant="outline"
              className="h-7 text-xs flex-1 text-violet-700 hover:text-violet-700 border-violet-200 hover:border-violet-300 dark:text-violet-400 dark:border-violet-800"
              onClick={() => onVerify(task.id)}>
              <BadgeCheck className="me-1 h-3 w-3" />
              {t("tasks.actions.verify", { defaultValue: "Verify" })}
            </Button>
          )}
        </div>
      )}

      {/* Report escalation actions */}
      {(task.status === "completed" || task.status === "verified") && (
        <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {(rs === "none" || rs === "rejected") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline"
                  className={`h-7 text-xs flex-1 ${rs === "rejected" ? "text-amber-700 hover:text-amber-700 border-amber-200 hover:border-amber-300" : ""}`}
                  onClick={() => onSubmitReport(task.id)}>
                  {rs === "rejected"
                    ? <><RotateCcw className="me-1 h-3 w-3" />{t("tasks.actions.resubmit", { defaultValue: "Resubmit" })}</>
                    : <><FileCheck className="me-1 h-3 w-3" />{t("tasks.actions.submitReport", { defaultValue: "Submit Report" })}</>
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center text-xs leading-snug">
                {t("tasks.hints.submitReport")}
              </TooltipContent>
            </Tooltip>
          )}
          {rs === "submitted" && canReviewReport && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs flex-1 text-emerald-700 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300 dark:text-emerald-400 dark:border-emerald-800"
                    onClick={() => onEscalateReport(task.id)}>
                    <ArrowUpCircle className="me-1 h-3 w-3" />{t("tasks.actions.escalate", { defaultValue: "Review & Escalate" })}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-center text-xs leading-snug">
                  {t("tasks.hints.escalate")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs flex-1 text-red-700 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400 dark:border-red-800"
                    onClick={() => onRejectReport(task.id)}>
                    <XCircle className="me-1 h-3 w-3" />{t("tasks.actions.reject", { defaultValue: "Reject" })}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-center text-xs leading-snug">
                  {t("tasks.hints.reject")}
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {rs === "escalated" && canApproveReport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline"
                  className="h-7 text-xs flex-1 text-emerald-700 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300 dark:text-emerald-400 dark:border-emerald-800"
                  onClick={() => onApproveReport(task.id)}>
                  <ThumbsUp className="me-1 h-3 w-3" />{t("tasks.actions.approve", { defaultValue: "Approve Report" })}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center text-xs leading-snug">
                {t("tasks.hints.approve")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  canVerify: boolean;
  onMarkStart?: () => void;
  onMarkComplete?: () => void;
}

function TaskDetailSheet({ task, open, onClose, canVerify, onMarkStart, onMarkComplete }: TaskDetailSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const updateTask  = useUpdateTask();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const { data: comments, isLoading: commentsLoading } = useListTaskComments(
    task?.id ?? 0,
    { query: { enabled: !!task?.id } } as any
  );
  const createComment = useCreateTaskComment();
  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { authorName: "", body: "" },
  });

  function handleStatusChange(newStatus: string) {
    if (!task) return;
    if (newStatus === "in-progress" && task.status === "pending" && onMarkStart) {
      onMarkStart(); return;
    }
    if (newStatus === "completed" && task.status === "in-progress" && onMarkComplete) {
      onMarkComplete(); return;
    }
    updateTask.mutate({ id: task.id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        toast({ title: t("tasks.toast.statusUpdated") });
      },
      onError: (err: any) => {
        const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
        toast({ title: msg, variant: "destructive" });
      },
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function submitComment(data: z.infer<typeof commentSchema>) {
    if (!task) return;
    createComment.mutate(
      { id: task.id, data: { taskId: task.id, authorName: data.authorName, body: data.body, ...(pendingImage ? { imageUrl: pendingImage } : {}) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/tasks/${task.id}/comments`] });
          commentForm.reset();
          setPendingImage(null);
          if (fileRef.current) fileRef.current.value = "";
          toast({ title: t("tasks.toast.commentAdded") });
        },
        onError: () => toast({ title: t("tasks.toast.commentFailed"), variant: "destructive" }),
      }
    );
  }

  if (!task) return null;
  const overdue  = isOverdue(task.dueDate, task.status);
  const verified = task.status === "verified";

  // Build accessible status buttons
  const statusButtons = STATUS_KEYS.map((col) => {
    const isCurrent = task.status === col.key;
    let disabled = isCurrent || updateTask.isPending;
    // "verified" button only for managers/owners and only when task is completed
    if (col.key === "verified") {
      disabled = disabled || !canVerify || task.status !== "completed";
    }
    return { ...col, isCurrent, disabled };
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto flex flex-col gap-0 p-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t("tasks.detail.taskLabel", { id: task.id })}
              </p>
              <SheetTitle className="text-base font-semibold leading-snug">{task.title}</SheetTitle>
            </div>
          </div>
          {/* QR Code row */}
          <div className="flex items-center gap-2 mt-2">
            <div className="rounded-lg border bg-white p-1.5 shadow-sm shrink-0">
              <QRCodeCanvas value={taskQrUrl(task.id)} size={48} level="M" marginSize={0} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Scan to open task</p>
              <p className="text-[10px] text-muted-foreground truncate">{taskQrUrl(task.id)}</p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
              title="Full QR Code"
              onClick={() => (document.dispatchEvent(new CustomEvent("show-task-qr", { detail: task })))}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Status buttons row */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {statusButtons.map((col) => (
              <Button
                key={col.key}
                size="sm"
                variant={col.isCurrent ? "default" : "outline"}
                className={`h-7 text-xs flex-1 min-w-0 ${
                  col.key === "verified" && !col.isCurrent
                    ? "border-violet-200 text-violet-700 hover:border-violet-300 hover:text-violet-700 dark:border-violet-800 dark:text-violet-400"
                    : ""
                } ${col.key === "verified" && col.isCurrent ? "bg-violet-600 hover:bg-violet-700 border-violet-600" : ""}`}
                onClick={() => handleStatusChange(col.key)}
                disabled={col.disabled}
              >
                {col.isCurrent && <span className={`h-1.5 w-1.5 rounded-full mr-1.5 bg-current`} />}
                {col.key === "verified"
                  ? <BadgeCheck className="h-3 w-3 mr-1" />
                  : null
                }
                {t(`tasks.columns.${col.colKey}`, { defaultValue: col.colKey })}
              </Button>
            ))}
          </div>
        </SheetHeader>

        {/* Details */}
        <div className="px-6 py-4 space-y-4 border-b">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.category")}</p>
              <CategoryBadge category={task.category} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.priority")}</p>
              <PriorityBadge priority={task.priority} />
            </div>
            {task.propertyName && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.asset")}</p>
                <p className="text-sm font-medium">{task.propertyName}{task.unitName ? ` — ${task.unitName}` : ""}</p>
              </div>
            )}
            {task.assigneeName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.assignedTo")}</p>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-semibold">
                      {getInitials(task.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm">{task.assigneeName}</p>
                </div>
              </div>
            )}
            {task.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.dueDate")}</p>
                <p className={`text-sm font-medium ${overdue ? "text-red-500" : ""}`}>
                  {formatDate(task.dueDate)}{overdue ? ` · ${t("tasks.detail.overdue")}` : ""}
                </p>
              </div>
            )}
            {task.startedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Started</p>
                <p className="text-sm">{new Date(task.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            )}
            {task.verifiedAt && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3 text-violet-500" />
                  {t("tasks.actions.verified", { defaultValue: "Verified" })}
                </p>
                <p className="text-sm font-medium text-violet-700 dark:text-violet-400">
                  {new Date(task.verifiedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>

          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.description")}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Before photo */}
          {task.beforePhotoUrl && (
            <PhotoThumb
              label={t("tasks.detail.beforePhoto", { defaultValue: "Before Photo" })}
              url={task.beforePhotoUrl}
              icon={Camera}
              iconClass="text-amber-500"
            />
          )}

          {/* After photo */}
          {task.afterPhotoUrl && (
            <PhotoThumb
              label={t("tasks.detail.afterPhoto", { defaultValue: "After Photo" })}
              url={task.afterPhotoUrl}
              icon={ShieldCheck}
              iconClass="text-emerald-500"
            />
          )}

          {/* Legacy proof photo (backwards compat) */}
          {!task.afterPhotoUrl && task.proofPhotoUrl && (
            <PhotoThumb
              label="Proof of Work"
              url={task.proofPhotoUrl}
              icon={ShieldCheck}
              iconClass="text-emerald-500"
            />
          )}
        </div>

        {/* Report Escalation Trail */}
        {task.reportStatus && task.reportStatus !== "none" && (
          <div className="px-6 py-4 space-y-3 border-b">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Report Escalation
            </p>
            <ol className="relative border-s border-muted ms-2 space-y-4">
              {/* Step 1: Submitted */}
              <li className="ms-4">
                <span className={`absolute -start-1.5 mt-0.5 h-3 w-3 rounded-full border-2 border-background ${task.submittedAt ? "bg-blue-500" : "bg-muted"}`} />
                <p className={`text-xs font-semibold ${task.submittedAt ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                  Submitted
                </p>
                {task.submittedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(task.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </li>
              {/* Step 2: Supervisor review */}
              <li className="ms-4">
                <span className={`absolute -start-1.5 mt-0.5 h-3 w-3 rounded-full border-2 border-background ${task.reportStatus === "rejected" ? "bg-red-500" : task.escalatedAt ? "bg-amber-500" : "bg-muted"}`} />
                <p className={`text-xs font-semibold ${task.reportStatus === "rejected" ? "text-red-600 dark:text-red-400" : task.escalatedAt ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {task.reportStatus === "rejected" ? "Rejected by Supervisor" : "Reviewed by Supervisor"}
                </p>
                {(task.rejectedAt || task.escalatedAt) && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(task.rejectedAt ?? task.escalatedAt!).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {task.rejectionNotes && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1 mt-1">
                    {task.rejectionNotes}
                  </p>
                )}
              </li>
              {/* Step 3: Manager approval */}
              {task.reportStatus !== "rejected" && (
                <li className="ms-4">
                  <span className={`absolute -start-1.5 mt-0.5 h-3 w-3 rounded-full border-2 border-background ${task.approvedAt ? "bg-emerald-500" : "bg-muted"}`} />
                  <p className={`text-xs font-semibold ${task.approvedAt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    Approved by Manager
                  </p>
                  {task.approvedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(task.approvedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {!task.approvedAt && task.escalatedAt && (
                    <p className="text-[10px] text-muted-foreground italic">Awaiting manager approval</p>
                  )}
                </li>
              )}
            </ol>
          </div>
        )}

        {/* Comments */}
        <div className="flex-1 px-6 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t("tasks.detail.comments")} {comments?.length ? `(${comments.length})` : ""}
          </p>
          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : comments?.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              {t("tasks.detail.noComments")}
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {(comments ?? []).map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-semibold">
                      {getInitials(c.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <p className="text-xs font-semibold">{c.authorName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{c.body}</p>
                    {c.imageUrl && (
                      <img src={c.imageUrl} alt="Attachment" className="mt-2 rounded-md border max-h-48 object-cover" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add comment form */}
        <div className="px-6 pb-6 pt-3 border-t bg-background">
          <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit(submitComment)} className="space-y-2">
              <FormField control={commentForm.control} name="authorName" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder={t("tasks.detail.yourName")} className="h-8 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={commentForm.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder={t("tasks.detail.addComment")} className="resize-none h-16 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {pendingImage && (
                <div className="relative inline-block">
                  <img src={pendingImage} alt="Preview" className="h-20 rounded-md border object-cover" />
                  <button type="button"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border flex items-center justify-center"
                    onClick={() => { setPendingImage(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 px-2"
                  onClick={() => fileRef.current?.click()} title="Attach image">
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <Button type="submit" size="sm" className="h-8 flex-1" disabled={createComment.isPending}>
                  <Send className="me-1 h-3.5 w-3.5" />
                  {createComment.isPending ? t("tasks.detail.posting") : t("tasks.detail.postComment")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── QR Code helpers ───────────────────────────────────────────────────────────

function taskQrUrl(taskId: number): string {
  return `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}?taskId=${taskId}`;
}

// ── QR Code Modal ─────────────────────────────────────────────────────────────

function QrCodeModal({ task, open, onClose }: { task: any | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const url        = task ? taskQrUrl(task.id) : "";

  function handleCopy() {
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Link copied to clipboard." }),
      () => toast({ title: "Could not copy link.", variant: "destructive" }),
    );
  }

  function handleDownload() {
    // qrcode.react renders to the canvas with id qr-canvas-modal
    const canvas = document.getElementById("qr-canvas-modal") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `task-${task?.id ?? "qr"}.png`;
    a.click();
  }

  function handlePrint() {
    const canvas = document.getElementById("qr-canvas-modal") as HTMLCanvasElement | null;
    if (!canvas) return;
    const img   = canvas.toDataURL("image/png");
    const win   = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Task QR — ${task?.id}</title>
      <style>
        body { margin:0; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; padding:32px; gap:16px; }
        img  { width:240px; height:240px; }
        h2   { margin:0; font-size:18px; text-align:center; }
        p    { margin:0; font-size:12px; color:#6b7280; word-break:break-all; text-align:center; max-width:260px; }
        small{ font-size:11px; color:#9ca3af; }
        @media print { button { display:none; } }
      </style></head><body>
      <img src="${img}" />
      <h2>${task?.title ?? ""}</h2>
      <p>${url}</p>
      <small>Task #${task?.id} · ${task?.propertyName ?? ""}</small>
      <button onclick="window.print()" style="margin-top:16px;padding:8px 20px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:13px">Print</button>
      </body></html>
    `);
    win.document.close();
  }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Task QR Code
          </DialogTitle>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl border-2 border-border bg-white p-4 shadow-sm">
            <QRCodeCanvas
              id="qr-canvas-modal"
              value={url}
              size={192}
              level="M"
              marginSize={1}
              imageSettings={{
                src: "",
                excavate: false,
                height: 0,
                width: 0,
              }}
            />
          </div>

          {/* Task info */}
          <div className="text-center space-y-0.5">
            <p className="text-sm font-semibold text-foreground leading-tight">{task.title}</p>
            {task.propertyName && (
              <p className="text-xs text-muted-foreground">{task.propertyName}</p>
            )}
            <p className="text-xs text-muted-foreground">Task #{task.id}</p>
          </div>

          {/* URL preview */}
          <p className="text-[10px] text-muted-foreground text-center break-all px-2 leading-tight">
            {url}
          </p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
            <Copy className="me-1.5 h-3.5 w-3.5" />Copy Link
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
            <Download className="me-1.5 h-3.5 w-3.5" />Save PNG
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handlePrint}>
            <Printer className="me-1.5 h-3.5 w-3.5" />Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Report Dialog ──────────────────────────────────────────────────────

function RejectReportDialog({
  taskId, open, onClose, onConfirm, isPending,
}: {
  taskId:    number | null;
  open:      boolean;
  onClose:   () => void;
  onConfirm: (id: number, notes: string) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState("");

  function handleClose() { setNotes(""); onClose(); }
  function handleSubmit() {
    if (!taskId || !notes.trim()) return;
    onConfirm(taskId, notes.trim());
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" /> Reject Report
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Explain why this task report is being sent back for corrections.
          The worker will see this message.
        </p>
        <Textarea
          placeholder="Rejection reason (required)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none h-24 text-sm"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!notes.trim() || isPending}
          >
            {isPending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Rejecting…</> : "Reject Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Report Dialog ─────────────────────────────────────────────────────────────

function ReportDialog({
  open, onClose, tasks, properties, defaultApprovedOnly = false,
}: {
  open:               boolean;
  onClose:            () => void;
  tasks:              any[];
  properties:         any[];
  defaultApprovedOnly?: boolean;
}) {
  const { t }    = useTranslation();
  const { role } = useRole();
  const { toast } = useToast();

  // Default: last 30 days
  const today  = new Date().toISOString().split("T")[0];
  const thirty = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];

  const [dateFrom,       setDateFrom]       = useState(thirty);
  const [dateTo,         setDateTo]         = useState(today);
  const [propFilter,     setPropFilter]     = useState("all");
  const [includePhotos,  setIncludePhotos]  = useState(false);
  const [approvedOnly,   setApprovedOnly]   = useState(defaultApprovedOnly);
  const [generating,     setGenerating]     = useState(false);

  // Compute preview count
  const scoped = (propFilter !== "all"
    ? tasks.filter((t) => String(t.propertyId) === propFilter)
    : tasks
  ).filter((t) => {
    if (t.status !== "completed" && t.status !== "verified") return false;
    if (approvedOnly && t.reportStatus !== "approved") return false;
    const d = (t.completedAt ?? t.createdAt).split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  const propertyLabel = propFilter === "all"
    ? "All Properties"
    : (properties.find((p) => String(p.id) === propFilter)?.name ?? "All Properties");

  async function handleGenerate() {
    if (!dateFrom || !dateTo) return;
    setGenerating(true);
    try {
      const scopedTasks = (propFilter !== "all"
        ? tasks.filter((t) => String(t.propertyId) === propFilter)
        : tasks
      ).filter((t) => !approvedOnly || t.reportStatus === "approved");
      await generateTaskReport({
        tasks:         scopedTasks,
        dateFrom,
        dateTo,
        companyName:   "Grand PMS",
        propertyLabel,
        generatedBy:   role.label ?? role.id,
        includePhotos,
        approvedOnly,
      });
      toast({ title: "Report downloaded", description: `${scoped.length} tasks included.` });
      onClose();
    } catch (err) {
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("tasks.report.title", { defaultValue: "Generate Task Report" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("tasks.report.from", { defaultValue: "From" })}
              </label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("tasks.report.to", { defaultValue: "To" })}
              </label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Property */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("tasks.report.property", { defaultValue: "Property" })}
            </label>
            <Select value={propFilter} onValueChange={setPropFilter}>
              <SelectTrigger className="h-9 text-sm bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approved only */}
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={approvedOnly}
              onChange={(e) => setApprovedOnly(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Approved reports only</p>
              <p className="text-xs text-muted-foreground">
                Only include tasks whose report has been approved by a manager
              </p>
            </div>
          </label>

          {/* Include photos */}
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium">
                {t("tasks.report.includePhotos", { defaultValue: "Include photo evidence" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("tasks.report.includePhotosHint", { defaultValue: "Appends before/after photos as a separate page" })}
              </p>
            </div>
          </label>

          {/* Preview */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">{t("tasks.report.preview", { defaultValue: "Tasks matching filters:" })} </span>
            <span className="font-semibold text-foreground">{scoped.length}</span>
            <span className="text-muted-foreground">
              {" "}({approvedOnly ? "approved reports" : "completed & verified"})
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>
            {t("tasks.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !dateFrom || !dateTo}>
            {generating
              ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Generating…</>
              : <><Download className="me-2 h-4 w-4" />{t("tasks.report.download", { defaultValue: "Download PDF" })}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Task Dialog ────────────────────────────────────────────────────────

function CreateTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { role }    = useRole();
  const { data: properties } = useListProperties();
  const { data: staff }      = useListStaff({});
  const { data: rooms }      = useListRooms();
  const createTask = useCreateTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", category: "general", priority: "medium", status: "pending",
      propertyId: "", unitId: "", supervisorId: "", assignedToId: "", dueDate: "", description: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const filteredRooms = rooms?.filter((r) => !selectedPropertyId || r.propertyId === Number(selectedPropertyId)) ?? [];
  const activeStaff   = staff?.filter((s) => s.status === "active") ?? [];

  // Managers/owners can assign a supervisor
  const isManager = role.id === "owner" || role.id === "manager" || role.id === "super_admin";

  function onSubmit(data: z.infer<typeof taskSchema>) {
    const payload = {
      ...data,
      propertyId:   data.propertyId   ? Number(data.propertyId)   : undefined,
      unitId:       data.unitId       ? Number(data.unitId)       : undefined,
      supervisorId: data.supervisorId ? Number(data.supervisorId) : undefined,
      assignedToId: data.assignedToId ? Number(data.assignedToId) : undefined,
      description:  data.description  || undefined,
      dueDate:      data.dueDate      || undefined,
    };
    createTask.mutate({ data: payload as any }, {
      onSuccess: () => {
        toast({ title: t("tasks.toast.created") });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        onClose();
        form.reset();
      },
      onError: () => toast({ title: t("tasks.toast.createFailed"), variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tasks.newTask")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tasks.fields.taskName")} <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder={t("tasks.fields.taskNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="propertyId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tasks.fields.asset")}</FormLabel>
                <Select onValueChange={(v) => { field.onChange(v); form.setValue("unitId", ""); }} value={field.value?.toString() ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.fields.selectAsset")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t("tasks.fields.noAsset")}</SelectItem>
                    {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {selectedPropertyId && filteredRooms.length > 0 && (
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.unitOptional")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.fields.anyUnit")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("tasks.fields.anyUnit")}</SelectItem>
                      {filteredRooms.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.category")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORY_VALUES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {t(`tasks.category.${c.value}`)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.priority")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PRIORITY_VALUES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {t(`priority.${p.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.dueDate")}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="assignedToId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.assignTo")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.unassigned")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("tasks.unassigned")}</SelectItem>
                      {activeStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {isManager && (
              <FormField control={form.control} name="supervisorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.fields.supervisor", { defaultValue: "Supervisor" })}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("tasks.unassigned")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("tasks.unassigned")}</SelectItem>
                      {activeStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tasks.fields.description")}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t("tasks.fields.descriptionPlaceholder")} className="resize-none h-24" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("tasks.cancel")}</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? t("tasks.creating") : t("tasks.createTask")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { t } = useTranslation();
  const { role } = useRole();
  const [statusFilter,    setStatusFilter]    = useState<string>("all");
  const [categoryFilter,  setCategoryFilter]  = useState<string>("all");
  const [propertyFilter,  setPropertyFilter]  = useState<string>("all");
  const [createOpen,      setCreateOpen]      = useState(false);
  const [reportOpen,      setReportOpen]      = useState(false);
  const [rejectTaskId,    setRejectTaskId]    = useState<number | null>(null);
  const [selectedTask,    setSelectedTask]    = useState<any | null>(null);
  const [beforePhotoTask, setBeforePhotoTask] = useState<any | null>(null);
  const [afterPhotoTask,  setAfterPhotoTask]  = useState<any | null>(null);
  const [qrTask,          setQrTask]          = useState<any | null>(null);

  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const canVerify      = role.id === "owner" || role.id === "manager" || role.id === "super_admin";
  const canReport      = role.id === "owner" || role.id === "manager" || role.id === "super_admin" || role.id === "supervisor";
  const canReviewRpt   = role.id === "supervisor" || role.id === "manager" || role.id === "owner" || role.id === "super_admin";
  const canApproveRpt  = role.id === "manager" || role.id === "owner" || role.id === "super_admin";

  const params: any = {};
  if (statusFilter   !== "all") params.status     = statusFilter;
  if (propertyFilter !== "all") params.propertyId = parseInt(propertyFilter);

  const { data: tasks, isLoading } = useListTasks(params);
  const { data: properties }       = useListProperties();
  const updateTask    = useUpdateTask();
  const deleteTask    = useDeleteTask();
  const submitReport  = useSubmitTaskReport();
  const rejectReport  = useRejectTaskReport();
  const escalateRpt   = useEscalateTaskReport();
  const approveRpt    = useApproveTaskReport();

  // ── URL deep-link: ?taskId=X auto-opens that task ──────────────────────────
  useEffect(() => {
    if (!tasks) return;
    const sp = new URLSearchParams(window.location.search);
    const idStr = sp.get("taskId");
    if (!idStr) return;
    const id = parseInt(idStr);
    const found = tasks.find((t) => t.id === id);
    if (found) {
      setSelectedTask(found);
      // Clean URL without reloading
      sp.delete("taskId");
      const newSearch = sp.toString();
      window.history.replaceState(null, "", newSearch ? `?${newSearch}` : window.location.pathname);
    }
  }, [tasks]);

  // ── Custom event: detail sheet "expand QR" button ──────────────────────────
  useEffect(() => {
    const handler = (e: Event) => setQrTask((e as CustomEvent).detail ?? null);
    document.addEventListener("show-task-qr", handler);
    return () => document.removeEventListener("show-task-qr", handler);
  }, []);

  // ── QR handler ─────────────────────────────────────────────────────────────
  const handleShowQr = useCallback((task: any) => setQrTask(task), []);

  const filtered = (tasks ?? []).filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const byStatus = (key: string) => filtered.filter((t) => t.status === key);

  // ── Status change entry-point ───────────────────────────────────────────────

  function handleStatus(id: number, newStatus: string) {
    const task = (tasks ?? []).find((t) => t.id === id);
    if (!task) return;

    if (newStatus === "in-progress" && task.status === "pending") {
      setBeforePhotoTask(task);
      return;
    }
    if (newStatus === "completed" && task.status === "in-progress") {
      setAfterPhotoTask(task);
      return;
    }
    // Direct update for other transitions (e.g. re-open, verify from card)
    doUpdate(id, { status: newStatus as any });
  }

  function handleVerify(id: number) {
    doUpdate(id, { status: "verified" as any });
  }

  // ── Report escalation handlers ──────────────────────────────────────────────

  function handleSubmitReport(id: number) {
    submitReport.mutate({ id }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...updated } : prev);
        toast({ title: "Report submitted for review." });
      },
      onError: (err: any) => toast({ title: err?.body?.error ?? "Failed to submit report.", variant: "destructive" }),
    });
  }

  function handleRejectReport(id: number) {
    setRejectTaskId(id);
  }

  function confirmRejectReport(id: number, notes: string) {
    rejectReport.mutate({ id, data: { notes } }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...updated } : prev);
        setRejectTaskId(null);
        toast({ title: "Report rejected — task moved back to in-progress." });
      },
      onError: (err: any) => toast({ title: err?.body?.error ?? "Failed to reject report.", variant: "destructive" }),
    });
  }

  function handleEscalateReport(id: number) {
    escalateRpt.mutate({ id }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...updated } : prev);
        toast({ title: "Report reviewed by supervisor and escalated to manager." });
      },
      onError: (err: any) => toast({ title: err?.body?.error ?? "Failed to escalate report.", variant: "destructive" }),
    });
  }

  function handleApproveReport(id: number) {
    approveRpt.mutate({ id }, {
      onSuccess: (updated: any) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...updated } : prev);
        toast({ title: "Report approved." });
      },
      onError: (err: any) => toast({ title: err?.body?.error ?? "Failed to approve report.", variant: "destructive" }),
    });
  }

  function doUpdate(id: number, data: Record<string, any>, successMsg?: string) {
    updateTask.mutate({ id, data: data as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...data } : prev);
        toast({ title: successMsg ?? t("tasks.toast.statusUpdated") });
      },
      onError: (err: any) => {
        const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
        toast({ title: msg, variant: "destructive" });
      },
    });
  }

  // ── Before photo callbacks ─────────────────────────────────────────────────

  function handleStartWithPhoto(taskId: number, objectPath: string) {
    updateTask.mutate(
      { id: taskId, data: { status: "in-progress" as any, beforePhotoUrl: objectPath } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
          setSelectedTask((prev: any) => prev?.id === taskId ? { ...prev, status: "in-progress", beforePhotoUrl: objectPath } : prev);
          setBeforePhotoTask(null);
          toast({ title: t("tasks.toast.started", { defaultValue: "Task started" }) });
        },
        onError: (err: any) => {
          const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  function handleSkipBeforePhoto(taskId: number) {
    updateTask.mutate(
      { id: taskId, data: { status: "in-progress" as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
          setSelectedTask((prev: any) => prev?.id === taskId ? { ...prev, status: "in-progress" } : prev);
          setBeforePhotoTask(null);
          toast({ title: t("tasks.toast.statusUpdated") });
        },
        onError: (err: any) => {
          const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  // ── After photo callbacks ──────────────────────────────────────────────────

  function handleCompleteWithPhoto(taskId: number, objectPath: string) {
    updateTask.mutate(
      { id: taskId, data: { status: "completed" as any, afterPhotoUrl: objectPath } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
          setSelectedTask((prev: any) => prev?.id === taskId ? { ...prev, status: "completed", afterPhotoUrl: objectPath } : prev);
          setAfterPhotoTask(null);
          toast({ title: t("tasks.toast.completed", { defaultValue: "Task completed" }) });
        },
        onError: (err: any) => {
          const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  function handleSkipAfterPhoto(taskId: number) {
    updateTask.mutate(
      { id: taskId, data: { status: "completed" as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
          setSelectedTask((prev: any) => prev?.id === taskId ? { ...prev, status: "completed" } : prev);
          setAfterPhotoTask(null);
          toast({ title: t("tasks.toast.statusUpdated") });
        },
        onError: (err: any) => {
          const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function handleDelete(id: number, title: string) {
    if (!confirm(t("tasks.deleteConfirm", { title }))) return;
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        if (selectedTask?.id === id) setSelectedTask(null);
        toast({ title: t("tasks.toast.deleted") });
      },
      onError: () => toast({ title: t("tasks.toast.deleteFailed"), variant: "destructive" }),
    });
  }

  const columns = STATUS_KEYS.map((col) => ({ ...col, tasks: byStatus(col.key) }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-serif text-foreground">{t("tasks.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("tasks.manageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {canReport && (
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileText className="me-2 h-4 w-4" />
              {t("tasks.report.generate", { defaultValue: "Generate Report" })}
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />{t("tasks.newTask")}
          </Button>
        </div>
      </div>

      {/* Summary KPI cards — 4 columns */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { icon: AlertCircle,  colKey: "pending",    statusKey: "pending",     iconCls: "text-slate-400"   },
          { icon: Clock,        colKey: "inProgress", statusKey: "in-progress", iconCls: "text-amber-500"   },
          { icon: CheckCircle2, colKey: "completed",  statusKey: "completed",   iconCls: "text-emerald-500" },
          { icon: BadgeCheck,   colKey: "verified",   statusKey: "verified",    iconCls: "text-violet-500"  },
        ].map(({ icon: Icon, colKey, statusKey, iconCls }) => (
          <Card key={colKey} className="shadow-none border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className={`h-4 w-4 ${iconCls}`} />
                <p className="text-xs font-medium">{t(`tasks.columns.${colKey}`, { defaultValue: colKey })}</p>
              </div>
              <p className={`text-2xl font-bold ${iconCls}`}>
                {(tasks ?? []).filter((t) => t.status === statusKey).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px] bg-background h-8 text-sm">
            <SelectValue placeholder={t("tasks.allAssets")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tasks.allAssets")}</SelectItem>
            {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] bg-background h-8 text-sm">
            <SelectValue placeholder={t("tasks.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tasks.allCategories")}</SelectItem>
            {CATEGORY_VALUES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {t(`tasks.category.${c.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-background h-8 text-sm">
            <SelectValue placeholder={t("tasks.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tasks.allStatuses")}</SelectItem>
            {STATUS_KEYS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {t(`tasks.columns.${s.colKey}`, { defaultValue: s.colKey })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban — 4 columns */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ key, colKey, dot, tasks: colTasks }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <h3 className="text-sm font-semibold">{t(`tasks.columns.${colKey}`, { defaultValue: colKey })}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                {colTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-card border rounded-lg p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                    </div>
                  ))
                : colTasks.map((task) => (
                    <TaskCard key={task.id} task={task}
                      onSelect={setSelectedTask}
                      onDelete={handleDelete}
                      onStatus={handleStatus}
                      onVerify={handleVerify}
                      canVerify={canVerify}
                      onSubmitReport={handleSubmitReport}
                      onRejectReport={handleRejectReport}
                      onEscalateReport={handleEscalateReport}
                      onApproveReport={handleApproveReport}
                      canReviewReport={canReviewRpt}
                      canApproveReport={canApproveRpt}
                      onShowQr={handleShowQr}
                    />
                  ))
              }
              {!isLoading && colTasks.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-xs text-muted-foreground">{t("tasks.noTasksHere")}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs & Sheets */}
      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        canVerify={canVerify}
        onMarkStart={selectedTask ? () => { setBeforePhotoTask(selectedTask); } : undefined}
        onMarkComplete={selectedTask ? () => { setAfterPhotoTask(selectedTask); } : undefined}
      />

      {/* Before-photo dialog */}
      <PhotoUploadDialog
        task={beforePhotoTask}
        mode="before"
        open={!!beforePhotoTask}
        onClose={() => setBeforePhotoTask(null)}
        onUpload={handleStartWithPhoto}
        onSkip={handleSkipBeforePhoto}
        isSubmitting={updateTask.isPending}
      />

      {/* After-photo dialog */}
      <PhotoUploadDialog
        task={afterPhotoTask}
        mode="after"
        open={!!afterPhotoTask}
        onClose={() => setAfterPhotoTask(null)}
        onUpload={handleCompleteWithPhoto}
        onSkip={handleSkipAfterPhoto}
        isSubmitting={updateTask.isPending}
      />

      {/* Report dialog */}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        tasks={tasks ?? []}
        properties={properties ?? []}
        defaultApprovedOnly={canApproveRpt}
      />

      {/* QR Code modal */}
      <QrCodeModal
        task={qrTask}
        open={qrTask !== null}
        onClose={() => setQrTask(null)}
      />

      {/* Reject report dialog */}
      <RejectReportDialog
        taskId={rejectTaskId}
        open={rejectTaskId !== null}
        onClose={() => setRejectTaskId(null)}
        onConfirm={confirmRejectReport}
        isPending={rejectReport.isPending}
      />
    </div>
  );
}
