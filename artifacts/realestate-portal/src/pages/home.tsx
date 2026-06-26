import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ArrowLeft, Building2, Users, TrendingUp, Award,
  CheckCircle2, MessageCircle,
} from 'lucide-react';

const STAT_ICONS = [Building2, Users, TrendingUp, Award];

const ESTETI_WHATSAPP = '';

// ── How-it-works steps ────────────────────────────────────────────────────────
const STEPS = {
  ar: [
    { num: '01', title: 'تواصل معنا',    desc: 'أخبرنا عن عقارك وتوقعاتك — خبراؤنا يستمعون بعناية.' },
    { num: '02', title: 'نُقيّم ونقترح', desc: 'نزور العقار ونُعدّ خطة إدارية شاملة مع عرض سعر شفاف.' },
    { num: '03', title: 'نتولى الإدارة', desc: 'بعد توقيع العقد، فريقنا يُدير كل شيء ويُبلّغك بتقارير منتظمة.' },
  ],
  en: [
    { num: '01', title: 'Contact Us',       desc: 'Tell us about your property — our experts listen carefully.' },
    { num: '02', title: 'We Assess & Plan', desc: 'We visit the property and prepare a full management plan with a transparent proposal.' },
    { num: '03', title: 'We Manage It All', desc: 'After signing, our team handles everything with regular reports for you.' },
  ],
};

type LiveStats = Record<string, number>;

type LeadForm   = { name: string; email: string; phone: string };
type LeadStatus = 'idle' | 'submitting' | 'success' | 'error';

