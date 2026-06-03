import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Building, Lock, Phone } from 'lucide-react';

export const PortalRegister: React.FC = () => {
  const { isRtl } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{isRtl ? 'وصول مقيّد | ركز للحلول الذكية' : 'Access Restricted | Rakez Smart Solutions'}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex">
        {/* Branding panel */}
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
            <p className="text-primary-foreground/70 text-base leading-relaxed">
              {isRtl
                ? 'وصول حصري للمستثمرين المسجلين وشركاء ركز للحلول الذكية.'
                : 'Exclusive access for registered investors and partners of Rakez Smart Solutions.'}
            </p>
          </div>
          <p className="relative z-10 text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} Rakez Smart Solutions
          </p>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col justify-center items-center bg-muted px-6 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <Building className="h-8 w-8 text-secondary" />
              <span className="font-bold text-2xl text-primary">ركز | Rakez</span>
            </Link>
          </div>

          <div className="w-full max-w-md">
            {/* Restricted Access Card */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
              {/* Shield icon */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-primary" />
              </div>

              <h1 className="text-2xl font-bold text-primary mb-3">
                {isRtl ? 'وصول مقيّد' : 'Access Restricted'}
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {isRtl
                  ? 'هذه البوابة مخصصة حصرياً لشركائنا المستثمرين المسجلين لدى ركز للحلول الذكية.'
                  : 'This portal is exclusively for our registered investment partners of Rakez Smart Solutions.'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                {isRtl
                  ? 'للوصول إلى لوحة التحكم الخاصة بك، يرجى تسجيل الدخول باستخدام بياناتك المعتمدة، أو التواصل مع إدارة العلاقات لطلب الوصول.'
                  : 'To access your dashboard, please log in with your credentials, or contact our relationship management team for assistance.'}
              </p>

              <div className="space-y-3">
                <Button asChild className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/portal">
                    <Lock className={`h-4 w-4 ${isRtl ? 'ms-2' : 'me-2'}`} />
                    {isRtl ? 'تسجيل الدخول' : 'Sign In to Your Account'}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-11">
                  <Link href="/contact">
                    <Phone className={`h-4 w-4 ${isRtl ? 'ms-2' : 'me-2'}`} />
                    {isRtl ? 'التواصل مع فريق الإدارة' : 'Contact Relationship Management'}
                  </Link>
                </Button>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                {isRtl ? 'بوابة آمنة ومشفرة للمستثمرين فقط' : 'Secured exclusive portal for investors only'}
              </div>
            </div>

            <div className="text-center mt-5">
              <Link href="/" className="text-sm text-muted-foreground hover:text-secondary transition-colors inline-flex items-center gap-1.5">
                {isRtl ? 'العودة للموقع الرئيسي' : 'Back to website'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
