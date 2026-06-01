import React from 'react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Building, Menu, X, Globe, Phone } from 'lucide-react';
import { Button } from './ui/button';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building className="h-6 w-6 text-secondary" />
            <span className="font-bold text-xl tracking-tight text-primary">ركز | Rakez</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-secondary transition-colors">{t('nav.home')}</Link>
            <Link href="/listings" className="text-sm font-medium hover:text-secondary transition-colors">{t('nav.listings')}</Link>
            <Link href="/services" className="text-sm font-medium hover:text-secondary transition-colors">{t('nav.services')}</Link>
            <Link href="/contact" className="text-sm font-medium hover:text-secondary transition-colors">{t('nav.contact')}</Link>
            <Link href="/portal" className="text-sm font-medium hover:text-secondary transition-colors">{t('nav.portal')}</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-full">
              <Globe className="h-4 w-4" />
              <span className="sr-only">Toggle language</span>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/contact">
                <Phone className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {t('nav.contact')}
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleLanguage}>
              <Globe className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t p-4 flex flex-col gap-4 bg-background">
            <Link href="/" className="text-sm font-medium p-2 hover:bg-muted rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.home')}</Link>
            <Link href="/listings" className="text-sm font-medium p-2 hover:bg-muted rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.listings')}</Link>
            <Link href="/services" className="text-sm font-medium p-2 hover:bg-muted rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.services')}</Link>
            <Link href="/contact" className="text-sm font-medium p-2 hover:bg-muted rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.contact')}</Link>
            <Link href="/portal" className="text-sm font-medium p-2 hover:bg-muted rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.portal')}</Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-6 w-6 text-secondary" />
              <span className="font-bold text-xl tracking-tight text-white">ركز | Rakez</span>
            </div>
            <p className="text-primary-foreground/70 max-w-md">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link href="/" className="hover:text-secondary transition-colors">Home</Link></li>
              <li><Link href="/listings" className="hover:text-secondary transition-colors">Properties</Link></li>
              <li><Link href="/services" className="hover:text-secondary transition-colors">Services</Link></li>
              <li><Link href="/contact" className="hover:text-secondary transition-colors">Contact</Link></li>
              <li><Link href="/portal" className="hover:text-secondary transition-colors">Client Portal</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Contact</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>Riyadh, Saudi Arabia</li>
              <li>info@rakez-solutions.com</li>
              <li>+966 11 234 5678</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-primary-foreground/10 text-sm text-center text-primary-foreground/50">
          © {new Date().getFullYear()} Rakez Smart Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
