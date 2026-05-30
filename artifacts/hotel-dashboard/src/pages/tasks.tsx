import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useListTasks, getListTasksQueryKey, useCreateTask, useUpdateTask, useDeleteTask,
  useListStaff, useListProperties, useListRooms,
  useListTaskComments, useCreateTaskComment,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus, Trash2, CheckCheck, Clock, AlertCircle, CheckCircle2,
  Building2, Image as ImageIcon, Send, X, Zap, Droplets, Wind, Sparkles, ClipboardList,
  Camera, Upload, ExternalLink, ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  { key: "pending",     colKey: "pending",    dot: "bg-slate-400"  },
  { key: "in-progress", colKey: "inProgress", dot: "bg-amber-500"  },
  { key: "completed",   colKey: "completed",  dot: "bg-emerald-500" },
] as const;

// ── Schemas ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title:        z.string().min(1),
  category:     z.enum(["electrical", "plumbing", "hvac", "cleaning", "general"]),
  priority:     z.enum(["low", "medium", "high", "urgent"]),
  propertyId:   z.coerce.number().optional().or(z.literal("")),
  unitId:       z.coerce.number().optional().or(z.literal("")),
  assignedToId: z.coerce.number().optional().or(z.literal("")),
  dueDate:      z.string().optional().or(z.literal("")),
  description:  z.string().optional().or(z.literal("")),
  status:       z.enum(["pending", "in-progress", "completed"]).default("pending"),
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
  if (!dueDate || status === "completed") return false;
  return dueDate < new Date().toISOString().split("T")[0];
}
function proofPhotoSrc(objectPath: string): string {
  return `/api/storage${objectPath}`;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadProofPhoto(file: File): Promise<string> {
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

// ── Proof Photo Dialog ────────────────────────────────────────────────────────

interface ProofPhotoDialogProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: number, proofPhotoUrl: string) => void;
  onSkip: (taskId: number) => void;
  isSubmitting: boolean;
}

