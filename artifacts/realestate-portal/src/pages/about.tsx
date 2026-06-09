import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ArrowLeft, Target, Eye, Award,
  Building2, Users, TrendingUp, Shield,
} from 'lucide-react';

const VALUES = {
  ar: [
    { icon: Target,    title: 'التميّز التشغيلي',  desc: 'معايير إدارة صارمة في كل عقار ندير — لا مساومة على الجودة.' },
    { icon: Eye,       title: 'الشفافية الكاملة',   desc: 'تقارير مالية دورية وأثر واضح — أنت تعرف كل ما يجري في عقارك.' },
    { icon: Shield,    title: 'الأمانة والثقة',      desc: 'ملاك العقارات يثقون بنا لأننا نتعامل مع أصولهم كأصولنا.' },
    { icon: TrendingUp,'title': 'نتائج حقيقية',      desc: 'تحسين الإيرادات وخفض التكاليف وزيادة رضا المستأجرين — هذا ما نقيّم به أنفسنا.' },
  ],
  en: [
    { icon: Target,    title: 'Operational Excellence', desc: 'Strict management standards at every property we run — no compromise on quality.' },
    { icon: Eye,       title: 'Full Transparency',       desc: 'Regular financial reports and clear outcomes — you know exactly what\'s happening in your property.' },
    { icon: Shield,    title: 'Trust & Integrity',       desc: 'Property owners trust us because we treat their assets as our own.' },
    { icon: TrendingUp, title: 'Real Results',           desc: 'Improved revenue, reduced costs, and higher tenant satisfaction — that\'s how we measure ourselves.' },
  ],
};

const PILLARS = {
  ar: [
    { icon: Building2, label: 'فنادق وشقق فندقية',   desc: 'إدارة تشغيلية شاملة' },
    { icon: Users,     label: 'مجمعات سكنية',          desc: 'مجتمعات منظّمة ومُريحة' },
    { icon: Shield,    label: 'مرافق مؤسسية',          desc: 'بيئات عمل احترافية' },
  ],
  en: [
    { icon: Building2, label: 'Hotels & Serviced Apts', desc: 'Full operational management' },
    { icon: Users,     label: 'Residential Compounds',  desc: 'Organized & comfortable communities' },
    { icon: Shield,    label: 'Corporate Facilities',   desc: 'Professional work environments' },
  ],
};

export const About: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { branding } = content;

  const values  = isRtl ? VALUES.ar  : VALUES.en;
  const pillars = isRtl ? PILLARS.ar : PILLARS.en;

  return (
    <div className="flex flex-col w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{isRtl ? `عن روزوز | ${branding.companyNameAr}` : `About | ${branding.companyNameEn}`}</title>
        <meta name="description" content={isRtl
          ? 'روزوز — شركة إدارة عقارات متخصصة في فنادق ومجمعات سكنية ومرافق مؤسسية بالمملكة العربية السعودية'
          : 'Rozoz — a specialized property management company for hotels, compounds, and corporate facilities in Saudi Arabia'} />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
            {isRtl ? 'من نحن' : 'About Us'}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight max-w-2xl">
            {isRtl
              ? 'نُدير العقارات بدقة واحترافية منذ اليوم الأول'
              : 'We Manage Properties with Precision from Day One'}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl leading-relaxed">
            {isRtl
              ? 'روزوز شركة متخصصة في إدارة الأصول العقارية في المملكة العربية السعودية — فنادق، مجمعات سكنية، ومرافق مؤسسية. نتولى كل شيء حتى يتركّز ملاك العقارات على ما يهمّهم.'
              : 'Rozoz is a specialized property asset management company in Saudi Arabia — hotels, residential compounds, and corporate facilities. We handle everything so property owners can focus on what matters.'}
          </p>
        </div>
      </section>

      {/* ── What we do ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className={isRtl ? 'text-right' : ''}>
              <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                {isRtl ? 'مهمتنا' : 'Our Mission'}
              </p>
              <h2 className="text-3xl font-bold text-primary mb-5 leading-tight">
                {isRtl
                  ? 'تحويل الأصول العقارية إلى استثمار مثمر'
                  : 'Turning Property Assets into Productive Investments'}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {isRtl
                  ? 'كثير من ملاك العقارات يمتلكون أصولاً ضخمة لكنهم يفتقرون للوقت والخبرة لإدارتها بكفاءة. روزوز تسد هذه الفجوة — نُدير العقار كاملاً وندفع لك عائداً منتظماً مع تقارير شهرية شفافة.'
                  : 'Many property owners have significant assets but lack the time or expertise to manage them efficiently. Rozoz fills this gap — we manage the property fully and deliver regular returns with transparent monthly reports.'}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {isRtl
                  ? 'نؤمن أن الإدارة الاحترافية ليست رفاهية — هي الفرق بين عقار يستنزف مواردك وعقار يُنمّي ثروتك.'
                  : "We believe professional management isn't a luxury — it's the difference between a property that drains your resources and one that grows your wealth."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {pillars.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={i} className={`flex items-center gap-4 bg-muted rounded-xl p-5 border border-border ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-primary text-sm">{p.label}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className={`text-center mb-14 ${isRtl ? 'text-right md:text-center' : ''}`}>
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'قيمنا' : 'Our Values'}
            </p>
            <h2 className="text-3xl font-bold text-primary">
              {isRtl ? 'ما يميّزنا' : 'What Sets Us Apart'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className={`bg-card rounded-2xl border border-border p-6 hover:border-secondary hover:shadow-md transition-all duration-300 ${isRtl ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-3 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-secondary" />
                    </div>
                    <h3 className="font-bold text-primary">{v.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Award className="h-8 w-8 text-secondary mx-auto mb-5" />
          <h2 className="text-3xl font-bold mb-4">
            {isRtl ? 'هل أنت مستعد للبدء؟' : 'Ready to Get Started?'}
          </h2>
          <p className="text-white/70 mb-8 text-lg max-w-lg mx-auto leading-relaxed">
            {isRtl
              ? 'دعنا نُدير عقارك باحترافية — تواصل معنا اليوم وسنضع خطة مخصصة لك.'
              : "Let us manage your property professionally — contact us today and we'll create a customized plan for you."}
          </p>
          <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-10 h-12 font-semibold">
            <Link href="/get-started">
              {isRtl ? 'ابدأ معنا' : 'Get Started'}
              {isRtl
                ? <ArrowLeft  className="ms-2.5 h-4 w-4" />
                : <ArrowRight className="ms-2.5 h-4 w-4" />}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};
