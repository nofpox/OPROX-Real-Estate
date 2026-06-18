/**
 * PropertyMapWebView — web shim (Metro picks .web.tsx).
 * Perf optimisations:
 *  - HTML built once in useRef; iframe never reloads on re-render.
 *  - applyFilter uses CSS display toggle (not remove+re-add).
 *  - Ready-gate queues postMessage calls until map posts {type:"ready"}.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

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
.pb{display:inline-block;background:#22c55e;color:#fff;border:2.5px solid #16a34a;border-radius:14px;padding:5px 12px;font-size:13px;font-weight:700;font-family:-apple-system,Arial,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.28);transform:translateX(-50%);user-select:none;}
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
var BYID={};ALL.forEach(function(p){BYID[p.id]=p;});

var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([23.8,44.8],6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(map);

function fmt(n){
  if(n>=1000000){var v=n/1000000;return(v%1===0?v.toFixed(0):v.toFixed(1))+' م';}
  if(n>=1000)return Math.round(n/1000)+' ألف';
  return String(n);
}
function post(obj){try{window.parent.postMessage(JSON.stringify(obj),'*');}catch(e){}}

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

ALL.forEach(addMarker);

map.on('click',function(){
  if(selId){var el=document.getElementById('pb_'+selId);if(el)el.classList.remove('sel');}
  selId=null;post({type:'deselect'});
});

window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='filter')applyFilter(d.value);
    if(d.type==='locate'){
      map.setView([d.lat,d.lng],15);
      if(window._ld)window._ld.remove();
      window._ld=L.circleMarker([d.lat,d.lng],{radius:9,color:'#fff',weight:2,fillColor:'#3b82f6',fillOpacity:1}).addTo(map);
    }
  }catch(e){}
});

post({type:'ready'});
<\/script>
</body></html>`;
}

interface Props {
  listings:      MapListing[];
  activeFilter:  string;
  onSelect:      (id: string) => void;
  onDeselect:    () => void;
  centerCoords?: { lat: number; lng: number };
}

export default function PropertyMapWebView({ listings, activeFilter, onSelect, onDeselect, centerCoords }: Props) {
  const iframeRef     = useRef<HTMLIFrameElement>(null);
  const isReady       = useRef(false);
  const prevFilter    = useRef("all");
  const pendingFilter = useRef<string | null>(null);
  const pendingLocate = useRef<{ lat: number; lng: number } | null>(null);

  // Build HTML exactly once — prevents iframe reload on parent re-render
  const htmlRef = useRef<string | null>(null);
  if (!htmlRef.current) htmlRef.current = buildHTML(resolveCoords(listings));

  function pm(msg: object) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
  }

  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (isReady.current) pm({ type: "filter", value: activeFilter });
    else pendingFilter.current = activeFilter;
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!centerCoords) return;
    if (isReady.current) pm({ type: "locate", lat: centerCoords.lat, lng: centerCoords.lng });
    else pendingLocate.current = centerCoords;
  }, [centerCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      try {
        const data = JSON.parse(e.data as string) as { type: string; id?: string };
        if (data.type === "ready") {
          isReady.current = true;
          if (pendingFilter.current) { pm({ type: "filter", value: pendingFilter.current }); pendingFilter.current = null; }
          if (pendingLocate.current) { pm({ type: "locate", lat: pendingLocate.current.lat, lng: pendingLocate.current.lng }); pendingLocate.current = null; }
        }
        if (data.type === "select"   && data.id) onSelect(data.id);
        if (data.type === "deselect") onDeselect();
      } catch {}
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onSelect, onDeselect]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <iframe
        ref={iframeRef as any}
        srcDoc={htmlRef.current ?? ""}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="property-map"
      />
    </View>
  );
}

const s = StyleSheet.create({ wv: { flex: 1 } });
void s;
