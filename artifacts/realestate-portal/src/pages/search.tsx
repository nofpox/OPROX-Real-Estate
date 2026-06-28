import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, MapPin, Heart, List, Map as MapIcon,
  Star, X, ChevronDown, Loader2, Save
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Listing {
  id: number; title: string; price: number | null; areaSqm: number | null;
  bedrooms: number | null; bathrooms: number | null; city: string | null;
  district: string | null; propertyType: string | null; listingType: string;
  media: { url: string; caption: string }[]; featured: boolean; currency: string;
  lat: number | null; lng: number | null;
}

function apiUrl(path: string) { return `/realestate-api${path}`; }

function formatPrice(price: number, currency: string, isRtl: boolean): string {
  const c = currency === 'SAR' ? (isRtl ? 'ر.س' : 'SAR') : currency;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M ${c}`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K ${c}`;
  return `${price.toLocaleString()} ${c}`;
}

// ── Mock listings for demo ─────────────────────────────────────────────────────
const MOCK_LISTINGS: Listing[] = [
  { id: 101, title: 'فيلا فاخرة حي النرجس', price: 3500000, areaSqm: 450, bedrooms: 5, bathrooms: 4, city: 'الرياض', district: 'حي النرجس', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', caption: '' }], featured: true, currency: 'SAR', lat: 24.7747, lng: 46.7386 },
  { id: 102, title: 'شقة مميزة الملقا', price: 8500, areaSqm: 180, bedrooms: 3, bathrooms: 2, city: 'الرياض', district: 'الملقا', propertyType: 'apartment', listingType: 'rent', media: [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', caption: '' }], featured: false, currency: 'SAR', lat: 24.8012, lng: 46.6419 },
  { id: 103, title: 'دور كامل حي الياسمين', price: 4200000, areaSqm: 380, bedrooms: 6, bathrooms: 5, city: 'الرياض', district: 'الياسمين', propertyType: 'floor', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', caption: '' }], featured: true, currency: 'SAR', lat: 24.8235, lng: 46.7134 },
  { id: 104, title: 'شقة حديثة جدة كورنيش', price: 5500, areaSqm: 140, bedrooms: 2, bathrooms: 2, city: 'جدة', district: 'الكورنيش', propertyType: 'apartment', listingType: 'rent', media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', caption: '' }], featured: false, currency: 'SAR', lat: 21.5433, lng: 39.1728 },
  { id: 105, title: 'فيلا تاون هاوس الدمام', price: 1900000, areaSqm: 280, bedrooms: 4, bathrooms: 3, city: 'الدمام', district: 'العنود', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', caption: '' }], featured: false, currency: 'SAR', lat: 26.4207, lng: 50.0888 },
  { id: 106, title: 'أرض سكنية شمال الرياض', price: 2800000, areaSqm: 750, bedrooms: null, bathrooms: null, city: 'الرياض', district: 'شمال الرياض', propertyType: 'land', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', caption: '' }], featured: false, currency: 'SAR', lat: 24.8553, lng: 46.7252 },
  { id: 107, title: 'شقة استثمارية وسط الرياض', price: 950000, areaSqm: 120, bedrooms: 2, bathrooms: 1, city: 'الرياض', district: 'وسط الرياض', propertyType: 'apartment', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80', caption: '' }], featured: false, currency: 'SAR', lat: 24.6877, lng: 46.7219 },
  { id: 108, title: 'فيلا مجمع الورود جدة', price: 2600000, areaSqm: 320, bedrooms: 4, bathrooms: 3, city: 'جدة', district: 'حي الورود', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80', caption: '' }], featured: true, currency: 'SAR', lat: 21.6190, lng: 39.1100 },
];

// ── Leaflet Map with Price Bubbles ─────────────────────────────────────────────
function PriceMap({ listings, selectedId, onSelect, visible }: {
  listings: Listing[]; selectedId: number | null; onSelect: (id: number) => void; visible: boolean;
}) {
  const { isRtl } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [24.7136, 46.6753],
      zoom: 10,
      zoomControl: true,
      preferCanvas: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      updateWhenZooming: false,
      updateWhenIdle: true,
    } as L.TileLayerOptions).addTo(map);
    mapRef.current = map;
    setTimeout(() => { map.invalidateSize(); }, 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (visible && mapRef.current) {
      setTimeout(() => { mapRef.current?.invalidateSize(); }, 50);
    }
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    listings.forEach(l => {
      if (!l.lat || !l.lng) return;
      const isSelected = l.id === selectedId;
      const price = l.price ? formatPrice(l.price, l.currency, isRtl) : '?';
      const color = isSelected ? '#c9a84c' : (l.listingType === 'rent' ? '#f59e0b' : '#0f2040');
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid ${isSelected ? '#fff' : color};transform:${isSelected ? 'scale(1.1)' : 'scale(1)'};">${price}</div>`,
        iconAnchor: [0, 0],
      });
      const marker = L.marker([l.lat, l.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect(l.id));
      markersRef.current.push(marker);
    });
  }, [listings, selectedId, isRtl]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ── Property Card (compact) ────────────────────────────────────────────────────
function ListingCard({ listing, selected, onClick }: { listing: Listing; selected: boolean; onClick: () => void }) {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(() => {
    try { const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]'); return f.includes(listing.id); } catch { return false; }
  });
  const thumb = listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80';
  const price = listing.price ? formatPrice(listing.price, listing.currency, isRtl) : (isRtl ? 'عند الطلب' : 'On request');
  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]');
      localStorage.setItem('rozoz_favorites', JSON.stringify(saved ? f.filter(id => id !== listing.id) : [...f, listing.id]));
      setSaved(!saved);
    } catch { /* ignore */ }
  }
  return (
    <div className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer flex gap-0 ${selected ? 'border-[#c9a84c] shadow-md ring-1 ring-[#c9a84c]' : 'border-gray-100 shadow-sm hover:shadow-md'}`} onClick={onClick}>
      <div className="relative w-36 sm:w-44 shrink-0 h-32">
        <img src={thumb} alt={listing.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80'; }} />
        {listing.featured && <div className="absolute top-2 left-2 bg-[#c9a84c] text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /></div>}
      </div>
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-[#0f2040] text-sm">{price}</div>
          <button onClick={toggleFav} className={`shrink-0 ${saved ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}><Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} /></button>
        </div>
        <div className="text-xs text-gray-700 truncate mt-0.5 mb-1">{listing.title}</div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2"><MapPin className="w-2.5 h-2.5" />{[listing.district, listing.city].filter(Boolean).join('، ')}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          {listing.bedrooms != null && <span>{t('prop.beds', { n: listing.bedrooms })}</span>}
          {listing.bathrooms != null && <span>{t('prop.baths', { n: listing.bathrooms })}</span>}
          {listing.areaSqm != null && <span>{t('prop.sqm', { n: listing.areaSqm })}</span>}
        </div>
        <button onClick={e => { e.stopPropagation(); setLocation(`/property/${listing.id}`); }} className="text-xs text-[#c9a84c] hover:underline font-semibold">
          {t('prop.viewDetails')}
        </button>
      </div>
    </div>
  );
}

// ── Filters Bar ────────────────────────────────────────────────────────────────
function FiltersBar({ filters, onChange }: {
  filters: { type: string; propertyType: string; minPrice: string; maxPrice: string; bedrooms: string; city: string; q: string };
  onChange: (k: string, v: string) => void;
}) {
  const { t, isRtl } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  const TYPES_AR = [['', 'جميع الأنواع'], ['apartment', 'شقة'], ['villa', 'فيلا'], ['floor', 'دور'], ['land', 'أرض'], ['chalet', 'استراحة']];
  const TYPES_EN = [['', 'All Types'], ['apartment', 'Apartment'], ['villa', 'Villa'], ['floor', 'Floor'], ['land', 'Land'], ['chalet', 'Chalet']];
  const TYPES = isRtl ? TYPES_AR : TYPES_EN;
  return (
    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Listing type toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
            {[['sale', t('filter.forSale')], ['rent', t('filter.forRent')]].map(([v, l]) => (
              <button key={v} onClick={() => onChange('type', v)} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${filters.type === v ? 'bg-[#0f2040] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-32">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'} w-3.5 h-3.5 text-gray-400`} />
            <input value={filters.q} onChange={e => onChange('q', e.target.value)} placeholder={isRtl ? 'ابحث...' : 'Search...'} className={`w-full border border-gray-200 rounded-lg py-1.5 text-xs outline-none focus:border-[#c9a84c] ${isRtl ? 'pr-7 pl-3' : 'pl-7 pr-3'}`} />
          </div>

          {/* City */}
          <select value={filters.city} onChange={e => onChange('city', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#c9a84c] bg-white">
            <option value="">{t('filter.anyCity')}</option>
            {['الرياض', 'جدة', 'الدمام', 'أبها', 'مكة المكرمة', 'المدينة المنورة'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Property type */}
          <select value={filters.propertyType} onChange={e => onChange('propertyType', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#c9a84c] bg-white">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {/* More filters toggle */}
          <button onClick={() => setShowMore(v => !v)} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:border-[#c9a84c] transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />{t('filter.moreFilters')}
            <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear */}
          {(filters.propertyType || filters.city || filters.q || filters.minPrice || filters.maxPrice || filters.bedrooms) && (
            <button onClick={() => { onChange('propertyType', ''); onChange('city', ''); onChange('q', ''); onChange('minPrice', ''); onChange('maxPrice', ''); onChange('bedrooms', ''); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
              <X className="w-3.5 h-3.5" />{t('filter.clearAll')}
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showMore && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('filter.price')}:</span>
              <input type="number" value={filters.minPrice} onChange={e => onChange('minPrice', e.target.value)} placeholder={t('filter.minPrice')} className="border border-gray-200 rounded px-2 py-1 text-xs w-24 outline-none focus:border-[#c9a84c]" />
              <span className="text-gray-300">—</span>
              <input type="number" value={filters.maxPrice} onChange={e => onChange('maxPrice', e.target.value)} placeholder={t('filter.maxPrice')} className="border border-gray-200 rounded px-2 py-1 text-xs w-24 outline-none focus:border-[#c9a84c]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('filter.beds')}:</span>
              {['', '1', '2', '3', '4', '5+'].map(n => (
                <button key={n} onClick={() => onChange('bedrooms', n)} className={`px-2 py-1 text-xs rounded border transition-colors ${filters.bedrooms === n ? 'bg-[#0f2040] text-white border-[#0f2040]' : 'border-gray-200 hover:border-[#c9a84c]'}`}>
                  {n || t('filter.any')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Search Page ────────────────────────────────────────────────────────────────
export function SearchPage() {
  const { t, isRtl } = useLanguage();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  function parseQS() {
    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('type') || 'sale',
      propertyType: params.get('propertyType') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      bedrooms: params.get('bedrooms') || '',
      city: params.get('city') || '',
      q: params.get('q') || '',
    };
  }

  const [filters, setFilters] = useState(parseQS);

  useEffect(() => {
    const qs = parseQS();
    setFilters(qs);
  }, [location]);

  function handleFilterChange(k: string, v: string) {
    const next = { ...filters, [k]: v };
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, val]) => { if (val) params.set(key, val); });
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  const queryParams = new URLSearchParams();
  if (filters.type !== 'sale' && filters.type !== 'rent') {} else queryParams.set('type', filters.type);
  if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);
  if (filters.minPrice) queryParams.set('minPrice', filters.minPrice);
  if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice);
  if (filters.city) queryParams.set('city', filters.city);
  if (filters.q) queryParams.set('q', filters.q);
  queryParams.set('status', 'active');
  queryParams.set('limit', '50');

  const { data, isLoading } = useQuery({
    queryKey: ['listings-search', filters],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/listings?${queryParams.toString()}`));
      const json = await res.json();
      return (json.data || []) as Listing[];
    },
    staleTime: 30_000,
  });

  // Filter mock data client-side for demo
  const filteredMock = MOCK_LISTINGS.filter(l => {
    if (filters.type && l.listingType !== filters.type) return false;
    if (filters.city && !l.city?.includes(filters.city)) return false;
    if (filters.propertyType && l.propertyType !== filters.propertyType) return false;
    if (filters.q && !l.title.includes(filters.q) && !l.city?.includes(filters.q) && !l.district?.includes(filters.q)) return false;
    if (filters.minPrice && l.price && l.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && l.price && l.price > Number(filters.maxPrice)) return false;
    if (filters.bedrooms && filters.bedrooms !== '' && l.bedrooms !== null) {
      const b = filters.bedrooms === '5+' ? 5 : Number(filters.bedrooms);
      if (filters.bedrooms === '5+' && l.bedrooms < 5) return false;
      else if (filters.bedrooms !== '5+' && l.bedrooms !== b) return false;
    }
    return true;
  });

  const listings = data && data.length > 0 ? data : filteredMock;

  function saveSearch() {
    const saved = JSON.parse(localStorage.getItem('rozoz_saved_searches') || '[]');
    saved.push({ ...filters, savedAt: Date.now(), name: filters.city || filters.q || (isRtl ? 'بحث محفوظ' : 'Saved Search') });
    localStorage.setItem('rozoz_saved_searches', JSON.stringify(saved));
    setSaveMsg(t('search.searchSaved'));
    setTimeout(() => setSaveMsg(''), 3000);
  }

  return (
    <div className="font-sans flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* Filters bar */}
      <FiltersBar filters={filters} onChange={handleFilterChange} />

      {/* Results header */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            {isLoading ? <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('search.loading')}</span>
              : <span>{t('search.results', { count: listings.length })}</span>}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg ? <span className="text-xs text-green-600 font-medium">{saveMsg}</span>
              : <button onClick={saveSearch} className="text-xs text-[#0f2040] hover:text-[#c9a84c] flex items-center gap-1 transition-colors"><Save className="w-3.5 h-3.5" />{t('search.saveSearch')}</button>}
            {/* View toggle (mobile) */}
            <div className="flex md:hidden items-center rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setView('list')} className={`px-2 py-1.5 text-xs flex items-center gap-1 ${view === 'list' ? 'bg-[#0f2040] text-white' : 'text-gray-500'}`}><List className="w-3.5 h-3.5" />{t('search.listView')}</button>
              <button onClick={() => setView('map')} className={`px-2 py-1.5 text-xs flex items-center gap-1 ${view === 'map' ? 'bg-[#0f2040] text-white' : 'text-gray-500'}`}><MapIcon className="w-3.5 h-3.5" />{t('search.mapView')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Listings list */}
        <div className={`${view === 'map' ? 'hidden md:flex' : 'flex'} md:flex flex-col w-full md:w-[420px] lg:w-[480px] shrink-0 overflow-y-auto bg-gray-50`}>
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" /></div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="font-semibold text-gray-700 mb-1">{t('search.noResults')}</div>
                <div className="text-sm text-gray-500">{t('search.noResultsHint')}</div>
              </div>
            ) : listings.map(l => (
              <ListingCard key={l.id} listing={l} selected={l.id === selectedId} onClick={() => setLocation(`/property/${l.id}`)} />
            ))}
          </div>
        </div>

        {/* Map */}
        <div className={`${view === 'list' ? 'hidden md:block' : 'block'} flex-1 relative`}>
          <PriceMap listings={listings} selectedId={selectedId} onSelect={id => setSelectedId(id === selectedId ? null : id)} visible={view === 'map'} />
        </div>
      </div>
    </div>
  );
}
