/**
 * TourismMapView — WEB PLATFORM SHIM
 * Metro auto-selects this instead of TourismMapView.tsx on web builds.
 * Uses a native DOM <iframe> with srcdoc to avoid react-native-webview crash.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface TourismSpot {
  id: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  descAr: string;
  descEn: string;
  category: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  featured?: boolean;
}

interface Props {
  spots: TourismSpot[];
  isAr?: boolean;
  activeCategory?: string;
}

const CAT_COLORS: Record<string, string> = {
  cultural:      "#60A5FA",
  events:        "#A78BFA",
  nature:        "#4ADE80",
  entertainment: "#FB923C",
  religious:     "#D4A843",
};

function buildMapHtml(spots: TourismSpot[], isAr: boolean): string {
  const dataJson  = JSON.stringify(spots);
  const catColors = JSON.stringify(CAT_COLORS);
  const isArStr   = isAr ? "true" : "false";

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: #0a1628; }
  #map { height: 100%; width: 100%; }

  .spot-icon { overflow: visible !important; background: none !important; border: none !important; }
  .spot-pin {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 50%;
    font-size: 20px; cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.7);
    border: 2.5px solid rgba(255,255,255,0.25);
    transform: translate(-50%, -50%);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .spot-pin:hover { transform: translate(-50%, -50%) scale(1.18); box-shadow: 0 6px 20px rgba(0,0,0,0.9); }
  .spot-pin.featured {
    width: 52px; height: 52px; font-size: 24px;
    border: 2.5px solid #D4A843;
    box-shadow: 0 4px 20px rgba(212,168,67,0.55);
  }

  .lf-popup .leaflet-popup-content-wrapper {
    background: #0f2040; border: 1.5px solid #D4A843; border-radius: 16px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.65); color: #f1f5f9;
    font-family: -apple-system, sans-serif; padding: 0;
    direction: ${isAr ? "rtl" : "ltr"};
  }
  .lf-popup .leaflet-popup-tip-container { display: none; }
  .lf-popup .leaflet-popup-content { margin: 16px; min-width: 200px; max-width: 260px; }
  .lf-popup .leaflet-popup-close-button { color: #94a3b8 !important; top: 10px; right: 10px; font-size: 18px; }

  .pop-emoji  { font-size: 28px; margin-bottom: 6px; display: block; text-align: ${isAr ? "right" : "left"}; }
  .pop-name   { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 2px; }
  .pop-city   { font-size: 11px; color: #D4A843; margin-bottom: 8px; }
  .pop-desc   { font-size: 12px; color: rgba(241,245,249,0.65); line-height: 1.6; margin-bottom: 12px; }
  .pop-cat    { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 9px; border-radius: 10px; margin-bottom: 8px; }
  .pop-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: #D4A843; color: #0A1628; font-weight: 700; font-size: 12px;
    padding: 8px 14px; border-radius: 10px; text-decoration: none;
    width: 100%; box-sizing: border-box; cursor: pointer;
  }
  .pop-btn:hover { background: #c99a36; }

  .leaflet-control-zoom a { background: #0f2040 !important; color: #D4A843 !important; border-color: #1e3a5f !important; }
  .leaflet-control-zoom a:hover { background: #1e3a5f !important; }
  .leaflet-control-attribution { background: rgba(10,22,40,0.7) !important; color: #64748b !important; font-size: 9px; }
  .leaflet-control-attribution a { color: #D4A843 !important; }
  .leaflet-tile-pane { will-change: transform; }
  .leaflet-tile { border-right: 1px solid transparent; border-bottom: 1px solid transparent; image-rendering: -webkit-optimize-contrast; }
  .leaflet-tile-container img { width: 256.5px !important; height: 256.5px !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var SPOTS   = ${dataJson};
  var CAT_CLR = ${catColors};
  var IS_AR   = ${isArStr};

  var map = L.map('map', {
    center: [23.8, 44.8], zoom: 5,
    zoomControl: true, attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 18,
  }).addTo(map);

  var CAT_AR = { cultural:'ثقافي', events:'فعاليات', nature:'طبيعة', entertainment:'ترفيه', religious:'ديني' };
  var CAT_EN = { cultural:'Cultural', events:'Events', nature:'Nature', entertainment:'Entertainment', religious:'Religious' };

  SPOTS.forEach(function(s) {
    var color    = CAT_CLR[s.category] || '#94a3b8';
    var featCls  = s.featured ? ' featured' : '';
    var catLabel = IS_AR ? (CAT_AR[s.category] || s.category) : (CAT_EN[s.category] || s.category);
    var name     = IS_AR ? s.nameAr : s.nameEn;
    var city     = IS_AR ? s.cityAr : s.cityEn;
    var desc     = IS_AR ? s.descAr : s.descEn;
    var mapsLbl  = IS_AR ? 'افتح الخريطة' : 'Open Maps';

    var icon = L.divIcon({
      html: '<div class="spot-pin' + featCls + '" style="background:' + color + '22;border-color:' + color + '">' + s.emoji + '</div>',
      className: 'spot-icon',
      iconSize: [0, 0], iconAnchor: [0, 0],
    });

    var popupHtml =
      '<span class="pop-emoji">' + s.emoji + '</span>' +
      '<span class="pop-cat" style="background:' + color + '22;color:' + color + '">' + catLabel + '</span>' +
      '<div class="pop-name">' + name + '</div>' +
      '<div class="pop-city">📍 ' + city + '</div>' +
      '<div class="pop-desc">' + desc + '</div>' +
      '<a class="pop-btn" href="' + s.mapsUrl + '" target="_blank">🗺️ ' + mapsLbl + '</a>';

    L.marker([s.lat, s.lng], { icon: icon })
      .bindPopup(popupHtml, { className: 'lf-popup', maxWidth: 280, closeButton: true })
      .addTo(map);
  });
})();
</script>
</body>
</html>`;
}

export default function TourismMapView({ spots, isAr = false }: Props) {
  const colors       = useColors();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const htmlRef      = useRef<string>("");
  const keyRef       = useRef("");

  const key = spots.map((s) => s.id).join(",") + (isAr ? "_ar" : "_en");
  if (htmlRef.current === "" || keyRef.current !== key) {
    keyRef.current  = key;
    htmlRef.current = buildMapHtml(spots, isAr ?? false);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:none;display:block;";
    iframe.srcdoc = htmlRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(iframe);
    return () => { try { container.removeChild(iframe); } catch { /* ok */ } };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (spots.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {isAr ? "لا توجد أماكن للعرض" : "No places to display"}
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
