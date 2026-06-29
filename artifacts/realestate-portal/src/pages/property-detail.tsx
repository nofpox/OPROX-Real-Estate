import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin, Bed, Bath, Square, ArrowLeft, ArrowRight,
  Heart, Share2, Eye, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Send, CheckCircle, Loader2, Star, Copy, Phone
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Listing {
  id: number; title: string; description: string | null; price: number | null; areaSqm: number | null;
  bedrooms: number | null; bathrooms: number | null; floor: number | null;
  city: string | null; district: string | null; address: string | null;
  propertyType: string | null; listingType: string; currency: string;
  media: { url: string; caption: string }[]; amenities: string[];
  featured: boolean; viewCount: number; lat: number | null; lng: number | null;
  contactEmail: string | null; contactPhone: string | null; createdAt: string;
}

function apiUrl(path: string) { return `/realestate-api${path}`; }

function formatPrice(price: number, currency: string, isRtl: boolean): string {
  const c = currency === 'SAR' ? (isRtl ? 'ر.س' : 'SAR') : currency;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(2)}M ${c}`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K ${c}`;
  return `${price.toLocaleString()} ${c}`;
}

function formatDate(dateStr: string, isRtl: boolean): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

// ── Property type labels ───────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  apartment: { ar: 'شقة', en: 'Apartment' }, villa: { ar: 'فيلا', en: 'Villa' },
  floor: { ar: 'دور', en: 'Floor' }, land: { ar: 'أرض', en: 'Land' },
  compound: { ar: 'مجمع', en: 'Compound' }, chalet: { ar: 'استراحة', en: 'Chalet' },
  hotel: { ar: 'فندق', en: 'Hotel' }, office: { ar: 'مكتب', en: 'Office' },
  commercial: { ar: 'تجاري', en: 'Commercial' },
};

