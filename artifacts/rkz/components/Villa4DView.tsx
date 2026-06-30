/**
 * Villa4DView — native (react-native-webview)
 * Immersive 4D villa scene: day/night + rain + animated sky.
 * Three.js via CDN, embedded in a WebView HTML string.
 */
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

interface Props {
  onReady?: () => void;
}

export default function Villa4DView({ onReady }: Props) {
  const wvRef = useRef<WebView>(null);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready" && onReady) onReady();
    } catch {}
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
        style={s.wv}
        source={{ html: VILLA_HTML }}
        originWhitelist={["*"]}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onMessage={handleMessage}
        onLoad={() => {
          // Fire onReady after a short delay even if postMessage fails
          setTimeout(() => onReady?.(), 1800);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wv: { flex: 1, backgroundColor: "#0f2040" },
});

const VILLA_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,system-ui,Arial,sans-serif;background:#87ceeb}
canvas{display:block}
#ui{position:absolute;bottom:0;left:0;right:0;padding:16px 16px 28px;display:flex;flex-direction:column;gap:10px;pointer-events:none}
#btns{display:flex;gap:10px;justify-content:center;pointer-events:all}
.btn{background:rgba(15,32,64,0.88);border:1.5px solid rgba(201,168,76,0.55);color:#c9a84c;
  padding:11px 22px;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer;
  letter-spacing:0.3px;transition:background 0.15s;box-shadow:0 4px 16px rgba(0,0,0,0.3)}
.btn:active{background:rgba(201,168,76,0.18)}
.btn.active{background:rgba(201,168,76,0.22);border-color:#c9a84c;color:#f5d98a}
#label{text-align:center;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:1px;font-weight:600;pointer-events:none}
#weatherBar{position:absolute;top:16px;left:50%;transform:translateX(-50%);
  background:rgba(15,32,64,0.82);border:1px solid rgba(201,168,76,0.3);border-radius:20px;
  padding:6px 18px;color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:0.5px;
  pointer-events:none;transition:opacity 0.4s}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="weatherBar">☀️ نهار صافٍ</div>
<div id="ui">
  <div id="btns">
    <button class="btn" id="btnNight" onclick="toggleNight()">🌙 ليل</button>
    <button class="btn" id="btnRain"  onclick="toggleRain()">🌧️ مطر</button>
  </div>
  <div id="label">اسحب للتدوير • ضغطتان للتكبير</div>
