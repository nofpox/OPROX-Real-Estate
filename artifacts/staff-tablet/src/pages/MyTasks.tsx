import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, MapPin, CheckCircle2, Clock, AlertCircle, X, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";

type Task = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  reportStatus: string;
  priority: string;
  propertyName: string | null;
  unitName: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  afterPhotoUrl: string | null;
  completionLat: number | null;
  completionLng: number | null;
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low:    "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const PRIORITY_AR: Record<string, string> = {
  urgent: "عاجل", high: "عالي", medium: "متوسط", low: "منخفض",
};

async function uploadPhoto(file: File): Promise<string> {
  const metaRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("فشل في رفع الصورة · Upload failed");
  const { uploadURL, objectPath } = await metaRes.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("فشل في حفظ الصورة · Storage failed");
  return objectPath as string;
}

// ── Completion Modal ───────────────────────────────────────────────────────────
function CompleteModal({
  task,
  onClose,
  onDone,
}: {
  task: Task;
  onClose: () => void;
  onDone: () => void;
}) {
  const [photo, setPhoto]             = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gps, setGps]                 = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError]       = useState<string | null>(null);
  const [gpsLoading, setGpsLoading]   = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("المتصفح لا يدعم تحديد الموقع");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsError("يرجى السماح بتحديد الموقع من إعدادات المتصفح");
        setGpsLoading(false);
      },
      { timeout: 15_000, enableHighAccuracy: true }
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const canSubmit = !!photo && !!gps && !gpsLoading;

  const handleSubmit = async () => {
    if (!canSubmit || !photo || !gps) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const objectPath = await uploadPhoto(photo);

      const patchRes = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          afterPhotoUrl: objectPath,
          completionLat: gps.lat,
          completionLng: gps.lng,
        }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.message || err.error || "خطأ في تحديث المهمة");
      }

      const submitRes = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.message || err.error || "خطأ في إرسال التقرير");
      }

      onDone();
    } catch (err: any) {
      setSubmitError(err.message || "حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const retryGps = () => {
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => { setGpsError("تعذّر الوصول للموقع."); setGpsLoading(false); },
      { timeout: 15_000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-bold text-foreground">إنهاء المهمة</h2>
          <p className="text-xs text-muted-foreground">Complete Task</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
        >
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Task info */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">المهمة · Task</p>
          <p className="font-bold text-foreground text-base">{task.title}</p>
          {task.propertyName && (
            <p className="text-sm text-muted-foreground mt-0.5">📍 {task.propertyName}</p>
          )}
        </div>

        {/* ── Photo ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Camera size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-foreground">
              صورة إثبات الإنجاز <span className="text-red-400">*</span>
            </span>
            <span className="text-xs text-muted-foreground">Completion Photo</span>
          </div>

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="صورة المهمة"
                className="w-full h-52 object-cover rounded-xl border border-border/50"
              />
              <button
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="absolute top-2 right-2 bg-black/60 rounded-full w-8 h-8 flex items-center justify-center"
              >
                <X size={15} className="text-white" />
              </button>
              <div className="absolute bottom-2 right-2 bg-emerald-500 rounded-full w-7 h-7 flex items-center justify-center">
                <CheckCircle2 size={15} className="text-white" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-44 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/5 flex flex-col items-center justify-center gap-3 active:bg-amber-500/10 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Camera size={28} className="text-amber-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-amber-400 text-sm">اضغط لالتقاط صورة</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tap to take a photo</p>
              </div>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* ── GPS ───────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-foreground">
              الموقع الجغرافي <span className="text-red-400">*</span>
            </span>
            <span className="text-xs text-muted-foreground">GPS Location</span>
          </div>

          <div
            className={`rounded-xl p-4 border flex items-center gap-3 ${
              gpsLoading
                ? "border-amber-500/30 bg-amber-500/5"
                : gps
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
            }`}
          >
            {gpsLoading ? (
              <>
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 animate-pulse">
                  <MapPin size={17} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-400">جاري تحديد الموقع...</p>
                  <p className="text-xs text-muted-foreground">Getting your location...</p>
                </div>
              </>
            ) : gps ? (
              <>
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={17} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">تم تسجيل موقعك ✓</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={17} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400">تعذّر تحديد الموقع</p>
                  <p className="text-xs text-muted-foreground">{gpsError}</p>
                  <button onClick={retryGps} className="text-xs text-blue-400 underline mt-1">
                    إعادة المحاولة · Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Checklist ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            متطلبات الإنهاء · Requirements
          </p>
          {[
            { label: "صورة الإنجاز · Photo", done: !!photo },
            { label: "الموقع الجغرافي · GPS", done: !!gps },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-emerald-500/20" : "bg-muted"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                ) : (
                  <X size={11} className="text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm ${done ? "text-emerald-400" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {submitError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertCircle size={15} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{submitError}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-4 border-t border-border/50 space-y-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 gap-2"
        >
          {submitting ? (
            <><RefreshCw size={18} className="animate-spin" /> جاري الإرسال...</>
          ) : (
            <><Send size={18} /> إرسال التقرير · Submit Report</>
          )}
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          disabled={submitting}
          className="w-full h-11 text-muted-foreground"
        >
          إلغاء · Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onStart,
  onEnd,
  starting,
}: {
  task: Task;
  onStart: (id: number) => void;
  onEnd: (task: Task) => void;
  starting: number | null;
}) {
  const isSubmitted = task.reportStatus !== "none";
  const isStarting  = starting === task.id;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium
              }`}
            >
              {PRIORITY_AR[task.priority] || task.priority}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {task.category}
            </span>
          </div>
          <h3 className="font-bold text-foreground text-base leading-snug">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        {isSubmitted && (
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30">
            <p className="text-[10px] font-bold text-blue-400 whitespace-nowrap">بانتظار الاعتماد</p>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {task.propertyName && (
          <span>
            📍 {task.propertyName}
            {task.unitName ? ` · ${task.unitName}` : ""}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {new Date(task.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
          </span>
        )}
      </div>

      {/* Action */}
      {!isSubmitted && (
        <div className="pt-1">
          {task.status === "pending" && (
            <Button
              onClick={() => onStart(task.id)}
              disabled={isStarting}
              className="w-full h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black gap-2"
            >
              {isStarting
                ? <RefreshCw size={16} className="animate-spin" />
                : "▶"
              }
              بدء المهمة · Start Task
            </Button>
          )}
          {task.status === "in-progress" && (
            <Button
              onClick={() => onEnd(task)}
              className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              ✓ إنهاء المهمة · End Task
            </Button>
          )}
          {task.status === "completed" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">مكتملة — بانتظار الاعتماد</span>
            </div>
          )}
          {task.status === "verified" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">معتمدة ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MyTasks() {
  const qc      = useQueryClient();
  const session = JSON.parse(localStorage.getItem("grand_pms_session") || "{}");

  const [tab, setTab]                     = useState<"pending" | "active" | "done">("pending");
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [startingId, setStartingId]       = useState<number | null>(null);

  const { data: tasks, isLoading, isError, refetch } = useQuery<Task[]>({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const r = await fetch("/api/tasks/mine", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    retry: 2,
    refetchInterval: 30_000,
  });

  const pendingTasks = tasks?.filter(t => t.status === "pending") ?? [];
  const activeTasks  = tasks?.filter(t => t.status === "in-progress") ?? [];
  const doneTasks    = tasks?.filter(
    t => t.status === "completed" || t.status === "verified"
  ) ?? [];

  const handleStart = async (taskId: number) => {
    setStartingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["my-tasks"] });
        setTab("active");
      }
    } finally {
      setStartingId(null);
    }
  };

  const handleDone = async () => {
    setCompletingTask(null);
    await qc.invalidateQueries({ queryKey: ["my-tasks"] });
    setTab("done");
  };

  const TABS = [
    { key: "pending" as const, label: "قيد الانتظار", sub: "Pending", count: pendingTasks.length },
    { key: "active"  as const, label: "جارية",        sub: "Active",  count: activeTasks.length  },
    { key: "done"    as const, label: "المنتهية",     sub: "Done",    count: doneTasks.length    },
  ];

  const displayed =
    tab === "pending" ? pendingTasks :
    tab === "active"  ? activeTasks  :
    doneTasks;

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-serif font-bold text-foreground text-xl leading-tight">
                مهامي الحالية
              </h1>
              <p className="text-xs text-muted-foreground">
                {session.displayName || session.username}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="w-9 h-9 p-0"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>

          {/* Status tabs */}
          <div className="flex gap-2">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  tab === t.key
                    ? "bg-amber-500 text-black"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <div>{t.label}</div>
                <div
                  className={`text-[10px] font-normal ${
                    tab === t.key ? "text-black/70" : "text-muted-foreground"
                  }`}
                >
                  {t.sub} ({t.count})
                </div>
              </button>
            ))}
          </div>
        </header>

        {/* Task list */}
        <div className="px-4 py-4 space-y-3">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">تعذّر تحميل المهام</p>
                <p className="text-xs text-muted-foreground mt-1">Failed to load tasks</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw size={14} className="me-2" />إعادة المحاولة
              </Button>
            </div>
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 size={44} className="text-muted-foreground/25 mb-4" />
              <p className="text-muted-foreground font-semibold">لا توجد مهام في هذا القسم</p>
              <p className="text-xs text-muted-foreground mt-1">No tasks in this section</p>
            </div>
          ) : (
            displayed.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStart={handleStart}
                onEnd={setCompletingTask}
                starting={startingId}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav active="tasks" />

      {completingTask && (
        <CompleteModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onDone={handleDone}
        />
      )}
    </>
  );
}