export const Home: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const [liveStats, setLiveStats] = useState<LiveStats>({});

  const [lead,       setLead]       = useState<LeadForm>({ name: '', email: '', phone: '' });
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('idle');

  useEffect(() => {
    fetch('/realestate-api/cms/live-stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LiveStats) => setLiveStats(data))
      .catch(() => {});
  }, []);

  const { hero, stats, services, branding } = content;

  const steps = isRtl ? STEPS.ar : STEPS.en;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email) return;
    setLeadStatus('submitting');
    try {
      const res = await fetch('/realestate-api/guest/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    lead.name,
          email:   lead.email,
          phone:   lead.phone,
          subject: isRtl ? 'استفسار شراكة' : 'Partnership Inquiry',
          message: isRtl
            ? 'طلب شراكة جديد مُقدَّم عبر الصفحة الرئيسية.'
            : 'New partnership inquiry submitted via homepage.',
        }),
      });
      if (!res.ok) throw new Error('failed');
      setLeadStatus('success');
      setLead({ name: '', email: '', phone: '' });
    } catch {
      setLeadStatus('error');
    }
  };

  return (
    <div className="flex flex-col w-full">
      <Helmet>
        <title>{branding.companyNameAr} | {branding.companyNameEn}</title>
        <meta name="description" content={isRtl ? hero.subtitleAr : hero.subtitleEn} />
        <meta property="og:title" content={`${branding.companyNameAr} | ${branding.companyNameEn}`} />
        <meta property="og:description" content={isRtl ? hero.subtitleAr : hero.subtitleEn} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative h-[92vh] min-h-[640px] flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/65 to-primary/92 z-10" />
          <img
            src={hero.imageUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"}
            alt="Modern Architecture"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <div className="container relative z-20 px-4 text-center text-white max-w-4xl mx-auto">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <Award className="h-3.5 w-3.5 text-secondary" />
            {isRtl ? branding.companyNameAr : branding.companyNameEn}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            {isRtl ? hero.titleAr : hero.titleEn}
          </h1>
          <p className="text-base md:text-lg mb-12 max-w-xl mx-auto text-white/70 leading-relaxed">
            {isRtl ? hero.subtitleAr : hero.subtitleEn}
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              asChild size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold px-10 h-12 shadow-xl shadow-black/20 rounded-full"
            >
              <Link href="/get-started">
                {isRtl ? 'ابدأ معنا اليوم' : 'Get Started Today'}
                {isRtl
                  ? <ArrowLeft  className="ms-2.5 h-4 w-4" />
                  : <ArrowRight className="ms-2.5 h-4 w-4" />}
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="outline"
              className="border-white/40 text-white hover:bg-white/10 hover:border-white/60 text-sm font-medium px-8 h-12 rounded-full bg-transparent"
            >
              <Link href="/services">
                {isRtl ? 'خدماتنا' : 'Our Services'}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────────── */}
      <section className="bg-primary border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 rtl:divide-x-reverse">
            {stats.map((stat, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              const rawValue = stat.liveKey && liveStats[stat.liveKey] !== undefined
                ? liveStats[stat.liveKey]
                : undefined;
              const displayValue = rawValue !== undefined
                ? rawValue.toLocaleString()
                : stat.value;
              // skip stats that would show a plain "0"
              if (displayValue === '0') return null;
              return (
                <div key={i} className="flex flex-col items-center gap-1 py-8 px-4 text-center">
                  <Icon className="h-4 w-4 text-secondary mb-2 opacity-70" />
                  <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">{displayValue}</span>
                  <span className="text-xs text-white/50 leading-tight mt-0.5">
                    {isRtl ? stat.labelAr : stat.labelEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'الطريقة' : 'The Process'}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-4">
              {isRtl ? 'كيف نعمل معك؟' : 'How We Work With You'}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {isRtl
                ? 'ثلاث خطوات بسيطة تفصلك عن إدارة احترافية لعقارك'
                : 'Three simple steps to professional property management'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col ${isRtl ? 'items-end text-right' : 'items-start'} gap-4`}>
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                  <span className="text-secondary font-bold text-xl tabular-nums">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-primary text-lg mb-1.5">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-12 flex ${isRtl ? 'justify-end' : 'justify-start'} md:justify-center`}>
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-10 h-12 text-sm font-semibold">
              <Link href="/get-started">
                {isRtl ? 'ابدأ الآن' : 'Start Now'}
                {isRtl
                  ? <ArrowLeft  className="ms-2.5 h-4 w-4" />
                  : <ArrowRight className="ms-2.5 h-4 w-4" />}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'ما يقوله عملاؤنا' : 'What Our Clients Say'}
            </p>
            <h2 className="text-3xl font-bold text-primary">
              {isRtl ? 'ثقة أصحاب العقارات' : 'Trusted by Property Owners'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(isRtl ? [
              { quote: 'منذ تسليم الفندق لاستيتي إن، ارتفعت نسبة الإشغال بشكل ملحوظ وأصبحت تقاريرهم الشهرية مرجعاً أعتمد عليه.', name: 'م. عبدالله العمري', role: 'مالك فندق — الرياض' },
              { quote: 'لم أتوقع أن تكون الإدارة بهذا المستوى من الدقة. الفريق محترف وتواصلهم ممتاز في كل وقت.', name: 'المهندس خالد الغامدي', role: 'مالك مجمع سكني — جدة' },
              { quote: 'استيتي إن أعادت تنظيم المجمع كاملاً خلال شهرين. المستأجرون أكثر رضا والعائد المالي تحسّن.', name: 'أ. نورة السعيد', role: 'مستثمرة عقارية — الدمام' },
            ] : [
              { quote: 'Since handing our hotel to Esteti In, occupancy has improved significantly and their monthly reports are the reference I rely on.', name: 'Eng. Abdullah Al-Omari', role: 'Hotel Owner — Riyadh' },
              { quote: "I didn't expect management at this level of precision. The team is professional and their communication is excellent at all times.", name: 'Eng. Khalid Al-Ghamdi', role: 'Compound Owner — Jeddah' },
              { quote: 'Esteti In reorganized the entire compound within two months. Tenants are happier and financial returns improved.', name: 'Noura Al-Saeed', role: 'Real Estate Investor — Dammam' },
            ]).map((t, i) => (
              <div key={i} className={`bg-card rounded-2xl border border-border p-6 flex flex-col gap-4 hover:border-secondary/40 hover:shadow-md transition-all duration-300 ${isRtl ? 'text-right' : ''}`}>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, s) => (
                    <span key={s} className="text-secondary text-sm">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {isRtl ? `"${t.quote}"` : `"${t.quote}"`}
                </p>
                <div className={`flex items-center gap-3 pt-2 border-t border-border ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-bold text-sm shrink-0">
                    {t.name.charAt(isRtl ? t.name.length - 1 : 0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Overview ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'ما نقدمه' : 'What We Offer'}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-6">
              {isRtl ? 'خدماتنا' : 'Our Services'}
            </h2>
            <div className="w-10 h-0.5 bg-secondary/60 rounded-full mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((svc, i) => {
              const slug = (['hotel', 'compound', 'corporate'] as const)[i] ?? 'hotel';
              return (
                <Link
                  key={i}
                  href={`/services/${slug}`}
                  className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:border-secondary hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video overflow-hidden bg-primary/10 shrink-0">
                    {svc.imageUrl
                      ? <img
                          src={svc.imageUrl}
                          alt={isRtl ? svc.titleAr : svc.titleEn}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-secondary/30" />
                        </div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  <div className="flex flex-col flex-1 p-6">
                    <h3 className="text-lg font-bold text-primary mb-2">
                      {isRtl ? svc.titleAr : svc.titleEn}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                      {isRtl ? svc.descAr : svc.descEn}
                    </p>
                    <div className="mt-5 flex items-center gap-1.5 text-secondary text-sm font-semibold">
                      {isRtl ? 'اعرف المزيد' : 'View Details'}
                      {isRtl
                        ? <ArrowLeft  className="h-4 w-4" />
                        : <ArrowRight className="h-4 w-4" />}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WhatsApp CTA ──────────────────────────────────────────────────────── */}
      <section className="py-14 bg-background">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <MessageCircle className="h-8 w-8 text-[#25D366] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary mb-2">
            {isRtl ? 'تحدث مع فريقنا مباشرة' : 'Talk to Our Team Directly'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {isRtl
              ? 'هل لديك سؤال سريع؟ فريقنا متاح على واتساب.'
              : 'Have a quick question? Our team is available on WhatsApp.'}
          </p>
          <a
            href={ESTETI_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 h-11 rounded-full font-semibold text-sm hover:bg-[#22c55e] transition-colors shadow-lg shadow-green-500/20"
          >
            <MessageCircle className="h-4 w-4" />
            {isRtl ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
          </a>
        </div>
      </section>

      {/* ── Interested in Partnering? ──────────────────────────────────────────── */}
      <section id="partner-inquiry" className="py-28 bg-muted">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
                {isRtl ? 'انضم إلينا' : 'New Inquiries'}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-5 leading-tight">
                {isRtl ? 'مهتم بالتعاون معنا؟' : 'Interested in Collaborating?'}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {isRtl
                  ? 'إذا كنت تمتلك عقارات وتبحث عن شركة إدارة محترفة، أو ترغب في الاستثمار ضمن محفظتنا — أخبرنا بذلك وسيتواصل معك فريقنا خلال 24 ساعة.'
                  : "Whether you own properties looking for professional management, or want to explore investment opportunities within our portfolio — share your interest and our team will be in touch within 24 hours."}
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              {leadStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-primary">
                    {isRtl ? 'شكراً لاهتمامك!' : 'Thank you!'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {isRtl
                      ? 'تم استلام رسالتك. سيتواصل معك فريقنا خلال 24 ساعة.'
                      : "We've received your message and will be in touch within 24 hours."}
                  </p>
                  <button
                    onClick={() => setLeadStatus('idle')}
                    className="mt-2 text-xs text-secondary hover:underline"
                  >
                    {isRtl ? 'إرسال استفسار آخر' : 'Send another inquiry'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      {isRtl ? 'الاسم الكامل' : 'Full Name'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lead.name}
                      onChange={e => setLead(p => ({ ...p, name: e.target.value }))}
                      placeholder={isRtl ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/60 transition-colors placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      {isRtl ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={lead.email}
                      onChange={e => setLead(p => ({ ...p, email: e.target.value }))}
                      placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/60 transition-colors placeholder:text-muted-foreground/50"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={lead.phone}
                      onChange={e => setLead(p => ({ ...p, phone: e.target.value }))}
                      placeholder={isRtl ? 'أدخل رقم هاتفك' : 'Enter your phone number'}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/60 transition-colors placeholder:text-muted-foreground/50"
                      dir="ltr"
                    />
                  </div>

                  {leadStatus === 'error' && (
                    <p className="text-xs text-destructive">
                      {isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={leadStatus === 'submitting'}
                    className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold text-sm mt-2"
                  >
                    {leadStatus === 'submitting'
                      ? (isRtl ? 'جاري الإرسال...' : 'Sending...')
                      : (isRtl ? 'تواصل معنا' : 'Get in Touch')}
                    {leadStatus !== 'submitting' && (
                      isRtl
                        ? <ArrowLeft  className="ms-2 h-4 w-4" />
                        : <ArrowRight className="ms-2 h-4 w-4" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
