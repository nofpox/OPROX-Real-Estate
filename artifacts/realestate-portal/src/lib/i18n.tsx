import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'ar';

const STORAGE_KEY = 'rakez-re-lang';

function getSavedLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // ignore
  }
  return 'ar';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const translations = {
  en: {
    // ── Navigation ──────────────────────────────────────────────────────────
    'nav.home':     'Home',
    'nav.listings': 'Properties',
    'nav.services': 'Services',
    'nav.contact':  'Contact Us',
    'nav.portal':   'Client Portal',

    // ── Hero ────────────────────────────────────────────────────────────────
    'hero.title':    'Premium Property Management in Saudi Arabia',
    'hero.subtitle': 'Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.',
    'hero.cta':      'Explore Properties',

    // ── General ─────────────────────────────────────────────────────────────
    'featured.title':   'Featured Properties',
    'services.title':   'Our Operational Services',
    'footer.description': 'Rakez Smart Solutions — Focused and precise property management across Saudi Arabia.',
    'contact.title':    'Get in Touch',
    'search.placeholder': 'Search properties...',

    // ── CTA labels ──────────────────────────────────────────────────────────
    'cta.sale':        'Inquire to Purchase',
    'cta.rent':        'Book a Viewing',
    'cta.operational': 'Inquire for Management',

    // ── Listing detail ───────────────────────────────────────────────────────
    'detail.operationalHeading':       'Under Rakez Management',
    'detail.operationalText':          'This property is actively managed by Rakez Smart Solutions. Our team handles operations, staffing, maintenance, and reporting.',
    'detail.inquiry.saleHeading':      'Purchase Inquiry',
    'detail.inquiry.saleBtn':          'Send Purchase Inquiry',
    'detail.inquiry.rentHeading':      'Rental Inquiry',
    'detail.inquiry.rentBtn':          'Book a Viewing',
    'detail.inquiry.operationalHeading': 'Inquire for Management',
    'detail.inquiry.operationalBtn':   'Send Management Inquiry',
    'detail.portalPrompt':             'Already a Rakez client?',
    'detail.portalLink':               'Sign in to your portal →',

    // ── Portal auth ──────────────────────────────────────────────────────────
    'portal.loginTitle':              'Client Portal Login',
    'portal.loginSubtitle':           'Access your managed properties and reports',
    'portal.organizationId':          'Organization ID',
    'portal.organizationIdPlaceholder': 'e.g. your-company',
    'portal.username':                'Username',
    'portal.password':                'Password',
    'portal.loggingIn':               'Signing in...',
    'portal.loginButton':             'Sign in',
    'portal.backToWebsite':           'Back to website',

    // ── Portal dashboard – header / KPIs ─────────────────────────────────────
    'portal.myPortfolio':     'My Portfolio',
    'portal.welcome':         'Welcome back,',
    'portal.logout':          'Logout',
    'portal.totalProperties': 'Total Properties',
    'portal.activeBookings':  'Active Bookings',
    'portal.avgOccupancy':    'Avg. Occupancy',

    // ── Portal dashboard – tabs & filters ────────────────────────────────────
    'portal.overview':      'Overview',
    'portal.financials':    'Financials',
    'portal.allProperties': 'All Properties',
    'portal.allStatuses':   'All Statuses',

    // ── Portal dashboard – property card ─────────────────────────────────────
    'portal.managedProperties': 'Managed Properties',
    'portal.occupancy':         'Occupancy',
    'portal.viewListing':       'View Listing',
    'portal.roomsUnit':         'rooms',

    // ── Portal dashboard – property types ─────────────────────────────────────
    'portal.type.hotel':       'Hotel',
    'portal.type.compound':    'Compound',
    'portal.type.apartment':   'Apartment',
    'portal.type.villa':       'Villa',
    'portal.type.office':      'Office',
    'portal.type.commercial':  'Commercial',
    'portal.type.warehouse':   'Warehouse',

    // ── Portal dashboard – status labels ─────────────────────────────────────
    'portal.status.active':     'Active',
    'portal.status.inactive':   'Inactive',
    'portal.status.confirmed':  'Confirmed',
    'portal.status.checkedIn':  'Checked In',
    'portal.status.checkedOut': 'Checked Out',
    'portal.status.cancelled':  'Cancelled',
    'portal.status.pending':    'Pending',

    // ── Portal dashboard – bookings table ─────────────────────────────────────
    'portal.recentBookings': 'Recent Bookings',
    'portal.col.guest':      'Guest',
    'portal.col.property':   'Property',
    'portal.col.room':       'Room',
    'portal.col.checkIn':    'Check In',
    'portal.col.checkOut':   'Check Out',
    'portal.col.status':     'Status',
    'portal.noBookings':     'No bookings found.',

    // ── Portal dashboard – financials tab ─────────────────────────────────────
    'portal.period':                  'Period',
    'portal.revenue':                 'Revenue',
    'portal.expenses':                'Expenses',
    'portal.netProfit':               'Net Profit',
    'portal.margin':                  'Margin',
    'portal.revenueMinusExpenses':    'Revenue − Expenses',
    'portal.profitMargin':            'Profit margin',
    'portal.monthlyCashFlow':         'Monthly Cash Flow',
    'portal.noFinancialData':         'No financial data for the selected period.',
    'portal.netIncome':               'Net Income',
    'portal.col.month':               'Month',
  },

  ar: {
    // ── Navigation ──────────────────────────────────────────────────────────
    'nav.home':     'الرئيسية',
    'nav.listings': 'العقارات',
    'nav.services': 'الخدمات',
    'nav.contact':  'اتصل بنا',
    'nav.portal':   'بوابة العميل',

    // ── Hero ────────────────────────────────────────────────────────────────
    'hero.title':    'إدارة عقارات متميزة في المملكة العربية السعودية',
    'hero.subtitle': 'اكتشف فنادق، مجمعات سكنية، ومرافق شركات تدار بتركيز ودقة عالية.',
    'hero.cta':      'استكشف العقارات',

    // ── General ─────────────────────────────────────────────────────────────
    'featured.title':     'عقارات مميزة',
    'services.title':     'خدماتنا التشغيلية',
    'footer.description': 'ركز للحلول الذكية — إدارة عقارات بتركيز ودقة في جميع أنحاء المملكة.',
    'contact.title':      'تواصل معنا',
    'search.placeholder': 'ابحث عن العقارات...',

    // ── CTA labels ──────────────────────────────────────────────────────────
    'cta.sale':        'استفسار للشراء',
    'cta.rent':        'حجز موعد للمعاينة',
    'cta.operational': 'استفسار عن الإدارة',

    // ── Listing detail ───────────────────────────────────────────────────────
    'detail.operationalHeading':       'تحت إدارة ركز',
    'detail.operationalText':          'يُدار هذا العقار بفعالية من قبل ركز للحلول الذكية. يتولى فريقنا العمليات، التوظيف، الصيانة، وتقديم التقارير.',
    'detail.inquiry.saleHeading':      'استفسار شراء',
    'detail.inquiry.saleBtn':          'إرسال استفسار الشراء',
    'detail.inquiry.rentHeading':      'استفسار تأجير',
    'detail.inquiry.rentBtn':          'حجز موعد معاينة',
    'detail.inquiry.operationalHeading': 'استفسار للإدارة',
    'detail.inquiry.operationalBtn':   'إرسال استفسار الإدارة',
    'detail.portalPrompt':             'هل أنت عميل لركز؟',
    'detail.portalLink':               'تسجيل الدخول إلى بوابتك ←',

    // ── Portal auth ──────────────────────────────────────────────────────────
    'portal.loginTitle':              'تسجيل الدخول لبوابة العملاء',
    'portal.loginSubtitle':           'قم بالوصول إلى عقاراتك المدارة وتقاريرك',
    'portal.organizationId':          'معرف المؤسسة',
    'portal.organizationIdPlaceholder': 'مثال: شركتك',
    'portal.username':                'اسم المستخدم',
    'portal.password':                'كلمة المرور',
    'portal.loggingIn':               'جاري تسجيل الدخول...',
    'portal.loginButton':             'تسجيل الدخول',
    'portal.backToWebsite':           'العودة للموقع',

    // ── Portal dashboard – header / KPIs ─────────────────────────────────────
    'portal.myPortfolio':     'محفظتي',
    'portal.welcome':         'مرحباً بعودتك،',
    'portal.logout':          'تسجيل الخروج',
    'portal.totalProperties': 'إجمالي العقارات',
    'portal.activeBookings':  'الحجوزات النشطة',
    'portal.avgOccupancy':    'متوسط الإشغال',

    // ── Portal dashboard – tabs & filters ────────────────────────────────────
    'portal.overview':      'نظرة عامة',
    'portal.financials':    'المالية',
    'portal.allProperties': 'جميع العقارات',
    'portal.allStatuses':   'جميع الحالات',

    // ── Portal dashboard – property card ─────────────────────────────────────
    'portal.managedProperties': 'العقارات المدارة',
    'portal.occupancy':         'الإشغال',
    'portal.viewListing':       'عرض العقار',
    'portal.roomsUnit':         'غرفة',

    // ── Portal dashboard – property types ─────────────────────────────────────
    'portal.type.hotel':       'فندق',
    'portal.type.compound':    'مجمع',
    'portal.type.apartment':   'شقة',
    'portal.type.villa':       'فيلا',
    'portal.type.office':      'مكتب',
    'portal.type.commercial':  'تجاري',
    'portal.type.warehouse':   'مستودع',

    // ── Portal dashboard – status labels ─────────────────────────────────────
    'portal.status.active':     'نشط',
    'portal.status.inactive':   'غير نشط',
    'portal.status.confirmed':  'مؤكد',
    'portal.status.checkedIn':  'تم الدخول',
    'portal.status.checkedOut': 'تم المغادرة',
    'portal.status.cancelled':  'ملغي',
    'portal.status.pending':    'قيد الانتظار',

    // ── Portal dashboard – bookings table ─────────────────────────────────────
    'portal.recentBookings': 'الحجوزات الأخيرة',
    'portal.col.guest':      'الضيف',
    'portal.col.property':   'العقار',
    'portal.col.room':       'الغرفة',
    'portal.col.checkIn':    'تاريخ الوصول',
    'portal.col.checkOut':   'تاريخ المغادرة',
    'portal.col.status':     'الحالة',
    'portal.noBookings':     'لا توجد حجوزات.',

    // ── Portal dashboard – financials tab ─────────────────────────────────────
    'portal.period':               'الفترة',
    'portal.revenue':              'الإيرادات',
    'portal.expenses':             'المصروفات',
    'portal.netProfit':            'صافي الربح',
    'portal.margin':               'الهامش',
    'portal.revenueMinusExpenses': 'الإيرادات − المصروفات',
    'portal.profitMargin':         'هامش الربح',
    'portal.monthlyCashFlow':      'التدفق النقدي الشهري',
    'portal.noFinancialData':      'لا توجد بيانات مالية للفترة المحددة.',
    'portal.netIncome':            'صافي الدخل',
    'portal.col.month':            'الشهر',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  isRtl: true
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getSavedLang);

  const setLanguage = useCallback((lang: Language) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    document.documentElement.dir  = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key;
  }, [language]);

  const contextValue = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t, isRtl: language === 'ar' }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
