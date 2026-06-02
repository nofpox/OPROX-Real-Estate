import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CmsBranding {
  companyNameEn: string;
  companyNameAr: string;
  taglineEn: string;
  taglineAr: string;
  logoUrl: string;
}

export interface CmsHero {
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  ctaButtonEn: string;
  ctaButtonAr: string;
  imageUrl: string;
}

export interface CmsStat {
  value: string;
  labelEn: string;
  labelAr: string;
}

export interface CmsService {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  itemsEn: string[];
  itemsAr: string[];
  imageUrl: string;
}

export interface CmsNavItem {
  href: string;
  labelEn: string;
  labelAr: string;
}

export interface CmsContact {
  email: string;
  salesEmail: string;
  supportEmail: string;
  phone: string;
  fax: string;
  supportPhone: string;
  whatsapp: string;
  addressEn: string;
  addressAr: string;
}

export interface CmsFooter {
  descriptionEn: string;
  descriptionAr: string;
}

export interface CmsCta {
  headlineEn: string;
  headlineAr: string;
  subtitleEn: string;
  subtitleAr: string;
  buttonEn: string;
  buttonAr: string;
}

export interface CmsAbout {
  titleEn: string;
  titleAr: string;
  body: string;
  imageUrl: string;
}

export interface CmsAnnouncement {
  id: string;
  text: string;
  isActive: boolean;
}

export interface SiteContent {
  branding: CmsBranding;
  hero: CmsHero;
  stats: CmsStat[];
  services: CmsService[];
  nav: CmsNavItem[];
  contact: CmsContact;
  footer: CmsFooter;
  cta: CmsCta;
  about: CmsAbout;
  announcements: CmsAnnouncement[];
}

// ── Defaults (mirrors server defaults, used as fallback while loading) ─────────

