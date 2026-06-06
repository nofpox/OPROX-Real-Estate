/**
 * HeatmapMapView — Leaflet/OpenStreetMap geographic heatmap embedded in a
 * WebView. Shows Saudi real estate district intensity (occupancy or deal
 * volume) as a proper colour-gradient heat layer, with gold dot markers that
 * open data pop-ups on tap. The metric can be switched live via
 * injectJavaScript without destroying the WebView.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";

// ── District coordinate lookup (approximate real-world positions) ──────────
// Keyed by `${city}__${district}` to match buildDistrictCells output.
const DISTRICT_COORDS: Record<string, [number, number]> = {
  // الرياض
  "الرياض__النرجس":    [24.774, 46.633],
  "الرياض__الملقا":    [24.761, 46.637],
  "الرياض__العليا":    [24.694, 46.682],
  "الرياض__الياسمين":  [24.802, 46.650],
  "الرياض__الصناعية":  [24.619, 46.722],
  "الرياض__الحمراء":   [24.678, 46.705],
  // جدة
  "جدة__الروضة":       [21.553, 39.172],
  "جدة__التعمير":      [21.527, 39.183],
  // الدمام
  "الدمام__الشاطئ":    [26.452, 50.046],
  "الدمام__الراكة":    [26.427, 50.082],
  // مكة المكرمة
  "مكة المكرمة__العزيزية": [21.362, 39.848],
  // الخبر
  "الخبر__الكورنيش":   [26.300, 50.192],
  "الخبر__الأمواج":    [26.272, 50.212],
  // المدينة المنورة
  "المدينة المنورة__الورود": [24.523, 39.574],
  // الطائف
  "الطائف__الهضيبة":   [21.280, 40.420],
  "الطائف__الشفا":     [21.218, 40.348],
};

// City-centre fallback coordinates when a district has no exact match.
const CITY_COORDS: Record<string, [number, number]> = {
  "الرياض":            [24.7136, 46.6753],
  "جدة":               [21.4858, 39.1925],
  "الدمام":            [26.4207, 50.0888],
  "مكة المكرمة":       [21.3891, 39.8579],
  "الخبر":             [26.2172, 50.1971],
  "المدينة المنورة":   [24.5247, 39.5692],
  "الطائف":            [21.2827, 40.4146],
};

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

// ── HTML generator ─────────────────────────────────────────────────────────
function buildMapHtml(cells: HeatCell[]): string {
  // Augment cells with resolved coordinates.
  const features = cells.map((c) => {
    const coords = DISTRICT_COORDS[c.key]
      ?? CITY_COORDS[c.city]
      ?? [24.7136, 46.6753];
    return { ...c, lat: coords[0], lng: coords[1] };
  });

  const dataJson = JSON.stringify(features);

  return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
<link rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: #0a1628; }
  #map { height: 100%; width: 100%; }

  /* Pop-up style */
  .lf-popup .leaflet-popup-content-wrapper {
    background: #0f2040;
    border: 1.5px solid #D4A843;
    border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.55);
    color: #f1f5f9;
    font-family: -apple-system, sans-serif;
    padding: 0;
  }
  .lf-popup .leaflet-popup-tip-container { display: none; }
  .lf-popup .leaflet-popup-content { margin: 14px 16px; }
  .pop-district { font-size: 15px; font-weight: 700; color: #D4A843; margin-bottom: 3px; }
  .pop-city     { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
  .pop-row      { display: flex; gap: 14px; }
  .pop-item     { text-align: center; }
  .pop-val      { font-size: 20px; font-weight: 700; color: #ffffff; }
  .pop-lbl      { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  /* Zoom control colours */
  .leaflet-control-zoom a {
    background: #0f2040 !important;
    color: #D4A843 !important;
    border-color: #1e3a5f !important;
  }
  .leaflet-control-zoom a:hover { background: #1e3a5f !important; }
  .leaflet-control-attribution {
    background: rgba(10,22,40,0.7) !important;
    color: #64748b !important;
    font-size: 9px;
  }
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
  var currentMetric = "occupancy";
  var heatLayer = null;
  var map;

  /* Golden-angle spiral offsets for stable heat spread around each district. */
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
      OFFSETS[i].forEach(function(off) {
        pts.push([d.lat + off[0], d.lng + off[1], raw * 0.55]);
      });
    });
    return pts;
  }

  function updateMetric(metric) {
    currentMetric = metric;
    if (heatLayer) { map.removeLayer(heatLayer); }
    heatLayer = L.heatLayer(buildHeatPoints(metric), {
      radius: 52,
      blur: 36,
      maxZoom: 14,
      max: 1.0,
      gradient: {
        0.0:  "#1e3a8a",
        0.25: "#0891b2",
        0.50: "#16a34a",
        0.70: "#d97706",
        0.85: "#ea580c",
        1.0:  "#dc2626"
      }
    }).addTo(map);
  }

  /* Expose for injectJavaScript calls from React Native */
  window.updateMetric = updateMetric;

  /* Init map */
  map = L.map("map", {
    center: [23.8, 44.8],
    zoom: 5,
    zoomControl: true,
    attributionControl: true,
  });

  /* CartoDB Dark Matter tiles — no API key required */
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 18,
    }
  ).addTo(map);

  /* Initial heat layer */
  updateMetric("occupancy");

  /* Gold dot markers with data pop-ups */
  DISTRICTS.forEach(function(d) {
    var marker = L.circleMarker([d.lat, d.lng], {
      radius: 9,
      fillColor: "#D4A843",
      color: "#0a1628",
      weight: 2,
      fillOpacity: 0.95,
      className: "district-marker",
    }).addTo(map);

    var popupHtml =
      '<div class="pop-district">' + d.district + '</div>' +
      '<div class="pop-city">' + d.city + '</div>' +
      '<div class="pop-row">' +
        '<div class="pop-item">' +
          '<div class="pop-val">' + d.occupancy + '%</div>' +
          '<div class="pop-lbl">إشغال / Occupancy</div>' +
        '</div>' +
        '<div class="pop-item">' +
          '<div class="pop-val">' + d.transactions + '</div>' +
          '<div class="pop-lbl">صفقات / Deals</div>' +
        '</div>' +
      '</div>';

    marker.bindPopup(popupHtml, {
      className: "lf-popup",
      maxWidth: 220,
      closeButton: true,
    });
  });
})();
</script>
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HeatmapMapView({ cells, metric, isAr }: Props) {
  const colors = useColors();
  const webRef = useRef<WebView>(null);
  const htmlRef = useRef<string>("");

  // Build HTML once when cells change (not on metric change — metric is
  // updated via injectJavaScript without destroying the WebView).
  if (htmlRef.current === "") {
    htmlRef.current = buildMapHtml(cells);
  }

  // Rebuild when cell data changes (filter switch).
  const cellsKey = cells.map((c) => c.key).join(",");
  const prevCellsKey = useRef(cellsKey);
  if (prevCellsKey.current !== cellsKey) {
    prevCellsKey.current = cellsKey;
    htmlRef.current = buildMapHtml(cells);
  }

  // Update metric on the live map without re-loading the WebView.
  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.updateMetric && window.updateMetric("${metric}"); true;`
    );
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

  return (
    <WebView
      ref={webRef}
      source={{ html: htmlRef.current }}
      style={styles.webview}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      // Android: allow loading CartoDB + Leaflet CDN over https.
      mixedContentMode="always"
      // Disable vertical bouncing so the map scrolls fluidly.
      bounces={false}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onError={(e) =>
        console.warn("HeatmapMapView error:", e.nativeEvent.description)
      }
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#0a1628" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
