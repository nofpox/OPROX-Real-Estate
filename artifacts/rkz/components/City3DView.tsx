/**
 * City3DView — native (react-native-webview)
 * Full-screen 3D procedural city with Three.js embedded in a WebView.
 * - Tap building → camera flies inside → shows empty 3D room
 * - Bottom chat bar: type "2 bedroom" / "فيلا" → camera pans & highlights
 * - Dark theme, neon blue, gaming aesthetic
 */
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

const CITY_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#050510;overflow:hidden;font-family:-apple-system,system-ui,Arial,sans-serif}
canvas{display:block}
#chatbar{position:absolute;bottom:0;left:0;right:0;background:rgba(2,5,22,0.95);border-top:1.5px solid rgba(0,120,255,0.35);padding:10px 14px 22px;display:flex;gap:10px;align-items:center;backdrop-filter:blur(10px)}
#chatInput{flex:1;background:rgba(0,80,255,0.08);border:1.5px solid rgba(0,120,255,0.45);border-radius:24px;padding:10px 18px;color:#fff;font-size:14px;outline:none}
#chatInput::placeholder{color:rgba(120,160,255,0.45)}
#sendBtn{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0055ff,#0099ff);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(0,120,255,0.55);flex-shrink:0}
#backBtn{position:absolute;top:18px;left:18px;background:rgba(0,10,40,0.88);border:1.5px solid rgba(0,120,255,0.5);color:#7bc8ff;border-radius:22px;padding:9px 20px;font-size:13px;cursor:pointer;display:none;font-weight:700;box-shadow:0 0 24px rgba(0,100,255,0.2);letter-spacing:0.3px}
#tooltip{position:absolute;bottom:95px;left:50%;transform:translateX(-50%);background:rgba(0,5,28,0.92);border:1px solid rgba(0,100,255,0.45);color:#aad4ff;border-radius:14px;padding:8px 18px;font-size:13px;pointer-events:none;display:none;white-space:nowrap;box-shadow:0 0 18px rgba(0,80,255,0.2)}
#crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;display:none;pointer-events:none}
#crosshair::before,#crosshair::after{content:'';position:absolute;background:rgba(0,150,255,0.75)}
#crosshair::before{width:2px;height:100%;left:50%;transform:translateX(-50%)}
#crosshair::after{width:100%;height:2px;top:50%;transform:translateY(-50%)}
#infoPanel{position:absolute;top:18px;right:18px;background:rgba(0,5,28,0.92);border:1.5px solid rgba(0,120,255,0.45);border-radius:18px;padding:16px 20px;min-width:160px;display:none;color:#fff;box-shadow:0 0 32px rgba(0,80,255,0.18)}
#infoPanel h3{font-size:15px;font-weight:800;color:#3aa0ff;margin-bottom:7px}
#infoPanel p{font-size:12px;color:rgba(180,210,255,0.8);line-height:1.7}
#chatResp{position:absolute;bottom:90px;left:14px;right:14px;background:rgba(0,5,30,0.94);border:1.5px solid rgba(0,100,255,0.4);border-radius:14px;padding:10px 16px;color:#6bc8ff;font-size:13px;display:none;box-shadow:0 0 22px rgba(0,80,255,0.12)}
#label{position:absolute;top:18px;left:50%;transform:translateX(-50%);background:rgba(0,5,28,0.85);border:1px solid rgba(0,100,255,0.4);color:#5ab4ff;border-radius:12px;padding:6px 18px;font-size:12px;font-weight:700;letter-spacing:1px;pointer-events:none}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="label">HOUSIN 3D · مدينة الرياض</div>
<button id="backBtn">← العودة للمدينة</button>
<div id="tooltip"></div>
<div id="crosshair"></div>
<div id="infoPanel"><h3 id="infoTitle"></h3><p id="infoBody"></p></div>
<div id="chatResp"></div>
<div id="chatbar">
  <input id="chatInput" type="text" placeholder="اكتب: ٢ غرف • 3 bedrooms • فيلا ..."/>
  <button id="sendBtn">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21L23 12 2 3v7l15 2-15 2v7z"/><\/svg>
  <\/button>
