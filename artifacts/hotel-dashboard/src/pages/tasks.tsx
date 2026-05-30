import React, { useState, useRef } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus, Trash2, CheckCheck, Clock, AlertCircle, CheckCircle2,
  Building2, Image as ImageIcon, Send, X, Zap, Droplets, Wind, Sparkles, ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "electrical", label: "Electrical",  icon: Zap,         color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "plumbing",   label: "Plumbing",    icon: Droplets,    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "hvac",       label: "HVAC",        icon: Wind,        color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "cleaning",   label: "Cleaning",    icon: Sparkles,    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "general",    label: "General",     icon: ClipboardList, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
];

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "high",   label: "High",   color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

const STATUS_COLUMNS = [
  { key: "pending",     label: "Open",        dot: "bg-slate-400",  count: 0 },
  { key: "in-progress", label: "In Progress", dot: "bg-amber-500",  count: 0 },
  { key: "completed",   label: "Completed",   dot: "bg-emerald-500",count: 0 },
];

// ── Schemas ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title:        z.string().min(1, "Task name is required"),
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
  authorName: z.string().min(1, "Name is required"),
  body:       z.string().min(1, "Comment cannot be empty"),
});

// ── Helper fns ────────────────────────────────────────────────────────────────

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[4];
}
function getPriorityMeta(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(str: string | null | undefined) {
  if (!str) return null;
  return new Date(str + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(dueDate: string | null | undefined, status: string) {
  if (!dueDate || status === "completed") return false;
  return dueDate < new Date().toISOString().split("T")[0];
}

// ── Badges ────────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  return (
    <Badge className={`gap-1 border-0 text-xs font-medium ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = getPriorityMeta(priority);
  return <Badge className={`border-0 text-xs ${meta.color}`}>{meta.label}</Badge>;
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: any;
  onSelect: (task: any) => void;
  onDelete: (id: number, title: string) => void;
  onStatus: (id: number, status: string) => void;
}

function TaskCard({ task, onSelect, onDelete, onStatus }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 shadow-none hover:shadow-sm hover:border-border/80 transition-all cursor-pointer space-y-3"
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
            <span className="italic opacity-60">Unassigned</span>
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
            <Clock className="me-1 h-3 w-3" />Start
          </Button>
        )}
        {task.status !== "completed" && (
          <Button size="sm" variant="outline"
            className="h-7 text-xs flex-1 text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
            onClick={() => onStatus(task.id, "completed")}>
            <CheckCheck className="me-1 h-3 w-3" />Done
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────────

function TaskDetailSheet({ task, open, onClose }: { task: any | null; open: boolean; onClose: () => void }) {
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
    updateTask.mutate({ id: task.id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        toast({ title: "Status updated" });
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
          toast({ title: "Comment added" });
        },
        onError: () => toast({ title: "Failed to add comment", variant: "destructive" }),
      }
    );
  }

  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);
  const catMeta = getCategoryMeta(task.category);
  const priMeta = getPriorityMeta(task.priority);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto flex flex-col gap-0 p-0">

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Task #{task.id}</p>
              <SheetTitle className="text-base font-semibold leading-snug">{task.title}</SheetTitle>
            </div>
          </div>
          {/* Status row */}
          <div className="flex gap-2 mt-3">
            {STATUS_COLUMNS.map((col) => (
              <Button
                key={col.key}
                size="sm"
                variant={task.status === col.key ? "default" : "outline"}
                className="h-7 text-xs flex-1"
                onClick={() => handleStatusChange(col.key)}
                disabled={task.status === col.key || updateTask.isPending}
              >
                {task.status === col.key && <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${col.dot} bg-current`} />}
                {col.label}
              </Button>
            ))}
          </div>
        </SheetHeader>

        {/* Details */}
        <div className="px-6 py-4 space-y-3 border-b">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <CategoryBadge category={task.category} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <PriorityBadge priority={task.priority} />
            </div>
            {task.propertyName && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Asset</p>
                <p className="text-sm font-medium">{task.propertyName}{task.unitName ? ` — ${task.unitName}` : ""}</p>
              </div>
            )}
            {task.assigneeName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
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
                <p className="text-xs text-muted-foreground mb-1">Due date</p>
                <p className={`text-sm font-medium ${overdue ? "text-red-500" : ""}`}>
                  {formatDate(task.dueDate)}{overdue ? " · Overdue" : ""}
                </p>
              </div>
            )}
          </div>
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="flex-1 px-6 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Comments {comments?.length ? `(${comments.length})` : ""}
          </p>

          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : comments?.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No comments yet. Be the first to add one.</p>
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
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                    <Input placeholder="Your name" className="h-8 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={commentForm.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Add a comment…" className="resize-none h-16 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Image preview */}
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
                  {createComment.isPending ? "Posting…" : "Post Comment"}
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
        toast({ title: "Task created" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        onClose();
        form.reset();
      },
      onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Task Name */}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Task Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Replace faulty circuit breaker" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Asset */}
            <FormField control={form.control} name="propertyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Asset</FormLabel>
                <Select onValueChange={(v) => { field.onChange(v); form.setValue("unitId", ""); }} value={field.value?.toString() ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select asset…" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No specific asset</SelectItem>
                    {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Unit — only when asset selected */}
            {selectedPropertyId && filteredRooms.length > 0 && (
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Any unit" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Any unit</SelectItem>
                      {filteredRooms.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Priority */}
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Due Date */}
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Assign To */}
              <FormField control={form.control} name="assignedToId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {filteredStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the task in detail…" className="resize-none h-24" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating…" : "Create Task"}
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
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [createOpen,     setCreateOpen]     = useState(false);
  const [selectedTask,   setSelectedTask]   = useState<any | null>(null);

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
    updateTask.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        // also refresh the selected task if it's the same
        if (selectedTask?.id === id) setSelectedTask((prev: any) => prev ? { ...prev, status } : null);
        toast({ title: "Status updated" });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    });
  }

  function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) });
        if (selectedTask?.id === id) setSelectedTask(null);
        toast({ title: "Task deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  }

  const columns = STATUS_COLUMNS.map((col) => ({ ...col, tasks: byStatus(col.key) }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track work across all assets.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />New Task
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-3">
        {[
          { icon: AlertCircle,  label: "Open",        value: (tasks ?? []).filter((t) => t.status === "pending").length,     color: "" },
          { icon: Clock,        label: "In Progress",  value: (tasks ?? []).filter((t) => t.status === "in-progress").length, color: "text-amber-600 dark:text-amber-400" },
          { icon: CheckCircle2, label: "Completed",    value: (tasks ?? []).filter((t) => t.status === "completed").length,   color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="shadow-none border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <p className="text-xs font-medium">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px] bg-background h-8 text-sm">
            <SelectValue placeholder="All Assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            {properties?.map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] bg-background h-8 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-background h-8 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_COLUMNS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {columns.map(({ key, label, dot, tasks: colTasks }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <h3 className="text-sm font-semibold">{label}</h3>
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
                  <p className="text-xs text-muted-foreground">No tasks here</p>
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
      />
    </div>
  );
}
