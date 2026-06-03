import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'wouter';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import { useRegisterPortalClient } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building, AlertCircle, CheckCircle2,
  ArrowLeft, ArrowRight, UserPlus, ShieldCheck,
} from 'lucide-react';

export const PortalRegister: React.FC = () => {
  const { login }      = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl }  = useLanguage();

  const registerMutation = useRegisterPortalClient();

  const [form, setForm] = useState({
    displayName:     '',
    email:           '',
    phone:           '',
    username:        '',
    password:        '',
    confirmPassword: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.phone.trim()) {
      setError(t('portal.phoneRequired'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('portal.passwordTooShort'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('portal.passwordMismatch'));
      return;
    }

    try {
      await registerMutation.mutateAsync({
        data: {
          displayName: form.displayName.trim(),
          email:       form.email.trim().toLowerCase(),
          phone:       form.phone.trim(),
          username:    form.username.trim().toLowerCase(),
          password:    form.password,
        },
      });

      setSuccess(true);
      await login({ username: form.username.trim().toLowerCase(), password: form.password });
      setLocation('/portal/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? 'Registration failed';
      if (msg.toLowerCase().includes('taken')) {
        setError(t('portal.usernameTaken'));
      } else if (msg.toLowerCase().includes('8 character')) {
        setError(t('portal.passwordTooShort'));
      } else {
        setError(msg);
      }
    }
  };

  const busy = registerMutation.isPending;

  return (
    <>
      <Helmet>
        <title>Create Account | ركز للحلول الذكية</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex">

        {/* ── Left branding panel — desktop only ──────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col justify-between p-12 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1400&auto=format&fit=crop"
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
              {isRtl ? 'انضم إلى ركز' : 'Join Rakez'}
            </h2>
            <p className="text-primary-foreground/70 text-base leading-relaxed mb-6">
              {isRtl
                ? 'أنشئ حسابك للوصول إلى لوحة إدارة عقاراتك ومحفظتك الاستثمارية.'
                : 'Create your account to access your property management dashboard and portfolio.'}
            </p>
            <div className="space-y-4 text-primary-foreground/70 text-sm">
              {(isRtl ? [
                'إدارة عقاراتك ووحداتك',
                'متابعة الحجوزات والمالية',
                'التواصل مع فريق الإدارة',
              ] : [
                'Manage your properties and units',
                'Track bookings and financials',
                'Communicate with the management team',
              ]).map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} Rakez Smart Solutions
          </p>
        </div>

        {/* ── Right panel — registration form ─────────────────────────────── */}
        <div
          className="flex-1 flex flex-col justify-center items-center bg-muted px-4 sm:px-6 py-10 sm:py-12"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <Building className="h-8 w-8 text-secondary" />
              <span className="font-bold text-2xl text-primary">ركز | Rakez</span>
            </Link>
          </div>

          <div className="w-full max-w-lg">
            {/* Back link */}
            <Link
              href="/portal"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
            >
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.hasAccount')} {t('portal.signIn')}
            </Link>

            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-secondary" />
              </div>
              <h1 className="text-2xl font-bold text-primary">{t('portal.registerTitle')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('portal.registerSubtitle')}</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-5 sm:p-8">
              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>{t('portal.registrationSuccess')}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>

                {/* Row 1: Full name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium text-primary mb-1.5">
                      {t('portal.fullName')} *
                    </label>
                    <Input
                      id="reg-name"
                      autoComplete="name"
                      required
                      value={form.displayName}
                      onChange={update('displayName')}
                      placeholder={isRtl ? 'أحمد العمري' : 'Ahmad Al-Amri'}
                      className="h-10"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-medium text-primary mb-1.5">
                      {t('portal.emailLabel')} *
                    </label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      placeholder="you@example.com"
                      className="h-10"
                      disabled={busy}
                    />
                  </div>
                </div>

                {/* Row 2: Username (full-width) */}
                <div>
                  <label htmlFor="reg-username" className="block text-sm font-medium text-primary mb-1.5">
                    {t('portal.username')} *
                  </label>
                  <Input
                    id="reg-username"
                    autoComplete="username"
                    required
                    value={form.username}
                    onChange={update('username')}
                    placeholder="ahmad_al_amri"
                    className="h-10"
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.usernameHint')}</p>
                </div>

                {/* Row 3: Phone (full-width, required) + privacy disclaimer */}
                <div>
                  <label htmlFor="reg-phone" className="block text-sm font-medium text-primary mb-1.5">
                    {t('portal.phone')} *
                  </label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder={isRtl ? '+966 5x xxx xxxx' : '+966 5x xxx xxxx'}
                    className="h-10"
                    disabled={busy}
                  />
                  {/* Privacy disclaimer — shown immediately below phone field */}
                  <div className="mt-2.5 flex items-start gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                    <ShieldCheck className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('portal.phoneDisclaimer')}
                    </p>
                  </div>
                </div>

                {/* Row 4: Password + Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-pwd" className="block text-sm font-medium text-primary mb-1.5">
                      {t('portal.password')} *
                    </label>
                    <Input
                      id="reg-pwd"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={form.password}
                      onChange={update('password')}
                      placeholder="••••••••"
                      className="h-10"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-pwd2" className="block text-sm font-medium text-primary mb-1.5">
                      {t('portal.confirmPassword')} *
                    </label>
                    <Input
                      id="reg-pwd2"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      placeholder="••••••••"
                      className="h-10"
                      disabled={busy}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base mt-2"
                  disabled={busy}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {t('portal.registering')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      {t('portal.registerButton')}
                    </span>
                  )}
                </Button>
              </form>
            </div>

            {/* Sign in link */}
            <p className="text-center mt-5 text-sm text-muted-foreground">
              {t('portal.hasAccount')}{' '}
              <Link href="/portal" className="text-secondary font-medium hover:text-secondary/80 transition-colors">
                {t('portal.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