</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script>
(function(){
// ── Renderer ──────────────────────────────────────────────────────────────
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

// ── Scene / Camera ─────────────────────────────────────────────────────────
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.Fog(0x87ceeb,60,120);

var camera=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,300);
camera.position.set(14,7,14);
camera.lookAt(0,1.5,0);

// ── Lights ─────────────────────────────────────────────────────────────────
var ambLight=new THREE.AmbientLight(0xffffff,0.65);scene.add(ambLight);
var sunLight=new THREE.DirectionalLight(0xfffaed,1.4);
sunLight.position.set(20,30,15);
sunLight.castShadow=true;
sunLight.shadow.mapSize.width=1024;sunLight.shadow.mapSize.height=1024;
sunLight.shadow.camera.near=1;sunLight.shadow.camera.far=120;
sunLight.shadow.camera.left=-25;sunLight.shadow.camera.right=25;
sunLight.shadow.camera.top=25;sunLight.shadow.camera.bottom=-25;
scene.add(sunLight);
var moonLight=new THREE.DirectionalLight(0x4466cc,0.0);
moonLight.position.set(-15,20,-10);scene.add(moonLight);
var poolGlow=new THREE.PointLight(0x0099ff,0.0,18);
poolGlow.position.set(6,-0.3,4);scene.add(poolGlow);

// ── Ground ─────────────────────────────────────────────────────────────────
var groundG=new THREE.PlaneGeometry(80,80);
var groundM=new THREE.MeshLambertMaterial({color:0x4a8c52});
var ground=new THREE.Mesh(groundG,groundM);
ground.rotation.x=-Math.PI/2;ground.position.y=-1.02;ground.receiveShadow=true;scene.add(ground);

// Path
var pathG=new THREE.PlaneGeometry(2,8);
var pathM=new THREE.MeshLambertMaterial({color:0xc8b48a});
var path=new THREE.Mesh(pathG,pathM);
path.rotation.x=-Math.PI/2;path.position.set(0,-1.01,7);path.receiveShadow=true;scene.add(path);

// ── Villa Body ─────────────────────────────────────────────────────────────
var villaG=new THREE.Group();

// Main house
var bodyG=new THREE.BoxGeometry(8,4,6);
var bodyM=new THREE.MeshLambertMaterial({color:0xf5f0e8});
var body=new THREE.Mesh(bodyG,bodyM);body.position.y=1;body.castShadow=true;body.receiveShadow=true;villaG.add(body);

// Second floor
var floor2G=new THREE.BoxGeometry(5,2.5,5);
var floor2M=new THREE.MeshLambertMaterial({color:0xede8de});
var floor2=new THREE.Mesh(floor2G,floor2M);floor2.position.set(-0.5,4.25,0.5);floor2.castShadow=true;floor2.receiveShadow=true;villaG.add(floor2);

// Main roof (pyramid-ish — 4-sided cone)
var roofG=new THREE.ConeGeometry(5.2,2.5,4);
var roofM=new THREE.MeshLambertMaterial({color:0x8b3a1a});
var roof=new THREE.Mesh(roofG,roofM);roof.position.set(0,4.5,0);roof.rotation.y=Math.PI/4;roof.castShadow=true;villaG.add(roof);

// Garage
var garageG=new THREE.BoxGeometry(3.5,2.5,3);
var garageM=new THREE.MeshLambertMaterial({color:0xe8e0d0});
var garage=new THREE.Mesh(garageG,garageM);garage.position.set(4.5,0.25,-0.5);garage.castShadow=true;garage.receiveShadow=true;villaG.add(garage);
var gRoofG=new THREE.BoxGeometry(3.8,0.2,3.3);
var gRoofM=new THREE.MeshLambertMaterial({color:0x7a3318});
var gRoof=new THREE.Mesh(gRoofG,gRoofM);gRoof.position.set(4.5,1.6,-0.5);villaG.add(gRoof);

// Windows (front face z=3)
var winM=new THREE.MeshBasicMaterial({color:0xaaccff,transparent:true,opacity:0.75});
var winNightM=new THREE.MeshBasicMaterial({color:0xffdd88,transparent:true,opacity:0.85,emissive:new THREE.Color(0xffcc44)});
var wins=[];
[[-2.2,1.8,3.01],[0,1.8,3.01],[2.2,1.8,3.01],[-2.2,-0.2,3.01],[2.2,-0.2,3.01]].forEach(function(p){
  var wG=new THREE.BoxGeometry(1.1,0.9,0.04);
  var w=new THREE.Mesh(wG,winM);w.position.set(p[0],p[1],p[2]);villaG.add(w);wins.push(w);
});
// Side windows
[[-4.01,1.2,1],[4.01,1.2,1],[4.01,1.2,-1]].forEach(function(p){
  var wG2=new THREE.BoxGeometry(0.04,0.9,1.1);
  var w2=new THREE.Mesh(wG2,winM);w2.position.set(p[0],p[1],p[2]);villaG.add(w2);wins.push(w2);
});

// Door
var doorG=new THREE.BoxGeometry(1.2,2.2,0.08);
var doorM=new THREE.MeshLambertMaterial({color:0x5a2d0c});
var door=new THREE.Mesh(doorG,doorM);door.position.set(0,-0.4,3.04);villaG.add(door);

// Porch pillars
[[1.5,0,3.3],[-1.5,0,3.3]].forEach(function(p){
  var pG=new THREE.CylinderGeometry(0.12,0.14,2.4,8);
  var pM=new THREE.MeshLambertMaterial({color:0xfaf0e6});
  var pi=new THREE.Mesh(pG,pM);pi.position.set(p[0],p[1],p[2]);pi.castShadow=true;villaG.add(pi);
});

scene.add(villaG);

// ── Pool ───────────────────────────────────────────────────────────────────
var poolBorderG=new THREE.BoxGeometry(5.4,0.5,3.4);
var poolBorderM=new THREE.MeshLambertMaterial({color:0xe0d8cc});
var poolBorder=new THREE.Mesh(poolBorderG,poolBorderM);poolBorder.position.set(6,-1.02,4);scene.add(poolBorder);
var waterG=new THREE.PlaneGeometry(4.8,2.8);
var waterM=new THREE.MeshLambertMaterial({color:0x1a9bb5,transparent:true,opacity:0.88});
var water=new THREE.Mesh(waterG,waterM);water.rotation.x=-Math.PI/2;water.position.set(6,-0.78,4);scene.add(water);

// ── Trees ──────────────────────────────────────────────────────────────────
function addTree(x,z){
  var trunkG=new THREE.CylinderGeometry(0.15,0.2,1.8,8);
  var trunkM=new THREE.MeshLambertMaterial({color:0x5c3d1e});
  var trunk=new THREE.Mesh(trunkG,trunkM);trunk.position.set(x,-0.1,z);trunk.castShadow=true;scene.add(trunk);
  var leafG=new THREE.SphereGeometry(1.2,10,10);
  var leafM=new THREE.MeshLambertMaterial({color:0x2d7a2d});
  var leaf=new THREE.Mesh(leafG,leafM);leaf.position.set(x,1.5,z);leaf.castShadow=true;scene.add(leaf);
}
addTree(-8,2);addTree(-8,-3);addTree(-7,6);addTree(10,-5);addTree(-5,-7);addTree(8,-7);

// ── Stars ──────────────────────────────────────────────────────────────────
var starCount=2000;
var starPos=new Float32Array(starCount*3);
for(var si=0;si<starCount;si++){
  var th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI*0.5;
  var sr=180+Math.random()*40;
  starPos[si*3]=sr*Math.sin(ph)*Math.cos(th);
  starPos[si*3+1]=Math.abs(sr*Math.cos(ph))+10;
  starPos[si*3+2]=sr*Math.sin(ph)*Math.sin(th);
}
var starGeo=new THREE.BufferGeometry();
starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
var starMat=new THREE.PointsMaterial({color:0xffffff,size:0.5,sizeAttenuation:true,transparent:true,opacity:0});
var stars=new THREE.Points(starGeo,starMat);scene.add(stars);

// Moon
var moonG=new THREE.SphereGeometry(3,16,16);
var moonM=new THREE.MeshBasicMaterial({color:0xf0eee8,transparent:true,opacity:0});
var moon=new THREE.Mesh(moonG,moonM);moon.position.set(-60,80,-80);scene.add(moon);

// ── Rain particles ─────────────────────────────────────────────────────────
var rainCount=3000;
var rainPos=new Float32Array(rainCount*3);
for(var ri=0;ri<rainCount;ri++){
  rainPos[ri*3]=(Math.random()-0.5)*60;
  rainPos[ri*3+1]=Math.random()*30;
  rainPos[ri*3+2]=(Math.random()-0.5)*60;
}
var rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
var rainMat=new THREE.PointsMaterial({color:0xaad4ff,size:0.18,transparent:true,opacity:0.0});
var rain=new THREE.Points(rainGeo,rainMat);scene.add(rain);

// ── State & toggles ────────────────────────────────────────────────────────
var isNight=false;var isRaining=false;
var nightProgress=0;var rainProgress=0;

// Audio via Web Audio API oscillator (no external CDN needed, subtle rain texture)
var audioCtx=null;var rainNode=null;var gainNode=null;
function startRainAudio(){
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(rainNode)return;
    var bufSize=audioCtx.sampleRate*2;
    var buffer=audioCtx.createBuffer(1,bufSize,audioCtx.sampleRate);
    var data=buffer.getChannelData(0);
    for(var i=0;i<bufSize;i++)data[i]=(Math.random()*2-1)*0.3;
    rainNode=audioCtx.createBufferSource();rainNode.buffer=buffer;rainNode.loop=true;
    gainNode=audioCtx.createGain();gainNode.gain.value=0.0;
    var filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;
    rainNode.connect(filter);filter.connect(gainNode);gainNode.connect(audioCtx.destination);
    rainNode.start();
  }catch(e){}
}
function stopRainAudio(){if(gainNode)gainNode.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.5);setTimeout(function(){if(rainNode){rainNode.stop();rainNode=null;}},600);}

