/**
 * TourismMapWebView — web shim (Metro picks .web.tsx automatically).
 * Uses <iframe srcdoc> instead of react-native-webview.
 * Ready-gate: waits for {type:"ready"} from iframe before sending locate/filter.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

export interface TouristSpot {
  id:     string;
  type:   "mosque" | "heritage" | "nature" | "entertainment" | "hotel" | "restaurant" | "cafe" | "mall" | "apartment";
  nameAr: string;
  city:   string;
  lat:    number;
  lng:    number;
  desc:   string;
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
};

function buildHTML(spots: TouristSpot[]): string {
  const data = JSON.stringify(spots);
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
.leaflet-control-attribution{display:none}
.leaflet-attribution-flag{display:none!important}
.cd{border-radius:50%;border:3px solid rgba(255,255,255,0.9);cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 8px rgba(0,0,0,0.35);}
.cd.sel{transform:scale(1.35);box-shadow:0 4px 16px rgba(0,0,0,0.55);}
.lbl{background:rgba(15,32,64,0.88);color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:8px;white-space:nowrap;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;}
</style>
</head>
<body>
<div id="map"></div>
<script>
var ALL=${data};
var COLORS=${JSON.stringify(CATEGORY_COLOR)};
var map=L.map('map',{center:[23.8859,45.0792],zoom:5,zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
var markers={};var selId=null;
function post(obj){try{window.parent.postMessage(JSON.stringify(obj),'*');}catch(e){}}
function makeIcon(spot){var color=COLORS[spot.type]||'#22c55e';var size=spot.type==='mosque'?36:30;var half=size/2;return L.divIcon({html:'<div class="cd" style="width:'+size+'px;height:'+size+'px;background:'+color+';"></div>',className:'',iconSize:[size,size],iconAnchor:[half,half]});}
function addMarker(spot){
  var m=L.marker([spot.lat,spot.lng],{icon:makeIcon(spot)});
  var label=L.marker([spot.lat,spot.lng],{icon:L.divIcon({html:'<div class="lbl">'+spot.nameAr+'</div>',className:'',iconAnchor:[-6,-20]}),interactive:false,zIndexOffset:-1});
  m.on('click',function(e){L.DomEvent.stopPropagation(e);if(selId&&markers[selId]){var el=markers[selId].m.getElement();if(el)el.querySelector('.cd').classList.remove('sel');}selId=spot.id;var el=m.getElement();if(el)el.querySelector('.cd').classList.add('sel');map.panTo([spot.lat,spot.lng],{animate:true,duration:0.5});post({type:'select',id:spot.id});});
  m.addTo(map);label.addTo(map);markers[spot.id]={m:m,l:label};
}
function applyFilter(typeId){Object.values(markers).forEach(function(p){map.removeLayer(p.m);map.removeLayer(p.l);});markers={};selId=null;var list=typeId==='all'?ALL:ALL.filter(function(s){return s.type===typeId;});list.forEach(addMarker);}
function doLocate(lat,lng){map.setView([lat,lng],13);if(window._locDot)window._locDot.remove();window._locDot=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:2,fillColor:'#3b82f6',fillOpacity:1}).addTo(map);}
applyFilter('all');
map.on('click',function(){if(selId&&markers[selId]){var el=markers[selId].m.getElement();if(el)el.querySelector('.cd').classList.remove('sel');}selId=null;post({type:'deselect'});});
window.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='filter')applyFilter(d.value);if(d.type==='locate')doLocate(d.lat,d.lng);}catch(e){}});
/* Signal parent that map is ready */
post({type:'ready'});
<\/script>
</body></html>`;
}

interface Props {
  spots:         TouristSpot[];
  activeFilter:  string;
  onSelect:      (id: string) => void;
  onDeselect:    () => void;
  centerCoords?: { lat: number; lng: number };
}

export default function TourismMapWebView({ spots, activeFilter, onSelect, onDeselect, centerCoords }: Props) {
  const iframeRef     = useRef<HTMLIFrameElement>(null);
  const html          = buildHTML(spots);
  const prevFilter    = useRef("all");
  const isReady       = useRef(false);
  const pendingLocate = useRef<{ lat: number; lng: number } | null>(null);

  function sendLocate(lat: number, lng: number) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type: "locate", lat, lng }), "*");
  }

  useEffect(() => {
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (isReady.current) {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type: "filter", value: activeFilter }), "*");
    }
  }, [activeFilter]);

  useEffect(() => {
    if (!centerCoords) return;
    if (isReady.current) {
      sendLocate(centerCoords.lat, centerCoords.lng);
    } else {
      pendingLocate.current = centerCoords;
    }
  }, [centerCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      try {
        const data = JSON.parse(e.data as string) as { type: string; id?: string };
        if (data.type === "ready") {
          isReady.current = true;
          if (pendingLocate.current) {
            sendLocate(pendingLocate.current.lat, pendingLocate.current.lng);
            pendingLocate.current = null;
          }
          if (prevFilter.current !== "all") {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ type: "filter", value: prevFilter.current }), "*"
            );
          }
        }
        if (data.type === "select" && data.id) onSelect(data.id);
        if (data.type === "deselect")           onDeselect();
      } catch {}
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onSelect, onDeselect]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <iframe
        ref={iframeRef as any}
        srcDoc={html}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="tourism-map"
      />
    </View>
  );
}
