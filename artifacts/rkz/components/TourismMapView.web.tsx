/**
 * TourismMapView — WEB PLATFORM SHIM
 * Metro auto-selects this instead of TourismMapView.tsx on web builds.
 * Uses a native DOM <iframe> with srcdoc to avoid react-native-webview crash.
 *
 * Pin design:
 *  - Emoji circle with colored busyness RING (🟢/🟡/🔴/⚫)
 *  - Label below: "⭐ 4.7" (rating) — mirrors real-estate price pill role
 *  - Popup: name, city, desc, star row, busyness bar, "افتح الخريطة" button
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
  rating?: number;
}

interface Props {
  spots: TourismSpot[];
  isAr?: boolean;
  activeCategory?: string;
}

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

  .spot-icon{overflow:visible!important;background:none!important;border:none!important;}
  .spot-wrap{
    display:flex;flex-direction:column;align-items:center;
    transform:translate(-50%,-50%);cursor:pointer;
  }
  .spot-pin{
    display:flex;align-items:center;justify-content:center;
    width:44px;height:44px;border-radius:50%;font-size:20px;position:relative;
    box-shadow:0 4px 16px rgba(0,0,0,0.7);
    border:2.5px solid rgba(255,255,255,0.20);
    transition:transform 0.15s,box-shadow 0.15s;
  }
  .spot-pin:hover{transform:scale(1.18);box-shadow:0 6px 22px rgba(0,0,0,0.9);}
  .spot-pin.featured{width:52px;height:52px;font-size:24px;border-color:#D4A843;
    box-shadow:0 4px 20px rgba(212,168,67,0.55);}

  .busy-ring{
    position:absolute;inset:-5px;border-radius:50%;
    border:3px solid transparent;pointer-events:none;
  }
  .ring-green {border-color:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.4);}
  .ring-yellow{border-color:#eab308;box-shadow:0 0 8px rgba(234,179,8,0.45);}
  .ring-red   {border-color:#ef4444;animation:pulse-red 1.5s infinite;}
  .ring-gray  {border-color:#94a3b8;opacity:0.4;}

  @keyframes pulse-red{
    0%,100%{box-shadow:0 0 5px rgba(239,68,68,0.3);}
    50%    {box-shadow:0 0 14px rgba(239,68,68,0.8);}
  }

  .star-label{
    margin-top:5px;padding:3px 9px;border-radius:10px;
    font-size:11px;white-space:nowrap;font-weight:700;
    font-family:-apple-system,'Segoe UI',sans-serif;
    background:rgba(10,22,40,0.82);color:#fbbf24;
    border:1px solid rgba(212,168,67,0.35);
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
  }
  .star-label.no-rating{color:#94a3b8;border-color:rgba(148,163,184,0.2);}

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
  .pop-cat  {display:inline-block;font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;margin-bottom:8px;}
  .pop-name {font-size:15px;font-weight:700;color:#fff;margin-bottom:2px;}
  .pop-city {font-size:11px;color:#D4A843;margin-bottom:4px;}
  .pop-desc {font-size:12px;color:rgba(241,245,249,0.62);line-height:1.6;margin-bottom:10px;}

  .pop-stars-row{
    display:flex;align-items:center;gap:6px;margin-bottom:10px;
    ${isAr ? "flex-direction:row-reverse;" : ""}
  }
  .pop-stars{font-size:14px;letter-spacing:1px;}
  .pop-rating-num{font-size:13px;font-weight:700;color:#fbbf24;}
  .pop-rating-src{font-size:10px;color:rgba(255,255,255,0.35);}

  .pop-busy{
    background:rgba(255,255,255,0.06);border-radius:10px;
    padding:9px 12px;margin-bottom:12px;
  }
  .pop-busy-row{
    display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;
    ${isAr ? "flex-direction:row-reverse;" : ""}
  }
  .pop-busy-title{font-size:11px;color:rgba(255,255,255,0.42);}
  .pop-busy-val  {font-size:12px;font-weight:700;}
  .pop-bar-track {height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;}
  .pop-bar-fill  {height:100%;border-radius:3px;transition:width 0.5s;}

  .pop-btn{
    display:flex;align-items:center;justify-content:center;gap:6px;
    background:#D4A843;color:#0A1628;font-weight:700;font-size:12px;
    padding:8px 14px;border-radius:10px;text-decoration:none;
    width:100%;box-sizing:border-box;cursor:pointer;
  }
  .pop-btn:hover{background:#c99a36;}

  #refresh-stamp{
    position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
    background:rgba(10,22,40,0.78);border:1px solid rgba(255,255,255,0.08);
    border-radius:20px;padding:4px 14px;font-size:10px;
    color:rgba(255,255,255,0.38);pointer-events:none;z-index:1000;
    font-family:-apple-system,'Segoe UI',sans-serif;
  }

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
  var SPOTS = ${dataJson};
  var IS_AR = ${isArStr};

  var CAT_CLR = {
    cultural:'#60A5FA',events:'#A78BFA',nature:'#4ADE80',
    entertainment:'#FB923C',religious:'#D4A843'
  };
  var CAT_AR = {cultural:'ثقافي',events:'فعاليات',nature:'طبيعة',entertainment:'ترفيه',religious:'ديني'};
  var CAT_EN = {cultural:'Cultural',events:'Events',nature:'Nature',entertainment:'Entertainment',religious:'Religious'};

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

  function calcBusy(id,cat){
    var pts=PATTERNS[cat]; if(!pts) return null;
    var hour=ksaHour(),day=ksaDay(),base=10;
    for(var i=0;i<pts.length;i++){var p=pts[i];if(hour>=p[0]&&hour<p[1]){base=p[2];break;}}
    if(WEEKEND.indexOf(day)!==-1) base=Math.min(100,base+22);
    return Math.max(0,Math.min(100,Math.round(base+((strHash(id)%25)-12))));
  }

  function busyInfo(pct){
    if(pct===null) return{cls:'gray', dot:'⚫',label:IS_AR?'لا توجد بيانات':'No data',barClr:'#94a3b8'};
    if(pct<40)  return{cls:'green', dot:'🟢',label:IS_AR?'رايق':'Quiet',   barClr:'#22c55e'};
    if(pct<75)  return{cls:'yellow',dot:'🟡',label:IS_AR?'وسط':'Moderate', barClr:'#eab308'};
    return      {cls:'red',  dot:'🔴',label:IS_AR?'زحمة':'Busy',           barClr:'#ef4444'};
  }

  function starStr(r){
    var full=Math.floor(r),half=(r-full)>=0.5?1:0,empty=5-full-half;
    return '★'.repeat(full)+(half?'½':'')+'☆'.repeat(empty);
  }

  function makeIcon(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#94a3b8';
    var fc=s.featured?' featured':'';
    var ratingHtml=s.rating
      ?'<div class="star-label">⭐ '+s.rating.toFixed(1)+'</div>'
      :'<div class="star-label no-rating">'+(IS_AR?'لا يوجد تقييم':'No rating')+'</div>';

    var html=
      '<div class="spot-wrap">'+
        '<div class="spot-pin'+fc+'" style="background:'+clr+'22;border-color:'+clr+'">'+
          s.emoji+'<div class="busy-ring ring-'+info.cls+'"></div>'+
        '</div>'+
        ratingHtml+
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
    var busyLbl=IS_AR?'الزحمة الحين':'Current Busyness';

    var starsHtml='';
    if(s.rating){
      starsHtml=
        '<div class="pop-stars-row">'+
          '<span class="pop-stars" style="color:#fbbf24">'+starStr(s.rating)+'</span>'+
          '<span class="pop-rating-num">'+s.rating.toFixed(1)+'</span>'+
          '<span class="pop-rating-src">(Google)</span>'+
        '</div>';
    }

    var barHtml=pct!==null
      ?'<div class="pop-bar-track"><div class="pop-bar-fill" style="width:'+pct+'%;background:'+info.barClr+'"></div></div>'
      :'<div style="font-size:11px;color:#94a3b8;margin-top:4px;text-align:center">'+(IS_AR?'لا توجد بيانات':'No data')+'</div>';

    return(
      '<span class="pop-emoji">'+s.emoji+'</span>'+
      '<span class="pop-cat" style="background:'+clr+'22;color:'+clr+'">'+catL+'</span>'+
      '<div class="pop-name">'+name+'</div>'+
      '<div class="pop-city">📍 '+city+'</div>'+
      starsHtml+
      '<div class="pop-desc">'+desc+'</div>'+
      '<div class="pop-busy">'+
        '<div class="pop-busy-row">'+
          '<span class="pop-busy-title">'+busyLbl+'</span>'+
          '<span class="pop-busy-val" style="color:'+info.barClr+'">'+info.dot+' '+info.label+(pct!==null?' ('+pct+'%)':'')+'</span>'+
        '</div>'+
        barHtml+
      '</div>'+
      '<a class="pop-btn" href="'+s.mapsUrl+'" target="_blank">🗺️ '+(IS_AR?'افتح الخريطة':'Open Maps')+'</a>'
    );
  }

  var map=L.map('map',{center:[23.8,44.8],zoom:5,zoomControl:true,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains:'abcd',maxZoom:18
  }).addTo(map);

  var spotMap={};
  SPOTS.forEach(function(s){
    var pct=calcBusy(s.id,s.category);
    var mk=L.marker([s.lat,s.lng],{icon:makeIcon(s,pct)})
      .bindPopup(makePopup(s,pct),{className:'lf-popup',maxWidth:290,closeButton:true})
      .addTo(map);
    spotMap[s.id]={mk:mk,spot:s};
  });

  function stamp(){
    var el=document.getElementById('refresh-stamp'); if(!el) return;
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
      var pop=e.mk.getPopup(); if(pop) pop.setContent(makePopup(e.spot,pct));
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
    iframe.style.cssText =
      "position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:none;display:block;";
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