window.toggleNight=function(){
  isNight=!isNight;
  document.getElementById('btnNight').textContent=isNight?'☀️ نهار':'🌙 ليل';
  document.getElementById('btnNight').classList.toggle('active',isNight);
  updateWeatherBar();
};
window.toggleRain=function(){
  isRaining=!isRaining;
  document.getElementById('btnRain').textContent=isRaining?'⛔ وقف المطر':'🌧️ مطر';
  document.getElementById('btnRain').classList.toggle('active',isRaining);
  if(isRaining){startRainAudio();if(gainNode)gainNode.gain.linearRampToValueAtTime(0.28,audioCtx.currentTime+1.5);}
  else{stopRainAudio();}
  updateWeatherBar();
};
function updateWeatherBar(){
  var bar=document.getElementById('weatherBar');
  if(isNight&&isRaining)bar.textContent='🌧️ ليلة ممطرة';
  else if(isNight)bar.textContent='🌙 ليل هادئ';
  else if(isRaining)bar.textContent='🌦️ نهار ممطر';
  else bar.textContent='☀️ نهار صافٍ';
}

// ── Orbit controls (simple touch/mouse) ────────────────────────────────────
var orb={theta:0.7,phi:0.5,r:22,dragging:false,prev:{x:0,y:0}};
var cnv=document.getElementById('c');
function orbitToCart(){
  camera.position.x=orb.r*Math.sin(orb.phi)*Math.sin(orb.theta);
  camera.position.y=orb.r*Math.cos(orb.phi)+1.5;
  camera.position.z=orb.r*Math.sin(orb.phi)*Math.cos(orb.theta);
  camera.lookAt(0,1.5,0);
}
orbitToCart();
cnv.addEventListener('mousedown',function(e){orb.dragging=true;orb.prev={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',function(){orb.dragging=false;});
window.addEventListener('mousemove',function(e){
  if(!orb.dragging)return;
  orb.theta-=(e.clientX-orb.prev.x)/window.innerWidth*Math.PI*1.8;
  orb.phi=Math.max(0.15,Math.min(Math.PI/2.05,orb.phi+(e.clientY-orb.prev.y)/window.innerHeight*Math.PI));
  orb.prev={x:e.clientX,y:e.clientY};orbitToCart();
});
cnv.addEventListener('wheel',function(e){orb.r=Math.max(8,Math.min(50,orb.r+e.deltaY*0.04));orbitToCart();},{passive:true});
var tPrev=null;
cnv.addEventListener('touchstart',function(e){if(e.touches.length===1){orb.dragging=true;orb.prev={x:e.touches[0].clientX,y:e.touches[0].clientY};}tPrev=null;},{passive:true});
cnv.addEventListener('touchend',function(){orb.dragging=false;tPrev=null;},{passive:true});
cnv.addEventListener('touchmove',function(e){
  if(e.touches.length===1&&orb.dragging){
    orb.theta-=(e.touches[0].clientX-orb.prev.x)/window.innerWidth*Math.PI*2.2;
    orb.phi=Math.max(0.15,Math.min(Math.PI/2.05,orb.phi+(e.touches[0].clientY-orb.prev.y)/window.innerHeight*Math.PI));
    orb.prev={x:e.touches[0].clientX,y:e.touches[0].clientY};orbitToCart();
  }
  if(e.touches.length===2){
    var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    if(tPrev!==null){orb.r=Math.max(8,Math.min(50,orb.r-(d-tPrev)*0.05));orbitToCart();}
    tPrev=d;
  }
},{passive:true});

// ── Animation ──────────────────────────────────────────────────────────────
var clock=new THREE.Clock();
var SKY_DAY=new THREE.Color(0x87ceeb);
var SKY_NIGHT=new THREE.Color(0x0a0a1a);
var FOG_DAY=new THREE.Color(0x87ceeb);
var FOG_NIGHT=new THREE.Color(0x060614);

function lerp(a,b,t){return a+(b-a)*t;}
function clamp01(v){return Math.max(0,Math.min(1,v));}

function animate(){
  requestAnimationFrame(animate);
  var dt=clock.getDelta();
  var t=clock.getElapsedTime();

  // ── Smooth night transition ────────────────────────────────────────────
  var target=isNight?1:0;
  nightProgress=clamp01(nightProgress+(isNight?1:-1)*dt*0.9);
  var n=nightProgress;

  scene.background.lerpColors(SKY_DAY,SKY_NIGHT,n);
  scene.fog.color.lerpColors(FOG_DAY,FOG_NIGHT,n);
  scene.fog.near=lerp(60,20,n);scene.fog.far=lerp(120,60,n);

  ambLight.intensity=lerp(0.65,0.1,n);
  sunLight.intensity=lerp(1.4,0.0,n);
  moonLight.intensity=lerp(0.0,0.6,n);
  poolGlow.intensity=lerp(0.0,1.8,n);
  starMat.opacity=lerp(0,0.95,n);
  moonM.opacity=lerp(0,0.92,n);
  groundM.color.setHex(n<0.5?0x4a8c52:0x1a3520);

  // Window glow at night
  wins.forEach(function(w){
    if(n>0.3){w.material=winNightM;}else{w.material=winM;}
  });

  // Water shimmer
  waterM.color.setHex(n<0.5?0x1a9bb5:0x0a4a65);
  water.position.y=-0.78+Math.sin(t*1.2)*0.02;

  // ── Rain ────────────────────────────────────────────────────────────────
  rainProgress=clamp01(rainProgress+(isRaining?1:-1)*dt*1.5);
  rainMat.opacity=lerp(0,0.72,rainProgress);

  if(rainProgress>0.05){
    var rp=rainGeo.attributes.position.array;
    var spd=18*rainProgress;
    for(var ri=0;ri<rainCount;ri++){
      rp[ri*3+1]-=spd*dt;
      if(rp[ri*3+1]<-2){rp[ri*3+1]=30;}
    }
    rainGeo.attributes.position.needsUpdate=true;
  }

  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

// Notify parent shell
try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));}catch(e){}
})();
</script>
</body>
</html>`;
