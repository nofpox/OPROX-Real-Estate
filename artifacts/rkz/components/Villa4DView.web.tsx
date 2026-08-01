/**
 * Villa4DView — web (iframe shim, Metro picks this over Villa4DView.tsx on web)
 */
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  onReady?: () => void;
}

export default function Villa4DView({ onReady }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => onReady?.(), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <iframe
        title="OPROX 4D Villa"
        srcDoc={VILLA_HTML_WEB}
        style={{ width: "100%", height: "100%", border: "none", background: "#87ceeb" }}
        allow="autoplay"
      />
    </View>
  );
}

const VILLA_HTML_WEB = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,system-ui,Arial,sans-serif;background:#87ceeb}
canvas{display:block}
#ui{position:absolute;bottom:0;left:0;right:0;padding:10px 12px 24px;display:flex;flex-direction:column;gap:8px;pointer-events:none}
#btns{display:flex;gap:8px;justify-content:center;pointer-events:all}
#styleBtns{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;pointer-events:all}
.btn{background:rgba(15,32,64,0.88);border:1.5px solid rgba(201,168,76,0.55);color:#c9a84c;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,0.3);transition:background 0.15s}
.btn:active,.btn:hover{background:rgba(201,168,76,0.18)}
.btn.active{background:rgba(201,168,76,0.25);border-color:#c9a84c;color:#f5d98a}
.sBtn{background:rgba(15,32,64,0.78);border:1.5px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.8);padding:7px 13px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);transition:all 0.18s}
.sBtn:active,.sBtn:hover{opacity:0.8}
.sBtn.active{border-color:#c9a84c;color:#c9a84c;background:rgba(201,168,76,0.18)}
#label{text-align:center;color:rgba(255,255,255,0.55);font-size:10px;letter-spacing:1px;font-weight:600;pointer-events:none}
#weatherBar{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:rgba(15,32,64,0.85);border:1px solid rgba(201,168,76,0.35);border-radius:20px;padding:5px 16px;color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:0.4px;pointer-events:none;white-space:nowrap}
#styleName{position:absolute;top:50px;left:50%;transform:translateX(-50%);background:rgba(15,32,64,0.75);border:1px solid rgba(201,168,76,0.3);border-radius:14px;padding:4px 14px;color:rgba(201,168,76,0.9);font-size:11px;font-weight:700;pointer-events:none}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="weatherBar">☀️ نهار صافٍ</div>
<div id="styleName">🏠 مودرن</div>
<div id="ui">
  <div id="styleBtns">
    <button class="sBtn active" id="style-modern"  onclick="setStyle('modern')">مودرن</button>
    <button class="sBtn"        id="style-classic" onclick="setStyle('classic')">كلاسيك</button>
    <button class="sBtn"        id="style-neo"     onclick="setStyle('neo')">نيو كلاسيك</button>
    <button class="sBtn"        id="style-shaabi"  onclick="setStyle('shaabi')">شعبي</button>
    <button class="sBtn"        id="style-farm"    onclick="setStyle('farm')">مزرعة</button>
  </div>
  <div id="btns">
    <button class="btn" id="btnNight" onclick="toggleNight()">🌙 ليل</button>
    <button class="btn" id="btnRain"  onclick="toggleRain()">🌧️ مطر</button>
  </div>
  <div id="label">اسحب للتدوير • عجلة الماوس للتكبير</div>
</div>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script>
(function(){
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
var scene=new THREE.Scene();scene.background=new THREE.Color(0x87ceeb);scene.fog=new THREE.Fog(0x87ceeb,60,120);
var camera=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,300);camera.position.set(14,7,14);camera.lookAt(0,1.5,0);
var ambLight=new THREE.AmbientLight(0xffffff,0.65);scene.add(ambLight);
var sunLight=new THREE.DirectionalLight(0xfffaed,1.4);sunLight.position.set(20,30,15);sunLight.castShadow=true;
sunLight.shadow.mapSize.width=1024;sunLight.shadow.mapSize.height=1024;sunLight.shadow.camera.near=1;sunLight.shadow.camera.far=120;sunLight.shadow.camera.left=-25;sunLight.shadow.camera.right=25;sunLight.shadow.camera.top=25;sunLight.shadow.camera.bottom=-25;scene.add(sunLight);
var moonLight=new THREE.DirectionalLight(0x4466cc,0.0);moonLight.position.set(-15,20,-10);scene.add(moonLight);
var poolGlow=new THREE.PointLight(0x0099ff,0.0,18);poolGlow.position.set(6,-0.3,4);scene.add(poolGlow);
var groundM=new THREE.MeshLambertMaterial({color:0x4a8c52});
var ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),groundM);ground.rotation.x=-Math.PI/2;ground.position.y=-1.02;ground.receiveShadow=true;scene.add(ground);
var pathMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,8),new THREE.MeshLambertMaterial({color:0xc8b48a}));pathMesh.rotation.x=-Math.PI/2;pathMesh.position.set(0,-1.01,7);scene.add(pathMesh);
var villaG=new THREE.Group();
var bodyM=new THREE.MeshLambertMaterial({color:0xf8fafc});var body=new THREE.Mesh(new THREE.BoxGeometry(8,4,6),bodyM);body.position.y=1;body.castShadow=true;body.receiveShadow=true;villaG.add(body);
var floor2M=new THREE.MeshLambertMaterial({color:0xede8de});var floor2=new THREE.Mesh(new THREE.BoxGeometry(5,2.5,5),floor2M);floor2.position.set(-0.5,4.25,0.5);floor2.castShadow=true;villaG.add(floor2);
var roofM=new THREE.MeshLambertMaterial({color:0x8b3a1a});var roofMesh=new THREE.Mesh(new THREE.ConeGeometry(5.2,2.5,4),roofM);roofMesh.position.set(0,4.5,0);roofMesh.rotation.y=Math.PI/4;roofMesh.castShadow=true;villaG.add(roofMesh);
var garage=new THREE.Mesh(new THREE.BoxGeometry(3.5,2.5,3),new THREE.MeshLambertMaterial({color:0xe8e0d0}));garage.position.set(4.5,0.25,-0.5);villaG.add(garage);
var gRoof=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.2,3.3),new THREE.MeshLambertMaterial({color:0x7a3318}));gRoof.position.set(4.5,1.6,-0.5);villaG.add(gRoof);
var winM=new THREE.MeshBasicMaterial({color:0xaaccff,transparent:true,opacity:0.75});
var winNightM=new THREE.MeshBasicMaterial({color:0xffdd88,transparent:true,opacity:0.85});
var wins=[];
[[-2.2,1.8,3.01],[0,1.8,3.01],[2.2,1.8,3.01],[-2.2,-0.2,3.01],[2.2,-0.2,3.01]].forEach(function(p){var w=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.04),winM);w.position.set(p[0],p[1],p[2]);villaG.add(w);wins.push(w);});
[[-4.01,1.2,1],[4.01,1.2,1],[4.01,1.2,-1]].forEach(function(p){var w2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.9,1.1),winM);w2.position.set(p[0],p[1],p[2]);villaG.add(w2);wins.push(w2);});
var door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,0.08),new THREE.MeshLambertMaterial({color:0x5a2d0c}));door.position.set(0,-0.4,3.04);villaG.add(door);
[[1.5,0,3.3],[-1.5,0,3.3]].forEach(function(p){var pi=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,2.4,8),new THREE.MeshLambertMaterial({color:0xfaf0e6}));pi.position.set(p[0],p[1],p[2]);pi.castShadow=true;villaG.add(pi);});
scene.add(villaG);
var sofaMat=new THREE.MeshLambertMaterial({color:0xe5e7eb});
var sofaMesh=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.6,0.9),sofaMat);sofaMesh.position.set(0,-0.7,4.6);sofaMesh.castShadow=true;scene.add(sofaMesh);
var sofaBack=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.65,0.18),sofaMat);sofaBack.position.set(0,-0.38,4.16);scene.add(sofaBack);
var sofaArm1=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.5,0.9),sofaMat);sofaArm1.position.set(1.15,-0.55,4.6);scene.add(sofaArm1);
var sofaArm2=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.5,0.9),sofaMat);sofaArm2.position.set(-1.15,-0.55,4.6);scene.add(sofaArm2);
var woodMat=new THREE.MeshLambertMaterial({color:0x92400e});
var tableMesh=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.1,0.7),woodMat);tableMesh.position.set(0,-0.95,5.5);scene.add(tableMesh);
[[-0.5,0,-0.28],[0.5,0,-0.28],[-0.5,0,0.28],[0.5,0,0.28]].forEach(function(p){var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.4,6),woodMat);leg.position.set(tableMesh.position.x+p[0],tableMesh.position.y-0.25,tableMesh.position.z+p[2]);scene.add(leg);});
var rugMat=new THREE.MeshLambertMaterial({color:0x991b1b});
var rugMesh=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.0),rugMat);rugMesh.rotation.x=-Math.PI/2;rugMesh.position.set(0,-1.01,5.0);scene.add(rugMesh);
var vaseMat=new THREE.MeshLambertMaterial({color:0xc9a84c});
var vaseMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.08,0.4,10),vaseMat);vaseMesh.position.set(-0.5,-0.8,5.5);scene.add(vaseMesh);
var poolBorder=new THREE.Mesh(new THREE.BoxGeometry(5.4,0.5,3.4),new THREE.MeshLambertMaterial({color:0xe0d8cc}));poolBorder.position.set(6,-1.02,4);scene.add(poolBorder);
var waterM=new THREE.MeshLambertMaterial({color:0x06b6d4,transparent:true,opacity:0.88});
var water=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.8),waterM);water.rotation.x=-Math.PI/2;water.position.set(6,-0.78,4);scene.add(water);
function addTree(x,z){var t=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.2,1.8,8),new THREE.MeshLambertMaterial({color:0x5c3d1e}));t.position.set(x,-0.1,z);t.castShadow=true;scene.add(t);var l=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,10),new THREE.MeshLambertMaterial({color:0x2d7a2d}));l.position.set(x,1.5,z);l.castShadow=true;scene.add(l);}
addTree(-8,2);addTree(-8,-3);addTree(-7,6);addTree(10,-5);addTree(-5,-7);addTree(8,-7);
var starPos=new Float32Array(2000*3);for(var si=0;si<2000;si++){var th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI*0.5,sr=180+Math.random()*40;starPos[si*3]=sr*Math.sin(ph)*Math.cos(th);starPos[si*3+1]=Math.abs(sr*Math.cos(ph))+10;starPos[si*3+2]=sr*Math.sin(ph)*Math.sin(th);}
var starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
var starMat=new THREE.PointsMaterial({color:0xffffff,size:0.5,sizeAttenuation:true,transparent:true,opacity:0});
scene.add(new THREE.Points(starGeo,starMat));
var moonM2=new THREE.MeshBasicMaterial({color:0xf0eee8,transparent:true,opacity:0});
var moon=new THREE.Mesh(new THREE.SphereGeometry(3,16,16),moonM2);moon.position.set(-60,80,-80);scene.add(moon);
var rainPos2=new Float32Array(3000*3);for(var ri=0;ri<3000;ri++){rainPos2[ri*3]=(Math.random()-0.5)*60;rainPos2[ri*3+1]=Math.random()*30;rainPos2[ri*3+2]=(Math.random()-0.5)*60;}
var rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos2,3));
var rainMat=new THREE.PointsMaterial({color:0xaad4ff,size:0.18,transparent:true,opacity:0.0});
scene.add(new THREE.Points(rainGeo,rainMat));
var STYLES={modern:{wall:0xf8fafc,floor2:0xf8fafc,sofa:0xe5e7eb,wood:0x92400e,pool:0x06b6d4,rug:0x991b1b,vase:0xc9a84c,roof:0x8b3a1a,shaabi:false,name:'🏠 مودرن'},classic:{wall:0xfefce8,floor2:0xfefce8,sofa:0xb45309,wood:0x78350f,pool:0x06b6d4,rug:0x7c2d12,vase:0xd4af37,roof:0x7a2d0f,shaabi:false,name:'🕌 كلاسيك'},neo:{wall:0xf1f5f9,floor2:0xf1f5f9,sofa:0x1e293b,wood:0xa16207,pool:0x06b6d4,rug:0x1e3a5f,vase:0xa16207,roof:0x374151,shaabi:false,name:'✨ نيو كلاسيك'},shaabi:{wall:0xf5f5f4,floor2:0xf5f5f4,sofa:0x78716c,wood:0x451a03,pool:0x06b6d4,rug:0x7c2d12,vase:0x92400e,roof:0x5a3318,shaabi:true,name:'🛋️ شعبي'},farm:{wall:0xecfccb,floor2:0xd9f99d,sofa:0x4d7c0f,wood:0x365314,pool:0x22c55e,rug:0x365314,vase:0x16a34a,roof:0x365314,shaabi:false,name:'🌿 مزرعة'}};
var currentStyle='modern';
window.setStyle=function(name){currentStyle=name;var st=STYLES[name];['modern','classic','neo','shaabi','farm'].forEach(function(k){var b=document.getElementById('style-'+k);if(b)b.classList.toggle('active',k===name);});document.getElementById('styleName').textContent=st.name;bodyM.color.setHex(st.wall);floor2M.color.setHex(st.floor2);sofaMat.color.setHex(st.sofa);sofaBack.material.color.setHex(st.sofa);sofaArm1.material.color.setHex(st.sofa);sofaArm2.material.color.setHex(st.sofa);woodMat.color.setHex(st.wood);waterM.color.setHex(st.pool);rugMat.color.setHex(st.rug);vaseMat.color.setHex(st.vase);roofM.color.setHex(st.roof);if(st.shaabi){sofaMesh.position.y=-0.88;sofaMesh.scale.y=0.45;sofaBack.visible=false;sofaArm1.visible=false;sofaArm2.visible=false;}else{sofaMesh.position.y=-0.7;sofaMesh.scale.y=1;sofaBack.visible=true;sofaArm1.visible=true;sofaArm2.visible=true;}groundM.color.setHex(st===STYLES.farm?0x4d7c0f:isNight?0x1a3520:0x4a8c52);};
var isNight=false;var isRaining=false;var nightProgress=0;var rainProgress=0;
var audioCtx=null;var rainNode=null;var gainNode=null;
function startRainAudio(){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(rainNode)return;var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);var d=buf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.28;rainNode=audioCtx.createBufferSource();rainNode.buffer=buf;rainNode.loop=true;gainNode=audioCtx.createGain();gainNode.gain.value=0.0;var f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=1100;rainNode.connect(f);f.connect(gainNode);gainNode.connect(audioCtx.destination);rainNode.start();}catch(e){}}
function stopRainAudio(){if(gainNode)gainNode.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.5);setTimeout(function(){if(rainNode){rainNode.stop();rainNode=null;}},600);}
window.toggleNight=function(){isNight=!isNight;document.getElementById('btnNight').textContent=isNight?'☀️ نهار':'🌙 ليل';document.getElementById('btnNight').classList.toggle('active',isNight);updateBar();};
window.toggleRain=function(){isRaining=!isRaining;document.getElementById('btnRain').textContent=isRaining?'⛔ وقف المطر':'🌧️ مطر';document.getElementById('btnRain').classList.toggle('active',isRaining);if(isRaining){startRainAudio();if(gainNode)gainNode.gain.linearRampToValueAtTime(0.28,audioCtx.currentTime+1.5);}else stopRainAudio();updateBar();};
function updateBar(){var b=document.getElementById('weatherBar');if(isNight&&isRaining)b.textContent='🌧️ ليلة ممطرة';else if(isNight)b.textContent='🌙 ليل هادئ';else if(isRaining)b.textContent='🌦️ نهار ممطر';else b.textContent='☀️ نهار صافٍ';}
var orb={theta:0.7,phi:0.5,r:22,dragging:false,prev:{x:0,y:0}};var cnv2=document.getElementById('c');
function orbitToCart(){camera.position.x=orb.r*Math.sin(orb.phi)*Math.sin(orb.theta);camera.position.y=orb.r*Math.cos(orb.phi)+1.5;camera.position.z=orb.r*Math.sin(orb.phi)*Math.cos(orb.theta);camera.lookAt(0,1.5,0);}
orbitToCart();
cnv2.addEventListener('mousedown',function(e){orb.dragging=true;orb.prev={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',function(){orb.dragging=false;});
window.addEventListener('mousemove',function(e){if(!orb.dragging)return;orb.theta-=(e.clientX-orb.prev.x)/window.innerWidth*Math.PI*1.8;orb.phi=Math.max(0.15,Math.min(Math.PI/2.05,orb.phi+(e.clientY-orb.prev.y)/window.innerHeight*Math.PI));orb.prev={x:e.clientX,y:e.clientY};orbitToCart();});
cnv2.addEventListener('wheel',function(e){orb.r=Math.max(8,Math.min(50,orb.r+e.deltaY*0.04));orbitToCart();},{passive:true});
var tP=null;cnv2.addEventListener('touchstart',function(e){if(e.touches.length===1){orb.dragging=true;orb.prev={x:e.touches[0].clientX,y:e.touches[0].clientY};}tP=null;},{passive:true});cnv2.addEventListener('touchend',function(){orb.dragging=false;tP=null;},{passive:true});cnv2.addEventListener('touchmove',function(e){if(e.touches.length===1&&orb.dragging){orb.theta-=(e.touches[0].clientX-orb.prev.x)/window.innerWidth*Math.PI*2.2;orb.phi=Math.max(0.15,Math.min(Math.PI/2.05,orb.phi+(e.touches[0].clientY-orb.prev.y)/window.innerHeight*Math.PI));orb.prev={x:e.touches[0].clientX,y:e.touches[0].clientY};orbitToCart();}if(e.touches.length===2){var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(tP!==null){orb.r=Math.max(8,Math.min(50,orb.r-(d-tP)*0.05));orbitToCart();}tP=d;}},{passive:true});
var clock=new THREE.Clock();
var SKY_DAY=new THREE.Color(0x87ceeb);var SKY_NIGHT=new THREE.Color(0x0a0a1a);var FOG_DAY=new THREE.Color(0x87ceeb);var FOG_NIGHT=new THREE.Color(0x060614);
function lerp(a,b,t){return a+(b-a)*t;}function clamp01(v){return Math.max(0,Math.min(1,v));}
function animate(){requestAnimationFrame(animate);var dt=clock.getDelta();var t=clock.getElapsedTime();
nightProgress=clamp01(nightProgress+(isNight?1:-1)*dt*0.9);var n=nightProgress;
scene.background.lerpColors(SKY_DAY,SKY_NIGHT,n);scene.fog.color.lerpColors(FOG_DAY,FOG_NIGHT,n);scene.fog.near=lerp(60,20,n);scene.fog.far=lerp(120,60,n);
ambLight.intensity=lerp(0.65,0.1,n);sunLight.intensity=lerp(1.4,0.0,n);moonLight.intensity=lerp(0.0,0.6,n);poolGlow.intensity=lerp(0.0,1.8,n);starMat.opacity=lerp(0,0.95,n);moonM2.opacity=lerp(0,0.92,n);
var st=STYLES[currentStyle];groundM.color.setHex(n>0.5?0x1a3520:(st===STYLES.farm?0x4d7c0f:0x4a8c52));
wins.forEach(function(w){w.material=n>0.3?winNightM:winM;});
water.position.y=-0.78+Math.sin(t*1.2)*0.02;
rainProgress=clamp01(rainProgress+(isRaining?1:-1)*dt*1.5);rainMat.opacity=lerp(0,0.72,rainProgress);
if(rainProgress>0.05){var rp=rainGeo.attributes.position.array;var spd=18*rainProgress;for(var ri=0;ri<3000;ri++){rp[ri*3+1]-=spd*dt;if(rp[ri*3+1]<-2)rp[ri*3+1]=30;}rainGeo.attributes.position.needsUpdate=true;}
renderer.render(scene,camera);}
animate();
window.addEventListener('resize',function(){camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
})();
</script>
</body>
</html>`;
