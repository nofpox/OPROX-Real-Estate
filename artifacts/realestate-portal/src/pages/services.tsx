import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';

const SERVICE_SLUGS = ['hotel', 'compound', 'corporate'] as const;

const SERVICE_GALLERIES: Record<string, string[]> = {
  hotel: [
    'https://images.unsplash.com/photo-1551882547-ff40c4a49f6a?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600&auto=format&fit=crop',
  ],
  compound: [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=600&auto=format&fit=crop',
  ],
  corporate: [
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?q=80&w=600&auto=format&fit=crop',
  ],
};

export const Services: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { services, branding } = content;

  const Arrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="bg-background min-h-screen">
      <Helmet>
        <title>
          {isRtl
            ? `خدماتنا | ${branding.companyNameAr}`
            : `Our Services | ${branding.companyNameEn}`}
        </title>
        <meta
          name="description"
          content={
            isRtl
              ? `خدمات إدارة العقارات من ${branding.companyNameAr}.`
              : `Property management services by ${branding.companyNameEn}.`
          }
        />
      </Helmet>

      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-20 text-center border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
            {isRtl ? 'ما نقدمه' : 'What We Offer'}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {isRtl ? 'التميز التشغيلي' : 'Operational Excellence'}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-3xl mx-auto">
            {isRtl
              ? `توفر ${branding.companyNameAr} خدمات إدارة عقارات متكاملة مصممة لتعظيم قيمة الأصول وتقديم تجارب استثنائية للمستأجرين والضيوف والعملاء من الشركات.`
              : `${branding.companyNameEn} provides end-to-end property management services designed to maximize asset value and deliver exceptional experiences for tenants, guests, and corporate clients.`}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="container mx-auto px-4 py-20 max-w-6xl space-y-28">
        {services.map((section, idx) => {
          const title    = isRtl ? section.titleAr : section.titleEn;
          const desc     = isRtl ? section.descAr  : section.descEn;
          const rawItems = isRtl ? section.itemsAr : section.itemsEn;
          const slug    = SERVICE_SLUGS[idx] ?? 'hotel';
          const gallery = SERVICE_GALLERIES[slug] ?? [];
          const items   = Array.isArray(rawItems) ? rawItems : [];
          const reverse = idx % 2 === 1;
          const rowClass = reverse
            ? 'flex flex-col md:flex-row-reverse gap-14 items-start'
            : 'flex flex-col md:flex-row gap-14 items-start';

          return (
            <div key={idx} className={rowClass}>
              {/* Text column */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <h2 className="text-3xl font-bold text-primary mb-4">{title}</h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{desc}</p>
                <ul className="space-y-3 mb-8">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-center text-foreground font-medium gap-3">
                      <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="border-secondary/40 text-secondary hover:bg-secondary/10 hover:border-secondary rounded-full px-6">
                  <Link href={`/services/${slug}`}>
                    {isRtl ? 'عرض التفاصيل الكاملة' : 'View Full Details'}
                    {isRtl
                      ? <Arrow className="ms-2 h-4 w-4" />
                      : <ArrowRight className="ms-2 h-4 w-4" />}
                  </Link>
                </Button>
              </div>

              {/* Image column */}
              <div className="flex-1 w-full space-y-3">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={section.imageUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"}
                    alt={title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                {/* Gallery strip */}
                {gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.map((src, gi) => (
                      <div key={gi} className="aspect-square rounded-xl overflow-hidden">
                        <img
                          src={src}
                          alt={`${title} ${gi + 2}`}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA strip */}
      <div className="bg-muted border-t border-border py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            {isRtl ? 'هل تبحث عن شريك إدارة موثوق؟' : 'Looking for a Trusted Management Partner?'}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {isRtl
              ? 'تواصل مع فريق روزوز للمناقشة ومعرفة كيف يمكننا المساعدة في تعظيم قيمة عقاراتك.'
              : 'Reach out to the Rozoz team to discuss how we can help maximise the value of your portfolio.'}
          </p>
          <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 px-10 rounded-full font-semibold">
            <Link href="/contact">
              {isRtl ? 'تواصل معنا' : 'Get in Touch'}
              {isRtl ? <Arrow className="ms-2 h-4 w-4" /> : <ArrowRight className="ms-2 h-4 w-4" />}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
