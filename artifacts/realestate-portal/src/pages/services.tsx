import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';

export const Services: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { services, branding } = content;

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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {isRtl ? 'التميز التشغيلي' : 'Operational Excellence'}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            {isRtl
              ? `توفر ${branding.companyNameAr} خدمات إدارة عقارات متكاملة مصممة لتعظيم قيمة الأصول وتقديم تجارب استثنائية للمستأجرين والضيوف والعملاء من الشركات.`
              : `${branding.companyNameEn} provides end-to-end property management services designed to maximize asset value and deliver exceptional experiences for tenants, guests, and corporate clients.`}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="container mx-auto px-4 py-20 max-w-6xl space-y-24">
        {services.map((section, idx) => {
          const title = isRtl ? section.titleAr : section.titleEn;
          const desc  = isRtl ? section.descAr  : section.descEn;
          const items = (isRtl ? section.itemsAr : section.itemsEn) ?? [];
          const reverse = idx % 2 === 1;
          const rowClass = reverse
            ? 'flex flex-col md:flex-row-reverse gap-12 items-center'
            : 'flex flex-col md:flex-row gap-12 items-center';

          return (
            <div key={idx} className={rowClass}>
              <div className="flex-1">
                <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
                  {section.imageUrl
                    ? <img src={section.imageUrl} alt={title} className="w-full h-full object-cover" />
                    : <div className="w-8 h-8 rounded-full bg-secondary/40" />}
                </div>
                <h2 className="text-3xl font-bold text-primary mb-4">{title}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{desc}</p>
                <ul className="space-y-3">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-center text-primary font-medium gap-3">
                      <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={section.imageUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"}
                    alt={title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
