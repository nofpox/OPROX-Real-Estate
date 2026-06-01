import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.listings': 'Properties',
    'nav.services': 'Services',
    'nav.contact': 'Contact Us',
    'nav.portal': 'Client Portal',
    'hero.title': 'Premium Property Management in Saudi Arabia',
    'hero.subtitle': 'Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.',
    'hero.cta': 'Explore Properties',
    'featured.title': 'Featured Properties',
    'services.title': 'Our Operational Services',
    'footer.description': 'Rakez Smart Solutions — Focused and precise property management across Saudi Arabia.',
    'contact.title': 'Get in Touch',
    'search.placeholder': 'Search properties...',
    
    // Listing Card CTAs
    'cta.sale': 'Inquire to Purchase',
    'cta.rent': 'Book a Viewing',
    'cta.operational': 'Inquire for Management',
    
    // Listing Detail
    'detail.operationalHeading': 'Under Rakez Management',
    'detail.operationalText': 'This property is actively managed by Rakez Smart Solutions. Our team handles operations, staffing, maintenance, and reporting.',
    'detail.inquiry.saleHeading': 'Purchase Inquiry',
    'detail.inquiry.saleBtn': 'Send Purchase Inquiry',
    'detail.inquiry.rentHeading': 'Rental Inquiry',
    'detail.inquiry.rentBtn': 'Book a Viewing',
    'detail.inquiry.operationalHeading': 'Inquire for Management',
    'detail.inquiry.operationalBtn': 'Send Management Inquiry',
    'detail.portalPrompt': 'Already a Rakez client?',
    'detail.portalLink': 'Sign in to your portal →',
    
    // Portal
    'portal.loginTitle': 'Client Portal Login',
    'portal.loginSubtitle': 'Access your managed properties and reports',
    'portal.organizationId': 'Organization ID',
    'portal.organizationIdPlaceholder': 'e.g. your-company',
    'portal.username': 'Username',
    'portal.password': 'Password',
    'portal.loggingIn': 'Signing in...',
    'portal.loginButton': 'Sign in',
    'portal.backToWebsite': 'Back to website',
    'portal.myPortfolio': 'My Portfolio',
    'portal.welcome': 'Welcome back,',
    'portal.logout': 'Logout',
    'portal.totalProperties': 'Total Properties',
    'portal.activeBookings': 'Active Bookings',
    'portal.avgOccupancy': 'Avg. Occupancy',
    'portal.managedProperties': 'Managed Properties',
    'portal.occupancy': 'Occupancy',
    'portal.viewListing': 'View Listing',
    'portal.recentBookings': 'Recent Bookings',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.listings': 'العقارات',
    'nav.services': 'الخدمات',
    'nav.contact': 'اتصل بنا',
    'nav.portal': 'بوابة العميل',
    'hero.title': 'إدارة عقارات متميزة في المملكة العربية السعودية',
    'hero.subtitle': 'اكتشف فنادق، مجمعات سكنية، ومرافق شركات تدار بتركيز ودقة عالية.',
    'hero.cta': 'استكشف العقارات',
    'featured.title': 'عقارات مميزة',
    'services.title': 'خدماتنا التشغيلية',
    'footer.description': 'ركز للحلول الذكية — إدارة عقارات بتركيز ودقة في جميع أنحاء المملكة.',
    'contact.title': 'تواصل معنا',
    'search.placeholder': 'ابحث عن العقارات...',
    
    // Listing Card CTAs
    'cta.sale': 'استفسار للشراء',
    'cta.rent': 'حجز موعد للمعاينة',
    'cta.operational': 'استفسار عن الإدارة',
    
    // Listing Detail
    'detail.operationalHeading': 'تحت إدارة ركز',
    'detail.operationalText': 'يُدار هذا العقار بفعالية من قبل ركز للحلول الذكية. يتولى فريقنا العمليات، التوظيف، الصيانة، وتقديم التقارير.',
    'detail.inquiry.saleHeading': 'استفسار شراء',
    'detail.inquiry.saleBtn': 'إرسال استفسار الشراء',
    'detail.inquiry.rentHeading': 'استفسار تأجير',
    'detail.inquiry.rentBtn': 'حجز موعد معاينة',
    'detail.inquiry.operationalHeading': 'استفسار للإدارة',
    'detail.inquiry.operationalBtn': 'إرسال استفسار الإدارة',
    'detail.portalPrompt': 'هل أنت عميل لركز؟',
    'detail.portalLink': 'تسجيل الدخول إلى بوابتك ←',
    
    // Portal
    'portal.loginTitle': 'تسجيل الدخول لبوابة العملاء',
    'portal.loginSubtitle': 'قم بالوصول إلى عقاراتك المدارة وتقاريرك',
    'portal.organizationId': 'معرف المؤسسة',
    'portal.organizationIdPlaceholder': 'مثال: شركتك',
    'portal.username': 'اسم المستخدم',
    'portal.password': 'كلمة المرور',
    'portal.loggingIn': 'جاري تسجيل الدخول...',
    'portal.loginButton': 'تسجيل الدخول',
    'portal.backToWebsite': 'العودة للموقع',
    'portal.myPortfolio': 'محفظتي',
    'portal.welcome': 'مرحباً بعودتك،',
    'portal.logout': 'تسجيل الخروج',
    'portal.totalProperties': 'إجمالي العقارات',
    'portal.activeBookings': 'الحجوزات النشطة',
    'portal.avgOccupancy': 'متوسط الإشغال',
    'portal.managedProperties': 'العقارات المدارة',
    'portal.occupancy': 'الإشغال',
    'portal.viewListing': 'عرض العقار',
    'portal.recentBookings': 'الحجوزات الأخيرة',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: () => '',
  isRtl: true
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
