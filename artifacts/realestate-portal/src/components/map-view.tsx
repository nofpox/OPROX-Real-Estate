import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, AlertCircle, Loader2, Map } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaItem { url: string; caption: string; }

interface Listing {
  id: number;
  title: string;
  lat: number | null;
  lng: number | null;
  price: number | null;
  currency: string | null;
  media: MediaItem[];
  district: string | null;
  city: string | null;
  propertyType: string | null;
  listingType: string;
  bedrooms: number | null;
  areaSqm: number | null;
}

export interface MapFilters {
  q: string;
  propertyType: string;
  type: string;
}

export interface MapViewProps {
  open: boolean;
  onClose: () => void;
  filters: MapFilters;
  isRtl?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string | null): string {
  const c = currency ?? 'SAR';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M ${c}`;
  if (price >= 1_000)     return `${Math.round(price / 1_000)}K ${c}`;
  return `${price} ${c}`;
}

function createPriceMarker(price: number | null, currency: string | null): L.DivIcon {
  const label = price ? formatPrice(price, currency) : '—';
  return L.divIcon({
    className: '',
    html: `<div style="
      background: #0f172a;
      color: #fff;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      border: 2.5px solid #fff;
      cursor: pointer;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1;
      transition: transform 0.1s;
    ">${label}</div>`,
    iconSize: [110, 30],
    iconAnchor: [55, 15],
    popupAnchor: [0, -22],
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BoundsController({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true });
  }, [map, points]);
  return null;
}

function ListingPopup({ listing, isRtl }: { listing: Listing; isRtl?: boolean }) {
  const hasImage = listing.media?.[0]?.url;
  const location = [listing.district, listing.city].filter(Boolean).join(', ');
  const href = `/realestate/listings/${listing.id}`;

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        width: 220,
        padding: 0,
        margin: 0,
      }}
    >
      {hasImage && (
        <div
          style={{
            margin: '-8px -14px 10px',
            overflow: 'hidden',
            borderRadius: '6px 6px 0 0',
            height: 130,
          }}
        >
          <img
            src={listing.media[0].url}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Badge row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {listing.listingType && (
          <span style={{
            background: listing.listingType === 'sale' ? '#dbeafe' : listing.listingType === 'rent' ? '#dcfce7' : '#fef3c7',
            color:       listing.listingType === 'sale' ? '#1d4ed8' : listing.listingType === 'rent' ? '#15803d' : '#b45309',
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999,
          }}>
            {listing.listingType === 'sale' ? (isRtl ? 'للبيع' : 'Sale')
              : listing.listingType === 'rent' ? (isRtl ? 'للإيجار' : 'Rent')
              : (isRtl ? 'تشغيلي' : 'Operational')}
          </span>
        )}
        {listing.propertyType && (
          <span style={{
            background: '#f1f5f9', color: '#475569',
            fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 999,
          }}>
            {listing.propertyType}
          </span>
        )}
      </div>

      <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.35 }}>
        {listing.title}
      </p>

      {location && (
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 5px' }}>
          📍 {location}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, margin: '0 0 10px', alignItems: 'center' }}>
        {listing.price && (
          <p style={{ fontSize: 14, fontWeight: 700, color: '#b45309', margin: 0 }}>
            {formatPrice(listing.price, listing.currency)}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#64748b' }}>
          {listing.bedrooms  && <span>🛏 {listing.bedrooms}</span>}
          {listing.areaSqm   && <span>📐 {listing.areaSqm}m²</span>}
        </div>
      </div>

      <a
        href={href}
        style={{
          display: 'block',
          background: '#0f172a',
          color: '#fff',
          textAlign: 'center',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        {isRtl ? 'عرض التفاصيل ←' : 'View Details →'}
      </a>
    </div>
  );
}

// ─── Main MapView Component ───────────────────────────────────────────────────

const RIYADH: [number, number] = [24.7136, 46.6753];

export function MapView({ open, onClose, filters, isRtl }: MapViewProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['map-listings', filters.q, filters.propertyType, filters.type],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '500', status: 'active' });
      if (filters.q)                      params.set('q', filters.q);
      if (filters.propertyType !== 'all') params.set('propertyType', filters.propertyType);
      if (filters.type !== 'all')         params.set('type', filters.type);
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ data: Listing[]; meta: { total: number } }>;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const listings  = data?.data ?? [];
  const mappable  = useMemo(() => listings.filter(l => l.lat != null && l.lng != null), [listings]);
  const unmapped  = listings.length - mappable.length;
  const points    = useMemo(() => mappable.map(l => [l.lat!, l.lng!] as [number, number]), [mappable]);
  const mapCenter = points[0] ?? RIYADH;

  // Lock body scroll while map is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={isRtl ? 'عرض الخريطة' : 'Map view'}
    >
      {/* ── Header ── */}
      <div
        style={{ background: 'var(--color-primary, #0f172a)', color: '#fff' }}
        className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0"
      >
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-amber-400" />
          <span className="font-semibold text-sm">
            {isRtl ? 'بحث على الخريطة' : 'Map Search'}
          </span>
          {!isLoading && (
            <span className="text-xs bg-white/15 px-2.5 py-0.5 rounded-full">
              {mappable.length} {isRtl ? 'عقار على الخريطة' : 'on map'}
              {listings.length > mappable.length && ` / ${listings.length} ${isRtl ? 'إجمالاً' : 'total'}`}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
          aria-label={isRtl ? 'إغلاق الخريطة' : 'Close map'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Map area ── */}
      <div className="flex-1 relative min-h-0">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">
                {isRtl ? 'جاري تحميل بيانات الخريطة…' : 'Loading map data…'}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">{isRtl ? 'فشل تحميل بيانات الخريطة' : 'Failed to load map data'}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && mappable.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <MapPin className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">
                {isRtl ? 'لا توجد عقارات بإحداثيات جغرافية' : 'No properties with location data'}
              </p>
            </div>
          </div>
        )}

        {/* Leaflet Map */}
        {!isLoading && !isError && mappable.length > 0 && (
          <MapContainer
            key={`map-${open}`}
            center={mapCenter}
            zoom={11}
            className="h-full w-full"
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <BoundsController points={points} />

            {mappable.map(listing => (
              <Marker
                key={listing.id}
                position={[listing.lat!, listing.lng!]}
                icon={createPriceMarker(listing.price, listing.currency)}
              >
                <Popup maxWidth={240} minWidth={220} className="leaflet-popup-content-wrapper-clean">
                  <ListingPopup listing={listing} isRtl={isRtl} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* ── Footer — unmapped notice ── */}
      {!isLoading && unmapped > 0 && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isRtl
              ? `${unmapped} عقار بدون إحداثيات لم يُعرض على الخريطة — أضف الموقع عبر لوحة الإدارة`
              : `${unmapped} ${unmapped === 1 ? 'property' : 'properties'} without coordinates hidden — add location via Admin Dashboard`}
          </span>
        </div>
      )}
    </div>
  );
}
