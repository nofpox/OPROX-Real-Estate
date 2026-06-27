import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useCms } from '@/lib/cms-context';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Users, CalendarCheck, LayoutGrid,
  LayoutDashboard, FileEdit, ListFilter, Settings,
  LogOut, RefreshCw, ExternalLink, Save, Globe,
  CheckCircle2, AlertCircle, Pencil, X, Building,
  MapPin, Phone, Mail, Image as ImageIcon, Type, Map,
  Link2, Clock, Copy, Trash2, Plus, Shield, CheckCheck,
} from 'lucide-react';
import { SmartHeatmap } from '@/components/SmartHeatmap';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'content' | 'listings' | 'heatmap' | 'settings';

interface LiveStats {
  properties_count: number;
  guests_count: number;
  bookings_count: number;
  rooms_count: number;
}

interface Listing {
  id: number;
  titleAr: string | null;
  titleEn: string | null;
  propertyType: string | null;
  listingType: string | null;
  price: number | null;
  city: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = '/realestate-api';

async function fetchStats(): Promise<LiveStats | null> {
  try {
    const r = await fetch(`${BASE}/cms/live-stats`);
    if (r.ok) return r.json() as Promise<LiveStats>;
  } catch { /* ignored */ }
  return null;
}

async function fetchListings(): Promise<Listing[]> {
  try {
    const r = await fetch(`${BASE}/cms/listings-admin`, { credentials: 'include' });
    if (r.ok) {
      const d = await r.json() as { listings?: Listing[] };
      return d.listings ?? [];
    }
  } catch { /* ignored */ }
  return [];
}

async function saveSection(section: string, data: Record<string, string>): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/cms/site-content/${section}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.ok;
  } catch { return false; }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: number | undefined; color: string; loading: boolean;
}> = ({ icon: Icon, label, value, color, loading }) => (
  <Card>
    <CardContent className="p-4">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      {loading
        ? <Skeleton className="h-7 w-14 mb-1" />
        : <p className="text-2xl font-bold tabular-nums">{value ?? 0}</p>
      }
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </CardContent>
  </Card>
);

// ── Section editor ────────────────────────────────────────────────────────────

