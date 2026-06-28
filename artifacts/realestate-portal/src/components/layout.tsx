import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { SmartAppBanner } from './SmartAppBanner';
import {
  Building2, Search, Heart, Bell, Globe, Menu, X,
  ChevronDown, Phone, Mail, MapPin, ArrowLeft, ArrowRight,
  Facebook, Twitter, Instagram, Linkedin, Youtube
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-colors rounded-sm whitespace-nowrap ${
        active
          ? 'text-[#c9a84c] border-b-2 border-[#c9a84c]'
          : 'text-white/80 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

// ── HousIn Logo ─────────────────────────────────────────────────────────────────

function RozozLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/realestate/housin-logo.png"
        alt="HousIn"
        className="h-9 w-9 object-contain flex-shrink-0 rounded-sm"
      />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold text-xl tracking-tight"
          style={{ color: '#c9a84c' }}
        >
          HousIn
        </span>
        <span className="text-[9px] text-white/50 tracking-widest uppercase mt-0.5">
          منصة العقارات الذكية
        </span>
      </div>
    </div>
  );
}

// ── Public Navbar (Zillow-style) ───────────────────────────────────────────────

function PublicNavbar() {
  const { t, language, setLanguage, isRtl } = useLanguage();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location === path || location.startsWith(path + '?');

  const tabs = [
    { key: 'buy',       href: '/search?type=sale',       label: t('nav.buy') },
    { key: 'rent',      href: '/search?type=rent',       label: t('nav.rent') },
    { key: 'sell',      href: '/sell',                    label: t('nav.sell') },
    { key: 'tourism',   href: '/#tourism-section',        label: t('nav.tourism') },
    { key: 'financing', href: '/financing',               label: t('nav.financing') },
    { key: 'agents',    href: '/agents',                  label: t('nav.agents') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0f2040] shadow-md">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/">
            <RozozLogo />
          </Link>

          {/* Desktop nav tabs */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {tabs.map(tab => (
              <NavLink key={tab.key} href={tab.href} label={tab.label} active={isActive(tab.href.split('?')[0])} />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link href="/favorites" className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors">
              <Heart className="w-4 h-4" />
              <span className="hidden lg:inline">{t('nav.favorites')}</span>
            </Link>
            <Link href="/updates" className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              <span className="hidden lg:inline">{t('nav.updates')}</span>
            </Link>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-2 py-1.5 text-sm text-white/80 hover:text-white transition-colors border border-white/20 rounded"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'EN' : 'ع'}</span>
            </button>

            {/* Portal link */}
            <Link href="/portal" className="hidden md:inline-flex items-center px-3 py-1.5 bg-[#c9a84c] text-[#0f2040] text-sm font-semibold rounded hover:bg-[#b8963f] transition-colors">
              {t('nav.signin')}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 text-white/80 hover:text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0f2040]">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {tabs.map(tab => (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 text-sm font-medium rounded ${
                  isActive(tab.href.split('?')[0]) ? 'text-[#c9a84c] bg-white/5' : 'text-white/80'
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <hr className="border-white/10 my-1" />
            <Link href="/favorites" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-white/80 flex items-center gap-2">
              <Heart className="w-4 h-4" />{t('nav.favorites')}
            </Link>
            <Link href="/updates" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-white/80 flex items-center gap-2">
              <Bell className="w-4 h-4" />{t('nav.updates')}
            </Link>
            <Link href="/portal" onClick={() => setMobileOpen(false)} className="mt-1 mx-3 py-2 text-center bg-[#c9a84c] text-[#0f2040] text-sm font-semibold rounded">
              {t('nav.signin')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Public Footer ──────────────────────────────────────────────────────────────

function PublicFooter() {
  const { t, isRtl } = useLanguage();

  return (
    <footer className="bg-[#0a1628] text-white/70">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <RozozLogo className="mb-4" />
            <p className="text-sm leading-relaxed">{t('footer.tagline')}</p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="" onClick={e => e.preventDefault()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#c9a84c] hover:text-[#0f2040] transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{isRtl ? 'روابط سريعة' : 'Quick Links'}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search?type=sale" className="hover:text-[#c9a84c] transition-colors">{t('footer.buy')}</Link></li>
              <li><Link href="/search?type=rent" className="hover:text-[#c9a84c] transition-colors">{t('footer.rent')}</Link></li>
              <li><Link href="/sell" className="hover:text-[#c9a84c] transition-colors">{t('footer.sell')}</Link></li>
              <li><Link href="/financing" className="hover:text-[#c9a84c] transition-colors">{t('footer.financing')}</Link></li>
              <li><Link href="/agents" className="hover:text-[#c9a84c] transition-colors">{t('footer.agents')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{isRtl ? 'الشركة' : 'Company'}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-[#c9a84c] transition-colors">{t('footer.about')}</Link></li>
              <li><Link href="/contact" className="hover:text-[#c9a84c] transition-colors">{t('footer.contact')}</Link></li>
              <li><Link href="/portal" className="hover:text-[#c9a84c] transition-colors">{isRtl ? 'بوابة العملاء' : 'Client Portal'}</Link></li>
              <li><Link href="/privacy" className="hover:text-[#c9a84c] transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-[#c9a84c] transition-colors">{t('footer.terms')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{isRtl ? 'تواصل معنا' : 'Contact'}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
                <span>{isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#c9a84c] shrink-0" />
                <span dir="ltr">+966 11 000 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#c9a84c] shrink-0" />
                <span>info@housin.info</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/40">
          {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const isPortal = location.startsWith('/portal') || location.startsWith('/preview');

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <SmartAppBanner />
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
};
