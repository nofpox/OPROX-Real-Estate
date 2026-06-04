import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { usePortalAuth } from '@/lib/portal-auth';
import {
  Search, Bell, BellOff, Trash2, Plus, ArrowRight, ArrowLeft,
  Home, LayoutDashboard, Building2, LogOut, Loader2,
  BookOpen, ChevronRight, Clock, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchCriteria {
  propertyType?: string;
  listingType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: number;
}

interface SavedSearch {
  id: number;
  name: string;
  criteria: SearchCriteria;
  notifyEmail: boolean;
  createdAt: string;
  matchCount?: number;
}

interface BuyerDashboardData {
  savedSearches: SavedSearch[];
  totalInquiries: number;
  recentInquiries: { id: number; listingId: number | null; name: string; createdAt: string; status: string }[];
}

// ── Label maps ────────────────────────────────────────────────────────────────

const PROP_LABELS: Record<string, { en: string; ar: string }> = {
  apartment:  { en: 'Apartment',  ar: 'شقة' },
  villa:      { en: 'Villa',      ar: 'فيلا' },
  hotel:      { en: 'Hotel',      ar: 'فندق' },
  compound:   { en: 'Compound',   ar: 'مجمع' },
  office:     { en: 'Office',     ar: 'مكتب' },
  commercial: { en: 'Commercial', ar: 'تجاري' },
  warehouse:  { en: 'Warehouse',  ar: 'مستودع' },
};
const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  sale:        { en: 'For Sale',   ar: 'للبيع' },
  rent:        { en: 'For Rent',   ar: 'للإيجار' },
  operational: { en: 'Operational', ar: 'تشغيلي' },
};

