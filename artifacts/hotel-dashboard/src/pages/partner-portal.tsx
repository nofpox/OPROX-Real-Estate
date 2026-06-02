import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Percent, FileText, Download,
  Calendar, DollarSign, Building2, AlertCircle,
} from "lucide-react";

interface EquityData {
  userId: number;
  totalCompanyShares: number;
  partnerShareCount: number;
  valuationPerShare: number;
  currency: string;
  ownershipPct: number;
  totalValuation: number;
  effectiveDate: string;
}

interface DividendRecord {
  id: number;
  amount: number;
  currency: string;
  distributionDate: string;
  status: "paid" | "pending" | "scheduled";
  fiscalPeriod: string;
  notes: string | null;
}

interface ReportRecord {
  id: number;
  title: string;
  reportType: string;
  fiscalYear: number;
  fiscalPeriod: string;
  fileUrl: string | null;
  fileSizeKb: number | null;
  publishedAt: string;
}

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}
function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}
function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}
function fmtFileSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

const REPORT_TYPE_COLORS: Record<string, string> = {
  annual:    "bg-blue-100 text-blue-700",
  quarterly: "bg-purple-100 text-purple-700",
  audit:     "bg-amber-100 text-amber-700",
  financial: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  paid:      "bg-green-100 text-green-700",
  pending:   "bg-amber-100 text-amber-700",
  scheduled: "bg-blue-100 text-blue-700",
};

function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i}><CardContent className="pt-5"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export default function PartnerPortal() {
  const { t } = useTranslation();

  const { data: equity, isLoading: loadingEquity } = useQuery<EquityData>({
    queryKey: ["/api/partner/equity"],
    queryFn: () => fetch("/api/partner/equity", { credentials: "include" }).then((r) => r.json()),
  });

  const { data: dividends = [], isLoading: loadingDividends } = useQuery<DividendRecord[]>({
    queryKey: ["/api/partner/dividends"],
    queryFn: () => fetch("/api/partner/dividends", { credentials: "include" }).then((r) => r.json()),
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<ReportRecord[]>({
    queryKey: ["/api/partner/reports"],
    queryFn: () => fetch("/api/partner/reports", { credentials: "include" }).then((r) => r.json()),
  });

  const paidDividends     = dividends.filter((d) => d.status === "paid");
  const upcomingDividends = dividends.filter((d) => d.status !== "paid");
  const totalReceived     = paidDividends.reduce((sum, d) => sum + d.amount, 0);
  const currency          = equity?.currency ?? "AED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">{t("partner.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("partner.subtitle")}</p>
      </div>

      <Tabs defaultValue="equity">
        <TabsList>
          <TabsTrigger value="equity">{t("partner.equityTab")}</TabsTrigger>
          <TabsTrigger value="dividends">{t("partner.dividendTab")}</TabsTrigger>
          <TabsTrigger value="reports">{t("partner.reportsTab")}</TabsTrigger>
        </TabsList>

        {/* ── Equity Overview ─────────────────────────────────────────────── */}
        <TabsContent value="equity" className="mt-6 space-y-5">
          {loadingEquity ? (
            <SkeletonCards />
          ) : !equity || equity.totalCompanyShares === 0 ? (
            <EmptyState icon={AlertCircle} message={t("partner.equity.noData")} />
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("partner.equity.yourShares")}</p>
                        <p className="text-2xl font-bold mt-1">{fmtNum(equity.partnerShareCount)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("partner.equity.totalShares")}: {fmtNum(equity.totalCompanyShares)}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{t("partner.equity.ownershipPct")}</p>
                        <p className="text-2xl font-bold mt-1">{equity.ownershipPct.toFixed(2)}%</p>
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(equity.ownershipPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 ms-3">
                        <Percent className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("partner.equity.valuation")}</p>
                        <p className="text-2xl font-bold mt-1">{fmtMoney(equity.totalValuation, equity.currency)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{equity.currency}</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("partner.equity.sharePrice")}</p>
                        <p className="text-2xl font-bold mt-1">{fmtMoney(equity.valuationPerShare, equity.currency)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("partner.equity.asOf")} {fmtDate(equity.effectiveDate)}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ownership breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{t("partner.equity.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{t("partner.equity.yourShares")}</span>
                      <span className="text-muted-foreground">
                        {fmtNum(equity.partnerShareCount)} / {fmtNum(equity.totalCompanyShares)}
                      </span>
                    </div>
                    <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 start-0 bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(equity.ownershipPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{equity.ownershipPct.toFixed(4)}% {t("partner.equity.ownershipPct").toLowerCase()}</span>
                      <span>{t("partner.equity.asOf")} {fmtDate(equity.effectiveDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Dividend Tracker ────────────────────────────────────────────── */}
        <TabsContent value="dividends" className="mt-6 space-y-5">
          {loadingDividends ? (
            <SkeletonCards n={3} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">{t("partner.dividends.history")}</p>
                    <p className="text-2xl font-bold mt-1">{fmtMoney(totalReceived, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paidDividends.length} {t("partner.dividends.paid").toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">{t("partner.dividends.scheduled")}</p>
                    <p className="text-2xl font-bold mt-1">
                      {upcomingDividends.filter((d) => d.status === "scheduled").length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("partner.dividends.upcoming")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">{t("partner.dividends.pending")}</p>
                    <p className="text-2xl font-bold mt-1">
                      {upcomingDividends.filter((d) => d.status === "pending").length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("partner.dividends.status")}</p>
                  </CardContent>
                </Card>
              </div>

              {dividends.length === 0 ? (
                <EmptyState icon={Calendar} message={t("partner.dividends.noData")} />
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t("partner.dividends.title")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-start py-2.5 px-4 font-medium text-muted-foreground">{t("partner.dividends.period")}</th>
                            <th className="text-start py-2.5 px-4 font-medium text-muted-foreground">{t("partner.dividends.amount")}</th>
                            <th className="text-start py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">{t("partner.dividends.date")}</th>
                            <th className="text-start py-2.5 px-4 font-medium text-muted-foreground">{t("partner.dividends.status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...dividends].reverse().map((d) => (
                            <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 font-medium">{d.fiscalPeriod}</td>
                              <td className="py-3 px-4">{fmtMoney(d.amount, d.currency)}</td>
                              <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{fmtDate(d.distributionDate)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"}`}>
                                  {t(`partner.dividends.${d.status}`, d.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Company Reports ─────────────────────────────────────────────── */}
        <TabsContent value="reports" className="mt-6">
          {loadingReports ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} message={t("partner.reports.noData")} />
          ) : (
            <div className="space-y-3">
              {[...reports].reverse().map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REPORT_TYPE_COLORS[r.reportType] ?? "bg-muted text-muted-foreground"}`}>
                              {t(`partner.reports.${r.reportType}`, r.reportType)}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.fiscalPeriod}</span>
                            {r.fileSizeKb && (
                              <span className="text-xs text-muted-foreground">{fmtFileSize(r.fileSizeKb)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">{fmtDate(r.publishedAt)}</span>
                        {r.fileUrl ? (
                          <Button size="sm" variant="outline" asChild>
                            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4 me-1.5" />
                              {t("partner.reports.download")}
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            <Download className="h-4 w-4 me-1.5" />
                            {t("partner.reports.download")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
