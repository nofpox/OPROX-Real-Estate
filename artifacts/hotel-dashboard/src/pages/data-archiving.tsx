import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Archive, ShieldCheck, Clock, AlertTriangle, CheckCircle2,
  Play, BellOff, Search, Eye, RotateCcw, Database,
  FileJson, ChevronRight, CalendarDays, BarChart3, Loader2,
  HardDrive, RefreshCw, Inbox, Wrench, CalendarRange, Ticket, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchivingLog {
  id: number;
  runAt: string;
  status: string;
  triggeredBy: string;
  recordsArchived: number;
  datasets: string[] | null;
  archiveKeys: string[] | null;
  notes: string | null;
}

interface ArchivingStatus {
  lastRunAt: string | null;
  nextDueAt: string | null;
  isDue: boolean;
  hasPendingAlert: boolean;
  snoozedUntil: string | null;
  logs: ArchivingLog[];
}

interface ArchiveFile {
  key: string;
  name: string;
  period: string;
  dataset: string;
  createdAt: string;
  size: number;
}

interface ArchiveList {
  archives: ArchiveFile[];
  total: number;
}

interface ArchiveContent {
  key: string;
  dataset: string;
  period: string;
  records: Record<string, unknown>[];
  count: number;
  archivedAt: string | null;
  restorable: boolean;
}

// ─── API helpers (admin-only internal module) ─────────────────────────────────

const apiFetch = async <T,>(url: string, opts?: RequestInit): Promise<T> => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
};