function criteriaChips(c: SearchCriteria, isRtl: boolean): string[] {
  const chips: string[] = [];
  if (c.propertyType) chips.push(isRtl ? (PROP_LABELS[c.propertyType]?.ar ?? c.propertyType) : (PROP_LABELS[c.propertyType]?.en ?? c.propertyType));
  if (c.listingType)  chips.push(isRtl ? (TYPE_LABELS[c.listingType]?.ar ?? c.listingType) : (TYPE_LABELS[c.listingType]?.en ?? c.listingType));
  if (c.city)         chips.push(c.city);
  if (c.bedrooms)     chips.push(isRtl ? `${c.bedrooms} غرف` : `${c.bedrooms} BR`);
  if (c.minPrice || c.maxPrice) {
    const lo = c.minPrice ? `${Number(c.minPrice).toLocaleString()}` : '';
    const hi = c.maxPrice ? `${Number(c.maxPrice).toLocaleString()}` : '';
    chips.push(lo && hi ? `${lo}–${hi} SAR` : lo ? `≥${lo} SAR` : `≤${hi} SAR`);
  }
  return chips;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BuyerDashboard: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { user, isAuthenticated, isLoading: authLoading, logout } = usePortalAuth();
  const [, navigate] = useLocation();
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const [data, setData] = useState<BuyerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/portal');
  }, [authLoading, isAuthenticated, navigate]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/realestate-api/portal/buyer-dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('auth');
      const json = await res.json();
      setData(json.data ?? json);
    } catch {
      if (!isAuthenticated) navigate('/portal');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) fetchDashboard();
  }, [isAuthenticated, fetchDashboard]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/realestate-api/portal/saved-searches/${id}`, { method: 'DELETE', credentials: 'include' });
      setData(prev => prev ? { ...prev, savedSearches: prev.savedSearches.filter(s => s.id !== id) } : prev);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleNotify = async (s: SavedSearch) => {
    setTogglingId(s.id);
    try {
      await fetch(`/realestate-api/portal/saved-searches/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notifyEmail: !s.notifyEmail }),
      });
      setData(prev => prev ? {
        ...prev,
        savedSearches: prev.savedSearches.map(x => x.id === s.id ? { ...x, notifyEmail: !x.notifyEmail } : x),
      } : prev);
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/portal');
  };

  const { branding } = content;
  const companyName = isRtl ? branding.companyNameAr : branding.companyNameEn;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>{isRtl ? `لوحة المشتري | ${companyName}` : `Buyer Dashboard | ${companyName}`}</title>
      </Helmet>

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-3 w-3 text-border" />
            <span className="text-sm font-medium text-primary">
              {isRtl ? 'لوحة المشتري' : 'Buyer Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground">
              {(user as any)?.username || (user as any)?.email || ''}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              {isRtl ? 'خروج' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isRtl ? 'مرحباً بك' : 'Welcome back'}
            {(user as any)?.username ? `, ${(user as any).username}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRtl ? 'تتبع عمليات بحثك المحفوظة والتنبيهات الخاصة بك.' : 'Track your saved searches and property alerts.'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              icon: Search,
              label: isRtl ? 'بحث محفوظ' : 'Saved Searches',
              value: loading ? '—' : String(data?.savedSearches.length ?? 0),
            },
            {
              icon: Bell,
              label: isRtl ? 'تنبيهات نشطة' : 'Active Alerts',
              value: loading ? '—' : String(data?.savedSearches.filter(s => s.notifyEmail).length ?? 0),
            },
            {
              icon: BookOpen,
              label: isRtl ? 'استفسارات مُرسَلة' : 'Inquiries Sent',
              value: loading ? '—' : String(data?.totalInquiries ?? 0),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Saved Searches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-primary">
              {isRtl ? 'عمليات البحث المحفوظة' : 'Saved Searches'}
            </h2>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1 text-xs text-secondary hover:underline font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              {isRtl ? 'إضافة بحث' : 'Add via AI'}
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : !data?.savedSearches.length ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {isRtl ? 'لا توجد عمليات بحث محفوظة بعد' : 'No saved searches yet'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {isRtl
                  ? 'استخدم المساعد الذكي في صفحة العقارات لحفظ بحثك.'
                  : 'Use the AI assistant on the listings page to save a search.'}
              </p>
              <Link href="/listings">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  {isRtl ? 'تصفح العقارات' : 'Browse Listings'}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.savedSearches.map(s => {
                const chips = criteriaChips(s.criteria, isRtl);
                return (
                  <div key={s.id} className="bg-card border border-border rounded-2xl p-4 hover:border-secondary/30 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="h-3.5 w-3.5 text-secondary shrink-0" />
                          <p className="text-sm font-semibold text-primary truncate">{s.name}</p>
                          {s.matchCount !== undefined && s.matchCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {s.matchCount} {isRtl ? 'عقار' : 'match'}
                            </Badge>
                          )}
                        </div>
                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {chips.map((c, i) => (
                              <span key={i} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground/50">
                          {isRtl ? 'تم الحفظ' : 'Saved'}{' '}
                          {new Date(s.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleNotify(s)}
                          disabled={togglingId === s.id}
                          title={s.notifyEmail
                            ? (isRtl ? 'إيقاف التنبيهات' : 'Disable alerts')
                            : (isRtl ? 'تفعيل التنبيهات' : 'Enable alerts')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.notifyEmail
                              ? 'text-secondary hover:bg-secondary/10'
                              : 'text-muted-foreground/40 hover:bg-muted'
                          }`}
                        >
                          {togglingId === s.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : s.notifyEmail
                              ? <Bell className="h-3.5 w-3.5" />
                              : <BellOff className="h-3.5 w-3.5" />
                          }
                        </button>
                        <Link
                          href={`/listings?${new URLSearchParams(
                            Object.fromEntries(Object.entries(s.criteria).filter(([,v]) => v !== undefined && v !== '').map(([k,v]) => [k, String(v)]))
                          ).toString()}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
                          title={isRtl ? 'عرض النتائج' : 'View matches'}
                        >
                          <Arrow className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={isRtl ? 'حذف' : 'Delete'}
                        >
                          {deletingId === s.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Inquiries */}
        {(loading || (data?.recentInquiries?.length ?? 0) > 0) && (
          <div>
            <h2 className="text-base font-semibold text-primary mb-4">
              {isRtl ? 'أحدث الاستفسارات' : 'Recent Inquiries'}
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data!.recentInquiries.map(inq => (
                  <div key={inq.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary truncate">{inq.name}</p>
                        <p className="text-[10px] text-muted-foreground/50">
                          {new Date(inq.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB')}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={inq.status === 'contacted' ? 'default' : inq.status === 'closed' ? 'secondary' : 'outline'}
                      className="text-[10px] shrink-0"
                    >
                      {inq.status === 'new'
                        ? (isRtl ? 'جديد' : 'New')
                        : inq.status === 'contacted'
                          ? (isRtl ? 'تم التواصل' : 'Contacted')
                          : (isRtl ? 'مغلق' : 'Closed')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/listings">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-secondary/40 hover:shadow-sm transition-all cursor-pointer group">
              <Building2 className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-primary group-hover:text-secondary transition-colors">
                {isRtl ? 'تصفح العقارات' : 'Browse Listings'}
              </span>
            </div>
          </Link>
          <Link href="/portal/dashboard">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-secondary/40 hover:shadow-sm transition-all cursor-pointer group">
              <LayoutDashboard className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-primary group-hover:text-secondary transition-colors">
                {isRtl ? 'بوابة المستثمر' : 'Investor Portal'}
              </span>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
};
