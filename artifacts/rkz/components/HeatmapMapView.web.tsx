/**
 * HeatmapMapView — WEB PLATFORM SHIM
 *
 * Metro automatically uses this file instead of HeatmapMapView.tsx when
 * building for web. It renders the identical Leaflet map via a native DOM
 * <iframe> with srcdoc, completely avoiding react-native-webview (which has
 * no web support and crashes the Expo web bundle).
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

// ── Types (mirror native file exactly so consumers compile without changes) ─
export interface MapProperty {
  id: string;
  city: string;
  district: string;
  type: string;
  price: number;
  area: number;
  bedrooms?: number;
  badge?: string;
}

// Legacy exports kept for any stale imports.
export interface HeatCell {
  key: string;
  city: string;
  district: string;
  occupancy: number;
  transactions: number;
}
export type HeatMetric = "occupancy" | "transactions";

interface Props {
  properties: MapProperty[];
  isAr?: boolean;
}

// ── District coordinates (copied from native version) ──────────────────────
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "الرياض__النرجس":          [24.774, 46.633],
  "الرياض__الملقا":          [24.761, 46.637],
  "الرياض__العليا":          [24.694, 46.682],
  "الرياض__الياسمين":        [24.802, 46.650],
  "الرياض__الصناعية":        [24.619, 46.722],
  "الرياض__الحمراء":         [24.678, 46.705],
  "جدة__الروضة":             [21.553, 39.172],
  "جدة__التعمير":            [21.527, 39.183],
  "الدمام__الشاطئ":          [26.452, 50.046],
  "الدمام__الراكة":          [26.427, 50.082],
  "مكة المكرمة__العزيزية":   [21.362, 39.848],
  "الخبر__الكورنيش":         [26.300, 50.192],
  "الخبر__الأمواج":          [26.272, 50.212],
  "المدينة المنورة__الورود":  [24.523, 39.574],
  "الطائف__الهضيبة":         [21.280, 40.420],
  "الطائف__الشفا":           [21.218, 40.348],
};

const CITY_COORDS: Record<string, [number, number]> = {
  "الرياض":           [24.7136, 46.6753],
  "جدة":              [21.4858, 39.1925],
  "الدمام":           [26.4207, 50.0888],
  "مكة المكرمة":      [21.3891, 39.8579],
  "الخبر":            [26.2172, 50.1971],
  "المدينة المنورة":  [24.5247, 39.5692],
  "الطائف":           [21.2827, 40.4146],
};

// ── HTML builder (identical to native version) ──────────────────────────────
function buildMapHtml(properties: MapProperty[]): string {
  const coordsJson = JSON.stringify(DISTRICT_COORDS);
  const cityJson   = JSON.stringify(CITY_COORDS);
  const dataJson   = JSON.stringify(properties);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: #0a1628; }
  #map { height: 100%; width: 100%; }

  .price-icon { overflow: visible !important; background: none !important; border: none !important; }
  .price-pill {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 20px;
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 3px 14px rgba(0,0,0,0.65);
    cursor: pointer;
    direction: rtl;
    transform: translate(-50%, -50%);
    transition: transform 0.12s, box-shadow 0.12s;
  }
  .price-pill:hover { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 5px 18px rgba(0,0,0,0.8); }
  .price-green { background: #22c55e; color: #fff;    border: 1.5px solid #16a34a; }
  .price-gold  { background: #D4A843; color: #0A1628; border: 1.5px solid #b8902e; }

  .lf-popup .leaflet-popup-content-wrapper {
    background: #0f2040; border: 1.5px solid #D4A843; border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.55); color: #f1f5f9;
    font-family: -apple-system, sans-serif; padding: 0; direction: rtl;
  }
  .lf-popup .leaflet-popup-tip-container { display: none; }
  .lf-popup .leaflet-popup-content { margin: 14px 16px; min-width: 180px; }
  .pop-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-direction: row-reverse; }
  .pop-type  { font-size: 11px; background: rgba(212,168,67,0.2); color: #D4A843; padding: 2px 8px; border-radius: 10px; }
  .pop-badge { font-size: 10px; background: #D4A843; color: #0A1628; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
  .pop-title { font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 2px; text-align: right; }
  .pop-city  { font-size: 11px; color: #94a3b8; margin-bottom: 10px; text-align: right; }
  .pop-row   { display: flex; gap: 8px; flex-direction: row-reverse; justify-content: flex-end; }
  .pop-item  { text-align: center; min-width: 52px; }
  .pop-val   { font-size: 16px; font-weight: 700; color: #D4A843; }
  .pop-lbl   { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  .leaflet-control-zoom a { background: #0f2040 !important; color: #D4A843 !important; border-color: #1e3a5f !important; }
  .leaflet-control-zoom a:hover { background: #1e3a5f !important; }
  .leaflet-control-attribution { background: rgba(10,22,40,0.7) !important; color: #64748b !important; font-size: 9px; }
  .leaflet-control-attribution a { color: #D4A843 !important; }

  /* Fix white tile-gap lines on high-DPI / mobile screens */
  .leaflet-tile-pane { will-change: transform; }
  .leaflet-tile {
    border-right: 1px solid transparent;
    border-bottom: 1px solid transparent;
    image-rendering: -webkit-optimize-contrast;
  }
  .leaflet-tile-container img {
    width: 256.5px !important;
    height: 256.5px !important;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var DISTRICT_COORDS = ${coordsJson};
  var CITY_COORDS     = ${cityJson};
  var PROPS           = ${dataJson};

  var TYPE_LABELS = {
    villa:'فيلا', apartment:'شقة', land:'أرض', commercial:'تجاري',
    compound:'مجمع', floor:'دور', warehouse:'مستودع', farm:'مزرعة',
    rest_house:'استراحة', palace:'قصر'
  };

  function fmtPrice(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + ' مليون';
    if (n >= 1000)    return Math.round(n / 1000) + ' ألف';
    return n.toString();
  }

  var districtIdx = {};
  var features = PROPS.map(function(p) {
    var key = p.city + '__' + p.district;
    var idx = districtIdx[key] !== undefined ? districtIdx[key] : 0;
    districtIdx[key] = idx + 1;
    var base = DISTRICT_COORDS[key] || CITY_COORDS[p.city] || [24.7136, 46.6753];
    var angle = idx * 2.399;
    var r = idx === 0 ? 0 : 0.014 + Math.floor(idx / 5) * 0.009;
    return Object.assign({}, p, {
      lat: base[0] + Math.cos(angle) * r,
      lng: base[1] + Math.sin(angle) * r,
    });
  });

  var map = L.map('map', {
    center: [23.8, 44.8], zoom: 5,
    zoomControl: true, attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 18,
  }).addTo(map);

  features.forEach(function(p) {
    var isGold    = p.price >= 5000000 || !!p.badge;
    var cls       = isGold ? 'price-gold' : 'price-green';
    var typeLabel = TYPE_LABELS[p.type] || p.type;
    var priceLabel = fmtPrice(p.price);

    var icon = L.divIcon({
      html:       '<div class="price-pill ' + cls + '">' + priceLabel + '</div>',
      className:  'price-icon',
      iconSize:   [0, 0],
      iconAnchor: [0, 0],
    });

    var badgeHtml   = p.badge ? '<span class="pop-badge">' + p.badge + '</span>' : '';
    var bedroomHtml = p.bedrooms
      ? '<div class="pop-item"><div class="pop-val">' + p.bedrooms + '</div><div class="pop-lbl">غرف</div></div>'
      : '';

    var popupHtml =
      '<div class="pop-header"><span class="pop-type">' + typeLabel + '</span>' + badgeHtml + '</div>' +
      '<div class="pop-title">' + typeLabel + ' ' + p.district + '</div>' +
      '<div class="pop-city">' + p.city + ' — ' + p.district + '</div>' +
      '<div class="pop-row">' +
        '<div class="pop-item"><div class="pop-val">' + priceLabel + '</div><div class="pop-lbl">السعر</div></div>' +
        '<div class="pop-item"><div class="pop-val">' + p.area.toLocaleString() + '</div><div class="pop-lbl">م²</div></div>' +
        bedroomHtml +
      '</div>';

    L.marker([p.lat, p.lng], { icon: icon })
      .bindPopup(popupHtml, { className: 'lf-popup', maxWidth: 260, closeButton: true })
      .addTo(map);
  });
})();
</script>
</body>
</html>`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function HeatmapMapView({ properties, isAr }: Props) {
  const colors = useColors();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const htmlRef      = useRef<string>("");

  const propsKey    = properties.map((p) => p.id).join(",");
  const prevKey     = useRef(propsKey);
  if (htmlRef.current === "" || prevKey.current !== propsKey) {
    prevKey.current = propsKey;
    htmlRef.current = buildMapHtml(properties);
  }

  // Mount iframe once into the View's underlying DOM node
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:none;display:block;";
    iframe.srcdoc = htmlRef.current;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(iframe);

    return () => {
      try { container.removeChild(iframe); } catch { /* already removed */ }
    };
  }, []); // mount once

  if (properties.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {isAr ? "لا توجد عقارات للعرض" : "No properties to display"}
        </Text>
      </View>
    );
  }

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative", backgroundColor: "#0a1628" },
  empty:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
