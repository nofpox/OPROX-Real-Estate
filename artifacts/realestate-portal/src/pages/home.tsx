import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useGetListings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Building2, Users, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/ui/skeleton';

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
    fetch('/api/cms/live-stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LiveStats) => setLiveStats(data))
      .catch(() => {});
  }, []);

  const { data: featuredResponse, isLoading } = useGetListings({
    featured: 'true',
    status:   'active',
    limit:    3,
  });

  const featuredListings = featuredResponse?.data || [];
  const { hero, stats, services, cta, branding } = content;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email) return;
    setLeadStatus('submitting');
    try {
      const res = await fetch('/api/guest/contact', {
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
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-medium px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <Award className="h-3.5 w-3.5 text-secondary" />
            {isRtl ? branding.companyNameAr : branding.companyNameEn}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            {isRtl ? hero.titleAr : hero.titleEn}
          </h1>
          <p className="text-base md:text-lg mb-12 max-w-xl mx-auto text-white/70 leading-relaxed">
            {isRtl ? hero.subtitleAr : hero.subtitleEn}
          </p>

          {/* Single primary CTA */}
          <Button
            asChild size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold px-10 h-12 shadow-xl shadow-black/20 rounded-full"
          >
            <Link href="/listings">
              {isRtl ? hero.ctaButtonAr : hero.ctaButtonEn}
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

      {/* ── Featured Properties ────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-14">
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                {isRtl ? 'اختيارات مميزة' : 'Curated Selection'}
              </p>
              <h2 className="text-3xl font-bold text-primary">
                {isRtl ? 'العقارات المميزة' : 'Featured Properties'}
              </h2>
            </div>
            <Link
              href="/listings"
              className="text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1.5 hidden md:flex opacity-80 hover:opacity-100 transition-opacity"
            >
              {isRtl ? 'عرض الكل' : 'View all'}
              {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
                  <Skeleton className="h-52 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {isRtl ? 'لا توجد عقارات مميزة حالياً.' : 'No featured properties at the moment.'}
            </div>
          )}

          <div className="mt-10 text-center md:hidden">
            <Link href="/listings" className="text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1">
              {isRtl ? 'عرض الكل' : 'View all properties'}
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services Overview ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-muted/50">
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
            {services.map((svc, i) => (
              <div
                key={i}
                className="bg-card p-8 rounded-2xl border border-border/60 hover:border-secondary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  {svc.imageUrl
                    ? <img src={svc.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    : <Building2 className="h-6 w-6 text-secondary" />
                  }
                </div>
                <h3 className="text-lg font-bold text-primary mb-3">
                  {isRtl ? svc.titleAr : svc.titleEn}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {isRtl ? svc.descAr : svc.descEn}
                </p>
                <Link href="/services" className="text-secondary text-xs font-semibold hover:underline inline-flex items-center gap-1 uppercase tracking-wide">
                  {isRtl ? 'اعرف أكثر' : 'Learn more'}
                  {isRtl ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interested in Partnering? ──────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
                {isRtl ? 'انضم إلينا' : 'New Partners'}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-5 leading-tight">
                {isRtl ? 'مهتم بالتعاون معنا؟' : 'Interested in Partnering?'}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {isRtl
                  ? 'إذا كنت تمتلك عقارات وتبحث عن شركة إدارة محترفة، أو ترغب في الاستثمار ضمن محفظتنا — أخبرنا بذلك وسيتواصل معك فريقنا خلال 24 ساعة.'
                  : "Whether you own properties looking for professional management, or want to explore investment opportunities within our portfolio — share your interest and our team will be in touch within 24 hours."}
              </p>

              {/* Distinguishing note from Investor Portal */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/5 border border-secondary/15">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary mb-1">
                    {isRtl ? 'هل أنت عميل ركز حالي؟' : 'Already a Rakez client?'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRtl
                      ? 'هذا النموذج مخصص للشركاء الجدد فقط. للوصول إلى عقاراتك وتقاريرك المالية، '
                      : 'This form is for new inquiries only. To access your properties and financial reports, '}
                    <Link href="/portal" className="text-secondary hover:underline font-medium">
                      {isRtl ? 'سجّل الدخول إلى بوابتك ←' : 'sign in to your portal →'}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm">
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

      {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
            {isRtl ? cta.headlineAr : cta.headlineEn}
          </h2>
          <p className="text-white/60 mb-10 text-base leading-relaxed">
            {isRtl ? cta.subtitleAr : cta.subtitleEn}
          </p>
          <Button
            asChild size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 px-10 rounded-full shadow-lg text-sm font-semibold"
          >
            <Link href="/contact">
              {isRtl ? cta.buttonAr : cta.buttonEn}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};
