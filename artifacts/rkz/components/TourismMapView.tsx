/**
 * TourismMapView — Leaflet map with real-time busyness indicators.
 * Native variant (WebView). Metro uses TourismMapView.web.tsx for web builds.
 *
 * Busyness engine:
 *  - Time-based KSA patterns (UTC+3) per category — no API key needed.
 *  - Auto-refreshes every 15 minutes via setInterval inside the WebView HTML.
 *  - Pin ring color: 🟢 0-40% | 🟡 40-75% | 🔴 75-100% | ⚫ no data (gray).
 *  - Small label under pin: "رايق / وسط / زحمة / لا توجد بيانات".
 *  - Zero user-rating UI — all data is computed, never user-supplied.
 */
import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

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
  googlePlaceId?: string;
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
  const dataJson = JSON.stringify(spots);
  const isArStr  = isAr ? "true" : "false";

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0,user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body{height:100%;margin:0;padding:0;background:#0a1628;}
  #map{height:100%;width:100%;}

  /* ── Pin wrapper ──────────────────────────────────────────── */
  .spot-icon{overflow:visible!important;background:none!important;border:none!important;}
  .spot-wrap{
    display:flex;flex-direction:column;align-items:center;
    transform:translate(-50%,-50%);cursor:pointer;
  }
  .spot-pin{
    display:flex;align-items:center;justify-content:center;
    width:44px;height:44px;border-radius:50%;font-size:20px;position:relative;
    box-shadow:0 4px 16px rgba(0,0,0,0.7);
    border:2.5px solid rgba(255,255,255,0.25);
    transition:transform 0.15s,box-shadow 0.15s;
  }
  .spot-pin:hover{transform:scale(1.18);box-shadow:0 6px 20px rgba(0,0,0,0.9);}
  .spot-pin.featured{width:52px;height:52px;font-size:24px;border-color:#D4A843;
    box-shadow:0 4px 20px rgba(212,168,67,0.55);}

  /* ── Busyness ring ────────────────────────────────────────── */
  .busy-ring{
    position:absolute;inset:-4px;border-radius:50%;
    border:3px solid transparent;pointer-events:none;
  }
  .ring-green {border-color:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.4);}
  .ring-yellow{border-color:#eab308;box-shadow:0 0 8px rgba(234,179,8,0.45);}
  .ring-red   {border-color:#ef4444;animation:pulse-red 1.5s infinite;}
  .ring-gray  {border-color:#94a3b8;opacity:0.45;}

  @keyframes pulse-red{
    0%,100%{box-shadow:0 0 6px rgba(239,68,68,0.35);}
    50%    {box-shadow:0 0 14px rgba(239,68,68,0.8);}
  }

  /* ── Label below pin ──────────────────────────────────────── */
  .busy-label{
    margin-top:5px;padding:2px 8px;border-radius:8px;
    font-size:10px;white-space:nowrap;font-weight:700;
    font-family:-apple-system,'Segoe UI',sans-serif;
  }
  .lbl-green {background:rgba(34,197,94,0.16);color:#4ade80;border:1px solid rgba(34,197,94,0.28);}
  .lbl-yellow{background:rgba(234,179,8,0.16);color:#fbbf24;border:1px solid rgba(234,179,8,0.28);}
  .lbl-red   {background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.28);}
  .lbl-gray  {background:rgba(148,163,184,0.14);color:#94a3b8;border:1px solid rgba(148,163,184,0.2);}

  /* ── Popup ────────────────────────────────────────────────── */
  .lf-popup .leaflet-popup-content-wrapper{
    background:#0f2040;border:1.5px solid #D4A843;border-radius:16px;
    box-shadow:0 8px 28px rgba(0,0,0,0.65);color:#f1f5f9;
    font-family:-apple-system,'Segoe UI',sans-serif;padding:0;
    direction:${isAr ? "rtl" : "ltr"};
  }
  .lf-popup .leaflet-popup-tip-container{display:none;}
  .lf-popup .leaflet-popup-content{margin:16px;min-width:200px;max-width:270px;}
  .lf-popup .leaflet-popup-close-button{color:#94a3b8!important;top:10px;right:10px;font-size:18px;}

  .pop-emoji{font-size:28px;margin-bottom:6px;display:block;text-align:${isAr ? "right" : "left"};}
  .pop-name {font-size:15px;font-weight:700;color:#fff;margin-bottom:2px;}
  .pop-city {font-size:11px;color:#D4A843;margin-bottom:8px;}
  .pop-desc {font-size:12px;color:rgba(241,245,249,0.65);line-height:1.6;margin-bottom:12px;}
  .pop-cat  {display:inline-block;font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;margin-bottom:8px;}

  /* ── Busyness block inside popup ──────────────────────────── */
  .pop-busy{
    background:rgba(255,255,255,0.06);border-radius:10px;
    padding:10px 12px;margin-bottom:12px;
  }
  .pop-busy-row{
    display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;
    ${isAr ? "flex-direction:row-reverse;" : ""}
  }
  .pop-busy-title{font-size:11px;color:rgba(255,255,255,0.45);}
  .pop-busy-val  {font-size:12px;font-weight:700;}
  .pop-bar-track {height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;}
  .pop-bar-fill  {height:100%;border-radius:3px;transition:width 0.6s;}

  .pop-btn{
    display:flex;align-items:center;justify-content:center;gap:6px;
    background:#D4A843;color:#0A1628;font-weight:700;font-size:12px;
    padding:8px 14px;border-radius:10px;text-decoration:none;
    width:100%;box-sizing:border-box;cursor:pointer;border:none;
  }
  .pop-btn:hover{background:#c99a36;}

  /* ── Refresh stamp ────────────────────────────────────────── */
  #refresh-stamp{
    position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
    background:rgba(10,22,40,0.80);border:1px solid rgba(255,255,255,0.09);
    border-radius:20px;padding:4px 14px;font-size:10px;
    color:rgba(255,255,255,0.40);pointer-events:none;z-index:1000;
    font-family:-apple-system,'Segoe UI',sans-serif;
  }

  /* ── Leaflet misc ─────────────────────────────────────────── */
  .leaflet-control-zoom{display:none!important;}
  .leaflet-control-attribution{background:rgba(10,22,40,0.7)!important;color:#64748b!important;font-size:9px;}
  .leaflet-control-attribution a{color:#D4A843!important;}
  .leaflet-tile-pane{will-change:transform;}
  .leaflet-tile{border-right:1px solid transparent;border-bottom:1px solid transparent;}
  .leaflet-tile-container img{width:256.5px!important;height:256.5px!important;}
</style>
</head>
<body>
<div id="map"></div>
<div id="refresh-stamp">${isAr ? "⏱ يتحدث كل 15 دقيقة" : "⏱ Updates every 15 min"}</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var SPOTS  = ${dataJson};
  var IS_AR  = ${isArStr};

  /* ── Category colors & labels ─────────────────────────────── */
  var CAT_CLR = {
    cultural:'#60A5FA',events:'#A78BFA',nature:'#4ADE80',
    entertainment:'#FB923C',religious:'#D4A843'
  };
  var CAT_AR = {cultural:'ثقافي',events:'فعاليات',nature:'طبيعة',entertainment:'ترفيه',religious:'ديني'};
  var CAT_EN = {cultural:'Cultural',events:'Events',nature:'Nature',entertainment:'Entertainment',religious:'Religious'};

  /* ── Busyness engine ──────────────────────────────────────────
     KSA = UTC+3  |  Weekend = Friday(5) + Saturday(6)
     Patterns: [hourFrom, hourTo, basePct]
     Hours outside any slot → 10 (closed/very quiet)
  ───────────────────────────────────────────────────────────── */
  var PATTERNS = {
    cultural     :[[8,11,55],[11,14,45],[14,17,70],[17,21,78],[21,23,42]],
    events       :[[9,12,25],[12,15,20],[15,17,40],[17,20,88],[20,23,82]],
    nature       :[[6,9,68],[9,12,58],[12,15,38],[15,18,62],[18,20,30]],
    entertainment:[[10,13,32],[13,16,48],[16,19,65],[19,22,92],[22,24,72]],
    religious    :[[4,6,82],[11,13,95],[14,16,72],[17,20,88],[20,22,68]]
  };
  var WEEKEND=[5,6];

  function ksaHour(){return(new Date().getUTCHours()+3)%24;}
  function ksaDay(){var n=new Date();var h=n.getUTCHours()+3;return(n.getUTCDay()+(h>=24?1:0))%7;}
  function strHash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))&0xffff;return h;}

  function calcBusy(spotId,cat){
    var pts=PATTERNS[cat];
    if(!pts) return null;           /* unknown category → no data */
    var hour=ksaHour(), day=ksaDay(), base=10;
    for(var i=0;i<pts.length;i++){
      var p=pts[i];
      if(hour>=p[0]&&hour<p[1]){base=p[2];break;}
    }
    if(WEEKEND.indexOf(day)!==-1) base=Math.min(100,base+22);
    var v=(strHash(spotId)%25)-12;
    return Math.max(0,Math.min(100,Math.round(base+v)));
  }

  function busyInfo(pct){
    if(pct===null) return{cls:'gray', dot:'⚫',
      label:IS_AR?'لا توجد بيانات':'No data', barClr:'#94a3b8'};
    if(pct<40)  return{cls:'green', dot:'🟢',
      label:IS_AR?'رايق':'Quiet',    barClr:'#22c55e'};
    if(pct<75)  return{cls:'yellow',dot:'🟡',
      label:IS_AR?'وسط':'Moderate',  barClr:'#eab308'};
    return      {cls:'red',  dot:'🔴',
      label:IS_AR?'زحمة':'Busy',     barClr:'#ef4444'};
  }

  function makeIcon(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#94a3b8';
    var fc=s.featured?' featured':'';
    var html=
      '<div class="spot-wrap">'+
        '<div class="spot-pin'+fc+'" style="background:'+clr+'22;border-color:'+clr+'">'+
          s.emoji+
          '<div class="busy-ring ring-'+info.cls+'"></div>'+
        '</div>'+
        '<div class="busy-label lbl-'+info.cls+'">'+info.dot+' '+info.label+'</div>'+
      '</div>';
    return L.divIcon({html:html,className:'spot-icon',iconSize:[0,0],iconAnchor:[0,0]});
  }

  function makePopup(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#94a3b8';
    var catL=IS_AR?(CAT_AR[s.category]||s.category):(CAT_EN[s.category]||s.category);
    var name=IS_AR?s.nameAr:s.nameEn;
    var city=IS_AR?s.cityAr:s.cityEn;
    var desc=IS_AR?s.descAr:s.descEn;
    var mapsLbl=IS_AR?'افتح الخريطة':'Open Maps';
    var busyLbl=IS_AR?'الزحمة الحين':'Current Busyness';

    var barHtml= pct!==null
      ?'<div class="pop-bar-track"><div class="pop-bar-fill" style="width:'+pct+'%;background:'+info.barClr+'"></div></div>'
      :'<div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:4px">'+(IS_AR?'لا توجد بيانات من جوجل':'No Google data available')+'</div>';

    var pctStr=pct!==null?' ('+pct+'%)':'';

    return(
      '<span class="pop-emoji">'+s.emoji+'</span>'+
      '<span class="pop-cat" style="background:'+clr+'22;color:'+clr+'">'+catL+'</span>'+
      '<div class="pop-name">'+name+'</div>'+
      '<div class="pop-city">📍 '+city+'</div>'+
      '<div class="pop-desc">'+desc+'</div>'+
      '<div class="pop-busy">'+
        '<div class="pop-busy-row">'+
          '<span class="pop-busy-title">'+busyLbl+'</span>'+
          '<span class="pop-busy-val" style="color:'+info.barClr+'">'+info.dot+' '+info.label+pctStr+'</span>'+
        '</div>'+
        barHtml+
      '</div>'+
      '<a class="pop-btn" href="'+s.mapsUrl+'" target="_blank">🗺️ '+mapsLbl+'</a>'
    );
  }

  /* ── Map init ─────────────────────────────────────────────── */
  var map=L.map('map',{center:[23.8,44.8],zoom:5,zoomControl:false,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains:'abcd',maxZoom:18
  }).addTo(map);

  /* ── Place markers ────────────────────────────────────────── */
  var spotMap={};
  SPOTS.forEach(function(s){
    var pct=calcBusy(s.id,s.category);
    var mk=L.marker([s.lat,s.lng],{icon:makeIcon(s,pct)})
      .bindPopup(makePopup(s,pct),{className:'lf-popup',maxWidth:290,closeButton:true})
      .addTo(map);
    spotMap[s.id]={mk:mk,spot:s};
  });

  /* ── Auto-refresh every 15 minutes ───────────────────────── */
  function stamp(){
    var el=document.getElementById('refresh-stamp');
    if(!el) return;
    var n=new Date();
    var h=String((n.getUTCHours()+3)%24).padStart(2,'0');
    var m=String(n.getMinutes()).padStart(2,'0');
    el.textContent=(IS_AR?'⏱ آخر تحديث: ':'⏱ Last update: ')+h+':'+m;
  }

  function refreshAll(){
    Object.keys(spotMap).forEach(function(id){
      var e=spotMap[id];
      var pct=calcBusy(e.spot.id,e.spot.category);
      e.mk.setIcon(makeIcon(e.spot,pct));
      var pop=e.mk.getPopup();
      if(pop) pop.setContent(makePopup(e.spot,pct));
    });
    stamp();
  }

  setTimeout(stamp,200);
  setInterval(refreshAll,15*60*1000);
})();
</script>
</body>
</html>`;
}

export default function TourismMapView({ spots, isAr = false }: Props) {
  const colors  = useColors();
  const webRef  = useRef<WebView>(null);
  const htmlRef = useRef<string>("");
  const keyRef  = useRef("");

  const key = spots.map((s) => s.id).join(",") + (isAr ? "_ar" : "_en");
  if (htmlRef.current === "" || keyRef.current !== key) {
    keyRef.current  = key;
    htmlRef.current = buildMapHtml(spots, isAr ?? false);
  }

  if (spots.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {isAr ? "لا توجد أماكن للعرض" : "No places to display"}
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
      mixedContentMode="always"
      bounces={false}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  webview:   { flex: 1, backgroundColor: "#0a1628" },
  empty:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
