import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Inbox, Search, Zap, Droplets, Wind, Brush, Volume2, Users, DoorOpen,
  Clock, Loader2, CheckCircle2, Play, Filter
} from "lucide-react";

type GuestRequest = {
  id: number;
  roomId: number;
  type: string;
  description: string;
  status: "new" | "in_progress" | "resolved";
  refCode: string;
  createdAt: string;
  unitName: string | null;
  propertyName: string | null;
};

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  electrical: Zap, plumbing: Droplets, ac: Wind,
  cleaning: Brush, noise: Volume2, visitor: Users, other: DoorOpen,
};
const TYPE_COLOR: Record<string, string> = {
  electrical: "text-yellow-500", plumbing: "text-blue-500", ac: "text-cyan-500",
  cleaning: "text-green-500", noise: "text-orange-500", visitor: "text-purple-500", other: "text-slate-500",
};
const STATUS_BADGE: Record<string, string> = {
  new: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
  resolved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
};

export default function GuestRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests, isLoading } = useQuery<GuestRequest[]>({
    queryKey: ["guest-requests"],
    queryFn: () => fetch("/api/guest/requests", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/guest/requests/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-requests"] });
      toast({ title: t("guestRequests.statusUpdated") });
    },
    onError: () => toast({ title: t("guestRequests.updateFailed"), variant: "destructive" }),
  });

  const filtered = requests?.filter(r => {
    const matchSearch = !search ||
      r.unitName?.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.refCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    new: requests?.filter(r => r.status === "new").length || 0,
    in_progress: requests?.filter(r => r.status === "in_progress").length || 0,
    resolved: requests?.filter(r => r.status === "resolved").length || 0,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
          {t("guestRequests.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("guestRequests.subtitle")}</p>
      </div>

      {/* Status KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "new",         label: t("guestRequests.new"),        icon: Clock,        color: "text-red-600",   bg: "bg-red-50 dark:bg-red-950"   },
          { key: "in_progress", label: t("guestRequests.inProgress"), icon: Loader2,      color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
          { key: "resolved",    label: t("guestRequests.resolved"),   icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
        ].map(({ key, label, icon: Icon, color, bg }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={`text-left p-4 rounded-xl border border-border ${statusFilter === key ? "ring-2 ring-primary ring-offset-1 bg-card" : "bg-card"}`}
          >
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-foreground">{counts[key as keyof typeof counts]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border">
        <div className="p-4 border-b border-border bg-muted flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("guestRequests.searchPlaceholder")}
              className="ps-8 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-background">
              <Filter className="me-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t("guestRequests.statusFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("guestRequests.allStatuses")}</SelectItem>
              <SelectItem value="new">{t("guestRequests.new")}</SelectItem>
              <SelectItem value="in_progress">{t("guestRequests.inProgress")}</SelectItem>
              <SelectItem value="resolved">{t("guestRequests.resolved")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filtered?.length ? (
            <div className="py-16 text-center">
              <Inbox className="mx-auto text-muted-foreground/30 mb-3" size={40} />
              <p className="font-medium text-muted-foreground">{t("guestRequests.noRequests")}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t("guestRequests.noRequestsDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map(req => {
                const Icon = TYPE_ICONS[req.type] || DoorOpen;
                const iconColor = TYPE_COLOR[req.type] || "text-slate-500";
                const typeLabel = t(`guestRequests.typeLabel.${req.type}`, { defaultValue: req.type });
                const statusLabel = t(`guestRequests.statusLabel.${req.status}`, { defaultValue: req.status });
                return (
                  <div key={req.id} className="p-4 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{typeLabel}</span>
                        <Badge className={`border text-[10px] font-semibold ${STATUS_BADGE[req.status]}`}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{req.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground/70 flex-wrap">
                        <span>🏠 {req.unitName || `Unit #${req.roomId}`}</span>
                        {req.propertyName && <span>🏢 {req.propertyName}</span>}
                        <span>🔖 {req.refCode}</span>
                        <span>🕐 {formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {req.status === "new" && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          onClick={() => updateStatus.mutate({ id: req.id, status: "in_progress" })}
                          disabled={updateStatus.isPending}
                        >
                          <Play size={11} className="me-1" /> {t("guestRequests.startWork")}
                        </Button>
                      )}
                      {req.status !== "resolved" && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => updateStatus.mutate({ id: req.id, status: "resolved" })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 size={11} className="me-1" /> {t("guestRequests.markResolved")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
