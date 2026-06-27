import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { Heart, MapPin, Trash2, Search, Loader2, Star } from 'lucide-react';

interface Listing {
  id: number; title: string; price: number | null; areaSqm: number | null;
  bedrooms: number | null; bathrooms: number | null; city: string | null;
  district: string | null; propertyType: string | null; listingType: string;
  media: { url: string; caption: string }[]; featured: boolean; currency: string;
}

function apiUrl(path: string) { return `/realestate-api${path}`; }

function formatPrice(price: number, currency: string, isRtl: boolean): string {
  const c = currency === 'SAR' ? (isRtl ? 'ر.س' : 'SAR') : currency;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M ${c}`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K ${c}`;
  return `${price.toLocaleString()} ${c}`;
}

const MOCK_LISTINGS: Record<number, Listing> = {
  101: { id: 101, title: 'فيلا فاخرة حي النرجس', price: 3500000, areaSqm: 450, bedrooms: 5, bathrooms: 4, city: 'الرياض', district: 'حي النرجس', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', caption: '' }], featured: true, currency: 'SAR' },
  102: { id: 102, title: 'شقة مميزة الملقا', price: 8500, areaSqm: 180, bedrooms: 3, bathrooms: 2, city: 'الرياض', district: 'الملقا', propertyType: 'apartment', listingType: 'rent', media: [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', caption: '' }], featured: false, currency: 'SAR' },
  103: { id: 103, title: 'دور كامل حي الياسمين', price: 4200000, areaSqm: 380, bedrooms: 6, bathrooms: 5, city: 'الرياض', district: 'الياسمين', propertyType: 'floor', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', caption: '' }], featured: true, currency: 'SAR' },
};

export function Favorites() {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const [favIds, setFavIds] = useState<number[]>([]);

  useEffect(() => {
    try { setFavIds(JSON.parse(localStorage.getItem('rozoz_favorites') || '[]')); } catch { /* ignore */ }
  }, []);

  function remove(id: number) {
    const next = favIds.filter(i => i !== id);
    setFavIds(next);
    localStorage.setItem('rozoz_favorites', JSON.stringify(next));
  }

  // Try to load from API, fall back to mock
  const queries = favIds.map(id => ({
    queryKey: ['listing-fav', id],
    queryFn: async () => {
      try {
        const res = await fetch(apiUrl(`/listings/${id}`));
        if (!res.ok) return MOCK_LISTINGS[id] || null;
        const json = await res.json();
        return json.data as Listing || MOCK_LISTINGS[id] || null;
      } catch { return MOCK_LISTINGS[id] || null; }
    },
    staleTime: 60_000,
  }));

  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => {
    if (favIds.length === 0) { setListings([]); return; }
    Promise.all(
      favIds.map(id => fetch(apiUrl(`/listings/${id}`)).then(r => r.json()).then(j => j.data as Listing).catch(() => MOCK_LISTINGS[id] || null))
    ).then(results => setListings(results.filter(Boolean) as Listing[]));
  }, [favIds.join(',')]);

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="bg-[#0f2040] py-12 text-center">
        <Heart className="w-10 h-10 text-[#c9a84c] mx-auto mb-3" />
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('favorites.title')}</h1>
        <p className="text-white/70 text-sm">{t('favorites.subtitle')}</p>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {favIds.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('favorites.empty')}</h2>
            <p className="text-gray-500 mb-8">{t('favorites.emptyHint')}</p>
            <Link href="/search" className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8963f] text-[#0f2040] font-bold px-8 py-3 rounded-lg transition-colors">
              <Search className="w-5 h-5" />{t('favorites.browseCta')}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-6">{t('favorites.count', { n: favIds.length })}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(listings.length > 0 ? listings : favIds.map(id => MOCK_LISTINGS[id]).filter(Boolean) as Listing[]).map(l => (
                <div key={l.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className="relative h-48 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setLocation(`/property/${l.id}`)}>
                    <img src={l.media?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80'} alt={l.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80'; }} />
                    {l.featured && <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} bg-[#c9a84c] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1`}><Star className="w-3 h-3" />{t('prop.featured')}</div>}
                    <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} ${l.listingType === 'rent' ? 'bg-amber-500' : 'bg-[#0f2040]'} text-white text-xs font-bold px-2 py-1 rounded`}>
                      {l.listingType === 'rent' ? t('prop.forRent') : t('prop.forSale')}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-bold text-[#0f2040] text-lg mb-1">{l.price ? formatPrice(l.price, l.currency, isRtl) : (isRtl ? 'عند الطلب' : 'On request')}</div>
                    <div className="text-sm text-gray-700 truncate mb-2">{l.title}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin className="w-3 h-3" />{[l.district, l.city].filter(Boolean).join('، ')}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                      {l.bedrooms != null && <span>{t('prop.beds', { n: l.bedrooms })}</span>}
                      {l.bathrooms != null && <span>{t('prop.baths', { n: l.bathrooms })}</span>}
                      {l.areaSqm != null && <span>{t('prop.sqm', { n: l.areaSqm })}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setLocation(`/property/${l.id}`)} className="flex-1 bg-[#0f2040] hover:bg-[#1a3060] text-white text-xs font-semibold py-2 rounded-lg transition-colors">{t('prop.viewDetails')}</button>
                      <button onClick={() => remove(l.id)} className="p-2 border border-gray-200 rounded-lg text-red-400 hover:bg-red-50 hover:border-red-300 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
