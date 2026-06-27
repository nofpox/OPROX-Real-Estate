/**
 * PropertyMapWebView — native (react-native-webview).
 * Perf optimisations:
 *  - HTML built once in useRef; WebView never reloads on re-render.
 *  - applyFilter uses CSS display toggle (not remove+re-add).
 *  - Ready-gate queues inject calls until map posts {type:"ready"}.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

// ── Coordinate tables ──────────────────────────────────────────────────────
const DISTRICT_COORDS: Record<string, [number, number]> = {
  // الرياض
  "الرياض__النرجس":             [24.774, 46.633],
  "الرياض__الملقا":             [24.761, 46.637],
  "الرياض__العليا":             [24.694, 46.682],
  "الرياض__الياسمين":           [24.802, 46.650],
  "الرياض__الصناعية":           [24.619, 46.722],
  "الرياض__الحمراء":            [24.678, 46.705],
  "الرياض__غرناطة":             [24.713, 46.675],
  "الرياض__قرطبة":              [24.725, 46.668],
  "الرياض__الوادي":             [24.752, 46.717],
  "الرياض__النخيل":             [24.778, 46.704],
  "الرياض__الدائري الشمالي":    [24.810, 46.720],
  "الرياض__السلام":             [24.660, 46.753],
  "الرياض__العزيزية":           [24.642, 46.728],
  "الرياض__الروضة":             [24.683, 46.659],
  "الرياض__الشميسي":            [24.655, 46.697],
  "الرياض__المونسية":           [24.740, 46.760],
  "الرياض__الصحافة":            [24.785, 46.671],
  "الرياض__الرائد":             [24.722, 46.792],
  // جدة
  "جدة__الروضة":                [21.553, 39.172],
  "جدة__التعمير":               [21.527, 39.183],
  "جدة__الشاطئ":                [21.543, 39.173],
  "جدة__الزهراء":               [21.582, 39.155],
  "جدة__النزهة":                [21.520, 39.205],
  "جدة__المرجان":               [21.490, 39.175],
  "جدة__البلد":                 [21.486, 39.189],
  "جدة__الكورنيش":              [21.570, 39.110],
  "جدة__الفيصلية":              [21.538, 39.140],
  "جدة__السامر":                [21.625, 39.132],
  "جدة__الصفا":                 [21.505, 39.220],
  "جدة__أبحر الشمالية":         [21.645, 39.098],
  // الدمام
  "الدمام__الشاطئ":             [26.452, 50.046],
  "الدمام__الراكة":             [26.427, 50.082],
  "الدمام__الراكة الشمالية":    [24.446, 50.073],
  "الدمام__العزيزية":           [26.421, 50.089],
  "الدمام__الدوحة":             [26.380, 50.120],
  // الخبر
  "الخبر__الكورنيش":            [26.300, 50.192],
  "الخبر__الأمواج":             [26.272, 50.212],
  "الخبر__الصفا":               [26.217, 50.197],
  "الخبر__العقربية":            [26.288, 50.205],
  // القطيف
  "القطيف__العنود":             [26.527, 49.996],
  // مكة المكرمة
  "مكة المكرمة__العزيزية":      [21.362, 39.848],
  "مكة المكرمة__أجياد":         [21.420, 39.828],
  "مكة المكرمة__شيشة":          [21.405, 39.880],
  "مكة المكرمة__النوارية":      [21.360, 39.910],
  "مكة المكرمة__المسفلة":       [21.428, 39.852],
  // المدينة المنورة
  "المدينة المنورة__الورود":    [24.523, 39.574],
  "المدينة المنورة__قربان":     [24.469, 39.614],
  "المدينة المنورة__الشيخان":   [24.490, 39.635],
  "المدينة المنورة__العوالي":   [24.445, 39.580],
  // أبها وعسير
  "أبها__الوسام":               [18.216, 42.505],
  "أبها__العزيزية":             [18.235, 42.520],
  "أبها__الشفا":                [18.180, 42.478],
  "خميس مشيط__الريان":          [18.310, 42.730],
  // تبوك
  "تبوك__الروابي":              [28.399, 36.566],
  "تبوك__الصالحية":             [28.383, 36.580],
  "تبوك__شرما":                 [28.050, 35.200],
  // القصيم
  "بريدة__الحزم":               [26.328, 43.975],
  "بريدة__الملك فهد":           [26.350, 43.990],
  "عنيزة__الصناعية":            [26.099, 43.991],
  // الطائف
  "الطائف__الهضيبة":            [21.280, 40.420],
  "الطائف__الشفا":              [21.218, 40.348],
};
const CITY_COORDS: Record<string, [number, number]> = {
  "الرياض":           [24.7136, 46.6753],
  "جدة":              [21.4858, 39.1925],
  "الدمام":           [26.4207, 50.0888],
  "مكة المكرمة":      [21.3891, 39.8579],
  "الخبر":            [26.2172, 50.1971],
  "المدينة المنورة":  [24.5247, 39.5692],
  "الطائف":           [21.2827, 40.4146],
  "أبها":             [18.2164, 42.5053],
  "خميس مشيط":        [18.3100, 42.7300],
  "تبوك":             [28.3992, 36.5662],
  "بريدة":            [26.3282, 43.9750],
  "عنيزة":            [26.0990, 43.9910],
  "القطيف":           [26.5270, 49.9960],
  "الأحساء":          [25.3800, 49.5900],
  "العُلا":           [26.6358, 37.9312],
};

export interface MapListing {
  id: string; type: string; city: string; district: string;
  price: number; area: number; bedrooms?: number; badge?: string;
}
interface EnrichedListing extends MapListing { lat: number; lng: number; }

function resolveCoords(listings: MapListing[]): EnrichedListing[] {
  const idx: Record<string, number> = {};
  return listings.map((l) => {
    const key  = `${l.city}__${l.district}`;
    const n    = idx[key] ?? 0; idx[key] = n + 1;
    const base = DISTRICT_COORDS[key] ?? CITY_COORDS[l.city] ?? [24.7136, 46.6753];
    const angle = n * 2.399;
    const r     = n === 0 ? 0 : 0.014 + Math.floor(n / 5) * 0.009;
    return { ...l, lat: base[0] + Math.cos(angle) * r, lng: base[1] + Math.sin(angle) * r };
  });
}

function buildHTML(listings: EnrichedListing[]): string {
  const data = JSON.stringify(listings);
  return `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body,#map{width:100%;height:100%;overflow:hidden}
.leaflet-container{background:#d4d4d4}
.leaflet-attribution-flag,.leaflet-control-attribution{display:none!important}
.pb{display:inline-block;background:#22c55e;color:#fff;border:2.5px solid #16a34a;border-radius:14px;padding:5px 12px;font-size:13px;font-weight:700;font-family:-apple-system,Arial,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.28);transform:translateX(-50%);user-select:none;-webkit-user-select:none;}
.pb.gold{background:#D4A843;border-color:#b8902e;color:#0f2040}
.pb.sel{border-color:#fff;border-width:3px;box-shadow:0 0 0 2px #22c55e,0 3px 10px rgba(0,0,0,0.4);transform:translateX(-50%) scale(1.1)}
.pb.gold.sel{box-shadow:0 0 0 2px #D4A843,0 3px 10px rgba(0,0,0,0.4)}
</style>
</head>
<body><div id="map"></div>
<script>
var ALL=${data};
var markers={};
var selId=null;

// Pre-build id→listing lookup for O(1) type checks
var BYID={};ALL.forEach(function(p){BYID[p.id]=p;});

var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([23.8,44.8],6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(map);

function fmt(n){
  if(n>=1000000){var v=n/1000000;return(v%1===0?v.toFixed(0):v.toFixed(1))+' م';}
  if(n>=1000)return Math.round(n/1000)+' ألف';
  return String(n);
}
function post(obj){
  try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  else window.parent.postMessage(JSON.stringify(obj),'*');}catch(e){}
}

function addMarker(p){
  var isGold=p.price>=5000000||p.badge;
  var el=document.createElement('div');
  el.className='pb'+(isGold?' gold':'');
  el.id='pb_'+p.id;
  el.textContent=fmt(p.price);
  var icon=L.divIcon({html:el,className:'',iconSize:null,iconAnchor:[0,0]});
  var m=L.marker([p.lat,p.lng],{icon:icon,interactive:true});
  m.on('click',function(e){L.DomEvent.stopPropagation(e);setSelected(p.id);post({type:'select',id:p.id});});
  m.addTo(map);
  markers[p.id]=m;
}

function setSelected(id){
  if(selId){var prev=document.getElementById('pb_'+selId);if(prev)prev.classList.remove('sel');}
  selId=id;
  var el=document.getElementById('pb_'+id);if(el)el.classList.add('sel');
}

// CSS show/hide — far cheaper than remove+re-add
function applyFilter(typeId){
  if(selId){var prev=document.getElementById('pb_'+selId);if(prev)prev.classList.remove('sel');}
  selId=null;
  Object.keys(markers).forEach(function(id){
    var p=BYID[id];
    var show=(typeId==='all'||p.type===typeId);
    var el=markers[id].getElement();
    if(el)el.style.display=show?'':'none';
  });
  post({type:'deselect'});
}

// Initial render — add all markers once
ALL.forEach(addMarker);

map.on('click',function(){
  if(selId){var el=document.getElementById('pb_'+selId);if(el)el.classList.remove('sel');}
  selId=null;post({type:'deselect'});
});

document.addEventListener('message',function(e){onMsg(e.data);});
window.addEventListener('message',function(e){onMsg(e.data);});
function onMsg(raw){
  try{
    var d=JSON.parse(raw);
    if(d.type==='filter')applyFilter(d.value);
    if(d.type==='locate'){
      map.setView([d.lat,d.lng],15);
      if(window._ld)window._ld.remove();
      window._ld=L.circleMarker([d.lat,d.lng],{radius:9,color:'#fff',weight:2,fillColor:'#3b82f6',fillOpacity:1}).addTo(map);
    }
  }catch(e){}
}

post({type:'ready'});
<\/script>
</body></html>`;
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  listings:      MapListing[];
  activeFilter:  string;
  onSelect:      (id: string) => void;
  onDeselect:    () => void;
  centerCoords?: { lat: number; lng: number };
}

export default function PropertyMapWebView({ listings, activeFilter, onSelect, onDeselect, centerCoords }: Props) {
  const wvRef      = useRef<WebView>(null);
  const isReady    = useRef(false);
  const prevFilter = useRef("all");
  const pendingFilter  = useRef<string | null>(null);
  const pendingLocate  = useRef<{ lat: number; lng: number } | null>(null);

  // Build HTML exactly once — prevents WebView reload on parent re-render
  const htmlRef = useRef<string | null>(null);
  if (!htmlRef.current) htmlRef.current = buildHTML(resolveCoords(listings));

  function inject(js: string) { wvRef.current?.injectJavaScript(js + ";true;"); }

  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (isReady.current) inject(`applyFilter(${JSON.stringify(activeFilter)})`);
    else pendingFilter.current = activeFilter;
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!centerCoords) return;
    if (isReady.current) inject(`map.setView([${centerCoords.lat},${centerCoords.lng}],15);if(window._ld)window._ld.remove();window._ld=L.circleMarker([${centerCoords.lat},${centerCoords.lng}],{radius:9,color:'#fff',weight:2,fillColor:'#3b82f6',fillOpacity:1}).addTo(map)`);
    else pendingLocate.current = centerCoords;
  }, [centerCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { type: string; id?: string };
      if (data.type === "ready") {
        isReady.current = true;
        if (pendingFilter.current) { inject(`applyFilter(${JSON.stringify(pendingFilter.current)})`); pendingFilter.current = null; }
        if (pendingLocate.current) { const c = pendingLocate.current; inject(`map.setView([${c.lat},${c.lng}],15)`); pendingLocate.current = null; }
      }
      if (data.type === "select"   && data.id) onSelect(data.id);
      if (data.type === "deselect") onDeselect();
    } catch {}
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
        source={{ html: htmlRef.current }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onMessage={handleMessage}
        style={s.wv}
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}

const s = StyleSheet.create({ wv: { flex: 1, backgroundColor: "transparent" } });
