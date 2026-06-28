import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, Users, Building2, MapPin, Star, ArrowLeft, ArrowRight, Heart, Hotel, Calendar, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

function PropertyCard({ listing }: { listing: Listing }) {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(() => {
    try { const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]'); return f.includes(listing.id); } catch { return false; }
  });
  const thumb = listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80';
  const price = listing.price ? formatPrice(listing.price, listing.currency || 'SAR', isRtl) : (isRtl ? 'السعر عند الطلب' : 'Price on request');
  const tag = listing.listingType === 'rent' ? t('prop.forRent') : t('prop.forSale');
  const tagBg = listing.listingType === 'rent' ? 'bg-amber-500' : 'bg-[#0f2040]';
  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]');
      const next = saved ? f.filter(id => id !== listing.id) : [...f, listing.id];
      localStorage.setItem('rozoz_favorites', JSON.stringify(next)); setSaved(!saved);
    } catch { /* ignore */ }
  }
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group" onClick={() => setLocation(`/property/${listing.id}`)}>
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <img src={thumb} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80'; }} />
        <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} ${tagBg} text-white text-xs font-bold px-2 py-1 rounded`}>{tag}</div>
        {listing.featured && <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} bg-[#c9a84c] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1`}><Star className="w-3 h-3" />{t('prop.featured')}</div>}
        <button onClick={toggleFav} className={`absolute bottom-3 ${isRtl ? 'left-3' : 'right-3'} w-8 h-8 rounded-full bg-white shadow flex items-center justify-center transition-colors ${saved ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-4">
        <div className="font-bold text-[#0f2040] text-lg mb-1">{price}</div>
        {listing.areaSqm && listing.price && <div className="text-xs text-gray-400 mb-2">{t('prop.pricePerSqm', { n: Math.round(listing.price / listing.areaSqm).toLocaleString() })}</div>}
        <div className="text-sm text-gray-700 font-medium truncate mb-2">{listing.title}</div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin className="w-3 h-3" /><span>{[listing.district, listing.city].filter(Boolean).join('، ')}</span></div>
        <div className="flex items-center gap-3 text-xs text-gray-600 border-t pt-3">
          {listing.bedrooms != null && <span>{t('prop.beds', { n: listing.bedrooms })}</span>}
          {listing.bathrooms != null && <span>{t('prop.baths', { n: listing.bathrooms })}</span>}
          {listing.areaSqm != null && <span>{t('prop.sqm', { n: listing.areaSqm.toLocaleString() })}</span>}
        </div>
      </div>
    </div>
  );
}

const CITIES = [
  { ar: 'الرياض', en: 'Riyadh', img: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=400&q=80', count: '1,200+' },
  { ar: 'جدة', en: 'Jeddah', img: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=400&q=80', count: '850+' },
  { ar: 'الدمام', en: 'Dammam', img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&q=80', count: '430+' },
  { ar: 'أبها', en: 'Abha', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', count: '210+' },
  { ar: 'مكة المكرمة', en: 'Makkah', img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&q=80', count: '320+' },
  { ar: 'المدينة المنورة', en: 'Madinah', img: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80', count: '180+' },
];

const HEAT_CITIES = [
  { ar: 'الرياض', en: 'Riyadh', score: 82 },
  { ar: 'جدة', en: 'Jeddah', score: 74 },
  { ar: 'الدمام', en: 'Dammam', score: 61 },
  { ar: 'أبها', en: 'Abha', score: 45 },
  { ar: 'نيوم', en: 'Neom', score: 95 },
  { ar: 'القصيم', en: 'Qassim', score: 38 },
];

function heatColor(score: number) {
  if (score >= 80) return { bg: 'bg-red-500', text: 'text-red-600' };
  if (score >= 60) return { bg: 'bg-orange-400', text: 'text-orange-500' };
  if (score >= 40) return { bg: 'bg-yellow-400', text: 'text-yellow-600' };
  return { bg: 'bg-blue-400', text: 'text-blue-600' };
}

const STATS = [
  { icon: Building2, valueAr: '٢٠,٠٠٠+', valueEn: '20,000+', key: 'listings' },
  { icon: MapPin, valueAr: '٣٠+', valueEn: '30+', key: 'cities' },
  { icon: TrendingUp, valueAr: '٨,٠٠٠+', valueEn: '8,000+', key: 'sold' },
  { icon: Users, valueAr: '١,٢٠٠+', valueEn: '1,200+', key: 'agents' },
];

const MOCK_LISTINGS: Listing[] = [
  { id: 101, title: 'فيلا فاخرة حي النرجس', price: 3500000, areaSqm: 450, bedrooms: 5, bathrooms: 4, city: 'الرياض', district: 'حي النرجس', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', caption: '' }], featured: true, currency: 'SAR' },
  { id: 102, title: 'شقة مميزة الملقا', price: 8500, areaSqm: 180, bedrooms: 3, bathrooms: 2, city: 'الرياض', district: 'الملقا', propertyType: 'apartment', listingType: 'rent', media: [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', caption: '' }], featured: false, currency: 'SAR' },
  { id: 103, title: 'دور كامل حي الياسمين', price: 4200000, areaSqm: 380, bedrooms: 6, bathrooms: 5, city: 'الرياض', district: 'الياسمين', propertyType: 'floor', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', caption: '' }], featured: true, currency: 'SAR' },
  { id: 104, title: 'شقة حديثة جدة كورنيش', price: 5500, areaSqm: 140, bedrooms: 2, bathrooms: 2, city: 'جدة', district: 'الكورنيش', propertyType: 'apartment', listingType: 'rent', media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', caption: '' }], featured: false, currency: 'SAR' },
  { id: 105, title: 'فيلا تاون هاوس الدمام', price: 1900000, areaSqm: 280, bedrooms: 4, bathrooms: 3, city: 'الدمام', district: 'العنود', propertyType: 'villa', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', caption: '' }], featured: false, currency: 'SAR' },
  { id: 106, title: 'أرض سكنية شمال الرياض', price: 2800000, areaSqm: 750, bedrooms: null, bathrooms: null, city: 'الرياض', district: 'شمال الرياض', propertyType: 'land', listingType: 'sale', media: [{ url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', caption: '' }], featured: false, currency: 'SAR' },
];

// ── Tourism Destinations ────────────────────────────────────────────────────────
const TOURISM_SPOTS = [
  { nameAr: 'الرياض',        nameEn: 'Riyadh',         lat: 24.7136, lng: 46.6753, hotels: 320, tag: 'العاصمة',  img: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=400&q=80' },
  { nameAr: 'جدة',           nameEn: 'Jeddah',          lat: 21.5433, lng: 39.1728, hotels: 280, tag: 'الكورنيش', img: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=400&q=80' },
  { nameAr: 'مكة المكرمة',   nameEn: 'Makkah',          lat: 21.3891, lng: 39.8579, hotels: 450, tag: 'الحرمين',  img: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&q=80' },
  { nameAr: 'المدينة المنورة',nameEn: 'Madinah',         lat: 24.4686, lng: 39.6142, hotels: 380, tag: 'الحرمين',  img: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&q=80' },
  { nameAr: 'العُلا',        nameEn: 'AlUla',            lat: 26.6202, lng: 37.9218, hotels: 45,  tag: 'التراث',   img: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&q=80' },
  { nameAr: 'أبها',          nameEn: 'Abha',             lat: 18.2164, lng: 42.5053, hotels: 90,  tag: 'الجبال',   img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
  { nameAr: 'نيوم',          nameEn: 'NEOM',             lat: 28.0339, lng: 35.1339, hotels: 30,  tag: 'المستقبل', img: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400&q=80' },
  { nameAr: 'الدرعية',       nameEn: 'Diriyah',          lat: 24.7342, lng: 46.5738, hotels: 25,  tag: 'التراث',   img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80' },
  { nameAr: 'الخبر',         nameEn: 'Khobar',           lat: 26.2172, lng: 50.1971, hotels: 110, tag: 'الخليج',   img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { nameAr: 'الدمام',        nameEn: 'Dammam',           lat: 26.4207, lng: 50.0888, hotels: 140, tag: 'الشرقية',  img: 'https://images.unsplash.com/photo-1565118531796-763e5082d113?w=400&q=80' },
  { nameAr: 'تبوك',          nameEn: 'Tabuk',            lat: 28.3998, lng: 36.5700, hotels: 65,  tag: 'الشمال',   img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80' },
  { nameAr: 'بريدة',         nameEn: 'Buraidah',         lat: 26.3260, lng: 43.9750, hotels: 55,  tag: 'القصيم',   img: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&q=80' },
  { nameAr: 'خميس مشيط',    nameEn: 'Khamis Mushait',   lat: 18.3063, lng: 42.7295, hotels: 70,  tag: 'عسير',     img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80' },
  { nameAr: 'جيزان',         nameEn: 'Jizan',            lat: 16.8892, lng: 42.5611, hotels: 40,  tag: 'الجنوب',   img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80' },
  { nameAr: 'نجران',         nameEn: 'Najran',           lat: 17.4930, lng: 44.1277, hotels: 35,  tag: 'الجنوب',   img: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&q=80' },
  { nameAr: 'الخرج',         nameEn: 'Alkharj',          lat: 24.1462, lng: 47.3282, hotels: 30,  tag: 'الوسط',    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80' },
  { nameAr: 'عنيزة',         nameEn: 'Unaizah',          lat: 26.0840, lng: 43.9940, hotels: 25,  tag: 'القصيم',   img: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80' },
  { nameAr: 'المجمعة',       nameEn: 'Majmaah',          lat: 25.9038, lng: 45.3437, hotels: 18,  tag: 'سدير',     img: 'https://images.unsplash.com/photo-1504198266287-1659872e6590?w=400&q=80' },
  { nameAr: 'شقراء',         nameEn: 'Shaqra',           lat: 25.2490, lng: 45.2530, hotels: 15,  tag: 'الوسط',    img: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80' },
  { nameAr: 'الخفجي',        nameEn: 'Khafji',           lat: 28.3340, lng: 48.4940, hotels: 22,  tag: 'الشمالية', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
];

function TourismMap({ isRtl }: { isRtl: boolean }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<typeof TOURISM_SPOTS[0] | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [23.8859, 45.0792],
      zoom: 5,
      zoomControl: true,
      preferCanvas: true,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
      updateWhenZooming: false,
      updateWhenIdle: true,
    } as L.TileLayerOptions).addTo(map);

    TOURISM_SPOTS.forEach(spot => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#0f2040;color:#c9a84c;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #c9a84c;font-family:sans-serif;">${spot.nameAr}</div>`,
        iconAnchor: [0, 0],
      });
      L.marker([spot.lat, spot.lng], { icon }).addTo(map)
        .on('click', () => { setActive(spot); map.flyTo([spot.lat, spot.lng], 8, { duration: 0.8 }); });
    });

    setTimeout(() => { map.invalidateSize(); }, 200);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl" style={{ height: 420 }}>
      <div ref={containerRef} className="w-full h-full" />
      {active && (
        <div className={`absolute bottom-4 ${isRtl ? 'right-4' : 'left-4'} z-[1000] bg-white rounded-xl shadow-lg p-3 flex gap-3 max-w-xs`}>
          <img src={active.img} alt={active.nameAr} className="w-20 h-20 object-cover rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-[#0f2040] text-sm">{isRtl ? active.nameAr : active.nameEn}</div>
            <div className="text-xs text-[#c9a84c] font-semibold mb-1">{active.tag}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1"><Hotel className="w-3 h-3" />{active.hotels}+ {isRtl ? 'فندق' : 'Hotels'}</div>
            <button onClick={() => setActive(null)} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600">✕ {isRtl ? 'إغلاق' : 'Close'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Home() {
  const { t, isRtl, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState<'sale' | 'rent' | 'tourism'>('sale');

  // ── Tourism search state ────────────────────────────────────────────────────
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [tourCity,    setTourCity]    = useState('');
  const [tourType,    setTourType]    = useState<'hotel' | 'apartment'>('hotel');
  const [tourCheckin,  setTourCheckin]  = useState(todayStr);
  const [tourCheckout, setTourCheckout] = useState(tomorrowStr);
  const [tourGuests,   setTourGuests]   = useState(2);
  const [tourSearched, setTourSearched] = useState(false);

  const { data: featuredData } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/listings?featured=true&limit=6&status=active'));
      const json = await res.json();
      return (json.data || []) as Listing[];
    },
    staleTime: 60_000,
  });

  const listings = featuredData && featuredData.length > 0 ? featuredData : MOCK_LISTINGS;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  function scrollToTourism() {
    const el = document.getElementById('tourism-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (activeTab === 'tourism') { scrollToTourism(); return; }
    const params = new URLSearchParams({ type: activeTab });
    if (searchQ) params.set('q', searchQ);
    setLocation(`/search?${params.toString()}`);
  }

  return (
    <div className="font-sans">
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1600&q=80)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2040]/80 via-[#0f2040]/70 to-[#0f2040]/90" />
        <div className="relative z-10 container mx-auto px-4 text-center py-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">{t('home.hero.title')}</h1>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">{t('home.hero.subtitle')}</p>
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex border-b border-gray-100">
              {(['sale', 'rent'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? 'text-[#0f2040] border-b-2 border-[#c9a84c] bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                >
                  {tab === 'sale' ? t('home.hero.tabBuy') : t('home.hero.tabRent')}
                </button>
              ))}
              {/* ── Tourism / Book Stay tab ─────────────────────────────────── */}
              <button
                onClick={() => { setActiveTab('tourism'); scrollToTourism(); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'tourism' ? 'text-[#0f2040] border-b-2 border-[#c9a84c] bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
              >
                {t('home.hero.tabTourism')}
              </button>
              <Link href="/sell" className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors text-center">
                {t('home.hero.tabSell')}
              </Link>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2 p-4">
              <MapPin className="w-5 h-5 text-[#c9a84c] shrink-0" />
              {activeTab === 'tourism' ? (
                <span className="flex-1 text-sm text-gray-400 select-none">
                  {isRtl ? 'استكشف الوجهات السياحية في المملكة ↓' : 'Explore Saudi tourism destinations ↓'}
                </span>
              ) : (
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder={t('home.hero.searchPlaceholder')}
                  className="flex-1 text-sm outline-none placeholder:text-gray-400 text-gray-800"
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
              )}
              <button
                type="submit"
                className="bg-[#c9a84c] hover:bg-[#b8963f] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" />
                {activeTab === 'tourism' ? (isRtl ? 'عرض' : 'View') : t('home.hero.searchBtn')}
              </button>
            </form>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {CITIES.slice(0, 6).map(c => (
              <button key={c.ar} onClick={() => setLocation(`/search?type=${activeTab}&city=${c.ar}`)} className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm rounded-full backdrop-blur transition-colors border border-white/20">
                {isRtl ? c.ar : c.en}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0f2040] py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.key} className="text-center">
                <s.icon className="w-6 h-6 text-[#c9a84c] mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{language === 'ar' ? s.valueAr : s.valueEn}</div>
                <div className="text-sm text-white/60 mt-1">{t(`home.stats.${s.key}`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Properties ───────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f2040]">{t('home.featured.title')}</h2>
              <p className="text-gray-500 mt-1 text-sm">{t('home.featured.subtitle')}</p>
            </div>
            <Link href="/search?type=sale" className="flex items-center gap-1 text-[#c9a84c] font-semibold text-sm hover:underline">
              {t('home.featured.viewAll')}<Arrow className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(l => <PropertyCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* ── Browse by City ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0f2040] text-center mb-10">{t('home.cities.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CITIES.map(c => (
              <button key={c.ar} onClick={() => setLocation(`/search?type=sale&city=${c.ar}`)} className="group relative rounded-xl overflow-hidden h-32 cursor-pointer">
                <img src={c.img} alt={c.en} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2040]/80 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3 text-center">
                  <div className="text-white font-bold text-sm">{isRtl ? c.ar : c.en}</div>
                  <div className="text-[#c9a84c] text-xs">{c.count}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Market Heat Index ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f2040]">{t('home.heat.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.heat.subtitle')}</p>
          </div>
          <div className="flex items-center justify-center gap-6 mb-8 flex-wrap text-sm text-gray-600">
            {[{ l: t('home.heat.cool'), c: 'bg-blue-400' }, { l: t('home.heat.warm'), c: 'bg-yellow-400' }, { l: t('home.heat.hot'), c: 'bg-orange-400' }, { l: t('home.heat.veryHot'), c: 'bg-red-500' }].map(i => (
              <div key={i.l} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${i.c}`} />{i.l}</div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {HEAT_CITIES.map(city => {
              const heat = heatColor(city.score);
              return (
                <button key={city.ar} onClick={() => setLocation(`/search?type=sale&city=${city.ar}`)} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow text-start border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-[#0f2040]">{isRtl ? city.ar : city.en}</span>
                    <span className={`w-4 h-4 rounded-full ${heat.bg}`} />
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full ${heat.bg}`} style={{ width: `${city.score}%` }} />
                  </div>
                  <div className={`text-xs font-bold ${heat.text}`}>{city.score}/100</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HousIn Estimate CTA ────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#0f2040]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
            <div className="w-48 h-48 rounded-full bg-white/5 border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-[#c9a84c] mx-auto mb-2" />
                <div className="text-white font-bold text-lg">HousIn</div>
                <div className="text-[#c9a84c] text-sm font-semibold">Estimate™</div>
              </div>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('home.estimate.title')}</h2>
              <p className="text-white/70 mb-6 leading-relaxed">{t('home.estimate.subtitle')}</p>
              <Link href="/sell" className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8963f] text-[#0f2040] font-bold px-6 py-3 rounded-lg transition-colors">
                {t('home.estimate.cta')}<Arrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tourism Map ───────────────────────────────────────────────────────── */}
      <section id="tourism-section" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className={`flex items-center gap-3 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-[#0f2040] flex items-center justify-center shrink-0">
              <Hotel className="w-5 h-5 text-[#c9a84c]" />
            </div>
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold text-[#0f2040] font-serif ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'للسياحة وحجز الفنادق' : 'Tourism & Hotel Booking'}
              </h2>
              <p className={`text-gray-500 text-sm mt-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'استكشف أبرز الوجهات السياحية في المملكة العربية السعودية' : 'Explore the top tourist destinations across Saudi Arabia'}
              </p>
            </div>
          </div>

          {/* ── Hotel / Stay search form ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
            {/* Type toggle */}
            <div className="flex gap-2 mb-4">
              {(['hotel', 'apartment'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTourType(type)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${tourType === type ? 'bg-[#0f2040] text-white border-[#0f2040]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#c9a84c]'}`}
                >
                  <Hotel className="w-3.5 h-3.5" />
                  {type === 'hotel' ? (isRtl ? 'فندق' : 'Hotel') : (isRtl ? 'شقة فندقية' : 'Apartment')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Destination */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1 font-medium">{isRtl ? 'الوجهة' : 'Destination'}</label>
                <div className="relative">
                  <MapPin className="absolute top-2.5 right-3 w-4 h-4 text-[#c9a84c]" style={{ left: isRtl ? 'auto' : 12, right: isRtl ? 12 : 'auto' }} />
                  <input
                    type="text"
                    value={tourCity}
                    onChange={e => setTourCity(e.target.value)}
                    placeholder={isRtl ? 'اختر المدينة أو الوجهة...' : 'City or destination...'}
                    className="w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#c9a84c] transition-colors"
                    style={{ paddingRight: isRtl ? 36 : 12, paddingLeft: isRtl ? 12 : 36 }}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    list="tour-city-list"
                  />
                  <datalist id="tour-city-list">
                    {TOURISM_SPOTS.map(s => <option key={s.nameAr} value={isRtl ? s.nameAr : s.nameEn} />)}
                  </datalist>
                </div>
              </div>

              {/* Check-in */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-medium">{isRtl ? 'تاريخ الوصول' : 'Check-in'}</label>
                <div className="relative">
                  <Calendar className="absolute top-2.5 w-4 h-4 text-gray-400 pointer-events-none" style={{ left: isRtl ? 'auto' : 10, right: isRtl ? 10 : 'auto' }} />
                  <input
                    type="date"
                    value={tourCheckin}
                    min={todayStr()}
                    onChange={e => setTourCheckin(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#c9a84c] transition-colors"
                    style={{ paddingRight: isRtl ? 36 : 10, paddingLeft: isRtl ? 10 : 36 }}
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-medium">{isRtl ? 'تاريخ المغادرة' : 'Check-out'}</label>
                <div className="relative">
                  <Calendar className="absolute top-2.5 w-4 h-4 text-gray-400 pointer-events-none" style={{ left: isRtl ? 'auto' : 10, right: isRtl ? 10 : 'auto' }} />
                  <input
                    type="date"
                    value={tourCheckout}
                    min={tourCheckin}
                    onChange={e => setTourCheckout(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#c9a84c] transition-colors"
                    style={{ paddingRight: isRtl ? 36 : 10, paddingLeft: isRtl ? 10 : 36 }}
                  />
                </div>
              </div>

              {/* Guests + Search */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1 font-medium">{isRtl ? 'الضيوف' : 'Guests'}</label>
                  <div className="relative">
                    <Users className="absolute top-2.5 w-4 h-4 text-gray-400 pointer-events-none" style={{ left: isRtl ? 'auto' : 10, right: isRtl ? 10 : 'auto' }} />
                    <select
                      value={tourGuests}
                      onChange={e => setTourGuests(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#c9a84c] transition-colors appearance-none bg-white"
                      style={{ paddingRight: isRtl ? 36 : 10, paddingLeft: isRtl ? 10 : 36 }}
                    >
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {isRtl ? (n===1?'ضيف':'ضيوف') : (n===1?'Guest':'Guests')}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="block text-xs text-transparent mb-1">_</label>
                  <button
                    onClick={() => setTourSearched(true)}
                    className="bg-[#c9a84c] hover:bg-[#b8963f] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    {isRtl ? 'بحث' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search result hint */}
            {tourSearched && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#0f2040] bg-[#c9a84c]/10 rounded-lg px-3 py-2">
                <Hotel className="w-4 h-4 text-[#c9a84c] shrink-0" />
                <span>
                  {isRtl
                    ? `${TOURISM_SPOTS.find(s=>s.nameAr===tourCity||s.nameEn===tourCity)?.hotels ?? '300'}+ ${tourType === 'hotel' ? 'فندق' : 'شقة فندقية'} متاح${tourCity ? ` في ${tourCity}` : ''} · ${tourGuests} ${tourGuests===1?'ضيف':'ضيوف'}`
                    : `${TOURISM_SPOTS.find(s=>s.nameAr===tourCity||s.nameEn===tourCity)?.hotels ?? '300'}+ ${tourType === 'hotel' ? 'hotels' : 'apartments'} available${tourCity ? ` in ${tourCity}` : ''} · ${tourGuests} ${tourGuests===1?'guest':'guests'}`
                  }
                </span>
                <button onClick={() => setTourSearched(false)} className="ms-auto text-gray-400 hover:text-gray-600">✕</button>
              </div>
            )}
          </div>

          {/* ── Destination thumbnails ─────────────────────────────────────── */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-1 min-w-max md:min-w-0 md:flex-wrap">
              {TOURISM_SPOTS.map(spot => (
                <div
                  key={spot.nameAr}
                  className="relative rounded-xl overflow-hidden w-28 h-20 shrink-0 cursor-pointer group"
                  onClick={() => { setTourCity(isRtl ? spot.nameAr : spot.nameEn); setTourSearched(true); }}
                >
                  <img src={spot.img} alt={spot.nameAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f2040]/80 to-transparent" />
                  <div className="absolute bottom-1.5 inset-x-0 text-center text-white text-xs font-bold">{isRtl ? spot.nameAr : spot.nameEn}</div>
                </div>
              ))}
            </div>
          </div>

          <TourismMap isRtl={isRtl} />

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOURISM_SPOTS.slice(0, 4).map(spot => (
              <div key={spot.nameAr} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <Hotel className="w-5 h-5 text-[#c9a84c] shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-[#0f2040] text-sm truncate">{isRtl ? spot.nameAr : spot.nameEn}</div>
                  <div className="text-xs text-gray-500">{spot.hotels}+ {isRtl ? 'فندق' : 'hotels'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Find Agent ────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0f2040] mb-4">{t('home.agents.title')}</h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">{t('home.agents.subtitle')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/agents" className="inline-flex items-center justify-center gap-2 bg-[#0f2040] hover:bg-[#1a3060] text-white font-bold px-8 py-3.5 rounded-lg transition-colors">
              <Users className="w-5 h-5" />{t('home.agents.cta')}
            </Link>
            <Link href="/financing" className="inline-flex items-center justify-center gap-2 border-2 border-[#0f2040] text-[#0f2040] hover:bg-[#0f2040] hover:text-white font-bold px-8 py-3.5 rounded-lg transition-colors">
              {t('nav.financing')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