const ALL_DATASETS = [
  { id: "guest-requests",  label: "Guest Requests",  Icon: Inbox },
  { id: "work-orders",     label: "Work Orders",     Icon: Wrench },
  { id: "bookings",        label: "Bookings",        Icon: CalendarRange },
  { id: "support-tickets", label: "Support Tickets", Icon: Ticket },
  { id: "activity-logs",   label: "Activity Logs",   Icon: ClipboardList },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusColor(s: string) {
  if (s === "completed") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "snoozed")   return "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400";
  if (s === "restored")  return "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataArchiving() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(ALL_DATASETS.map(d => d.id));
  const [olderThanDays, setOlderThanDays] = useState(90);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [previewArchive, setPreviewArchive] = useState<ArchiveFile | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(30);

  // ── Queries ────────────────────────────────────────────────────────────────

  const statusQ = useQuery<ArchivingStatus>({
    queryKey: ["archiving-status"],
    queryFn: () => apiFetch("/api/archiving/status"),
    refetchInterval: 60_000,
  });

  const archivesQ = useQuery<ArchiveList>({
    queryKey: ["archiving-archives"],
    queryFn: () => apiFetch("/api/archiving/archives"),
  });

  const previewQ = useQuery<ArchiveContent>({
    queryKey: ["archive-content", previewArchive?.key],
    queryFn: () =>
      apiFetch(`/api/archiving/archive-content?key=${encodeURIComponent(previewArchive!.key)}`),
    enabled: !!previewArchive,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const runMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; recordsArchived: number; message: string }>("/api/archiving/run", {
        method: "POST",
        body: JSON.stringify({ datasets: selectedDatasets, olderThanDays }),
      }),
    onSuccess: (data) => {
      toast({ title: "Archiving Complete", description: data.message });
      setConfirmRun(false);
      qc.invalidateQueries({ queryKey: ["archiving-status"] });
      qc.invalidateQueries({ queryKey: ["archiving-archives"] });
    },
    onError: (e: Error) => toast({ title: "Archiving Failed", description: e.message, variant: "destructive" }),
  });

  const snoozeMutation = useMutation({
    mutationFn: (days: number) =>
      apiFetch<{ success: boolean }>("/api/archiving/snooze", {
        method: "POST",
        body: JSON.stringify({ days }),
      }),
    onSuccess: () => {
      toast({ title: "Reminder Snoozed", description: `You'll be reminded again in ${snoozeDays} days.` });
      setSnoozeOpen(false);
      qc.invalidateQueries({ queryKey: ["archiving-status"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (archiveKey: string) =>
      apiFetch<{ success: boolean; message: string }>("/api/archiving/restore", {
        method: "POST",
        body: JSON.stringify({ archiveKey }),
      }),
    onSuccess: (data) => {
      toast({ title: "Restore Flagged", description: data.message });
      setPreviewArchive(null);
      qc.invalidateQueries({ queryKey: ["archiving-status"] });
    },
    onError: (e: Error) => toast({ title: "Restore Failed", description: e.message, variant: "destructive" }),
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const status = statusQ.data;
  const archives = archivesQ.data?.archives ?? [];

  const allPeriods = [...new Set(archives.map(a => a.period))].sort().reverse();

  const filteredArchives = archives.filter(a => {
    const matchesSearch =
      !searchTerm ||
      a.dataset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = !filterPeriod || a.period === filterPeriod;
    return matchesSearch && matchesPeriod;
  });

  const toggleDataset = (id: string) =>
    setSelectedDatasets(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            Data Archiving
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Periodic health checks, admin-approved archiving, and secure cloud archive browser
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["archiving-status"] });
            qc.invalidateQueries({ queryKey: ["archiving-archives"] });
          }}
        >
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Health Monitor
            {status?.isDue && (
              <span className="ms-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="browser" className="gap-1.5">
            <Database className="h-4 w-4" />
            Archive Browser
            {(archivesQ.data?.total ?? 0) > 0 && (
              <Badge variant="secondary" className="ms-1 h-5 text-xs">
                {archivesQ.data!.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── HEALTH MONITOR TAB ──────────────────────────────────────────── */}
        <TabsContent value="health" className="mt-4 space-y-4">
          {statusQ.isLoading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading system status…
            </div>
          )}

          {status && (
            <>
              {/* Status overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Archived</p>
                        <p className="text-sm font-medium">{formatDate(status.lastRunAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-full p-2", status.isDue ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30")}>
                        <CalendarDays className={cn("h-4 w-4", status.isDue ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Next Due</p>
                        <p className="text-sm font-medium">
                          {status.nextDueAt ? formatDate(status.nextDueAt) : "Immediately"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-full p-2", status.isDue ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30")}>
                        {status.isDue
                          ? <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          : <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium">
                          {status.snoozedUntil && new Date(status.snoozedUntil) > new Date()
                            ? `Snoozed until ${formatDate(status.snoozedUntil)}`
                            : status.isDue ? "Maintenance Due" : "Up to date"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending alert banner */}
              {status.isDue && (
                <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2.5 shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-amber-900 dark:text-amber-200">
                            Scheduled Maintenance Due
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 truncate">
                            Monthly data archiving window is ready for your approval. Select datasets below and click Execute.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                          onClick={() => setSnoozeOpen(true)}
                          disabled={snoozeMutation.isPending}
                        >
                          <BellOff className="h-3.5 w-3.5 me-1.5" />
                          Remind Later
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => setConfirmRun(true)}
                          disabled={runMutation.isPending}
                        >
                          <Play className="h-3.5 w-3.5 me-1.5" />
                          Execute Maintenance
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dataset selector + manual run */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Archive Configuration
                  </CardTitle>
                  <CardDescription>
                    Select which datasets to include. Records older than the threshold will be snapshotted to secure cloud storage. Original data is preserved in the database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ALL_DATASETS.map(ds => {
                      const checked = selectedDatasets.includes(ds.id);
                      return (
                        <label
                          key={ds.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors select-none",
                            checked
                              ? "border-primary/50 bg-primary/5 dark:border-primary/30"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleDataset(ds.id)}
                          />
                          <ds.Icon className={cn("h-4 w-4 shrink-0", checked ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-sm font-medium leading-tight">{ds.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="w-full sm:w-48 shrink-0">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Older than (days)
                      </Label>
                      <Input
                        type="number"
                        min={7}
                        max={365}
                        value={olderThanDays}
                        onChange={e => setOlderThanDays(Number(e.target.value))}
                        className="h-9 w-full"
                      />
                    </div>
                    <Button
                      onClick={() => setConfirmRun(true)}
                      disabled={runMutation.isPending || selectedDatasets.length === 0}
                      className="w-full sm:w-auto"
                    >
                      {runMutation.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin me-1.5" />Archiving…</>
                        : <><Play className="h-4 w-4 me-1.5" />Run Archive Now</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Run history */}
              {status.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Run History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {status.logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/40 gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge className={cn("text-xs shrink-0", statusColor(log.status))}>
                              {log.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground truncate">
                              {formatDate(log.runAt)}
                            </span>
                            {log.triggeredBy && (
                              <span className="text-xs text-muted-foreground/60 hidden sm:block">
                                by {log.triggeredBy}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {log.recordsArchived > 0 && (
                              <span className="text-xs font-medium text-muted-foreground">
                                {log.recordsArchived.toLocaleString()} records
                              </span>
                            )}
                            {log.notes && (
                              <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[240px]">
                                {log.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── ARCHIVE BROWSER TAB ─────────────────────────────────────────── */}
        <TabsContent value="browser" className="mt-4 space-y-4">
          {/* Search & filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by dataset or period…"
                className="ps-9 h-9"
              />
            </div>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All periods</option>
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {archivesQ.isLoading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading archives…
            </div>
          )}

          {!archivesQ.isLoading && filteredArchives.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Archive className="h-10 w-10 opacity-30" />
                <p className="font-medium">No archives found</p>
                <p className="text-sm text-center max-w-xs">
                  {archives.length === 0
                    ? "Run an archiving job from the Health Monitor tab to create your first archive snapshot."
                    : "No archives match your search."}
                </p>
              </CardContent>
            </Card>
          )}

          {filteredArchives.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredArchives.map(archive => {
                    const ds = ALL_DATASETS.find(d => d.id === archive.dataset);
                    return (
                      <div
                        key={archive.key}
                        className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors group flex-wrap"
                      >
                        <div className="rounded-md bg-muted p-2 shrink-0">
                          <FileJson className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              {ds ? <ds.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : null}
                              {ds?.label ?? archive.dataset}
                            </span>
                            <Badge variant="outline" className="text-xs">{archive.period}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(archive.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatBytes(archive.size)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewArchive(archive)}
                          >
                            <Eye className="h-3.5 w-3.5 me-1.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreMutation.mutate(archive.key)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5 me-1.5" />
                            Restore
                          </Button>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Confirm Execute Dialog ─────────────────────────────────────────── */}
      <Dialog open={confirmRun} onOpenChange={setConfirmRun}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Execute Maintenance Archive
            </DialogTitle>
            <DialogDescription>
              This will snapshot the following datasets (records older than {olderThanDays} days) to secure cloud storage. Original data is preserved — nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {selectedDatasets.map(id => {
              const ds = ALL_DATASETS.find(d => d.id === id);
              return (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="flex items-center gap-1.5">
                    {ds ? <ds.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : null}
                    {ds?.label}
                  </span>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRun(false)}>Cancel</Button>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin me-1.5" />Archiving…</>
                : <><Play className="h-4 w-4 me-1.5" />Confirm & Execute</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Snooze Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="h-5 w-5" />
              Remind Me Later
            </DialogTitle>
            <DialogDescription>
              Choose how many days to snooze this maintenance alert. You'll receive another notification when the period expires.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-sm text-muted-foreground mb-2 block">Snooze duration (days)</Label>
            <div className="flex gap-2 flex-wrap">
              {[7, 14, 30, 60].map(d => (
                <Button
                  key={d}
                  variant={snoozeDays === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSnoozeDays(d)}
                >
                  {d} days
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              max={180}
              value={snoozeDays}
              onChange={e => setSnoozeDays(Number(e.target.value))}
              className="mt-3 h-9 w-32"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeOpen(false)}>Cancel</Button>
            <Button
              onClick={() => snoozeMutation.mutate(snoozeDays)}
              disabled={snoozeMutation.isPending}
            >
              {snoozeMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin me-1.5" />Snoozing…</>
                : <><BellOff className="h-4 w-4 me-1.5" />Snooze {snoozeDays} Days</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Archive Preview Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!previewArchive} onOpenChange={(o) => !o && setPreviewArchive(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              {previewArchive
                ? (ALL_DATASETS.find(d => d.id === previewArchive.dataset)?.label ?? previewArchive.dataset)
                : "Archive Preview"}
            </DialogTitle>
            {previewArchive && (
              <DialogDescription>
                Period: {previewArchive.period} · Archived: {formatDate(previewArchive.createdAt)} · Size: {formatBytes(previewArchive.size)}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {previewQ.isLoading && (
              <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading archive…
              </div>
            )}

            {previewQ.data && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium">{previewQ.data.count.toLocaleString()} records</span>
                  <span>·</span>
                  <span>Archived: {formatDate(previewQ.data.archivedAt)}</span>
                </div>
                <div className="rounded-lg border overflow-auto max-h-72 bg-muted/20">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        {previewQ.data.records[0]
                          ? Object.keys(previewQ.data.records[0]).slice(0, 8).map(col => (
                              <th key={col} className="px-3 py-2 text-start font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                            ))
                          : <th className="px-3 py-2">No data</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewQ.data.records.slice(0, 50).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {Object.entries(row).slice(0, 8).map(([k, v]) => (
                            <td key={k} className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[160px] truncate">
                              {v === null ? <span className="opacity-40">null</span> : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewQ.data.count > 50 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                      Showing 50 of {previewQ.data.count} records
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPreviewArchive(null)}>Close</Button>
            {previewArchive && (
              <Button
                onClick={() => restoreMutation.mutate(previewArchive.key)}
                disabled={restoreMutation.isPending}
              >
                {restoreMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin me-1.5" />Processing…</>
                  : <><RotateCcw className="h-4 w-4 me-1.5" />Flag for Restoration</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