// ── Housin Estimate Widget ─────────────────────────────────────────────────────
function RozozEstimate({ price, areaSqm, city }: { price: number | null; areaSqm: number | null; city: string | null }) {
  const { t, isRtl } = useLanguage();
  if (!price) return null;

  // Simulate estimate: ±8% variance + market noise
  const seed = (city?.length || 5) + (areaSqm || 200);
  const variance = 0.06 + (seed % 5) * 0.01;
  const low = Math.round(price * (1 - variance));
  const high = Math.round(price * (1 + variance));
  const pricePerSqm = areaSqm ? Math.round(price / areaSqm) : null;
  const trend = seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'flat' : 'down';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const confidence = seed % 3 === 0 ? 'high' : 'medium';

  const fmt = (n: number) => formatPrice(n, 'SAR', isRtl);

  return (
    <div className="bg-gradient-to-br from-[#0f2040] to-[#1a3060] rounded-xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#c9a84c]" />
        <div>
          <div className="font-bold text-sm">{t('estimate.title')}</div>
          <div className="text-xs text-white/60">{t('estimate.subtitle')}</div>
        </div>
      </div>
      <div className="text-2xl font-bold text-[#c9a84c] mb-1">{fmt(price)}</div>
      <div className="text-xs text-white/60 mb-4">{t('estimate.range')}: {fmt(low)} – {fmt(high)}</div>
      <div className="grid grid-cols-2 gap-3">
        {pricePerSqm && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-white/60 mb-1">{t('estimate.pricePerSqm')}</div>
            <div className="font-bold text-sm">{isRtl ? `${pricePerSqm.toLocaleString()} ر.س/م²` : `SAR ${pricePerSqm.toLocaleString()}/m²`}</div>
          </div>
        )}
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-xs text-white/60 mb-1">{t('estimate.marketTrend')}</div>
          <div className={`font-bold text-sm flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {t(`estimate.trending.${trend}`)}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 col-span-2">
          <div className="text-xs text-white/60 mb-1">{t('estimate.confidence')}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full">
              <div className={`h-1.5 rounded-full ${confidence === 'high' ? 'bg-green-400 w-4/5' : 'bg-yellow-400 w-3/5'}`} />
            </div>
            <span className="text-xs font-semibold">{t(`estimate.${confidence}`)}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-white/40 mt-3 leading-relaxed">{t('estimate.disclaimer')}</p>
    </div>
  );
}

// ── Location Map ──────────────────────────────────────────────────────────────
function LocationMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [lat, lng], zoom: 15, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#c9a84c;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconAnchor: [10, 10],
    });
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(title);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, title]);
  return <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden" />;
}

// ── Amenity icons ──────────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, string> = {
  pool: '🏊', gym: '🏋️', parking: '🚗', elevator: '🛗', garden: '🌳',
  security: '🛡️', balcony: '🌿', maid: '🧹', store: '🏪', mosque: '🕌',
  ac: '❄️', heating: '🔥', internet: '📶', furnished: '🛋️',
};

// ── Mock listing for fallback ─────────────────────────────────────────────────
const MOCK: Listing = {
  id: 101, title: 'فيلا فاخرة حي النرجس', description: 'فيلا راقية في أرقى أحياء الرياض، تتميز بتصميم عصري ومساحات واسعة وحديقة خاصة. تقع في موقع استراتيجي قريب من المدارس والمراكز التجارية.',
  price: 3500000, areaSqm: 450, bedrooms: 5, bathrooms: 4, floor: null,
  city: 'الرياض', district: 'حي النرجس', address: 'حي النرجس، شمال الرياض', propertyType: 'villa',
  listingType: 'sale', currency: 'SAR',
  media: [
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80', caption: '' },
    { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80', caption: '' },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80', caption: '' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80', caption: '' },
  ],
  amenities: ['pool', 'gym', 'parking', 'garden', 'security', 'ac', 'furnished'],
  featured: true, viewCount: 842, lat: 24.7747, lng: 46.7386,
  contactEmail: 'agent@rozoz.com', contactPhone: '+966500000000', createdAt: '2025-01-15T00:00:00.000Z',
};

// ── Property Detail Page ───────────────────────────────────────────────────────
export function PropertyDetail() {
  const { t, isRtl, language } = useLanguage();
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const id = params?.id ? parseInt(params.id) : null;
  // Mock IDs 101-108 are local demo data — skip API call
  const isMockId = id !== null && id >= 101 && id <= 108;

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(apiUrl(`/listings/${id}`));
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as Listing;
    },
    enabled: !!id && !isMockId,
  });

  const listing: Listing = data || MOCK;

  useEffect(() => {
    try {
      const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]');
      setSaved(f.includes(listing.id));
    } catch { /* ignore */ }
  }, [listing.id]);

  // ── Swipe-right-to-go-back gesture ─────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      // Only trigger on a clear rightward swipe (RTL: leftward)
      const threshold = 80;
      if (isRtl ? dx < -threshold : dx > threshold) {
        if (dy < 60) setLocation('/search');
      }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRtl, setLocation]);

  function toggleFav() {
    try {
      const f: number[] = JSON.parse(localStorage.getItem('rozoz_favorites') || '[]');
      const next = saved ? f.filter(id => id !== listing.id) : [...f, listing.id];
      localStorage.setItem('rozoz_favorites', JSON.stringify(next)); setSaved(!saved);
    } catch { /* ignore */ }
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault(); setSending(true);
    await fetch(`/realestate-api/listings/inquiry`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, ...form, tenantId: 1 }),
    }).catch(() => {});
    setSent(true); setSending(false);
  }

  const media = listing.media?.length ? listing.media : [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80', caption: '' }];
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const PrevArrow = isRtl ? ChevronRight : ChevronLeft;
  const NextArrow = isRtl ? ChevronLeft : ChevronRight;

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-[#c9a84c]" /></div>;
  }

  return (
    <div className="font-sans">
      {/* ── Floating X close button (mobile-first, always visible) ───────────── */}
      <button
        onClick={() => setLocation('/search')}
        aria-label={isRtl ? 'إغلاق' : 'Close'}
        className="fixed z-50 top-20 md:top-24 right-4 md:right-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-xl active:scale-95 transition-all duration-150"
        style={{ direction: 'ltr' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* ── Back nav ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 py-2 px-4">
        <div className="container mx-auto flex items-center gap-4">
          <button onClick={() => setLocation('/search')} className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#c9a84c] transition-colors">
            <BackArrow className="w-4 h-4" />{t('common.back')}
          </button>
          <div className="text-xs text-gray-400 hidden md:flex items-center gap-1">
            <Link href="/" className="hover:text-[#c9a84c]">{isRtl ? 'الرئيسية' : 'Home'}</Link>
            <span>/</span>
            <Link href="/search" className="hover:text-[#c9a84c]">{isRtl ? 'البحث' : 'Search'}</Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-48">{listing.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: main content ────────────────────────────────────────── */}
          <div className="lg:col-span-2">

            {/* Image gallery */}
            <div className="relative rounded-xl overflow-hidden bg-gray-100 mb-6" style={{ height: 420 }}>
              <img src={media[imgIdx]?.url} alt={listing.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80'; }} />
              {/* Nav arrows */}
              {media.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + media.length) % media.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
                    <PrevArrow className="w-5 h-5" />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % media.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
                    <NextArrow className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {media.map((_, i) => <span key={i} className={`w-2 h-2 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />)}
                  </div>
                </>
              )}
              {listing.featured && (
                <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} bg-[#c9a84c] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1`}><Star className="w-3 h-3" />{t('prop.featured')}</div>
              )}
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {media.map((m, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imgIdx ? 'border-[#c9a84c]' : 'border-transparent hover:border-gray-300'}`}>
                    <img src={m.url} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&q=60'; }} />
                  </button>
                ))}
              </div>
            )}

            {/* Title & price row */}
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#0f2040] mb-2">{listing.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 text-[#c9a84c]" />
                  {[listing.district, listing.city].filter(Boolean).join('، ')}
                </div>
              </div>
              <div className={`text-end`}>
                <div className="text-3xl font-bold text-[#0f2040]">
                  {listing.price ? formatPrice(listing.price, listing.currency, isRtl) : (isRtl ? 'السعر عند الطلب' : 'Price on request')}
                </div>
                {listing.areaSqm && listing.price && (
                  <div className="text-sm text-gray-400">{isRtl ? `${Math.round(listing.price / listing.areaSqm).toLocaleString()} ر.س/م²` : `SAR ${Math.round(listing.price / listing.areaSqm).toLocaleString()}/m²`}</div>
                )}
                <div className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold ${listing.listingType === 'rent' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {listing.listingType === 'rent' ? t('prop.forRent') : t('prop.forSale')}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <button onClick={toggleFav} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${saved ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-400'}`}>
                <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? t('prop.removeFavorite') : t('prop.addFavorite')}
              </button>
              <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#c9a84c] transition-colors">
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
              <div className="flex items-center gap-1 text-xs text-gray-400 ms-auto">
                <Eye className="w-3.5 h-3.5" />{t('detail.views', { n: listing.viewCount })}
              </div>
            </div>

            {/* Property facts */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <h2 className="font-bold text-[#0f2040] mb-4">{t('detail.facts')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {listing.bedrooms != null && (
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                    <Bed className="w-5 h-5 text-[#c9a84c] mx-auto mb-1" />
                    <div className="font-bold text-[#0f2040]">{listing.bedrooms}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'غرف النوم' : 'Bedrooms'}</div>
                  </div>
                )}
                {listing.bathrooms != null && (
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                    <Bath className="w-5 h-5 text-[#c9a84c] mx-auto mb-1" />
                    <div className="font-bold text-[#0f2040]">{listing.bathrooms}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'دورات المياه' : 'Bathrooms'}</div>
                  </div>
                )}
                {listing.areaSqm != null && (
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                    <Square className="w-5 h-5 text-[#c9a84c] mx-auto mb-1" />
                    <div className="font-bold text-[#0f2040]">{listing.areaSqm.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'م²' : 'm²'}</div>
                  </div>
                )}
                {listing.floor != null && (
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                    <div className="font-bold text-[#c9a84c] text-lg mx-auto mb-1">{listing.floor}</div>
                    <div className="font-bold text-[#0f2040]">{listing.floor}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'الدور' : 'Floor'}</div>
                  </div>
                )}
                <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-lg mb-1">🏠</div>
                  <div className="font-bold text-[#0f2040] text-sm">
                    {language === 'ar' ? (TYPE_LABELS[listing.propertyType || '']?.ar || listing.propertyType) : (TYPE_LABELS[listing.propertyType || '']?.en || listing.propertyType)}
                  </div>
                  <div className="text-xs text-gray-500">{isRtl ? 'نوع العقار' : 'Type'}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mb-6">
                <h2 className="font-bold text-[#0f2040] mb-3">{t('detail.overview')}</h2>
                <p className="text-gray-600 leading-relaxed text-sm">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold text-[#0f2040] mb-3">{t('detail.amenities')}</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map(a => (
                    <span key={a} className="flex items-center gap-1.5 bg-[#c9a84c]/10 text-[#0f2040] px-3 py-1.5 rounded-full text-sm border border-[#c9a84c]/20">
                      {AMENITY_ICONS[a] && <span>{AMENITY_ICONS[a]}</span>}
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location map */}
            {listing.lat && listing.lng && (
              <div className="mb-6">
                <h2 className="font-bold text-[#0f2040] mb-3">{t('detail.location')}</h2>
                <LocationMap lat={listing.lat} lng={listing.lng} title={listing.title} />
              </div>
            )}
          </div>

          {/* ── Right: sidebar ───────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            {/* Housin Estimate */}
            <RozozEstimate price={listing.price} areaSqm={listing.areaSqm} city={listing.city} />

            {/* Contact form */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-[#0f2040] mb-4">{t('detail.contact.title')}</h3>
              {sent ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">{t('detail.contact.success')}</p>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-3">
                  {[
                    { key: 'name', label: t('detail.contact.name'), type: 'text' },
                    { key: 'email', label: t('detail.contact.email'), type: 'email' },
                    { key: 'phone', label: t('detail.contact.phone'), type: 'tel' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('detail.contact.message')}</label>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t('detail.contact.messagePlaceholder')} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] resize-none transition-colors" />
                  </div>
                  <button type="submit" disabled={sending} className="w-full bg-[#c9a84c] hover:bg-[#b8963f] disabled:opacity-60 text-[#0f2040] font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? t('detail.contact.sending') : t('detail.contact.send')}
                  </button>
                </form>
              )}
              {listing.contactPhone && (
                <a href={`tel:${listing.contactPhone}`} className="mt-3 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-[#0f2040] hover:border-[#c9a84c] transition-colors">
                  <Phone className="w-4 h-4 text-[#c9a84c]" />{listing.contactPhone}
                </a>
              )}
            </div>

            {/* Listed date */}
            <div className="text-xs text-gray-400 text-center">
              {t('detail.listed')}: {formatDate(listing.createdAt, isRtl)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
