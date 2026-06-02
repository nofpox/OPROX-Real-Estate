import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import { useForgotPassword, useResetPassword } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building, AlertCircle, CheckCircle2,
  ArrowLeft, ArrowRight, Mail, KeyRound,
  BarChart3, CalendarCheck, ShieldCheck, Lock,
} from 'lucide-react';

type View = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-done';

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
  const { login, isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl }    = useLanguage();

  const [view,         setView]         = useState<View>('login');
  const [error,        setError]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Forgot-password state
  const [fpEmail,  setFpEmail]  = useState('');
  const [demoOtp,  setDemoOtp]  = useState('');
  const [fpOtp,    setFpOtp]    = useState('');
  const [newPwd,   setNewPwd]   = useState('');

  const forgotMutation = useForgotPassword();
  const resetMutation  = useResetPassword();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      setLocation('/portal/dashboard');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const authedUser = await login({ username, password });
      if (authedUser) setLocation('/portal/dashboard');
    } catch {
      setError(isRtl ? 'بيانات اعتماد غير صحيحة. يرجى المحاولة مرة أخرى.' : 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await forgotMutation.mutateAsync({ data: { email: fpEmail } });
      const otp = (res as Record<string, unknown>)?.otp;
      if (otp) setDemoOtp(String(otp));
      setView('forgot-otp');
    } catch {
      setError(isRtl ? 'تعذّر إرسال رمز التحقق. يرجى التحقق من بريدك والمحاولة مجدداً.' : 'Failed to send verification code. Please check your email and try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPwd.length < 8) {
      setError(t('portal.passwordTooShort'));
      return;
    }
    try {
      await resetMutation.mutateAsync({ data: { resetToken: fpOtp, newPassword: newPwd } });
      setView('forgot-done');
    } catch {
      setError(isRtl ? 'رمز غير صحيح أو منتهي الصلاحية. يرجى طلب رمز جديد.' : 'Invalid or expired code. Please request a new one.');
    }
  };

  const goBack = (toView: View) => () => {
    setView(toView);
    setError('');
  };

  // ── Left branding panel (shared) ───────────────────────────────────────────
  const BrandingPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col justify-between p-12 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1400&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
      </div>
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
                <p className="text-white font-semibold text-sm">{isRtl ? titleAr : titleEn}</p>
                <p className="text-primary-foreground/60 text-xs leading-relaxed mt-0.5">{isRtl ? descAr : descEn}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="relative z-10 text-xs text-primary-foreground/30">
        © {new Date().getFullYear()} Rakez Smart Solutions
      </p>
    </div>
  );

  // ── Right panel wrapper ────────────────────────────────────────────────────
  const RightPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex-1 flex flex-col justify-center items-center bg-muted px-6 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="lg:hidden mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <Building className="h-8 w-8 text-secondary" />
          <span className="font-bold text-2xl text-primary">ركز | Rakez</span>
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  // ── View: Login ────────────────────────────────────────────────────────────
  if (view === 'login') return (
    <>
      <Helmet>
        <title>Client Portal | ركز للحلول الذكية</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel />
        <RightPanel>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">{t('portal.loginTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('portal.loginSubtitle')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-5" onSubmit={handleLogin} noValidate>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.username')}
                </label>
                <Input
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.password')}
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-10"
                />
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={goBack('forgot-email')}
                    className="text-xs text-secondary hover:text-secondary/80 transition-colors"
                  >
                    {t('portal.forgotPassword')}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base"
                disabled={submitting || authLoading}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {t('portal.loggingIn')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('portal.loginButton')}
                  </span>
                )}
              </Button>
            </form>
            <div className="mt-5 pt-5 border-t border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
              {isRtl ? 'اتصال آمن ومشفر' : 'Secured with encrypted connection'}
            </div>
          </div>
          {/* Register link */}
          <p className="text-center mt-5 text-sm text-muted-foreground">
            {t('portal.noAccount')}{' '}
            <Link href="/portal/register" className="text-secondary font-medium hover:text-secondary/80 transition-colors">
              {t('portal.registerLink')}
            </Link>
          </p>
          <div className="text-center mt-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-secondary transition-colors inline-flex items-center gap-1.5">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite')}
            </Link>
          </div>
        </RightPanel>
      </div>
    </>
  );

  // ── View: Forgot — enter email ─────────────────────────────────────────────
  if (view === 'forgot-email') return (
    <>
      <Helmet><title>Reset Password | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel />
        <RightPanel>
          <button
            onClick={goBack('login')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('portal.backToLogin')}
          </button>
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">{t('portal.forgotPasswordTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('portal.forgotPasswordDesc')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-5" onSubmit={handleForgotEmail} noValidate>
              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.emailLabel')}
                </label>
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  placeholder={isRtl ? 'example@domain.com' : 'you@example.com'}
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {t('portal.sending')}
                  </span>
                ) : t('portal.sendCode')}
              </Button>
            </form>
          </div>
        </RightPanel>
      </div>
    </>
  );

  // ── View: Forgot — verify OTP + new password ───────────────────────────────
  if (view === 'forgot-otp') return (
    <>
      <Helmet><title>Reset Password | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel />
        <RightPanel>
          <button
            onClick={goBack('forgot-email')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('portal.backToLogin')}
          </button>
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">{t('portal.verificationCode')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('portal.verificationCodeHint')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
            {demoOtp && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription className="font-mono font-bold text-base tracking-widest text-center">
                  {t('portal.demoOtpHint').replace('{otp}', demoOtp)}
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-5" onSubmit={handleResetPassword} noValidate>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.verificationCode')}
                </label>
                <Input
                  id="otp"
                  value={fpOtp}
                  onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  disabled={resetMutation.isPending}
                  placeholder="123456"
                  className="h-12 text-center font-mono text-xl tracking-widest"
                />
              </div>
              <div>
                <label htmlFor="new-pwd" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.newPassword')}
                </label>
                <Input
                  id="new-pwd"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11"
                disabled={resetMutation.isPending || fpOtp.length < 6}
              >
                {resetMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {t('portal.resetting')}
                  </span>
                ) : t('portal.resetPasswordBtn')}
              </Button>
            </form>
          </div>
        </RightPanel>
      </div>
    </>
  );

  // ── View: Forgot — success ─────────────────────────────────────────────────
  return (
    <>
      <Helmet><title>Reset Password | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel />
        <RightPanel>
          <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">{t('portal.resetSuccess')}</h2>
            <Button
              onClick={() => {
                setView('login');
                setError('');
                setFpEmail('');
                setFpOtp('');
                setNewPwd('');
                setDemoOtp('');
              }}
              className="mt-4 w-full h-11"
            >
              {t('portal.backToLogin')}
            </Button>
          </div>
        </RightPanel>
      </div>
    </>
  );
};