function ProofPhotoDialog({ task, open, onClose, onComplete, onSkip, isSubmitting }: ProofPhotoDialogProps) {
  const { t } = useTranslation();
  const fileRef  = useRef<HTMLInputElement>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const { toast } = useToast();

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (f.size > 10 * 1024 * 1024)    { setError("Image must be smaller than 10 MB"); return; }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!file || !task) return;
    setUploading(true);
    setError(null);
    try {
      const objectPath = await uploadProofPhoto(file);
      onComplete(task.id, objectPath);
      reset();
    } catch {
      setError("Upload failed. Please try again.");
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Proof of Work Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Upload a photo proving the task is complete before marking it done.
          </p>
          <p className="text-sm font-medium truncate">{task.title}</p>

          {/* Drop zone / preview */}
          <div
            className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer
              ${preview ? "border-emerald-500/40 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}
              ${preview ? "min-h-48" : "min-h-36"}
            `}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <>
                <img src={preview} alt="Proof preview" className="max-h-52 rounded-lg object-contain" />
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
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!file || uploading || isSubmitting}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload & Complete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: any;
  onSelect: (task: any) => void;
  onDelete: (id: number, title: string) => void;
  onStatus: (id: number, status: string) => void;
}

function TaskCard({ task, onSelect, onDelete, onStatus }: TaskCardProps) {
  const { t } = useTranslation();
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 shadow-none cursor-pointer space-y-3"
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug flex-1">{task.title}</p>
        <Button
          variant="ghost" size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <CategoryBadge category={task.category} />
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Proof photo thumbnail */}
      {task.status === "completed" && task.proofPhotoUrl && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          <a
            href={proofPhotoSrc(task.proofPhotoUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            View proof photo
          </a>
        </div>
      )}

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

      <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
        {task.status !== "in-progress" && (
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
            onClick={() => onStatus(task.id, "in-progress")}>
            <Clock className="me-1 h-3 w-3" />{t("tasks.actions.start")}
          </Button>
        )}
        {task.status !== "completed" && (
          <Button size="sm" variant="outline"
            className="h-7 text-xs flex-1 text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
            onClick={() => onStatus(task.id, "completed")}>
            <CheckCheck className="me-1 h-3 w-3" />{t("tasks.actions.done")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  onMarkComplete?: () => void;
}

function TaskDetailSheet({ task, open, onClose, onMarkComplete }: TaskDetailSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateTask = useUpdateTask();
  const fileRef = useRef<HTMLInputElement>(null);
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
    if (newStatus === "completed" && onMarkComplete) {
      onMarkComplete();
      return;
    }
    updateTask.mutate({ id: task.id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        toast({ title: t("tasks.toast.statusUpdated") });
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

  const overdue = isOverdue(task.dueDate, task.status);

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
          {/* Status row */}
          <div className="flex gap-2 mt-3">
            {STATUS_KEYS.map((col) => (
              <Button
                key={col.key}
                size="sm"
                variant={task.status === col.key ? "default" : "outline"}
                className="h-7 text-xs flex-1"
                onClick={() => handleStatusChange(col.key)}
                disabled={task.status === col.key || updateTask.isPending}
              >
                {task.status === col.key && <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${col.dot} bg-current`} />}
                {t(`tasks.columns.${col.colKey}`)}
              </Button>
            ))}
          </div>
        </SheetHeader>

        {/* Details */}
        <div className="px-6 py-4 space-y-3 border-b">
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
          </div>
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("tasks.detail.description")}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Proof photo (if completed with proof) */}
          {task.status === "completed" && task.proofPhotoUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Proof of Work
              </p>
              <a
                href={proofPhotoSrc(task.proofPhotoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <img
                  src={proofPhotoSrc(task.proofPhotoUrl)}
                  alt="Proof of work"
                  className="rounded-lg border max-h-48 object-cover group-hover:opacity-90 transition-opacity"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  View full size
                </p>
              </a>
            </div>
          )}
        </div>

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
                      <img
                        src={c.imageUrl}
                        alt="Attachment"
                        className="mt-2 rounded-md border max-h-48 object-cover"
                      />
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

// ── Create Task Dialog ────────────────────────────────────────────────────────

function CreateTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: properties } = useListProperties();
  const { data: staff }      = useListStaff({});
  const { data: rooms }      = useListRooms();
  const createTask = useCreateTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", category: "general", priority: "medium", status: "pending",
      propertyId: "", unitId: "", assignedToId: "", dueDate: "", description: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const filteredRooms = rooms?.filter((r) => !selectedPropertyId || r.propertyId === Number(selectedPropertyId)) ?? [];
  const filteredStaff = staff?.filter((s) => s.status === "active") ?? [];

  function onSubmit(data: z.infer<typeof taskSchema>) {
    const payload = {
      ...data,
      propertyId:   data.propertyId   ? Number(data.propertyId)   : undefined,
      unitId:       data.unitId       ? Number(data.unitId)       : undefined,
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
                      {filteredStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

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
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [createOpen,     setCreateOpen]     = useState(false);
  const [selectedTask,   setSelectedTask]   = useState<any | null>(null);
  const [proofDialog,    setProofDialog]    = useState<{ task: any } | null>(null);

  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const params: any = {};
  if (statusFilter   !== "all") params.status     = statusFilter;
  if (propertyFilter !== "all") params.propertyId = parseInt(propertyFilter);

  const { data: tasks,      isLoading }  = useListTasks(params);
  const { data: properties }             = useListProperties();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filtered = (tasks ?? []).filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const byStatus = (key: string) => filtered.filter((t) => t.status === key);

  function handleStatus(id: number, status: string) {
    if (status === "completed") {
      const task = (tasks ?? []).find((t) => t.id === id);
      if (task) {
        setProofDialog({ task });
        return;
      }
    }
    updateTask.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        if (selectedTask?.id === id) setSelectedTask((prev: any) => prev ? { ...prev, status } : null);
        toast({ title: t("tasks.toast.statusUpdated") });
      },
      onError: () => toast({ title: t("tasks.toast.updateFailed"), variant: "destructive" }),
    });
  }

  function handleCompleteWithProof(taskId: number, objectPath: string) {
    updateTask.mutate({ id: taskId, data: { status: "completed" as any, proofPhotoUrl: objectPath } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev: any) => prev ? { ...prev, status: "completed", proofPhotoUrl: objectPath } : null);
        }
        setProofDialog(null);
        toast({ title: "Task completed with proof photo" });
      },
      onError: (err: any) => {
        const msg = err?.body?.message ?? "Failed to complete task";
        toast({ title: msg, variant: "destructive" });
      },
    });
  }

  function handleSkipProof(taskId: number) {
    updateTask.mutate({ id: taskId, data: { status: "completed" as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev: any) => prev ? { ...prev, status: "completed" } : null);
        }
        setProofDialog(null);
        toast({ title: t("tasks.toast.statusUpdated") });
      },
      onError: (err: any) => {
        const msg = err?.body?.message ?? t("tasks.toast.updateFailed");
        toast({ title: msg, variant: "destructive" });
      },
    });
  }

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
          <h1 className="text-2xl font-semibold text-foreground">{t("tasks.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("tasks.manageSubtitle")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />{t("tasks.newTask")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-3">
        {[
          { icon: AlertCircle,  colKey: "pending",    statusKey: "pending",     color: "" },
          { icon: Clock,        colKey: "inProgress",  statusKey: "in-progress", color: "text-amber-600 dark:text-amber-400" },
          { icon: CheckCircle2, colKey: "completed",   statusKey: "completed",   color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ icon: Icon, colKey, statusKey, color }) => (
          <Card key={colKey} className="shadow-none border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <p className="text-xs font-medium">{t(`tasks.columns.${colKey}`)}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>
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
                {t(`tasks.columns.${s.colKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {columns.map(({ key, colKey, dot, tasks: colTasks }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <h3 className="text-sm font-semibold">{t(`tasks.columns.${colKey}`)}</h3>
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

      {/* Dialogs */}
      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onMarkComplete={selectedTask ? () => setProofDialog({ task: selectedTask }) : undefined}
      />
      <ProofPhotoDialog
        task={proofDialog?.task ?? null}
        open={!!proofDialog}
        onClose={() => setProofDialog(null)}
        onComplete={handleCompleteWithProof}
        onSkip={handleSkipProof}
        isSubmitting={updateTask.isPending}
      />
    </div>
  );
}
