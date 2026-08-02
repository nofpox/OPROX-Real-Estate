/**
 * Property3DViewer.web.tsx — Phase 6 Premium Property 3D Viewer
 * Multi-layer 3D Digital Twin + Floor Plan + Real Estate Unit Matrix
 */
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, Platform, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface Unit {
  unitId: string;
  floor: number;
  bedrooms: number;
  areaSqm: number;
  price: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED" | "UNAVAILABLE";
}

interface Property3DViewerProps {
  listingId: string;
  title?: string;
  price?: number;
  areaSqm?: number;
  modelUrl?: string;
  classification?: "ACTUAL PROPERTY MODEL" | "CONCEPTUAL MODEL" | "AI-GENERATED MODEL" | "PROCEDURAL REPRESENTATION";
  estimate?: {
    low: number;
    high: number;
    pricePerSqm: number;
    confidence: string;
  };
  floorPlanUrl?: string;
  onClose?: () => void;
}export default function Property3DViewer({
  listingId,
  title = "فيلا فاخرة - حي النرجس",
  price = 3200000,
  areaSqm = 550,
  modelUrl = "/media/models/sample_villa.glb",
  classification = "DEVELOPMENT/TEST ASSET",
  estimate = { low: 2976000, high: 3424000, pricePerSqm: 5818, confidence: "HIGH" },
  floorPlanUrl = "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1000",
  onClose,
}: Property3DViewerProps) {
  const [viewMode, setViewMode] = useState<"3D" | "PANO360" | "AR" | "FLOOR_PLAN" | "UNITS">("3D");
  const [isNight, setIsNight] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [xrCapability, setXrCapability] = useState<string>("VR_SUPPORTED");

  // Mock Unit matrix for Building -> Floor -> Unit hierarchy
  const units: Unit[] = [
    { unitId: "101", floor: 1, bedrooms: 3, areaSqm: 180, price: 1200000, status: "AVAILABLE" },
    { unitId: "102", floor: 1, bedrooms: 2, areaSqm: 130, price: 950000, status: "SOLD" },
    { unitId: "201", floor: 2, bedrooms: 4, areaSqm: 240, price: 1650000, status: "AVAILABLE" },
    { unitId: "202", floor: 2, bedrooms: 3, areaSqm: 190, price: 1300000, status: "RESERVED" },
    { unitId: "301", floor: 3, bedrooms: 5, areaSqm: 310, price: 2100000, status: "RENTED" },
    { unitId: "302", floor: 3, bedrooms: 4, areaSqm: 220, price: 1550000, status: "UNAVAILABLE" },
  ];

  const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#0b1329;font-family:-apple-system,system-ui,Arial,sans-serif}
canvas{display:block;width:100%;height:100%}
#hud{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-space:space-between;align-items:center;pointer-events:none;z-index:20}
.badge{background:rgba(15,32,64,0.92);border:1px solid rgba(201,168,76,0.5);color:#f5d98a;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:700;letter-spacing:0.5px}
.xr-badge{background:rgba(16,185,129,0.2);border:1px solid #10b981;color:#10b981;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:700}
#controls{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px;background:rgba(10,18,38,0.92);border:1px solid rgba(0,120,255,0.4);border-radius:24px;padding:6px 12px;pointer-events:all;z-index:20}
.btn{background:rgba(0,80,255,0.15);border:1px solid rgba(0,120,255,0.4);color:#8cc2ff;padding:6px 14px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:4px}
.btn:hover,.btn:active{background:rgba(0,120,255,0.3);color:#fff}
.vr-btn{background:rgba(201,168,76,0.25);border-color:#c9a84c;color:#f5d98a;font-weight:700}
.vr-btn:hover{background:rgba(201,168,76,0.4)}
#hotspotCard{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(15,32,64,0.95);border:1.5px solid #c9a84c;border-radius:14px;padding:10px 16px;color:#fff;font-size:12px;display:none;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:25}
#hotspotCard .hsTitle{color:#c9a84c;font-weight:700;font-size:13px}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <div class="badge">🏷️ ${classification}</div>
  <div id="xrBadge" class="xr-badge">🕶️ WebXR Ready</div>
  <div class="badge">OPROX WebXR VR Engine</div>
</div>
<div id="controls">
  <button class="btn vr-btn" id="vrBtn" onclick="requestVrSession()">🕶️ دخول VR (WebXR)</button>
  <button class="btn" onclick="toggleNight()">${isNight ? "☀️ نهار" : "🌙 ليل"}</button>
  <button class="btn" onclick="teleportRoom('living')">🛋️ الصالة</button>
  <button class="btn" onclick="teleportRoom('bedroom')">🛏️ غرفة النوم</button>
  <button class="btn" onclick="snapTurn(45)">↪️ دوران 45°</button>
  <button class="btn" onclick="resetCam()">🔄 إعادة ضبط</button>
  <button class="btn" onclick="toggleFullscreen()">⚡ ملء الشاشة</button>
</div>
<div id="hotspotCard">
  <div>
    <div class="hsTitle" id="hsTitle">الصالة الرئيسية</div>
    <div id="hsDesc" style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:2px;">مساحة واسعة 45 م² • إطلالة على الحديقة والمسابح</div>
  </div>
  <button class="btn" onclick="closeHotspot()" style="padding:4px 8px;font-size:10px;">إغلاق</button>
</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
(function(){
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.xr.enabled=true; // WebXR Enabled

var scene=new THREE.Scene();
var isNight=${isNight};
function applyBg(){
  scene.background=new THREE.Color(isNight?0x080e21:0x87ceeb);
  scene.fog=new THREE.Fog(isNight?0x080e21:0x87ceeb,40,120);
}
applyBg();

var camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.1,200);
camera.position.set(12,8,14);
camera.lookAt(0,2,0);

// Camera rig for WebXR locomotion
var cameraRig=new THREE.Group();
cameraRig.add(camera);
scene.add(cameraRig);

var ambLight=new THREE.AmbientLight(0xffffff,isNight?0.2:0.75);
scene.add(ambLight);

var sunLight=new THREE.DirectionalLight(0xfff8e7,isNight?0.2:1.3);
sunLight.position.set(15,25,10);
sunLight.castShadow=true;
scene.add(sunLight);

var ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshLambertMaterial({color:0x3a7042}));
ground.rotation.x=-Math.PI/2;
ground.position.y=-0.01;
ground.receiveShadow=true;
scene.add(ground);

// ── Default Villa Geometry Group ──────────────────────────────────────────
var villaGroup=new THREE.Group();
var mainBody=new THREE.Mesh(new THREE.BoxGeometry(8,4,6),new THREE.MeshLambertMaterial({color:0xf0f4f8}));
mainBody.position.y=2;
mainBody.castShadow=true;
villaGroup.add(mainBody);

var topFloor=new THREE.Mesh(new THREE.BoxGeometry(5,2.8,5),new THREE.MeshLambertMaterial({color:0xe2e8f0}));
topFloor.position.set(-0.5,5.4,0.2);
topFloor.castShadow=true;
villaGroup.add(topFloor);

var roof=new THREE.Mesh(new THREE.ConeGeometry(5.2,2,4),new THREE.MeshLambertMaterial({color:0x8b3a1a}));
roof.position.set(-0.5,7.8,0.2);
roof.rotation.y=Math.PI/4;
villaGroup.add(roof);

var pool=new THREE.Mesh(new THREE.BoxGeometry(4,0.1,2.5),new THREE.MeshBasicMaterial({color:0x0099ff}));
pool.position.set(4,0.02,2);
villaGroup.add(pool);

scene.add(villaGroup);

// ── WebXR Spatial Hotspots Architecture ──────────────────────────────────────
var hotspotsGroup=new THREE.Group();
function createHotspot(x,y,z,label,desc){
  var hsG=new THREE.Group();
  hsG.position.set(x,y,z);
  
  var ring=new THREE.Mesh(
    new THREE.RingGeometry(0.25,0.35,32),
    new THREE.MeshBasicMaterial({color:0xc9a84c,side:THREE.DoubleSide})
  );
  ring.rotation.x=-Math.PI/2;
  hsG.add(ring);
  
  var dot=new THREE.Mesh(
    new THREE.SphereGeometry(0.12,16,16),
    new THREE.MeshBasicMaterial({color:0xfff8e7})
  );
  dot.position.y=0.1;
  hsG.add(dot);
  
  hsG.userData={label:label,desc:desc};
  hotspotsGroup.add(hsG);
}

createHotspot(0,0.05,3.5,"الصالة الرئيسية (Living Room)","مساحة 45 م² مع واجهات زجاجية مطلة على المسبح");
createHotspot(4,0.05,2.0,"المسبح والحديقة (Pool & Garden)","مسبح فاخر بأبعاد 4x2.5م ومساحة خضراء جانية");
createHotspot(-0.5,4.0,2.6,"غرفة النوم الرئيسية (Master Suite)","الدور الثاني • جناح شامل مع حمام خاص وموقع ملابس");
createHotspot(4.5,0.05,-0.5,"جناح الخدمات والموقف (Garage & Services)","موقف يتسع لسيارتين مع غرفة خادمة وسائق");

scene.add(hotspotsGroup);

// Teleport marker indicator for VR locomotion
var teleportMarker=new THREE.Mesh(
  new THREE.RingGeometry(0.4,0.5,32),
  new THREE.MeshBasicMaterial({color:0x10b981,side:THREE.DoubleSide})
);
teleportMarker.rotation.x=-Math.PI/2;
teleportMarker.position.y=0.02;
teleportMarker.visible=false;
scene.add(teleportMarker);

// ── WebXR Capability Detection ──────────────────────────────────────────────
if('xr' in navigator){
  navigator.xr.isSessionSupported('immersive-vr').then(function(supported){
    var b=document.getElementById('xrBadge');
    if(supported){
      b.className='xr-badge';
      b.innerText='🕶️ WebXR VR Supported';
    } else {
      b.className='badge';
      b.innerText='💻 3D Viewer (No Headset)';
    }
  }).catch(function(){
    var b=document.getElementById('xrBadge');
    b.className='badge';
    b.innerText='💻 WebXR Simulator Active';
  });
} else {
  var b=document.getElementById('xrBadge');
  b.className='badge';
  b.innerText='🖥️ Desktop 3D Mode';
}

// ── WebXR Session Handler ───────────────────────────────────────────────────
window.requestVrSession=function(){
  if('xr' in navigator){
    navigator.xr.requestSession('immersive-vr',{
      optionalFeatures:['local-floor','bounded-floor']
    }).then(function(session){
      renderer.xr.setSession(session);
      document.getElementById('vrBtn').innerText='🛑 إنهاء VR';
      console.log('[OPROX WebXR] Immersive VR Session Started Successfully');
    }).catch(function(err){
      console.warn('[OPROX WebXR] VR Session simulated for preview:', err);
      alert('وضع المحاكاة: تم تفعيل بيئة التجول الافتراضي الغامرة داخل المستعرض');
    });
  } else {
    alert('متصفحك يدعم العرض ثلاثي الأبعاد القياسي 3D Viewer. لتشغيل النظارات استخدم متصفح WebXR متوافق.');
  }
};

// ── Teleport & Snap Turn Locomotion Helpers ─────────────────────────────────────
window.teleportRoom=function(room){
  if(room==='living'){
    cameraRig.position.set(0,0,2);
    document.getElementById('hotspotCard').style.display='flex';
    document.getElementById('hsTitle').innerText='الصالة الرئيسية (Living Room)';
    document.getElementById('hsDesc').innerText='مساحة 45 م² • إطلالة بانورامية هادئة';
  } else if(room==='bedroom'){
    cameraRig.position.set(-0.5,3.8,0.5);
    document.getElementById('hotspotCard').style.display='flex';
    document.getElementById('hsTitle').innerText='غرفة النوم الرئيسية (Master Suite)';
    document.getElementById('hsDesc').innerText='الدور الثاني • تصميم معمارية نيو كلاسيك';
  }
};

window.snapTurn=function(angleDeg){
  var rad=(angleDeg||45)*(Math.PI/180);
  cameraRig.rotation.y+=rad;
  console.log('[OPROX WebXR] Snap turn executed:', angleDeg||45, 'deg');
};

window.closeHotspot=function(){
  document.getElementById('hotspotCard').style.display='none';
};

// XR Controller Setup & Raycaster
var controller0=renderer.xr.getController(0);
if(controller0){
  var laserGeom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-5)]);
  var laserMat=new THREE.LineBasicMaterial({color:0xc9a84c});
  var laser=new THREE.Line(laserGeom,laserMat);
  controller0.add(laser);
  controller0.addEventListener('select',function(){
    window.snapTurn(45);
  });
  scene.add(controller0);
}

// ── GLTFLoader Runtime Parsing Pipeline ─────────────────────────────────────
var modelUrl="${modelUrl}";
if(window.THREE && window.THREE.GLTFLoader && modelUrl && (modelUrl.endsWith('.glb') || modelUrl.endsWith('.gltf'))){
  try {
    var loader=new THREE.GLTFLoader();
    loader.load(
      modelUrl,
      function(gltf){
        if(gltf && gltf.scene){
          scene.remove(villaGroup);
          scene.add(gltf.scene);
          console.log('[OPROX 3D Pipeline] GLTF/GLB loaded into WebXR VR Scene');
        }
      },
      null,
      function(err){
        console.warn('[OPROX 3D] Model load notice: procedurally rendered', err);
      }
    );
  } catch(e) {
    console.warn('[OPROX 3D] Loader exception caught', e);
  }
}

// Controls & Camera Orbit
var theta=0.8,phi=0.45,radius=20;
function updateCam(){
  camera.position.x=radius*Math.sin(phi)*Math.sin(theta);
  camera.position.y=radius*Math.cos(phi)+2;
  camera.position.z=radius*Math.sin(phi)*Math.cos(theta);
  camera.lookAt(0,2,0);
}
updateCam();

var dragging=false,prevTouch={x:0,y:0};
window.addEventListener('mousedown',function(e){dragging=true;prevTouch={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',function(){dragging=false;});
window.addEventListener('mousemove',function(e){
  if(!dragging)return;
  theta-=(e.clientX-prevTouch.x)*0.008;
  phi=Math.max(0.1,Math.min(1.4,phi+(e.clientY-prevTouch.y)*0.008));
  prevTouch={x:e.clientX,y:e.clientY};
  updateCam();
});

window.addEventListener('wheel',function(e){
  radius=Math.max(8,Math.min(50,radius+e.deltaY*0.02));
  updateCam();
},{passive:true});

window.toggleNight=function(){
  isNight=!isNight;
  applyBg();
  ambLight.intensity=isNight?0.2:0.75;
  sunLight.intensity=isNight?0.2:1.3;
};

window.resetCam=function(){
  cameraRig.position.set(0,0,0);
  theta=0.8;phi=0.45;radius=20;
  updateCam();
  closeHotspot();
};

window.toggleFullscreen=function(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen();
  else if(document.exitFullscreen)document.exitFullscreen();
};

// Animation loop supporting WebXR setAnimationLoop
renderer.setAnimationLoop(function(){
  villaGroup.rotation.y+=0.001;
  hotspotsGroup.children.forEach(function(hs){
    hs.rotation.y+=0.01;
  });
  renderer.render(scene,camera);
});

window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
})();
</script>
</body>
</html>`;

  // 360 Panorama Equirectangular Tour HTML
  const pano360Doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:-apple-system,system-ui,Arial,sans-serif}
canvas{display:block;width:100%;height:100%}
#hud{position:absolute;top:12px;left:12px;display:flex;gap:8px;pointer-events:none;z-index:20}
.badge{background:rgba(15,32,64,0.92);border:1px solid #c9a84c;color:#f5d98a;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:700}
#info{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,32,64,0.9);border:1px solid rgba(0,120,255,0.4);color:#8cc2ff;padding:8px 18px;border-radius:20px;font-size:12px;font-weight:600;pointer-events:none}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <div class="badge">📷 360° PANORAMA TOUR</div>
  <div class="badge">جولة بانورامية تفاعلية</div>
</div>
<div id="info">اسحب بالماوس للتجول 360 درجة داخل العقار</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script>
(function(){
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);

var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,1100);
camera.position.set(0,0,0);

// Equirectangular 360 sphere geometry
var geometry=new THREE.SphereGeometry(500,60,40);
geometry.scale(-1,1,1); // Invert sphere inside

// Grid canvas texture for 360 preview
var canvas=document.createElement('canvas');
canvas.width=1024;canvas.height=512;
var ctx=canvas.getContext('2d');
ctx.fillStyle='#1e293b';ctx.fillRect(0,0,1024,512);
ctx.fillStyle='#0f172a';
for(var i=0;i<1024;i+=64){
  for(var j=0;j<512;j+=64){
    if((i+j)%128===0) ctx.fillRect(i,j,64,64);
  }
}
ctx.fillStyle='#c9a84c';ctx.font='bold 32px sans-serif';
ctx.fillText('OPROX 360° Interior Panorama',300,260);

var texture=new THREE.CanvasTexture(canvas);
var material=new THREE.MeshBasicMaterial({map:texture});
var mesh=new THREE.Mesh(geometry,material);
scene.add(mesh);

var lon=0,lat=0,isUserInteracting=false,onPointerDownLon=0,onPointerDownLat=0,onPointerDownPointerX=0,onPointerDownPointerY=0;

window.addEventListener('pointerdown',function(e){
  isUserInteracting=true;
  onPointerDownPointerX=e.clientX;
  onPointerDownPointerY=e.clientY;
  onPointerDownLon=lon;
  onPointerDownLat=lat;
});

window.addEventListener('pointermove',function(e){
  if(!isUserInteracting)return;
  lon=(onPointerDownPointerX-e.clientX)*0.1+onPointerDownLon;
  lat=(e.clientY-onPointerDownPointerY)*0.1+onPointerDownLat;
});

window.addEventListener('pointerup',function(){isUserInteracting=false;});

function animate(){
  requestAnimationFrame(animate);
  lat=Math.max(-85,Math.min(85,lat));
  var phi=THREE.MathUtils.degToRad(90-lat);
  var theta=THREE.MathUtils.degToRad(lon);
  camera.target=new THREE.Vector3(
    500*Math.sin(phi)*Math.cos(theta),
    500*Math.cos(phi),
    500*Math.sin(phi)*Math.sin(theta)
  );
  camera.lookAt(camera.target);
  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
})();
</script>
</body>
</html>`;

  // Immersive WebXR AR & Spatial Surface Placement HTML
  const arDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#050914;font-family:-apple-system,system-ui,Arial,sans-serif}
canvas{display:block;width:100%;height:100%}
#hud{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-space:space-between;align-items:center;pointer-events:none;z-index:20}
.badge{background:rgba(15,32,64,0.92);border:1px solid rgba(201,168,76,0.5);color:#f5d98a;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:700;letter-spacing:0.5px}
.ar-badge{background:rgba(236,72,153,0.2);border:1px solid #ec4899;color:#f472b6;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:700}
#controls{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;background:rgba(10,18,38,0.92);border:1px solid rgba(236,72,153,0.4);border-radius:24px;padding:6px 12px;pointer-events:all;z-index:20;flex-wrap:wrap;justify-content:center}
.btn{background:rgba(236,72,153,0.15);border:1px solid rgba(236,72,153,0.4);color:#f472b6;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:4px}
.btn:hover,.btn:active{background:rgba(236,72,153,0.3);color:#fff}
.ar-btn{background:rgba(201,168,76,0.25);border-color:#c9a84c;color:#f5d98a;font-weight:700}
#statusBox{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(15,32,64,0.95);border:1.5px solid #c9a84c;border-radius:14px;padding:8px 16px;color:#fff;font-size:11px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:25;max-width:92%}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <div class="badge">🏷️ ${classification}</div>
  <div id="arBadge" class="ar-badge">📱 WebXR AR Engine</div>
</div>
<div id="statusBox">
  📱 وضع الواقع المعزز WebXR: اضغط "تشغيل AR" للبدء بتوجيه الكاميرا نحو السطح المستوي
</div>
<div id="controls">
  <button class="btn ar-btn" id="arBtn" onclick="requestArSession()">📱 تشغيل AR (WebXR)</button>
  <button class="btn" onclick="placeModel()">📍 تثبيت المجسم</button>
  <button class="btn" onclick="rotateModel(45)">🔄 تدوير 45°</button>
  <button class="btn" onclick="scaleModel(1.2)">🔍 +تكبير</button>
  <button class="btn" onclick="scaleModel(0.8)">🔎 -تصغير</button>
  <button class="btn" onclick="addFurniture()">🛋️ أثاث تجريبي</button>
  <button class="btn" onclick="resetAR()">🔄 إعادة ضبط</button>
  <button class="btn" onclick="removeModel()">🗑️ إزالة</button>
</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
(function(){
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.xr.enabled=true;

var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.01,20);

var ambLight=new THREE.AmbientLight(0xffffff,1.0);
scene.add(ambLight);

var dirLight=new THREE.DirectionalLight(0xffffff,1.5);
dirLight.position.set(5,10,7);
scene.add(dirLight);

// Placement Reticle Geometry
var reticleGeom=new THREE.RingGeometry(0.15,0.2,32).rotateX(-Math.PI/2);
var reticleMat=new THREE.MeshBasicMaterial({color:0xec4899,side:THREE.DoubleSide});
var reticle=new THREE.Mesh(reticleGeom,reticleMat);
reticle.matrixAutoUpdate=false;
reticle.visible=false;
scene.add(reticle);

// AR Model Placement Container
var arContainer=new THREE.Group();
scene.add(arContainer);

// Procedural Villa Asset representation
var villaMesh=new THREE.Mesh(
  new THREE.BoxGeometry(1.2,0.8,1.0),
  new THREE.MeshLambertMaterial({color:0xf0f4f8})
);
villaMesh.position.y=0.4;
arContainer.add(villaMesh);
var roofMesh=new THREE.Mesh(
  new THREE.ConeGeometry(0.9,0.5,4),
  new THREE.MeshLambertMaterial({color:0xc9a84c})
);
roofMesh.position.y=1.05;
roofMesh.rotation.y=Math.PI/4;
arContainer.add(roofMesh);

arContainer.visible=true;
arContainer.position.set(0,0,-2);

var hitTestSource=null;
var hitTestSourceRequested=false;

if('xr' in navigator){
  navigator.xr.isSessionSupported('immersive-ar').then(function(supported){
    var b=document.getElementById('arBadge');
    if(supported){
      b.className='ar-badge';
      b.innerText='📱 WebXR AR Supported';
    } else {
      b.innerText='💻 AR Simulator Active';
    }
  });
}

window.requestArSession=function(){
  if('xr' in navigator){
    navigator.xr.requestSession('immersive-ar',{
      requiredFeatures:['hit-test','local-floor']
    }).then(function(session){
      renderer.xr.setSession(session);
      document.getElementById('arBtn').innerText='🛑 إنهاء AR';
      document.getElementById('statusBox').innerText='✅ تم بدء جلسة AR. وجه الكاميرا للسطح المستوي لتحديد موضع العقار';
    }).catch(function(err){
      console.warn('[OPROX AR] AR session fallback mode:', err);
      document.getElementById('statusBox').innerText='ℹ️ تم تفعيل المحاكاة التفاعلية للواقع المعزز (AR Preview Mode)';
    });
  } else {
    alert('الجهاز يدعم معاينة 3D والواقع الافتراضي. لفتح كاميرا AR المباشرة يرجى استخدام متصفح يضم دعم WebXR Immersive AR.');
  }
};

window.placeModel=function(){
  if(reticle.visible){
    arContainer.position.setFromMatrixPosition(reticle.matrix);
  }
  arContainer.visible=true;
  document.getElementById('statusBox').innerText='📍 تم تثبيت النموذج على السطح المحدد في البيئة الواقعية';
};

window.rotateModel=function(deg){
  arContainer.rotation.y += (deg||45)*(Math.PI/180);
};

window.scaleModel=function(factor){
  arContainer.scale.multiplyScalar(factor);
};

window.resetAR=function(){
  arContainer.position.set(0,0,-2);
  arContainer.rotation.set(0,0,0);
  arContainer.scale.set(1,1,1);
  arContainer.visible=true;
  document.getElementById('statusBox').innerText='🔄 تم إعادة ضبط النموذج للمحاذاة الأولية';
};

window.removeModel=function(){
  arContainer.visible=false;
  document.getElementById('statusBox').innerText='🗑️ تمت إزالة النموذج. اضغط "تثبيت المجسم" للإعادة';
};

window.addFurniture=function(){
  var sofa=new THREE.Mesh(
    new THREE.BoxGeometry(0.5,0.25,0.25),
    new THREE.MeshLambertMaterial({color:0x3b82f6})
  );
  sofa.position.set(0.6,0.125,0.2);
  arContainer.add(sofa);
  document.getElementById('statusBox').innerText='🛋️ تمت إضافة قطعة أثاث تجريبية (Test Furniture Asset)';
};

renderer.setAnimationLoop(function(timestamp, frame){
  if(frame){
    var referenceSpace=renderer.xr.getReferenceSpace();
    var session=renderer.xr.getSession();

    if(session && !hitTestSourceRequested){
      session.requestReferenceSpace('viewer').then(function(viewerSpace){
        session.requestHitTestSource({space:viewerSpace}).then(function(source){
          hitTestSource=source;
        });
      });
      session.addEventListener('end',function(){
        hitTestSourceRequested=false;
        hitTestSource=null;
      });
      hitTestSourceRequested=true;
    }

    if(hitTestSource){
      var hitTestResults=frame.getHitTestResults(hitTestSource);
      if(hitTestResults.length>0){
        var hit=hitTestResults[0];
        reticle.visible=true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible=false;
      }
    }
  }
  renderer.render(scene,camera);
});

window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
})();
</script>
</body>
</html>`;

  return (
    <View style={s.container}>
      {/* Top Header Controls */}
      <View style={s.header}>
        <View style={s.headerTitleGroup}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.price}>{price.toLocaleString("en-US")} SAR</Text>
        </View>
        <Pressable style={s.closeBtn} onPress={onClose}>
          <MaterialIcons name="close" size={22} color="#f5d98a" />
        </Pressable>
      </View>

      {/* Mode Switcher Bar */}
      <View style={s.switcherBar}>
        <Pressable
          style={[s.tabBtn, viewMode === "3D" && s.activeTab]}
          onPress={() => setViewMode("3D")}
        >
          <MaterialIcons name="3d-rotation" size={18} color={viewMode === "3D" ? "#0b1329" : "#7bc8ff"} />
          <Text style={[s.tabText, viewMode === "3D" && s.activeTabText]}>نموذج 3D / VR</Text>
        </Pressable>

        <Pressable
          style={[s.tabBtn, viewMode === "PANO360" && s.activeTab]}
          onPress={() => setViewMode("PANO360")}
        >
          <MaterialIcons name="panorama" size={18} color={viewMode === "PANO360" ? "#0b1329" : "#7bc8ff"} />
          <Text style={[s.tabText, viewMode === "PANO360" && s.activeTabText]}>جولة 360°</Text>
        </Pressable>

        <Pressable
          style={[s.tabBtn, viewMode === "AR" && s.activeTab]}
          onPress={() => setViewMode("AR")}
        >
          <MaterialIcons name="view-in-ar" size={18} color={viewMode === "AR" ? "#0b1329" : "#7bc8ff"} />
          <Text style={[s.tabText, viewMode === "AR" && s.activeTabText]}>الواقع المعزز AR</Text>
        </Pressable>

        <Pressable
          style={[s.tabBtn, viewMode === "FLOOR_PLAN" && s.activeTab]}
          onPress={() => setViewMode("FLOOR_PLAN")}
        >
          <MaterialIcons name="layers" size={18} color={viewMode === "FLOOR_PLAN" ? "#0b1329" : "#7bc8ff"} />
          <Text style={[s.tabText, viewMode === "FLOOR_PLAN" && s.activeTabText]}>مخطط الطابق</Text>
        </Pressable>

        <Pressable
          style={[s.tabBtn, viewMode === "UNITS" && s.activeTab]}
          onPress={() => setViewMode("UNITS")}
        >
          <MaterialIcons name="business" size={18} color={viewMode === "UNITS" ? "#0b1329" : "#7bc8ff"} />
          <Text style={[s.tabText, viewMode === "UNITS" && s.activeTabText]}>سجل الوحدات</Text>
        </Pressable>
      </View>

      {/* Main Display Area */}
      <View style={s.mainView}>
        {viewMode === "3D" && (
          <View style={StyleSheet.absoluteFill}>
            <iframe
              title="Property 3D Model WebXR"
              srcDoc={htmlDoc}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
            {/* OPROX Estimate Overlay */}
            <View style={s.estimateOverlay}>
              <Text style={s.estTitle}>OPROX Estimate™ VR</Text>
              <Text style={s.estRange}>
                {estimate.low.toLocaleString("en-US")} - {estimate.high.toLocaleString("en-US")} SAR
              </Text>
              <Text style={s.estSub}>
                {estimate.pricePerSqm.toLocaleString("en-US")} SAR/م² • ثقة {estimate.confidence}
              </Text>
            </View>
          </View>
        )}

        {viewMode === "PANO360" && (
          <View style={StyleSheet.absoluteFill}>
            <iframe
              title="360 Panorama Tour"
              srcDoc={pano360Doc}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </View>
        )}

        {viewMode === "AR" && (
          <View style={StyleSheet.absoluteFill}>
            <iframe
              title="Property AR WebXR Experience"
              srcDoc={arDoc}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </View>
        )}

        {viewMode === "FLOOR_PLAN" && (
          <View style={s.floorPlanView}>
            <img
              src={floorPlanUrl}
              alt="Floor Plan"
              style={{ maxWidth: "90%", maxHeight: "80%", borderRadius: "12px", border: "2px solid rgba(201,168,76,0.5)" }}
            />
            <Text style={s.floorPlanCaption}>مخطط الدور الأول والتقسيمات المعمارية الهندسية</Text>
          </View>
        )}

        {viewMode === "UNITS" && (
          <View style={s.unitsView}>
            <Text style={s.unitsHeader}>الهيكل البنائي وتوزيع الوحدات (Building → Floor → Unit)</Text>
            <View style={s.unitsGrid}>
              {units.map((u) => {
                const isAvail = u.status === "AVAILABLE";
                const isRes = u.status === "RESERVED";

                const badgeBg = isAvail
                  ? "rgba(16,185,129,0.2)"
                  : isRes
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(239,68,68,0.2)";

                const badgeColor = isAvail ? "#10b981" : isRes ? "#f59e0b" : "#ef4444";

                return (
                  <Pressable
                    key={u.unitId}
                    style={[s.unitCard, selectedUnit?.unitId === u.unitId && s.unitCardSelected]}
                    onPress={() => setSelectedUnit(u)}
                  >
                    <View style={s.unitCardHeader}>
                      <Text style={s.unitTitle}>وحدة #{u.unitId}</Text>
                      <View style={[s.unitBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[s.unitBadgeText, { color: badgeColor }]}>{u.status}</Text>
                      </View>
                    </View>
                    <Text style={s.unitSub}>
                      الدور {u.floor} • {u.bedrooms} غرف • {u.areaSqm} م²
                    </Text>
                    <Text style={s.unitPrice}>{u.price.toLocaleString("en-US")} SAR</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080e21",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(15,32,64,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,120,255,0.2)",
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  price: {
    color: "#c9a84c",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,10,40,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
  },
  switcherBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0b152d",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,80,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,120,255,0.3)",
  },
  activeTab: {
    backgroundColor: "#c9a84c",
    borderColor: "#f5d98a",
  },
  tabText: {
    color: "#7bc8ff",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#0b1329",
    fontWeight: "700",
  },
  mainView: {
    flex: 1,
    position: "relative",
  },
  estimateOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(8,14,33,0.92)",
    borderWidth: 1.5,
    borderColor: "#c9a84c",
    borderRadius: 14,
    padding: 10,
    maxWidth: 240,
  },
  estTitle: {
    color: "#c9a84c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  estRange: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  estSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 2,
  },
  floorPlanView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  floorPlanCaption: {
    color: "#7bc8ff",
    fontSize: 12,
    marginTop: 12,
  },
  unitsView: {
    flex: 1,
    padding: 16,
  },
  unitsHeader: {
    color: "#c9a84c",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  unitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  unitCard: {
    width: "48%",
    backgroundColor: "rgba(15,32,64,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,120,255,0.3)",
    borderRadius: 12,
    padding: 12,
  },
  unitCardSelected: {
    borderColor: "#c9a84c",
    backgroundColor: "rgba(201,168,76,0.15)",
  },
  unitCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  unitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unitBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  unitSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 4,
  },
  unitPrice: {
    color: "#c9a84c",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});
