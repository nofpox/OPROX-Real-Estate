import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Building, KeyRound, Search, Bell, BarChart2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const BENEFITS = [
  {
    icon: Search,
    en: 'AI-powered property search — describe what you need, we find it.',
    ar: 'بحث ذكي بالذكاء الاصطناعي — صِف ما تحتاجه، ونجده لك.',
  },
  {
    icon: Bell,
    en: 'Saved searches with instant alerts when a matching listing goes live.',
    ar: 'عمليات بحث محفوظة مع تنبيهات فورية عند إضافة عقار مطابق.',
  },
  {
    icon: BarChart2,
    en: 'Personal dashboard to track your preferences, searches, and inquiries.',
    ar: 'لوحة تحكم شخصية لتتبع تفضيلاتك وعمليات البحث والاستفسارات.',
  },
  {
    icon: KeyRound,
    en: 'Direct access to property managers and verified listings.',
    ar: 'وصول مباشر لمديري العقارات والعروض الموثقة.',
  },
];

export const Join: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { branding } = content;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const companyName = isRtl ? branding.companyNameAr : branding.companyNameEn;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{isRtl ? `ابدأ الآن | ${companyName}` : `Get Started | ${companyName}`}</title>
        <meta
          name="description"
          content={isRtl
            ? 'سجّل حساباً مجانياً للوصول إلى البحث الذكي والتنبيهات الفورية ولوحة المستثمر.'
            : 'Create a free account for AI-powered search, instant alerts, and your personal investor dashboard.'
          }
        />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-24 md:py-32">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          <div className="absolute top-0 start-0 w-96 h-96 bg-secondary rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 end-0 w-64 h-64 bg-secondary/60 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-6">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="" className="h-4 w-4 object-contain" />
              : <Building className="h-3.5 w-3.5" />
            }
            {companyName}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {isRtl
              ? 'ابحث عن عقارك بذكاء'
              : 'Find Your Property, Smarter'}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/75 mb-10 max-w-2xl mx-auto leading-relaxed">
            {isRtl
              ? 'مساعد ذكي يفهم ما تبحث عنه، تنبيهات فورية عند توفر عقار مناسب، ولوحة شخصية لإدارة بحثك — كل ذلك مجاناً.'
              : 'An AI assistant that understands your needs, instant alerts when the right property is listed, and a personal dashboard to manage your search — all free.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/portal/register"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {isRtl ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              <Arrow className="h-4 w-4" />
            </Link>
            <Link
              href="/portal"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3.5 rounded-xl font-semibold text-base transition-all"
            >
              <KeyRound className="h-4 w-4" />
              {isRtl ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>

          <p className="mt-4 text-xs text-primary-foreground/40">
            {isRtl ? 'لا بطاقة ائتمانية مطلوبة' : 'No credit card required'}
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-12">
            {isRtl ? 'لماذا تنضم إلينا؟' : 'Why Join?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map(({ icon: Icon, en, ar }, i) => (
              <div key={i} className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6 hover:border-secondary/40 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed pt-1.5">{isRtl ? ar : en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="py-10 bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
          {[
            { num: '500+', en: 'Active Listings', ar: 'عقار نشط' },
            { num: '24h', en: 'Response Time', ar: 'وقت الاستجابة' },
            { num: '100%', en: 'Verified Listings', ar: 'عروض موثقة' },
          ].map(({ num, en, ar }) => (
            <div key={num}>
              <p className="text-2xl font-bold text-primary">{num}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isRtl ? ar : en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <CheckCircle2 className="h-10 w-10 text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-3">
            {isRtl ? 'ابدأ خلال 30 ثانية' : 'Ready in 30 seconds'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            {isRtl
              ? 'أنشئ حسابك الآن وابدأ في البحث الذكي عن عقارات مميزة في المملكة.'
              : 'Create your account now and start smart-searching for properties across Saudi Arabia.'}
          </p>
          <Link
            href="/portal/register"
            className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg"
          >
            {isRtl ? 'ابدأ الآن مجاناً' : 'Get Started Free'}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
