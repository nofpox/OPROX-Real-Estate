import React from 'react';
import { Link } from 'wouter';
import { Building2, MapPin, BedDouble, Bath, Square } from 'lucide-react';
import { Listing } from '@workspace/api-client-react';

interface ListingCardProps {
  listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: currency || 'SAR', maximumFractionDigits: 0 }).format(price);
  };

  const hasMedia = listing.media && Array.isArray(listing.media) && listing.media.length > 0;
  const mainImage = hasMedia ? (listing.media[0] as any).url : null;

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow group cursor-pointer h-full flex flex-col">
        <div className="relative h-48 bg-muted overflow-hidden">
          {mainImage ? (
            <img 
              src={mainImage} 
              alt={listing.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-primary/20" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="px-2.5 py-1 bg-background/90 backdrop-blur text-primary text-xs font-semibold rounded shadow-sm uppercase tracking-wider">
              {listing.listingType}
            </span>
          </div>
          
          <div className="absolute bottom-3 right-3">
            <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded shadow-sm uppercase tracking-wider">
              {listing.propertyType}
            </span>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-primary line-clamp-1 group-hover:text-secondary transition-colors">
              {listing.title}
            </h3>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              <span className="line-clamp-1">{listing.district}, {listing.city}</span>
            </div>
          </div>
          
          <div className="mt-auto pt-4 flex items-center justify-between">
            <div className="text-lg font-bold text-secondary-foreground">
              {formatPrice(listing.price, listing.currency)}
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              {listing.bedrooms != null && (
                <div className="flex items-center gap-1" title="Bedrooms">
                  <BedDouble className="h-4 w-4" />
                  <span>{listing.bedrooms}</span>
                </div>
              )}
              {listing.bathrooms != null && (
                <div className="flex items-center gap-1" title="Bathrooms">
                  <Bath className="h-4 w-4" />
                  <span>{listing.bathrooms}</span>
                </div>
              )}
              {listing.areaSqm != null && (
                <div className="flex items-center gap-1" title="Area (sqm)">
                  <Square className="h-4 w-4" />
                  <span>{listing.areaSqm}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
