import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import { Building, ArrowLeft, ArrowRight, BarChart3, CalendarCheck, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const PORTAL_FEATURES = [
  {
    icon:    BarChart3,
    titleEn: 'Financial Reports',
    titleAr: 'التقارير المالية',
    descEn:  'Monthly revenue, expenses and net profit dashboards.',
    descAr:  'لوحات معلومات الإيرادات والمصروفات والأرباح الشهرية.',
  },
  {
    icon:    CalendarCheck,
    titleEn: 'Direct Booking',
    titleAr: 'الحجز المباشر',
    descEn:  'Real-time room availability and instant reservations.',
    descAr:  'توافر الغرف في الوقت الفعلي وإجراء الحجوزات فورًا.',
  },
  {
    icon:    ShieldCheck,
    titleEn: 'Property Oversight',
    titleAr: 'الإشراف على العقارات',
    descEn:  'Live occupancy rates and booking status across all properties.',
    descAr:  'معدلات الإشغال الحية وحالة الحجوزات لجميع العقارات.',
  },
];

export const PortalLogin: React.FC = () => {
  const { login, isAuthenticated, isLoading } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl }   = useLanguage();
  const { toast }      = useToast();

  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  if (isAuthenticated) {
    setLocation('/portal/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password, tenantSlug });
      setLocation('/portal/dashboard');
    } catch {
      toast({
        variant:     'destructive',
        title:       t('portal.loginErrorTitle') || 'Login Failed',
        description: t('portal.loginErrorDesc')  || 'Invalid credentials or organisation ID.',
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Client Portal | ركز للحلول الذكية</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex">

        {/* ── Left panel — branding + feature list ──────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col justify-between p-12 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1400&auto=format&fit=crop"
              alt=""
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2.5 mb-14">
              <Building className="h-7 w-7 text-secondary" />
              <span className="font-bold text-xl text-white">ركز | Rakez</span>
            </Link>

            <h2 className="text-3xl font-bold text-white mb-3">
              {isRtl ? 'بوابة العملاء' : 'Client Portal'}
            </h2>
            <p className="text-primary-foreground/70 text-base leading-relaxed mb-10">
              {isRtl
                ? 'وصول آمن لإدارة عقاراتك والاطلاع على تقاريرك المالية.'
                : 'Secure access to manage your properties and view financial performance.'}
            </p>

            <div className="space-y-6">
              {PORTAL_FEATURES.map(({ icon: Icon, titleEn, titleAr, descEn, descAr }) => (
                <div key={titleEn} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {isRtl ? titleAr : titleEn}
                    </p>
                    <p className="text-primary-foreground/60 text-xs leading-relaxed mt-0.5">
                      {isRtl ? descAr : descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} Rakez Smart Solutions
          </p>
        </div>

        {/* ── Right panel — login form ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center items-center bg-muted px-6 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <Building className="h-8 w-8 text-secondary" />
              <span className="font-bold text-2xl text-primary">ركز | Rakez</span>
            </Link>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-primary">
                {t('portal.loginTitle') || 'Sign in to your portal'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('portal.loginSubtitle') || 'Access your managed properties and reports'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="tenantSlug" className="block text-sm font-medium text-primary mb-1.5">
                    {t('portal.organizationId') || 'Organisation ID'}
                  </label>
                  <Input
                    id="tenantSlug"
                    autoComplete="organization"
                    required
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder={t('portal.organizationIdPlaceholder') || 'e.g. your-company'}
                    className="h-10"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-primary mb-1.5">
                    {t('portal.username') || 'Username'}
                  </label>
                  <Input
                    id="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
                    {t('portal.password') || 'Password'}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {isRtl ? 'جارٍ تسجيل الدخول...' : 'Signing in...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('portal.loginButton') || 'Sign in securely'}
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                {isRtl ? 'اتصال آمن ومشفر' : 'Secured with encrypted connection'}
              </div>
            </div>

            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-secondary transition-colors inline-flex items-center gap-1.5"
              >
                {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                {t('portal.backToWebsite') || 'Back to website'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