interface FieldDef { key: string; label: string; multiline?: boolean }
interface SectionEditorProps {
  title: string;
  icon: React.ElementType;
  fields: FieldDef[];
  initialValues: Record<string, string>;
  sectionKey: string;
  isRtl: boolean;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  title, icon: Icon, fields, initialValues, sectionKey, isRtl,
}) => {
  const [open,   setOpen]   = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSection(sectionKey, values);
    setStatus(ok ? 'ok' : 'err');
    setSaving(false);
    if (ok) setTimeout(() => { setOpen(false); setStatus('idle'); }, 1200);
  };

  return (
    <Card className={open ? 'ring-2 ring-primary/30' : ''}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isRtl ? 'تعديل' : 'Edit'}
            </button>
          ) : (
            <button onClick={() => { setOpen(false); setStatus('idle'); }} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="px-4 pb-4 space-y-3 pt-2">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
              {f.multiline ? (
                <Textarea
                  rows={3}
                  value={values[f.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="text-sm resize-none"
                />
              ) : (
                <Input
                  value={values[f.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="text-sm h-9"
                />
              )}
            </div>
          ))}

          {status === 'ok' && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="h-4 w-4" />
              {isRtl ? 'تم الحفظ بنجاح' : 'Saved successfully'}
            </div>
          )}
          {status === 'err' && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4" />
              {isRtl ? 'فشل الحفظ. تحقق من صلاحيات الدخول.' : 'Save failed. Check admin access.'}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="w-full h-9 mt-1 font-semibold"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : (
              <>
                <Save className="h-4 w-4 me-2" />
                {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const PortalDashboard: React.FC = () => {
  const [, navigate]  = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, logout } = usePortalAuth();
  const { content }   = useCms();
  const { isRtl }     = useLanguage();

  const [activeTab,      setActiveTab]      = useState<Tab>('overview');
  const [stats,          setStats]          = useState<LiveStats | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [listings,       setListings]       = useState<Listing[]>([]);
  const [listingsLoading,setListingsLoading]= useState(false);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/portal');
  }, [authLoading, isAuthenticated, navigate]);

  // ── Load live stats ──────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const s = await fetchStats();
    setStats(s);
    setStatsLoading(false);
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  // ── Load listings on tab switch (shared by Listings + Heatmap tabs) ─────────
  useEffect(() => {
    if (activeTab !== 'listings' && activeTab !== 'heatmap') return;
    if (listings.length > 0) return; // already loaded
    setListingsLoading(true);
    void fetchListings().then(l => { setListings(l); setListingsLoading(false); });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    navigate('/portal');
  };

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/portal');
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Label helpers ─────────────────────────────────────────────────────────────
  const L = {
    adminRoom: isRtl ? 'غرفة التحكم الإدارية' : 'Admin Control Room',
    welcome:   isRtl ? `مرحباً، ${user?.displayName ?? 'المدير'}` : `Welcome, ${user?.displayName ?? 'Admin'}`,
    overview:  isRtl ? 'نظرة عامة'    : 'Overview',
    content:   isRtl ? 'إدارة المحتوى' : 'Content',
    listings:  isRtl ? 'العقارات'      : 'Listings',
    heatmap:   isRtl ? 'الخريطة الذكية' : 'Smart Map',
    settings:  isRtl ? 'الإعدادات'     : 'Settings',
  };

  const TABS: { key: Tab; icon: React.ElementType; label: string }[] = [
    { key: 'overview',  icon: LayoutDashboard, label: L.overview  },
    { key: 'content',   icon: FileEdit,        label: L.content   },
    { key: 'listings',  icon: Building2,       label: L.listings  },
    { key: 'heatmap',   icon: Map,             label: L.heatmap   },
    { key: 'settings',  icon: Settings,        label: L.settings  },
  ];

  // ── Overview tab ──────────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Building2}     label={isRtl ? 'العقارات'    : 'Properties'} value={stats?.properties_count} color="text-blue-600 bg-blue-50"    loading={statsLoading} />
        <StatCard icon={Users}         label={isRtl ? 'الضيوف'      : 'Guests'}     value={stats?.guests_count}     color="text-emerald-600 bg-emerald-50" loading={statsLoading} />
        <StatCard icon={CalendarCheck} label={isRtl ? 'الحجوزات'    : 'Bookings'}   value={stats?.bookings_count}   color="text-amber-600 bg-amber-50"    loading={statsLoading} />
        <StatCard icon={LayoutGrid}    label={isRtl ? 'الوحدات'     : 'Rooms'}      value={stats?.rooms_count}      color="text-violet-600 bg-violet-50"  loading={statsLoading} />
      </div>

      {/* Site status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium">{isRtl ? 'الموقع يعمل بشكل طبيعي' : 'Site is live and running'}</span>
          </div>
          <a
            href="/realestate/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isRtl ? 'عرض' : 'View'}
          </a>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">{isRtl ? 'روابط سريعة' : 'Quick Links'}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1 pt-0">
          {[
            { href: '/realestate/',          label: isRtl ? 'الصفحة الرئيسية'  : 'Home Page',    icon: Globe     },
            { href: '/realestate/listings',  label: isRtl ? 'قائمة العقارات'   : 'Listings',     icon: Building2 },
            { href: '/realestate/services',  label: isRtl ? 'الخدمات'          : 'Services',     icon: ListFilter},
            { href: '/realestate/contact',   label: isRtl ? 'اتصل بنا'         : 'Contact Us',   icon: Mail      },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted transition-colors group"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              <span className="text-sm font-medium flex-1">{label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>

      <button
        onClick={() => void loadStats()}
        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {isRtl ? 'تحديث الإحصائيات' : 'Refresh stats'}
      </button>
    </div>
  );

  // ── Content tab ───────────────────────────────────────────────────────────────
  const ContentTab = () => {
    const br = content?.branding;
    const hr = content?.hero;
    const ct = content?.contact;

    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground px-1">
          {isRtl
            ? 'قم بتعديل محتوى الموقع مباشرةً من هنا. التغييرات تظهر فوراً على الموقع.'
            : 'Edit site content directly. Changes appear live on the public site.'}
        </p>

        {/* Branding */}
        <SectionEditor
          title={isRtl ? 'الهوية التجارية' : 'Branding'}
          icon={Type}
          sectionKey="branding"
          isRtl={isRtl}
          initialValues={{
            companyNameEn: br?.companyNameEn ?? '',
            companyNameAr: br?.companyNameAr ?? '',
            taglineEn:     br?.taglineEn     ?? '',
            taglineAr:     br?.taglineAr     ?? '',
            logoUrl:       br?.logoUrl       ?? '',
          }}
          fields={[
            { key: 'companyNameEn', label: isRtl ? 'اسم الشركة (إنجليزي)' : 'Company Name (EN)' },
            { key: 'companyNameAr', label: isRtl ? 'اسم الشركة (عربي)'    : 'Company Name (AR)' },
            { key: 'taglineEn',     label: isRtl ? 'الشعار (إنجليزي)'     : 'Tagline (EN)' },
            { key: 'taglineAr',     label: isRtl ? 'الشعار (عربي)'        : 'Tagline (AR)' },
            { key: 'logoUrl',       label: isRtl ? 'رابط الشعار'           : 'Logo URL' },
          ]}
        />

        {/* Hero */}
        <SectionEditor
          title={isRtl ? 'قسم الصفحة الرئيسية' : 'Hero Section'}
          icon={ImageIcon}
          sectionKey="hero"
          isRtl={isRtl}
          initialValues={{
            titleEn:    hr?.titleEn    ?? '',
            titleAr:    hr?.titleAr    ?? '',
            subtitleEn: hr?.subtitleEn ?? '',
            subtitleAr: hr?.subtitleAr ?? '',
            imageUrl:   hr?.imageUrl   ?? '',
          }}
          fields={[
            { key: 'titleEn',    label: isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Title (EN)' },
            { key: 'titleAr',    label: isRtl ? 'العنوان الرئيسي (عربي)'    : 'Title (AR)' },
            { key: 'subtitleEn', label: isRtl ? 'العنوان الفرعي (إنجليزي)'  : 'Subtitle (EN)', multiline: true },
            { key: 'subtitleAr', label: isRtl ? 'العنوان الفرعي (عربي)'     : 'Subtitle (AR)', multiline: true },
            { key: 'imageUrl',   label: isRtl ? 'رابط صورة الخلفية'          : 'Background Image URL' },
          ]}
        />

        {/* Contact */}
        <SectionEditor
          title={isRtl ? 'معلومات التواصل' : 'Contact Info'}
          icon={Phone}
          sectionKey="contact"
          isRtl={isRtl}
          initialValues={{
            email:     ct?.email     ?? '',
            phone:     ct?.phone     ?? '',
            whatsapp:  ct?.whatsapp  ?? '',
            addressEn: ct?.addressEn ?? '',
            addressAr: ct?.addressAr ?? '',
          }}
          fields={[
            { key: 'email',     label: isRtl ? 'البريد الإلكتروني الرئيسي' : 'Primary Email' },
            { key: 'phone',     label: isRtl ? 'رقم الهاتف'                : 'Phone Number' },
            { key: 'whatsapp',  label: isRtl ? 'واتساب'                    : 'WhatsApp' },
            { key: 'addressEn', label: isRtl ? 'العنوان (إنجليزي)'         : 'Address (EN)', multiline: true },
            { key: 'addressAr', label: isRtl ? 'العنوان (عربي)'            : 'Address (AR)', multiline: true },
          ]}
        />
      </div>
    );
  };

  // ── Listings tab ──────────────────────────────────────────────────────────────
  const ListingsTab = () => {
    if (listingsLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {isRtl ? 'لا توجد عقارات مضافة بعد' : 'No listings added yet'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {isRtl ? 'أضف عقارات عبر لوحة التحكم الرئيسية' : 'Add listings via HousIn'}
          </p>
        </div>
      );
    }

    const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
      apartment:  { en: 'Apartment',  ar: 'شقة'     },
      villa:      { en: 'Villa',      ar: 'فيلا'     },
      hotel:      { en: 'Hotel',      ar: 'فندق'     },
      compound:   { en: 'Compound',   ar: 'مجمع'     },
      office:     { en: 'Office',     ar: 'مكتب'     },
      commercial: { en: 'Commercial', ar: 'تجاري'    },
      land:       { en: 'Land',       ar: 'أرض'      },
      warehouse:  { en: 'Warehouse',  ar: 'مستودع'   },
    };

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground px-1">
          {isRtl ? `${listings.length} عقار مسجل` : `${listings.length} listing${listings.length === 1 ? '' : 's'}`}
        </p>
        {listings.map(l => {
          const typeLabel = TYPE_LABELS[l.propertyType ?? ''];
          return (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="h-5 w-5 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug truncate">
                      {isRtl ? (l.titleAr ?? l.titleEn) : (l.titleEn ?? l.titleAr)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {typeLabel && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {isRtl ? typeLabel.ar : typeLabel.en}
                        </Badge>
                      )}
                      {l.listingType && (
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          {l.listingType}
                        </Badge>
                      )}
                      <Badge
                        className={`text-xs h-5 px-1.5 ${l.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                      >
                        {l.isActive
                          ? (isRtl ? 'نشط' : 'Active')
                          : (isRtl ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </div>
                    {l.city && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{l.city}</span>
                      </div>
                    )}
                    {l.price != null && (
                      <p className="text-xs font-semibold text-primary mt-1">
                        {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(l.price)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ── Heatmap tab ───────────────────────────────────────────────────────────────
  const HeatmapTab = () => (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold">
          {isRtl ? 'الخريطة الحرارية الذكية' : 'Smart Heatmap'}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isRtl
            ? 'تصور كثافة العقارات والإشغال عبر المناطق السعودية. انقر على أي دائرة ذهبية للتفاصيل.'
            : 'Visualise property density and occupancy across Saudi districts. Tap any gold dot for details.'}
        </p>
      </div>

      {listingsLoading ? (
        <div className="rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center" style={{ height: 420 }}>
          <div className="text-center">
            <RefreshCw className="h-6 w-6 text-amber-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">{isRtl ? 'جارٍ تحميل الخريطة…' : 'Loading map…'}</p>
          </div>
        </div>
      ) : (
        <SmartHeatmap listings={listings} isRtl={isRtl} />
      )}

      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { city: isRtl ? 'الرياض'         : 'Riyadh',   pct: '88%' },
          { city: isRtl ? 'جدة'            : 'Jeddah',   pct: '79%' },
          { city: isRtl ? 'الدمام'         : 'Dammam',   pct: '64%' },
        ].map(({ city, pct }) => (
          <div key={city} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-base font-bold text-primary">{pct}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{city}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Settings tab ──────────────────────────────────────────────────────────────
  const SettingsTab = () => {
    // Preview Links state
    type PreviewLink = {
      id: number; token: string; portal: string; label: string;
      created_by: string; expires_at: string; revoked_at: string | null; created_at: string;
    };
    const [links, setLinks] = useState<PreviewLink[]>([]);
    const [linksLoading, setLinksLoading] = useState(false);
    const [showGenForm, setShowGenForm] = useState(false);
    const genHours = 1; // Hard-locked to 1 hour on all platforms
    const [genLabel, setGenLabel] = useState('');
    const [genLoading, setGenLoading] = useState(false);
    const [newLink, setNewLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<number | null>(null);

    const fetchLinks = useCallback(async () => {
      setLinksLoading(true);
      try {
        const r = await fetch(`${BASE}/cms/preview-links`, { credentials: 'include' });
        if (r.ok) { const j = await r.json(); setLinks(j.links ?? []); }
      } finally { setLinksLoading(false); }
    }, []);

    useEffect(() => { fetchLinks(); }, [fetchLinks]);

    async function generateLink() {
      setGenLoading(true);
      try {
        const r = await fetch(`${BASE}/cms/preview-links`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portal: 'rkz', hours: genHours, label: genLabel }),
        });
        if (r.ok) {
          const j = await r.json();
          const token = j.link?.token as string;
          const url = `${window.location.origin}/realestate/preview/${token}`;
          setNewLink(url);
          setShowGenForm(false);
          setGenLabel('');
          await fetchLinks();
        }
      } finally { setGenLoading(false); }
    }

    async function revokeLink(id: number) {
      setRevoking(id);
      try {
        await fetch(`${BASE}/cms/preview-links/${id}`, { method: 'DELETE', credentials: 'include' });
        await fetchLinks();
        if (newLink?.includes(links.find(l => l.id === id)?.token ?? '___')) setNewLink(null);
      } finally { setRevoking(null); }
    }

    function copyLink(url: string) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }

    function isExpired(link: PreviewLink) { return new Date(link.expires_at) < new Date(); }
    function isActive(link: PreviewLink) { return !link.revoked_at && !isExpired(link); }

    function timeLabel(link: PreviewLink) {
      if (link.revoked_at) return isRtl ? 'مُلغى' : 'Revoked';
      if (isExpired(link)) return isRtl ? 'منتهي' : 'Expired';
      const diff = new Date(link.expires_at).getTime() - Date.now();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    return (
      <div className="space-y-4">
        {/* Admin account card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{isRtl ? 'حساب المدير' : 'Admin Account'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 pt-0">
            {[
              { label: isRtl ? 'الاسم'  : 'Name',  value: user?.displayName ?? '—' },
              { label: isRtl ? 'البريد' : 'Email', value: user?.email       ?? '—' },
              { label: isRtl ? 'الدور'  : 'Role',  value: user?.role        ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-medium dir-ltr">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Preview Links ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  {isRtl ? 'روابط المعاينة المؤقتة' : 'Secure Preview Links'}
                </CardTitle>
              </div>
              <button
                onClick={() => { setShowGenForm(v => !v); setNewLink(null); }}
                className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {isRtl ? 'إنشاء رابط' : 'Generate'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">

            {/* Generator form */}
            {showGenForm && (
              <div className="bg-muted/60 rounded-xl p-3 space-y-3 border border-border/60">
                {/* Expiry — fixed 1 hour, enforced on server */}
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {isRtl ? 'تنتهي صلاحية الرابط تلقائيًا بعد ساعة واحدة' : 'Link expires automatically after exactly 1 hour'}
                  </span>
                </div>

                {/* Optional label */}
                <Input
                  value={genLabel}
                  onChange={e => setGenLabel(e.target.value)}
                  placeholder={isRtl ? 'وصف اختياري…' : 'Optional label…'}
                  className="h-8 text-xs"
                />

                <Button
                  size="sm"
                  className="w-full h-9"
                  onClick={generateLink}
                  disabled={genLoading}
                >
                  {genLoading
                    ? (isRtl ? 'جارٍ الإنشاء…' : 'Generating…')
                    : (isRtl ? 'إنشاء الرابط الآن' : 'Create Preview Link')}
                </Button>
              </div>
            )}

            {/* Newly generated link */}
            {newLink && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">{isRtl ? 'تم إنشاء الرابط بنجاح' : 'Preview link created!'}</span>
                </div>
                <div className="flex items-center gap-2 bg-card rounded-lg px-2.5 py-2 border border-border/60">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-foreground font-mono flex-1 truncate dir-ltr">{newLink}</span>
                  <button onClick={() => copyLink(newLink)} className="shrink-0 text-primary hover:text-primary/80 transition-colors">
                    {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {isRtl ? 'شارك هذا الرابط — سينتهي تلقائيًا' : 'Share this link — it will auto-expire.'}
                </p>
              </div>
            )}

            {/* Active links list */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                  {isRtl ? 'الروابط النشطة' : 'Active Links'}
                </p>
                <button onClick={fetchLinks} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`h-3 w-3 ${linksLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {linksLoading && (
                <div className="space-y-2">
                  {[1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              )}

              {!linksLoading && links.filter(isActive).length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">
                  {isRtl ? 'لا توجد روابط نشطة' : 'No active preview links'}
                </p>
              )}

              {!linksLoading && links.filter(l => l.portal === 'rkz' && isActive(l)).map(link => (
                <div key={link.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {link.label && (
                        <span className="text-[11px] text-muted-foreground truncate">{link.label}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeLabel(link)}</span>
                      <span className="text-border">·</span>
                      <span className="font-mono truncate dir-ltr">{link.token.slice(0, 8)}…</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(`${window.location.origin}/realestate/preview/${link.token}`)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => revokeLink(link.id)}
                      disabled={revoking === link.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Revoke link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Expired/revoked history (collapsed) */}
              {!linksLoading && links.filter(l => l.portal === 'rkz' && !isActive(l)).length > 0 && (
                <details className="group">
                  <summary className="text-[11px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground list-none flex items-center gap-1 py-1">
                    <span className="group-open:hidden">▶</span>
                    <span className="hidden group-open:inline">▼</span>
                    {isRtl
                      ? `${links.filter(l => l.portal === 'rkz' && !isActive(l)).length} روابط منتهية/ملغاة`
                      : `${links.filter(l => l.portal === 'rkz' && !isActive(l)).length} expired / revoked`}
                  </summary>
                  <div className="space-y-1 mt-1">
                    {links.filter(l => l.portal === 'rkz' && !isActive(l)).map(link => (
                      <div key={link.id} className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2 border border-border/20 opacity-60">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {link.label && <span className="text-[10px] text-muted-foreground truncate">{link.label}</span>}
                            <span className="text-[10px] text-muted-foreground">{timeLabel(link)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Site links */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{isRtl ? 'روابط النظام' : 'System Links'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1 pt-0">
            {[
              { label: isRtl ? 'الموقع العام'       : 'Public Site',   href: '/realestate/' },
              { label: isRtl ? 'لوحة إدارة المنصة' : 'Portal Admin',  href: '/realestate/login' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted transition-colors"
              >
                <span className="text-sm">{label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 me-2" />
          {isRtl ? 'تسجيل الخروج' : 'Sign Out'}
        </Button>

        <p className="text-center text-xs text-muted-foreground/60 pt-2">
          HousIn Smart Solutions © {new Date().getFullYear()}
        </p>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40" dir={isRtl ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{isRtl ? 'غرفة التحكم | HousIn' : 'Admin Control Room | HousIn'}</title>
      </Helmet>

      {/* Top header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Building className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
            {L.adminRoom}
          </p>
          <p className="text-sm font-semibold text-foreground leading-none truncate">{L.welcome}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={isRtl ? 'تسجيل الخروج' : 'Sign Out'}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Tab content */}
      <main className="pb-28 px-4 pt-5 max-w-xl mx-auto">
        {activeTab === 'overview'  && <OverviewTab  />}
        {activeTab === 'content'   && <ContentTab   />}
        {activeTab === 'listings'  && <ListingsTab  />}
        {activeTab === 'heatmap'   && <HeatmapTab   />}
        {activeTab === 'settings'  && <SettingsTab  />}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-40 safe-area-bottom">
        <div className="grid grid-cols-5 max-w-xl mx-auto">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                activeTab === key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${activeTab === key ? 'stroke-[2.2px]' : ''}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