<\/div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\/script>
<script>
(function(){

function post(obj){
  try{var s=JSON.stringify(obj);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*');}catch(e){}
}

var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

var scene=new THREE.Scene();
scene.background=new THREE.Color(0x040810);
scene.fog=new THREE.FogExp2(0x04080f,0.006);

var camera=new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,0.1,500);
camera.position.set(0,65,85);
camera.lookAt(0,0,0);

var ambient=new THREE.AmbientLight(0x0d1a44,1.8);scene.add(ambient);
var dir=new THREE.DirectionalLight(0x6688cc,0.9);
dir.position.set(50,100,50);dir.castShadow=true;
dir.shadow.mapSize.width=1024;dir.shadow.mapSize.height=1024;
dir.shadow.camera.near=1;dir.shadow.camera.far=400;
dir.shadow.camera.left=-120;dir.shadow.camera.right=120;
dir.shadow.camera.top=120;dir.shadow.camera.bottom=-120;
scene.add(dir);
var neon=new THREE.PointLight(0x0055ff,3,100);neon.position.set(0,40,0);scene.add(neon);
var neon2=new THREE.PointLight(0x002299,1.5,60);neon2.position.set(-30,20,20);scene.add(neon2);

var groundG=new THREE.PlaneGeometry(500,500);
var groundM=new THREE.MeshLambertMaterial({color:0x060616});
var ground=new THREE.Mesh(groundG,groundM);
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

var grid=new THREE.GridHelper(500,100,0x001155,0x000a33);
grid.position.y=0.06;scene.add(grid);

// Streets overlay
var roadG=new THREE.PlaneGeometry(500,0.8);
var roadM=new THREE.MeshBasicMaterial({color:0x080820});
for(var ri=-5;ri<=5;ri++){
  var road=new THREE.Mesh(roadG,roadM);
  road.rotation.x=-Math.PI/2;road.position.set(0,0.07,ri*16);scene.add(road);
  var road2=new THREE.Mesh(roadG,roadM);
  road2.rotation.x=-Math.PI/2;road2.rotation.z=Math.PI/2;road2.position.set(ri*16,0.07,0);scene.add(road2);
}

// Stars
var sGeo=new THREE.BufferGeometry();
var sPos=new Float32Array(3000);
var rr=42;
function rand(){rr=(rr*16807)%2147483647;return(rr-1)/2147483646;}
for(var si=0;si<1000;si++){
  var th=rand()*Math.PI*2,ph=Math.acos(2*rand()-1),sr=220+rand()*60;
  sPos[si*3]=sr*Math.sin(ph)*Math.cos(th);
  sPos[si*3+1]=Math.abs(sr*Math.sin(ph)*Math.sin(th))+20;
  sPos[si*3+2]=sr*Math.cos(ph);
}
sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));
scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xffffff,size:0.6,sizeAttenuation:true})));

// Buildings
var BUILDINGS=[];var meshes=[];
var types=['apartment','apartment','apartment','villa','commercial'];
function buildCity(){
  var cols=11,rows=11,sp=16;
  for(var row=0;row<rows;row++){
    for(var col=0;col<cols;col++){
      if(rand()<0.12)continue;
      var bx=(col-cols/2)*sp,bz=(row-rows/2)*sp;
      var count=rand()<0.4?2:1;
      for(var k=0;k<count;k++){
        var isTower=rand()<0.15;
        var w=isTower?3+rand()*3:4+rand()*4;
        var d=isTower?3+rand()*3:4+rand()*4;
        var h=isTower?20+rand()*40:3+rand()*15;
        var offX=(rand()-0.5)*(7-w);
        var offZ=(rand()-0.5)*(7-d);
        var beds=Math.floor(rand()*5)+1;
        var type=types[Math.floor(rand()*types.length)];
        var floors=Math.ceil(h/3);
        var gv=0x18+Math.floor(rand()*0x18);
        var col2=(gv<<16)|(gv<<8)|(gv+0x0c);
        var mat=new THREE.MeshLambertMaterial({color:col2});
        var geo=new THREE.BoxGeometry(w,h,d);
        var mesh=new THREE.Mesh(geo,mat);
        mesh.position.set(bx+offX,h/2,bz+offZ);
        mesh.castShadow=true;mesh.receiveShadow=true;
        scene.add(mesh);
        addWindows(mesh,w,h,d);
        var b={id:BUILDINGS.length,mesh:mesh,x:bx+offX,y:h/2,z:bz+offZ,w:w,h:h,d:d,floors:floors,beds:beds,type:type,mat:mat,orig:col2};
        BUILDINGS.push(b);meshes.push(mesh);
        mesh.userData.bid=b.id;
      }
    }
  }
}
var winMat=new THREE.MeshBasicMaterial({color:0x0044ff,transparent:true,opacity:0.85});
function addWindows(parent,w,h,d){
  var wG=new THREE.BoxGeometry(0.55,0.75,0.04);
  var wCols=Math.max(1,Math.floor(w/1.6));
  var wRows=Math.max(1,Math.floor(h/2.8));
  for(var r=0;r<wRows;r++){
    for(var c=0;c<wCols;c++){
      if(rand()>0.6)continue;
      var wx=-w/2+(c+0.5)*(w/wCols),wy=-h/2+1.4+r*2.8;
      [[0,0,d/2+0.01],[0,0,-d/2-0.01],[w/2+0.01,0,0],[-w/2-0.01,0,0]].forEach(function(pos,pi){
        if(pi>1&&rand()>0.4)return;
        var wm=new THREE.Mesh(wG,winMat);
        if(pi>1){wm.geometry=new THREE.BoxGeometry(0.04,0.75,0.55);}
        wm.position.set(wx+pos[0],wy+pos[1],pos[2]);
        parent.add(wm);
      });
    }
  }
}
buildCity();

