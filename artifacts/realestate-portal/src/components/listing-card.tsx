import React from 'react';
import { Link } from 'wouter';
import { Building2, MapPin, BedDouble, Bath, Square, ShieldCheck, Star } from 'lucide-react';
import { Listing } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface ListingCardProps {
  listing: Listing;
}

const TYPE_LABELS_EN: Record<string, string> = {
  sale: 'FOR SALE',
  rent: 'FOR RENT',
  operational: 'OPERATIONAL',
};
const TYPE_LABELS_AR: Record<string, string> = {
  sale: 'للبيع',
  rent: 'للإيجار',
  operational: 'تشغيلي',
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { t, isRtl } = useLanguage();

  const formatPrice = (price: number, currency: string) => {
    if (!price) return null;
    return new Intl.NumberFormat(isRtl ? 'ar-SA' : 'en-SA', {
      style:               'currency',
      currency:            currency || 'SAR',
      notation:            price >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: price >= 1_000_000 ? 1 : 0,
    }).format(price);
  };

  const priceSuffix = listing.listingType === 'rent' ? (isRtl ? '/سنة' : '/yr') : '';

  const hasMedia = listing.media != null && Array.isArray(listing.media) && listing.media.length > 0;
  const mainImage = hasMedia ? (listing.media![0] as { url: string }).url : null;

  const isOperational = listing.listingType === 'operational';
  const formattedPrice  = formatPrice(listing.price ?? 0, listing.currency ?? 'SAR');

  const getCtaText = () => {
    if (isOperational) return t('cta.operational');
    if (listing.listingType === 'sale') return t('cta.sale');
    if (listing.listingType === 'rent') return t('cta.rent');
    return 'View Details';
  };

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer h-full flex flex-col">

        {/* Image */}
        <div className="relative h-52 bg-muted overflow-hidden flex-shrink-0">
          {mainImage ? (
            <img
              src={mainImage}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
              <Building2 className="w-14 h-14 text-primary/15" />
            </div>
          )}

          {/* Gradient overlay on image bottom */}
          {mainImage && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          )}

          {/* Type badge — top start */}
          <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`}>
            <span className={`px-2.5 py-1 text-xs font-bold rounded tracking-wider shadow-sm ${
              isOperational
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-white text-primary'
            }`}>
              {(isRtl ? TYPE_LABELS_AR : TYPE_LABELS_EN)[listing.listingType] ?? listing.listingType.toUpperCase()}
            </span>
          </div>

          {/* Managed badge — top end */}
          {isOperational && (
            <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`}>
              <span className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                Housin
              </span>
            </div>
          )}

          {/* Featured star — top end (non-operational) */}
          {!isOperational && listing.featured && (
            <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`}>
              <span className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                {isRtl ? 'مميز' : 'Featured'}
              </span>
            </div>
          )}

          {/* Property type pill — bottom end */}
          <div className={`absolute bottom-3 ${isRtl ? 'left-3' : 'right-3'}`}>
            <span className="px-2 py-0.5 bg-white text-primary text-xs font-medium rounded-full uppercase tracking-wide">
              {listing.propertyType}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col gap-2">

          {/* Title + location */}
          <div>
            <h3 className="text-base font-bold text-primary line-clamp-1 group-hover:text-secondary transition-colors">
              {listing.title}
            </h3>
            <div className="flex items-center text-muted-foreground text-xs mt-0.5">
              <MapPin className={`h-3 w-3 flex-shrink-0 ${isRtl ? 'ml-1' : 'mr-1'}`} />
              <span className="line-clamp-1">{listing.district}, {listing.city}</span>
            </div>
          </div>

          {/* Specs row */}
          {(listing.bedrooms != null || listing.bathrooms != null || listing.areaSqm != null) && (
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              {listing.bedrooms != null && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5" />
                  {listing.bedrooms}
                </span>
              )}
              {listing.bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="h-3.5 w-3.5" />
                  {listing.bathrooms}
                </span>
              )}
              {listing.areaSqm != null && (
                <span className="flex items-center gap-1">
                  <Square className="h-3.5 w-3.5" />
                  {listing.areaSqm} m²
                </span>
              )}
            </div>
          )}

          {/* Price + CTA */}
          <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <div>
              {formattedPrice && !isOperational ? (
                <>
                  <span className="text-secondary font-bold text-base">{formattedPrice}</span>
                  {priceSuffix && (
                    <span className="text-muted-foreground text-xs ms-0.5">{priceSuffix}</span>
                  )}
                </>
              ) : isOperational ? (
                <span className="text-xs text-muted-foreground">
                  {isRtl ? 'حجز مباشر' : 'Direct booking'}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isRtl ? 'اتصل للسعر' : 'Contact for price'}
                </span>
              )}
            </div>
            <Button
              size="sm"
              className={`text-xs h-8 px-3 flex-shrink-0 ${
                isOperational
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {getCtaText()}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};
