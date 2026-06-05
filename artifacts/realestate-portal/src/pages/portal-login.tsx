import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
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
  Fingerprint, Smartphone, RefreshCw,
  Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

type View = 'login' | 'otp' | 'biometric-offer' | 'forgot-email' | 'forgot-otp' | 'forgot-done';

const PORTAL_WA_USER_KEY = 'portal_wa_user';

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

const BrandingPanel: React.FC<{ isRtl: boolean }> = ({ isRtl }) => (
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
        {isRtl ? 'بوابة المستثمرين' : 'Investor Portal'}
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

const RightPanel: React.FC<{ isRtl: boolean; children: React.ReactNode }> = ({ isRtl, children }) => (
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

export const PortalLogin: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { t, isRtl } = useLanguage();

  const [view,           setView]           = useState<View>('login');
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [biometricBusy,  setBiometricBusy]  = useState(false);

  const [identifier,     setIdentifier]     = useState('');
  const [password,       setPassword]       = useState('');

  const [pendingToken,   setPendingToken]   = useState('');
  const [maskedEmail,    setMaskedEmail]    = useState('');
  const [loginOtp,       setLoginOtp]       = useState('');
  const [demoLoginOtp,   setDemoLoginOtp]   = useState('');

  const [waAvailable,    setWaAvailable]    = useState(false);
  const [waUser,         setWaUser]         = useState('');

  const [showPassword,   setShowPassword]   = useState(false);

  const [fpEmail,        setFpEmail]        = useState('');
  const [fpDemoOtp,      setFpDemoOtp]      = useState('');
  const [fpOtp,          setFpOtp]          = useState('');
  const [newPwd,         setNewPwd]         = useState('');
  const [showNewPwd,     setShowNewPwd]     = useState(false);

  const forgotMutation = useForgotPassword();
  const resetMutation  = useResetPassword();
  const DASH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') + '/portal/dashboard';

  useEffect(() => {
    // In dev mode the auth context always returns isAuthenticated=true — go straight to dashboard
    if (isAuthenticated && !authLoading) {
      window.location.replace(DASH);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const stored = localStorage.getItem(PORTAL_WA_USER_KEY) ?? '';
    const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;
    if (supported && stored) {
      setWaAvailable(true);
      setWaUser(stored);
    }
  }, []);

  const goBack = (toView: View) => () => { setView(toView); setError(''); };

  const handleLoginStep1 = async (e: React.FormEvent, overrideId?: string) => {
    e?.preventDefault();
    const ident = (overrideId ?? identifier).trim();
    if (!ident) return;
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/portal/auth/login-step1', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident, password: password || 'dev' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isRtl ? 'بيانات اعتماد غير صحيحة. يرجى المحاولة مرة أخرى.' : 'Invalid credentials. Please try again.'));
        return;
      }
      // Dev bypass: session cookie already set server-side — redirect immediately
      if (data.directLogin) {
        window.location.replace(DASH);
        return;
      }
      setPendingToken(data.pendingToken);
      setMaskedEmail(data.maskedEmail ?? '');
      if (data.demoOtp) setDemoLoginOtp(data.demoOtp);
      setLoginOtp('');
      setView('otp');
    } catch {
      setError(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleLoginStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtp.length < 6) return;
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/portal/auth/login-step2', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, otp: loginOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isRtl ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.'));
        return;
      }
      const webAuthnOk = typeof window !== 'undefined' && !!window.PublicKeyCredential;
      if (webAuthnOk) {
        try {
          const credRes = await fetch('/api/portal/auth/webauthn/credentials', { credentials: 'include' });
          if (credRes.ok) {
            const credData = await credRes.json();
            if (credData.count === 0) { setView('biometric-offer'); return; }
          }
        } catch {}
      }
      window.location.replace(DASH);
    } catch {
      setError(isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleBiometricLogin = async () => {
    if (!waUser) return;
    setBiometricBusy(true); setError('');
    try {
      const optRes = await fetch('/api/portal/auth/webauthn/authenticate-options', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: waUser }),
      });
      if (!optRes.ok) throw new Error('Failed to get options');
      const { challengeKey, ...options } = await optRes.json();
      const authResponse = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch('/api/portal/auth/webauthn/authenticate-verify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeKey, ...authResponse }),
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json();
        throw new Error(d.error ?? 'Verification failed');
      }
      window.location.replace(DASH);
    } catch (err) {
      const msg = err instanceof Error ? err.name : '';
      if (msg === 'NotAllowedError') {
        setError(isRtl ? 'تم إلغاء التحقق البيومتري أو انتهت مهلته.' : 'Biometric verification was cancelled or timed out.');
      } else {
        setError(isRtl ? 'فشل التحقق البيومتري. يرجى استخدام كلمة المرور.' : 'Biometric verification failed. Please use your password instead.');
      }
    } finally { setBiometricBusy(false); }
  };

  const handleRegisterBiometric = async () => {
    setBiometricBusy(true); setError('');
    try {
      const optRes = await fetch('/api/portal/auth/webauthn/register-options', {
        method: 'POST', credentials: 'include',
      });
      if (!optRes.ok) throw new Error('Failed to get options');
      const options = await optRes.json();
      const regResponse = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch('/api/portal/auth/webauthn/register-verify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResponse),
      });
      if (!verifyRes.ok) throw new Error('Verification failed');
      localStorage.setItem(PORTAL_WA_USER_KEY, identifier.trim());
      window.location.replace(DASH);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        window.location.replace(DASH);
      } else {
        setError(isRtl ? 'فشل التسجيل البيومتري. يمكنك تفعيله لاحقاً.' : 'Biometric setup failed. You can enable it later from settings.');
        setTimeout(() => window.location.replace(DASH), 2000);
      }
    } finally { setBiometricBusy(false); }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await forgotMutation.mutateAsync({ data: { email: fpEmail } });
      const otp = (res as Record<string, unknown>)?.otp;
      if (otp) setFpDemoOtp(String(otp));
      setView('forgot-otp');
    } catch {
      setError(isRtl ? 'تعذّر إرسال رمز التحقق.' : 'Failed to send verification code. Please check your email.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPwd.length < 8) { setError(t('portal.passwordTooShort')); return; }
    try {
      await resetMutation.mutateAsync({ data: { resetToken: fpOtp, newPassword: newPwd } });
      setView('forgot-done');
    } catch {
      setError(isRtl ? 'رمز غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired code. Please request a new one.');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // ── View: Login (credentials) ───────────────────────────────────────────────
  if (view === 'login') return (
    <>
      <Helmet>
        <title>{isRtl ? 'بوابة المستثمرين | ركز للحلول الذكية' : 'Investor Portal | Rakez Smart Solutions'}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-primary">{t('portal.loginTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('portal.loginSubtitle')}</p>
          </div>

          {waAvailable && (
            <div className="mb-5">
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                onClick={handleBiometricLogin}
                disabled={biometricBusy}
              >
                {biometricBusy ? (
                  <span className="flex items-center gap-2.5">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm font-medium text-primary">{isRtl ? 'جاري التحقق...' : 'Verifying…'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Fingerprint className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    <div className="text-start">
                      <p className="text-sm font-semibold text-primary leading-tight">
                        {isRtl ? 'تسجيل الدخول ببصمة الوجه / الإصبع' : 'Sign in with Face ID / Fingerprint'}
                      </p>
                      <p className="text-xs text-muted-foreground">{waUser}</p>
                    </div>
                  </span>
                )}
              </Button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{isRtl ? 'أو تسجيل الدخول بكلمة المرور' : 'or sign in with password'}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          {/* ── Restricted Access Warning ───────────────────────────── */}
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs leading-snug">
              {isRtl
                ? 'تحذير: هذه المنطقة مخصصة حصراً للشركاء المعتمدين. يُحظر الدخول غير المرخّص ويخضع للمراقبة والمساءلة القانونية.'
                : 'RESTRICTED ACCESS — Authorised Partners Only. Unauthorised access is strictly prohibited and subject to monitoring and legal action.'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-5" onSubmit={handleLoginStep1} noValidate>
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-primary mb-1.5">
                  {isRtl ? 'البريد الإلكتروني أو رقم الجوال' : 'Email, Mobile or Username'}
                </label>
                <Input
                  id="identifier"
                  autoComplete="username email"
                  required
                  dir={isRtl ? 'rtl' : 'ltr'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={isRtl ? 'example@domain.com أو 0501234567' : 'email@domain.com or username'}
                  className={`h-10${isRtl ? ' text-right' : ''}`}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.password')}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    dir={isRtl ? 'rtl' : 'ltr'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`h-10 pe-10${isRtl ? ' text-right' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(v => !v); }}
                    className="absolute inset-y-0 end-0 z-10 flex items-center px-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-end mt-1.5">
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
                disabled={submitting || !identifier.trim()}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isRtl ? 'جاري التحقق...' : 'Verifying…'}
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
              {isRtl ? 'اتصال آمن ومشفر — يتطلب رمز تحقق عبر البريد الإلكتروني' : 'End-to-end encrypted · Email OTP required'}
            </div>
          </div>
          <p className="text-center mt-5 text-xs text-muted-foreground leading-relaxed">
            {isRtl
              ? 'هذه البوابة مخصصة حصرياً للمستثمرين المسجلين. للحصول على وصول، يرجى التواصل مع فريق إدارة العلاقات.'
              : 'This portal is for registered investors only. Contact our relationship management team to request access.'}
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

  // ── View: OTP verification ──────────────────────────────────────────────────
  if (view === 'otp') return (
    <>
      <Helmet><title>{isRtl ? 'التحقق من الهوية | ركز' : 'Verify Identity | Rakez'}</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
          <button
            onClick={goBack('login')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('portal.backToLogin')}
          </button>
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <Smartphone className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">
              {isRtl ? 'التحقق من الهوية' : 'Verify Your Identity'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRtl
                ? `أرسلنا رمز مكون من 6 أرقام إلى ${maskedEmail}`
                : `We sent a 6-digit code to ${maskedEmail}`}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
            {demoLoginOtp && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription className="text-sm">
                  {isRtl ? 'وضع العرض التجريبي — الرمز: ' : 'Demo mode — OTP: '}
                  <span className="font-mono font-bold tracking-widest text-base">{demoLoginOtp}</span>
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form className="space-y-5" onSubmit={handleLoginStep2} noValidate>
              <div>
                <label htmlFor="login-otp" className="block text-sm font-medium text-primary mb-1.5">
                  {isRtl ? 'رمز التحقق' : 'Verification Code'}
                </label>
                <Input
                  id="login-otp"
                  value={loginOtp}
                  onChange={e => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  disabled={submitting}
                  placeholder="123456"
                  style={{ textAlign: isRtl ? 'right' : 'left' }}
                  className="h-14 font-mono text-2xl tracking-[0.5em]"
                />
                <p className={`text-xs text-muted-foreground mt-1.5${isRtl ? ' text-right' : ' text-left'}`}>
                  {isRtl ? 'ينتهي صلاحية الرمز خلال 5 دقائق' : 'Code expires in 5 minutes'}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={submitting || loginOtp.length < 6}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isRtl ? 'جاري التحقق...' : 'Verifying…'}
                  </span>
                ) : (isRtl ? 'تأكيد الرمز' : 'Confirm Code')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={goBack('login')}
                className="text-xs text-muted-foreground hover:text-secondary transition-colors inline-flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {isRtl ? 'لم يصل الرمز؟ أعد المحاولة' : "Didn't receive it? Go back and resend"}
              </button>
            </div>
          </div>
        </RightPanel>
      </div>
    </>
  );

  // ── View: Biometric offer (after first successful login) ────────────────────
  if (view === 'biometric-offer') return (
    <>
      <Helmet><title>{isRtl ? 'تفعيل بصمة الدخول | ركز' : 'Enable Biometric Login | Rakez'}</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
          <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Fingerprint className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-primary mb-2">
              {isRtl ? 'تفعيل بصمة الدخول' : 'Enable Biometric Login'}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1">
              {isRtl
                ? 'سجّل الدخول في المرة القادمة بسرعة وأمان باستخدام بصمة الوجه أو الإصبع.'
                : 'Next time, sign in instantly and securely using Face ID or your fingerprint.'}
            </p>
            <p className="text-xs text-muted-foreground/70 mb-7">
              {isRtl ? 'بيانات البصمة تبقى على جهازك فقط ولا تُرسل إلى أي مكان.' : 'Biometric data stays on your device and is never transmitted.'}
            </p>
            {error && (
              <Alert variant="destructive" className="mb-4 text-start">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base"
                onClick={handleRegisterBiometric}
                disabled={biometricBusy}
              >
                {biometricBusy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isRtl ? 'جاري التسجيل...' : 'Setting up…'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    {isRtl ? 'تفعيل بصمة الدخول' : 'Enable Biometric Login'}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-sm text-muted-foreground"
                disabled={biometricBusy}
                onClick={() => window.location.replace(DASH)}
              >
                {isRtl ? 'تخطي الآن — يمكنني تفعيله لاحقاً' : "Skip for now — I'll enable it later"}
              </Button>
            </div>
          </div>
        </RightPanel>
      </div>
    </>
  );

  // ── View: Forgot — enter email ──────────────────────────────────────────────
  if (view === 'forgot-email') return (
    <>
      <Helmet><title>Need Help Logging In? | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
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
              <Button type="submit" className="w-full h-11" disabled={forgotMutation.isPending}>
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

  // ── View: Forgot — verify OTP + new password ────────────────────────────────
  if (view === 'forgot-otp') return (
    <>
      <Helmet><title>Reset Password | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
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
            {fpDemoOtp && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription className="font-mono font-bold text-base tracking-widest text-center">
                  {t('portal.demoOtpHint').replace('{otp}', fpDemoOtp)}
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
                <label htmlFor="fp-otp" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.verificationCode')}
                </label>
                <Input
                  id="fp-otp"
                  value={fpOtp}
                  onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required maxLength={6} inputMode="numeric"
                  dir="ltr"
                  disabled={resetMutation.isPending}
                  placeholder="123456"
                  style={{ textAlign: isRtl ? 'right' : 'left' }}
                  className="h-12 font-mono text-xl tracking-widest"
                />
              </div>
              <div>
                <label htmlFor="new-pwd" className="block text-sm font-medium text-primary mb-1.5">
                  {t('portal.newPassword')}
                </label>
                <div className="relative">
                  <Input
                    id="new-pwd"
                    type={showNewPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    dir={isRtl ? 'rtl' : 'ltr'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className={`h-10 pe-10${isRtl ? ' text-right' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showNewPwd ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNewPwd(v => !v); }}
                    className="absolute inset-y-0 end-0 z-10 flex items-center px-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showNewPwd ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={resetMutation.isPending || fpOtp.length < 6}>
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

  // ── View: Forgot — success ──────────────────────────────────────────────────
  return (
    <>
      <Helmet><title>Password Reset | Rakez</title></Helmet>
      <div className="min-h-screen flex">
        <BrandingPanel isRtl={isRtl} />
        <RightPanel isRtl={isRtl}>
          <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">{t('portal.resetSuccess')}</h2>
            <Button
              onClick={() => { setView('login'); setError(''); setFpEmail(''); setFpOtp(''); setNewPwd(''); setFpDemoOtp(''); }}
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
