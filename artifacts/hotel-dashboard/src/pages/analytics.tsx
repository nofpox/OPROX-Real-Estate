import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useListTasks, useListStaff, useListProperties } from "@workspace/api-client-react";
import { useRole } from "@/contexts/role-context";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Clock, AlertCircle, TrendingUp, Download,
  Printer, Building2, Users, BadgeCheck, Target,
  Timer, BarChart3, ListChecks,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ───────────────────────────────────────────────────────────────────

type RGB = [number, number, number];
const PALETTE = {
  dark:    [15,  23, 42]  as RGB,
  mid:     [51,  65, 85]  as RGB,
  muted:   [100,116,139]  as RGB,
  light:   [241,245,249]  as RGB,
  white:   [255,255,255]  as RGB,
  green:   [22, 163, 74]  as RGB,
  amber:   [217,119,  6]  as RGB,
  blue:    [59, 130,246]  as RGB,
  red:     [220, 38, 38]  as RGB,
  violet:  [124, 58,237]  as RGB,
  primary: [245,158, 11]  as RGB,
};

const CHART_COLORS = {
  completed:  "#22c55e",
  inProgress: "#f59e0b",
  pending:    "#94a3b8",
  late:       "#ef4444",
  avg:        "#6366f1",
};

function todayStr() { return new Date().toISOString().split("T")[0]; }

function isLate(task: any): boolean {
  if (!task.dueDate) return false;
  if (task.status === "completed" || task.status === "verified") return false;
  return task.dueDate < todayStr();
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "); }

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return iso; }
}

// ── PDF generator ─────────────────────────────────────────────────────────────

