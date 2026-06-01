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
    'hero.title': 'Premium Property Management in Saudi Arabia',
    'hero.subtitle': 'Discover exclusive hotels, compounds, and corporate facilities managed with focus and precision.',
    'hero.cta': 'Explore Properties',
    'featured.title': 'Featured Properties',
    'services.title': 'Our Operational Services',
    'footer.description': 'Rakez Smart Solutions — Focused and precise property management across Saudi Arabia.',
    'contact.title': 'Get in Touch',
    'search.placeholder': 'Search properties...',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.listings': 'العقارات',
    'nav.services': 'الخدمات',
    'nav.contact': 'اتصل بنا',
    'hero.title': 'إدارة عقارات متميزة في المملكة العربية السعودية',
    'hero.subtitle': 'اكتشف فنادق، مجمعات سكنية، ومرافق شركات تدار بتركيز ودقة عالية.',
    'hero.cta': 'استكشف العقارات',
    'featured.title': 'عقارات مميزة',
    'services.title': 'خدماتنا التشغيلية',
    'footer.description': 'ركز للحلول الذكية — إدارة عقارات بتركيز ودقة في جميع أنحاء المملكة.',
    'contact.title': 'تواصل معنا',
    'search.placeholder': 'ابحث عن العقارات...',
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
