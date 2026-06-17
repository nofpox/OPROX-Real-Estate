/**
 * TourismMapView — NATIVE (Android + iOS)
 *
 * Builds the full Leaflet HTML string SYNCHRONOUSLY in React Native JS thread.
 * No fetch, no server dependency — same pattern as HeatmapMapView.
 *
 * Props:
 *  initialZoom      — 6 for tourist (see all Saudi), 12 for neighborhood view
 *  showTourismSpots — true for tourist mode, false for registered neighborhood mode
 *
 * CRITICAL: This component must always be wrapped in StyleSheet.absoluteFill.
 * Never use overflow:"hidden" or position:"relative" on the parent View.
 * Android GPU compositor clips tile bitmap layers at the clipping boundary,
 * making tiles invisible while HTML text/CSS elements still render normally.
 */
import React, { useRef } from "react";
import { Linking, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface TourismSpot {
  id: string; emoji: string; nameAr: string; nameEn: string;
  cityAr: string; cityEn: string; descAr: string; descEn: string;
  category: string; lat: number; lng: number; mapsUrl: string;
  featured?: boolean; rating?: number;
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

/* ── Static spots (12 iconic Saudi destinations) ────────────────────────── */
const SPOTS: TourismSpot[] = [
  { id:"diriyah",         emoji:"🏯", nameAr:"الدرعية التاريخية",     nameEn:"Diriyah",               cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"مهد الدولة السعودية وموقع تراث عالمي يونسكو",    descEn:"Birthplace of the Saudi state, UNESCO World Heritage",    category:"cultural",      featured:true,  lat:24.734, lng:46.571, mapsUrl:"https://maps.google.com/?q=Diriyah,Riyadh",              rating:4.7 },
  { id:"masmak",          emoji:"🏰", nameAr:"قصر المصمك",             nameEn:"Al Masmak Palace",      cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"قلعة الطين التاريخية في قلب الرياض القديمة",      descEn:"Historic mud-brick fort in the heart of old Riyadh",     category:"cultural",      featured:false, lat:24.686, lng:46.713, mapsUrl:"https://maps.google.com/?q=Al+Masmak+Palace,Riyadh",     rating:4.5 },
  { id:"national-museum", emoji:"🏛️", nameAr:"المتحف الوطني السعودي",  nameEn:"Saudi National Museum", cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"8 أجنحة تروي تاريخ الجزيرة العربية",              descEn:"8 galleries narrating Arabian Peninsula history",        category:"cultural",      featured:false, lat:24.699, lng:46.713, mapsUrl:"https://maps.google.com/?q=Saudi+National+Museum,Riyadh", rating:4.6 },
  { id:"alula",           emoji:"🌄", nameAr:"العُلا",                 nameEn:"AlUla",                 cityAr:"العُلا",          cityEn:"AlUla",   descAr:"وادي المعجزات — الحِجر وجبال الرمال الحمراء",      descEn:"Valley of Wonders — Hegra & red sand mountains",        category:"nature",        featured:true,  lat:26.624, lng:37.921, mapsUrl:"https://maps.google.com/?q=AlUla,Saudi+Arabia",          rating:4.9 },
  { id:"abha",            emoji:"⛰️", nameAr:"أبها",                   nameEn:"Abha",                  cityAr:"أبها",            cityEn:"Abha",    descAr:"سقف المملكة — جبال عسير الخضراء",                 descEn:"Kingdom's rooftop — Asir green mountains & morning mist",category:"nature",        featured:false, lat:18.216, lng:42.505, mapsUrl:"https://maps.google.com/?q=Abha,Saudi+Arabia",           rating:4.8 },
  { id:"kingdom-centre",  emoji:"🏙️", nameAr:"برج المملكة",            nameEn:"Kingdom Centre Tower",  cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"أعلى برج في الرياض بجسر سماوي وإطلالة 360°",      descEn:"Riyadh's tallest tower — sky bridge & 360° views",      category:"entertainment", featured:false, lat:24.691, lng:46.683, mapsUrl:"https://maps.google.com/?q=Kingdom+Centre+Tower,Riyadh", rating:4.4 },
  { id:"boulevard",       emoji:"🎡", nameAr:"بولفارد سيتي الرياض",    nameEn:"Boulevard City Riyadh", cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"مدينة الترفيه الضخمة — ملاهٍ وأسواق",             descEn:"Mega entertainment city — rides, malls & dining",       category:"entertainment", featured:true,  lat:24.803, lng:46.637, mapsUrl:"https://maps.google.com/?q=Boulevard+City+Riyadh",      rating:4.5 },
  { id:"riyadh-season",   emoji:"🎪", nameAr:"موسم الرياض",            nameEn:"Riyadh Season",         cityAr:"الرياض",          cityEn:"Riyadh",  descAr:"أكبر موسم ترفيهي في العالم",                      descEn:"World's largest entertainment season",                  category:"events",        featured:true,  lat:24.787, lng:46.650, mapsUrl:"https://maps.google.com/?q=Riyadh+Season+Boulevard",    rating:4.6 },
  { id:"jeddah-historic", emoji:"🕌", nameAr:"جدة التاريخية",          nameEn:"Historic Jeddah",       cityAr:"جدة",             cityEn:"Jeddah",  descAr:"أبراج مرجانية وأسواق تراثية يونسكو",               descEn:"Ancient quarter — coral towers & UNESCO heritage souks", category:"cultural",      featured:false, lat:21.487, lng:39.188, mapsUrl:"https://maps.google.com/?q=Al-Balad,Jeddah",            rating:4.7 },
  { id:"mecca",           emoji:"🕋", nameAr:"مكة المكرمة",            nameEn:"Mecca",                 cityAr:"مكة المكرمة",     cityEn:"Mecca",   descAr:"أقدس بقاع الأرض — المسجد الحرام",                 descEn:"Holiest site on Earth — Grand Mosque & the Kaaba",      category:"religious",     featured:false, lat:21.389, lng:39.857, mapsUrl:"https://maps.google.com/?q=Grand+Mosque,Mecca",         rating:5.0 },
  { id:"medina",          emoji:"🌙", nameAr:"المدينة المنورة",         nameEn:"Medina",                cityAr:"المدينة المنورة", cityEn:"Medina",  descAr:"المسجد النبوي الشريف",                             descEn:"Prophet's Mosque — one of Islam's most sacred sites",   category:"religious",     featured:false, lat:24.524, lng:39.570, mapsUrl:"https://maps.google.com/?q=Al-Masjid+an-Nabawi,Medina", rating:4.9 },
  { id:"tabuk",           emoji:"🏜️", nameAr:"تبوك وخُريبة",           nameEn:"Tabuk",                 cityAr:"تبوك",            cityEn:"Tabuk",   descAr:"أعمق نقطة غوص وشعاب مرجانية",                    descEn:"Deepest dive site & pristine Red Sea coral reefs",      category:"nature",        featured:false, lat:28.383, lng:36.566, mapsUrl:"https://maps.google.com/?q=Tabuk,Saudi+Arabia",         rating:4.6 },
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
  const dir        = isAr ? "rtl" : "ltr";
  const spotsJson  = JSON.stringify(SPOTS);
  const legendBottom = hasTabs ? 110 : 60;

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;overflow:hidden;background:#0f2040;}
#map{height:100%;width:100%;}

#filter-bar{
  position:absolute;top:12px;${isAr ? "right:8px;left:18px;" : "left:8px;right:18px;"}
  z-index:1000;display:flex;flex-direction:row;
  ${isAr ? "justify-content:flex-end;" : "justify-content:flex-start;"}
  gap:7px;flex-wrap:nowrap;overflow-x:auto;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;
}
#filter-bar::-webkit-scrollbar{display:none;}
.fbtn{
  flex-shrink:0;padding:7px 16px;border-radius:20px;
  background:rgba(8,18,36,0.9);color:#cbd5e1;
  font-size:13px;font-family:-apple-system,'Segoe UI',sans-serif;font-weight:700;
  cursor:pointer;white-space:nowrap;outline:none;
  border:1.5px solid rgba(255,255,255,0.22);
  -webkit-tap-highlight-color:transparent;user-select:none;
}
.fbtn.active    {background:rgba(15,52,96,0.95);border-color:#C9A84C;color:#C9A84C;}
.fbtn.active-apt{background:rgba(60,20,110,0.95);border-color:#A855F7;color:#A855F7;}
.fbtn:active{opacity:.7;}

#legend{
  position:absolute;bottom:${legendBottom}px;
  ${isAr ? "left:12px;" : "right:12px;"}
  z-index:1000;background:rgba(8,18,36,0.9);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:10px;padding:7px 11px;
  font-family:-apple-system,'Segoe UI',sans-serif;
}
.l-row{display:flex;align-items:center;gap:5px;margin-bottom:3px;direction:ltr;}
.l-row:last-child{margin-bottom:0;}
.ldot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.l-lbl{font-size:10px;color:#e2e8f0;font-weight:600;}

.spot-icon{overflow:visible!important;background:none!important;border:none!important;}
.spot-wrap{display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);cursor:pointer;}
.spot-pin{
  display:flex;align-items:center;justify-content:center;
  width:40px;height:40px;border-radius:50%;font-size:18px;
  box-shadow:0 4px 14px rgba(0,0,0,.7);
  border:2px solid rgba(255,255,255,.18);
  background:rgba(10,22,40,.55);position:relative;
}
.spot-pin.feat{width:48px;height:48px;font-size:22px;border-color:#D4A843;box-shadow:0 4px 18px rgba(212,168,67,.5);}
.busy-ring{position:absolute;inset:-5px;border-radius:50%;border:3px solid transparent;pointer-events:none;}
.ring-green {border-color:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.4);}
.ring-yellow{border-color:#eab308;box-shadow:0 0 6px rgba(234,179,8,.4);}
.ring-red   {border-color:#ef4444;animation:pulse-red 1.5s infinite;}
.ring-gray  {border-color:#94a3b8;opacity:.4;}
@keyframes pulse-red{0%,100%{box-shadow:0 0 4px rgba(239,68,68,.3);}50%{box-shadow:0 0 12px rgba(239,68,68,.8);}}
.star-lbl{margin-top:3px;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;
  background:rgba(10,22,40,.82);color:#fbbf24;
  border:1px solid rgba(212,168,67,.3);box-shadow:0 2px 6px rgba(0,0,0,.5);}
.star-lbl.dim{color:#94a3b8;border-color:rgba(148,163,184,.2);}

.lf-popup .leaflet-popup-content-wrapper{
  background:#0f2040;border:1.5px solid #C9A84C;border-radius:14px;
  box-shadow:0 8px 26px rgba(0,0,0,.65);color:#f1f5f9;padding:0;
  font-family:-apple-system,'Segoe UI',sans-serif;direction:${dir};
}
.lf-popup .leaflet-popup-tip-container{display:none;}
.lf-popup .leaflet-popup-content{margin:14px;min-width:185px;max-width:252px;}
.lf-popup .leaflet-popup-close-button{color:#94a3b8!important;top:8px;font-size:20px;
  ${isAr ? "left:8px;right:auto!important;" : "right:8px;"}}
.pop-type{font-size:10px;font-weight:800;margin-bottom:4px;letter-spacing:.4px;}
.pop-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;line-height:1.4;}
.pop-city{font-size:11px;color:#D4A843;margin-bottom:3px;}
.pop-desc{font-size:11px;color:rgba(241,245,249,.58);line-height:1.55;margin-bottom:8px;}
.pop-stars-row{display:flex;align-items:center;gap:5px;margin-bottom:7px;}
.pop-stars{font-size:12px;color:#fbbf24;}
.pop-rating-num{font-size:12px;font-weight:700;color:#fbbf24;}
.pop-busy{background:rgba(255,255,255,.06);border-radius:9px;padding:8px 10px;margin-bottom:10px;}
.pop-busy-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;}
.pop-busy-title{font-size:10px;color:rgba(255,255,255,.4);}
.pop-busy-val{font-size:11px;font-weight:700;}
.pop-bar-track{height:4px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;}
.pop-bar-fill{height:100%;border-radius:3px;}
.pop-btn{display:flex;align-items:center;justify-content:center;gap:5px;
  background:#D4A843;color:#0F2040;font-weight:700;font-size:11px;
  padding:8px 12px;border-radius:9px;text-decoration:none;width:100%;}
.pop-call{display:flex;align-items:center;justify-content:center;gap:5px;
  background:#16a34a;color:#fff;font-weight:700;font-size:11px;
  padding:8px 12px;border-radius:9px;text-decoration:none;width:100%;margin-bottom:7px;}
.pop-no-phone{font-size:10px;color:#475569;text-align:center;padding:2px 0 6px;}
.ride-btns{display:flex;gap:5px;margin-top:8px;}
.ride-btn{flex:1;padding:8px 4px;border-radius:9px;font-size:11px;font-weight:700;
  text-align:center;cursor:pointer;border:none;
  font-family:-apple-system,'Segoe UI',sans-serif;
  -webkit-tap-highlight-color:transparent;}
.ride-uber{background:#000;color:#fff;}
.ride-bolt{background:#34D399;color:#000;}
.ride-careem{background:#00B140;color:#fff;}

.leaflet-control-container>*{display:none!important;}
.leaflet-control-container .leaflet-bottom.leaflet-right{display:block!important;}
.leaflet-control-attribution{background:rgba(8,18,36,.7)!important;color:#475569!important;font-size:9px!important;}
.leaflet-control-attribution a{color:#C9A84C!important;}
</style>
</head>
<body>
<div id="map"></div>

<div id="filter-bar">
  <button class="fbtn active"  onclick="window.filterAll(this)"              >${isAr ? "الكل"     : "All"    }</button>
  <button class="fbtn"         onclick="window.filterPoi(this,'attraction')" >${isAr ? "سياحة"   : "Tourism"}</button>
  <button class="fbtn"         onclick="window.filterPoi(this,'hotel')"      >${isAr ? "فنادق"   : "Hotels" }</button>
  <button class="fbtn"         onclick="window.filterPoi(this,'restaurant')" >${isAr ? "مطاعم"   : "Rest."  }</button>
  <button class="fbtn"         onclick="window.filterPoi(this,'cafe')"       >${isAr ? "كافيهات" : "Cafes"  }</button>
  <button class="fbtn"         onclick="window.filterApt(this)"              >${isAr ? "🏠 شقق"  : "🏠 Apts"}</button>
</div>

<div id="legend">
  <div class="l-row"><span class="ldot" style="background:#6366F1"></span><span class="l-lbl">${isAr ? "موقعك"  : "You"    }</span></div>
  <div class="l-row"><span class="ldot" style="background:#D4A843"></span><span class="l-lbl">${isAr ? "أماكن"  : "Spots"  }</span></div>
  <div class="l-row"><span class="ldot" style="background:#16A34A"></span><span class="l-lbl">${isAr ? "سياحة" : "Tourism"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#3B82F6"></span><span class="l-lbl">${isAr ? "فندق"  : "Hotel"  }</span></div>
  <div class="l-row"><span class="ldot" style="background:#EF4444"></span><span class="l-lbl">${isAr ? "مطعم"  : "Rest."  }</span></div>
  <div class="l-row"><span class="ldot" style="background:#92400E"></span><span class="l-lbl">${isAr ? "كافيه" : "Cafe"   }</span></div>
  <div class="l-row"><span class="ldot" style="background:#A855F7"></span><span class="l-lbl">${isAr ? "شقق"   : "Apt."   }</span></div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var IS_AR        = ${isAr ? "true" : "false"};
  var SPOTS        = ${spotsJson};
  var USER_LAT     = ${lat};
  var USER_LNG     = ${lng};
  var API_BASE     = ${JSON.stringify(apiBase)};
  var INITIAL_ZOOM = ${initialZoom};
  var SHOW_SPOTS   = ${showTourismSpots ? "true" : "false"};

  var PAT={
    cultural:     [[8,11,55],[11,14,45],[14,17,70],[17,21,78],[21,23,42]],
    events:       [[9,12,25],[12,15,20],[15,17,40],[17,20,88],[20,23,82]],
    nature:       [[6,9,68],[9,12,58],[12,15,38],[15,18,62],[18,20,30]],
    entertainment:[[10,13,32],[13,16,48],[16,19,65],[19,22,92],[22,24,72]],
    religious:    [[4,6,82],[11,13,95],[14,16,72],[17,20,88],[20,22,68]]
  };
  function ksaH(){return(new Date().getUTCHours()+3)%24;}
  function ksaD(){var n=new Date(),h=n.getUTCHours()+3;return(n.getUTCDay()+(h>=24?1:0))%7;}
  function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))&0xffff;return h;}
  function calcBusy(id,cat){
    var pts=PAT[cat];if(!pts)return null;
    var h=ksaH(),b=10;
    for(var i=0;i<pts.length;i++){var p=pts[i];if(h>=p[0]&&h<p[1]){b=p[2];break;}}
    if([5,6].indexOf(ksaD())!==-1)b=Math.min(100,b+22);
    return Math.max(0,Math.min(100,Math.round(b+((hash(id)%25)-12))));
  }
  function busyInfo(pct){
    if(pct===null)return{cls:'gray',dot:'⚫',lbl:IS_AR?'لا بيانات':'No data',clr:'#94a3b8'};
    if(pct<40)   return{cls:'green', dot:'🟢',lbl:IS_AR?'رايق':'Quiet',   clr:'#22c55e'};
    if(pct<75)   return{cls:'yellow',dot:'🟡',lbl:IS_AR?'وسط':'Moderate', clr:'#eab308'};
    return            {cls:'red',   dot:'🔴',lbl:IS_AR?'زحمة':'Busy',     clr:'#ef4444'};
  }
  function stars(r){var f=Math.floor(r);return'★'.repeat(f)+((r-f>=.5)?'½':'')+('☆'.repeat(5-f-(r-f>=.5?1:0)));}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  /* ── Map init ── */
  var map=L.map('map',{center:[USER_LAT,USER_LNG],zoom:INITIAL_ZOOM,
    zoomControl:false,attributionControl:true,tap:true,tapTolerance:15});

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains:'abcd',maxZoom:19
  }).addTo(map);

  var tourismLayer=L.layerGroup().addTo(map);
  var poiLayer    =L.layerGroup().addTo(map);

  /* User location dot */
  L.circleMarker([USER_LAT,USER_LNG],{
    radius:9,fillColor:'#6366F1',color:'#fff',weight:2.5,opacity:1,fillOpacity:.95
  }).bindPopup('<div class="pop-name">'+(IS_AR?'📍 موقعك الحالي':'📍 Your Location')+'</div>',
    {className:'lf-popup'}).addTo(map);

  var CAT_CLR={cultural:'#60A5FA',events:'#A78BFA',nature:'#4ADE80',entertainment:'#FB923C',religious:'#D4A843'};
  var CAT_AR ={cultural:'ثقافي',events:'فعاليات',nature:'طبيعة',entertainment:'ترفيه',religious:'ديني'};
  var CAT_EN ={cultural:'Cultural',events:'Events',nature:'Nature',entertainment:'Entertainment',religious:'Religious'};

  function makeEmojiIcon(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var fc=s.featured?' feat':'';
    var rl=s.rating?'<div class="star-lbl">⭐ '+s.rating.toFixed(1)+'</div>':'<div class="star-lbl dim">—</div>';
    return L.divIcon({
      html:'<div class="spot-wrap"><div class="spot-pin'+fc+'" style="border-color:'+clr+'">'
          +s.emoji+'<div class="busy-ring ring-'+info.cls+'"></div></div>'+rl+'</div>',
      className:'spot-icon',iconSize:[0,0],iconAnchor:[0,0]
    });
  }

  function makeTourismPopup(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var catL=IS_AR?(CAT_AR[s.category]||s.category):(CAT_EN[s.category]||s.category);
    var bar=pct!==null?'<div class="pop-bar-track"><div class="pop-bar-fill" style="width:'+pct+'%;background:'+info.clr+'"></div></div>':'';
    var st=s.rating?'<div class="pop-stars-row"><span class="pop-stars">'+stars(s.rating)+'</span><span class="pop-rating-num">'+s.rating.toFixed(1)+'</span></div>':'';
    return '<span class="pop-type" style="color:'+clr+'">'+esc(catL)+'</span>'
      +'<div class="pop-name">'+esc(IS_AR?s.nameAr:s.nameEn)+'</div>'
      +'<div class="pop-city">📍 '+esc(IS_AR?s.cityAr:s.cityEn)+'</div>'+st
      +'<div class="pop-desc">'+esc(IS_AR?s.descAr:s.descEn)+'</div>'
      +'<div class="pop-busy"><div class="pop-busy-row">'
        +'<span class="pop-busy-title">'+(IS_AR?'الزحمة':'Busyness')+'</span>'
        +'<span class="pop-busy-val" style="color:'+info.clr+'">'+info.dot+' '+info.lbl+'</span>'
      +'</div>'+bar+'</div>'
      +'<a class="pop-btn" href="'+s.mapsUrl+'" target="_blank">🗺️ '+(IS_AR?'افتح الخريطة':'Open Maps')+'</a>';
  }

  function renderTourism(){
    tourismLayer.clearLayers();
    SPOTS.forEach(function(s){
      var pct=calcBusy(s.id,s.category);
      L.marker([s.lat,s.lng],{icon:makeEmojiIcon(s,pct)})
        .bindPopup(makeTourismPopup(s,pct),{className:'lf-popup',maxWidth:270,closeButton:true})
        .addTo(tourismLayer);
    });
  }

  /* Only show tourism spots in tourist mode (SHOW_SPOTS=true) */
  if(SHOW_SPOTS){
    renderTourism();
    setInterval(renderTourism,15*60*1000);
  }

  /* ── POI layer (fetched from API) ── */
  var POI_CFG={
    attraction:{clr:'#16A34A',emoji:'🎯',arName:'سياحي',  enName:'Tourism'},
    hotel:     {clr:'#3B82F6',emoji:'🏨',arName:'فندق',   enName:'Hotel'},
    restaurant:{clr:'#EF4444',emoji:'🍽️',arName:'مطعم',  enName:'Restaurant'},
    cafe:      {clr:'#92400E',emoji:'☕', arName:'كافيه', enName:'Café'},
  };
  var APTS={};

  window.openRide=function(app,apId){
    var d=APTS[apId];if(!d)return;
    var urls={
      uber:   'uber://?action=setPickup&pickup=my_location&dropoff[latitude]='+d.lat+'&dropoff[longitude]='+d.lng+'&dropoff[nickname]='+encodeURIComponent(d.name),
      bolt:   'bolt://?pickup=my_location&dropoff_lat='+d.lat+'&dropoff_lon='+d.lng,
      careem: 'careem://booking/pickup/current/dropoff/'+d.lat+'/'+d.lng,
    };
    var url=urls[app];if(!url)return;
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'openUrl',url:url}));
    }
  };

  function makeAptPopup(p){
    var name=p.nameAr||p.nameEn||'—';
    var apId='apt_'+p.osmId;
    APTS[apId]={lat:p.lat,lng:p.lng,name:name};
    var phone=(p.tags&&p.tags.phone)||'';
    var h='<span class="pop-type" style="color:#A855F7">🏠 '+(IS_AR?'شقة مفروشة':'Furnished Apt.')+'</span>';
    h+='<div class="pop-name">'+esc(name)+'</div>';
    h+=phone?'<a class="pop-call" href="tel:'+phone+'">📞 '+(IS_AR?'اتصال':'Call')+'</a>'
            :'<div class="pop-no-phone">'+(IS_AR?'لا يوجد هاتف':'No phone')+'</div>';
    h+='<div class="ride-btns">';
    h+='<button class="ride-btn ride-uber"   onclick="window.openRide(\'uber\',\''+apId+'\')">🚗 '+(IS_AR?'أوبر':'Uber')+'</button>';
    h+='<button class="ride-btn ride-bolt"   onclick="window.openRide(\'bolt\',\''+apId+'\')">⚡ '+(IS_AR?'بولت':'Bolt')+'</button>';
    h+='<button class="ride-btn ride-careem" onclick="window.openRide(\'careem\',\''+apId+'\')">🟢 '+(IS_AR?'كريم':'Careem')+'</button>';
    h+='</div>';
    return h;
  }

  function makePOIPopup(p,cfg){
    var name=IS_AR?(p.nameAr||p.nameEn||''):(p.nameEn||p.nameAr||'');
    if(!name)name=IS_AR?'اسم غير متاح':'N/A';
    var phone=(p.tags&&(p.tags.phone||p.tags['contact:phone']))||'';
    var h='<div class="pop-type" style="color:'+cfg.clr+'">'+cfg.emoji+' '+(IS_AR?cfg.arName:cfg.enName)+'</div>';
    h+='<div class="pop-name">'+esc(name)+'</div>';
    h+=phone?'<a class="pop-call" href="tel:'+phone+'">📞 '+(IS_AR?'اتصال':'Call')+'</a>'
            :'<div class="pop-no-phone">'+(IS_AR?'لا يوجد هاتف':'No phone')+'</div>';
    return h;
  }

  function loadPoi(type){
    var url=API_BASE+'/api/poi?lat='+USER_LAT+'&lng='+USER_LNG+'&radius_km=20&limit=300';
    if(type)url+='&type='+type;
    fetch(url)
      .then(function(r){return r.json();})
      .then(function(data){
        poiLayer.clearLayers();
        Object.keys(APTS).forEach(function(k){delete APTS[k];});
        (data.places||[]).forEach(function(p){
          if(!p.lat||!p.lng)return;
          var html2,clr;
          if(p.type==='apartment'){html2=makeAptPopup(p);clr='#A855F7';}
          else{var cfg=POI_CFG[p.type];if(!cfg)return;html2=makePOIPopup(p,cfg);clr=cfg.clr;}
          L.circleMarker([p.lat,p.lng],{
            radius:7,fillColor:clr,color:'#fff',weight:1.5,opacity:1,fillOpacity:.88
          }).bindPopup(html2,{className:'lf-popup',maxWidth:270,closeButton:true}).addTo(poiLayer);
        });
      })
      .catch(function(){});
  }

  function clearActive(){
    document.querySelectorAll('.fbtn').forEach(function(b){
      b.classList.remove('active','active-apt');
    });
  }
  window.filterAll=function(btn){clearActive();btn.classList.add('active');
    if(SHOW_SPOTS)map.addLayer(tourismLayer);loadPoi(null);};
  window.filterPoi=function(btn,t){clearActive();btn.classList.add('active');
    if(SHOW_SPOTS)map.addLayer(tourismLayer);loadPoi(t);};
  window.filterApt=function(btn){clearActive();btn.classList.add('active-apt');
    map.removeLayer(tourismLayer);loadPoi('apartment');};

  loadPoi(null);
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
  const htmlRef  = useRef("");
  const prevKey  = useRef("");
  const key = `${userLat.toFixed(4)}_${userLng.toFixed(4)}_${isAr}_${hasTabs}_${initialZoom}_${showTourismSpots}`;

  if (!htmlRef.current || prevKey.current !== key) {
    prevKey.current = key;
    htmlRef.current = buildHtml({ isAr, lat: userLat, lng: userLng, hasTabs, apiBase, initialZoom, showTourismSpots });
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; url: string };
      if (msg.type === "openUrl" && msg.url) {
        void Linking.openURL(msg.url).catch(() => {});
      }
    } catch { /* ignore */ }
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