// Room
var roomGroup=new THREE.Group();scene.add(roomGroup);roomGroup.visible=false;
function buildRoom(b){
  while(roomGroup.children.length)roomGroup.remove(roomGroup.children[0]);
  var rw=b.w-0.5,rh=3.4,rd=b.d-0.5;
  var cx=b.x,cz=b.z,cy=b.y-b.h/2+rh/2+0.05;
  var wM=new THREE.MeshLambertMaterial({color:0x111128,side:THREE.BackSide});
  var fM=new THREE.MeshLambertMaterial({color:0x0a0a1e});
  var flG=new THREE.PlaneGeometry(rw,rd);
  var fl=new THREE.Mesh(flG,fM);fl.rotation.x=-Math.PI/2;fl.position.set(cx,cy-rh/2+0.02,cz);roomGroup.add(fl);
  var ceG=new THREE.PlaneGeometry(rw,rd);
  var ce=new THREE.Mesh(ceG,fM);ce.rotation.x=Math.PI/2;ce.position.set(cx,cy+rh/2,cz);roomGroup.add(ce);
  var bG=new THREE.BoxGeometry(rw,rh,0.1);
  var sG=new THREE.BoxGeometry(0.1,rh,rd);
  [[0,0,rd/2],[0,0,-rd/2]].forEach(function(p){var m=new THREE.Mesh(bG,wM);m.position.set(cx+p[0],cy+p[1],cz+p[2]);roomGroup.add(m);});
  [[rw/2,0,0],[-rw/2,0,0]].forEach(function(p){var m=new THREE.Mesh(sG,wM);m.position.set(cx+p[0],cy+p[1],cz+p[2]);roomGroup.add(m);});
  // Window frame
  var wfG=new THREE.BoxGeometry(1.4,1.5,0.07);
  var wfM=new THREE.MeshBasicMaterial({color:0x0055ff});
  var wf=new THREE.Mesh(wfG,wfM);wf.position.set(cx,cy+0.2,cz+rd/2-0.06);roomGroup.add(wf);
  var glowM=new THREE.MeshBasicMaterial({color:0x001033,transparent:true,opacity:0.4});
  var wfIn=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.3,0.05),glowM);wfIn.position.set(cx,cy+0.2,cz+rd/2-0.04);roomGroup.add(wfIn);
  // Lights
  var rL=new THREE.PointLight(0x0055ff,2,12);rL.position.set(cx,cy+rh/2-0.4,cz);roomGroup.add(rL);
  var fL=new THREE.PointLight(0x001a55,1.2,7);fL.position.set(cx,cy-rh/2+0.6,cz);roomGroup.add(fL);
  // Floor neon strip
  var stripM=new THREE.MeshBasicMaterial({color:0x0033cc});
  var stripG=new THREE.BoxGeometry(rw-0.4,0.04,0.1);
  var strip=new THREE.Mesh(stripG,stripM);strip.position.set(cx,cy-rh/2+0.03,cz+rd/2-0.2);roomGroup.add(strip);
  var strip2=new THREE.Mesh(new THREE.BoxGeometry(rw-0.4,0.04,0.1),stripM);strip2.position.set(cx,cy-rh/2+0.03,cz-rd/2+0.2);roomGroup.add(strip2);
}

