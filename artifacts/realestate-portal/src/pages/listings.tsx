import React, { useState } from 'react';
import { Link } from 'wouter';
import { useGetListings } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Building, Filter, BedDouble, Bath, Square } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { Skeleton } from '@/components/ui/skeleton';

export const ListingsBrowser: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [propertyType, setPropertyType] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  
  const { data: response, isLoading } = useGetListings({
    params: {
      page,
      limit: 12,
      ...(q && { q }),
      ...(propertyType !== 'all' && { propertyType: propertyType as any }),
      ...(type !== 'all' && { type: type as any }),
      status: 'active'
    }
  });

  const listings = response?.data || [];
  const meta = response?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="bg-muted min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-4">{t('nav.listings')}</h1>
          
          <form onSubmit={handleSearch} className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
              <Input 
                placeholder={t('search.placeholder')} 
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            
            <Select value={type} onValueChange={(val) => { setType(val); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>

            <Select value={propertyType} onValueChange={(val) => { setPropertyType(val); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="compound">Compound</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Search
            </Button>
          </form>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg overflow-hidden border border-border shadow-sm">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-border shadow-sm">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => { setQ(''); setType('all'); setPropertyType('all'); setPage(1); }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center items-center mt-12 gap-2">
                <Button 
                  variant="outline" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {meta.totalPages}
                </span>
                <Button 
                  variant="outline" 
                  disabled={page === meta.totalPages}
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