function generateAnalyticsPdf(opts: {
  totalTasks: number; completed: number; inProgress: number; late: number;
  compRate: number; chartData: any[];
  staffRows: { name: string; role: string; total: number; completed: number; inProgress: number; rate: number }[];
  propertyRows: { name: string; total: number; completed: number; rate: number }[];
  generatedBy: string;
  companyName?: string;
}) {
  const { totalTasks, completed, inProgress, late, compRate, chartData, staffRows, propertyRows, generatedBy, companyName = "Company" } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 14, MR = 14, CW = W - ML - MR;

  // Cover band
  doc.setFillColor(...PALETTE.dark);
  doc.rect(0, 0, W, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PALETTE.white);
  doc.text(companyName, ML, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.primary);
  doc.text("COMPANY PERFORMANCE REPORT", ML, 25);
  doc.setDrawColor(...PALETTE.primary);
  doc.setLineWidth(0.7);
  doc.line(ML, 28, ML + 70, 28);
  doc.setTextColor(...PALETTE.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${fmtDate(new Date().toISOString())}`, W - MR, 20, { align: "right" });
  doc.text(`By: ${generatedBy}`,                              W - MR, 26, { align: "right" });

  let y = 52;

  // KPI cards
  const kpis = [
    { label: "Total Tasks",      value: String(totalTasks), color: PALETTE.blue    },
    { label: "Completed",        value: String(completed),  color: PALETTE.green   },
    { label: "In Progress",      value: String(inProgress), color: PALETTE.amber   },
    { label: "Late",             value: String(late),       color: PALETTE.red     },
    { label: "Completion Rate",  value: `${compRate.toFixed(1)}%`, color: PALETTE.violet },
  ];
  const kW = (CW - 12) / 5;
  kpis.forEach((k, i) => {
    const x = ML + i * (kW + 3);
    doc.setFillColor(...PALETTE.light);
    doc.roundedRect(x, y, kW, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...k.color);
    doc.text(k.value, x + kW / 2, y + 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.muted);
    doc.text(k.label.toUpperCase(), x + kW / 2, y + 17, { align: "center" });
  });
  y += 28;

  // 30-day section header
  doc.setFillColor(...PALETTE.dark);
  doc.rect(ML, y, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.white);
  doc.text("30-DAY COMPLETION TREND", ML + 3, y + 4.8);
  y += 10;

  // Simplified bar chart (one row of bars)
  const maxVal = Math.max(...chartData.map((d) => d.completed), 1);
  const barW   = CW / chartData.length;
  const chartH = 28;
  chartData.forEach((d, i) => {
    const bh = (d.completed / maxVal) * chartH;
    const x  = ML + i * barW;
    doc.setFillColor(...(d.completed > 0 ? PALETTE.green : PALETTE.light));
    doc.rect(x + barW * 0.1, y + (chartH - bh), barW * 0.8, bh, "F");
  });
  // X-axis labels (every 5 days)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PALETTE.muted);
  chartData.forEach((d, i) => {
    if (i % 5 === 0) {
      const x = ML + i * barW + barW / 2;
      doc.text(d.shortDate, x, y + chartH + 4, { align: "center" });
    }
  });
  y += chartH + 10;

  // Property performance
  if (propertyRows.length > 0) {
    doc.setFillColor(...PALETTE.dark);
    doc.rect(ML, y, CW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.white);
    doc.text("PROPERTY PERFORMANCE", ML + 3, y + 4.8);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [["Property", "Total Tasks", "Completed", "Completion Rate"]],
      body: propertyRows.map((r) => [r.name, r.total, r.completed, `${r.rate.toFixed(1)}%`]),
      headStyles: { fillColor: PALETTE.mid, textColor: PALETTE.white, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: PALETTE.dark },
      alternateRowStyles: { fillColor: [248, 250, 252] as RGB },
      columnStyles: { 3: { fontStyle: "bold" } },
      didParseCell(d) {
        if (d.section !== "body" || d.column.index !== 3) return;
        const v = parseFloat(String(d.cell.raw));
        d.cell.styles.textColor = v >= 80 ? PALETTE.green : v >= 50 ? PALETTE.amber : PALETTE.red;
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Staff table
  if (y + 40 > H - 16) { doc.addPage(); y = 20; }

  doc.setFillColor(...PALETTE.dark);
  doc.rect(ML, y, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.white);
  doc.text("STAFF ACTIVITY", ML + 3, y + 4.8);
  doc.text(`${staffRows.length} staff`, W - MR, y + 4.8, { align: "right" });
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [["Name", "Role", "Assigned", "Completed", "In Progress", "Rate"]],
    body: staffRows.map((r) => [r.name, cap(r.role), r.total, r.completed, r.inProgress, `${r.rate.toFixed(1)}%`]),
    headStyles: { fillColor: PALETTE.mid, textColor: PALETTE.white, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: PALETTE.dark },
    alternateRowStyles: { fillColor: [248, 250, 252] as RGB },
    columnStyles: { 5: { fontStyle: "bold" } },
    didParseCell(d) {
      if (d.section !== "body" || d.column.index !== 5) return;
      const v = parseFloat(String(d.cell.raw));
      d.cell.styles.textColor = v >= 80 ? PALETTE.green : v >= 50 ? PALETTE.amber : PALETTE.red;
    },
  });

  // Page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...PALETTE.light);
    doc.setLineWidth(0.3);
    doc.line(ML, H - 12, W - MR, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.muted);
    doc.text(`${companyName} — Confidential`, ML, H - 8);
    doc.text(`Page ${p} of ${total}`, W / 2, H - 8, { align: "center" });
    doc.text(new Date().getFullYear().toString(), W - MR, H - 8, { align: "right" });
  }

  doc.save(`performance-report-${todayStr()}.pdf`);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, iconCls, trend,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; iconCls: string; trend?: { value: number; label: string };
}) {
  return (
    <Card className="shadow-none border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <span className={`h-8 w-8 rounded-full flex items-center justify-center ${iconCls}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            <TrendingUp className={`h-3 w-3 ${trend.value < 0 ? "rotate-180" : ""}`} />
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Report Status Donut data ──────────────────────────────────────────────────

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { t }        = useTranslation();
  const { role }     = useRole();
  const settings     = useSettings();
  const [activeTab, setActiveTab] = useState<"overview" | "operational">("overview");

  const { data: tasks = [],      isLoading: tasksLoading }      = useListTasks({}) as { data: any[]; isLoading: boolean };
  const { data: staff = [],      isLoading: staffLoading }      = useListStaff({})  as { data: any[]; isLoading: boolean };
  const { data: properties = [], isLoading: propsLoading }      = useListProperties() as { data: any[]; isLoading: boolean };

  const { data: opStats, isLoading: opLoading } = useQuery({
    queryKey: ["stats", "operational"],
    queryFn: () => fetch("/api/stats/operational").then(r => r.json()),
    staleTime: 60_000,
  });

  const isLoading = tasksLoading || staffLoading || propsLoading;

  // ── KPI computations ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total      = tasks.length;
    const completed  = tasks.filter((t) => t.status === "completed" || t.status === "verified").length;
    const verified   = tasks.filter((t) => t.status === "verified").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const pending    = tasks.filter((t) => t.status === "pending").length;
    const late       = tasks.filter(isLate).length;
    const compRate   = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, verified, inProgress, pending, late, compRate };
  }, [tasks]);

  // ── 30-day chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });

    const raw = days.map((date) => ({
      date,
      shortDate: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: tasks.filter((t) => t.completedAt?.startsWith(date)).length,
      created:   tasks.filter((t) => t.createdAt?.startsWith(date)).length,
    }));

    // 7-day rolling average
    return raw.map((d, i) => {
      const window = raw.slice(Math.max(0, i - 6), i + 1);
      const avg    = window.reduce((s, w) => s + w.completed, 0) / window.length;
      return { ...d, avg: Math.round(avg * 10) / 10 };
    });
  }, [tasks]);

  // ── Report status mix ─────────────────────────────────────────────────────
  const reportStatusData = useMemo(() => {
    const counts = { submitted: 0, escalated: 0, approved: 0, rejected: 0 };
    for (const t of tasks) {
      if (t.reportStatus && t.reportStatus !== "none") {
        counts[t.reportStatus as keyof typeof counts] = (counts[t.reportStatus as keyof typeof counts] ?? 0) + 1;
      }
    }
    return [
      { name: "Submitted",            value: counts.submitted, color: "#3b82f6" },
      { name: "Reviewed by Supervisor",value: counts.escalated, color: "#f59e0b" },
      { name: "Approved by Manager",   value: counts.approved,  color: "#22c55e" },
      { name: "Rejected",              value: counts.rejected,  color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  // ── Property performance ──────────────────────────────────────────────────
  const propertyRows = useMemo(() => {
    return (properties ?? []).map((prop: any) => {
      const ptasks    = tasks.filter((t) => t.propertyId === prop.id);
      const pcomp     = ptasks.filter((t) => t.status === "completed" || t.status === "verified").length;
      const pProgress = ptasks.filter((t) => t.status === "in-progress").length;
      const rate      = ptasks.length > 0 ? (pcomp / ptasks.length) * 100 : 0;
      return { id: prop.id, name: prop.name, total: ptasks.length, completed: pcomp, inProgress: pProgress, rate };
    }).sort((a: any, b: any) => b.total - a.total);
  }, [tasks, properties]);

  // ── Staff activity ─────────────────────────────────────────────────────────
  const staffRows = useMemo(() => {
    const staffById = Object.fromEntries((staff ?? []).map((s: any) => [s.id, s]));
    const map: Record<number, { id: number; name: string; role: string; total: number; completed: number; inProgress: number }> = {};

    for (const task of tasks) {
      const sid = task.assignedToId;
      if (!sid) continue;
      if (!map[sid]) {
        const s = staffById[sid] as any;
        map[sid] = { id: sid, name: s?.name ?? "Unknown", role: s?.role ?? "—", total: 0, completed: 0, inProgress: 0 };
      }
      map[sid].total++;
      if (task.status === "completed" || task.status === "verified") map[sid].completed++;
      if (task.status === "in-progress") map[sid].inProgress++;
    }

    return Object.values(map)
      .map((r) => ({ ...r, rate: r.total > 0 ? (r.completed / r.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [tasks, staff]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const t of tasks) cats[t.category] = (cats[t.category] ?? 0) + 1;
    return Object.entries(cats)
      .map(([name, value]) => ({ name: cap(name), value }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExportPdf() {
    generateAnalyticsPdf({
      totalTasks:   kpis.total,
      completed:    kpis.completed,
      inProgress:   kpis.inProgress,
      late:         kpis.late,
      compRate:     kpis.compRate,
      chartData,
      staffRows,
      propertyRows,
      generatedBy:  role.label,
      companyName:  settings.companyName || settings.logoText || "Company",
    });
  }

  function handlePrint() {
    window.print();
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-none"><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold font-serif text-foreground">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("analytics.subtitle")} · {fmtDate(new Date().toISOString())}
          </p>
        </div>
        {activeTab === "overview" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="me-2 h-4 w-4" />{t("analytics.print")}
            </Button>
            <Button size="sm" onClick={handleExportPdf}>
              <Download className="me-2 h-4 w-4" />{t("analytics.exportPdf")}
            </Button>
          </div>
        )}
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────────── */}
      <div className="flex border-b border-border gap-0 print:hidden">
        {([
          { id: "overview",    label: t("analytics.overview"),    icon: BarChart3  },
          { id: "operational", label: t("analytics.operational"), icon: ListChecks },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Section 1: KPI Cards ───────────────────────────────────────────── */}
      {activeTab === "overview" && (<>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <KpiCard
          icon={Target}
          label={t("analytics.kpi.totalTasks")}
          value={kpis.total}
          sub={`${kpis.pending} ${t("analytics.kpi.pending")}`}
          iconCls="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label={t("analytics.kpi.completed")}
          value={kpis.completed}
          sub={`${kpis.compRate.toFixed(1)}% ${t("analytics.kpi.compRate")}`}
          iconCls="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <KpiCard
          icon={Clock}
          label={t("analytics.kpi.inProgress")}
          value={kpis.inProgress}
          sub={`${kpis.verified} ${t("analytics.kpi.verified")}`}
          iconCls="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <KpiCard
          icon={AlertCircle}
          label={t("analytics.kpi.lateOverdue")}
          value={kpis.late}
          sub={kpis.late === 0 ? t("analytics.kpi.allOnTime") : t("analytics.kpi.pastDueDate")}
          iconCls={kpis.late > 0
            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            : "bg-slate-100 text-slate-500"
          }
        />
      </div>

      {/* ── Completion Rate progress bar ───────────────────────────────────── */}
      <Card className="shadow-none border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">{t("analytics.completionRate")}</p>
            <span className="text-2xl font-bold text-foreground">{kpis.compRate.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${kpis.compRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex gap-4 flex-wrap">
              {[
                { label: t("analytics.kpi.completed"),  val: kpis.completed,  cls: "bg-emerald-500" },
                { label: t("analytics.kpi.inProgress"), val: kpis.inProgress, cls: "bg-amber-400"   },
                { label: t("tasks.status.pending"),     val: kpis.pending,    cls: "bg-slate-300"   },
                { label: t("analytics.kpi.lateOverdue"), val: kpis.late,      cls: "bg-red-500"     },
              ].map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${s.cls}`} />
                  {s.label}: <strong className="text-foreground">{s.val}</strong>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{kpis.total} total tasks</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: 30-day chart + Report status donut ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Main chart — takes 2/3 */}
        <Card className="shadow-none border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">30-Day Completion Trend</CardTitle>
            <p className="text-xs text-muted-foreground -mt-1">Tasks completed per day with 7-day rolling average</p>
          </CardHeader>
          <CardContent className="pt-0">
            {chartData.every((d) => d.completed === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="h-8 w-8 opacity-30" />
                <p className="text-sm">No completed tasks in the last 30 days</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cgCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_COLORS.completed} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.completed} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false} axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false} axisLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
                  />
                  <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.completed} radius={[3, 3, 0, 0]} maxBarSize={20} fillOpacity={0.85} />
                  <Line dataKey="avg" name="7-day avg" stroke={CHART_COLORS.avg} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Report status donut — takes 1/3 */}
        <Card className="shadow-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Report Status Mix</CardTitle>
            <p className="text-xs text-muted-foreground -mt-1">Tasks with submitted reports</p>
          </CardHeader>
          <CardContent className="pt-0">
            {reportStatusData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <BadgeCheck className="h-8 w-8 opacity-30" />
                <p className="text-sm text-center">No reports submitted yet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={reportStatusData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reportStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {reportStatusData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3: Property performance ───────────────────────────────── */}
      {propertyRows.length > 0 && (
        <Card className="shadow-none border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Property Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {propertyRows.map((prop: any) => (
                <div key={prop.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{prop.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{prop.completed}/{prop.total} tasks</span>
                      <span className={`font-semibold tabular-nums ${
                        prop.rate >= 80 ? "text-emerald-600" : prop.rate >= 50 ? "text-amber-600" : "text-red-500"
                      }`}>{prop.rate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prop.rate >= 80 ? "bg-emerald-500" : prop.rate >= 50 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${prop.rate}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{prop.completed} completed</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{prop.inProgress} in progress</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Active Staff ────────────────────────────────────────── */}
      <Card className="shadow-none border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Active Staff by Workload</CardTitle>
            <Badge variant="outline" className="ms-auto text-xs">{staffRows.length} staff</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {staffRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assigned tasks found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="pb-2 text-start font-medium">Name</th>
                    <th className="pb-2 text-start font-medium">Department</th>
                    <th className="pb-2 text-center font-medium">Assigned</th>
                    <th className="pb-2 text-center font-medium">Completed</th>
                    <th className="pb-2 text-center font-medium">In Progress</th>
                    <th className="pb-2 text-end font-medium w-32">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 font-medium text-foreground">{row.name}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-normal capitalize">
                          {row.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-center tabular-nums">{row.total}</td>
                      <td className="py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{row.completed}</td>
                      <td className="py-2.5 text-center tabular-nums text-amber-600 dark:text-amber-400">{row.inProgress}</td>
                      <td className="py-2.5 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.rate >= 80 ? "bg-emerald-500" : row.rate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${row.rate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums w-10 text-end ${
                            row.rate >= 80 ? "text-emerald-600" : row.rate >= 50 ? "text-amber-600" : "text-red-500"
                          }`}>{row.rate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Category breakdown chart ──────────────────────────── */}
      {categoryData.length > 0 && (
        <Card className="shadow-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Task Category Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground -mt-1">Distribution of tasks by category</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={categoryData} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={72} />
                <RTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" name="Tasks" fill={CHART_COLORS.completed} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t">
        {settings.companyName || settings.logoText || "Company"} — Operations Performance Report — {fmtDate(new Date().toISOString())} — Confidential
      </div>
      </>)}

      {/* ── Operational tab ──────────────────────────────────────────────────── */}
      {activeTab === "operational" && (
        <div className="space-y-8">
          {opLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  icon={Timer}
                  label="Avg Response Time"
                  value={
                    opStats?.tasks?.avgResponseMinutes
                      ? opStats.tasks.avgResponseMinutes < 60
                        ? `${opStats.tasks.avgResponseMinutes}m`
                        : `${(opStats.tasks.avgResponseMinutes / 60).toFixed(1)}h`
                      : "—"
                  }
                  sub="From creation to completion"
                  iconCls="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                />
                <KpiCard
                  icon={CheckCircle2}
                  label="Tasks Completed"
                  value={opStats?.tasks?.totalCompleted ?? 0}
                  sub={`of ${opStats?.tasks?.totalAll ?? 0} total`}
                  iconCls="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <KpiCard
                  icon={Clock}
                  label="Tasks Pending"
                  value={opStats?.tasks?.totalPending ?? 0}
                  sub={`${opStats?.tasks?.totalInProgress ?? 0} in progress`}
                  iconCls="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                />
                <KpiCard
                  icon={AlertCircle}
                  label="Open Work Orders"
                  value={(opStats?.workOrders?.pending ?? 0) + (opStats?.workOrders?.inProgress ?? 0)}
                  sub={`${opStats?.workOrders?.completed ?? 0} completed`}
                  iconCls="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
              </div>

              {/* Per-worker breakdown */}
              <Card className="shadow-none border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Tasks per Worker</CardTitle>
                    <Badge variant="outline" className="ms-auto text-xs">{opStats?.workerRows?.length ?? 0} workers</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {!opStats?.workerRows?.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No assigned tasks found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                            <th className="pb-2 text-start font-medium">Name</th>
                            <th className="pb-2 text-start font-medium">Role</th>
                            <th className="pb-2 text-center font-medium">Total</th>
                            <th className="pb-2 text-center font-medium">Pending</th>
                            <th className="pb-2 text-center font-medium">In Progress</th>
                            <th className="pb-2 text-center font-medium">Completed</th>
                            <th className="pb-2 text-end font-medium">Avg Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {opStats.workerRows.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/50 transition-colors">
                              <td className="py-2.5 font-medium text-foreground">{row.name}</td>
                              <td className="py-2.5">
                                <Badge variant="outline" className="text-[10px] font-normal capitalize">{row.role}</Badge>
                              </td>
                              <td className="py-2.5 text-center tabular-nums">{row.total}</td>
                              <td className="py-2.5 text-center tabular-nums text-muted-foreground">{row.pending}</td>
                              <td className="py-2.5 text-center tabular-nums text-amber-600">{row.inProgress}</td>
                              <td className="py-2.5 text-center tabular-nums text-emerald-600 font-medium">{row.completed}</td>
                              <td className="py-2.5 text-end text-xs text-muted-foreground tabular-nums">
                                {row.avgMinutes
                                  ? row.avgMinutes < 60
                                    ? `${row.avgMinutes}m`
                                    : `${(row.avgMinutes / 60).toFixed(1)}h`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Per-unit work orders */}
              <Card className="shadow-none border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Service Requests per Unit</CardTitle>
                    <Badge variant="outline" className="ms-auto text-xs">{opStats?.unitRows?.length ?? 0} units</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {!opStats?.unitRows?.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No service requests found.</p>
                  ) : (
                    <div className="space-y-3">
                      {opStats.unitRows.map((row: any, i: number) => {
                        const total = row.total || 1;
                        const compPct = Math.round((row.completed / total) * 100);
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium text-foreground">{row.unitName}</span>
                                {row.propertyName && (
                                  <span className="text-xs text-muted-foreground ms-2">· {row.propertyName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="text-amber-600">{row.pending} pending</span>
                                <span className="text-emerald-600">{row.completed} done</span>
                                <span className={`font-semibold tabular-nums ${compPct >= 80 ? "text-emerald-600" : compPct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                  {compPct}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${compPct >= 80 ? "bg-emerald-500" : compPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${compPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Work order status summary */}
              <Card className="shadow-none border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Work Order Summary</CardTitle>
                  <p className="text-xs text-muted-foreground -mt-1">All service requests submitted via QR portal</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Total",       value: opStats?.workOrders?.total ?? 0,      cls: "text-foreground"      },
                      { label: "Pending",     value: opStats?.workOrders?.pending ?? 0,    cls: "text-muted-foreground" },
                      { label: "In Progress", value: opStats?.workOrders?.inProgress ?? 0, cls: "text-amber-600"       },
                      { label: "Completed",   value: opStats?.workOrders?.completed ?? 0,  cls: "text-emerald-600"     },
                    ].map(s => (
                      <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
