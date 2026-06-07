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
export interface HeatCell {
  key: string;
  city: string;
  district: string;
  occupancy: number;
  transactions: number;
}
export type HeatMetric = "occupancy" | "transactions";

interface Props {
  cells: HeatCell[];
  metric: HeatMetric;
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
function buildMapHtml(cells: HeatCell[]): string {
  const features = cells.map((c) => {
    const coords = DISTRICT_COORDS[c.key] ?? CITY_COORDS[c.city] ?? [24.7136, 46.6753];
    return { ...c, lat: coords[0], lng: coords[1] };
  });
  const dataJson = JSON.stringify(features);

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
    font-family: -apple-system, sans-serif; padding: 0;
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
      var raw = metric === "occupancy" ? d.occupancy / 100 : Math.min(1, d.transactions / 28);
      pts.push([d.lat, d.lng, raw]);
      OFFSETS[i].forEach(function(off) { pts.push([d.lat + off[0], d.lng + off[1], raw * 0.55]); });
    });
    return pts;
  }
  function updateMetric(metric) {
    if (heatLayer) { map.removeLayer(heatLayer); }
    heatLayer = L.heatLayer(buildHeatPoints(metric), {
      radius: 52, blur: 36, maxZoom: 14, max: 1.0,
      gradient: { 0.0: "#1e3a8a", 0.25: "#0891b2", 0.50: "#16a34a", 0.70: "#d97706", 0.85: "#ea580c", 1.0: "#dc2626" }
    }).addTo(map);
  }
  window.updateMetric = updateMetric;
  map = L.map("map", { center: [23.8, 44.8], zoom: 5, zoomControl: true, attributionControl: true });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd", maxZoom: 18,
  }).addTo(map);
  updateMetric("occupancy");
  DISTRICTS.forEach(function(d) {
    var marker = L.circleMarker([d.lat, d.lng], {
      radius: 9, fillColor: "#D4A843", color: "#0a1628", weight: 2, fillOpacity: 0.95,
    }).addTo(map);
    var popupHtml =
      '<div class="pop-district">' + d.district + '</div>' +
      '<div class="pop-city">' + d.city + '</div>' +
      '<div class="pop-row">' +
        '<div class="pop-item"><div class="pop-val">' + d.occupancy + '%</div><div class="pop-lbl">إشغال / Occupancy</div></div>' +
        '<div class="pop-item"><div class="pop-val">' + d.transactions + '</div><div class="pop-lbl">صفقات / Deals</div></div>' +
      '</div>';
    marker.bindPopup(popupHtml, { className: "lf-popup", maxWidth: 220, closeButton: true });
  });
})();
</script>
</body>
</html>`;
}

const MAP_HEIGHT = 420;

// ── Component ───────────────────────────────────────────────────────────────
export default function HeatmapMapView({ cells, metric, isAr }: Props) {
  const colors = useColors();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iframeRef    = useRef<any>(null);
  const htmlRef      = useRef<string>("");

  // Build HTML on first render / when cells change
  const cellsKey    = cells.map((c) => c.key).join(",");
  const prevCellsKey = useRef(cellsKey);
  if (htmlRef.current === "" || prevCellsKey.current !== cellsKey) {
    prevCellsKey.current = cellsKey;
    htmlRef.current = buildMapHtml(cells);
  }

  // Mount iframe once into the View's underlying DOM node
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = `width:100%;height:${MAP_HEIGHT}px;border:none;display:block;`;
    iframe.srcdoc = htmlRef.current;

    // Clear any previous iframe and insert the new one
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(iframe);
    iframeRef.current = iframe;

    return () => {
      try { container.removeChild(iframe); } catch { /* already removed */ }
    };
  }, []); // mount once — metric changes handled via eval below

  // Switch metric without reloading the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // The iframe may still be loading; retry until Leaflet is ready
    let attempts = 0;
    const tryInject = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        iframe.contentWindow?.eval(`window.updateMetric && window.updateMetric("${metric}"); true;`);
      } catch {
        if (++attempts < 10) setTimeout(tryInject, 200);
      }
    };
    const t = setTimeout(tryInject, 150);
    return () => clearTimeout(t);
  }, [metric]);

  if (cells.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {isAr ? "لا توجد بيانات للعرض" : "No data to display"}
        </Text>
      </View>
    );
  }

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { height: MAP_HEIGHT, backgroundColor: "#0a1628" },
  empty:     { height: MAP_HEIGHT, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
