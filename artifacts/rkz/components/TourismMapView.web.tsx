/**
 * TourismMapView — WEB PLATFORM (iframe srcdoc shim)
 * Fetches live data from Overpass API:
 *  - tourism=hotel  → blue pins
 *  - amenity=restaurant → red pins
 *  - amenity=cafe   → brown pins
 * Filter buttons top-left, legend bottom-left, popup with call button.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

export interface TourismSpot { id: string; lat: number; lng: number; }

interface Props { spots?: TourismSpot[]; isAr?: boolean; }

function buildMapHtml(isAr: boolean): string {
  const IS_AR = isAr ? "true" : "false";
  const dir   = isAr ? "rtl" : "ltr";
  const lang  = isAr ? "ar"  : "en";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#map{height:100%;width:100%;background:#0a1628;}

  /* ── Filter bar ─────────────────────────────────────────── */
  #filter-bar{
    position:absolute;top:74px;left:10px;z-index:1000;
    display:flex;flex-direction:column;gap:5px;
  }
  .fbtn{
    display:flex;align-items:center;justify-content:center;
    padding:4px 11px;border-radius:14px;border:1px solid rgba(255,255,255,0.20);
    background:rgba(10,22,40,0.82);color:#cbd5e1;font-size:11px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
    font-weight:600;cursor:pointer;white-space:nowrap;
    transition:background 0.12s,border-color 0.12s;
    -webkit-tap-highlight-color:transparent;user-select:none;
    min-width:64px;
  }
  .fbtn.active{ background:rgba(15,52,96,0.92);border-color:#C9A84C;color:#C9A84C; }
  .fbtn:active{ opacity:0.72; }

  /* ── Legend ─────────────────────────────────────────────── */
  #legend{
    position:absolute;bottom:36px;left:12px;z-index:1000;
    background:rgba(10,22,40,0.88);border:1px solid rgba(255,255,255,0.15);
    border-radius:10px;padding:8px 12px;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
  }
  .l-row{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
  .l-row:last-child{margin-bottom:0;}
  .ldot{width:11px;height:11px;border-radius:50%;border:2px solid rgba(255,255,255,0.45);flex-shrink:0;}
  .l-lbl{font-size:11px;color:#e2e8f0;font-weight:600;}

  /* ── Loading ────────────────────────────────────────────── */
  #loading{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:2000;background:rgba(10,22,40,0.92);border:1px solid rgba(201,168,76,0.40);
    border-radius:14px;padding:18px 28px;text-align:center;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;pointer-events:none;
  }
  #loading .spin{font-size:24px;display:block;margin-bottom:8px;animation:spin 1.2s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  #loading .ltxt{font-size:13px;color:#C9A84C;font-weight:600;}
  #loading .lsub{font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;}

  /* ── Popup ──────────────────────────────────────────────── */
  .lf-popup .leaflet-popup-content-wrapper{
    background:#0f2040;border:1.5px solid #C9A84C;border-radius:14px;
    box-shadow:0 8px 28px rgba(0,0,0,0.65);color:#f1f5f9;padding:0;
    font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;
    direction:${dir};
  }
  .lf-popup .leaflet-popup-tip-container{display:none;}
  .lf-popup .leaflet-popup-content{margin:14px;min-width:190px;max-width:250px;}
  .lf-popup .leaflet-popup-close-button{color:#94a3b8!important;top:8px;${isAr?"left:8px;right:auto!important;":"right:8px;"}font-size:18px;}

  .pop-type{font-size:11px;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .pop-name{font-size:15px;font-weight:700;color:#fff;margin-bottom:5px;line-height:1.4;}
  .pop-rating{font-size:12px;color:#fbbf24;margin-bottom:4px;}
  .pop-rating.muted{color:#64748b;}
  .pop-addr{font-size:11px;color:rgba(241,245,249,0.55);margin-bottom:10px;line-height:1.5;}
  .pop-call{
    display:flex;align-items:center;justify-content:center;gap:6px;
    background:#16a34a;color:#fff;font-weight:700;font-size:12px;
    padding:8px 14px;border-radius:10px;text-decoration:none;
    width:100%;cursor:pointer;
  }
  .pop-call:hover{background:#15803d;}
  .pop-no-phone{font-size:10px;color:#475569;text-align:center;padding:4px 0;}

  /* ── Leaflet misc ───────────────────────────────────────── */
  .leaflet-control-zoom{border:none!important;}
  .leaflet-control-zoom a{
    background:rgba(10,22,40,0.88)!important;color:#e2e8f0!important;
    border:1px solid rgba(255,255,255,0.18)!important;border-radius:8px!important;margin-bottom:3px!important;
  }
  .leaflet-control-attribution{background:rgba(10,22,40,0.7)!important;color:#475569!important;font-size:9px!important;}
  .leaflet-control-attribution a{color:#C9A84C!important;}
  .leaflet-tile-pane{will-change:transform;}
  .leaflet-tile-container img{width:256.5px!important;height:256.5px!important;}
</style>
</head>
<body>
<div id="map"></div>

<div id="filter-bar">
  <button class="fbtn active" data-type="all"   onclick="setFilter(this,'all')">${isAr?"الكل":"All"}</button>
  <button class="fbtn"        data-type="hotel"  onclick="setFilter(this,'hotel')">${isAr?"فنادق":"Hotels"}</button>
  <button class="fbtn"        data-type="rest"   onclick="setFilter(this,'rest')">${isAr?"مطاعم":"Restaurants"}</button>
  <button class="fbtn"        data-type="cafe"   onclick="setFilter(this,'cafe')">${isAr?"كافيهات":"Cafes"}</button>
</div>

<div id="legend">
  <div class="l-row"><span class="ldot" style="background:#3B82F6"></span><span class="l-lbl">${isAr?"فندق":"Hotel"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#EF4444"></span><span class="l-lbl">${isAr?"مطعم":"Restaurant"}</span></div>
  <div class="l-row"><span class="ldot" style="background:#78350F"></span><span class="l-lbl">${isAr?"كافيه":"Cafe"}</span></div>
</div>

<div id="loading">
  <span class="spin">⏳</span>
  <div class="ltxt">${isAr?"جاري تحميل البيانات…":"Loading data…"}</div>
  <div class="lsub">${isAr?"Overpass API — السعودية":"Overpass API — Saudi Arabia"}</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var IS_AR = ${IS_AR};
  var COLORS = { hotel:'#3B82F6', rest:'#EF4444', cafe:'#78350F' };
  var TYPE_AR = { hotel:'فندق', rest:'مطعم', cafe:'كافيه' };
  var TYPE_EN = { hotel:'Hotel', rest:'Restaurant', cafe:'Café' };

  var map = L.map('map',{center:[23.8,44.8],zoom:5,zoomControl:true,attributionControl:true});
  map.zoomControl.setPosition('topright');

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains:'abcd',maxZoom:19
  }).addTo(map);

  var layers = {
    hotel: L.layerGroup().addTo(map),
    rest:  L.layerGroup().addTo(map),
    cafe:  L.layerGroup().addTo(map)
  };

  window.setFilter = function(btn, type){
    document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    ['hotel','rest','cafe'].forEach(function(t){
      if(type==='all'||type===t) map.addLayer(layers[t]);
      else map.removeLayer(layers[t]);
    });
  };

  function getName(tags){
    if(IS_AR) return tags['name:ar']||tags.name||'';
    return tags['name:en']||tags.name||'';
  }
  function getAddr(tags){
    if(tags['addr:full']) return tags['addr:full'];
    var p=[];
    if(tags['addr:city'])   p.push(tags['addr:city']);
    if(tags['addr:street']) p.push(tags['addr:street']);
    if(tags.city)           p.push(tags.city);
    return p.join(' — ')||(IS_AR?'العنوان غير متاح':'Address N/A');
  }
  function getPhone(tags){
    return tags.phone||tags['contact:phone']||tags['contact:mobile']||tags['phone:mobile']||'';
  }
  function getRating(tags){
    return tags.stars||tags['stars:official']||tags.rating||'';
  }

  function makePopup(type,tags){
    var color=COLORS[type];
    var typeName=IS_AR?TYPE_AR[type]:TYPE_EN[type];
    var name=getName(tags)||(IS_AR?'اسم غير متاح':'Name N/A');
    var addr=getAddr(tags);
    var phone=getPhone(tags);
    var rating=getRating(tags);

    var h='<div class="pop-type" style="color:'+color+'">'+typeName+'</div>';
    h+='<div class="pop-name">'+escHtml(name)+'</div>';
    if(rating){
      h+='<div class="pop-rating">⭐ '+escHtml(String(rating))+'</div>';
    } else {
      h+='<div class="pop-rating muted">'+(IS_AR?'لا يوجد تقييم':'No rating')+'</div>';
    }
    h+='<div class="pop-addr">📍 '+escHtml(addr)+'</div>';
    if(phone){
      var cleanPhone=phone.replace(/[\\s\\-()]/g,'');
      h+='<a class="pop-call" href="tel:'+cleanPhone+'">📞 '+(IS_AR?'اتصال':'Call')+'</a>';
    } else {
      h+='<div class="pop-no-phone">'+(IS_AR?'لا يوجد رقم هاتف':'No phone available')+'</div>';
    }
    return h;
  }

  function escHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function addMarker(type, el){
    if(!el.lat||!el.lon) return;
    var tags=el.tags||{};
    var name=getName(tags);
    if(!name) return;
    var mk=L.circleMarker([el.lat,el.lon],{
      radius:7,fillColor:COLORS[type],
      color:'#fff',weight:1.5,opacity:1,fillOpacity:0.90
    });
    mk.bindPopup(makePopup(type,tags),{className:'lf-popup',maxWidth:270,closeButton:true});
    mk.addTo(layers[type]);
  }

  var BBOX='(15,34,32.5,56)';
  var OVP='https://overpass-api.de/api/interpreter';
  var pending=3;

  function done(){
    pending--;
    if(pending<=0){
      var ld=document.getElementById('loading');
      if(ld) ld.style.display='none';
    }
  }

  function fetchType(type, query){
    fetch(OVP,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'data='+encodeURIComponent(query)
    })
    .then(function(r){return r.json();})
    .then(function(data){
      (data.elements||[]).forEach(function(el){ addMarker(type,el); });
      done();
    })
    .catch(function(){
      done();
    });
  }

  fetchType('hotel',     '[out:json][timeout:30];node["tourism"="hotel"]'+BBOX+';out 200;');
  fetchType('rest',      '[out:json][timeout:30];node["amenity"="restaurant"]'+BBOX+';out 200;');
  fetchType('cafe',      '[out:json][timeout:30];node["amenity"="cafe"]'+BBOX+';out 200;');

})();
</script>
</body>
</html>`;
}

export default function TourismMapView({ isAr = false }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const keyRef       = useRef("");
  const htmlRef      = useRef("");

  const key = isAr ? "ar" : "en";
  if (htmlRef.current === "" || keyRef.current !== key) {
    keyRef.current  = key;
    htmlRef.current = buildMapHtml(isAr);
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
