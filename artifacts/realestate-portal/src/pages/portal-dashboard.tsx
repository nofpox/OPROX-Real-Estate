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
  const { t, isRtl } = useLanguage();

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

  const properties    = propertiesRes?.data ?? [];
  const bookings      = bookingsRes?.data   ?? [];
  const financials    = financialsRes?.data;

  const totalProperties = properties.length;
  const totalBookings   = properties.reduce((s, p) => s + (p.activeBookings ?? 0), 0);
  const avgOccupancy    = totalProperties > 0
    ? Math.round(properties.reduce((s, p) => s + (p.occupancyRate ?? 0), 0) / totalProperties)
    : 0;

  const handleLogout = async () => { await logout(); setLocation('/portal'); };

  return (
    <div className="min-h-screen bg-muted pb-12">
      <Helmet>
        <title>My Portfolio | ركز للحلول الذكية</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('portal.myPortfolio') || 'My Portfolio'}</h1>
            <p className="text-primary-foreground/70">
              {t('portal.welcome') || 'Welcome back,'} {((user as unknown as Record<string,unknown>)?.displayName as string) || ((user as unknown as Record<string,unknown>)?.username as string)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-1">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite') || 'Website'}
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('portal.logout') || 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8 space-y-8">

        {/* Top KPI row — always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalProperties') || 'Total Properties'}</p>
              <p className="text-3xl font-bold text-primary">{totalProperties}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-secondary/20 p-4 rounded-full">
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.activeBookings') || 'Active Bookings'}</p>
              <p className="text-3xl font-bold text-primary">{totalBookings}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-green-100 p-4 rounded-full">
              <Percent className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.avgOccupancy') || 'Avg. Occupancy'}</p>
              <p className="text-3xl font-bold text-primary">{avgOccupancy}%</p>
            </div>
          </Card>
        </div>

        {/* Tabs: Overview | Financials */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="h-10">
              <TabsTrigger value="overview" className="px-6">Overview</TabsTrigger>
              <TabsTrigger value="financials" className="px-6">Financials</TabsTrigger>
            </TabsList>

            {/* Shared filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={propertyIdFilter} onValueChange={setPropertyIdFilter}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
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
              <h2 className="text-xl font-bold text-primary mb-4">{t('portal.managedProperties') || 'Managed Properties'}</h2>
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
                          {prop.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{prop.type} · {prop.totalRooms} rooms</p>
                      <div className="mt-auto pt-4 border-t border-border">
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('portal.occupancy') || 'Occupancy'}</span>
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
                              {t('portal.viewListing') || 'View Listing'}
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
                <h2 className="text-xl font-bold text-primary">{t('portal.recentBookings') || 'Recent Bookings'}</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-card">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">Guest</th>
                        <th className="px-6 py-3 font-medium">Property</th>
                        <th className="px-6 py-3 font-medium">Room</th>
                        <th className="px-6 py-3 font-medium">Check In</th>
                        <th className="px-6 py-3 font-medium">Check Out</th>
                        <th className="px-6 py-3 font-medium">Status</th>
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
                            No bookings found.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-primary">{b.guestName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.propertyName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.roomNumber}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkIn + 'T00:00:00').toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkOut + 'T00:00:00').toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  b.status === 'checked_in'  ? 'default'   :
                                  b.status === 'confirmed'   ? 'secondary' : 'outline'
                                }
                              >
                                {b.status.replace('_', ' ')}
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
              <span className="text-sm text-muted-foreground">Period:</span>
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
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last {months} months</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-red-100 p-2.5 rounded-full">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalExpenses ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last {months} months</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/20 p-2.5 rounded-full">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Profit</span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.netProfit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmtSAR(financials?.netProfit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Revenue − Expenses</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Margin</span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.profitMargin ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {financials?.profitMargin ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Profit margin</p>
                </Card>
              </div>
            )}

            {/* Monthly cash flow chart */}
            <Card className="p-6 border-border">
              <h3 className="text-lg font-bold text-primary mb-6">Monthly Cash Flow</h3>
              {isLoadingFin ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (financials?.monthly ?? []).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No financial data for the selected period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={financials?.monthly ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const [y, m] = v.split('-');
                        return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short' });
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [fmtSAR(value), name]}
                    />
                    <Legend />
                    <Bar dataKey="revenue"   name="Revenue"   fill="hsl(var(--secondary))"       radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses"  name="Expenses"  fill="hsl(var(--destructive)/0.6)"  radius={[3, 3, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="netIncome"
                      name="Net Income"
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
                        <th className="px-6 py-3 font-medium">Month</th>
                        <th className="px-6 py-3 font-medium text-right">Revenue</th>
                        <th className="px-6 py-3 font-medium text-right">Expenses</th>
                        <th className="px-6 py-3 font-medium text-right">Net Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...(financials?.monthly ?? [])].reverse().map((row) => (
                        <tr key={row.month} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-primary">
                            {new Date(row.month + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })}
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