const DEFAULTS: SiteContent = {
  branding: {
    companyNameEn: "Rakez Smart Solutions",
    companyNameAr: "ركز للحلول الذكية",
    taglineEn: "Premium Property Management",
    taglineAr: "إدارة عقارات متميزة",
    logoUrl: "",
  },
  hero: {
    titleEn: "Premium Property Management in Saudi Arabia",
    titleAr: "إدارة عقارات متميزة في المملكة العربية السعودية",
    subtitleEn: "Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.",
    subtitleAr: "اكتشف فنادق ومجمعات سكنية ومرافق مؤسسية حصرية تُدار باحترافية ودقة.",
    ctaButtonEn: "Explore Properties",
    ctaButtonAr: "تصفح العقارات",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  },
  stats: [
    { value: "50+",    labelEn: "Properties Managed",      labelAr: "عقار مُدار" },
    { value: "1,200+", labelEn: "Satisfied Tenants",        labelAr: "مستأجر راضٍ" },
    { value: "₂B SAR", labelEn: "Assets Under Management",  labelAr: "أصول تحت الإدارة" },
    { value: "10+",    labelEn: "Years of Excellence",       labelAr: "سنوات من التميز" },
  ],
  services: [
    {
      titleEn: "Hotel Operations",      titleAr: "إدارة الفنادق",
      descEn: "Comprehensive hospitality management delivering premium guest experiences and maximised yields.",
      descAr: "إدارة شاملة للأصول الفندقية مع التركيز على رضا الضيوف وتحسين الإيرادات.",
      itemsEn: ["Front desk & concierge management", "Housekeeping & maintenance services", "Revenue management & pricing strategy", "Guest experience optimization", "F&B operations management"],
      itemsAr: ["إدارة الاستقبال والكونسيرج", "خدمات التدبير المنزلي والصيانة", "إدارة الإيرادات وإستراتيجية التسعير", "تحسين تجربة الضيوف", "إدارة عمليات الأغذية والمشروبات"],
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Compound Management",   titleAr: "إدارة المجمعات السكنية",
      descEn: "Creating thriving residential communities through comprehensive compound management.",
      descAr: "بناء مجتمعات سكنية متكاملة من خلال إدارة شاملة للمجمع.",
      itemsEn: ["24/7 Security & access control", "Preventive maintenance programs", "Community events & lifestyle services", "Recreational facility management", "Tenant relations & leasing"],
      itemsAr: ["الأمن على مدار الساعة وضبط الدخول", "برامج الصيانة الوقائية", "الفعاليات المجتمعية وخدمات أسلوب الحياة", "إدارة المرافق الترفيهية", "علاقات المستأجرين والتأجير"],
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    },
    {
      titleEn: "Corporate Facilities",  titleAr: "المرافق المؤسسية",
      descEn: "Professional facility management for corporate environments enhancing productivity.",
      descAr: "تقديم خدمات إدارة المرافق الاحترافية للبيئات المؤسسية.",
      itemsEn: ["Integrated facilities management", "Health, safety & environment compliance", "Energy management & sustainability", "Workspace planning & optimization", "Vendor & contract management"],
      itemsAr: ["الإدارة المتكاملة للمرافق", "الامتثال للصحة والسلامة والبيئة", "إدارة الطاقة والاستدامة", "تخطيط مساحة العمل وتحسينها", "إدارة الموردين والعقود"],
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
    },
  ],
  nav: [
    { href: "/",         labelEn: "Home",          labelAr: "الرئيسية"    },
    { href: "/listings", labelEn: "Properties",    labelAr: "العقارات"    },
    { href: "/services", labelEn: "Services",      labelAr: "الخدمات"     },
    { href: "/contact",  labelEn: "Contact",       labelAr: "اتصل بنا"    },
    { href: "/portal",   labelEn: "Client Portal", labelAr: "بوابة العميل" },
  ],
  contact: {
    email: "info@rakez-solutions.com",
    salesEmail: "sales@rakez-solutions.com",
    supportEmail: "support@rakez-solutions.com",
    phone: "+966 11 234 5678",
    fax: "+966 11 234 5679",
    supportPhone: "9200 12345",
    whatsapp: "",
    addressEn: "King Fahd Road, Olaya District\nP.O. Box 12345\nRiyadh 11471, Saudi Arabia",
    addressAr: "طريق الملك فهد، حي العليا\nص.ب. 12345\nالرياض 11471، المملكة العربية السعودية",
  },
  footer: {
    descriptionEn: "Your trusted partner for premium property management across Saudi Arabia — hotels, compounds, and corporate facilities.",
    descriptionAr: "شريكك الموثوق لإدارة العقارات المتميزة في المملكة العربية السعودية — فنادق ومجمعات سكنية ومرافق مؤسسية.",
  },
  cta: {
    headlineEn: "Ready to Maximise Your Property's Potential?",
    headlineAr: "هل أنت مستعد لتعظيم قيمة عقارك؟",
    subtitleEn: "Get in touch with our team today and discover how Rakez can transform your property assets into a performing investment.",
    subtitleAr: "تواصل مع فريقنا اليوم واكتشف كيف يمكن لركز أن يحول أصولك العقارية إلى استثمار مثمر.",
    buttonEn: "Contact Us",
    buttonAr: "تواصل معنا",
  },
  about: {
    titleEn: "About Rakez Smart Solutions",
    titleAr: "عن ركز للحلول الذكية",
    body: "",
    imageUrl: "",
  },
  announcements: [],
};

// ── Context ───────────────────────────────────────────────────────────────────

interface CmsContextValue {
  content: SiteContent;
  isLoading: boolean;
}

const CmsContext = createContext<CmsContextValue>({
  content: DEFAULTS,
  isLoading: true,
});

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cms/site-content')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { content: Partial<SiteContent> }) => {
        if (cancelled) return;
        setContent(prev => ({
          branding:      { ...prev.branding,      ...(data.content.branding      ?? {}) },
          hero:          { ...prev.hero,          ...(data.content.hero          ?? {}) },
          stats:         data.content.stats      ?? prev.stats,
          services:      data.content.services   ?? prev.services,
          nav:           data.content.nav        ?? prev.nav,
          contact:       { ...prev.contact,       ...(data.content.contact       ?? {}) },
          footer:        { ...prev.footer,        ...(data.content.footer        ?? {}) },
          cta:           { ...prev.cta,           ...(data.content.cta           ?? {}) },
          about:         { ...prev.about,         ...(data.content.about         ?? {}) },
          announcements: data.content.announcements ?? prev.announcements,
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <CmsContext.Provider value={{ content, isLoading }}>
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = (): CmsContextValue => useContext(CmsContext);
