/**
 * PropertyMapWebView — Leaflet map in a WebView.
 * Price bubbles are pure DOM (DivIcon) → zero clipping issues on Android.
 * Filter updates via injectJavaScript — no full reload needed.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

// ── Coordinate tables ──────────────────────────────────────────────────────
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

export interface MapListing {
  id: string;
  type: string;
  city: string;
  district: string;
  price: number;
  area: number;
  bedrooms?: number;
  badge?: string;
}
interface EnrichedListing extends MapListing { lat: number; lng: number; }

function resolveCoords(listings: MapListing[]): EnrichedListing[] {
  const idx: Record<string, number> = {};
  return listings.map((l) => {
    const key = `${l.city}__${l.district}`;
    const n   = idx[key] ?? 0;
    idx[key]  = n + 1;
    const base = DISTRICT_COORDS[key] ?? CITY_COORDS[l.city] ?? [24.7136, 46.6753];
    const angle = n * 2.399;
    const r = n === 0 ? 0 : 0.014 + Math.floor(n / 5) * 0.009;
    return { ...l, lat: base[0] + Math.cos(angle) * r, lng: base[1] + Math.sin(angle) * r };
  });
}

// ── Build the full Leaflet HTML string ────────────────────────────────────
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
.leaflet-attribution-flag{display:none!important}
.leaflet-control-attribution{display:none}
/* ── Price bubble ─────────────────── */
.pb{
  display:inline-block;
  background:#22c55e;
  color:#fff;
  border:2.5px solid #16a34a;
  border-radius:14px;
  padding:5px 12px;
  font-size:13px;
  font-weight:700;
  font-family:-apple-system,Arial,sans-serif;
  white-space:nowrap;
  cursor:pointer;
  box-shadow:0 2px 6px rgba(0,0,0,0.28);
  transform:translateX(-50%);
  user-select:none;
  -webkit-user-select:none;
}
.pb.gold{background:#D4A843;border-color:#b8902e;color:#0f2040}
.pb.sel{border-color:#fff;border-width:3px;box-shadow:0 0 0 2px #22c55e,0 3px 10px rgba(0,0,0,0.4);transform:translateX(-50%) scale(1.1)}
.pb.gold.sel{box-shadow:0 0 0 2px #D4A843,0 3px 10px rgba(0,0,0,0.4)}
</style>
</head>
<body>
<div id="map"></div>
<script>
var ALL = ${data};
var markers = {};
var selId   = null;

var map = L.map('map',{zoomControl:false,attributionControl:false})
           .setView([23.8,44.8],6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  {subdomains:'abcd',maxZoom:19}).addTo(map);

function fmt(n){
  if(n>=1000000){var v=n/1000000;return(v%1===0?v.toFixed(0):v.toFixed(1))+' م';}
  if(n>=1000)return Math.round(n/1000)+' ألف';
  return String(n);
}

function post(obj){
  try{
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    else window.parent.postMessage(JSON.stringify(obj),'*');
  }catch(e){}
}

function makeBubble(p){
  var isGold=p.price>=5000000||p.badge;
  var div=document.createElement('div');
  div.className='pb'+(isGold?' gold':'');
  div.id='pb_'+p.id;
  div.textContent=fmt(p.price);
  return div;
}

function addMarker(p){
  var el=makeBubble(p);
  var icon=L.divIcon({html:el,className:'',iconSize:null,iconAnchor:[0,0]});
  var m=L.marker([p.lat,p.lng],{icon:icon,interactive:true});
  m.on('click',function(e){
    L.DomEvent.stopPropagation(e);
    setSelected(p.id);
    post({type:'select',id:p.id});
  });
  m.addTo(map);
  markers[p.id]=m;
}

function setSelected(id){
  if(selId){var prev=document.getElementById('pb_'+selId);if(prev)prev.classList.remove('sel');}
  selId=id;
  var el=document.getElementById('pb_'+id);
  if(el)el.classList.add('sel');
}

function applyFilter(typeId){
  Object.values(markers).forEach(function(m){map.removeLayer(m);});
  markers={};
  selId=null;
  var list=typeId==='all'?ALL:ALL.filter(function(p){return p.type===typeId;});
  list.forEach(addMarker);
}

applyFilter('all');

map.on('click',function(){
  if(selId){var el=document.getElementById('pb_'+selId);if(el)el.classList.remove('sel');}
  selId=null;
  post({type:'deselect'});
});

function onMsg(raw){
  try{
    var d=JSON.parse(raw);
    if(d.type==='filter') applyFilter(d.value);
  }catch(e){}
}
document.addEventListener('message',function(e){onMsg(e.data);});
window.addEventListener('message',function(e){onMsg(e.data);});
<\/script>
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  listings:    MapListing[];
  activeFilter: string;
  onSelect:    (id: string) => void;
  onDeselect:  () => void;
}

export default function PropertyMapWebView({ listings, activeFilter, onSelect, onDeselect }: Props) {
  const wvRef     = useRef<WebView>(null);
  const enriched  = resolveCoords(listings);
  const html      = buildHTML(enriched);

  // Send filter update to Leaflet JS whenever activeFilter changes
  // (after initial load – the first render already has 'all' set in JS)
  const prevFilter = useRef<string>("all");
  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    wvRef.current?.injectJavaScript(`applyFilter(${JSON.stringify(activeFilter)});true;`);
  }, [activeFilter]);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { type: string; id?: string };
      if (data.type === "select" && data.id) onSelect(data.id);
      if (data.type === "deselect")           onDeselect();
    } catch {}
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onMessage={handleMessage}
        style={s.wv}
        // keeps the view static — avoids keyboard-triggered layout jumps
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wv: { flex: 1, backgroundColor: "transparent" },
});