var STATE='city';
var selB=null,flyProg=0,flyFrom=null,flyTo=null;
var CITYCAM={x:0,y:65,z:85};
var spherical={theta:0.6,phi:0.92,r:105};

function sphToCart(){
  camera.position.x=spherical.r*Math.sin(spherical.phi)*Math.sin(spherical.theta);
  camera.position.y=spherical.r*Math.cos(spherical.phi);
  camera.position.z=spherical.r*Math.sin(spherical.phi)*Math.cos(spherical.theta);
  camera.lookAt(0,0,0);
  CITYCAM.x=camera.position.x;CITYCAM.y=camera.position.y;CITYCAM.z=camera.position.z;
}

var raycaster=new THREE.Raycaster();
var mouse2=new THREE.Vector2(-10,-10);
var cnv=document.getElementById('c');

function getMousePos(e,rect){
  return{x:((e.clientX-rect.left)/rect.width)*2-1,y:-((e.clientY-rect.top)/rect.height)*2+1};
}

cnv.addEventListener('touchend',function(e){
  if(STATE!=='city')return;
  e.preventDefault();
  var t=e.changedTouches[0];
  var rect=cnv.getBoundingClientRect();
  mouse2.x=((t.clientX-rect.left)/rect.width)*2-1;
  mouse2.y=-((t.clientY-rect.top)/rect.height)*2+1;
  doRaycast();
},{passive:false});

cnv.addEventListener('click',function(e){
  if(STATE!=='city')return;
  var rect=cnv.getBoundingClientRect();
  mouse2.x=getMousePos(e,rect).x;mouse2.y=getMousePos(e,rect).y;
  doRaycast();
});

cnv.addEventListener('mousemove',function(e){
  if(STATE!=='city')return;
  var rect=cnv.getBoundingClientRect();
  mouse2.x=getMousePos(e,rect).x;mouse2.y=getMousePos(e,rect).y;
});

function doRaycast(){
  raycaster.setFromCamera(mouse2,camera);
  var hits=raycaster.intersectObjects(meshes,true);
  if(!hits.length)return;
  var obj=hits[0].object;
  while(obj&&obj.userData.bid===undefined)obj=obj.parent;
  if(obj&&obj.userData.bid!==undefined)startFly(BUILDINGS[obj.userData.bid]);
}

function startFly(b){
  if(STATE==='flying')return;
  selB=b;STATE='flying';flyProg=0;
  flyFrom={x:camera.position.x,y:camera.position.y,z:camera.position.z,lx:0,ly:0,lz:0};
  flyTo={x:b.x,y:b.y-b.h/2+1.8,z:b.z,lx:b.x+0.5,ly:b.y-b.h/2+1.8,lz:b.z+1.5};
  showInfo(b);buildRoom(b);
  document.getElementById('backBtn').style.display='block';
  document.getElementById('label').style.display='none';
}

function showInfo(b){
  var n={apartment:'شقة',villa:'فيلا',commercial:'تجاري'};
  document.getElementById('infoTitle').textContent=(n[b.type]||b.type)+' · '+b.beds+' غرف';
  document.getElementById('infoBody').textContent=b.floors+' طوابق\nانتظر... الكاميرا تطير داخل المبنى';
  document.getElementById('infoPanel').style.display='block';
}

function returnCity(){
  if(STATE==='city')return;
  STATE='returning';flyProg=0;
  flyFrom={x:camera.position.x,y:camera.position.y,z:camera.position.z};
  flyTo=CITYCAM;
  selB=null;
  document.getElementById('backBtn').style.display='none';
  document.getElementById('infoPanel').style.display='none';
  document.getElementById('crosshair').style.display='none';
  document.getElementById('label').style.display='block';
}
document.getElementById('backBtn').addEventListener('click',returnCity);

