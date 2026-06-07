import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useRoute } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, ArrowRight, TrendingUp, Users, Star, Clock } from 'lucide-react';

// ── Per-service rich content ───────────────────────────────────────────────────
interface ServiceData {
  slugEn:      string;
  titleEn:     string; titleAr:     string;
  subtitleEn:  string; subtitleAr:  string;
  heroImage:   string;
  gallery:     string[];
  stats: Array<{ value: string; labelEn: string; labelAr: string }>;
  featuresEn:  string[]; featuresAr: string[];
  processEn:   Array<{ title: string; desc: string }>;
  processAr:   Array<{ title: string; desc: string }>;
  projectsEn:  Array<{ name: string; desc: string; image: string }>;
  projectsAr:  Array<{ name: string; desc: string; image: string }>;
}

const SERVICES: Record<string, ServiceData> = {
  hotel: {
    slugEn: 'hotel',
    titleEn: 'Hotel Operations Management',
    titleAr: 'إدارة عمليات الفنادق',
    subtitleEn: 'Premium hospitality management delivering exceptional guest experiences and maximised yields across every touchpoint of your property.',
    subtitleAr: 'إدارة ضيافة متميزة تقدم تجارب استثنائية للضيوف وعوائد محسّنة عبر كل نقطة تواصل في عقارك.',
    heroImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1551882547-ff40c4a49f6a?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586611292717-f828b167408c?q=80&w=900&auto=format&fit=crop',
    ],
    stats: [
      { value: '40+',  labelEn: 'Hotels Managed',        labelAr: 'فندق مُدار'          },
      { value: '98%',  labelEn: 'Guest Satisfaction',    labelAr: 'رضا الضيوف'         },
      { value: '24/7', labelEn: 'Operations Support',    labelAr: 'دعم تشغيلي'          },
      { value: '15%',  labelEn: 'Avg. Revenue Growth',   labelAr: 'نمو الإيرادات'      },
    ],
    featuresEn: [
      'Front desk & concierge management',
      'Housekeeping & maintenance services',
      'Revenue management & dynamic pricing',
      'Guest experience & loyalty programs',
      'F&B operations management',
      'Digital channel distribution (OTA, direct)',
      'Staff training & performance management',
      'Health & safety compliance',
      'Energy management & cost optimisation',
    ],
    featuresAr: [
      'إدارة الاستقبال والكونسيرج',
      'خدمات التدبير المنزلي والصيانة',
      'إدارة الإيرادات والتسعير الديناميكي',
      'برامج تجربة الضيوف والولاء',
      'إدارة عمليات الأغذية والمشروبات',
      'التوزيع الرقمي (OTA والحجز المباشر)',
      'تدريب الموظفين وإدارة الأداء',
      'الامتثال للصحة والسلامة',
      'إدارة الطاقة وتحسين التكاليف',
    ],
    processEn: [
      { title: 'Assessment & Audit',     desc: 'Comprehensive property audit covering operations, financials, staff, and guest experience benchmarks.' },
      { title: 'Strategy Development',   desc: 'Custom management strategy aligned with your investment goals, brand positioning, and market dynamics.' },
      { title: 'Team Deployment',        desc: 'Experienced hospitality professionals deployed with clear KPIs and performance accountability.' },
      { title: 'Technology Integration', desc: 'PMS, CRS, and revenue management systems integrated for real-time performance visibility.' },
      { title: 'Continuous Optimisation',desc: 'Monthly performance reviews with data-driven recommendations to maximise RevPAR and GOP.' },
    ],
    processAr: [
      { title: 'التقييم والتدقيق',      desc: 'مراجعة شاملة للعقار تشمل العمليات والشؤون المالية والموظفين ومعايير تجربة الضيوف.' },
      { title: 'وضع الاستراتيجية',      desc: 'استراتيجية إدارة مخصصة تتوافق مع أهداف الاستثمار وتموضع العلامة التجارية وديناميكيات السوق.' },
      { title: 'نشر الفريق',            desc: 'متخصصو ضيافة ذوو خبرة يُنشَرون بمؤشرات أداء واضحة ومسؤولية كاملة.' },
      { title: 'التكامل التقني',        desc: 'أنظمة إدارة العقارات والمبيعات والإيرادات مدمجة لرؤية فورية للأداء.' },
      { title: 'التحسين المستمر',       desc: 'مراجعات أداء شهرية بتوصيات مبنية على البيانات لتعظيم RevPAR والأرباح.' },
    ],
    projectsEn: [
      { name: 'Grand Crown Hotel – Riyadh',     desc: 'Full-service 5-star hotel management; occupancy raised from 61% to 89% within 18 months.', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop' },
      { name: 'Marina Bay Resort – Jeddah',     desc: 'Beachfront resort takeover; implemented dynamic pricing that grew RevPAR by 22%.', image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop' },
      { name: 'Heritage Suites – Al Madinah',   desc: 'Heritage boutique hotel revitalisation; achieved 4.8★ on all major OTA platforms.', image: 'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?q=80&w=600&auto=format&fit=crop' },
    ],
    projectsAr: [
      { name: 'فندق القمة الكبرى – الرياض',    desc: 'إدارة فندقية متكاملة لفندق 5 نجوم؛ ارتفع معدل الإشغال من 61% إلى 89% خلال 18 شهراً.', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop' },
      { name: 'منتجع مارينا باي – جدة',         desc: 'استلام منتجع ساحلي؛ تطبيق تسعير ديناميكي أتاح نمو RevPAR بنسبة 22%.', image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop' },
      { name: 'أجنحة التراث – المدينة المنورة', desc: 'إحياء فندق بوتيك تراثي؛ تحقيق تقييم 4.8★ على جميع منصات الحجز الكبرى.', image: 'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?q=80&w=600&auto=format&fit=crop' },
    ],
  },

  compound: {
    slugEn: 'compound',
    titleEn: 'Residential Compound Management',
    titleAr: 'إدارة المجمعات السكنية',
    subtitleEn: 'Creating thriving, secure residential communities through comprehensive compound management — from security and maintenance to lifestyle and community engagement.',
    subtitleAr: 'بناء مجتمعات سكنية متكاملة وآمنة من خلال إدارة شاملة للمجمع — من الأمن والصيانة إلى أسلوب الحياة والانخراط المجتمعي.',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523217582562-09d05ba96e00?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=900&auto=format&fit=crop',
    ],
    stats: [
      { value: '25+',  labelEn: 'Compounds Managed',     labelAr: 'مجمع مُدار'           },
      { value: '96%',  labelEn: 'Tenant Retention',      labelAr: 'معدل الاحتفاظ'       },
      { value: '24/7', labelEn: 'Security Operations',   labelAr: 'أمن على مدار الساعة'  },
      { value: '4.9★', labelEn: 'Average Rating',        labelAr: 'متوسط التقييم'       },
    ],
    featuresEn: [
      '24/7 manned security & CCTV monitoring',
      'Smart access control systems',
      'Preventive & corrective maintenance',
      'Landscaping & grounds management',
      'Community events & lifestyle programming',
      'Swimming pool & gym facility management',
      'Tenant relations & complaint resolution',
      'Leasing & unit handover management',
      'Utility metering & billing support',
    ],
    featuresAr: [
      'أمن بشري على مدار الساعة ومراقبة بكاميرات المراقبة',
      'أنظمة التحكم في الدخول الذكية',
      'صيانة وقائية وتصحيحية',
      'التشجير وإدارة المساحات الخضراء',
      'فعاليات مجتمعية وبرامج أسلوب الحياة',
      'إدارة مرافق حمام السباحة والصالة الرياضية',
      'علاقات المستأجرين وتسوية الشكاوى',
      'إدارة التأجير وتسليم الوحدات',
      'دعم قراءة العدادات والفوترة',
    ],
    processEn: [
      { title: 'Site Evaluation',          desc: 'Full physical and operational audit of infrastructure, security, amenities, and maintenance records.' },
      { title: 'Management Blueprint',     desc: 'Tailored management plan covering staffing, service schedules, budgets, and resident engagement.' },
      { title: 'Technology Deployment',    desc: 'Smart access, visitor management, and resident apps rolled out for seamless community living.' },
      { title: 'Community Activation',     desc: 'Lifestyle programmes, community events, and feedback channels to build resident satisfaction.' },
      { title: 'Reporting & Improvement',  desc: 'Quarterly KPI reviews shared with owners; continuous service improvements driven by resident feedback.' },
    ],
    processAr: [
      { title: 'تقييم الموقع',            desc: 'مراجعة شاملة فعلية وتشغيلية للبنية التحتية والأمن والمرافق وسجلات الصيانة.' },
      { title: 'مخطط الإدارة',            desc: 'خطة إدارة مخصصة تشمل التوظيف وجداول الخدمة والميزانيات وتفاعل السكان.' },
      { title: 'نشر التقنية',             desc: 'طرح تطبيقات الدخول الذكي وإدارة الزوار وتطبيقات السكان لحياة مجتمعية سلسة.' },
      { title: 'تنشيط المجتمع',           desc: 'برامج ترفيهية وفعاليات مجتمعية وقنوات تغذية راجعة لبناء رضا السكان.' },
      { title: 'التقارير والتحسين',       desc: 'مراجعات ربع سنوية لمؤشرات الأداء مع المُلّاك؛ تحسينات مستمرة مدفوعة بآراء السكان.' },
    ],
    projectsEn: [
      { name: 'Al Nakheel Compound – Riyadh',  desc: '380-unit luxury compound; achieved 97% occupancy and 4-star facility upgrade within year one.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop' },
      { name: 'Green Oasis – Al Khobar',       desc: '240-unit expat compound; introduced smart access and lifestyle app; retention improved by 28%.', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop' },
      { name: 'Sunset Villas – Jeddah',        desc: 'Premium villa compound; full rebrand, community activation, and 100% occupancy achieved.', image: 'https://images.unsplash.com/photo-1523217582562-09d05ba96e00?q=80&w=600&auto=format&fit=crop' },
    ],
    projectsAr: [
      { name: 'مجمع النخيل – الرياض',   desc: 'مجمع فاخر من 380 وحدة؛ تحقيق إشغال 97% وترقية المرافق إلى 4 نجوم خلال العام الأول.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop' },
      { name: 'الواحة الخضراء – الخبر', desc: 'مجمع من 240 وحدة للمقيمين؛ تطبيق الدخول الذكي وتطبيق أسلوب الحياة؛ تحسن الاحتفاظ بنسبة 28%.', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop' },
      { name: 'فلل الغروب – جدة',       desc: 'مجمع فلل متميز؛ إعادة علامة تجارية كاملة وتنشيط مجتمعي وتحقيق إشغال 100%.', image: 'https://images.unsplash.com/photo-1523217582562-09d05ba96e00?q=80&w=600&auto=format&fit=crop' },
    ],
  },

  corporate: {
    slugEn: 'corporate',
    titleEn: 'Corporate & Institutional Facilities',
    titleAr: 'المرافق المؤسسية والشركات',
    subtitleEn: 'Professional integrated facilities management for corporate environments — enhancing productivity, ensuring compliance, and optimising operational costs.',
    subtitleAr: 'إدارة مرافق متكاملة واحترافية للبيئات المؤسسية — تعزيز الإنتاجية وضمان الامتثال وتحسين التكاليف التشغيلية.',
    heroImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=900&auto=format&fit=crop',
    ],
    stats: [
      { value: '60+', labelEn: 'Facilities Managed',     labelAr: 'منشأة مُدارة'         },
      { value: '30%', labelEn: 'Cost Reduction Avg.',    labelAr: 'خفض متوسط التكاليف'  },
      { value: '100%',labelEn: 'Compliance Rate',        labelAr: 'معدل الامتثال'        },
      { value: '5M+', labelEn: 'SqM Under Management',  labelAr: 'م² تحت الإدارة'       },
    ],
    featuresEn: [
      'Integrated facilities management (IFM)',
      'Health, safety & environment (HSE) compliance',
      'Energy management & sustainability programmes',
      'Preventive & reactive maintenance',
      'Workspace planning & interior optimisation',
      'Vendor management & procurement',
      'Reception & help-desk services',
      'Cleaning & hygiene management',
      'Asset tracking & lifecycle management',
    ],
    featuresAr: [
      'إدارة المرافق المتكاملة (IFM)',
      'امتثال الصحة والسلامة والبيئة (HSE)',
      'برامج إدارة الطاقة والاستدامة',
      'صيانة وقائية وتفاعلية',
      'تخطيط مساحة العمل وتحسين التصميم الداخلي',
      'إدارة الموردين والمشتريات',
      'خدمات الاستقبال ومكتب المساعدة',
      'إدارة النظافة والصرف الصحي',
      'تتبع الأصول وإدارة دورة الحياة',
    ],
    processEn: [
      { title: 'Needs Assessment',        desc: 'Detailed audit of existing facilities, equipment, service contracts, HSE status, and operational gaps.' },
      { title: 'IFM Strategy Design',     desc: 'Bespoke integrated facilities management strategy covering all hard and soft services.' },
      { title: 'Mobilisation',            desc: 'Swift on-site mobilisation of trained teams, technology systems, and vendor networks.' },
      { title: 'Performance Management',  desc: 'Real-time CAFM dashboards, SLA tracking, and monthly performance reporting.' },
      { title: 'Sustainability Drive',    desc: 'Energy audits, green initiatives, and ISO-aligned sustainability programmes implemented.' },
    ],
    processAr: [
      { title: 'تقييم الاحتياجات',       desc: 'تدقيق تفصيلي للمرافق والمعدات وعقود الخدمة وحالة HSE والثغرات التشغيلية.' },
      { title: 'تصميم استراتيجية IFM',   desc: 'استراتيجية مرافق متكاملة مخصصة تشمل جميع الخدمات الصلبة والناعمة.' },
      { title: 'التعبئة والانتشار',       desc: 'تعبئة سريعة في الموقع لفرق مدربة وأنظمة تقنية وشبكات موردين.' },
      { title: 'إدارة الأداء',           desc: 'لوحات معلومات CAFM في الوقت الفعلي وتتبع SLA وتقارير الأداء الشهرية.' },
      { title: 'دفع الاستدامة',          desc: 'تدقيقات الطاقة ومبادرات خضراء وبرامج استدامة متوافقة مع ISO.' },
    ],
    projectsEn: [
      { name: 'Corporate HQ Complex – Dhahran',   desc: 'IFM of 3 corporate towers; 28% energy reduction and ISO 41001 certification achieved.', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop' },
      { name: 'Tech Campus – Riyadh',              desc: '180,000 m² tech campus; full soft & hard services, 100% HSE compliance maintained.', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop' },
      { name: 'National Bank – Multi-branch',      desc: '45-branch facility management; unified service standards and smart maintenance platform.', image: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?q=80&w=600&auto=format&fit=crop' },
    ],
    projectsAr: [
      { name: 'مجمع المقر الرئيسي – الظهران',    desc: 'إدارة مرافق 3 أبراج مؤسسية؛ خفض الطاقة 28% وتحقيق شهادة ISO 41001.', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop' },
      { name: 'الحرم التقني – الرياض',             desc: 'حرم تقني 180,000 م²؛ خدمات صلبة وناعمة متكاملة مع الحفاظ على امتثال 100% لـ HSE.', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop' },
      { name: 'بنك وطني – متعدد الفروع',          desc: 'إدارة مرافق 45 فرعاً؛ معايير خدمة موحدة ومنصة صيانة ذكية.', image: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?q=80&w=600&auto=format&fit=crop' },
    ],
  },
};

const STAT_ICONS = [TrendingUp, Users, Star, Clock];

// ── Component ─────────────────────────────────────────────────────────────────
export const ServiceDetail: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const [, params] = useRoute('/services/:slug');
  const slug = params?.slug ?? '';
  const svc = SERVICES[slug];

  if (!svc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
        <p className="text-2xl font-bold text-primary">{isRtl ? 'الصفحة غير موجودة' : 'Page Not Found'}</p>
        <Button asChild variant="outline">
          <Link href="/services">{isRtl ? '← العودة للخدمات' : '← Back to Services'}</Link>
        </Button>
      </div>
    );
  }

  const title   = isRtl ? svc.titleAr    : svc.titleEn;
  const subtitle= isRtl ? svc.subtitleAr : svc.subtitleEn;
  const features= isRtl ? svc.featuresAr : svc.featuresEn;
  const process = isRtl ? svc.processAr  : svc.processEn;
  const projects= isRtl ? svc.projectsAr : svc.projectsEn;

  const Arrow = isRtl ? ArrowRight : ArrowLeft;
  const breadcrumbs = [
    { href: '/', label: isRtl ? 'الرئيسية' : 'Home' },
    { href: '/services', label: isRtl ? 'الخدمات' : 'Services' },
    { label: title },
  ];

  return (
    <div className="bg-background min-h-screen">
      <Helmet>
        <title>{title} | {isRtl ? content.branding.companyNameAr : content.branding.companyNameEn}</title>
        <meta name="description" content={subtitle} />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative h-[60vh] min-h-[440px] flex items-end bg-primary overflow-hidden">
        <div className="absolute inset-0">
          <img src={svc.heroImage} alt={title} className="w-full h-full object-cover opacity-60" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 pb-16 max-w-5xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-primary-foreground/50 text-xs mb-6" dir={isRtl ? 'rtl' : 'ltr'}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {b.href
                  ? <Link href={b.href} className="hover:text-primary-foreground transition-colors">{b.label}</Link>
                  : <span className="text-primary-foreground/80">{b.label}</span>
                }
              </React.Fragment>
            ))}
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
            style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {title}
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-2xl leading-relaxed"
            style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Stats Strip ──────────────────────────────────────────────────────── */}
      <div className="bg-secondary">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {svc.stats.map((stat, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              return (
                <div key={i} className="flex flex-col items-center gap-1 py-8 px-4 text-center border-r border-primary-foreground/10 last:border-0 rtl:border-r-0 rtl:border-l rtl:last:border-0">
                  <Icon className="h-4 w-4 text-secondary-foreground/50 mb-1" />
                  <span className="text-2xl font-bold text-secondary-foreground">{stat.value}</span>
                  <span className="text-xs text-secondary-foreground/60">{isRtl ? stat.labelAr : stat.labelEn}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl py-20 space-y-24">

        {/* ── Gallery Grid ─────────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-10">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
              {isRtl ? 'معرض الصور' : 'Project Gallery'}
            </p>
            <h2 className="text-2xl font-bold text-primary">
              {isRtl ? 'مشاريعنا بالصور' : 'Our Work in Pictures'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {svc.gallery.map((src, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-xl bg-primary/5 ${i === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
              >
                <img
                  src={src}
                  alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'ما نقدمه' : "What's Included"}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-8">
              {isRtl ? 'نطاق الخدمة الكامل' : 'Full Scope of Service'}
            </h2>
            <ul className="space-y-3">
              {features.map((feat, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
                  <span className="text-sm leading-relaxed">{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'منهجيتنا' : 'Our Methodology'}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-8">
              {isRtl ? 'كيف نعمل' : 'How We Work'}
            </h2>
            {process.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm mb-1">{step.title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured Projects ─────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-10">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
              {isRtl ? 'مشاريع مختارة' : 'Featured Projects'}
            </p>
            <h2 className="text-2xl font-bold text-primary">
              {isRtl ? 'نتائج حقيقية، عملاء حقيقيون' : 'Real Results, Real Clients'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={proj.image}
                    alt={proj.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-primary mb-2 text-sm">{proj.name}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{proj.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="bg-primary rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <img src={svc.heroImage} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">
              {isRtl ? 'مهتم بهذه الخدمة؟' : 'Interested in This Service?'}
            </h2>
            <p className="text-primary-foreground/70 mb-8 max-w-lg mx-auto leading-relaxed">
              {isRtl
                ? 'تواصل مع فريقنا اليوم لمناقشة متطلباتك وتعرّف على كيفية تحقيق روزوز لأهدافك.'
                : 'Get in touch with our team today to discuss your requirements and see how Rozoz can deliver for you.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 px-8 rounded-full font-semibold">
                <Link href="/contact">
                  {isRtl ? 'تواصل معنا' : 'Contact Us'}
                  {isRtl ? <ArrowRight className="ms-2 h-4 w-4" /> : <ArrowLeft className="ms-2 h-4 w-4" />}
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8 rounded-full font-semibold">
                <Link href="/services">
                  <Arrow className="me-2 h-4 w-4" />
                  {isRtl ? 'كل الخدمات' : 'All Services'}
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
