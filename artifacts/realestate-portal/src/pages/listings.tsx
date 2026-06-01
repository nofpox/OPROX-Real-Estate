import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useGetListings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Building, X, SlidersHorizontal } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/ui/skeleton';

const PROPERTY_TYPES = [
  { value: 'hotel',       labelEn: 'Hotel',       labelAr: 'فندق'           },
  { value: 'compound',    labelEn: 'Compound',     labelAr: 'مجمع سكني'      },
  { value: 'apartment',   labelEn: 'Apartment',    labelAr: 'شقة'            },
  { value: 'villa',       labelEn: 'Villa',        labelAr: 'فيلا'           },
  { value: 'office',      labelEn: 'Office',       labelAr: 'مكتب'           },
  { value: 'commercial',  labelEn: 'Commercial',   labelAr: 'تجاري'          },
  { value: 'warehouse',   labelEn: 'Warehouse',    labelAr: 'مستودع'         },
];

const LISTING_TYPES = [
  { value: 'sale',        labelEn: 'For Sale',     labelAr: 'للبيع'          },
  { value: 'rent',        labelEn: 'For Rent',     labelAr: 'للإيجار'        },
  { value: 'operational', labelEn: 'Operational',  labelAr: 'تشغيلي'         },
];

export const ListingsBrowser: React.FC = () => {
  const { t, isRtl } = useLanguage();

  const [page,         setPage]         = useState(1);
  const [q,            setQ]            = useState('');
  const [inputValue,   setInputValue]   = useState('');
  const [propertyType, setPropertyType] = useState<string>('all');
  const [type,         setType]         = useState<string>('all');

  const { data: response, isLoading } = useGetListings({
    page,
    limit:  12,
    status: 'active',
    ...(q            && { q }),
    ...(propertyType !== 'all' && { propertyType }),
    ...(type         !== 'all' && { type }),
  });

  const listings = response?.data ?? [];
  const meta     = response?.meta;
  const total    = meta?.total ?? 0;

  const hasActiveFilters = q || propertyType !== 'all' || type !== 'all';

  const clearAll = () => {
    setQ(''); setInputValue(''); setPropertyType('all'); setType('all'); setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(inputValue.trim());
    setPage(1);
  };

  const ptLabel = (v: string) => {
    const found = PROPERTY_TYPES.find((x) => x.value === v);
    return found ? (isRtl ? found.labelAr : found.labelEn) : v;
  };
  const ltLabel = (v: string) => {
    const found = LISTING_TYPES.find((x) => x.value === v);
    return found ? (isRtl ? found.labelAr : found.labelEn) : v;
  };

  return (
    <div className="bg-muted min-h-screen">
      {/* Page header */}
      <div className="bg-primary text-primary-foreground py-14">
        <div className="container mx-auto px-4">
          <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            {isRtl ? 'استكشف' : 'Browse'}
          </p>
          <h1 className="text-4xl font-bold mb-2">{t('nav.listings')}</h1>
          <p className="text-primary-foreground/70 text-sm">
            {isRtl
              ? 'اكتشف مجموعة عقاراتنا المختارة في المملكة العربية السعودية'
              : 'Discover our curated selection of properties across Saudi Arabia'}
          </p>
        </div>
      </div>

      <Helmet>
        <title>{isRtl ? 'العقارات' : 'Property Listings'} | ركز للحلول الذكية</title>
        <meta name="description" content="Browse properties for sale, rent, and under professional management by Rakez Smart Solutions." />
        <link rel="canonical" href="https://rakez.sa/realestate/listings" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">

        {/* Search + Filter bar */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
              <Input
                placeholder={t('search.placeholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={`${isRtl ? 'pr-9' : 'pl-9'} h-10`}
              />
            </div>

            {/* Transaction type */}
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-44 h-10">
                <SelectValue placeholder={isRtl ? 'نوع المعاملة' : 'Transaction'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                {LISTING_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {isRtl ? lt.labelAr : lt.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Property type */}
            <Select value={propertyType} onValueChange={(v) => { setPropertyType(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-44 h-10">
                <SelectValue placeholder={isRtl ? 'نوع العقار' : 'Property Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? 'جميع العقارات' : 'All Properties'}</SelectItem>
                {PROPERTY_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {isRtl ? pt.labelAr : pt.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="submit"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-6"
            >
              <SlidersHorizontal className="h-4 w-4 me-2" />
              {isRtl ? 'بحث' : 'Search'}
            </Button>
          </form>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground me-1">
                {isRtl ? 'فلاتر نشطة:' : 'Active filters:'}
              </span>
              {q && (
                <span className="inline-flex items-center gap-1 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-medium px-2.5 py-1 rounded-full">
                  "{q}"
                  <button onClick={() => { setQ(''); setInputValue(''); setPage(1); }}
                    className="hover:text-destructive transition-colors ms-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {type !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-medium px-2.5 py-1 rounded-full">
                  {ltLabel(type)}
                  <button onClick={() => { setType('all'); setPage(1); }}
                    className="hover:text-destructive transition-colors ms-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {propertyType !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-medium px-2.5 py-1 rounded-full">
                  {ptLabel(propertyType)}
                  <button onClick={() => { setPropertyType('all'); setPage(1); }}
                    className="hover:text-destructive transition-colors ms-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors ms-1 underline-offset-2 hover:underline"
              >
                {isRtl ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}
        </div>

        {/* Result count */}
        {!isLoading && listings.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {isRtl
              ? `عرض ${listings.length} من أصل ${total} عقار`
              : `Showing ${listings.length} of ${total} ${total === 1 ? 'property' : 'properties'}`}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border border-border shadow-sm">
                <Skeleton className="h-52 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-card rounded-xl p-16 text-center border border-border shadow-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              {isRtl ? 'لا توجد عقارات' : 'No properties found'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {isRtl
                ? 'جرّب تعديل الفلاتر للعثور على ما تبحث عنه.'
                : "Try adjusting your filters to find what you're looking for."}
            </p>
            <Button variant="outline" onClick={clearAll}>
              {isRtl ? 'مسح الفلاتر' : 'Clear Filters'}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {meta && (meta.totalPages ?? 1) > 1 && (
              <div className="flex justify-center items-center mt-12 gap-3">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  {isRtl
                    ? `صفحة ${page} من ${meta.totalPages ?? 1}`
                    : `Page ${page} of ${meta.totalPages ?? 1}`}
                </span>
                <Button
                  variant="outline"
                  disabled={page === (meta.totalPages ?? 1)}
                  onClick={() => setPage((p) => Math.min(meta.totalPages ?? 1, p + 1))}
                >
                  {isRtl ? 'التالي' : 'Next'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
