import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useGetListings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Building2, Users, TrendingUp, Award } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/ui/skeleton';

const STAT_ICONS = [Building2, Users, TrendingUp, Award];

type LiveStats = Record<string, number>;

export const Home: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const [liveStats, setLiveStats] = useState<LiveStats>({});

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
      <section className="relative h-[88vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/75 via-primary/70 to-primary/90 z-10" />
          <img
            src={hero.imageUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"}
            alt="Modern Architecture"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <div className="container relative z-20 px-4 text-center text-white max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/30 text-secondary-foreground text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Award className="h-3.5 w-3.5" />
            {isRtl ? branding.companyNameAr : branding.companyNameEn}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {isRtl ? hero.titleAr : hero.titleEn}
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/85 leading-relaxed">
            {isRtl ? hero.subtitleAr : hero.subtitleEn}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base px-8 h-12 w-full sm:w-auto shadow-lg"
            >
              <Link href="/listings">
                {isRtl ? hero.ctaButtonAr : hero.ctaButtonEn}
                {isRtl
                  ? <ArrowLeft  className="ms-2 h-5 w-5" />
                  : <ArrowRight className="ms-2 h-5 w-5" />}
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="outline"
              className="text-white border-white/40 hover:bg-white/10 hover:text-white text-base px-8 h-12 w-full sm:w-auto"
            >
              <Link href="/contact">
                {isRtl ? content.nav.find(n => n.href === '/contact')?.labelAr || 'اتصل بنا'
                       : content.nav.find(n => n.href === '/contact')?.labelEn || 'Contact'}
              </Link>
            </Button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/40">
          <div className="w-px h-10 bg-white/20 animate-pulse" />
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────────── */}
      <section className="bg-primary border-t border-primary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary-foreground/10 rtl:divide-x-reverse">
            {stats.map((stat, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              const displayValue = stat.liveKey && liveStats[stat.liveKey] !== undefined
                ? liveStats[stat.liveKey].toLocaleString()
                : stat.value;
              return (
                <div key={i} className="flex flex-col items-center gap-1 py-6 px-4 text-center">
                  <Icon className="h-5 w-5 text-secondary mb-1 opacity-80" />
                  <span className="text-2xl md:text-3xl font-bold text-white">{displayValue}</span>
                  <span className="text-xs text-primary-foreground/60 leading-tight">
                    {isRtl ? stat.labelAr : stat.labelEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Properties ────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-2">
                {isRtl ? 'العقارات المميزة' : 'Curated Selection'}
              </p>
              <h2 className="text-3xl font-bold text-primary mb-3">
                {isRtl ? 'العقارات المميزة' : 'Featured Properties'}
              </h2>
              <div className="w-16 h-1 bg-secondary rounded-full" />
            </div>
            <Link
              href="/listings"
              className="text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1 hidden md:flex"
            >
              {isRtl ? 'عرض الكل' : 'View all properties'}
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
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
            <div className="text-center py-12 text-muted-foreground">
              {isRtl ? 'لا توجد عقارات مميزة حالياً.' : 'No featured properties at the moment.'}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link href="/listings" className="text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1">
              {isRtl ? 'عرض الكل' : 'View all properties'}
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services Overview ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-2">
              {isRtl ? 'ما نقدمه' : 'What We Offer'}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-3">
              {isRtl ? 'خدماتنا التشغيلية' : 'Our Operational Services'}
            </h2>
            <div className="w-16 h-1 bg-secondary rounded-full mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((svc, i) => (
              <div
                key={i}
                className="bg-card p-8 rounded-xl shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  {svc.imageUrl
                    ? <img src={svc.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    : <Building2 className="h-7 w-7 text-secondary-foreground" />
                  }
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">
                  {isRtl ? svc.titleAr : svc.titleEn}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {isRtl ? svc.descAr : svc.descEn}
                </p>
                <Link href="/services" className="text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1">
                  {isRtl ? 'اعرف أكثر' : 'Learn more'}
                  {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-secondary-foreground mb-4">
            {isRtl ? cta.headlineAr : cta.headlineEn}
          </h2>
          <p className="text-secondary-foreground/80 mb-8 text-base leading-relaxed">
            {isRtl ? cta.subtitleAr : cta.subtitleEn}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 shadow-lg"
            >
              <Link href="/contact">
                {isRtl ? cta.buttonAr : cta.buttonEn}
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/5 h-12 px-8"
            >
              <Link href="/portal">
                {isRtl ? 'بوابة المستثمر' : 'Investor Portal'}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
