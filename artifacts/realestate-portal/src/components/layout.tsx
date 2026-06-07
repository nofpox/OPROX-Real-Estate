import React from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Building, Menu, X, Globe, MapPin, Mail, Phone, KeyRound } from 'lucide-react';
import { SmartAssistant } from './assistant';
import { SmartAppBanner } from './SmartAppBanner';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, isRtl } = useLanguage();
  const { content } = useCms();
  const [location]      = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const { nav, branding, footer, contact } = content;

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const isActive = (href: string) =>
    href === '/' ? location === '/' || location === '' : location.startsWith(href);

  // Center nav: only Properties, Services, Contact — no home, no portal
  const ALLOWED_HREFS = ['/listings', '/services', '/contact'];
  const centerNav = nav.filter(n => ALLOWED_HREFS.includes(n.href));

  return (
    <div className="h-dvh overflow-auto flex flex-col font-sans">

      {/* ── Smart App Banner (mobile only, dismissible) ─────────────────────── */}
      <SmartAppBanner />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* ── LEFT: Logo ──────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt={branding.companyNameEn} className="h-8 w-8 object-contain" />
              : <Building className="h-5 w-5 text-secondary" />
            }
            <span className="font-bold text-lg tracking-tight text-primary">
              {isRtl ? branding.companyNameAr || 'روزوز' : branding.companyNameEn || 'Rozoz'}
            </span>
          </Link>

          {/* ── CENTER: Main Nav (desktop) ───────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Main navigation">
            {centerNav.map(({ href, labelEn, labelAr }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(href)
                    ? 'text-secondary bg-secondary/10'
                    : 'text-foreground/60 hover:text-primary hover:bg-muted'
                }`}
              >
                {isRtl ? labelAr : labelEn}
                {isActive(href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* ── RIGHT: Language toggle (desktop) ──────────────────────── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" />
            </button>
            <Link
              href="/portal"
              className="flex items-center gap-2 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {isRtl ? 'الإدارة' : 'Admin'}
            </Link>
          </div>

          {/* ── MOBILE: Globe + Hamburger ────────────────────────────────── */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleLanguage}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Globe className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile nav drawer ───────────────────────────────────────────── */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/60 bg-background shadow-lg">
            <nav className="p-3 flex flex-col gap-1">
              {centerNav.map(({ href, labelEn, labelAr }) => (
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
              <div className="mt-1 pt-2 border-t border-border/60">
                <Link
                  href="/portal"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                >
                  <KeyRound className="h-4 w-4" />
                  {isRtl ? 'الإدارة' : 'Admin'}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Smart Assistant (floating) ───────────────────────────────────────── */}
      <SmartAssistant />

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 max-w-3xl">

          {/* Brand + description */}
          <div className="flex items-center gap-2 mb-4">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="" className="h-6 w-6 object-contain" />
              : <Building className="h-5 w-5 text-secondary" />
            }
            <span className="font-bold text-lg text-white">
              {isRtl ? branding.companyNameAr : branding.companyNameEn}
            </span>
          </div>
          <p className="text-primary-foreground/60 text-sm leading-relaxed max-w-sm">
            {isRtl ? footer.descriptionAr : footer.descriptionEn}
          </p>

          {/* Contact info only */}
          <ul className="mt-6 space-y-2 text-sm text-primary-foreground/60">
            {(isRtl ? contact.addressAr : contact.addressEn) && (
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
                {isRtl ? contact.addressAr : contact.addressEn}
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

        {/* Legal bar — copyright only, no nav links */}
        <div className="border-t border-primary-foreground/10">
          <div className="container mx-auto px-4 py-4 text-center text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} {isRtl ? branding.companyNameAr : branding.companyNameEn}.{' '}
            {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>
    </div>
  );
};
