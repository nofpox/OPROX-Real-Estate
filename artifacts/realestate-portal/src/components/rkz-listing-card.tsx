import React from 'react';
import { Building2, MapPin, BedDouble, Bath, Square, Smartphone } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export interface RkzListing {
  id: number;
  type: string;
  price: number;
  currency: string;
  city: string;
  district?: string | null;
  address?: string | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  title?: string | null;
  photos: string[];
  status: string;
  publishedAt?: string | null;
  createdAt: string;
}

const TYPE_LABELS_AR: Record<string, string> = {
  villa:      'فيلا',
  apartment:  'شقة',
  land:       'أرض',
  commercial: 'تجاري',
  compound:   'مجمع',
  floor:      'دور',
  warehouse:  'مستودع',
  farm:       'مزرعة',
  rest_house: 'استراحة',
  palace:     'قصر',
};

const TYPE_LABELS_EN: Record<string, string> = {
  villa:      'Villa',
  apartment:  'Apartment',
  land:       'Land',
  commercial: 'Commercial',
  compound:   'Compound',
  floor:      'Floor',
  warehouse:  'Warehouse',
  farm:       'Farm',
  rest_house: 'Rest House',
  palace:     'Palace',
};

interface Props {
  listing: RkzListing;
}

export const RkzListingCard: React.FC<Props> = ({ listing }) => {
  const { isRtl } = useLanguage();

  const formattedPrice = listing.price
    ? new Intl.NumberFormat(isRtl ? 'ar-SA' : 'en-SA', {
        style: 'currency',
        currency: listing.currency || 'SAR',
        notation: listing.price >= 1_000_000 ? 'compact' : 'standard',
        maximumFractionDigits: listing.price >= 1_000_000 ? 1 : 0,
      }).format(listing.price)
    : null;

  const typeLabel = isRtl
    ? (TYPE_LABELS_AR[listing.type] ?? listing.type)
    : (TYPE_LABELS_EN[listing.type] ?? listing.type);

  const mainImage = listing.photos?.[0] ?? null;
  const locationParts = [listing.district, listing.city].filter(Boolean);
  const location = locationParts.join('، ');

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer h-full flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden flex-shrink-0">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title ?? typeLabel}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-primary/15" />
          </div>
        )}
        {mainImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        )}

        {/* Type badge */}
        <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`}>
          <span className="px-2.5 py-1 text-xs font-bold rounded tracking-wider shadow-sm bg-white text-primary">
            {typeLabel}
          </span>
        </div>

        {/* App badge */}
        <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`}>
          <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full bg-secondary/90 text-secondary-foreground shadow-sm">
            <Smartphone className="h-3 w-3" />
            {isRtl ? 'تطبيق روزوز' : 'Rozoz App'}
          </span>
        </div>

        {/* Price on image bottom */}
        {formattedPrice && (
          <div className={`absolute bottom-3 ${isRtl ? 'right-3' : 'left-3'}`}>
            <span className="bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-lg">
              {formattedPrice}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2 leading-snug">
          {listing.title || `${typeLabel} — ${listing.city}`}
        </h3>

        {location && (
          <p className={`text-muted-foreground text-xs flex items-center gap-1 mb-3 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
            <MapPin className="h-3 w-3 shrink-0 text-secondary" />
            <span className="truncate">{location}</span>
          </p>
        )}

        {/* Specs */}
        <div className={`flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-auto ${isRtl ? 'flex-row-reverse' : ''}`}>
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 text-secondary/70" />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-secondary/70" />
              {listing.bathrooms}
            </span>
          )}
          {listing.area != null && (
            <span className="flex items-center gap-1">
              <Square className="h-3.5 w-3.5 text-secondary/70" />
              {listing.area} {isRtl ? 'م²' : 'm²'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
