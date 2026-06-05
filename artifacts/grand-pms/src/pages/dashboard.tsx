import { useTranslation } from "react-i18next";
import { useListProperties, useListRooms, useListTasks } from "@/lib/local-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle2, Clock, Loader2, Wrench } from "lucide-react";
import { Link } from "wouter";
import { HelpGuideButton } from "@/components/help-guide-modal";

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  accent: string;
  href?: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, accent, href, loading }: StatCardProps) {
  const content = (
    <Card className="border border-border shadow-none hover:shadow-sm transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-2 rounded-md ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold text-foreground">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: properties, isLoading: propsLoading } = useListProperties();
  const { data: rooms,      isLoading: roomsLoading  } = useListRooms();
  const { data: tasks,      isLoading: tasksLoading  } = useListTasks();

  const allProperties = properties ?? [];
  const allRooms      = rooms      ?? [];
  const allTasks      = (tasks as any[] | undefined) ?? [];

  // Asset counts
  const totalAssets  = allProperties.length;
  const activeAssets = allProperties.filter((p: any) => p.status === "active").length;
  const underMaint   = allRooms.filter((r: any) => r.status === "maintenance").length;

  // Task counts
  const pending    = allTasks.filter((t: any) => t.status === "pending").length;
  const inProgress = allTasks.filter((t: any) => t.status === "in-progress").length;
  const completed  = allTasks.filter((t: any) => t.status === "completed").length;

  const assetsLoading = propsLoading || roomsLoading;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.overviewSubtitle")}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          <HelpGuideButton />
        </div>
      </div>

      {/* Asset Summary */}
      <section className="space-y-3">
        <SectionHeading>{t("dashboard.assetSummary")}</SectionHeading>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={t("dashboard.totalAssets")}
            value={totalAssets}
            icon={Building2}
            accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            href="/properties"
            loading={assetsLoading}
          />
          <StatCard
            label={t("dashboard.active")}
            value={activeAssets}
            icon={CheckCircle2}
            accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            href="/properties"
            loading={assetsLoading}
          />
          <StatCard
            label={t("dashboard.underMaintenance")}
            value={underMaint}
            icon={Wrench}
            accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            href="/maintenance"
            loading={assetsLoading}
          />
        </div>
      </section>

      {/* Task Summary */}
      <section className="space-y-3">
        <SectionHeading>{t("dashboard.taskSummary")}</SectionHeading>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={t("dashboard.pending")}
            value={pending}
            icon={Clock}
            accent="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            href="/tasks"
            loading={tasksLoading}
          />
          <StatCard
            label={t("dashboard.inProgress")}
            value={inProgress}
            icon={Loader2}
            accent="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            href="/tasks"
            loading={tasksLoading}
          />
          <StatCard
            label={t("dashboard.completed")}
            value={completed}
            icon={CheckCircle2}
            accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            href="/tasks"
            loading={tasksLoading}
          />
        </div>
      </section>

    </div>
  );
}
