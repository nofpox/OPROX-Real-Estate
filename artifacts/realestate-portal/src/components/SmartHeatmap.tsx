/**
 * SmartHeatmap — Web-native port of the Rozoz Leaflet geographic heatmap.
 * Shows Saudi real estate district intensity (occupancy or deal volume) as a
 * colour-gradient heat layer, with gold markers that open data pop-ups.
 * Pure React — no React Native dependencies.
 */
import React, { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HeatMetric = 'occupancy' | 'transactions';

interface HeatCell {
  key: string;
  city: string;
  district: string;
  occupancy: number;
  transactions: number;
  lat: number;
  lng: number;
}

interface InputListing {
  city: string | null;
  isActive: boolean | null;
  propertyType: string | null;
}

// ── Saudi district baseline data ──────────────────────────────────────────────
// Each row: city, district, approximate GPS coords, baseline occupancy %, baseline deal count

const DISTRICT_BASELINE: HeatCell[] = [
  { key: 'الرياض__النرجس',         city: 'الرياض',          district: 'النرجس',    lat: 24.774, lng: 46.633, occupancy: 78, transactions: 24 },
  { key: 'الرياض__الملقا',         city: 'الرياض',          district: 'الملقا',    lat: 24.761, lng: 46.637, occupancy: 85, transactions: 31 },
  { key: 'الرياض__العليا',         city: 'الرياض',          district: 'العليا',    lat: 24.694, lng: 46.682, occupancy: 92, transactions: 47 },
  { key: 'الرياض__الياسمين',       city: 'الرياض',          district: 'الياسمين',  lat: 24.802, lng: 46.650, occupancy: 65, transactions: 18 },
  { key: 'الرياض__الصناعية',       city: 'الرياض',          district: 'الصناعية',  lat: 24.619, lng: 46.722, occupancy: 55, transactions: 12 },
  { key: 'الرياض__الحمراء',        city: 'الرياض',          district: 'الحمراء',   lat: 24.678, lng: 46.705, occupancy: 71, transactions: 22 },
  { key: 'جدة__الروضة',            city: 'جدة',             district: 'الروضة',    lat: 21.553, lng: 39.172, occupancy: 82, transactions: 35 },
  { key: 'جدة__التعمير',           city: 'جدة',             district: 'التعمير',   lat: 21.527, lng: 39.183, occupancy: 74, transactions: 29 },
  { key: 'الدمام__الشاطئ',         city: 'الدمام',          district: 'الشاطئ',    lat: 26.452, lng: 50.046, occupancy: 68, transactions: 21 },
  { key: 'الدمام__الراكة',         city: 'الدمام',          district: 'الراكة',    lat: 26.427, lng: 50.082, occupancy: 59, transactions: 15 },
  { key: 'مكة المكرمة__العزيزية',  city: 'مكة المكرمة',     district: 'العزيزية',  lat: 21.362, lng: 39.848, occupancy: 88, transactions: 42 },
  { key: 'الخبر__الكورنيش',        city: 'الخبر',           district: 'الكورنيش',  lat: 26.300, lng: 50.192, occupancy: 76, transactions: 28 },
  { key: 'الخبر__الأمواج',         city: 'الخبر',           district: 'الأمواج',   lat: 26.272, lng: 50.212, occupancy: 63, transactions: 19 },
  { key: 'المدينة المنورة__الورود', city: 'المدينة المنورة', district: 'الورود',    lat: 24.523, lng: 39.574, occupancy: 71, transactions: 23 },
  { key: 'الطائف__الهضيبة',        city: 'الطائف',          district: 'الهضيبة',   lat: 21.280, lng: 40.420, occupancy: 58, transactions: 14 },
  { key: 'الطائف__الشفا',          city: 'الطائف',          district: 'الشفا',     lat: 21.218, lng: 40.348, occupancy: 67, transactions: 20 },
];

// ── Build cells — overlays real listing counts onto baseline ─────────────────

function buildCells(listings: InputListing[]): HeatCell[] {
  const cityCounts: Record<string, number> = {};
  for (const l of listings) {
    const c = l.city?.trim();
    if (c) cityCounts[c] = (cityCounts[c] ?? 0) + 1;
  }
  const hasCityData = Object.keys(cityCounts).length > 0;

  return DISTRICT_BASELINE.map((cell, i) => {
    const count = cityCounts[cell.city] ?? 0;
    // Deterministic "random" scaling per district using index as seed
    const seed  = ((i * 17 + 7) % 100) / 100;
    const txn   = hasCityData && count > 0
      ? Math.max(1, Math.round(count * (0.4 + seed * 0.6) * 8))
      : cell.transactions;
    return { ...cell, transactions: txn };
  });
}

// ── Leaflet HTML builder ───────────────────────────────────────────────────────

function buildMapHtml(cells: HeatCell[]): string {
  const dataJson = JSON.stringify(cells);
  return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: #0a1628; }
  #map { height: 100%; width: 100%; }
  .lf-popup .leaflet-popup-content-wrapper {
    background: #0f2040; border: 1.5px solid #D4A843; border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.55); color: #f1f5f9;
    font-family: -apple-system,BlinkMacSystemFont,sans-serif; padding: 0;
  }
  .lf-popup .leaflet-popup-tip-container { display: none; }
  .lf-popup .leaflet-popup-content { margin: 14px 16px; }
  .pop-district { font-size: 15px; font-weight: 700; color: #D4A843; margin-bottom: 3px; }
  .pop-city     { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
  .pop-row      { display: flex; gap: 14px; }
  .pop-item     { text-align: center; }
  .pop-val      { font-size: 20px; font-weight: 700; color: #ffffff; }
  .pop-lbl      { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .leaflet-control-zoom a { background: #0f2040 !important; color: #D4A843 !important; border-color: #1e3a5f !important; }
  .leaflet-control-zoom a:hover { background: #1e3a5f !important; }
  .leaflet-control-attribution { background: rgba(10,22,40,0.7) !important; color: #64748b !important; font-size: 9px; }
  .leaflet-control-attribution a { color: #D4A843 !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
<script>
(function () {
  var DISTRICTS = ${dataJson};
  var heatLayer = null;
  var map;

  function makeOffsets(n, count) {
    var pts = [];
    for (var j = 0; j < count; j++) {
      var angle = ((n * count + j) * 137.508) * Math.PI / 180;
      var r = 0.03 + (j % 5) * 0.018;
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    return pts;
  }
  var OFFSETS = DISTRICTS.map(function(_, i) { return makeOffsets(i, 12); });

  function buildHeatPoints(metric) {
    var pts = [];
    DISTRICTS.forEach(function(d, i) {
      var raw = metric === 'occupancy'
        ? d.occupancy / 100
        : Math.min(1, d.transactions / 50);
      pts.push([d.lat, d.lng, raw]);
      OFFSETS[i].forEach(function(off) {
        pts.push([d.lat + off[0], d.lng + off[1], raw * 0.55]);
      });
    });
    return pts;
  }

  function updateMetric(metric) {
    if (heatLayer) { map.removeLayer(heatLayer); }
    heatLayer = L.heatLayer(buildHeatPoints(metric), {
      radius: 52, blur: 36, maxZoom: 14, max: 1.0,
      gradient: { 0.0: '#1e3a8a', 0.25: '#0891b2', 0.50: '#16a34a', 0.70: '#d97706', 0.85: '#ea580c', 1.0: '#dc2626' }
    }).addTo(map);
  }

  window.updateMetric = updateMetric;

  map = L.map('map', { center: [23.8, 44.8], zoom: 5, zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 18,
  }).addTo(map);

  updateMetric('occupancy');

  DISTRICTS.forEach(function(d) {
    var marker = L.circleMarker([d.lat, d.lng], {
      radius: 9, fillColor: '#D4A843', color: '#0a1628', weight: 2, fillOpacity: 0.95,
    }).addTo(map);
    var html =
      '<div class="pop-district">' + d.district + '</div>' +
      '<div class="pop-city">'     + d.city     + '</div>' +
      '<div class="pop-row">' +
        '<div class="pop-item"><div class="pop-val">' + d.occupancy    + '%</div><div class="pop-lbl">إشغال / Occupancy</div></div>' +
        '<div class="pop-item"><div class="pop-val">' + d.transactions + '</div><div class="pop-lbl">صفقات / Deals</div></div>' +
      '</div>';
    marker.bindPopup(html, { className: 'lf-popup', maxWidth: 220, closeButton: true });
  });
})();
</script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAP_HEIGHT = 420;

interface Props {
  listings: InputListing[];
  isRtl: boolean;
}

export const SmartHeatmap: React.FC<Props> = ({ listings, isRtl }) => {
  const [metric, setMetric] = useState<HeatMetric>('occupancy');
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef    = useRef<HTMLIFrameElement | null>(null);
  const htmlRef      = useRef<string>('');

  const cells = buildCells(listings);

  // Build HTML once (or when listing data changes)
  const cellsKey = cells.map(c => `${c.key}:${c.transactions}`).join(',');
  const prevKey  = useRef('');
  if (htmlRef.current === '' || prevKey.current !== cellsKey) {
    prevKey.current  = cellsKey;
    htmlRef.current  = buildMapHtml(cells);
  }

  // Mount iframe once into DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width:100%;height:${MAP_HEIGHT}px;border:none;display:block;`;
    iframe.srcdoc = htmlRef.current;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(iframe);
    iframeRef.current = iframe;

    return () => {
      try { container.removeChild(iframe); } catch { /* already gone */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch metric without reloading iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let attempts = 0;
    const tryInject = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        (iframe.contentWindow as any)?.eval(`window.updateMetric && window.updateMetric("${metric}"); true;`);
      } catch {
        if (++attempts < 10) setTimeout(tryInject, 200);
      }
    };
    const t = setTimeout(tryInject, 150);
    return () => clearTimeout(t);
  }, [metric]);

  return (
    <div>
      {/* Metric toggle */}
      <div className="flex gap-2 mb-3">
        {(['occupancy', 'transactions'] as HeatMetric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              metric === m
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'occupancy'
              ? (isRtl ? 'نسبة الإشغال' : 'Occupancy %')
              : (isRtl ? 'حجم الصفقات'  : 'Deal Volume')}
          </button>
        ))}
      </div>

      {/* Leaflet map */}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ height: MAP_HEIGHT, backgroundColor: '#0a1628' }}
      />

      {/* Legend + hint */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-28 rounded-full"
            style={{ background: 'linear-gradient(to right, #1e3a8a, #0891b2, #16a34a, #d97706, #dc2626)' }}
          />
          <span className="text-[10px] text-muted-foreground">
            {isRtl ? 'منخفض ← → مرتفع' : 'Low ← → High'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          <span className="text-[10px] text-muted-foreground">
            {isRtl ? 'انقر على الدائرة للتفاصيل' : 'Tap dot for details'}
          </span>
        </div>
      </div>
    </div>
  );
};
