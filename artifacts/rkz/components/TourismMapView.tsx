/**
 * TourismMapView — NATIVE (WebView variant)
 * Metro auto-selects TourismMapView.web.tsx on web builds.
 * Combines static tourist spots (emoji pins) + POI from /api/poi (injected as JSON).
 */
import React, { useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

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

export interface PoiPlace {
  osmId: number;
  type: string;
  nameAr: string | null;
  nameEn: string | null;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

interface Props {
  spots?:     TourismSpot[];
  isAr?:      boolean;
  poiPlaces?: PoiPlace[];
  userLat?:   number;
  userLng?:   number;
}

function buildMapHtml(
  spots:     TourismSpot[],
  isAr:      boolean,
  poiPlaces: PoiPlace[],
  userLat?:  number,
  userLng?:  number,
): string {
  const spotsJson = JSON.stringify(spots);
  const poiJson   = JSON.stringify(poiPlaces);
  const IS_AR     = isAr ? "true" : "false";
  const dir       = isAr ? "rtl" : "ltr";
  const ulat      = userLat != null ? String(userLat) : "null";
  const ulng      = userLng != null ? String(userLng) : "null";
  const mapCenter = userLat != null ? `[${userLat},${userLng}]` : "[23.8,44.8]";
  const mapZoom   = userLat != null ? "12" : "5";

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#map{height:100%;width:100%;background:#0f2040;}

  #filter-bar{
    position:absolute;top:115px;${isAr ? "right" : "left"}:10px;z-index:1000;
    display:flex;flex-direction:column;gap:5px;
  }
  .fbtn{
    padding:5px 12px;border-radius:13px;border:1px solid rgba(255,255,255,0.22);
    background:rgba(10,22,40,0.84);color:#cbd5e1;font-size:12px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;font-weight:600;
    cursor:pointer;white-space:nowrap;min-width:72px;text-align:center;
    -webkit-tap-highlight-color:transparent;user-select:none;
  }
  .fbtn.active{background:rgba(15,52,96,0.95);border-color:#C9A84C;color:#C9A84C;}
  .fbtn:active{opacity:.72;}

  #legend{
    position:absolute;bottom:52px;${isAr ? "right" : "left"}:10px;z-index:1000;
    background:rgba(10,22,40,0.88);border:1px solid rgba(255,255,255,0.14);
    border-radius:10px;padding:7px 11px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
  }
  .l-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}
  .l-row:last-child{margin-bottom:0;}
  .ldot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
  .l-lbl{font-size:11px;color:#e2e8f0;font-weight:600;}

  .spot-icon{overflow:visible!important;background:none!important;border:none!important;}
  .spot-wrap{display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);cursor:pointer;}
  .spot-pin{
    display:flex;align-items:center;justify-content:center;
    width:42px;height:42px;border-radius:50%;font-size:19px;position:relative;
    box-shadow:0 4px 14px rgba(0,0,0,.7);border:2px solid rgba(255,255,255,.18);
    background:rgba(10,22,40,.55);
  }
  .spot-pin.feat{width:50px;height:50px;font-size:23px;border-color:#D4A843;box-shadow:0 4px 18px rgba(212,168,67,.5);}
  .busy-ring{position:absolute;inset:-5px;border-radius:50%;border:3px solid transparent;pointer-events:none;}
  .ring-green {border-color:#22c55e;box-shadow:0 0 7px rgba(34,197,94,.4);}
  .ring-yellow{border-color:#eab308;box-shadow:0 0 7px rgba(234,179,8,.4);}
  .ring-red   {border-color:#ef4444;animation:pulse-red 1.5s infinite;}
  .ring-gray  {border-color:#94a3b8;opacity:.4;}
  @keyframes pulse-red{0%,100%{box-shadow:0 0 4px rgba(239,68,68,.3);}50%{box-shadow:0 0 12px rgba(239,68,68,.8);}}
  .star-lbl{
    margin-top:4px;padding:2px 8px;border-radius:9px;font-size:10px;
    white-space:nowrap;font-weight:700;font-family:-apple-system,'Segoe UI',sans-serif;
    background:rgba(10,22,40,.82);color:#fbbf24;border:1px solid rgba(212,168,67,.3);
    box-shadow:0 2px 6px rgba(0,0,0,.5);
  }
  .star-lbl.dim{color:#94a3b8;border-color:rgba(148,163,184,.2);}

  .lf-popup .leaflet-popup-content-wrapper{
    background:#0f2040;border:1.5px solid #C9A84C;border-radius:14px;
    box-shadow:0 8px 26px rgba(0,0,0,.65);color:#f1f5f9;padding:0;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;direction:${dir};
  }
  .lf-popup .leaflet-popup-tip-container{display:none;}
  .lf-popup .leaflet-popup-content{margin:14px;min-width:190px;max-width:255px;}
  .lf-popup .leaflet-popup-close-button{color:#94a3b8!important;top:8px;${isAr ? "left:8px;right:auto!important;" : "right:8px;"}font-size:20px;}
  .pop-type{font-size:10px;font-weight:800;margin-bottom:5px;letter-spacing:.4px;}
  .pop-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;line-height:1.4;}
  .pop-city{font-size:11px;color:#D4A843;margin-bottom:3px;}
  .pop-desc{font-size:11px;color:rgba(241,245,249,.58);line-height:1.55;margin-bottom:8px;}
  .pop-stars-row{display:flex;align-items:center;gap:5px;margin-bottom:8px;${isAr ? "flex-direction:row-reverse;" : ""}}
  .pop-stars{font-size:13px;color:#fbbf24;}
  .pop-rating-num{font-size:12px;font-weight:700;color:#fbbf24;}
  .pop-busy{background:rgba(255,255,255,.06);border-radius:9px;padding:8px 11px;margin-bottom:10px;}
  .pop-busy-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;${isAr ? "flex-direction:row-reverse;" : ""}}
  .pop-busy-title{font-size:10px;color:rgba(255,255,255,.4);}
  .pop-busy-val{font-size:11px;font-weight:700;}
  .pop-bar-track{height:4px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;}
  .pop-bar-fill{height:100%;border-radius:3px;}
  .pop-addr{font-size:11px;color:rgba(241,245,249,.52);margin-bottom:9px;line-height:1.5;}
  .pop-btn{
    display:flex;align-items:center;justify-content:center;gap:5px;
    background:#D4A843;color:#0F2040;font-weight:700;font-size:11px;
    padding:7px 12px;border-radius:9px;text-decoration:none;width:100%;
  }
  .pop-call{
    display:flex;align-items:center;justify-content:center;gap:5px;
    background:#16a34a;color:#fff;font-weight:700;font-size:11px;
    padding:7px 12px;border-radius:9px;text-decoration:none;width:100%;
  }
  .pop-no-phone{font-size:10px;color:#475569;text-align:center;padding:3px 0;}

  .leaflet-control-container > *{display:none!important;}
  .leaflet-control-container .leaflet-bottom.leaflet-right{display:block!important;}
  .leaflet-control-attribution{background:rgba(10,22,40,.7)!important;color:#475569!important;font-size:9px!important;display:block!important;}
  .leaflet-control-attribution a{color:#C9A84C!important;}
  .leaflet-tile-pane{will-change:transform;}
  .leaflet-tile-container img{width:256.5px!important;height:256.5px!important;}
</style>
</head>
<body>
<div id="map"></div>

<div id="filter-bar">
  <button class="fbtn" onclick="setFilter(this,'tourism')">${isAr ? "سياحة" : "Tourism"}</button>
  <button class="fbtn" onclick="setFilter(this,'hotel')">${isAr ? "فنادق" : "Hotels"}</button>
  <button class="fbtn" onclick="setFilter(this,'rest')">${isAr ? "مطاعم" : "Rest."}</button>
  <button class="fbtn" onclick="setFilter(this,'cafe')">${isAr ? "كافيهات" : "Cafes"}</button>
  <button class="fbtn" onclick="setFilter(this,'historic')">${isAr ? "تاريخي" : "Historic"}</button>
  <button class="fbtn" onclick="setFilter(this,'attraction')">${isAr ? "مناطق" : "Spots"}</button>
</div>

<div id="legend">
  <div class="l-row"><span class="ldot" style="background:#6366F1;border:1.5px solid #fff"></span><span class="l-lbl">${isAr ? "موقعك" : "You"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#D4A843"></span><span class="l-lbl">${isAr ? "سياحة" : "Tourism"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#3B82F6"></span><span class="l-lbl">${isAr ? "فندق" : "Hotel"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#EF4444"></span><span class="l-lbl">${isAr ? "مطعم" : "Restaurant"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#92400E"></span><span class="l-lbl">${isAr ? "كافيه" : "Cafe"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#D97706"></span><span class="l-lbl">${isAr ? "تاريخي" : "Historic"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#16A34A"></span><span class="l-lbl">${isAr ? "مناطق" : "Spots"}</span></div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var IS_AR=${IS_AR};
  var SPOTS=${spotsJson};
  var POI_PLACES=${poiJson};
  var USER_LAT=${ulat};
  var USER_LNG=${ulng};

  var PAT={
    cultural     :[[8,11,55],[11,14,45],[14,17,70],[17,21,78],[21,23,42]],
    events       :[[9,12,25],[12,15,20],[15,17,40],[17,20,88],[20,23,82]],
    nature       :[[6,9,68],[9,12,58],[12,15,38],[15,18,62],[18,20,30]],
    entertainment:[[10,13,32],[13,16,48],[16,19,65],[19,22,92],[22,24,72]],
    religious    :[[4,6,82],[11,13,95],[14,16,72],[17,20,88],[20,22,68]]
  };
  var WKD=[5,6];
  function ksaH(){return(new Date().getUTCHours()+3)%24;}
  function ksaD(){var n=new Date(),h=n.getUTCHours()+3;return(n.getUTCDay()+(h>=24?1:0))%7;}
  function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))&0xffff;return h;}
  function calcBusy(id,cat){
    var pts=PAT[cat];if(!pts)return null;
    var h=ksaH(),d=ksaD(),b=10;
    for(var i=0;i<pts.length;i++){var p=pts[i];if(h>=p[0]&&h<p[1]){b=p[2];break;}}
    if(WKD.indexOf(d)!==-1)b=Math.min(100,b+22);
    return Math.max(0,Math.min(100,Math.round(b+((hash(id)%25)-12))));
  }
  function busyInfo(pct){
    if(pct===null)return{cls:'gray',dot:'⚫',lbl:IS_AR?'لا بيانات':'No data',clr:'#94a3b8'};
    if(pct<40)  return{cls:'green', dot:'🟢',lbl:IS_AR?'رايق':'Quiet',   clr:'#22c55e'};
    if(pct<75)  return{cls:'yellow',dot:'🟡',lbl:IS_AR?'وسط':'Moderate', clr:'#eab308'};
    return      {cls:'red',  dot:'🔴',lbl:IS_AR?'زحمة':'Busy',           clr:'#ef4444'};
  }
  function stars(r){if(!r)return'';var f=Math.floor(r),h=(r-f)>=.5?1:0;return'★'.repeat(f)+(h?'½':'')+('☆'.repeat(5-f-h));}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  var map=L.map('map',{center:${mapCenter},zoom:${mapZoom},zoomControl:false,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy;<a href="https://www.openstreetmap.org/copyright">OSM</a>&copy;<a href="https://carto.com">CARTO</a>',
    subdomains:'abcd',maxZoom:19
  }).addTo(map);

  var ALL_KEYS=['tourism','hotel','rest','cafe','historic','attraction'];
  var layers={
    tourism:   L.layerGroup().addTo(map),
    hotel:     L.layerGroup().addTo(map),
    rest:      L.layerGroup().addTo(map),
    cafe:      L.layerGroup().addTo(map),
    historic:  L.layerGroup().addTo(map),
    attraction:L.layerGroup().addTo(map)
  };

  window.setFilter=function(btn,type){
    var wasActive=btn.classList.contains('active');
    document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});
    if(wasActive){
      ALL_KEYS.forEach(function(t){map.addLayer(layers[t]);});
    }else{
      btn.classList.add('active');
      ALL_KEYS.forEach(function(t){
        if(t===type)map.addLayer(layers[t]);else map.removeLayer(layers[t]);
      });
    }
  };

  var CAT_CLR={cultural:'#60A5FA',events:'#A78BFA',nature:'#4ADE80',entertainment:'#FB923C',religious:'#D4A843'};
  var CAT_AR ={cultural:'ثقافي',events:'فعاليات',nature:'طبيعة',entertainment:'ترفيه',religious:'ديني'};
  var CAT_EN ={cultural:'Cultural',events:'Events',nature:'Nature',entertainment:'Entertainment',religious:'Religious'};

  function makeEmojiIcon(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var fc=s.featured?' feat':'';
    var rlbl=s.rating
      ?'<div class="star-lbl">⭐ '+s.rating.toFixed(1)+'</div>'
      :'<div class="star-lbl dim">'+(IS_AR?'لا تقييم':'—')+'</div>';
    return L.divIcon({
      html:'<div class="spot-wrap"><div class="spot-pin'+fc+'" style="border-color:'+clr+'">'+
        s.emoji+'<div class="busy-ring ring-'+info.cls+'"></div></div>'+rlbl+'</div>',
      className:'spot-icon',iconSize:[0,0],iconAnchor:[0,0]
    });
  }

  function makeTourismPopup(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var catL=IS_AR?(CAT_AR[s.category]||s.category):(CAT_EN[s.category]||s.category);
    var name=IS_AR?s.nameAr:s.nameEn;
    var city=IS_AR?s.cityAr:s.cityEn;
    var desc=IS_AR?s.descAr:s.descEn;
    var barH=pct!==null
      ?'<div class="pop-bar-track"><div class="pop-bar-fill" style="width:'+pct+'%;background:'+info.clr+'"></div></div>'
      :'';
    var starsH=s.rating
      ?'<div class="pop-stars-row"><span class="pop-stars">'+stars(s.rating)+'</span>'+
        '<span class="pop-rating-num">'+s.rating.toFixed(1)+'</span></div>':'';
    return(
      '<span class="pop-type" style="color:'+clr+'">'+esc(catL)+'</span>'+
      '<div class="pop-name">'+esc(name)+'</div>'+
      '<div class="pop-city">📍 '+esc(city)+'</div>'+
      starsH+
      '<div class="pop-desc">'+esc(desc)+'</div>'+
      '<div class="pop-busy">'+
        '<div class="pop-busy-row">'+
          '<span class="pop-busy-title">'+(IS_AR?'الزحمة الحين':'Busyness now')+'</span>'+
          '<span class="pop-busy-val" style="color:'+info.clr+'">'+info.dot+' '+info.lbl+(pct!==null?' ('+pct+'%)':'')+'</span>'+
        '</div>'+barH+
      '</div>'+
      '<a class="pop-btn" href="'+s.mapsUrl+'" target="_blank">🗺️ '+(IS_AR?'افتح الخريطة':'Open Maps')+'</a>'
    );
  }

  function renderTourismSpots(){
    layers.tourism.clearLayers();
    SPOTS.forEach(function(s){
      var pct=calcBusy(s.id,s.category);
      L.marker([s.lat,s.lng],{icon:makeEmojiIcon(s,pct)})
        .bindPopup(makeTourismPopup(s,pct),{className:'lf-popup',maxWidth:275,closeButton:true})
        .addTo(layers.tourism);
    });
  }
  renderTourismSpots();

  /* ── POI from /api/poi (pre-fetched, injected as JSON) ── */
  var POI_CFG={
    restaurant:{clr:'#EF4444',emoji:'🍽️',arName:'مطعم',    enName:'Restaurant',layer:'rest'},
    hotel:     {clr:'#3B82F6',emoji:'🏨',arName:'فندق',    enName:'Hotel',     layer:'hotel'},
    cafe:      {clr:'#92400E',emoji:'☕', arName:'كافيه',   enName:'Café',      layer:'cafe'},
    historic:  {clr:'#D97706',emoji:'🏛️',arName:'تاريخي',  enName:'Historic',  layer:'historic'},
    attraction:{clr:'#16A34A',emoji:'🎯',arName:'منطقة سياحية',enName:'Attraction',layer:'attraction'}
  };

  function renderPoi(){
    ['hotel','rest','cafe','historic','attraction'].forEach(function(k){layers[k].clearLayers();});
    POI_PLACES.forEach(function(p){
      var cfg=POI_CFG[p.type];
      if(!cfg)return;
      var name=IS_AR?(p.nameAr||p.nameEn||''):(p.nameEn||p.nameAr||'');
      if(!name)name=IS_AR?'اسم غير متاح':'N/A';
      var tags=p.tags||{};
      var phone=tags.phone||tags['contact:phone']||tags['contact:mobile']||'';
      var addr=tags['addr:full']||'';
      if(!addr){var ap=[];if(tags['addr:city'])ap.push(tags['addr:city']);if(tags['addr:street'])ap.push(tags['addr:street']);addr=ap.join(' — ');}

      var h='<div class="pop-type" style="color:'+cfg.clr+'">'+cfg.emoji+' '+(IS_AR?cfg.arName:cfg.enName)+'</div>';
      h+='<div class="pop-name">'+esc(name)+'</div>';
      if(addr)h+='<div class="pop-addr">📍 '+esc(addr)+'</div>';
      if(phone){
        h+='<a class="pop-call" href="tel:'+phone.replace(/[\\s\\-()]/g,'')+'">📞 '+(IS_AR?'اتصال':'Call')+'</a>';
      }else{
        h+='<div class="pop-no-phone">'+(IS_AR?'لا يوجد هاتف':'No phone')+'</div>';
      }

      L.circleMarker([p.lat,p.lng],{
        radius:6,fillColor:cfg.clr,color:'#fff',weight:1.5,opacity:1,fillOpacity:.88
      })
      .bindPopup(h,{className:'lf-popup',maxWidth:265,closeButton:true})
      .addTo(layers[cfg.layer]);
    });
  }
  renderPoi();

  /* ── User location pin ── */
  if(USER_LAT&&USER_LNG){
    L.circleMarker([USER_LAT,USER_LNG],{
      radius:10,fillColor:'#6366F1',color:'#fff',weight:2.5,opacity:1,fillOpacity:.95
    })
    .bindPopup('<div class="pop-name">'+(IS_AR?'📍 موقعك الحالي':'📍 Your Location')+'</div>',
      {className:'lf-popup'})
    .addTo(map);
  }

  setInterval(renderTourismSpots,15*60*1000);
})();
</script>
</body>
</html>`;
}

export default function TourismMapView({
  spots     = [],
  isAr      = false,
  poiPlaces = [],
  userLat,
  userLng,
}: Props) {
  const webRef  = useRef<WebView>(null);
  const htmlRef = useRef<string>("");
  const keyRef  = useRef("");

  const key = [
    spots.map((s) => s.id).join(","),
    isAr ? "ar" : "en",
    poiPlaces.length,
    userLat ?? "x",
    userLng ?? "x",
  ].join("|");

  if (htmlRef.current === "" || keyRef.current !== key) {
    keyRef.current  = key;
    htmlRef.current = buildMapHtml(spots, isAr, poiPlaces, userLat, userLng);
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
  webview: { flex: 1, backgroundColor: "#0f2040" },
});
