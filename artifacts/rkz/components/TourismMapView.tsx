/**
 * TourismMapView — NATIVE (Android + iOS)
 *
 * Rebuilt to mirror HeatmapMapView exactly:
 *  - Same viewport meta (user-scalable=yes)
 *  - Same (function () { IIFE style
 *  - Same L.map() + L.tileLayer() init order
 *  - Same WebView props
 *  - try/catch around init so errors surface visibly
 *
 * initialZoom=6  → tourist (see all Saudi)
 * initialZoom=12 → neighborhood mode
 * showTourismSpots=true → render the 12 landmark markers
 *
 * PARENT MUST use StyleSheet.absoluteFill — no overflow:"hidden".
 */
import React, { useRef } from "react";
import { Linking, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface TourismSpot {
  id: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  category: string;
  lat: number;
  lng: number;
  mapsUrl: string;
}

interface Props {
  spots?:            TourismSpot[];
  isAr?:             boolean;
  apiBase?:          string;
  userLat?:          number;
  userLng?:          number;
  hasTabs?:          boolean;
  initialZoom?:      number;
  showTourismSpots?: boolean;
}

/* ── Static 12 Saudi landmarks ───────────────────────────────────────────── */
const SPOTS: TourismSpot[] = [
  { id:"diriyah",         emoji:"🏯", nameAr:"الدرعية التاريخية",    nameEn:"Diriyah",               cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.734, lng:46.571, mapsUrl:"https://maps.google.com/?q=Diriyah,Riyadh" },
  { id:"masmak",          emoji:"🏰", nameAr:"قصر المصمك",            nameEn:"Al Masmak Palace",      cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.686, lng:46.713, mapsUrl:"https://maps.google.com/?q=Al+Masmak+Palace,Riyadh" },
  { id:"national-museum", emoji:"🏛", nameAr:"المتحف الوطني السعودي", nameEn:"Saudi National Museum", cityAr:"الرياض",          cityEn:"Riyadh",  category:"cultural",      lat:24.699, lng:46.713, mapsUrl:"https://maps.google.com/?q=Saudi+National+Museum,Riyadh" },
  { id:"alula",           emoji:"🌄", nameAr:"العُلا",                nameEn:"AlUla",                 cityAr:"العُلا",          cityEn:"AlUla",   category:"nature",        lat:26.624, lng:37.921, mapsUrl:"https://maps.google.com/?q=AlUla,Saudi+Arabia" },
  { id:"abha",            emoji:"🌿", nameAr:"أبها",                  nameEn:"Abha",                  cityAr:"أبها",            cityEn:"Abha",    category:"nature",        lat:18.216, lng:42.505, mapsUrl:"https://maps.google.com/?q=Abha,Saudi+Arabia" },
  { id:"kingdom-centre",  emoji:"🏙", nameAr:"برج المملكة",           nameEn:"Kingdom Centre Tower",  cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.691, lng:46.683, mapsUrl:"https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh" },
  { id:"boulevard",       emoji:"🎡", nameAr:"بولفارد الرياض",        nameEn:"Boulevard City Riyadh", cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.803, lng:46.637, mapsUrl:"https://maps.google.com/?q=Boulevard+City+Riyadh" },
  { id:"jeddah-historic", emoji:"🕌", nameAr:"جدة التاريخية",         nameEn:"Historic Jeddah",       cityAr:"جدة",             cityEn:"Jeddah",  category:"cultural",      lat:21.487, lng:39.188, mapsUrl:"https://maps.google.com/?q=Al-Balad,Jeddah" },
  { id:"mecca",           emoji:"🕋", nameAr:"مكة المكرمة",           nameEn:"Mecca",                 cityAr:"مكة المكرمة",     cityEn:"Mecca",   category:"religious",     lat:21.389, lng:39.857, mapsUrl:"https://maps.google.com/?q=Grand+Mosque,Mecca" },
  { id:"medina",          emoji:"🌙", nameAr:"المدينة المنورة",        nameEn:"Medina",                cityAr:"المدينة المنورة", cityEn:"Medina",  category:"religious",     lat:24.524, lng:39.570, mapsUrl:"https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina" },
  { id:"tabuk",           emoji:"🏜", nameAr:"تبوك",                  nameEn:"Tabuk",                 cityAr:"تبوك",            cityEn:"Tabuk",   category:"nature",        lat:28.383, lng:36.566, mapsUrl:"https://maps.google.com/?q=Tabuk,Saudi+Arabia" },
  { id:"riyadh-season",   emoji:"🎪", nameAr:"موسم الرياض",           nameEn:"Riyadh Season",         cityAr:"الرياض",          cityEn:"Riyadh",  category:"entertainment", lat:24.787, lng:46.650, mapsUrl:"https://maps.google.com/?q=Riyadh+Season+Boulevard" },
];

/* ── HTML builder ────────────────────────────────────────────────────────── */
function buildHtml(opts: {
  isAr: boolean;
  lat: number;
  lng: number;
  hasTabs: boolean;
  apiBase: string;
  initialZoom: number;
  showTourismSpots: boolean;
}): string {
  const { isAr, lat, lng, hasTabs, apiBase, initialZoom, showTourismSpots } = opts;
  const dir           = isAr ? "rtl" : "ltr";
  const spotsJson     = JSON.stringify(SPOTS);
  const legendBottom  = hasTabs ? 112 : 62;
  const filterAlign   = isAr ? "flex-end" : "flex-start";
  const filterInset   = isAr ? "right:8px;left:18px" : "left:8px;right:18px";

  /* POI colours */
  const POI_COLORS: Record<string, string> = {
    attraction: "#16A34A",
    hotel:      "#3B82F6",
    restaurant: "#EF4444",
    cafe:       "#92400E",
    apartment:  "#A855F7",
  };
  const poiColorsJson = JSON.stringify(POI_COLORS);

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html, body { height: 100%; margin: 0; padding: 0; background: #0f2040; }
#map { height: 100%; width: 100%; }

#err-box {
  display: none; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%); z-index: 9999;
  background: rgba(220,38,38,0.9); color: #fff;
  padding: 16px 20px; border-radius: 10px;
  font-family: -apple-system, sans-serif; font-size: 13px;
  max-width: 280px; text-align: center;
}

#filter-bar {
  position: absolute; top: 12px; ${filterInset};
  z-index: 1000; display: flex; flex-direction: row;
  justify-content: ${filterAlign};
  gap: 7px; overflow-x: auto; scrollbar-width: none;
  -webkit-overflow-scrolling: touch; flex-wrap: nowrap;
}
#filter-bar::-webkit-scrollbar { display: none; }
.fbtn {
  flex-shrink: 0; padding: 7px 14px; border-radius: 20px;
  background: rgba(8,18,36,0.90); color: #cbd5e1;
  font-size: 13px; font-family: -apple-system, sans-serif; font-weight: 700;
  border: 1.5px solid rgba(255,255,255,0.22); cursor: pointer;
  white-space: nowrap; -webkit-tap-highlight-color: transparent;
}
.fbtn.active { background: rgba(15,52,96,0.95); border-color: #C9A84C; color: #C9A84C; }
.fbtn.active-apt { background: rgba(60,20,110,0.95); border-color: #A855F7; color: #A855F7; }

#legend {
  position: absolute; bottom: ${legendBottom}px;
  ${isAr ? "left: 12px;" : "right: 12px;"}
  z-index: 1000; background: rgba(8,18,36,0.90);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; padding: 7px 11px;
  font-family: -apple-system, sans-serif;
}
.l-row { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; direction: ltr; }
.l-row:last-child { margin-bottom: 0; }
.ldot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.l-lbl { font-size: 10px; color: #e2e8f0; font-weight: 600; }

.spot-icon { overflow: visible !important; background: none !important; border: none !important; }
.spot-wrap { display: flex; flex-direction: column; align-items: center; transform: translate(-50%,-50%); }
.spot-pin {
  font-size: 22px; line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
}

.lf-popup .leaflet-popup-content-wrapper {
  background: #0f2040; border: 1.5px solid #C9A84C; border-radius: 14px;
  box-shadow: 0 8px 26px rgba(0,0,0,.65); color: #f1f5f9;
  font-family: -apple-system, sans-serif; padding: 0; direction: ${dir};
}
.lf-popup .leaflet-popup-tip-container { display: none; }
.lf-popup .leaflet-popup-content { margin: 14px 16px; min-width: 180px; max-width: 240px; }
.lf-popup .leaflet-popup-close-button { color: #94a3b8 !important; top: 8px; font-size: 20px; }
.pop-name { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 3px; }
.pop-city { font-size: 11px; color: #C9A84C; margin-bottom: 8px; }
.pop-btn  {
  display: block; text-align: center;
  background: #C9A84C; color: #0F2040; font-weight: 700;
  font-size: 12px; padding: 8px 12px; border-radius: 9px;
  text-decoration: none;
}

.leaflet-control-zoom { display: none !important; }
.leaflet-control-attribution {
  background: rgba(8,18,36,0.75) !important; color: #475569 !important; font-size: 9px !important;
}
.leaflet-control-attribution a { color: #C9A84C !important; }
</style>
</head>
<body>
<div id="err-box"></div>
<div id="map"></div>
<div id="filter-bar">
  <button class="fbtn active" id="btn-all"  onclick="doFilter('all',        this)">🌍 ${isAr ? "الكل"     : "All"    }</button>
  <button class="fbtn"        id="btn-att"  onclick="doFilter('attraction', this)">🏛 ${isAr ? "سياحة"   : "Tourism"}</button>
  <button class="fbtn"        id="btn-hot"  onclick="doFilter('hotel',      this)">🏨 ${isAr ? "فنادق"   : "Hotels" }</button>
  <button class="fbtn"        id="btn-rest" onclick="doFilter('restaurant', this)">🍽 ${isAr ? "مطاعم"   : "Rest."  }</button>
  <button class="fbtn"        id="btn-cafe" onclick="doFilter('cafe',       this)">☕ ${isAr ? "كافيهات" : "Cafes"  }</button>
  <button class="fbtn"        id="btn-apt"  onclick="doFilter('apartment',  this)">🏠 ${isAr ? "شقق"     : "Apts"   }</button>
</div>
<div id="legend">
  <div class="l-row"><span class="ldot" style="background:#6366F1"></span><span class="l-lbl">${isAr ? "موقعك" : "You"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#C9A84C"></span><span class="l-lbl">${isAr ? "أماكن" : "Spots"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#16A34A"></span><span class="l-lbl">${isAr ? "سياحة" : "Tourism"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#3B82F6"></span><span class="l-lbl">${isAr ? "فندق" : "Hotel"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#EF4444"></span><span class="l-lbl">${isAr ? "مطعم" : "Rest."}</span></div>
  <div class="l-row"><span class="ldot" style="background:#92400E"></span><span class="l-lbl">${isAr ? "كافيه" : "Cafe"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#A855F7"></span><span class="l-lbl">${isAr ? "شقق" : "Apt."}</span></div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var IS_AR           = ${isAr ? "true" : "false"};
  var USER_LAT        = ${lat};
  var USER_LNG        = ${lng};
  var INIT_ZOOM       = ${initialZoom};
  var SHOW_SPOTS      = ${showTourismSpots ? "true" : "false"};
  var API_BASE        = "${apiBase}";
  var POI_COLORS      = ${poiColorsJson};
  var SPOTS           = ${spotsJson};

  var errBox = document.getElementById('err-box');
  function showErr(msg) {
    if (errBox) { errBox.style.display = 'block'; errBox.textContent = msg; }
  }

  /* ── Map init (same pattern as HeatmapMapView) ── */
  var map, tourismLayer, poiLayer;
  try {
    map = L.map('map', {
      center: [USER_LAT, USER_LNG],
      zoom: INIT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tourismLayer = L.layerGroup().addTo(map);
    poiLayer     = L.layerGroup().addTo(map);

    /* User location marker */
    L.circleMarker([USER_LAT, USER_LNG], {
      radius: 9, fillColor: '#6366F1', color: '#fff',
      weight: 2.5, opacity: 1, fillOpacity: 0.95,
    }).bindPopup(IS_AR ? 'موقعك الحالي' : 'Your Location', { className: 'lf-popup' })
      .addTo(map);

  } catch (e) {
    showErr('Map init error: ' + e.message);
    return;
  }

  /* ── Tourism landmark spots ── */
  if (SHOW_SPOTS) {
    SPOTS.forEach(function (s) {
      var icon = L.divIcon({
        html: '<div class="spot-wrap"><span class="spot-pin">' + s.emoji + '</span></div>',
        className: 'spot-icon',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      var popHtml =
        '<div class="pop-name">' + (IS_AR ? s.nameAr : s.nameEn) + '</div>' +
        '<div class="pop-city">📍 ' + (IS_AR ? s.cityAr : s.cityEn) + '</div>' +
        '<a class="pop-btn" href="' + s.mapsUrl + '" target="_blank">🗺 ' +
        (IS_AR ? 'افتح الخريطة' : 'Open Maps') + '</a>';
      L.marker([s.lat, s.lng], { icon: icon })
        .bindPopup(popHtml, { className: 'lf-popup', maxWidth: 260, closeButton: true })
        .addTo(tourismLayer);
    });
  }

  /* ── POI from API ── */
  var currentType = null;

  function loadPoi(type) {
    if (!poiLayer) return;
    currentType = type;
    var url = API_BASE + '/api/poi?lat=' + USER_LAT + '&lng=' + USER_LNG + '&radius_km=20&limit=200';
    if (type && type !== 'all') url += '&type=' + type;
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        poiLayer.clearLayers();
        var places = data.places || [];
        places.forEach(function (p) {
          if (!p.lat || !p.lng) return;
          var clr = POI_COLORS[p.type] || '#94a3b8';
          var name = IS_AR ? (p.nameAr || p.nameEn || '') : (p.nameEn || p.nameAr || '');
          if (!name) name = IS_AR ? 'بدون اسم' : 'Unknown';
          L.circleMarker([p.lat, p.lng], {
            radius: 7, fillColor: clr, color: '#fff',
            weight: 1.5, opacity: 1, fillOpacity: 0.88,
          }).bindPopup('<div class="pop-name">' + name + '</div>', { className: 'lf-popup' })
            .addTo(poiLayer);
        });
      })
      .catch(function () { /* network unavailable — map still works */ });
  }

  loadPoi(null);

  /* ── Filter buttons ── */
  window.doFilter = function (type, btn) {
    document.querySelectorAll('.fbtn').forEach(function (b) {
      b.classList.remove('active', 'active-apt');
    });
    if (type === 'apartment') {
      btn.classList.add('active-apt');
    } else {
      btn.classList.add('active');
    }
    if (SHOW_SPOTS) {
      if (type === 'apartment') {
        map.removeLayer(tourismLayer);
      } else {
        map.addLayer(tourismLayer);
      }
    }
    loadPoi(type === 'all' ? null : type);
  };

})();
</script>
</body>
</html>`;
}

/* ── Component ──────────────────────────────────────────────────────────── */
const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

export default function TourismMapView({
  isAr             = false,
  apiBase          = "",
  userLat          = DEFAULT_LAT,
  userLng          = DEFAULT_LNG,
  hasTabs          = false,
  initialZoom      = 6,
  showTourismSpots = true,
}: Props) {
  const htmlRef = useRef("");
  const prevKey = useRef("");
  const key     = `${userLat.toFixed(4)}_${userLng.toFixed(4)}_${String(isAr)}_${String(hasTabs)}_${initialZoom}_${String(showTourismSpots)}`;

  if (!htmlRef.current || prevKey.current !== key) {
    prevKey.current = key;
    htmlRef.current = buildHtml({
      isAr, lat: userLat, lng: userLng,
      hasTabs, apiBase, initialZoom, showTourismSpots,
    });
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; url: string };
      if (msg.type === "openUrl" && msg.url) {
        void Linking.openURL(msg.url).catch(() => {});
      }
    } catch { /* ignore non-JSON messages */ }
  }

  return (
    <WebView
      source={{ html: htmlRef.current }}
      style={styles.webview}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      bounces={false}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#0f2040" },
});
