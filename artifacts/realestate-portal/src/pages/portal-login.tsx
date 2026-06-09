import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import {
  Lock, ArrowRight, ArrowLeft,
  RefreshCw, KeyRound, Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Step = 'creds' | 'otp';

function RozozLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/realestate/rozoz-logo.png"
      alt="Rozoz"
      className={`object-contain ${className}`}
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export const PortalLogin: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, setUserFromLoginResponse } = usePortalAuth();
  const { isRtl } = useLanguage();
  const [, navigate] = useLocation();

  const [step,         setStep]         = useState<Step>('creds');
  const [identifier,   setIdentifier]   = useState('');
  const [password,     setPassword]     = useState('');
  const [otp,          setOtp]          = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [maskedEmail,  setMaskedEmail]  = useState('');
  const [demoOtp,      setDemoOtp]      = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/portal/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/login-step1', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError(String(data.error ?? (isRtl ? 'فشل تسجيل الدخول' : 'Login failed')));
        setLoading(false); return;
      }
      setPendingToken(String(data.pendingToken ?? ''));
      setMaskedEmail(String(data.maskedEmail ?? ''));
      setDemoOtp(String(data.demoOtp ?? data.otp ?? ''));
      setStep('otp');
    } catch {
      setError(isRtl ? 'خطأ في الاتصال. يرجى المحاولة مرة أخرى.' : 'Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 4) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/login-step2', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, otp: otp.trim() }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError(String(data.error ?? (isRtl ? 'رمز غير صحيح' : 'Invalid code')));
        setLoading(false); return;
      }
      if (data.user) {
        setUserFromLoginResponse(data.user as Record<string, unknown>);
      }
    } catch {
      setError(isRtl ? 'خطأ في الاتصال. يرجى المحاولة مرة أخرى.' : 'Connection error. Please try again.');
      setLoading(false);
    }
  };

  // Guest explore — navigates directly to the public Rozoz portal (view-only by nature)
  const handleGuestExplore = () => {
    window.location.href = '/realestate/';
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <RefreshCw className="h-6 w-6 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-primary flex flex-col items-center justify-center px-5 py-10"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <Helmet>
        <title>{isRtl ? 'غرفة التحكم | روزوز' : 'Admin Control Room | Rozoz'}</title>
      </Helmet>

      {/* ── Official Brand Mark ─────────────────────────────────────────────── */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <RozozLogo className="h-24 w-auto" />
        <p className="text-white/40 text-xs tracking-[0.25em] uppercase mt-1">
          {isRtl ? 'الحلول الذكية للعقارات' : 'Smart Real Estate Solutions'}
        </p>
      </div>

      {/* ── Admin Login Card ────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-xl border border-border/50">
        {step === 'creds' ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6 text-secondary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">
                {isRtl ? 'الدخول الإداري' : 'Admin Access'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {isRtl ? 'مخصص للمشرفين والمديرين فقط' : 'Authorized personnel only'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                {isRtl ? 'المعرّف (إيميل أو اسم المستخدم)' : 'Email / Username'}
              </label>
              <Input
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="placeholder@rozoz.com"
                type="text"
                autoComplete="username"
                autoFocus
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                {isRtl ? 'كلمة المرور' : 'Password'}
              </label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive text-center bg-destructive/5 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={!identifier.trim() || loading}
              className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-xl mt-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isRtl ? 'متابعة' : 'Continue'}
                  {isRtl
                    ? <ArrowLeft  className="h-4 w-4 ms-2" />
                    : <ArrowRight className="h-4 w-4 ms-2" />}
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="h-6 w-6 text-secondary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">
                {isRtl ? 'رمز التحقق' : 'Verification Code'}
              </h1>
              {maskedEmail && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isRtl ? `أُرسل الرمز إلى ${maskedEmail}` : `Code sent to ${maskedEmail}`}
                </p>
              )}
              {demoOtp && (
                <p className="mt-3 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-2 text-center">
                  {isRtl ? `رمز تجريبي: ` : 'Demo code: '}<strong className="font-mono tracking-widest">{demoOtp}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide text-center">
                {isRtl ? 'أدخل الرمز المكون من 4 أرقام' : 'Enter 4-digit code'}
              </label>
              <Input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                type="text"
                inputMode="numeric"
                className="text-center text-2xl tracking-widest h-14 font-mono"
                maxLength={4}
                autoFocus
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive text-center bg-destructive/5 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={otp.length < 4 || loading}
              className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-xl"
            >
              {loading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : (isRtl ? 'دخول' : 'Sign In')}
            </Button>

            <button
              type="button"
              onClick={() => { setStep('creds'); setOtp(''); setError(''); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
            >
              {isRtl ? '← العودة' : '← Go back'}
            </button>
          </form>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex items-center gap-3 mt-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/25 text-xs uppercase tracking-widest">
          {isRtl ? 'أو' : 'or'}
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* ── Guest Explore Button ─────────────────────────────────────────────── */}
      <div className="w-full max-w-sm mt-4">
        <button
          onClick={handleGuestExplore}
          className="
            group w-full h-14 rounded-2xl border border-secondary/40
            bg-secondary/8 hover:bg-secondary/15
            flex items-center justify-center gap-3
            transition-all duration-300
            hover:border-secondary/70 hover:shadow-[0_0_24px_rgba(201,168,76,0.18)]
            active:scale-[0.98]
          "
          style={{ backgroundColor: 'rgba(201,168,76,0.06)' }}
        >
          <Compass className="h-5 w-5 text-secondary shrink-0 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-secondary font-semibold text-sm tracking-wide text-center leading-snug">
            استكشف تجربة Rozoz&nbsp;&nbsp;|&nbsp;&nbsp;Explore Rozoz Experience
          </span>
        </button>
        <p className="text-white/20 text-[10px] text-center mt-2 tracking-wide">
          {isRtl ? 'وصول للزوار — عرض فقط بدون بيانات' : 'Guest access — view only, no credentials needed'}
        </p>
      </div>

      <p className="mt-8 text-xs text-white/20 text-center">
        © {new Date().getFullYear()} Rozoz Smart Solutions
      </p>
    </div>
  );
};
