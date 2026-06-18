/**
 * TourismMapWebView — native (react-native-webview).
 * Static spots: mosque/heritage/nature/entertainment/hotel (from props).
 * Dynamic spots: restaurant/cafe/mall/hotel/apartment fetched live from Overpass API at zoom ≥ 11.
 * Ready-gate: waits for {type:"ready"} before injecting commands.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

export interface TouristSpot {
  id:     string;
  type:   "mosque" | "heritage" | "nature" | "entertainment" | "hotel" | "restaurant" | "cafe" | "mall" | "apartment" | "serviced";
  nameAr: string;
  city:   string;
  lat:    number;
  lng:    number;
  desc:   string;
}

export interface SelectedSpotData {
  id:      string;
  type:    TouristSpot["type"];
  nameAr:  string;
  city:    string;
  desc:    string;
  lat:     number;
  lng:     number;
}

const CATEGORY_COLOR: Record<TouristSpot["type"], string> = {
  mosque:        "#22c55e",
  heritage:      "#f59e0b",
  nature:        "#06b6d4",
  entertainment: "#8b5cf6",
  hotel:         "#3b82f6",
  restaurant:    "#f97316",
  cafe:          "#ec4899",
  mall:          "#6366f1",
  apartment:     "#14b8a6",
  serviced:      "#f43f5e",
};

function buildHTML(spots: TouristSpot[]): string {
  const data    = JSON.stringify(spots);
  const colors  = JSON.stringify(CATEGORY_COLOR);
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
.leaflet-container{background:#e8ecf0}
.leaflet-control-attribution,.leaflet-attribution-flag{display:none!important}
.cd{border-radius:50%;border:3px solid rgba(255,255,255,0.9);cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 8px rgba(0,0,0,0.35);}
.cd.sel{transform:scale(1.35);box-shadow:0 4px 16px rgba(0,0,0,0.55);}
.lbl{background:rgba(15,32,64,0.88);color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:8px;white-space:nowrap;pointer-events:none;font-family:system-ui,sans-serif;}
#loader{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,14,26,0.85);color:#fff;font-size:13px;padding:10px 18px;border-radius:20px;font-family:system-ui,sans-serif;z-index:9999;pointer-events:none;}
#zoomhint{display:none;position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(10,14,26,0.82);color:rgba(255,255,255,0.85);font-size:12px;padding:7px 14px;border-radius:14px;font-family:system-ui,sans-serif;z-index:9999;pointer-events:none;white-space:nowrap;}
</style>
</head>
<body>
<div id="map"></div>
<div id="loader">⏳ جارٍ التحميل...</div>
<div id="zoomhint">🔍 قرّب الخريطة لرؤية الأماكن</div>
<script>
var ALL=${data};
var COLORS=${colors};
var STATIC_TYPES=['mosque','heritage','nature','entertainment','hotel'];
var DYNAMIC_TYPES=['restaurant','cafe','mall','hotel','apartment','serviced'];
var OVERPASS_Q={
  restaurant:'node["amenity"="restaurant"]',
  cafe:'node["amenity"="cafe"]',
  mall:'node["shop"="mall"]',
  hotel:'node["tourism"="hotel"]',
  apartment:'node["tourism"="apartment"]',
  serviced:'node["tourism"="serviced_apartment"]'
};
var MIN_ZOOM=11;
var sM={},dM={},selId=null,curFilter='all',fetchTimer=null;

var map=L.map('map',{center:[23.8859,45.0792],zoom:5,zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);

function post(obj){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(obj));else window.parent.postMessage(JSON.stringify(obj),'*');}catch(e){}}
function mkIcon(color,sz){var h=sz||30,hh=h/2;return L.divIcon({html:'<div class="cd" style="width:'+h+'px;height:'+h+'px;background:'+color+'"></div>',className:'',iconSize:[h,h],iconAnchor:[hh,hh]});}
function mkLbl(text){return L.divIcon({html:'<div class="lbl">'+text+'</div>',className:'',iconAnchor:[-6,-20]});}

function clearSel(){document.querySelectorAll('.cd.sel').forEach(function(el){el.classList.remove('sel');});selId=null;}

function addSM(spot){
  var color=COLORS[spot.type]||'#888',sz=spot.type==='mosque'?36:30;
  var m=L.marker([spot.lat,spot.lng],{icon:mkIcon(color,sz)});
  var lb=L.marker([spot.lat,spot.lng],{icon:mkLbl(spot.nameAr),interactive:false,zIndexOffset:-1});
  m.on('click',function(e){
    L.DomEvent.stopPropagation(e);clearSel();selId=spot.id;
    var el=m.getElement();if(el)el.querySelector('.cd').classList.add('sel');
    map.panTo([spot.lat,spot.lng],{animate:true,duration:0.5});
    post({type:'select',id:spot.id,spotType:spot.type,nameAr:spot.nameAr,city:spot.city,desc:spot.desc,lat:spot.lat,lng:spot.lng});
  });
  m.addTo(map);lb.addTo(map);sM[spot.id]={m:m,l:lb};
}
function clearSM(){Object.values(sM).forEach(function(p){map.removeLayer(p.m);map.removeLayer(p.l);});sM={};}

function addDM(id,type,name,city,lat,lng){
  var key='d'+id;if(dM[key])return;
  var color=COLORS[type]||'#888';
  var m=L.marker([lat,lng],{icon:mkIcon(color,24)});
  var lb=L.marker([lat,lng],{icon:mkLbl(name),interactive:false,zIndexOffset:-1});
  m.on('click',function(e){
    L.DomEvent.stopPropagation(e);clearSel();selId=key;
    var el=m.getElement();if(el)el.querySelector('.cd').classList.add('sel');
    map.panTo([lat,lng],{animate:true,duration:0.5});
    post({type:'select',id:key,spotType:type,nameAr:name,city:city,desc:'',lat:lat,lng:lng});
  });
  m.addTo(map);lb.addTo(map);dM[key]={m:m,l:lb};
}
function clearDM(){Object.values(dM).forEach(function(p){map.removeLayer(p.m);map.removeLayer(p.l);});dM={};}

function osmType(tags){
  if(tags.amenity==='restaurant')return 'restaurant';
  if(tags.amenity==='cafe'||tags.amenity==='coffee_shop')return 'cafe';
  if(tags.shop==='mall'||tags.building==='mall')return 'mall';
  if(tags.tourism==='hotel')return 'hotel';
  if(tags.tourism==='serviced_apartment')return 'serviced';
  if(tags.tourism==='apartment'||tags.tourism==='guest_house')return 'apartment';
  return null;
}

var loader=document.getElementById('loader');
var zoomhint=document.getElementById('zoomhint');

function fetchDynamic(){
  var needDyn=(curFilter==='all'||DYNAMIC_TYPES.indexOf(curFilter)>=0);
  if(!needDyn){clearDM();return;}
  if(map.getZoom()<MIN_ZOOM){
    clearDM();
    if(needDyn)zoomhint.style.display='block';
    return;
  }
  zoomhint.style.display='none';
  var b=map.getBounds();
  var bbox=b.getSouth().toFixed(4)+','+b.getWest().toFixed(4)+','+b.getNorth().toFixed(4)+','+b.getEast().toFixed(4);
  var types=(curFilter==='all')?DYNAMIC_TYPES:[curFilter];
  var ql='[out:json][timeout:20];('+types.map(function(t){return OVERPASS_Q[t]+'('+bbox+');';}).join('')+');out body 300;';
  loader.style.display='block';
  fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:ql})
    .then(function(r){return r.json();})
    .then(function(d){
      clearDM();
      d.elements.forEach(function(el){
        if(!el.lat||!el.lon)return;
        var name=(el.tags['name:ar']||el.tags.name||'').trim();
        if(!name||name.length<2)return;
        var t=osmType(el.tags);if(!t)return;
        if(curFilter!=='all'&&t!==curFilter)return;
        var city=el.tags['addr:city']||el.tags['addr:suburb']||'';
        addDM(el.id,t,name,city,el.lat,el.lon);
      });
      loader.style.display='none';
      post({type:'loading',value:false});
    })
    .catch(function(){loader.style.display='none';post({type:'loading',value:false});});
  post({type:'loading',value:true});
}

function scheduleFetch(){clearTimeout(fetchTimer);fetchTimer=setTimeout(fetchDynamic,900);}

function applyFilter(typeId){
  curFilter=typeId;clearSel();clearSM();
  var showSt=(typeId==='all'||STATIC_TYPES.indexOf(typeId)>=0);
  if(showSt){(typeId==='all'?ALL:ALL.filter(function(s){return s.type===typeId;})).forEach(addSM);}
  clearDM();zoomhint.style.display='none';
  var showDyn=(typeId==='all'||DYNAMIC_TYPES.indexOf(typeId)>=0);
  if(showDyn)scheduleFetch();
}

function doLocate(lat,lng){
  map.setView([lat,lng],14);
  if(window._ld)window._ld.remove();
  window._ld=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:2,fillColor:'#3b82f6',fillOpacity:1}).addTo(map);
}

applyFilter('all');
map.on('click',function(){clearSel();post({type:'deselect'});});
map.on('moveend',scheduleFetch);
map.on('zoomend',scheduleFetch);

window.addEventListener('message',function(e){
  try{var d=JSON.parse(e.data);if(d.type==='filter')applyFilter(d.value);if(d.type==='locate')doLocate(d.lat,d.lng);}catch(e){}
});
post({type:'ready'});
<\/script>
</body></html>`;
}

interface Props {
  spots:         TouristSpot[];
  activeFilter:  string;
  onSelect:      (spot: SelectedSpotData) => void;
  onDeselect:    () => void;
  onLoadingChange?: (loading: boolean) => void;
  centerCoords?: { lat: number; lng: number };
}

export default function TourismMapWebView({ spots, activeFilter, onSelect, onDeselect, onLoadingChange, centerCoords }: Props) {
  const wvRef         = useRef<WebView>(null);
  const html          = useRef(buildHTML(spots)).current;
  const prevFilter    = useRef("all");
  const isReady       = useRef(false);
  const pendingLocate = useRef<{ lat: number; lng: number } | null>(null);

  function inject(js: string) { wvRef.current?.injectJavaScript(js + ";true;"); }
  function injectLocate(lat: number, lng: number) { inject(`doLocate(${lat},${lng})`); }

  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (isReady.current) inject(`applyFilter(${JSON.stringify(activeFilter)})`);
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!centerCoords) return;
    if (isReady.current) injectLocate(centerCoords.lat, centerCoords.lng);
    else pendingLocate.current = centerCoords;
  }, [centerCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const raw = JSON.parse(e.nativeEvent.data) as Record<string, unknown>;
      if (raw.type === "ready") {
        isReady.current = true;
        if (pendingLocate.current) { injectLocate(pendingLocate.current.lat, pendingLocate.current.lng); pendingLocate.current = null; }
        if (prevFilter.current !== "all") inject(`applyFilter(${JSON.stringify(prevFilter.current)})`);
      }
      if (raw.type === "select") onSelect({
        id:     raw.id      as string,
        type:   raw.spotType as TouristSpot["type"],
        nameAr: raw.nameAr  as string,
        city:   raw.city    as string,
        desc:   raw.desc    as string,
        lat:    raw.lat     as number,
        lng:    raw.lng     as number,
      });
      if (raw.type === "deselect") onDeselect();
      if (raw.type === "loading") onLoadingChange?.(raw.value as boolean);
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
        style={{ flex: 1, backgroundColor: "transparent" }}
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}
