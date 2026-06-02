import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import {
  useGetPortalProperties,
  useGetPortalBookings,
  useGetPortalFinancials,
} from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LogOut, Building, Calendar, Percent, ArrowRight, ArrowLeft,
  TrendingUp, TrendingDown, DollarSign, BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export const PortalDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl, language } = useLanguage();

  const [propertyIdFilter, setPropertyIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter]         = useState<string>('all');
  const [months, setMonths]                     = useState<string>('6');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation('/portal');
  }, [isLoading, isAuthenticated, setLocation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propertiesRes, isLoading: isLoadingProps } = useGetPortalProperties(
    { page: 1, limit: 50 },
    { query: { enabled: isAuthenticated } } as any,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingsRes, isLoading: isLoadingBookings } = useGetPortalBookings(
    {
      page: 1,
      limit: 20,
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
      ...(statusFilter !== 'all'     ? { status: statusFilter }                  : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: financialsRes, isLoading: isLoadingFin } = useGetPortalFinancials(
    {
      months:     parseInt(months),
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
    );
  }

  const properties = propertiesRes?.data ?? [];
  const bookings   = bookingsRes?.data   ?? [];
  const financials = financialsRes?.data;

  const totalProperties = properties.length;
  const totalBookings   = properties.reduce((s, p) => s + (p.activeBookings ?? 0), 0);
  const avgOccupancy    = totalProperties > 0
    ? Math.round(properties.reduce((s, p) => s + (p.occupancyRate ?? 0), 0) / totalProperties)
    : 0;

  const handleLogout = async () => { await logout(); setLocation('/portal'); };

  /** Translate a property type key to the current language */
  const propTypeLabel = (type: string | undefined): string => {
    if (!type) return '';
    const key = `portal.type.${type.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  /** Translate a booking/property status to the current language */
  const statusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      active:      t('portal.status.active'),
      inactive:    t('portal.status.inactive'),
      confirmed:   t('portal.status.confirmed'),
      checked_in:  t('portal.status.checkedIn'),
      checked_out: t('portal.status.checkedOut'),
      cancelled:   t('portal.status.cancelled'),
      pending:     t('portal.status.pending'),
    };
    return statusMap[status] ?? status.replace(/_/g, ' ');
  };

  /** Format "Last X months" in the current language */
  const lastMonths = (n: string) =>
    isRtl ? `آخر ${n} أشهر` : `Last ${n} months`;

  /** Month label for chart X axis */
  const fmtMonth = (v: string) => {
    const [y, m] = v.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
  };

  /** Month label for table column */
  const fmtMonthFull = (v: string) =>
    new Date(v + '-01T00:00:00').toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-muted pb-12">
      <Helmet>
        <title>
          {isRtl ? 'محفظتي' : 'My Portfolio'} | ركز للحلول الذكية
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('portal.myPortfolio')}</h1>
            <p className="text-primary-foreground/70">
              {t('portal.welcome')} {((user as unknown as Record<string,unknown>)?.displayName as string) || ((user as unknown as Record<string,unknown>)?.username as string)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-1">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite')}
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('portal.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8 space-y-8">

        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalProperties')}</p>
              <p className="text-3xl font-bold text-primary">{totalProperties}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-secondary/20 p-4 rounded-full">
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.activeBookings')}</p>
              <p className="text-3xl font-bold text-primary">{totalBookings}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-green-100 p-4 rounded-full">
              <Percent className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.avgOccupancy')}</p>
              <p className="text-3xl font-bold text-primary">{avgOccupancy}%</p>
            </div>
          </Card>
        </div>

        {/* Tabs: Overview | Financials */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="h-10">
              <TabsTrigger value="overview"   className="px-6">{t('portal.overview')}</TabsTrigger>
              <TabsTrigger value="financials" className="px-6">{t('portal.financials')}</TabsTrigger>
            </TabsList>

            {/* Shared property filter */}
            <div className="flex gap-2 flex-wrap">
              <Select value={propertyIdFilter} onValueChange={setPropertyIdFilter}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder={t('portal.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('portal.allProperties')}</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* Properties grid */}
            <section>
              <h2 className="text-xl font-bold text-primary mb-4">{t('portal.managedProperties')}</h2>
              {isLoadingProps ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((prop) => (
                    <Card key={prop.id} className="p-6 border-border flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-primary">{prop.name}</h3>
                        <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                          {statusLabel(prop.status ?? '')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {propTypeLabel(prop.type)} · {prop.totalRooms} {t('portal.roomsUnit')}
                      </p>
                      <div className="mt-auto pt-4 border-t border-border">
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('portal.occupancy')}</span>
                          <span className="font-medium">{prop.occupancyRate ?? 0}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mb-4">
                          <div
                            className="bg-secondary h-2 rounded-full"
                            style={{ width: `${prop.occupancyRate ?? 0}%` }}
                          />
                        </div>
                        {prop.linkedListingId && (
                          <Button asChild variant="outline" className="w-full justify-between">
                            <Link href={`/listings/${prop.linkedListingId}`}>
                              {t('portal.viewListing')}
                              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Bookings table */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-primary">{t('portal.recentBookings')}</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-card">
                    <SelectValue placeholder={t('portal.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('portal.allStatuses')}</SelectItem>
                    <SelectItem value="confirmed">{t('portal.status.confirmed')}</SelectItem>
                    <SelectItem value="checked_in">{t('portal.status.checkedIn')}</SelectItem>
                    <SelectItem value="checked_out">{t('portal.status.checkedOut')}</SelectItem>
                    <SelectItem value="cancelled">{t('portal.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">{t('portal.col.guest')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.property')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.room')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkIn')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkOut')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoadingBookings ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <Skeleton className="h-8 w-1/2 mx-auto" />
                          </td>
                        </tr>
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            {t('portal.noBookings')}
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-primary">{b.guestName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.propertyName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.roomNumber}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkIn + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkOut + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  b.status === 'checked_in'  ? 'default'   :
                                  b.status === 'confirmed'   ? 'secondary' : 'outline'
                                }
                              >
                                {statusLabel(b.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </TabsContent>

          {/* ── Financials tab ── */}
          <TabsContent value="financials" className="space-y-8 mt-0">
            {/* Period selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('portal.period')}:</span>
              {['3', '6', '12'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    months === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:border-primary text-muted-foreground'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>

            {/* Financial KPI cards */}
            {isLoadingFin ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2.5 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.revenue')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-red-100 p-2.5 rounded-full">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.expenses')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalExpenses ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/20 p-2.5 rounded-full">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.netProfit')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.netProfit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmtSAR(financials?.netProfit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.revenueMinusExpenses')}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.margin')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.profitMargin ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {financials?.profitMargin ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.profitMargin')}</p>
                </Card>
              </div>
            )}

            {/* Monthly cash flow chart */}
            <Card className="p-6 border-border">
              <h3 className="text-lg font-bold text-primary mb-6">{t('portal.monthlyCashFlow')}</h3>
              {isLoadingFin ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (financials?.monthly ?? []).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  {t('portal.noFinancialData')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={financials?.monthly ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={fmtMonth}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    />
                    <Tooltip formatter={(value: number, name: string) => [fmtSAR(value), name]} />
                    <Legend />
                    <Bar dataKey="revenue"  name={t('portal.revenue')}  fill="hsl(var(--secondary))"       radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name={t('portal.expenses')} fill="hsl(var(--destructive)/0.6)" radius={[3, 3, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="netIncome"
                      name={t('portal.netIncome')}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Monthly breakdown table */}
            {!isLoadingFin && (financials?.monthly ?? []).length > 0 && (
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">{t('portal.col.month')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.revenue')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.expenses')}</th>
                        <th className="px-6 py-3 font-medium text-right">{t('portal.netIncome')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...(financials?.monthly ?? [])].reverse().map((row) => (
                        <tr key={row.month} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-primary">
                            {fmtMonthFull(row.month)}
                          </td>
                          <td className="px-6 py-3 text-right text-green-700">{fmtSAR(row.revenue)}</td>
                          <td className="px-6 py-3 text-right text-red-600">{fmtSAR(row.expenses)}</td>
                          <td className={`px-6 py-3 text-right font-semibold ${row.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {fmtSAR(row.netIncome)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