// Chat logic
function handleChat(text){
  var low=text.toLowerCase().trim();
  var resp=document.getElementById('chatResp');
  var beds=null;
  var bedMap={'1':1,'2':2,'3':3,'4':4,'5':5,'one':1,'two':2,'three':3,'four':4,'five':5,
    'واحد':1,'واحدة':1,'اثنين':2,'اثنتين':2,'ثلاث':3,'ثلاثة':3,'أربع':4,'أربعة':4,'خمس':5,'خمسة':5,
    'غرفتين':2,'١':1,'٢':2,'٣':3,'٤':4,'٥':5};
  var numMatch=low.match(/(\d+)\s*(bed|bedroom|room|غرف|غرفة|rooms)/);
  if(numMatch)beds=parseInt(numMatch[1]);
  if(!beds){for(var w in bedMap){if(low.indexOf(w)!==-1){beds=bedMap[w];break;}}}
  var tp=null;
  if(low.indexOf('villa')!==-1||low.indexOf('فيلا')!==-1)tp='villa';
  if(low.indexOf('apartment')!==-1||low.indexOf('شقة')!==-1)tp='apartment';
  if(low.indexOf('commercial')!==-1||low.indexOf('تجاري')!==-1)tp='commercial';
  var matches=BUILDINGS.filter(function(b){
    if(beds&&b.beds!==beds)return false;
    if(tp&&b.type!==tp)return false;
    return true;
  });
  BUILDINGS.forEach(function(b){b.mat.color.set(b.orig);});
  if(!matches.length){
    resp.textContent='لا توجد نتائج — جرّب: "٢ غرف" أو "فيلا" أو "3 bedrooms"';
    resp.style.display='block';setTimeout(function(){resp.style.display='none';},3500);return;
  }
  matches.forEach(function(b){b.mat.color.set(0x0055dd);});
  var tgt=matches[0];
  resp.textContent='وجدنا '+matches.length+' عقار'+(beds?' بـ '+beds+' غرف':'')+' — الطيران إلى أقرب واحد...';
  resp.style.display='block';setTimeout(function(){resp.style.display='none';},4500);
  if(STATE==='city'){
    STATE='panning';flyProg=0;
    flyFrom={x:camera.position.x,y:camera.position.y,z:camera.position.z,lx:0,ly:0,lz:0};
    flyTo={x:tgt.x,y:32,z:tgt.z+32,lx:tgt.x,ly:0,lz:tgt.z};
    selB=tgt;showInfo(tgt);
    document.getElementById('backBtn').style.display='block';
    document.getElementById('label').style.display='none';
  }
}
document.getElementById('sendBtn').addEventListener('click',function(){
  var inp=document.getElementById('chatInput');if(inp.value.trim()){handleChat(inp.value);inp.value='';}
});
document.getElementById('chatInput').addEventListener('keydown',function(e){
  if(e.key==='Enter'&&this.value.trim()){handleChat(this.value);this.value='';}
});

