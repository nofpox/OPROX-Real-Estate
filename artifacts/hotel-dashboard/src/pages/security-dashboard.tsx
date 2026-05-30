import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListActiveSessions,
  useKillSwitchUser,
  useListUsers,
  getListActiveSessionsQueryKey,
  getListUsersQueryKey,
  type ActiveSession,
  type PmsUser,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ShieldOff, Users, Wifi, WifiOff, RefreshCw,
  Zap, UserCheck, UserX, Lock, AlertTriangle, Activity,
  ChevronRight, Eye,
} from "lucide-react";

// ─── Role tier helpers ─────────────────────────────────────────────────────────

function roleTier(role: string): "admin" | "supervisor" | "worker" {
  if (role === "owner" || role === "admin" || role === "manager") return "admin";
  if (role === "front-desk" || role === "security-officer") return "supervisor";
  return "worker";
}

const TIER_STYLES = {
  admin:      { label: "Admin",      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"       },
  supervisor: { label: "Supervisor", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  worker:     { label: "Worker",     cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"   },
};

function TierBadge({ role }: { role: string }) {
  const tier = roleTier(role);
  const { label, cls } = TIER_STYLES[tier];
  return (
    <Badge variant="secondary" className={`text-[10px] shrink-0 ${cls}`}>
      {label}
    </Badge>
  );
}

function InitialAvatar({ name, cls }: { name: string; cls: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
      {initials}
    </div>
  );
}

// ─── Security log fetcher ──────────────────────────────────────────────────────

function useSecurityLog() {
  const [entries, setEntries] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchLog = React.useCallback(() => {
    setLoading(true);
    fetch("/api/auth/security-log", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => { setEntries(d.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchLog(); }, [fetchLog]);
  return { entries, loading, refetch: fetchLog };
}

// ─── Confirm kill-switch dialog ───────────────────────────────────────────────

interface KillConfirmProps {
  target: { id: number; displayName: string; role: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function KillConfirmDialog({ target, onConfirm, onCancel, isPending }: KillConfirmProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={!!target}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Zap className="h-5 w-5" />
            {t("securityDashboard.killSwitchTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t("securityDashboard.killDesc1a")} <strong>{t("securityDashboard.killDesc1b")}</strong>{" "}
              <strong>{target?.displayName}</strong> {t("securityDashboard.killDesc1c")}
            </span>
            <span className="block text-destructive/80 text-sm">
              {t("securityDashboard.killDesc2")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? t("securityDashboard.deactivating") : t("securityDashboard.deactivateNow")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Active sessions panel ────────────────────────────────────────────────────

function SessionsPanel({
  sessions,
  loading,
  currentUserId,
  onKill,
}: {
  sessions: ActiveSession[];
  loading: boolean;
  currentUserId: number;
  onKill: (s: { id: number; displayName: string; role: string }) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wifi className="h-4 w-4 text-emerald-500" />
          {t("securityDashboard.activeSessions")}
          <Badge variant="secondary" className="ms-auto text-xs">
            {sessions.length} {t("securityDashboard.onlineSuffix")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <WifiOff className="h-8 w-8 opacity-25" />
            <p className="text-sm">{t("securityDashboard.noActiveSessions")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const isMe = s.userId === currentUserId;
              const tier = roleTier(s.role);
              const avatarCls =
                tier === "admin"      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                tier === "supervisor" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
              return (
                <div
                  key={s.sessionKey}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="relative">
                    <InitialAvatar name={s.displayName} cls={avatarCls} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.displayName}
                      {isMe && <span className="ms-1 text-[10px] text-muted-foreground">({t("securityDashboard.you")})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{s.username} · {s.role}</p>
                  </div>
                  <TierBadge role={s.role} />
                  {!isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={() => onKill({ id: s.userId, displayName: s.displayName, role: s.role })}
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Security log panel ───────────────────────────────────────────────────────

function SecurityLogPanel() {
  const { t } = useTranslation();
  const { entries, loading, refetch } = useSecurityLog();

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {t("securityDashboard.securityEvents")}
          <Button variant="ghost" size="icon" className="h-6 w-6 ms-auto" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Lock className="h-8 w-8 opacity-25" />
            <p className="text-sm">{t("securityDashboard.noSecurityEvents")}</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {entries.slice(0, 50).map((e, i) => {
              const evt = String(e.event ?? e.raw ?? "unknown");
              const isFailure = evt.includes("fail") || evt.includes("lock") || evt.includes("block");
              const isSuccess = evt.includes("success") || evt.includes("login");
              return (
                <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-border/30 last:border-0">
                  {isFailure
                    ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    : isSuccess
                    ? <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize">{evt.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {String(e.username ?? e.ip ?? "")}
                      {e.timestamp ? ` · ${new Date(String(e.timestamp)).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useListActiveSessions();
  const { data: usersData, isLoading: usersLoading } = useListUsers();

  const [killTarget, setKillTarget] = useState<{ id: number; displayName: string; role: string } | null>(null);
  const [reactivating, setReactivating] = useState<number | null>(null);

  const killSwitch = useKillSwitchUser({
    mutation: {
      onSuccess: (user) => {
        toast({
          title: t("securityDashboard.killActivated"),
          description: t("securityDashboard.killActivatedDesc", { name: user.displayName }),
        });
        qc.invalidateQueries({ queryKey: getListActiveSessionsQueryKey() });
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setKillTarget(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? t("securityDashboard.deactivateFailed");
        toast({ variant: "destructive", title: t("securityDashboard.killFailed"), description: msg });
        setKillTarget(null);
      },
    },
  });

  const activeSessions = sessionsData?.sessions ?? [];
  const users: PmsUser[] = usersData ?? [];
  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  const meSession = activeSessions[0];
  const currentUserId = meSession?.userId ?? -1;

  const handleKillConfirm = () => {
    if (killTarget) killSwitch.mutate({ id: killTarget.id });
  };

  const handleReactivate = async (user: PmsUser) => {
    setReactivating(user.id);
    try {
      const resp = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: true }),
      });
      if (!resp.ok) throw new Error("Request failed");
      toast({
        title: t("securityDashboard.userReactivated"),
        description: t("securityDashboard.userReactivatedDesc", { name: user.displayName }),
      });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch {
      toast({ variant: "destructive", title: t("securityDashboard.reactivateFailed") });
    } finally {
      setReactivating(null);
    }
  };

  const kpiCards = [
    { label: t("securityDashboard.totalUsers"),     value: users.length,          icon: Users,     color: "text-primary",    bg: "bg-primary/10"     },
    { label: t("securityDashboard.onlineNow"),      value: activeSessions.length,  icon: Wifi,      color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: t("securityDashboard.activeAccounts"), value: activeUsers.length,     icon: UserCheck, color: "text-blue-500",   bg: "bg-blue-500/10"    },
    { label: t("securityDashboard.deactivated"),    value: inactiveUsers.length,   icon: UserX,     color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            {t("securityDashboard.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("securityDashboard.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchSessions()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* ── KPI cards — plain divs, no Card/shadow/Skeleton/animation ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} style={{ flex: "1 1 120px", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px", background: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className={`p-2 rounded-lg shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                    {sessionsLoading || usersLoading ? "—" : kpi.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{kpi.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sessions + Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SessionsPanel
          sessions={activeSessions}
          loading={sessionsLoading}
          currentUserId={currentUserId}
          onKill={setKillTarget}
        />
        <SecurityLogPanel />
      </div>

      {/* ── All Users table ── */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t("securityDashboard.allUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-0">
          {usersLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {users.map((u) => {
                const tier = roleTier(u.role);
                const isOnline = activeSessions.some((s) => s.userId === u.id);
                const isMe = u.id === currentUserId;
                const avatarCls =
                  tier === "admin"      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  tier === "supervisor" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                return (
                  <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="relative shrink-0">
                      <InitialAvatar name={u.displayName} cls={avatarCls} />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{u.displayName}</p>
                        {isMe && <span className="text-[10px] text-muted-foreground">({t("securityDashboard.you")})</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">@{u.username} · {u.role}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <TierBadge role={u.role} />

                      {isOnline
                        ? <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                            <Eye className="h-2.5 w-2.5" />{t("securityDashboard.online")}
                          </Badge>
                        : u.isActive
                        ? <Badge variant="secondary" className="text-[10px]">{t("securityDashboard.offline")}</Badge>
                        : <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive gap-1">
                            <ShieldOff className="h-2.5 w-2.5" />{t("securityDashboard.blocked")}
                          </Badge>
                      }

                      {!isMe && u.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setKillTarget({ id: u.id, displayName: u.displayName, role: u.role })}
                        >
                          <Zap className="h-3 w-3 me-1" />
                          {t("securityDashboard.kill")}
                        </Button>
                      )}

                      {!u.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => handleReactivate(u)}
                          disabled={reactivating === u.id}
                        >
                          <UserCheck className="h-3 w-3 me-1" />
                          {t("securityDashboard.reactivate")}
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

      {/* ── Kill switch confirmation ── */}
      <KillConfirmDialog
        target={killTarget}
        onConfirm={handleKillConfirm}
        onCancel={() => setKillTarget(null)}
        isPending={killSwitch.isPending}
      />

    </div>
  );
}
