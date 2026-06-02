import React from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Building, Menu, X, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from './ui/button';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, isRtl } = useLanguage();
  const { content } = useCms();
  const [location]      = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const { nav, branding, footer, contact } = content;

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const isActive = (href: string) =>
    href === '/' ? location === '/' || location === '' : location.startsWith(href);

  return (
    <div className="h-dvh overflow-auto flex flex-col font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt={branding.companyNameEn} className="h-8 w-8 object-contain" />
              : <Building className="h-5 w-5 text-secondary" />
            }
            <span className="font-bold text-lg tracking-tight text-primary">
              {isRtl
                ? branding.companyNameAr || 'ركز | Rakez'
                : branding.companyNameEn || 'Rakez'}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {nav.map(({ href, labelEn, labelAr }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(href)
                    ? 'text-secondary bg-secondary/10'
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
                {isRtl
                  ? nav.find(n => n.href === '/contact')?.labelAr || 'اتصل بنا'
                  : nav.find(n => n.href === '/contact')?.labelEn || 'Contact Us'}
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
              {nav.map(({ href, labelEn, labelAr }) => (
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
              {branding.logoUrl
                ? <img src={branding.logoUrl} alt="" className="h-6 w-6 object-contain" />
                : <Building className="h-5 w-5 text-secondary" />
              }
              <span className="font-bold text-lg text-white">
                {isRtl ? branding.companyNameAr : branding.companyNameEn}
              </span>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-xs">
              {isRtl ? footer.descriptionAr : footer.descriptionEn}
            </p>
            {/* Contact mini-list */}
            <ul className="mt-6 space-y-2 text-sm text-primary-foreground/60">
              {(isRtl ? contact.addressAr : contact.addressEn) && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
                  {isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
                </li>
              )}
              {contact.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-secondary transition-colors">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:text-secondary transition-colors" dir="ltr">
                    {contact.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-sm text-white/90 uppercase tracking-wider mb-4">
              {isRtl ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-2.5 text-sm text-primary-foreground/60">
              {nav.slice(0, 4).map(({ href, labelEn, labelAr }) => (
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
              {isRtl
                ? nav.find(n => n.href === '/portal')?.labelAr || 'بوابة العملاء'
                : nav.find(n => n.href === '/portal')?.labelEn || 'Client Portal'}
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
            <span>© {new Date().getFullYear()} {isRtl ? branding.companyNameAr : branding.companyNameEn}. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span>
            <span className="flex items-center gap-3">
              {nav.slice(1, 4).map(({ href, labelEn, labelAr }, i, arr) => (
                <React.Fragment key={href}>
                  <Link href={href} className="hover:text-primary-foreground/70 transition-colors">
                    {isRtl ? labelAr : labelEn}
                  </Link>
                  {i < arr.length - 1 && <span className="text-primary-foreground/20">·</span>}
                </React.Fragment>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