// Orbit drag
var drag=false,tStart=null,pinchDist=null,prevDrag={x:0,y:0};
cnv.addEventListener('mousedown',function(e){if(STATE!=='city')return;drag=true;prevDrag={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',function(){drag=false;});
window.addEventListener('mousemove',function(e){
  if(!drag||STATE!=='city')return;
  var dx=(e.clientX-prevDrag.x)/window.innerWidth*Math.PI*1.6;
  var dy=(e.clientY-prevDrag.y)/window.innerHeight*Math.PI;
  spherical.theta-=dx;spherical.phi=Math.max(0.18,Math.min(Math.PI/2.1,spherical.phi+dy));
  prevDrag={x:e.clientX,y:e.clientY};sphToCart();
});
cnv.addEventListener('wheel',function(e){
  if(STATE!=='city')return;
  spherical.r=Math.max(25,Math.min(190,spherical.r+e.deltaY*0.12));sphToCart();
});
cnv.addEventListener('touchstart',function(e){
  if(STATE!=='city')return;
  if(e.touches.length===1){drag=true;tStart={x:e.touches[0].clientX,y:e.touches[0].clientY};}
  if(e.touches.length===2){var dx=e.touches[0].clientX-e.touches[1].clientX,dy2=e.touches[0].clientY-e.touches[1].clientY;pinchDist=Math.sqrt(dx*dx+dy2*dy2);}
},{passive:true});
cnv.addEventListener('touchmove',function(e){
  if(STATE!=='city')return;
  if(e.touches.length===1&&drag&&tStart){
    var dx=(e.touches[0].clientX-tStart.x)/window.innerWidth*Math.PI*1.6;
    var dy=(e.touches[0].clientY-tStart.y)/window.innerHeight*Math.PI;
    spherical.theta-=dx;spherical.phi=Math.max(0.18,Math.min(Math.PI/2.1,spherical.phi+dy));
    tStart={x:e.touches[0].clientX,y:e.touches[0].clientY};sphToCart();
  }
  if(e.touches.length===2&&pinchDist){
    var dx2=e.touches[0].clientX-e.touches[1].clientX,dy3=e.touches[0].clientY-e.touches[1].clientY;
    var nd=Math.sqrt(dx2*dx2+dy3*dy3);
    spherical.r=Math.max(25,Math.min(190,spherical.r*(pinchDist/nd)));pinchDist=nd;sphToCart();
  }
},{passive:true});
cnv.addEventListener('touchend',function(){drag=false;tStart=null;pinchDist=null;},{passive:true});

// Hover tooltip
var prevHov=null;
function checkHover(){
  if(STATE!=='city')return;
  raycaster.setFromCamera(mouse2,camera);
  var hits=raycaster.intersectObjects(meshes,true);
  var nh=null;
  if(hits.length){var o=hits[0].object;while(o&&o.userData.bid===undefined)o=o.parent;if(o&&o.userData.bid!==undefined)nh=o.userData.bid;}
  if(nh!==prevHov){
    if(prevHov!==null){var pb=BUILDINGS[prevHov];pb.mat.color.set(pb.orig);}
    if(nh!==null)BUILDINGS[nh].mat.color.set(0x003fa8);
    prevHov=nh;
  }
  var tip=document.getElementById('tooltip');
  if(nh!==null&&!drag){
    var b=BUILDINGS[nh];var n={apartment:'شقة',villa:'فيلا',commercial:'تجاري'};
    tip.textContent=(n[b.type]||b.type)+' · '+b.beds+' غرف · '+b.floors+' طوابق — اضغط للدخول';
    tip.style.display='block';
  }else{tip.style.display='none';}
}

function lerp(a,b,t){return a+(b-a)*t;}
var clock=new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  var dt=clock.getDelta(),t=clock.getElapsedTime();
  neon.intensity=2+Math.sin(t*1.8)*0.8;
  neon2.intensity=1+Math.sin(t*1.2+1)*0.5;
  checkHover();

  if(STATE==='flying'||STATE==='panning'){
    flyProg=Math.min(1,flyProg+dt*0.75);
    var e3=1-Math.pow(1-flyProg,3);
    camera.position.x=lerp(flyFrom.x,flyTo.x,e3);
    camera.position.y=lerp(flyFrom.y,flyTo.y,e3);
    camera.position.z=lerp(flyFrom.z,flyTo.z,e3);
    camera.lookAt(lerp(flyFrom.lx,flyTo.lx,e3),lerp(flyFrom.ly,flyTo.ly,e3),lerp(flyFrom.lz,flyTo.lz,e3));
    if(flyProg>=1){
      if(STATE==='flying'){STATE='room';roomGroup.visible=true;document.getElementById('crosshair').style.display='block';document.getElementById('infoBody').textContent=selB.floors+' طوابق\nعرض الغرفة الداخلية';}
      else STATE='city';
    }
  }

  if(STATE==='returning'){
    flyProg=Math.min(1,flyProg+dt*0.65);
    var e4=1-Math.pow(1-flyProg,3);
    camera.position.x=lerp(flyFrom.x,flyTo.x,e4);
    camera.position.y=lerp(flyFrom.y,flyTo.y,e4);
    camera.position.z=lerp(flyFrom.z,flyTo.z,e4);
    camera.lookAt(0,0,0);
    if(flyProg>=1){STATE='city';roomGroup.visible=false;BUILDINGS.forEach(function(b){b.mat.color.set(b.orig);});}
  }

  if(STATE==='room'&&selB){
    camera.lookAt(
      selB.x+Math.sin(t*0.28)*1.8,
      selB.y-selB.h/2+1.9+Math.sin(t*0.4)*0.25,
      selB.z+1.2+Math.cos(t*0.22)*1.8
    );
  }

  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

post({type:'ready'});
})();
<\/script>
</body></html>`;

interface Props {
  onReady?: () => void;
}

export default function City3DView({ onReady }: Props) {
  const wvRef = useRef<WebView>(null);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { type: string };
      if (data.type === "ready") onReady?.();
    } catch {}
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
        source={{ html: CITY_HTML }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onMessage={handleMessage}
        style={s.wv}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}

const s = StyleSheet.create({ wv: { flex: 1, backgroundColor: "#040810" } });
