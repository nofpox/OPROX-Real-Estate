import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Building2, Key, Users, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const SECTIONS = [
  {
    icon: Key,
    titleEn: 'Hotel Operations',
    titleAr: 'إدارة الفنادق',
    descEn: 'We manage premium hospitality assets with a focus on guest satisfaction, revenue optimization, and operational efficiency. Our experienced team handles everything from daily operations to strategic positioning.',
    descAr: 'ندير أصولاً فندقية متميزة مع التركيز على رضا الضيوف وتحسين الإيرادات والكفاءة التشغيلية. يتولى فريقنا المتمرس كل شيء من العمليات اليومية إلى الاستراتيجية والتموضع.',
    itemsEn: [
      'Front desk & concierge management',
      'Housekeeping & maintenance services',
      'Revenue management & pricing strategy',
      'Guest experience optimization',
      'F&B operations management',
    ],
    itemsAr: [
      'إدارة الاستقبال والكونسيرج',
      'خدمات التدبير المنزلي والصيانة',
      'إدارة الإيرادات وإستراتيجية التسعير',
      'تحسين تجربة الضيوف',
      'إدارة عمليات الأغذية والمشروبات',
    ],
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
    imgAlt: 'Hotel Interior',
    reverse: false,
  },
  {
    icon: Users,
    titleEn: 'Compound Management',
    titleAr: 'إدارة المجمعات السكنية',
    descEn: 'Creating thriving residential communities through comprehensive compound management. We ensure secure, well-maintained, and vibrant living environments for all residents.',
    descAr: 'بناء مجتمعات سكنية متكاملة من خلال إدارة شاملة للمجمع. نضمن بيئات معيشية آمنة ومصونة وحيوية لجميع السكان.',
    itemsEn: [
      '24/7 Security & access control',
      'Preventive maintenance programs',
      'Community events & lifestyle services',
      'Recreational facility management',
      'Tenant relations & leasing',
    ],
    itemsAr: [
      'الأمن على مدار الساعة وضبط الدخول',
      'برامج الصيانة الوقائية',
      'الفعاليات المجتمعية وخدمات أسلوب الحياة',
      'إدارة المرافق الترفيهية',
      'علاقات المستأجرين والتأجير',
    ],
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    imgAlt: 'Compound Pool',
    reverse: true,
  },
  {
    icon: Building2,
    titleEn: 'Corporate Facilities',
    titleAr: 'المرافق المؤسسية',
    descEn: 'Delivering professional facility management services for corporate environments. We maintain optimal working conditions that enhance productivity and reflect your corporate identity.',
    descAr: 'تقديم خدمات إدارة المرافق الاحترافية للبيئات المؤسسية. نحافظ على ظروف عمل مثلى تعزز الإنتاجية وتعكس هويتك المؤسسية.',
    itemsEn: [
      'Integrated facilities management',
      'Health, safety & environment compliance',
      'Energy management & sustainability',
      'Workspace planning & optimization',
      'Vendor & contract management',
    ],
    itemsAr: [
      'الإدارة المتكاملة للمرافق',
      'الامتثال للصحة والسلامة والبيئة',
      'إدارة الطاقة والاستدامة',
      'تخطيط مساحة العمل وتحسينها',
      'إدارة الموردين والعقود',
    ],
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
    imgAlt: 'Corporate Office',
    reverse: false,
  },
];

export const Services: React.FC = () => {
  const { isRtl } = useLanguage();

  return (
    <div className="bg-background min-h-screen">
      <Helmet>
        <title>
          {isRtl ? 'خدماتنا | ركز للحلول الذكية' : 'Our Services | ركز للحلول الذكية'}
        </title>
        <meta
          name="description"
          content={
            isRtl
              ? 'إدارة الفنادق والمجمعات السكنية والمرافق المؤسسية من ركز للحلول الذكية.'
              : 'Hotel operations, residential management, and corporate real estate services by Rakez Smart Solutions.'
          }
        />
        <link rel="canonical" href="https://rakez.sa/realestate/services" />
      </Helmet>

      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-20 text-center border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {isRtl ? 'التميز التشغيلي' : 'Operational Excellence'}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            {isRtl
              ? 'توفر ركز للحلول الذكية خدمات إدارة عقارات متكاملة مصممة لتعظيم قيمة الأصول وتقديم تجارب استثنائية للمستأجرين والضيوف والعملاء من الشركات.'
              : 'Rakez Smart Solutions provides end-to-end property management services designed to maximize asset value and deliver exceptional experiences for tenants, guests, and corporate clients.'}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="container mx-auto px-4 py-20 max-w-6xl space-y-24">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const title = isRtl ? section.titleAr : section.titleEn;
          const desc = isRtl ? section.descAr : section.descEn;
          const items = isRtl ? section.itemsAr : section.itemsEn;
          const rowClass = section.reverse
            ? 'flex flex-col md:flex-row-reverse gap-12 items-center'
            : 'flex flex-col md:flex-row gap-12 items-center';

          return (
            <div key={section.titleEn} className={rowClass}>
              <div className="flex-1">
                <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="h-8 w-8 text-secondary-foreground" />
                </div>
                <h2 className="text-3xl font-bold text-primary mb-4">{title}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{desc}</p>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item} className="flex items-center text-primary font-medium gap-3">
                      <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={section.img}
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
