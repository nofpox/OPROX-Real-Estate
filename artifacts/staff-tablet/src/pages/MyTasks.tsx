import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, MapPin, CheckCircle2, Clock, AlertCircle, X, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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

async function uploadPhoto(file: File): Promise<string> {
  const metaRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("Upload failed");
  const { uploadURL, objectPath } = await metaRes.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Storage failed");
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
  const { t } = useTranslation();
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
      setGpsError(t("tasks.allowLocation"));
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsError(t("tasks.allowLocation"));
        setGpsLoading(false);
      },
      { timeout: 15_000, enableHighAccuracy: true }
    );
  }, [t]);

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
        throw new Error(err.message || err.error || "Task update error");
      }

      const submitRes = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.message || err.error || "Report submit error");
      }

      onDone();
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const retryGps = () => {
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => { setGpsError(t("tasks.locationFailed")); setGpsLoading(false); },
      { timeout: 15_000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background lg:ps-[60px] xl:ps-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("tasks.completeTask")}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
        >
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 max-w-2xl mx-auto w-full">
        <div className="space-y-5">
          {/* Task info */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("tasks.taskLabel")}</p>
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
                {t("tasks.completionPhoto")} <span className="text-red-400">*</span>
              </span>
            </div>

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt={t("tasks.completionPhoto")}
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
                <p className="font-bold text-amber-400 text-sm">{t("tasks.tapPhoto")}</p>
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
                {t("tasks.gpsLocation")} <span className="text-red-400">*</span>
              </span>
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
                  <p className="text-sm font-semibold text-amber-400">{t("tasks.locationGetting")}</p>
                </>
              ) : gps ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={17} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">{t("tasks.locationDone")} ✓</p>
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
                    <p className="text-sm font-semibold text-red-400">{t("tasks.locationFailed")}</p>
                    <p className="text-xs text-muted-foreground">{gpsError}</p>
                    <button onClick={retryGps} className="text-xs text-blue-400 underline mt-1">
                      {t("tasks.retryGps")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Checklist ─────────────────────────────────────────────────── */}
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("tasks.requirements")}
            </p>
            {[
              { label: t("tasks.photo"), done: !!photo },
              { label: t("tasks.gpsLocation"), done: !!gps },
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
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-4 border-t border-border/50 space-y-3 max-w-2xl mx-auto w-full">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 gap-2"
        >
          {submitting ? (
            <><RefreshCw size={18} className="animate-spin" /> {t("tasks.submitting")}</>
          ) : (
            <><Send size={18} /> {t("tasks.submitReport")}</>
          )}
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          disabled={submitting}
          className="w-full h-11 text-muted-foreground"
        >
          {t("tasks.cancel")}
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
  const { t, i18n } = useTranslation();
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
              {t(`priority.${task.priority}`, task.priority)}
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
            <p className="text-[10px] font-bold text-blue-400 whitespace-nowrap">{t("tasks.awaitingApproval")}</p>
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
            {new Date(task.dueDate + "T00:00:00").toLocaleDateString(i18n.language)}
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
              {t("tasks.startTask")}
            </Button>
          )}
          {task.status === "in-progress" && (
            <Button
              onClick={() => onEnd(task)}
              className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              ✓ {t("tasks.endTask")}
            </Button>
          )}
          {task.status === "completed" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">{t("tasks.completedAwaiting")}</span>
            </div>
          )}
          {task.status === "verified" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">{t("tasks.approved")} ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MyTasks() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const { data: authUser } = useQuery<{ id: number; username: string; displayName: string }>({
    queryKey: ["auth-me"],
    queryFn: () => fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    staleTime: Infinity,
  });

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

  const pendingTasks = tasks?.filter(t2 => t2.status === "pending") ?? [];
  const activeTasks  = tasks?.filter(t2 => t2.status === "in-progress") ?? [];
  const doneTasks    = tasks?.filter(
    t2 => t2.status === "completed" || t2.status === "verified"
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
    { key: "pending" as const, label: t("tasks.pending"), count: pendingTasks.length },
    { key: "active"  as const, label: t("tasks.active"),  count: activeTasks.length  },
    { key: "done"    as const, label: t("tasks.done"),    count: doneTasks.length    },
  ];

  const displayed =
    tab === "pending" ? pendingTasks :
    tab === "active"  ? activeTasks  :
    doneTasks;

  return (
    <>
      {completingTask && (
        <CompleteModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onDone={handleDone}
        />
      )}

      <div className="min-h-screen bg-background pb-24 lg:pb-6 lg:ps-[60px] xl:ps-[220px]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-4 sm:px-5 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="font-serif font-bold text-foreground text-xl leading-tight">
                  {t("tasks.title")}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {authUser?.displayName || authUser?.username}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetch()}
                  className="w-9 h-9 p-0"
                >
                  <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {/* Status tabs */}
            <div className="flex gap-2">
              {TABS.map(tab2 => (
                <button
                  key={tab2.key}
                  onClick={() => setTab(tab2.key)}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                    tab === tab2.key
                      ? "bg-amber-500 text-black"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div>{tab2.label}</div>
                  <div
                    className={`text-[10px] font-normal ${
                      tab === tab2.key ? "text-black/70" : "text-muted-foreground"
                    }`}
                  >
                    ({tab2.count})
                  </div>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Task list */}
        <div className="px-4 sm:px-5 py-4 max-w-5xl mx-auto">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={26} className="text-red-400" />
              </div>
              <p className="text-muted-foreground text-sm">Failed to load tasks</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">{t("workOrders.empty")}</p>
            </div>
          ) : (
            /* 2-column card grid on md+ */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayed.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStart={handleStart}
                  onEnd={(t) => setCompletingTask(t)}
                  starting={startingId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="tasks" />
    </>
  );
}
