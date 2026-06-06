import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Building2, Users, TrendingUp, Award, CheckCircle2 } from 'lucide-react';

const STAT_ICONS = [Building2, Users, TrendingUp, Award];

type LiveStats = Record<string, number>;

type LeadForm = { name: string; email: string; phone: string };
type LeadStatus = 'idle' | 'submitting' | 'success' | 'error';

export const Home: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const [liveStats, setLiveStats] = useState<LiveStats>({});

  // Lead capture form state
  const [lead, setLead] = useState<LeadForm>({ name: '', email: '', phone: '' });
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('idle');

  useEffect(() => {
    fetch('/realestate-api/cms/live-stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LiveStats) => setLiveStats(data))
      .catch(() => {});
  }, []);

  const { hero, stats, services, branding } = content;

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

          {/* Single primary CTA → Services */}
          <Button
            asChild size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold px-10 h-12 shadow-xl shadow-black/20 rounded-full"
          >
            <Link href="/services">
              {isRtl ? 'اعرف المزيد' : 'Explore Services'}
              {isRtl
                ? <ArrowLeft  className="ms-2.5 h-4 w-4" />
                : <ArrowRight className="ms-2.5 h-4 w-4" />}
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────────── */}
      <section className="bg-primary border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 rtl:divide-x-reverse">
            {stats.map((stat, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              const displayValue = stat.liveKey && liveStats[stat.liveKey] !== undefined
                ? liveStats[stat.liveKey].toLocaleString()
                : stat.value;
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

      {/* ── Services Overview ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-muted">
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
                  {/* Image */}
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
                  {/* Content */}
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

      {/* ── Interested in Partnering? ──────────────────────────────────────────── */}
      <section id="partner-inquiry" className="py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
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

            {/* Right — form */}
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
