import React from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Building, Menu, X, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from './ui/button';

interface NavItem {
  href:    string;
  labelEn: string;
  labelAr: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',         labelEn: 'Home',          labelAr: 'الرئيسية'    },
  { href: '/listings', labelEn: 'Properties',    labelAr: 'العقارات'    },
  { href: '/services', labelEn: 'Services',      labelAr: 'الخدمات'     },
  { href: '/contact',  labelEn: 'Contact',       labelAr: 'اتصل بنا'    },
  { href: '/portal',   labelEn: 'Client Portal', labelAr: 'بوابة العميل' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [location]      = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const isActive = (href: string) =>
    href === '/' ? location === '/' || location === '' : location.startsWith(href);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Building className="h-5 w-5 text-secondary" />
            <span className="font-bold text-lg tracking-tight text-primary">
              ركز <span className="text-muted-foreground/60 font-normal text-sm">|</span> Rakez
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map(({ href, labelEn, labelAr }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(href)
                    ? 'text-secondary bg-secondary/8'
                    : 'text-foreground/70 hover:text-primary hover:bg-muted'
                }`}
              >
                {isRtl ? labelAr : labelEn}
                {isActive(href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={toggleLanguage}
              className="rounded-full text-muted-foreground hover:text-primary gap-1.5 text-xs font-medium"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === 'en' ? 'عربي' : 'EN'}
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 text-xs">
              <Link href="/contact">
                <Phone className={`h-3.5 w-3.5 ${isRtl ? 'ms-1.5' : 'me-1.5'}`} />
                {isRtl ? 'اتصل بنا' : 'Contact Us'}
              </Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-8 w-8">
              <Globe className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-8 w-8">
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background shadow-lg">
            <nav className="p-3 flex flex-col gap-1">
              {NAV_ITEMS.map(({ href, labelEn, labelAr }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'bg-secondary/10 text-secondary'
                      : 'text-foreground/70 hover:bg-muted hover:text-primary'
                  }`}
                >
                  {isRtl ? labelAr : labelEn}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-secondary" />
              <span className="font-bold text-lg text-white">ركز | Rakez</span>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
            {/* Contact mini-list */}
            <ul className="mt-6 space-y-2 text-sm text-primary-foreground/60">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
                {isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-secondary shrink-0" />
                <a href="mailto:info@rakez-solutions.com" className="hover:text-secondary transition-colors">
                  info@rakez-solutions.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-secondary shrink-0" />
                <a href="tel:+966112345678" className="hover:text-secondary transition-colors">
                  +966 11 234 5678
                </a>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-sm text-white/90 uppercase tracking-wider mb-4">
              {isRtl ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-2.5 text-sm text-primary-foreground/60">
              {NAV_ITEMS.slice(0, 4).map(({ href, labelEn, labelAr }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-secondary transition-colors">
                    {isRtl ? labelAr : labelEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal */}
          <div>
            <h3 className="font-semibold text-sm text-white/90 uppercase tracking-wider mb-4">
              {isRtl ? 'بوابة العملاء' : 'Client Portal'}
            </h3>
            <p className="text-sm text-primary-foreground/60 mb-4 leading-relaxed">
              {isRtl
                ? 'وصول مباشر لعقاراتك المدارة والتقارير المالية.'
                : 'Direct access to your managed properties and financial reports.'}
            </p>
            <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs h-8 px-4">
              <Link href="/portal">
                {isRtl ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            </Button>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-primary-foreground/40">
            <span>© {new Date().getFullYear()} Rakez Smart Solutions. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span>
            <span className="flex items-center gap-3">
              <Link href="/listings" className="hover:text-primary-foreground/70 transition-colors">
                {isRtl ? 'العقارات' : 'Properties'}
              </Link>
              <span className="text-primary-foreground/20">·</span>
              <Link href="/services" className="hover:text-primary-foreground/70 transition-colors">
                {isRtl ? 'الخدمات' : 'Services'}
              </Link>
              <span className="text-primary-foreground/20">·</span>
              <Link href="/contact" className="hover:text-primary-foreground/70 transition-colors">
                {isRtl ? 'اتصل بنا' : 'Contact'}
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
