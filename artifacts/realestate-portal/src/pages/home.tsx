import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useGetListings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Building2, Key, Users } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/ui/skeleton';

export const Home: React.FC = () => {
  const { t, isRtl } = useLanguage();
  
  const { data: featuredResponse, isLoading } = useGetListings({
    featured: 'true',
    status: 'active',
    limit: 3,
  });
  
  const featuredListings = featuredResponse?.data || [];

  return (
    <div className="flex flex-col w-full">
      <Helmet>
        <title>ركز للحلول الذكية | Rakez Smart Solutions</title>
        <meta name="description" content="Premium property management and real estate services in Saudi Arabia. Hotels, compounds, apartments — managed by Rakez Smart Solutions." />
        <meta property="og:title" content="ركز للحلول الذكية | Rakez Smart Solutions" />
        <meta property="og:description" content="Premium property management and real estate services in Saudi Arabia." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://rakez.sa/realestate/" />
      </Helmet>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-primary/80 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
            alt="Modern Architecture" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="container relative z-20 px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/90">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 w-full sm:w-auto">
              <Link href="/listings">
                {t('hero.cta')}
                {isRtl ? <ArrowLeft className="mr-2 h-5 w-5" /> : <ArrowRight className="ml-2 h-5 w-5" />}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-white border-white hover:bg-white/10 hover:text-white text-lg px-8 py-6 w-full sm:w-auto">
              <Link href="/contact">
                {t('nav.contact')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-4">{t('featured.title')}</h2>
              <div className="w-24 h-1 bg-secondary" />
            </div>
            <Link href="/listings" className="text-secondary font-medium hover:underline inline-flex items-center hidden md:flex">
              View all properties {isRtl ? <ArrowLeft className="mr-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden border border-border">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No featured properties at the moment.
            </div>
          )}
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/listings" className="text-secondary font-medium hover:underline inline-flex items-center">
              View all properties {isRtl ? <ArrowLeft className="mr-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
            </Link>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary mb-4">{t('services.title')}</h2>
            <div className="w-24 h-1 bg-secondary mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow">
              <Building2 className="h-12 w-12 text-secondary mb-6" />
              <h3 className="text-xl font-bold text-primary mb-4">Corporate Facilities</h3>
              <p className="text-muted-foreground mb-6">End-to-end management of corporate spaces ensuring optimal operational efficiency and workplace satisfaction.</p>
              <Link href="/services" className="text-secondary font-medium hover:underline inline-flex items-center">
                Learn more {isRtl ? <ArrowLeft className="mr-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
              </Link>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow">
              <Key className="h-12 w-12 text-secondary mb-6" />
              <h3 className="text-xl font-bold text-primary mb-4">Hotel Operations</h3>
              <p className="text-muted-foreground mb-6">Comprehensive hospitality management delivering premium guest experiences and maximized asset yields.</p>
              <Link href="/services" className="text-secondary font-medium hover:underline inline-flex items-center">
                Learn more {isRtl ? <ArrowLeft className="mr-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
              </Link>
            </div>

            <div className="bg-card p-8 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow">
              <Users className="h-12 w-12 text-secondary mb-6" />
              <h3 className="text-xl font-bold text-primary mb-4">Compound Management</h3>
              <p className="text-muted-foreground mb-6">Dedicated residential community management focusing on lifestyle quality, maintenance, and security.</p>
              <Link href="/services" className="text-secondary font-medium hover:underline inline-flex items-center">
                Learn more {isRtl ? <ArrowLeft className="mr-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
