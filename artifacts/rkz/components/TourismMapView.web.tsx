/**
 * TourismMapView — WEB (iframe srcdoc shim)
 * Combines:
 *  A) Static tourist spots (emoji pins + busyness rings) passed via props
 *  B) Live Overpass API: hotels (blue) · restaurants (red) · cafes (brown)
 * Filter buttons: الكل | سياحة | فنادق | مطاعم | كافيهات
 * Legend bottom-left. No zoom control.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

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

interface Props { spots?: TourismSpot[]; isAr?: boolean; }

function buildMapHtml(spots: TourismSpot[], isAr: boolean): string {
  const spotsJson = JSON.stringify(spots);
  const IS_AR     = isAr ? "true" : "false";
  const dir       = isAr ? "rtl" : "ltr";

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#map{height:100%;width:100%;background:#0a1628;}

  /* ── Filter bar ── */
  #filter-bar{
    position:absolute;top:115px;left:10px;z-index:1000;
    display:flex;flex-direction:column;gap:5px;
  }
  .fbtn{
    padding:4px 12px;border-radius:13px;border:1px solid rgba(255,255,255,0.22);
    background:rgba(10,22,40,0.84);color:#cbd5e1;font-size:11px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;font-weight:600;
    cursor:pointer;white-space:nowrap;min-width:70px;text-align:center;
    -webkit-tap-highlight-color:transparent;user-select:none;
    transition:background .12s,border-color .12s;
  }
  .fbtn.active{background:rgba(15,52,96,0.95);border-color:#C9A84C;color:#C9A84C;}
  .fbtn:active{opacity:.72;}

  /* ── Legend ── */
  #legend{
    position:absolute;bottom:52px;left:10px;z-index:1000;
    background:rgba(10,22,40,0.88);border:1px solid rgba(255,255,255,0.14);
    border-radius:10px;padding:7px 11px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
  }
  .l-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}
  .l-row:last-child{margin-bottom:0;}
  .ldot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
  .l-lbl{font-size:10.5px;color:#e2e8f0;font-weight:600;}

  /* ── Loading overlay ── */
  #loading{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:2000;background:rgba(10,22,40,0.93);border:1px solid rgba(201,168,76,.38);
    border-radius:14px;padding:16px 24px;text-align:center;pointer-events:none;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
  }
  #loading .spin{font-size:22px;display:block;margin-bottom:7px;animation:spin 1.2s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  #loading .ltxt{font-size:12px;color:#C9A84C;font-weight:700;}

  /* ── Emoji spot pins ── */
  .spot-icon{overflow:visible!important;background:none!important;border:none!important;}
  .spot-wrap{display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);cursor:pointer;}
  .spot-pin{
    display:flex;align-items:center;justify-content:center;
    width:40px;height:40px;border-radius:50%;font-size:18px;position:relative;
    box-shadow:0 4px 14px rgba(0,0,0,.7);border:2px solid rgba(255,255,255,.18);
    background:rgba(10,22,40,.55);
  }
  .spot-pin.feat{width:48px;height:48px;font-size:22px;border-color:#D4A843;box-shadow:0 4px 18px rgba(212,168,67,.5);}
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

  /* ── Popup ── */
  .lf-popup .leaflet-popup-content-wrapper{
    background:#0f2040;border:1.5px solid #C9A84C;border-radius:14px;
    box-shadow:0 8px 26px rgba(0,0,0,.65);color:#f1f5f9;padding:0;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;direction:${dir};
  }
  .lf-popup .leaflet-popup-tip-container{display:none;}
  .lf-popup .leaflet-popup-content{margin:14px;min-width:190px;max-width:255px;}
  .lf-popup .leaflet-popup-close-button{color:#94a3b8!important;top:8px;${isAr ? "left:8px;right:auto!important;" : "right:8px;"}font-size:18px;}
  .pop-emoji{font-size:26px;margin-bottom:5px;display:block;}
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
  .pop-rating.dim{color:#64748b;}
  .pop-btn{
    display:flex;align-items:center;justify-content:center;gap:5px;
    background:#D4A843;color:#0A1628;font-weight:700;font-size:11px;
    padding:7px 12px;border-radius:9px;text-decoration:none;width:100%;cursor:pointer;
  }
  .pop-btn:hover{background:#c99a36;}
  .pop-call{
    display:flex;align-items:center;justify-content:center;gap:5px;
    background:#16a34a;color:#fff;font-weight:700;font-size:11px;
    padding:7px 12px;border-radius:9px;text-decoration:none;width:100%;cursor:pointer;
  }
  .pop-call:hover{background:#15803d;}
  .pop-no-phone{font-size:10px;color:#475569;text-align:center;padding:3px 0;}

  /* ── Leaflet ── */
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
  <button class="fbtn active" onclick="setFilter(this,'all')">${isAr ? "الكل" : "All"}</button>
  <button class="fbtn" onclick="setFilter(this,'tourism')">${isAr ? "سياحة" : "Tourism"}</button>
  <button class="fbtn" onclick="setFilter(this,'hotel')">${isAr ? "فنادق" : "Hotels"}</button>
  <button class="fbtn" onclick="setFilter(this,'rest')">${isAr ? "مطاعم" : "Restaurants"}</button>
  <button class="fbtn" onclick="setFilter(this,'cafe')">${isAr ? "كافيهات" : "Cafes"}</button>
</div>

<div id="legend">
  <div class="l-row"><span class="ldot" style="background:#D4A843;border:1.5px solid rgba(255,255,255,.3)"></span><span class="l-lbl">${isAr ? "سياحة" : "Tourism"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#3B82F6"></span><span class="l-lbl">${isAr ? "فندق" : "Hotel"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#EF4444"></span><span class="l-lbl">${isAr ? "مطعم" : "Restaurant"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#78350F"></span><span class="l-lbl">${isAr ? "كافيه" : "Cafe"}</span></div>
</div>

<div id="loading">
  <span class="spin">⏳</span>
  <div class="ltxt">${isAr ? "جاري تحميل الفنادق والمطاعم…" : "Loading hotels & restaurants…"}</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var IS_AR=${IS_AR};
  var SPOTS=${spotsJson};

  /* ── Busyness engine ── */
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
  function stars(r){var f=Math.floor(r),h=(r-f)>=.5?1:0;return'★'.repeat(f)+(h?'½':'')+('☆'.repeat(5-f-h));}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  /* ── Map ── */
  var map=L.map('map',{center:[23.8,44.8],zoom:5,zoomControl:false,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains:'abcd',maxZoom:19
  }).addTo(map);

  /* ── Layers ── */
  var layers={
    tourism:L.layerGroup().addTo(map),
    hotel:  L.layerGroup().addTo(map),
    rest:   L.layerGroup().addTo(map),
    cafe:   L.layerGroup().addTo(map)
  };

  window.setFilter=function(btn,type){
    document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    ['tourism','hotel','rest','cafe'].forEach(function(t){
      if(type==='all'||type===t)map.addLayer(layers[t]);
      else map.removeLayer(layers[t]);
    });
  };

  /* ── Tourism spots (emoji pins) ── */
  var CAT_CLR={cultural:'#60A5FA',events:'#A78BFA',nature:'#4ADE80',entertainment:'#FB923C',religious:'#D4A843'};
  var CAT_AR ={cultural:'ثقافي',events:'فعاليات',nature:'طبيعة',entertainment:'ترفيه',religious:'ديني'};
  var CAT_EN ={cultural:'Cultural',events:'Events',nature:'Nature',entertainment:'Entertainment',religious:'Religious'};

  function makeEmojiIcon(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var fc=s.featured?' feat':'';
    var rlbl=s.rating
      ?'<div class="star-lbl">⭐ '+s.rating.toFixed(1)+'</div>'
      :'<div class="star-lbl dim">'+(IS_AR?'لا تقييم':'No rating')+'</div>';
    var html='<div class="spot-wrap"><div class="spot-pin'+fc+'" style="border-color:'+clr+'">'+
      s.emoji+'<div class="busy-ring ring-'+info.cls+'"></div></div>'+rlbl+'</div>';
    return L.divIcon({html:html,className:'spot-icon',iconSize:[0,0],iconAnchor:[0,0]});
  }

  function makeTourismPopup(s,pct){
    var info=busyInfo(pct);
    var clr=CAT_CLR[s.category]||'#D4A843';
    var catL=IS_AR?(CAT_AR[s.category]||s.category):(CAT_EN[s.category]||s.category);
    var name=IS_AR?s.nameAr:s.nameEn;
    var city=IS_AR?s.cityAr:s.cityEn;
    var desc=IS_AR?s.descAr:s.descEn;
    var bLbl=IS_AR?'الزحمة الحين':'Busyness now';
    var barH=pct!==null
      ?'<div class="pop-bar-track"><div class="pop-bar-fill" style="width:'+pct+'%;background:'+info.clr+'"></div></div>'
      :'<div style="font-size:10px;color:#94a3b8;text-align:center">'+(IS_AR?'لا بيانات':'No data')+'</div>';
    var starsH=s.rating
      ?'<div class="pop-stars-row"><span class="pop-stars">'+stars(s.rating)+'</span>'+
        '<span class="pop-rating-num">'+s.rating.toFixed(1)+'</span></div>':'' ;
    return(
      '<span class="pop-emoji">'+s.emoji+'</span>'+
      '<span class="pop-type" style="color:'+clr+'">'+esc(catL)+'</span>'+
      '<div class="pop-name">'+esc(name)+'</div>'+
      '<div class="pop-city">📍 '+esc(city)+'</div>'+
      starsH+
      '<div class="pop-desc">'+esc(desc)+'</div>'+
      '<div class="pop-busy">'+
        '<div class="pop-busy-row">'+
          '<span class="pop-busy-title">'+bLbl+'</span>'+
          '<span class="pop-busy-val" style="color:'+info.clr+'">'+info.dot+' '+info.lbl+(pct!==null?' ('+pct+'%)':'')+'</span>'+
        '</div>'+barH+
      '</div>'+
      '<a class="pop-btn" href="'+s.mapsUrl+'" target="_blank">🗺️ '+(IS_AR?'افتح الخريطة':'Open Maps')+'</a>'
    );
  }

  SPOTS.forEach(function(s){
    var pct=calcBusy(s.id,s.category);
    L.marker([s.lat,s.lng],{icon:makeEmojiIcon(s,pct)})
      .bindPopup(makeTourismPopup(s,pct),{className:'lf-popup',maxWidth:275,closeButton:true})
      .addTo(layers.tourism);
  });

  /* ── Overpass API (hotels / restaurants / cafes) ── */
  var OVP_CLR={hotel:'#3B82F6',rest:'#EF4444',cafe:'#78350F'};
  var OVP_AR ={hotel:'فندق',rest:'مطعم',cafe:'كافيه'};
  var OVP_EN ={hotel:'Hotel',rest:'Restaurant',cafe:'Café'};

  function ovpName(tags){return IS_AR?(tags['name:ar']||tags.name||''):(tags['name:en']||tags.name||'');}
  function ovpAddr(tags){
    if(tags['addr:full'])return tags['addr:full'];
    var p=[];
    if(tags['addr:city'])  p.push(tags['addr:city']);
    if(tags['addr:street'])p.push(tags['addr:street']);
    if(!p.length&&tags.city)p.push(tags.city);
    return p.join(' — ')||(IS_AR?'العنوان غير متاح':'Address N/A');
  }
  function ovpPhone(tags){return tags.phone||tags['contact:phone']||tags['contact:mobile']||'';}
  function ovpRating(tags){return tags.stars||tags['stars:official']||tags.rating||'';}

  function makeOvpPopup(type,tags){
    var color=OVP_CLR[type];
    var typeName=IS_AR?OVP_AR[type]:OVP_EN[type];
    var name=ovpName(tags)||(IS_AR?'اسم غير متاح':'Name N/A');
    var addr=ovpAddr(tags);
    var phone=ovpPhone(tags);
    var rating=ovpRating(tags);
    var h='<div class="pop-type" style="color:'+color+'">'+esc(typeName)+'</div>';
    h+='<div class="pop-name">'+esc(name)+'</div>';
    h+=rating
      ?'<div class="pop-stars-row"><span class="pop-stars" style="color:#fbbf24">'+stars(Number(rating))+'</span>'+
        '<span class="pop-rating-num">'+esc(String(rating))+'</span></div>'
      :'<div class="pop-rating dim">'+(IS_AR?'لا يوجد تقييم':'No rating')+'</div>';
    h+='<div class="pop-addr">📍 '+esc(addr)+'</div>';
    h+=phone
      ?'<a class="pop-call" href="tel:'+phone.replace(/[\\s\\-()]/g,'')+'">📞 '+(IS_AR?'اتصال':'Call')+'</a>'
      :'<div class="pop-no-phone">'+(IS_AR?'لا يوجد هاتف':'No phone')+'</div>';
    return h;
  }

  function addOvpMarker(type,el){
    if(!el.lat||!el.lon)return;
    var tags=el.tags||{};
    L.circleMarker([el.lat,el.lon],{
      radius:6.5,fillColor:OVP_CLR[type],color:'#fff',weight:1.5,opacity:1,fillOpacity:.88
    })
    .bindPopup(makeOvpPopup(type,tags),{className:'lf-popup',maxWidth:265,closeButton:true})
    .addTo(layers[type]);
  }

  var BBOX='(15,34,32.5,56)';
  var OVP_URL='https://overpass-api.de/api/interpreter';
  var pending=3;
  function done(){if(--pending<=0){var ld=document.getElementById('loading');if(ld)ld.style.display='none';}}

  function fetchOvp(type,q){
    fetch(OVP_URL,{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'data='+encodeURIComponent(q)
    })
    .then(function(r){return r.json();})
    .then(function(d){(d.elements||[]).forEach(function(el){addOvpMarker(type,el);});done();})
    .catch(function(){done();});
  }
  fetchOvp('hotel','[out:json][timeout:30];node["tourism"="hotel"]'+BBOX+';out 200;');
  fetchOvp('rest', '[out:json][timeout:30];node["amenity"="restaurant"]'+BBOX+';out 200;');
  fetchOvp('cafe', '[out:json][timeout:30];node["amenity"="cafe"]'+BBOX+';out 200;');

  /* ── Auto-refresh busyness every 15 min ── */
  setInterval(function(){
    layers.tourism.clearLayers();
    SPOTS.forEach(function(s){
      var pct=calcBusy(s.id,s.category);
      L.marker([s.lat,s.lng],{icon:makeEmojiIcon(s,pct)})
        .bindPopup(makeTourismPopup(s,pct),{className:'lf-popup',maxWidth:275,closeButton:true})
        .addTo(layers.tourism);
    });
  },15*60*1000);
})();
</script>
</body>
</html>`;
}

export default function TourismMapView({ spots = [], isAr = false }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const keyRef       = useRef("");
  const htmlRef      = useRef("");

  const key = spots.map((s) => s.id).join(",") + (isAr ? "_ar" : "_en");
  if (htmlRef.current === "" || keyRef.current !== key) {
    keyRef.current  = key;
    htmlRef.current = buildMapHtml(spots, isAr);
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

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative", backgroundColor: "#0a1628" },
});
